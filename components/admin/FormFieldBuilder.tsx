import React from 'react';
import { X, Plus } from 'lucide-react';
import CreatableSelect from 'react-select/creatable';
import { COMMON_UNITS, COMMON_REFERENCES } from '../../src/data/constants';

interface FormField {
    name: string;
    label: string;
    unit: string;
    reference: string;
}

interface FormFieldBuilderProps {
    fields: FormField[];
    onChange: (fields: FormField[]) => void;
}

const FormFieldBuilder: React.FC<FormFieldBuilderProps> = ({ fields, onChange }) => {

    const handleFieldChange = (index: number, field: keyof FormField, value: string) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], [field]: value };
        onChange(newFields);
    };

    const addField = () => {
        onChange([...fields, { name: '', label: '', unit: '', reference: '' }]);
    };

    const removeField = (index: number) => {
        const newFields = fields.filter((_, i) => i !== index);
        onChange(newFields);
    };

    return (
        <div className="space-y-4">
            {fields.map((field, index) => (
                <div key={index} className="p-4 border rounded-md bg-gray-50 space-y-3">
                    <div className="flex justify-between items-center">
                        <p className="font-semibold">Parámetro #{index + 1}</p>
                        <button type="button" onClick={() => removeField(index)} className="text-red-500 hover:text-red-700">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="Nombre (ej: hemoglobina)"
                            value={field.name}
                            onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                        <input
                            type="text"
                            placeholder="Etiqueta (ej: Hemoglobina)"
                            value={field.label}
                            onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CreatableSelect
                            options={COMMON_UNITS}
                            placeholder="Unidad (ej: g/dL)"
                            value={field.unit ? { value: field.unit, label: field.unit } : null}
                            onChange={(option) => handleFieldChange(index, 'unit', option?.value || '')}
                            isClearable
                        />
                        <CreatableSelect
                            options={COMMON_REFERENCES}
                            placeholder="Valor de Referencia"
                            value={field.reference ? { value: field.reference, label: field.reference } : null}
                            onChange={(option) => handleFieldChange(index, 'reference', option?.value || '')}
                            isClearable
                        />
                    </div>
                </div>
            ))}
            <button type="button" onClick={addField} className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                <Plus size={18} className="mr-2" />
                Añadir Parámetro
            </button>
        </div>
    );
};

export default FormFieldBuilder;
