import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/services/supabaseClient';
import { Loader, Search, UserPlus, Eye, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import PatientForm from '@/components/admin/PatientForm';
import { Patient } from '@/types';
import { useStatistics } from '@/context/StatisticsContext';
import { hasPermission } from '@/utils/permissions';

const PatientsAdminPage: React.FC = () => {
    const [allPatients, setAllPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [currentUserOverrides, setCurrentUserOverrides] = useState<Record<string, Record<string, boolean>>>({});
    const can = (action: string) => hasPermission({ role: currentUserRole || 'Asistente', overrides: currentUserOverrides }, 'PACIENTES', action);
    const { refreshStats } = useStatistics();

    useEffect(() => {
        fetchPatients();
    }, []);

    useEffect(() => {
        // Cargar rol del usuario actual y overrides de permisos
        const loadAuth = async () => {
            const { data: auth } = await supabase.auth.getUser();
            const user = auth?.user;
            if (!user) return;
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('rol')
                .eq('user_id', user.id)
                .maybeSingle();
            setCurrentUserRole(profile?.rol || null);
            try {
                const base = (import.meta as any).env?.VITE_API_BASE || '';
                const res = await fetch(`${base}/api/permissions/overrides?user_id=${user.id}`);
                if (res.ok) {
                    const json = await res.json();
                    setCurrentUserOverrides(json || {});
                }
            } catch (e) {
                console.warn('No se pudieron cargar overrides de permisos', e);
            }
        };
        loadAuth();
    }, []);

    const fetchPatients = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('pacientes').select('*').order('apellidos');
        if (error) {
            alert(error.message);
        } else {
            setAllPatients(data as Patient[]);
        }
        setIsLoading(false);
    };

    const filteredPatients = useMemo(() => {
        if (!searchTerm) return allPatients;
        return allPatients.filter(p =>
            p.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.cedula_identidad.includes(searchTerm)
        );
    }, [searchTerm, allPatients]);

    const handleSavePatient = async (patientData: Partial<Patient>) => {
        setIsLoading(true);
        
        try {
            if (patientData.id) { // Editing
                const { id, ...dataToUpdate } = patientData;
                const { error } = await supabase.from('pacientes').update(dataToUpdate).eq('id', id);
                if (error) throw error;
                alert('Paciente actualizado con éxito.');
            } else { // Creating
                const { data: newId, error: rpcError } = await supabase.rpc('generate_patient_id', {
                    nombre: patientData.nombres,
                    apellido: patientData.apellidos
                });
                if (rpcError) throw rpcError;

                const { error: insertError } = await supabase.from('pacientes').insert({ ...patientData, id: newId });
                if (insertError) throw insertError;
                alert('Paciente registrado con éxito.');
            }
            
            setIsModalOpen(false);
            setEditingPatient(null);
            fetchPatients();
            refreshStats(); // ¡Aquí está la corrección!
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-dark">Gestión de Pacientes</h1>
                <button onClick={() => { setEditingPatient(null); setIsModalOpen(true); }} className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark flex items-center">
                    <UserPlus size={20} className="mr-2" />
                    Registrar Nuevo Paciente
                </button>
            </div>

            <div className="mb-6 relative">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre, apellido o cédula..."
                    className="w-full p-2 pl-10 border rounded-md"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="bg-white shadow-md rounded-lg max-h-[600px] overflow-auto">
                <table className="min-w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="py-3 px-6 text-left">Nombre Completo</th>
                            <th className="py-3 px-6 text-left">Cédula</th>
                            <th className="py-3 px-6 text-left">Teléfono</th>
                            <th className="py-3 px-6 text-left">Email</th>
                            <th className="py-3 px-6 text-left max-w-xs">Dirección</th>
                            <th className="py-3 px-6 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {isLoading ? (
                            <tr><td colSpan={6} className="text-center py-8"><Loader className="animate-spin mx-auto" /></td></tr>
                        ) : (
                            filteredPatients.map(patient => (
                                <tr key={patient.id}>
                                    <td className="py-4 px-6 font-medium">{patient.nombres} {patient.apellidos}</td>
                                    <td className="py-4 px-6">{patient.cedula_identidad}</td>
                                    <td className="py-4 px-6">{patient.telefono}</td>
                                    <td className="py-4 px-6">{patient.email}</td>
                                    <td className="py-4 px-6 max-w-xs truncate">{patient.direccion}</td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-center gap-4">
                                            <button
                                                onClick={() => {
                                                    if (!can('editar')) return;
                                                    setEditingPatient(patient);
                                                    setIsModalOpen(true);
                                                }}
                                                className={`${!can('editar') ? 'text-indigo-300 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-900'}`}
                                                title={can('editar') ? 'Editar' : 'No autorizado'}
                                                disabled={!can('editar')}
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <Link to={`/admin/patients/${patient.id}`} className="text-blue-600 hover:text-blue-900">
                                                <Eye size={18} />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <PatientForm
                    patient={editingPatient}
                    onSave={handleSavePatient}
                    onCancel={() => { setIsModalOpen(false); setEditingPatient(null); }}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
};

export default PatientsAdminPage;
