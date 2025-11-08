import React, { useState, useMemo, useEffect } from 'react';
import { Eye, Trash, FileText, BrainCircuit, Info, Search, Pencil, X, Mail } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { formatDate } from '@/utils/formatters';
import { supabase } from '@/services/supabaseClient';
import { toast } from 'react-toastify';

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
  onResultUpdated?: (updated: GlobalResult) => void;
  can?: (action: string) => boolean;
}

const ResultsTable: React.FC<ResultsTableProps> = ({
  results,
  onViewResult,
  onDeleteResult,
  onGenerateInterpretation,
  isLoading,
  generatingInterpretationId,
  onResultUpdated,
  can
}) => {
  // Estado local para reflejar cambios inmediatos en la UI
  const [localResults, setLocalResults] = useState<GlobalResult[]>(results);
  useEffect(() => {
    setLocalResults(results);
  }, [results]);

  const [sortBy, setSortBy] = useState<string>('fecha');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Estado del modal de edición
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editingResult, setEditingResult] = useState<GlobalResult | null>(null);
  const [studyFields, setStudyFields] = useState<Array<{ name: string; label: string; unit?: string; reference?: string }>>([]);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editMotivo, setEditMotivo] = useState<string>(''); // <- NUEVO estado
  const [sendingWhatsappId, setSendingWhatsappId] = useState<number | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<number | null>(null);
  const [denied, setDenied] = useState<Record<number, Record<string, boolean>>>({});

  const markDenied = (id: number, action: string) => {
    setDenied(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [action]: true }
    }));
    setTimeout(() => {
      setDenied(prev => ({
        ...prev,
        [id]: { ...(prev[id] || {}), [action]: false }
      }));
    }, 3000);
  };

  const notifyWhatsapp = async (resultId: number) => {
    setSendingWhatsappId(resultId);
    try {
      const resp = await fetch('/api/notify/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result_id: resultId }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data?.ok) {
        toast.success(data?.message || 'WhatsApp enviado correctamente');
      } else {
        const code = data?.code || 'UNKNOWN_ERROR';
        if (code === 'NO_PHONE') {
          toast.error('El paciente no tiene teléfono registrado.');
        } else if (code === 'ENV_MISSING') {
          toast.error('Faltan variables de entorno para WhatsApp API.');
        } else if (code === 'WHATSAPP_API_ERROR') {
          toast.error(`Error al enviar WhatsApp: ${data?.message || 'API error'}`);
        } else if (data?.message) {
          toast.error(data.message);
        } else {
          toast.error('No se pudo enviar la notificación por WhatsApp.');
        }
      }
    } catch (e: any) {
      toast.error(`Error de red enviando WhatsApp: ${e?.message || e}`);
    } finally {
      setSendingWhatsappId(null);
    }
  };

  const notifyEmail = async (resultId: number) => {
    setSendingEmailId(resultId);
    try {
      const resp = await fetch('/api/notify/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result_id: resultId }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data?.ok) {
        toast.success(data?.message || 'Email enviado correctamente');
      } else {
        const code = data?.code || 'UNKNOWN_ERROR';
        if (code === 'NO_EMAIL') {
          toast.error('Este paciente no tiene email registrado.');
        } else if (code === 'INTERPRETATION_NOT_APPROVED') {
          toast.error('No se envió: falta análisis/interpretación IA aprobada.');
        } else if (code === 'ENV_MISSING') {
          toast.error('Configuración SMTP incompleta (host/port/user/pass).');
        } else if (data?.message) {
          toast.error(data.message);
        } else {
          toast.error('No se pudo enviar la notificación por email.');
        }
      }
    } catch (e: any) {
      toast.error(`Error de red enviando Email: ${e?.message || e}`);
    } finally {
      setSendingEmailId(null);
    }
  };

  // Helper: actualizar resultado con reintento si hay error de red
  const updateResultadoConRetry = async (id: number, updatedData: any, retries = 1, motivoEstudio?: string | null): Promise<void> => {
    try {
      const { error } = await supabase
        .from('resultados_pacientes')
        .update({ resultado_data: updatedData, motivo_estudio: motivoEstudio ?? null }) // <- NUEVO: actualiza columna
        .eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      const msg = String(err?.message || '');
      const isNetwork = msg.includes('Failed to fetch') || msg.includes('ERR_CONNECTION_CLOSED');
      if (isNetwork && retries > 0) {
        await new Promise(res => setTimeout(res, 700));
        return updateResultadoConRetry(id, updatedData, retries - 1, motivoEstudio);
      }
      throw err;
    }
  };

  const sortedResults = useMemo(() => {
    return [...localResults].sort((a, b) => {
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
  }, [localResults, sortBy, sortOrder]);

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
                        if (can && !can('editar')) { markDenied(result.id, 'generar_ia'); return; }
                        onGenerateInterpretation(result);
                      }}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 transition-all duration-200 shadow-sm ${can && !can('editar') ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-200 hover:shadow-md'}`}
                    >
                      <BrainCircuit className="mr-1 h-3 w-3 animate-pulse" />
                      Generar IA
                    </button>
                  )}
                  {denied[result.id]?.generar_ia && (
                    <span className="ml-2 text-[10px] text-red-600">No está autorizado</span>
                  )}
                </td>

                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {/* Botón de ver resultado en visor modal (lupa) - oculto si es tipo archivo */}
                    {result.resultado_data?.tipo !== 'archivo' && (
                      <>
                        <button
                          onClick={() => {
                            if (can && !can('ver')) { markDenied(result.id, 'ver'); return; }
                            onViewResult(result);
                          }}
                          className={`p-1 border border-gray-200 rounded-md transition-colors ${can && !can('ver') ? 'opacity-50 cursor-not-allowed text-gray-400' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                          title="Ver resultado"
                        >
                          <Search className="h-4 w-4" />
                        </button>
                        {denied[result.id]?.ver && (
                          <span className="ml-1 text-[10px] text-red-600">No está autorizado</span>
                        )}
                      </>
                    )}
                    {result.resultado_data?.url && (
                      <>
                        <button
                          onClick={() => {
                            if (can && !can('ver')) { markDenied(result.id, 'ver_archivo'); return; }
                            window.open(result.resultado_data.url, '_blank', 'noopener,noreferrer');
                          }}
                          className={`p-1 border border-blue-200 rounded-md transition-colors ${can && !can('ver') ? 'opacity-50 cursor-not-allowed text-blue-300' : 'text-blue-600 hover:text-blue-900 hover:bg-blue-50'}`}
                          title="Ver archivo"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {denied[result.id]?.ver_archivo && (
                          <span className="ml-1 text-[10px] text-red-600">No está autorizado</span>
                        )}
                      </>
                    )}

                    {/* Notificar por WhatsApp */}
                    <button
                      onClick={() => {
                        if (can && !can('enviar_whatsapp')) { markDenied(result.id, 'whatsapp'); return; }
                        notifyWhatsapp(result.id);
                      }}
                      className={`p-1 border border-green-200 rounded-md transition-colors ${can && !can('enviar_whatsapp') ? 'opacity-50 cursor-not-allowed text-green-300' : 'text-green-600 hover:text-green-900 hover:bg-green-50'}`}
                      title="Enviar notificación por WhatsApp"
                      disabled={sendingWhatsappId === result.id}
                    >
                      {sendingWhatsappId === result.id ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <FaWhatsapp className="h-4 w-4" />
                      )}
                    </button>
                    {denied[result.id]?.whatsapp && (
                      <span className="ml-1 text-[10px] text-red-600">No está autorizado</span>
                    )}

                    {/* Notificar por Email: para tipo archivo se habilita sin exigir interpretación aprobada */}
                    <button
                      onClick={() => {
                        if (can && !can('enviar_email')) { markDenied(result.id, 'email'); return; }
                        notifyEmail(result.id);
                      }}
                      className={`p-1 border border-emerald-200 rounded-md transition-colors ${can && !can('enviar_email') ? 'opacity-50 cursor-not-allowed text-emerald-300' : 'text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50'}`}
                      title={
                        result.resultado_data?.tipo === 'archivo'
                          ? 'Enviar archivo por Email'
                          : (result.analisis_estado?.toLowerCase() === 'aprobado'
                              ? 'Enviar resultado por Email'
                              : 'Aprueba la interpretación IA para habilitar el envío')
                      }
                      disabled={
                        sendingEmailId === result.id || (
                          result.resultado_data?.tipo !== 'archivo' && !(result.analisis_estado && result.analisis_estado.toLowerCase() === 'aprobado')
                        )
                      }
                    >
                      {sendingEmailId === result.id ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                    </button>
                    {denied[result.id]?.email && (
                      <span className="ml-1 text-[10px] text-red-600">No está autorizado</span>
                    )}

                    {result.resultado_data?.tipo === 'manual' && (
                      <>
                        <button
                          onClick={async () => {
                            if (can && !can('editar')) { markDenied(result.id, 'editar'); return; }
                            setFormError(null);
                            setEditingResult(result);
                            setIsEditOpen(true);
                            // Cargar campos del estudio
                            const { data, error } = await supabase
                              .from('estudios')
                              .select('campos_formulario, nombre')
                              .eq('id', result.estudio_id)
                              .single();
                            if (error) {
                              console.error('Error cargando campos del estudio:', error);
                              toast.error('Error al cargar campos del estudio');
                              setStudyFields([]);
                            } else {
                              const campos = Array.isArray(data?.campos_formulario)
                                ? data.campos_formulario.map((campo: any) => ({
                                    name: campo.name || campo.nombre,
                                    label: campo.etiqueta || campo.label || campo.name || campo.nombre,
                                    unit: campo.unit || campo.unidad,
                                    reference: campo.reference || campo.valor_referencial,
                                  }))
                                : [];
                              setStudyFields(campos);
                            }
                            // Prefill valores
                            try {
                              const raw = typeof result.resultado_data === 'string'
                                ? JSON.parse(result.resultado_data as any)
                                : result.resultado_data;
                              const valores = raw?.valores && typeof raw.valores === 'object' ? raw.valores : {};
                              setEditValues(valores);
                              const motivoValue = raw?.motivo_estudio;
                              setEditMotivo(typeof motivoValue === 'string' ? motivoValue : ''); // <- NUEVO: precargar motivo
                            } catch (e) {
                              console.warn('No se pudieron pre-cargar valores del resultado');
                              setEditValues({});
                              setEditMotivo(''); // <- NUEVO: reset motivo
                            }
                          }}
                          className={`p-1 border border-blue-200 rounded-md transition-colors ${can && !can('editar') ? 'opacity-50 cursor-not-allowed text-blue-300' : 'text-blue-600 hover:text-blue-900 hover:bg-blue-50'}`}
                          title="Editar parámetros del estudio"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {denied[result.id]?.editar && (
                          <span className="ml-1 text-[10px] text-red-600">No está autorizado</span>
                        )}
                      </>
                    )}

                    {!!result.analisis_ia && (
                      <>
                        <button
                          onClick={() => {
                            if (can && !can('editar')) { markDenied(result.id, 'ia_detalle'); return; }
                            onGenerateInterpretation(result);
                          }}
                          className={`p-1 border border-indigo-200 rounded-md transition-colors ${can && !can('editar') ? 'opacity-50 cursor-not-allowed text-indigo-300' : 'text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50'}`}
                          title="Ver/editar análisis IA"
                        >
                          <BrainCircuit className="h-4 w-4" />
                        </button>
                        {denied[result.id]?.ia_detalle && (
                          <span className="ml-1 text-[10px] text-red-600">No está autorizado</span>
                        )}
                      </>
                    )}

                    <button
                      onClick={() => {
                        if (can && !can('eliminar')) { markDenied(result.id, 'eliminar'); return; }
                        if (window.confirm('¿Estás seguro de querer eliminar este resultado?')) {
                          onDeleteResult(result.id);
                        }
                      }}
                      className={`p-1 border border-red-200 rounded-md transition-colors ${can && !can('eliminar') ? 'opacity-50 cursor-not-allowed text-red-300' : 'text-red-600 hover:text-red-900 hover:bg-red-50'}`}
                      title="Eliminar resultado"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                    {denied[result.id]?.eliminar && (
                      <span className="ml-1 text-[10px] text-red-600">No está autorizado</span>
                    )}
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

      {/* ✏️ Modal de edición de resultados manuales */}
      {isEditOpen && editingResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            <header className="p-4 flex justify-between items-center border-b">
              <h2 className="text-xl font-bold">Editar Resultado: {editingResult.nombre_estudio}</h2>
              <button onClick={() => setIsEditOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
            </header>
            <div className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">{formError}</div>
              )}
              {/* NUEVO: Campo Motivo del Estudio */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Motivo del Estudio</label>
                <textarea
                  value={editMotivo}
                  onChange={(e) => setEditMotivo(e.target.value)}
                  className="border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-200"
                  placeholder="Describe brevemente por qué se realiza este estudio"
                  rows={3}
                />
                <span className="text-xs text-gray-400 mt-1">
                  Este texto se guardará y se mostrará al interpretar resultados.
                </span>
              </div>

              {studyFields.length === 0 ? (
                <p className="text-gray-600 text-sm">Este estudio no tiene campos configurados para edición.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {studyFields.map((field, idx) => (
                    <div key={`${field.name}-${idx}`} className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                      <input
                        value={editValues[field.name] ?? ''}
                        onChange={(e) => setEditValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                        className="border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-200"
                        placeholder={field.unit ? `Unidad: ${field.unit}` : ''}
                      />
                      {(field.reference) && (
                        <span className="text-xs text-gray-400 mt-1">Referencia: {field.reference}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <footer className="p-4 flex justify-end items-center border-t gap-3">
              <button
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setFormError(null);
                  const missing = studyFields.filter(f => (editValues[f.name] === undefined || editValues[f.name] === null || String(editValues[f.name]).trim() === ''));
                  if (missing.length > 0) {
                    setFormError(`Por favor completa: ${missing.map(m => m.label).join(', ')}`);
                    return;
                  }
                  setSaving(true);
                  try {
                    // Construir nuevo resultado_data preservando metadatos
                    const raw = typeof editingResult.resultado_data === 'string'
                      ? JSON.parse(editingResult.resultado_data as any)
                      : editingResult.resultado_data;
                    const updated = {
                      ...raw,
                      valores: editValues,
                      motivo_estudio: editMotivo // <- NUEVO: persistir en JSON
                    };

                    await updateResultadoConRetry(
                      editingResult.id,
                      updated,
                      1,
                      editMotivo?.trim() || null // <- NUEVO: persistir en columna
                    );

                    const updatedResult: GlobalResult = { ...editingResult, resultado_data: updated };
                    setLocalResults(prev => prev.map(r => r.id === editingResult.id ? updatedResult : r));
                    setEditingResult(updatedResult);
                    if (onResultUpdated) onResultUpdated(updatedResult);
                    toast.success('Resultado actualizado correctamente');
                    // Cerrar modal tras guardar
                    setIsEditOpen(false);
                  } catch (err: any) {
                    console.error('Error guardando edición:', err);
                    toast.error(`Error al guardar cambios: ${err.message}`);
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsTable;