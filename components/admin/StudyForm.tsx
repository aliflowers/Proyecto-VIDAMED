import React, { useState, useEffect } from 'react';
import { Study } from '../../types';

interface StudyFormProps {
    study?: Study | null;
    onSave: (study: Omit<Study, 'id'> | Study, file?: File) => void;
    onCancel: () => void;
    isLoading: boolean;
}

const categories = [
    'Hematología',
    'Química Sanguínea',
    'Hormonas',
    'Inmunología',
    'Microbiología',
    'Pruebas COVID-19',
    'Orina y Heces',
    'Marcadores Tumorales',
    'Otros'
];

const StudyForm: React.FC<StudyFormProps> = ({ study, onSave, onCancel, isLoading }) => {
    const [formData, setFormData] = useState({
        name: '',
        category: categories[0],
        description: '',
        preparation: '',
        costo_usd: '',
        costo_bs: '',
        deliveryTime: '',
        campos_formulario: '[]',
        background_url: ''
    });
    const [backgroundFile, setBackgroundFile] = useState<File | null>(null);

    useEffect(() => {
        if (study) {
            setFormData({
                name: study.name,
                category: study.category,
                description: study.description,
                preparation: study.preparation,
                costo_usd: String(study.price),
                costo_bs: String(study.costo_bs || ''),
                deliveryTime: study.deliveryTime,
                campos_formulario: JSON.stringify(study.campos_formulario || [], null, 2),
                background_url: study.background_url || ''
            });
        }
    }, [study]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setBackgroundFile(e.target.files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const campos_formulario = JSON.parse(formData.campos_formulario);
            const studyToSave = {
                ...study,
                ...formData,
                price: parseFloat(formData.costo_usd) || 0,
                costo_bs: parseFloat(formData.costo_bs) || 0, // Este valor será recalculado en la página principal
                campos_formulario,
            };
            onSave(studyToSave, backgroundFile || undefined);
        } catch (error) {
            alert('Error: El JSON de los campos del formulario no es válido.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 overflow-y-auto p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl my-auto">
                <h2 className="text-2xl font-bold mb-6">{study ? 'Editar Estudio' : 'Crear Nuevo Estudio'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input name="name" value={formData.name} onChange={handleChange} placeholder="Nombre del Estudio" required className="w-full p-2 border rounded" />
                    <select name="category" value={formData.category} onChange={handleChange} required className="w-full p-2 border rounded">
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Descripción" required className="w-full p-2 border rounded" />
                    <textarea name="preparation" value={formData.preparation} onChange={handleChange} placeholder="Preparación" required className="w-full p-2 border rounded" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-bold">$</span>
                            <input type="number" name="costo_usd" value={formData.costo_usd} onChange={handleChange} placeholder="Precio en USD" required className="w-full p-2 pl-7 border rounded" step="0.01" />
                        </div>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-bold">Bs.</span>
                            <input type="number" name="costo_bs" value={formData.costo_bs} onChange={handleChange} placeholder="Precio en BS (se autocalculará)" className="w-full p-2 pl-9 border rounded bg-gray-100" readOnly />
                        </div>
                    </div>
                    <input name="deliveryTime" value={formData.deliveryTime} onChange={handleChange} placeholder="Tiempo de Entrega" required className="w-full p-2 border rounded" />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Campos del Formulario (JSON)</label>
                        <textarea
                            name="campos_formulario"
                            value={formData.campos_formulario}
                            onChange={handleChange}
                            placeholder='[{"name": "hemoglobina", "label": "Hemoglobina", "unit": "g/dL"}, ...]'
                            required
                            className="w-full p-2 border rounded font-mono text-sm"
                            rows={5}
                        />
                    </div>
                    <div className="pt-4 border-t">
                        <h3 className="text-lg font-semibold mb-2">Imagen de Fondo de la Tarjeta</h3>
                        <input name="background_url" value={formData.background_url} onChange={handleChange} placeholder="URL de la Imagen" className="w-full p-2 border rounded mt-1" />
                        <p className="text-center text-sm text-gray-500 my-2">O</p>
                        <input type="file" onChange={handleFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                    </div>
                    <div className="flex justify-end space-x-4 mt-6">
                        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:bg-gray-400">
                            {isLoading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StudyForm;
