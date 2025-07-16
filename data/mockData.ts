
import { Study, BlogPost, Testimonial } from '../types';

export const studies: Study[] = [
  {
    id: 'quimica-sanguinea',
    name: 'Química Sanguínea (Perfil 20)',
    category: 'Química Sanguínea',
    description: 'Análisis completo que evalúa 20 parámetros diferentes para monitorear la función de órganos como riñones e hígado, y niveles de glucosa, colesterol y más.',
    preparation: 'Ayuno de 8 a 12 horas. Se permite beber agua.',
    price: 35.00,
    deliveryTime: '24 horas',
  },
  {
    id: 'hematologia-completa',
    name: 'Hematología Completa',
    category: 'Hematología',
    description: 'Evalúa los componentes de la sangre, incluyendo glóbulos rojos, glóbulos blancos y plaquetas. Esencial para detectar infecciones, anemia y otras condiciones.',
    preparation: 'No requiere ayuno.',
    price: 15.00,
    deliveryTime: 'Mismo día',
  },
  {
    id: 'perfil-tiroideo',
    name: 'Perfil Tiroideo (TSH, T3, T4)',
    category: 'Hormonas',
    description: 'Mide los niveles de hormonas tiroideas para diagnosticar y monitorear trastornos de la tiroides como el hipotiroidismo y el hipertiroidismo.',
    preparation: 'Ayuno de 4 horas recomendado, pero no obligatorio. Consultar con su médico.',
    price: 40.00,
    deliveryTime: '48 horas',
  },
  {
    id: 'prueba-covid-19-pcr',
    name: 'Prueba COVID-19 (PCR)',
    category: 'Pruebas COVID-19',
    description: 'Prueba de Reacción en Cadena de la Polimerasa para la detección del virus SARS-CoV-2. Es el estándar de oro para el diagnóstico.',
    preparation: 'No comer, beber, fumar ni masticar chicle 30 minutos antes de la toma de muestra.',
    price: 60.00,
    deliveryTime: '24-48 horas',
  },
  {
    id: 'prueba-embarazo',
    name: 'Prueba de Embarazo en Sangre (hCG Cuantitativa)',
    category: 'Hormonas',
    description: 'Mide el nivel exacto de la hormona hCG en la sangre para confirmar el embarazo y estimar el tiempo de gestación.',
    preparation: 'No requiere preparación especial.',
    price: 20.00,
    deliveryTime: 'Mismo día',
  }
];

export const blogPosts: BlogPost[] = [
    {
        id: 'la-importancia-del-chequeo-anual',
        title: 'La Importancia del Chequeo Anual: Prevenir es Vivir',
        summary: 'Descubre por qué un chequeo médico anual es una de las mejores inversiones que puedes hacer en tu salud a largo plazo.',
        category: 'Prevención',
        imageUrl: 'https://picsum.photos/400/300?random=1',
        author: 'Dr. Ana Pérez',
        date: '15 de Julio, 2024'
    },
    {
        id: 'entendiendo-tu-perfil-lipidico',
        title: 'Entendiendo tu Perfil Lipídico: Colesterol y Triglicéridos',
        summary: 'Te explicamos de manera sencilla qué significan los valores de tu perfil lipídico y cómo mantenerlos bajo control.',
        category: 'Bienestar',
        imageUrl: 'https://picsum.photos/400/300?random=2',
        author: 'Lcda. Carla Rivas',
        date: '02 de Julio, 2024'
    },
    {
        id: 'hidratacion-y-analisis-de-sangre',
        title: '¿Afecta la hidratación tus análisis de sangre?',
        summary: 'La deshidratación puede alterar ciertos resultados. Aprende cómo prepararte adecuadamente para tus pruebas.',
        category: 'Consejos',
        imageUrl: 'https://picsum.photos/400/300?random=3',
        author: 'Dr. Luis Mendoza',
        date: '28 de Junio, 2024'
    }
];

export const testimonials: Testimonial[] = [
    {
        id: 1,
        text: 'El servicio a domicilio es una maravilla. La enfermera fue muy profesional y amable. Los resultados llegaron rapidísimo a mi correo. ¡Totalmente recomendados!',
        author: 'María Rodríguez',
        city: 'Ciudad Capital'
    },
    {
        id: 2,
        text: 'La atención en la sede es excelente. Todo muy limpio, organizado y el personal te explica todo con paciencia. Me sentí muy seguro y en confianza.',
        author: 'Carlos González',
        city: 'Ciudad Capital'
    },
    {
        id: 3,
        text: 'Usé el portal de pacientes para descargar mis resultados y es súper fácil de usar. Tener mi historial médico en un solo lugar es muy conveniente. Gran iniciativa.',
        author: 'Sofía Hernandez',
        city: 'Sucursal Norte'
    }
];
