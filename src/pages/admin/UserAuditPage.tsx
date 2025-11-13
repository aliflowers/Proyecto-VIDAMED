import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';

type Timeframe = '12h' | 'day' | 'week' | 'month' | 'year';

type AuditLog = {
  id: number;
  created_at: string;
  user_id?: string | null;
  email?: string | null;
  action: string;
  module: string;
  entity?: string | null;
  entity_id?: string | null;
  metadata?: any | null;
  success?: boolean | null;
  path?: string | null;
  user_agent?: string | null;
};

function computeFrom(timeframe: Timeframe): string {
  const now = new Date();
  const from = new Date(now);
  switch (timeframe) {
    case '12h':
      from.setHours(from.getHours() - 12);
      break;
    case 'day':
      from.setHours(0, 0, 0, 0);
      break;
    case 'week': {
      const day = from.getDay();
      const diff = (day + 6) % 7; // Lunes como inicio de semana
      from.setDate(from.getDate() - diff);
      from.setHours(0, 0, 0, 0);
      break;
    }
    case 'month':
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      break;
    case 'year':
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      break;
  }
  return from.toISOString();
}

const UserAuditPage: React.FC = () => {
  const [authorized, setAuthorized] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>('12h');
  const [tab, setTab] = useState<'general' | 'usuario'>('general');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string>('');
  const [userSearch, setUserSearch] = useState<string>('');
  const [users, setUsers] = useState<{ user_id: string; nombre_completo: string; email: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const email = (auth?.user?.email || '').toLowerCase();
      const isAuditor = ['anamariaprieto@labvidamed.com', 'alijesusflores@gmail.com'].includes(email);
      setAuthorized(isAuditor);
      setCanDelete(email === 'anamariaprieto@labvidamed.com');
      if (isAuditor) await fetchUserList();
    })();
  }, []);

  async function fetchUserList() {
    // Intento principal: leer perfiles de usuarios
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, nombre, apellido, email')
      .order('nombre', { ascending: true });
    if (!error && Array.isArray(data)) {
      const mapped = (data as any[])
        .map((p) => ({
          user_id: String(p.user_id),
          nombre_completo: `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim() || (p.email ?? ''),
          email: String(p.email ?? ''),
        }))
        .filter(u => !!u.email);
      setUsers(mapped);
      return;
    }
    // Fallback: usar emails distintos en logs
    const { data: logsData, error: logsErr } = await supabase
      .from('user_audit_logs')
      .select('email')
      .not('email', 'is', null)
      .order('email', { ascending: true });
    if (!logsErr && Array.isArray(logsData)) {
      const set = new Set<string>();
      (logsData as any[]).forEach(d => { if (d.email) set.add(String(d.email)); });
      const mapped = Array.from(set).map(em => ({ user_id: em, nombre_completo: em, email: em }));
      setUsers(mapped);
    }
  }

  const fromIso = useMemo(() => computeFrom(timeframe), [timeframe]);

  async function fetchLogs() {
    if (!authorized) return;
    setLoading(true);
    setError(null);
    const query = supabase
      .from('user_audit_logs')
      .select('*')
      .gte('created_at', fromIso)
      .order('created_at', { ascending: false });
    const run = tab === 'usuario' && selectedEmail ? query.eq('email', selectedEmail) : query;
    const { data, error } = await run;
    if (error) {
      setError(error.message);
      setLogs([]);
    } else {
      setLogs((data || []) as AuditLog[]);
    }
    setLoading(false);
  }

  useEffect(() => { fetchLogs(); }, [authorized, timeframe, tab, selectedEmail]);

  // Suscripción en tiempo real a nuevos perfiles para actualizar la lista
  useEffect(() => {
    if (!authorized) return;
    const channel = supabase
      .channel('realtime-user-profiles')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_profiles' }, () => {
        fetchUserList();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles' }, () => {
        fetchUserList();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authorized]);

  async function deleteLogs() {
    if (!canDelete) return;
    if (!window.confirm('¿Confirmar borrado de logs según el filtro actual?')) return;
    const query = supabase
      .from('user_audit_logs')
      .delete()
      .gte('created_at', fromIso);
    const run = tab === 'usuario' && selectedEmail ? query.eq('email', selectedEmail) : query;
    const { error } = await run;
    if (error) {
      alert('Error borrando logs: ' + error.message);
    } else {
      await fetchLogs();
    }
  }

  if (!authorized) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Auditoría de Usuarios</h1>
        <p className="mt-3 text-red-600">Acceso restringido. No tienes permisos para ver este módulo.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Auditoría de Usuarios</h1>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex rounded-md overflow-hidden border">
          {(['general', 'usuario'] as const).map(t => (
            <button
              key={t}
              className={`px-4 py-2 ${tab === t ? 'bg-primary text-white' : 'bg-white'}`}
              onClick={() => setTab(t)}
            >
              {t === 'general' ? 'General' : 'Por Usuario'}
            </button>
          ))}
        </div>

        <select
          className="border rounded px-2 py-2"
          value={timeframe}
          onChange={e => setTimeframe(e.target.value as Timeframe)}
        >
          <option value="12h">Últimas 12 horas</option>
          <option value="day">Hoy</option>
          <option value="week">Semana</option>
          <option value="month">Mes</option>
          <option value="year">Año</option>
        </select>

        {tab === 'usuario' && (
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <input
                className="border rounded pl-8 pr-2 py-2 w-full"
                placeholder="Buscar usuario por nombre"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
              <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <select
              className="border rounded px-2 py-2 flex-1"
              value={selectedEmail}
              onChange={e => setSelectedEmail(e.target.value)}
            >
              <option value="">Todos los usuarios</option>
              {users
                .filter(u => u.nombre_completo.toLowerCase().includes(userSearch.toLowerCase()))
                .map(u => (
                  <option key={u.user_id} value={u.email}>
                    {u.nombre_completo} — {u.email}
                  </option>
                ))}
            </select>
          </div>
        )}

        {canDelete && (
          <button
            className="ml-auto bg-red-600 text-white px-4 py-2 rounded"
            onClick={deleteLogs}
          >
            Borrar logs
          </button>
        )}
      </div>

      {error && <div className="p-3 bg-red-100 text-red-700 mb-4">{error}</div>}

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Usuario</th>
              <th className="px-3 py-2 text-left">Acción</th>
              <th className="px-3 py-2 text-left">Módulo</th>
              <th className="px-3 py-2 text-left">Entidad</th>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Éxito</th>
              <th className="px-3 py-2 text-left">Ruta</th>
              <th className="px-3 py-2 text-left">User-Agent</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-4" colSpan={9}>Cargando...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td className="px-3 py-4" colSpan={9}>Sin registros en este rango.</td></tr>
            ) : (
              logs.map(l => (
                <tr key={l.id} className="border-t">
                  <td className="px-3 py-2">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{l.email || '—'}</td>
                  <td className="px-3 py-2">{l.action}</td>
                  <td className="px-3 py-2">{l.module}</td>
                  <td className="px-3 py-2">{l.entity || '—'}</td>
                  <td className="px-3 py-2">{l.entity_id || '—'}</td>
                  <td className="px-3 py-2">{String(l.success ?? true)}</td>
                  <td className="px-3 py-2">{l.path || '—'}</td>
                  <td className="px-3 py-2 truncate max-w-[240px]">{l.user_agent || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserAuditPage;