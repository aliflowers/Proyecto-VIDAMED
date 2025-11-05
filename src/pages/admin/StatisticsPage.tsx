import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { Loader } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useStatistics } from '@/context/StatisticsContext';
import useMediaQuery from '@/hooks/useMediaQuery';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const StatisticsPage: React.FC = () => {
    const { stats: globalStats, isLoading: isGlobalLoading } = useStatistics();
    const [chartStats, setChartStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('total'); // 'week', 'month', 'year', 'total'
    const isMobile = useMediaQuery('(max-width: 768px)');

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
        // La carga de datos para los gráficos se mantiene, pero los KPIs vendrán del contexto.
        // Aquí se podrían optimizar las llamadas si los datos del gráfico también se mueven al contexto.
        const { startDate, endDate } = getDatesForRange();
        
        // Chart Data
        const { data: popularStudies } = await supabase.rpc('get_studies_by_popularity');
        const { data: monthlyPatients } = await supabase.rpc('get_monthly_patient_registrations', { start_date: startDate, end_date: endDate });
        const { data: locationRatio } = await supabase.rpc('get_appointment_location_ratio');
        const { data: topPatients } = await supabase.rpc('get_top_patients_by_appointments');

        setChartStats({
            popularStudies,
            monthlyPatients,
            locationRatio,
            topPatients,
        });
        setIsLoading(false);
    };

    if (isLoading || isGlobalLoading) {
        return <div className="flex justify-center items-center h-full"><Loader className="animate-spin text-primary" size={48} /></div>;
    }

    const tickFormatter = (value: string) => {
        if (isMobile && value.length > 10) {
            return `${value.substring(0, 10)}...`;
        }
        return value;
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-dark">Estadísticas</h1>
                <div className="flex gap-2 flex-wrap justify-center">
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
                    <h3 className="text-lg font-semibold text-gray-500">Pacientes Totales</h3>
                    <p className="text-4xl font-bold text-primary mt-2">{globalStats.patientCount}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                    <h3 className="text-lg font-semibold text-gray-500">Citas Totales</h3>
                    <p className="text-4xl font-bold text-primary mt-2">{globalStats.appointmentsCount}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                    <h3 className="text-lg font-semibold text-gray-500">Estudios Totales</h3>
                    <p className="text-4xl font-bold text-primary mt-2">{globalStats.studiesCount}</p>
                </div>
            </div>
            
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-dark mb-4">Estudios más Populares</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartStats?.popularStudies} margin={{ top: 5, right: 20, bottom: isMobile ? 70 : 20, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={isMobile ? -60 : -45} textAnchor="end" height={isMobile ? 80 : 60} tick={{ fontSize: 10 }} />
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
                        <LineChart data={chartStats?.monthlyPatients} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
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
                            <Pie data={chartStats?.locationRatio || []} dataKey="count" nameKey="location" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                {chartStats?.locationRatio?.map((_: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-dark mb-4">Top 5 Pacientes por Nº de Citas</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartStats?.topPatients} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: isMobile ? 80 : 100 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="name" width={isMobile ? 100 : 150} tickFormatter={tickFormatter} />
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