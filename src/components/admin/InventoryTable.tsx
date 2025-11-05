import React, { useState, useEffect } from 'react';
import { FaEdit } from 'react-icons/fa';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { InventoryItem } from '@/types';

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onBulkDelete?: (selectedIds: number[]) => void;
  isLoading?: boolean;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  onEdit,
  onBulkDelete,
  isLoading = false
}) => {
  // Estado para selección múltiple
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Propagar selecciones al parent - SIEMPRE, incluso cuando está vacío
  useEffect(() => {
    if (onBulkDelete) {
      console.log('📤 Enviando selecciones al parent:', Array.from(selectedItems));
      onBulkDelete(Array.from(selectedItems));
    }
  }, [selectedItems, onBulkDelete]);

  // Función para generar SKUs basados en nombre del material
  const generateSKU = (nombre: string, sequence: number = 1): string => {
    const words = nombre.trim().split(/\s+/);
    const firstLetter = words[0]?.charAt(0).toUpperCase() || 'X';
    const secondLetter = words[1]?.charAt(0).toUpperCase() || firstLetter;
    const paddedSequence = sequence.toString().padStart(3, '0');
    return `${firstLetter}${secondLetter}${paddedSequence}`;
  };

  // Renderizar SKU: usar existente de BD o generar temporal basado en nombre
  const renderSKU = (item: InventoryItem, index: number) => {
    if (item.sku) return item.sku;
    // Generar SKU temporal basado en orden/index si no existe en BD
    return generateSKU(item.nombre, index + 1);
  };

  // Handlers para selección múltiple
  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
      setSelectAll(false);
    } else {
      const allIds = items.map(item => item.id);
      setSelectedItems(new Set(allIds));
      setSelectAll(true);
    }
  };

  const toggleItemSelection = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
    setSelectAll(newSelected.size === items.length);
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow-md rounded-lg p-8 text-center">
        <p className="text-gray-500">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Checkbox Master */}
              <th className="relative w-12 px-6 sm:w-16 sm:px-8">
                <input
                  type="checkbox"
                  className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 sm:left-6"
                  ref={checkbox => {
                    if (checkbox) checkbox.indeterminate = selectedItems.size > 0 && selectedItems.size < items.length;
                  }}
                  checked={selectAll}
                  onChange={handleSelectAll}
                  title="Seleccionar todos"
                />
              </th>

              {/* SKU/ID primera columna para identificación */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-bold">
                SKU/ID
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Material
              </th>

              {/* Unidades primeras para prioridad operacional */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unidades
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock Cajas
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock Mínimo
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Proveedor
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Registro
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Costo Bs
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Costo USD
              </th>

              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item, index) => (
              <tr
                key={item.id}
                className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                  selectedItems.has(item.id) ? 'bg-indigo-50' : ''
                }`}
              >
                {/* Checkbox individual */}
                <td className="relative w-12 px-6 sm:w-16 sm:px-8">
                  <input
                    type="checkbox"
                    className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 sm:left-6"
                    checked={selectedItems.has(item.id)}
                    onChange={() => toggleItemSelection(item.id)}
                  />
                </td>

                {/* SKU/ID primera columna */}
                <td className="px-6 py-4">
                  <div className="text-sm font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {renderSKU(item, index)}
                  </div>
                </td>

                {/* Material */}
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12">
                      {item.imagen_url ? (
                        <img
                          className="h-12 w-12 rounded-lg object-cover border"
                          src={item.imagen_url}
                          alt={item.nombre}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-xs">Sin img</span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {item.nombre}
                      </div>
                      {item.descripcion && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {item.descripcion}
                        </div>
                      )}
                      {item.notas && (
                        <div className="text-xs text-gray-400 truncate max-w-xs">
                          Nota: {item.notas}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Unidades totales primero por prioridad operacional */}
                <td className="px-6 py-4">
                  <div className="text-sm font-semibold text-green-600">
                    {item.unidades_totales || 0}
                    {item.unidades_por_caja && (
                      <span className="text-xs text-gray-500 block">
                        ({item.unidades_por_caja} unid/caja)
                      </span>
                    )}
                  </div>
                </td>

                {/* Stock en cajas */}
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {item.cantidad_stock}
                    {item.unidad_medida && (
                      <span className="text-gray-500 ml-1">{item.unidad_medida}</span>
                    )}
                  </div>
                </td>

                {/* Stock mínimo */}
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {item.stock_minimo}
                    {item.unidad_medida && (
                      <span className="text-gray-500 ml-1">{item.unidad_medida}</span>
                    )}
                  </div>
                  {item.cantidad_stock <= item.stock_minimo && (
                    <div className="text-xs text-red-600 font-medium">
                      ¡Stock bajo!
                    </div>
                  )}
                </td>

                {/* Proveedor */}
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {item.proveedor || 'N/A'}
                  </div>
                </td>

                {/* Fecha registro usando fecha_ultima_compra */}
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {formatDate(item.fecha_ultima_compra)}
                  </div>
                </td>

                {/* Costo Bs */}
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(item.costo_ultima_compra_bs)}
                  </div>
                </td>

                {/* Nueva columna: Costo USD */}
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(item.costo_ultima_compra_usd, 'usd')}
                  </div>
                </td>

                {/* Acciones */}
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => onEdit(item)}
                    className="text-blue-600 hover:text-blue-900 transition-colors"
                    title="Editar material"
                  >
                    <FaEdit className="text-lg" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedItems.size > 0 && (
        <div className="bg-indigo-50 px-4 py-3 text-sm text-indigo-700 border-t border-indigo-200">
          {selectedItems.size} material(es) seleccionado(s) para eliminación. Use el botón "Eliminar Materiales" en la página principal.
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No hay materiales registrados</p>
        </div>
      )}
    </div>
  );
};

export default InventoryTable;
