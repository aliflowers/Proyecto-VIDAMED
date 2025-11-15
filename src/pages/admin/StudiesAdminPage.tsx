import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { logAudit, auditActionLabel } from '@/services/audit';
import { Study } from '@/types';
import { Loader, Plus, Edit, Trash2, Search, ArrowUp, ArrowDown, ArrowUpDown, Save, Trash } from 'lucide-react';
import StudyForm from '@/components/admin/StudyForm';
import { hasPermission, normalizeRole } from '@/utils/permissions';
import { apiFetch } from '@/services/apiFetch';

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
    const [selectedStudies, setSelectedStudies] = useState<Set<string>>(new Set());

    // Estado de permisos
    const [currentUserRole, setCurrentUserRole] = useState<string>('Asistente');
    const [currentUserOverrides, setCurrentUserOverrides] = useState<Record<string, Record<string, boolean>>>({});
    const API_BASE = import.meta.env.VITE_API_BASE || '/api';
    const can = (action: string) => {
        const roleRaw = currentUserRole || 'Asistente';
        const roleNorm = normalizeRole(roleRaw);
        const overridesForModule = currentUserOverrides['ESTUDIOS'] || {};
        const allowed = hasPermission({ role: roleRaw, overrides: currentUserOverrides }, 'ESTUDIOS', action);
        console.groupCollapsed(`🔐 PermEval [ESTUDIOS] action=${action}`);
        console.log('• role_raw:', roleRaw);
        console.log('• role_norm:', roleNorm);
        console.log('• override(action):', overridesForModule[action]);
        console.log('• overrides_count(ESTUDIOS):', Object.keys(overridesForModule).length);
        console.log('• result:', allowed ? 'permitido' : 'bloqueado');
        console.groupEnd();
        return allowed;
    };
    const [showCreateDenied, setShowCreateDenied] = useState<boolean>(false);
    const [denied, setDenied] = useState<Record<string, Record<string, boolean>>>({});
    const markDenied = (id: string, action: string) => {
        setDenied(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [action]: true } }));
        setTimeout(() => setDenied(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [action]: false } })), 2500);
    };

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
            const formattedData: Study[] = data.map((item: any) => {
                let campos = item.campos_formulario;
                if (typeof campos === 'string') {
                    try {
                        campos = JSON.parse(campos);
                    } catch (e) {
                        console.error("Error parsing campos_formulario: ", e);
                        campos = [];
                    }
                }

                const mappedCampos = (Array.isArray(campos) ? campos : []).map((campo: any) => ({
                    name: campo.name || campo.nombre || '',
                    label: campo.etiqueta || campo.name || campo.nombre || '',
                    unit: campo.unit || campo.unidad || '',
                    reference: campo.reference || campo.valor_referencial || ''
                }));

                return {
                    id: item.id.toString(),
                    name: item.nombre,
                    category: item.categoria,
                    description: item.descripcion,
                    preparation: item.preparacion,
                    price: item.costo_usd,
                    costo_bs: item.costo_bs,
                    deliveryTime: item.tiempo_entrega_quimioluminiscencia || item.tiempo_entrega_elisa_otro || '',
                    campos_formulario: mappedCampos,
                    veces_realizado: item.veces_realizado,
                    metodo: item.metodo,
                    tipo_de_muestra: item.tipo_de_muestra,
                    background_url: item.background_url,
                };
            });
            setStudies(formattedData);
        }
        setIsLoading(false);
    }, [selectedCategory, sortOption, sortAsc]);

    useEffect(() => {
        fetchStudiesAndCategories();
    }, [fetchStudiesAndCategories]);

    // Cargar rol y overrides del usuario para aplicar permisos sobre ESTUDIOS
    useEffect(() => {
        const loadUserPermissions = async () => {
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError) throw authError;
                const userId = user?.id;
                if (!userId) return;
                const metaRol = (user?.user_metadata as any)?.rol || null;
                let effectiveRole: string = metaRol || 'Asistente';
                const { data: profData, error: profErr } = await supabase
                    .from('user_profiles')
                    .select('rol')
                    .eq('user_id', userId)
                    .limit(1);
                if (!profErr && Array.isArray(profData) && profData.length > 0) {
                    effectiveRole = (profData[0] as any)?.rol || effectiveRole;
                }
                setCurrentUserRole(effectiveRole);
                console.groupCollapsed('👤 ESTUDIOS: Carga de rol y overrides');
                console.log('• user_id:', userId);
                console.log('• meta_rol:', metaRol);
                console.log('• effective_role:', effectiveRole);
                // Overrides
                if (API_BASE) {
                    try {
                        const resp = await apiFetch(`${API_BASE}/users/${userId}/permissions`);
                        if (resp.ok) {
                            const json = await resp.json();
                            const overrides: Record<string, Record<string, boolean>> = {};
                            (json.permissions || []).forEach((p: any) => {
                                if (!overrides[p.module]) overrides[p.module] = {};
                                overrides[p.module][p.action] = Boolean(p.allowed);
                            });
                            setCurrentUserOverrides(overrides || {});
                            console.log('• overrides(ESTUDIOS):', overrides['ESTUDIOS'] || {});
                            console.log('• overrides_total_modules:', Object.keys(overrides || {}).length);
                        }
                    } catch (e) {
                        // Silenciar errores de overrides
                    }
                }
                console.groupEnd();
            } catch (e) {
                console.error('[StudiesAdmin] Error cargando permisos de usuario', e);
                setCurrentUserRole((prev) => prev || 'Asistente');
            }
        };
        loadUserPermissions();
    }, []);

    const filteredStudies = useMemo(() => {
        if (!searchTerm) return studies;
        return studies.filter(study =>
            (study.name && study.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (study.category && study.category.toLowerCase().includes(searchTerm.toLowerCase()))
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
        console.groupCollapsed('💸 ESTUDIOS: Guardar tasa BCV');
        console.log('• nueva_tasa:', newTasa);
        console.groupEnd();
        await handleUpdateAllPrices(newTasa);
        setIsLoading(false);
        alert('Tasa de cambio actualizada y precios recalculados exitosamente.');
    };

    const handleUpdateAllPrices = async (newTasa: number) => {
        console.groupCollapsed('💸 ESTUDIOS: Actualización masiva de precios');
        console.log('• can("editar"):', can('editar'));
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
        console.groupEnd();
    };

    const handleSave = async (studyData: Partial<Study>, materials: { material_id: number; cantidad_usada: number }[], file?: File) => {
        const isUpdate = Boolean(studyData.id);
        if (!can(isUpdate ? 'editar' : 'crear')) {
            console.warn('🚫 ESTUDIOS: Acción denegada', {
                isUpdate,
                role: currentUserRole || 'Asistente',
                overrides: currentUserOverrides['ESTUDIOS'] || {}
            });
            alert('No está autorizado para realizar esta acción.');
            return;
        }
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
            tiempo_entrega_elisa_otro: studyData.deliveryTime,
            tiempo_entrega_quimioluminiscencia: studyData.deliveryTime,
            campos_formulario: (studyData.campos_formulario || []).map(campo => ({
                nombre: campo.name,
                etiqueta: campo.label,
                unidad: campo.unit,
                valor_referencial: campo.reference
            })),
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
            await logAudit({
                action: auditActionLabel(isUpdate),
                module: 'ESTUDIOS',
                entity: 'estudio',
                entityId: studyId,
                metadata: {
                    nombre: studyData.name,
                    categoria: studyData.category,
                    precio_usd: priceUSD,
                    costo_bs: costoBS,
                    materiales_count: materials.length,
                    background_url: backgroundUrl,
                },
                success: true,
            });
        }

        setIsModalOpen(false);
        setEditingStudy(null);
        fetchStudiesAndCategories();
        setIsLoading(false);
    };

    const handleDelete = async (studyId: string) => {
        if (!can('eliminar')) {
            alert('No está autorizado para eliminar estudios.');
            return;
        }
        if (window.confirm('¿Estás seguro de que quieres eliminar este estudio?')) {
            setIsLoading(true);
            const study = studies.find(s => s.id === studyId);
            const { error } = await supabase.from('estudios').delete().eq('id', studyId);
            await logAudit({
                action: 'Eliminar',
                module: 'ESTUDIOS',
                entity: 'estudio',
                entityId: studyId,
                metadata: { nombre: study?.name, categoria: study?.category },
                success: !error,
            });
            if (error) {
                console.error('Error deleting study:', error);
                alert(error.message);
            } else {
                fetchStudiesAndCategories();
            }
            setIsLoading(false);
        }
    };

    const handleSelectStudy = (studyId: string, isSelected: boolean) => {
        setSelectedStudies(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(studyId);
            } else {
                newSet.delete(studyId);
            }
            return newSet;
        });
    };

    const handleSelectAll = (isSelected: boolean) => {
        if (isSelected) {
            setSelectedStudies(new Set(filteredStudies.map(study => study.id)));
        } else {
            setSelectedStudies(new Set());
        }
    };

    const handleDeleteSelected = async () => {
        if (!can('eliminar')) {
            alert('No está autorizado para eliminar estudios.');
            return;
        }
        if (selectedStudies.size === 0) {
            alert('Por favor, selecciona al menos un estudio para eliminar.');
            return;
        }

        const confirmMessage = selectedStudies.size === 1
            ? '¿Estás seguro de que quieres eliminar el estudio seleccionado?'
            : `¿Estás seguro de que quieres eliminar los ${selectedStudies.size} estudios seleccionados?`;

        if (window.confirm(confirmMessage)) {
            setIsLoading(true);
            const { error } = await supabase
                .from('estudios')
                .delete()
                .in('id', Array.from(selectedStudies));

            await logAudit({
                action: 'Eliminar',
                module: 'ESTUDIOS',
                entity: 'estudio',
                entityId: null,
                metadata: { deleted_ids: Array.from(selectedStudies), count: selectedStudies.size },
                success: !error,
            });
            if (error) {
                console.error('Error deleting selected studies:', error);
                alert(error.message);
            } else {
                setSelectedStudies(new Set());
                fetchStudiesAndCategories();
                alert(`${selectedStudies.size} estudio(s) eliminado(s) exitosamente.`);
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
        <th className={`py-1 px-1 text-base cursor-pointer hover:bg-gray-100 ${option === 'costo_usd' ? 'text-center' : 'text-left'}`} onClick={() => handleSort(option)}>
            <div className={`flex items-center ${option === 'costo_usd' ? 'justify-center' : ''}`}>
                {label}
                <span className="ml-1">
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
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 lg:mb-6 gap-4">
                <h1 className="text-2xl lg:text-3xl font-bold text-dark">Gestión de Estudios</h1>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                        <input
                            type="number"
                            value={tasaInput}
                            onChange={(e) => setTasaInput(e.target.value)}
                            placeholder="Tasa BCV del día"
                            className="w-full sm:w-40 p-2 border rounded-md text-sm"
                            step="0.01"
                        />
                    </div>
                    <button onClick={handleSaveTasa} className="bg-secondary text-white px-3 py-2 rounded-md hover:bg-secondary-dark flex items-center justify-center text-sm whitespace-nowrap">
                        <Save size={16} className="mr-1" />
                        Guardar Tasa
                    </button>
                    <button
                        onClick={() => { if (!can('crear')) { setShowCreateDenied(true); setTimeout(() => setShowCreateDenied(false), 2500); return; } setEditingStudy(null); setIsModalOpen(true); }}
                        className={`bg-primary text-white px-3 py-2 rounded-md flex items-center justify-center text-sm whitespace-nowrap ${!can('crear') ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-dark'}`}
                    >
                        <Plus size={16} className="mr-1" />
                        Crear Estudio
                    </button>
                    {showCreateDenied && <span className="text-xs text-red-600">No está autorizado</span>}
                </div>
            </div>

            <div className="mb-4 lg:mb-6 flex flex-col sm:flex-row gap-3 lg:gap-4">
                <div className="relative flex-grow">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o categoría..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border rounded-md text-sm"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                </div>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="p-2 border rounded-md bg-white text-sm min-w-0 flex-shrink-0"
                >
                    <option value="all">Todas las categorías</option>
                    {categories.map((cat: any) => (
                        <option key={cat.category} value={cat.category}>{cat.category}</option>
                    ))}
                </select>
            </div>

            {selectedStudies.size > 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-red-700">
                            {selectedStudies.size} estudio(s) seleccionado(s)
                        </span>
                        <button
                            onClick={handleDeleteSelected}
                            className={`bg-red-600 text-white px-4 py-2 rounded-md flex items-center text-sm ${!can('eliminar') ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'}`}
                            disabled={isLoading || !can('eliminar')}
                        >
                            <Trash size={16} className="mr-2" />
                            Eliminar Seleccionados
                        </button>
                    </div>
                </div>
            )}

            <div className="shadow-md rounded-lg overflow-x-auto">
                <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                    <table className="min-w-full table-fixed">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="py-1 px-1 text-center text-base w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedStudies.size === filteredStudies.length && filteredStudies.length > 0}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                </th>
                                <SortableHeader option="nombre" label="Nombre" />
                                <th className="py-1 px-1 text-center text-base">Categoría</th>
                                <th className="py-1 px-1 text-center text-base">Método</th>
                                <th className="py-1 px-1 text-center text-base">Tipo de Muestra</th>
                                <SortableHeader option="costo_usd" label="Precio (USD)" />
                                <th className="py-1 px-1 text-left text-base">Precio (Bs)</th>
                                <th className="py-1 px-1 text-center text-base w-16">Realizados</th>
                                <th className="py-1 px-1 text-right text-base">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 text-base">
                            {filteredStudies.map(study => (
                                <tr key={study.id}>
                                    <td className="py-1 px-1 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedStudies.has(study.id)}
                                            onChange={(e) => handleSelectStudy(study.id, e.target.checked)}
                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                    </td>
                                    <td className="py-1 px-1 font-medium break-words max-w-32">{study.name}</td>
                                    <td className="py-1 px-1 text-center text-gray-500 break-words whitespace-pre-line max-w-20">{study.category}</td>
                                    <td className="py-1 px-1 text-center text-gray-500 break-words max-w-16">{(study as any).metodo || 'N/A'}</td>
                                    <td className="py-1 px-1 text-center text-gray-500 break-words max-w-16">{(study as any).tipo_de_muestra || 'N/A'}</td>
                                    <td className="py-1 px-1 text-center text-gray-500 whitespace-nowrap">${study.price.toFixed(2)}</td>
                                    <td className="py-1 px-1 text-gray-500 break-words max-w-20">Bs. {(study.costo_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="py-1 px-1 text-center font-bold text-gray-700">{study.veces_realizado || 0}</td>
                                    <td className="py-1 px-1 text-right">
                                        <div className="flex justify-end gap-0.5">
                                            <button
                                                onClick={() => { if (!can('editar')) { console.warn('🚫 ESTUDIOS: Edición denegada', { study_id: study.id, role: currentUserRole || 'Asistente', overrides: currentUserOverrides['ESTUDIOS'] || {} }); markDenied(study.id, 'editar'); return; } setEditingStudy(study); setIsModalOpen(true); }}
                                                className={`p-0.5 ${!can('editar') ? 'text-indigo-300 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-900'}`}
                                            >
                                                <Edit size={14} />
                                            </button>
                                            {denied[study.id]?.editar && <span className="ml-1 text-[10px] text-red-600">No está autorizado</span>}
                                            <button
                                                onClick={() => { if (!can('eliminar')) { console.warn('🚫 ESTUDIOS: Eliminación denegada', { study_id: study.id, role: currentUserRole || 'Asistente', overrides: currentUserOverrides['ESTUDIOS'] || {} }); markDenied(study.id, 'eliminar'); return; } handleDelete(study.id); }}
                                                className={`p-0.5 ${!can('eliminar') ? 'text-red-300 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}`}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            {denied[study.id]?.eliminar && <span className="ml-1 text-[10px] text-red-600">No está autorizado</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <StudyForm
                    study={editingStudy || undefined}
                    onSave={(study, file) => handleSave(study, [], file)}
                    onCancel={() => { setIsModalOpen(false); setEditingStudy(null); }}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
};

export default StudiesAdminPage;