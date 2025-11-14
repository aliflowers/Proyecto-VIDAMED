import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { bedrockChat } from '../api/bedrock.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables desde api/.env
dotenv.config({ path: path.resolve(__dirname, '../api/.env') });

async function main() {
  const token = process.env.AWS_BEARER_TOKEN_BEDROCK;
  const modelCandidates = [
    process.env.BEDROCK_DEFAULT_MODEL,
    'openai.gpt-oss-120b-1:0',
    'meta.llama3.1-8b-instruct-v1:0',
    'meta.llama3.1-70b-instruct-v1:0',
    'mistral.mistral-large-2402-v1:0',
    'cohere.command-r-plus-v1:0',
  ].filter(Boolean) as string[];
  const baseUrlCandidates = [
    process.env.BEDROCK_OPENAI_BASE_URL,
    'https://bedrock-runtime.us-east-1.amazonaws.com/openai/v1',
    'https://bedrock-runtime.us-west-2.amazonaws.com/openai/v1',
    'https://bedrock-runtime.eu-central-1.amazonaws.com/openai/v1',
    'https://bedrock-runtime.ap-southeast-1.amazonaws.com/openai/v1',
  ].filter(Boolean) as string[];
  if (!token) {
    console.error('Error: AWS_BEARER_TOKEN_BEDROCK no está configurado en api/.env.');
    process.exit(1);
  }

  console.log('[Test] Conectando a Bedrock...');
  for (const baseUrl of baseUrlCandidates) {
    for (const model of modelCandidates) {
      try {
        console.log(`[Test] Probando región y modelo: ${baseUrl} | ${model}`);
        const resp = await bedrockChat({
          model,
          baseUrl,
          messages: [
            { role: 'system', content: 'Eres un sistema de prueba. Responde sucintamente.' },
            { role: 'user', content: 'Di exactamente: OK Bedrock' },
          ],
          temperature: 0.1,
          top_p: 0.9,
          max_completion_tokens: 256,
        });
        console.log('[Test] Respuesta recibida:\n');
        console.log(resp.text);
        process.exit(0);
      } catch (e: any) {
        const msg = e?.message || String(e);
        console.warn(`[Test] Falló ${baseUrl} | ${model}: ${msg}`);
        if (!/model_not_found|404|not_found_error/.test(msg)) {
          console.error('[Test] Error no recuperable, abortando.');
          process.exit(2);
        }
      }
    }
  }
  console.error('[Test] Ningún modelo soportado por la API OpenAI de Bedrock respondió.');
  process.exit(3);
}

main();
