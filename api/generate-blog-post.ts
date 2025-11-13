import type { Request, Response } from 'express';
import { bedrockChat } from './bedrock.js';
import { DEFAULT_BEDROCK_MODEL } from './config.js';
import { logServerAudit } from './_utils/audit.js';
import { requireAdmin } from './_utils/auth.js';

/**
 * Vercel Serverless Function: /api/generate-blog-post
 * Genera contenido de blog usando Amazon Bedrock (API compatible con OpenAI) y devuelve un objeto JSON estructurado.
 *
 * Env requeridas (backend en Vercel):
 * - AWS_BEARER_TOKEN_BEDROCK
 */
export default async function handler(req: Request, res: Response) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const auth = await requireAdmin(req as any, res as any);
    if (!auth) return;

    const apiToken = process.env.AWS_BEARER_TOKEN_BEDROCK;
    if (!apiToken) {
      return res.status(500).json({ error: 'Falta AWS_BEARER_TOKEN_BEDROCK en entorno del servidor.' });
    }

    const { topic, postType, categories, tone, targetAudience } = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: "El campo 'topic' es requerido y debe ser texto." });
    }

    const safeCategories = Array.isArray(categories) ? categories.filter((c: any) => typeof c === 'string').slice(0, 12) : [];
    const type = typeof postType === 'string' ? postType : 'Educativa';
    const style = typeof tone === 'string' ? tone : 'Profesional';
    const audience = typeof targetAudience === 'string' ? targetAudience : 'Pacientes';

    const prompt = `Eres un generador de artículos para el Blog del Laboratorio Clínico VidaMed.\n` +
      `Tema: "${topic}".\n` +
      `Tipo de publicación: ${type}.\n` +
      `Tono: ${style}.\n` +
      `Público objetivo: ${audience}.\n` +
      `Categorías de estudios a mencionar (si aplica): ${safeCategories.join(', ') || 'Ninguna específica'}.\n\n` +
      `Instrucciones estrictas:\n` +
      `- Escribe un artículo completo en formato Markdown bien estructurado (títulos, subtítulos, listas, párrafos, enlaces si corresponde).\n` +
      `- No inventes resultados clínicos ni diagnósticos; sé educativo e informativo.\n` +
      `- Optimiza para SEO sin keyword stuffing.\n` +
      `- Incluye llamada a la acción final para agendar cita o consultar estudios.\n` +
      `- Responde EXCLUSIVAMENTE en un objeto JSON con las claves EXACTAS:\n` +
      `  {\n` +
      `    "titulo_articulo": string,\n` +
      `    "resumen": string,\n` +
      `    "contenido_html": string, // Contenido en Markdown\n` +
      `    "meta_titulo": string,\n` +
      `    "meta_descripcion": string,\n` +
      `    "keywords": string // Lista separada por comas\n` +
      `  }\n` +
      `- No incluyas comentarios, explicaciones adicionales, ni bloques de código triple.\n`;

    const genResult = await bedrockChat({
      model: DEFAULT_BEDROCK_MODEL,
      messages: [{ role: 'system', content: 'Eres un generador de artículos para el Blog del Laboratorio Clínico VidaMed.' }, { role: 'user', content: prompt }],
      temperature: 0.2,
      top_p: 0.9,
    });
    const rawText = genResult.text;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    let parsed: any;
    try {
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawText);
    } catch {
      parsed = {
        titulo_articulo: `Artículo: ${topic}`,
        resumen: rawText.slice(0, 280),
        contenido_html: rawText,
        meta_titulo: `VidaMed | ${topic}`,
        meta_descripcion: `Artículo sobre ${topic} para ${audience}.`,
        keywords: [topic, 'salud', 'laboratorio clínico'].concat(safeCategories).join(', '),
      };
    }

    const responsePayload = {
      titulo_articulo: typeof parsed.titulo_articulo === 'string' ? parsed.titulo_articulo.trim() : `Artículo: ${topic}`,
      resumen: typeof parsed.resumen === 'string' ? parsed.resumen.trim() : '',
      contenido_html: typeof parsed.contenido_html === 'string' ? parsed.contenido_html : '',
      meta_titulo: typeof parsed.meta_titulo === 'string' ? parsed.meta_titulo.trim() : `VidaMed | ${topic}`,
      meta_descripcion: typeof parsed.meta_descripcion === 'string' ? parsed.meta_descripcion.trim() : '',
      keywords: typeof parsed.keywords === 'string' ? parsed.keywords : [topic, 'salud', 'laboratorio clínico'].concat(safeCategories).join(', '),
    };
    try {
      await logServerAudit({
        req,
        action: 'Generar contenido blog',
        module: 'Blog',
        entity: 'publicaciones_blog',
        entityId: null,
        metadata: { topic, postType: type, categories: safeCategories, tone: style, targetAudience: audience },
        success: true,
      });
    } catch {}

    return res.status(200).json(responsePayload);
  } catch (err: any) {
    console.error('[api] Error en /api/generate-blog-post:', err);
    try {
      await logServerAudit({
        req,
        action: 'Generar contenido blog',
        module: 'Blog',
        entity: 'publicaciones_blog',
        entityId: null,
        metadata: { topic: (typeof req.body === 'string' ? JSON.parse(req.body)?.topic : req.body?.topic), error: err?.message || String(err) },
        success: false,
      });
    } catch {}
    return res.status(500).json({ error: 'Error generando el artículo con IA.', details: err?.message || 'Error interno' });
  }
}
