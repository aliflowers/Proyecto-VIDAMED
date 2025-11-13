
import React from 'react';
import { Target, Eye, HeartHandshake } from 'lucide-react';

const AboutPage: React.FC = () => {
    return (
        <div className="bg-white">
            {/* Hero */}
            <section className="bg-primary text-white py-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold">Sobre Laboratorio VidaMed</h1>
                    <p className="mt-4 text-xl text-gray-200 max-w-3xl mx-auto">Conoce nuestra historia, nuestros valores y el equipo de profesionales dedicados a tu salud.</p>
                </div>
            </section>

            {/* Mission, Vision, Values */}
            <section className="py-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-3 gap-12 text-center">
                        <div className="flex flex-col items-center">
                            <Target className="h-12 w-12 text-primary mb-4" />
                            <h2 className="text-2xl font-bold text-dark">Nuestra Misión</h2>
                            <p className="mt-2 text-gray-600">Proporcionar resultados de análisis clínicos precisos y confiables, utilizando tecnología de vanguardia y un enfoque humano y personalizado, contribuyendo al bienestar y la salud de nuestra comunidad.</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <Eye className="h-12 w-12 text-primary mb-4" />
                            <h2 className="text-2xl font-bold text-dark">Nuestra Visión</h2>
                            <p className="mt-2 text-gray-600">Ser el laboratorio clínico líder y de mayor confianza en la región, reconocidos por nuestra excelencia, innovación y el compromiso inquebrantable con la salud de nuestros pacientes.</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <HeartHandshake className="h-12 w-12 text-primary mb-4" />
                            <h2 className="text-2xl font-bold text-dark">Nuestros Valores</h2>
                            <ul className="mt-2 text-gray-600 list-none space-y-1">
                                <li><strong>Precisión:</strong> Rigor en cada proceso.</li>
                                <li><strong>Confianza:</strong> Seguridad y confidencialidad.</li>
                                <li><strong>Empatía:</strong> Cuidado centrado en el paciente.</li>
                                <li><strong>Innovación:</strong> Mejora continua.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Our Story */}
            <section className="bg-light py-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-dark">Nuestra Historia</h2>
                            <p className="mt-4 text-gray-600">
                                Fundado en 2010, Laboratorio VidaMed nació del sueño de un grupo de bioanalistas apasionados por ofrecer un servicio de diagnóstico diferente: uno que combinara la más alta precisión científica con un trato cálido y humano.
                            </p>
                            <p className="mt-4 text-gray-600">
                                A lo largo de los años, hemos crecido y evolucionado, incorporando nueva tecnología y expandiendo nuestros servicios, pero siempre manteniendo el mismo compromiso fundamental con la salud y la tranquilidad de cada persona que confía en nosotros.
                            </p>
                        </div>
                        <div>
                            <img src="/Image_fx (38).jpg" alt="Equipo del laboratorio VidaMed" className="rounded-lg shadow-xl w-full h-auto object-cover" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Our Team */}
            <section className="py-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-dark">Conoce a Nuestro Equipo Directivo</h2>
                        <p className="mt-2 text-lg text-gray-600">Los líderes que guían nuestra misión.</p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="text-center">
                            <img src="/Image_fx (40).jpg" alt="Directora del Laboratorio" className="w-48 h-48 mx-auto rounded-full shadow-lg object-cover" />
                            <h3 className="mt-4 text-xl font-semibold text-dark">Dra. Elena Torres</h3>
                            <p className="text-primary">Directora General y Fundadora</p>
                        </div>
                        <div className="text-center">
                            <img src="/Image_fx (41).jpg" alt="Gerente de Calidad" className="w-48 h-48 mx-auto rounded-full shadow-lg object-cover" />
                            <h3 className="mt-4 text-xl font-semibold text-dark">Lcdo. Javier Rios</h3>
                            <p className="text-primary">Gerente de Calidad</p>
                        </div>
                        <div className="text-center">
                            <img src="/Image_fx (42).jpg" alt="Jefa de Atención al Paciente" className="w-48 h-48 mx-auto rounded-full shadow-lg object-cover" />
                            <h3 className="mt-4 text-xl font-semibold text-dark">Lcda. Isabel Luna</h3>
                            <p className="text-primary">Jefa de Atención al Paciente</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AboutPage;
