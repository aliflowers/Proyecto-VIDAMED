# Documentación Técnica del Proyecto VidaMed

**Fecha de Última Actualización:** 18 de Agosto de 2025

## 1. Resumen del Proyecto

Este documento detalla la arquitectura, funcionalidades y componentes técnicos del sitio web del Laboratorio Clínico VidaMed. El proyecto ha evolucionado de un prototipo estático a una aplicación web dinámica y funcional, conectada a un backend y con un panel de administración robusto.

## 2. Pila Tecnológica (Stack)

- **Frontend:** React 19, TypeScript
- **Bundler:** Vite
- **Enrutamiento:** React Router (con `BrowserRouter`)
- **Gestión de Estado (Admin):** React Context API
- **Backend y Base de Datos:** Supabase (PostgreSQL)
- **Autenticación:** Supabase Auth
- **Almacenamiento de Archivos:** Supabase Storage
- **IA de Chat (Texto):** Google Gemini (`@google/genai`)
- **IA de Chat (Voz):** ElevenLabs (`@elevenlabs/react`)
- **Estilos:** Tailwind CSS
- **Iconos:** Lucide React
- **Gráficos:** Recharts
- **PWA (Progressive Web App):** `vite-plugin-pwa`
- **Gestor de Paquetes:** `pnpm` (Migrado desde npm para mayor eficiencia y robustez)

---

## Fase 1: Configuración del Backend y Base de Datos

### 1.1. Infraestructura

Se eligió **Supabase** como la solución Backend-as-a-Service (BaaS) para acelerar el desarrollo. Gestiona la base de datos, la autenticación y el almacenamiento de archivos.

### 1.2. Configuración del Cliente

- Se instaló `@supabase/supabase-js`.
- Se configuraron **dos instancias** del cliente de Supabase en `src/services/supabaseClient.ts`:
  - `supabase`: Cliente estándar para el panel de administración que maneja la sesión del usuario.
  - `supabasePublic`: Un cliente especial para el sitio público con `persistSession: false` para evitar conflictos con el token de sesión del administrador.

### 1.3. Esquema de la Base de Datos

Se definieron las siguientes tablas en la base de datos de Supabase (los nombres de las tablas y columnas están en español):

- **`estudios`**: Almacena el catálogo de análisis clínicos.
  - `id`, `nombre`, `categoria`, `descripcion`, `preparacion`, `costo_usd`, `costo_bs`, `tiempo_entrega`, `veces_realizado`, `background_url`
  - `campos_formulario` (JSON): Define la estructura de los campos para el ingreso manual de resultados.
- **`pacientes`**: Registro central de pacientes.
  - `id` (TEXT, alfanumérico), `nombres`, `apellidos`, `cedula_identidad` (único), `email`, `telefono`, `direccion`
- **`citas`**: Almacena las citas agendadas.
  - `id`, `paciente_id`, `fecha_cita`, `estudios_solicitados`, `ubicacion`, `status`, `created_at` (TIMESTAMPTZ, para auditoría).
- **`publicaciones_blog`**: Contenido del blog.
- **`testimonios`**: Testimonios de los pacientes.
- **`resultados_pacientes`**: Almacena los resultados de los pacientes.
- **`resultados_eliminados`**: Registro de auditoría de resultados eliminados.
- **`dias_no_disponibles`**: Almacena las fechas en que el laboratorio no está disponible para citas.
- **`site_config`**: Almacena configuraciones globales del sitio.
  - `id` (único, valor `1`), `tasa_bcv_global` (NUMERIC).
- **`administradores`**: Gestionado por Supabase Auth.

### 1.4. Funciones de Base de Datos (RPC)

Se crearon y/o actualizaron funciones de PostgreSQL para manejar lógica de negocio compleja:

