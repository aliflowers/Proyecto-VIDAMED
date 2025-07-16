# Documentación Técnica del Proyecto VidaMed

**Fecha de Documentación:** 16 de Julio de 2025

## 1. Resumen del Proyecto

Este documento detalla la arquitectura, funcionalidades y componentes técnicos del sitio web del Laboratorio Clínico VidaMed. El proyecto ha evolucionado de un prototipo estático a una aplicación web dinámica y funcional, conectada a un backend y con un panel de administración robusto.

## 2. Pila Tecnológica (Stack)

-   **Frontend:** React 19, TypeScript
-   **Bundler:** Vite
-   **Enrutamiento:** React Router (con `HashRouter`)
-   **Backend y Base de Datos:** Supabase (PostgreSQL)
-   **Autenticación:** Supabase Auth
-   **Almacenamiento de Archivos:** Supabase Storage
-   **IA de Chat (Texto):** Google Gemini (`@google/genai`)
-   **IA de Chat (Voz):** ElevenLabs (`@elevenlabs/react`)
-   **Estilos:** Tailwind CSS
-   **Iconos:** Lucide React
-   **Gráficos:** Recharts
-   **PWA (Progressive Web App):** `vite-plugin-pwa`

---

## Fase 1: Configuración del Backend y Base de Datos

### 1.1. Infraestructura

Se eligió **Supabase** como la solución Backend-as-a-Service (BaaS) para acelerar el desarrollo. Gestiona la base de datos, la autenticación y el almacenamiento de archivos.

### 1.2. Configuración del Cliente

-   Se instaló `@supabase/supabase-js`.
-   Se creó un cliente de Supabase en `src/services/supabaseClient.ts`, que se inicializa con las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

### 1.3. Esquema de la Base de Datos

Se definieron las siguientes tablas en la base de datos de Supabase (los nombres de las tablas y columnas están en español):

-   **`estudios`**: Almacena el catálogo de análisis clínicos.
    -   `id`, `nombre`, `categoria`, `descripcion`, `preparacion`, `costo_usd`, `costo_bs`, `tasa_bcv`, `tiempo_entrega`, `veces_realizado`
    -   `campos_formulario` (JSON): Define la estructura de los campos para el ingreso manual de resultados de cada estudio.
-   **`pacientes`**: Registro central de pacientes.
    -   `id` (TEXT, alfanumérico), `nombres`, `apellidos`, `cedula_identidad` (único), `email`, `telefono`, `direccion`
-   **`citas`**: Almacena las citas agendadas.
    -   `id`, `paciente_id` (relación con `pacientes`), `fecha_cita`, `estudios_solicitados`, `ubicacion`, `status`
-   **`publicaciones_blog`**: Contenido del blog.
    -   `id`, `titulo`, `resumen`, `contenido`, `categoria`, `imagen_url`, `autor`, `fecha`, `meta_title`, `meta_description`, `keywords` (array de texto)
-   **`testimonios`**: Testimonios de los pacientes.
    -   `id`, `texto`, `autor`, `ciudad`, `rating`, `estudio_realizado`, `is_approved` (booleano)
-   **`resultados_pacientes`**: Almacena los resultados de los pacientes.
    -   `id`, `paciente_id` (relación con `pacientes`), `resultado_data` (JSON).
-   **`resultados_eliminados`**: Registro de auditoría de resultados eliminados.
-   **`dias_no_disponibles`**: Almacena las fechas en que el laboratorio no está disponible para citas.
-   **`administradores`**: Gestionado por Supabase Auth para el login al panel.

### 1.4. Funciones de Base de Datos (RPC)

Se crearon funciones de PostgreSQL para manejar lógica de negocio compleja directamente en la base de datos, mejorando el rendimiento y la seguridad.

---

## Fase 2: Implementación del Frontend Público

### 2.1. Migración de Datos

-   Todas las páginas que antes usaban datos de prueba (`mockData.ts`) ahora obtienen la información dinámicamente desde Supabase.

### 2.2. Funcionalidades Implementadas

-   **Búsqueda de Estudios:** La barra de búsqueda en `HomePage` redirige a `StudiesPage` con un parámetro de consulta.
-   **Portal de Pacientes (`PatientPortalPage`):**
    -   Acceso por cédula de identidad.
    -   Visualización de resultados (manuales y archivos).
    -   Formulario para enviar testimonios con calificación por estrellas, visible solo después de una búsqueda exitosa.
-   **Agendamiento de Citas (`SchedulingPage`):**
    -   Selector de estudios múltiple (`react-select`).
    -   Campo de dirección condicional para "Servicio a Domicilio".
    -   Calendario interactivo (`react-day-picker`) que muestra y deshabilita los días no disponibles.
    -   Selector de hora en formato 12h (AM/PM).
    -   Lógica **"upsert"** para pacientes.
-   **Asistente de IA Dual (`ChatWidget.tsx`):**
    -   Chat de texto con Google Gemini y chat de voz con ElevenLabs.
-   **Blog (`BlogPage.tsx`, `PostPage.tsx`):**
    -   Página de listado y página de detalle para cada post.
    -   Renderizado de contenido con `react-markdown`.
    -   SEO dinámico con un hook personalizado (`useDocumentTitle`) que actualiza las metaetiquetas.
-   **Progressive Web App (PWA):**
    -   Configurado con `vite-plugin-pwa` para ser instalable y funcional offline.

---

## Fase 3: Implementación del Panel de Administración

### 3.1. Estructura y Autenticación

-   **Rutas:** `/login` y `/admin/*`.
-   **Login (`LoginPage.tsx`):** Autenticación con Supabase Auth.
-   **Ruta Protegida (`ProtectedRoute.tsx`):** Protege las rutas del panel.
-   **Layout del Panel (`AdminLayout.tsx`):** Estructura consistente con navegación.

### 3.2. Módulos de Gestión (CRUD)

-   **Gestión de Estudios (`StudiesAdminPage.tsx`):** CRUD completo, incluyendo la definición de `campos_formulario`.
-   **Gestión de Blog (`PostsAdminPage.tsx`):** CRUD completo, incluyendo subida de imágenes a Supabase Storage y campos para metadatos SEO.
-   **Gestión de Testimonios (`TestimonialsAdminPage.tsx`):** Muestra testimonios con su calificación, permite aprobar/desaprobar y eliminar. Incluye un modal para ver el texto completo.
-   **Gestión de Citas (`AppointmentsAdminPage.tsx`):**
    -   Tabla de citas con búsqueda y filtros en el frontend para una respuesta instantánea.
    -   Permite cambiar el estado de la cita y reagendar.
    -   **Gestión de Disponibilidad:** Calendario interactivo para marcar días no disponibles.
-   **Gestión de Pacientes y Resultados:**
    -   **`PatientsAdminPage.tsx`**: Búsqueda y filtrado en el frontend, registro y edición de pacientes.
    -   **`PatientDetailPage.tsx`**: Vista detallada del paciente con historial de citas y resultados.
    -   **Carga de Resultados:**
        -   **Archivo:** Modal para asociar el archivo a un estudio específico.
        -   **Manual:** Formularios dinámicos basados en la configuración del estudio.
    -   **Eliminación de Resultados:** Funcionalidad para eliminar resultados, que actualiza los contadores y crea un registro de auditoría.
