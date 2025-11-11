import { bedrockChat, type BedrockTool } from './bedrock.js';
import { DEFAULT_BEDROCK_MODEL } from './config.js';
import { createClient } from '@supabase/supabase-js';
import { nextDay, format, isFuture, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { sendAppointmentConfirmationEmail } from './notify/appointment-email.js';

/**
 * Vercel Serverless Function: /api/chat
 * Backend orquestador para IA (Gemini) + Supabase.
 * Incluye:
 *  - Detección temprana de fechas para responder disponibilidad.
 *  - getAvailability: días disponibles de la semana y horarios libres del día si está disponible.
 *  - getAvailableHours: horas libres para una fecha (evita choques con citas existentes).
 *  - scheduleAppointment: exige hora HH:mm, valida choques y guarda con zona -04:00.
 */
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    // Variables de entorno requeridas (solo privadas en backend)
    const AWS_BEARER_TOKEN_BEDROCK = process.env.AWS_BEARER_TOKEN_BEDROCK;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE ||
      process.env.PRIVATE_SUPABASE_SERVICE_ROLE_KEY;

    if (!AWS_BEARER_TOKEN_BEDROCK || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      const missing = [
        !AWS_BEARER_TOKEN_BEDROCK ? 'AWS_BEARER_TOKEN_BEDROCK' : null,
        !SUPABASE_URL ? 'SUPABASE_URL' : null,
        !SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SERVICE_ROLE o PRIVATE_SUPABASE_SERVICE_ROLE_KEY)' : null,
      ].filter(Boolean);
      res.status(500).json({ error: `Faltan variables de entorno requeridas: ${missing.join(', ')}` });
      return;
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const bedrockConfig = { model: DEFAULT_BEDROCK_MODEL, temperature: 0.2, top_p: 0.9 };

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { history } = body || {};

    if (!history || !Array.isArray(history) || history.length === 0) {
      res.status(400).json({ error: 'El historial de la conversación es requerido.' });
      return;
    }

    const lastUserMessage: string = history[history.length - 1]?.parts?.[0]?.text;
    if (!lastUserMessage) {
      res.status(400).json({ error: 'No se pudo determinar el último mensaje del usuario.' });
      return;
    }

    // Helpers de clasificación con contexto conversacional
    const strip = (t: any) => String(t ?? '').trim();
    const toText = (msg: any) => strip(msg?.parts?.[0]?.text);
    const buildTranscript = (hist: any[]) => {
      const lines = (hist || []).slice(-40).map((m: any) => `${m.role}: ${toText(m)}`);
      let txt = lines.join('\n');
      if (txt.length > 8000) txt = txt.slice(-8000);
      return txt;
    };
    const toBedrockMessages = (hist: any[]): Array<{ role: 'user'|'assistant'; content: string }> => {
      const recent = (hist || []).slice(-40);
      return recent
        .map((m: any): { role: 'user'|'assistant'; content: string } => {
          const role: 'user'|'assistant' = m.role === 'model' ? 'assistant' : (m.role === 'assistant' ? 'assistant' : 'user');
          const content = toText(m);
          return { role, content };
        })
        .filter((m: { role: 'user'|'assistant'; content: string }) => m.content && String(m.content).trim().length > 0);
    };
    const confirmWords = ['si','sí','claro','dale','ok','okay','de acuerdo','correcto','confirmo','para ese estudio','para ese','ese','está bien','esta bien','vale'];
    const schedulingHints = ['agendar','agenda','cita','reserv','disponible','programar','turno','fecha','horario','confirmo esta fecha','confirmo la fecha'];
    const detectSchedulingContext = (hist: any[]): boolean => {
      const text = (hist || []).map(toText).join(' ').toLowerCase();
      return schedulingHints.some(h => text.includes(h));
    };
    const inferIntentHeuristic = (hist: any[], last: string): 'AGENDAR_CITA' | null => {
      const lastLower = strip(last).toLowerCase();
      if (confirmWords.some(w => lastLower === w || lastLower.includes(w))) {
        if (detectSchedulingContext(hist)) return 'AGENDAR_CITA';
      }
      const anyUserScheduling = (hist || []).some(
        (m: any) => m.role === 'user' && schedulingHints.some(h => toText(m).toLowerCase().includes(h))
      );
      if (anyUserScheduling) return 'AGENDAR_CITA';
      return null;
    };

    const classifierSystemInstruction = `Clasifica la intención conversacional ACTUAL considerando TODO el historial y el último mensaje. Responde exactamente una de: CONSULTA_ESTUDIO, AGENDAR_CITA, SALUDO, DESCONOCIDO. Si el historial muestra que el usuario está agendando y el último mensaje es una confirmación breve como "sí", clasifica como AGENDAR_CITA.`;

    const entityExtractorSystemInstruction = `Tu única función es extraer el nombre del examen o estudio médico del texto del usuario. Devuelve SOLO un nombre de estudio, sin comas ni texto extra. Si el texto menciona varios estudios, devuelve el más claro (idealmente el último mencionado). Si no hay un nombre de estudio claro, responde con "NO_ENCONTRADO". Responde únicamente con el nombre del estudio.`;

    // Normalizador y detección de fechas/días
    const normalize = (s: string) =>
      String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    // Saneador robusto del nombre de estudio extraído desde la IA
    const sanitizeExtractedStudyName = (raw: string): string | null => {
      if (!raw) return null;
      let s = String(raw).trim();
      const quotedMatches = Array.from(s.matchAll(/"([^"]{3,})"/g));
      if (quotedMatches.length > 0) {
        const lastQuoted = quotedMatches[quotedMatches.length - 1][1].trim();
        if (lastQuoted && lastQuoted.toUpperCase() !== 'NO_ENCONTRADO') return lastQuoted;
      }
      const lines = s.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) s = lines[lines.length - 1];
      const segments = s.split(/[.:]/).map(seg => seg.trim()).filter(Boolean);
      const lastSegment = segments.length ? segments[segments.length - 1] : s;
      const cleaned = lastSegment.replace(/[“”"']+/g, '').replace(/[.,;:!?]+$/g, '').trim();
      if (!cleaned || cleaned.toUpperCase() === 'NO_ENCONTRADO') return null;
      return cleaned;
    };

    // Mapeo de sinónimos comunes a nombres canónicos de BD
    const toCanonicalStudyName = (raw: string): string => {
      const t = normalize(String(raw || ''));
      const noAccents = t; // ya normalizado sin acentos
      // Hematología completa
      if (/(hemograma|hematologia\s+completa)/.test(noAccents)) return 'HEMATOLOGIA COMPLETA CON PLAQUETAS';
      // Examen de orina (evitando catecolaminas/citrato/oxalato/cocaina en orina)
      if (/(examen|analisis|an[aá]lisis).*orina/.test(noAccents)) {
        if (!/(catecolaminas|citrato|oxalato|cocaina)/.test(noAccents)) return 'EXAMEN DE ORINA';
      }
      // Perfil lipídico
      if (/(perfil\s+lipidico|lipidico)/.test(noAccents)) return 'PERFIL LIPIDICO';
      return raw;
    };

    // Parseo de múltiples estudios en una sola frase: comas y conectores "y", "e"
    const splitStudyQueries = (text: string): string[] => {
      if (!text) return [];
      let s = String(text);
      s = s.replace(/\s+y\s+/gi, ',').replace(/\s+e\s+/gi, ',');
      const parts = s.split(/[,\n]/).map(p => p.trim()).filter(Boolean);
      // Filtrar fragmentos demasiado cortos
      return parts.filter(p => p.length >= 3);
    };

    const dayTokens = ['lunes', 'martes', 'miercoles', 'miércoles', 'jueves', 'viernes', 'sabado', 'sábado', 'domingo', 'proximo', 'próximo', 'prox', 'siguiente'];
    const containsDateLike = (text: string): boolean => {
      const t = normalize(text);
      if (/\b\d{4}-\d{2}-\d{2}\b/.test(t)) return true; // AAAA-MM-DD
      if (/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/.test(t)) return true; // DD/MM o DD/MM/AAAA (indicio)
      return dayTokens.some((d) => t.includes(normalize(d)));
    };

    const conversationalSystemInstructionText = `
Eres VidaBot, asistente de VidaMed. Tu objetivo es agendar citas con un flujo ESTRICTO de slot-filling. Reglas obligatorias:
- Mantén el contexto del historial. NO reinicies ni cambies de tema salvo que el usuario lo pida expresamente.
- No retrocedas a slots ya confirmados: si ya tienes studies[], fecha, hora o ubicación, NO los vuelvas a pedir; conserva y usa esos valores del historial. Si el usuario dice "ya te dije cuáles son", utiliza la lista previa.
- UNA sola pregunta por turno, breve y concreta.
- Si el usuario confirma con "sí/ok/bien", interpreta como confirmación del paso actual y avanza al SIGUIENTE slot.
- Orden ESTRICTA de slots:
  1) Tipo(s) de estudio: pregunta si es un solo estudio o varios. Si son varios, solicita la lista completa (studies[]).
  2) Fecha y hora: primero la fecha (usa getAvailability si dan un día o fecha). Después de confirmar fecha disponible, OBLIGATORIAMENTE llama a getAvailableHours para listar horas libres de ese día y pide al paciente elegir una hora (HH:mm en 24h) de esa lista.
  3) Ubicación: normaliza y confirma una de estas opciones EXACTAS:
     - "Sede Principal Maracay"
     - "Sede La Colonia Tovar"
     - "Servicio a Domicilio"
     Reglas de normalización de sinónimos:
     - Cualquier mención de "domicilio", "a domicilio", "en casa", "ir a casa" ⇒ "Servicio a Domicilio".
     - Menciones a "Maracay", "principal" o "la sede" ⇒ "Sede Principal Maracay".
     - Menciones a "Colonia Tovar" ⇒ "Sede La Colonia Tovar".
     Si el usuario dice solo "sede" sin especificar, pregunta: "¿Prefieres Sede Principal Maracay o Sede La Colonia Tovar?".
     Si el usuario elige "Servicio a Domicilio", además DEBES pedir y confirmar:
       • ciudad_domicilio: elige entre "Maracay" o "La Colonia Tovar".
       • dirección exacta del domicilio.
  4) Datos del paciente, en este ORDEN exacto:
     - Primer nombre (obligatorio)
     - Segundo nombre (si el paciente dice que no tiene, omítelo)
     - Primer apellido (obligatorio)
     - Segundo apellido (si el paciente dice que no tiene, omítelo)
     - Número de cédula (obligatorio)
     - Número telefónico (obligatorio)
     - Email (opcional; si no tiene, omítelo)
     - Dirección del domicilio (solo si ubicación fue "Servicio a Domicilio"; en caso contrario, omítelo)
     - Ciudad del domicilio (solo si ubicación fue "Servicio a Domicilio"; valores permitidos: "Maracay" o "La Colonia Tovar")
     Reglas de eco y validación:
     - Al confirmar cada dato, MUESTRA el valor exactamente UNA sola vez y no lo dupliques ni lo concatenes. Ejemplo correcto: "Ok, primer nombre: Bob". Evita respuestas como "BobBob", "GomezGomez" o "GuzmanGuzman".
     - Validación de cédula: acepta únicamente dígitos entre 7 y 9 caracteres (inclusive). Si el número tiene 7, 8 o 9 dígitos, confírmalo sin advertencias. Solo pide corrección si está fuera de ese rango con el mensaje: "La cédula debe tener entre 7 y 9 dígitos".
  5) Resumen y confirmación: Muestra TODOS los datos recolectados y pregunta si son correctos. SOLO si el usuario confirma, llama a scheduleAppointment.
- Llama scheduleAppointment únicamente cuando tengas TODOS los campos obligatorios del esquema, en especial: studies[], date (YYYY-MM-DD), time (HH:mm), location, y los datos obligatorios del paciente.
- No inventes datos. No agregues temas ajenos. Mantén el tono profesional y conciso.

Consultas de Estudios:
- Si el usuario pregunta por un estudio, utiliza getStudiesInfo para obtener información exacta desde la base de datos.
- Responde con: nombre, categoría, descripción, preparación, precios en USD y Bs, tiempo de entrega (ELISA/Otros) y tipo de muestra.
- Si hay múltiples coincidencias, sugiere las opciones encontradas y pide aclaración.
- Mantén respuestas breves, claras y útiles para el paciente.
    `;

    // Guardrails de salida: anti-duplicación y validación de cédula (7–9 dígitos)
    const collapseInnerDupesInToken = (token: string): string => {
      const t = token.trim();
      if (t.length > 1 && t.length % 2 === 0) {
        const half = t.slice(0, t.length / 2);
        if (half && half.toLowerCase() === t.slice(t.length / 2).toLowerCase()) return half;
      }
      return token;
    };

    const fixEchoDupes = (text: string): string => {
      // Colapsar palabras repetidas consecutivas: "Bob Bob" -> "Bob"
      let out = text.replace(/\b([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)\s+\1\b/g, '$1');
      // Colapsar tokens repetidos por concatenación: "BobBob" -> "Bob"
      out = out.replace(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}/g, (m) => collapseInnerDupesInToken(m));
      // Colapsar números telefónicos repetidos (con o sin separadores) adyacentes
      out = out.replace(/(\+?\d[\d\s\-]{6,}\d)\s*\1/g, '$1');
      // Colapsar correos electrónicos repetidos adyacentes, con o sin separadores (espacio, coma, punto, guion)
      out = out.replace(/(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b)(?:[\s,.;-]+)?\1/g, '$1');
      return out;
    };

    const enforceCedulaRule = (text: string, userMsg?: string): string => {
      const negativePattern = /(debe\s+tener|incorrect|inválid|inval|formato|ingresa\s+tu\s+número\s+de\s+c[ée]dula\s+correcto)/i;
      const respNumMatch = text.match(/\b\d{7,9}\b/);
      const userNumMatch = userMsg ? userMsg.match(/\b\d{7,9}\b/) : null;
      const num = (respNumMatch && respNumMatch[0]) || (userNumMatch && userNumMatch[0]) || null;
      if (!num) return text;
      if (!negativePattern.test(text)) return text;
      const lines = text.split(/\r?\n/);
      const sanitized = lines.map((l) => (negativePattern.test(l) ? `Número de cédula confirmado: ${num}.` : l));
      return sanitized.join('\n');
    };

    const stripReasoningBlocks = (s: string): string => {
      if (!s) return s;
      const cleaned = s.replace(/<(reasoning|think|thinking)>[\s\S]*?<\/(reasoning|think|thinking)>/gi, '').trim();
      return cleaned.replace(/^\s*Reasoning:\s*[\s\S]*$/im, (m) => '').trim();
    };

    const applyOutputGuardrails = (text: string, userMsg?: string): string => {
      const noDupes = fixEchoDupes(text);
      const noReasoning = stripReasoningBlocks(noDupes);
      return enforceCedulaRule(noReasoning, userMsg);
    };

    // Utilidades de fechas
    const getNextDateForDay = (dayName: string): string => {
      const dayMapping: { [key: string]: number } = {
        domingo: 0,
        lunes: 1,
        martes: 2,
        miercoles: 3,
        miércoles: 3,
        jueves: 4,
        viernes: 5,
        sabado: 6,
        sábado: 6,
      };
      const raw = String(dayName);
      const lower = normalize(raw).trim();

      // 1) Aceptar YYYY-MM-DD futuro literal
      if (/\d{4}-\d{2}-\d{2}/.test(lower)) {
        try {
          const asDate = parseISO(lower);
          if (isFuture(asDate)) return lower;
        } catch {}
      }

      // 2) Intentar match exacto del día
      if (dayMapping[lower] !== undefined) {
        const nextDate = nextDay(new Date(), dayMapping[lower] as 0 | 1 | 2 | 3 | 4 | 5 | 6);
        return format(nextDate, 'yyyy-MM-dd');
      }

      // 3) Si la frase contiene el nombre del día (ej. "para el miercoles 8", "próximo miércoles")
      const keys = Object.keys(dayMapping);
      const found = keys.find((k) => lower.includes(normalize(k)));
      if (found) {
        const nextDate = nextDay(new Date(), dayMapping[found] as 0 | 1 | 2 | 3 | 4 | 5 | 6);
        return format(nextDate, 'yyyy-MM-dd');
      }

      return 'Día no válido';
    };

    // Buscar info de estudios (RPC: search_studies(search_term))
    const getStudiesInfo = async (args: { studyName: string }): Promise<object> => {
      const { studyName } = args;
      if (!studyName) return { error: 'El usuario no especificó un nombre de estudio.' };
      const { data, error } = await supabaseAdmin.rpc('search_studies', { search_term: studyName });
      if (error) {
        console.error('Error fetching study info:', error);
        return { error: 'Ocurrió un error al buscar en la base de datos.' };
      }
      if (!data || data.length === 0) return { result: `No se encontró un estudio que coincida con "${studyName}".` };
      return { studies: data };
    };

    // Generar slots de 30 minutos entre 07:00 y 17:00
    const generateDailySlots = (start = '07:00', end = '17:00', stepMinutes = 30): string[] => {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const slots: string[] = [];
      let totalStart = sh * 60 + sm;
      const totalEnd = eh * 60 + em;
      while (totalStart <= totalEnd) {
        const h = Math.floor(totalStart / 60).toString().padStart(2, '0');
        const m = (totalStart % 60).toString().padStart(2, '0');
        slots.push(`${h}:${m}`);
        totalStart += stepMinutes;
      }
      return slots;
    };

    // Obtener horas horas ocupadas (HH:mm) para YYYY-MM-DD en zona -04:00
    const getBookedTimesForDate = async (yyyyMMdd: string): Promise<Set<string>> => {
      const { data: appointments, error } = await supabaseAdmin
        .from('citas')
        .select('id, fecha_cita')
        .gte('fecha_cita', `${yyyyMMdd}T00:00:00-04:00`)
        .lte('fecha_cita', `${yyyyMMdd}T23:59:59-04:00`);
      if (error) throw error;
      const booked = new Set<string>(
        (appointments || []).map((c: any) => {
          const d = new Date(c.fecha_cita);
          const hh = d.getHours().toString().padStart(2, '0');
          const mm = d.getMinutes().toString().padStart(2, '0');
          return `${hh}:${mm}`;
        })
      );
      return booked;
    };

    // Herramienta: Disponibilidad de día o semana, con formato de días y horas
    const getAvailability = async (args: { date: string }): Promise<object> => {
      const { date } = args;
      const targetDate = getNextDateForDay(date);
      if (targetDate === 'Día no válido') {
        return {
          error: `Lo siento, no pude entender la fecha "${date}". Indícame un día (lunes a sábado) o una fecha en formato AAAA-MM-DD.`,
          meta: { type: 'error', code: 'INVALID_DATE', slot: 'date', format: 'YYYY-MM-DD o lunes-sábado' },
        };
      }
      try {
        // Calcular la semana (lunes a domingo) y excluir domingo para oferta
        const base = parseISO(targetDate);
        const weekStart = startOfWeek(base, { weekStartsOn: 1 }); // lunes
        const weekEnd = endOfWeek(base, { weekStartsOn: 1 });     // domingo
        const allWeekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
          .filter(d => d.getDay() !== 0); // excluir domingo

        const weekDates = allWeekDays.map(d => format(d, 'yyyy-MM-dd'));

        // Consultar días no disponibles en esa semana
        const { data: blocked, error } = await supabaseAdmin
          .from('dias_no_disponibles')
          .select('fecha')
          .in('fecha', weekDates);
        if (error) throw error;

        const blockedSet = new Set<string>((blocked || []).map((r: any) => r.fecha));
        const availableDates = weekDates.filter(d => !blockedSet.has(d));

        const toSpanish = (dstr: string) => {
          const d = parseISO(dstr);
          const names = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
          return `${names[d.getDay()]} ${format(d, 'dd')}`;
        };

        // Si la fecha objetivo está disponible -> listar horarios disponibles
        if (availableDates.includes(targetDate)) {
          const allSlots = generateDailySlots('07:00', '17:00', 30);
          const bookedSet = await getBookedTimesForDate(targetDate);
          // Excluir horarios bloqueados manualmente por ubicación por defecto
          const DEFAULT_LOCATION = 'Sede Principal Maracay';
          const { data: blockedSlots, error: bsErr } = await supabaseAdmin
            .from('horarios_no_disponibles')
            .select('hora, ubicacion')
            .eq('fecha', targetDate)
            .eq('ubicacion', DEFAULT_LOCATION);
          if (bsErr) throw bsErr;
          const blockedSlotsSet = new Set<string>((blockedSlots || []).map((r: any) => String(r.hora)));
          const freeSlots = allSlots.filter((s) => !bookedSet.has(s) && !blockedSlotsSet.has(s));

          if (freeSlots.length === 0) {
            return {
              result: `El día ${toSpanish(targetDate)} está disponible pero todos los horarios están tomados. ¿Quieres intentar con otro día cercano?`,
            };
          }

          return {
            result: `¡Buenas noticias! El día ${toSpanish(targetDate)} está disponible. Horarios disponibles: ${freeSlots.join(', ')}. ¿Qué hora prefieres?`,
          };
        }

        // Si no está disponible, proponer opciones de la misma semana
        const readable = availableDates.map(toSpanish);
        if (readable.length === 0) {
          // Semana completa ocupada: sugerir el mismo día la semana siguiente
          const dow = base.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
          const nextSame = format(nextDay(base, dow), 'yyyy-MM-dd');
          return {
            result: `Lo siento, para el día ${toSpanish(targetDate)} no tenemos disponibilidad. La próxima fecha sugerida para ese mismo día sería ${toSpanish(nextSame)}. También puedes elegir otro día de la semana siguiente.`,
          };
        }

        return {
          result: `Lo siento, para el día ${toSpanish(targetDate)} no tenemos disponibilidad. Esta semana están disponibles: ${readable.join(', ')}. ¿Cuál prefieres?`,
        };
      } catch (error: any) {
        console.error('Error fetching availability:', error);
        return { error: 'Lo siento, hubo un error al verificar la disponibilidad.', details: error.message };
      }
    };

    // Herramienta: Horas disponibles para una fecha YYYY-MM-DD
    const getAvailableHours = async (args: { date: string }): Promise<object> => {
      const { date } = args;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { error: 'Debes indicar una fecha válida en formato YYYY-MM-DD.', meta: { type: 'error', code: 'INVALID_DATE_FORMAT', slot: 'date', format: 'YYYY-MM-DD' } };
      }
      try {
        // Si el día está bloqueado, no ofrecer horas
        const { data: blockedDay, error: dayErr } = await supabaseAdmin
          .from('dias_no_disponibles')
          .select('fecha')
          .eq('fecha', date);
        if (dayErr) throw dayErr;
        if (blockedDay && blockedDay.length > 0) {
          return { error: `El día ${date} está bloqueado para agendamiento.`, meta: { type: 'error', code: 'DATE_BLOCKED', slot: 'date' } };
        }

        const allSlots = generateDailySlots('07:00', '17:00', 30);
        const booked = await getBookedTimesForDate(date);
        // Excluir horarios bloqueados manualmente (horarios_no_disponibles) por ubicación por defecto
        const DEFAULT_LOCATION = 'Sede Principal Maracay';
        const { data: blockedSlots, error: bsErr } = await supabaseAdmin
          .from('horarios_no_disponibles')
          .select('hora, ubicacion')
          .eq('fecha', date)
          .eq('ubicacion', DEFAULT_LOCATION);
        if (bsErr) throw bsErr;
        const blockedSlotsSet = new Set<string>((blockedSlots || []).map((r: any) => String(r.hora)));
        const available = allSlots.filter((s) => !booked.has(s) && !blockedSlotsSet.has(s));
        return { date, availableHours: available };
      } catch (e: any) {
        console.error('Error fetching available hours:', e);
        return { error: 'No se pudieron obtener los horarios disponibles.', details: e.message };
      }
    };

    // Herramienta: Agendar cita (exige hora y evita choques)
    const scheduleAppointment = async (args: {
      patientInfo: any;
      studies: string[];
      date: string;
      time?: string;
      location: string;
    }): Promise<object> => {
      const { patientInfo, studies, date, time, location } = args;
      try {
        // Validaciones de campos obligatorios según las reglas del flujo
        if (!Array.isArray(studies) || studies.length === 0) {
          return { error: 'Debes indicar al menos un estudio.' };
        }
        if (!date) {
          return { error: 'Falta la fecha de la cita (YYYY-MM-DD).' };
        }
        if (!patientInfo) {
          return { error: 'Faltan los datos del paciente.' };
        }
        const {
          primer_nombre,
          segundo_nombre,
          primer_apellido,
          segundo_apellido,
          cedula,
          telefono,
          email,
          direccion,
          ciudad_domicilio,
        } = patientInfo;

        if (!primer_nombre) return { error: 'Falta el primer nombre del paciente.' };
        if (!primer_apellido) return { error: 'Falta el primer apellido del paciente.' };
        if (!cedula) return { error: 'Falta el número de cédula del paciente.' };
        if (!telefono) return { error: 'Falta el número telefónico del paciente.' };
        // Normalizar ubicación a los valores permitidos por la BD
        const locRaw = String(location || '').toLowerCase();
        const normalizeLocation = (s: string): 'Sede Principal Maracay' | 'Sede La Colonia Tovar' | 'Servicio a Domicilio' | null => {
          const t = s.trim();
          if (!t) return null;
          if (t.includes('domicilio') || t.includes('casa')) return 'Servicio a Domicilio';
          if (t.includes('colonia') && t.includes('tovar')) return 'Sede La Colonia Tovar';
          if (t.includes('maracay') || t.includes('principal') || t.includes('sede')) return 'Sede Principal Maracay';
          return null;
        };
        const ubicacionEnum = normalizeLocation(locRaw) || (location as any);
        if (!ubicacionEnum ||
            !['Sede Principal Maracay','Sede La Colonia Tovar','Servicio a Domicilio'].includes(ubicacionEnum)) {
          return { error: 'Ubicación inválida. Elige: "Sede Principal Maracay", "Sede La Colonia Tovar" o "Servicio a Domicilio".' };
        }
        // Reglas adicionales para Servicio a Domicilio
        if (ubicacionEnum === 'Servicio a Domicilio') {
          if (!direccion || !String(direccion).trim()) {
            return { error: 'La dirección es obligatoria para "Servicio a Domicilio".' };
          }
          const ciudadNorm = String(ciudad_domicilio || '').trim();
          if (!ciudadNorm) {
            return { error: 'La ciudad del domicilio es obligatoria para "Servicio a Domicilio". Valores: Maracay o La Colonia Tovar.' };
          }
          const ciudadOk = ['Maracay', 'La Colonia Tovar'];
          if (!ciudadOk.includes(ciudadNorm)) {
            return { error: 'Ciudad de domicilio no válida. Debe ser "Maracay" o "La Colonia Tovar".' };
          }
        }

        // Hora requerida y normalizada
        const timeNorm = time && /^\d{2}:\d{2}$/.test(time) ? time : undefined;
        if (!timeNorm) {
          return { error: 'Falta la hora de la cita (HH:mm en formato 24h).' };
        }

        // Validar choque exacto de hora ese día (zona -04:00)
        const sameDayBooked = await getBookedTimesForDate(date);
        if (sameDayBooked.has(timeNorm)) {
          return { error: `Esa hora (${timeNorm}) ya está reservada para el ${date}. Por favor elige otra hora disponible.` };
        }

        // Normalización de datos del paciente
        const cleanedCedula = String(cedula).replace(/\D/g, '');
        const cleanedTelefono = String(telefono).replace(/\D/g, '');
        const nombres = `${String(primer_nombre).trim()}${segundo_nombre ? ' ' + String(segundo_nombre).trim() : ''}`;
        const apellidos = `${String(primer_apellido).trim()}${segundo_apellido ? ' ' + String(segundo_apellido).trim() : ''}`;

        // Buscar/crear paciente
        let patientId: string;
        const { data: existingPatient, error: findError } = await supabaseAdmin
          .from('pacientes')
          .select('id')
          .eq('cedula_identidad', cleanedCedula)
          .single();

        if (existingPatient) {
          patientId = (existingPatient as any).id;
        } else if (findError && (findError as any).code !== 'PGRST116') {
          throw findError;
        } else {
          const { data: newId, error: rpcError } = await supabaseAdmin.rpc('generate_patient_id', {
            nombre: nombres,
            apellido: apellidos,
          });
          if (rpcError) throw rpcError;
          patientId = newId as unknown as string;
        }

        const { data: patientData, error: patientError } = await supabaseAdmin
          .from('pacientes')
          .upsert(
            {
              id: patientId,
              cedula_identidad: cleanedCedula,
              nombres,
              apellidos,
              email: email || null,
              telefono: cleanedTelefono,
              direccion: ubicacionEnum === 'Servicio a Domicilio' ? direccion : null,
              ciudad_domicilio: ubicacionEnum === 'Servicio a Domicilio' ? (ciudad_domicilio || null) : null,
            },
            { onConflict: 'id' }
          )
          .select()
          .single();
        if (patientError) throw patientError;

        // Insertar cita con zona horaria de Venezuela
        const fechaCita = `${date}T${timeNorm}:00-04:00`;
        const { error: appointmentError } = await supabaseAdmin.from('citas').insert({
          paciente_id: (patientData as any).id,
          fecha_cita: fechaCita,
          estudios_solicitados: studies,
          ubicacion: ubicacionEnum,
          status: 'agendada',
        });
        if (appointmentError) throw appointmentError;

        // Enviar email de confirmación si se proporcionó correo electrónico
        if (email && String(email).trim()) {
          try {
            await sendAppointmentConfirmationEmail({
              to: email,
              patientName: `${nombres} ${apellidos}`.trim(),
              cedula: cleanedCedula,
              phone: cleanedTelefono,
              location: ubicacionEnum,
              studies,
              dateIso: fechaCita,
              summaryText: undefined,
            });
          } catch (e: any) {
            console.warn('[notify] Falló envío de email de confirmación:', e?.message || e);
          }
        }

        return {
          result: `¡Cita agendada con éxito para ${nombres} ${apellidos} el ${fechaCita}! Su ID de paciente es ${(patientData as any).id}.`,
        };
      } catch (error: any) {
        console.error('Error inesperado en scheduleAppointment:', error);
        return { error: 'Lo siento, ocurrió un error interno inesperado.', details: error.message };
      }
    };


    // Herramientas para Bedrock (OpenAI-compatible)
    const bedrockTools: BedrockTool[] = [
      {
        type: 'function',
        function: {
          name: 'getStudiesInfo',
          description:
            'Obtiene información detallada de un estudio: categoría, descripción, preparación, precios USD/Bs, tiempo de entrega ELISA/Otros y tipo de muestra.',
          parameters: {
            type: 'object',
            properties: {
              studyName: { type: 'string', description: 'Nombre del estudio a consultar (texto libre).' },
            },
            required: ['studyName'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getAvailability',
          description:
            'Verifica disponibilidad de una fecha. Acepta días de la semana o fecha YYYY-MM-DD. Devuelve días disponibles y, si el día está libre, horarios disponibles.',
          parameters: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'Día (lunes a sábado) o fecha en formato YYYY-MM-DD.' },
            },
            required: ['date'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getAvailableHours',
          description: 'Devuelve las horas disponibles (HH:mm) para una fecha confirmada, evitando choques con citas existentes.',
          parameters: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
            },
            required: ['date'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'scheduleAppointment',
          description: 'Crea la cita en la base de datos después de confirmar todos los datos.',
          parameters: {
            type: 'object',
            properties: {
              patientInfo: {
                type: 'object',
                properties: {
                  primer_nombre: { type: 'string', description: 'Primer nombre del paciente' },
                  segundo_nombre: { type: 'string', description: 'Segundo nombre del paciente (opcional)' },
                  primer_apellido: { type: 'string', description: 'Primer apellido del paciente' },
                  segundo_apellido: { type: 'string', description: 'Segundo apellido del paciente (opcional)' },
                  cedula: { type: 'string', description: 'Número de cédula' },
                  telefono: { type: 'string', description: 'Número telefónico' },
                  email: { type: 'string', description: 'Correo electrónico (opcional)' },
                  direccion: { type: 'string', description: 'Dirección del domicilio (requerida si location="Servicio a Domicilio")' },
                  ciudad_domicilio: { type: 'string', description: 'Ciudad del domicilio: "Maracay" o "La Colonia Tovar" (requerida si location="Servicio a Domicilio")' },
                },
              },
              studies: { type: 'array', items: { type: 'string' }, description: 'Lista de estudios' },
              date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
              time: { type: 'string', description: 'Hora en formato HH:mm (24h)' },
              location: {
                type: 'string',
                description: 'Ubicación normalizada: "Sede Principal Maracay" | "Sede La Colonia Tovar" | "Servicio a Domicilio"',
              },
            },
            required: ['patientInfo', 'studies', 'date', 'time', 'location'],
          },
        },
      },
    ];

    const buildAssistantToolCallMessage = (raw: any, toolCalls: any[]) => {
      const incomingCalls: any[] =
        (raw?.choices?.[0]?.message?.tool_calls as any[]) || toolCalls || [];

      const normalizedCalls = incomingCalls.map((tc: any) => {
        const name = tc?.function?.name ?? tc?.name ?? '';
        const rawArgs = tc?.function?.arguments ?? tc?.arguments ?? {};
        let argsString: string;
        if (typeof rawArgs === 'string') {
          // Si ya es string, intentar parsear y re-serializar para asegurar JSON válido
          try {
            const parsed = JSON.parse(rawArgs);
            argsString = JSON.stringify(parsed ?? {});
          } catch {
            // Mantener el string tal como viene si no es JSON válido
            argsString = rawArgs;
          }
        } else {
          // Serializar objeto/array a string JSON
          try {
            argsString = JSON.stringify(rawArgs ?? {});
          } catch {
            argsString = '{}';
          }
        }

        return {
          id: tc?.id,
          type: 'function',
          function: {
            name,
            arguments: argsString,
          },
        };
      });

      return {
        role: 'assistant' as const,
        // Aseguramos la presencia de content para cumplir con el contrato Bedrock/OpenAI
        content: '',
        tool_calls: normalizedCalls,
      } as any;
    };

    const runBedrockToolCalls = async (
      calls: Array<{ id?: string; name: string; arguments: any }>
    ): Promise<{ toolMsgs: any[]; metaPayload?: any }> => {
      const toolMsgs: any[] = [];
      let metaPayload: any = null;
      for (const call of calls) {
        let functionResult: any;
        try {
          if (call.name === 'getAvailability') functionResult = await getAvailability(call.arguments as any);
          else if (call.name === 'getAvailableHours') functionResult = await getAvailableHours(call.arguments as any);
          else if (call.name === 'scheduleAppointment') functionResult = await scheduleAppointment(call.arguments as any);
          else if (call.name === 'getStudiesInfo') functionResult = await getStudiesInfo(call.arguments as any);
          else functionResult = { error: `Función '${call.name}' no válida en este contexto.` };
        } catch (e: any) {
          functionResult = { error: e?.message || 'Error interno ejecutando herramienta.' };
        }
        if ((functionResult as any)?.error && (functionResult as any)?.meta && !metaPayload) metaPayload = (functionResult as any).meta;
        const msg: any = { role: 'tool', content: JSON.stringify(functionResult) };
        if (call.id) (msg as any).tool_call_id = call.id;
        toolMsgs.push(msg);
      }
      return { toolMsgs, metaPayload };
    };

    // Configuración Bedrock ya definida en bedrockConfig. Usaremos mensajes compatibles OpenAI.

    // Intercepción temprana: si el usuario brinda un día/fecha, priorizar verificación de disponibilidad
    // Solo aplica cuando NO estamos ya en contexto de agendamiento para evitar cortar el flujo de herramientas.
    if (!detectSchedulingContext(history) && containsDateLike(lastUserMessage)) {
      try {
        const availability = (await getAvailability({ date: lastUserMessage })) as any;
        const text =
          availability?.result ||
          availability?.error ||
          'No pude verificar la disponibilidad en este momento. Indica otro día o una fecha AAAA-MM-DD.';
        res.status(200).json({ response: text });
        return;
      } catch (e) {
        console.error('Early availability check failed:', e);
      }
    }

    // 1) Clasificar intención con contexto + heurística de continuidad
    const transcript = buildTranscript(history);
    const heuristic = inferIntentHeuristic(history, lastUserMessage);
    let intent: string;
    if (heuristic) {
      intent = heuristic;
    } else {
      const intentResult = await bedrockChat({
        model: bedrockConfig.model,
        temperature: bedrockConfig.temperature,
        top_p: bedrockConfig.top_p,
        max_completion_tokens: 256,
        messages: [
          { role: 'system', content: classifierSystemInstruction },
          { role: 'user', content: `--- Historial ---\n${transcript}\n--- Fin ---\n\nÚltimo mensaje del usuario: "${lastUserMessage}"\nCategoría:` },
        ],
      });
      intent = intentResult.text.trim();
    }
    console.log(`Intención Detectada: ${intent}`);

    // 2) Ejecutar flujo según intención
    switch (intent) {
      case 'CONSULTA_ESTUDIO': {
        // 1) Intentar parseo directo de múltiples estudios en el mensaje del usuario
        const requested = splitStudyQueries(lastUserMessage).map(toCanonicalStudyName);
        if (requested.length >= 2) {
          const pieces: string[] = [];
          for (const name of requested) {
            const studyInfoResult = (await getStudiesInfo({ studyName: name })) as any;
            if (studyInfoResult.error) {
              pieces.push(studyInfoResult.error);
              continue;
            }
            if (studyInfoResult.studies && studyInfoResult.studies.length > 0) {
              const study = studyInfoResult.studies[0];
              const tiempoEntregaBase = (study.tiempo_entrega_quimioluminiscencia && study.tiempo_entrega_quimioluminiscencia !== 'N/A') ? study.tiempo_entrega_quimioluminiscencia : study.tiempo_entrega_elisa_otro;
              const tiempoEntrega = tiempoEntregaBase || 'N/A';
              const muestra = study.tipo_de_muestra || 'N/A';
              const precioUsd = typeof study.costo_usd !== 'undefined' ? study.costo_usd : 'N/D';
              const precioBs = typeof study.costo_bs !== 'undefined' ? study.costo_bs : 'N/D';
              const descripcionValida = study.descripcion && String(study.descripcion).trim().toLowerCase() !== 'null';
              const preparacionValida = study.preparacion && String(study.preparacion).trim().toLowerCase() !== 'null';
              let block = `Aquí tienes la información sobre "${study.nombre}":\n- Categoría: ${study.categoria}\n`;
              if (descripcionValida) block += `- Descripción: ${study.descripcion}\n`;
              if (preparacionValida) block += `- Preparación: ${study.preparacion}\n`;
              block += `- Tipo de muestra: ${muestra}\n- Costo: ${precioUsd} USD / ${precioBs} Bs.\n- Tiempo de Entrega: ${tiempoEntrega}`;
              if (studyInfoResult.studies.length > 1) {
                const otherNames = studyInfoResult.studies.slice(1).map((s: any) => s.nombre).join(', ');
                block += `\nTambién encontré otros estudios similares: ${otherNames}.`;
              }
              pieces.push(block);
            } else {
              pieces.push(studyInfoResult.result || `No se encontró información para "${name}".`);
            }
          }
          const header = 'Sí, claro. Aquí te muestro la información de los estudios que me preguntaste:';
          const responseText = header + '\n\n' + pieces.join('\n\n') + '\n\n¿Te gustaría agendar una cita para alguno de estos estudios o consultar otro?';
          res.status(200).json({ response: applyOutputGuardrails(responseText, lastUserMessage) });
          return;
        }

        // 2) Flujo estándar: extracción de un único estudio, con mapeo de sinónimos
        const extractorResult = await bedrockChat({
          model: bedrockConfig.model,
          temperature: bedrockConfig.temperature,
          top_p: bedrockConfig.top_p,
          max_completion_tokens: 256,
          messages: [
            { role: 'system', content: entityExtractorSystemInstruction },
            { role: 'user', content: lastUserMessage },
          ],
        });
        const rawExtracted = extractorResult.text.trim();
        const studyNameRaw = sanitizeExtractedStudyName(rawExtracted) || rawExtracted;
        const studyName = toCanonicalStudyName(studyNameRaw);

        if (studyName === 'NO_ENCONTRADO' || !studyName) {
          res.status(200).json({ response: 'Claro, con gusto te ayudo. ¿Qué estudio o examen te gustaría consultar?' });
          return;
        }

        const studyInfoResult = (await getStudiesInfo({ studyName })) as any;

        if (studyInfoResult.error) {
          res.status(200).json({ response: studyInfoResult.error });
          return;
        }

        let responseText = '';
        if (studyInfoResult.studies && studyInfoResult.studies.length > 0) {
          const study = studyInfoResult.studies[0];
          const tiempoEntregaBase = (study.tiempo_entrega_quimioluminiscencia && study.tiempo_entrega_quimioluminiscencia !== 'N/A') ? study.tiempo_entrega_quimioluminiscencia : study.tiempo_entrega_elisa_otro;
          const tiempoEntrega = tiempoEntregaBase || 'N/A';
          const muestra = study.tipo_de_muestra || 'N/A';
          const precioUsd = typeof study.costo_usd !== 'undefined' ? study.costo_usd : 'N/D';
          const precioBs = typeof study.costo_bs !== 'undefined' ? study.costo_bs : 'N/D';
          const descripcionValida = study.descripcion && String(study.descripcion).trim().toLowerCase() !== 'null';
          const preparacionValida = study.preparacion && String(study.preparacion).trim().toLowerCase() !== 'null';
          const header = 'Sí, claro. Aquí te muestro la información del estudio que me preguntaste:';
          responseText = `${header}\n\nAquí tienes la información sobre "${study.nombre}":\n- Categoría: ${study.categoria}\n`;
          if (descripcionValida) responseText += `- Descripción: ${study.descripcion}\n`;
          if (preparacionValida) responseText += `- Preparación: ${study.preparacion}\n`;
          responseText += `- Tipo de muestra: ${muestra}\n- Costo: ${precioUsd} USD / ${precioBs} Bs.\n- Tiempo de Entrega: ${tiempoEntrega}\n`;
          if (studyInfoResult.studies.length > 1) {
            const otherNames = studyInfoResult.studies.slice(1).map((s: any) => s.nombre).join(', ');
            responseText += `\nTambién encontré otros estudios similares: ${otherNames}.`;
          }
        } else {
          responseText = studyInfoResult.result || 'No se encontró información para ese estudio.';
        }

        responseText += '\n\n¿Te gustaría agendar una cita para este estudio o consultar otro?';
        res.status(200).json({ response: applyOutputGuardrails(responseText, lastUserMessage) });
        return;
      }

      case 'AGENDAR_CITA': {
        const convInstructionText = conversationalSystemInstructionText;
        const baseMessages: any[] = [
          { role: 'system', content: convInstructionText },
          ...toBedrockMessages(history),
          { role: 'user', content: lastUserMessage },
        ];
        const first = await bedrockChat({
          model: bedrockConfig.model,
          temperature: bedrockConfig.temperature,
          top_p: bedrockConfig.top_p,
          max_completion_tokens: 512,
          messages: baseMessages,
          tools: bedrockTools,
        });
        if (first.toolCalls && first.toolCalls.length > 0) {
          const { toolMsgs, metaPayload } = await runBedrockToolCalls(first.toolCalls);
          const assistantToolCallMsg = buildAssistantToolCallMessage(first.raw, first.toolCalls);
          const second = await bedrockChat({
            model: bedrockConfig.model,
            temperature: bedrockConfig.temperature,
            top_p: bedrockConfig.top_p,
            max_completion_tokens: 512,
            messages: [...baseMessages, assistantToolCallMsg, ...toolMsgs],
            tools: bedrockTools,
          });
          res.status(200).json({ response: applyOutputGuardrails(second.text, lastUserMessage), meta: metaPayload || undefined });
          return;
        }
        res.status(200).json({ response: applyOutputGuardrails(first.text, lastUserMessage) });
        return;
      }

      case 'SALUDO': {
        // Saludo breve y humano, manteniendo foco en el dominio
        res.status(200).json({
          response: 'Hola, soy VidaBot de VidaMed. ¿Prefieres consultar estudios y precios o agendar una cita?',
        });
        return;
      }

      case 'DESCONOCIDO':
      default: {
        // Si el contexto indica flujo de agenda, continua en modo conversacional con herramientas
        if (detectSchedulingContext(history)) {
          // También interceptamos aquí si el usuario aporta una fecha directamente
          if (containsDateLike(lastUserMessage)) {
            const availability = (await getAvailability({ date: lastUserMessage })) as any;
            const text =
              availability?.result ||
              availability?.error ||
              'No pude verificar la disponibilidad en este momento. Intenta con otro día o una fecha en formato AAAA-MM-DD.';
            res.status(200).json({ response: text });
            return;
          }

          const convInstructionText = conversationalSystemInstructionText;
          const baseMessages: any[] = [
            { role: 'system', content: convInstructionText },
            ...toBedrockMessages(history),
            { role: 'user', content: lastUserMessage },
          ];
          const first = await bedrockChat({
            model: bedrockConfig.model,
            temperature: bedrockConfig.temperature,
            top_p: bedrockConfig.top_p,
            max_completion_tokens: 512,
            messages: baseMessages,
            tools: bedrockTools,
          });
          if (first.toolCalls && first.toolCalls.length > 0) {
            const { toolMsgs } = await runBedrockToolCalls(first.toolCalls);
            const assistantToolCallMsg = buildAssistantToolCallMessage(first.raw, first.toolCalls);
            const second = await bedrockChat({
              model: bedrockConfig.model,
              temperature: bedrockConfig.temperature,
              top_p: bedrockConfig.top_p,
              max_completion_tokens: 512,
              messages: [...baseMessages, assistantToolCallMsg, ...toolMsgs],
              tools: bedrockTools,
            });
            res.status(200).json({ response: applyOutputGuardrails(second.text, lastUserMessage) });
            return;
          }
          res.status(200).json({ response: applyOutputGuardrails(first.text, lastUserMessage) });
          return;
        }

        // Mensaje corto y directo para entradas fuera de flujo
        const concise = await bedrockChat({
          model: bedrockConfig.model,
          temperature: bedrockConfig.temperature,
          top_p: bedrockConfig.top_p,
          max_completion_tokens: 128,
          messages: [
            { role: 'system', content: 'Responde en español con tono cercano, espontáneo y amable. Mantén el tema del laboratorio. Ofrece según corresponda: consultar estudios/precios o agendar una cita. Usa 1–2 frases y evita mensajes rígidos o repetitivos.' },
            { role: 'user', content: `Mensaje: "${lastUserMessage}"` },
          ],
        });
        res.status(200).json({ response: applyOutputGuardrails(concise.text, lastUserMessage).trim() });
        return;
      }
    }
  } catch (error: any) {
    console.error('Error en /api/chat (serverless):', error);
    res.status(500).json({ error: error?.message || 'Error interno' });
  }
}
