import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

function getArg(name: string): string | undefined {
  const idx = process.argv.findIndex(a => a === `--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

function resolveBool(v: string | undefined, fallback: boolean): boolean {
  if (v == null) return fallback;
  const s = String(v).toLowerCase().trim();
  return s === '1' || s === 'true' || s === 'yes';
}

async function main() {
  // Cargar .env del directorio api (compatibilidad ESM)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

  const to = getArg('to');
  const subject = getArg('subject') || 'Prueba SMTP VidaMed';
  const text = getArg('text') || 'Este es un correo de prueba del sistema VidaMed.';
  const html = getArg('html');
  const fromOverride = getArg('from');
  const replyToOverride = getArg('replyTo');

  const host = process.env.SMTP_HOST;
  const portStr = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = fromOverride || process.env.EMAIL_FROM || user;
  const replyTo = replyToOverride || process.env.EMAIL_REPLY_TO || undefined;

  const port = Number(portStr || '0');
  if (!to) {
    console.error('ERROR: Falta el parámetro --to con el destinatario.');
    process.exit(1);
  }
  if (!host || !port || !user || !pass) {
    console.error('ERROR: Variables SMTP incompletas. Se requieren SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.');
    process.exit(1);
  }
  if (port === 993) {
    console.warn('ADVERTENCIA: El puerto 993 corresponde a IMAP/SSL, no SMTP. Use 465 (SSL) o 587 (STARTTLS). Intentando de todas formas, puede fallar.');
  }

  // Determinar seguridad: por puerto o por env override
  const secureEnv = resolveBool(process.env.SMTP_SECURE, false);
  const requireTlsEnv = resolveBool(process.env.SMTP_REQUIRE_TLS, port === 587);
  const rejectUnauthorizedEnv = resolveBool(process.env.SMTP_TLS_REJECT_UNAUTHORIZED, true);
  const secure = port === 465 ? true : secureEnv; // SSL puro en 465; en 587 suele ser false con STARTTLS

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: requireTlsEnv,
    auth: { user, pass },
    tls: { rejectUnauthorized: rejectUnauthorizedEnv },
  });

  console.log('Conexión SMTP:', { host, port, secure, requireTLS: requireTlsEnv, user, from, replyTo });

  try {
    await transporter.verify();
    console.log('Verificación SMTP exitosa. Procediendo a enviar...');

    const info = await transporter.sendMail({
      to,
      from,
      replyTo,
      subject,
      text: html ? undefined : text,
      html: html || undefined,
    });
    console.log(`OK: Email enviado. messageId=${info.messageId}`);
  } catch (err: any) {
    console.error('ERROR: Falló la verificación/envío de email:', err?.message || String(err));
    console.error('Sugerencias: valide host/puerto, pruebe 465 (SSL) o 587 (STARTTLS), verifique credenciales, y si es un servidor con certificado propio, ajuste SMTP_TLS_REJECT_UNAUTHORIZED=false.');
    process.exit(2);
  }
}

main().catch(err => {
  console.error('ERROR: Excepción no controlada:', err?.message || String(err));
  process.exit(3);
});