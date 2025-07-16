import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../src/services/supabaseClient';
import { Loader, ArrowLeft, User, Mail, Phone, Fingerprint, Upload, FileText, Home, Eye, Trash2 } from 'lucide-react';
import { Study, Patient } from '../../types';
import ManualResultForm from '../../components/admin/ManualResultForm';
import ResultViewer from '../../components/admin/ResultViewer';
import FileUploadModal from '../../components/admin/FileUploadModal';

interface PatientDetails extends Patient {
    citas: any[];
    resultados_pacientes: any[];
    resultados_eliminados: any[];
}

const PatientDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [patient, setPatient] = useState<PatientDetails | null>(null);
    const [studies, setStudies] = useState<Study[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [studiesLoading, setStudiesLoading] = useState(true);
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [manualEntryStudy, setManualEntryStudy] = useState<Study | null>(null);
    const [viewingResult, setViewingResult] = useState<any>(null);

    useEffect(() => {
        fetchPatientDetails();
        fetchStudies();
    }, [id]);

    const fetchPatientDetails = async () => {
        if (!id) return;
        setIsLoading(true);
        const { data, error } = await supabase.from('pacientes').select(`*, citas (*), resultados_pacientes (*), resultados_eliminados (*)`).eq('id', id).single();
        if (error) console.error('Error fetching patient details:', error);
        else setPatient(data as PatientDetails);
        setIsLoading(false);
    };

    const fetchStudies = async () => {
        setStudiesLoading(true);
        const { data, error } = await supabase.from('estudios').select('*');
        if (error) {
            console.error("Error crítico al obtener estudios:", error);
            alert("No se pudieron cargar los estudios para la selección.");
        } else if (data) {
            const formattedData: Study[] = data.map((item: any) => ({
                id: item.id.toString(),
                name: item.nombre,
                category: item.categoria,
                description: item.descripcion,
                preparation: item.preparacion,
                price: item.costo_usd,
                costo_bs: item.costo_bs,
                tasa_bcv: item.tasa_bcv,
                deliveryTime: item.tiempo_entrega,
                campos_formulario: item.campos_formulario,
            }));
            setStudies(formattedData);
        }
        setStudiesLoading(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFileToUpload(e.target.files[0]);
        }
    };

    const handleFileUpload = async (file: File, study: Study) => {
        if (!patient) return;
        setUploading(true);
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const fileName = `${patient.id}_${Date.now()}_${cleanFileName}`;
        const { error: uploadError } = await supabase.storage.from('resultados').upload(fileName, file);
        if (uploadError) {
            alert(uploadError.message);
            setUploading(false);
            return;
        }
        const { data: { publicUrl } } = supabase.storage.from('resultados').getPublicUrl(fileName);
        const { error: dbError } = await supabase.from('resultados_pacientes').insert({
            paciente_id: patient.id,
            resultado_data: { url: publicUrl, nombre_estudio: study.name, tipo: 'archivo' }
        });
        if (dbError) {
            alert(dbError.message);
        } else {
            await supabase.rpc('increment_study_count', { study_ids: [parseInt(study.id, 10)] });
            alert('Resultado subido con éxito.');
            fetchPatientDetails();
        }
        setUploading(false);
        setFileToUpload(null);
    };

    const handleSaveManualResult = async (results: any) => {
        if (!patient || !manualEntryStudy) return;
        setUploading(true);
        const { error } = await supabase.from('resultados_pacientes').insert({
            paciente_id: patient.id,
            resultado_data: {
                nombre_estudio: manualEntryStudy.name,
                tipo: 'manual',
                valores: results
            }
        });
        if (error) {
            alert(error.message);
        } else {
            await supabase.rpc('increment_study_count', { study_ids: [parseInt(manualEntryStudy.id, 10)] });
            alert('Resultado guardado con éxito.');
            setManualEntryStudy(null);
            fetchPatientDetails();
        }
        setUploading(false);
    };

    const handleDeleteResult = async (resultId: number) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este resultado? Esta acción no se puede deshacer.')) {
            const resultToDelete = patient?.resultados_pacientes.find(r => r.id === resultId);
            if (!resultToDelete) return;

            const study = studies.find(s => s.name === resultToDelete.resultado_data.nombre_estudio);
            if (!study) {
                alert('No se pudo encontrar el estudio asociado para decrementar el contador.');
                return;
            }

            const { error } = await supabase.rpc('delete_patient_result', {
                result_id: resultId,
                study_id: parseInt(study.id, 10)
            });

            if (error) {
                alert(error.message);
            } else {
                alert('Resultado eliminado con éxito.');
                fetchPatientDetails();
            }
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-full"><Loader className="animate-spin text-primary" size={48} /></div>;
    if (!patient) return <div className="text-center py-16 text-red-500"><h3 className="text-xl font-semibold">Paciente no encontrado.</h3></div>;

    const studyOptions = studies.map(s => ({ value: s.id, label: s.name }));

    return (
        <div>
            <Link to="/admin/patients" className="flex items-center text-primary hover:underline mb-6"><ArrowLeft size={18} className="mr-2" />Volver</Link>
            <div className="bg-white p-8 rounded-lg shadow-md mb-8">
                <div className="flex items-center mb-6">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mr-6"><User size={40} className="text-gray-500" /></div>
                    <div>
                        <h1 className="text-3xl font-bold text-dark">{patient.nombres} {patient.apellidos}</h1>
                        <p className="text-gray-500">ID de Paciente: {patient.id}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Información de Contacto</h3>
                        <p className="flex items-center"><Fingerprint size={16} className="mr-2 text-gray-400" /> Cédula: {patient.cedula_identidad}</p>
                        <p className="flex items-center mt-2"><Mail size={16} className="mr-2 text-gray-400" /> Email: {patient.email}</p>
                        <p className="flex items-center mt-2"><Phone size={16} className="mr-2 text-gray-400" /> Teléfono: {patient.telefono}</p>
                        <p className="flex items-center mt-2"><Home size={16} className="mr-2 text-gray-400" /> Dirección: {patient.direccion}</p>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <h2 className="text-2xl font-bold text-dark mb-4">Historial y Gestión</h2>
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <h3 className="font-semibold text-lg mb-4">Citas</h3>
                    <ul className="space-y-2">
                        {patient.citas.map((cita: any) => (
                            <li key={cita.id} className="p-2 border-b flex justify-between">
                                <span>{new Date(cita.fecha_cita).toLocaleString('es-VE')} - {cita.estudios_solicitados.join(', ')}</span>
                                <span className="font-semibold">{cita.status}</span>
                            </li>
                        ))}
                    </ul>

                    <h3 className="font-semibold text-lg mb-4 mt-8">Resultados</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                        <div>
                            <h4 className="font-medium text-md mb-2">Subir Archivo</h4>
                            <input type="file" onChange={handleFileChange} className="flex-grow" disabled={studiesLoading} />
                            {studiesLoading && <p className="text-xs text-gray-500 mt-1">Cargando lista de estudios...</p>}
                        </div>
                        <div>
                            <h4 className="font-medium text-md mb-2">Ingreso Manual</h4>
                            <select onChange={(e) => setManualEntryStudy(studies.find(s => s.id === e.target.value) || null)} className="w-full p-2 border rounded-md">
                                <option value="">Seleccione un estudio...</option>
                                {studyOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <ul>
                        {patient.resultados_pacientes.map((res: any) => (
                            <li key={res.id} className="flex justify-between items-center p-2 border-b">
                                <span>{res.resultado_data?.nombre_estudio || 'Resultado'} ({res.resultado_data?.tipo}) - {new Date(res.fecha_creacion).toLocaleDateString()}</span>
                                <div className="flex items-center gap-2">
                                    {res.resultado_data?.url && <a href={res.resultado_data.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"><Eye size={18} /></a>}
                                    {res.resultado_data?.tipo === 'manual' && 
                                        <button onClick={() => {
                                            const studyForRes = studies.find(s => s.name === res.resultado_data.nombre_estudio);
                                            setViewingResult({ ...res, study_details: studyForRes });
                                        }} className="text-blue-600 hover:underline"><Eye size={18} /></button>
                                    }
                                    <button onClick={() => handleDeleteResult(res.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <h3 className="font-semibold text-lg mb-4 mt-8">Registro de Resultados Eliminados</h3>
                    <ul className="space-y-2">
                        {patient.resultados_eliminados.map((log: any) => (
                            <li key={log.id} className="p-2 border-b text-sm text-gray-500">
                                El resultado "{log.nombre_estudio}" fue eliminado el {new Date(log.fecha_eliminacion).toLocaleString('es-VE')}.
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            {fileToUpload && (
                <FileUploadModal
                    file={fileToUpload}
                    studies={studies}
                    onUpload={handleFileUpload}
                    onCancel={() => setFileToUpload(null)}
                    isLoading={uploading}
                />
            )}
            {manualEntryStudy && (
                <ManualResultForm
                    study={manualEntryStudy}
                    onSave={handleSaveManualResult}
                    onCancel={() => setManualEntryStudy(null)}
                    isLoading={uploading}
                />
            )}
            {viewingResult && patient && (
                <ResultViewer
                    patient={patient}
                    result={viewingResult}
                    onClose={() => setViewingResult(null)}
                />
            )}
        </div>
    );
};

export default PatientDetailPage;
