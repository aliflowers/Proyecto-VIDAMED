
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabasePublic as supabase } from '@/services/supabaseClient';
import { BlogPost } from '@/types';
import { ChevronRight, Tag, Loader } from 'lucide-react';

const BlogPage: React.FC = () => {
    const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBlogPosts = async () => {
            const { data, error } = await supabase
                .from('publicaciones_blog')
                .select('*')
                .order('fecha', { ascending: false });

            if (error) {
                console.error('Error fetching blog posts:', error);
                setError('No se pudieron cargar las publicaciones del blog.');
            } else {
                const formattedBlogPosts: BlogPost[] = data.map((item: any) => ({
                    id: item.id.toString(),
                    title: item.titulo,
                    summary: item.resumen,
                    category: item.categoria,
                    imageUrl: item.imagen_url,
                    author: item.autor,
                    date: new Date(item.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }),
                    slug: item.slug,
                }));
                setBlogPosts(formattedBlogPosts);
            }
            setIsLoading(false);
        };

        fetchBlogPosts();
    }, []);

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
        <div className="bg-white py-12 md:py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-dark">Blog de Salud y Bienestar</h1>
                    <p className="mt-2 text-lg text-gray-600">Información y consejos para cuidar de ti y los tuyos.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {blogPosts.map((post) => (
                        <div key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col transform hover:-translate-y-2 transition-transform duration-300">
                            <Link to={`/blog/${post.slug}`} className="block">
                                <img src={post.imageUrl} alt={post.title} className="w-full h-56 object-cover" />
                            </Link>
                            <div className="p-6 flex flex-col flex-grow">
                                <div className="flex items-center text-sm text-primary font-semibold mb-2">
                                    <Tag className="w-4 h-4 mr-1" />
                                    <span>{post.category}</span>
                                </div>
                                <Link to={`/blog/${post.slug}`} className="block">
                                    <h2 className="text-xl font-semibold text-dark hover:text-primary transition-colors">{post.title}</h2>
                                </Link>
                                <p className="mt-2 text-gray-600 flex-grow line-clamp-4">{post.summary}</p>
                                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                                    <span>{post.author}</span>
                                    <span>{post.date}</span>
                                </div>
                                <Link to={`/blog/${post.slug}`} className="mt-4 self-start inline-flex items-center text-primary font-semibold hover:underline">
                                    Leer artículo completo <ChevronRight className="ml-1 h-5 w-5" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BlogPage;