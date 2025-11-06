import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/services/supabaseClient';
import { Appointment } from '@/types';
import { Loader, Edit, CheckSquare, XSquare, Search } from 'lucide-react';
import { DayPicker, SelectMultipleEventHandler } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

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
        } else {
            ({ error } = await supabase.from('dias_no_disponibles').insert({ fecha: formattedDate }));
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
            const res = await fetch(url);
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, slot, location }),
            };
            let res: Response;
            if (isCurrentlyAvailable) {
                // Bloquear horario
                res = await fetch(endpoint, { ...options, method: 'POST' });
            } else {
                // Desbloquear horario
                res = await fetch(endpoint, { ...options, method: 'DELETE' });
            }
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Fallo actualizando disponibilidad');
            }
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
                                        <button onClick={() => setEditingAppointment(app)} className="text-indigo-600 hover:text-indigo-900 mr-4" title="Reagendar"><Edit size={18} /></button>
                                        <button onClick={() => handleUpdateStatus(app.id, 'Confirmada')} className="text-green-600 hover:text-green-900 mr-4" title="Confirmar"><CheckSquare size={18} /></button>
                                        <button onClick={() => handleUpdateStatus(app.id, 'Cancelada')} className="text-red-600 hover:text-red-900" title="Cancelar"><XSquare size={18} /></button>
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
                                                        className={`${baseClasses} ${stateClasses} ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
                                                        title={isAvailable ? 'Disponible: clic para bloquear' : (isBusy ? 'No disponible: clic para desbloquear' : 'Clic para cambiar estado')}
                                                        onClick={() => toggleSlotAvailability(slot)}
                                                    >
                                                        {slot}
                                                    </button>
                                                );
                                            })}
                                    </div>
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