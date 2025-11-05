import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

function getEnv(name: string): string | undefined {
  return process.env[name] || process.env[`VITE_${name}`] || process.env[`PRIVATE_${name}`];
}

async function buildResultPdf(data: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const bufs: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => bufs.push(chunk));
      doc.on('error', (err: Error) => reject(err));
      doc.on('end', () => resolve(Buffer.concat(bufs)));

      const paciente = (data as any).pacientes || {};
      const estudio = (data as any).estudios || {};
      const raw = typeof data.resultado_data === 'string' ? JSON.parse(data.resultado_data) : (data.resultado_data || {});
      const valores = raw?.valores && typeof raw.valores === 'object' ? raw.valores : {};
      const motivoEstudio = data.motivo_estudio || raw?.motivo_estudio || '';
      const interpretacion = data.analisis_editado || data.analisis_ia || '';

      doc.fontSize(20).text('Laboratorio Clínico VidaMed', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(`Resultado del Estudio: ${estudio.nombre || 'Estudio clínico'}`, { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).text(`Paciente: ${paciente.nombres || ''} ${paciente.apellidos || ''}`);
      if (paciente.cedula_identidad) doc.text(`Cédula: ${paciente.cedula_identidad}`);
      if (motivoEstudio) doc.text(`Motivo del Estudio: ${motivoEstudio}`);
      doc.text(`Fecha: ${new Date().toLocaleString('es-VE')}`);

      doc.moveDown();
      doc.fontSize(13).text('Parámetros del Resultado:', { underline: true });
      doc.moveDown(0.5);
      if (Object.keys(valores).length === 0) {
        doc.text('No se registran parámetros en este resultado.');
      } else {
        Object.entries(valores).forEach(([label, value]) => {
          doc.text(`• ${label}: ${String(value)}`);
        });
      }

      if (interpretacion) {
        doc.moveDown();
        doc.fontSize(13).text('Interpretación (Aprobada):', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).text(interpretacion, { align: 'left' });
      }

      doc.moveDown();
      doc.fontSize(10).fillColor('gray').text('Este documento es generado por VidaMed. Para consultas, responda a este correo.');

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

export default async function notifyEmailHandler(req: Request, res: Response) {
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

    const { data, error } = await supabaseAdmin
      .from('resultados_pacientes')
      .select(`id, resultado_data, analisis_estado, analisis_ia, analisis_editado, motivo_estudio, pacientes:pacientes (nombres, apellidos, email, cedula_identidad), estudios:estudios (nombre)`) // eslint-disable-line
      .eq('id', result_id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ ok: false, code: 'DB_ERROR', message: error.message });
    }
    if (!data) {
      return res.status(404).json({ ok: false, code: 'NOT_FOUND', message: 'Resultado no encontrado.' });
    }

    const paciente = (data as any).pacientes || {};
    if (!paciente.email || !String(paciente.email).trim()) {
      return res.status(400).json({ ok: false, code: 'NO_EMAIL', message: 'Este paciente no tiene email registrado.' });
    }

    // Validar estado de interpretación aprobada
    const estado = (data as any).analisis_estado || '';
    if (estado.toLowerCase() !== 'aprobado') {
      return res.status(400).json({ ok: false, code: 'INTERPRETATION_NOT_APPROVED', message: 'La interpretación IA no está aprobada.' });
    }

    const smtpHost = getEnv('SMTP_HOST');
    const smtpPort = Number(getEnv('SMTP_PORT') || '0');
    const smtpUser = getEnv('SMTP_USER');
    const smtpPass = getEnv('SMTP_PASS');
    const emailFrom = getEnv('EMAIL_FROM') || 'VidaMed <no-reply@vidamed.local>';
    const emailReplyTo = getEnv('EMAIL_REPLY_TO') || undefined;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      return res.status(500).json({ ok: false, code: 'ENV_MISSING', message: 'Config SMTP incompleta: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.' });
    }

    const pdfBuffer = await buildResultPdf(data);

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const estudio = (data as any).estudios || {};
    const subject = `VidaMed - Resultado del estudio "${estudio.nombre || 'Estudio clínico'}"`;
    const nombres = paciente.nombres || '';
    const apellidos = paciente.apellidos || '';
    const html = `
      <p>Hola ${nombres} ${apellidos},</p>
      <p>Desde el Laboratorio Clínico VidaMed te informamos que tu resultado del estudio "${estudio.nombre || 'Estudio clínico'}" está listo.</p>
      <p>Adjuntamos el PDF con el resultado y la interpretación IA aprobada.</p>
      <p>Gracias por confiar en VidaMed.</p>
    `;

    const info = await transporter.sendMail({
      to: paciente.email,
      from: emailFrom,
      replyTo: emailReplyTo,
      subject,
      html,
      attachments: [{ filename: 'resultado-vidamed.pdf', content: pdfBuffer }],
    });

    return res.status(200).json({ ok: true, code: 'SENT', message: `Email enviado a ${paciente.email}.`, provider: { messageId: info.messageId } });
  } catch (err: any) {
    return res.status(500).json({ ok: false, code: 'UNEXPECTED', message: err?.message || 'Error inesperado enviando email.' });
  }
}