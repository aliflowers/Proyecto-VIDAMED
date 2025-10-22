import React, { useState, useEffect } from 'react';
import CreatableSelect from 'react-select/creatable';
import { Study } from '../../types';
import FormFieldBuilder from './FormFieldBuilder';
import { studyTemplates } from '../../src/data/studyTemplates';

interface FormField {
    name: string;
    label: string;
    unit: string;
    reference: string;
}

interface StudyFormProps {
    study?: Study | null;
    onSave: (study: Omit<Study, 'id'> | Study, file?: File) => void;
    onCancel: () => void;
    isLoading: boolean;
    existingStudyNames: string[];
}

const categories = [
    'Hematología',
    'Química Clínica y Metabolismo',
    'Inmunología y Serología',
    'Hormonas',
    'Marcadores Tumorales',
    'Uroanálisis y Coproanálisis',
    'Microbiología y Serología de Enfermedades Infecciosas',
    'Otros Estudios Especializados'
];

const StudyForm: React.FC<StudyFormProps> = ({ study, onSave, onCancel, isLoading, existingStudyNames }) => {
    const [formError, setFormError] = useState<string | null>(null);
    const [formData, setFormData] = useState<{
        name: string;
        category: string;
        description: string;
        preparation: string;
        costo_usd: string;
        costo_bs: string;
        deliveryTime: string;
        campos_formulario: FormField[];
        background_url: string;
    }>({
        name: '',
        category: categories[0],
        description: '',
        preparation: '',
        costo_usd: '',
        costo_bs: '',
        deliveryTime: '',
        campos_formulario: [],
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
                campos_formulario: study.campos_formulario || [],
                background_url: study.background_url || ''
            });
        }
    }, [study]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleStudyTemplateChange = (selectedOption: any) => {
        setFormError(null); // Reset error on change
        let studyName = '';
        if (selectedOption) {
            studyName = selectedOption.label;
            // Check for duplicates only when creating a new study
            if (!study && existingStudyNames.includes(studyName)) {
                setFormError('Este estudio ya existe en la base de datos.');
            }

            const template = studyTemplates.find(t => t.value === selectedOption.value);
            if (template) {
                setFormData(prev => ({
                    ...prev,
                    name: template.label,
                    category: template.category,
                    description: template.description,
                    preparation: template.preparation,
                    campos_formulario: template.campos_formulario || [],
                }));
            } else { // Opción creada manualmente
                setFormData(prev => ({ ...prev, name: studyName }));
            }
        } else { // Limpiar si se deselecciona
            setFormData(prev => ({
                ...prev,
                name: '',
                category: categories[0],
                description: '',
                preparation: '',
                campos_formulario: [],
            }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setBackgroundFile(e.target.files[0]);
        }
    };

    const handleFormFieldsChange = (fields: FormField[]) => {
        setFormData(prev => ({ ...prev, campos_formulario: fields }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const studyToSave = {
            ...study,
            ...formData,
            price: parseFloat(formData.costo_usd) || 0,
            costo_bs: parseFloat(formData.costo_bs) || 0,
        };
        onSave(studyToSave, backgroundFile || undefined);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 overflow-y-auto p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl my-auto">
                <h2 className="text-2xl font-bold mb-6">{study ? 'Editar Estudio' : 'Crear Nuevo Estudio'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <CreatableSelect
                        isClearable
                        options={studyTemplates}
                        onChange={handleStudyTemplateChange}
                        placeholder="Seleccione o escriba para crear un estudio..."
                        className="w-full"
                        styles={{
                            control: (base) => ({
                                ...base,
                                padding: '0.25rem',
                                borderRadius: '0.375rem',
                                borderColor: '#D1D5DB',
                            }),
                        }}
                        value={studyTemplates.find(opt => opt.label === formData.name) || (formData.name ? { label: formData.name, value: formData.name.toLowerCase().replace(/\s+/g, '-') } : null)}
                    />
                    {formError && <p className="text-red-500 text-sm mt-1">{formError}</p>}
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
                    <div className="pt-4 border-t">
                        <h3 className="text-lg font-semibold mb-2">Parámetros del Estudio</h3>
                        <FormFieldBuilder fields={formData.campos_formulario} onChange={handleFormFieldsChange} />
                    </div>
                    <div className="pt-4 border-t">
                        <h3 className="text-lg font-semibold mb-2">Imagen de Fondo de la Tarjeta</h3>
                        <input name="background_url" value={formData.background_url} onChange={handleChange} placeholder="URL de la Imagen" className="w-full p-2 border rounded mt-1" />
                        <p className="text-center text-sm text-gray-500 my-2">O</p>
                        <input type="file" onChange={handleFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                    </div>
                    <div className="flex justify-end space-x-4 mt-6">
                        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
                        <button type="submit" disabled={isLoading || !!formError} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:bg-gray-400">
                            {isLoading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StudyForm;
