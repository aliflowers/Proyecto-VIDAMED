import React, { useState, useEffect } from 'react';
import { supabase } from '../../src/services/supabaseClient';
import { Loader } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const StatisticsPage: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('total'); // 'week', 'month', 'year', 'total'

    useEffect(() => {
        fetchStats();
    }, [timeRange]);

    const getDatesForRange = () => {
        const endDate = new Date();
        let startDate = new Date();
        switch (timeRange) {
            case 'week':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(endDate.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
            case 'total':
            default:
                startDate = new Date(0); // Epoch
                break;
        }
        return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
    };

    const fetchStats = async () => {
        setIsLoading(true);
        const { startDate, endDate } = getDatesForRange();

        // KPIs
        const { count: patientCount } = await supabase.from('pacientes').select('*', { count: 'exact', head: true }).gte('fecha_creacion', startDate).lte('fecha_creacion', endDate);
        const { count: appointmentCount } = await supabase.from('citas').select('*', { count: 'exact', head: true }).gte('fecha_cita', startDate).lte('fecha_cita', endDate);
        const { data: totalStudiesPerformed } = await supabase.rpc('get_total_studies_performed');

        // Chart Data
        const { data: popularStudies } = await supabase.rpc('get_studies_by_popularity');
        const { data: monthlyPatients } = await supabase.rpc('get_monthly_patient_registrations', { start_date: startDate, end_date: endDate });
        const { data: locationRatio } = await supabase.rpc('get_appointment_location_ratio');
        const { data: topPatients } = await supabase.rpc('get_top_patients_by_appointments');

        setStats({
            patientCount,
            appointmentCount,
            totalStudiesPerformed,
            popularStudies,
            monthlyPatients,
            locationRatio,
            topPatients,
        });
        setIsLoading(false);
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader className="animate-spin text-primary" size={48} /></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-dark">Estadísticas</h1>
                <div className="flex gap-2">
                    {['total', 'year', 'month', 'week'].map(range => (
                        <button key={range} onClick={() => setTimeRange(range)} className={`px-4 py-2 rounded-md text-sm font-medium ${timeRange === range ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
                            {range === 'total' ? 'Total' : `Último(a) ${range === 'year' ? 'Año' : range === 'month' ? 'Mes' : 'Semana'}`}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                    <h3 className="text-lg font-semibold text-gray-500">Pacientes Registrados</h3>
                    <p className="text-4xl font-bold text-primary mt-2">{stats?.patientCount || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                    <h3 className="text-lg font-semibold text-gray-500">Citas Agendadas</h3>
                    <p className="text-4xl font-bold text-primary mt-2">{stats?.appointmentCount || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                    <h3 className="text-lg font-semibold text-gray-500">Estudios Realizados (Total)</h3>
                    <p className="text-4xl font-bold text-primary mt-2">{stats?.totalStudiesPerformed || 0}</p>
                </div>
            </div>
            
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-dark mb-4">Estudios más Populares</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats?.popularStudies} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                            <YAxis label={{ value: 'Cantidad', angle: -90, position: 'insideLeft' }} />
                            <Tooltip />
                            <Legend verticalAlign="top" />
                            <Bar dataKey="count" fill="#007C91" name="Nº de Veces Realizado" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-dark mb-4">Crecimiento de Pacientes</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={stats?.monthlyPatients} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis label={{ value: 'Nuevos Pacientes', angle: -90, position: 'insideLeft' }} />
                            <Tooltip />
                            <Legend verticalAlign="top" />
                            <Line type="monotone" dataKey="count" stroke="#4FBDBA" name="Nuevos Pacientes" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-dark mb-4">Citas por Ubicación</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={stats?.locationRatio} dataKey="count" nameKey="location" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                {stats?.locationRatio?.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-dark mb-4">Top 5 Pacientes por Nº de Citas</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats?.topPatients} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="name" width={150} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#F5A623" name="Nº de Citas" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default StatisticsPage;
