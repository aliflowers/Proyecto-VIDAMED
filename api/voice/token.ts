/**
 * Vercel Serverless Function: /api/voice/token
 * - Devuelve un conversation token para ElevenLabs (Convesational AI) usando ELEVENLABS_API_KEY.
 * - Nunca expone la API key al cliente.
 *
 * Env requeridas (en Vercel / vercel dev):
 * - ELEVENLABS_API_KEY
 * - ELEVENLABS_AGENT_ID (opcional si se pasa ?agentId= en la query)
 */
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const ELEVENLABS_API_KEY =
      process.env.ELEVENLABS_API_KEY || process.env.VITE_ELEVENLABS_API_KEY;
    const DEFAULT_AGENT_ID =
      process.env.ELEVENLABS_AGENT_ID || process.env.VITE_ELEVENLABS_AGENT_ID;

    if (!ELEVENLABS_API_KEY) {
      res.status(500).json({ error: 'Falta ELEVENLABS_API_KEY (o VITE_ELEVENLABS_API_KEY) en el entorno del servidor' });
      return;
    }

    // Permitir override por query ?agentId= si fuese necesario en dev
    const agentId =
      (req.query && (req.query.agentId as string)) ||
      (req.body && req.body.agentId) ||
      DEFAULT_AGENT_ID;

    if (!agentId) {
      res.status(400).json({ error: 'Falta agentId (configure ELEVENLABS_AGENT_ID o VITE_ELEVENLABS_AGENT_ID, o páselo por query ?agentId=)' });
      return;
    }

    const url = `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      res.status(response.status).json({ error: 'No se pudo obtener el conversation token', details: text });
      return;
    }

    const data = await response.json();
    // API devuelve { token: '...' }
    if (!data?.token) {
      res.status(500).json({ error: 'Respuesta inválida de ElevenLabs (sin token)' });
      return;
    }

    res.status(200).json({ token: data.token });
  } catch (err: any) {
    console.error('Error en /api/voice/token:', err);
    res.status(500).json({ error: err?.message || 'Error interno' });
  }
}
