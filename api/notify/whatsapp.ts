import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

function getEnv(name: string): string | undefined {
  return process.env[name] || process.env[`VITE_${name}`] || process.env[`PRIVATE_${name}`];
}

export default async function notifyWhatsappHandler(req: Request, res: Response) {
  try {
    const { result_id } = req.body || {};
    if (!result_id) {
      return res.status(400).json({ ok: false, code: 'BAD_REQUEST', message: 'Falta result_id en el cuerpo de la petición.' });
    }

    const supabaseUrl = getEnv('SUPABASE_URL');
    const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_ROLE');
    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ ok: false, code: 'ENV_MISSING', message: 'SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados.' });
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const whatsappToken = getEnv('WHATSAPP_API_TOKEN');
    const whatsappPhoneNumberId = getEnv('WHATSAPP_PHONE_NUMBER_ID');
    const portalUrl = getEnv('PATIENT_PORTAL_URL');
    const defaultCountry = getEnv('WHATSAPP_DEFAULT_COUNTRY_CODE');

    if (!whatsappToken || !whatsappPhoneNumberId) {
      return res.status(500).json({ ok: false, code: 'ENV_MISSING', message: 'WHATSAPP_API_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configurados.' });
    }

    const { data, error } = await supabaseAdmin
      .from('resultados_pacientes')
      .select(`id, resultado_data, analisis_estado, analisis_ia, motivo_estudio, pacientes:pacientes (nombres, apellidos, telefono, email, cedula_identidad), estudios:estudios (nombre)`) // eslint-disable-line
      .eq('id', result_id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ ok: false, code: 'DB_ERROR', message: error.message });
    }
    if (!data) {
      return res.status(404).json({ ok: false, code: 'NOT_FOUND', message: 'Resultado no encontrado.' });
    }

    const paciente = (data as any).pacientes || {};
    const estudio = (data as any).estudios || {};

    const raw = typeof data.resultado_data === 'string' ? JSON.parse(data.resultado_data) : (data.resultado_data || {});
    const motivoEstudio = data.motivo_estudio || raw?.motivo_estudio || '';
    const nombres = paciente.nombres || '';
    const apellidos = paciente.apellidos || '';
    const telefono: string | undefined = paciente.telefono || undefined;
    const nombreEstudio = estudio.nombre || 'Estudio clínico';

    if (!telefono || !String(telefono).trim()) {
      return res.status(400).json({ ok: false, code: 'NO_PHONE', message: 'Paciente sin teléfono registrado.' });
    }

    const normalized = String(telefono).replace(/\D/g, '');
    const to = normalized.startsWith('0')
      ? (defaultCountry ? `${defaultCountry}${normalized.replace(/^0+/, '')}` : normalized.replace(/^0+/, ''))
      : (normalized.match(/^\d{10,15}$/) ? normalized : (defaultCountry ? `${defaultCountry}${normalized}` : normalized));

    const messageLines = [
      `Hola ${nombres} ${apellidos}, te saluda el Laboratorio Clínico VidaMed.`,
      `Tu resultado del estudio "${nombreEstudio}" está listo.`,
      portalUrl ? `Puedes verlo y descargarlo en nuestro Portal de Pacientes: ${portalUrl}` : `Puedes verlo y descargarlo en nuestro Portal de Pacientes.`,
      motivoEstudio ? `Motivo del estudio: ${motivoEstudio}.` : undefined,
      `Gracias por confiar en VidaMed.`,
    ].filter(Boolean) as string[];
    const body = messageLines.join('\n');

    const url = `https://graph.facebook.com/v20.0/${whatsappPhoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to,
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

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return res.status(resp.status).json({ ok: false, code: 'WHATSAPP_API_ERROR', message: json?.error?.message || 'Error en WhatsApp API', details: json });
    }

    return res.status(200).json({ ok: true, code: 'SENT', message: `WhatsApp enviado a ${nombres} ${apellidos}.`, provider: json });
  } catch (err: any) {
    return res.status(500).json({ ok: false, code: 'UNEXPECTED', message: err?.message || 'Error inesperado en WhatsApp.' });
  }
}