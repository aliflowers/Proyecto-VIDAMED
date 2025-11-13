import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { toast } from 'react-toastify';
import ImageUpload from './ImageUpload';
import { logAudit, auditActionLabel } from '@/services/audit';

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
    imagen_url: '',
    cantidad_ingresar: 0,
    unidades_por_caja: 1,
    unidades_totales: 0,
  });
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [, setIsUploadingImage] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState('');

  useEffect(() => {
    if (item) {
      // Modo edición: cargar datos existentes
      setFormData({
        ...item,
        cantidad_ingresar: 0, // Reset para evitar ingresos accidentales
        unidades_por_caja: item.unidades_por_caja || 1,
        unidades_totales: item.unidades_totales || 0,
        sku: item.sku || 'Generado automáticamente', // Mostrar SKU existente
      });
      // Mantener fecha guardada sin cambios para edición
      setPurchaseDate(item.fecha_ultima_compra || '');
    } else {
      // Modo creación: fecha actual por defecto
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      setPurchaseDate(today);
      setFormData(prev => ({
        ...prev,
        fecha_ultima_compra: today
      }));
    }
  }, [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    let parsedValue;
    if (e.target.type === 'number') {
      // Si el campo de número está vacío, usar null/undefined según corresponda
      parsedValue = value.trim() === '' ? null : parseFloat(value) || 0;
    } else {
      // Para campos de texto, preservar el valor vacío como undefined
      parsedValue = value.trim() === '' ? undefined : value;
    }

    setFormData(prev => {
      const updatedFormData = { ...prev, [name]: parsedValue };

      // Calcular unidades totales automáticamente cuando cambien los campos relevantes
      if (name === 'cantidad_ingresar' || name === 'unidades_por_caja' || name === 'cantidad_stock') {
        const stock_actual = typeof updatedFormData.cantidad_stock === 'number' ? updatedFormData.cantidad_stock : 0;
        const cantidad_ingresar = typeof updatedFormData.cantidad_ingresar === 'number' ? updatedFormData.cantidad_ingresar : 0;
        const unidades_caja = typeof updatedFormData.unidades_por_caja === 'number' ? updatedFormData.unidades_por_caja : 1;

        const total_cajas = Math.max(0, stock_actual + cantidad_ingresar);
        const unidades_totales = total_cajas * Math.max(1, unidades_caja);

        updatedFormData.unidades_totales = unidades_totales;
      }

      return updatedFormData;
    });
  };

  const uploadImageIfNeeded = async (): Promise<string | undefined> => {
    if (!selectedImageFile) return formData.imagen_url;

    setIsUploadingImage(true);
    try {
      const fileName = `inventario/${Date.now()}_${selectedImageFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { error } = await supabase.storage.from('resultados').upload(fileName, selectedImageFile);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('resultados').getPublicUrl(fileName);
      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      throw new Error('Error al subir la imagen: ' + error.message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Primero subir la imagen si existe
      const finalImageUrl = await uploadImageIfNeeded();

      // Lógica de actualización de stock compensada
      const cantidadIngresarValue = formData.cantidad_ingresar && typeof formData.cantidad_ingresar === 'number' ? formData.cantidad_ingresar : 0;
      const stockActual = typeof formData.cantidad_stock === 'number' ? formData.cantidad_stock : parseInt(formData.cantidad_stock as any) || 0;

      // Para nuevos materiales: el stock inicial = cantidad_ingresar
      // Para edición: el stock = stock_actual + cantidad_ingresar (trigger lo maneja)
      const stockFinal = (item && item.id) ? stockActual : cantidadIngresarValue;

      console.log('🔄 Debug Stock Calculation:', {
        isEditMode: !!(item && item.id),
        stockActual,
        cantidadIngresarValue,
        stockFinal,
        itemId: item?.id
      });

      const dataToSubmit: any = {
        // Campos básicos
        nombre: formData.nombre || '',
        descripcion: formData.descripcion || null,
        cantidad_stock: stockFinal,
        unidad_medida: formData.unidad_medida || null,
        stock_minimo: typeof formData.stock_minimo === 'number' ? formData.stock_minimo : parseInt(formData.stock_minimo as any) || 0,
        proveedor: formData.proveedor || null,
        costo_ultima_compra_bs: formData.costo_ultima_compra_bs ? parseFloat(formData.costo_ultima_compra_bs as any) : null,
        costo_ultima_compra_usd: formData.costo_ultima_compra_usd ? parseFloat(formData.costo_ultima_compra_usd as any) : null,
        fecha_ultima_compra: formData.fecha_ultima_compra || null,
        notas: formData.notas || null,
        imagen_url: finalImageUrl || null,

        // Campos nuevos de gestión avanzada
        cantidad_ingresar: cantidadIngresarValue,
        unidades_por_caja: typeof formData.unidades_por_caja === 'number' ? formData.unidades_por_caja : 1
        // unidades_totales se calculará automáticamente por el trigger de BD
      };

      // Eliminar campos con valores inválidos
      Object.keys(dataToSubmit).forEach(key => {
        const value = dataToSubmit[key];
        if (value === undefined || Number.isNaN(value)) {
          delete dataToSubmit[key];
        }
      });

      let response;
      if (item && item.id) {
        // Actualizar
        response = await supabase.from('inventario').update(dataToSubmit).eq('id', item.id);
      } else {
        // Crear
        response = await supabase.from('inventario').insert([dataToSubmit]).select('id');
      }

      if (response.error) {
        console.error('Error de base de datos:', response.error);
        throw response.error;
      }

      // Auditoría de operación exitosa (crear/actualizar material de inventario)
      await logAudit({
        action: auditActionLabel(!!(item && item.id)),
        module: 'INVENTARIO',
        entity: 'material',
        entityId: (item && item.id) ? item.id : (response as any)?.data?.[0]?.id ?? null,
        metadata: {
          nombre: dataToSubmit.nombre,
          proveedor: dataToSubmit.proveedor,
          unidad_medida: dataToSubmit.unidad_medida,
          stock_final: stockFinal,
          cantidad_ingresar: cantidadIngresarValue,
          unidades_por_caja: dataToSubmit.unidades_por_caja,
          costo_bs: dataToSubmit.costo_ultima_compra_bs,
          costo_usd: dataToSubmit.costo_ultima_compra_usd,
          fecha_ultima_compra: dataToSubmit.fecha_ultima_compra,
          previo: item && item.id ? {
            id: item.id,
            nombre: item.nombre,
            cantidad_stock: item.cantidad_stock,
            proveedor: item.proveedor,
            unidad_medida: item.unidad_medida,
            costo_bs: item.costo_ultima_compra_bs,
            costo_usd: item.costo_ultima_compra_usd,
          } : null,
        },
        success: true,
      });

      toast.success(`Material ${item ? 'actualizado' : 'creado'} con éxito.`);
      onClose();
    } catch (error: any) {
      console.error('Error completo:', error);
      // Auditoría de operación fallida
      await logAudit({
        action: auditActionLabel(!!(item && item.id)),
        module: 'INVENTARIO',
        entity: 'material',
        entityId: item?.id ?? null,
        metadata: {
          nombre: formData.nombre,
          error: error?.message || String(error),
        },
        success: false,
      });
      toast.error(error.message || 'Error desconocido');
    }
  };

  const fields = [
    { name: 'nombre', label: 'Nombre', type: 'text', required: true },
    { name: 'descripcion', label: 'Descripción', type: 'textarea' },
    { name: 'cantidad_stock', label: 'Cantidad en Stock', type: 'number', required: false },
    { name: 'unidad_medida', label: 'Unidad de Medida', type: 'text' },
    { name: 'stock_minimo', label: 'Stock Mínimo', type: 'number', required: true },
    { name: 'proveedor', label: 'Proveedor', type: 'text' },
    // Campo de fecha dinámico - se manejará separadamente
    { name: 'costo_ultima_compra_bs', label: 'Costo Última Compra (Bs)', type: 'number' },
    { name: 'costo_ultima_compra_usd', label: 'Costo Última Compra (USD)', type: 'number' },
    { name: 'notas', label: 'Notas', type: 'textarea' },
  ];

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">{item ? 'Editar Material' : 'Nuevo Material'}</h2>

      {/* Campos básicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SKU - mostrar en edición si existe */}
        {item && item.sku && (
          <div className="md:col-span-2 mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU/ID del Material
            </label>
            <div className="flex items-center">
              <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md font-mono font-bold text-blue-800 text-sm">
                {item.sku}
              </div>
              <span className="ml-3 text-sm text-gray-500">
                🔒 Identificador único generado automáticamente
              </span>
            </div>
          </div>
        )}

        {/* Nombre y descripción primero */}
        {fields.filter(field => field.name === 'nombre' || field.name === 'descripcion').map((field) => (
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

        {/* Gestión avanzada de stock */}
        <div className="md:col-span-2 mb-4 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-base sm:text-lg font-medium text-blue-800 mb-3">📦 Gestión de Stock Avanzada</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

            {/* Stock actual (solo lectura) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Actual (cajas)
              </label>
              <input
                type="number"
                value={formData.cantidad_stock || 0}
                readOnly
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 cursor-not-allowed sm:text-sm"
                title="Este es el stock actual no editable"
              />
              <span className="text-xs text-blue-600 mt-1 block">
                {item?.unidad_medida ? `(${item.unidad_medida})` : '(unidades)'}
              </span>
            </div>

            {/* Cantidad a ingresar */}
            <div>
              <label htmlFor="cantidad_ingresar" className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad a Ingresar (+)
              </label>
              <input
                type="number"
                id="cantidad_ingresar"
                name="cantidad_ingresar"
                value={formData.cantidad_ingresar || 0}
                onChange={handleChange}
                min="0"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="0"
              />
              <span className="text-xs text-green-600 mt-1 block">
                Cajas nuevas que sumarán al stock
              </span>
            </div>

            {/* Unidades por caja */}
            <div>
              <label htmlFor="unidades_por_caja" className="block text-sm font-medium text-gray-700 mb-1">
                Unidades por Caja
              </label>
              <input
                type="number"
                id="unidades_por_caja"
                name="unidades_por_caja"
                value={formData.unidades_por_caja || 1}
                onChange={handleChange}
                min="1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              <span className="text-xs text-purple-600 mt-1 block">
                Unidades individuales por paquete
              </span>
            </div>

            {/* Unidades totales (calculado) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidades Totales
              </label>
              <input
                type="number"
                value={formData.unidades_totales || 0}
                readOnly
                className="mt-1 block w-full rounded-md border-gray-300 bg-green-50 text-green-800 font-semibold cursor-not-allowed sm:text-sm"
                title="Calculado automáticamente"
              />
              <span className="text-xs text-green-600 mt-1 block">
                Total de unidades disponibles
              </span>
            </div>
          </div>
        </div>

        {/* Campo de fecha - manejo especial según modo */}
        <div className="md:col-span-2">
          <label htmlFor="fecha_compra" className="block text-sm font-medium text-gray-700">
            Fecha de Última Compra
          </label>

          {item ? (
            // Modal edición: fecha guardada, solo lectura
            <div>
              <input
                type="text"
                id="fecha_compra_display"
                value={formData.fecha_ultima_compra ? new Date(formData.fecha_ultima_compra).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Fecha no registrada'}
                readOnly
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-600 cursor-not-allowed"
              />
              <span className="text-xs text-blue-600 mt-1 block">
                Esta fecha fue registrada al crear el material
              </span>
            </div>
          ) : (
            // Modal creación: fecha actual editable con picker
            <div>
              <input
                type="date"
                id="fecha_compra_picker"
                value={purchaseDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setPurchaseDate(newDate);
                  setFormData(prev => ({ ...prev, fecha_ultima_compra: newDate }));
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-xs text-green-600 mt-1 block">
                Selecciona la fecha de compra usando el calendario
              </span>
            </div>
          )}
        </div>

        {/* Resto de campos después del stock */}
        {fields.filter(field => !['nombre', 'descripcion'].includes(field.name)).map((field) => (
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

      {/* Campo de imagen */}
      <div className="mt-6">
        <ImageUpload
          currentImageUrl={formData.imagen_url}
          onImageChange={(file, previewUrl) => {
            setSelectedImageFile(file);
            setFormData({ ...formData, imagen_url: previewUrl || undefined });
          }}
        />
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
