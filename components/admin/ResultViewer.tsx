import React from 'react';
import { Patient, Study } from '../../types';
import Logo from '../Logo';
import { Printer, X } from 'lucide-react';

interface ResultViewerProps {
    patient: Patient;
    result: any;
    onClose: () => void;
}

const ResultViewer: React.FC<ResultViewerProps> = ({ patient, result, onClose }) => {
    const handlePrint = () => {
        const printContents = document.getElementById('printable-result')?.innerHTML;
        const originalContents = document.body.innerHTML;
        if (printContents) {
            document.body.innerHTML = printContents;
            window.print();
            document.body.innerHTML = originalContents;
            // Recargar la página para restaurar los event listeners de React
            window.location.reload();
        }
    };

    const studyDetails: Study | undefined = result.study_details;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                <header className="p-4 flex justify-between items-center border-b">
                    <h2 className="text-xl font-bold">Visualizador de Resultados</h2>
                    <div>
                        <button onClick={handlePrint} className="p-2 hover:bg-gray-200 rounded-full mr-2"><Printer size={20} /></button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
                    </div>
                </header>
                <div className="p-8 overflow-y-auto">
                    <div id="printable-result">
                        <header className="flex justify-between items-center mb-8">
                            <Logo className="h-16" />
                            <div>
                                <h1 className="text-2xl font-bold text-right">Resultados del Examen</h1>
                                <p className="text-right text-gray-500">Fecha: {new Date(result.fecha_creacion).toLocaleDateString('es-VE')}</p>
                            </div>
                        </header>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 border-y py-4 my-4">
                            <p><strong>Paciente:</strong> {patient.nombres} {patient.apellidos}</p>
                            <p><strong>ID Paciente:</strong> {patient.id}</p>
                            <p><strong>Cédula:</strong> {patient.cedula_identidad}</p>
                            <p><strong>Teléfono:</strong> {patient.telefono}</p>
                            <p><strong>Email:</strong> {patient.email}</p>
                            <p><strong>Dirección:</strong> {patient.direccion}</p>
                        </div>
                        <h2 className="text-xl font-bold text-primary text-center my-6">{result.resultado_data.nombre_estudio}</h2>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3 font-semibold">Prueba</th>
                                    <th className="p-3 font-semibold">Resultado</th>
                                    <th className="p-3 font-semibold">Unidades</th>
                                </tr>
                            </thead>
                            <tbody>
                                {studyDetails?.campos_formulario?.map((field: any) => (
                                    <tr key={field.name} className="border-b">
                                        <td className="p-3">{field.label} ({field.name})</td>
                                        <td className="p-3 font-bold">{result.resultado_data.valores[field.name] || '-'}</td>
                                        <td className="p-3">{field.unit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultViewer;
