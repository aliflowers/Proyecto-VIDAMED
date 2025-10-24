import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface InterpretationViewerModalProps {
    interpretation: string;
    onClose: () => void;
}

const InterpretationViewerModal: React.FC<InterpretationViewerModalProps> = ({ interpretation, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <header className="p-4 flex justify-between items-center border-b">
                    <h2 className="text-xl font-bold">Interpretación del Resultado</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
                </header>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
                        <div className="flex">
                            <div className="py-1"><AlertTriangle className="h-5 w-5 text-yellow-400 mr-3" /></div>
                            <div>
                                <p className="font-bold">Aviso Importante</p>
                                <p className="text-sm">Esta interpretación es una guía informativa generada por IA y revisada por nuestro personal. No reemplaza una consulta médica. Para un diagnóstico preciso, consulte a su médico.</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-700 whitespace-pre-wrap">
                        {interpretation}
                    </div>
                </div>
                <footer className="p-4 flex justify-end items-center border-t">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                    >
                        Cerrar
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default InterpretationViewerModal;
