import { createClient } from '@supabase/supabase-js';
import { logServerAudit } from '../_utils/audit.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

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
  const dayStart = `${date}T00:00:00-04:00`;
  const dayEnd = `${date}T23:59:59-04:00`;
  let query = supabaseAdmin
    .from('citas')
    .select('fecha_cita, ubicacion')
    .gte('fecha_cita', dayStart)
    .lte('fecha_cita', dayEnd);
  if (location) query = query.eq('ubicacion', location);
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

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin no configurado' });

    const date = String(req.query?.date || '').trim();
    const location = String(req.query?.location || 'Sede Principal Maracay');

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Fecha inválida. Formato YYYY-MM-DD.' });
    }

    const { data: blockedDay, error: dayErr } = await supabaseAdmin
      .from('dias_no_disponibles')
      .select('fecha')
      .eq('fecha', date);
    if (dayErr) throw dayErr;
    const isDayBlocked = (blockedDay || []).length > 0;

    const allSlots = generateDailySlots();

    const { data: blockedSlots, error: slotErr } = await supabaseAdmin
      .from('horarios_no_disponibles')
      .select('hora, ubicacion')
      .eq('fecha', date)
      .eq('ubicacion', location);
    if (slotErr) throw slotErr;
    const blockedSlotSet = new Set<string>((blockedSlots || []).map((r: any) => String(r.hora).slice(0, 5)));

    const bookedSet = await getBookedTimesForDate(date, location);

    const unavailableSet = new Set<string>([...blockedSlotSet, ...bookedSet]);
    const available = isDayBlocked ? [] : allSlots.filter((s) => !unavailableSet.has(s));

    res.status(200).json({
      date,
      location,
      isDayBlocked,
      available,
      unavailable: Array.from(unavailableSet),
    });

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
    console.error('[serverless] Error en /api/availability/slots:', e);
    try {
      await logServerAudit({
        req,
        action: 'Leer slots disponibles',
        module: 'Citas',
        entity: 'horarios',
        entityId: null,
        metadata: { date: String(req.query?.date || ''), location: String(req.query?.location || ''), error: e?.message || String(e) },
        success: false,
      });
    } catch {}
    res.status(500).json({ error: e.message || 'Error interno' });
  }
}