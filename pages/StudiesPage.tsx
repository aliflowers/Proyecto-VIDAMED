import React, { useState, useMemo, useEffect } from 'react';
import { supabasePublic as supabase } from '../src/services/supabaseClient';
import { Study } from '../types';
import { Search, ChevronDown, Tag, DollarSign, Clock, Info, Syringe, Loader } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

const StudyCard: React.FC<{ study: Study, backgroundUrl?: string }> = ({ study, backgroundUrl }) => {
    const navigate = useNavigate();

    const handleAgendarClick = () => {
        navigate('/agendar', { state: { selectedStudy: { value: study.id, label: `${study.name} - $${study.price.toFixed(2)}` } } });
    };

    return (
        <div className="relative bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group hover:scale-105">
            {backgroundUrl && (
                <div 
                    className="absolute inset-0 bg-cover bg-center opacity-10 group-hover:opacity-20 transition-opacity"
                    style={{ backgroundImage: `url(${backgroundUrl})` }}
                ></div>
            )}
            <div className="relative z-10 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-primary mb-2">{study.name}</h3>
        <div className="flex items-center text-gray-500 text-sm mb-3">
            <Tag className="w-4 h-4 mr-2" />
            <span>{study.category}</span>
        </div>
        <p className="text-gray-600 mb-4 flex-grow">{study.description}</p>
        <div className="space-y-2 text-sm mt-auto">
            <div className="flex items-center"><Info className="w-4 h-4 mr-2 text-secondary" /> <strong>Preparación:</strong> <span className="ml-1">{study.preparation}</span></div>
            <div className="flex items-center"><Clock className="w-4 h-4 mr-2 text-secondary" /> <strong>Entrega:</strong> <span className="ml-1">{study.deliveryTime}</span></div>
            <div className="flex items-center font-semibold"><DollarSign className="w-4 h-4 mr-2 text-secondary" /> Precio:</div>
            <div className="pl-6">
                <p className="text-lg text-dark font-bold">${study.price.toFixed(2)}</p>
                <p className="text-md text-gray-600">Bs. {(study.costo_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-gray-400">A la tasa del BCV de hoy</p>
            </div>
        </div>
                <button onClick={handleAgendarClick} className="w-full mt-4 bg-secondary text-white font-semibold py-2 px-4 rounded-full hover:bg-primary transition-colors">
                    Agendar este estudio
                </button>
            </div>
        </div>
    );
};


const StudiesPage: React.FC = () => {
    const [studies, setStudies] = useState<Study[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
    const [selectedCategory, setSelectedCategory] = useState('all');

    useEffect(() => {
        const fetchStudies = async () => {
            const { data, error } = await supabase.from('estudios').select('*');

            if (error) {
                console.error('Error fetching studies:', error);
                setError('No se pudieron cargar los estudios. Por favor, intente más tarde.');
            } else {
                // Mapear los datos de Supabase a la interfaz Study
                const formattedData: Study[] = data.map((item: any) => ({
                    id: item.id.toString(),
                    name: item.nombre,
                    category: item.categoria,
                    description: item.descripcion,
                    preparation: item.preparacion,
                    price: item.costo_usd,
                    costo_bs: item.costo_bs,
                    deliveryTime: item.tiempo_entrega,
                    campos_formulario: item.campos_formulario,
                    background_url: item.background_url,
                }));
                setStudies(formattedData);
            }
            setIsLoading(false);
        };

        fetchStudies();
    }, []);

    const categories = useMemo(() => {
        if (studies.length === 0) return ['all'];
        return ['all', ...Array.from(new Set(studies.map(s => s.category)))];
    }, [studies]);
    
    const filteredStudies = useMemo(() => {
        return studies.filter(study => {
            const matchesCategory = selectedCategory === 'all' || study.category === selectedCategory;
            const matchesSearch = study.name.toLowerCase().includes(searchTerm.toLowerCase()) || study.description.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [searchTerm, selectedCategory, studies]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-16 text-red-500">
                <h3 className="text-xl font-semibold">{error}</h3>
            </div>
        );
    }

    return (
        <div className="bg-light">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-dark">Catálogo de Estudios</h1>
                    <p className="mt-2 text-lg text-gray-600">Encuentra la prueba que necesitas. Precisión y confianza en cada resultado.</p>
                </div>

                {/* Filters */}
                <div className="mb-8 p-6 bg-white rounded-lg shadow-md flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-grow w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="Buscar estudio por nombre..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <div className="relative w-full md:w-64">
                        <select
                            className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-full appearance-none focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="all">Todas las categorías</option>
                            {categories.slice(1).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Studies Grid */}
                {filteredStudies.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredStudies.map(study => (
                           <StudyCard key={study.id} study={study} backgroundUrl={study.background_url} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <Syringe className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-xl font-semibold text-dark">No se encontraron estudios</h3>
                        <p className="mt-1 text-gray-500">Intenta ajustar tu búsqueda o filtro. Si no encuentras lo que buscas, <Link to="/contacto" className="text-primary hover:underline">contáctanos</Link>.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudiesPage;
