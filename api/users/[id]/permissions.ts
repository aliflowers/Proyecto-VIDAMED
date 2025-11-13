import { createClient } from '@supabase/supabase-js';
import { normalizeModuleName, normalizeActionName, maybeRemapModuleForAction } from '../../_utils/permissions.js';
import { requireAdmin, requireSelfOrAdmin } from '../../_utils/auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

export default async function handler(req: any, res: any) {
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin no configurado' });
    const userId = String(req.query?.id || req.params?.id || '');

    if (!userId) return res.status(400).json({ error: 'Falta id de usuario' });

    if (req.method === 'GET') {
      const auth = await requireSelfOrAdmin(req, res, userId);
      if (!auth) return;
      const { data, error } = await supabaseAdmin
        .from('user_permissions')
        .select('module, action, allowed')
        .eq('user_id', userId);
      if (error) throw error;

      const permissions = (data || []).map((p: any) => {
        const actNorm = normalizeActionName(p.action);
        const modNorm = maybeRemapModuleForAction(normalizeModuleName(p.module), actNorm);
        return { module: modNorm, action: actNorm, allowed: Boolean(p.allowed) };
      });

      return res.status(200).json({ permissions });
    }

    if (req.method === 'PUT') {
      const auth = await requireAdmin(req, res);
      if (!auth) return;
      const { permissions } = req.body || {};
      if (!Array.isArray(permissions)) return res.status(400).json({ error: 'permissions debe ser un arreglo' });

      const { error: delErr } = await supabaseAdmin
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);
      if (delErr) throw delErr;

      if (permissions.length > 0) {
        const toInsert = permissions.map((p: any) => {
          const actNorm = normalizeActionName(p.action);
          const modNorm = maybeRemapModuleForAction(normalizeModuleName(p.module), actNorm);
          return { user_id: userId, module: modNorm, action: actNorm, allowed: Boolean(p.allowed) };
        });
        const { error: permErr } = await supabaseAdmin.from('user_permissions').insert(toInsert);
        if (permErr) throw permErr;
      }

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (e: any) {
    console.error('[serverless] Error en /api/users/[id]/permissions:', e);
    return res.status(500).json({ error: e.message || 'Error interno' });
  }
}
