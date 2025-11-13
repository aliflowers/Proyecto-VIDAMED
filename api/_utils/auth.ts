import { createClient } from '@supabase/supabase-js'

type Rol = 'Administrador' | 'Lic.' | 'Asistente'
type AuthResult = { user: any; role: Rol }

function normalizeRole(roleInput: string | Rol | null | undefined): Rol {
  const raw = (roleInput || '').toString().trim().toLowerCase()
  if (raw.startsWith('admin')) return 'Administrador'
  if (raw.startsWith('lic')) return 'Lic.'
  if (raw.startsWith('asis')) return 'Asistente'
  return 'Asistente'
}

function getBearerToken(req: any): string | null {
  const h = req?.headers || {}
  const auth = h.authorization || h.Authorization || ''
  const m = String(auth).match(/^Bearer\s+(.+)$/i)
  return m ? m[1] : null
}

export async function getAuthUser(req: any): Promise<AuthResult | null> {
  const token = getBearerToken(req)
  if (!token) return null
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) return null
  const supabase = createClient(url, anon)
  const { data, error } = await supabase.auth.getUser(token)
  if (error) return null
  const user = data?.user || null
  if (!user) return null
  const role = normalizeRole((user as any).app_metadata?.role || (user as any).user_metadata?.rol || '')
  return { user, role }
}

export async function requireAdmin(req: any, res: any): Promise<AuthResult | null> {
  const auth = await getAuthUser(req)
  if (!auth) {
    res.status(401).json({ error: 'No autenticado' })
    return null
  }
  if (auth.role !== 'Administrador') {
    res.status(403).json({ error: 'No autorizado' })
    return null
  }
  return auth
}

export async function requireSelfOrAdmin(req: any, res: any, targetUserId: string): Promise<AuthResult | null> {
  const auth = await getAuthUser(req)
  if (!auth) {
    res.status(401).json({ error: 'No autenticado' })
    return null
  }
  const self = (auth.user?.id && String(auth.user.id) === String(targetUserId))
  if (auth.role !== 'Administrador' && !self) {
    res.status(403).json({ error: 'No autorizado' })
    return null
  }
  return auth
}
