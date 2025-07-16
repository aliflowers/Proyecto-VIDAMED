import React, { useState, useEffect } from 'react';
import { BlogPost } from '../../types';

interface PostFormProps {
    post?: BlogPost | null;
    onSave: (post: Omit<BlogPost, 'id' | 'date'> | BlogPost, file?: File) => void;
    onCancel: () => void;
    isLoading: boolean;
}

const PostForm: React.FC<PostFormProps> = ({ post, onSave, onCancel, isLoading }) => {
    const [formData, setFormData] = useState({
        title: '',
        summary: '',
        content: '',
        category: '',
        imageUrl: '',
        author: '',
        meta_title: '',
        meta_description: '',
        keywords: ''
    });
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        if (post) {
            setFormData({
                title: post.title,
                summary: post.summary,
                content: post.content || '',
                category: post.category,
                imageUrl: post.imageUrl,
                author: post.author,
                meta_title: post.meta_title || '',
                meta_description: post.meta_description || '',
                keywords: Array.isArray(post.keywords) ? post.keywords.join(', ') : '',
            });
        }
    }, [post]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const postToSave = {
            ...formData,
            id: post?.id || '',
            date: post?.date || '',
            keywords: formData.keywords ? formData.keywords.split(',').map(k => k.trim()) : [],
        };
        onSave(postToSave, file || undefined);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                <header className="p-6 border-b">
                    <h2 className="text-2xl font-bold">{post ? 'Editar Publicación' : 'Crear Nueva Publicación'}</h2>
                </header>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-8 space-y-6">
                    <input name="title" value={formData.title} onChange={handleChange} placeholder="Título" required className="w-full p-2 border rounded" />
                    <input name="category" value={formData.category} onChange={handleChange} placeholder="Categoría" required className="w-full p-2 border rounded" />
                    <textarea name="summary" value={formData.summary} onChange={handleChange} placeholder="Resumen (texto corto para la tarjeta)" required className="w-full p-2 border rounded" rows={3} />
                    <textarea name="content" value={formData.content} onChange={handleChange} placeholder="Contenido completo del artículo" required className="w-full p-2 border rounded" rows={10} />
                    <p className="text-xs text-gray-500">Puedes usar Markdown para formatear el texto. Ej: `# Título`, `**negrita**`, `*cursiva*`.</p>
                    <input name="author" value={formData.author} onChange={handleChange} placeholder="Autor" required className="w-full p-2 border rounded" />
                    
                    <div className="pt-4 border-t">
                        <h3 className="text-lg font-semibold mb-2">Datos SEO</h3>
                        <input name="meta_title" value={formData.meta_title} onChange={handleChange} placeholder="Meta Título (para Google)" className="w-full p-2 border rounded mb-4" />
                        <textarea name="meta_description" value={formData.meta_description} onChange={handleChange} placeholder="Meta Descripción (para Google)" className="w-full p-2 border rounded mb-4" rows={2} />
                        <input name="keywords" value={formData.keywords} onChange={handleChange} placeholder="Palabras Clave (separadas por coma)" className="w-full p-2 border rounded" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Imagen</label>
                        <input name="imageUrl" value={formData.imageUrl} onChange={handleChange} placeholder="URL de la Imagen" className="w-full p-2 border rounded mt-1" />
                        <p className="text-center text-sm text-gray-500 my-2">O</p>
                        <input type="file" onChange={handleFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                    </div>
                </form>
                <div className="flex justify-end space-x-4 p-6 border-t bg-gray-50 rounded-b-lg">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
                    <button type="button" onClick={handleSubmit} disabled={isLoading} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:bg-gray-400">
                        {isLoading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PostForm;
