import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Carga las variables de entorno desde el archivo .env en la raíz del proyecto.
// Esto debe hacerse ANTES de importar otros módulos que las necesiten.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import chatHandler from './chat.ts';
import tokenHandler from './voice/token.ts';
import interpretarHandler from './interpretar.ts'; // Importar el nuevo manejador
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DEFAULT_GEMINI_MODEL } from './config.ts';

// Dev server to run API routes locally without Vercel CLI.
// It mirrors the Vercel routes so Vite proxy (/api -> http://localhost:3000) works.

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(express.json());

// CORS only for Vite dev origins
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (/^http:\/\/(localhost|127\.0\.0\.1):5173$/.test(origin)) return callback(null, true);
      return callback(null, false);
    },
  })
);

// Root ok for manual checks
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    service: 'dev-api',
    routes: ['/api/health', '/api/chat', '/api/voice/token', '/api/diag'],
  });
});

// Mirror of Vercel serverless endpoints with hardening
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    await (chatHandler as any)(req, res);
  } catch (err) {
    console.error('[dev-api] Uncaught error in /api/chat:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal error in dev API. Check server logs.' });
  }
});

// Registrar la nueva ruta de interpretación
app.post('/api/interpretar', async (req: Request, res: Response) => {
  try {
    await (interpretarHandler as any)(req, res);
  } catch (err) {
    console.error('[dev-api] Uncaught error in /api/interpretar:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal error in dev API. Check server logs.' });
  }
});

app.get('/api/voice/token', async (req: Request, res: Response) => {
  try {
    await (tokenHandler as any)(req, res);
  } catch (err) {
    console.error('[dev-api] Uncaught error in /api/voice/token:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal error in dev API. Check server logs.' });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, env: 'dev', time: new Date().toISOString() });
});

app.get('/api/diag', (_req: Request, res: Response) => {
  const hasGemini =
    Boolean(process.env.GEMINI_API_KEY) || Boolean(process.env.VITE_GEMINI_API_KEY);
  const hasSupabaseUrl =
    Boolean(process.env.SUPABASE_URL) || Boolean(process.env.VITE_SUPABASE_URL);
  const hasServiceRole =
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    Boolean(process.env.SUPABASE_SERVICE_ROLE) ||
    Boolean(process.env.PRIVATE_SUPABASE_SERVICE_ROLE_KEY) ||
    Boolean(process.env.VITE_SUPABASE_SERVICE_ROLE);
  const hasElevenApi =
    Boolean(process.env.ELEVENLABS_API_KEY) || Boolean(process.env.VITE_ELEVENLABS_API_KEY);
  const hasElevenAgent =
    Boolean(process.env.ELEVENLABS_AGENT_ID) || Boolean(process.env.VITE_ELEVENLABS_AGENT_ID);

  res.status(200).json({
    ok: true,
    env: {
      GEMINI_API_KEY: hasGemini,
      SUPABASE_URL: hasSupabaseUrl,
      SUPABASE_SERVICE_ROLE: hasServiceRole,
      ELEVENLABS_API_KEY: hasElevenApi,
      ELEVENLABS_AGENT_ID: hasElevenAgent,
    },
  });
});

// Blog post generator (dev mirror)
app.post('/api/generate-blog-post', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en entorno de desarrollo.' });
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: DEFAULT_GEMINI_MODEL });

    const { topic, postType, categories, tone, targetAudience } = req.body || {};
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: "El campo 'topic' es requerido y debe ser texto." });
    }
    const safeCategories = Array.isArray(categories) ? categories.filter((c: any) => typeof c === 'string').slice(0, 12) : [];
    const type = typeof postType === 'string' ? postType : 'Educativa';
    const style = typeof tone === 'string' ? tone : 'Profesional';
    const audience = typeof targetAudience === 'string' ? targetAudience : 'Pacientes';

    const prompt = `Eres un generador de artículos para el Blog del Laboratorio Clínico VidaMed.\n` +
      `Tema: "${topic}".\n` +
      `Tipo de publicación: ${type}.\n` +
      `Tono: ${style}.\n` +
      `Público objetivo: ${audience}.\n` +
      `Categorías de estudios a mencionar (si aplica): ${safeCategories.join(', ') || 'Ninguna específica'}.\n\n` +
      `Instrucciones estrictas:\n` +
      `- Escribe un artículo completo en formato Markdown bien estructurado (títulos, subtítulos, listas, párrafos, enlaces si corresponde).\n` +
      `- No inventes resultados clínicos ni diagnósticos; sé educativo e informativo.\n` +
      `- Optimiza para SEO sin keyword stuffing.\n` +
      `- Incluye llamada a la acción final para agendar cita o consultar estudios.\n` +
      `- Responde EXCLUSIVAMENTE en un objeto JSON con las claves EXACTAS:\n` +
      `  {\n` +
      `    "titulo_articulo": string,\n` +
      `    "resumen": string,\n` +
      `    "contenido_html": string, // Contenido en Markdown\n` +
      `    "meta_titulo": string,\n` +
      `    "meta_descripcion": string,\n` +
      `    "keywords": string // Lista separada por comas\n` +
      `  }\n` +
      `- No incluyas comentarios, explicaciones adicionales, ni bloques de código triple.\n`;

    const genResult = await model.generateContent(prompt);
    const rawText = genResult.response.text();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    let parsed: any;
    try {
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawText);
    } catch (e) {
      parsed = {
        titulo_articulo: `Artículo: ${topic}`,
        resumen: rawText.slice(0, 280),
        contenido_html: rawText,
        meta_titulo: `VidaMed | ${topic}`,
        meta_descripcion: `Artículo sobre ${topic} para ${audience}.`,
        keywords: [topic, 'salud', 'laboratorio clínico'].concat(safeCategories).join(', '),
      };
    }

    const responsePayload = {
      titulo_articulo: typeof parsed.titulo_articulo === 'string' ? parsed.titulo_articulo.trim() : `Artículo: ${topic}`,
      resumen: typeof parsed.resumen === 'string' ? parsed.resumen.trim() : '',
      contenido_html: typeof parsed.contenido_html === 'string' ? parsed.contenido_html : '',
      meta_titulo: typeof parsed.meta_titulo === 'string' ? parsed.meta_titulo.trim() : `VidaMed | ${topic}`,
      meta_descripcion: typeof parsed.meta_descripcion === 'string' ? parsed.meta_descripcion.trim() : '',
      keywords: typeof parsed.keywords === 'string' ? parsed.keywords : [topic, 'salud', 'laboratorio clínico'].concat(safeCategories).join(', '),
    };

    return res.status(200).json(responsePayload);
  } catch (err: any) {
    console.error('[dev-api] Error en /api/generate-blog-post:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Error generando el artículo con IA.', details: err.message });
  }
});

// Fallback error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('[dev-api] Error middleware:', err);
  if (!res.headersSent) res.status(500).json({ error: 'Unhandled server error' });
});

app.listen(PORT, () => {
  console.log(`[dev-api] listening on http://localhost:${PORT}`);
  console.log(`[dev-api] healthcheck: http://localhost:${PORT}/api/health`);
});