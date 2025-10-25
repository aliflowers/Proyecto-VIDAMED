import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/services/supabaseClient';
import { Search, X, Check, ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react';
import { SchedulingStudy } from '@/types';
import { Patient } from '@/components/admin/PatientSelectorModal';

interface InventoryItem {
  id: number;
  nombre: string;
  sku: string;
  cantidad_stock: number;
}

interface SelectedMaterial {
  id: number;
  nombre: string;
  sku: string;
  cantidad_usada: number;
  cantidad_stock: number;
}

interface UnifiedEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteSelection: (patient: Patient, study: SchedulingStudy, materials: SelectedMaterial[]) => void;
  studies: SchedulingStudy[];
}

const UnifiedEntryModal: React.FC<UnifiedEntryModalProps> = ({
  isOpen,
  onClose,
  onCompleteSelection,
  studies
}) => {
  // Estados para datos
  const [patients, setPatients] = useState<Patient[]>([]);
  const [materials, setMaterials] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para selecciones
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<SchedulingStudy | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([]);

  // Estados para listas desplegables
  const [patientOpen, setPatientOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [materialsOpen, setMaterialsOpen] = useState(false);

  // Estados para filtros
  const [patientSearch, setPatientSearch] = useState('');
  const [studySearch, setStudySearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');

  // Fetch inicial de datos
  useEffect(() => {
    if (isOpen) {
      fetchPatients();
      fetchMaterials();
    }
  }, [isOpen]);

  const fetchPatients = async () => {
    const { data, error } = await supabase
      .from('pacientes')
      .select('id, nombres, apellidos, cedula_identidad, email, telefono')
      .order('apellidos');

    if (error) {
      console.error('Error fetching patients:', error);
      setPatients([]);
    } else {
      setPatients(data || []);
    }
  };

  const fetchMaterials = async () => {
    const { data, error } = await supabase
      .from('inventario')
      .select('id, nombre, sku, cantidad_stock')
      .gt('cantidad_stock', 0)
      .order('nombre');

    if (error) {
      console.error('Error fetching materials:', error);
      setMaterials([]);
    } else {
      setMaterials(data || []);
    }
    setLoading(false);
  };

  // Filtros
  const filteredPatients = useMemo(() => {
    if (!patientSearch) return patients;
    const term = patientSearch.toLowerCase();
    return patients.filter(patient =>
      patient.nombres.toLowerCase().includes(term) ||
      patient.apellidos.toLowerCase().includes(term) ||
      patient.cedula_identidad.toLowerCase().includes(term) ||
      patient.email?.toLowerCase().includes(term)
    );
  }, [patients, patientSearch]);

  const filteredStudies = useMemo(() => {
    if (!studySearch) return studies;
    const term = studySearch.toLowerCase();
    return studies.filter(study => study.name.toLowerCase().includes(term));
  }, [studies, studySearch]);

  const filteredMaterials = useMemo(() => {
    if (!materialSearch) return materials;
    const term = materialSearch.toLowerCase();
    return materials.filter(material =>
      material.nombre.toLowerCase().includes(term) ||
      material.sku?.toLowerCase().includes(term)
    );
  }, [materials, materialSearch]);

  // Handlers
  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientOpen(false);
  };

  const handleStudySelect = (study: SchedulingStudy) => {
    setSelectedStudy(study);
    setStudyOpen(false);
  };

  const handleMaterialToggle = (material: InventoryItem) => {
    const isSelected = selectedMaterials.find(m => m.id === material.id);
    if (isSelected) {
      setSelectedMaterials(selectedMaterials.filter(m => m.id !== material.id));
    } else {
      // Convertir InventoryItem a SelectedMaterial con cantidad por defecto de 1
      const selectedMaterial: SelectedMaterial = {
        id: material.id,
        nombre: material.nombre,
        sku: material.sku,
        cantidad_usada: 1,
        cantidad_stock: material.cantidad_stock
      };
      setSelectedMaterials([...selectedMaterials, selectedMaterial]);
    }
  };

  const handleQuantityChange = (materialId: number, newQuantity: number) => {
    setSelectedMaterials(selectedMaterials.map(material =>
      material.id === materialId ? { ...material, cantidad_usada: newQuantity } : material
    ));
  };

  const handleSubmit = () => {
    console.log('🎯 UnifiedEntryModal handleSubmit called');
    console.log('Selected patient:', selectedPatient);
    console.log('Selected study:', selectedStudy);
    console.log('Selected materials:', selectedMaterials);

    if (!selectedPatient || !selectedStudy || selectedMaterials.length === 0) {
      alert('Por favor seleccione paciente, estudio y al menos un material.');
      return;
    }

    console.log('✅ Calling onCompleteSelection...');
    onCompleteSelection(selectedPatient, selectedStudy, selectedMaterials);
    console.log('✅ onCompleteSelection called, closing modal...');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] overflow-hidden relative z-[1000]">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Configurar Nuevo Resultado Médico</h2>
              <p className="text-gray-600 mt-1">Seleccione paciente, estudio y materiales utilizados</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto">
            {/* Paciente Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-4">1. Seleccionar Paciente</h3>
              <div className="relative">
                <button
                  onClick={() => setPatientOpen(!patientOpen)}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white flex items-center justify-between hover:border-blue-400"
                >
                  <span className={selectedPatient ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedPatient ? `${selectedPatient.nombres} ${selectedPatient.apellidos}` : 'Seleccionar paciente...'}
                  </span>
                  {patientOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {patientOpen && (
                  <div className="absolute z-[1500] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-2xl max-h-64">
                    {/* Filtro interno */}
                    <div className="p-2 border-b border-gray-200">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Buscar paciente..."
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          className="w-full pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-md"
                        />
                        <Search size={16} className="absolute left-2 top-2.5 text-gray-400" />
                      </div>
                    </div>

                    {/* Lista con scroll */}
                    <div className="max-h-48 overflow-y-auto">
                      {loading ? (
                        <div className="p-4 text-center text-gray-500">Cargando...</div>
                      ) : filteredPatients.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No se encontraron pacientes</div>
                      ) : (
                        filteredPatients.map((patient) => (
                          <div
                            key={patient.id}
                            onClick={() => handlePatientSelect(patient)}
                            className="p-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer last:border-b-0"
                          >
                            <div className="font-medium">{patient.nombres} {patient.apellidos}</div>
                            <div className="text-sm text-gray-600">Cédula: {patient.cedula_identidad}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Estudio Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-4">2. Seleccionar Estudio</h3>
              <div className="relative">
                <button
                  onClick={() => setStudyOpen(!studyOpen)}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white flex items-center justify-between hover:border-blue-400"
                >
                  <span className={selectedStudy ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedStudy ? selectedStudy.name : 'Seleccionar estudio...'}
                  </span>
                  {studyOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {studyOpen && (
                  <div className="absolute z-[1500] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-2xl max-h-64">
                    {/* Filtro interno */}
                    <div className="p-2 border-b border-gray-200">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Buscar estudio..."
                          value={studySearch}
                          onChange={(e) => setStudySearch(e.target.value)}
                          className="w-full pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-md"
                        />
                        <Search size={16} className="absolute left-2 top-2.5 text-gray-400" />
                      </div>
                    </div>

                    {/* Lista con scroll */}
                    <div className="max-h-48 overflow-y-auto">
                      {filteredStudies.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No se encontraron estudios</div>
                      ) : (
                        filteredStudies.map((study) => (
                          <div
                            key={study.id}
                            onClick={() => handleStudySelect(study)}
                            className="p-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer last:border-b-0"
                          >
                            <div className="font-medium">{study.name}</div>
                            <div className="text-sm text-gray-600">{study.category || 'Sin categoría'}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Materials Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-4">3. Seleccionar Materiales</h3>
              <div className="relative">
                <button
                  onClick={() => setMaterialsOpen(!materialsOpen)}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white flex items-center justify-between hover:border-blue-400"
                >
                  <span className={selectedMaterials.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedMaterials.length > 0 ? `${selectedMaterials.length} material(es) seleccionado(s)` : 'Seleccionar materiales...'}
                  </span>
                  {materialsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {materialsOpen && (
                  <div className="absolute z-[1500] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-2xl max-h-80">
                    {/* Filtro interno */}
                    <div className="p-2 border-b border-gray-200">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Buscar material..."
                          value={materialSearch}
                          onChange={(e) => setMaterialSearch(e.target.value)}
                          className="w-full pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-md"
                        />
                        <Search size={16} className="absolute left-2 top-2.5 text-gray-400" />
                      </div>
                    </div>

                    {/* Lista con checkboxes y controles de cantidad */}
                    <div className="max-h-48 overflow-y-auto">
                      {loading ? (
                        <div className="p-4 text-center text-gray-500">Cargando materiales...</div>
                      ) : filteredMaterials.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No se encontraron materiales</div>
                      ) : (
                        filteredMaterials.map((material) => {
                          const isSelected = selectedMaterials.some(m => m.id === material.id);
                          const selectedMaterial = selectedMaterials.find(m => m.id === material.id);

                          return (
                            <div
                              key={material.id}
                              className={`p-3 border-b border-gray-100 last:border-b-0 flex items-center ${
                                isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              {/* Checkbox */}
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleMaterialToggle(material)}
                                className="mr-3 h-4 w-4"
                              />

                              <div className="flex-1">
                                <div className="font-medium flex items-center">
                                  {material.nombre}
                                  {isSelected && <Check size={16} className="ml-2 text-green-600" />}
                                </div>
                                <div className="text-sm text-gray-600">SKU: {material.sku || 'N/A'} | Stock: {material.cantidad_stock}</div>
                              </div>

                              {/* Controles de cantidad */}
                              {isSelected && selectedMaterial && (
                                <div className="flex items-center space-x-2 ml-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newQuantity = Math.max(1, selectedMaterial.cantidad_usada - 1);
                                      handleQuantityChange(selectedMaterial.id, newQuantity);
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded"
                                  >
                                    <Minus size={14} />
                                  </button>

                                  <input
                                    type="number"
                                    value={selectedMaterial.cantidad_usada}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      const newQuantity = parseInt(e.target.value, 10);
                                      if (!isNaN(newQuantity) && newQuantity >= 1 && newQuantity <= material.cantidad_stock) {
                                        handleQuantityChange(selectedMaterial.id, newQuantity);
                                      }
                                    }}
                                    className="w-16 px-2 py-1 text-center border rounded text-sm"
                                    min="1"
                                    max={material.cantidad_stock}
                                  />

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newQuantity = Math.min(material.cantidad_stock, selectedMaterial.cantidad_usada + 1);
                                      handleQuantityChange(selectedMaterial.id, newQuantity);
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          {selectedPatient && selectedStudy && selectedMaterials.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Configuración Completa:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <div><strong>Paciente:</strong> {selectedPatient.nombres} {selectedPatient.apellidos}</div>
                <div><strong>Estudio:</strong> {selectedStudy.name}</div>
                <div><strong>Materiales:</strong> {selectedMaterials.length} seleccionado(s)</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedPatient || !selectedStudy || selectedMaterials.length === 0}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Continuar con Ingreso Manual
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedEntryModal;
