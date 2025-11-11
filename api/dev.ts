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
// Eliminado: nodemailer no es necesario para recuperación de contraseña en dev
import { bedrockChat } from './bedrock.js';
import { DEFAULT_BEDROCK_MODEL } from './config.js';
import { createClient } from '@supabase/supabase-js';
import { logServerAudit } from './_utils/audit.js';

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

// Flujo nativo de Supabase: recuperación de contraseña vía enlace (sin OTP en dev)

// Eliminado: verificación de código OTP (dev)

// Eliminado: confirmación OTP (dev)

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
  const hasBedrockToken = Boolean(process.env.AWS_BEARER_TOKEN_BEDROCK);
  const hasBedrockModel = Boolean(process.env.BEDROCK_DEFAULT_MODEL);
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
      AWS_BEARER_TOKEN_BEDROCK: hasBedrockToken,
      BEDROCK_DEFAULT_MODEL: hasBedrockModel,
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

    // Auditoría: lectura de slots
    try {
      const userIdHeader = (req.headers['x-user-id'] || req.headers['x_user_id'] || '') as string;
      const emailHeader = (req.headers['x-user-email'] || req.headers['x_user_email'] || '') as string;
      const excluded = ['anamariaprieto@labvidamed.com', 'alijesusflores@gmail.com'];
      const shouldLog = Boolean(userIdHeader || emailHeader) && !excluded.includes(String(emailHeader).toLowerCase());
      if (shouldLog) {
        await logServerAudit({
          req,
          action: 'Leer slots disponibles',
          module: 'Citas',
          entity: 'horarios',
          entityId: null,
          metadata: { date, location, isDayBlocked, available_count: available.length },
          success: true,
        });
      }
    } catch {}
  } catch (e: any) {
    console.error('[dev-api] Error en /api/availability/slots:', e);
    try {
      await logServerAudit({
        req,
        action: 'Leer slots disponibles',
        module: 'Citas',
        entity: 'horarios',
        entityId: null,
        metadata: { date: String(req.query.date || ''), location: String(req.query.location || ''), error: e?.message || String(e) },
        success: false,
      });
    } catch {}
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

    // Auditoría: bloquear horario
    try {
      const userIdHeader = (req.headers['x-user-id'] || req.headers['x_user_id'] || '') as string;
      const emailHeader = (req.headers['x-user-email'] || req.headers['x_user_email'] || '') as string;
      const excluded = ['anamariaprieto@labvidamed.com', 'alijesusflores@gmail.com'];
      const shouldLog = Boolean(userIdHeader || emailHeader) && !excluded.includes(String(emailHeader).toLowerCase());
      if (shouldLog) {
        await logServerAudit({
          req,
          action: 'Bloquear horario',
          module: 'Citas',
          entity: 'disponibilidad_horarios',
          entityId: null,
          metadata: { fecha: date, slot, ubicacion: loc, motivo: motivo || null },
          success: true,
        });
      }
    } catch {}
  } catch (e: any) {
    console.error('[dev-api] Error en /api/availability/block:', e);
    try {
      await logServerAudit({
        req,
        action: 'Bloquear horario',
        module: 'Citas',
        entity: 'disponibilidad_horarios',
        entityId: null,
        metadata: { fecha: req.body?.date, slot: req.body?.slot, ubicacion: req.body?.location, error: e?.message || String(e) },
        success: false,
      });
    } catch {}
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

    // Auditoría: desbloquear horario
    try {
      const userIdHeader = (req.headers['x-user-id'] || req.headers['x_user_id'] || '') as string;
      const emailHeader = (req.headers['x-user-email'] || req.headers['x_user_email'] || '') as string;
      const excluded = ['anamariaprieto@labvidamed.com', 'alijesusflores@gmail.com'];
      const shouldLog = Boolean(userIdHeader || emailHeader) && !excluded.includes(String(emailHeader).toLowerCase());
      if (shouldLog) {
        await logServerAudit({
          req,
          action: 'Desbloquear horario',
          module: 'Citas',
          entity: 'disponibilidad_horarios',
          entityId: null,
          metadata: { fecha: date, slot, ubicacion: loc },
          success: true,
        });
      }
    } catch {}
  } catch (e: any) {
    console.error('[dev-api] Error en DELETE /api/availability/block:', e);
    try {
      await logServerAudit({
        req,
        action: 'Desbloquear horario',
        module: 'Citas',
        entity: 'disponibilidad_horarios',
        entityId: null,
        metadata: { fecha: req.body?.date, slot: req.body?.slot, ubicacion: req.body?.location, error: e?.message || String(e) },
        success: false,
      });
    } catch {}
    res.status(500).json({ ok: false, error: e.message || 'Error interno' });
  }
});

