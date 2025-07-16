# Documentación Técnica del Proyecto VidaMed

**Fecha de Documentación:** 14 de julio de 2025

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
    -   `id`, `nombre`, `categoria`, `descripcion`, `preparacion`, `costo_usd`, `costo_bs`, `tiempo_entrega`
    -   `campos_formulario` (JSON): Define la estructura de los campos para el ingreso manual de resultados de cada estudio.
-   **`pacientes`**: Registro central de pacientes.
    -   `id`, `nombres`, `apellidos`, `cedula_identidad` (único), `email`, `telefono`
-   **`citas`**: Almacena las citas agendadas.
    -   `id`, `paciente_id` (relación con `pacientes`), `fecha_cita`, `estudios_solicitados`, `ubicacion`, `status`
-   **`publicaciones_blog`**: Contenido del blog.
-   **`testimonios`**: Testimonios de los pacientes.
    -   Incluye un campo `is_approved` (booleano) para la moderación.
-   **`resultados_pacientes`**: Almacena los resultados de los pacientes.
    -   `id`, `paciente_id` (relación con `pacientes`), `resultado_data` (JSON). El JSON puede contener una URL a un archivo o los valores de un resultado manual.
-   **`administradores`**: Gestionado por Supabase Auth para el login al panel.

---

## Fase 2: Implementación del Frontend Público

### 2.1. Migración de Datos

-   Todas las páginas que antes usaban datos de prueba (`mockData.ts`) ahora obtienen la información dinámicamente desde Supabase usando `useEffect` y `useState`.
-   Páginas migradas: `HomePage`, `StudiesPage`, `BlogPage`.

### 2.2. Funcionalidades Implementadas

-   **Búsqueda de Estudios:** La barra de búsqueda en `HomePage` redirige a `StudiesPage` con un parámetro de consulta (`?q=...`), que se utiliza para filtrar los resultados.
-   **Portal de Pacientes (`PatientPortalPage`):**
    -   Se eliminó el login simulado.
    -   Se implementó un formulario de acceso único por **cédula de identidad**.
    -   La lógica busca al paciente y luego sus resultados asociados en la base de datos.
-   **Agendamiento de Citas (`SchedulingPage`):**
    -   El formulario ahora es completamente funcional.
    -   Implementa una lógica **"upsert"**: si el paciente (identificado por su cédula) no existe, se crea; si ya existe, se actualizan sus datos. Luego, se crea la cita asociada.
-   **Asistente de IA Dual (`ChatWidget.tsx`):**
    -   El widget ahora presenta una pantalla de selección para "Chatear" o "Llamar".
    -   **Modo Chat:** Utiliza el hook `useChat` existente con Google Gemini.
    -   **Modo Voz:** Renderiza el nuevo componente `VoiceChat.tsx`.
        -   Utiliza el hook `useConversation` de `@elevenlabs/react`.
        -   Solicita permisos de micrófono.
        -   Gestiona el estado de la conexión y muestra feedback visual al usuario.
-   **Progressive Web App (PWA):**
    -   Se instaló y configuró `vite-plugin-pwa`.
    -   Se creó `src/vite-env.d.ts` para los tipos de PWA.
    -   Se actualizó `vite.config.ts` para generar el `manifest.webmanifest` y el `service-worker.js`.
    -   Se enlazó el manifest en `index.html`.

---

## Fase 3: Implementación del Panel de Administración

### 3.1. Estructura y Autenticación

-   **Rutas:** Se crearon las rutas `/login` y `/admin/*`.
-   **Login (`LoginPage.tsx`):** Página de inicio de sesión que utiliza `supabase.auth.signInWithPassword` para autenticar a los administradores.
-   **Ruta Protegida (`ProtectedRoute.tsx`):** Componente que envuelve las rutas del panel. Verifica si hay una sesión de Supabase activa; si no, redirige a `/login`.
-   **Layout del Panel (`AdminLayout.tsx`):** Proporciona una estructura consistente con una barra de navegación lateral para todas las páginas del panel y un botón para cerrar sesión.

### 3.2. Módulos de Gestión (CRUD)

Se han implementado los siguientes módulos de gestión:

-   **Gestión de Estudios (`StudiesAdminPage.tsx`):**
    -   Muestra una tabla de todos los estudios.
    -   Utiliza el modal `StudyForm.tsx` para **crear** y **editar** estudios.
    -   Permite **eliminar** estudios con confirmación.
    -   El formulario incluye un campo para definir la estructura JSON de los resultados (`campos_formulario`).
-   **Gestión de Blog (`PostsAdminPage.tsx`):**
    -   Sigue el mismo patrón que la gestión de estudios, con una tabla y el modal `PostForm.tsx` para el CRUD de publicaciones.
-   **Gestión de Testimonios (`TestimonialsAdminPage.tsx`):**
    -   Muestra una tabla de testimonios.
    -   Permite **aprobar/desaprobar** y **eliminar** testimonios.
-   **Gestión de Citas (`AppointmentsAdminPage.tsx`):**
    -   Muestra una tabla de citas con información del paciente.
    -   Permite **cambiar el estado** de la cita (Pendiente, Confirmada, Cancelada).
    -   Incluye un modal para **reagendar** citas.
-   **Gestión de Pacientes y Resultados:**
    -   **`PatientsAdminPage.tsx`**: Página principal con búsqueda de pacientes y un botón para abrir el modal `PatientForm.tsx` y **registrar nuevos pacientes**.
    -   **`PatientDetailPage.tsx`**: Vista detallada de un paciente que muestra su información y su historial.
    -   **Carga de Resultados (Archivo):** Implementada la funcionalidad para subir un archivo a Supabase Storage y vincularlo al paciente.
    -   **Carga de Resultados (Manual):** Implementado un sistema de formularios dinámicos (`ManualResultForm.tsx`) que se genera según la estructura JSON definida en el estudio seleccionado.
