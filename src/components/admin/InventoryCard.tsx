import React from 'react';
import { FaEdit, FaBox } from 'react-icons/fa';
import { InventoryItem } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface InventoryCardProps {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  index?: number; // Para generar SKUs temporales
}

const InventoryCard: React.FC<InventoryCardProps> = ({ item, onEdit, index = 0 }) => {

  // Función para generar SKUs basados en nombre del material
  const generateSKU = (nombre: string, sequence: number = 1): string => {
    const words = nombre.trim().split(/\s+/);
    const firstLetter = words[0]?.charAt(0).toUpperCase() || 'X';
    const secondLetter = words[1]?.charAt(0).toUpperCase() || firstLetter;
    const paddedSequence = sequence.toString().padStart(3, '0');
    return `${firstLetter}${secondLetter}${paddedSequence}`;
  };

  // Renderizar SKU: usar existente de BD o generar temporal basado en nombre
  const renderSKU = () => {
    if (item.sku) return item.sku;
    // Generar SKU temporal basado en index si no existe en BD
    return generateSKU(item.nombre, (index || 0) + 1);
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-4 flex flex-col justify-between hover:shadow-xl transition-shadow">
      <div>
        <div className="flex items-center mb-4">
          {item.imagen_url ? (
            <img src={item.imagen_url} alt={item.nombre} className="w-16 h-16 rounded-lg mr-4 object-cover border" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center mr-4 border">
              <FaBox className="text-3xl text-gray-500" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800">{item.nombre}</h3>
            <p className="text-sm text-gray-600">{item.descripcion}</p>
          </div>
        </div>
        <div className="text-sm text-gray-700 grid grid-cols-2 gap-2">
          {/* SKU primero como identificador único */}
          <p className="col-span-2"><strong>SKU/ID:</strong> <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">{renderSKU()}</span></p>

          <p><strong>Stock (cajas):</strong> {item.cantidad_stock} {item.unidad_medida}</p>
          <p><strong>Unidades Totales:</strong> {item.unidades_totales || 0} unid</p>
          <p><strong>Stock Mínimo:</strong> {item.stock_minimo} {item.unidad_medida}</p>
          <p><strong>Proveedor:</strong> {item.proveedor || 'N/A'}</p>
          <p><strong>Fecha Registro:</strong> {formatDate(item.fecha_ultima_compra)}</p>
          <p><strong>Costo Bs.:</strong> {formatCurrency(item.costo_ultima_compra_bs)}</p>
        </div>
        {item.notas && <p className="text-sm text-gray-600 mt-2"><strong>Notas:</strong> {item.notas}</p>}
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={() => onEdit(item)} className="text-blue-500 hover:text-blue-700">
          <FaEdit className="text-xl" />
        </button>
      </div>
    </div>
  );
};

export default InventoryCard;
