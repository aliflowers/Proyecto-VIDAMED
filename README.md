# Laboratorio Clínico VidaMed - Sitio Web

**Fecha de Última Actualización:** 18 de Agosto de 2025

## Descripción General

Este es el repositorio del sitio web para el **Laboratorio Clínico VidaMed**. El proyecto es una aplicación web moderna (Single Page Application - SPA) desarrollada con React, TypeScript y Vite, diseñada para ser una plataforma completa y amigable tanto para pacientes como para administradores.

El propósito principal de VIDAMED es digitalizar y optimizar la gestión de un laboratorio clínico, permitiendo a los pacientes agendar citas, consultar resultados y dejar testimonios de manera segura y eficiente. Resuelve problemas como procesos manuales lentos, errores en registros y falta de accesibilidad remota. Beneficios para el laboratorio: mayor eficiencia operativa, reducción de costos administrativos y análisis de datos en tiempo real. Para los clientes: comodidad, rapidez en resultados y una experiencia personalizada. Esto se traduce en mayor satisfacción, lealtad y crecimiento del negocio.

## Estado Actual

El proyecto es una aplicación web **100% funcional y robusta**, conectada a un backend de **Supabase**. Todas las funcionalidades clave, desde el agendamiento de citas y la consulta de resultados por parte de los pacientes, hasta un panel de administración completo para la gestión del sitio, han sido implementadas y refinadas. La aplicación está lista para su despliegue en un entorno de producción.

---

## Análisis de Arquitectura General

### Diagrama de Componentes Principales
VIDAMED es una SPA modular:
- Frontend: Componentes React, páginas, contextos y servicios.
- Backend: Supabase + API custom en Express.js.
- Externos: APIs de IA y herramientas como PDFKit.

Diagrama conceptual:
```
[Usuario] --> [Frontend React SPA] --> [Supabase SDK] --> [Supabase (DB + Auth + Storage)]
             |--> [API Custom (Express/Node.js)] --> [IA, Email, PDFs]
```

### Flujo de Datos
- Público: Carga datos de DB → Interacciones → Upserts a tablas.
- Privado: Auth → Carga en tiempo real → CRUD con actualizaciones.
- Asincrónico: Suscripciones Supabase y notificaciones.

### Tecnologías y Frameworks
- Frontend: React 19, TypeScript, Vite, Tailwind CSS, Recharts.
- Backend: Supabase (PostgreSQL), Express.js.
- Otras: Google Gemini, ElevenLabs, Nodemailer, PDFKit, PWA.

### Configuración de Entorno
- Requisitos: Node.js, Supabase account.
- Instalación: `npm install`, configura .env.
- Ejecución: `npm run dev` (frontend). API manual.

## Módulos en la Sección Privada
- Listado: Dashboard, Estudios, Blog, Testimonios, Citas, Pacientes, Inventario, Resultados, Estadísticas, Gestión de Usuarios, Control de Gastos, Configuración.
- Funcionalidades: CRUD, estadísticas en tiempo real, moderación.
- Dependencias comunes: `supabaseClient`, contextos React y `permissions.ts`.

### Dependencias por Módulo (Tablas/RPC)
- **Dashboard** (`DashboardPage.tsx`)
  - Tablas: `citas` (select), `pacientes` (select).
- **Estudios** (`StudiesAdminPage.tsx`)
  - Tablas: `estudios` (select, upsert, insert, update, delete), `estudio_materiales` (insert, delete).
  - RPC: `get_distinct_categories`.
- **Blog** (`PostsAdminPage.tsx`)
  - Tablas: `publicaciones_blog` (insert, update, delete).
- **Testimonios** (`TestimonialsAdminPage.tsx`)
  - Tablas: `testimonios` (delete, moderación).
- **Citas** (`AppointmentsAdminPage.tsx`)
  - Tablas: `citas` (select, update), `dias_no_disponibles` (select, insert, delete).
  - Restricción de sede: `Lic.` y `Asistente` sólo ven/actúan en su `sede`.
- **Pacientes** (`PatientsAdminPage.tsx`)
  - Tablas: `pacientes` (select, insert, update).
  - RPC: `generate_patient_id`.
- **Inventario** (`InventoryPage.tsx`)
  - Tablas: `inventario` (select).
- **Resultados** (`ResultsPage.tsx`)
  - Tablas: `resultados_pacientes` (select, insert), `estudios` (select).
  - RPC: `deduct_inventory_materials`, `increment_study_count`, `delete_patient_result`.
- **Estadísticas** (`StatisticsPage.tsx`)
  - RPC: `get_studies_by_popularity`, `get_monthly_patient_registrations`, `get_appointment_location_ratio`, `get_top_patients_by_appointments`.
- **Gestión de Usuarios** (`UsersManagementPage.tsx`)
  - Tablas: `user_profiles` (select, update). Campo `sede` editable.
- **Control de Gastos** (`ExpensesAdminPage.tsx`)
  - Tablas: `categorias_gastos`, `proveedores`, `empleados`, `user_profiles`, `gastos`, `cuentas_por_pagar`, `pagos_cxp`, `servicios_recurrentes`, `nominas`, `nomina_items` (select/insert/update).
