import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }
    if (!supabaseAdmin) {
      return res.status(500).json({ ok: false, error: 'Supabase admin no configurado' });
    }

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

    const { sendAppointmentReminderEmail } = await import('../notify/appointment-email.js');

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

    return res.status(200).json({ ok: true, count: results.length, results });
  } catch (e: any) {
    console.error('[serverless] Error en /api/reminders/send-next-day:', e);
    return res.status(500).json({ ok: false, error: e?.message || 'Error interno' });
  }
}