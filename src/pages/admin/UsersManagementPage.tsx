import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import { logAudit } from '@/services/audit';
import { hasPermission, normalizeRole, normalizeModuleName, normalizeActionName } from '@/utils/permissions';
import { apiFetch } from '@/services/apiFetch';

type Rol = 'Administrador' | 'Lic.' | 'Asistente';
type Sede = 'Sede Principal Maracay' | 'Sede La Colonia Tovar';

type Usuario = {
  user_id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  email: string;
  sede: Sede;
  rol: Rol;
  created_at?: string;
};

type PermOverride = { module: string; action: string; allowed: boolean };

const MODULES: Record<string, string[]> = {
  RESULTADOS: ['ver', 'imprimir', 'enviar_whatsapp', 'enviar_email', 'crear', 'editar', 'eliminar'],
  INVENTARIO: ['ver', 'crear', 'editar', 'eliminar'],
  PACIENTES: ['ver', 'editar'],
  CITAS: ['ver', 'reprogramar', 'confirmar', 'cancelar', 'gestionar_disponibilidad'],
  TESTIMONIOS: ['ver', 'aprobar', 'eliminar', 'cancelar'],
  BLOG: ['ver', 'crear', 'editar', 'eliminar'],
  ESTUDIOS: ['ver', 'crear', 'editar', 'eliminar'],
  SITE_CONFIG: ['ver', 'actualizar_tasa_cambio'],
};

const OWNER_EMAILS = ['anamariaprieto@labvidamed.com', 'alijesusflores@gmail.com'];
const isProtectedEmail = (email?: string) => OWNER_EMAILS.includes(String(email || '').toLowerCase());

function getDefaultAllowed(rol: Rol, module: string, action: string): boolean {
  // Administrador: todo permitido
  if (rol === 'Administrador') return true;

  if (rol === 'Lic.') {
    switch (module) {
      case 'RESULTADOS':
        if (action === 'eliminar') return false;
        return true;
      case 'INVENTARIO':
        if (action === 'crear' || action === 'editar') return false;
        // Puede ver, y eliminar lo determinamos como permitido por defecto
        return true;
      case 'CITAS':
        // Restricción por sede se valida en capa de negocio: aquí permisos globales
        return true;
      case 'ESTUDIOS':
        return action === 'ver' ? true : false;
      case 'SITE_CONFIG':
        if (action === 'actualizar_tasa_cambio') return true;
        return action === 'ver' ? true : false;
      default:
        return true;
    }
  }

  if (rol === 'Asistente') {
    switch (module) {
      case 'RESULTADOS':
        return ['ver', 'imprimir', 'enviar_whatsapp', 'enviar_email'].includes(action);
      case 'INVENTARIO':
        return action === 'ver';
      case 'PACIENTES':
        return action === 'ver';
      case 'CITAS':
        // Acceso total a gestión de citas
        return true;
      case 'TESTIMONIOS':
        return true;
      case 'BLOG':
        return true;
      case 'ESTUDIOS':
        return action === 'ver';
      case 'SITE_CONFIG':
        return action === 'actualizar_tasa_cambio' || action === 'ver';
      default:
        return false;
    }
  }

  return false;
}

