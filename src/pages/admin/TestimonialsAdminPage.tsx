import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { logAudit } from '@/services/audit';
import { Testimonial } from '@/types';
import { Loader, Check, X, Trash2, Star } from 'lucide-react';
import TestimonialViewer from '@/components/admin/TestimonialViewer';
import { hasPermission, normalizeRole } from '@/utils/permissions';
import { apiFetch } from '@/services/apiFetch';

const TestimonialsAdminPage: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingTestimonial, setViewingTestimonial] = useState<Testimonial | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('Asistente');
  const [currentUserOverrides, setCurrentUserOverrides] = useState<Record<string, Record<string, boolean>>>({});
  const API_BASE = import.meta.env.VITE_API_BASE || '/api';
  const can = (action: string) => {
    const roleRaw = currentUserRole || 'Asistente';
    const roleNorm = normalizeRole(roleRaw);
    const allowed = roleNorm === 'Administrador' ? true : hasPermission({ role: roleNorm, overrides: currentUserOverrides }, 'TESTIMONIOS', action);
    return allowed;
  };

    useEffect(() => {
        fetchTestimonials();
        (async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id;
            const metaRol = (user?.user_metadata as any)?.rol || 'Asistente';
            setCurrentUserRole(metaRol);
            if (userId) {
              const resp = await apiFetch(`${API_BASE}/users/${userId}/permissions`);
              if (resp.ok) {
                const json = await resp.json();
                const overrides: Record<string, Record<string, boolean>> = {};
                (json.permissions || []).forEach((p: any) => {
                  if (!overrides[p.module]) overrides[p.module] = {};
                  overrides[p.module][p.action] = Boolean(p.allowed);
                });
                setCurrentUserOverrides(overrides);
              }
            }
          } catch {}
        })();
    }, []);

    const fetchTestimonials = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('testimonios')
            .select('*')
            .order('fecha_creacion', { ascending: false });

        if (error) {
            console.error('Error fetching testimonials:', error);
            setError('No se pudieron cargar los testimonios.');
        } else {
            const formattedData: Testimonial[] = data.map((item: any) => ({
                id: item.id,
                texto: item.texto,
                author: item.autor,
                city: item.ciudad,
                is_approved: item.is_approved,
                rating: item.rating,
                estudio_realizado: item.estudio_realizado,
            }));
            setTestimonials(formattedData);
        }
        setIsLoading(false);
    };

    const handleApprove = async (id: number, currentStatus: boolean) => {
        if (!can('editar')) return;
        const newStatus = !currentStatus;
        const { error } = await supabase
            .from('testimonios')
            .update({ is_approved: newStatus })
            .eq('id', id);

        const t = testimonials.find(t => t.id === id);
        await logAudit({
            action: newStatus ? 'Aprobar' : 'Rechazar',
            module: 'TESTIMONIOS',
            entity: 'testimonio',
            entityId: id,
            metadata: {
                autor: t?.author,
                rating: t?.rating,
                estudio_realizado: t?.estudio_realizado,
                estado_anterior: currentStatus,
                estado_nuevo: newStatus,
            },
            success: !error,
        });

        if (error) alert(error.message);
        else fetchTestimonials();
    };

    const handleDelete = async (id: number) => {
        if (!can('eliminar')) return;
        if (window.confirm('¿Estás seguro de que quieres eliminar este testimonio?')) {
            const t = testimonials.find(t => t.id === id);
            const { error } = await supabase.from('testimonios').delete().eq('id', id);
            await logAudit({
                action: 'Eliminar',
                module: 'TESTIMONIOS',
                entity: 'testimonio',
                entityId: id,
                metadata: {
                    autor: t?.author,
                    rating: t?.rating,
                    estudio_realizado: t?.estudio_realizado,
                },
                success: !error,
            });
            if (error) alert(error.message);
            else fetchTestimonials();
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
            <h1 className="text-3xl font-bold text-dark mb-6">Gestión de Testimonios</h1>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3 px-6 text-left">Autor</th>
                            <th className="py-3 px-6 text-left">Testimonio</th>
                            <th className="py-3 px-6 text-center">Calificación</th>
                            <th className="py-3 px-6 text-center">Estado</th>
                            <th className="py-3 px-6 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {testimonials.map(testimonial => (
                            <tr key={testimonial.id} className="hover:bg-gray-50">
                                <td className="py-4 px-6 font-medium">{testimonial.author}</td>
                                <td className="py-4 px-6 text-gray-500 max-w-md truncate">
                                    <button onClick={() => setViewingTestimonial(testimonial)} className="text-left hover:underline">
                                        {testimonial.texto}
                                    </button>
                                </td>
                                <td className="py-4 px-6 text-center">
                                    <div className="flex items-center justify-center">
                                        {testimonial.rating ? Array.from({ length: testimonial.rating }).map((_, i) => <Star key={i} size={16} className="text-yellow-400 fill-current" />) : 'N/A'}
                                    </div>
                                </td>
                                <td className="py-4 px-6 text-center">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${testimonial.is_approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {testimonial.is_approved ? 'Aprobado' : 'Pendiente'}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <button onClick={() => handleApprove(testimonial.id, !!testimonial.is_approved)} className={`mr-4 ${!can('editar') ? 'text-yellow-200 cursor-not-allowed' : (testimonial.is_approved ? 'text-yellow-500' : 'text-green-500')}`}>
                                        {testimonial.is_approved ? <X size={18} /> : <Check size={18} />}
                                    </button>
                                    <button onClick={() => handleDelete(testimonial.id)} className={`${!can('eliminar') ? 'text-red-300 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}`}><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {viewingTestimonial && (
                <TestimonialViewer
                    testimonial={viewingTestimonial}
                    onClose={() => setViewingTestimonial(null)}
                />
            )}
        </div>
    );
};

export default TestimonialsAdminPage;
