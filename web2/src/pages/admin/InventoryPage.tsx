
import { useState, useEffect } from 'react';
import { apiFetch } from '@/services/apiFetch';
import { supabase } from '@/services/supabaseClient';
import { logAudit } from '@/services/audit';
import { toast } from 'react-toastify';
import { FaBoxOpen, FaPlus, FaSearch, FaTrash } from 'react-icons/fa';
import InventoryCard from '@/components/admin/InventoryCard';
import InventoryForm from '@/components/admin/InventoryForm';
import ViewToggle from '@/components/admin/ViewToggle';
import InventoryTable from '@/components/admin/InventoryTable';
import AdvancedFilters from '@/components/admin/AdvancedFilters';
import { Modal } from '@/components/common/Modal';
import { Pagination } from '@/components/common/Pagination';
import { EmptyState } from '@/components/common/EmptyState';
import { InventoryItem } from '@/types';
import { hasPermission, normalizeRole } from '@/utils/permissions';

type ViewMode = 'cards' | 'table';

interface Filters {
  nombre?: string;
  descripcion?: string;
  cantidad_stock_min?: number;
  cantidad_stock_max?: number;
  unidad_medida?: string;
  stock_minimo?: number;
  proveedor?: string;
  costo_min?: number;
  costo_max?: number;
}

