# Laboratorio Clínico VidaMed - Sitio Web

**Fecha de Documentación:** 16 de Julio de 2025

## Descripción General

Este es el repositorio del sitio web para el **Laboratorio Clínico VidaMed**. El proyecto es una aplicación web moderna (Single Page Application - SPA) desarrollada con React, TypeScript y Vite, diseñada para ser una plataforma completa y amigable tanto para pacientes como para administradores.

## Estado Actual

El proyecto es una aplicación web **100% funcional**, conectada a un backend de **Supabase**. Todas las funcionalidades clave, desde el agendamiento de citas y la consulta de resultados por parte de los pacientes, hasta un panel de administración completo para la gestión del sitio, han sido implementadas. La aplicación está lista para su despliegue en un entorno de producción.

---

## Funcionalidades Implementadas

A continuación, se detallan las funcionalidades clave que se han desarrollado.

### **Sitio Público**

-   **Catálogo de Estudios:** Página dinámica que muestra todos los análisis clínicos disponibles, obtenidos desde la base de datos.
-   **Agendamiento de Citas Inteligente:** Un formulario completo que permite a los pacientes:
    -   Seleccionar múltiples estudios de una lista desplegable.
    -   Elegir la ubicación (Sede Principal o Servicio a Domicilio, mostrando condicionalmente el campo de dirección).
    -   Seleccionar fecha y hora desde un calendario interactivo que muestra los días no disponibles.
    -   La lógica de guardado crea o actualiza el registro del paciente (upsert) y luego crea la cita, evitando duplicados.
-   **Portal de Pacientes:** Un portal seguro donde los pacientes pueden consultar su historial de resultados ingresando únicamente su número de cédula.
    -   Permite visualizar resultados ingresados manualmente y descargar resultados subidos como archivos.
    -   Ofrece un formulario para que los pacientes dejen su testimonio y calificación después de ver sus resultados.
-   **Blog Funcional:**
    -   Página principal del blog que muestra un listado de todos los artículos.
    -   Páginas de detalle para cada artículo individual.
    -   Optimización SEO dinámica para cada post.
-   **Asistente de IA Dual:** Un widget flotante con dos modos de asistencia:
    -   **Chat de Texto:** Impulsado por la API de Google Gemini.
    -   **Chat de Voz:** Impulsado por la API de ElevenLabs.
-   **Progressive Web App (PWA):** El sitio está configurado para ser instalable en dispositivos y funcionar sin conexión.

### **Panel de Administración**

-   **Autenticación Segura:** Sistema de login para el personal autorizado, gestionado por Supabase Auth.
-   **Rutas Protegidas:** Todas las rutas del panel de administración están protegidas y requieren inicio de sesión.
-   **Dashboard de Estadísticas:** Una página que muestra métricas clave del negocio:
    -   Contadores de pacientes, citas y estudios realizados, con filtros por rango de tiempo.
    -   Gráficos interactivos (usando Recharts) para visualizar los estudios más populares, el crecimiento de pacientes, y más.
-   **Gestión de Disponibilidad:** Un calendario interactivo en la página de citas que permite al administrador marcar/desmarcar los días no disponibles para agendar.
-   **Gestión de Contenido (CRUD Completo):**
    -   **Estudios:** Crear, leer, actualizar y eliminar estudios, incluyendo la definición de campos para resultados manuales.
    -   **Blog:** CRUD completo para las publicaciones, con un formulario que permite subir imágenes y añadir metadatos SEO.
    -   **Testimonios:** Moderación de testimonios (aprobar/desaprobar), visualización de la calificación y eliminación.
-   **Gestión de Pacientes y Resultados:**
    -   Búsqueda y filtrado de pacientes.
    -   Registro y edición de la información de los pacientes.
    -   Vista de detalle del paciente con su historial completo.
    -   **Carga de Resultados Flexible:**
        -   **Por Archivo:** Un modal permite subir un archivo y asociarlo a un estudio específico.
        -   **Manual:** Formularios dinámicos se generan según la configuración de cada estudio.
    -   **Eliminación Segura de Resultados:** Funcionalidad para eliminar un resultado, que a su vez actualiza los contadores y mantiene un registro de auditoría.

---

## Pila Tecnológica (Stack)

- **Frontend Framework:** React 19
- **Lenguaje:** TypeScript
- **Bundler:** Vite
- **Enrutamiento:** React Router DOM v7 (`HashRouter`)
- **Estilos:** Tailwind CSS
- **Iconos:** Lucide React
- **Gráficos:** Recharts
- **Backend & Base de Datos:** Supabase (PostgreSQL)
- **API de IA (Chat):** `@google/genai` (Google Gemini API)
- **API de IA (Voz):** ElevenLabs API
- **PWA:** `vite-plugin-pwa`
