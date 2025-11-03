import React, { useState, useEffect } from 'react';
import { Study, FormField } from '@/types';
import FormFieldBuilder from './FormFieldBuilder';

interface StudyFormProps {
    study?: Study;
    onSave: (studyData: Partial<Study>, file?: File) => void;
    onCancel: () => void;
    isLoading: boolean;
}

interface StudyTemplate {
    value: string;
    label: string;
    category: string;
    description: string;
    preparation: string;
    price?: number;
    campos_formulario: FormField[];
}

const studyTemplates: StudyTemplate[] = [];

const StudyForm: React.FC<StudyFormProps> = ({ study, onSave, onCancel, isLoading }) => {
    const [formData, setFormData] = useState<Partial<Study>>(
        study || {
            name: '',
            category: '',
            description: '',
            preparation: '',
            price: 0,
            deliveryTime: '',
            campos_formulario: [],
        }
    );

    useEffect(() => {
        if (study) {
            setFormData(study);
        } else {
            setFormData({
                name: '',
                category: '',
                description: '',
                preparation: '',
                price: 0,
                deliveryTime: '',
                campos_formulario: [],
            });
        }
    }, [study]);

    const handleTemplateChange = (templateValue: string) => {
        const template = (studyTemplates as StudyTemplate[]).find(t => t.value === templateValue);
        if (template) {
            setFormData(prev => ({
                ...prev,
                name: template.label,
                category: template.category,
                description: template.description,
                preparation: template.preparation,
                price: template.price || 0,
                campos_formulario: template.campos_formulario,
            }));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'price' ? parseFloat(value) : value,
        }));
    };

    const handleCamposChange = (fields: FormField[]) => {
        setFormData(prev => ({
            ...prev,
            campos_formulario: fields,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const formFields = [
        { name: 'name', label: 'Nombre del Estudio', type: 'text' },
        { name: 'category', label: 'Categoría', type: 'text' },
        { name: 'description', label: 'Descripción', type: 'textarea' },
        { name: 'preparation', label: 'Preparación', type: 'textarea' },
        { name: 'price', label: 'Precio (USD)', type: 'number' },
        { name: 'deliveryTime', label: 'Tiempo de Entrega', type: 'text' },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="flex-shrink-0 p-6 pb-4 border-b">
                    <h2 className="text-2xl font-bold">{study ? 'Editar Estudio' : 'Crear Nuevo Estudio'}</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Plantillas de Estudio</label>
                        <select
                            onChange={(e) => handleTemplateChange(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                            <option value="">Seleccionar plantilla</option>
                            {(studyTemplates as StudyTemplate[]).map(template => (
                                <option key={template.value} value={template.value}>{template.label}</option>
                            ))}
                        </select>
                    </div>

                    {formFields.map(field => (
                        <div key={field.name}>
                            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                            {field.type === 'textarea' ? (
                                <textarea
                                    id={field.name}
                                    name={field.name}
                                    value={(formData[field.name as keyof Partial<Study>] || '') as string}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                />
                            ) : (
                                <input
                                    id={field.name}
                                    name={field.name}
                                    type={field.type}
                                    value={(formData[field.name as keyof Partial<Study>] || '') as string}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            )}
                        </div>
                    ))}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Parámetros del Estudio</label>
                        <FormFieldBuilder
                            fields={formData.campos_formulario || []}
                            onChange={handleCamposChange}
                        />
                    </div>
                </div>

                <div className="flex-shrink-0 p-6 pt-4 border-t bg-gray-50">
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                        >
                            {isLoading ? 'Guardando...' : 'Guardar Estudio'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default StudyForm;