- **`get_patient_results_public(p_cedula TEXT)`**: Función `SECURITY DEFINER` que permite a los usuarios públicos buscar sus resultados de forma segura.
- **`get_distinct_categories()`**: Devuelve una lista de categorías de estudios únicas para poblar los filtros.
- **`get_top_studies_last_7_days()`**: Calcula los 5 estudios más realizados en la última semana basándose en la fecha de creación de los resultados.
- **`get_daily_appointment_activity_last_7_days()`**: Devuelve el conteo de citas creadas por día en la última semana.

---

## Fase 2: Implementación del Frontend Público

### 2.1. Migración de Datos y Contenido

- Se realizó una carga masiva de contenido para poblar las secciones de **Testimonios**, **Blog** y **Catálogo de Estudios**.

### 2.2. Funcionalidades Implementadas

- **Páginas Legales:** Se crearon las páginas de **Términos de Servicio** y **Política de Privacidad**, con contenido coherente y optimización SEO.
- **Portal de Pacientes (`PatientPortalPage`):**
  - Se corrigió un bug crítico que impedía la búsqueda de pacientes si el token de un administrador había expirado.
  - La búsqueda por cédula ahora es más flexible.
- **Agendamiento de Citas (`SchedulingPage`):**
  - Lógica **"upsert"** para pacientes.
- **Página "Sobre Nosotros" (`AboutPage.tsx`):** Se actualizaron las imágenes del equipo y de la sección "Nuestra Historia" por imágenes personalizadas.
- **Responsividad:** Se realizó una auditoría completa y se aplicaron mejoras para garantizar que todo el sitio sea 100% responsivo.
- **Hooks Personalizados:** Se implementaron hooks reutilizables como `useDocumentTitle` para gestionar dinámicamente los títulos de las páginas (mejorando SEO y UX) y `useMediaQuery` para optimizar la renderización de componentes en diferentes tamaños de pantalla.

---

## Fase 3: Implementación del Panel de Administración

### 3.1. Estructura y Autenticación

- **Rutas:** `/login` y `/admin/*`.
- **Login (`LoginPage.tsx`):** Autenticación con Supabase Auth.
- **Ruta Protegida (`ProtectedRoute.tsx`):** Protege las rutas del panel.

### 3.2. Módulos de Gestión (CRUD)

- **Gestión de Estudios (`StudiesAdminPage.tsx`):**
  - Se añadieron funcionalidades de **filtrado por categoría** y **ordenamiento dinámico** (nombre, precio, popularidad).
  - Se mejoró la interfaz con indicadores visuales para el ordenamiento.
  - Se corrigió la responsividad del formulario modal, añadiendo scroll vertical.
- **Dashboard (`DashboardPage.tsx`):**
  - Se corrigieron los gráficos para que muestren datos precisos y relevantes (estudios realizados y citas creadas en la última semana).
  - Se mejoró la responsividad de los gráficos en pantallas pequeñas.
- **Estadísticas (`StatisticsPage.tsx`):**
  - Se mejoró la responsividad de los filtros y gráficos.

---

## Fase 4: Mejoras y Correcciones (Julio 2025)

### 4.1. Refactorización del Estado de Estadísticas

- **Problema:** Las estadísticas en el Dashboard no se actualizaban en tiempo real.
- **Solución:** Se implementó un **Contexto de React (`StatisticsContext`)** para manejar de forma global los contadores principales. Las páginas `DashboardPage` y `StatisticsPage` ahora consumen de este contexto, y los componentes que modifican datos (ej. `PatientsAdminPage`) notifican al contexto para que actualice el estado.

### 4.2. Aislamiento de Sesiones Pública y de Administrador

- **Problema:** La expiración del token JWT de un administrador afectaba las funcionalidades públicas.
- **Solución:** Se implementó una separación de los clientes de Supabase, refactorizando todas las páginas públicas para usar un cliente `supabasePublic` que no persiste la sesión.

### 4.3. Corrección de Búsqueda en Portal de Pacientes

