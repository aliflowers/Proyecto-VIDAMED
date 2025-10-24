import React from 'react';
import useDocumentTitle from '../hooks/useDocumentTitle';

const TermsOfServicePage: React.FC = () => {
    useDocumentTitle(
        'Términos de Servicio | Laboratorio VidaMed',
        'Consulte los términos y condiciones de servicio del Laboratorio Clínico VidaMed para el uso de nuestro sitio web y portal de pacientes.',
        'términos de servicio, condiciones, laboratorio clínico, VidaMed, portal de pacientes, agendamiento'
    );

    return (
        <div className="bg-white py-12 md:py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
                <div className="prose prose-lg max-w-none">
                    <h1 className="text-3xl md:text-4xl font-bold text-primary">Términos y Condiciones de Servicio</h1>
                    <p className="text-sm text-gray-500">Última actualización: 17 de Julio de 2025</p>

                    <h2>1. Aceptación de los Términos</h2>
                    <p>
                        Bienvenido a VidaMed. Al acceder y utilizar nuestro sitio web y nuestros servicios, incluyendo el agendamiento de citas y el portal de pacientes, usted acepta cumplir y estar sujeto a los siguientes términos y condiciones. Si no está de acuerdo con estos términos, por favor no utilice nuestros servicios.
                    </p>

                    <h2>2. Descripción de los Servicios</h2>
                    <p>
                        VidaMed proporciona un sitio web informativo, un catálogo de estudios clínicos, un sistema de agendamiento de citas en línea y un portal seguro para que los pacientes consulten sus resultados. Nuestros servicios están diseñados para facilitar el acceso a la información y la gestión de su atención médica con nosotros.
                    </p>

                    <h2>3. Uso del Portal de Pacientes</h2>
                    <p>
                        El acceso al portal de pacientes se realiza mediante su número de cédula de identidad. Usted es responsable de mantener la confidencialidad de su información de acceso. La información contenida en el portal es confidencial y está destinada únicamente para su uso personal. Queda prohibida la distribución no autorizada de sus resultados.
                    </p>

                    <h2>4. Agendamiento de Citas</h2>
                    <p>
                        Nuestro sistema de agendamiento le permite seleccionar estudios, fechas y horas según la disponibilidad. Al agendar una cita, usted se compromete a proporcionar información veraz y completa. VidaMed se reserva el derecho de reprogramar o cancelar citas debido a circunstancias imprevistas, notificándole con la mayor antelación posible.
                    </p>

                    <h2>5. Responsabilidad sobre la Información Médica</h2>
                    <p>
                        La información y los resultados presentados en este sitio web no constituyen un diagnóstico médico final ni reemplazan la consulta con un profesional de la salud calificado. Los resultados de laboratorio deben ser interpretados por su médico tratante, quien los contextualizará con su historial clínico completo.
                    </p>

                    <h2>6. Propiedad Intelectual</h2>
                    <p>
                        Todo el contenido de este sitio web, incluyendo textos, gráficos, logos, y software, es propiedad de Laboratorio VidaMed o de sus proveedores de contenido y está protegido por las leyes de propiedad intelectual.
                    </p>

                    <h2>7. Limitación de Responsabilidad</h2>
                    <p>
                        VidaMed no será responsable por ningún daño directo, indirecto, incidental o consecuente que resulte del uso o la incapacidad de usar nuestros servicios, incluyendo la confianza en la información obtenida a través del sitio. Hacemos todo lo posible para garantizar la precisión y seguridad de la información, pero no podemos garantizar que el sitio esté libre de errores o interrupciones.
                    </p>

                    <h2>8. Modificaciones a los Términos</h2>
                    <p>
                        Nos reservamos el derecho de modificar estos términos y condiciones en cualquier momento. Las modificaciones entrarán en vigor inmediatamente después de su publicación en el sitio web. Le recomendamos revisar esta página periódicamente para estar al tanto de cualquier cambio.
                    </p>

                    <h2>9. Contacto</h2>
                    <p>
                        Si tiene alguna pregunta sobre estos Términos de Servicio, puede contactarnos a través de la información proporcionada en nuestra página de contacto.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TermsOfServicePage;