// Blog post generator (dev mirror)
app.post('/api/generate-blog-post', async (req: Request, res: Response) => {
  try {
    // Selección robusta del modelo: evita Nova en la API OpenAI-compatible
    const candidateModel = process.env.BEDROCK_DEFAULT_MODEL || DEFAULT_BEDROCK_MODEL;
    const BEDROCK_MODEL = /^amazon\.nova/.test(String(candidateModel))
      ? DEFAULT_BEDROCK_MODEL
      : candidateModel;

    if (!process.env.AWS_BEARER_TOKEN_BEDROCK) {
      return res.status(500).json({ error: 'AWS_BEARER_TOKEN_BEDROCK no configurado en entorno de desarrollo.' });
    }

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

    const genResult = await bedrockChat({
      model: BEDROCK_MODEL,
      messages: [
        { role: 'system', content: 'Eres un generador de artículos para el Blog del Laboratorio Clínico VidaMed.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      top_p: 0.9,
    });
    const rawText = genResult.text;
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
  } catch (err: any) {
    console.error('[dev-api] Error en /api/generate-blog-post:', err);
    try {
      await logServerAudit({
        req,
        action: 'Generar contenido blog',
        module: 'Blog',
        entity: 'publicaciones_blog',
        entityId: null,
        metadata: { topic: req.body?.topic, error: err?.message || String(err) },
        success: false,
      });
    } catch {}
    if (!res.headersSent) res.status(500).json({ error: 'Error generando el artículo con IA.', details: err.message });
  }
});

// --- Gestión de Usuarios (CRUD + permisos granulares) ---
// Nota: Estos endpoints requieren que supabaseAdmin esté configurado con Service Role.
// En producción, deben protegerse para sólo permitir acceso a administradores autenticados.

// Listar perfiles de usuarios
app.get('/api/users', async (_req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin no configurado' });
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.status(200).json({ users: data || [] });
  } catch (e: any) {
    console.error('[dev-api] Error en GET /api/users:', e);
    res.status(500).json({ error: e.message || 'Error interno' });
  }
});

// Crear un nuevo usuario (auth + perfil + permisos opcionales)
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin no configurado' });
    const { nombre, apellido, cedula, email, password, sede, rol, permissions } = req.body || {};
    if (!nombre || !apellido || !cedula || !email || !password || !sede || !rol) {
      return res.status(400).json({ error: 'Campos requeridos: nombre, apellido, cedula, email, password, sede, rol' });
    }

    const created = await (supabaseAdmin as any).auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, apellido, cedula, sede, rol },
      app_metadata: { role: rol },
    });
    if (created.error) throw created.error;
    const userId = created.data.user?.id;
    if (!userId) throw new Error('No se obtuvo el ID de usuario tras la creación.');

    const { error: profErr } = await supabaseAdmin
      .from('user_profiles')
      .insert({ user_id: userId, nombre, apellido, cedula, email, sede, rol });
    if (profErr) throw profErr;

    if (Array.isArray(permissions) && permissions.length > 0) {
      const toInsert = permissions.map((p: any) => ({
        user_id: userId,
        module: String(p.module),
        action: String(p.action),
        allowed: Boolean(p.allowed),
      }));
      const { error: permErr } = await supabaseAdmin.from('user_permissions').insert(toInsert);
      if (permErr) throw permErr;
    }

    res.status(201).json({ ok: true, user_id: userId });
  } catch (e: any) {
    console.error('[dev-api] Error en POST /api/users:', e);
    res.status(500).json({ error: e.message || 'Error interno' });
  }
});

