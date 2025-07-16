import React, { useState, useEffect } from 'react';
import { Patient } from '../../types';

interface PatientFormData extends Omit<Patient, 'id' | 'nombres' | 'apellidos' | 'cedula_identidad' | 'email' | 'telefono'> {
    id?: number;
    nombres: string;
    apellidos: string;
    cedula_identidad: string;
    email: string;
    telefono: string;
    direccion: string;
}

interface PatientFormProps {
    patient?: Patient | null;
    onSave: (patient: PatientFormData) => Promise<void>;
    onCancel: () => void;
    isLoading: boolean;
}

const PatientForm: React.FC<PatientFormProps> = ({ patient, onSave, onCancel, isLoading }) => {
    const [formData, setFormData] = useState({
        nombres: '',
        apellidos: '',
        cedula_identidad: '',
        email: '',
        telefono: '',
        direccion: ''
    });

    useEffect(() => {
        if (patient) {
            setFormData({
                nombres: patient.nombres,
                apellidos: patient.apellidos,
                cedula_identidad: patient.cedula_identidad,
                email: patient.email,
                telefono: patient.telefono,
                direccion: patient.direccion || ''
            });
        }
    }, [patient]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const patientToSave: PatientFormData = {
            ...formData,
            id: patient?.id,
        };
        onSave(patientToSave);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-6">{patient ? 'Editar Paciente' : 'Registrar Nuevo Paciente'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input name="nombres" value={formData.nombres} onChange={handleChange} placeholder="Nombres" required className="w-full p-2 border rounded" />
                    <input name="apellidos" value={formData.apellidos} onChange={handleChange} placeholder="Apellidos" required className="w-full p-2 border rounded" />
                    <input name="cedula_identidad" value={formData.cedula_identidad} onChange={handleChange} placeholder="Cédula de Identidad" required className="w-full p-2 border rounded" />
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Correo Electrónico" required className="w-full p-2 border rounded" />
                    <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="Teléfono" required className="w-full p-2 border rounded" />
                    <input name="direccion" value={formData.direccion} onChange={handleChange} placeholder="Dirección" required className="w-full p-2 border rounded" />
                    <div className="flex justify-end space-x-4 mt-6">
                        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:bg-gray-400">
                            {isLoading ? 'Guardando...' : 'Guardar Paciente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PatientForm;
