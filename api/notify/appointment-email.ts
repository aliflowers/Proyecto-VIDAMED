import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

function getEnv(name: string): string | undefined {
  return (
    process.env[name] ||
    process.env[`PRIVATE_${name}`] ||
    process.env[`VITE_${name}`]
  );
}

function resolveAsset(relPath: string): string {
  // Resuelve rutas de assets de forma robusta (similar a notify/email.ts)
  const candidates = [
    path.resolve(process.cwd(), relPath),
    path.resolve(process.cwd(), `../${relPath}`),
    path.resolve(process.cwd(), `../../${relPath}`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

const BRAND = {
  name: 'VidaMed',
  colors: {
    primary: '#007C91',
    border: '#E5E7EB',
    bg: '#F7FAFC',
    text: '#0A0A0A',
    muted: '#6B7280',
    accent: '#10B981',
  },
} as const;

function buildAppointmentEmailHtml(opts: {
  type: 'confirmation' | 'reminder';
  patientName: string;
  dateStr: string;
  timeStr: string;
  location: string;
  studies: string[];
  phone?: string;
  cedula?: string;
  summaryText?: string;
  logoCid?: string;
  whatsappNumber?: string;
}): string {
  const C = BRAND.colors;
  const logoImg = opts.logoCid
    ? `<img src="cid:${opts.logoCid}" alt="Laboratorio VidaMed" style="height:40px;width:auto;display:block;" />`
    : `<span style="font-weight:700;font-size:18px;color:${C.primary};font-family:Segoe UI, Arial, sans-serif;">VidaMed</span>`;

  const studiesHtml = (opts.studies || []).length
    ? `<ul style="padding-left:18px;margin:8px 0;">${opts.studies
        .map((s) => `<li style="font-size:14px;color:${C.text};font-family:Segoe UI, Arial, sans-serif;">${s}</li>`)
        .join('')}</ul>`
    : '';

  const whatsappHref = opts.whatsappNumber
    ? `https://wa.me/${opts.whatsappNumber.replace(/[^\d]/g, '')}?text=${encodeURIComponent('Hola VidaMed, no puedo asistir a mi cita.')}`
    : undefined;

  const reminderBlock = opts.type === 'reminder'
    ? `<div style="margin:16px 0;padding:12px 16px;border:1px solid ${C.border};border-radius:8px;background:#F9FAFB;">
        <p style="font-size:14px;color:${C.text};margin:0 0 8px;font-family:Segoe UI, Arial, sans-serif;">Recordatorio: tu cita es <strong>mañana</strong>.</p>
        <p style="font-size:14px;color:${C.text};margin:0;font-family:Segoe UI, Arial, sans-serif;">Si no puedes asistir, por favor avísanos por WhatsApp para reprogramar.</p>
        ${whatsappHref ? `<div style="margin-top:12px;">
            <a href="${whatsappHref}" target="_blank" style="display:inline-block;background:${C.primary};color:#ffffff;text-decoration:none;font-family:Segoe UI, Arial, sans-serif;font-size:14px;padding:10px 14px;border-radius:8px;">
              Escribir por WhatsApp
            </a>
          </div>` : ''}
      </div>`
    : '';

  const heading = opts.type === 'confirmation'
    ? 'Confirmación de Cita'
    : 'Recordatorio de Cita';

  const intro = opts.type === 'confirmation'
    ? `Tu cita ha sido agendada correctamente. A continuación, el resumen:`
    : `Este es un recordatorio de tu cita programada. Aquí tienes los detalles:`;

  const summaryText = opts.summaryText
    ? `<div style="margin-top:8px;padding:12px 16px;border:1px solid ${C.border};border-radius:8px;background:#F9FAFB;">
        <p style="font-size:14px;color:${C.text};margin:0;font-family:Segoe UI, Arial, sans-serif;">${opts.summaryText}</p>
      </div>`
    : '';

  const phoneLine = opts.phone ? `<p style="font-size:14px;color:${C.text};margin:0;font-family:Segoe UI, Arial, sans-serif;">Teléfono: <strong>${opts.phone}</strong></p>` : '';
  const cedulaLine = opts.cedula ? `<p style="font-size:14px;color:${C.text};margin:0;font-family:Segoe UI, Arial, sans-serif;">Cédula: <strong>${opts.cedula}</strong></p>` : '';

  return `<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:${C.bg};">
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" width="600" style="max-width:600px;border-collapse:collapse;">
          <tr>
            <td style="background:#ffffff;border-radius:12px 12px 0 0;padding:24px;">
              ${logoImg}
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:0 0 12px 12px;padding:0 24px 24px;">
              <h1 style="margin:8px 0 0;font-family:Segoe UI, Arial, sans-serif;font-size:22px;line-height:28px;color:${C.text};">${heading} – ${BRAND.name}</h1>
              <p style="margin:4px 0 16px;color:${C.muted};font-size:12px;font-family:Segoe UI, Arial, sans-serif;">${opts.dateStr} • ${opts.timeStr}</p>

              <p style="font-size:14px;color:${C.text};margin:0 0 8px;font-family:Segoe UI, Arial, sans-serif;">Hola <strong>${opts.patientName}</strong>,</p>
              <p style="font-size:14px;color:${C.text};margin:0 0 16px;font-family:Segoe UI, Arial, sans-serif;">${intro}</p>

              <div style="margin:12px 0;padding:12px 16px;border:1px solid ${C.border};border-radius:8px;background:#F9FAFB;">
                <p style="font-size:14px;color:${C.text};margin:0 0 8px;font-family:Segoe UI, Arial, sans-serif;">Ubicación: <strong>${opts.location}</strong></p>
                ${phoneLine}
                ${cedulaLine}
                ${studiesHtml}
              </div>

              ${summaryText}

              ${reminderBlock}

              <p style="font-size:12px;color:${C.muted};margin-top:16px;font-family:Segoe UI, Arial, sans-serif;">Mensaje automático ${BRAND.name}. Si necesitas ayuda, contáctanos.</p>
            </td>
          </tr>
          <tr>
            <td style="text-align:center;padding:16px;color:${C.muted};font-size:12px;font-family:Segoe UI, Arial, sans-serif;">© ${new Date().getFullYear()} ${BRAND.name} — Todos los derechos reservados</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getSmtpConfig() {
  const host = getEnv('SMTP_HOST');
  const port = Number(getEnv('SMTP_PORT') || '0');
  const user = getEnv('SMTP_USER');
  const pass = getEnv('SMTP_PASS');
  const from = getEnv('EMAIL_FROM') || 'VidaMed <no-reply@vidamed.local>';
  const replyTo = getEnv('EMAIL_REPLY_TO') || undefined;

  if (!host || !port || !user || !pass) {
    throw new Error('Config SMTP incompleta: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.');
  }

  return { host, port, user, pass, from, replyTo };
}

function formatDateVZ(iso: string): { dateStr: string; timeStr: string } {
  try {
    const d = new Date(iso);
    const dateStr = d.toLocaleDateString('es-VE');
    const timeStr = d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    return { dateStr, timeStr };
  } catch {
    return { dateStr: iso, timeStr: '' };
  }
}

export async function sendAppointmentConfirmationEmail(opts: {
  to: string;
  patientName: string;
  cedula?: string;
  phone?: string;
  location: string;
  studies: string[];
  dateIso: string; // e.g. 2025-07-17T09:30:00-04:00
  summaryText?: string;
}) {
  const smtp = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const logoPath = resolveAsset('assets/vidamed_logo.png');
  const hasLogo = fs.existsSync(logoPath);
  const logoCid = hasLogo ? 'vidamed-logo' : undefined;

  const { dateStr, timeStr } = formatDateVZ(opts.dateIso);
  const html = buildAppointmentEmailHtml({
    type: 'confirmation',
    patientName: opts.patientName,
    dateStr,
    timeStr,
    location: opts.location,
    studies: opts.studies || [],
    phone: opts.phone,
    cedula: opts.cedula,
    summaryText: opts.summaryText,
    logoCid,
    whatsappNumber: getEnv('WHATSAPP_NUMBER') || undefined,
  });

  const subject = `VidaMed – Confirmación de Cita – ${dateStr} ${timeStr}`;
  const info = await transporter.sendMail({
    to: opts.to,
    // Remitente configurable por entorno; por defecto atención al paciente
    from: (getEnv('MAIL_CONFIRMATION_FROM') || getEnv('EMAIL_CONFIRMATION_FROM') || 'VidaMed <atencionalpaciente@labvidamed.com>'),
    replyTo: smtp.replyTo,
    subject,
    html,
    attachments: hasLogo ? [{ filename: 'vidamed_logo.png', path: logoPath, cid: logoCid }] : [],
  });
  return { ok: true, messageId: info.messageId };
}

export async function sendAppointmentReminderEmail(opts: {
  to: string;
  patientName: string;
  location: string;
  studies: string[];
  dateIso: string;
  phone?: string;
  cedula?: string;
}) {
  const smtp = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const logoPath = resolveAsset('assets/vidamed_logo.png');
  const hasLogo = fs.existsSync(logoPath);
  const logoCid = hasLogo ? 'vidamed-logo' : undefined;

  const { dateStr, timeStr } = formatDateVZ(opts.dateIso);
  const html = buildAppointmentEmailHtml({
    type: 'reminder',
    patientName: opts.patientName,
    dateStr,
    timeStr,
    location: opts.location,
    studies: opts.studies || [],
    phone: opts.phone,
    cedula: opts.cedula,
    logoCid,
    whatsappNumber: getEnv('WHATSAPP_NUMBER') || undefined,
  });

  const subject = `VidaMed – Recordatorio de Cita – ${dateStr} ${timeStr}`;
  const info = await transporter.sendMail({
    to: opts.to,
    from: smtp.from,
    replyTo: smtp.replyTo,
    subject,
    html,
    attachments: hasLogo ? [{ filename: 'vidamed_logo.png', path: logoPath, cid: logoCid }] : [],
  });
  return { ok: true, messageId: info.messageId };
}

export default { sendAppointmentConfirmationEmail, sendAppointmentReminderEmail };