import React, { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { Study, FormField } from '@/types';
import FormFieldBuilder from './FormFieldBuilder';

interface StudyFormProps {
    study?: Study;
    onSave: (studyData: Partial<Study>, file?: File) => void;
    onCancel: () => void;
    isLoading: boolean;
}

// Eliminado: soporte de plantillas ya no es necesario

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
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (study) {
            setFormData(study);
            setPreviewUrl(study.background_url || null);
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
            setPreviewUrl(null);
        }
    }, [study]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const originalFile = e.target.files[0];
            try {
                // Comprimir a máximo ~300 KB, usando web worker
                const options = {
                    maxSizeMB: 0.3,
                    maxWidthOrHeight: 1024,
                    useWebWorker: true,
                } as any;
                const compressedFile: File = await imageCompression(originalFile, options);
                setFile(compressedFile);

                const objectUrl = URL.createObjectURL(compressedFile);
                setPreviewUrl(prev => {
                    if (prev && prev.startsWith('blob:')) {
                        try { URL.revokeObjectURL(prev); } catch {}
                    }
                    return objectUrl;
                });
            } catch (err) {
                // Fallback: usar el archivo original si falla compresión
                const objectUrl = URL.createObjectURL(originalFile);
                setFile(originalFile);
                setPreviewUrl(prev => {
                    if (prev && prev.startsWith('blob:')) {
                        try { URL.revokeObjectURL(prev); } catch {}
                    }
                    return objectUrl;
                });
            }
        } else {
            setFile(null);
            setPreviewUrl(study?.background_url || null);
        }
    };

    // Eliminado: función de cambio de plantilla

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
        onSave(formData, file || undefined);
    };

    // Cleanup del ObjectURL cuando se desmonte o cambie la previsualización
    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                try { URL.revokeObjectURL(previewUrl); } catch {}
            }
        };
    }, [previewUrl]);

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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Imagen de fondo (opcional)</label>
                        <div className="flex items-center gap-4">
                            <div className="w-[125px] h-[125px] rounded-md border border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Previsualización" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs text-gray-500">Sin imagen</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                />
                                <p className="mt-1 text-xs text-gray-500">Tamaño recomendado 125×125 px. Formatos: JPEG, PNG, GIF, WebP.</p>
                            </div>
                        </div>
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