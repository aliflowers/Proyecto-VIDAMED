import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DEFAULT_GEMINI_MODEL } from './config.ts';

function buildMedicalAnalysisPrompt(patientName: string, studyName: string, results: Record<string, any>): string {
  const resultsText = Object.entries(results)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

  return `
    Eres un asistente de laboratorio clínico experto en la interpretación de resultados de análisis médicos.
    Tu tarea es generar una interpretación profesional, clara y concisa para el siguiente estudio clínico.

    **Instrucciones estrictas:**
    1.  **No actúes como un chatbot.** Responde directamente con la interpretación del análisis.
    2.  **Dirígete al paciente por su nombre** al inicio de la interpretación.
    3.  **No ofrezcas diagnósticos médicos definitivos.** Utiliza frases como "los resultados sugieren", "es recomendable consultar a su médico", "estos valores pueden indicar".
    4.  **Estructura la respuesta en formato Markdown** con títulos, listas y negritas para facilitar la lectura.
    5.  **Finaliza siempre** con una recomendación clara de que el paciente debe llevarle los resultados a su médico tratante para una evaluación completa y un diagnóstico adecuado.

    **Datos del Análisis:**
    - **Paciente:** ${patientName}
    - **Estudio:** ${studyName}
    - **Resultados:**
    ${resultsText}

    **Interpretación:**
  `;
}

export default async function interpretarHandler(req: Request, res: Response) {
    console.log('⚡️ Recibida una nueva solicitud en /api/interpretar (manejador dedicado)');
    try {
      // --- Inicialización y validación de variables de entorno --- 
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE; // Corregido para coincidir con el .env
      const geminiApiKey = process.env.VITE_GEMINI_API_KEY;

      if (!supabaseUrl || !supabaseServiceRoleKey || !geminiApiKey) {
        console.error('INTERPRETAR_HANDLER: Faltan variables de entorno críticas. Asegúrate de que VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_ROLE y VITE_GEMINI_API_KEY estén definidas en el archivo .env en la raíz del proyecto.');
        return res.status(500).json({ error: 'El servidor no tiene configuradas las variables de entorno necesarias.' });
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      // ----------------------------------------------------------

      const { result_id } = req.body;
      console.log(`🆔 ID del resultado recibido: ${result_id}`);

      if (!result_id) {
        console.error('❌ Error: No se proporcionó result_id en el cuerpo de la solicitud.');
        return res.status(400).json({ error: 'Falta el parámetro result_id.' });
      }

      console.log('🔍 Buscando resultado en la base de datos...');
      const { data: resultData, error: resultError } = await supabaseAdmin
        .from('resultados_pacientes')
        .select('resultado_data, pid:paciente_id, eid:estudio_id')
        .eq('id', result_id)
        .single();

      if (resultError) {
        console.error('❌ Error al consultar el resultado en Supabase:', resultError);
        return res.status(500).json({ error: 'Error al consultar la base de datos.', details: resultError.message });
      }

      if (!resultData) {
        console.error(`❌ Error: No se encontró ningún resultado con el ID: ${result_id}`);
        return res.status(404).json({ error: 'Resultado no encontrado.' });
      }

      console.log('✅ Resultado encontrado. Obteniendo datos de paciente y estudio...');

      // Obtener datos del paciente
      const { data: patient, error: patientError } = await supabaseAdmin
        .from('pacientes')
        .select('*')
        .eq('id', resultData.pid)
        .single();

      if (patientError) {
        console.error('❌ Error al consultar el paciente:', patientError);
        return res.status(500).json({ error: 'Error al obtener los datos del paciente.', details: patientError.message });
      }
      if (!patient) {
        console.error(`❌ Error: No se encontró paciente con ID: ${resultData.pid}`);
        return res.status(404).json({ error: 'Paciente no encontrado.' });
      }

      // Obtener datos del estudio
      const { data: study, error: studyError } = await supabaseAdmin
        .from('estudios')
        .select('*')
        .eq('id', resultData.eid)
        .single();

      if (studyError) {
        console.error('❌ Error al consultar el estudio:', studyError);
        return res.status(500).json({ error: 'Error al obtener los datos del estudio.', details: studyError.message });
      }
      if (!study) {
        console.error(`❌ Error: No se encontró estudio con ID: ${resultData.eid}`);
        return res.status(404).json({ error: 'Estudio no encontrado.' });
      }

      if (!patient || !study) {
        console.error('❌ Error: Faltan datos del paciente o del estudio en el resultado.');
        return res.status(500).json({ error: 'Datos incompletos en el resultado.' });
      }

      const patientName = `${patient.nombres} ${patient.apellidos}`.trim();
      const studyName = study.nombre;
      const resultValues = resultData.resultado_data?.valores || {};

      console.log('🧬 Construyendo el prompt para la IA...');
      const prompt = buildMedicalAnalysisPrompt(patientName, studyName, resultValues);
      console.log('📝 Prompt generado (primeros 200 caracteres):', prompt.substring(0, 200));

      console.log('🤖 Llamando a la API de Gemini...');
      const model = genAI.getGenerativeModel({ model: DEFAULT_GEMINI_MODEL });
      const generationResult = await model.generateContent(prompt);
      const response = await generationResult.response;
      const interpretation = await response.text();

      console.log('✅ Respuesta recibida de Gemini.');

      console.log('✔️ Enviando respuesta exitosa al cliente.');
      res.json({ success: true, interpretation });

    } catch (error) {
      console.error('💥 Ocurrió un error catastrófico en /api/interpretar:', error);
      res.status(500).json({ error: 'Ocurrió un error interno en el servidor.', details: error instanceof Error ? error.message : String(error) });
    }
}