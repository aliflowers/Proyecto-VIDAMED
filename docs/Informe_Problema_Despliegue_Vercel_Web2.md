# Informe técnico: Problema de despliegue del frontend "web2" en Vercel

## Resumen
- Objetivo: desplegar el frontend Vite/React del subdirectorio `web2/` en Vercel y asignar el dominio `proyecto-vidamed.vercel.app`.
- Estado: el build del frontend compila correctamente y se publica una URL de producción, pero el deployment queda marcado como "no ready" debido al error: `Function Runtimes must have a valid version, for example now-php@1.0.0`.
- Impacto: el alias al dominio falla cuando el deployment no está en estado "ready".

## Stack tecnológico
- Frontend: React 19, TypeScript 5.7, Vite 6, React Router 7, React Toastify, PWA (vite-plugin-pwa), Lucide Icons.
- UI y utilidades: Tailwind (config y CDN en `index.html` raíz), Embla Carousel (autoplay), Recharts.
- Datos/Backend: Supabase (SDK v2), serverless functions (Node.js 20), CORS en endpoints API, ElevenLabs para voz.
- Infraestructura: Vercel (proyectos separados para API y web), cron en `vercel.json` raíz, SPA rewrite en `web2/vercel.json`.
- Build: `version: 2` en `vercel.json` (raíz y `web2`), `buildCommand` y `outputDirectory` declarados.

## Entorno y arquitectura
- Monorepo con:
  - Frontend: `web2/` (Vite, React 19, PWA, SPA rewrite, `web2/vercel.json`).
  - Frontend original (raíz): `vite.config.ts`, `src/`, `public/` (no usado en web2 tras autocontener).
  - Backend/API serverless: `api/` (TypeScript, funciones HTTP, CORS aplicado en endpoints clave).
- Vercel:
  - Proyecto separado para API (estable).
  - Proyecto separado para frontend `web2` enlazado a GitHub.
  - `vercel.json` en raíz (para API) con `version: 2` y `functions` para `api/*.ts` y `api/**/*.ts`.
  - `web2/vercel.json` con `version: 2`, `buildCommand`, `outputDirectory`, `installCommand`, `rewrites` (SPA).

## Justificación de la creación de la carpeta "web2"
- Aislar el frontend de configuraciones heredadas del proyecto raíz. En la raíz existen configuraciones de `vercel.json` asociadas a funciones serverless del directorio `api/` que el builder de Vercel estaba interpretando (legacy), disparando el error de runtimes al intentar desplegar el frontend.
- Permitir un `Root Directory` dedicado al frontend. Con `web2/` se define un proyecto de Vercel que sólo ve los archivos del cliente y su propio `web2/vercel.json`, evitando interferencias de funciones y rutas del backend.
- Facilitar un build reproducible y autónomo. Al autocontener `web2/src` y `web2/public` y ajustar `vite.config.ts` a rutas locales, el build no depende de archivos fuera del subdirectorio ni de scripts de copia.
- Eliminar el síntoma original “el sitio muestra código de /api”. Separar el frontend en `web2/` asegura que el dominio público sirva `dist/` del cliente en lugar de respuestas de funciones.
- Mantener compatibilidad con la arquitectura actual. El backend (`api/`) sigue desplegándose como proyecto independiente; `web2` consume el API vía `VITE_API_BASE`.
- Alternativas consideradas: mover el `Root Directory` del proyecto a la raíz con overrides de build por subcarpeta, o separar en repositorio independiente. Se optó por `web2/` como medida pragmática para entregar un build limpio y minimizar el riesgo de configuración.

## Errores observados (extractos)
1) Persistente en deployments de "web2":
```
Error: Function Runtimes must have a valid version, for example `now-php@1.0.0`.
```

2) Antes de la corrección de dependencias/rutas (ya resuelto):
- ENOENT por intento de copiar rutas inexistentes (`/vercel/src`, `/vercel/public`).
- Rollup/Vite no resolvía imports: `recharts`, `embla-carousel-react`.

