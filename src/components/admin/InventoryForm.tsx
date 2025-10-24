import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { toast } from 'react-toastify';

import { InventoryItem } from '@/types';

interface InventoryFormProps {
  item: InventoryItem | null;
  onClose: () => void;
}

const InventoryForm: React.FC<InventoryFormProps> = ({ item, onClose }) => {
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    nombre: '',
    descripcion: '',
    cantidad_stock: 0,
    unidad_medida: '',
    stock_minimo: 0,
    proveedor: '',
    costo_ultima_compra_bs: 0,
    costo_ultima_compra_usd: 0,
    notas: '',
  });

  useEffect(() => {
    if (item) {
      setFormData(item);
    }
  }, [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const parsedValue = e.target.type === 'number' ? parseFloat(value) : value;
    setFormData({ ...formData, [name]: parsedValue });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let response;
      const dataToSubmit = { ...formData };

      if (item && item.id) {
        // Actualizar
        response = await supabase.from('inventario').update(dataToSubmit).eq('id', item.id);
      } else {
        // Crear
        response = await supabase.from('inventario').insert([dataToSubmit]);
      }

      if (response.error) {
        throw response.error;
      }

      toast.success(`Material ${item ? 'actualizado' : 'creado'} con éxito.`);
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const fields = [
    { name: 'nombre', label: 'Nombre', type: 'text', required: true },
    { name: 'descripcion', label: 'Descripción', type: 'textarea' },
    { name: 'cantidad_stock', label: 'Cantidad en Stock', type: 'number', required: true },
    { name: 'unidad_medida', label: 'Unidad de Medida', type: 'text' },
    { name: 'stock_minimo', label: 'Stock Mínimo', type: 'number', required: true },
    { name: 'proveedor', label: 'Proveedor', type: 'text' },
    { name: 'costo_ultima_compra_bs', label: 'Costo Última Compra (Bs)', type: 'number' },
    { name: 'costo_ultima_compra_usd', label: 'Costo Última Compra (USD)', type: 'number' },
    { name: 'notas', label: 'Notas', type: 'textarea' },
  ];

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">{item ? 'Editar Material' : 'Nuevo Material'}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
              {field.label}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                id={field.name}
                name={field.name}
                value={formData[field.name as keyof typeof formData] || ''}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            ) : (
              <input
                type={field.type}
                id={field.name}
                name={field.name}
                value={formData[field.name as keyof typeof formData] || ''}
                onChange={handleChange}
                required={field.required}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-6">
        <button type="button" onClick={onClose} className="mr-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">
          Cancelar
        </button>
        <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
          {item ? 'Actualizar' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

export default InventoryForm;