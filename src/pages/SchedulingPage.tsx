import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MapPin, User, Mail, Phone, Home, AlertCircle, CheckCircle, Loader, Fingerprint, Map } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { SchedulingStudy, PatientPayload } from '@/types';
import Select from 'react-select';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface StudyOption {
    value: string;
    label: string;
}

const SchedulingPage: React.FC = () => {
    const location = useLocation();
    const [studies, setStudies] = useState<SchedulingStudy[]>([]);
    const [unavailableDays, setUnavailableDays] = useState<Date[]>([]);
    const [formData, setFormData] = useState({
        selectedStudies: [] as StudyOption[],
        location: 'Sede Principal Maracay',
        city: '',
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
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [slotsError, setSlotsError] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);

    useEffect(() => {
        fetchStudies();
        fetchUnavailableDays();
        if (location.state?.selectedStudy) {
            setFormData(prev => ({ ...prev, selectedStudies: [location.state.selectedStudy] }));
        }
    }, [location.state]);

    const fetchStudies = async () => {
        const { data, error } = await supabase.from('estudios').select('*');
        if (error) {
            console.error("Error fetching studies:", error);
        } else if (data) {
            const formattedData: SchedulingStudy[] = data.map((item: any) => ({
                id: item.id.toString(),
                name: item.nombre,
                category: item.categoria,
                description: item.descripcion,
                preparation: item.preparacion,
                price: item.costo_usd,
                costo_bs: item.costo_bs,
                tasa_bcv: item.tasa_bcv,
                deliveryTime: item.tiempo_entrega_quimioluminiscencia || item.tiempo_entrega_elisa_otro || '',
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

    // Consultar horarios disponibles para la fecha/ubicación seleccionadas
    useEffect(() => {
        const fetchSlots = async () => {
            if (!formData.date) {
                setAvailableSlots([]);
                setSlotsError(null);
                setSlotsLoading(false);
                return;
            }
            try {
                setSlotsLoading(true);
                setSlotsError(null);
                const date = format(formData.date, 'yyyy-MM-dd');
                const url = `/api/availability/slots?date=${encodeURIComponent(date)}&location=${encodeURIComponent(formData.location)}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Error consultando disponibilidad: ${res.status}`);
                const json = await res.json();
                setAvailableSlots(Array.isArray(json.available) ? json.available : []);
            } catch (e: any) {
                console.error('[scheduling] Error consultando horarios:', e);
                setSlotsError(e?.message || 'No se pudieron cargar los horarios disponibles.');
                setAvailableSlots([]);
            } finally {
                setSlotsLoading(false);
            }
        };
        fetchSlots();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.date, formData.location]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newLocation = e.target.value;
        setFormData(prev => ({ ...prev, location: newLocation, city: newLocation === 'Servicio a Domicilio' ? prev.city : '' }));
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

            // Validar fecha seleccionada antes de formatear
            if (!formData.date) {
                throw new Error('Debes seleccionar una fecha para la cita.');
            }

            // Normalizar datos críticos
            const rawCedula = String(formData.cedula || '').trim();
            const cedulaClean = rawCedula.replace(/\D/g, '');
            const phoneClean = String(formData.phone || '').replace(/\D/g, '');

            const patientPayload: PatientPayload = {
                cedula_identidad: cedulaClean,
                nombres: formData.nombres,
                apellidos: formData.apellidos,
                email: formData.email,
                telefono: phoneClean,
            };
            if (formData.location === 'Servicio a Domicilio') {
                patientPayload.direccion = formData.direccion;
                patientPayload.ciudad_domicilio = formData.city || undefined;
            }

            // Buscar paciente existente por variantes de cédula (normalizada y cruda) para evitar duplicados
            const cedulaVariants = Array.from(new Set([cedulaClean, rawCedula].filter(Boolean)));
            let patientResponse = await supabase
                .from('pacientes')
                .select('id, cedula_identidad')
                .or(cedulaVariants.map(v => `cedula_identidad.eq.${v}`).join(','))
                .limit(1)
                .maybeSingle();

            if (!patientResponse.data) {
                // Paciente no existe, generar ID y crear
                const { data: newId, error: rpcError } = await supabase.rpc('generate_patient_id', {
                    nombre: formData.nombres,
                    apellido: formData.apellidos
                });
                if (rpcError) throw rpcError;

                const { data: newPatient, error: insertError } = await supabase
                    .from('pacientes')
                    .insert({ ...patientPayload, id: newId, cedula_identidad: cedulaClean })
                    .select()
                    .single();
                if (insertError) throw insertError;
                patientResponse.data = newPatient;

            } else {
                // Paciente existe, actualizar por id y normalizar cédula en DB
                const { data: updatedPatient, error: updateError } = await supabase
                    .from('pacientes')
                    .update({ ...patientPayload, cedula_identidad: cedulaClean })
                    .eq('id', patientResponse.data.id)
                    .select()
                    .single();
                if (updateError) throw updateError;
                patientResponse.data = updatedPatient;
            }

            if (!patientResponse.data) {
                throw new Error("No se pudo crear o encontrar al paciente.");
            }

            // Validar que el horario esté disponible
            if (!availableSlots.includes(time24)) {
                throw new Error(`El horario ${time24} no está disponible para la fecha seleccionada.`);
            }

            const fechaCitaIso = `${format(formData.date!, 'yyyy-MM-dd')}T${time24}:00-04:00`;
            const { error: appointmentError } = await supabase.from('citas').insert({
                paciente_id: patientResponse.data.id,
                fecha_cita: fechaCitaIso,
                estudios_solicitados: formData.selectedStudies.map(s => s.label),
                ubicacion: formData.location
            });
            if (appointmentError) throw appointmentError;

            // Enviar correo de confirmación si el usuario ingresó email
            if (formData.email && formData.email.includes('@')) {
                try {
                    await fetch('/api/appointments/send-confirmation', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: formData.email,
                            patientName: `${formData.nombres} ${formData.apellidos}`.trim(),
                            cedula: formData.cedula || undefined,
                            phone: formData.phone || undefined,
                            location: formData.location,
                            studies: formData.selectedStudies.map(s => s.label),
                            dateIso: fechaCitaIso,
                        }),
                    });
                } catch (e) {
                    console.warn('No se pudo enviar el correo de confirmación:', (e as any)?.message || e);
                }
            }

            setStatus({ type: 'success', message: '¡Tu cita ha sido agendada con éxito!' });
            // Reset form
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || 'Ocurrió un error al agendar la cita.' });
        } finally {
            setIsLoading(false);
        }
    };

    const studyOptions: StudyOption[] = studies.map(s => ({ 
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
                                    onChange={(selected) => setFormData(prev => ({ ...prev, selectedStudies: [...selected] }))}
                                    placeholder="Selecciona uno o más estudios..."
                                    noOptionsMessage={() => 'No hay estudios disponibles'}
                                />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-primary mb-4">2. Elige la ubicación</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex items-center p-4 border rounded-lg hover:bg-light transition-colors cursor-pointer">
                                        <input type="radio" name="location" value="Sede Principal Maracay" checked={formData.location === 'Sede Principal Maracay'} onChange={handleLocationChange} className="h-5 w-5 text-primary focus:ring-primary" />
                                        <MapPin className="h-6 w-6 text-secondary mx-3" />
                                        <span className="text-gray-700 font-medium">Sede Principal Maracay</span>
                                    </label>
                                    <label className="flex items-center p-4 border rounded-lg hover:bg-light transition-colors cursor-pointer">
                                        <input type="radio" name="location" value="Sede La Colonia Tovar" checked={formData.location === 'Sede La Colonia Tovar'} onChange={handleLocationChange} className="h-5 w-5 text-primary focus:ring-primary" />
                                        <MapPin className="h-6 w-6 text-secondary mx-3" />
                                        <span className="text-gray-700 font-medium">Sede La Colonia Tovar</span>
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
                                            className="w-full text-sm"
                                            mode="single"
                                            selected={formData.date}
                                            onSelect={(day) => setFormData(prev => ({ ...prev, date: day }))}
                                            disabled={unavailableDays}
                                            locale={es}
                                            modifiersStyles={{ disabled: { color: 'white', backgroundColor: '#F87171' } }}
                                            style={{ '--rdp-cell-size': 'clamp(28px, 12vw, 42px)' } as React.CSSProperties}
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
                                        {/* Sugerencia visual de horarios disponibles */}
                                        <div className="mt-2">
                                            {formData.date && (
                                                <>
                                                    {slotsLoading && (
                                                        <div className="flex items-center text-gray-600 text-sm"><Loader className="animate-spin mr-2" />Cargando horarios disponibles...</div>
                                                    )}
                                                    {slotsError && (
                                                        <div className="text-red-600 text-sm">{slotsError}</div>
                                                    )}
                                                    {!slotsLoading && !slotsError && availableSlots.length > 0 && (
                                                        <div>
                                                            <div className="text-xs text-gray-600 mb-1">Horarios disponibles:</div>
                                                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                                                {availableSlots.map((s) => (
                                                                    <button
                                                                        type="button"
                                                                        key={s}
                                                                        className="px-2 py-1 text-xs rounded border bg-green-50 border-green-300 text-green-800 hover:bg-green-100"
                                                                        onClick={() => {
                                                                            // Asignar selección a los pickers (formato 24h -> AM/PM)
                                                                            const [hh, mm] = s.split(':').map(Number);
                                                                            const isPM = hh >= 12;
                                                                            const hour12 = hh % 12 === 0 ? 12 : hh % 12;
                                                                            setFormData(prev => ({
                                                                                ...prev,
                                                                                hour: String(hour12).padStart(2,'0'),
                                                                                minute: String(mm).padStart(2,'0'),
                                                                                period: isPM ? 'PM' : 'AM',
                                                                            }));
                                                                        }}
                                                                    >
                                                                        {s}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {!slotsLoading && !slotsError && formData.date && availableSlots.length === 0 && (
                                                        <div className="text-sm text-gray-600">No hay horarios disponibles para la fecha seleccionada.</div>
                                                    )}
                                                </>
                                            )}
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
                                        <>
                                            <div className="relative md:col-span-2">
                                                <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">Dirección {!formData.direccion && <span className="text-red-500">*</span>}</label>
                                                <input type="text" id="direccion" name="direccion" value={formData.direccion} onChange={handleInputChange} required className="mt-1 block w-full pl-10 pr-3 py-2 border rounded-md" placeholder="Tu dirección completa" />
                                                <Map className="absolute left-3 top-8 text-gray-400 h-5 w-5" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label htmlFor="city" className="block text-sm font-medium text-gray-700">Ciudad {!formData.city && <span className="text-red-500">*</span>}</label>
                                                <select id="city" name="city" value={formData.city} onChange={handleInputChange} required className="mt-1 block w-full p-2 border rounded-md">
                                                    <option value="">Selecciona una ciudad</option>
                                                    <option value="Maracay">Maracay</option>
                                                    <option value="La Colonia Tovar">La Colonia Tovar</option>
                                                </select>
                                            </div>
                                        </>
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