const UsersManagementPage: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Usuario actual (quien está usando este módulo)
  const [currentUserRole, setCurrentUserRole] = useState<Rol | null>(null);
  const [currentUserOverrides, setCurrentUserOverrides] = useState<Record<string, Record<string, boolean>>>({});
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // Formulario de creación
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    email: '',
    password: '',
    sede: 'Sede Principal Maracay' as Sede,
    rol: 'Asistente' as Rol,
  });

  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [permOverrides, setPermOverrides] = useState<Record<string, Record<string, boolean>>>({});
  const effectiveMatrix: Record<string, Record<string, boolean>> = useMemo(() => {
    const matrix: Record<string, Record<string, boolean>> = {};
    const rol: Rol = selectedUser?.rol || 'Asistente';
    for (const mod of Object.keys(MODULES)) {
      matrix[mod] = {};
      for (const action of MODULES[mod]) {
        const def = getDefaultAllowed(rol, mod, action);
        const override = permOverrides[mod]?.[action];
        matrix[mod][action] = typeof override === 'boolean' ? override : def;
      }
    }
    return matrix;
  }, [selectedUser?.rol, permOverrides]);

  const API_BASE = import.meta.env.VITE_API_BASE || '/api';

  // --- Permisos locales del módulo de Gestión de Usuarios ---
  type UserModuleAction = 'crear_usuario' | 'actualizar_perfil' | 'eliminar_usuario' | 'editar_permisos';
  const USER_MODULE = 'USERS';
  const can = (action: UserModuleAction): boolean =>
    hasPermission(
      { role: currentUserRole || 'Asistente', overrides: currentUserOverrides },
      USER_MODULE,
      action
    );

  async function fetchUsuarios() {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiFetch(`${API_BASE}/users`);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Error al listar usuarios');
      setUsuarios(json.users || []);
    } catch (e: any) {
      setError(e.message || 'Error al listar usuarios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // Cargar rol, email y overrides del usuario actual para aplicar permisos del módulo
  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id || null;
        const email = (auth?.user?.email || '').toLowerCase() || null;
        setCurrentUserEmail(email);

        let role: Rol | null = null;
        if (auth?.user?.user_metadata?.rol) {
          role = String(auth.user.user_metadata.rol) as Rol;
        }
        if (uid) {
          const { data: prof, error: profErr } = await supabase
            .from('user_profiles')
            .select('rol')
            .eq('user_id', uid);
          if (!profErr && Array.isArray(prof) && prof.length > 0) {
            role = String((prof[0] as any).rol) as Rol;
          }
        }
        setCurrentUserRole(role);

        if (uid) {
          const resp = await apiFetch(`${API_BASE}/users/${uid}/permissions`);
          const json = await resp.json();
          if (resp.ok) {
            const overrides: Record<string, Record<string, boolean>> = {};
            (json.permissions || []).forEach((p: PermOverride) => {
              if (!overrides[p.module]) overrides[p.module] = {};
              overrides[p.module][p.action] = Boolean(p.allowed);
            });
            setCurrentUserOverrides(overrides);
          }
        }

        if (role && normalizeRole(String(role)) !== 'Administrador') {
          setInfoMsg('Tu rol no está autorizado para gestionar usuarios. Algunas acciones estarán bloqueadas.');
        }
      } catch (e: any) {
        setCurrentUserRole(null);
        setInfoMsg('Debes iniciar sesión para gestionar usuarios. Acceso limitado.');
      }
    })();
  }, []);

  async function crearUsuario(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!can('crear_usuario')) {
      setError('No está autorizado para crear usuarios.');
      return;
    }
    try {
      const resp = await apiFetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Error al crear usuario');

      // Audit con entityId corregido (user_id retornado por backend)
      if (!isProtectedEmail(currentUserEmail || undefined)) {
        await logAudit({
          action: 'Crear',
          module: 'Gestión de Usuarios',
          entity: 'users',
          entityId: json?.user_id ?? null,
          metadata: { email: form.email, rol: form.rol, sede: form.sede },
        });
      }

      setForm({ nombre: '', apellido: '', cedula: '', email: '', password: '', sede: 'Sede Principal Maracay', rol: 'Asistente' });
      await fetchUsuarios();
    } catch (e: any) {
      setError(e.message || 'Error al crear usuario');
    }
  }

  async function eliminarUsuario(u: Usuario) {
    if (!can('eliminar_usuario')) {
      setError('No está autorizado para eliminar usuarios.');
      return;
    }
    if (isProtectedEmail(u.email)) {
      setError('No está autorizado para eliminar usuarios propietarios de la plataforma.');
      return;
    }
    if (!window.confirm(`¿Eliminar usuario ${u.email}? Esta acción es permanente.`)) return;
    setError(null);
    try {
      const resp = await apiFetch(`${API_BASE}/users/${u.user_id}`, { method: 'DELETE' });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Error al eliminar usuario');

      if (!isProtectedEmail(currentUserEmail || undefined)) {
        await logAudit({ action: 'Eliminar', module: 'Gestión de Usuarios', entity: 'users', entityId: u.user_id, metadata: { email: u.email } });
      }

      if (selectedUser?.user_id === u.user_id) {
        setSelectedUser(null);
        setPermOverrides({});
      }
      await fetchUsuarios();
    } catch (e: any) {
      setError(e.message || 'Error al eliminar usuario');
    }
  }

  async function seleccionarUsuario(u: Usuario) {
    setSelectedUser(u);
    setError(null);
    try {
      const resp = await apiFetch(`${API_BASE}/users/${u.user_id}/permissions`);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Error al cargar permisos');
      const overrides: Record<string, Record<string, boolean>> = {};
      (json.permissions || []).forEach((p: PermOverride) => {
        if (!overrides[p.module]) overrides[p.module] = {};
        overrides[p.module][p.action] = Boolean(p.allowed);
      });
      setPermOverrides(overrides);
    } catch (e: any) {
      setError(e.message || 'Error al cargar permisos');
    }
  }

  function togglePermission(moduleName: string, actionName: string, allowed: boolean) {
    setPermOverrides(prev => {
      const nextModule = { ...(prev[moduleName] || {}) };
      nextModule[actionName] = allowed;
      return { ...prev, [moduleName]: nextModule };
    });
  }

  async function guardarPermisos() {
    if (!selectedUser) return;
    if (!can('editar_permisos')) {
      setError('No está autorizado para editar permisos de usuarios.');
      return;
    }
    if (isProtectedEmail(selectedUser.email)) {
      setError('No está autorizado para editar permisos de los propietarios de la plataforma.');
      return;
    }
    const rol = selectedUser.rol;
    const overridesToSend: PermOverride[] = [];
    for (const mod of Object.keys(MODULES)) {
      for (const action of MODULES[mod]) {
        const def = getDefaultAllowed(rol, mod, action);
        const eff = effectiveMatrix[mod]?.[action] ?? def;
        if (eff !== def) {
          // Normaliza módulo y acción antes de enviar
          overridesToSend.push({
            module: normalizeModuleName(mod),
            action: normalizeActionName(action),
            allowed: eff,
          });
        }
      }
    }

    try {
      const resp = await apiFetch(`${API_BASE}/users/${selectedUser.user_id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: overridesToSend }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Error al guardar permisos');

      if (!isProtectedEmail(currentUserEmail || undefined)) {
        await logAudit({ action: 'Editar permisos', module: 'Gestión de Usuarios', entity: 'user_permissions', entityId: selectedUser.user_id, metadata: { overrides_count: overridesToSend.length } });
      }

      await seleccionarUsuario(selectedUser);
      alert('Permisos actualizados');
    } catch (e: any) {
      setError(e.message || 'Error al guardar permisos');
    }
  }

  async function actualizarPerfil(u: Usuario) {
    if (!can('actualizar_perfil')) {
      setError('No está autorizado para actualizar perfiles de usuarios.');
      return;
    }
    if (isProtectedEmail(u.email)) {
      setError('No está autorizado para editar el perfil/rol de los propietarios de la plataforma.');
      return;
    }
    try {
      const resp = await apiFetch(`${API_BASE}/users/${u.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: u.nombre, apellido: u.apellido, cedula: u.cedula, email: u.email, sede: u.sede, rol: u.rol }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Error al actualizar perfil');

      if (!isProtectedEmail(currentUserEmail || undefined)) {
        await logAudit({ action: 'Actualizar', module: 'Gestión de Usuarios', entity: 'users', entityId: u.user_id, metadata: { rol: u.rol, sede: u.sede } });
      }

      await fetchUsuarios();
      alert('Perfil actualizado');
    } catch (e: any) {
      setError(e.message || 'Error al actualizar perfil');
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Gestión de Usuarios</h1>

      {error && (
        <div className="mb-3 text-red-600">{error}</div>
      )}
      {infoMsg && (
        <div className="mb-3 text-amber-600">{infoMsg}</div>
      )}

      <section className="mb-6 border rounded p-4">
        <h2 className="font-medium mb-3">Crear nuevo usuario</h2>
        <form onSubmit={crearUsuario} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="border p-2 rounded" placeholder="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
          <input className="border p-2 rounded" placeholder="Apellido" value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} required />
          <input className="border p-2 rounded" placeholder="Número de Cédula" value={form.cedula} onChange={e => setForm({ ...form, cedula: e.target.value })} required />
          <input className="border p-2 rounded" placeholder="Correo electrónico" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          <input className="border p-2 rounded" placeholder="Contraseña" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          <select className="border p-2 rounded" value={form.sede} onChange={e => setForm({ ...form, sede: e.target.value as Sede })}>
            <option value="Sede Principal Maracay">Sede Principal Maracay</option>
            <option value="Sede La Colonia Tovar">Sede La Colonia Tovar</option>
          </select>
          <select className="border p-2 rounded" value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value as Rol })}>
            <option value="Administrador">Administrador</option>
            <option value="Lic.">Lic.</option>
            <option value="Asistente">Asistente</option>
          </select>
          <div className="md:col-span-3 flex gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50" type="submit" disabled={!can('crear_usuario')}>Crear usuario</button>
          </div>
        </form>
      </section>

      <section className="mb-6 border rounded p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Usuarios</h2>
          <button className="px-3 py-1 border rounded" onClick={fetchUsuarios} disabled={loading}>{loading ? 'Actualizando…' : 'Refrescar'}</button>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Nombre</th>
                <th className="p-2">Apellido</th>
                <th className="p-2">Cédula</th>
                <th className="p-2">Email</th>
                <th className="p-2">Sede</th>
                <th className="p-2">Rol</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.user_id} className="border-b">
                  <td className="p-2"><input className="border p-1 rounded w-full" value={u.nombre} disabled={!can('actualizar_perfil') || isProtectedEmail(u.email)} onChange={e => setUsuarios(prev => prev.map(x => x.user_id === u.user_id ? { ...x, nombre: e.target.value } : x))} /></td>
                  <td className="p-2"><input className="border p-1 rounded w-full" value={u.apellido} disabled={!can('actualizar_perfil') || isProtectedEmail(u.email)} onChange={e => setUsuarios(prev => prev.map(x => x.user_id === u.user_id ? { ...x, apellido: e.target.value } : x))} /></td>
                  <td className="p-2"><input className="border p-1 rounded w-full" value={u.cedula} disabled={!can('actualizar_perfil') || isProtectedEmail(u.email)} onChange={e => setUsuarios(prev => prev.map(x => x.user_id === u.user_id ? { ...x, cedula: e.target.value } : x))} /></td>
                  <td className="p-2"><input className="border p-1 rounded w-full" value={u.email} disabled={!can('actualizar_perfil') || isProtectedEmail(u.email)} onChange={e => setUsuarios(prev => prev.map(x => x.user_id === u.user_id ? { ...x, email: e.target.value } : x))} /></td>
                  <td className="p-2">
                    <select className="border p-1 rounded" value={u.sede} disabled={!can('actualizar_perfil') || isProtectedEmail(u.email)} onChange={e => setUsuarios(prev => prev.map(x => x.user_id === u.user_id ? { ...x, sede: e.target.value as Sede } : x))}>
                      <option value="Sede Principal Maracay">Sede Principal Maracay</option>
                      <option value="Sede La Colonia Tovar">Sede La Colonia Tovar</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <select className="border p-1 rounded" value={u.rol} disabled={!can('actualizar_perfil') || isProtectedEmail(u.email)} onChange={e => setUsuarios(prev => prev.map(x => x.user_id === u.user_id ? { ...x, rol: e.target.value as Rol } : x))}>
                      <option value="Administrador">Administrador</option>
                      <option value="Lic.">Lic.</option>
                      <option value="Asistente">Asistente</option>
                    </select>
                  </td>
                  <td className="p-2 flex gap-2">
                    <button className="px-2 py-1 bg-emerald-600 text-white rounded disabled:opacity-50" onClick={() => actualizarPerfil(u)} disabled={!can('actualizar_perfil') || isProtectedEmail(u.email)}>Guardar</button>
                    <button className="px-2 py-1 bg-sky-600 text-white rounded disabled:opacity-50" onClick={() => seleccionarUsuario(u)} disabled={!can('editar_permisos')}>Permisos</button>
                    <button className="px-2 py-1 bg-red-600 text-white rounded disabled:opacity-50" onClick={() => eliminarUsuario(u)} disabled={!can('eliminar_usuario') || isProtectedEmail(u.email)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedUser && (
        <section className="border rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Permisos: {selectedUser.email} ({selectedUser.rol})</h2>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50" onClick={guardarPermisos} disabled={!can('editar_permisos') || isProtectedEmail(selectedUser.email)}>Guardar permisos</button>
              <button className="px-3 py-1 border rounded" onClick={() => { setSelectedUser(null); setPermOverrides({}); }}>Cerrar</button>
            </div>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">Módulo</th>
                  {Object.keys(MODULES).length > 0 && (
                    <th className="p-2" colSpan={1}>Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {Object.entries(MODULES).map(([mod, actions]) => (
                  <tr key={mod} className="border-b align-top">
                    <td className="p-2 font-medium">{mod}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-3">
                        {actions.map(action => {
                          const val = effectiveMatrix[mod]?.[action] ?? false;
                          return (
                            <label key={action} className="inline-flex items-center gap-2 border rounded px-2 py-1">
                              <input
                                type="checkbox"
                                checked={val}
                                disabled={!can('editar_permisos')}
                                onChange={e => {
                                  if (!can('editar_permisos')) {
                                    setError('No está autorizado para modificar permisos.');
                                    return;
                                  }
                                  togglePermission(mod, action, e.target.checked);
                                }}
                              />
                              <span>{action}</span>
                            </label>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default UsersManagementPage;