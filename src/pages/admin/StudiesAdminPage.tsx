import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { Study } from '@/types';
import { Loader, Plus, Edit, Trash2, Search, ArrowUp, ArrowDown, ArrowUpDown, Save } from 'lucide-react';
import StudyForm from '@/components/admin/StudyForm';

type SortOption = 'nombre' | 'costo_usd' | 'veces_realizado';

const StudiesAdminPage: React.FC = () => {
    const [studies, setStudies] = useState<Study[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudy, setEditingStudy] = useState<Study | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortOption, setSortOption] = useState<SortOption>('nombre');
    const [sortAsc, setSortAsc] = useState(true);
    const [tasaBcvGlobal, setTasaBcvGlobal] = useState(0);
    const [tasaInput, setTasaInput] = useState('');

    const fetchStudiesAndCategories = useCallback(async () => {
        setIsLoading(true);

        // Fetch global BCV rate
        const { data: configData, error: configError } = await supabase
            .from('site_config')
            .select('tasa_bcv_global')
            .eq('id', 1)
            .single();

        if (configError) {
            console.error('Error fetching global BCV rate:', configError);
            setError('No se pudo cargar la configuración de la tasa de cambio.');
        } else if (configData) {
            setTasaBcvGlobal(configData.tasa_bcv_global);
            setTasaInput(configData.tasa_bcv_global.toString());
        }
        
        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase.rpc('get_distinct_categories');
        if (categoriesError) {
            console.error('Error fetching categories:', categoriesError);
        } else {
            setCategories(categoriesData || []);
        }

        // Fetch studies
        let query = supabase.from('estudios').select('*');
        
        if (selectedCategory !== 'all') {
            query = query.eq('categoria', selectedCategory);
        }

        query = query.order(sortOption, { ascending: sortAsc });

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching studies:', error);
            setError('No se pudieron cargar los estudios.');
        } else {
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
                veces_realizado: item.veces_realizado,
            }));
            setStudies(formattedData);
        }
        setIsLoading(false);
    }, [selectedCategory, sortOption, sortAsc]);

    useEffect(() => {
        fetchStudiesAndCategories();
    }, [fetchStudiesAndCategories]);

    const filteredStudies = useMemo(() => {
        if (!searchTerm) return studies;
        return studies.filter(study =>
            study.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            study.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, studies]);

    const handleSaveTasa = async () => {
        const newTasa = parseFloat(tasaInput);
        if (isNaN(newTasa) || newTasa <= 0) {
            alert('Por favor, ingrese un valor de tasa válido.');
            return;
        }

        setIsLoading(true);
        const { error: updateError } = await supabase
            .from('site_config')
            .update({ tasa_bcv_global: newTasa })
            .eq('id', 1);

        if (updateError) {
            alert(`Error al actualizar la tasa: ${updateError.message}`);
            setIsLoading(false);
            return;
        }

        setTasaBcvGlobal(newTasa);
        await handleUpdateAllPrices(newTasa);
        setIsLoading(false);
        alert('Tasa de cambio actualizada y precios recalculados exitosamente.');
    };

    const handleUpdateAllPrices = async (newTasa: number) => {
        const updates = studies.map(study => ({
            id: study.id,
            costo_bs: study.price * newTasa
        }));

        const { error } = await supabase.from('estudios').upsert(updates);

        if (error) {
            console.error('Error updating all prices:', error);
            alert('Ocurrió un error al actualizar los precios de los estudios.');
        } else {
            fetchStudiesAndCategories(); // Refetch to show updated prices
        }
    };

    const handleSave = async (studyData: Partial<Study>, materials: { material_id: number; cantidad_usada: number }[], file?: File) => {
        setIsLoading(true);
        let backgroundUrl = studyData.background_url;

        if (file) {
            const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const fileName = `study_bg_${Date.now()}_${cleanFileName}`;
            const { error: uploadError } = await supabase.storage.from('hero-slider').upload(fileName, file, { upsert: true });
            if (uploadError) {
                alert(`Error subiendo la imagen: ${uploadError.message}`);
                setIsLoading(false);
                return;
            }
            const { data: { publicUrl } } = supabase.storage.from('hero-slider').getPublicUrl(fileName);
            backgroundUrl = publicUrl;
        }

        const priceUSD = studyData.price || 0;
        const costoBS = priceUSD * tasaBcvGlobal;

        const dataToSave = {
            nombre: studyData.name,
            categoria: studyData.category,
            descripcion: studyData.description,
            preparacion: studyData.preparation,
            costo_usd: priceUSD,
            costo_bs: costoBS,
            tiempo_entrega: studyData.deliveryTime,
            campos_formulario: studyData.campos_formulario,
            background_url: backgroundUrl,
        };

        let studyId = studyData.id ? studyData.id : null;
        let error;

        if (studyId) {
            const { error: updateError } = await supabase.from('estudios').update(dataToSave).eq('id', studyId);
            error = updateError;
        } else {
            const { data, error: createError } = await supabase.from('estudios').insert(dataToSave).select('id').single();
            error = createError;
            if (data) {
                studyId = data.id;
            }
        }

        if (error) {
            console.error('Error saving study:', error);
            alert(error.message);
            setIsLoading(false);
            return;
        }

        if (studyId) {
            // Delete existing materials for this study
            const { error: deleteError } = await supabase.from('estudio_materiales').delete().eq('estudio_id', studyId);
            if (deleteError) {
                console.error('Error deleting old materials:', deleteError);
                // Decide if you want to stop the process here or just log the error
            }

            // Insert new materials
            if (materials.length > 0) {
                const materialsToInsert = materials.map(m => ({ ...m, estudio_id: studyId }));
                const { error: insertError } = await supabase.from('estudio_materiales').insert(materialsToInsert);
                if (insertError) {
                    console.error('Error saving materials:', insertError);
                    alert('Error al guardar los materiales del estudio.');
                    // Potentially roll back study creation/update or handle otherwise
                }
            }
        }

        setIsModalOpen(false);
        setEditingStudy(null);
        fetchStudiesAndCategories();
        setIsLoading(false);
    };

    const handleDelete = async (studyId: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este estudio?')) {
            setIsLoading(true);
            const { error } = await supabase.from('estudios').delete().eq('id', studyId);
            if (error) {
                console.error('Error deleting study:', error);
                alert(error.message);
            } else {
                fetchStudiesAndCategories();
            }
            setIsLoading(false);
        }
    };

    const handleSort = (option: SortOption) => {
        if (option === sortOption) {
            setSortAsc(!sortAsc);
        } else {
            setSortOption(option);
            setSortAsc(true);
        }
    };

    const SortableHeader: React.FC<{ option: SortOption, label: string }> = ({ option, label }) => (
        <th className="py-3 px-6 text-left cursor-pointer hover:bg-gray-100" onClick={() => handleSort(option)}>
            <div className="flex items-center">
                {label}
                <span className="ml-2">
                    {sortOption === option ? (
                        sortAsc ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                        <ArrowUpDown size={14} className="text-gray-400" />
                    )}
                </span>
            </div>
        </th>
    );

    if (isLoading && studies.length === 0) {
        return <div className="flex justify-center items-center h-full"><Loader className="animate-spin text-primary" size={48} /></div>;
    }

    if (error) {
        return <div className="text-center py-16 text-red-500"><h3 className="text-xl font-semibold">{error}</h3></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-dark">Gestión de Estudios</h1>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                        <input
                            type="number"
                            value={tasaInput}
                            onChange={(e) => setTasaInput(e.target.value)}
                            placeholder="Tasa BCV del día"
                            className="p-2 border rounded-md w-40"
                            step="0.01"
                        />
                    </div>
                    <button onClick={handleSaveTasa} className="bg-secondary text-white px-4 py-2 rounded-md hover:bg-secondary-dark flex items-center">
                        <Save size={18} className="mr-2" />
                        Guardar Tasa
                    </button>
                    <button onClick={() => { setEditingStudy(null); setIsModalOpen(true); }} className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark flex items-center">
                        <Plus size={20} className="mr-2" />
                        Crear Nuevo Estudio
                    </button>
                </div>
            </div>

            <div className="mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o categoría..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border rounded-md"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="p-2 border rounded-md bg-white"
                >
                    <option value="all">Todas las categorías</option>
                    {categories.map((cat: any) => (
                        <option key={cat.category} value={cat.category}>{cat.category}</option>
                    ))}
                </select>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <SortableHeader option="nombre" label="Nombre" />
                            <th className="py-3 px-6 text-left">Categoría</th>
                            <SortableHeader option="costo_usd" label="Precio (USD)" />
                            <th className="py-3 px-6 text-left">Precio (Bs)</th>
                            <SortableHeader option="veces_realizado" label="Realizados" />
                            <th className="py-3 px-6 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredStudies.map(study => (
                            <tr key={study.id}>
                                <td className="py-4 px-6 font-medium">{study.name}</td>
                                <td className="py-4 px-6 text-gray-500">{study.category}</td>
                                <td className="py-4 px-6 text-gray-500">${study.price.toFixed(2)}</td>
                                <td className="py-4 px-6 text-gray-500">Bs. {(study.costo_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="py-4 px-6 text-center font-bold text-gray-700">{study.veces_realizado || 0}</td>
                                <td className="py-4 px-6 text-right">
                                    <button onClick={() => { setEditingStudy(study); setIsModalOpen(true); }} className="text-indigo-600 hover:text-indigo-900 mr-4"><Edit size={18} /></button>
                                    <button onClick={() => handleDelete(study.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <StudyForm
                    study={editingStudy || undefined}
                    onSave={(study, materials, file) => handleSave(study, materials, file)}
                    onCancel={() => { setIsModalOpen(false); setEditingStudy(null); }}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
};

export default StudiesAdminPage;