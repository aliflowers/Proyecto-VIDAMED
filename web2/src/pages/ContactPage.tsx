import React from 'react';
import { MapPin, Mail, Clock } from 'lucide-react';

const ContactPage: React.FC = () => {
    return (
        <div className="bg-light py-12 md:py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-dark">Contáctanos</h1>
                    <p className="mt-2 text-lg text-gray-600">Estamos aquí para ayudarte. No dudes en ponerte en contacto con nosotros.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-white p-8 rounded-xl shadow-lg">
                    {/* Contact Form */}
                    <div>
                        <h2 className="text-2xl font-semibold text-primary mb-6">Envíanos un mensaje</h2>
                        <form className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre completo</label>
                                <input type="text" id="name" name="name" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo electrónico</label>
                                <input type="email" id="email" name="email" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
                            </div>
                            <div>
                                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Asunto</label>
                                <input type="text" id="subject" name="subject" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
                            </div>
                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-gray-700">Mensaje</label>
                                <textarea id="message" name="message" rows={4} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"></textarea>
                            </div>
                            <div>
                                <button type="submit" className="w-full bg-primary text-white font-bold py-3 px-4 rounded-md hover:bg-primary-dark transition-colors">
                                    Enviar Mensaje
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Contact Info & Map */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-semibold text-primary mb-6">Nuestra Información</h2>
                            <div className="space-y-4">
                                <div className="flex items-start">
                                    <MapPin className="h-6 w-6 text-secondary mt-1 flex-shrink-0" />
                                    <div className="ml-4">
                                        <h3 className="font-semibold text-dark">Sede Principal</h3>
                                        <p className="text-gray-600">Transversal 2, entre calle López Aveledo y calle Coromoto, Calicanto, Maracay-Edo Aragua. Venezuela.</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <a href="https://wa.me/582125551234" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp VidaMed">
                                        <svg className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.672.149-.198.297-.77.966-.944 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.476-.883-.788-1.48-1.761-1.654-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.074-.149-.672-1.62-.921-2.216-.242-.58-.487-.5-.672-.51-.173-.009-.372-.011-.571-.011-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.718 2.006-1.412.248-.694.248-1.289.173-1.412-.074-.123-.272-.198-.57-.347zM12.004 2C6.486 2 2 6.486 2 12.004c0 1.77.463 3.43 1.27 4.878L2 22l5.25-1.236c1.4.767 3.006 1.207 4.754 1.207 5.518 0 10.004-4.486 10.004-10.004C22.008 6.486 17.522 2 12.004 2zm0 18.219c-1.56 0-3.011-.456-4.229-1.24l-.303-.189-3.118.735.664-3.04-.197-.312a8.204 8.204 0 0 1-1.247-4.169c0-4.538 3.69-8.229 8.229-8.229s8.229 3.691 8.229 8.229-3.691 8.215-8.229 8.215z"/>
                                        </svg>
                                    </a>
                                    <div className="ml-4">
                                        <h3 className="font-semibold text-dark">WhatsApp</h3>
                                        <a href="https://wa.me/582125551234" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-primary">+58 (212) 555-1234</a>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <Mail className="h-6 w-6 text-secondary mt-1 flex-shrink-0" />
                                    <div className="ml-4">
                                        <h3 className="font-semibold text-dark">Correo Electrónico</h3>
                                        <p className="text-gray-600">contacto@vidamed.lab</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <Clock className="h-6 w-6 text-secondary mt-1 flex-shrink-0" />
                                    <div className="ml-4">
                                        <h3 className="font-semibold text-dark">Horario de Atención</h3>
                                        <p className="text-gray-600">Lunes - Viernes: 7:00 AM - 5:00 PM</p>
                                        <p className="text-gray-600">Sábados: 8:00 AM - 1:00 PM</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                           <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden">
                                <iframe
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d825.3564230836662!2d-67.59861354445844!3d10.255218563607173!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e803b41e3e19b97%3A0x859fcfb45fcc7225!2sVidamed!5e0!3m2!1sen!2sve!4v1752724506526!5m2!1sen!2sve"
                                    width="600"
                                    height="450"
                                    style={{ border: 0 }}
                                    allowFullScreen={true}
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    title="Mapa de ubicación"
                                ></iframe>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
