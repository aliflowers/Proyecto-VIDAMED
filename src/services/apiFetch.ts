import { supabase } from '@/services/supabaseClient';

function mergeHeaders(existing: HeadersInit | undefined, addition: Record<string, string>): HeadersInit {
  const result: Record<string, string> = {};
  if (existing instanceof Headers) {
    existing.forEach((v, k) => {
      result[k] = v;
    });
  } else if (Array.isArray(existing)) {
    existing.forEach(([k, v]) => {
      result[k] = v;
    });
  } else if (existing) {
    Object.assign(result, existing as Record<string, string>);
  }
  Object.assign(result, addition);
  return result;
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id || null;
  const email = (auth?.user?.email || '').toLowerCase();

  const auditHeaders: Record<string, string> = {};
  if (userId) auditHeaders['x-user-id'] = userId;
  if (email) auditHeaders['x-user-email'] = email;

  const headers = mergeHeaders(init?.headers, auditHeaders);
  return fetch(input, { ...(init || {}), headers });
}