// Actualizar usuario (auth + perfil); admite reemplazo de permisos
app.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin no configurado' });
    const userId = String(req.params.id);
    const { nombre, apellido, cedula, email, password, sede, rol, permissions } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'Falta id de usuario' });

    // Actualizar auth (email/contraseña/metadatos si fueron provistos)
    const updatePayload: any = {};
    if (email) updatePayload.email = String(email);
    if (password) updatePayload.password = String(password);
    const meta: any = {};
    if (nombre) meta.nombre = String(nombre);
    if (apellido) meta.apellido = String(apellido);
    if (cedula) meta.cedula = String(cedula);
    if (sede) meta.sede = String(sede);
    if (rol) meta.rol = String(rol);
    if (Object.keys(meta).length > 0) updatePayload.user_metadata = meta;

    // Sincronizar rol también a app_metadata para políticas RLS basadas en JWT
    if (rol) {
      updatePayload.app_metadata = { role: String(rol) };
    }

    if (Object.keys(updatePayload).length > 0) {
      const upd = await (supabaseAdmin as any).auth.admin.updateUserById(userId, updatePayload);
      if (upd.error) throw upd.error;
    }

    // Actualizar perfil
    const profileUpdate: any = {};
    if (nombre) profileUpdate.nombre = String(nombre);
    if (apellido) profileUpdate.apellido = String(apellido);
    if (cedula) profileUpdate.cedula = String(cedula);
    if (email) profileUpdate.email = String(email);
    if (sede) profileUpdate.sede = String(sede);
    if (rol) profileUpdate.rol = String(rol);
    if (Object.keys(profileUpdate).length > 0) {
      const { error: profErr } = await supabaseAdmin
        .from('user_profiles')
        .update({ ...profileUpdate, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (profErr) throw profErr;
    }

    // Reemplazar permisos si fueron enviados
    if (Array.isArray(permissions)) {
      const { error: delErr } = await supabaseAdmin
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);
      if (delErr) throw delErr;
      if (permissions.length > 0) {
        const toInsert = permissions.map((p: any) => ({
          user_id: userId,
          module: String(p.module),
          action: String(p.action),
          allowed: Boolean(p.allowed),
        }));
        const { error: permErr } = await supabaseAdmin.from('user_permissions').insert(toInsert);
        if (permErr) throw permErr;
      }
    }

    res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('[dev-api] Error en PUT /api/users/:id:', e);
    res.status(500).json({ error: e.message || 'Error interno' });
  }
});

// Eliminar usuario (auth + cascade DB)
app.delete('/api/users/:id', async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin no configurado' });
    const userId = String(req.params.id);
    if (!userId) return res.status(400).json({ error: 'Falta id de usuario' });

    const del = await (supabaseAdmin as any).auth.admin.deleteUser(userId);
    if (del.error) throw del.error;
    // user_profiles y user_permissions se eliminarán por cascade.
    res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('[dev-api] Error en DELETE /api/users/:id:', e);
    res.status(500).json({ error: e.message || 'Error interno' });
  }
});

// Permisos granulares: obtener overrides del usuario
app.get('/api/users/:id/permissions', async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin no configurado' });
    const userId = String(req.params.id);
    const { data, error } = await supabaseAdmin
      .from('user_permissions')
      .select('module, action, allowed')
      .eq('user_id', userId);
    if (error) throw error;
    res.status(200).json({ permissions: data || [] });
  } catch (e: any) {
    console.error('[dev-api] Error en GET /api/users/:id/permissions:', e);
    res.status(500).json({ error: e.message || 'Error interno' });
  }
});

// Permisos granulares: reemplazar overrides del usuario
app.put('/api/users/:id/permissions', async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin no configurado' });
    const userId = String(req.params.id);
    const { permissions } = req.body || {};
    if (!Array.isArray(permissions)) return res.status(400).json({ error: 'permissions debe ser un arreglo' });

    const { error: delErr } = await supabaseAdmin
      .from('user_permissions')
      .delete()
      .eq('user_id', userId);
    if (delErr) throw delErr;
    if (permissions.length > 0) {
      const toInsert = permissions.map((p: any) => ({
        user_id: userId,
        module: String(p.module),
        action: String(p.action),
        allowed: Boolean(p.allowed),
      }));
      const { error: permErr } = await supabaseAdmin.from('user_permissions').insert(toInsert);
      if (permErr) throw permErr;
    }
    res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('[dev-api] Error en PUT /api/users/:id/permissions:', e);
    res.status(500).json({ error: e.message || 'Error interno' });
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