- **Problema:** La búsqueda de pacientes fallaba por una combinación de RLS y errores de tipo de dato.
- **Solución:** Se implementó una solución robusta creando una función de base de datos `get_patient_results_public` con `SECURITY DEFINER`, otorgando los permisos necesarios y corrigiendo los tipos de datos.

---

## Fase 5: Mejoras de Arquitectura y Calidad de Vida (Agosto 2025)

### 5.1. Gestión de Tasa de Cambio Centralizada

- **Problema:** La tasa de cambio BCV se gestionaba individualmente por cada estudio, lo que era ineficiente y propenso a errores.
- **Solución:**
  - Se creó una nueva tabla `site_config` en la base de datos para almacenar un único valor global para la tasa.
  - Se refactorizó la página `StudiesAdminPage` para incluir un campo de entrada que permite al administrador actualizar esta tasa global.
  - Al guardar la nueva tasa, se implementó una función de actualización masiva (`upsert`) que recalcula y actualiza el precio en Bolívares para **todos los estudios** de forma automática, asegurando consistencia y ahorrando una cantidad significativa de trabajo manual.
  - Se eliminó la columna redundante `tasa_bcv` de la tabla `estudios`.

### 5.2. Migración a `BrowserRouter`

- **Problema:** La aplicación utilizaba `HashRouter` (`/#/ruta`), lo cual es menos amigable para el SEO y puede causar inconsistencias con la funcionalidad de PWA en dispositivos móviles.
- **Solución:** Se migró toda la aplicación a `BrowserRouter` para utilizar URLs limpias (`/ruta`). Esto mejora la indexación en motores de búsqueda y la robustez de la PWA, alineando el proyecto con las mejores prácticas para aplicaciones de una sola página (SPA).

### 5.3. Configuración Avanzada para Pruebas y Desarrollo Local

- **Problema:** Probar la aplicación en dispositivos reales a través de túneles (como Ngrok) presentaba problemas con la recarga en caliente (HMR), mientras que la configuración para Ngrok rompía el HMR en el desarrollo local.
- **Solución:** Se refactorizó el archivo `vite.config.ts` para que la configuración de HMR sea **dinámica**. Ahora lee una variable de entorno (`VITE_NGROK_HOST`). Si la variable existe, aplica la configuración para Ngrok; si no, utiliza la configuración por defecto de Vite, garantizando un funcionamiento perfecto tanto en local como a través de túneles.

---

## Fase 6: Gestión de Planes y Feature Flags (Agosto 2025)

Se implementará un sistema de "Feature Flags" para gestionar diferentes niveles de servicio (planes) para los laboratorios que adquieran la plataforma.

### 6.1. Lógica de Negocio y Base de Datos
- **Objetivo:** Almacenar y gestionar el plan activo para cada instancia del software.
- **Implementación:**
  - Se añadirá una nueva columna `plan_activo` (TEXT) a la tabla `site_config`. Los valores posibles serán `'basico'`, `'premium'`, y `'profesional'`.
  - Se creará un archivo `src/data/plans.ts` en el frontend para centralizar la definición de qué funcionalidades pertenecen a cada plan.

### 6.2. Arquitectura Frontend
- **Objetivo:** Crear un sistema centralizado y reutilizable para verificar los permisos de las funcionalidades.
- **Implementación:**
  - **`SiteContext.tsx`:** Un nuevo Context de React que cargará la configuración del sitio, incluyendo el `plan_activo`, al iniciar la aplicación.
  - **`useFeatureFlag.ts`:** Un custom hook que permitirá a cualquier componente verificar de forma sencilla si una funcionalidad está habilitada para el plan actual (ej: `const isInterpretationEnabled = useFeatureFlag('interpretation');`).

