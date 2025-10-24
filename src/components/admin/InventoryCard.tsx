import React from 'react';
import { FaEdit, FaBox } from 'react-icons/fa';
import { InventoryItem } from '@/types';

interface InventoryCardProps {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
}

const InventoryCard: React.FC<InventoryCardProps> = ({ item, onEdit }) => {
  return (
    <div className="bg-white shadow-lg rounded-lg p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center mb-4">
          {item.imagen_url ? (
            <img src={item.imagen_url} alt={item.nombre} className="w-16 h-16 rounded-full mr-4 object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mr-4">
              <FaBox className="text-3xl text-gray-500" />
            </div>
          )}
          <div>
            <h3 className="text-xl font-bold text-gray-800">{item.nombre}</h3>
            <p className="text-sm text-gray-600">{item.descripcion}</p>
          </div>
        </div>
        <div className="text-sm text-gray-700 grid grid-cols-2 gap-2">
          <p><strong>Stock:</strong> {item.cantidad_stock} {item.unidad_medida}</p>
          <p><strong>Stock Mínimo:</strong> {item.stock_minimo} {item.unidad_medida}</p>
          <p><strong>Proveedor:</strong> {item.proveedor || 'N/A'}</p>
          <p><strong>Última Compra:</strong> {item.fecha_ultima_compra ? new Date(item.fecha_ultima_compra).toLocaleDateString() : 'N/A'}</p>
          <p><strong>Costo (Bs):</strong> {item.costo_ultima_compra_bs || 'N/A'}</p>
          <p><strong>Costo (USD):</strong> {item.costo_ultima_compra_usd || 'N/A'}</p>
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