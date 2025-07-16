import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, FlaskConical, Beaker, TestTube, Search, ChevronRight, Star } from 'lucide-react';
import { supabase } from '../src/services/supabaseClient';
import { Testimonial, BlogPost } from '../types';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

const serviceIcons = {
    'Química Sanguínea': <Beaker className="h-8 w-8 text-primary" />,
    'Hematología': <TestTube className="h-8 w-8 text-primary" />,
    'Pruebas COVID-19': <Stethoscope className="h-8 w-8 text-primary" />,
    'Hormonas': <FlaskConical className="h-8 w-8 text-primary" />
};

const HomePage: React.FC = () => {
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    const [emblaRef] = useEmblaCarousel({ loop: true, align: 'start' }, [Autoplay({ delay: 4000 })]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/estudios?q=${encodeURIComponent(searchTerm.trim())}`);
        }
    };

    useEffect(() => {
        const fetchHomePageData = async () => {
            // Fetch Testimonials
            const { data: testimonialsData, error: testimonialsError } = await supabase
                .from('testimonios')
                .select('*')
                .eq('is_approved', true);

            if (testimonialsError) {
                console.error('Error fetching testimonials:', testimonialsError);
            } else if (testimonialsData) {
                const formattedTestimonials: Testimonial[] = testimonialsData.map((item: any) => ({
                    id: item.id,
                    text: item.texto,
                    author: item.autor,
                    city: item.ciudad,
                    rating: item.rating,
                    estudio_realizado: item.estudio_realizado,
                }));
                setTestimonials(formattedTestimonials);
            }

            // Fetch Blog Posts
            const { data: blogPostsData, error: blogPostsError } = await supabase
                .from('publicaciones_blog')
                .select('*')
                .order('fecha', { ascending: false })
                .limit(3);

            if (blogPostsError) {
                console.error('Error fetching blog posts:', blogPostsError);
            } else {
                 const formattedBlogPosts: BlogPost[] = blogPostsData.map((item: any) => ({
                    id: item.id.toString(),
                    title: item.titulo,
                    summary: item.resumen,
                    category: item.categoria,
                    imageUrl: item.imagen_url,
                    author: item.autor,
                    date: new Date(item.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }),
                }));
                setBlogPosts(formattedBlogPosts);
            }
        };

        fetchHomePageData();
    }, []);

    return (
      <div className="bg-white">
        {/* Hero Section */}
        <section className="relative bg-light pt-20 pb-24 md:pt-28 md:pb-32">
            <div className="absolute inset-0 bg-grid-pattern opacity-50"></div>
            <style>{`.bg-grid-pattern { background-image: linear-gradient(#d1e9ff 1px, transparent 1px), linear-gradient(to right, #d1e9ff 1px, transparent 1px); background-size: 20px 20px; }`}</style>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                <h1 className="text-4xl md:text-6xl font-bold text-dark tracking-tight">
                    Resultados precisos, <span className="text-primary">cuidado cercano.</span>
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-gray-600">
                    Tu salud en manos expertas. Accede a un catálogo completo de estudios, agenda tu cita en línea y consulta tus resultados de forma segura y confidencial.
                </p>
                <div className="mt-8 flex justify-center gap-4 flex-wrap">
                    <Link to="/agendar" className="inline-block bg-primary text-white font-semibold px-8 py-3 rounded-full hover:bg-primary-dark transition-transform transform hover:scale-105">
                        Agendar Cita
                    </Link>
                    <Link to="/portal" className="inline-block bg-white text-primary font-semibold px-8 py-3 rounded-full border border-primary hover:bg-primary/5 transition-transform transform hover:scale-105">
                        Ver Resultados
                    </Link>
                </div>
            </div>
        </section>

        {/* Search Bar Section */}
        <section className="bg-white py-16 -mt-16 relative z-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <form onSubmit={handleSearch} className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-lg">
                    <label htmlFor="study-search" className="block text-lg font-semibold text-dark mb-2">Busca un Estudio</label>
                    <div className="relative">
                        <input
                          type="text"
                          id="study-search"
                          placeholder="Ej: Hematología, Perfil 20, Prueba de embarazo..."
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button type="submit" aria-label="Buscar" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary">
                            <Search />
                        </button>
                    </div>
                </form>
            </div>
        </section>

        {/* Featured Services Section */}
        <section className="py-16 bg-light">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-dark">Nuestros Servicios Principales</h2>
                    <p className="mt-2 text-lg text-gray-600">Ofrecemos una amplia gama de análisis clínicos para tu bienestar.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {Object.entries(serviceIcons).map(([serviceName, icon]) => (
                        <div key={serviceName} className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow text-center">
                            <div className="flex justify-center mb-4">{icon}</div>
                            <h3 className="text-xl font-semibold text-dark">{serviceName}</h3>
                            <p className="mt-2 text-gray-500">Análisis especializados para un diagnóstico certero.</p>
                        </div>
                    ))}
                </div>
                 <div className="text-center mt-12">
                    <Link to="/estudios" className="inline-flex items-center text-primary font-semibold hover:underline">
                        Ver todos los estudios <ChevronRight className="ml-1 h-5 w-5" />
                    </Link>
                </div>
            </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="py-16 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-dark">¿Por qué elegir VidaMed?</h2>
                    <p className="mt-2 text-lg text-gray-600">Comprometidos con tu salud y tu tranquilidad.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8 text-center">
                    <div className="p-6">
                        <h3 className="text-xl font-semibold text-dark">Tecnología de Punta</h3>
                        <p className="mt-2 text-gray-600">Equipos de última generación para garantizar la máxima precisión en cada resultado.</p>
                    </div>
                    <div className="p-6">
                        <h3 className="text-xl font-semibold text-dark">Personal Certificado</h3>
                        <p className="mt-2 text-gray-600">Nuestro equipo de bioanalistas y personal de salud está altamente calificado y en constante formación.</p>
                    </div>
                    <div className="p-6">
                        <h3 className="text-xl font-semibold text-dark">Entrega Rápida y Segura</h3>
                        <p className="mt-2 text-gray-600">Accede a tus resultados en línea a través de nuestro portal seguro, en tiempo récord.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 bg-light">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-dark">Lo que dicen nuestros pacientes</h2>
                </div>
                <div className="overflow-hidden" ref={emblaRef}>
                    <div className="flex">
                        {testimonials.map(testimonial => (
                            <div key={testimonial.id} className="flex-shrink-0 w-full md:w-1/3 p-4">
                                <div className="bg-white p-8 rounded-lg shadow-lg h-full flex flex-col">
                                    <div className="flex items-center mb-4">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star key={i} size={20} className={`fill-current ${i < (testimonial.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`} />
                                        ))}
                                    </div>
                                    <p className="text-gray-600 italic flex-grow">"{testimonial.text}"</p>
                                    <div className="mt-4">
                                        <p className="font-bold text-dark">{testimonial.author}</p>
                                        <p className="text-sm text-gray-500">{testimonial.estudio_realizado || 'Servicio General'}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>

         {/* Blog Section */}
        <section className="py-16 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-dark">Blog de Salud y Bienestar</h2>
                    <p className="mt-2 text-lg text-gray-600">Artículos y consejos para cuidar de tu salud.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {blogPosts.slice(0, 3).map((post) => (
                        <div key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-2 transition-transform">
                            <img src={post.imageUrl} alt={post.title} className="w-full h-48 object-cover" />
                            <div className="p-6">
                                <p className="text-sm text-primary font-semibold">{post.category}</p>
                                <h3 className="mt-2 text-xl font-semibold text-dark">{post.title}</h3>
                                <p className="mt-2 text-gray-600 line-clamp-3">{post.summary}</p>
                                <Link to="/blog" className="mt-4 inline-flex items-center text-primary font-semibold hover:underline">
                                    Leer más <ChevronRight className="ml-1 h-5 w-5" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
      </div>
    );
};

export default HomePage;
