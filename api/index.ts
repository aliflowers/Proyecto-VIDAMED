import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { bedrockChat, BedrockMessage, BedrockTool } from './bedrock.js';
import { nextDay, format, isFuture, parseISO } from 'date-fns';
import path from 'path';
import notifyWhatsappHandler from './notify/whatsapp.js';
import { logServerAudit } from './_utils/audit.js';
import notifyEmailHandler from './notify/email.js';
import { sendAppointmentConfirmationEmail, sendAppointmentReminderEmail } from './notify/appointment-email.js';
// Eliminado: nodemailer ya no es necesario para recuperación de contraseña
const app = express();
async function startServer() {
    // Forzar la carga del archivo .env desde la raíz del proyecto
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });

    // Usar directamente las variables privadas del entorno
    const bedrockToken = process.env.AWS_BEARER_TOKEN_BEDROCK;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!bedrockToken || !supabaseUrl || !supabaseServiceKey) {
        const missing = [
            !bedrockToken ? 'AWS_BEARER_TOKEN_BEDROCK' : null,
            !supabaseUrl ? 'SUPABASE_URL' : null,
            !supabaseServiceKey ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
        ].filter(Boolean);
        console.error(`Error: Faltan variables de entorno críticas en el archivo .env de la raíz: ${missing.join(', ')}`);
        process.exit(1);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const BEDROCK_MODEL = process.env.BEDROCK_DEFAULT_MODEL || 'openai.gpt-oss-120b-1:0';
    
    
    const port = process.env.PORT || 3001;

    app.use(cors());
    app.use(express.json());

    // Endpoint para enviar recordatorios de citas del día siguiente
    app.post('/api/reminders/send-next-day', async (_req: Request, res: Response) => {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const yyyy = tomorrow.getFullYear();
            const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const dd = String(tomorrow.getDate()).padStart(2, '0');
            const tzDatePrefix = `${yyyy}-${mm}-${dd}`;

            const { data: citas, error: citasErr } = await supabaseAdmin
                .from('citas')
                .select('id, paciente_id, fecha_cita, ubicacion, estudios_solicitados')
                .like('fecha_cita', tzDatePrefix + '%');
            if (citasErr) throw citasErr;

            const results: Array<{ citaId: string; email?: string; sent?: boolean; error?: string }> = [];
            for (const c of (citas || [])) {
                try {
                    const { data: paciente, error: pErr } = await supabaseAdmin
                        .from('pacientes')
                        .select('id, nombres, apellidos, email, telefono, cedula_identidad')
                        .eq('id', c.paciente_id)
                        .single();
                    if (pErr) throw pErr;
                    const email = (paciente as any)?.email;
                    if (!email) {
                        results.push({ citaId: c.id, email: undefined, sent: false, error: 'Paciente sin email' });
                        continue;
                    }
                    await sendAppointmentReminderEmail({
                        to: email,
                        patientName: `${(paciente as any)?.nombres || ''} ${(paciente as any)?.apellidos || ''}`.trim(),
                        location: c.ubicacion,
                        studies: Array.isArray(c.estudios_solicitados) ? c.estudios_solicitados : [],
                        dateIso: c.fecha_cita,
                        phone: (paciente as any)?.telefono || undefined,
                        cedula: (paciente as any)?.cedula_identidad || undefined,
                    });
                    results.push({ citaId: c.id, email, sent: true });
                } catch (e: any) {
                    results.push({ citaId: c.id, email: undefined, sent: false, error: e?.message || String(e) });
                }
            }

            res.status(200).json({ ok: true, count: results.length, results });
        } catch (e: any) {
            console.error('Error en send-next-day reminders:', e);
            res.status(500).json({ ok: false, error: e?.message || 'Error interno' });
        }
    });

    // Endpoint para enviar confirmación de cita (usado por SchedulingPage)
    app.post('/api/appointments/send-confirmation', async (req: Request, res: Response) => {
        try {
            const {
                to,
                patientName,
                cedula,
                phone,
                location,
                studies,
                dateIso,
                summaryText,
            } = req.body || {};

            if (!to || typeof to !== 'string') {
                return res.status(400).json({ ok: false, error: 'Falta el correo del destinatario (to).' });
            }

            const info = await sendAppointmentConfirmationEmail({
                to,
                patientName,
                cedula,
                phone,
                location,
                studies,
                dateIso,
                summaryText,
            });

            return res.status(200).json({ ok: true, messageId: info.messageId });
        } catch (error: any) {
            console.error('Error enviando confirmación de cita:', error);
            return res.status(500).json({ ok: false, error: error?.message || 'Error interno' });
        }
    });

    // Flujo nativo de Supabase: la recuperación de contraseña se gestiona vía enlace.

    // Eliminado: verificación de código OTP (migrado al flujo nativo)

    // Eliminado: confirmación OTP (migrado al flujo nativo)

    // --- INICIO DE LA ARQUITECTURA DE ENRUTADOR v2.0 ---

    const classifierSystemInstruction = `Tu única función es clasificar la intención del último mensaje del usuario en una de las siguientes categorías: CONSULTA_ESTUDIO, AGENDAR_CITA, SALUDO, DESCONOCIDO. Responde únicamente con la categoría.`;
    const entityExtractorSystemInstruction = `Tu única función es extraer el nombre del examen o estudio médico del texto del usuario. Devuelve SOLO un nombre de estudio, sin comas ni texto extra. Si el texto menciona varios estudios, devuelve el más claro (idealmente el último mencionado). Si no hay un nombre de estudio claro, responde con "NO_ENCONTRADO". Responde únicamente con el nombre del estudio.`;
    
    // Saneador robusto del nombre de estudio extraído desde la IA
    const sanitizeExtractedStudyName = (raw: string): string | null => {
        if (!raw) return null;
        let s = String(raw).trim();
        // Intentar extraer el último texto entre comillas
        const quotedMatches = Array.from(s.matchAll(/"([^"]{3,})"/g));
        if (quotedMatches.length > 0) {
            const lastQuoted = quotedMatches[quotedMatches.length - 1][1].trim();
            if (lastQuoted && lastQuoted.toUpperCase() !== 'NO_ENCONTRADO') return lastQuoted;
        }
        // Si hay múltiples líneas, tomar la última no vacía
        const lines = s.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length > 0) s = lines[lines.length - 1];
        // Separar por puntuación y tomar el último segmento con contenido
        const segments = s.split(/[.:]/).map(seg => seg.trim()).filter(Boolean);
        const lastSegment = segments.length ? segments[segments.length - 1] : s;
        const cleaned = lastSegment.replace(/[“”"']+/g, '').replace(/[.,;:!?]+$/g, '').trim();
        if (!cleaned || cleaned.toUpperCase() === 'NO_ENCONTRADO') return null;
        return cleaned;
    };
    // Normalizador sin acentos para coincidencias robustas
    const normalize = (s: string) =>
        String(s || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

    // Mapeo de sinónimos comunes a nombres canónicos en BD
    const toCanonicalStudyName = (raw: string): string => {
        const t = normalize(String(raw || ''));
        if (/(hemograma|hematologia\s+completa)/.test(t)) return 'HEMATOLOGIA COMPLETA CON PLAQUETAS';
        if (/(examen|analisis|an[aá]lisis).*orina/.test(t)) {
            if (!/(catecolaminas|citrato|oxalato|cocaina)/.test(t)) return 'EXAMEN DE ORINA';
        }
        if (/(perfil\s+lipidico|lipidico)/.test(t)) return 'PERFIL LIPIDICO';
        return raw;
    };

    // Split básico de múltiples estudios en una sola frase
    const splitStudyQueries = (text: string): string[] => {
        if (!text) return [];
        let s = String(text);
        s = s.replace(/\s+y\s+/gi, ',').replace(/\s+e\s+/gi, ',');
        const parts = s.split(/[\,\n]/).map(p => p.trim()).filter(Boolean);
        return parts.filter(p => p.length >= 3);
    };
    
    const conversationalSystemInstruction = `
Eres VidaBot, asistente de VidaMed. Debes agendar citas siguiendo un flujo ESTRICTO de slot-filling, preguntando UNA sola cosa por turno.
Orden de slots:
1) Estudios solicitados (uno o varios). Si son varios, pide la lista completa.
2) Fecha y hora: primero verifica fecha con getAvailability (acepta día de la semana o YYYY-MM-DD). Una vez confirmada la fecha, llama OBLIGATORIAMENTE a getAvailableHours para listar horas libres y pide elegir una hora (HH:mm 24h) de esa lista.
3) Ubicación: normaliza y confirma una de estas opciones EXACTAS: "Sede Principal Maracay" | "Sede La Colonia Tovar" | "Servicio a Domicilio".
   - Sinónimos: "domicilio", "a domicilio", "en casa" ⇒ "Servicio a Domicilio"; "Maracay"/"principal" ⇒ "Sede Principal Maracay"; "Colonia Tovar" ⇒ "Sede La Colonia Tovar".
   - Si es "Servicio a Domicilio", exige dirección y ciudad_domicilio ("Maracay" o "La Colonia Tovar").
4) Datos del paciente: primer_nombre, segundo_nombre (opcional), primer_apellido, segundo_apellido (opcional), cedula, telefono, email (opcional).
    - Al confirmar cada dato, MUESTRA el valor exactamente UNA sola vez y no lo dupliques ni lo concatenes. Ejemplo correcto: "Ok, primer nombre: Bob". Evita respuestas como "BobBob", "GomezGomez" o "GuzmanGuzman".
    - Validación de cédula: acepta únicamente dígitos entre 7 y 9 caracteres (inclusive). Si el número tiene 7, 8 o 9 dígitos, confírmalo sin advertencias. Solo pide corrección si está fuera de ese rango con el mensaje: "La cédula debe tener entre 7 y 9 dígitos".
5) Confirmación final: recapitula todo y, tras confirmación, llama a scheduleAppointment.
Responde breve, precisa y mantén el contexto sin reiniciar.

Consultas de Estudios:
- Si el usuario pregunta por un estudio, usa la herramienta getStudiesInfo con el nombre detectado.
- Responde con: nombre del estudio, categoría, descripción, preparación, tipo de muestra, costo (USD y Bs), y tiempo de entrega (ELISA/Otros) tomando de "tiempo_entrega_elisa_otro" o, si falta, de "tiempo_entrega".
- Si hay varios estudios similares, menciona los nombres adicionales y ofrece ayudar a elegir.
- Mantén un tono conciso y técnico; ofrece agendar al final si aplica.
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
        // Colapsar palabras consecutivas duplicadas
        let out = text.replace(/\b([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)\s+\1\b/g, '$1');
        // Colapsar tokens concatenados duplicados en letras
        out = out.replace(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}/g, (m) => collapseInnerDupesInToken(m));
        // Colapsar números telefónicos repetidos (con o sin separadores) adyacentes
        out = out.replace(/(\+?\d[\d\s\-]{6,}\d)\s*\1/g, '$1');
        // Colapsar correos electrónicos repetidos adyacentes, con o sin separadores
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
        return cleaned.replace(/^\s*Reasoning:\s*[\s\S]*$/im, '').trim();
    };

    const applyOutputGuardrails = (text: string, userMsg?: string): string => {
        const noDupes = fixEchoDupes(text);
        const noReasoning = stripReasoningBlocks(noDupes);
        return enforceCedulaRule(noReasoning, userMsg);
    };

    // --- FUNCIONES DE HERRAMIENTAS ---
    const getNextDateForDay = (dayName: string): string => {
        const dayMapping: { [key: string]: number } = { domingo: 0, lunes: 1, martes: 2, miércoles: 3, jueves: 4, viernes: 5, sábado: 6 };
        const lowerDayName = dayName.toLowerCase();
        if (dayMapping[lowerDayName] === undefined) {
            if (/\d{4}-\d{2}-\d{2}/.test(lowerDayName) && isFuture(parseISO(lowerDayName))) return lowerDayName;
            return 'Día no válido';
        }
        const dayIndex = dayMapping[lowerDayName] as 0 | 1 | 2 | 3 | 4 | 5 | 6;
        const nextDate = nextDay(new Date(), dayIndex);
        return format(nextDate, 'yyyy-MM-dd');
    };

    const getStudiesInfo = async (args: { studyName: string }): Promise<object> => {
        const { studyName } = args;
        if (!studyName) return { error: "El usuario no especificó un nombre de estudio." };
        const { data, error } = await supabaseAdmin.rpc('search_studies', { search_term: studyName });
        if (error) { console.error("Error fetching study info:", error); return { error: "Ocurrió un error al buscar en la base de datos." }; }
        if (!data || data.length === 0) return { result: `No se encontró un estudio que coincida con "${studyName}".` };
        return { studies: data };
    };

    const getAvailability = async (args: { date: string }): Promise<object> => {
        const { date } = args;
        const targetDate = getNextDateForDay(date);
        if (targetDate === 'Día no válido') return { error: `Lo siento, no pude entender la fecha "${date}". Indícame un día (lunes a sábado) o una fecha en formato YYYY-MM-DD.`, meta: { type: 'error', code: 'INVALID_DATE', slot: 'date', format: 'YYYY-MM-DD o lunes-sábado' }};
        try {
            const { data, error } = await supabaseAdmin.from('dias_no_disponibles').select('fecha').eq('fecha', targetDate);
            if (error) throw error;
            if (data && data.length > 0) {
                const dayOfWeek = new Date(targetDate + 'T00:00:00').getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
                const nextWeekDate = format(nextDay(parseISO(targetDate), dayOfWeek), 'yyyy-MM-dd');
                return { result: `La fecha más próxima para un ${date} (${targetDate}) no está disponible. ¿Te gustaría agendar para la siguiente semana, el día ${nextWeekDate}?` };
            } else {
                return { result: `¡Buenas noticias! El día ${date}, ${targetDate}, está disponible. ¿Confirmo esta fecha para tu cita?` };
            }
        } catch (error: any) { console.error("Error fetching availability:", error); return { error: "Lo siento, hubo un error al verificar la disponibilidad.", details: error.message }; }
    };

    // Horas disponibles para una fecha confirmada (HH:mm), evitando choques
    const getAvailableHours = async (args: { date: string }): Promise<object> => {
        const { date } = args;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
            return { error: 'La fecha debe tener formato YYYY-MM-DD para listar horas.', meta: { type: 'error', code: 'INVALID_DATE_FORMAT', slot: 'date', format: 'YYYY-MM-DD' } };
        }
        try {
            // Verificar si la fecha está bloqueada
            const { data: blocked, error: blockedErr } = await supabaseAdmin
                .from('dias_no_disponibles')
                .select('fecha')
                .eq('fecha', date);
            if (blockedErr) throw blockedErr;
            if (blocked && blocked.length > 0) {
                return { error: `La fecha ${date} no está disponible. Indica otra fecha.`, meta: { type: 'error', code: 'DATE_BLOCKED', slot: 'date' } };
            }

            // Generar slots de 30 minutos entre 07:00 y 17:00
            const startHour = 7, endHour = 17;
            const slots: string[] = [];
            for (let h = startHour; h < endHour; h++) {
                slots.push(`${String(h).padStart(2,'0')}:00`);
                slots.push(`${String(h).padStart(2,'0')}:30`);
            }

            // Obtener citas existentes para evitar choques
            const tzDatePrefix = `${date}T`;
            const { data: appointments, error: apErr } = await supabaseAdmin
                .from('citas')
                .select('fecha_cita')
                .like('fecha_cita', tzDatePrefix + '%');
            if (apErr) throw apErr;
            const bookedTimes = new Set<string>((appointments || []).map((r: any) => String(r.fecha_cita).slice(11,16)));
            
            // Excluir horarios bloqueados manualmente (horarios_no_disponibles) por ubicación por defecto
            const DEFAULT_LOCATION = 'Sede Principal Maracay';
            const { data: blockedSlots, error: bsErr } = await supabaseAdmin
                .from('horarios_no_disponibles')
                .select('hora, ubicacion')
                .eq('fecha', date)
                .eq('ubicacion', DEFAULT_LOCATION);
            if (bsErr) throw bsErr;
            const blockedSet = new Set<string>((blockedSlots || []).map((r: any) => String(r.hora)));
            const available = slots.filter(t => !bookedTimes.has(t) && !blockedSet.has(t));

            return { result: `Horas disponibles para ${date}: ${available.join(', ')}`, hours: available };
        } catch (e: any) {
            console.error('Error getAvailableHours:', e);
            return { error: 'No pude listar las horas disponibles. Intenta de nuevo.', details: e.message };
        }
    };

    const scheduleAppointment = async (args: { patientInfo: any, studies: string[], date: string, time?: string, location: string }): Promise<object> => {
        const { patientInfo, studies, date, time, location } = args;
        try {
            if (!Array.isArray(studies) || studies.length === 0) return { error: 'Debes indicar al menos un estudio.', meta: { type: 'error', code: 'MISSING_STUDIES', slot: 'studies' } };
            if (!date) return { error: 'Falta la fecha de la cita (YYYY-MM-DD).', meta: { type: 'error', code: 'MISSING_DATE', slot: 'date', format: 'YYYY-MM-DD' } };
            if (!patientInfo) return { error: 'Faltan los datos del paciente.', meta: { type: 'error', code: 'MISSING_PATIENT', slot: 'patientInfo' } };
            const { primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, cedula, telefono, email, direccion, ciudad_domicilio } = patientInfo;
            if (!primer_nombre) return { error: 'Falta el primer nombre del paciente.', meta: { type: 'error', code: 'MISSING_FIRST_NAME', slot: 'primer_nombre' } };
            if (!primer_apellido) return { error: 'Falta el primer apellido del paciente.', meta: { type: 'error', code: 'MISSING_FIRST_LASTNAME', slot: 'primer_apellido' } };
            if (!cedula) return { error: 'Falta el número de cédula del paciente.', meta: { type: 'error', code: 'MISSING_ID', slot: 'cedula' } };
            if (!telefono) return { error: 'Falta el número telefónico del paciente.', meta: { type: 'error', code: 'MISSING_PHONE', slot: 'telefono' } };

            // Normalizar ubicación enumerada
            const normalizeLocation = (s: string): 'Sede Principal Maracay' | 'Sede La Colonia Tovar' | 'Servicio a Domicilio' | null => {
                const t = String(s || '').toLowerCase();
                if (!t.trim()) return null;
                if (t.includes('domicilio') || t.includes('casa')) return 'Servicio a Domicilio';
                if (t.includes('colonia') && t.includes('tovar')) return 'Sede La Colonia Tovar';
                if (t.includes('maracay') || t.includes('principal') || t.includes('sede')) return 'Sede Principal Maracay';
                return null;
            };
            const ubicacionEnum = normalizeLocation(String(location)) || (location as any);
            if (!ubicacionEnum || !['Sede Principal Maracay','Sede La Colonia Tovar','Servicio a Domicilio'].includes(ubicacionEnum)) {
                return { error: 'Ubicación inválida. Elige: "Sede Principal Maracay", "Sede La Colonia Tovar" o "Servicio a Domicilio".', meta: { type: 'error', code: 'INVALID_LOCATION', slot: 'location', options: ['Sede Principal Maracay','Sede La Colonia Tovar','Servicio a Domicilio'] } };
            }
            if (ubicacionEnum === 'Servicio a Domicilio') {
                if (!direccion || !String(direccion).trim()) {
                    return { error: 'La dirección es obligatoria para "Servicio a Domicilio".', meta: { type: 'error', code: 'MISSING_ADDRESS', slot: 'direccion' } };
                }
                const ciudadNorm = String(ciudad_domicilio || '').trim();
                if (!ciudadNorm) {
                    return { error: 'La ciudad del domicilio es obligatoria: Maracay o La Colonia Tovar.', meta: { type: 'error', code: 'MISSING_CITY', slot: 'ciudad_domicilio', options: ['Maracay','La Colonia Tovar'] } };
                }
                if (!['Maracay','La Colonia Tovar'].includes(ciudadNorm)) {
                    return { error: 'Ciudad de domicilio no válida. Debe ser "Maracay" o "La Colonia Tovar".', meta: { type: 'error', code: 'INVALID_CITY', slot: 'ciudad_domicilio', options: ['Maracay','La Colonia Tovar'] } };
                }
            }

            // Hora requerida y normalizada
            const timeNorm = time && /^\d{2}:\d{2}$/.test(time) ? time : undefined;
            if (!timeNorm) {
                return { error: 'Falta la hora de la cita (HH:mm en formato 24h).', meta: { type: 'error', code: 'MISSING_TIME', slot: 'time', format: 'HH:mm' } };
            }
            const cleanedCedula = String(patientInfo.cedula).replace(/\D/g, '');
            const cleanedTelefono = String(patientInfo.telefono).replace(/\D/g, '');
            let patientId: string;
            const { data: existingPatient, error: findError } = await supabaseAdmin.from('pacientes').select('id').eq('cedula_identidad', cleanedCedula).single();
            if (existingPatient) {
                patientId = existingPatient.id;
            } else if (findError && findError.code !== 'PGRST116') {
                throw findError;
            } else {
                const { data: newId, error: rpcError } = await supabaseAdmin.rpc('generate_patient_id', { nombre: patientInfo.nombres, apellido: patientInfo.apellidos });
                if (rpcError) throw rpcError;
                patientId = newId;
            }
            const nombres = `${primer_nombre}${segundo_nombre ? ' ' + segundo_nombre : ''}`;
            const apellidos = `${primer_apellido}${segundo_apellido ? ' ' + segundo_apellido : ''}`;
            const { data: patientData, error: patientError } = await supabaseAdmin.from('pacientes').upsert({ id: patientId, cedula_identidad: cleanedCedula, nombres, apellidos, email: email || null, telefono: cleanedTelefono, direccion: ubicacionEnum === 'Servicio a Domicilio' ? direccion : null, ciudad_domicilio: ubicacionEnum === 'Servicio a Domicilio' ? (ciudad_domicilio || null) : null }, { onConflict: 'id' }).select().single();
            if (patientError) throw patientError;
        const fechaCita = `${date}T${timeNorm}:00-04:00`;
        const { error: appointmentError } = await supabaseAdmin.from('citas').insert({ paciente_id: patientData.id, fecha_cita: fechaCita, estudios_solicitados: studies, ubicacion: ubicacionEnum, status: 'agendada' });
        if (appointmentError) throw appointmentError;

            // Enviar email de confirmación si hay correo
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
                } catch (e) {
                    console.warn('[notify] Falló el envío de email de confirmación:', (e as any)?.message || e);
                }
            }
        return { result: `¡Cita agendada con éxito para ${nombres} ${apellidos} el ${fechaCita}! Su ID de paciente es ${patientData.id}.` };
        } catch (error: any) { console.error("Error inesperado en scheduleAppointment:", error); return { error: "Lo siento, ocurrió un error interno inesperado.", details: error.message }; }
    };
    
    const bedrockTools: BedrockTool[] = [
      {
        type: 'function',
        function: {
          name: 'getStudiesInfo',
          description: 'Obtiene información detallada de un estudio: categoría, descripción, preparación, precios USD/Bs, tiempo de entrega ELISA/Otros y tipo de muestra.',
          parameters: {
            type: 'object',
            properties: {
              studyName: { type: 'string', description: 'Nombre del estudio a consultar (texto libre).' }
            },
            required: ['studyName']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'getAvailability',
          description: 'Verifica disponibilidad de una fecha. Acepta días de la semana o fecha YYYY-MM-DD.',
          parameters: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'Día (lunes a sábado) o fecha YYYY-MM-DD.' }
            },
            required: ['date']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'getAvailableHours',
          description: 'Lista horas disponibles (HH:mm) para una fecha confirmada.',
          parameters: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'Fecha YYYY-MM-DD.' }
            },
            required: ['date']
          }
        }
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
                  primer_nombre: { type: 'string' },
                  segundo_nombre: { type: 'string' },
                  primer_apellido: { type: 'string' },
                  segundo_apellido: { type: 'string' },
                  cedula: { type: 'string' },
                  telefono: { type: 'string' },
                  email: { type: 'string' },
                  direccion: { type: 'string' },
                  ciudad_domicilio: { type: 'string', description: 'Requerida si ubicación es "Servicio a Domicilio". Valores: Maracay | La Colonia Tovar' },
                },
                required: ['primer_nombre','primer_apellido','cedula','telefono'],
              },
              studies: { type: 'array', items: { type: 'string' } },
              date: { type: 'string' },
              time: { type: 'string', description: 'Hora de la cita en formato HH:mm (24h)' },
              location: { type: 'string', description: 'Ubicación normalizada: "Sede Principal Maracay" | "Sede La Colonia Tovar" | "Servicio a Domicilio"' },
            },
            required: ['patientInfo','studies','date','time','location'],
          }
        }
      }
    ];
    
    const toBedrockMessages = (history: any[]): BedrockMessage[] => {
      const msgs: BedrockMessage[] = [];
      for (const m of Array.isArray(history) ? history : []) {
        const role = m.role === 'model' ? 'assistant' : (m.role || 'user');
        const parts = Array.isArray(m.parts) ? m.parts : [];
        const text = parts.map((p: any) => typeof p?.text === 'string' ? p.text : '').filter(Boolean).join('\n').trim();
        if (text) msgs.push({ role, content: text });
      }
      return msgs;
    };

    function buildAssistantToolCallMessage(toolCalls: Array<{ id?: string; name: string; arguments: any }>): BedrockMessage {
      return {
        role: 'assistant',
        // Bedrock/OpenAI requieren content presente aunque esté vacío cuando se incluyen tool_calls
        content: '',
        tool_calls: toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments ?? {}) },
        })),
      };
    }

    async function runBedrockToolCalls(toolCalls: Array<{ id?: string; name: string; arguments: any }>): Promise<{ toolMessages: BedrockMessage[]; metaPayload?: any }> {
      const toolMessages: BedrockMessage[] = [];
      let metaPayload: any = null;
      for (const tc of toolCalls) {
        let result: any;
        if (tc.name === 'getAvailability') result = await getAvailability(tc.arguments || {});
        else if (tc.name === 'getAvailableHours') result = await getAvailableHours(tc.arguments || {});
        else if (tc.name === 'scheduleAppointment') result = await scheduleAppointment(tc.arguments || {});
        else if (tc.name === 'getStudiesInfo') result = await getStudiesInfo(tc.arguments || {});
        else result = { error: `Función '${tc.name}' no válida en este contexto.` };
        if (result?.error && result?.meta && !metaPayload) metaPayload = result.meta;
        toolMessages.push({
          role: 'tool',
          tool_call_id: tc.id || '',
          content: JSON.stringify(result),
        });
      }
      return { toolMessages, metaPayload };
    }

    // --- LÓGICA DEL ENRUTADOR v2.0 (CORREGIDA) ---
    app.post('/api/chat', async (req: Request, res: Response) => {
      try {
        const { history } = req.body;
        if (!history || history.length === 0) {
          return res.status(400).json({ error: 'El historial de la conversación es requerido.' });
        }
        const lastUserMessage = history[history.length - 1]?.parts?.[0]?.text || '';

        // 1. Clasificar la intención del usuario con Bedrock
        const intentResp = await bedrockChat({
          model: BEDROCK_MODEL,
          messages: [
            { role: 'system', content: classifierSystemInstruction },
            { role: 'user', content: lastUserMessage },
          ],
          temperature: 0.0,
          top_p: 0.9,
        });
        const intent = intentResp.text.trim().toUpperCase();
        console.log(`Intención Detectada: ${intent}`);

        // 2. Actuar según la intención (Switch Lógico Corregido)
        switch (intent) {
            case 'CONSULTA_ESTUDIO': {
                // Intentar detectar múltiples estudios directamente del texto del usuario
                const requested = splitStudyQueries(lastUserMessage).map(toCanonicalStudyName);
                if (requested.length >= 2) {
                    const pieces: string[] = [];
                    for (const name of requested) {
                        const studyInfoResult = await getStudiesInfo({ studyName: name }) as any;
                        if (studyInfoResult.error) { pieces.push(studyInfoResult.error); continue; }
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
                    return res.status(200).json({ response: applyOutputGuardrails(responseText, lastUserMessage) });
                }

                // Flujo estándar: extraer un único estudio y aplicar sinónimos canónicos
                const extractorResp = await bedrockChat({
                  model: BEDROCK_MODEL,
                  messages: [
                    { role: 'system', content: entityExtractorSystemInstruction },
                    { role: 'user', content: lastUserMessage },
                  ],
                  temperature: 0.0,
                  top_p: 0.9,
                });
                const rawExtracted = extractorResp.text.trim();
                const studyNameRaw = sanitizeExtractedStudyName(rawExtracted) || rawExtracted;
                const studyName = toCanonicalStudyName(studyNameRaw);

                if (studyName === 'NO_ENCONTRADO' || !studyName) {
                    return res.status(200).json({ response: "Claro, con gusto te ayudo. ¿Qué estudio o examen te gustaría consultar?" });
                }

                const studyInfoResult = await getStudiesInfo({ studyName }) as any;

                if (studyInfoResult.error) {
                    return res.status(200).json({ response: studyInfoResult.error });
                }
                
                let responseText = "";
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
                    if (descripcionValida) {
                        responseText += `- Descripción: ${study.descripcion}\n`;
                    }
                    if (preparacionValida) {
                        responseText += `- Preparación: ${study.preparacion}\n`;
                    }
                    responseText += `- Tipo de muestra: ${muestra}\n- Costo: ${precioUsd} USD / ${precioBs} Bs.\n- Tiempo de Entrega: ${tiempoEntrega}\n`;
                    if (studyInfoResult.studies.length > 1) {
                        const otherNames = studyInfoResult.studies.slice(1).map((s: any) => s.nombre).join(', ');
                        responseText += `\nTambién encontré otros estudios similares: ${otherNames}.`;
                    }
                } else {
                    responseText = studyInfoResult.result || "No se encontró información para ese estudio.";
                }
                
                responseText += "\n\n¿Te gustaría agendar una cita para este estudio o consultar otro?";
                return res.status(200).json({ response: applyOutputGuardrails(responseText, lastUserMessage) });
            }

            case 'AGENDAR_CITA': {
                const baseMessages: BedrockMessage[] = [
                  { role: 'system', content: conversationalSystemInstruction },
                  ...toBedrockMessages(history),
                ];
                const first = await bedrockChat({
                  model: BEDROCK_MODEL,
                  messages: baseMessages,
                  tools: bedrockTools,
                  temperature: 0.2,
                  top_p: 0.9,
                });
                if (first.toolCalls && first.toolCalls.length > 0) {
                  const assistantToolMsg = buildAssistantToolCallMessage(first.toolCalls);
                  const { toolMessages, metaPayload } = await runBedrockToolCalls(first.toolCalls);
                  const second = await bedrockChat({
                    model: BEDROCK_MODEL,
                    messages: [...baseMessages, assistantToolMsg, ...toolMessages],
                    tools: bedrockTools,
                    temperature: 0.2,
                    top_p: 0.9,
                  });
                  return res.status(200).json({ response: applyOutputGuardrails(second.text, lastUserMessage), meta: metaPayload || undefined });
                }
                return res.status(200).json({ response: applyOutputGuardrails(first.text, lastUserMessage) });
            }

            case 'SALUDO':
            case 'DESCONOCIDO':
            default: {
                // Para saludos o intenciones no reconocidas, damos una respuesta conversacional simple sin herramientas
                const simple = await bedrockChat({
                  model: BEDROCK_MODEL,
                  messages: [
                    { role: 'system', content: 'Eres un asistente de laboratorio amable y servicial llamado VidaBot.' },
                    { role: 'user', content: lastUserMessage },
                  ],
                  temperature: 0.2,
                  top_p: 0.9,
                });
                return res.status(200).json({ response: applyOutputGuardrails(simple.text, lastUserMessage) });
            }
        }
      } catch (error: any) {
        console.error('Error en /api/chat:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // --- Generador de Contenido para Blog con IA ---
    app.post('/api/generate-blog-post', async (req: Request, res: Response) => {
      try {
        const { topic, postType, categories, tone, targetAudience } = req.body || {};
        if (!topic || typeof topic !== 'string') {
          return res.status(400).json({ error: "El campo 'topic' es requerido y debe ser texto." });
        }

        const safeCategories = Array.isArray(categories) ? categories.filter((c: any) => typeof c === 'string').slice(0, 12) : [];
        const type = typeof postType === 'string' ? postType : 'Educativa';
        const style = typeof tone === 'string' ? tone : 'Profesional';
        const audience = typeof targetAudience === 'string' ? targetAudience : 'Pacientes';

        const prompt = `Eres un generador de artículos para el Blog del Laboratorio Clínico VidaMed.
Tema: "${topic}".
Tipo de publicación: ${type}.
Tono: ${style}.
Público objetivo: ${audience}.
Categorías de estudios a mencionar (si aplica): ${safeCategories.join(', ') || 'Ninguna específica'}.

Instrucciones estrictas:
- Escribe un artículo completo en formato Markdown bien estructurado (títulos, subtítulos, listas, párrafos, enlaces si corresponde).
- No inventes resultados clínicos ni diagnósticos; sé educativo e informativo.
- Optimiza para SEO sin keyword stuffing.
- Incluye llamada a la acción final para agendar cita o consultar estudios.
- Responde EXCLUSIVAMENTE en un objeto JSON con las claves EXACTAS:
  {
    "titulo_articulo": string,
    "resumen": string,
    "contenido_html": string, // Contenido en Markdown
    "meta_titulo": string,
    "meta_descripcion": string,
    "keywords": string // Lista separada por comas
  }
- No incluyas comentarios, explicaciones adicionales, ni bloques de código triple.
`;

        const genResult = await bedrockChat({
          model: BEDROCK_MODEL,
          messages: [{ role: 'system', content: 'Eres un generador de artículos para el Blog del Laboratorio Clínico VidaMed.' }, { role: 'user', content: prompt }],
          temperature: 0.2,
          top_p: 0.9,
        });
        const rawText = genResult.text;

        // Intentar parsear JSON de forma robusta
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        let parsed: any;
        try {
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawText);
        } catch (e) {
          // Fallback: construir un objeto mínimo si el modelo no respetó el formato
          parsed = {
            titulo_articulo: `Artículo: ${topic}`,
            resumen: rawText.slice(0, 280),
            contenido_html: rawText,
            meta_titulo: `VidaMed | ${topic}`,
            meta_descripcion: `Artículo sobre ${topic} para ${audience}.`,
            keywords: [topic, 'salud', 'laboratorio clínico'].concat(safeCategories).join(', '),
          };
        }

        // Validación y saneo final
        const responsePayload = {
          titulo_articulo: typeof parsed.titulo_articulo === 'string' ? parsed.titulo_articulo.trim() : `Artículo: ${topic}`,
          resumen: typeof parsed.resumen === 'string' ? parsed.resumen.trim() : '',
          contenido_html: typeof parsed.contenido_html === 'string' ? parsed.contenido_html : '',
          meta_titulo: typeof parsed.meta_titulo === 'string' ? parsed.meta_titulo.trim() : `VidaMed | ${topic}`,
          meta_descripcion: typeof parsed.meta_descripcion === 'string' ? parsed.meta_descripcion.trim() : '',
          keywords: typeof parsed.keywords === 'string' ? parsed.keywords : [topic, 'salud', 'laboratorio clínico'].concat(safeCategories).join(', '),
        };

        try {
          await logServerAudit({
            req,
            action: 'Generar contenido blog',
            module: 'Blog',
            entity: 'publicaciones_blog',
            entityId: null,
            metadata: { topic, postType: type, categories: safeCategories, tone: style, targetAudience: audience },
            success: true,
          });
        } catch {}

        return res.status(200).json(responsePayload);
      } catch (error: any) {
        console.error('Error en /api/generate-blog-post:', error);
        try {
          await logServerAudit({
            req,
            action: 'Generar contenido blog',
            module: 'Blog',
            entity: 'publicaciones_blog',
            entityId: null,
            metadata: { topic: req.body?.topic, error: error?.message || String(error) },
            success: false,
          });
        } catch {}
        return res.status(500).json({ error: 'Error generando el artículo con IA.', details: error.message });
      }
    });

    // --- ANÁLISIS DE RESULTADOS MÉDICOS CON IA ---

    function buildMedicalAnalysisPrompt(patientName: string, studyName: string, resultValues: Record<string, any>, motivoEstudio?: string): string {
      let valuesContext = '';
      if (Object.keys(resultValues).length > 0) {
        Object.entries(resultValues).forEach(([key, value]) => {
          valuesContext += `- ${key}: ${value}\n`;
        });
      } else {
        valuesContext = 'Valores no disponibles o no aplicables para este estudio.\n';
      }
    
      const medicalAnalysisPrompt = `
Eres un analista clínico médico altamente calificado en Venezuela. Tu tarea es interpretar los siguientes resultados de laboratorio de manera profesional y clara.

**CONTEXTO DEL PACIENTE Y ESTUDIO:**
- **Paciente:** ${patientName}
- **Estudio Realizado:** ${studyName}
- **Motivo del Estudio:** ${motivoEstudio && motivoEstudio.trim() ? motivoEstudio : 'No especificado por el paciente'}
- **Resultados Obtenidos:**
${valuesContext}

**INSTRUCCIONES PARA TU ANÁLISIS:**
1.  **Rol y Tono:** Actúa como un médico especialista en análisis de laboratorio. El tono debe ser profesional, informativo y tranquilizador, adecuado tanto para un colega médico como para el paciente.
2.  **Análisis Detallado:**
    *   Identifica y lista cualquier valor que esté fuera del rango de referencia normal.
    *   Para cada valor anormal, explica su posible significado clínico.
    *   Si todos los valores son normales, indícalo claramente y confirma que los resultados están dentro de lo esperado.
3.  **Correlación Clínica:** Basado en los hallazgos, proporciona una posible correlación clínica o un diagnóstico diferencial. Menciona qué sistemas del cuerpo o condiciones podrían estar relacionados con los resultados.
4.  **Recomendaciones:** Ofrece recomendaciones claras y concisas. Esto podría incluir:
    *   Sugerir la consulta con un médico especialista (p. ej., hematólogo, endocrinólogo).
    *   Recomendar estudios de seguimiento si es necesario.
    *   Consejos de estilo de vida si son pertinentes.
5.  **Formato de Salida:** Estructura la respuesta con las siguientes secciones en formato Markdown:
    *   **### Interpretación de Resultados**
    *   **### Hallazgos Clave**
    *   **### Posible Correlación Clínica**
    *   **### Recomendaciones**
    *   **### Nota Aclaratoria** (Incluye un descargo de responsabilidad indicando que este es un análisis preliminar y no reemplaza una consulta médica formal).

**IMPORTANTE:** No inventes información. Basa tu análisis únicamente en los datos proporcionados. Sé preciso y evita la especulación excesiva.
`;
      return medicalAnalysisPrompt;
    }


    app.post('/api/interpretar', async (req, res) => {
      console.log('\n--- NUEVA SOLICITUD A /api/interpretar ---');
      console.log('🕜 Timestamp:', new Date().toISOString());
      console.log('📦 Cuerpo de la solicitud (req.body):', req.body);
    
      const { result_id } = req.body;
    
      if (!result_id) {
        console.error('❌ Error: result_id no fue proporcionado en la solicitud.');
        return res.status(400).json({ error: 'El ID del resultado es requerido.' });
      }
    
      console.log(`🆔 Procesando result_id: ${result_id}`);
    
      try {
        // 1. Obtener el resultado médico de Supabase
        console.log(`🔍 Buscando resultado en Supabase con id: ${result_id}`);
        const { data: resultData, error: resultError } = await supabaseAdmin
          .from('resultados_pacientes')
          .select(`
            id,
            resultado_data,
            pacientes (
              nombres,
              apellidos
            ),
            estudios (
              nombre
            )
          `)
          .eq('id', result_id)
          .single();
    
        if (resultError) {
          console.error('❌ Error al consultar Supabase:', resultError);
          return res.status(500).json({ error: 'Error al consultar la base de datos.', details: resultError.message });
        }
    
        if (!resultData) {
          console.warn(`⚠️ No se encontró ningún resultado con id: ${result_id}`);
          return res.status(404).json({ error: 'Resultado médico no encontrado.' });
        }
    
        console.log('✅ Resultado encontrado en Supabase:', resultData);

    // Manejar el caso de que las relaciones devuelvan un array
    const patient = Array.isArray(resultData.pacientes) ? resultData.pacientes[0] : resultData.pacientes;
    const study = Array.isArray(resultData.estudios) ? resultData.estudios[0] : resultData.estudios;

    const patientName = `${patient?.nombres || ''} ${patient?.apellidos || ''}`.trim();
      let rawData: any = resultData.resultado_data;
      if (rawData && typeof rawData === 'string') {
        try { rawData = JSON.parse(rawData); } catch {}
      }
      const resultValues = rawData?.valores || {};
      const motivoEstudio: string | undefined = rawData?.motivo_estudio || undefined;
    const studyName = study?.nombre || 'Estudio no especificado';
    
        console.log('🧬 Construyendo el prompt para Bedrock...', { patientName, studyName, resultValues });
    
        // 2. Construir el prompt para la IA
        const prompt = buildMedicalAnalysisPrompt(patientName, studyName, resultValues, motivoEstudio);
        console.log('📝 Prompt final construido:', prompt);
    
        // 3. Llamar a la API de Bedrock (OpenAI-compatible)
        console.log('🤖 Llamando a la API de Bedrock...');
        const analysisResult = await bedrockChat({
          model: BEDROCK_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          top_p: 0.9,
          max_completion_tokens: 2048,
        });
        const interpretation = analysisResult.text;

        console.log('✅ Respuesta recibida de Bedrock:', interpretation);
    
        // 4. Enviar la interpretación como respuesta
        console.log('✔️ Enviando respuesta exitosa al cliente.');
        res.json({ success: true, interpretation });
    
      } catch (error) {
        console.error('💥 Ocurrió un error catastrófico en /api/interpretar:', error);
        res.status(500).json({ error: 'Ocurrió un error interno en el servidor.', details: error instanceof Error ? error.message : String(error) });
      }
    });

    // Notificaciones: WhatsApp
    app.post('/api/notify/whatsapp', async (req: Request, res: Response) => {
      try {
        await (notifyWhatsappHandler as any)(req, res);
      } catch (err) {
        console.error('[api] Uncaught error en /api/notify/whatsapp:', err);
        if (!res.headersSent) res.status(500).json({ ok: false, error: 'Error interno en /api/notify/whatsapp' });
      }
    });

    // Notificaciones: Email
    app.post('/api/notify/email', async (req: Request, res: Response) => {
      try {
        await (notifyEmailHandler as any)(req, res);
      } catch (err) {
        console.error('[api] Uncaught error en /api/notify/email:', err);
        if (!res.headersSent) res.status(500).json({ ok: false, error: 'Error interno en /api/notify/email' });
      }
    });

    
    // Log para verificar el modelo de Bedrock durante el inicio (cold start)
console.log(`[IA] Modelo Bedrock activo: ${BEDROCK_MODEL}`);

// Exportar la app para Vercel (requisito de entorno Serverless)

}

startServer().catch(error => {
    console.error("Error fatal al iniciar el servidor:", error);
    process.exit(1);
});
// Exporta la 'app' (ahora global) para que Vercel la use [1]
export default app;
