import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { logAudit } from '@/services/audit';
import { BlogPost } from '@/types';
import { Loader, Plus, Edit, Trash2 } from 'lucide-react';
import PostForm from '@/components/admin/PostForm';

const PostsAdminPage: React.FC = () => {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('publicaciones_blog')
            .select('*')
            .order('fecha', { ascending: false });

        if (error) {
            console.error('Error fetching posts:', error);
            setError('No se pudieron cargar las publicaciones.');
        } else {
            const formattedData: BlogPost[] = data.map((item: any) => ({
                id: item.id.toString(),
                title: item.titulo,
                summary: item.resumen,
                content: item.contenido,
                category: item.categoria,
                imageUrl: item.imagen_url,
                author: item.autor,
                date: new Date(item.fecha).toLocaleDateString('es-ES'),
                meta_title: item.meta_title,
                meta_description: item.meta_description,
                keywords: item.keywords,
                slug: item.slug || '',
            }));
            setPosts(formattedData);
        }
        setIsLoading(false);
    };

    const handleSave = async (postData: Omit<BlogPost, 'id' | 'date'> | BlogPost, file?: File) => {
        setIsLoading(true);
        let imageUrl = postData.imageUrl;

        if (file) {
            const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const fileName = `${Date.now()}_${cleanFileName}`;
            const { error: uploadError } = await supabase.storage.from('blog-images').upload(fileName, file);
            if (uploadError) {
                alert(`Error subiendo la imagen: ${uploadError.message}`);
                setIsLoading(false);
                return;
            }
            const { data } = supabase.storage.from('blog-images').getPublicUrl(fileName);
            if (data) {
                imageUrl = data.publicUrl;
            }
        }

        const dataToSave = {
            titulo: postData.title,
            resumen: postData.summary,
            contenido: postData.content,
            categoria: postData.category,
            imagen_url: imageUrl,
            autor: postData.author,
            fecha: new Date().toISOString(),
            meta_title: postData.meta_title,
            meta_description: postData.meta_description,
            keywords: postData.keywords,
            slug: postData.slug || postData.title.toLowerCase().replace(/\s+/g, '-').slice(0, 50),
        };

        let error;
        if ('id' in postData && postData.id) {
            // Update
            const { error: updateError } = await supabase.from('publicaciones_blog').update(dataToSave).eq('id', postData.id);
            error = updateError;
            try {
                await logAudit({
                    action: 'Actualizar',
                    module: 'Blog',
                    entity: 'publicaciones_blog',
                    entityId: postData.id,
                    metadata: { slug: dataToSave.slug, titulo: dataToSave.titulo },
                    success: !updateError,
                });
            } catch {}
        } else {
            // Create
            const { error: createError } = await supabase.from('publicaciones_blog').insert([dataToSave]);
            error = createError;
            try {
                await logAudit({
                    action: 'Crear',
                    module: 'Blog',
                    entity: 'publicaciones_blog',
                    entityId: null,
                    metadata: { slug: dataToSave.slug, titulo: dataToSave.titulo },
                    success: !createError,
                });
            } catch {}
        }

        if (error) {
            console.error('Error saving post:', error);
            alert(error.message);
        } else {
            setIsModalOpen(false);
            setEditingPost(null);
            fetchPosts();
        }
        setIsLoading(false);
    };

    const handleDelete = async (postId: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta publicación?')) {
            setIsLoading(true);
            const { error } = await supabase.from('publicaciones_blog').delete().eq('id', postId);
            try {
                await logAudit({
                    action: 'Eliminar',
                    module: 'Blog',
                    entity: 'publicaciones_blog',
                    entityId: postId,
                    metadata: null,
                    success: !error,
                });
            } catch {}
            if (error) {
                console.error('Error deleting post:', error);
                alert(error.message);
            } else {
                fetchPosts();
            }
            setIsLoading(false);
        }
    };

    if (isLoading && posts.length === 0) {
        return <div className="flex justify-center items-center h-full"><Loader className="animate-spin text-primary" size={48} /></div>;
    }

    if (error) {
        return <div className="text-center py-16 text-red-500"><h3 className="text-xl font-semibold">{error}</h3></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-dark">Gestión de Publicaciones del Blog</h1>
                <button onClick={() => { setEditingPost(null); setIsModalOpen(true); }} className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark flex items-center">
                    <Plus size={20} className="mr-2" />
                    Crear Nueva Publicación
                </button>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Autor</th>
                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="py-3 px-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {posts.map(post => (
                            <tr key={post.id}>
                                <td className="py-4 px-6 whitespace-nowrap font-medium text-gray-900 max-w-xs truncate">{post.title}</td>
                                <td className="py-4 px-6 whitespace-nowrap text-gray-500">{post.category}</td>
                                <td className="py-4 px-6 whitespace-nowrap text-gray-500">{post.author}</td>
                                <td className="py-4 px-6 whitespace-nowrap text-gray-500">{post.date}</td>
                                <td className="py-4 px-6 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => { setEditingPost(post); setIsModalOpen(true); }} className="text-indigo-600 hover:text-indigo-900 mr-4"><Edit size={18} /></button>
                                    <button onClick={() => handleDelete(post.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <PostForm
                    post={editingPost}
                    onSave={handleSave}
                    onCancel={() => { setIsModalOpen(false); setEditingPost(null); }}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
};

export default PostsAdminPage;