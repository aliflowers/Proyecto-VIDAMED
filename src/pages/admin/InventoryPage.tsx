
import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { toast } from 'react-toastify';
import { FaBoxOpen, FaPlus, FaSearch } from 'react-icons/fa';
import InventoryCard from '@/components/admin/InventoryCard';
import InventoryForm from '@/components/admin/InventoryForm';
import { Modal } from '@/components/common/Modal';
import { Pagination } from '@/components/common/Pagination';
import { EmptyState } from '@/components/common/EmptyState';
import { InventoryItem } from '@/types';

const InventoryPage = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchInventory();
  }, [searchTerm, currentPage]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      let query = supabase.from('inventario').select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.ilike('nombre', `%${searchTerm}%`);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setInventory(data || []);
      setTotalItems(count || 0);
    } catch (error: any) {
      setError(error.message);
      toast.error('Error al cargar el inventario.');
    } finally {
      setLoading(false);
    }
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
    setCurrentPage(1); // Resetear a la primera página en cada búsqueda
  };

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Inventario</h1>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex items-center"
        >
          <FaPlus className="mr-2" /> Nuevo Material
        </button>
      </div>

      <div className="mb-4 relative">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full p-3 pl-10 border border-gray-300 rounded-lg"
        />
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>

      {loading && <p>Cargando...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {
        !loading && !error && inventory.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inventory.map((item) => (
              <InventoryCard key={item.id} item={item} onEdit={() => handleOpenModal(item)} />
            ))}
          </div>
        )
      }

      {
        !loading && !error && inventory.length === 0 && (
          <EmptyState
              icon={<FaBoxOpen />}
              title="No hay materiales en el inventario"
              message="Crea un nuevo material para empezar a gestionar tu stock."
              actionText="Crear Material"
              onActionClick={() => handleOpenModal(null)}
            />
        )
      }

      {
        !loading && !error && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / itemsPerPage)}
            onPageChange={paginate}
          />
        )
      }

      {
        isModalOpen && (
          <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedItem ? 'Editar Material' : 'Nuevo Material'}>
            <InventoryForm item={selectedItem} onClose={handleCloseModal} />
          </Modal>
        )
      }
    </div>
  );
};

export default InventoryPage;