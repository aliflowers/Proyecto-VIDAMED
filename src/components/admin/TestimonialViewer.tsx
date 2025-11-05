import React from 'react';
import { X, Star } from 'lucide-react';
import { Testimonial } from '@/types';

interface TestimonialViewerProps {
    testimonial: Testimonial;
    onClose: () => void;
}

const TestimonialViewer: React.FC<TestimonialViewerProps> = ({ testimonial, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col">
                <header className="p-4 flex justify-between items-center border-b">
                    <h2 className="text-xl font-bold">Testimonio Completo</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
                </header>
                <div className="p-8">
                    <div className="flex items-center mb-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={20} className={i < (testimonial.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'} />
                        ))}
                    </div>
                    <p className="text-gray-700 italic mb-4">"{testimonial.texto}"</p>
                    <p className="font-bold text-right">- {testimonial.author}, {testimonial.city}</p>
                </div>
            </div>
        </div>
    );
};

export default TestimonialViewer;