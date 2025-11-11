import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/services/supabaseClient';
import { Loader, Search, UserPlus, Eye, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import PatientForm from '@/components/admin/PatientForm';
import { Patient } from '@/types';
import { useStatistics } from '@/context/StatisticsContext';
import { hasPermission, normalizeRole } from '@/utils/permissions';
import { logAudit } from '@/services/audit';

const PatientsAdminPage: React.FC = () => {
    const [allPatients, setAllPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [currentUserOverrides, setCurrentUserOverrides] = useState<Record<string, Record<string, boolean>>>({});
    const can = (action: string) => {
        const roleRaw = currentUserRole || 'Asistente';
        const roleNorm = normalizeRole(roleRaw);
        const overridesForModule = currentUserOverrides['PACIENTES'] || {};
        const allowed = hasPermission({ role: roleRaw, overrides: currentUserOverrides }, 'PACIENTES', action);
        console.groupCollapsed(`🔐 PermEval [PACIENTES] action=${action}`);
        console.log('• role_raw:', roleRaw);
        console.log('• role_norm:', roleNorm);
        console.log('• override(action):', overridesForModule[action]);
        console.log('• overrides_count(PACIENTES):', Object.keys(overridesForModule).length);
        console.log('• result:', allowed ? 'permitido' : 'bloqueado');
        console.groupEnd();
        return allowed;
    };
    const API_BASE = import.meta.env.VITE_API_BASE || '/api';
    const { refreshStats } = useStatistics();

    useEffect(() => {
        fetchPatients();
    }, []);

    useEffect(() => {
        // Cargar rol del usuario actual y overrides de permisos con tolerancia a fallos
        const loadAuth = async () => {
            try {
                const { data: auth, error: authError } = await supabase.auth.getUser();
                if (authError) throw authError;
                const user = auth?.user;
                const userId = user?.id;
                if (!userId) return;
                const metaRol = (user?.user_metadata as any)?.rol || null;
                let effectiveRole: string = metaRol || 'Asistente';
                const { data: profData, error: profErr } = await supabase
                    .from('user_profiles')
                    .select('rol')
                    .eq('user_id', userId)
                    .limit(1);
                if (!profErr && Array.isArray(profData) && profData.length > 0) {
                    effectiveRole = (profData[0] as any)?.rol || effectiveRole;
                }
                setCurrentUserRole(effectiveRole);
                console.groupCollapsed('👤 PACIENTES: Carga de rol y overrides');
                console.log('• user_id:', userId);
                console.log('• meta_rol:', metaRol);
                console.log('• effective_role:', effectiveRole);
                // Overrides
                try {
                    const resp = await fetch(`${API_BASE}/users/${userId}/permissions`);
                    if (resp.ok) {
                        const json = await resp.json();
                        const overrides: Record<string, Record<string, boolean>> = {};
                        (json.permissions || []).forEach((p: any) => {
                            if (!overrides[p.module]) overrides[p.module] = {};
                            overrides[p.module][p.action] = Boolean(p.allowed);
                        });
                        setCurrentUserOverrides(overrides || {});
                        console.log('• overrides(PACIENTES):', overrides['PACIENTES'] || {});
                        console.log('• overrides_total_modules:', Object.keys(overrides || {}).length);
                    }
                } catch (e) {
                    console.warn('No se pudieron cargar overrides de permisos', e);
                }
                console.groupEnd();
            } catch (e) {
                console.warn('No se pudo cargar rol del usuario en Pacientes', e);
                setCurrentUserRole((prev) => prev || 'Asistente');
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
                console.groupCollapsed('✏️ PACIENTES: Guardar edición de paciente');
                console.log('• patient_id:', patientData.id);
                console.log('• can("editar"):', can('editar'));
                const { id, ...dataToUpdate } = patientData;
                const { error } = await supabase.from('pacientes').update(dataToUpdate).eq('id', id);
                if (error) throw error;
                alert('Paciente actualizado con éxito.');
                await logAudit({
                    action: 'Actualizar',
                    module: 'PACIENTES',
                    entity: 'paciente',
                    entityId: id,
                    metadata: {
                        nombres: dataToUpdate.nombres,
                        apellidos: dataToUpdate.apellidos,
                        cedula_identidad: dataToUpdate.cedula_identidad,
                        telefono: dataToUpdate.telefono,
                        email: dataToUpdate.email,
                        direccion: dataToUpdate.direccion,
                        previo: editingPatient ? {
                            nombres: editingPatient.nombres,
                            apellidos: editingPatient.apellidos,
                            cedula_identidad: editingPatient.cedula_identidad,
                            telefono: editingPatient.telefono,
                            email: editingPatient.email,
                            direccion: editingPatient.direccion,
                        } : null,
                    },
                    success: true,
                });
                console.groupEnd();
            } else { // Creating
                console.groupCollapsed('🆕 PACIENTES: Crear nuevo paciente');
                const { data: newId, error: rpcError } = await supabase.rpc('generate_patient_id', {
                    nombre: patientData.nombres,
                    apellido: patientData.apellidos
                });
                if (rpcError) throw rpcError;

                const { error: insertError } = await supabase.from('pacientes').insert({ ...patientData, id: newId });
                if (insertError) throw insertError;
                alert('Paciente registrado con éxito.');
                await logAudit({
                    action: 'Crear',
                    module: 'PACIENTES',
                    entity: 'paciente',
                    entityId: newId,
                    metadata: {
                        nombres: patientData.nombres,
                        apellidos: patientData.apellidos,
                        cedula_identidad: patientData.cedula_identidad,
                        telefono: patientData.telefono,
                        email: patientData.email,
                        direccion: patientData.direccion,
                    },
                    success: true,
                });
                console.log('• new_patient_id:', newId);
                console.groupEnd();
            }
            
            setIsModalOpen(false);
            setEditingPatient(null);
            fetchPatients();
            refreshStats(); // ¡Aquí está la corrección!
        } catch (error: any) {
            console.error('❌ PACIENTES: Error al guardar paciente', error);
            await logAudit({
                action: patientData.id ? 'Actualizar' : 'Crear',
                module: 'PACIENTES',
                entity: 'paciente',
                entityId: patientData.id ?? null,
                metadata: {
                    nombres: patientData.nombres,
                    apellidos: patientData.apellidos,
                    cedula_identidad: patientData.cedula_identidad,
                    error: error?.message || String(error),
                },
                success: false,
            });
            alert(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-dark">Gestión de Pacientes</h1>
                <button
                    onClick={() => {
                        if (!can('crear')) {
                            console.warn('🚫 PACIENTES: Creación denegada', {
                                role: currentUserRole || 'Asistente',
                                overrides: currentUserOverrides['PACIENTES'] || {}
                            });
                            return;
                        }
                        setEditingPatient(null);
                        setIsModalOpen(true);
                    }}
                    className={`${!can('crear') ? 'bg-indigo-300 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark'} text-white px-4 py-2 rounded-md flex items-center`}
                    disabled={!can('crear')}
                    title={can('crear') ? 'Registrar Nuevo Paciente' : 'No autorizado'}
                >
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
                                                    if (!can('editar')) {
                                                        console.warn('🚫 PACIENTES: Edición denegada', {
                                                            patient_id: patient.id,
                                                            role: currentUserRole || 'Asistente',
                                                            overrides: currentUserOverrides['PACIENTES'] || {}
                                                        });
                                                        return;
                                                    }
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
