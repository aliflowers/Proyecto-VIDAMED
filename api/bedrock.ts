// Cliente simple para AWS Bedrock usando la API compatible con OpenAI
// Autenticación: Authorization: Bearer ${AWS_BEARER_TOKEN_BEDROCK}
// Base URL por defecto: us-west-2 (configurable vía BEDROCK_OPENAI_BASE_URL)

type BedrockMessage = {
  role: 'system' | 'user' | 'assistant' | 'developer' | 'tool';
  content: string | Array<{ type: string; text?: string; [k: string]: any }>;
  tool_calls?: Array<any>;
  tool_call_id?: string; // para mensajes role: 'tool'
};

type BedrockTool = {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, any>;
  };
};

export async function bedrockChat(options: {
  model?: string;
  messages: BedrockMessage[];
  tools?: BedrockTool[];
  temperature?: number;
  top_p?: number;
  max_completion_tokens?: number;
  baseUrl?: string;
}): Promise<{ text: string; raw: any; toolCalls?: Array<{ id?: string; name: string; arguments: any }> }> {
  const token = process.env.AWS_BEARER_TOKEN_BEDROCK;
  if (!token) {
    throw new Error('AWS_BEARER_TOKEN_BEDROCK no está configurada en el entorno.');
  }

  const baseUrl = options.baseUrl || process.env.BEDROCK_OPENAI_BASE_URL || 'https://bedrock-runtime.us-west-2.amazonaws.com/openai/v1';
  const model = options.model || process.env.BEDROCK_DEFAULT_MODEL || 'amazon.nova-micro-v1:0';

  const body: Record<string, any> = {
    model,
    messages: options.messages,
  };
  if (typeof options.temperature === 'number') body.temperature = options.temperature;
  if (typeof options.top_p === 'number') body.top_p = options.top_p;
  if (typeof options.max_completion_tokens === 'number') body.max_completion_tokens = options.max_completion_tokens;
  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = 'auto';
  }

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Bedrock OpenAI API error ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  const choice = data?.choices?.[0];
  const msg = choice?.message;

  let text = '';
  if (msg?.content && Array.isArray(msg.content)) {
    // Buscar el bloque con texto de salida
    const out = msg.content.find((c: any) => c?.type === 'output_text' || c?.type === 'text');
    text = (out?.text || out?.content || '').toString();
  } else if (typeof msg?.content === 'string') {
    text = msg.content;
  }

  // Eliminar cualquier bloque de razonamiento expuesto por modelos GPT-OSS
  text = stripReasoning(text);

  let toolCalls: Array<{ id?: string; name: string; arguments: any }> | undefined;
  if (Array.isArray(msg?.tool_calls)) {
    toolCalls = msg.tool_calls.map((tc: any) => ({
      id: tc?.id,
      name: tc?.function?.name,
      arguments: typeof tc?.function?.arguments === 'string' ? safeJson(tc.function.arguments) : tc?.function?.arguments,
    }));
  }

  return { text, raw: data, toolCalls };
}

function safeJson(s: string) {
  try { return JSON.parse(s); } catch { return s; }
}

function stripReasoning(s: string): string {
  if (!s) return s;
  // Remueve etiquetas comunes de razonamiento (OpenAI-compatible en Bedrock)
  const cleaned = s.replace(/<(reasoning|think|thinking)>[\s\S]*?<\/(reasoning|think|thinking)>/gi, '').trim();
  // También remueve prefijos "Reasoning:" si aparecen en texto plano
  return cleaned.replace(/^\s*Reasoning:\s*[\s\S]*$/im, '').trim();
}

export type { BedrockMessage, BedrockTool };
