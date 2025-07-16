import React, { useState } from 'react';
import { Study } from '../../types';

interface ManualResultFormProps {
    study: Study;
    onSave: (results: any) => void;
    onCancel: () => void;
    isLoading: boolean;
}

const ManualResultForm: React.FC<ManualResultFormProps> = ({ study, onSave, onCancel, isLoading }) => {
    const [resultsData, setResultsData] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setResultsData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(resultsData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="p-8 border-b">
                    <h2 className="text-2xl font-bold mb-2">Ingresar Resultados para:</h2>
                    <h3 className="text-xl font-semibold text-primary">{study.name}</h3>
                </div>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-8 space-y-4">
                    {study.campos_formulario?.map(field => (
                        <div key={field.name}>
                            <label className="block text-sm font-medium text-gray-700">
                                {field.label} {field.unit && `(${field.unit})`}
                            </label>
                            <input
                                name={field.name}
                                value={resultsData[field.name] || ''}
                                onChange={handleChange}
                                required
                                className="mt-1 w-full p-2 border rounded"
                            />
                        </div>
                    ))}
                </form>
                <div className="flex justify-end space-x-4 p-6 border-t bg-gray-50 rounded-b-lg">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
                    <button type="button" onClick={handleSubmit} disabled={isLoading} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:bg-gray-400">
                        {isLoading ? 'Guardando...' : 'Guardar Resultados'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManualResultForm;
