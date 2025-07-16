# Laboratorio Clínico VidaMed - Sitio Web

**Fecha de Documentación:** 24 de julio de 2024

## Descripción General

Este es el repositorio del sitio web para el **Laboratorio Clínico VidaMed**. El proyecto está siendo desarrollado como una aplicación web moderna (Single Page Application - SPA) utilizando React y TypeScript. El objetivo es crear una plataforma completa y amigable para los pacientes, que les permita interactuar con los servicios del laboratorio de manera eficiente y segura.

## Estado Actual

El proyecto cuenta con una interfaz de usuario (UI) y una estructura de frontend bien definidas. Sin embargo, toda la información dinámica se gestiona a través de datos de prueba locales (`mock data`). El siguiente paso es conectar la aplicación a un backend real y desarrollar las funcionalidades completas para su puesta en producción.

---

## Plan de Acción para Puesta en Producción

A continuación, se detalla el plan estratégico para transformar el prototipo actual en una aplicación web 100% funcional y lista para el despliegue.

### **Fase 1: Backend y Base de Datos con Supabase**

El objetivo de esta fase es establecer la infraestructura de backend que soportará toda la aplicación.

*   **1.1. Plataforma de Backend:**
    *   Se utilizará **Supabase** como Backend-as-a-Service (BaaS) para gestionar la base de datos, autenticación, APIs y almacenamiento de archivos.

*   **1.2. Diseño del Esquema de la Base de Datos (en español):**
    *   `estudios`: Catálogo de análisis clínicos con campos como `nombre`, `categoria`, `descripcion`, `preparacion`, `tiempo_entrega`, `costo_usd`, `costo_bs`.
    *   `pacientes`: Registro central de pacientes con campos como `nombres`, `apellidos`, `cedula_identidad` (clave única), `direccion`, `telefono`, `email`.
    *   `administradores`: Cuentas para el personal autorizado, gestionadas con el sistema de autenticación de Supabase.
    *   `citas`: Registro de citas agendadas. Tendrá una relación directa con la tabla `pacientes` y un campo de texto para el `estudio_solicitado`.
    *   `resultados_pacientes`: Almacén de resultados, con una relación directa a la tabla `pacientes`.
    *   `publicaciones_blog`: Contenido para el blog de salud.
    *   `testimonios`: Opiniones y testimonios de los pacientes.

### **Fase 2: Funcionalidad del Sitio Web (Frontend)**

Esta fase se enfoca en conectar el frontend con el backend y desarrollar las funcionalidades interactivas.

*   **2.1. Conexión a Supabase:**
    *   Se instalará y configurará el cliente `@supabase/supabase-js` para reemplazar toda la lógica de `mockData.ts` con llamadas a la API de Supabase.

*   **2.2. Búsqueda de Estudios:**
    *   La barra de búsqueda se conectará a la tabla `estudios` para filtrar y mostrar los análisis en tiempo real.

*   **2.3. Portal de Pacientes Simplificado:**
    *   Se implementará un sistema de acceso donde el paciente ingresará su **número de cédula de identidad** para ver y descargar su historial de resultados.

*   **2.4. Agendamiento de Citas Inteligente (Lógica "Upsert"):**
    *   El formulario de citas verificará si un paciente ya existe por su cédula.
    *   **Si existe**, se actualizarán sus datos y se asociará la nueva cita.
    *   **Si no existe**, se creará un nuevo registro en la tabla `pacientes` antes de registrar la cita.

*   **2.5. Widget de Asistencia Dual con IA:**
    *   Se implementará un widget flotante y responsivo.
    *   **Opción Chat (VidaBot):** Impulsado por **Google Gemini 2.5 Flash**. La clave de API se gestionará a través de un archivo `.env`.
    *   **Opción Llamada (IA de Voz):** Se integrará con la API de **ElevenLabs** para IA conversacional, solicitando permiso para el uso del micrófono.

*   **2.6. Implementación de Progressive Web App (PWA):**
    *   Se utilizará el plugin `vite-plugin-pwa` para hacer el sitio instalable y funcional sin conexión.
    *   Se generará un `manifest.json` para definir el comportamiento de la app (iconos, nombre, etc.).
    *   Se generará un `service-worker.js` para cachear los recursos de la aplicación.

### **Fase 3: Panel de Administración Avanzado**

Se creará una interfaz segura para que el personal de VidaMed gestione la plataforma.

*   **3.1. Gestión de Contenido:**
    *   CRUD (Crear, Leer, Actualizar, Eliminar) completo para `estudios`, `publicaciones_blog` y `testimonios`.
    *   Visualización y gestión del estado de las `citas`.

*   **3.2. Gestión de Pacientes:**
    *   Formulario para registrar nuevos pacientes manualmente.
    *   Función de búsqueda de pacientes por múltiples filtros con acceso a su historial completo.

*   **3.3. Carga de Resultados Flexible:**
    *   **Opción A (Carga de Archivos):** Permitirá subir archivos (`PDF`, `.docx`, `.xlsx`). Los formatos no-PDF se convertirán a HTML para su visualización.
    *   **Opción B (Ingreso Manual):** Formularios dinámicos específicos por tipo de estudio para ingresar los resultados manualmente.

### **Fase 4: Despliegue y Puesta en Marcha**

La fase final para lanzar el sitio web al público.

*   **4.1. Seguridad y Requisitos PWA:**
    *   El sitio se servirá obligatoriamente a través de **HTTPS**.

*   **4.2. Configuración de Entorno de Producción:**
    *   Se configurarán todas las claves de API y variables de entorno en la plataforma de hosting.

*   **4.3. Hosting:**
    *   **Frontend (React + PWA):** Se desplegará en **Vercel** o **Netlify**.
    *   **Backend:** Provisto por **Supabase**.

*   **4.4. Pruebas Finales (End-to-End):**
    *   Se realizará una verificación completa de todos los flujos de usuario, incluyendo la instalación de la PWA y su funcionamiento offline.

---

## Pila Tecnológica (Stack)

- **Frontend Framework:** React 19
- **Lenguaje:** TypeScript
- **Enrutamiento:** React Router DOM v7
- **Estilos:** Tailwind CSS
- **Iconos:** Lucide React
- **Backend & Base de Datos:** Supabase
- **API de IA (Chat):** `@google/genai` (Google Gemini API)
- **API de IA (Voz):** ElevenLabs API
- **Bundler:** Vite
- **PWA:** `vite-plugin-pwa`

## Estructura del Proyecto

El código fuente está organizado en las siguientes carpetas principales:

- `src/components`: Componentes reutilizables de la UI.
- `src/pages`: Componentes que representan cada página de la aplicación.
- `src/hooks`: Hooks personalizados para la lógica de la aplicación.
- `src/services`: Módulos para interactuar con APIs externas.
- `src/types`: Definiciones de tipos de TypeScript.
