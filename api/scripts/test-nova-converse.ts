import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

// Cargar variables desde api/.env (opcional). Para la API Converse se requieren credenciales AWS (Access Key/Secret).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN; // opcional (credenciales temporales)

  if (!accessKeyId || !secretAccessKey) {
    console.error('Error: faltan AWS_ACCESS_KEY_ID y/o AWS_SECRET_ACCESS_KEY en el entorno.');
    console.error('Solución: establece las credenciales AWS en tu terminal (PowerShell):');
    console.error('$env:AWS_ACCESS_KEY_ID = "<tu_access_key_id>"');
    console.error('$env:AWS_SECRET_ACCESS_KEY = "<tu_secret_access_key>"');
    console.error('$env:AWS_REGION = "us-east-1"');
    console.error('Si usas credenciales temporales, también: $env:AWS_SESSION_TOKEN = "<tu_session_token>"');
    process.exit(1);
  }

  const client = new BedrockRuntimeClient({
    region,
    credentials: { accessKeyId, secretAccessKey, sessionToken },
  });

  const input = {
    modelId: 'amazon.nova-micro-v1:0',
    messages: [
      { role: 'user', content: [{ type: 'text', text: 'Di exactamente: OK Nova' }] },
    ],
  } as const;

  try {
    console.log(`[Test Nova Converse] Región: ${region} | Modelo: amazon.nova-micro-v1:0`);
    const resp = await client.send(new ConverseCommand(input as any));
    const contentArr = (resp?.output as any)?.message?.content || [];
    const text = (contentArr.find((c: any) => c?.text)?.text || '').toString();
    console.log('[Test Nova Converse] Respuesta:\n');
    console.log(text || JSON.stringify(resp?.output, null, 2));
    process.exit(0);
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error('[Test Nova Converse] Error:', msg);
    process.exit(2);
  }
}

main();