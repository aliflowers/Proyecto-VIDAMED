import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { hasPermission } from '../../utils/permissions.ts';

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
  INVENTARIO: ['ver', 'crear_material', 'editar_material', 'eliminar_material'],
  PACIENTES: ['ver', 'editar'],
  CITAS: ['ver', 'gestionar', 'cancelar', 'confirmar', 'reagendar', 'bloquear_dias', 'desbloquear_dias'],
  TESTIMONIOS: ['ver', 'aprobar', 'eliminar', 'cancelar'],
  BLOG: ['ver', 'crear', 'editar', 'eliminar'],
  ESTUDIOS: ['ver', 'crear', 'editar', 'eliminar', 'actualizar_tasa_cambio'],
};

function getDefaultAllowed(rol: Rol, module: string, action: string): boolean {
  // Administrador: todo permitido
  if (rol === 'Administrador') return true;

  if (rol === 'Lic.') {
    switch (module) {
      case 'RESULTADOS':
        if (action === 'eliminar') return false;
        return true;
      case 'INVENTARIO':
        if (action === 'crear_material' || action === 'editar_material') return false;
        // Puede ver, y eliminar_material lo determinamos como permitido por defecto
        return true;
      case 'CITAS':
        // Restricción por sede se valida en capa de negocio: aquí permisos globales
        return true;
      case 'ESTUDIOS':
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

  const API_BASE = '/api';

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
      const resp = await fetch(`${API_BASE}/users`);
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

  // Cargar rol y overrides del usuario actual para aplicar permisos del módulo
  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id || null;
        let role: Rol | null = null;
        if (auth?.user?.user_metadata?.rol) {
          role = String(auth.user.user_metadata.rol) as Rol;
        }
        // Fuente de verdad: perfil en BD. Si existe, sobreescribe cualquier metadato.
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

        // Cargar overrides propios si tenemos uid
        if (uid) {
          const resp = await fetch(`${API_BASE}/users/${uid}/permissions`);
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

        // Mensaje informativo si no es admin
        if (role && role !== 'Administrador') {
          setInfoMsg('Tu rol no está autorizado para gestionar usuarios. Algunas acciones estarán bloqueadas.');
        }
      } catch (e: any) {
        // Si no hay sesión o falla, asumimos permisos mínimos
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
      const resp = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Error al crear usuario');
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
    if (!window.confirm(`¿Eliminar usuario ${u.email}? Esta acción es permanente.`)) return;
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/users/${u.user_id}`, { method: 'DELETE' });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Error al eliminar usuario');
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
      const resp = await fetch(`${API_BASE}/users/${u.user_id}/permissions`);
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

  const effectiveMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, boolean>> = {};
    if (!selectedUser) return matrix;
    const rol = selectedUser.rol;
    for (const mod of Object.keys(MODULES)) {
      matrix[mod] = {};
      for (const action of MODULES[mod]) {
        const def = getDefaultAllowed(rol, mod, action);
        const ov = permOverrides[mod]?.[action];
        matrix[mod][action] = typeof ov === 'boolean' ? ov : def;
      }
    }
    return matrix;
  }, [selectedUser, permOverrides]);

  function togglePermission(module: string, action: string, value: boolean) {
    setPermOverrides(prev => {
      const next = { ...prev };
      if (!next[module]) next[module] = {};
      next[module][action] = value;
      return next;
    });
  }

  async function guardarPermisos() {
    if (!selectedUser) return;
    if (!can('editar_permisos')) {
      setError('No está autorizado para editar permisos de usuarios.');
      return;
    }
    // Solo enviamos overrides donde el valor difiere del default para el rol
    const rol = selectedUser.rol;
    const overridesToSend: PermOverride[] = [];
    for (const mod of Object.keys(MODULES)) {
      for (const action of MODULES[mod]) {
        const def = getDefaultAllowed(rol, mod, action);
        const eff = effectiveMatrix[mod]?.[action] ?? def;
        if (eff !== def) {
          overridesToSend.push({ module: mod, action, allowed: eff });
        }
      }
    }

    try {
      const resp = await fetch(`${API_BASE}/users/${selectedUser.user_id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: overridesToSend }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Error al guardar permisos');
      // Refrescar overrides desde servidor por consistencia
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
    try {
      const resp = await fetch(`${API_BASE}/users/${u.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: u.nombre, apellido: u.apellido, cedula: u.cedula, email: u.email, sede: u.sede, rol: u.rol }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Error al actualizar perfil');
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
                  <td className="p-2"><input className="border p-1 rounded w-full" value={u.nombre} disabled={!can('actualizar_perfil')} onChange={e => setUsuarios(prev => prev.map(x => x.user_id === u.user_id ? { ...x, nombre: e.target.value } : x))} /></td>
                  <td className="p-2"><input className="border p-1 rounded w-full" value={u.apellido} disabled={!can('actualizar_perfil')} onChange={e => setUsuarios(prev => prev.map(x => x.user_id === u.user_id ? { ...x, apellido: e.target.value } : x))} /></td>
                  <td className="p-2"><input className="border p-1 rounded w-full" value={u.cedula} disabled={!can('actualizar_perfil')} onChange={e => setUsuarios(prev => prev.map(x => x.user_id === u.user_id ? { ...x, cedula: e.target.value } : x))} /></td>
                  <td className="p-2"><input className="border p-1 rounded w-full" value={u.email} disabled={!can('actualizar_perfil')} onChange={e => setUsuarios(prev => prev.map(x => x.user_id === u.user_id ? { ...x, email: e.target.value } : x))} /></td>
                  <td className="p-2">
                    <select className="border p-1 rounded" value={u.sede} disabled={!can('actualizar_perfil')} onChange={e => setUsuarios(prev => prev.map(x => x.user_id === u.user_id ? { ...x, sede: e.target.value as Sede } : x))}>
                      <option value="Sede Principal Maracay">Sede Principal Maracay</option>
                      <option value="Sede La Colonia Tovar">Sede La Colonia Tovar</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <select className="border p-1 rounded" value={u.rol} disabled={!can('actualizar_perfil')} onChange={e => setUsuarios(prev => prev.map(x => x.user_id === u.user_id ? { ...x, rol: e.target.value as Rol } : x))}>
                      <option value="Administrador">Administrador</option>
                      <option value="Lic.">Lic.</option>
                      <option value="Asistente">Asistente</option>
                    </select>
                  </td>
                  <td className="p-2 flex gap-2">
                    <button className="px-2 py-1 bg-emerald-600 text-white rounded disabled:opacity-50" onClick={() => actualizarPerfil(u)} disabled={!can('actualizar_perfil')}>Guardar</button>
                    <button className="px-2 py-1 bg-sky-600 text-white rounded disabled:opacity-50" onClick={() => seleccionarUsuario(u)} disabled={!can('editar_permisos')}>Permisos</button>
                    <button className="px-2 py-1 bg-red-600 text-white rounded disabled:opacity-50" onClick={() => eliminarUsuario(u)} disabled={!can('eliminar_usuario')}>Eliminar</button>
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
              <button className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50" onClick={guardarPermisos} disabled={!can('editar_permisos')}>Guardar permisos</button>
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