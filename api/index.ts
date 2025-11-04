import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI, Part, Tool, SchemaType, Content } from '@google/generative-ai';
import { DEFAULT_GEMINI_MODEL } from './config.js';
import { nextDay, format, isFuture, parseISO } from 'date-fns';
import path from 'path';
import notifyWhatsappHandler from './notify/whatsapp.js';
import notifyEmailHandler from './notify/email.js';

async function startServer() {
    // Forzar la carga del archivo .env desde la raíz del proyecto
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });

    // Usar directamente la variable correcta de ese archivo
    const geminiApiKey = process.env.VITE_GEMINI_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey) {
        const missing = [
            !geminiApiKey ? 'VITE_GEMINI_API_KEY' : null,
            !supabaseUrl ? 'SUPABASE_URL' : null,
            !supabaseServiceKey ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
        ].filter(Boolean);
        console.error(`Error: Faltan variables de entorno críticas en el archivo .env de la raíz: ${missing.join(', ')}`);
        process.exit(1);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    
    const app = express();
    const port = process.env.PORT || 3001;

    app.use(cors());
    app.use(express.json());

    // --- INICIO DE LA ARQUITECTURA DE ENRUTADOR v2.0 ---

    const classifierSystemInstruction = `Tu única función es clasificar la intención del último mensaje del usuario en una de las siguientes categorías: CONSULTA_ESTUDIO, AGENDAR_CITA, SALUDO, DESCONOCIDO. Responde únicamente con la categoría.`;
    const entityExtractorSystemInstruction = `Tu única función es extraer el nombre del examen o estudio médico del texto del usuario. Si no hay un nombre de estudio claro, responde con "NO_ENCONTRADO". Responde únicamente con el nombre del estudio.`;
    
    const conversationalSystemInstruction: Content = {
        role: 'user',
        parts: [{
            text: `
            Eres VidaBot, un asistente de IA del Laboratorio Clínico VidaMed. Tu objetivo es guiar al usuario en el proceso de agendar una cita. Pide la información de forma secuencial, UNA PREGUNTA A LA VEZ. Usa las herramientas \`getAvailability\` y \`scheduleAppointment\` cuando sea necesario. Tu tono es amable y servicial.
            `
        }]
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
        if (targetDate === 'Día no válido') return { error: `Lo siento, "${date}" no es un día de la semana válido. Por favor, dime un día de lunes a sábado.`};
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

    const scheduleAppointment = async (args: { patientInfo: any, studies: string[], date: string, location: string }): Promise<object> => {
        const { patientInfo, studies, date, location } = args;
        try {
            if (!patientInfo || !patientInfo.cedula || !patientInfo.nombres || !patientInfo.apellidos || !studies || studies.length === 0 || !date || !location) return { error: "Faltan datos cruciales para agendar la cita." };
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
            const { data: patientData, error: patientError } = await supabaseAdmin.from('pacientes').upsert({ id: patientId, cedula_identidad: cleanedCedula, nombres: patientInfo.nombres, apellidos: patientInfo.apellidos, email: patientInfo.email || null, telefono: cleanedTelefono, direccion: location === 'domicilio' ? patientInfo.direccion : null }, { onConflict: 'id' }).select().single();
            if (patientError) throw patientError;
            const { error: appointmentError } = await supabaseAdmin.from('citas').insert({ paciente_id: patientData.id, fecha_cita: date, estudios_solicitados: studies, ubicacion: location, status: 'agendada' });
            if (appointmentError) throw appointmentError;
            return { result: `¡Cita agendada con éxito para ${patientInfo.nombres} ${patientInfo.apellidos} el día ${date}! Su ID de paciente es ${patientData.id}.`};
        } catch (error: any) { console.error("Error inesperado en scheduleAppointment:", error); return { error: "Lo siento, ocurrió un error interno inesperado.", details: error.message }; }
    };
    
    const tools: Tool[] = [{
        functionDeclarations: [
          { name: 'getAvailability', description: 'Verifica disponibilidad de una fecha. Acepta días de la semana.', parameters: { type: SchemaType.OBJECT, properties: { date: { type: SchemaType.STRING, description: 'Día de la semana o fecha en formato AAAA-MM-DD.' } }, required: ['date'] } },
          { name: 'scheduleAppointment', description: 'Crea la cita en la base de datos después de confirmar todos los datos.', parameters: {
              type: SchemaType.OBJECT, properties: { patientInfo: { type: SchemaType.OBJECT, properties: { cedula: { type: SchemaType.STRING }, nombres: { type: SchemaType.STRING }, apellidos: { type: SchemaType.STRING }, email: { type: SchemaType.STRING }, telefono: { type: SchemaType.STRING }, direccion: { type: SchemaType.STRING } }, required: ['cedula', 'nombres', 'apellidos', 'telefono'] }, studies: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, date: { type: SchemaType.STRING }, location: { type: SchemaType.STRING }, },
              required: ['patientInfo', 'studies', 'date', 'location'],
            },
          },
        ],
    }];
    
    const model = genAI.getGenerativeModel({ model: DEFAULT_GEMINI_MODEL });
    const conversationalModel = genAI.getGenerativeModel({ model: DEFAULT_GEMINI_MODEL, systemInstruction: conversationalSystemInstruction, tools });

    // --- LÓGICA DEL ENRUTADOR v2.0 (CORREGIDA) ---
    app.post('/api/chat', async (req: Request, res: Response) => {
      try {
        const { history } = req.body;
        if (!history || history.length === 0) {
          return res.status(400).json({ error: 'El historial de la conversación es requerido.' });
        }
        const lastUserMessage = history[history.length - 1].parts[0].text;

        // 1. Clasificar la intención del usuario
        const classifierChat = model.startChat({ history: [{ role: 'user', parts: [{ text: classifierSystemInstruction }] }] });
        const intentResult = await classifierChat.sendMessage(lastUserMessage);
        const intent = intentResult.response.text().trim();
        console.log(`Intención Detectada: ${intent}`);

        // 2. Actuar según la intención (Switch Lógico Corregido)
        switch (intent) {
            case 'CONSULTA_ESTUDIO': {
                const extractorChat = model.startChat({ history: [{ role: 'user', parts: [{ text: entityExtractorSystemInstruction }] }] });
                const extractorResult = await extractorChat.sendMessage(lastUserMessage);
                const studyName = extractorResult.response.text().trim();

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
                    responseText = `Aquí tienes la información sobre "${study.nombre}":\n- Descripción: ${study.descripcion}\n- Preparación: ${study.preparacion}\n- Costo: ${study.costo_usd} USD / ${study.costo_bs} Bs.\n- Tiempo de Entrega: ${study.tiempo_entrega}\n`;
                    if (studyInfoResult.studies.length > 1) {
                        const otherNames = studyInfoResult.studies.slice(1).map((s: any) => s.nombre).join(', ');
                        responseText += `\nTambién encontré otros estudios similares: ${otherNames}.`;
                    }
                } else {
                    responseText = studyInfoResult.result || "No se encontró información para ese estudio.";
                }
                
                responseText += "\n\n¿Te gustaría agendar una cita para este estudio o consultar otro?";
                return res.status(200).json({ response: responseText });
            }

            case 'AGENDAR_CITA': {
                const conversationalChat = conversationalModel.startChat({ history });
                const conversationalResult = await conversationalChat.sendMessage(lastUserMessage);
                const conversationalResponse = conversationalResult.response;
                const conversationalFunctionCalls = conversationalResponse.functionCalls();

                if (conversationalFunctionCalls && conversationalFunctionCalls.length > 0) {
                    const toolResponses: Part[] = [];
                    for (const call of conversationalFunctionCalls) {
                        const { name, args } = call;
                        let functionResult;
                        if (name === 'getAvailability') functionResult = await getAvailability(args as any);
                        else if (name === 'scheduleAppointment') functionResult = await scheduleAppointment(args as any);
                        else functionResult = { error: `Función '${name}' no válida en este contexto.` };
                        
                        toolResponses.push({ functionResponse: { name, response: functionResult } });
                    }
                    const secondResult = await conversationalChat.sendMessage(toolResponses);
                    return res.status(200).json({ response: secondResult.response.text() });
                }
                return res.status(200).json({ response: conversationalResponse.text() });
            }

            case 'SALUDO':
            case 'DESCONOCIDO':
            default: {
                // Para saludos o intenciones no reconocidas, damos una respuesta conversacional simple sin herramientas
                const simpleChat = model.startChat({
                    history: [
                        { role: 'user', parts: [{ text: 'Eres un asistente de laboratorio amable y servicial llamado VidaBot.' }] },
                        { role: 'model', parts: [{ text: '¡Hola! Soy VidaBot. ¿Cómo puedo ayudarte?' }] }
                    ]
                });
                const result = await simpleChat.sendMessage(lastUserMessage);
                return res.status(200).json({ response: result.response.text() });
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

        const genResult = await model.generateContent(prompt);
        const rawText = genResult.response.text();

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

        return res.status(200).json(responsePayload);
      } catch (error: any) {
        console.error('Error en /api/generate-blog-post:', error);
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
    
        console.log('🧬 Construyendo el prompt para Gemini...', { patientName, studyName, resultValues });
    
        // 2. Construir el prompt para la IA
        const prompt = buildMedicalAnalysisPrompt(patientName, studyName, resultValues, motivoEstudio);
        console.log('📝 Prompt final construido:', prompt);
    
        // 3. Llamar a la API de Gemini
        console.log('🤖 Llamando a la API de Gemini...');
        const model = genAI.getGenerativeModel({ model: DEFAULT_GEMINI_MODEL });
        const generationResult = await model.generateContent(prompt);
        const response = await generationResult.response;
        const interpretation = await response.text();
    
        console.log('✅ Respuesta recibida de Gemini:', interpretation);
    
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

    const PORT = process.env.PORT || 3001;
    app.listen(port, () => {
      console.log(`Servidor escuchando en el puerto ${port}`);
      console.log(`[IA] Modelo Gemini activo: ${DEFAULT_GEMINI_MODEL}`);
    });

}

startServer().catch(error => {
    console.error("Error fatal al iniciar el servidor:", error);
    process.exit(1);
});
