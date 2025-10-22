import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Search, Download, Eye, Loader, AlertCircle } from 'lucide-react';
import Logo from '../components/Logo';
import { supabasePublic as supabase } from '../src/services/supabaseClient';
import ResultViewer from '../components/admin/ResultViewer';
import TestimonialForm from '../components/TestimonialForm';
import { Study, Patient } from '../types';

// Definir tipos locales para los resultados
interface PatientResult {
  id: number;
  fecha_creacion: string;
  resultado_data: { 
    url?: string; 
    nombre_estudio?: string;
    tipo?: 'archivo' | 'manual';
  };
}

const PatientPortalPage: React.FC = () => {
    const [cedula, setCedula] = useState('');
    const [patient, setPatient] = useState<Patient | null>(null);
    const [results, setResults] = useState<PatientResult[]>([]);
    const [studies, setStudies] = useState<Study[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);
    const [viewingResult, setViewingResult] = useState<any>(null);
    const [testimonialStatus, setTestimonialStatus] = useState<'idle' | 'submitting' | 'submitted'>('idle');

    useEffect(() => {
        fetchStudies();
    }, []);

    const fetchStudies = async () => {
        const { data, error } = await supabase.from('estudios').select('*');
        if (error) {
            console.error("Error fetching studies:", error);
        } else if (data) {
            const formattedData: Study[] = data.map((item: any) => ({
                id: item.id.toString(),
                name: item.nombre,
                category: item.categoria,
                description: item.descripcion,
                preparation: item.preparacion,
                price: item.costo_usd,
                costo_bs: item.costo_bs,
                tasa_bcv: item.tasa_bcv,
                deliveryTime: item.tiempo_entrega,
                campos_formulario: item.campos_formulario,
            }));
            setStudies(formattedData);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSearched(true);
        setPatient(null);
        setResults([]);

        if (!cedula.trim()) {
            setError('Por favor, ingrese un número de cédula.');
            setIsLoading(false);
            return;
        }

        try {
            console.log(`Llamando a RPC get_patient_results_public con cédula: '${cedula.trim()}'`);
            const { data, error: rpcError } = await supabase.rpc('get_patient_results_public', {
                p_cedula: cedula.trim(),
            });

            console.log('Respuesta de Supabase (RPC):', { data, rpcError });

            if (rpcError) {
                console.error('Error en RPC:', rpcError);
                throw new Error('Ocurrió un error al buscar los resultados.');
            }

            if (!data || data.length === 0) {
                throw new Error('No se encontró ningún paciente o resultados con esa cédula de identidad.');
            }

            // Construimos el objeto completo del paciente a partir del primer resultado.
            const firstResult = data[0];
            const patientInfo: Patient = {
                id: firstResult.paciente_id,
                nombres: firstResult.paciente_nombres,
                apellidos: firstResult.paciente_apellidos,
                cedula_identidad: firstResult.paciente_cedula,
                email: firstResult.paciente_email,
                telefono: firstResult.paciente_telefono,
                direccion: firstResult.paciente_direccion,
            };
            setPatient(patientInfo);

            setResults(data);
            console.log(`Se encontraron ${data.length} resultados para ${patientInfo.nombres} ${patientInfo.apellidos}.`);

        } catch (err: any) {
            console.error('Error en handleSearch:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveTestimonial = async (data: { text: string; rating: number; studyName: string }) => {
        if (!patient) return;
        setTestimonialStatus('submitting');

        const { error } = await supabase.from('testimonios').insert({
            texto: data.text,
            rating: data.rating,
            autor: `${patient.nombres} ${patient.apellidos}`,
            ciudad: patient.direccion,
            estudio_realizado: data.studyName,
            is_approved: false
        });

        if (error) {
            alert(error.message);
            setTestimonialStatus('idle');
        } else {
            alert('¡Gracias por tu testimonio!');
            setTestimonialStatus('submitted');
        }
    };

    const handleViewResult = (result: PatientResult) => {
        if (result.resultado_data.tipo === 'manual') {
            const studyForRes = studies.find(s => s.name === result.resultado_data.nombre_estudio);
            setViewingResult({ ...result, study_details: studyForRes });
        } else if (result.resultado_data.url) {
            window.open(result.resultado_data.url, '_blank');
        }
    };

    const renderResults = () => {
        // ... (código de renderizado de errores y carga) ...

        if (patient && results.length > 0) {
            return (
                 <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6 md:p-8">
                        <h2 className="text-2xl font-semibold text-primary mb-6">Resultados de: <span className="font-bold">{patient.nombres} {patient.apellidos}</span></h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b-2 border-gray-200">
                                    <tr>
                                        <th className="py-3 px-4 font-semibold text-gray-600">Fecha</th>
                                        <th className="py-3 px-4 font-semibold text-gray-600">Estudio</th>
                                        <th className="py-3 px-4 font-semibold text-gray-600 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((result) => (
                                        <tr key={result.id} className="border-b border-gray-100 hover:bg-light">
                                            <td className="py-4 px-4 text-gray-700">{new Date(result.fecha_creacion).toLocaleDateString('es-ES')}</td>
                                            <td className="py-4 px-4 font-medium text-dark">{result.resultado_data?.nombre_estudio || 'Resultado General'}</td>
                                            <td className="py-4 px-4">
                                                <div className="flex justify-center items-center">
                                                    <button onClick={() => handleViewResult(result)} className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full transition-colors" title="Ver Resultado"><Eye size={20} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="bg-light min-h-[80vh] py-12">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="w-full max-w-2xl mx-auto p-8 space-y-8 bg-white rounded-xl shadow-lg">
                    <div className="text-center">
                        <Link to="/" className="inline-block mb-6">
                            <Logo className="h-16 mx-auto"/>
                        </Link>
                        <h1 className="text-2xl md:text-3xl font-bold text-dark">Portal de Pacientes</h1>
                        <p className="mt-2 text-gray-600">Consulta tus resultados ingresando tu número de cédula.</p>
                    </div>
                    <form className="mt-8 space-y-6" onSubmit={handleSearch}>
                        <div className="relative">
                            <label htmlFor="cedula" className="sr-only">Cédula de Identidad</label>
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                id="cedula"
                                name="cedula"
                                type="text"
                                required
                                value={cedula}
                                onChange={(e) => setCedula(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                                placeholder="Ingresa tu número de cédula"
                            />
                        </div>
                        <div>
                            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400">
                                {isLoading ? <Loader className="animate-spin mr-2" /> : <Search className="mr-2" />}
                                Buscar Resultados
                            </button>
                        </div>
                    </form>
                </div>

                <div className="w-full max-w-4xl mx-auto mt-12">
                    {searched && renderResults()}
                    {patient && results.length > 0 && testimonialStatus !== 'submitted' && (
                        <TestimonialForm
                            studies={results}
                            onSubmit={handleSaveTestimonial}
                            isLoading={testimonialStatus === 'submitting'}
                        />
                    )}
                    {testimonialStatus === 'submitted' && (
                        <div className="text-center p-8 bg-green-100 text-green-800 rounded-lg mt-12">
                            ¡Tu testimonio ha sido enviado con éxito!
                        </div>
                    )}
                </div>
            </div>
            {viewingResult && patient && (
                <ResultViewer
                    patient={patient}
                    result={viewingResult}
                    onClose={() => setViewingResult(null)}
                />
            )}
        </div>
    );
};

export default PatientPortalPage;
