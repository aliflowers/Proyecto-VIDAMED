import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

function getEnv(name: string): string | undefined {
  // Prioriza variables privadas del backend y acepta fallbacks comunes
  return (
    process.env[name] ||
    process.env[`PRIVATE_${name}`] ||
    process.env[`VITE_${name}`]
  );
}

// Helpers para normalizar y renderizar datos en el PDF
function normalizeCamposFormulario(campos: any): Array<{ name: string; label: string; unit?: string; reference?: string }> {
  let raw = campos;
  if (!raw) return [];
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((campo: any) => ({
      name: campo?.name ?? campo?.nombre ?? '',
      label: campo?.label ?? campo?.etiqueta ?? campo?.name ?? campo?.nombre ?? '',
      unit: campo?.unit ?? campo?.unidad,
      reference: campo?.reference ?? campo?.valor_referencial,
    }))
    .filter(f => !!f.name);
}

function isManualResult(data: any): boolean {
  return !!(data && data.tipo === 'manual' && typeof data.valores === 'object');
}

function extractValores(md: any): Record<string, any> {
  if (!md || typeof md.valores !== 'object' || md.valores === null) return {};
  const v: any = md.valores;
  if (v && typeof v === 'object' && 'valores' in v && typeof v.valores === 'object' && v.valores !== null) {
    return v.valores as Record<string, any>;
  }
  return v as Record<string, any>;
}

// Resuelve rutas de assets de forma robusta para distintos cwd
function resolveAsset(relPath: string): string {
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

// Construye el HTML del email con estilos inline y logo opcional por CID
function buildEmailHtml(opts: {
  patientName: string;
  studyName: string;
  dateStr: string;
  logoCid?: string;
  refId?: string;
}): string {
  const COLORS = {
    primary: '#007C91',
    border: '#E5E7EB',
    bg: '#F7FAFC',
    text: '#0A0A0A',
    muted: '#6B7280',
  } as const;

  const logoImg = opts.logoCid
    ? `<img src="cid:${opts.logoCid}" alt="Laboratorio VidaMed" style="height:40px;width:auto;display:block;" />`
    : `<span style="font-weight:700;font-size:18px;color:${COLORS.primary};font-family:Segoe UI, Arial, sans-serif;">VidaMed</span>`;

  const ref = opts.refId ? String(opts.refId) : undefined;

  return `<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:${COLORS.bg};">
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
              <h1 style="margin:8px 0 0;font-family:Segoe UI, Arial, sans-serif;font-size:22px;line-height:28px;color:${COLORS.text};">Laboratorio VidaMed</h1>
              <p style="margin:4px 0 16px;color:${COLORS.muted};font-size:12px;font-family:Segoe UI, Arial, sans-serif;">Fecha: ${opts.dateStr}</p>

              <p style="font-size:14px;color:${COLORS.text};margin:0 0 8px;font-family:Segoe UI, Arial, sans-serif;">Hola <strong>${opts.patientName}</strong>,</p>
              <p style="font-size:14px;color:${COLORS.text};margin:0 0 16px;font-family:Segoe UI, Arial, sans-serif;">Desde el Laboratorio Clínico VidaMed te informamos que tu resultado del estudio <strong>${opts.studyName}</strong> está listo.</p>

              <div style="margin:16px 0;padding:12px 16px;border:1px solid ${COLORS.border};border-radius:8px;background:#F9FAFB;">
                <p style="font-size:14px;color:${COLORS.text};margin:0;font-family:Segoe UI, Arial, sans-serif;">Adjuntamos el PDF con el resultado y la interpretación IA aprobada.</p>
              </div>

              <p style="font-size:14px;color:${COLORS.text};margin:0 0 12px;font-family:Segoe UI, Arial, sans-serif;">Gracias por confiar en VidaMed.</p>

              <div style="margin-top:20px;padding-top:12px;border-top:1px solid ${COLORS.border};">
                <p style="font-size:12px;color:${COLORS.muted};margin:0;font-family:Segoe UI, Arial, sans-serif;">Mensaje automático VidaMed${ref ? ` • Ref: #${ref}` : ''}. Si necesitas ayuda, contáctanos.</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="text-align:center;padding:16px;color:${COLORS.muted};font-size:12px;font-family:Segoe UI, Arial, sans-serif;">© ${new Date().getFullYear()} VidaMed — Todos los derechos reservados</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function drawTable(opts: {
  doc: InstanceType<typeof PDFDocument>;
  startX: number;
  startY: number;
  columnWidths: number[];
  headers: string[];
  rows: Array<string[]>;
  boldColumns?: number[];
}): number {
  const { doc, startX, startY, columnWidths, headers, rows, boldColumns = [1] } = opts;
  const baseRowMin = 22;
  const headerHeight = 26;
  let y = startY;

  // Header
  doc.save();
  doc.fontSize(11).fillColor('#ffffff');
  doc.rect(startX, y, columnWidths.reduce((a, b) => a + b, 0), headerHeight).fill('#374151');
  let x = startX;
  headers.forEach((h, i) => {
    doc.fillColor('#ffffff').text(h, x + 6, y + 6, { width: columnWidths[i] - 12, align: 'left' });
    x += columnWidths[i];
  });
  doc.restore();
  y += headerHeight;

  // Filas con altura dinámica según contenido
  doc.fontSize(11).fillColor('#111827');
  const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
  rows.forEach((cells, rowIndex) => {
    x = startX;
    // Calcular altura necesaria por celda
    const heights = cells.map((cell, i) => {
      const w = columnWidths[i] - 12;
      const h = doc.heightOfString(String(cell), { width: w, align: 'left' });
      return Math.max(h, baseRowMin - 12); // texto + padding
    });
    const rowHeight = Math.max(...heights) + 12; // padding vertical

    // Alternar fondo
    if (rowIndex % 2 === 0) {
      doc.save();
      doc.rect(startX, y, totalWidth, rowHeight).fill('#F3F4F6');
      doc.restore();
    }

    // Dibujar celdas
    cells.forEach((cell, i) => {
      if (boldColumns.includes(i)) {
        doc.font('Helvetica-Bold');
      } else {
        doc.font('Helvetica');
      }
      doc.text(String(cell), x + 6, y + 6, { width: columnWidths[i] - 12, align: 'left' });
      x += columnWidths[i];
    });

    // Línea inferior de la fila
    doc.save();
    doc.lineWidth(0.5).strokeColor('#D1D5DB');
    doc.moveTo(startX, y + rowHeight).lineTo(startX + totalWidth, y + rowHeight).stroke();
    doc.restore();

    y += rowHeight;
  });

  // Bordes verticales generales
  doc.save();
  doc.lineWidth(0.5).strokeColor('#D1D5DB');
  let bottomY = y; // y actual tras última fila
  let lineX = startX;
  doc.moveTo(lineX, startY).lineTo(lineX, bottomY).stroke();
  columnWidths.forEach(w => {
    lineX += w;
    doc.moveTo(lineX, startY).lineTo(lineX, bottomY).stroke();
  });
  doc.restore();

  return y;
}

