import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Loader, Plus, Printer, Search } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';

type Moneda = 'USD' | 'Bs';

interface CategoriaGasto { id: string; nombre: string; clasificacion: 'Fijo' | 'Variable'; is_active?: boolean; }
interface Proveedor { id: string; nombre: string; rif?: string; telefono?: string; contacto?: string; email?: string; direccion?: string; is_active?: boolean; }
interface Gasto {
  id?: string;
  fecha: string;
  categoria_id: string;
  proveedor_id?: string | null;
  descripcion?: string;
  moneda: Moneda;
  monto_usd?: number | null;
  tasa_usd_bs?: number | null;
  monto_bs?: number | null;
  sede?: string | null;
  comprobante_url?: string | null;
}

interface CuentaPorPagar {
  id?: string;
  gasto_id: string;
  proveedor_id?: string | null;
  fecha_compra: string;
  fecha_vencimiento?: string | null;
  total_bs: number;
  pagado_bs?: number;
  pendiente_bs?: number;
  pagada?: boolean;
  plazo_dias?: number | null;
  observaciones?: string | null;
}

interface PagoCxp {
  id?: string;
  cxp_id: string;
  fecha_pago: string;
  moneda: Moneda;
  monto_usd?: number | null;
  tasa_usd_bs?: number | null;
  monto_bs?: number | null;
  metodo_pago?: string | null;
  referencia?: string | null;
  observaciones?: string | null;
}

interface ServicioRecurrente {
  id?: string;
  nombre: string;
  proveedor_id?: string | null;
  categoria_id?: string | null;
  ciclo: 'Mensual' | 'Trimestral' | 'Anual';
  is_active: boolean;
  monto_usd?: number | null;
  tasa_usd_bs?: number | null;
  monto_bs?: number | null;
  moneda?: Moneda;
  sede?: string | null;
  proximo_pago?: string | null;
}
interface Nomina { id?: string; periodo_inicio: string; periodo_fin: string; sede?: string | null; observaciones?: string | null; monto_total_bs?: number | null; }
interface NominaItem { id?: string; nomina_id: string; empleado_id?: string | null; concepto: string; moneda?: Moneda; monto_usd?: number | null; tasa_usd_bs?: number | null; monto_bs: number; }
interface Empleado { id: string; nombre_completo: string; cedula?: string | null; cargo?: string | null; sede?: string | null; telefono?: string | null; email?: string | null; is_active?: boolean; source?: 'db' | 'profile'; }

type Tab = 'gastos' | 'cxp' | 'pagos' | 'servicios' | 'nominas' | 'nomina_items' | 'proveedores' | 'categorias' | 'empleados';

const ExpensesAdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('gastos');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string| null>(null);

  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empleadosProfiles, setEmpleadosProfiles] = useState<Empleado[]>([]);

  const [gastos, setGastos] = useState<any[]>([]);
  const [cxp, setCxp] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [servicios, setServicios] = useState<ServicioRecurrente[]>([]);
  const [nominas, setNominas] = useState<Nomina[]>([]);
  const [nominaItems, setNominaItems] = useState<any[]>([]);

  const [filters, setFilters] = useState({ search: '', desde: '', hasta: '', mes: '', anio: '' });
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 12 }, (_, i) => String(currentYear - i));
  const [empleadoSearch, setEmpleadoSearch] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentNominaId, setCurrentNominaId] = useState<string>('');

  // Estados de edición por entidad
  const [editGastoId, setEditGastoId] = useState<string | null>(null);
  const [editCxpId, setEditCxpId] = useState<string | null>(null);
  const [editPagoId, setEditPagoId] = useState<string | null>(null);
  const [editServicioId, setEditServicioId] = useState<string | null>(null);
  const [editNominaId, setEditNominaId] = useState<string | null>(null);
  const [editNominaItemId, setEditNominaItemId] = useState<string | null>(null);
  const [editProveedorId, setEditProveedorId] = useState<string | null>(null);
  const [editCategoriaId, setEditCategoriaId] = useState<string | null>(null);
  const [editEmpleadoId, setEditEmpleadoId] = useState<string | null>(null);

  const [showGastoModal, setShowGastoModal] = useState<boolean>(false);
  const [showCxpModal, setShowCxpModal] = useState<boolean>(false);
  const [showPagoModal, setShowPagoModal] = useState<boolean>(false);
  const [showServicioModal, setShowServicioModal] = useState<boolean>(false);
  const [showNominaModal, setShowNominaModal] = useState<boolean>(false);
  const [showNominaItemModal, setShowNominaItemModal] = useState<boolean>(false);
  const [showProveedorModal, setShowProveedorModal] = useState<boolean>(false);
  const [showCategoriaModal, setShowCategoriaModal] = useState<boolean>(false);
  const [showEmpleadoModal, setShowEmpleadoModal] = useState<boolean>(false);

  const [newGasto, setNewGasto] = useState<Gasto>({ fecha: new Date().toISOString().slice(0,10), categoria_id: '', proveedor_id: null, descripcion: '', moneda: 'Bs', monto_usd: null, tasa_usd_bs: null, monto_bs: null, sede: 'Sede Principal Maracay' });
  // Nota: Para CxP el esquema requiere gasto_id; se propondrá ajuste de UI más adelante
  const [newCxp, setNewCxp] = useState<CuentaPorPagar>({ gasto_id: '', proveedor_id: null, fecha_compra: new Date().toISOString().slice(0,10), fecha_vencimiento: null, total_bs: 0, pagado_bs: 0, pendiente_bs: 0, pagada: false, plazo_dias: null, observaciones: '' });
  const [newPago, setNewPago] = useState<PagoCxp>({ cxp_id: '', fecha_pago: new Date().toISOString().slice(0,10), moneda: 'Bs', monto_usd: null, tasa_usd_bs: null, monto_bs: null, referencia: '' });
  const [newServicio, setNewServicio] = useState<ServicioRecurrente>({ nombre: '', proveedor_id: null, categoria_id: null, ciclo: 'Mensual', is_active: true, monto_usd: null, tasa_usd_bs: null, monto_bs: null, moneda: 'Bs', sede: null, proximo_pago: null });
  const [newNomina, setNewNomina] = useState<Nomina>({ periodo_inicio: new Date().toISOString().slice(0,10), periodo_fin: new Date().toISOString().slice(0,10), observaciones: '' });
  const [newNominaItem, setNewNominaItem] = useState<NominaItem>({ nomina_id: '', empleado_id: null, concepto: '', moneda: 'Bs', monto_usd: null, tasa_usd_bs: null, monto_bs: 0 });
  const [newProveedor, setNewProveedor] = useState<{ nombre: string; rif?: string; telefono?: string; contacto?: string; email?: string; direccion?: string; is_active?: boolean }>({ nombre: '', rif: '', telefono: '', contacto: '', email: '', direccion: '', is_active: true });
  const [newCategoria, setNewCategoria] = useState<{ nombre: string; clasificacion: 'Fijo' | 'Variable'; is_active?: boolean }>({ nombre: '', clasificacion: 'Fijo', is_active: true });
  const [newEmpleado, setNewEmpleado] = useState<{ nombre_completo: string; cedula?: string; cargo?: string; sede?: string; telefono?: string; email?: string; is_active?: boolean }>({ nombre_completo: '', cedula: '', cargo: '', sede: '', telefono: '', email: '', is_active: true });

  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const { data: auth } = await supabase.auth.getUser();
        setUserEmail(auth?.user?.email || '');

        const { data: cats } = await supabase.from('categorias_gastos').select('*').order('nombre');
        const { data: provs } = await supabase.from('proveedores').select('*').order('nombre');
        const { data: emps } = await supabase.from('empleados').select('*');
        const { data: profiles } = await supabase.from('user_profiles').select('user_id, nombre, apellido, cedula, email, sede, rol');
        setCategorias(cats || []);
        setProveedores(provs || []);
        const sortedEmpsInit = (emps || []).sort((a: any, b: any) => ((a.nombre_completo || '').localeCompare(b.nombre_completo || '')));
        setEmpleados((sortedEmpsInit as any[]).map((e: any) => ({
          id: e.id,
          nombre_completo: e.nombre_completo,
          cedula: e.cedula ?? null,
          cargo: e.cargo ?? null,
          sede: e.sede ?? null,
          telefono: e.telefono ?? null,
          email: e.email ?? null,
          is_active: !!e.is_active,
          source: 'db'
        })) as Empleado[]);

        const profilesMapped = (profiles || []).map((p: any) => ({
          id: p.user_id,
          nombre_completo: `${p.nombre} ${p.apellido}`.trim(),
          cedula: p.cedula ?? null,
          cargo: p.rol ?? null,
          sede: p.sede ?? null,
          telefono: null,
          email: p.email ?? null,
          is_active: true,
          source: 'profile' as const
        }));
        const sortedProfiles = profilesMapped.sort((a: Empleado, b: Empleado) => (a.nombre_completo || '').localeCompare(b.nombre_completo || ''));
        setEmpleadosProfiles(sortedProfiles);

        await fetchAll();
      } catch (e: any) {
        setError(e?.message || 'Error cargando datos');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const fetchAll = async () => {
    setError(null);
    try {
const { data: g } = await supabase.from('gastos').select('id, fecha, descripcion, moneda, monto_bs, monto_usd, tasa_usd_bs, sede, categoria_id, proveedor_id, categorias_gastos(nombre, clasificacion), proveedores(nombre)')
        .order('fecha', { ascending: false }).limit(500);
      setGastos(g || []);

      const { data: c } = await supabase.from('cuentas_por_pagar').select('id, proveedor_id, proveedores(nombre), fecha_compra, total_bs, pendiente_bs, fecha_vencimiento, observaciones')
        .order('fecha_compra', { ascending: false }).limit(500);
      setCxp(c || []);

      const { data: p } = await supabase.from('pagos_cxp').select('id, cxp_id, cuentas_por_pagar(observaciones), fecha_pago, moneda, monto_bs, tasa_usd_bs, referencia')
        .order('fecha_pago', { ascending: false }).limit(500);
      setPagos(p || []);

const { data: s } = await supabase.from('servicios_recurrentes').select('id, nombre, ciclo, is_active, monto_bs, monto_usd, proveedor_id, categoria_id, proveedores(nombre)')
        .order('nombre');
      setServicios(s || []);

      const { data: n } = await supabase.from('nominas').select('id, periodo_inicio, periodo_fin, observaciones, monto_total_bs')
        .order('periodo_inicio', { ascending: false }).limit(200);
      setNominas(n || []);

      // Por defecto: items de la primera nómina si existe
      if ((n || []).length > 0) {
        const firstId = (n || [])[0].id as string;
        await fetchNominaItems(firstId);
      } else {
        setNominaItems([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Error al consultar datos');
    }
  };

  const refreshCategorias = async () => {
    const { data: cats } = await supabase.from('categorias_gastos').select('*').order('nombre');
    setCategorias(cats || []);
  };

  const refreshProveedores = async () => {
    const { data: provs } = await supabase.from('proveedores').select('*').order('nombre');
    setProveedores(provs || []);
  };

  const refreshEmpleados = async () => {
    const { data: emps } = await supabase.from('empleados').select('*');
    const sortedEmps = (emps || []).sort((a: any, b: any) => ((a.nombre_completo || '').localeCompare(b.nombre_completo || '')));
    setEmpleados((sortedEmps as any[]).map((e: any) => ({
      id: e.id,
      nombre_completo: e.nombre_completo,
      cedula: e.cedula ?? null,
      cargo: e.cargo ?? null,
      sede: e.sede ?? null,
      telefono: e.telefono ?? null,
      email: e.email ?? null,
      is_active: !!e.is_active,
      source: 'db'
    })) as Empleado[]);

    const { data: profiles } = await supabase.from('user_profiles').select('user_id, nombre, apellido, cedula, email, sede, rol');
    const profilesMapped = (profiles || []).map((p: any) => ({
      id: p.user_id,
      nombre_completo: `${p.nombre} ${p.apellido}`.trim(),
      cedula: p.cedula ?? null,
      cargo: p.rol ?? null,
      sede: p.sede ?? null,
      telefono: null,
      email: p.email ?? null,
      is_active: true,
      source: 'profile' as const
    }));
    const sortedProfiles = profilesMapped.sort((a: Empleado, b: Empleado) => (a.nombre_completo || '').localeCompare(b.nombre_completo || ''));
    setEmpleadosProfiles(sortedProfiles);
  };

  const fetchNominaItems = async (nominaId: string) => {
    setCurrentNominaId(nominaId);
    const { data: ni } = await supabase
      .from('nomina_items')
      .select('id, nomina_id, empleado_id, empleados(nombre_completo), concepto, monto_bs, nominas(periodo_inicio, periodo_fin)')
      .eq('nomina_id', nominaId)
      .order('id');
    setNominaItems(ni || []);
  };

  // Helpers selección y borrado
  const tableByTab: Record<Tab, string> = {
    gastos: 'gastos',
    cxp: 'cuentas_por_pagar',
    pagos: 'pagos_cxp',
    servicios: 'servicios_recurrentes',
    nominas: 'nominas',
    nomina_items: 'nomina_items',
    proveedores: 'proveedores',
    categorias: 'categorias_gastos',
    empleados: 'empleados',
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const clearSelection = () => setSelectedIds([]);

  const deleteSelected = async () => {
    try {
      if (selectedIds.length === 0) return;
      const table = tableByTab[activeTab];
      setIsLoading(true);
      const { error } = await supabase.from(table).delete().in('id', selectedIds);
      if (error) throw error;
      clearSelection();
      if (activeTab === 'nomina_items' && currentNominaId) {
        await fetchNominaItems(currentNominaId);
      } else {
        await fetchAll();
      }
    } catch (e: any) {
      setError(e?.message || 'Error eliminando registros seleccionados');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteOne = async (tab: Tab, id: string) => {
    try {
      const table = tableByTab[tab];
      setIsLoading(true);
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      if (tab === 'nomina_items' && currentNominaId) {
        await fetchNominaItems(currentNominaId);
      } else {
        await fetchAll();
      }
    } catch (e: any) {
      setError(e?.message || 'Error eliminando registro');
    } finally {
      setIsLoading(false);
    }
  };

  const matchesMesAnio = (dateStr?: string) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear().toString();
    if (filters.mes && filters.anio) {
      return month === filters.mes && year === filters.anio;
    }
    if (filters.anio && !filters.mes) {
      return year === filters.anio;
    }
    // Si solo mes sin año, no filtra por mes (evita ambigüedad)
    return true;
  };

  const filteredGastos = useMemo(() => {
    const s = filters.search.trim().toLowerCase();
  return gastos.filter((row: any) => (s === '' || (row.descripcion || '').toLowerCase().includes(s) || (row.categorias_gastos?.nombre || '').toLowerCase().includes(s))
      && (!filters.desde || row.fecha >= filters.desde)
      && (!filters.hasta || row.fecha <= filters.hasta)
      && matchesMesAnio(row.fecha));
  }, [gastos, filters]);

  const filteredCxp = useMemo(() => {
    const s = filters.search.trim().toLowerCase();
    return cxp.filter((row: any) => (s === '' || (row.observaciones || '').toLowerCase().includes(s) || (row.proveedores?.nombre || '').toLowerCase().includes(s))
      && (!filters.desde || row.fecha_compra >= filters.desde)
      && (!filters.hasta || row.fecha_compra <= filters.hasta)
      && matchesMesAnio(row.fecha_compra));
  }, [cxp, filters]);

  const filteredPagos = useMemo(() => {
    const s = filters.search.trim().toLowerCase();
    return pagos.filter((row: any) => (s === '' || (row.cuentas_por_pagar?.observaciones || '').toLowerCase().includes(s) || (row.referencia || '').toLowerCase().includes(s))
      && (!filters.desde || row.fecha_pago >= filters.desde)
      && (!filters.hasta || row.fecha_pago <= filters.hasta)
      && matchesMesAnio(row.fecha_pago));
  }, [pagos, filters]);

  const filteredServicios = useMemo(() => {
    const s = filters.search.trim().toLowerCase();
    return servicios.filter((row: any) => (s === '' || (row.nombre || '').toLowerCase().includes(s) || (row.proveedores?.nombre || '').toLowerCase().includes(s))
      && (!filters.desde || (row.proximo_pago ? row.proximo_pago >= filters.desde : true))
      && (!filters.hasta || (row.proximo_pago ? row.proximo_pago <= filters.hasta : true))
      && (row.proximo_pago ? matchesMesAnio(row.proximo_pago) : true));
  }, [servicios, filters]);

  const filteredNominas = useMemo(() => {
    const s = filters.search.trim().toLowerCase();
    return nominas.filter((row: any) => (s === '' || (row.observaciones || '').toLowerCase().includes(s))
      && (!filters.desde || row.periodo_fin >= filters.desde)
      && (!filters.hasta || row.periodo_inicio <= filters.hasta)
      && (filters.anio ? new Date(row.periodo_fin).getFullYear().toString() === filters.anio || new Date(row.periodo_inicio).getFullYear().toString() === filters.anio : true)
      && (filters.mes && filters.anio ? ((new Date(row.periodo_inicio).getMonth() + 1).toString().padStart(2, '0') === filters.mes || (new Date(row.periodo_fin).getMonth() + 1).toString().padStart(2, '0') === filters.mes) : true));
  }, [nominas, filters]);

  const handlePrint = () => {
    window.print();
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Guardar Gasto
  const saveGasto = async () => {
    try {
      setIsLoading(true);
      if (!newGasto.categoria_id || newGasto.categoria_id.trim() === '') {
        setError('Debe seleccionar una categoría de gasto');
        return;
      }
      const payload: any = { ...newGasto };
      // Alinear cálculo: monto_bs siempre requerido según DB
      if (payload.moneda === 'USD') {
        if (payload.monto_usd && payload.tasa_usd_bs) {
          payload.monto_bs = Number((payload.monto_usd * payload.tasa_usd_bs).toFixed(2));
        } else {
          setError('Para moneda USD debe indicar monto y tasa');
          return;
        }
      } else {
        payload.monto_usd = null;
        payload.tasa_usd_bs = null;
        if (payload.monto_bs == null) {
          setError('Debe indicar Monto Bs');
          return;
        }
      }
      let error;
      if (editGastoId) {
        const res = await supabase.from('gastos').update(payload).eq('id', editGastoId);
        error = res.error;
      } else {
        const res = await supabase.from('gastos').insert(payload);
        error = res.error;
      }
      if (error) throw error;
      setShowGastoModal(false);
      setEditGastoId(null);
      await fetchAll();
    } catch (e: any) {
      setError(e?.message || 'Error guardando gasto');
    } finally {
      setIsLoading(false);
    }
  };

  const saveCxp = async () => {
    try {
      setIsLoading(true);
      const payload: any = { ...newCxp };
      // Normalizar y calcular pendientes según esquema real
      payload.pagado_bs = Number(payload.pagado_bs || 0);
      payload.total_bs = Number(payload.total_bs || 0);
      payload.pendiente_bs = Number((payload.total_bs - payload.pagado_bs).toFixed(2));
      payload.pagada = payload.pendiente_bs <= 0;
      // En edición no debemos sobreescribir gasto_id si no se está cambiando
      if (editCxpId) {
        delete payload.gasto_id;
      } else {
        if (!payload.gasto_id || payload.gasto_id.trim() === '') {
          setError('Debe seleccionar el Gasto asociado de la Cuenta por Pagar');
          setIsLoading(false);
          return;
        }
      }
      let error;
      if (editCxpId) {
        const res = await supabase.from('cuentas_por_pagar').update(payload).eq('id', editCxpId);
        error = res.error;
      } else {
        const res = await supabase.from('cuentas_por_pagar').insert(payload);
        error = res.error;
      }
      if (error) throw error;
      setShowCxpModal(false);
      setEditCxpId(null);
      await fetchAll();
    } catch (e: any) {
      setError(e?.message || 'Error guardando Cuenta por Pagar');
    } finally {
      setIsLoading(false);
    }
  };

  const saveProveedor = async () => {
    try {
      setIsLoading(true);
      const payload: any = { ...newProveedor };
      if (!payload.nombre || payload.nombre.trim() === '') {
        setError('El nombre del proveedor es requerido');
        return;
      }
      // Normalizar opcionales a null
      payload.rif = payload.rif?.trim() || null;
      payload.telefono = payload.telefono?.trim() || null;
      payload.contacto = payload.contacto?.trim() || null;
      payload.email = payload.email?.trim() || null;
      payload.direccion = payload.direccion?.trim() || null;
      let error;
      if (editProveedorId) {
        const res = await supabase.from('proveedores').update(payload).eq('id', editProveedorId);
        error = res.error;
      } else {
        const res = await supabase.from('proveedores').insert(payload);
        error = res.error;
      }
      if (error) throw error;
      setShowProveedorModal(false);
      setEditProveedorId(null);
      setNewProveedor({ nombre: '', rif: '', telefono: '', contacto: '', email: '', direccion: '', is_active: true });
      await refreshProveedores();
    } catch (e: any) {
      setError(e?.message || 'Error guardando proveedor');
    } finally {
      setIsLoading(false);
    }
  };

  const saveCategoria = async () => {
    try {
      setIsLoading(true);
      const payload: any = { ...newCategoria };
      if (!payload.nombre || payload.nombre.trim() === '') {
        setError('El nombre de la categoría es requerido');
        return;
      }
      let error;
      if (editCategoriaId) {
        const res = await supabase.from('categorias_gastos').update(payload).eq('id', editCategoriaId);
        error = res.error;
      } else {
        const res = await supabase.from('categorias_gastos').insert(payload);
        error = res.error;
      }
      if (error) throw error;
      setShowCategoriaModal(false);
      setEditCategoriaId(null);
      setNewCategoria({ nombre: '', clasificacion: 'Fijo', is_active: true });
      await refreshCategorias();
    } catch (e: any) {
      setError(e?.message || 'Error guardando categoría');
    } finally {
      setIsLoading(false);
    }
  };

  const saveEmpleado = async () => {
    try {
      setIsLoading(true);
      const payload: any = { ...newEmpleado };
      if (!payload.nombre_completo || payload.nombre_completo.trim() === '') {
        setError('El nombre del empleado es requerido');
        return;
      }
      payload.cedula = payload.cedula?.trim() || null;
      payload.cargo = payload.cargo?.trim() || null;
      payload.sede = payload.sede?.trim() || null;
      payload.telefono = payload.telefono?.trim() || null;
      payload.email = payload.email?.trim() || null;
      let error;
      if (editEmpleadoId) {
        const res = await supabase.from('empleados').update(payload).eq('id', editEmpleadoId);
        error = res.error;
      } else {
        const res = await supabase.from('empleados').insert(payload);
        error = res.error;
      }
      if (error) throw error;
      setShowEmpleadoModal(false);
      setEditEmpleadoId(null);
      setNewEmpleado({ nombre_completo: '', cedula: '', cargo: '', sede: '', telefono: '', email: '', is_active: true });
      await refreshEmpleados();
    } catch (e: any) {
      setError(e?.message || 'Error guardando empleado');
    } finally {
      setIsLoading(false);
    }
  };

  const savePago = async () => {
    try {
      setIsLoading(true);
      const payload: any = { ...newPago };
      if (payload.moneda === 'USD') {
        if (payload.monto_usd && payload.tasa_usd_bs) {
          payload.monto_bs = Number((payload.monto_usd * payload.tasa_usd_bs).toFixed(2));
        } else {
          setError('Para moneda USD debe indicar monto y tasa');
          return;
        }
      } else {
        payload.monto_usd = null;
        payload.tasa_usd_bs = null;
        if (payload.monto_bs == null) {
          setError('Debe indicar Monto Bs');
          return;
        }
      }
      let error;
      if (editPagoId) {
        const res = await supabase.from('pagos_cxp').update(payload).eq('id', editPagoId);
        error = res.error;
      } else {
        const res = await supabase.from('pagos_cxp').insert(payload);
        error = res.error;
      }
      if (error) throw error;
      setShowPagoModal(false);
      setEditPagoId(null);
      await fetchAll();
    } catch (e: any) {
      setError(e?.message || 'Error guardando pago');
    } finally {
      setIsLoading(false);
    }
  };

  const saveServicio = async () => {
    try {
      setIsLoading(true);
      const payload: any = { ...newServicio };
      // Mapear nombres a esquema real
      payload.ciclo = newServicio.ciclo;
      payload.is_active = newServicio.is_active;
      payload.monto_bs = newServicio.monto_bs ?? null;
      payload.monto_usd = newServicio.monto_usd ?? null;
      let error;
      if (editServicioId) {
        const res = await supabase.from('servicios_recurrentes').update(payload).eq('id', editServicioId);
        error = res.error;
      } else {
        const res = await supabase.from('servicios_recurrentes').insert(payload);
        error = res.error;
      }
      if (error) throw error;
      setShowServicioModal(false);
      setEditServicioId(null);
      await fetchAll();
    } catch (e: any) {
      setError(e?.message || 'Error guardando servicio');
    } finally {
      setIsLoading(false);
    }
  };

  const saveNomina = async () => {
    try {
      setIsLoading(true);
      const payload: any = { ...newNomina };
      let error;
      if (editNominaId) {
        const res = await supabase.from('nominas').update(payload).eq('id', editNominaId);
        error = res.error;
      } else {
        const res = await supabase.from('nominas').insert(payload);
        error = res.error;
      }
      if (error) throw error;
      setShowNominaModal(false);
      setEditNominaId(null);
      await fetchAll();
    } catch (e: any) {
      setError(e?.message || 'Error guardando nómina');
    } finally {
      setIsLoading(false);
    }
  };

  const saveNominaItem = async () => {
    try {
      setIsLoading(true);
      const payload: any = { ...newNominaItem };
      let error;
      if (editNominaItemId) {
        const res = await supabase.from('nomina_items').update(payload).eq('id', editNominaItemId);
        error = res.error;
      } else {
        const res = await supabase.from('nomina_items').insert(payload);
        error = res.error;
      }
      if (error) throw error;
      setShowNominaItemModal(false);
      setEditNominaItemId(null);
      await fetchNominaItems(newNominaItem.nomina_id);
    } catch (e: any) {
      setError(e?.message || 'Error guardando ítem de nómina');
    } finally {
      setIsLoading(false);
    }
  };

  if (userEmail && userEmail.toLowerCase() !== 'anamariaprieto@labvidamed.com') {
    return (
      <div className="bg-white rounded-lg p-6 border">
        <h2 className="text-xl font-semibold mb-2">Acceso restringido</h2>
        <p className="text-gray-700">Este módulo está disponible únicamente para la usuaria principal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Control de Gastos</h1>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="px-2 py-1 text-xs bg-primary text-white rounded-md hover:bg-primary-dark flex items-center gap-2"><Printer size={14}/> Imprimir</button>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowGastoModal(true)} className="px-2 py-1 text-xs bg-secondary text-white rounded-md hover:bg-secondary-dark flex items-center gap-2"><Plus size={14}/> Nuevo Gasto</button>
        <button onClick={() => setShowCxpModal(true)} className="px-2 py-1 text-xs bg-secondary text-white rounded-md hover:bg-secondary-dark flex items-center gap-2"><Plus size={14}/> Nueva Cuenta por Pagar</button>
        <button onClick={() => setShowPagoModal(true)} className="px-2 py-1 text-xs bg-secondary text-white rounded-md hover:bg-secondary-dark flex items-center gap-2"><Plus size={14}/> Nuevo Abono Cuentas por Pagar</button>
        <button onClick={() => setShowServicioModal(true)} className="px-2 py-1 text-xs bg-secondary text-white rounded-md hover:bg-secondary-dark flex items-center gap-2"><Plus size={14}/> Nuevo Servicio</button>
        <button onClick={() => setShowNominaModal(true)} className="px-2 py-1 text-xs bg-secondary text-white rounded-md hover:bg-secondary-dark flex items-center gap-2"><Plus size={14}/> Nueva Nómina</button>
        <button onClick={() => setShowNominaItemModal(true)} className="px-2 py-1 text-xs bg-secondary text-white rounded-md hover:bg-secondary-dark flex items-center gap-2"><Plus size={14}/> Agregar Empleado Nomina</button>
        <button onClick={() => setShowProveedorModal(true)} className="px-2 py-1 text-xs bg-secondary text-white rounded-md hover:bg-secondary-dark flex items-center gap-2"><Plus size={14}/> Nuevo Proveedor</button>
        <button onClick={() => setShowCategoriaModal(true)} className="px-2 py-1 text-xs bg-secondary text-white rounded-md hover:bg-secondary-dark flex items-center gap-2"><Plus size={14}/> Nueva Categoría</button>
        <button onClick={() => setShowEmpleadoModal(true)} className="px-2 py-1 text-xs bg-secondary text-white rounded-md hover:bg-secondary-dark flex items-center gap-2"><Plus size={14}/> Agregar Empleado</button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-md border p-3 text-xs flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <Search size={14} className="text-gray-600"/>
          <input name="search" value={filters.search} onChange={handleFilterChange} placeholder="Buscar descripción/categoría/proveedor" className="px-2 py-1 border rounded-md w-56" />
        </div>
        <div>
          <label className="block text-[11px] text-gray-600">Desde</label>
          <input type="date" name="desde" value={filters.desde} onChange={handleFilterChange} className="px-2 py-1 border rounded-md" />
        </div>
        <div>
          <label className="block text-[11px] text-gray-600">Hasta</label>
          <input type="date" name="hasta" value={filters.hasta} onChange={handleFilterChange} className="px-2 py-1 border rounded-md" />
        </div>
        <div>
          <label className="block text-[11px] text-gray-600">Mes</label>
          <select name="mes" value={filters.mes} onChange={handleFilterChange} className="px-2 py-1 border rounded-md">
            <option value="">Todos</option>
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-gray-600">Año</label>
          <select name="anio" value={filters.anio} onChange={handleFilterChange} className="px-2 py-1 border rounded-md">
            <option value="">Todos</option>
            {yearOptions.map(y => (<option key={y} value={y}>{y}</option>))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <button disabled={selectedIds.length === 0} onClick={deleteSelected} className={`px-2 py-1 text-xs rounded-md border ${selectedIds.length === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}>Eliminar seleccionados</button>
        <button onClick={clearSelection} className="px-2 py-1 text-xs rounded-md border bg-gray-100 hover:bg-gray-200">Limpiar selección</button>
      </div>

      {/* Pestañas tipo Chrome */}
      <div className="flex items-end gap-1 border-b -mb-px">
        {([
          { key: 'gastos', label: 'Gastos' },
          { key: 'cxp', label: 'Cuentas por Pagar' },
          { key: 'pagos', label: 'Abonos Cuentas por Pagar' },
          { key: 'servicios', label: 'Servicios' },
          { key: 'nominas', label: 'Nóminas' },
          { key: 'nomina_items', label: 'Empleado Nomina' },
          { key: 'proveedores', label: 'Proveedores' },
          { key: 'categorias', label: 'Categorías' },
          { key: 'empleados', label: 'Empleados' },
        ] as { key: Tab, label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1 text-xs rounded-t-md border ${activeTab === tab.key ? 'text-white' : 'bg-gray-100 hover:bg-gray-200 border-transparent'}`}
            style={activeTab === tab.key ? { backgroundColor: 'rgb(0, 124, 145)', borderColor: 'rgb(0, 124, 145)' } : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido por tab */}
      <div className="bg-white rounded-t-none rounded-b-lg shadow-sm border overflow-x-auto text-xs">
        {isLoading ? (
          <div className="p-6"><Loader className="animate-spin"/></div>
        ) : error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : (
          <>
            {activeTab === 'gastos' && (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-2 text-left">Sel</th>
                    <th className="py-3 px-6 text-left">Fecha</th>
                    <th className="py-3 px-6 text-left">Categoría</th>
                    <th className="py-3 px-6 text-left">Proveedor</th>
                    <th className="py-3 px-6 text-left">Descripción</th>
                    <th className="py-3 px-6 text-left">Sede</th>
                    <th className="py-3 px-6 text-left">Moneda</th>
                    <th className="py-3 px-6 text-left">Tasa</th>
                    <th className="py-3 px-6 text-right">Monto Bs</th>
                    <th className="py-3 px-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredGastos.map((row:any) => (
                    <tr key={row.id}>
                      <td className="py-3 px-2"><input type="checkbox" checked={selectedIds.includes(row.id!)} onChange={() => toggleSelect(row.id!)} /></td>
                      <td className="py-3 px-6">{formatDate(row.fecha)}</td>
              <td className="py-3 px-6">{row.categorias_gastos?.nombre}</td>
                      <td className="py-3 px-6">{row.proveedores?.nombre || '-'}</td>
                      <td className="py-3 px-6">{row.descripcion || '-'}</td>
                      <td className="py-3 px-6">{row.sede || '-'}</td>
                      <td className="py-3 px-6">{row.moneda}</td>
                      <td className="py-3 px-6">{row.tasa_usd_bs || '-'}</td>
                      <td className="py-3 px-6 text-right">{formatCurrency(row.monto_bs)}</td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1">
                          <button className="px-2 py-1 text-xs border rounded-md" onClick={() => { setEditGastoId(row.id!); setNewGasto({ fecha: row.fecha, categoria_id: row.categoria_id, proveedor_id: row.proveedor_id ?? null, descripcion: row.descripcion, moneda: row.moneda, monto_usd: row.monto_usd ?? null, tasa_usd_bs: row.tasa_usd_bs ?? null, monto_bs: row.monto_bs ?? null, sede: row.sede || 'Sede Principal Maracay' }); setShowGastoModal(true); }}>Editar</button>
                          <button className="px-2 py-1 text-xs border rounded-md text-red-600" onClick={() => deleteOne('gastos', row.id!)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td></td>
                    <td className="py-3 px-6 font-semibold" colSpan={7}>Total Bs</td>
                    <td className="py-3 px-6 text-right font-semibold">{formatCurrency(filteredGastos.reduce((acc:number, r:any) => acc + (r.monto_bs || 0), 0))}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            )}

            {activeTab === 'cxp' && (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-2 text-left">Sel</th>
                    <th className="py-3 px-6 text-left">Fecha Compra</th>
                    <th className="py-3 px-6 text-left">Proveedor</th>
                    <th className="py-3 px-6 text-left">Observaciones</th>
                    <th className="py-3 px-6 text-right">Total Bs</th>
                    <th className="py-3 px-6 text-right">Pendiente Bs</th>
                    <th className="py-3 px-6 text-left">Vencimiento</th>
                    <th className="py-3 px-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCxp.map((row:any) => (
                    <tr key={row.id}>
                      <td className="py-3 px-2"><input type="checkbox" checked={selectedIds.includes(row.id!)} onChange={() => toggleSelect(row.id!)} /></td>
                      <td className="py-3 px-6">{formatDate(row.fecha_compra)}</td>
                      <td className="py-3 px-6">{row.proveedores?.nombre}</td>
                      <td className="py-3 px-6">{row.observaciones || '-'}</td>
                      <td className="py-3 px-6 text-right">{formatCurrency(row.total_bs)}</td>
                      <td className="py-3 px-6 text-right">{formatCurrency(row.pendiente_bs)}</td>
                      <td className="py-3 px-6">{formatDate(row.fecha_vencimiento)}</td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1">
                          <button className="px-2 py-1 text-xs border rounded-md" onClick={() => { setEditCxpId(row.id!); setShowCxpModal(true); setNewCxp(prev => ({ ...prev, proveedor_id: row.proveedor_id ?? null, observaciones: row.observaciones || '', fecha_compra: row.fecha_compra, fecha_vencimiento: row.fecha_vencimiento, total_bs: row.total_bs ?? 0 })); }}>Editar</button>
                          <button className="px-2 py-1 text-xs border rounded-md text-red-600" onClick={() => deleteOne('cxp', row.id!)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td></td>
                    <td className="py-3 px-6 font-semibold" colSpan={3}>Total Bs</td>
                    <td className="py-3 px-6 text-right font-semibold">{formatCurrency(filteredCxp.reduce((acc:number, r:any) => acc + (r.total_bs || 0), 0))}</td>
                    <td className="py-3 px-6 text-right font-semibold">{formatCurrency(filteredCxp.reduce((acc:number, r:any) => acc + (r.pendiente_bs || 0), 0))}</td>
                    <td></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            )}

            {activeTab === 'pagos' && (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-2 text-left">Sel</th>
                    <th className="py-3 px-6 text-left">Fecha</th>
                    <th className="py-3 px-6 text-left">Cuenta por Pagar</th>
                    <th className="py-3 px-6 text-left">Moneda</th>
                    <th className="py-3 px-6 text-right">Monto Bs</th>
                    <th className="py-3 px-6 text-left">Referencia</th>
                    <th className="py-3 px-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPagos.map((row:any) => (
                    <tr key={row.id}>
                      <td className="py-3 px-2"><input type="checkbox" checked={selectedIds.includes(row.id!)} onChange={() => toggleSelect(row.id!)} /></td>
                      <td className="py-3 px-6">{formatDate(row.fecha_pago)}</td>
                      <td className="py-3 px-6">{row.cuentas_por_pagar?.observaciones || '-'}</td>
                      <td className="py-3 px-6">{row.moneda}</td>
                      <td className="py-3 px-6 text-right">{formatCurrency(row.monto_bs)}</td>
                      <td className="py-3 px-6">{row.referencia || '-'}</td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1">
                          <button className="px-2 py-1 text-xs border rounded-md" onClick={() => { setEditPagoId(row.id!); setNewPago({ cxp_id: row.cxp_id, fecha_pago: row.fecha_pago, moneda: row.moneda, monto_bs: row.monto_bs ?? 0, tasa_usd_bs: row.tasa_usd_bs ?? null, monto_usd: row.monto_usd ?? null, referencia: row.referencia || '', observaciones: row.observaciones || '', metodo_pago: row.metodo_pago || '' }); setShowPagoModal(true); }}>Editar</button>
                          <button className="px-2 py-1 text-xs border rounded-md text-red-600" onClick={() => deleteOne('pagos', row.id!)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td></td>
                    <td className="py-3 px-6 font-semibold" colSpan={3}>Total Bs</td>
                    <td className="py-3 px-6 text-right font-semibold">{formatCurrency(filteredPagos.reduce((acc:number, r:any) => acc + (r.monto_bs || 0), 0))}</td>
                    <td></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            )}

            {activeTab === 'servicios' && (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-2 text-left">Sel</th>
                    <th className="py-3 px-6 text-left">Servicio</th>
                    <th className="py-3 px-6 text-left">Proveedor</th>
                    <th className="py-3 px-6 text-left">Periodo</th>
                    <th className="py-3 px-6 text-left">Activo</th>
                    <th className="py-3 px-6 text-right">Costo Bs</th>
                    <th className="py-3 px-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredServicios.map((row:any) => (
                    <tr key={row.id}>
                      <td className="py-3 px-2"><input type="checkbox" checked={selectedIds.includes(row.id!)} onChange={() => toggleSelect(row.id!)} /></td>
                      <td className="py-3 px-6">{row.nombre}</td>
                      <td className="py-3 px-6">{row.proveedores?.nombre || '-'}</td>
                      <td className="py-3 px-6">{row.ciclo}</td>
                      <td className="py-3 px-6">{row.is_active ? 'Sí' : 'No'}</td>
                      <td className="py-3 px-6 text-right">{formatCurrency(row.monto_bs)}</td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1">
                          <button className="px-2 py-1 text-xs border rounded-md" onClick={() => { setEditServicioId(row.id!); setNewServicio({ nombre: row.nombre, proveedor_id: row.proveedor_id ?? null, categoria_id: row.categoria_id ?? null, ciclo: row.ciclo, is_active: !!row.is_active, monto_bs: row.monto_bs ?? 0, monto_usd: row.monto_usd ?? null, tasa_usd_bs: row.tasa_usd_bs ?? null, moneda: row.moneda || 'Bs', sede: row.sede || null, proximo_pago: row.proximo_pago || null }); setShowServicioModal(true); }}>Editar</button>
                          <button className="px-2 py-1 text-xs border rounded-md text-red-600" onClick={() => deleteOne('servicios', row.id!)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td></td>
                    <td className="py-3 px-6 font-semibold" colSpan={4}>Total Bs</td>
                    <td className="py-3 px-6 text-right font-semibold">{formatCurrency(filteredServicios.reduce((acc:number, r:any) => acc + (r.monto_bs || 0), 0))}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            )}

            {activeTab === 'nominas' && (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-2 text-left">Sel</th>
                    <th className="py-3 px-6 text-left">Periodo</th>
                    <th className="py-3 px-6 text-left">Observaciones</th>
                    <th className="py-3 px-6 text-right">Total Bs</th>
                    <th className="py-3 px-6 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredNominas.map((row:any) => (
                    <tr key={row.id}>
                      <td className="py-3 px-2"><input type="checkbox" checked={selectedIds.includes(row.id!)} onChange={() => toggleSelect(row.id!)} /></td>
                      <td className="py-3 px-6">{formatDate(row.periodo_inicio)} - {formatDate(row.periodo_fin)}</td>
                      <td className="py-3 px-6">{row.observaciones || '-'}</td>
                      <td className="py-3 px-6 text-right">{formatCurrency(row.monto_total_bs)}</td>
                      <td className="py-3 px-6">
                        <div className="flex gap-1">
                          <button className="px-3 py-1 text-sm border rounded-md" onClick={() => fetchNominaItems(row.id!)}>Ver Ítems</button>
                          <button className="px-2 py-1 text-xs border rounded-md" onClick={() => { setEditNominaId(row.id!); setNewNomina({ periodo_inicio: row.periodo_inicio, periodo_fin: row.periodo_fin, observaciones: row.observaciones || '', monto_total_bs: row.monto_total_bs ?? 0 }); setShowNominaModal(true); }}>Editar</button>
                          <button className="px-2 py-1 text-xs border rounded-md text-red-600" onClick={() => deleteOne('nominas', row.id!)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td></td>
                    <td className="py-3 px-6 font-semibold" colSpan={2}>Total Bs</td>
                    <td className="py-3 px-6 text-right font-semibold">{formatCurrency(filteredNominas.reduce((acc:number, r:any) => acc + (r.monto_total_bs || 0), 0))}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            )}

            {activeTab === 'nomina_items' && (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-2 text-left">Sel</th>
                    <th className="py-3 px-6 text-left">Empleado</th>
                    <th className="py-3 px-6 text-left">Concepto</th>
                    <th className="py-3 px-6 text-right">Monto Bs</th>
                    <th className="py-3 px-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {nominaItems.map((row:any) => (
                    <tr key={row.id}>
                      <td className="py-3 px-2"><input type="checkbox" checked={selectedIds.includes(row.id!)} onChange={() => toggleSelect(row.id!)} /></td>
                      <td className="py-3 px-6">{row.empleados?.nombre_completo || '-'}</td>
                      <td className="py-3 px-6">{row.concepto}</td>
                      <td className="py-3 px-6 text-right">{formatCurrency(row.monto_bs)}</td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1">
                          <button className="px-2 py-1 text-xs border rounded-md" onClick={() => { setEditNominaItemId(row.id!); setNewNominaItem({ nomina_id: row.nomina_id, empleado_id: row.empleado_id, concepto: row.concepto, monto_bs: row.monto_bs ?? 0 }); setShowNominaItemModal(true); }}>Editar</button>
                          <button className="px-2 py-1 text-xs border rounded-md text-red-600" onClick={() => deleteOne('nomina_items', row.id!)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td></td>
                    <td className="py-3 px-6 font-semibold">Total Bs</td>
                    <td></td>
                    <td className="py-3 px-6 text-right font-semibold">{formatCurrency(nominaItems.reduce((acc:number, r:any) => acc + (r.monto_bs || 0), 0))}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            )}

            {activeTab === 'proveedores' && (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-2 text-left">Sel</th>
                    <th className="py-3 px-6 text-left">Nombre</th>
                    <th className="py-3 px-6 text-left">RIF</th>
                    <th className="py-3 px-6 text-left">Contacto</th>
                    <th className="py-3 px-6 text-left">Teléfono</th>
                    <th className="py-3 px-6 text-left">Email</th>
                    <th className="py-3 px-6 text-left">Dirección</th>
                    <th className="py-3 px-6 text-left">Activo</th>
                    <th className="py-3 px-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {proveedores.map((p:any) => (
                    <tr key={p.id}>
                      <td className="py-3 px-2"><input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                      <td className="py-3 px-6">{p.nombre}</td>
                      <td className="py-3 px-6">{p.rif || '-'}</td>
                      <td className="py-3 px-6">{p.contacto || '-'}</td>
                      <td className="py-3 px-6">{p.telefono || '-'}</td>
                      <td className="py-3 px-6">{p.email || '-'}</td>
                      <td className="py-3 px-6">{p.direccion || '-'}</td>
                      <td className="py-3 px-6">{p.is_active ? 'Sí' : 'No'}</td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1">
                          <button className="px-2 py-1 text-xs border rounded-md" onClick={() => { setEditProveedorId(p.id); setNewProveedor({ nombre: p.nombre, rif: p.rif || '', contacto: p.contacto || '', telefono: p.telefono || '', email: p.email || '', direccion: p.direccion || '', is_active: !!p.is_active }); setShowProveedorModal(true); }}>Editar</button>
                          <button className="px-2 py-1 text-xs border rounded-md text-red-600" onClick={() => deleteOne('proveedores', p.id)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'categorias' && (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-2 text-left">Sel</th>
                    <th className="py-3 px-6 text-left">Nombre</th>
                    <th className="py-3 px-6 text-left">Clasificación</th>
                    <th className="py-3 px-6 text-left">Activa</th>
                    <th className="py-3 px-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {categorias.map((c:any) => (
                    <tr key={c.id}>
                      <td className="py-3 px-2"><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                      <td className="py-3 px-6">{c.nombre}</td>
                      <td className="py-3 px-6">{c.clasificacion}</td>
                      <td className="py-3 px-6">{c.is_active ? 'Sí' : 'No'}</td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1">
                          <button className="px-2 py-1 text-xs border rounded-md" onClick={() => { setEditCategoriaId(c.id); setNewCategoria({ nombre: c.nombre, clasificacion: c.clasificacion, is_active: !!c.is_active }); setShowCategoriaModal(true); }}>Editar</button>
                          <button className="px-2 py-1 text-xs border rounded-md text-red-600" onClick={() => deleteOne('categorias', c.id)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'empleados' && (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-2 text-left">Sel</th>
                    <th className="py-3 px-6 text-left">Nombre</th>
                    <th className="py-3 px-6 text-left">Cédula</th>
                    <th className="py-3 px-6 text-left">Cargo</th>
                    <th className="py-3 px-6 text-left">Sede</th>
                    <th className="py-3 px-6 text-left">Teléfono</th>
                    <th className="py-3 px-6 text-left">Email</th>
                    <th className="py-3 px-6 text-left">Activo</th>
                    <th className="py-3 px-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {((empleadosProfiles.length > 0 ? empleadosProfiles : empleados) as Empleado[]).map((e:Empleado) => (
                    <tr key={e.id}>
                      <td className="py-3 px-2"><input type="checkbox" checked={selectedIds.includes(e.id)} onChange={() => toggleSelect(e.id)} /></td>
                      <td className="py-3 px-6">{e.nombre_completo}</td>
                      <td className="py-3 px-6">{e.cedula || '-'}</td>
                      <td className="py-3 px-6">{e.cargo || '-'}</td>
                      <td className="py-3 px-6">{e.sede || '-'}</td>
                      <td className="py-3 px-6">{e.telefono || '-'}</td>
                      <td className="py-3 px-6">{e.email || '-'}</td>
                      <td className="py-3 px-6">{e.is_active ? 'Sí' : 'No'}</td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1">
                          {e.source === 'db' ? (
                            <>
                              <button className="px-2 py-1 text-xs border rounded-md" onClick={() => { setEditEmpleadoId(e.id); setShowEmpleadoModal(true); setNewEmpleado({ nombre_completo: e.nombre_completo, cedula: e.cedula || '', cargo: e.cargo || '', sede: e.sede || '', telefono: e.telefono || '', email: e.email || '', is_active: !!e.is_active }); }}>Editar</button>
                              <button className="px-2 py-1 text-xs border rounded-md text-red-600" onClick={() => deleteOne('empleados', e.id)}>Eliminar</button>
                            </>
                          ) : (
                            <span className="text-gray-500">Gestionar desde Usuarios</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* Modales */}
      <Modal isOpen={showGastoModal} onClose={() => setShowGastoModal(false)} title="Registrar Gasto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700">Fecha</label>
            <input type="date" value={newGasto.fecha} onChange={e => setNewGasto(prev => ({ ...prev, fecha: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Categoría</label>
            <select value={newGasto.categoria_id} onChange={e => setNewGasto(prev => ({ ...prev, categoria_id: e.target.value }))} className="w-full border rounded-md px-3 py-2">
              <option value="">Seleccione…</option>
              {categorias.map(c => (<option key={c.id} value={c.id}>{c.nombre} ({c.clasificacion})</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700">Proveedor</label>
            <select value={newGasto.proveedor_id ?? ''} onChange={e => setNewGasto(prev => ({ ...prev, proveedor_id: e.target.value ? e.target.value : null }))} className="w-full border rounded-md px-3 py-2">
              <option value="">Sin proveedor</option>
              {proveedores.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700">Descripción</label>
            <input type="text" value={newGasto.descripcion || ''} onChange={e => setNewGasto(prev => ({ ...prev, descripcion: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Moneda</label>
            <select value={newGasto.moneda} onChange={e => setNewGasto(prev => ({ ...prev, moneda: e.target.value as Moneda }))} className="w-full border rounded-md px-3 py-2">
              <option value="Bs">Bs</option>
              <option value="USD">USD</option>
            </select>
          </div>
          {newGasto.moneda === 'USD' ? (
            <div>
              <label className="block text-sm text-gray-700">Monto USD</label>
              <input type="number" step="0.01" value={newGasto.monto_usd ?? 0} onChange={e => setNewGasto(prev => ({ ...prev, monto_usd: Number(e.target.value) }))} className="w-full border rounded-md px-3 py-2" />
            </div>
          ) : (
            <div>
              <label className="block text-sm text-gray-700">Monto Bs</label>
              <input type="number" step="0.01" value={newGasto.monto_bs ?? 0} onChange={e => setNewGasto(prev => ({ ...prev, monto_bs: Number(e.target.value) }))} className="w-full border rounded-md px-3 py-2" />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-700">Tasa USD→Bs</label>
            <input type="number" step="0.01" value={newGasto.tasa_usd_bs ?? 0} onChange={e => setNewGasto(prev => ({ ...prev, tasa_usd_bs: Number(e.target.value) }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Sede</label>
            <input type="text" value={newGasto.sede || ''} onChange={e => setNewGasto(prev => ({ ...prev, sede: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded-md" onClick={() => setShowGastoModal(false)}>Cancelar</button>
          <button className="px-4 py-2 bg-primary text-white rounded-md" onClick={saveGasto}>Guardar</button>
        </div>
      </Modal>

      <Modal isOpen={showCxpModal} onClose={() => setShowCxpModal(false)} title="Registrar Cuenta por Pagar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700">Gasto asociado</label>
            <select value={newCxp.gasto_id} onChange={e => setNewCxp(prev => ({ ...prev, gasto_id: e.target.value }))} className="w-full border rounded-md px-3 py-2">
              <option value="">Sin gasto</option>
              {gastos.map((g:any) => (
                <option key={g.id} value={g.id}>{formatDate(g.fecha)} - {g.proveedores?.nombre || '-'} - {g.descripcion || '-'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700">Proveedor</label>
            <select value={newCxp.proveedor_id ?? ''} onChange={e => setNewCxp(prev => ({ ...prev, proveedor_id: e.target.value ? e.target.value : null }))} className="w-full border rounded-md px-3 py-2">
              <option value="">Sin proveedor</option>
              {proveedores.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700">Observaciones</label>
            <input type="text" value={newCxp.observaciones || ''} onChange={e => setNewCxp(prev => ({ ...prev, observaciones: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Fecha Compra</label>
            <input type="date" value={newCxp.fecha_compra} onChange={e => setNewCxp(prev => ({ ...prev, fecha_compra: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Vencimiento</label>
            <input type="date" value={newCxp.fecha_vencimiento || ''} onChange={e => setNewCxp(prev => ({ ...prev, fecha_vencimiento: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Total Bs</label>
            <input type="number" step="0.01" value={newCxp.total_bs ?? 0} onChange={e => setNewCxp(prev => ({ ...prev, total_bs: Number(e.target.value) }))} className="w-full border rounded-md px-3 py-2" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded-md" onClick={() => setShowCxpModal(false)}>Cancelar</button>
          <button className="px-4 py-2 bg-primary text-white rounded-md" onClick={saveCxp}>Guardar</button>
        </div>
      </Modal>

      <Modal isOpen={showPagoModal} onClose={() => { setShowPagoModal(false); setEditPagoId(null); }} title="Registrar Abono Cuentas por Pagar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700">CxP</label>
            <select value={newPago.cxp_id} onChange={e => setNewPago(prev => ({ ...prev, cxp_id: e.target.value }))} className="w-full border rounded-md px-3 py-2">
              {cxp.map((c:any) => (<option key={c.id} value={c.id}>{formatDate(c.fecha_compra)} - {c.proveedores?.nombre || '-'} - Bs {formatCurrency(c.total_bs)}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700">Fecha Pago</label>
            <input type="date" value={newPago.fecha_pago} onChange={e => setNewPago(prev => ({ ...prev, fecha_pago: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Moneda</label>
            <select value={newPago.moneda} onChange={e => setNewPago(prev => ({ ...prev, moneda: e.target.value as Moneda }))} className="w-full border rounded-md px-3 py-2">
              <option value="Bs">Bs</option>
              <option value="USD">USD</option>
            </select>
          </div>
          {newPago.moneda === 'USD' ? (
            <div>
              <label className="block text-sm text-gray-700">Monto USD</label>
              <input type="number" step="0.01" value={newPago.monto_usd ?? 0} onChange={e => setNewPago(prev => ({ ...prev, monto_usd: Number(e.target.value) }))} className="w-full border rounded-md px-3 py-2" />
            </div>
          ) : (
            <div>
              <label className="block text-sm text-gray-700">Monto Bs</label>
              <input type="number" step="0.01" value={newPago.monto_bs ?? 0} onChange={e => setNewPago(prev => ({ ...prev, monto_bs: Number(e.target.value) }))} className="w-full border rounded-md px-3 py-2" />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-700">Tasa USD→Bs</label>
            <input type="number" step="0.01" value={newPago.tasa_usd_bs ?? 0} onChange={e => setNewPago(prev => ({ ...prev, tasa_usd_bs: Number(e.target.value) }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700">Referencia</label>
            <input type="text" value={newPago.referencia || ''} onChange={e => setNewPago(prev => ({ ...prev, referencia: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded-md" onClick={() => setShowPagoModal(false)}>Cancelar</button>
          <button className="px-4 py-2 bg-primary text-white rounded-md" onClick={savePago}>Guardar</button>
        </div>
      </Modal>

      <Modal isOpen={showServicioModal} onClose={() => setShowServicioModal(false)} title="Registrar Servicio Recurrente">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700">Nombre</label>
            <input type="text" value={newServicio.nombre} onChange={e => setNewServicio(prev => ({ ...prev, nombre: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Proveedor</label>
            <select value={newServicio.proveedor_id ?? ''} onChange={e => setNewServicio(prev => ({ ...prev, proveedor_id: e.target.value ? e.target.value : null }))} className="w-full border rounded-md px-3 py-2">
              <option value="">Sin proveedor</option>
              {proveedores.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700">Periodo</label>
            <select value={newServicio.ciclo} onChange={e => setNewServicio(prev => ({ ...prev, ciclo: e.target.value as any }))} className="w-full border rounded-md px-3 py-2">
              <option value="Mensual">Mensual</option>
              <option value="Trimestral">Trimestral</option>
              <option value="Anual">Anual</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700">Activo</label>
            <select value={newServicio.is_active ? 'Si' : 'No'} onChange={e => setNewServicio(prev => ({ ...prev, is_active: e.target.value === 'Si' }))} className="w-full border rounded-md px-3 py-2">
              <option>Si</option>
              <option>No</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700">Costo Bs</label>
            <input type="number" step="0.01" value={newServicio.monto_bs ?? 0} onChange={e => setNewServicio(prev => ({ ...prev, monto_bs: Number(e.target.value) }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Costo USD</label>
            <input type="number" step="0.01" value={newServicio.monto_usd ?? 0} onChange={e => setNewServicio(prev => ({ ...prev, monto_usd: Number(e.target.value) }))} className="w-full border rounded-md px-3 py-2" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded-md" onClick={() => setShowServicioModal(false)}>Cancelar</button>
          <button className="px-4 py-2 bg-primary text-white rounded-md" onClick={saveServicio}>Guardar</button>
        </div>
      </Modal>

      <Modal isOpen={showNominaModal} onClose={() => setShowNominaModal(false)} title="Registrar Nómina">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700">Periodo Inicio</label>
            <input type="date" value={newNomina.periodo_inicio} onChange={e => setNewNomina(prev => ({ ...prev, periodo_inicio: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Periodo Fin</label>
            <input type="date" value={newNomina.periodo_fin} onChange={e => setNewNomina(prev => ({ ...prev, periodo_fin: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700">Observaciones</label>
            <input type="text" value={newNomina.observaciones || ''} onChange={e => setNewNomina(prev => ({ ...prev, observaciones: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded-md" onClick={() => setShowNominaModal(false)}>Cancelar</button>
          <button className="px-4 py-2 bg-primary text-white rounded-md" onClick={saveNomina}>Guardar</button>
        </div>
      </Modal>

      <Modal isOpen={showNominaItemModal} onClose={() => { setShowNominaItemModal(false); setEditNominaItemId(null); }} title="Agregar Empleado Nomina">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700">Nómina</label>
            <select value={newNominaItem.nomina_id} onChange={e => setNewNominaItem(prev => ({ ...prev, nomina_id: e.target.value }))} className="w-full border rounded-md px-3 py-2">
              {nominas.map((n:any) => (<option key={n.id} value={n.id}>{formatDate(n.periodo_inicio)} - {formatDate(n.periodo_fin)} - {n.observaciones || 'Sin observaciones'}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700">Empleado</label>
            <div className="space-y-2">
              <input
                type="text"
                value={empleadoSearch}
                onChange={e => setEmpleadoSearch(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                placeholder="Buscar empleado por nombre"
              />
              <select
                value={newNominaItem.empleado_id ?? ''}
                onChange={e => setNewNominaItem(prev => ({ ...prev, empleado_id: e.target.value ? e.target.value : null }))}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="">Seleccione…</option>
                {empleados
                  .filter(e => (empleadoSearch ? (e.nombre_completo || '').toLowerCase().includes(empleadoSearch.toLowerCase()) : true))
                  .map(e => (
                    <option key={e.id} value={e.id}>{e.nombre_completo}</option>
                  ))}
              </select>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700">Concepto</label>
            <input type="text" value={newNominaItem.concepto} onChange={e => setNewNominaItem(prev => ({ ...prev, concepto: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Monto Bs</label>
            <input type="number" step="0.01" value={newNominaItem.monto_bs} onChange={e => setNewNominaItem(prev => ({ ...prev, monto_bs: Number(e.target.value) }))} className="w-full border rounded-md px-3 py-2" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded-md" onClick={() => setShowNominaItemModal(false)}>Cancelar</button>
          <button className="px-4 py-2 bg-primary text-white rounded-md" onClick={saveNominaItem}>Guardar</button>
        </div>
      </Modal>

      <Modal isOpen={showProveedorModal} onClose={() => setShowProveedorModal(false)} title="Registrar Proveedor">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700">Nombre</label>
            <input type="text" value={newProveedor.nombre} onChange={e => setNewProveedor(prev => ({ ...prev, nombre: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">RIF</label>
            <input type="text" value={newProveedor.rif || ''} onChange={e => setNewProveedor(prev => ({ ...prev, rif: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Teléfono</label>
            <input type="text" value={newProveedor.telefono || ''} onChange={e => setNewProveedor(prev => ({ ...prev, telefono: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Contacto</label>
            <input type="text" value={newProveedor.contacto || ''} onChange={e => setNewProveedor(prev => ({ ...prev, contacto: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Email</label>
            <input type="email" value={newProveedor.email || ''} onChange={e => setNewProveedor(prev => ({ ...prev, email: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700">Dirección</label>
            <input type="text" value={newProveedor.direccion || ''} onChange={e => setNewProveedor(prev => ({ ...prev, direccion: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="flex items-center gap-2">
            <input id="proveedor-activo" type="checkbox" checked={!!newProveedor.is_active} onChange={e => setNewProveedor(prev => ({ ...prev, is_active: e.target.checked }))} />
            <label htmlFor="proveedor-activo" className="text-sm text-gray-700">Activo</label>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded-md" onClick={() => setShowProveedorModal(false)}>Cancelar</button>
          <button className="px-4 py-2 bg-primary text-white rounded-md" onClick={saveProveedor}>Guardar</button>
        </div>
      </Modal>

      <Modal isOpen={showCategoriaModal} onClose={() => setShowCategoriaModal(false)} title="Registrar Categoría de Gasto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700">Nombre</label>
            <input type="text" value={newCategoria.nombre} onChange={e => setNewCategoria(prev => ({ ...prev, nombre: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Clasificación</label>
            <select value={newCategoria.clasificacion} onChange={e => setNewCategoria(prev => ({ ...prev, clasificacion: e.target.value as 'Fijo' | 'Variable' }))} className="w-full border rounded-md px-3 py-2">
              <option value="Fijo">Fijo</option>
              <option value="Variable">Variable</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input id="categoria-activa" type="checkbox" checked={!!newCategoria.is_active} onChange={e => setNewCategoria(prev => ({ ...prev, is_active: e.target.checked }))} />
            <label htmlFor="categoria-activa" className="text-sm text-gray-700">Activa</label>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded-md" onClick={() => setShowCategoriaModal(false)}>Cancelar</button>
          <button className="px-4 py-2 bg-primary text-white rounded-md" onClick={saveCategoria}>Guardar</button>
        </div>
      </Modal>

      <Modal isOpen={showEmpleadoModal} onClose={() => setShowEmpleadoModal(false)} title="Agregar Empleado">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700">Nombre completo</label>
            <input type="text" value={newEmpleado.nombre_completo} onChange={e => setNewEmpleado(prev => ({ ...prev, nombre_completo: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Cédula</label>
            <input type="text" value={newEmpleado.cedula || ''} onChange={e => setNewEmpleado(prev => ({ ...prev, cedula: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Cargo</label>
            <input type="text" value={newEmpleado.cargo || ''} onChange={e => setNewEmpleado(prev => ({ ...prev, cargo: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Sede</label>
            <input type="text" value={newEmpleado.sede || ''} onChange={e => setNewEmpleado(prev => ({ ...prev, sede: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Teléfono</label>
            <input type="text" value={newEmpleado.telefono || ''} onChange={e => setNewEmpleado(prev => ({ ...prev, telefono: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Email</label>
            <input type="email" value={newEmpleado.email || ''} onChange={e => setNewEmpleado(prev => ({ ...prev, email: e.target.value }))} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="flex items-center gap-2">
            <input id="empleado-activo" type="checkbox" checked={!!newEmpleado.is_active} onChange={e => setNewEmpleado(prev => ({ ...prev, is_active: e.target.checked }))} />
            <label htmlFor="empleado-activo" className="text-sm text-gray-700">Activo</label>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded-md" onClick={() => setShowEmpleadoModal(false)}>Cancelar</button>
          <button className="px-4 py-2 bg-primary text-white rounded-md" onClick={saveEmpleado}>Guardar</button>
        </div>
      </Modal>
    </div>
  );
};

export default ExpensesAdminPage;