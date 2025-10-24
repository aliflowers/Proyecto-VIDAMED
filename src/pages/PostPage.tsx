import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabasePublic as supabase } from '@/services/supabaseClient';
import { BlogPost } from '@/types';
import { Loader, ArrowLeft, Calendar, User, Tag } from 'lucide-react';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

const PostPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [post, setPost] = useState<BlogPost | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPost = async () => {
            if (!id) return;
            const { data, error } = await supabase
                .from('publicaciones_blog')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching post:', error);
                setError('No se pudo encontrar la publicación.');
            } else {
                const formattedPost: BlogPost = {
                    id: data.id.toString(), 
                    title: data.titulo,
                    summary: data.resumen,
                    content: data.contenido,
                    category: data.categoria,
                    imageUrl: data.imagen_url,
                    author: data.autor,
                    date: new Date(data.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }),
                    meta_title: data.meta_title,
                    meta_description: data.meta_description,
                    keywords: data.keywords || [],
                };
                setPost(formattedPost);
            }
            setIsLoading(false);
        };

        fetchPost();
    }, [id]);

    const metaTitle = post?.meta_title || post?.title || 'Blog de VidaMed';
    const metaDescription = post?.meta_description || post?.summary || '';
    const metaKeywords = (post?.keywords || []).join(', ');

    useDocumentTitle(metaTitle, metaDescription, metaKeywords);

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader className="animate-spin text-primary" size={48} /></div>;
    }

    if (error || !post) {
        return (
            <div className="text-center py-16 text-red-500">
                <h3 className="text-xl font-semibold">
                    {error || 'Publicación no encontrada.'}
                </h3>
            </div>
        );
    }

    return (
        <div className="bg-white py-12 md:py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
                <Link to="/blog" className="flex items-center text-primary hover:underline mb-8"><ArrowLeft size={18} className="mr-2" />Volver al Blog</Link>
                
          <article>
              <header className="mb-8">
                  <div className="flex items-center text-sm text-primary font-semibold mb-2">
                      <Tag className="w-4 h-4 mr-1" />
                      <span>{post.category}</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold text-dark">
                      {post.title}
                  </h1>
                  <div className="mt-4 flex items-center text-gray-500 text-sm space-x-4">
                      <div className="flex items-center">
                          <User size={16} className="mr-1" />
                          <span>{post.author}</span>
                      </div>
                      <div className="flex items-center">
                          <Calendar size={16} className="mr-1" />
                          <span>{post.date}</span>
                      </div>
                  </div>
              </header>

              {post.imageUrl && (
                  <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-auto max-h-[500px] object-cover rounded-lg shadow-lg mb-8"
                  />
              )}

              <div className="prose lg:prose-xl max-w-none">
                  <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                      {post.content || ''}
                  </ReactMarkdown>
              </div>
          </article>
            </div>
        </div>
    );
};

export default PostPage;