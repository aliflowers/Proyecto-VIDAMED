import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { Testimonial } from '@/types';
import { Loader, Check, X, Trash2, Star } from 'lucide-react';
import TestimonialViewer from '@/components/admin/TestimonialViewer';

const TestimonialsAdminPage: React.FC = () => {
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewingTestimonial, setViewingTestimonial] = useState<Testimonial | null>(null);

    useEffect(() => {
        fetchTestimonials();
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
        const { error } = await supabase
            .from('testimonios')
            .update({ is_approved: !currentStatus })
            .eq('id', id);

        if (error) alert(error.message);
        else fetchTestimonials();
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este testimonio?')) {
            const { error } = await supabase.from('testimonios').delete().eq('id', id);
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
                                    <button onClick={() => handleApprove(testimonial.id, !!testimonial.is_approved)} className={`mr-4 ${testimonial.is_approved ? 'text-yellow-500' : 'text-green-500'}`}>
                                        {testimonial.is_approved ? <X size={18} /> : <Check size={18} />}
                                    </button>
                                    <button onClick={() => handleDelete(testimonial.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
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