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
  const { data: session } = await supabase.auth.getSession();
  const accessToken = session?.session?.access_token || null;
  const user = session?.session?.user || null;
  const userId = user?.id || null;
  const email = (user?.email || '').toLowerCase();

  const auditHeaders: Record<string, string> = {};
  if (userId) auditHeaders['x-user-id'] = userId;
  if (email) auditHeaders['x-user-email'] = email;

  const headers = mergeHeaders(
    init?.headers,
    accessToken ? { ...auditHeaders, Authorization: `Bearer ${accessToken}` } : auditHeaders
  );
  return fetch(input, { ...(init || {}), headers });
}
