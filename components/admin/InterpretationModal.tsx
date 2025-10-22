import React, { useState, useEffect } from 'react';
import { Loader, Check, X, Save } from 'lucide-react';

interface InterpretationModalProps {
    result: any;
    onClose: () => void;
    onUpdateStatus: (resultId: number, status: 'aprobado' | 'rechazado', editedText?: string) => Promise<void>;
    isLoading: boolean;
}

const InterpretationModal: React.FC<InterpretationModalProps> = ({ result, onClose, onUpdateStatus, isLoading }) => {
    const [editedInterpretation, setEditedInterpretation] = useState('');

    useEffect(() => {
        // Si hay un texto editado, lo usamos. Si no, el original de la IA.
        setEditedInterpretation(result.analisis_editado || result.analisis_ia || 'No se ha generado una interpretación para este resultado.');
    }, [result]);

    const handleSaveAndApprove = () => {
        onUpdateStatus(result.id, 'aprobado', editedInterpretation);
    };

    const handleReject = () => {
        onUpdateStatus(result.id, 'rechazado');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <header className="p-4 flex justify-between items-center border-b">
                    <h2 className="text-xl font-bold">Moderar Interpretación de IA</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
                </header>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2">Estudio:</h3>
                        <p className="text-gray-800">{result.resultado_data?.nombre_estudio}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Interpretación Original de la IA:</h3>
                        <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-600 whitespace-pre-wrap">
                            {result.analisis_ia || 'N/A'}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">
                            Análisis para el Paciente (Editable):
                        </h3>
                        <textarea
                            value={editedInterpretation}
                            onChange={(e) => setEditedInterpretation(e.target.value)}
                            className="w-full p-2 border rounded-md font-mono text-sm"
                            rows={10}
                        />
                    </div>
                </div>
                <footer className="p-4 flex justify-end items-center border-t gap-4">
                    <p className="text-sm text-gray-500 mr-auto">Estado actual: <span className="font-bold">{result.analisis_estado || 'pendiente'}</span></p>
                    <button 
                        onClick={handleReject} 
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 flex items-center"
                    >
                        <X size={18} className="mr-2" /> Rechazar
                    </button>
                    <button 
                        onClick={handleSaveAndApprove} 
                        disabled={isLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 flex items-center"
                    >
                        {isLoading ? <Loader className="animate-spin mr-2" /> : <Check size={18} className="mr-2" />}
                        Guardar y Aprobar
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default InterpretationModal;
