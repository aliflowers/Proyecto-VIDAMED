import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Mail, Phone, Home, AlertCircle, CheckCircle, Loader, Fingerprint, Map } from 'lucide-react';
import { supabase } from '../src/services/supabaseClient';
import { Study } from '../types';
import Select from 'react-select';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const SchedulingPage: React.FC = () => {
    const [studies, setStudies] = useState<Study[]>([]);
    const [unavailableDays, setUnavailableDays] = useState<Date[]>([]);
    const [formData, setFormData] = useState({
        selectedStudies: [] as { value: string; label: string; }[],
        location: 'Sede Principal',
        date: undefined as Date | undefined,
        hour: '08',
        minute: '00',
        period: 'AM',
        nombres: '',
        apellidos: '',
        cedula: '',
        email: '',
        phone: '',
        direccion: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        fetchStudies();
        fetchUnavailableDays();
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
                veces_realizado: item.veces_realizado,
            }));
            setStudies(formattedData);
        }
    };

    const fetchUnavailableDays = async () => {
        const { data, error } = await supabase.from('dias_no_disponibles').select('fecha');
        if (error) {
            console.error('Error fetching unavailable days:', error);
        } else if (data) {
            const utcDates = data.map(d => {
                const date = new Date(d.fecha);
                return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
            });
            setUnavailableDays(utcDates);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, location: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus(null);

        try {
            // Convertir hora a formato 24h
            let hour24 = parseInt(formData.hour, 10);
            if (formData.period === 'PM' && hour24 < 12) {
                hour24 += 12;
            }
            if (formData.period === 'AM' && hour24 === 12) {
                hour24 = 0;
            }
            const time24 = `${String(hour24).padStart(2, '0')}:${formData.minute}`;

            const patientPayload: any = {
                cedula_identidad: formData.cedula,
                nombres: formData.nombres,
                apellidos: formData.apellidos,
                email: formData.email,
                telefono: formData.phone,
            };
            if (formData.location === 'Servicio a Domicilio') {
                patientPayload.direccion = formData.direccion;
            }

            let patientResponse = await supabase.from('pacientes').select('id').eq('cedula_identidad', formData.cedula).single();

            if (!patientResponse.data) {
                // Paciente no existe, generar ID y crear
                const { data: newId, error: rpcError } = await supabase.rpc('generate_patient_id', {
                    nombre: formData.nombres,
                    apellido: formData.apellidos
                });
                if (rpcError) throw rpcError;

                const { data: newPatient, error: insertError } = await supabase.from('pacientes').insert({ ...patientPayload, id: newId }).select().single();
                if (insertError) throw insertError;
                patientResponse.data = newPatient;

            } else {
                // Paciente existe, actualizar
                const { data: updatedPatient, error: updateError } = await supabase.from('pacientes').update(patientPayload).eq('cedula_identidad', formData.cedula).select().single();
                if (updateError) throw updateError;
                patientResponse.data = updatedPatient;
            }

            if (!patientResponse.data) {
                throw new Error("No se pudo crear o encontrar al paciente.");
            }

            const { error: appointmentError } = await supabase.from('citas').insert({
                paciente_id: patientResponse.data.id,
                fecha_cita: `${format(formData.date!, 'yyyy-MM-dd')}T${time24}`,
                estudios_solicitados: formData.selectedStudies.map(s => s.label),
                ubicacion: formData.location
            });
            if (appointmentError) throw appointmentError;

            setStatus({ type: 'success', message: '¡Tu cita ha sido agendada con éxito!' });
            // Reset form
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || 'Ocurrió un error al agendar la cita.' });
        } finally {
            setIsLoading(false);
        }
    };

    const studyOptions = studies.map(s => ({ 
        value: s.id, 
        label: `${s.name} - $${s.price.toFixed(2)} / Bs. ${(s.costo_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
    }));

    return (
        <div className="bg-light py-12 md:py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-8 md:p-12">
                        <div className="text-center mb-10">
                            <h1 className="text-3xl md:text-4xl font-bold text-dark">Agendamiento de Cita</h1>
                            <p className="mt-2 text-lg text-gray-600">Completa el formulario para reservar tu cita.</p>
                        </div>
                        <form className="space-y-8" onSubmit={handleSubmit}>
                            <div>
                                <h2 className="text-xl font-semibold text-primary mb-4">1. Selecciona tus estudios</h2>
                                <Select
                                    isMulti
                                    options={studyOptions}
                                    value={formData.selectedStudies}
                                    onChange={(selected) => setFormData(prev => ({ ...prev, selectedStudies: selected as any }))}
                                    placeholder="Selecciona uno o más estudios..."
                                    noOptionsMessage={() => 'No hay estudios disponibles'}
                                />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-primary mb-4">2. Elige la ubicación</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex items-center p-4 border rounded-lg hover:bg-light transition-colors cursor-pointer">
                                        <input type="radio" name="location" value="Sede Principal" checked={formData.location === 'Sede Principal'} onChange={handleLocationChange} className="h-5 w-5 text-primary focus:ring-primary" />
                                        <MapPin className="h-6 w-6 text-secondary mx-3" />
                                        <span className="text-gray-700 font-medium">Sede Principal</span>
                                    </label>
                                    <label className="flex items-center p-4 border rounded-lg hover:bg-light transition-colors cursor-pointer">
                                        <input type="radio" name="location" value="Servicio a Domicilio" checked={formData.location === 'Servicio a Domicilio'} onChange={handleLocationChange} className="h-5 w-5 text-primary focus:ring-primary" />
                                        <Home className="h-6 w-6 text-secondary mx-3" />
                                        <span className="text-gray-700 font-medium">Servicio a Domicilio</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-primary mb-4">3. Selecciona fecha y hora</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <DayPicker
                                            mode="single"
                                            selected={formData.date}
                                            onSelect={(day) => setFormData(prev => ({ ...prev, date: day }))}
                                            disabled={unavailableDays}
                                            locale={es}
                                            modifiersStyles={{ disabled: { color: 'white', backgroundColor: '#F87171' } }}
                                        />
                                        <div className="flex items-center mt-2 text-sm">
                                            <span className="w-4 h-4 bg-red-400 rounded-full mr-2"></span>
                                            <span>No disponible</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block text-sm font-medium text-gray-700">Hora</label>
                                        <div className="flex items-center gap-2">
                                            <select name="hour" value={formData.hour} onChange={handleInputChange} className="w-full p-2 border rounded-md">
                                                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                            <span>:</span>
                                            <select name="minute" value={formData.minute} onChange={handleInputChange} className="w-full p-2 border rounded-md">
                                                <option value="00">00</option>
                                                <option value="15">15</option>
                                                <option value="30">30</option>
                                                <option value="45">45</option>
                                            </select>
                                            <select name="period" value={formData.period} onChange={handleInputChange} className="w-full p-2 border rounded-md">
                                                <option value="AM">AM</option>
                                                <option value="PM">PM</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-primary mb-4">4. Datos del paciente</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="relative"><label htmlFor="nombres" className="block text-sm font-medium text-gray-700">Nombres {!formData.nombres && <span className="text-red-500">*</span>}</label><input type="text" id="nombres" name="nombres" value={formData.nombres} onChange={handleInputChange} required className="mt-1 block w-full pl-10 pr-3 py-2 border rounded-md" placeholder="Tus nombres" /><User className="absolute left-3 top-8 text-gray-400 h-5 w-5" /></div>
                                    <div className="relative"><label htmlFor="apellidos" className="block text-sm font-medium text-gray-700">Apellidos {!formData.apellidos && <span className="text-red-500">*</span>}</label><input type="text" id="apellidos" name="apellidos" value={formData.apellidos} onChange={handleInputChange} required className="mt-1 block w-full pl-10 pr-3 py-2 border rounded-md" placeholder="Tus apellidos" /><User className="absolute left-3 top-8 text-gray-400 h-5 w-5" /></div>
                                    <div className="relative"><label htmlFor="cedula" className="block text-sm font-medium text-gray-700">Cédula {!formData.cedula && <span className="text-red-500">*</span>}</label><input type="text" id="cedula" name="cedula" value={formData.cedula} onChange={handleInputChange} required className="mt-1 block w-full pl-10 pr-3 py-2 border rounded-md" placeholder="V-12345678" /><Fingerprint className="absolute left-3 top-8 text-gray-400 h-5 w-5" /></div>
                                    <div className="relative"><label htmlFor="email" className="block text-sm font-medium text-gray-700">Email (Opcional)</label><input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} className="mt-1 block w-full pl-10 pr-3 py-2 border rounded-md" placeholder="tu@correo.com" /><Mail className="absolute left-3 top-8 text-gray-400 h-5 w-5" /></div>
                                    <div className="relative"><label htmlFor="phone" className="block text-sm font-medium text-gray-700">Teléfono {!formData.phone && <span className="text-red-500">*</span>}</label><input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange} required className="mt-1 block w-full pl-10 pr-3 py-2 border rounded-md" placeholder="0412-1234567" /><Phone className="absolute left-3 top-8 text-gray-400 h-5 w-5" /></div>
                                    {formData.location === 'Servicio a Domicilio' && (
                                        <div className="relative md:col-span-2">
                                            <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">Dirección {!formData.direccion && <span className="text-red-500">*</span>}</label>
                                            <input type="text" id="direccion" name="direccion" value={formData.direccion} onChange={handleInputChange} required className="mt-1 block w-full pl-10 pr-3 py-2 border rounded-md" placeholder="Tu dirección completa" />
                                            <Map className="absolute left-3 top-8 text-gray-400 h-5 w-5" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            {status && (
                                <div className={`p-4 rounded-md flex items-center ${status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                    {status.type === 'success' ? <CheckCircle className="mr-3" /> : <AlertCircle className="mr-3" />}
                                    {status.message}
                                </div>
                            )}
                            <div className="text-center pt-6">
                                <button type="submit" disabled={isLoading} className="w-full md:w-auto bg-primary text-white font-bold py-3 px-12 rounded-full hover:bg-primary-dark transition-colors text-lg disabled:bg-gray-400 flex items-center justify-center mx-auto">
                                    {isLoading && <Loader className="animate-spin mr-3" />}
                                    {isLoading ? 'Agendando...' : 'Confirmar Cita'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SchedulingPage;
