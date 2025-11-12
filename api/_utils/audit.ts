import type { Request } from 'express';
import { createClient } from '@supabase/supabase-js';

function getEnv(name: string): string | undefined {
  return (
    process.env[name] ||
    process.env[`PRIVATE_${name}`] ||
    process.env[`VITE_${name}`]
  );
}

function getSupabaseAdmin() {
  const supabaseUrl = getEnv('SUPABASE_URL');
  const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_ROLE');
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados en entorno.');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export const EXCLUDED_AUDIT_EMAILS = ['anamariaprieto@labvidamed.com', 'alijesusflores@gmail.com'];

export async function logServerAudit(opts: {
  req: Request;
  action: string;
  module: string;
  entity?: string;
  entityId?: string | number | null;
  metadata?: Record<string, any> | null;
  success: boolean;
}) {
  try {
    const supabase = getSupabaseAdmin();
    const userIdHeader = (opts.req.headers['x-user-id'] || opts.req.headers['x_user_id'] || '') as string;
    const emailHeader = (opts.req.headers['x-user-email'] || opts.req.headers['x_user_email'] || '') as string;
    // Exclusión centralizada: no registrar actividades de los propietarios de la plataforma
    const emailLower = String(emailHeader || '').toLowerCase();
    if (emailLower && EXCLUDED_AUDIT_EMAILS.includes(emailLower)) {
      return; // Skip audit for owners
    }
    const path = (opts.req.originalUrl || opts.req.url || '/api/notify').toString();
    const userAgent = (opts.req.headers['user-agent'] || '').toString();

    const payload: any = {
      action: opts.action,
      module: opts.module,
      entity: opts.entity || null,
      entity_id: opts.entityId ?? null,
      metadata: opts.metadata ?? null,
      success: !!opts.success,
      path,
      user_agent: userAgent,
    };

    if (userIdHeader && String(userIdHeader).trim()) payload.user_id = String(userIdHeader).trim();
    if (emailHeader && String(emailHeader).trim()) payload.email = String(emailHeader).trim();

    const { error } = await supabase.from('user_audit_logs').insert(payload);
    if (error) {
      // No lanzar para no romper el flujo de las notificaciones
      // eslint-disable-next-line no-console
      console.warn('Audit backend insert failed:', error.message);
    }
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.warn('Audit backend error:', e?.message || e);
  }
}