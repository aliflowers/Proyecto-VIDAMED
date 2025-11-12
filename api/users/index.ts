import { createClient } from '@supabase/supabase-js';
import { normalizeModuleName, normalizeActionName, maybeRemapModuleForAction } from '../_utils/permissions.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

export default async function handler(req: any, res: any) {
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin no configurado' });

    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ users: data || [] });
    }

    if (req.method === 'POST') {
      const { nombre, apellido, cedula, email, password, sede, rol, permissions } = req.body || {};
      if (!nombre || !apellido || !cedula || !email || !password || !sede || !rol) {
        return res.status(400).json({ error: 'Campos requeridos: nombre, apellido, cedula, email, password, sede, rol' });
      }

      const created = await (supabaseAdmin as any).auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nombre, apellido, cedula, sede, rol },
        app_metadata: { role: rol },
      });
      if (created.error) throw created.error;
      const userId = created.data.user?.id;
      if (!userId) throw new Error('No se obtuvo el ID de usuario tras la creación.');

      const { error: profErr } = await supabaseAdmin
        .from('user_profiles')
        .insert({ user_id: userId, nombre, apellido, cedula, email, sede, rol });
      if (profErr) throw profErr;

      if (Array.isArray(permissions) && permissions.length > 0) {
        const toInsert = permissions.map((p: any) => {
          const actNorm = normalizeActionName(p.action);
          const modNorm = maybeRemapModuleForAction(normalizeModuleName(p.module), actNorm);
          return { user_id: userId, module: modNorm, action: actNorm, allowed: Boolean(p.allowed) };
        });
        const { error: permErr } = await supabaseAdmin.from('user_permissions').insert(toInsert);
        if (permErr) throw permErr;
      }

      return res.status(201).json({ ok: true, user_id: userId });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (e: any) {
    console.error('[serverless] Error en /api/users:', e);
    return res.status(500).json({ error: e.message || 'Error interno' });
  }
}