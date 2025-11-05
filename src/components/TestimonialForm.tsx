import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface TestimonialFormProps {
    onSubmit: (data: { text: string; rating: number; studyName: string }) => Promise<void>;
    isLoading: boolean;
    studies: { id: number; resultado_data: { nombre_estudio?: string } }[];
}

const TestimonialForm: React.FC<TestimonialFormProps> = ({ onSubmit, isLoading, studies }) => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [text, setText] = useState('');
    const [selectedStudy, setSelectedStudy] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rating > 0 && text.trim() && selectedStudy) {
            onSubmit({ text, rating, studyName: selectedStudy });
        } else {
            alert('Por favor, selecciona un estudio, una calificación y escribe tu testimonio.');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mt-12">
            <div className="p-6 md:p-8">
                <h2 className="text-2xl font-semibold text-primary mb-4">¡Valora tu experiencia!</h2>
                <p className="text-gray-600 mb-6">Tu opinión es muy importante para nosotros y nos ayuda a mejorar.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="study-select" className="block text-sm font-medium text-gray-700 mb-2">¿Sobre qué estudio es tu testimonio?</label>
                        <select id="study-select" value={selectedStudy} onChange={(e) => setSelectedStudy(e.target.value)} required className="w-full p-2 border rounded-md">
                            <option value="">Selecciona un estudio</option>
                            {studies.map(result => (
                                <option key={result.id} value={result.resultado_data.nombre_estudio}>
                                    {result.resultado_data.nombre_estudio}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Calificación</label>
                        <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className="cursor-pointer"
                                    size={32}
                                    color={hoverRating >= star || rating >= star ? '#F5A623' : '#D1D5DB'}
                                    fill={hoverRating >= star || rating >= star ? '#F5A623' : 'none'}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setRating(star)}
                                />
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="testimonial-text" className="block text-sm font-medium text-gray-700">Tu Testimonio</label>
                        <textarea
                            id="testimonial-text"
                            rows={4}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="mt-1 w-full p-2 border rounded-md"
                            placeholder="Cuéntanos cómo fue tu experiencia..."
                            required
                        />
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-md hover:bg-primary-dark disabled:bg-gray-400">
                        {isLoading ? 'Enviando...' : 'Enviar Testimonio'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TestimonialForm;
