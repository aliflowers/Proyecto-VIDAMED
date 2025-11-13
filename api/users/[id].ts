import { createClient } from '@supabase/supabase-js';
import { normalizeModuleName, normalizeActionName, maybeRemapModuleForAction } from '../_utils/permissions.js';
import { requireAdmin } from '../_utils/auth.js'
import { handleCors } from '../_utils/cors.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin no configurado' });
    const auth = await requireAdmin(req, res)
    if (!auth) return
    const userId = String(req.query?.id || req.params?.id || '');

    if (!userId) return res.status(400).json({ error: 'Falta id de usuario' });

    if (req.method === 'PUT') {
      const { nombre, apellido, cedula, email, password, sede, rol, permissions } = req.body || {};

      const updatePayload: any = {};
      if (email) updatePayload.email = String(email);
      if (password) updatePayload.password = String(password);
      const meta: any = {};
      if (nombre) meta.nombre = String(nombre);
      if (apellido) meta.apellido = String(apellido);
      if (cedula) meta.cedula = String(cedula);
      if (sede) meta.sede = String(sede);
      if (rol) meta.rol = String(rol);
      if (Object.keys(meta).length > 0) updatePayload.user_metadata = meta;
      if (rol) updatePayload.app_metadata = { role: String(rol) };

      if (Object.keys(updatePayload).length > 0) {
        const upd = await (supabaseAdmin as any).auth.admin.updateUserById(userId, updatePayload);
        if (upd.error) throw upd.error;
      }

      const profileUpdate: any = {};
      if (nombre) profileUpdate.nombre = String(nombre);
      if (apellido) profileUpdate.apellido = String(apellido);
      if (cedula) profileUpdate.cedula = String(cedula);
      if (email) profileUpdate.email = String(email);
      if (sede) profileUpdate.sede = String(sede);
      if (rol) profileUpdate.rol = String(rol);
      if (Object.keys(profileUpdate).length > 0) {
        const { error: profErr } = await supabaseAdmin
          .from('user_profiles')
          .update({ ...profileUpdate, updated_at: new Date().toISOString() })
          .eq('user_id', userId);
        if (profErr) throw profErr;
      }

      if (Array.isArray(permissions)) {
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
      }

      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const del = await (supabaseAdmin as any).auth.admin.deleteUser(userId);
      if (del.error) throw del.error;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (e: any) {
    console.error('[serverless] Error en /api/users/[id]:', e);
    return res.status(500).json({ error: e.message || 'Error interno' });
  }
}