### 6.3. Interfaz de Usuario
- **Objetivo:** Ocultar/mostrar funcionalidades según el plan activo y ofrecer opciones de actualización.
- **Implementación:**
  - **Ocultamiento Condicional:** Las rutas en `App.tsx`, los enlaces en los menús y los botones de funcionalidades específicas se renderizarán condicionalmente usando el hook `useFeatureFlag`. Esto garantiza que la interfaz se adapte limpiamente a cada plan sin errores ni espacios vacíos.
  - **Página de Gestión de Plan (`SiteConfigPage.tsx`):** Se rediseñará para mostrar el plan actual del cliente y tarjetas de "upgrade" a los planes superiores, incluyendo un botón de contacto directo (WhatsApp) para solicitar la actualización.

---

## Fase 7: Mejoras de Productividad con IA y Calidad de Vida (Agosto 2025)

### 7.1. Creación de Estudios Asistida por Plantillas

- **Problema:** La creación manual de estudios complejos con múltiples parámetros era lenta y propensa a errores.
- **Solución:**
  - **Base de Conocimiento:** Se creó un archivo `src/data/studyTemplates.ts` que contiene una lista exhaustiva de plantillas para docenas de estudios clínicos, cada una con su categoría, descripción, preparación y todos sus parámetros predefinidos.
  - **Formulario Inteligente:** Se refactorizó el componente `StudyForm.tsx`, reemplazando el campo de texto del nombre por un componente de selección con búsqueda (`CreatableSelect`).
  - **Funcionalidad:** Al seleccionar un estudio de la lista, el formulario se autocompleta instantáneamente con toda la información de la plantilla. Se mantiene la opción de crear un estudio manualmente si no existe en la lista.
  - **Validación de Duplicados:** Se implementó una validación en tiempo real que consulta los estudios existentes en la base de datos y previene la creación de un estudio con un nombre que ya ha sido registrado, deshabilitando el botón de guardado y mostrando un mensaje de error.

### 7.2. Generador de Contenido de Blog con IA (Arquitectura Backend)

- **Problema:** La generación de contenido para el blog requería tiempo y esfuerzo manual. Un intento inicial de implementar la generación desde el frontend se encontró con problemas irresolubles de caché de dependencias en el entorno de desarrollo de Vite.
- **Solución (Arquitectura Refactorizada):** Se rediseñó la funcionalidad para que se ejecute de forma segura y robusta en el backend.
  - **Endpoint de Backend:** Se creó un nuevo endpoint `POST /api/generate-blog-post` en el servidor proxy de Express (`api/index.ts`).
  - **Lógica Centralizada:** Toda la lógica de construcción de prompts y la comunicación con la API de Google Gemini se maneja en este endpoint, protegiendo la clave de API y evitando los problemas del entorno de frontend.
  - **Interfaz de Frontend:**
    - Se creó un nuevo componente modal (`components/admin/BlogAiGeneratorModal.tsx`) donde el administrador puede definir los parámetros del artículo (tema, tono, público, etc.).
    - El formulario principal de creación de posts (`PostForm.tsx`) fue modificado para incluir un botón "Generar con IA" que abre este modal.
    - Al generar, el frontend ahora hace una llamada `fetch` al endpoint del backend y recibe un objeto JSON con el contenido completo del artículo (título, resumen, contenido y metadatos SEO), autocompletando el formulario.

### 7.3. Renderizado de Contenido con Estilos de Blog

- **Problema:** El contenido generado por la IA (inicialmente en HTML, luego en Markdown) no se renderizaba con los estilos correctos en la página pública del post.
- **Solución:**
  - **Prompt Mejorado:** Se actualizó el prompt en el backend para que la IA genere el contenido del artículo en formato **Markdown**.
  - **Renderizado con `react-markdown`:** Se modificó el componente `pages/PostPage.tsx` para utilizar la biblioteca `react-markdown`.
  - **Estilos con Tailwind Typography:** Se aplicó la clase `prose` del plugin `@tailwindcss/typography` al contenedor del contenido. Esto aplica automáticamente un conjunto de estilos de alta calidad a los títulos, listas, párrafos y otros elementos generados desde Markdown, asegurando una apariencia profesional y consistente con el resto del sitio.