## URLs de referencia
- Último deployment (web2):
  - Inspect: https://vercel.com/ali-flores-projects/web2/J1EwXJo5FVHAv2D2wE8K9aiSpKdr
  - Producción: https://web2-qwgfusxw7-ali-flores-projects.vercel.app
- Deploys previos similares:
  - https://web2-hyzowzk5b-ali-flores-projects.vercel.app
  - https://web2-ho5esg79l-ali-flores-projects.vercel.app

## Mapa de estructura del repositorio
```
Proyecto VIDAMED/
├── api/
│  ├── _utils/
│  │  ├── audit.ts
│  │  ├── auth.ts
│  │  ├── cors.ts
│  │  ├── permissions.js
│  │  └── permissions.ts
│  ├── appointments/
│  │  └── send-confirmation.ts
│  ├── availability/
│  │  ├── block.ts
│  │  └── slots.ts
│  ├── notify/
│  │  ├── appointment-email.ts
│  │  ├── email.ts
│  │  └── whatsapp.ts
│  ├── reminders/
│  │  └── send-next-day.ts
│  ├── users/
│  │  ├── [id]/permissions.ts
│  │  ├── [id].ts
│  │  └── index.ts
│  ├── voice/
│  │  └── token.ts
│  ├── bedrock.ts
│  ├── chat.ts
│  ├── config.ts
│  ├── dev.ts
│  ├── generate-blog-post.ts
│  ├── index.ts
│  └── interpretar.ts
├── web2/
│  ├── index.html
│  ├── package.json
│  ├── vite.config.ts
│  ├── vercel.json
│  ├── public/
│  │  ├── favicon.ico
│  │  ├── favicon.svg
│  │  ├── pwa-192x192.png
│  │  ├── pwa-512x512.png
│  │  ├── pwa-512x512.svg
│  │  ├── video_seccion_hero.mp4
│  │  └── (assets varios)
│  └── src/
│     ├── index.tsx
│     ├── index.css
│     ├── App.tsx
│     ├── components/
│     │  ├── ChatWidget.tsx
│     │  ├── Footer.tsx
│     │  ├── Header.tsx
│     │  ├── InterpretationViewerModal.tsx
│     │  ├── Logo.tsx
│     │  ├── TestimonialForm.tsx
│     │  ├── VoiceChat.tsx
│     │  ├── admin/
│     │  │  ├── AdminLayout.tsx
│     │  │  ├── AdvancedFilters.tsx
│     │  │  ├── BlogAiGeneratorModal.tsx
│     │  │  ├── FileUploadModal.tsx
│     │  │  ├── FormFieldBuilder.tsx
│     │  │  ├── ImageUpload.tsx
│     │  │  ├── InterpretationModal.tsx
│     │  │  ├── InventoryCard.tsx
│     │  │  ├── InventoryForm.tsx
│     │  │  ├── InventoryTable.tsx
│     │  │  ├── ManualResultForm.tsx
│     │  │  ├── PatientForm.tsx
│     │  │  ├── PatientSelectorModal.tsx
│     │  │  ├── PostForm.tsx
│     │  │  ├── ProtectedRoute.tsx
│     │  │  ├── ResultViewer.tsx
│     │  │  ├── ResultsTable.tsx
│     │  │  ├── StudyForm.tsx
│     │  │  ├── TestimonialViewer.tsx
│     │  │  ├── UnifiedEntryModal.tsx
│     │  │  └── ViewToggle.tsx
│     │  └── common/
│     │     ├── EmptyState.tsx
│     │     ├── Modal.tsx
│     │     └── Pagination.tsx
│     ├── pages/
│     │  ├── AboutPage.tsx
│     │  ├── BlogPage.tsx
│     │  ├── ContactPage.tsx
│     │  ├── ForgotPasswordPage.tsx
│     │  ├── HomePage.tsx
│     │  ├── LoginPage.tsx
│     │  ├── NewPasswordPage.tsx
│     │  ├── NotFoundPage.tsx
│     │  ├── PatientPortalPage.tsx
│     │  ├── PostPage.tsx
│     │  ├── PrivacyPolicyPage.tsx
│     │  ├── SchedulingPage.tsx
│     │  ├── StudiesPage.tsx
│     │  ├── TermsOfServicePage.tsx
│     │  └── admin/
│     │     ├── AppointmentsAdminPage.tsx
│     │     ├── DashboardPage.tsx
│     │     ├── ExpensesAdminPage.tsx
│     │     ├── InventoryPage.tsx
│     │     ├── PatientDetailPage.tsx
│     │     ├── PatientsAdminPage.tsx
│     │     ├── PostsAdminPage.tsx
│     │     ├── ResultsPage.tsx
│     │     ├── SiteConfigPage.tsx
│     │     ├── StatisticsPage.tsx
│     │     ├── StudiesAdminPage.tsx
│     │     ├── TestimonialsAdminPage.tsx
│     │     ├── UserAuditPage.tsx
│     │     └── UsersManagementPage.tsx
│     ├── services/
│     │  ├── apiFetch.ts
│     │  ├── audit.ts
│     │  └── supabaseClient.ts
│     ├── constants/permissionsSchema.ts
│     ├── context/StatisticsContext.tsx
│     ├── data/
│     │  ├── constants.ts
│     │  └── studyTemplates.ts
│     ├── hooks/
│     │  ├── useChat.ts
│     │  ├── useDocumentTitle.ts
│     │  └── useMediaQuery.ts
│     ├── types/index.ts
│     └── utils/
│        ├── env.ts
│        ├── formatters.ts
│        └── permissions.ts
├── src/ (frontend original no usado por web2)
│  ├── components/ (similar a web2/src/components)
│  ├── pages/ (similar a web2/src/pages)
│  ├── services/, utils/, types/
│  ├── App.tsx, index.tsx, index.css
│  └── vite-env.d.ts
├── supabase/
│  ├── migrations/
│  │  ├── 2025-11-07_user_management.sql
│  │  ├── 2025-11-13_setup_inventory.sql
│  │  └── (múltiples .sql de fixes y funciones)
│  ├── seeds/
│  │  ├── 2025-11-13_populate_estudios.sql
│  │  └── (datos de prueba)
│  └── scripts/ (helpers PS1)
├── scripts/
│  ├── db/, dev/ (scripts de utilidad)
│  ├── advanced-table-scan.js
│  ├── db-setup.mjs
│  ├── debug-data-access.js
│  ├── mcp-*.js (herramientas de MCP)
│  └── read-only-tools.js
├── docs/
│  ├── architecture/, database/, modules/, security/
│  ├── presentaciones y recomendaciones
│  └── Informe_Problema_Despliegue_Vercel_Web2.md
├── documentacion/ (documentos varios)
├── public/ (assets raíz no usados por web2 tras autocontener)
├── vercel.json (raíz)
├── vite.config.ts (raíz)
├── package.json, tsconfig.json, tailwind.config.js
└── .env.example, .gitignore, README.md
```

