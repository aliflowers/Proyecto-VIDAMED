import React, { useState, useMemo } from 'react';
import { Eye, Trash, FileText, BrainCircuit, Info, Search } from 'lucide-react';
import { formatDate } from '@/utils/formatters';

interface GlobalResult {
  id: number;
  paciente_id: number;
  estudio_id: number;
  resultado_data: any;
  fecha_creacion: string;
  analisis_ia?: string;
  analisis_estado?: string;
  paciente_nombres: string;
  paciente_apellidos: string;
  paciente_cedula: string;
  nombre_estudio: string;
}

interface ResultsTableProps {
  results: GlobalResult[];
  onViewResult: (result: GlobalResult) => void;
  onDeleteResult: (resultId: number) => void;
  onGenerateInterpretation: (result: GlobalResult) => void;
  isLoading?: boolean;
  generatingInterpretationId?: number | null;
}

const ResultsTable: React.FC<ResultsTableProps> = ({
  results,
  onViewResult,
  onDeleteResult,
  onGenerateInterpretation,
  isLoading,
  generatingInterpretationId
}) => {
  const [sortBy, setSortBy] = useState<string>('fecha');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortBy) {
        case 'fecha':
          aVal = new Date(a.fecha_creacion);
          bVal = new Date(b.fecha_creacion);
          break;
        case 'paciente':
          aVal = `${a.paciente_nombres} ${a.paciente_apellidos}`.toLowerCase();
          bVal = `${b.paciente_nombres} ${b.paciente_apellidos}`.toLowerCase();
          break;
        case 'estudio':
          aVal = a.nombre_estudio.toLowerCase();
          bVal = b.nombre_estudio.toLowerCase();
          break;
        default:
          aVal = a.fecha_creacion;
          bVal = b.fecha_creacion;
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }, [results, sortBy, sortOrder]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow-md rounded-lg p-8 text-center">
        <div className="inline-flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
          <span className="text-gray-500">Cargando resultados globales...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      {/* 📊 Estadísticas rápidas */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-4 py-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{results.length}</div>
            <div className="text-sm text-gray-600">Total Resultados</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {results.filter(r => r.resultado_data?.tipo === 'manual').length}
            </div>
            <div className="text-sm text-gray-600">Ingresados Manual</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {results.filter(r => r.resultado_data?.tipo === 'archivo').length}
            </div>
            <div className="text-sm text-gray-600">Archivos Subidos</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-orange-600">
              {results.filter(r => r.analisis_ia).length}
            </div>
            <div className="text-sm text-gray-600">Con Análisis IA</div>
          </div>
        </div>
      </div>

      {/* 📋 Tabla con encabezado sticky */}
      <div className="relative">
        <div className="max-h-[500px] overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('fecha')}>
                <div className="flex items-center">
                  Fecha
                  <span className="ml-1 text-gray-400">
                    {sortBy === 'fecha' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                  </span>
                </div>
              </th>

              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('paciente')}>
                <div className="flex items-center">
                  Paciente
                  <span className="ml-1 text-gray-400">
                    {sortBy === 'paciente' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                  </span>
                </div>
              </th>

              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cédula
              </th>

              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('estudio')}>
                <div className="flex items-center">
                  Estudio
                  <span className="ml-1 text-gray-400">
                    {sortBy === 'estudio' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                  </span>
                </div>
              </th>

              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>

              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Análisis IA
              </th>

              <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {sortedResults.map((result) => (
              <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(result.fecha_creacion)}
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(result.fecha_creacion).toLocaleTimeString('es-VE', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </td>

                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-600 flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {result.paciente_nombres?.charAt(0)}{result.paciente_apellidos?.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {result.paciente_nombres} {result.paciente_apellidos}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {result.paciente_cedula}
                </td>

                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {result.nombre_estudio}
                  </span>
                </td>

                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    result.resultado_data?.tipo === 'archivo'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {result.resultado_data?.tipo === 'archivo' ? (
                      <>
                        <FileText className="mr-1 h-3 w-3" />
                        Archivo
                      </>
                    ) : (
                      <>
                        <Search className="mr-1 h-3 w-3" />
                        Manual
                      </>
                    )}
                  </span>
                </td>

                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                  {result.analisis_ia ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Completado
                    </span>
                  ) : generatingInterpretationId === result.id ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generando...
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        console.log('🖱️ Click en "Generar IA" en ResultsTable para resultado:', result);
                        onGenerateInterpretation(result);
                      }}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <BrainCircuit className="mr-1 h-3 w-3 animate-pulse" />
                      Generar IA
                    </button>
                  )}
                </td>

                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {result.resultado_data?.url && (
                      <button
                        onClick={() => window.open(result.resultado_data.url, '_blank', 'noopener,noreferrer')}
                        className="p-1 text-blue-600 hover:text-blue-900 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                        title="Ver archivo"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}

                    {result.resultado_data?.tipo === 'manual' && (
                      <button
                        onClick={() => onViewResult(result)}
                        className="p-1 text-purple-600 hover:text-purple-900 border border-purple-200 rounded-md hover:bg-purple-50 transition-colors"
                        title="Ver resultado manual"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                    )}

                    {!!result.analisis_ia && (
                      <button
                        onClick={() => onGenerateInterpretation(result)}
                        className="p-1 text-indigo-600 hover:text-indigo-900 border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors"
                        title="Ver/editar análisis IA"
                      >
                        <BrainCircuit className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (window.confirm('¿Estás seguro de querer eliminar este resultado?')) {
                          onDeleteResult(result.id);
                        }
                      }}
                      className="p-1 text-red-600 hover:text-red-900 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                      title="Eliminar resultado"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* 📊 Footer con estadísticas detalladas */}
      {sortedResults.length > 0 && (
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
          <div className="flex flex-wrap items-center justify-between text-sm text-gray-600">
            <div>
              Mostrando <strong>{sortedResults.length}</strong> de <strong>{results.length}</strong> resultados
              {sortedResults.length !== results.length && (
                <span className="text-gray-500 ml-2">(filtrados)</span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span>Ordenado por: <strong>{sortBy === 'fecha' ? 'Fecha' : sortBy === 'paciente' ? 'Paciente' : sortBy === 'estudio' ? 'Estudio' : 'Fecha'}</strong></span>
              <span>({sortOrder === 'asc' ? 'Ascendente' : 'Descendente'})</span>
            </div>
          </div>
        </div>
      )}

      {/* 🎯 Estado vacío */}
      {sortedResults.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Info className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay resultados</h3>
          <p className="mt-1 text-sm text-gray-500">
            Comienza creando el primer resultado utilizando los botones de subida de archivo o ingreso manual.
          </p>
        </div>
      )}
    </div>
  );
};

export default ResultsTable;