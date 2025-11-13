import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';
import { Loader, ArrowLeft, User, Mail, Phone, Fingerprint, Home, Info } from 'lucide-react';
import { PatientDetails, Cita, ResultadoEliminado } from '@/types';

const PatientDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [patient, setPatient] = useState<PatientDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);


    useEffect(() => {
        fetchPatientDetails();
    }, [id]);

    const fetchPatientDetails = async () => {
        if (!id) return;
        setIsLoading(true);
        const { data, error } = await supabase.from('pacientes').select(`*, citas (*), resultados_eliminados (*)`).eq('id', id).single();
        if (error) console.error('Error fetching patient details:', error);
        else setPatient(data as PatientDetails);
        setIsLoading(false);
    };

    if (isLoading) return <div className="flex justify-center items-center h-full"><Loader className="animate-spin text-primary" size={48} /></div>;
    if (!patient) return <div className="text-center py-16 text-red-500"><h3 className="text-xl font-semibold">Paciente no encontrado.</h3></div>;

    return (
        <div>
            <Link to="/admin/patients" className="flex items-center text-primary hover:underline mb-6"><ArrowLeft size={18} className="mr-2" />Volver</Link>
            <div className="bg-white p-8 rounded-lg shadow-md mb-8">
                <div className="flex items-center mb-6">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mr-6"><User size={40} className="text-gray-500" /></div>
                    <div>
                        <h1 className="text-3xl font-bold text-dark">{patient.nombres} {patient.apellidos}</h1>
                        <p className="text-gray-500">ID de Paciente: {patient.id}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Información de Contacto</h3>
                        <p className="flex items-center"><Fingerprint size={16} className="mr-2 text-gray-400" /> Cédula: {patient.cedula_identidad}</p>
                        <p className="flex items-center mt-2"><Mail size={16} className="mr-2 text-gray-400" /> Email: {patient.email}</p>
                        <p className="flex items-center mt-2"><Phone size={16} className="mr-2 text-gray-400" /> Teléfono: {patient.telefono}</p>
                        <p className="flex items-center mt-2"><Home size={16} className="mr-2 text-gray-400" /> Dirección: {patient.direccion}</p>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <h2 className="text-2xl font-bold text-dark mb-4">Historial y Gestión</h2>
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <h3 className="font-semibold text-lg mb-4">Citas</h3>
                    <ul className="space-y-2">
                        {patient.citas.map((cita: Cita) => (
                            <li key={cita.id} className="p-2 border-b flex justify-between">
                                <span>{new Date(cita.fecha_cita).toLocaleString('es-VE')} - {cita.estudios_solicitados.join(', ')}</span>
                                <span className="font-semibold">{cita.status}</span>
                            </li>
                        ))}
                    </ul>

                    <h3 className="font-semibold text-lg mb-4 mt-8">Resultados</h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start">
                        <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-blue-800">
                            Gestión Centralizada de Resultados
                          </h4>
                          <p className="mt-1 text-sm text-blue-700">
                            Los resultados ahora se gestionan desde el módulo central "Resultados". Aquí se muestran solo los resultados eliminados para auditoría.
                          </p>
                          <div className="mt-3">
                            <Link
                              to="/admin/results"
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                            >
                              Ir al Módulo Resultados
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>

                    <h3 className="font-semibold text-lg mb-4 mt-8">Registro de Resultados Eliminados</h3>
                    <ul className="space-y-2">
                        {patient.resultados_eliminados.map((log: ResultadoEliminado) => (
                            <li key={log.id} className="p-2 border-b text-sm text-gray-500">
                                El resultado "{log.nombre_estudio}" fue eliminado el {new Date(log.fecha_eliminacion).toLocaleString('es-VE')}.
                            </li>
                        ))}
                    </ul>
                </div>

            </div>
        </div>
    );
};

// TODO: Crear el componente InterpretationModal y su lógica de aprobación/edición.

export default PatientDetailPage;
