import React, { useState } from 'react';
import { FaFilter, FaTimes, FaSearch } from 'react-icons/fa';

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

interface AdvancedFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onClearFilters: () => void;
  className?: string;
}

const UNIT_OPTIONS = [
  { value: '', label: 'Todas las unidades' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'mg', label: 'Miligramos (mg)' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'unidades', label: 'Unidades' },
  { value: 'tabletas', label: 'Tabletas' },
  { value: 'cápsulas', label: 'Cápsulas' },
  { value: 'tubos', label: 'Tubos' },
  { value: 'kits', label: 'Kits' },
];

// SUPPLIER_OPTIONS se cargarán dinámicamente en el futuro

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof Filters, value: string | number | undefined) => {
    const updatedFilters = { ...filters };

    if (value === '' || value === undefined || value === null) {
      delete updatedFilters[key];
    } else {
      (updatedFilters as any)[key] = value;
    }

    onFiltersChange(updatedFilters);
  };

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof Filters];
    return value !== undefined && value !== '' && value !== null;
  });

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
      >
        <div className="flex items-center">
          <FaFilter className={`mr-2 ${hasActiveFilters ? 'text-primary' : 'text-gray-400'}`} />
          <span className="font-medium text-gray-700">Filtros Avanzados</span>
          {hasActiveFilters && (
            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary text-white">
              {Object.keys(filters).length} activo{Object.keys(filters).length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
            {/* Campo de búsqueda por nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre contiene
              </label>
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={filters.nombre || ''}
                onChange={(e) => handleFilterChange('nombre', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Campo de búsqueda por descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción contiene
              </label>
              <input
                type="text"
                placeholder="Buscar por descripción..."
                value={filters.descripcion || ''}
                onChange={(e) => handleFilterChange('descripcion', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Filtro por stock mínimo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock mínimo
              </label>
              <input
                type="number"
                placeholder="Stock min."
                min="0"
                value={filters.cantidad_stock_min || ''}
                onChange={(e) => handleFilterChange('cantidad_stock_min', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Filtro por stock máximo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock máximo
              </label>
              <input
                type="number"
                placeholder="Stock máx."
                min="0"
                value={filters.cantidad_stock_max || ''}
                onChange={(e) => handleFilterChange('cantidad_stock_max', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Filtro por unidad de medida */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidad de medida
              </label>
              <select
                value={filters.unidad_medida || ''}
                onChange={(e) => handleFilterChange('unidad_medida', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {UNIT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por stock mínimo de alerta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock mínimo de alerta
              </label>
              <input
                type="number"
                placeholder="Alerta stock min."
                min="0"
                value={filters.stock_minimo || ''}
                onChange={(e) => handleFilterChange('stock_minimo', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Campo de búsqueda por proveedor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor
              </label>
              <input
                type="text"
                placeholder="Buscar por proveedor..."
                value={filters.proveedor || ''}
                onChange={(e) => handleFilterChange('proveedor', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Opciones de costo (se pueden expandir si es necesario) */}
            <div className="flex items-end">
              <button
                onClick={onClearFilters}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-primary transition-colors flex items-center justify-center"
              >
                <FaTimes className="mr-2" />
                Limpiar Filtros
              </button>
            </div>
          </div>

          {/* Información de filtros activos */}
          {hasActiveFilters && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <FaSearch className="text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">
                  Filtrando por: {Object.entries(filters).map(([key, value]) => `${key}: ${value}`).join(', ')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedFilters;
