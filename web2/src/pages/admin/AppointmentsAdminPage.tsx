import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/services/supabaseClient';
import { Appointment } from '@/types';
import { Loader, Edit, CheckSquare, XSquare, Search } from 'lucide-react';
import { DayPicker, SelectMultipleEventHandler } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { hasPermission, normalizeRole } from '@/utils/permissions';
import { logAudit } from '@/services/audit';
import { apiFetch } from '@/services/apiFetch';

const RescheduleModal: React.FC<{ appointment: Appointment, onSave: (id: number, newDate: string) => void, onCancel: () => void }> = ({ appointment, onSave, onCancel }) => {
    const [newDateTime, setNewDateTime] = useState(appointment.fecha_cita.substring(0, 16));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(appointment.id, newDateTime);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6">Reagendar Cita</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p>Paciente: <strong>{appointment.pacientes?.nombres} {appointment.pacientes?.apellidos}</strong></p>
                    <div>
                        <label htmlFor="newDateTime" className="block text-sm font-medium text-gray-700">Nueva Fecha y Hora</label>
                        <input
                            type="datetime-local"
                            id="newDateTime"
                            value={newDateTime}
                            onChange={(e) => setNewDateTime(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                        />
                    </div>
                    <div className="flex justify-end space-x-4 mt-6">
                        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AppointmentsAdminPage: React.FC = () => {
    const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [unavailableDays, setUnavailableDays] = useState<Date[]>([]);
    const [filters, setFilters] = useState({ searchTerm: '', status: 'all', location: 'all' });

    // Estado para gestión de horarios por día
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [slotsError, setSlotsError] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [unavailableSlots, setUnavailableSlots] = useState<string[]>([]);
    const [isDayBlocked, setIsDayBlocked] = useState<boolean>(false);
    const [togglingSlot, setTogglingSlot] = useState<string | null>(null);

    // Permisos (CITAS)
    const [currentUserRole, setCurrentUserRole] = useState<string>('Asistente');
    const [currentUserOverrides, setCurrentUserOverrides] = useState<Record<string, Record<string, boolean>>>({});
    const [currentUserSede, setCurrentUserSede] = useState<string | null>(null);
    const API_BASE = import.meta.env.VITE_API_BASE || '/api';
    const can = (action: string) => {
        const roleRaw = currentUserRole || 'Asistente';
        const roleNorm = normalizeRole(roleRaw);
        const overridesForModule = currentUserOverrides['CITAS'] || {};
        const bypass = roleNorm === 'Administrador';
        const allowed = bypass ? true : hasPermission({ role: roleNorm, overrides: currentUserOverrides }, 'CITAS', action);
        console.groupCollapsed(`🔐 PermEval [CITAS] action=${action}`);
        console.log('• role_raw:', roleRaw);
        console.log('• role_norm:', roleNorm, 'bypass_admin:', bypass);
        console.log('• override(action):', overridesForModule[action]);
        console.log('• overrides_count(CITAS):', Object.keys(overridesForModule).length);
        console.log('• result:', allowed ? 'permitido' : 'bloqueado');
        console.groupEnd();
        return allowed;
    };

    useEffect(() => {
        const fetchRoleAndOverrides = async () => {
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError) throw authError;
                const userId = user?.id;
                if (!userId) return;
                const metaRol = (user?.user_metadata as any)?.rol || null;
                let effectiveRole: string = metaRol || 'Asistente';
                const { data: profData, error: profErr } = await supabase
                    .from('user_profiles')
                    .select('rol, sede')
                    .eq('user_id', userId)
                    .limit(1);
                if (!profErr && Array.isArray(profData) && profData.length > 0) {
                    const prof = profData[0] as any;
                    effectiveRole = prof?.rol || effectiveRole;
                    setCurrentUserSede(prof?.sede || null);
                }
                setCurrentUserRole(effectiveRole);
                if (API_BASE) {
                    try {
                        const resp = await apiFetch(`${API_BASE}/users/${userId}/permissions`);
                        if (resp.ok) {
                            const json = await resp.json();
                            const overrides: Record<string, Record<string, boolean>> = {};
                            (json.permissions || []).forEach((p: any) => {
                                if (!overrides[p.module]) overrides[p.module] = {};
                                overrides[p.module][p.action] = Boolean(p.allowed);
                            });
                            setCurrentUserOverrides(overrides || {});
                        }
                    } catch (e) {
                        // Ignorar errores de overrides
                    }
                }
                console.groupCollapsed('👤 CITAS: Carga de rol, sede y overrides');
                console.log('• user_id:', userId);
                console.log('• meta_rol:', metaRol);
                console.log('• effective_role:', effectiveRole);
                console.log('• sede:', currentUserSede);
                console.log('• overrides(CITAS):', (currentUserOverrides || {})['CITAS'] || {});
                console.log('• overrides_total_modules:', Object.keys(currentUserOverrides || {}).length);
                console.groupEnd();
            } catch (e) {
                console.error('[CITAS] Error cargando permisos:', e);
                setCurrentUserRole((prev) => prev || 'Asistente');
            }
        };
        fetchRoleAndOverrides();
    }, []);

    // Restricción por sede: Lic. y Asistente solo pueden actuar sobre citas de su sede
    const isBranchAllowedForAppointment = (app: Appointment) => {
        const roleRaw = currentUserRole || 'Asistente';
        const roleNorm = normalizeRole(roleRaw);
        if (roleNorm === 'Lic.' || roleNorm === 'Asistente') {
            if (!currentUserSede) {
                console.warn('🏷️ CITAS: Sede no establecida para usuario', { roleNorm });
                return false;
            }
            const allowedBranch = app.ubicacion === currentUserSede;
            if (!allowedBranch) {
                console.warn('🚫 CITAS: Sede no coincide', { appLocation: app.ubicacion, userSede: currentUserSede, roleNorm });
            }
            return allowedBranch;
        }
        return true;
    };

    // Permiso efectivo por acción considerando sede y rol
    const isAppointmentActionAllowed = (app: Appointment, action: string) => {
        const roleNorm = normalizeRole(currentUserRole || 'Asistente');
        let result: boolean;
        if (roleNorm === 'Lic.') {
            result = can(action) && isBranchAllowedForAppointment(app);
        } else if (roleNorm === 'Asistente') {
            // Para asistentes, permitir si es su sede, aunque el permiso global esté desmarcado
            result = isBranchAllowedForAppointment(app);
        } else {
            result = can(action);
        }
        console.groupCollapsed(`🎛️ CITAS: Decision action=${action} id=${app.id}`);
        console.log('• role_norm:', roleNorm);
        console.log('• app_location:', app.ubicacion);
        console.log('• user_sede:', currentUserSede);
        console.log('• decision:', result ? 'permitido' : 'bloqueado');
        console.groupEnd();
        return result;
    };

    // Mensajes “No autorizado”
    const [denied, setDenied] = useState<Record<number, Record<string, boolean>>>({});
    const markDenied = (id: number, action: string) => {
        setDenied(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [action]: true } }));
        setTimeout(() => setDenied(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [action]: false } })), 3000);
    };
    const [deniedAvailability, setDeniedAvailability] = useState<boolean>(false);

    useEffect(() => {
        fetchAppointments();
        fetchUnavailableDays();
    }, []);

    const fetchAppointments = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('citas')
            .select(`id, fecha_cita, ubicacion, estudios_solicitados, status, pacientes (nombres, apellidos, cedula_identidad, telefono)`)
            .order('fecha_cita', { ascending: false });

        if (error) {
            console.error('Error fetching appointments:', error);
            setError('No se pudieron cargar las citas.');
        } else {
            const formattedData = data.map(item => ({
                ...item,
                pacientes: Array.isArray(item.pacientes) ? item.pacientes[0] : item.pacientes,
            })) as Appointment[];
            setAllAppointments(formattedData);
        }
        setIsLoading(false);
    };

    const filteredAppointments = useMemo(() => {
        return allAppointments.filter(app => {
            const matchesStatus = filters.status === 'all' || app.status === filters.status;
            const matchesLocation = filters.location === 'all' || app.ubicacion === filters.location;
            const searchTermLower = filters.searchTerm.toLowerCase();
            const matchesSearch = filters.searchTerm === '' ||
                app.pacientes?.nombres.toLowerCase().includes(searchTermLower) ||
                app.pacientes?.apellidos.toLowerCase().includes(searchTermLower) ||
                app.pacientes?.cedula_identidad.includes(searchTermLower);
            
            return matchesStatus && matchesLocation && matchesSearch;
        });
    }, [filters, allAppointments]);

    const fetchUnavailableDays = async () => {
        const { data, error } = await supabase.from('dias_no_disponibles').select('fecha');
        if (error) {
            console.error('Error fetching unavailable days:', error);
        } else {
            const utcDates = data.map(d => {
                const date = new Date(d.fecha);
                return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
            });
            setUnavailableDays(utcDates);
        }
    };

    const handleDaySelection: SelectMultipleEventHandler = async (days, selectedDay) => {
        const wasSelected = unavailableDays.some(d => isSameDay(d, selectedDay));
        setUnavailableDays(days || []);
        // Guardar día actualmente seleccionado para mostrar horarios
        setSelectedDate(selectedDay);
        const formattedDate = format(selectedDay, 'yyyy-MM-dd');
        let error;
        if (wasSelected) {
            ({ error } = await supabase.from('dias_no_disponibles').delete().eq('fecha', formattedDate));
            await logAudit({ action: 'Desbloquear día', module: 'Citas', entity: 'dias_no_disponibles', entityId: null, metadata: { fecha: formattedDate }, success: !error });
        } else {
            ({ error } = await supabase.from('dias_no_disponibles').insert({ fecha: formattedDate }));
            await logAudit({ action: 'Bloquear día', module: 'Citas', entity: 'dias_no_disponibles', entityId: null, metadata: { fecha: formattedDate }, success: !error });
        }
        if (error) {
            alert(`Error al actualizar la disponibilidad: ${error.message}`);
            fetchUnavailableDays();
        }

        // Cargar horarios para el día clicado
        await loadSlotsForDate(selectedDay);
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        const { error } = await supabase.from('citas').update({ status }).eq('id', id);
        if (error) alert(error.message);
        else fetchAppointments();
        await logAudit({ action: 'Actualizar estado', module: 'Citas', entity: 'citas', entityId: id, metadata: { status }, success: !error });
    };

    const handleReschedule = async (id: number, newDate: string) => {
        const localDate = new Date(newDate);
        const isoStringInVenezuelaTime = `${format(localDate, 'yyyy-MM-dd\'T\'HH:mm:ss')}-04:00`;
        const { error } = await supabase.from('citas').update({ fecha_cita: isoStringInVenezuelaTime }).eq('id', id);
        if (error) {
            alert(error.message);
        } else {
            setEditingAppointment(null);
            fetchAppointments();
        }
        await logAudit({ action: 'Reagendar', module: 'Citas', entity: 'citas', entityId: id, metadata: { nueva_fecha: isoStringInVenezuelaTime }, success: !error });
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const getLocationForAvailability = () => {
        // Si el filtro está en 'all', usar el nombre estándar de la sede principal
        return filters.location === 'all' ? 'Sede Principal Maracay' : filters.location;
    };

    const loadSlotsForDate = async (dateObj: Date) => {
        try {
            setSlotsLoading(true);
            setSlotsError(null);
            const date = format(dateObj, 'yyyy-MM-dd');
            const location = getLocationForAvailability();
            const url = `/api/availability/slots?date=${encodeURIComponent(date)}&location=${encodeURIComponent(location)}`;
            const res = await apiFetch(url);
            if (!res.ok) throw new Error(`Error consultando horarios: ${res.status}`);
            const json = await res.json();
            setAvailableSlots(Array.isArray(json.available) ? json.available : []);
            setUnavailableSlots(Array.isArray(json.unavailable) ? json.unavailable : []);
            setIsDayBlocked(Boolean(json.isDayBlocked));
        } catch (e: any) {
            console.error('[admin] Error cargando slots:', e);
            setSlotsError(e?.message || 'No se pudieron cargar los horarios.');
            setAvailableSlots([]);
            setUnavailableSlots([]);
            setIsDayBlocked(false);
        } finally {
            setSlotsLoading(false);
        }
    };

    useEffect(() => {
        // Cuando cambie la ubicación o el día seleccionado, recargar slots
        if (selectedDate) {
            loadSlotsForDate(selectedDate);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.location]);

    const toggleSlotAvailability = async (slot: string) => {
        if (!selectedDate) return;
        const date = format(selectedDate, 'yyyy-MM-dd');
        const location = getLocationForAvailability();
        try {
            setTogglingSlot(slot);
            const isCurrentlyAvailable = availableSlots.includes(slot);
            const endpoint = '/api/availability/block';
            const options: RequestInit = {
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ date, slot, location }),
            };
            let res: Response;
            if (isCurrentlyAvailable) {
                // Bloquear horario
                res = await apiFetch(endpoint, { ...options, method: 'POST' });
            } else {
                // Desbloquear horario
                res = await apiFetch(endpoint, { ...options, method: 'DELETE' });
            }
            if (!res.ok) {
                const text = await res.text();
                await logAudit({ action: isCurrentlyAvailable ? 'Bloquear horario' : 'Desbloquear horario', module: 'Citas', entity: 'disponibilidad_horarios', entityId: null, metadata: { fecha: date, slot, ubicacion: location, response_status: res.status }, success: false });
                throw new Error(text || 'Fallo actualizando disponibilidad');
            }
            await logAudit({ action: isCurrentlyAvailable ? 'Bloquear horario' : 'Desbloquear horario', module: 'Citas', entity: 'disponibilidad_horarios', entityId: null, metadata: { fecha: date, slot, ubicacion: location }, success: true });
            // Recargar slots tras éxito
            await loadSlotsForDate(selectedDate);
        } catch (e: any) {
            console.error('[admin] Error toggling slot:', e);
            alert(`Error actualizando disponibilidad: ${e?.message || 'Error desconocido'}`);
        } finally {
            setTogglingSlot(null);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader className="animate-spin text-primary" size={48} /></div>;
    }

    if (error) {
        return <div className="text-center py-16 text-red-500"><h3 className="text-xl font-semibold">{error}</h3></div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-dark mb-6">Gestión de Citas</h1>
            <div className="mb-6 p-4 bg-white rounded-lg shadow-md flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                    <input type="text" name="searchTerm" value={filters.searchTerm} onChange={handleFilterChange} placeholder="Buscar por paciente o cédula..." className="w-full p-2 pl-10 border rounded-md" />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                <select name="status" value={filters.status} onChange={handleFilterChange} className="p-2 border rounded-md">
                    <option value="all">Todos los Estados</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Confirmada">Confirmada</option>
                    <option value="Cancelada">Cancelada</option>
                </select>
                <select name="location" value={filters.location} onChange={handleFilterChange} className="p-2 border rounded-md">
                    <option value="all">Todas las Ubicaciones</option>
                    <option value="Sede Principal">Sede Principal</option>
                    <option value="Servicio a Domicilio">Servicio a Domicilio</option>
                </select>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3 px-6 text-left">Paciente</th>
                                <th className="py-3 px-6 text-left">Fecha y Hora</th>
                                <th className="py-3 px-6 text-left">Ubicación</th>
                                <th className="py-3 px-6 text-center">Estado</th>
                                <th className="py-3 px-6 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredAppointments.map(app => (
                                <tr key={app.id}>
                                    <td className="py-4 px-6 font-medium">{app.pacientes?.nombres} {app.pacientes?.apellidos}</td>
                                    <td className="py-4 px-6">{new Date(app.fecha_cita).toLocaleString('es-VE', { timeZone: 'America/Caracas' })}</td>
                                    <td className="py-4 px-6">{app.ubicacion}</td>
                                    <td className="py-4 px-6 text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            app.status === 'Confirmada' ? 'bg-green-100 text-green-800' :
                                            app.status === 'Cancelada' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {app.status || 'Pendiente'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <button
                                            onClick={() => {
                                                if (!isAppointmentActionAllowed(app, 'reprogramar')) { console.warn('🚫 CITAS: Reagendar denegado', { id: app.id, role: currentUserRole || 'Asistente', sede: currentUserSede }); markDenied(app.id, 'reprogramar'); return; }
                                                setEditingAppointment(app);
                                            }}
                                            className={`mr-4 ${!isAppointmentActionAllowed(app, 'reprogramar') ? 'text-indigo-300 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-900'}`}
                                            title="Reagendar"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        {denied[app.id]?.reprogramar && (
                                            <span className="ml-1 text-[10px] text-red-600">No está autorizado</span>
                                        )}
                                        <button
                                            onClick={() => {
                                                if (!isAppointmentActionAllowed(app, 'confirmar')) { console.warn('🚫 CITAS: Confirmar denegado', { id: app.id, role: currentUserRole || 'Asistente', sede: currentUserSede }); markDenied(app.id, 'confirmar'); return; }
                                                handleUpdateStatus(app.id, 'Confirmada');
                                            }}
                                            className={`mr-4 ${!isAppointmentActionAllowed(app, 'confirmar') ? 'text-green-300 cursor-not-allowed' : 'text-green-600 hover:text-green-900'}`}
                                            title="Confirmar"
                                        >
                                            <CheckSquare size={18} />
                                        </button>
                                        {denied[app.id]?.confirmar && (
                                            <span className="ml-1 text-[10px] text-red-600">No está autorizado</span>
                                        )}
                                        <button
                                            onClick={() => {
                                                if (!isAppointmentActionAllowed(app, 'cancelar')) { console.warn('🚫 CITAS: Cancelar denegado', { id: app.id, role: currentUserRole || 'Asistente', sede: currentUserSede }); markDenied(app.id, 'cancelar'); return; }
                                                handleUpdateStatus(app.id, 'Cancelada');
                                            }}
                                            className={`${!isAppointmentActionAllowed(app, 'cancelar') ? 'text-red-300 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}`}
                                            title="Cancelar"
                                        >
                                            <XSquare size={18} />
                                        </button>
                                        {denied[app.id]?.cancelar && (
                                            <span className="ml-1 text-[10px] text-red-600">No está autorizado</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-dark mb-4">Gestión de Disponibilidad</h2>
                    <p className="text-sm text-gray-500 mb-4">Haz clic en un día para marcarlo como no disponible (rojo).</p>
                    <DayPicker
                        mode="multiple"
                        min={0}
                        selected={unavailableDays}
                        onSelect={handleDaySelection}
                        locale={es}
                        modifiersStyles={{
                            selected: { color: 'white', backgroundColor: '#F87171' }
                        }}
                    />
                    {/* Contenedor de horarios del día seleccionado */}
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold">Horarios del día</h3>
                            <div className="text-sm text-gray-500">
                                {selectedDate ? format(selectedDate, 'PPP', { locale: es }) : 'Selecciona un día'}
                            </div>
                        </div>
                        {slotsLoading && (
                            <div className="flex items-center gap-2 text-gray-600"><Loader className="animate-spin" size={18} /> Cargando horarios...</div>
                        )}
                        {slotsError && (
                            <div className="text-red-600 text-sm mb-2">{slotsError}</div>
                        )}
                        {selectedDate && !slotsLoading && !slotsError && (
                            <>
                                {isDayBlocked ? (
                                    <div className="text-red-600 text-sm">Este día está bloqueado completamente.</div>
                                ) : (
                                    <>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                        {[...availableSlots, ...unavailableSlots]
                                            .sort((a, b) => a.localeCompare(b))
                                            .map((slot) => {
                                                const isAvailable = availableSlots.includes(slot);
                                                const isBusy = unavailableSlots.includes(slot);
                                                const baseClasses = 'px-3 py-2 rounded border text-sm text-center cursor-pointer select-none';
                                                const stateClasses = isAvailable
                                                    ? 'bg-green-50 border-green-300 text-green-800 hover:bg-green-100'
                                                    : 'bg-red-50 border-red-300 text-red-800 hover:bg-red-100';
                                                const disabled = Boolean(togglingSlot) && togglingSlot === slot;
                                                return (
                                                    <button
                                                        key={slot}
                                                        className={`${baseClasses} ${stateClasses} ${disabled ? 'opacity-60 pointer-events-none' : ''} ${!can('gestionar_disponibilidad') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        title={isAvailable ? 'Disponible: clic para bloquear' : (isBusy ? 'No disponible: clic para desbloquear' : 'Clic para cambiar estado')}
                                                        onClick={() => {
                                                            if (!can('gestionar_disponibilidad')) { console.warn('🚫 CITAS: Gestionar disponibilidad denegado', { role: currentUserRole || 'Asistente', sede: currentUserSede }); setDeniedAvailability(true); setTimeout(() => setDeniedAvailability(false), 3000); return; }
                                                            toggleSlotAvailability(slot);
                                                        }}
                                                    >
                                                        {slot}
                                                    </button>
                                                );
                                            })}
                                    </div>
                                    {deniedAvailability && (
                                        <div className="mt-2 text-[10px] text-red-600">No está autorizado para gestionar disponibilidad</div>
                                    )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
            {editingAppointment && (
                <RescheduleModal
                    appointment={editingAppointment}
                    onSave={handleReschedule}
                    onCancel={() => setEditingAppointment(null)}
                />
            )}
        </div>
    );
};

export default AppointmentsAdminPage;