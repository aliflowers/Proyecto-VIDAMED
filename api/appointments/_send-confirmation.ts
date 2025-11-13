export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

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

    const { sendAppointmentConfirmationEmail } = await import('../notify/_appointment-email.js');
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
    console.error('[serverless] Error enviando confirmación de cita:', error);
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' });
  }
}
