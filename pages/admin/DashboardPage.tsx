import React, { useState, useEffect } from 'react';
import { supabase } from '../../src/services/supabaseClient';
import { Link } from 'react-router-dom';
import { Loader, Calendar, Users, Newspaper, FlaskConical } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useStatistics } from '../../src/context/StatisticsContext';
import useMediaQuery from '../../hooks/useMediaQuery';

const DashboardPage: React.FC = () => {
    const { stats, isLoading: isLoadingStats } = useStatistics();
    const [summary, setSummary] = useState<any>(null);
    const [isLoadingCharts, setIsLoadingCharts] = useState(true);
    const isMobile = useMediaQuery('(max-width: 768px)');

    useEffect(() => {
        const fetchChartData = async () => {
            setIsLoadingCharts(true);
            try {
                const [topStudiesRes, dailyActivityRes, weeklyAppointmentsRes, weeklyPatientsRes] = await Promise.all([
                    supabase.rpc('get_top_studies_last_7_days'),
                    supabase.rpc('get_daily_appointment_activity_last_7_days'),
                    supabase.from('citas').select('*, pacientes(nombres, apellidos)').gte('fecha_cita', new Date().toISOString()).limit(5),
                    supabase.from('pacientes').select('*').gte('created_at', new Date(new Date().setDate(new Date().getDate() - 7)).toISOString()).limit(5)
                ]);

                if (topStudiesRes.error) console.error('Error fetching top studies:', topStudiesRes.error);
                if (dailyActivityRes.error) console.error('Error fetching daily activity:', dailyActivityRes.error);
                if (weeklyAppointmentsRes.error) console.error('Error fetching weekly appointments:', weeklyAppointmentsRes.error);
                if (weeklyPatientsRes.error) console.error('Error fetching weekly patients:', weeklyPatientsRes.error);

                setSummary({
                    top_studies_weekly: topStudiesRes.data,
                    daily_appointment_activity: dailyActivityRes.data,
                    weekly_appointments: weeklyAppointmentsRes.data,
                    weekly_patients: weeklyPatientsRes.data,
                });
            } catch (error) {
                console.error('Error fetching dashboard summary data:', error);
            } finally {
                setIsLoadingCharts(false);
            }
        };
        fetchChartData();
    }, []);

    if (isLoadingStats || isLoadingCharts) {
        return <div className="flex justify-center items-center h-full"><Loader className="animate-spin text-primary" size={48} /></div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-dark mb-6">Dashboard</h1>
            
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Link to="/admin/patients" className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-xl transition-shadow">
                    <h3 className="text-lg font-semibold text-gray-500">Pacientes Totales</h3>
                    <p className="text-4xl font-bold text-primary mt-2">{stats.patientCount}</p>
                </Link>
                <Link to="/admin/studies" className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-xl transition-shadow">
                    <h3 className="text-lg font-semibold text-gray-500">Estudios Totales</h3>
                    <p className="text-4xl font-bold text-primary mt-2">{stats.studiesCount}</p>
                </Link>
                <Link to="/admin/appointments" className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-xl transition-shadow">
                    <h3 className="text-lg font-semibold text-gray-500">Citas Totales</h3>
                    <p className="text-4xl font-bold text-primary mt-2">{stats.appointmentsCount}</p>
                </Link>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Link to="/admin/studies" className="bg-blue-500 text-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center text-center hover:bg-blue-600 transition-transform transform hover:scale-105">
                    <FlaskConical size={24} className="mb-2" />
                    <span className="font-semibold">Gestionar Estudios</span>
                </Link>
                <Link to="/admin/patients" className="bg-green-500 text-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center text-center hover:bg-green-600 transition-transform transform hover:scale-105">
                    <Users size={24} className="mb-2" />
                    <span className="font-semibold">Gestionar Pacientes</span>
                </Link>
                <Link to="/admin/appointments" className="bg-yellow-500 text-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center text-center hover:bg-yellow-600 transition-transform transform hover:scale-105">
                    <Calendar size={24} className="mb-2" />
                    <span className="font-semibold">Gestionar Citas</span>
                </Link>
                <Link to="/admin/posts" className="bg-purple-500 text-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center text-center hover:bg-purple-600 transition-transform transform hover:scale-105">
                    <Newspaper size={24} className="mb-2" />
                    <span className="font-semibold">Gestionar Blog</span>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Weekly Appointments */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-dark mb-4">Citas de la Semana</h2>
                    <ul className="space-y-2">
                        {(summary?.weekly_appointments ?? []).map((cita: any) => (
                            <li key={cita.id} className="p-2 border-b flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{new Date(cita.fecha_cita).toLocaleString('es-VE', { weekday: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' })}</p>
                                    <p className="text-sm text-gray-500">{cita.pacientes?.nombres} {cita.pacientes?.apellidos}</p>
                                </div>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cita.status === 'Confirmada' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{cita.status}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* New Patients */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-dark mb-4">Nuevos Pacientes de la Semana</h2>
                    <ul className="space-y-2">
                        {(summary?.weekly_patients ?? []).map((paciente: any) => (
                            <li key={paciente.id} className="p-2 border-b flex justify-between items-center">
                                <p className="font-medium">{paciente.nombres} {paciente.apellidos}</p>
                                <p className="text-sm text-gray-500">{new Date(paciente.fecha_creacion).toLocaleDateString('es-VE')}</p>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Top Studies Chart */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-dark mb-4">Top 5 Estudios (Semana)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={summary?.top_studies_weekly ?? []} layout="vertical" margin={{ top: 5, right: 30, left: isMobile ? 20 : 100, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="nombre" width={isMobile ? 80 : 150} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#8884d8" name="Nº de Veces Realizado" barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Daily Activity Chart */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-dark mb-4">Actividad de Citas (Últimos 7 Días)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={summary?.daily_appointment_activity ?? []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#82ca9d" name="Citas Creadas" barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
