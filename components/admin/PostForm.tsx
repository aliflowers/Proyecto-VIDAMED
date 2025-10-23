import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { BlogPost } from '../../types';
import { Sparkles } from 'lucide-react';
import BlogAiGeneratorModal from './BlogAiGeneratorModal';
import showdown from 'showdown';

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
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

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

    const handleContentChange = (value: string) => {
        setFormData(prev => ({ ...prev, content: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleGenerateAiPost = async (params: any) => {
        setIsGenerating(true);
        try {
            const response = await fetch('/api/generate-blog-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en el servidor.');
            }

            const parsedResult = await response.json();

            const converter = new showdown.Converter();
            const htmlContent = converter.makeHtml(parsedResult.contenido_html || '');

            setFormData(prev => ({
                ...prev,
                title: parsedResult.titulo_articulo || '',
                content: htmlContent,
                summary: parsedResult.resumen || '',
                meta_title: parsedResult.meta_titulo || '',
                meta_description: parsedResult.meta_descripcion || '',
                keywords: parsedResult.keywords || '',
            }));

            setIsAiModalOpen(false);
        } catch (error: any) {
            console.error("Error generating AI post:", error);
            alert(`Hubo un error al generar el contenido: ${error.message}`);
        } finally {
            setIsGenerating(false);
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
                <header className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-2xl font-bold">{post ? 'Editar Publicación' : 'Crear Nueva Publicación'}</h2>
                    {!post && (
                        <button
                            type="button"
                            onClick={() => setIsAiModalOpen(true)}
                            className="flex items-center px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary-dark"
                        >
                            <Sparkles size={18} className="mr-2" />
                            Generar con IA
                        </button>
                    )}
                </header>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-8 space-y-6">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Título</label>
                        <input id="title" name="title" value={formData.title} onChange={handleChange} required className="w-full p-2 border rounded mt-1" />
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoría</label>
                        <input id="category" name="category" value={formData.category} onChange={handleChange} required className="w-full p-2 border rounded mt-1" />
                    </div>
                    <div>
                        <label htmlFor="summary" className="block text-sm font-medium text-gray-700">Resumen (texto corto para la tarjeta)</label>
                        <textarea id="summary" name="summary" value={formData.summary} onChange={handleChange} required className="w-full p-2 border rounded mt-1" rows={3} />
                    </div>
                    <div>
                        <label htmlFor="content" className="block text-sm font-medium text-gray-700">Contenido completo del artículo</label>
                        <ReactQuill theme="snow" value={formData.content} onChange={handleContentChange} className="mt-1 bg-white" />
                    </div>
                    <div>
                        <label htmlFor="author" className="block text-sm font-medium text-gray-700">Autor</label>
                        <input id="author" name="author" value={formData.author} onChange={handleChange} required className="w-full p-2 border rounded mt-1" />
                    </div>
                    
                    <div className="pt-4 border-t">
                        <h3 className="text-lg font-semibold mb-2">Datos SEO</h3>
                        <div>
                            <label htmlFor="meta_title" className="block text-sm font-medium text-gray-700">Meta Título (para Google)</label>
                            <input id="meta_title" name="meta_title" value={formData.meta_title} onChange={handleChange} className="w-full p-2 border rounded mt-1" />
                        </div>
                        <div className="mt-4">
                            <label htmlFor="meta_description" className="block text-sm font-medium text-gray-700">Meta Descripción (para Google)</label>
                            <textarea id="meta_description" name="meta_description" value={formData.meta_description} onChange={handleChange} className="w-full p-2 border rounded mt-1" rows={2} />
                        </div>
                        <div className="mt-4">
                            <label htmlFor="keywords" className="block text-sm font-medium text-gray-700">Palabras Clave (separadas por coma)</label>
                            <input id="keywords" name="keywords" value={formData.keywords} onChange={handleChange} className="w-full p-2 border rounded mt-1" />
                        </div>
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
            {isAiModalOpen && (
                <BlogAiGeneratorModal
                    onGenerate={handleGenerateAiPost}
                    onClose={() => setIsAiModalOpen(false)}
                    isLoading={isGenerating}
                />
            )}
        </div>
    );
};

export default PostForm;