## Mapa de funciones serverless (API)
```
api/_utils/audit.ts
api/_utils/auth.ts
api/_utils/cors.ts
api/_utils/permissions.ts
api/appointments/send-confirmation.ts
api/availability/block.ts
api/availability/slots.ts
api/notify/appointment-email.ts
api/notify/email.ts
api/notify/whatsapp.ts
api/reminders/send-next-day.ts
api/users/[id]/permissions.ts
api/users/[id].ts
api/users/index.ts
api/voice/token.ts
api/bedrock.ts
api/chat.ts
api/config.ts
api/dev.ts
api/generate-blog-post.ts
api/index.ts
api/interpretar.ts
```

## Acciones realizadas
1. Autocontener el frontend `web2`:
   - `web2/vite.config.ts`: root/local, `publicDir` local, `outDir` `web2/dist`, alias `@` a `web2/src`.
   - `web2/index.html`: importar `./src/index.tsx`.
   - Eliminar `prebuild` y script de copia (`web2/scripts/copy-parent.mjs`).

2. Corregir PWA/Workbox y dependencias:
   - Ajuste `maximumFileSizeToCacheInBytes` a 5 MB para evitar errores de precache.
   - Añadir deps faltantes en `web2/package.json`: `embla-carousel-react`, `embla-carousel-autoplay`, `recharts`, `@elevenlabs/react`.
   - Build local `web2` exitoso (generación de `dist/`).

