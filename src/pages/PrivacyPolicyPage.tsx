import React from 'react';
import useDocumentTitle from '../hooks/useDocumentTitle';

const PrivacyPolicyPage: React.FC = () => {
    useDocumentTitle(
        'Política de Privacidad | Laboratorio VidaMed',
        'Conozca cómo el Laboratorio Clínico VidaMed recopila, usa y protege su información personal y de salud. Su privacidad es nuestra prioridad.',
        'política de privacidad, protección de datos, confidencialidad, datos de salud, VidaMed, seguridad'
    );

    return (
        <div className="bg-white py-12 md:py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
                <div className="prose prose-lg max-w-none">
                    <h1 className="text-3xl md:text-4xl font-bold text-primary">Política de Privacidad</h1>
                    <p className="text-sm text-gray-500">Última actualización: 17 de Julio de 2025</p>

                    <h2>1. Compromiso con la Privacidad</h2>
                    <p>
                        En Laboratorio VidaMed, su privacidad y la confidencialidad de su información personal y de salud son de suma importancia para nosotros. Esta Política de Privacidad describe cómo recopilamos, utilizamos, protegemos y compartimos su información cuando utiliza nuestros servicios.
                    </p>

                    <h2>2. Información que Recopilamos</h2>
                    <p>
                        Podemos recopilar los siguientes tipos de información:
                    </p>
                    <ul>
                        <li><strong>Información de Identificación Personal:</strong> Nombre, apellidos, número de cédula, fecha de nacimiento, correo electrónico, número de teléfono y dirección.</li>
                        <li><strong>Información de Salud:</strong> Estudios solicitados, resultados de laboratorio, historial de citas y cualquier otra información clínica relevante para la prestación de nuestros servicios.</li>
                        <li><strong>Información de Uso Técnico:</strong> Información sobre cómo interactúa con nuestro sitio web, como dirección IP, tipo de navegador y páginas visitadas, para mejorar nuestros servicios.</li>
                    </ul>

                    <h2>3. Cómo Utilizamos su Información</h2>
                    <p>
                        Utilizamos su información para los siguientes propósitos:
                    </p>
                    <ul>
                        <li>Para procesar sus solicitudes de estudios y agendar sus citas.</li>
                        <li>Para generar y entregar sus resultados de laboratorio de forma segura a través de nuestro portal.</li>
                        <li>Para comunicarnos con usted sobre sus citas, resultados o cualquier información relevante.</li>
                        <li>Para fines administrativos internos, como facturación y mejora de la calidad del servicio.</li>
                        <li>Para cumplir con las obligaciones legales y regulatorias aplicables en el sector salud.</li>
                    </ul>

                    <h2>4. Protección y Seguridad de los Datos</h2>
                    <p>
                        Tomamos medidas de seguridad rigurosas para proteger su información. Nuestra plataforma está respaldada por Supabase, que proporciona una infraestructura segura para la base de datos y el almacenamiento. El acceso a su información personal y de salud está restringido al personal autorizado que necesita conocer dicha información para realizar sus funciones. No compartiremos su información de salud con terceros sin su consentimiento explícito, excepto cuando sea requerido por ley.
                    </p>
                    
                    <h2>5. Uso de Tecnologías de Terceros</h2>
                    <p>
                        Nuestro sitio web utiliza servicios de terceros para mejorar su experiencia, como Google Gemini para el asistente de chat de texto y ElevenLabs para el chat de voz. Las interacciones con estos servicios pueden estar sujetas a sus propias políticas de privacidad. No compartimos su historial médico o resultados con estos proveedores.
                    </p>

                    <h2>6. Sus Derechos</h2>
                    <p>
                        Usted tiene derecho a acceder, rectificar o solicitar la eliminación de su información personal, sujeto a las normativas legales sobre la conservación de expedientes médicos. Para ejercer estos derechos, por favor contáctenos.
                    </p>

                    <h2>7. Cambios a esta Política</h2>
                    <p>
                        Podemos actualizar esta Política de Privacidad periódicamente. Le notificaremos de cualquier cambio material publicando la nueva política en nuestro sitio web.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyPage;
