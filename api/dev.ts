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
import chatHandler from './chat.js';
import tokenHandler from './voice/token.js';
import interpretarHandler from './interpretar.js'; // Importar el nuevo manejador
import notifyWhatsappHandler from './notify/whatsapp.js';
import notifyEmailHandler from './notify/email.js';
import { sendAppointmentConfirmationEmail } from './notify/appointment-email.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DEFAULT_GEMINI_MODEL } from './config.js';
import { createClient } from '@supabase/supabase-js';

// Configuración Supabase admin (para consultar y bloquear horarios)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.PRIVATE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE;
const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

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

// Notificaciones (dev mirror)
app.post('/api/notify/whatsapp', async (req: Request, res: Response) => {
  try {
    await (notifyWhatsappHandler as any)(req, res);
  } catch (err) {
    console.error('[dev-api] Uncaught error in /api/notify/whatsapp:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal error in dev API. Check server logs.' });
  }
});

app.post('/api/notify/email', async (req: Request, res: Response) => {
  try {
    await (notifyEmailHandler as any)(req, res);
  } catch (err) {
    console.error('[dev-api] Uncaught error in /api/notify/email:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal error in dev API. Check server logs.' });
  }
});

// Confirmación de citas (mirror del endpoint de producción)
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
    } = (req.body || {}) as any;

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
    console.error('[dev-api] Error enviando confirmación de cita:', error);
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' });
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

// --- Disponibilidad de horarios ---
const WORK_START = '07:00';
const WORK_END = '17:00';
const STEP_MINUTES = 30;

function generateDailySlots(start = WORK_START, end = WORK_END, stepMinutes = STEP_MINUTES): string[] {
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
}

async function getBookedTimesForDate(date: string, location?: string): Promise<Set<string>> {
  if (!supabaseAdmin) return new Set();
  // Usar rango de fecha en zona -04:00 para evitar LIKE sobre timestamp
  const dayStart = `${date}T00:00:00-04:00`;
  const dayEnd = `${date}T23:59:59-04:00`;
  let query = supabaseAdmin
    .from('citas')
    .select('fecha_cita, ubicacion')
    .gte('fecha_cita', dayStart)
    .lte('fecha_cita', dayEnd);
  if (location) {
    query = query.eq('ubicacion', location);
  }
  const { data, error } = await query;
  if (error) throw error;
  const set = new Set<string>();
  (data || []).forEach((r: any) => {
    const d = new Date(r.fecha_cita);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    set.add(`${hh}:${mm}`);
  });
  return set;
}

// GET /api/availability/slots?date=YYYY-MM-DD&location=...
app.get('/api/availability/slots', async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin no configurado' });
    const date = String(req.query.date || '').trim();
    const location = String(req.query.location || 'Sede Principal Maracay');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Fecha inválida. Formato YYYY-MM-DD.' });
    }

    // Bloqueo total del día
    const { data: blockedDay, error: dayErr } = await supabaseAdmin
      .from('dias_no_disponibles')
      .select('fecha')
      .eq('fecha', date);
    if (dayErr) throw dayErr;
    const isDayBlocked = (blockedDay || []).length > 0;

    const allSlots = generateDailySlots();

    // Bloques administrativos por franja
    const { data: blockedSlots, error: slotErr } = await supabaseAdmin
      .from('horarios_no_disponibles')
      .select('hora, ubicacion')
      .eq('fecha', date)
      .eq('ubicacion', location);
    if (slotErr) throw slotErr;
    const blockedSlotSet = new Set<string>((blockedSlots || []).map((r: any) => String(r.hora).slice(0,5)));

    // Citas ocupadas
    const bookedSet = await getBookedTimesForDate(date, location);

    const unavailableSet = new Set<string>([...blockedSlotSet, ...bookedSet]);
    const available = isDayBlocked ? [] : allSlots.filter(s => !unavailableSet.has(s));
    res.status(200).json({ date, location, isDayBlocked, available, unavailable: Array.from(unavailableSet) });
  } catch (e: any) {
    console.error('[dev-api] Error en /api/availability/slots:', e);
    res.status(500).json({ error: e.message || 'Error interno' });
  }
});

// POST /api/availability/block { date, slot, location, motivo? }
app.post('/api/availability/block', async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin no configurado' });
    const { date, slot, location, motivo } = req.body || {};
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return res.status(400).json({ error: 'Fecha inválida' });
    if (!slot || !/^\d{2}:\d{2}$/.test(String(slot))) return res.status(400).json({ error: 'Hora inválida (HH:mm)' });
    const loc = String(location || 'Sede Principal Maracay');

    const { error } = await (supabaseAdmin as any)
      .from('horarios_no_disponibles')
      .insert({ fecha: date, hora: slot, ubicacion: loc, motivo: motivo || null });
    if (error) throw error;
    res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('[dev-api] Error en /api/availability/block:', e);
    res.status(500).json({ ok: false, error: e.message || 'Error interno' });
  }
});

// DELETE /api/availability/block { date, slot, location }
app.delete('/api/availability/block', async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin no configurado' });
    const { date, slot, location } = req.body || {};
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return res.status(400).json({ error: 'Fecha inválida' });
    if (!slot || !/^\d{2}:\d{2}$/.test(String(slot))) return res.status(400).json({ error: 'Hora inválida (HH:mm)' });
    const loc = String(location || 'Sede Principal Maracay');

    const { error } = await (supabaseAdmin as any)
      .from('horarios_no_disponibles')
      .delete()
      .eq('fecha', date)
      .eq('hora', slot)
      .eq('ubicacion', loc);
    if (error) throw error;
    res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('[dev-api] Error en DELETE /api/availability/block:', e);
    res.status(500).json({ ok: false, error: e.message || 'Error interno' });
  }
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