const InventoryPage = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Estados para vista
  const [currentView, setCurrentView] = useState<ViewMode>(() => {
    return (localStorage.getItem('inventory-view') as ViewMode) || 'cards';
  });

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<Filters>({});

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  // Estados para eliminación múltiple
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<number>>(new Set());
  const [deniedBulkDelete, setDeniedBulkDelete] = useState<boolean>(false);

  // Función para manejar selección múltiple desde el componente hijo
  const handleSelectionChange = (selectedIds: number[]) => {
    // Filtrar IDs válidos y crear un Set limpio
    const validIds = selectedIds.filter(id => typeof id === 'number' && id > 0);
    const newSelection = new Set(validIds);

    // Solo actualizar si realmente cambió
    if (newSelection.size !== selectedForDeletion.size ||
        !Array.from(newSelection).every(id => selectedForDeletion.has(id))) {
      setSelectedForDeletion(newSelection);

      console.log('🔄 Selecciones actualizadas:', {
        previous: Array.from(selectedForDeletion),
        current: validIds,
        buttonShouldShow: currentView === 'table' && newSelection.size > 0
      });
    }
  };

  // Función para construir consulta con filtros
  const buildQuery = () => {
    let query = supabase.from('inventario').select('*', { count: 'exact' });

    // Búsqueda básica por nombre (compatible con existentes)
    if (searchTerm) {
      query = query.ilike('nombre', `%${searchTerm}%`);
    }

    // Filtros avanzados
    if (advancedFilters.nombre) {
      query = query.ilike('nombre', `%${advancedFilters.nombre}%`);
    }
    if (advancedFilters.descripcion) {
      query = query.ilike('descripcion', `%${advancedFilters.descripcion}%`);
    }
    if (advancedFilters.cantidad_stock_min !== undefined) {
      query = query.gte('cantidad_stock', advancedFilters.cantidad_stock_min);
    }
    if (advancedFilters.cantidad_stock_max !== undefined) {
      query = query.lte('cantidad_stock', advancedFilters.cantidad_stock_max);
    }
    if (advancedFilters.unidad_medida) {
      query = query.eq('unidad_medida', advancedFilters.unidad_medida);
    }
    if (advancedFilters.stock_minimo !== undefined) {
      query = query.eq('stock_minimo', advancedFilters.stock_minimo);
    }
    if (advancedFilters.proveedor) {
      query = query.ilike('proveedor', `%${advancedFilters.proveedor}%`);
    }

    return query;
  };

  useEffect(() => {
    fetchInventory();
  }, [searchTerm, currentPage, advancedFilters]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      let query = buildQuery();

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Procesar datos: asignar fechas por defecto si faltan
      const processedData = (data || []).map(item => ({
        ...item,
        // Asegurar fecha por defecto si no existe en fecha_ultima_compra
        fecha_ultima_compra: item.fecha_ultima_compra || item.created_at || new Date().toISOString().split('T')[0]
      }));

      setInventory(processedData);
      setTotalItems(count || 0);
    } catch (error: any) {
      setError(error.message);
      toast.error('Error al cargar el inventario.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
    localStorage.setItem('inventory-view', view);
  };

  const handleOpenModal = (item: InventoryItem | null = null) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
    fetchInventory(); // Recargar datos al cerrar el modal
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleFiltersChange = (newFilters: Filters) => {
    setAdvancedFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setAdvancedFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Permisos (INVENTARIO)
  const [currentUserRole, setCurrentUserRole] = useState<string>('Asistente');
  const [currentUserOverrides, setCurrentUserOverrides] = useState<Record<string, Record<string, boolean>>>({});
  const API_BASE = import.meta.env.VITE_API_BASE || '/api';
  const can = (action: string) => {
    const roleRaw = currentUserRole || 'Asistente';
    const roleNorm = normalizeRole(roleRaw);
    const overridesForModule = currentUserOverrides['INVENTARIO'] || {};
    const bypass = roleNorm === 'Administrador';
    const allowed = bypass ? true : hasPermission({ role: roleNorm, overrides: currentUserOverrides }, 'INVENTARIO', action);
    console.groupCollapsed(`🔐 PermEval [INVENTARIO] action=${action}`);
    console.log('• role_raw:', roleRaw);
    console.log('• role_norm:', roleNorm, 'bypass_admin:', bypass);
    console.log('• override(action):', overridesForModule[action]);
    console.log('• overrides_count(INVENTARIO):', Object.keys(overridesForModule).length);
    console.log('• result:', allowed ? 'permitido' : 'bloqueado');
    console.groupEnd();
    return allowed;
  };

  useEffect(() => {
    const fetchRoleAndOverrides = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const userId = user?.id;
        if (!userId) return;

        // Rol efectivo: perfil > metadatos > Asistente
        const metaRol = (user?.user_metadata as any)?.rol || null;
        let effectiveRole: string = metaRol || 'Asistente';
        const { data: profData, error: profErr } = await supabase
          .from('user_profiles')
          .select('rol')
          .eq('user_id', userId)
          .limit(1);
        if (!profErr && Array.isArray(profData) && profData.length > 0) {
          effectiveRole = (profData[0] as any)?.rol || effectiveRole;
        }
        setCurrentUserRole(effectiveRole);

        // Overrides
        if (API_BASE) {
          try {
            const resp = await apiFetch(`${API_BASE}/users/${userId}/permissions`);
            if (resp.ok) {
              const json = await resp.json();
              const overrides: Record<string, Record<string, boolean>> = {};
              (json.permissions || []).forEach((p: any) => {
                if (!overrides[p.module]) overrides[p.module] = {};
                overrides[p.module][p.action] = Boolean(p.allowed);
              });
              setCurrentUserOverrides(overrides);
              console.groupCollapsed('👤 INVENTARIO: Carga de rol y overrides');
              console.log('• user_id:', userId);
              console.log('• meta_rol:', metaRol);
              console.log('• effective_role:', effectiveRole);
              console.log('• overrides(INVENTARIO):', overrides['INVENTARIO'] || {});
              console.log('• overrides_total_modules:', Object.keys(overrides || {}).length);
              console.groupEnd();
            }
          } catch {
            // Ignorar errores de overrides
          }
        }
      } catch (e) {
        console.error('[INVENTARIO] Error cargando permisos:', e);
        setCurrentUserRole((prev) => prev || 'Asistente');
      }
    };
    fetchRoleAndOverrides();
  }, []);

  const [showCreateDenied, setShowCreateDenied] = useState<boolean>(false);

  // Función de eliminación múltiple segura
  const handleBulkDelete = async (selectedIds: number[]) => {
    if (selectedIds.length === 0) return;

    try {
      console.groupCollapsed('🗑️ INVENTARIO: Bulk delete inicio');
      console.log('• selected_ids:', selectedIds);
      console.log('• can(eliminar):', can('eliminar'));
      console.groupEnd();
      // Verificar qué materiales están en uso por estudios médicos
      const { data: materialsInUse, error: relationError } = await supabase
        .from('estudio_materiales')
        .select('material_id')
        .in('material_id', selectedIds);

      if (relationError) throw relationError;

      // Crear set de ids en uso
      const blockedIds = new Set(materialsInUse?.map((r: any) => r.material_id) || []);
      if (blockedIds.size > 0) {
        console.warn('⚠️ INVENTARIO: Materiales en uso, no eliminables', { blockedIds: Array.from(blockedIds) });
      }

      // Separar materiales seguros vs bloqueados
      const safeToDelete = selectedIds.filter(id => !blockedIds.has(id));
      const blockedCount = blockedIds.size;

      // Confirmación de eliminación
      const confirmed = await showBulkDeleteConfirmation(safeToDelete.length, blockedCount, '');

      if (!confirmed) { console.log('🧯 INVENTARIO: Bulk delete cancelado por usuario'); return; }

      // Ejecutar eliminación solo de materiales seguros
      if (safeToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('inventario')
          .delete()
          .in('id', safeToDelete);

        if (deleteError) throw deleteError;
        console.log('✅ INVENTARIO: Eliminación ejecutada', { deletedIds: safeToDelete });
      }

      // Feedback al usuario
      const deletedCount = safeToDelete.length;

      if (deletedCount > 0) {
        toast.success(`${deletedCount} material(es) eliminado(s) exitosamente`);
        await logAudit({
          action: 'Eliminar',
          module: 'INVENTARIO',
          entity: 'material',
          entityId: null,
          metadata: {
            deleted_ids: safeToDelete,
            blocked_ids: Array.from(blockedIds),
            deleted_count: deletedCount,
            blocked_count: blockedCount,
          },
          success: true,
        });
        fetchInventory(); // Recargar datos
      }

      if (blockedCount > 0) {
        toast.warning(`${blockedCount} material(es) no pudieron eliminarse porque están en uso por estudios médicos`);
      }

    } catch (error: any) {
      console.error('❌ INVENTARIO: Bulk delete error:', error);
      toast.error(`Error al eliminar: ${error.message}`);
      await logAudit({
        action: 'Eliminar',
        module: 'INVENTARIO',
        entity: 'material',
        entityId: null,
        metadata: {
          attempted_ids: selectedIds,
          error: error.message,
        },
        success: false,
      });
    }
  };

  // Modal de confirmación de eliminación múltiple
  const showBulkDeleteConfirmation = (
    safeCount: number,
    blockedCount: number,
    blockedStudies: string
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      let message = `¿Estás seguro de eliminar ${safeCount} material(es) seleccionado(s)?\n\n`;

      if (blockedCount > 0) {
        message += `⚠️ IMPORTANTE: ${blockedCount} material(es) NO podrán eliminarse porque están en uso por estudios médicos:\n${blockedStudies}\n\n`;
      }

      message += `Esta acción es irreversible y eliminará los materiales permanentemente.\nSolo se eliminarán los ${safeCount} material(es) seguros.`;

      const confirmed = window.confirm(message);
      resolve(confirmed);
    });
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 lg:mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Inventario</h1>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <ViewToggle
            currentView={currentView}
            onViewChange={handleViewChange}
          />

          {/* Botón rojo de eliminación múltiple - solo mostrar si hay selecciones */}
          {currentView === 'table' && selectedForDeletion.size > 0 && (
            <button
              onClick={() => {
                if (!can('eliminar')) { console.warn('🚫 INVENTARIO: Eliminación múltiple denegada', { role: currentUserRole }); setDeniedBulkDelete(true); setTimeout(() => setDeniedBulkDelete(false), 3000); return; }
                handleBulkDelete(Array.from(selectedForDeletion));
              }}
              className={`text-white font-bold py-2 px-4 rounded-lg flex items-center ${!can('eliminar') ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
            >
              <FaTrash className="mr-2" />
              Eliminar Materiales ({selectedForDeletion.size})
            </button>
          )}
          {deniedBulkDelete && (
            <span className="text-[10px] text-red-600">No está autorizado</span>
          )}

          <button
            onClick={() => {
              if (!can('crear')) { console.warn('🚫 INVENTARIO: Crear material denegado', { role: currentUserRole }); setShowCreateDenied(true); setTimeout(() => setShowCreateDenied(false), 3000); return; }
              handleOpenModal();
            }}
            className={`text-white font-bold py-2 px-4 rounded-lg flex items-center ${!can('crear') ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
          >
            <FaPlus className="mr-2" /> Nuevo Material
          </button>
          {showCreateDenied && (
            <span className="text-[10px] text-red-600">No está autorizado</span>
          )}
        </div>
      </div>

      {/* Filtros Avanzados */}
      <div className="mb-6">
        <AdvancedFilters
          filters={advancedFilters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* Búsqueda Básica */}
      <div className="mb-4 relative">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>

      {/* Estados de carga y error */}
      {loading && <p className="text-center py-8">Cargando...</p>}
      {error && <p className="text-center py-4 text-red-500">{error}</p>}

      {/* Vista condicional por tipo de vista */}
      {!loading && !error && inventory.length > 0 && (
        <div className="mb-6">
          {currentView === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {inventory.map((item, index) => (
                <InventoryCard
                  key={item.id}
                  item={item}
                  onEdit={() => handleOpenModal(item)}
                  index={index}
                  canEdit={can('editar')}
                />
              ))}
            </div>
          ) : (
            <InventoryTable
              items={inventory}
              onEdit={handleOpenModal}
              onBulkDelete={handleSelectionChange}
              isLoading={loading}
              canEdit={can('editar')}
            />
          )}
        </div>
      )}

      {/* Estado vacío */}
      {!loading && !error && inventory.length === 0 && (
        <EmptyState
          icon={<FaBoxOpen />}
          title="No hay materiales en el inventario"
          message="Crea un nuevo material para empezar a gestionar tu stock."
          actionText="Crear Material"
          onActionClick={() => handleOpenModal(null)}
        />
      )}

      {/* Paginación */}
      {!loading && !error && totalItems > itemsPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalItems / itemsPerPage)}
          onPageChange={paginate}
        />
      )}

      {/* Modal del formulario */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={selectedItem ? 'Editar Material' : 'Nuevo Material'}
        >
          <InventoryForm item={selectedItem} onClose={handleCloseModal} />
        </Modal>
      )}
    </div>
  );
};

export default InventoryPage;
