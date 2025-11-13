import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/services/supabaseClient';
import { Search, X } from 'lucide-react';

export interface Patient {
  id: string;
  nombres: string;
  apellidos: string;
  cedula_identidad: string;
  email: string;
  telefono: string;
}

interface PatientSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patient: Patient) => void;
  title?: string;
}

const PatientSelectorModal: React.FC<PatientSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectPatient,
  title = "Seleccionar Paciente"
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchPatients();
    }
  }, [isOpen]);

  const fetchPatients = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return patients;
    const term = searchTerm.toLowerCase();
    return patients.filter(patient =>
      patient.nombres.toLowerCase().includes(term) ||
      patient.apellidos.toLowerCase().includes(term) ||
      patient.cedula_identidad.toLowerCase().includes(term) ||
      patient.email?.toLowerCase().includes(term)
    );
  }, [patients, searchTerm]);

  const handleSelectPatient = (patient: Patient) => {
    onSelectPatient(patient);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-5/6 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
              <p className="text-gray-600 mt-1">Seleccione el paciente para asignar el resultado</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombres, apellidos, cédula o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="p-6 h-full overflow-hidden">
            <h3 className="text-lg font-semibold mb-4">
              Pacientes ({filteredPatients.length})
            </h3>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Cargando pacientes...</p>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No se encontraron pacientes con ese criterio' : 'No hay pacientes registrados'}
                </div>
              ) : (
                filteredPatients.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => handleSelectPatient(patient)}
                    className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {patient.nombres} {patient.apellidos}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1 mt-1">
                          <div>Cédula: {patient.cedula_identidad}</div>
                          {patient.email && <div>Email: {patient.email}</div>}
                          {patient.telefono && <div>Teléfono: {patient.telefono}</div>}
                        </div>
                      </div>
                      <div className="text-blue-600 font-medium">
                        Asignar →
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {filteredPatients.length} paciente{filteredPatients.length !== 1 ? 's' : ''} encontrado{filteredPatients.length !== 1 ? 's' : ''}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientSelectorModal;
