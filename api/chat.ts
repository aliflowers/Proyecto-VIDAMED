import { GoogleGenerativeAI, type Content, type Part, SchemaType, type Tool } from '@google/generative-ai';
import { DEFAULT_GEMINI_MODEL } from './config.js';
import { createClient } from '@supabase/supabase-js';
import { nextDay, format, isFuture, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

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

    // Variables de entorno requeridas (con fallbacks VITE_ en dev)
    const GEMINI_API_KEY =
      process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    const SUPABASE_URL =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE ||
      process.env.PRIVATE_SUPABASE_SERVICE_ROLE_KEY;

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      const missing = [
        !GEMINI_API_KEY ? 'GEMINI_API_KEY (o VITE_GEMINI_API_KEY)' : null,
        !SUPABASE_URL ? 'SUPABASE_URL (o VITE_SUPABASE_URL)' : null,
        !SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SERVICE_ROLE o PRIVATE_SUPABASE_SERVICE_ROLE_KEY)' : null,
      ].filter(Boolean);
      res.status(500).json({ error: `Faltan variables de entorno requeridas: ${missing.join(', ')}` });
      return;
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

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
      const lines = (hist || []).slice(-12).map((m: any) => `${m.role}: ${toText(m)}`);
      let txt = lines.join('\n');
      if (txt.length > 4000) txt = txt.slice(-4000);
      return txt;
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

    const entityExtractorSystemInstruction = `Tu única función es extraer el nombre del examen o estudio médico del texto del usuario. Si no hay un nombre de estudio claro, responde con "NO_ENCONTRADO". Responde únicamente con el nombre del estudio.`;

    // Normalizador y detección de fechas/días
    const normalize = (s: string) =>
      String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const dayTokens = ['lunes', 'martes', 'miercoles', 'miércoles', 'jueves', 'viernes', 'sabado', 'sábado', 'domingo', 'proximo', 'próximo', 'prox', 'siguiente'];
    const containsDateLike = (text: string): boolean => {
      const t = normalize(text);
      if (/\b\d{4}-\d{2}-\d{2}\b/.test(t)) return true; // AAAA-MM-DD
      if (/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/.test(t)) return true; // DD/MM o DD/MM/AAAA (indicio)
      return dayTokens.some((d) => t.includes(normalize(d)));
    };

    const conversationalSystemInstruction: Content = {
      role: 'user',
      parts: [
        {
          text: `
Eres VidaBot, asistente de VidaMed. Tu objetivo es agendar citas con un flujo ESTRICTO de slot-filling. Reglas obligatorias:
- Mantén el contexto del historial. NO reinicies ni cambies de tema salvo que el usuario lo pida expresamente.
- UNA sola pregunta por turno, breve y concreta.
- Si el usuario confirma con "sí/ok/bien", interpreta como confirmación del paso actual y avanza al SIGUIENTE slot.
- Orden ESTRICTA de slots:
  1) Tipo(s) de estudio: pregunta si es un solo estudio o varios. Si son varios, solicita la lista completa (studies[]).
  2) Fecha y hora: primero la fecha (usa getAvailability si dan un día o fecha). Después de confirmar fecha disponible, OBLIGATORIAMENTE llama a getAvailableHours para listar horas libres de ese día y pide al paciente elegir una hora (HH:mm en 24h) de esa lista.
  3) Ubicación: "sede" o "domicilio". Si "domicilio", más adelante requerirás dirección.
  4) Datos del paciente, en este ORDEN exacto:
     - Primer nombre (obligatorio)
     - Segundo nombre (si el paciente dice que no tiene, omítelo)
     - Primer apellido (obligatorio)
     - Segundo apellido (si el paciente dice que no tiene, omítelo)
     - Número de cédula (obligatorio)
     - Número telefónico (obligatorio)
     - Email (opcional; si no tiene, omítelo)
     - Dirección del domicilio (solo si ubicación fue "domicilio"; en caso contrario, omítelo)
  5) Resumen y confirmación: Muestra TODOS los datos recolectados y pregunta si son correctos. SOLO si el usuario confirma, llama a scheduleAppointment.
- Llama scheduleAppointment únicamente cuando tengas TODOS los campos obligatorios del esquema, en especial: studies[], date (YYYY-MM-DD), time (HH:mm), location, y los datos obligatorios del paciente.
- No inventes datos. No agregues temas ajenos. Mantén el tono profesional y conciso.
          `,
        },
      ],
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
          const freeSlots = allSlots.filter((s) => !bookedSet.has(s));

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
        return { error: 'Debes indicar una fecha válida en formato YYYY-MM-DD.' };
      }
      try {
        // Si el día está bloqueado, no ofrecer horas
        const { data: blockedDay, error: dayErr } = await supabaseAdmin
          .from('dias_no_disponibles')
          .select('fecha')
          .eq('fecha', date);
        if (dayErr) throw dayErr;
        if (blockedDay && blockedDay.length > 0) {
          return { error: `El día ${date} está bloqueado para agendamiento.` };
        }

        const allSlots = generateDailySlots('07:00', '17:00', 30);
        const booked = await getBookedTimesForDate(date);
        const available = allSlots.filter((s) => !booked.has(s));
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
        } = patientInfo;

        if (!primer_nombre) return { error: 'Falta el primer nombre del paciente.' };
        if (!primer_apellido) return { error: 'Falta el primer apellido del paciente.' };
        if (!cedula) return { error: 'Falta el número de cédula del paciente.' };
        if (!telefono) return { error: 'Falta el número telefónico del paciente.' };
        if (String(location).toLowerCase() === 'domicilio' && !direccion) {
          return { error: 'La dirección es obligatoria cuando la ubicación es domicilio.' };
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
              direccion: String(location).toLowerCase() === 'domicilio' ? direccion : null,
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
          ubicacion: location,
          status: 'agendada',
        });
        if (appointmentError) throw appointmentError;

        return {
          result: `¡Cita agendada con éxito para ${nombres} ${apellidos} el ${fechaCita}! Su ID de paciente es ${(patientData as any).id}.`,
        };
      } catch (error: any) {
        console.error('Error inesperado en scheduleAppointment:', error);
        return { error: 'Lo siento, ocurrió un error interno inesperado.', details: error.message };
      }
    };

    // Declaración de herramientas para el modelo
    const tools: Tool[] = [
      {
        functionDeclarations: [
          {
            name: 'getAvailability',
            description: 'Verifica disponibilidad de una fecha. Acepta días de la semana o fecha YYYY-MM-DD. Devuelve días disponibles y, si el día está libre, horarios disponibles.',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                date: { type: SchemaType.STRING, description: 'Día (lunes a sábado) o fecha en formato YYYY-MM-DD.' },
              },
              required: ['date'],
            },
          },
          {
            name: 'getAvailableHours',
            description: 'Devuelve las horas disponibles (HH:mm) para una fecha confirmada, evitando choques con citas existentes.',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                date: { type: SchemaType.STRING, description: 'Fecha en formato YYYY-MM-DD' },
              },
              required: ['date'],
            },
          },
          {
            name: 'scheduleAppointment',
            description: 'Crea la cita en la base de datos después de confirmar todos los datos.',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                patientInfo: {
                  type: SchemaType.OBJECT,
                  properties: {
                    primer_nombre: { type: SchemaType.STRING, description: 'Primer nombre del paciente' },
                    segundo_nombre: { type: SchemaType.STRING, description: 'Segundo nombre del paciente (opcional)' },
                    primer_apellido: { type: SchemaType.STRING, description: 'Primer apellido del paciente' },
                    segundo_apellido: { type: SchemaType.STRING, description: 'Segundo apellido del paciente (opcional)' },
                    cedula: { type: SchemaType.STRING, description: 'Número de cédula' },
                    telefono: { type: SchemaType.STRING, description: 'Número telefónico' },
                    email: { type: SchemaType.STRING, description: 'Correo electrónico (opcional)' },
                    direccion: { type: SchemaType.STRING, description: 'Dirección del domicilio (requerida si location=domicilio)' },
                  },
                  required: ['primer_nombre', 'primer_apellido', 'cedula', 'telefono'],
                },
                studies: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: 'Lista de estudios' },
                date: { type: SchemaType.STRING, description: 'Fecha en formato YYYY-MM-DD' },
                time: { type: SchemaType.STRING, description: 'Hora en formato HH:mm (24h)' },
                location: { type: SchemaType.STRING, description: 'sede | domicilio' },
              },
              required: ['patientInfo', 'studies', 'date', 'time', 'location'],
            },
          },
        ],
      },
    ];

    const model = genAI.getGenerativeModel({ model: DEFAULT_GEMINI_MODEL });
    const conversationalModel = genAI.getGenerativeModel({
      model: DEFAULT_GEMINI_MODEL,
      systemInstruction: conversationalSystemInstruction,
      tools,
    });

    // Intercepción temprana: si el usuario brinda un día/fecha, priorizar verificación de disponibilidad
    if (containsDateLike(lastUserMessage)) {
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
      const classifierPrompt =
        `${classifierSystemInstruction}\n\n` +
        `--- Historial ---\n${transcript}\n--- Fin ---\n\n` +
        `Último mensaje del usuario: "${lastUserMessage}"\n` +
        `Categoría:`;
      const intentResult = await model.generateContent(classifierPrompt);
      intent = intentResult.response.text().trim();
    }
    console.log(`Intención Detectada: ${intent}`);

    // 2) Ejecutar flujo según intención
    switch (intent) {
      case 'CONSULTA_ESTUDIO': {
        const extractorChat = model.startChat({
          history: [{ role: 'user', parts: [{ text: entityExtractorSystemInstruction }] }],
        });
        const extractorResult = await extractorChat.sendMessage(lastUserMessage);
        const studyName = extractorResult.response.text().trim();

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
          responseText = `Aquí tienes la información sobre "${study.nombre}":\n- Descripción: ${study.descripcion}\n- Preparación: ${study.preparacion}\n- Costo: ${study.costo_usd} USD / ${study.costo_bs} Bs.\n- Tiempo de Entrega: ${study.tiempo_entrega}\n`;
          if (studyInfoResult.studies.length > 1) {
            const otherNames = studyInfoResult.studies.slice(1).map((s: any) => s.nombre).join(', ');
            responseText += `\nTambién encontré otros estudios similares: ${otherNames}.`;
          }
        } else {
          responseText = studyInfoResult.result || 'No se encontró información para ese estudio.';
        }

        responseText += '\n\n¿Te gustaría agendar una cita para este estudio o consultar otro?';
        res.status(200).json({ response: responseText });
        return;
      }

      case 'AGENDAR_CITA': {
        const conversationalChat = conversationalModel.startChat({ history });
        const conversationalResult = await conversationalChat.sendMessage(lastUserMessage);
        const conversationalResponse = conversationalResult.response;
        const conversationalFunctionCalls = conversationalResponse.functionCalls();

        if (conversationalFunctionCalls && conversationalFunctionCalls.length > 0) {
          const toolResponses: Part[] = [];
          for (const call of conversationalFunctionCalls) {
            const { name, args } = call as any;
            let functionResult: any;
            if (name === 'getAvailability') functionResult = await getAvailability(args as any);
            else if (name === 'getAvailableHours') functionResult = await getAvailableHours(args as any);
            else if (name === 'scheduleAppointment') functionResult = await scheduleAppointment(args as any);
            else functionResult = { error: `Función '${name}' no válida en este contexto.` };

            toolResponses.push({ functionResponse: { name, response: functionResult } } as Part);
          }
          const secondResult = await conversationalChat.sendMessage(toolResponses);
          res.status(200).json({ response: secondResult.response.text() });
          return;
        }

        res.status(200).json({ response: conversationalResponse.text() });
        return;
      }

      case 'SALUDO': {
        // Saludo fijo y breve, centrado en el dominio (sin riesgo de alucinación)
        res.status(200).json({
          response:
            '¡Hola! Soy VidaBot. Puedo ayudarte a consultar estudios y precios o agendar una cita. ¿Qué necesitas?',
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

          const conversationalChat = conversationalModel.startChat({ history });
          const conversationalResult = await conversationalChat.sendMessage(lastUserMessage);
          const conversationalResponse = conversationalResult.response;
          const conversationalFunctionCalls = conversationalResponse.functionCalls();

          if (conversationalFunctionCalls && conversationalFunctionCalls.length > 0) {
            const toolResponses: Part[] = [];
            for (const call of conversationalFunctionCalls) {
              const { name, args } = call as any;
              let functionResult: any;
              if (name === 'getAvailability') functionResult = await getAvailability(args as any);
              else if (name === 'getAvailableHours') functionResult = await getAvailableHours(args as any);
              else if (name === 'scheduleAppointment') functionResult = await scheduleAppointment(args as any);
              else functionResult = { error: `Función '${name}' no válida en este contexto.` };

              toolResponses.push({ functionResponse: { name, response: functionResult } } as Part);
            }
            const secondResult = await conversationalChat.sendMessage(toolResponses);
            res.status(200).json({ response: secondResult.response.text() });
            return;
          }

          res.status(200).json({ response: conversationalResponse.text() });
          return;
        }

        // Mensaje corto y directo para entradas fuera de flujo
        const concise = await model.generateContent(
          `Responde en una sola frase, breve y directa, a este mensaje de un paciente de laboratorio, evitando informalidades y sin cambiar de tema. 
          Ofrece opciones: consultar estudios/precios o agendar una cita. 
          Mensaje: "${lastUserMessage}"`
        );
        res.status(200).json({ response: concise.response.text().trim() });
        return;
      }
    }
  } catch (error: any) {
    console.error('Error en /api/chat (serverless):', error);
    res.status(500).json({ error: error?.message || 'Error interno' });
  }
}
