
import React, { useState, useEffect } from 'react';
import CreatableSelect from 'react-select/creatable';
import { Study, InventoryItem } from '@/types';
import { supabase } from '@/services/supabaseClient';

interface StudyFormProps {
    study?: Study;
    onSave: (studyData: Partial<Study>, materials: { material_id: number; cantidad_usada: number }[], file?: File) => void;
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
    campos_formulario: { name: string; label: string; unit: string; reference: string; }[];
}

const studyTemplates: StudyTemplate[] = [];

const StudyForm: React.FC<StudyFormProps> = ({ study, onSave, onCancel, isLoading }) => {
    const [formData, setFormData] = useState<Partial<Study>>(study || {
        name: '',
        category: '',
        description: '',
        preparation: '',
        price: 0,
        deliveryTime: '',
    });
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [selectedMaterials, setSelectedMaterials] = useState<{ value: number; label: string; quantity: number }[]>([]);

    useEffect(() => {
        const fetchInventory = async () => {
            const { data, error } = await supabase.from('inventario').select('id, nombre, cantidad_stock');
            if (error) {
                console.error('Error fetching inventory:', error);
            } else {
                setInventoryItems(data as InventoryItem[]);
            }
        };
        fetchInventory();
    }, []);

    useEffect(() => {
        if (study) {
            setFormData(study);
            if (study?.materials && inventoryItems.length > 0) {
                const materials = study.materials.map((m) => {
                    const item = inventoryItems.find(i => i.id === m.id);
                    return {
                        value: m.id,
                        label: item ? item.nombre : 'Unknown',
                        quantity: m.quantity,
                    };
                }).filter(m => m.label !== 'Unknown');
                setSelectedMaterials(materials as { value: number; label: string; quantity: number }[]);
            }
        }
    }, [study, inventoryItems]);

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

    const handleMaterialChange = (selectedOptions: any) => {
        const newSelectedMaterials = selectedOptions ? selectedOptions.map((option: any) => {
            const existing = selectedMaterials.find(m => m.value === option.value);
            return {
                ...option,
                quantity: existing ? existing.quantity : 1,
            };
        }) : [];
        setSelectedMaterials(newSelectedMaterials);
    };

    const handleQuantityChange = (materialId: number, quantity: number) => {
        const newSelectedMaterials = selectedMaterials.map(m =>
            m.value === materialId ? { ...m, quantity } : m
        );
        setSelectedMaterials(newSelectedMaterials);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const materialsToSave = selectedMaterials.map(m => ({
            material_id: m.value,
            cantidad_usada: m.quantity,
        }));
        onSave(formData, materialsToSave);
    };

    const formFields = [
        { name: 'name', label: 'Nombre del Estudio', type: 'text' },
        { name: 'category', label: 'Categoría', type: 'text' },
        { name: 'description', label: 'Descripción', type: 'textarea' },
        { name: 'preparation', label: 'Preparación', type: 'textarea' },
        { name: 'price', label: 'Precio (USD)', type: 'number' },
        { name: 'deliveryTime', label: 'Tiempo de Entrega', type: 'text' },
    ];

    const materialOptions = inventoryItems.map(item => ({
        value: item.id,
        label: `${item.nombre} (${item.cantidad_stock})`,
        quantity: 1, // Default quantity
    }));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
                <form onSubmit={handleSubmit} className="p-8 space-y-4">
                    <h2 className="text-2xl font-bold mb-4">{study ? 'Editar Estudio' : 'Crear Nuevo Estudio'}</h2>
                    
                    <div>
                        <label>Plantillas de Estudio</label>
                        <select
                            onChange={(e) => handleTemplateChange(e.target.value)}
                            className="w-full p-2 border rounded"
                        >
                            <option value="">Seleccionar plantilla</option>
                            {(studyTemplates as StudyTemplate[]).map(template => (
                                <option key={template.value} value={template.value}>{template.label}</option>
                            ))}
                        </select>
                    </div>

                    {formFields.map(field => (
                        <div key={field.name}>
                            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">{field.label}</label>
                            {field.type === 'textarea' ? (
                                <textarea
                                    id={field.name}
                                    name={field.name}
                                    value={(formData[field.name as keyof Partial<Study>] || '') as string}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            ) : (
                                <input
                                    id={field.name}
                                    name={field.name}
                                    type={field.type}
                                    value={(formData[field.name as keyof Partial<Study>] || '') as string}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            )}
                        </div>
                    ))}

                    <div>
                        <label>Materiales</label>
                        <CreatableSelect
                            isMulti
                            options={materialOptions}
                            value={selectedMaterials}
                            onChange={handleMaterialChange}
                        />
                    </div>

                    {selectedMaterials.length > 0 && (
                        <div>
                            <h3 className="text-lg font-medium">Cantidades de Materiales</h3>
                            {selectedMaterials.map(material => (
                                <div key={material.value} className="flex items-center space-x-2 mt-2">
                                    <label className="flex-1">{material.label}</label>
                                    <input
                                        type="number"
                                        value={material.quantity}
                                        onChange={(e) => handleQuantityChange(material.value, parseInt(e.target.value, 10))}
                                        className="w-24 p-1 border rounded"
                                        min="1"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:bg-gray-400">
                            {isLoading ? 'Guardando...' : 'Guardar Estudio'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StudyForm;