// Renderiza texto “tipo Markdown” en ancho completo, quitando marcadores y aplicando formatos básicos
function renderAnalysisText(opts: {
  doc: InstanceType<typeof PDFDocument>;
  text: string;
  x: number;
  y: number;
  width: number;
}): number {
  const { doc, text, x, y, width } = opts;
  let cursorY = y;
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .split('\n');

  const clean = (s: string) => s
    .replace(/^\s*#+\s*/g, '') // quitar encabezados ###
    .replace(/\*\*/g, '')      // quitar negritas markdown (se aplican manualmente cuando corresponda)
    .replace(/^\s*[\-*]\s*/g, ''); // quitar marcadores de lista

  lines.forEach((raw) => {
    const isHeading = /^\s*#{1,6}\s+/.test(raw);
    const isBullet = /^\s*[\-*]\s+/.test(raw) || /^\s*•\s+/.test(raw);
    const textLine = clean(raw).trim();
    if (!textLine) { cursorY += 6; return; }

    if (isHeading) {
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#111827')
        .text(textLine, x, cursorY, { width, align: 'left' });
      cursorY = (doc as any).y + 4;
      return;
    }

    if (isBullet) {
      // Dibuja viñeta y texto con sangría
      const bulletX = x;
      const contentX = x + 14;
      doc.font('Helvetica').fontSize(12).fillColor('#111827').text('•', bulletX, cursorY, { width: 10, align: 'left' });
      doc.font('Helvetica').fontSize(12).fillColor('#111827').text(textLine, contentX, cursorY, { width: width - 14, align: 'left' });
      cursorY = (doc as any).y + 2;
      return;
    }

    // Línea normal
    doc.font('Helvetica').fontSize(12).fillColor('#111827')
      .text(textLine, x, cursorY, { width, align: 'left' });
    cursorY = (doc as any).y + 2;
  });

  return cursorY;
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
      const manualData = isManualResult(raw) ? raw : null;
      const valoresPlano = extractValores(manualData);
      const motivoEstudio = data.motivo_estudio || raw?.motivo_estudio || '';
      const interpretacion = data.analisis_editado || data.analisis_ia || '';
      const camposForm = normalizeCamposFormulario(estudio?.campos_formulario);
      // Paleta y tipografía (aproximación a Tailwind del frontend)
      const COLORS = {
        primary: '#007C91',
        secondary: '#4FBDBA',
        dark: '#0A0A0A',
        gray: '#6B7280',
        border: '#E5E7EB',
        headerBg: '#F3F4F6',
      } as const;

      // Header con logo a la izquierda y título/datos a la derecha
      const pageWidth = (doc as any).page.width || 595.28;
      const leftMargin = (doc as any).page.margins?.left ?? 50;
      const rightMargin = (doc as any).page.margins?.right ?? 50;
      const usableWidth = pageWidth - leftMargin - rightMargin;
      const startX = leftMargin;
      let startY = (doc as any).y;

      const logoPath = resolveAsset('assets/vidamed_logo.png');
      try {
        // En PDFKit, al especificar x/y no es necesario usar align.
        // Eliminar align evita el error de tipo en @types/pdfkit.
        doc.image(logoPath, startX, startY, { fit: [120, 60] });
      } catch {
        // Si no existe el logo, continuamos sin lanzar error
      }

      // Bloque de la derecha: título y fecha
      const rightBoxX = startX + usableWidth - 300;
      const rightBoxWidth = 300;
      doc.font('Helvetica-Bold').fontSize(18).fillColor(COLORS.dark)
        .text('Resultados del Examen', rightBoxX, startY, { width: rightBoxWidth, align: 'right' });
      doc.font('Helvetica').fontSize(11).fillColor(COLORS.gray)
        .text(`Fecha: ${new Date().toLocaleDateString('es-VE')}`, rightBoxX, startY + 24, { width: rightBoxWidth, align: 'right' });

      // Avanzar Y debajo del header
      const headerBottomY = Math.max(startY + 70, (doc as any).y + 18);
      (doc as any).y = headerBottomY;
      startY = headerBottomY;

      // Grid de datos en dos columnas con borde superior e inferior
      doc.save();
      doc.strokeColor(COLORS.border).lineWidth(1);
      doc.moveTo(startX, startY).lineTo(startX + usableWidth, startY).stroke();
      doc.restore();

      const colGap = 24;
      const colWidth = (usableWidth - colGap) / 2;
      const lineH = 18;
      let gridY = startY + 12;

      const infoLeft = [
        { label: 'Paciente', value: `${paciente.nombres || ''} ${paciente.apellidos || ''}`.trim() },
        { label: 'Cédula', value: paciente.cedula_identidad || '' },
        { label: 'Email', value: paciente.email || '' },
        { label: 'Motivo del Estudio', value: motivoEstudio || '', span: true },
      ];
      const infoRight = [
        { label: 'ID Paciente', value: (paciente.id ?? '').toString() },
        { label: 'Teléfono', value: paciente.telefono || '' },
        { label: 'Dirección', value: paciente.direccion || '' },
      ];

      const drawInfoItem = (x: number, y: number, width: number, item: { label: string; value: string }): number => {
        if (!item.value) return y; // Saltar si vacío
        doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.dark).text(`${item.label}:`, x, y, { width, continued: false });
        const labelW = doc.widthOfString(`${item.label}:`);
        doc.font('Helvetica').fontSize(11).fillColor(COLORS.dark)
          .text(item.value, x + labelW + 6, y, { width: width - labelW - 6 });
        return y + lineH;
      };

      // Render columnas
      const leftX = startX;
      const rightX = startX + colWidth + colGap;
      let leftY = gridY;
      let rightY = gridY;
      infoLeft.forEach((it) => { if (!it.span) leftY = drawInfoItem(leftX, leftY, colWidth, it as any); });
      infoRight.forEach((it) => { rightY = drawInfoItem(rightX, rightY, colWidth, it as any); });

      // Motivo con span en 2 columnas si existe
      const motivoItem = infoLeft.find(i => (i as any).span);
      if (motivoItem && motivoItem.value) {
        const ySpan = Math.max(leftY, rightY) + 6;
        doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.dark)
          .text(`${motivoItem.label}:`, leftX, ySpan, { width: usableWidth, continued: false });
        const labelW = doc.widthOfString(`${motivoItem.label}:`);
        doc.font('Helvetica').fontSize(11).fillColor(COLORS.dark)
          .text(motivoItem.value, leftX + labelW + 6, ySpan, { width: usableWidth - labelW - 6 });
        leftY = rightY = ySpan + lineH;
      }

      const gridBottomY = Math.max(leftY, rightY) + 12;
      doc.save();
      doc.strokeColor(COLORS.border).lineWidth(1);
      doc.moveTo(startX, gridBottomY).lineTo(startX + usableWidth, gridBottomY).stroke();
      doc.restore();
      (doc as any).y = gridBottomY + 8;

      // Título del estudio centrado en color de marca
      const studyName = (estudio.nombre || raw?.nombre_estudio || 'Detalles del Estudio') as string;
      doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.primary).text(studyName.toUpperCase(), startX, (doc as any).y + 6, {
        width: usableWidth,
        align: 'center',
      });
      (doc as any).y += 28;
      const headers = ['Prueba', 'Resultado', 'Unidades', 'Valores de Referencia'];
      const columnWidths = [usableWidth * 0.28, usableWidth * 0.27, usableWidth * 0.15, usableWidth * 0.30];

      let rows: Array<string[]> = [];
      if (camposForm && camposForm.length > 0) {
        rows = camposForm.map((field: any) => {
          const displayed = valoresPlano?.[field.name];
          const valor = displayed !== undefined && displayed !== null && displayed !== '' ? String(displayed) : '-';
          return [String(field.label || field.name), valor, String(field.unit || 'N/A'), String(field.reference || 'N/A')];
        });
      } else if (manualData && Object.keys(valoresPlano || {}).length > 0) {
        rows = Object.entries(valoresPlano).map(([key, value]) => [
          key.replace(/_/g, ' '),
          String(value ?? '-') ,
          'N/A',
          'N/A',
        ]);
      } else {
        doc.fontSize(12).fillColor('#374151').text('No hay parámetros disponibles para este estudio.', { align: 'left' });
      }

      if (rows.length > 0) {
        startY = drawTable({ doc, startX, startY: (doc as any).y, columnWidths, headers, rows, boldColumns: [1] }) + 12;
        (doc as any).y = startY; // Mantener flujo
      }

      if (interpretacion) {
        // Título de sección, ancho completo y alineado a la izquierda
        doc.font('Helvetica-Bold').fontSize(13).fillColor('#1F2937')
          .text('Análisis e Interpretación IA (Aprobada):', startX, (doc as any).y, { width: usableWidth, align: 'left' });
        (doc as any).y += 6;

        // Render del cuerpo quitando markdown y ocupando todo el ancho
        const yAfter = renderAnalysisText({
          doc,
          text: interpretacion,
          x: startX,
          y: (doc as any).y,
          width: usableWidth,
        });
        (doc as any).y = yAfter;
      }

      doc.moveDown();
      doc.fontSize(10).fillColor('gray').text('Este documento fue generado por VidaMed. La interpretación IA es orientativa y no sustituye consulta médica.');

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
      return res.status(500).json({ ok: false, code: 'ENV_MISSING', message: 'SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados (acepta VITE_SUPABASE_URL / VITE_SUPABASE_SERVICE_ROLE).' });
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabaseAdmin
      .from('resultados_pacientes')
      .select(`id, fecha_creacion, resultado_data, analisis_estado, analisis_ia, analisis_editado, motivo_estudio, pacientes:pacientes (id, nombres, apellidos, email, cedula_identidad, telefono, direccion), estudios:estudios (nombre, campos_formulario)`) // eslint-disable-line
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

    // Determinar tipo de resultado (manual vs archivo)
    const raw = typeof (data as any).resultado_data === 'string'
      ? JSON.parse((data as any).resultado_data)
      : ((data as any).resultado_data || {});
    const isArchivo = raw?.tipo === 'archivo';

    // Validar estado de interpretación aprobada SOLO para resultados manuales
    if (!isArchivo) {
      const estado = (data as any).analisis_estado || '';
      const normalized = String(estado).trim().toLowerCase();
      const approvedStates = new Set(['aprobado', 'aprobada', 'completado', 'completada']);
      if (!approvedStates.has(normalized)) {
        return res.status(400).json({ ok: false, code: 'INTERPRETATION_NOT_APPROVED', message: 'La interpretación IA no está aprobada (se requiere Aprobado/Completado).' });
      }
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

    // Construir adjunto: si es "archivo", adjuntar el PDF subido; si es manual, generar PDF
    let pdfBuffer: Buffer;
    if (isArchivo) {
      const fileUrl = String(raw?.url || '').trim();
      if (!fileUrl) {
        return res.status(400).json({ ok: false, code: 'BAD_REQUEST', message: 'El resultado tipo archivo no tiene URL disponible para adjunto.' });
      }
      try {
        const resp = await fetch(fileUrl);
        if (!resp.ok) {
          return res.status(500).json({ ok: false, code: 'FILE_FETCH_ERROR', message: `No se pudo descargar el archivo (${resp.status}).` });
        }
        const ab = await resp.arrayBuffer();
        pdfBuffer = Buffer.from(ab);
      } catch (e: any) {
        return res.status(500).json({ ok: false, code: 'FILE_FETCH_ERROR', message: e?.message || 'Error descargando el archivo para adjuntar.' });
      }
    } else {
      pdfBuffer = await buildResultPdf(data);
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const estudio = (data as any).estudios || {};
    const createdAt = (data as any).fecha_creacion;
    const dateStr = createdAt ? new Date(createdAt).toLocaleDateString('es-VE') : new Date().toLocaleDateString('es-VE');
    const subject = `VidaMed – Resultado #${(data as any).id} – ${estudio.nombre || 'Estudio clínico'} – ${dateStr}`;
    const nombres = paciente.nombres || '';
    const apellidos = paciente.apellidos || '';
    const patientName = `${nombres} ${apellidos}`.trim();

    // Preparar logo inline por CID si existe
    const logoPath = resolveAsset('assets/vidamed_logo.png');
    const hasLogo = fs.existsSync(logoPath);
    const logoCid = hasLogo ? 'vidamed-logo' : undefined;
    const html = buildEmailHtml({
      patientName,
      studyName: estudio.nombre || 'Estudio clínico',
      dateStr,
      logoCid,
      refId: String((data as any).id),
    });

    const info = await transporter.sendMail({
      to: paciente.email,
      from: emailFrom,
      replyTo: emailReplyTo,
      subject,
      html,
      attachments: (() => {
        const defaultName = 'resultado-vidamed.pdf';
        const fileNameFromUrl = () => {
          try {
            const u = String(raw?.url || '');
            if (!u) return defaultName;
            const last = u.split('?')[0].split('/').pop() || '';
            return last.endsWith('.pdf') ? last : defaultName;
          } catch { return defaultName; }
        };
        const atts: any[] = [{ filename: isArchivo ? fileNameFromUrl() : defaultName, content: pdfBuffer }];
        if (hasLogo) atts.push({ filename: 'vidamed_logo.png', path: logoPath, cid: logoCid });
        return atts;
      })(),
    });

    return res.status(200).json({ ok: true, code: 'SENT', message: `Email enviado a ${paciente.email}.`, provider: { messageId: info.messageId } });
  } catch (err: any) {
    return res.status(500).json({ ok: false, code: 'UNEXPECTED', message: err?.message || 'Error inesperado enviando email.' });
  }
}