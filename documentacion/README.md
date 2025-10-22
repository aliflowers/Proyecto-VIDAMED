# Laboratorio Clínico VidaMed - Sitio Web

**Fecha de Última Actualización:** 18 de Agosto de 2025

## Descripción General

Este es el repositorio del sitio web para el **Laboratorio Clínico VidaMed**. El proyecto es una aplicación web moderna (Single Page Application - SPA) desarrollada con React, TypeScript y Vite, diseñada para ser una plataforma completa y amigable tanto para pacientes como para administradores.

## Estado Actual

El proyecto es una aplicación web **100% funcional y robusta**, conectada a un backend de **Supabase**. Todas las funcionalidades clave, desde el agendamiento de citas y la consulta de resultados por parte de los pacientes, hasta un panel de administración completo para la gestión del sitio, han sido implementadas y refinadas. La aplicación está lista para su despliegue en un entorno de producción.

---

## Funcionalidades Implementadas

A continuación, se detallan las funcionalidades clave que se han desarrollado y mejorado.

### **Sitio Público**

- **Catálogo de Estudios:** Página dinámica que muestra todos los análisis clínicos disponibles, obtenidos desde la base de datos.
- **Agendamiento de Citas Inteligente:** Un formulario completo que permite a los pacientes:
  - Seleccionar múltiples estudios de una lista desplegable.
  - Elegir la ubicación (Sede Principal o Servicio a Domicilio, mostrando condicionalmente el campo de dirección).
  - Seleccionar fecha y hora desde un calendario interactivo que muestra los días no disponibles.
  - La lógica de guardado crea o actualiza el registro del paciente (upsert) y luego crea la cita, evitando duplicados.
- **Portal de Pacientes Robusto:** Un portal seguro donde los pacientes pueden consultar su historial de resultados ingresando únicamente su número de cédula.
  - Se corrigió un bug crítico que impedía el acceso si un administrador tenía una sesión expirada, garantizando **100% de disponibilidad**.
  - Permite visualizar resultados ingresados manualmente y descargar resultados subidos como archivos.
  - Ofrece un formulario para que los pacientes dejen su testimonio y calificación después de ver sus resultados.
- **Blog Funcional:**
  - Página principal del blog que muestra un listado de todos los artículos.
  - Páginas de detalle para cada artículo individual.
  - Optimización SEO dinámica para cada post.
- **Páginas Legales:** Se han añadido las páginas de **Términos de Servicio** y **Política de Privacidad**, accesibles desde el pie de página.
- **Asistente de IA Dual:** Un widget flotante con dos modos de asistencia:
  - **Chat de Texto:** Impulsado por la API de Google Gemini.
  - **Chat de Voz:** Impulsado por la API de ElevenLabs.
- **Diseño 100% Responsivo:** Se ha realizado una auditoría y mejora completa para asegurar una experiencia de usuario óptima en cualquier dispositivo, desde móviles hasta escritorios.
- **Progressive Web App (PWA):** El sitio está configurado para ser instalable en dispositivos y funcionar sin conexión.

### **Panel de Administración**

- **Autenticación Segura:** Sistema de login para el personal autorizado, gestionado por Supabase Auth.
- **Rutas Protegidas:** Todas las rutas del panel de administración están protegidas y requieren inicio de sesión.
- **Dashboard de Estadísticas Mejorado:** Una página que muestra métricas clave del negocio:
  - Contadores de pacientes, citas y estudios que se **actualizan en tiempo real** a través de diferentes módulos.
  - Gráficos interactivos (usando Recharts) que ahora muestran datos más precisos y relevantes, como los estudios realmente realizados y la actividad de creación de citas.
- **Gestión de Disponibilidad:** Un calendario interactivo en la página de citas que permite al administrador marcar/desmarcar los días no disponibles para agendar.
- **Gestión de Contenido (CRUD Completo):**
  - **Estudios:** CRUD completo con un formulario modal responsivo. La tabla de gestión ahora incluye **filtros por categoría y ordenamiento dinámico** por nombre, precio y popularidad.
  - **Blog:** CRUD completo para las publicaciones, con un formulario que permite subir imágenes y añadir metadatos SEO.
  - **Testimonios:** Moderación de testimonios (aprobar/desaprobar), visualización de la calificación y eliminación.
- **Gestión de Pacientes y Resultados:**
  - Búsqueda y filtrado de pacientes.
  - Registro y edición de la información de los pacientes.
  - Vista de detalle del paciente con su historial completo.
  - **Carga de Resultados Flexible:**
    - **Por Archivo:** Un modal permite subir un archivo y asociarlo a un estudio específico.
    - **Manual:** Formularios dinámicos se generan según la configuración de cada estudio.
  - **Eliminación Segura de Resultados:** Funcionalidad para eliminar un resultado, que a su vez actualiza los contadores y mantiene un registro de auditoría.
- **Gestión de Tasa de Cambio Centralizada:** El administrador puede definir una tasa de cambio BCV global que actualiza automáticamente los precios en Bolívares de todos los estudios, optimizando la gestión de precios.

---

## Pila Tecnológica (Stack)

- **Frontend Framework:** React 19
- **Lenguaje:** TypeScript
- **Bundler:** Vite
- **Enrutamiento:** React Router DOM v7 (`BrowserRouter`)
- **Gestión de Estado (Admin):** React Context API
- **Estilos:** Tailwind CSS
- **Iconos:** Lucide React
- **Gráficos:** Recharts
- **Backend & Base de Datos:** Supabase (PostgreSQL)
- **API de IA (Chat):** `@google/genai` (Google Gemini API)
- **API de IA (Voz):** ElevenLabs API
- **PWA:** `vite-plugin-pwa`

---

## Modelo de Comercialización (Planes)

La plataforma está diseñada para ser comercializada bajo un modelo de **Feature Flags**, permitiendo activar funcionalidades según el plan adquirido por el cliente (Básico, Premium, Profesional). Esto se gestiona a través de una configuración en la base de datos y un sistema de control de acceso a funcionalidades en el frontend, asegurando una experiencia de usuario limpia y adaptada a cada nivel de servicio.
