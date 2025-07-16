import React, { useState } from 'react';
import { Study } from '../../types';
import { Upload, X } from 'lucide-react';

interface FileUploadModalProps {
    file: File;
    studies: Study[];
    onUpload: (file: File, study: Study) => void;
    onCancel: () => void;
    isLoading: boolean;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({ file, studies, onUpload, onCancel, isLoading }) => {
    const [selectedStudyId, setSelectedStudyId] = useState<string>('');

    const handleSubmit = () => {
        const selectedStudy = studies.find(s => s.id === selectedStudyId);
        if (selectedStudy) {
            onUpload(file, selectedStudy);
        } else {
            alert('Por favor, seleccione un estudio.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <header className="p-4 flex justify-between items-center border-b">
                    <h2 className="text-xl font-bold">Asociar Estudio a Archivo</h2>
                    <button onClick={onCancel} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
                </header>
                <div className="p-8 space-y-4">
                    <p><strong>Archivo a subir:</strong> {file.name}</p>
                    <div>
                        <label htmlFor="study-select" className="block text-sm font-medium text-gray-700 mb-1">Seleccione el estudio correspondiente:</label>
                        <select
                            id="study-select"
                            value={selectedStudyId}
                            onChange={(e) => setSelectedStudyId(e.target.value)}
                            className="w-full p-2 border rounded-md"
                        >
                            <option value="">Seleccione un estudio...</option>
                            {studies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex justify-end space-x-4 p-6 border-t bg-gray-50 rounded-b-lg">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
                    <button onClick={handleSubmit} disabled={isLoading || !selectedStudyId} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:bg-gray-400 flex items-center">
                        <Upload size={18} className="mr-2" />
                        {isLoading ? 'Subiendo...' : 'Subir y Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FileUploadModal;
