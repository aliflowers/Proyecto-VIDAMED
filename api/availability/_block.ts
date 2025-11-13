import { createClient } from '@supabase/supabase-js';
import { logServerAudit } from '../_utils/audit.js';
import { requireAdmin } from '../_utils/auth.js';
import { handleCors } from '../_utils/cors.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin no configurado' });
    const auth = await requireAdmin(req, res);
    if (!auth) return;

    if (req.method === 'POST') {
      const { date, slot, location, motivo } = req.body || {};
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return res.status(400).json({ error: 'Fecha inválida' });
      if (!slot || !/^\d{2}:\d{2}$/.test(String(slot))) return res.status(400).json({ error: 'Hora inválida (HH:mm)' });
      const loc = String(location || 'Sede Principal Maracay');

      const { error } = await (supabaseAdmin as any)
        .from('horarios_no_disponibles')
        .insert({ fecha: date, hora: slot, ubicacion: loc, motivo: motivo || null });
      if (error) throw error;
      res.status(200).json({ ok: true });

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
      return;
    }

    if (req.method === 'DELETE') {
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
      return;
    }

    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  } catch (e: any) {
    console.error('[serverless] Error en /api/availability/block:', e);
    try {
      await logServerAudit({
        req,
        action: req.method === 'DELETE' ? 'Desbloquear horario' : 'Bloquear horario',
        module: 'Citas',
        entity: 'disponibilidad_horarios',
        entityId: null,
        metadata: { body: req.body, error: e?.message || String(e) },
        success: false,
      });
    } catch {}
    res.status(500).json({ ok: false, error: e.message || 'Error interno' });
  }
}
