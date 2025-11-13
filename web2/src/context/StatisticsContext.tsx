import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';

interface StatisticsData {
    patientCount: number;
    studiesCount: number;
    appointmentsCount: number;
}

interface StatisticsContextType {
    stats: StatisticsData;
    isLoading: boolean;
    refreshStats: () => void;
}

const StatisticsContext = createContext<StatisticsContextType | undefined>(undefined);

export const StatisticsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [stats, setStats] = useState<StatisticsData>({
        patientCount: 0,
        studiesCount: 0,
        appointmentsCount: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        setIsLoading(true);
        try {
            const { count: patientCount, error: patientError } = await supabase.from('pacientes').select('*', { count: 'exact', head: true });
            const { count: studiesCount, error: studiesError } = await supabase.from('estudios').select('*', { count: 'exact', head: true });
            const { count: appointmentsCount, error: appointmentsError } = await supabase.from('citas').select('*', { count: 'exact', head: true });

            if (patientError || studiesError || appointmentsError) {
                console.error('Error fetching statistics:', patientError || studiesError || appointmentsError);
            }

            setStats({
                patientCount: patientCount ?? 0,
                studiesCount: studiesCount ?? 0,
                appointmentsCount: appointmentsCount ?? 0,
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const refreshStats = () => {
        fetchStats();
    };

    return (
        <StatisticsContext.Provider value={{ stats, isLoading, refreshStats }}>
            {children}
        </StatisticsContext.Provider>
    );
};

export const useStatistics = (): StatisticsContextType => {
    const context = useContext(StatisticsContext);
    if (context === undefined) {
        throw new Error('useStatistics must be used within a StatisticsProvider');
    }
    return context;
};