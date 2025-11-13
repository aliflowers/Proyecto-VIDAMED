import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/services/apiFetch'
import { PERMISSIONS_SCHEMA } from '@/constants/permissionsSchema'
import { getDefaultAllowed, normalizeActionName, normalizeModuleName } from '@/utils/permissions'

type Rol = 'Administrador' | 'Lic.' | 'Asistente'

type UserRow = {
  user_id: string
  nombre: string
  apellido: string
  cedula: string
  email: string
  sede: string
  rol: Rol | string
}

type PermissionItem = { module: string; action: string; allowed: boolean }

type OverrideMap = Record<string, Record<string, boolean>>

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [cedula, setCedula] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sede, setSede] = useState('Sede Principal Maracay')
  const [rol, setRol] = useState<Rol>('Asistente')
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showPerms, setShowPerms] = useState(false)
  const [overrides, setOverrides] = useState<OverrideMap>({})

  const canSubmit = useMemo(() => {
    return nombre && apellido && cedula && email && password && sede && rol
  }, [nombre, apellido, cedula, email, password, sede, rol])

  async function loadUsers() {
    setLoading(true)
    setError(null)
    try {
      const resp = await apiFetch('/api/users', { method: 'GET' })
      if (!resp.ok) throw new Error(`${resp.status}`)
      const json = await resp.json()
      setUsers(Array.isArray(json.users) ? json.users : [])
    } catch (e: any) {
      setError('No se pudieron cargar los usuarios')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function createUser() {
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      const resp = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, apellido, cedula, email, password, sede, rol })
      })
      if (!resp.ok) throw new Error(`${resp.status}`)
      setNombre(''); setApellido(''); setCedula(''); setEmail(''); setPassword(''); setSede('Sede Principal Maracay'); setRol('Asistente')
      await loadUsers()
    } catch (e: any) {
      setError('No se pudo crear el usuario')
    } finally { setLoading(false) }
  }

  async function deleteUser(userId: string) {
    if (!userId) return
    setLoading(true)
    try {
      const resp = await apiFetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (!resp.ok) throw new Error(`${resp.status}`)
      await loadUsers()
    } catch { setError('No se pudo eliminar el usuario') } finally { setLoading(false) }
  }

  async function openEdit(u: UserRow) {
    setSelectedUser(u)
    setShowEdit(true)
  }

  async function saveEdit() {
    if (!selectedUser) return
    setLoading(true)
    try {
      const payload: any = {
        nombre: selectedUser.nombre,
        apellido: selectedUser.apellido,
        cedula: selectedUser.cedula,
        email: selectedUser.email,
        sede: selectedUser.sede,
        rol: selectedUser.rol,
      }
      const resp = await apiFetch(`/api/users/${selectedUser.user_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })
      if (!resp.ok) throw new Error(`${resp.status}`)
      setShowEdit(false)
      await loadUsers()
    } catch { setError('No se pudo actualizar el usuario') } finally { setLoading(false) }
  }

  async function openPermissions(u: UserRow) {
    setSelectedUser(u)
    setOverrides({})
    setShowPerms(true)
    try {
      const resp = await apiFetch(`/api/users/${u.user_id}/permissions`, { method: 'GET' })
      if (!resp.ok) throw new Error(`${resp.status}`)
      const json = await resp.json()
      const list: PermissionItem[] = Array.isArray(json.permissions) ? json.permissions : []
      const map: OverrideMap = {}
      list.forEach(p => {
        const m = normalizeModuleName(p.module)
        const a = normalizeActionName(p.action)
        if (!map[m]) map[m] = {}
        map[m][a] = !!p.allowed
      })
      setOverrides(map)
    } catch { setError('No se pudieron obtener los permisos') }
  }

  function cycleOverride(module: string, action: string, dir: 'allow' | 'deny' | 'unset') {
    setOverrides(prev => {
      const m = normalizeModuleName(module)
      const a = normalizeActionName(action)
      const copy = { ...prev }
      copy[m] = { ...(copy[m] || {}) }
      if (dir === 'unset') {
        delete copy[m][a]
      } else {
        copy[m][a] = dir === 'allow'
      }
      return copy
    })
  }

  async function saveOverrides() {
    if (!selectedUser) return
    const permissions: PermissionItem[] = []
    Object.keys(overrides).forEach(m => {
      Object.keys(overrides[m]).forEach(a => {
        permissions.push({ module: normalizeModuleName(m), action: normalizeActionName(a), allowed: !!overrides[m][a] })
      })
    })
    setLoading(true)
    try {
      const resp = await apiFetch(`/api/users/${selectedUser.user_id}/permissions`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ permissions })
      })
      if (!resp.ok) throw new Error(`${resp.status}`)
      setShowPerms(false)
    } catch { setError('No se pudieron guardar los overrides') } finally { setLoading(false) }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Gestión de Usuarios</h2>
      {error && <div className="text-red-600 mb-3">{error}</div>}

      <div className="bg-light p-4 rounded shadow mb-6">
        <h3 className="text-lg font-medium mb-3">Crear nuevo usuario</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="border rounded p-2" placeholder="Nombre" value={nombre} onChange={e=>setNombre(e.target.value)} />
          <input className="border rounded p-2" placeholder="Apellido" value={apellido} onChange={e=>setApellido(e.target.value)} />
          <input className="border rounded p-2" placeholder="Número de Cédula" value={cedula} onChange={e=>setCedula(e.target.value)} />
          <input className="border rounded p-2" placeholder="Correo electrónico" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="border rounded p-2" type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} />
          <select className="border rounded p-2" value={sede} onChange={e=>setSede(e.target.value)}>
            <option>Sede Principal Maracay</option>
            <option>Sede La Morita</option>
          </select>
          <select className="border rounded p-2" value={rol} onChange={e=>setRol(e.target.value as Rol)}>
            <option value="Asistente">Asistente</option>
            <option value="Lic.">Lic.</option>
            <option value="Administrador">Administrador</option>
          </select>
        </div>
        <div className="mt-3">
          <button disabled={!canSubmit || loading} onClick={createUser} className="px-4 py-2 bg-primary text-white rounded disabled:opacity-60">Crear usuario</button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium">Usuarios</h3>
        <button onClick={loadUsers} className="px-3 py-1 bg-primary text-white rounded">Refrescar</button>
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100 text-left">
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
            {loading && (
              <tr><td className="p-3" colSpan={7}>Cargando...</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td className="p-3" colSpan={7}>Sin usuarios</td></tr>
            )}
            {!loading && users.map(u => (
              <tr key={u.user_id} className="border-t">
                <td className="p-2">{u.nombre}</td>
                <td className="p-2">{u.apellido}</td>
                <td className="p-2">{u.cedula}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.sede}</td>
                <td className="p-2">{u.rol}</td>
                <td className="p-2 space-x-2">
                  <button className="px-2 py-1 text-sm bg-secondary text-white rounded" onClick={()=>openPermissions(u)}>Permisos</button>
                  <button className="px-2 py-1 text-sm bg-primary text-white rounded" onClick={()=>openEdit(u)}>Editar</button>
                  <button className="px-2 py-1 text-sm bg-red-600 text-white rounded" onClick={()=>deleteUser(u.user_id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showEdit && selectedUser && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-full max-w-2xl">
            <h3 className="text-lg font-medium mb-3">Editar usuario</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input className="border rounded p-2" value={selectedUser.nombre} onChange={e=>setSelectedUser({ ...selectedUser, nombre: e.target.value })} />
              <input className="border rounded p-2" value={selectedUser.apellido} onChange={e=>setSelectedUser({ ...selectedUser, apellido: e.target.value })} />
              <input className="border rounded p-2" value={selectedUser.cedula} onChange={e=>setSelectedUser({ ...selectedUser, cedula: e.target.value })} />
              <input className="border rounded p-2" value={selectedUser.email} onChange={e=>setSelectedUser({ ...selectedUser, email: e.target.value })} />
              <input className="border rounded p-2" value={selectedUser.sede} onChange={e=>setSelectedUser({ ...selectedUser, sede: e.target.value })} />
              <select className="border rounded p-2" value={selectedUser.rol as string} onChange={e=>setSelectedUser({ ...selectedUser, rol: e.target.value })}>
                <option value="Asistente">Asistente</option>
                <option value="Lic.">Lic.</option>
                <option value="Administrador">Administrador</option>
              </select>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button className="px-3 py-1" onClick={()=>setShowEdit(false)}>Cancelar</button>
              <button className="px-3 py-1 bg-primary text-white rounded" onClick={saveEdit}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showPerms && selectedUser && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-full max-w-4xl">
            <h3 className="text-lg font-medium mb-3">Permisos: {selectedUser.nombre} {selectedUser.apellido}</h3>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {Object.keys(PERMISSIONS_SCHEMA).map(m => {
                const actions = PERMISSIONS_SCHEMA[m]
                const defaults = getDefaultAllowed(selectedUser.rol)
                return (
                  <div key={m}>
                    <div className="font-semibold mb-2 capitalize">{m.replace(/_/g,' ')}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {actions.map(a => {
                        const effDefault = !!(defaults?.[m]?.[a])
                        const cur = overrides[m]?.[a]
                        return (
                          <div key={a} className="border rounded p-2 flex items-center justify-between">
                            <div>
                              <div className="capitalize">{a.replace(/_/g,' ')}</div>
                              <div className="text-xs text-gray-600">Default rol: {effDefault ? 'Permitido' : 'Denegado'}</div>
                              {cur !== undefined && <div className="text-xs">Override: {cur ? 'Permitido' : 'Denegado'}</div>}
                            </div>
                            <div className="flex gap-2">
                              <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={()=>cycleOverride(m,a,'allow')}>Permitir</button>
                              <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={()=>cycleOverride(m,a,'deny')}>Denegar</button>
                              <button className="px-2 py-1 bg-gray-300 rounded" onClick={()=>cycleOverride(m,a,'unset')}>Quitar</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button className="px-3 py-1" onClick={()=>setShowPerms(false)}>Cerrar</button>
              <button className="px-3 py-1 bg-primary text-white rounded" onClick={saveOverrides}>Guardar overrides</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
