import React, { useState } from 'react';

interface Study {
    id: string;
    name: string;
    campos_formulario?: { name: string; label: string; unit?: string }[];
}

interface ManualResultFormProps {
    study: Study;
    onSave: (results: any) => void;
    onCancel: () => void;
    isLoading: boolean;
}

const ManualResultForm: React.FC<ManualResultFormProps> = ({ study, onSave, onCancel, isLoading }) => {
    console.log('📋 ManualResultForm rendered with:', {
        study,
        onSave: !!onSave,
        onCancel: !!onCancel,
        isLoading,
        studyCamposFormulario: study?.campos_formulario
    });

    const [resultsData, setResultsData] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        console.log('📝 Input changed:', { name, value });
        setResultsData(prev => ({ ...prev, [name]: value }));
        console.log('📤 Results data updated:', resultsData);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('🎯 MANUAL RESULT FORM - handleSubmit triggered with:', resultsData);

        const hasFormFields = study.campos_formulario && study.campos_formulario.length > 0;
        console.log('📝 Study has form fields?:', hasFormFields);

        // Prepare data to save - The parent component will handle the structure.
        const dataToSave = resultsData;

        // Execute onSave callback
        if (typeof onSave === 'function') {
            console.log('✅ Executing onSave callback with:', dataToSave);
            onSave(dataToSave);
        } else {
            console.error('❌ onSave is not a function:', onSave);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="p-8 border-b">
                    <h2 className="text-2xl font-bold mb-2">Ingresar Resultados para:</h2>
                    <h3 className="text-xl font-semibold text-primary">{study.name}</h3>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="flex-grow overflow-y-auto p-8 space-y-4">
                        {study.campos_formulario?.length ? (
                            study.campos_formulario.map(field => (
                                <div key={field.name}>
                                    <label className="block text-sm font-medium text-gray-700">
                                        {field.label} {field.unit && `(${field.unit})`}
                                    </label>
                                    <input
                                        name={field.name}
                                        value={resultsData[field.name] || ''}
                                        onChange={handleChange}
                                        className="mt-1 w-full p-2 border rounded"
                                    />
                                </div>
                            ))
                        ) : (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                                <div className="text-blue-600 mb-2">
                                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-blue-800 mb-2">
                                    Este estudio no tiene campos específicos configurados
                                </h3>
                                <p className="text-sm text-blue-700 mb-4">
                                    Sin embargo, puedes guardar el resultado de todas formas.
                                    Se registrarán automáticamente la información del paciente, estudio y materiales utilizados.
                                </p>
                                <div className="bg-white p-3 rounded border text-sm text-gray-600">
                                    <p><strong>Nota:</strong> Contacta al administrador para configurar campos específicos de formulario para este estudio y habilitar la entrada manual completa de resultados.</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end space-x-4 p-6 border-t bg-gray-50 rounded-b-lg">
                        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:bg-gray-400">
                            {isLoading ? 'Guardando...' : 'Guardar Resultados'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ManualResultForm;