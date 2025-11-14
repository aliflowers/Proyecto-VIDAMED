// Modelo por defecto para Amazon Bedrock (OpenAI-compatible)
const envModel = process.env.BEDROCK_DEFAULT_MODEL || '';
const validModel = /^(amazon\.nova-(micro|lite)-v1:0)$/i.test(envModel) ? envModel : 'amazon.nova-micro-v1:0';
export const DEFAULT_BEDROCK_MODEL = validModel;
