import React, { useEffect, useState } from 'react';
import { SchedulingStudy } from '@/types';
import { Upload, X, ChevronDown } from 'lucide-react';

interface FileUploadModalProps {
    file: File;
    studies: SchedulingStudy[];
  onNeedPatientSelection: (file: File, study: SchedulingStudy) => void;
    onCancel: () => void;
    isLoading: boolean;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({ file, studies, onNeedPatientSelection, onCancel, isLoading }) => {
    const [selectedStudyId, setSelectedStudyId] = useState<string>('');
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [studySearch, setStudySearch] = useState<string>('');

    const filteredStudies = studies.filter(s =>
        s.name.toLowerCase().includes(studySearch.trim().toLowerCase())
    );

    useEffect(() => {
        if (!isOpen) setStudySearch('');
    }, [isOpen]);

    const handleSubmit = () => {
        const selectedStudy = studies.find(s => s.id === selectedStudyId);
        if (selectedStudy) {
            onNeedPatientSelection(file, selectedStudy);
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Seleccione el estudio correspondiente:</label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsOpen(v => !v)}
                                className="w-full p-2 border rounded-md flex items-center justify-between"
                                aria-haspopup="listbox"
                                aria-expanded={isOpen}
                            >
                                <span className="truncate text-left">
                                    {selectedStudyId
                                        ? (studies.find(s => s.id === selectedStudyId)?.name || 'Seleccionar estudio...')
                                        : 'Seleccione un estudio...'}
                                </span>
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                            </button>

                            {isOpen && (
                                <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
                                    <div className="p-2 border-b">
                                        <input
                                            type="text"
                                            value={studySearch}
                                            onChange={(e) => setStudySearch(e.target.value)}
                                            placeholder="Buscar estudio..."
                                            className="w-full p-2 border rounded-md"
                                            autoFocus
                                        />
                                    </div>
                                    <ul role="listbox" className="max-h-60 overflow-y-auto">
                                        {filteredStudies.length === 0 && (
                                            <li className="px-3 py-2 text-sm text-gray-500">No hay estudios que coincidan.</li>
                                        )}
                                        {filteredStudies.map(s => (
                                            <li key={s.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => { setSelectedStudyId(s.id); setIsOpen(false); }}
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${selectedStudyId === s.id ? 'bg-gray-50' : ''}`}
                                                    role="option"
                                                    aria-selected={selectedStudyId === s.id}
                                                >
                                                    {s.name}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
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
