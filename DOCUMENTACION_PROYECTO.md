# Documentación Técnica del Proyecto VidaMed

**Fecha de Documentación:** 17 de Julio de 2025

## 1. Resumen del Proyecto

Este documento detalla la arquitectura, funcionalidades y componentes técnicos del sitio web del Laboratorio Clínico VidaMed. El proyecto ha evolucionado de un prototipo estático a una aplicación web dinámica y funcional, conectada a un backend y con un panel de administración robusto.

## 2. Pila Tecnológica (Stack)

-   **Frontend:** React 19, TypeScript
-   **Bundler:** Vite
-   **Enrutamiento:** React Router (con `HashRouter`)
-   **Gestión de Estado (Admin):** React Context API
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
-   Se configuraron **dos instancias** del cliente de Supabase en `src/services/supabaseClient.ts`:
    -   `supabase`: Cliente estándar para el panel de administración que maneja la sesión del usuario.
    -   `supabasePublic`: Un cliente especial para el sitio público con `persistSession: false` para evitar conflictos con el token de sesión del administrador.

### 1.3. Esquema de la Base de Datos

Se definieron las siguientes tablas en la base de datos de Supabase (los nombres de las tablas y columnas están en español):

-   **`estudios`**: Almacena el catálogo de análisis clínicos.
    -   `id`, `nombre`, `categoria`, `descripcion`, `preparacion`, `costo_usd`, `costo_bs`, `tasa_bcv`, `tiempo_entrega`, `veces_realizado`, `background_url`
    -   `campos_formulario` (JSON): Define la estructura de los campos para el ingreso manual de resultados.
-   **`pacientes`**: Registro central de pacientes.
    -   `id` (TEXT, alfanumérico), `nombres`, `apellidos`, `cedula_identidad` (único), `email`, `telefono`, `direccion`
-   **`citas`**: Almacena las citas agendadas.
    -   `id`, `paciente_id`, `fecha_cita`, `estudios_solicitados`, `ubicacion`, `status`, `created_at` (TIMESTAMPTZ, para auditoría).
-   **`publicaciones_blog`**: Contenido del blog.
-   **`testimonios`**: Testimonios de los pacientes.
-   **`resultados_pacientes`**: Almacena los resultados de los pacientes.
-   **`resultados_eliminados`**: Registro de auditoría de resultados eliminados.
-   **`dias_no_disponibles`**: Almacena las fechas en que el laboratorio no está disponible para citas.
-   **`administradores`**: Gestionado por Supabase Auth.

### 1.4. Funciones de Base de Datos (RPC)

Se crearon y/o actualizaron funciones de PostgreSQL para manejar lógica de negocio compleja:
-   **`get_patient_results_public(p_cedula TEXT)`**: Función `SECURITY DEFINER` que permite a los usuarios públicos buscar sus resultados de forma segura.
-   **`get_distinct_categories()`**: Devuelve una lista de categorías de estudios únicas para poblar los filtros.
-   **`get_top_studies_last_7_days()`**: Calcula los 5 estudios más realizados en la última semana basándose en la fecha de creación de los resultados.
-   **`get_daily_appointment_activity_last_7_days()`**: Devuelve el conteo de citas creadas por día en la última semana.

---

## Fase 2: Implementación del Frontend Público

### 2.1. Migración de Datos y Contenido

-   Se realizó una carga masiva de contenido para poblar las secciones de **Testimonios**, **Blog** y **Catálogo de Estudios**.

### 2.2. Funcionalidades Implementadas

-   **Páginas Legales:** Se crearon las páginas de **Términos de Servicio** y **Política de Privacidad**, con contenido coherente y optimización SEO.
-   **Portal de Pacientes (`PatientPortalPage`):**
    -   Se corrigió un bug crítico que impedía la búsqueda de pacientes si el token de un administrador había expirado.
    -   La búsqueda por cédula ahora es más flexible.
-   **Agendamiento de Citas (`SchedulingPage`):**
    -   Lógica **"upsert"** para pacientes.
-   **Página "Sobre Nosotros" (`AboutPage.tsx`):** Se actualizaron las imágenes del equipo y de la sección "Nuestra Historia" por imágenes personalizadas.
-   **Responsividad:** Se realizó una auditoría completa y se aplicaron mejoras para garantizar que todo el sitio sea 100% responsivo.

---

## Fase 3: Implementación del Panel de Administración

### 3.1. Estructura y Autenticación

-   **Rutas:** `/login` y `/admin/*`.
-   **Login (`LoginPage.tsx`):** Autenticación con Supabase Auth.
-   **Ruta Protegida (`ProtectedRoute.tsx`):** Protege las rutas del panel.

### 3.2. Módulos de Gestión (CRUD)

-   **Gestión de Estudios (`StudiesAdminPage.tsx`):**
    -   Se añadieron funcionalidades de **filtrado por categoría** y **ordenamiento dinámico** (nombre, precio, popularidad).
    -   Se mejoró la interfaz con indicadores visuales para el ordenamiento.
    -   Se corrigió la responsividad del formulario modal, añadiendo scroll vertical.
-   **Dashboard (`DashboardPage.tsx`):**
    -   Se corrigieron los gráficos para que muestren datos precisos y relevantes (estudios realizados y citas creadas en la última semana).
    -   Se mejoró la responsividad de los gráficos en pantallas pequeñas.
-   **Estadísticas (`StatisticsPage.tsx`):**
    -   Se mejoró la responsividad de los filtros y gráficos.

---

## Fase 4: Mejoras y Correcciones (Julio 2025)

### 4.1. Refactorización del Estado de Estadísticas

-   **Problema:** Las estadísticas en el Dashboard no se actualizaban en tiempo real.
-   **Solución:** Se implementó un **Contexto de React (`StatisticsContext`)** para manejar de forma global los contadores principales. Las páginas `DashboardPage` y `StatisticsPage` ahora consumen de este contexto, y los componentes que modifican datos (ej. `PatientsAdminPage`) notifican al contexto para que actualice el estado.

### 4.2. Aislamiento de Sesiones Pública y de Administrador

-   **Problema:** La expiración del token JWT de un administrador afectaba las funcionalidades públicas.
-   **Solución:** Se implementó una separación de los clientes de Supabase, refactorizando todas las páginas públicas para usar un cliente `supabasePublic` que no persiste la sesión.

### 4.3. Corrección de Búsqueda en Portal de Pacientes

-   **Problema:** La búsqueda de pacientes fallaba por una combinación de RLS y errores de tipo de dato.
-   **Solución:** Se implementó una solución robusta creando una función de base de datos `get_patient_results_public` con `SECURITY DEFINER`, otorgando los permisos necesarios y corrigiendo los tipos de datos.