3. Configuración Vercel JSON (formato V2):
   - Raíz: añadir `"version": 2` y patrones `functions` para `api/*.ts` y `api/**/*.ts` (`nodejs20.x`).
   - `web2/vercel.json`: añadir `"version": 2`, `buildCommand`, `outputDirectory`, `installCommand`, `rewrites`.

4. Deploys vía CLI (con token inline):
   - Comandos `vercel --cwd web2 --prod --yes --token ****` generan URL de producción, pero inmediatamente reportan el error de runtimes.
   - Intentos de `vercel alias set <deploy> proyecto-vidamed.vercel.app` fallan al no estar "ready".

## Estado actual
- `web2` compila localmente y genera `dist/`.
- En Vercel, el build se ejecuta y publica URL, pero el deployment se marca con error de runtimes legacy, impidiendo el alias.
- La UI de Vercel no muestra una opción clara de "legacy build system" en Functions para desactivar. Con `version: 2` en `vercel.json` debería aplicarse el formato moderno.

## Hipótesis y posibles causas
1. Override de runtimes heredado a nivel de Proyecto u Organización (no visible en la sección Functions), forzando `now-*`.
2. Prioridad de configuración: El proyecto podría estar tomando `vercel.json` del root en vez del de `web2`, o algún override de Settings contradice el `vercel.json`.
3. Ruido por coexistencia de configuración de API en el root del repo y proyecto "web2" leyendo esos metadatos al construir.
4. Uso de una versión antigua del CLI o un bug en la relación entre `version: 2` y Functions; el mensaje es el clásico de configuración legacy.

## Evidencia de correcciones que sí funcionaron
- ENOENT de rutas `/vercel/src` y resolución de módulos (recharts/embla) quedaron completamente resueltos tras:
  - Remover `prebuild`.
  - Añadir dependencias.
  - Asegurar root/local en `web2/vite.config.ts`.

## Propuestas de solución adicionales
1. Crear un proyecto Vercel "limpio" para `web2` desde Import → seleccionar el subdirectorio `web2` y preset `Vite` (sin funciones), asegurando que tome **exclusivamente** `web2/vercel.json`.
2. Validar que en Settings del proyecto "web2":
   - Framework Preset: `Vite`.
   - Root Directory: `web2`.
   - Build/Install/Output coinciden con `web2/vercel.json`.
   - No existan "Build & Output Overrides" que introduzcan runtimes (legacy).
3. Probar despliegue sin `vercel.json` en raíz (temporalmente) moviendo el archivo del root para confirmar si el proyecto "web2" hereda configuración del root.
4. Alternativa de separación completa: repositorio independiente para el frontend (solo `web2/`), evitando que Vercel inspecione metadatos del monorepo.
5. Usar `--scope` explícito en CLI (organización del proyecto) y verificar que el proyecto enlazado es el correcto.

6. En caso de persistir el error, solicitar al soporte de Vercel revisión de:
   - Prioridad/lectura de `vercel.json` en monorepos con múltiples proyectos.
   - Metadatos u overrides a nivel organización/proyecto que no son visibles en UI estándar.
   - Confirmación de que el builder moderno está activo para este proyecto específico.

## Pasos que puede ejecutar el agente de soporte
1. Inspeccionar metadata del proyecto "web2" via API de Vercel para confirmar si hay overrides ocultos de runtimes.
2. Forzar reconfiguración del proyecto: eliminar y recrear el proyecto "web2" con Root Directory `web2`, preset `Vite` y sin funciones.
3. Validar la precedencia entre `vercel.json` del root vs `web2/vercel.json` en monorepos enlazados a GitHub.
4. Confirmar que `version: 2` es efectivamente consumido por el builder para el proyecto "web2".

## Notas finales
- El frontend "web2" ya compila y todas las dependencias están presentes.
- El obstáculo actual no es de código, sino de interpretación de configuración/runtimes del proyecto en Vercel.
- Agradecemos revisión avanzada para identificar dónde se originan los runtimes legacy que impiden el estado "ready" del deployment.
