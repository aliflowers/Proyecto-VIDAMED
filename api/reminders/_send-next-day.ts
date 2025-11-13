import { createClient } from '@supabase/supabase-js';

function getEnv(name: string): string | undefined {
  return process.env[name] || process.env[`PRIVATE_${name}`] || process.env[`VITE_${name}`];
}

const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_ROLE');
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

export default async function handler(req: any, res: any) {
  try {
    if (!['GET', 'POST'].includes(req.method)) {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }
    if (!supabaseAdmin) {
      return res.status(500).json({ ok: false, error: 'Supabase admin no configurado' });
    }

    const CRON_SECRET = getEnv('CRON_SECRET');
    const token = String((req.query?.token ?? req.body?.token ?? '')).trim();
    if (CRON_SECRET && token !== CRON_SECRET) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const VERCEL_ENV = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
    const ENABLE_REMINDERS = String(getEnv('ENABLE_REMINDERS') || '').toLowerCase();
    const dryRun = String(req.query?.dryRun || req.body?.dryRun || '').toLowerCase() === 'true';

    const isProduction = VERCEL_ENV === 'production';
    const remindersEnabled = ENABLE_REMINDERS === 'true';
    if (!isProduction && !dryRun) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'no_production' });
    }
    if (!remindersEnabled && !dryRun) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'disabled_by_env' });
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    const tzDatePrefix = `${yyyy}-${mm}-${dd}`;

    const limit = Number(req.query?.limit || req.body?.limit || 0) || undefined;

    const { data: citas, error: citasErr } = await supabaseAdmin
      .from('citas')
      .select('id, paciente_id, fecha_cita, ubicacion, estudios_solicitados')
      .like('fecha_cita', tzDatePrefix + '%')
      .order('fecha_cita', { ascending: true });
    if (citasErr) throw citasErr;

    const list = Array.isArray(citas) ? (limit ? citas.slice(0, limit) : citas) : [];

    const { sendAppointmentReminderEmail } = await import('../notify/_appointment-email.js');

    const whatsappToken = getEnv('WHATSAPP_API_TOKEN');
    const whatsappPhoneNumberId = getEnv('WHATSAPP_PHONE_NUMBER_ID');
    const defaultCountry = getEnv('WHATSAPP_DEFAULT_COUNTRY_CODE');

    const results: Array<{
      citaId: string;
      email?: string;
      emailSent?: boolean;
      whatsappTo?: string;
      whatsappSent?: boolean;
      error?: string;
    }> = [];

    for (const c of list) {
      try {
        const { data: paciente, error: pErr } = await supabaseAdmin
          .from('pacientes')
          .select('id, nombres, apellidos, email, telefono, cedula_identidad')
          .eq('id', c.paciente_id)
          .single();
        if (pErr) throw pErr;

        const email = (paciente as any)?.email || undefined;
        const telefono = (paciente as any)?.telefono || undefined;
        const nombres = (paciente as any)?.nombres || '';
        const apellidos = (paciente as any)?.apellidos || '';

        let emailSent = false;
        let whatsappSent = false;
        let whatsappTo: string | undefined = undefined;

        if (!dryRun && email && email.includes('@')) {
          await sendAppointmentReminderEmail({
            to: email,
            patientName: `${nombres} ${apellidos}`.trim(),
            location: c.ubicacion,
            studies: Array.isArray(c.estudios_solicitados) ? c.estudios_solicitados : [],
            dateIso: c.fecha_cita,
            phone: telefono || undefined,
            cedula: (paciente as any)?.cedula_identidad || undefined,
          });
          emailSent = true;
        }

        if (!dryRun && whatsappToken && whatsappPhoneNumberId && telefono) {
          const normalized = String(telefono).replace(/\D/g, '');
          whatsappTo = normalized.startsWith('0')
            ? (defaultCountry ? `${defaultCountry}${normalized.replace(/^0+/, '')}` : normalized.replace(/^0+/, ''))
            : (normalized.match(/^\d{10,15}$/) ? normalized : (defaultCountry ? `${defaultCountry}${normalized}` : normalized));

          const d = new Date(c.fecha_cita);
          const timeStr = d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
          const messageLines = [
            `Hola ${nombres} ${apellidos}, te saluda el Laboratorio Clínico VidaMed.`,
            `Recordatorio: tu cita es mañana a las ${timeStr}.`,
            Array.isArray(c.estudios_solicitados) && c.estudios_solicitados.length ? `Estudios: ${c.estudios_solicitados.join(', ')}` : undefined,
            `Ubicación: ${c.ubicacion}.`,
            `Si no puedes asistir, por favor avísanos para reprogramar.`,
          ].filter(Boolean) as string[];
          const body = messageLines.join('\n');

          const url = `https://graph.facebook.com/v20.0/${whatsappPhoneNumberId}/messages`;
          const payload = {
            messaging_product: 'whatsapp',
            to: whatsappTo,
            type: 'text',
            text: { preview_url: false, body },
          };

          const resp = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${whatsappToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!resp.ok) {
            const json = await resp.json().catch(() => ({}));
            throw new Error(json?.error?.message || 'Error en WhatsApp API');
          }
          whatsappSent = true;
        }

        results.push({ citaId: c.id, email, emailSent, whatsappTo, whatsappSent });
      } catch (e: any) {
        results.push({ citaId: c.id, email: undefined, emailSent: false, whatsappTo: undefined, whatsappSent: false, error: e?.message || String(e) });
      }
    }

    return res.status(200).json({ ok: true, dryRun, count: results.length, results });
  } catch (e: any) {
    console.error('[serverless] Error en /api/reminders/send-next-day:', e);
    return res.status(500).json({ ok: false, error: e?.message || 'Error interno' });
  }
}
