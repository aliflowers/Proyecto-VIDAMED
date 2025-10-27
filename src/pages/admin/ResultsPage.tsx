import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/services/supabaseClient';
import { toast } from 'react-toastify';
import { Upload, Plus, Search, Info } from 'lucide-react';
import ResultsTable from '@/components/admin/ResultsTable';
import { SchedulingStudy, ResultadoPaciente } from '@/types';
import FileUploadModal from '@/components/admin/FileUploadModal';
import ManualResultForm from '@/components/admin/ManualResultForm';
import ResultViewer from '@/components/admin/ResultViewer';
import InterpretationModal from '@/components/admin/InterpretationModal';

import PatientSelectorModal, { Patient } from '@/components/admin/PatientSelectorModal';
import UnifiedEntryModal from '@/components/admin/UnifiedEntryModal';

interface GlobalResult {
  id: number;
  paciente_id: number;
  estudio_id: number;
  resultado_data: any;
  fecha_creacion: string;
  analisis_ia?: string;
  analisis_estado?: string;
  paciente_nombres: string;
  paciente_apellidos: string;
  paciente_cedula: string;
  paciente_email?: string;
  paciente_telefono?: string;
  paciente_direccion?: string;
  nombre_estudio: string;
}

const ResultsPage: React.FC = () => {
  // 📁 Estados para subida de archivos
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [studies, setStudies] = useState<SchedulingStudy[]>([]);
  const [studiesLoading, setStudiesLoading] = useState(true);

  // 📝 Estados para ingreso manual
  const [manualEntryStudy, setManualEntryStudy] = useState<SchedulingStudy | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<any[]>([]);
  const [unifiedModalOpen, setUnifiedModalOpen] = useState(false);

  // 📊 Estados para resultados globales
  const [allResults, setAllResults] = useState<GlobalResult[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔍 Estados de búsqueda y filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStudy, setFilterStudy] = useState('');

  // 🤖 Estados para análisis IA
  const [currentInterpretation, setCurrentInterpretation] = useState<ResultadoPaciente | null>(null);
  const [interpretationLoading, setInterpretationLoading] = useState(false);
  const [interpretationModalOpen, setInterpretationModalOpen] = useState(false);

  // 🎯 Estados para visualización
  const [viewingResult, setViewingResult] = useState<GlobalResult | null>(null);

  // 🩺 Estados para selección de pacientes
  const [patientSelectorOpen, setPatientSelectorOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [currentFileToProcess, setCurrentFileToProcess] = useState<File | null>(null);
  const [currentStudyToProcess, setCurrentStudyToProcess] = useState<SchedulingStudy | null>(null);

  // 🔄 Fetch inicial de datos
  useEffect(() => {
    fetchAllResults();
    fetchStudies();
  }, []);

  const fetchStudies = async () => {
    setStudiesLoading(true);
    const { data, error } = await supabase.from('estudios').select('*');
    if (error) {
      console.error("Error cargando estudios:", error);
      toast.error("Error al cargar lista de estudios.");
    } else if (data) {
      const formattedData: SchedulingStudy[] = data.map((item: any) => ({
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
        veces_realizado: item.veces_realizado,
        background_url: item.background_url
      }));
      setStudies(formattedData);
    }
    setStudiesLoading(false);
  };

  const fetchAllResults = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resultados_pacientes')
        .select(`
          *,
          pacientes(
            nombres,
            apellidos,
            cedula_identidad,
            email,
            telefono,
            direccion
          ),
          estudios(
            nombre
          )
        `)
        .order('fecha_creacion', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        setAllResults([]);
        return;
      }

      // Transformar los datos al formato del componente
      const transformedData = data.map((result: any) => ({
        id: result.id,
        paciente_id: result.paciente_id,
        estudio_id: result.estudio_id,
        resultado_data: result.resultado_data,
        fecha_creacion: result.fecha_creacion,
        analisis_ia: result.analisis_ia,
        analisis_estado: result.analisis_estado,
        paciente_nombres: result.pacientes?.nombres || 'N/A',
        paciente_apellidos: result.pacientes?.apellidos || 'N/A',
        paciente_cedula: result.pacientes?.cedula_identidad || 'N/A',
        paciente_email: result.pacientes?.email || '',
        paciente_telefono: result.pacientes?.telefono || '',
        paciente_direccion: result.pacientes?.direccion || '',
        nombre_estudio: result.estudios?.nombre || result.resultado_data?.nombre_estudio || 'N/A'
      }));
      setAllResults(transformedData);
    } catch (error: any) {
      console.error('Error al cargar resultados:', error);
      toast.error(`Error al cargar resultados: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Filtrado de resultados
  const filteredResults = useMemo(() => {
    let filtered = allResults;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(result =>
        result.paciente_nombres.toLowerCase().includes(term) ||
        result.paciente_apellidos.toLowerCase().includes(term) ||
        result.paciente_cedula.includes(term)
      );
    }

    if (filterStudy) {
      filtered = filtered.filter(result => result.nombre_estudio === filterStudy);
    }

    return filtered;
  }, [allResults, searchTerm, filterStudy]);

  // 📁 Manejo de subida de archivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileToUpload(e.target.files[0]);
    }
  };

  // 🩺 Handler para cuando necesitamos seleccionar paciente para archivo
  const handleNeedPatientSelection = (file: File, study: SchedulingStudy) => {
    setCurrentFileToProcess(file);
    setCurrentStudyToProcess(study);
    setFileToUpload(null); // Cerrar el modal de archivo
    setPatientSelectorOpen(true); // Abrir selector de pacientes
  };
  // 🔄 Funcionalidad del botón "Ingreso Manual"
  const handleManualEntry = () => {
    // Abrir modal unificado para selección completa
    setUnifiedModalOpen(true);
  };

  // ✅ NUEVA FUNCIÓN: Recibir selección completa del modal unificado
  const handleCompleteSelection = (patient: Patient, study: SchedulingStudy, materials: any[]) => {
    console.log('🎉 handleCompleteSelection called from UnifiedEntryModal');
    console.log('Patient:', patient);
    console.log('Study:', study);
    console.log('Materials:', materials);

    // Cerrar el modal unificado primero
    setUnifiedModalOpen(false);

    // Asignar paciente y materiales seleccionados
    setSelectedPatient(patient);

    // Convertir materiales SelectedMaterial al formato esperado (preservar cantidades)
    const convertedMaterials = materials.map(mat => ({
      id: mat.id, // ✅ CORRECCIÓN: Usar 'id' en lugar de 'material_id'
      cantidad_usada: mat.cantidad_usada, // ✅ Cantidad específica del modal unificado
      nombre: mat.nombre,
      sku: mat.sku
    }));
    console.log('Converted materials:', convertedMaterials);
    setSelectedMaterials(convertedMaterials);

    // Asignar estudio y abrir ManualResultForm
    console.log('Setting manualEntryStudy with:', study);
    setManualEntryStudy(study);
    console.log('✅ handleCompleteSelection completed - ManualResultForm should open now');
  };

  // 📝 Manejo de ingreso manual
  const handleSaveManualResult = async (results: any) => {
    console.log('🔄 handleSaveManualResult called with:', {
      manualEntryStudy: !!manualEntryStudy,
      selectedMaterialsLength: selectedMaterials.length,
      selectedPatient: !!selectedPatient,
      results
    });

    if (!manualEntryStudy || selectedMaterials.length === 0 || !selectedPatient) {
      console.error('❌ handleSaveManualResult: Missing required data', {
        manualEntryStudy: !!manualEntryStudy,
        selectedMaterialsLength: selectedMaterials.length,
        selectedPatient: !!selectedPatient
      });
      alert('Error: Faltan datos requeridos. Por favor, complete la selección de paciente, estudio y materiales.');
      return;
    }

    setUploading(true);
    try {
      // 🔥 DESCONTAR MATERIALES DEL INVENTARIO
      console.log('🔥 DEDUCTING MATERIALS - selectedMaterials:', selectedMaterials);

      // Crear array de materiales a descontar con la estructura correcta para la función RPC
      const materialsToDeduct = selectedMaterials.map(material => {
        console.log('🔥 Processing material:', material);
        console.log('🔥 Material id:', material.id, 'type:', typeof material.id);

        // 🛠️ CORRECCIÓN: Asegurar que id existe, si no usar material_id alternativo
        const safeId = material.id || material.material_id;
        if (!safeId) {
          console.error('❌ ERROR: Material has no id or material_id:', material);
          alert('ERROR: Un material no tiene identificador válido. Revisa la selección de materiales.');
          throw new Error('Material missing id');
        }

        return {
          id: safeId.toString(),
          cantidad_usada: material.cantidad_usada.toString()
        };
      });

      console.log('✅ Final materialsToDeduct:', materialsToDeduct);

      // Llamar al procedimiento almacenado para descontar stock - convertir a JSONB
      const { error: deductError } = await supabase.rpc('deduct_inventory_materials', {
        materials: materialsToDeduct // Supabase automáticamente lo convierte a JSONB
      });

      if (deductError) {
        console.error('Error descontando materiales:', deductError);
        alert('Error al descontar materiales del inventario.');
        throw deductError;
      }

      // ✅ GUARDAR RESULTADO EN BASE DE DATOS
      const dataToInsert = {
        paciente_id: selectedPatient.id, // ✅ Paciente seleccionado
        estudio_id: parseInt(manualEntryStudy.id, 10),
        resultado_data: {
          nombre_estudio: manualEntryStudy.name,
          tipo: 'manual',
          valores: results,
          materiales_utilizados: selectedMaterials, // Nuevo: guardar materiales utilizados
          paciente_id: selectedPatient.id,
          paciente_nombres: selectedPatient.nombres,
          paciente_apellidos: selectedPatient.apellidos,
          paciente_cedula: selectedPatient.cedula_identidad,
          fecha_ingreso_manual: new Date().toISOString()
        }
      };

      const { error: dbError } = await supabase.from('resultados_pacientes').insert([dataToInsert]);

      if (dbError) {
        console.error('Manual result error:', dbError);
        throw dbError;
      }

      await supabase.rpc('increment_study_count', { study_ids: [parseInt(manualEntryStudy.id, 10)] });

      console.log('✅ RESULTADO GUARDADO EXITOSAMENTE:', {
        paciente: `${selectedPatient.nombres} ${selectedPatient.apellidos}`,
        estudio: manualEntryStudy.name,
        materiales: selectedMaterials.length
      });

      toast.success(`Resultado guardado para ${selectedPatient.nombres} ${selectedPatient.apellidos}`);

      // Limpiar estados para cerrar modal
      setManualEntryStudy(null);
      setSelectedMaterials([]);
      setSelectedPatient(null);
      fetchAllResults(); // Refresh tabla con nuevo resultado
    } catch (error: any) {
      console.error('❌ Error guardando resultado:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // 🗑️ Eliminación de resultado
  const handleDeleteResult = async (resultId: number) => {
    if (!window.confirm('¿Confirmar eliminación de este resultado?')) return;

    try {
      const resultToDelete = allResults.find(r => r.id === resultId);
      if (!resultToDelete) return;

      // Necesitamos el study para decrementar contador
      const study = studies.find(s => s.name === resultToDelete.nombre_estudio);
      const studyId = study ? parseInt(study.id, 10) : null;

      const { error } = await supabase.rpc('delete_patient_result', {
        result_id: resultId,
        study_id: studyId
      });

      if (error) throw error;

      toast.success('Resultado eliminado exitosamente.');
      fetchAllResults();
    } catch (error: any) {
      toast.error(`Error eliminando resultado: ${error.message}`);
    }
  };

  // 🤖 Análisis IA
  const handleGenerateInterpretation = async (result: GlobalResult) => {
    // Si ya tiene análisis IA, solo mostrar el modal sin llamar a la API
    if (result.analisis_ia) {
      console.log('📋 Mostrando análisis IA existente');
      setCurrentInterpretation(result as ResultadoPaciente);
      setInterpretationModalOpen(true);
      return;
    }

    // Si no tiene análisis, generar uno nuevo
    console.log('🤖 Generando nuevo análisis IA para resultado:', result.id);
    setCurrentInterpretation(result as ResultadoPaciente);
    setInterpretationLoading(true);

    try {
      const apiUrl = '/api/interpretar';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result_id: result.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error generando análisis médico.');
      }

      const { interpretation, success } = await response.json();

      if (!success || !interpretation) {
        throw new Error('No se pudo generar un análisis médico válido.');
      }

      // ✅ CORREGIDO: Guardar como 'completado' en lugar de 'pendiente'
      const { error: updateError } = await supabase
        .from('resultados_pacientes')
        .update({
          analisis_ia: interpretation,
          analisis_estado: 'completado',
        })
        .eq('id', result.id);

      if (updateError) {
        console.error('Error guardando análisis en BD:', updateError);
        throw updateError;
      }

      console.log('✅ Análisis IA guardado y mostrado exitosamente');
      toast.success('Análisis médico generado exitosamente');

      await fetchAllResults(); // Refresh para actualizar el estado de la tabla
      setInterpretationModalOpen(true);

    } catch (error: any) {
      console.error('❌ Error generando análisis IA:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setInterpretationLoading(false);
    }
  };

  const handleUpdateInterpretationStatus = async (resultId: number, status: 'aprobado' | 'rechazado', editedText?: string) => {
    setInterpretationLoading(true);
    const { error } = await supabase
      .from('resultados_pacientes')
      .update({
        analisis_estado: status,
        analisis_editado: editedText,
      })
      .eq('id', resultId);

    if (error) {
      toast.error(`Error actualizando estado: ${error.message}`);
    } else {
      toast.success(`Análisis marcado como ${status}`);
      await fetchAllResults();
      setInterpretationModalOpen(false);
    }
    setInterpretationLoading(false);
  };

  // Función auxiliar para subida de archivos con paciente
  const handleFileUploadWithPatient = async (file: File, study: SchedulingStudy, patient: Patient) => {
    setUploading(true);
    try {
      // Subida del archivo a Supabase Storage
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileName = `resultados_global/${Date.now()}_${cleanFileName}`;
      const { error: uploadError } = await supabase.storage.from('resultados').upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('resultados').getPublicUrl(fileName);

      // ✅ NUEVO: Incluir paciente_id correctamente
      const dataToInsert = {
        paciente_id: patient.id, // ✅ Paciente seleccionado
        estudio_id: parseInt(study.id, 10),
        resultado_data: {
          url: publicUrl,
          nombre_estudio: study.name,
          paciente_id: patient.id, // Para compatibilidad
          paciente_nombres: patient.nombres,
          paciente_apellidos: patient.apellidos,
          paciente_cedula: patient.cedula_identidad,
          tipo: 'archivo',
          fecha_subida_global: new Date().toISOString()
        }
      };

      const { error: dbError } = await supabase.from('resultados_pacientes').insert([dataToInsert]);
      if (dbError) {
        console.error('Error BD:', dbError);
        throw dbError;
      }

      await supabase.rpc('increment_study_count', { study_ids: [parseInt(study.id, 10)] });

      toast.success(`Resultado subido exitosamente para ${patient.nombres} ${patient.apellidos}`);

      // Limpiar estados
      setCurrentFileToProcess(null);
      setCurrentStudyToProcess(null);
      setFileToUpload(null);
      fetchAllResults();
    } catch (error: any) {
      console.error('Error uploading file with patient:', error);
      toast.error(`Error subiendo archivo: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };



  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* 🏷️ Header con Título */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 lg:mb-6 gap-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
          🏥 Gestión Global de Resultados Médicos
        </h1>

        {/* 🔄 Botones de Acción */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">

          {/* 📁 Subida de Archivos Global */}
          <label className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg cursor-pointer flex items-center justify-center text-center">
            <Upload className="mr-2 flex-shrink-0" />
            <span className="truncate">Subir Archivo</span>
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              disabled={studiesLoading}
            />
          </label>

          {/* 📝 Ingreso Manual */}
          <button
            onClick={handleManualEntry}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center"
            disabled={studiesLoading}
          >
            <Plus className="mr-2 flex-shrink-0" />
            <span className="truncate">Ingreso Manual</span>
          </button>

        </div>
      </div>

      {/* 🔍 Filtros y Búsqueda */}
      <div className="mb-6 bg-white p-3 sm:p-4 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          <select
            value={filterStudy}
            onChange={(e) => setFilterStudy(e.target.value)}
            className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
          >
            <option value="">Todos los estudios</option>
            {studies.map(study => (
              <option key={study.id} value={study.name}>{study.name}</option>
            ))}
          </select>

          <button
            onClick={() => { setSearchTerm(''); setFilterStudy(''); }}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* 📊 Bloque Informativo */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm sm:text-base font-medium text-blue-800">
              Módulo Centralizado de Resultados
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              Gestiona todos los resultados médicos de todos los pacientes en un solo lugar.
              Usa la búsqueda y filtros para encontrar resultados específicos.
            </p>
          </div>
        </div>
      </div>

      {/* 📊 Tabla/Lista de Resultados Globales */}
      <ResultsTable
        results={filteredResults}
        onViewResult={setViewingResult}
        onDeleteResult={handleDeleteResult}
        onGenerateInterpretation={handleGenerateInterpretation}
        isLoading={loading}
        generatingInterpretationId={interpretationLoading ? currentInterpretation?.id : null}
      />

      {/* 🔄 Modals */}
      {fileToUpload && (
        <FileUploadModal
          file={fileToUpload}
          studies={studies}
          onNeedPatientSelection={handleNeedPatientSelection}
          onCancel={() => setFileToUpload(null)}
          isLoading={uploading}
        />
      )}

      {manualEntryStudy && (
        <>
          {(() => {
            console.log('🔄 RESULTSPAGE - RENDERING ManualResultForm with:', {
              manualEntryStudy: !!manualEntryStudy,
              studyName: manualEntryStudy?.name,
              studyId: manualEntryStudy?.id,
              camposFormulario: manualEntryStudy?.campos_formulario?.length || 0,
              onSaveFunction: typeof handleSaveManualResult,
              onSaveIsFunction: typeof handleSaveManualResult === 'function',
              selectedPatient: !!selectedPatient,
              selectedPatientId: selectedPatient?.id,
              selectedMaterialsLength: selectedMaterials.length,
              uploading: uploading
            });
            return null;
          })()}
          <ManualResultForm
            study={manualEntryStudy}
            onSave={(results) => {
              console.log('⭐ RESULTSPAGE - onSave callback triggered with:', results);
              console.log('⭐ RESULTSPAGE - Current states:', {
                selectedPatient,
                selectedMaterials,
                manualEntryStudy
              });
              return handleSaveManualResult(results);
            }}
            onCancel={() => {
              console.log('❌ RESULTSPAGE - onCancel called, closing modal');
              setManualEntryStudy(null);
            }}
            isLoading={uploading}
          />
        </>
      )}

      {viewingResult && (
        <ResultViewer
          patient={{
            id: viewingResult.paciente_id,
            nombres: viewingResult.paciente_nombres,
            apellidos: viewingResult.paciente_apellidos,
            cedula_identidad: viewingResult.paciente_cedula,
            email: viewingResult.paciente_email || '',
            telefono: viewingResult.paciente_telefono || '',
            direccion: viewingResult.paciente_direccion || ''
          }}
          result={viewingResult as ResultadoPaciente}
          onClose={() => setViewingResult(null)}
        />
      )}

      {interpretationModalOpen && currentInterpretation && (
        <InterpretationModal
          result={allResults.find(r => r.id === currentInterpretation.id) as any}
          onClose={() => setInterpretationModalOpen(false)}
          onUpdateStatus={handleUpdateInterpretationStatus}
          isLoading={interpretationLoading}
        />
      )}



      <PatientSelectorModal
        isOpen={patientSelectorOpen}
        onClose={() => setPatientSelectorOpen(false)}
        onSelectPatient={(patient) => {
          setSelectedPatient(patient);
          setPatientSelectorOpen(false);

          // Si hay estudio pendiente, abrir formulario manual
          if (manualEntryStudy && selectedMaterials.length > 0) {
            // Ya tenemos materiales y paciente, podemos mostrar el ManualResultForm
            // Evento será manejado por useEffect
          } else if (currentFileToProcess && currentStudyToProcess) {
            // Procesar archivo con paciente seleccionado
            handleFileUploadWithPatient(currentFileToProcess, currentStudyToProcess, patient);
          }
        }}
        title="Seleccionar Paciente para el Resultado"
      />

      <UnifiedEntryModal
        isOpen={unifiedModalOpen}
        onClose={() => setUnifiedModalOpen(false)}
        studies={studies}
        onCompleteSelection={handleCompleteSelection}
      />
    </div>
  );
};

export default ResultsPage;