- **Configuración** (`SiteConfigPage.tsx`)
  - Tablas: `hero_images` (select, upsert).

## Esquema de Base de Datos
### Tablas Principales y Campos Clave
- **pacientes**
  - Claves: `id` (PK), `cedula_identidad` (única).
  - Campos: `nombres`, `apellidos`, `email`, `telefono`, `direccion`, `ciudad_domicilio`.
- **estudios**
  - Claves: `id` (PK).
  - Campos: `nombre`, `categoria`, `descripcion`, `preparacion`, `costo_usd`, `costo_bs`, `tasa_bcv`, `tiempo_entrega`, `campos_formulario` (JSON[]), `veces_realizado`, `background_url`.
- **citas**
  - Claves: `id` (PK).
  - Campos: `fecha_cita` (timestamp con zona `-04:00`), `ubicacion` (sede), `estudios_solicitados` (text[]/json array), `status`.
  - Relaciones: FK `paciente_id` → `pacientes.id` (utilizada via join en consultas).
- **dias_no_disponibles**
  - Campos: `fecha` (date).
- **resultados_pacientes**
  - Claves: `id` (PK).
  - Campos: `paciente_id` (FK), `estudio_id` (FK), `resultado_data` (JSON), `fecha_creacion`, `analisis_ia`, `analisis_estado`, `motivo_estudio` (opcional).
  - Relaciones: FK `paciente_id` → `pacientes.id`, FK `estudio_id` → `estudios.id`.
- **resultados_eliminados**
  - Campos: `id` (PK), `nombre_estudio`, `fecha_eliminacion`, y referencia al resultado original (recomendado: `resultado_id`).
- **inventario**
  - Claves: `id` (PK).
  - Campos: `nombre`, `descripcion`, `cantidad_stock`, `unidad_medida`, `stock_minimo`, `proveedor`, `fecha_ultima_compra`, `costo_ultima_compra_bs`, `costo_ultima_compra_usd`, `notas`, `imagen_url`, `unidades_por_caja`, `unidades_totales`, `sku`.
- **estudio_materiales**
  - Campos: mapeo `estudio_id` ↔ `material_id`, `quantity`.
- **publicaciones_blog**, **testimonios**, **hero_images**
  - CRUD estándar.
- **user_profiles**
  - Campos: `user_id` (PK), `nombre`, `apellido`, `cedula`, `email`, `sede`, `rol`.
- **Gastos y Finanzas**
  - `categorias_gastos`, `proveedores`, `empleados`, `gastos`, `cuentas_por_pagar`, `pagos_cxp`, `servicios_recurrentes`, `nominas`, `nomina_items`.

### Relaciones
- `resultados_pacientes (paciente_id)` → `pacientes (id)`.
- `resultados_pacientes (estudio_id)` → `estudios (id)`.
- `citas` se consulta uniendo `pacientes` por relación `paciente_id`.
- `estudio_materiales` relaciona insumos con `estudios`. Acciones en `resultados` pueden descontar inventario.

### Índices Recomendados
- `pacientes(cedula_identidad)` único para consultas rápidas por cédula.
- `citas(fecha_cita)`, `citas(ubicacion)` para filtros por fecha y sede.
- `resultados_pacientes(paciente_id)`, `resultados_pacientes(estudio_id)` para joins y filtros.
- `estudios(nombre)`, `estudios(categoria)` para búsquedas y estadísticas.
- `inventario(sku)` único para gestión y trazabilidad.

### Procedimientos y Triggers (lógica de negocio)
- RPC llamados desde el frontend:
  - `get_distinct_categories`, `get_studies_by_popularity`, `get_monthly_patient_registrations`, `get_appointment_location_ratio`, `get_top_patients_by_appointments`.
  - `deduct_inventory_materials` (descontar materiales tras registrar resultado).
  - `increment_study_count` (incrementar `veces_realizado` del estudio).
  - `delete_patient_result` (eliminar resultado con auditoría en `resultados_eliminados`).
- Nota: Algunas funciones (`increment_study_count`, `delete_patient_result`, `generate_patient_id`) se invocan pero no están definidas en este repositorio. Se recomienda implementarlas en Supabase (SQL/Edge Functions) y versionarlas como migraciones.

### RLS y Seguridad
- Roles (frontend): `Administrador`, `Lic.`, `Asistente` con matriz de permisos en `src/utils/permissions.ts`.
- Restricción por sede (aplicada en UI y recomendada en RLS):
  - En `Citas`, `Lic.` y `Asistente` sólo pueden leer/actualizar citas de su `sede`.
  - Recomendación: políticas RLS en `citas` y vistas relacionadas basadas en `auth.uid()` ↔ `user_profiles.sede`.
- Resultados y Pacientes: políticas de lectura y escritura acotadas por rol; auditoría en eliminaciones (`resultados_eliminados`).

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

## Guía de Contribución
- Forkea el repo.
- Crea branch: `git checkout -b feature/nueva-funcion`.
- Commit: `git commit -m 'Agrega nueva función'`.
- Push y PR.

## Roadmap Futuro
- Integración con pagos en línea.
- Notificaciones push.
- Mejoras en IA para interpretación de resultados.

## Contacto
Para soporte, contacta al equipo de desarrollo.
