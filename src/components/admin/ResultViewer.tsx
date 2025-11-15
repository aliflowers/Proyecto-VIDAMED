import React, { useState, useEffect } from 'react';
import { Printer, X, BrainCircuit } from 'lucide-react';
import Logo from '@/components/Logo';
import InterpretationViewerModal from '@/components/InterpretationViewerModal';
import { supabasePublic as supabase } from '@/services/supabaseClient';

import { ResultadoPaciente, ResultadoDataManual } from '@/types';
interface Patient {
    id: string | number;
    nombres: string;
    apellidos: string;
    cedula_identidad: string;
    email: string;
    telefono: string;
    direccion?: string;
}

interface Study {
    id: string;
    name: string;
    campos_formulario?: { name: string; label: string; unit?: string; reference?: string }[];
}

interface ResultViewerProps {
    patient: Patient;
    result: ResultadoPaciente;
    onClose: () => void;
}

// Type guard para verificar si el resultado es manual
const isManualResult = (data: any): data is ResultadoDataManual => {
    return data && data.tipo === 'manual' && typeof data.valores === 'object';
};

const ResultViewer: React.FC<ResultViewerProps> = ({ patient, result, onClose }) => {
    const [isInterpretationOpen, setIsInterpretationOpen] = useState(false);
    const [studyDetails, setStudyDetails] = useState<Study | null>(null);
    const [loadingStudy, setLoadingStudy] = useState(true);

    // Normaliza el arreglo de campos del estudio para garantizar keys consistentes
    const normalizeCamposFormulario = (campos: any): { name: string; label: string; unit?: string; reference?: string }[] => {
        let raw = campos;
        if (!raw) return [];
        if (typeof raw === 'string') {
            try {
                raw = JSON.parse(raw);
            } catch {
                return [];
            }
        }
        if (!Array.isArray(raw)) return [];
        return raw
            .map((campo: any) => ({
                name: campo?.name ?? campo?.nombre ?? '',
                label: campo?.label ?? campo?.etiqueta ?? campo?.name ?? campo?.nombre ?? '',
                unit: campo?.unit ?? campo?.unidad,
                reference: campo?.reference ?? campo?.valor_referencial,
            }))
            .filter((f: any) => !!f.name);
    };

    // Obtiene una versión segura y normalizada de resultado_data para resultados manuales
    const getManualData = (): ResultadoDataManual | null => {
        const raw = typeof result.resultado_data === 'string'
            ? (() => { try { return JSON.parse(result.resultado_data as any); } catch { return null; } })()
            : result.resultado_data;
        if (!raw) return null;
        return isManualResult(raw) ? raw : null;
    };

    // Extrae un mapa plano de valores, aplanando posibles anidamientos { valores: { ... } }
    const extractValores = (md: ResultadoDataManual | null): Record<string, any> => {
        if (!md || typeof md.valores !== 'object' || md.valores === null) return {};
        const v: any = md.valores;
        if (v && typeof v === 'object' && 'valores' in v && typeof v.valores === 'object' && v.valores !== null) {
            return v.valores as Record<string, any>;
        }
        return v as Record<string, any>;
    };

    const handlePrint = () => {
        const printContents = document.getElementById('printable-result')?.innerHTML;
        const originalContents = document.body.innerHTML;
        if (printContents) {
            document.body.innerHTML = printContents;
            window.print();
            document.body.innerHTML = originalContents;
            // Recargar la página para restaurar los event listeners de React
            window.location.reload();
        }
    };

    // Cargar detalles del estudio cuando el modal se abre
    useEffect(() => {
        const loadStudyDetails = async () => {
            // Si el result viene con study_details pre-cargado (PatientPortal), lo usamos directamente
            const sd: any = (result as any)?.study_details;
            if (sd) {
                const formatted: Study = {
                    id: sd.id?.toString?.() ?? sd.id ?? '',
                    name: sd.name ?? sd.nombre ?? '',
                    campos_formulario: normalizeCamposFormulario(sd.campos_formulario)
                };
                setStudyDetails(formatted);
                setLoadingStudy(false);
                return;
            }

            if (!result.estudio_id) {
                console.warn('No estudio_id found in result:', result);
                setLoadingStudy(false);
                return;
            }

            setLoadingStudy(true);
            try {
                const { data, error } = await supabase
                    .from('estudios')
                    .select('id, nombre, campos_formulario')
                    .eq('id', result.estudio_id)
                    .single();

                if (error) {
                    console.error('Error loading study details:', error);
                    setLoadingStudy(false);
                    return;
                }

                if (data) {
                    const formattedStudy: Study = {
                        id: data.id.toString(),
                        name: data.nombre,
                        campos_formulario: normalizeCamposFormulario(data.campos_formulario)
                    };
                    setStudyDetails(formattedStudy);
                }
            } catch (error) {
                console.error('Failed to load study details:', error);
            } finally {
                setLoadingStudy(false);
            }
        };

        loadStudyDetails();
    }, [result.estudio_id, (result as any)?.study_details]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                <header className="p-4 flex justify-between items-center border-b">
                    <h2 className="text-xl font-bold">Visualizador de Resultados</h2>
                    <div>
                        <button onClick={handlePrint} className="p-2 hover:bg-gray-200 rounded-full mr-2"><Printer size={20} /></button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
                    </div>
                </header>
                <div className="p-8 overflow-y-auto">
                    <div id="printable-result">
                        <header className="flex justify-between items-center mb-8">
                            <Logo className="h-16" />
                            <div>
                                <h1 className="text-2xl font-bold text-right">Resultados del Examen</h1>
                                <p className="text-right text-gray-500">Fecha: {new Date(result.fecha_creacion).toLocaleDateString('es-VE')}</p>
                            </div>
                        </header>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 border-y py-4 my-4">
                            <p><strong>Paciente:</strong> {patient.nombres} {patient.apellidos}</p>
                            <p><strong>ID Paciente:</strong> {patient.id}</p>
                            <p><strong>Cédula:</strong> {patient.cedula_identidad}</p>
                            <p><strong>Teléfono:</strong> {patient.telefono}</p>
                            <p><strong>Email:</strong> {patient.email}</p>
                            <p><strong>Dirección:</strong> {patient.direccion}</p>
                            {(() => { 
                                const col = (result as any)?.motivo_estudio;
                                const md = getManualData();
                                const json = md?.motivo_estudio;
                                const motivo = (typeof col === 'string' && col.trim()) ? col.trim() : (typeof json === 'string' ? json.trim() : '');
                                return motivo ? (
                                    <p className="col-span-2"><strong>Motivo del Estudio:</strong> {motivo}</p>
                                ) : null;
                            })()}
                        </div>
                        <h2 className="text-xl font-bold text-primary text-center my-6">{studyDetails?.name || 'Detalles del Estudio'}</h2>
                        {loadingStudy ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">Cargando detalles del estudio...</p>
                            </div>
                        ) : (studyDetails?.campos_formulario && studyDetails.campos_formulario.length > 0) ? (
                            // Renderizado para estudios con campos de formulario definidos
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 font-semibold">Prueba</th>
                                        <th className="p-3 font-semibold">Resultado</th>
                                        <th className="p-3 font-semibold">Unidades</th>
                                        <th className="p-3 font-semibold">Valores de Referencia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                   {studyDetails.campos_formulario.map((field: any, index: number) => {
                                       const manualData = getManualData();
                                       const valoresPlano = extractValores(manualData);
                                       const displayed = valoresPlano?.[field.name];
                                       return (
                                           <tr key={`${field.name}-${index}`} className="border-b">
                                                <td className="p-3">{field.label || field.name}</td>
                                                <td className="p-3 font-bold">{displayed !== undefined && displayed !== null && displayed !== '' ? String(displayed) : '-'}</td>
                                                <td className="p-3">{field.unit || 'N/A'}</td>
                                                <td className="p-3 text-gray-600">{field.reference || 'N/A'}</td>
                                            </tr>
                                       );
                                    })}
                                </tbody>
                            </table>
                        ) : (() => { const md = getManualData(); return !!(md && Object.keys(md.valores || {}).length > 0); })() ? (
                            // Renderizado para resultados manuales sin campos de formulario definidos
                            <>
                                <p className="text-sm text-gray-600 mb-4 text-center">Este estudio no tiene campos predefinidos, mostrando los valores ingresados manualmente:</p>
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-3 font-semibold">Prueba</th>
                                            <th className="p-3 font-semibold">Resultado</th>
                                            <th className="p-3 font-semibold">Unidades</th>
                                            <th className="p-3 font-semibold">Valores de Referencia</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => { const md = getManualData(); const valoresPlano = extractValores(md); return Object.entries(valoresPlano || {}); })().map(([key, value]: [string, any]) => (
                                            <tr key={key} className="border-b">
                                                <td className="p-3 capitalize">{key.replace(/_/g, ' ')}</td>
                                                <td className="p-3 font-bold">{String(value) || '-'}</td>
                                                <td className="p-3">N/A</td>
                                                <td className="p-3 text-gray-600">N/A</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        ) : (
                            // Fallback si no hay nada que mostrar
                            <div className="text-center py-8 border rounded-lg">
                                <p className="text-gray-500">No hay resultados disponibles para mostrar para este estudio.</p>
                            </div>
                        )}

                        {result.analisis_estado === 'aprobado' && !!(result as any)?.analisis_ia && (
                            <div className="mt-8 text-center">
                                <button 
                                    onClick={() => setIsInterpretationOpen(true)}
                                    className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark flex items-center mx-auto"
                                >
                                    <BrainCircuit size={20} className="mr-2" />
                                    Ver Interpretación de Resultados
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {isInterpretationOpen && (
                <InterpretationViewerModal
                    interpretation={(result as any)?.analisis_ia || ''}
                    onClose={() => setIsInterpretationOpen(false)}
                />
            )}
        </div>
    );
};

export default ResultViewer;