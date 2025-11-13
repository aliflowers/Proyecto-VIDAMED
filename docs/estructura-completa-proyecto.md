# Mapa Completo del Proyecto VIDAMED

## Árbol de directorios y archivos (estado actual)

```
.
├─ .trae/
│  └─ documents/
│     ├─ Corregir Overrides de Permisos y Endurecer Gating por Módulo.md
│     ├─ Desplegar Web + API en Vercel y dejar producción operativa.md
│     ├─ PWA Manifest y Seguridad de Endpoints antes de Producción.md
│     ├─ Plan de Despliegue Web + API en Vercel (Producción estable).md
│     └─ Restaurar Gestión de Usuarios con Permisos Granulares.md
├─ .vite/
│  └─ deps/
│     ├─ _metadata.json
│     └─ package.json
├─ android_app/
│  └─ README.md
├─ api/
│  ├─ _utils/
│  │  ├─ audit.ts
│  │  ├─ auth.ts
│  │  ├─ cors.ts
│  │  ├─ permissions.js
│  │  └─ permissions.ts
│  ├─ appointments/
│  │  └─ send-confirmation.ts
│  ├─ availability/
│  │  ├─ block.ts
│  │  └─ slots.ts
│  ├─ notify/
│  │  ├─ appointment-email.ts
│  │  ├─ email.ts
│  │  └─ whatsapp.ts
│  ├─ reminders/
│  │  └─ send-next-day.ts
│  ├─ scripts/
│  │  ├─ send-test-email.ts
│  │  ├─ test-bedrock-chat.ts
│  │  └─ test-nova-converse.ts
│  ├─ users/
│  │  ├─ [id]/
│  │  │  └─ permissions.ts
│  │  ├─ [id].ts
│  │  └─ index.ts
│  ├─ voice/
│  │  └─ token.ts
│  ├─ .gitignore
│  ├─ bedrock.ts
│  ├─ chat.ts
│  ├─ config.ts
│  ├─ dev.ts
│  ├─ generate-blog-post.ts
│  ├─ index.ts
│  ├─ interpretar.ts
│  └─ .vercel/
│     ├─ README.txt
│     └─ project.json
├─ assets/
│  └─ vidamed_logo.png
├─ data/
│  └─ mockData.ts
├─ dist/
│  ├─ assets/
│  │  ├─ index-BTsnGVpn.css
│  │  └─ index-CIu8-gwM.js
│  ├─ Captura de pantalla 2025-07-16 234037.png
│  ├─ Captura de pantalla 2025-07-16 234131.png
│  ├─ Gemini_Generated_Image_30pwzh30pwzh30pw.png
│  ├─ Image_fx (38).jpg
│  ├─ Image_fx (40).jpg
│  ├─ Image_fx (41).jpg
│  ├─ Image_fx (42).jpg
│  ├─ favicon.ico
│  ├─ favicon.svg
│  ├─ index.html
│  ├─ manifest.webmanifest
│  ├─ pwa-192x192.png
│  ├─ pwa-512x512.png
│  ├─ pwa-512x512.svg
│  ├─ registerSW.js
│  ├─ sw.js
│  └─ video_seccion_hero.mp4
├─ docs/
│  ├─ architecture/
│  │  └─ project_analysis.md
│  ├─ database/
│  │  ├─ Estructura Completa de Base de Datos para Sistema.md
│  │  └─ LISTA DE ESTUDIOS VIDAMED.md
│  ├─ modules/
│  │  └─ ANALISIS_MODULO_INVENTARIO.md
│  ├─ presentations/
│  │  └─ Version Final Diapositivas Ana Maria.html
│  ├─ security/
│  │  └─ SEGURIDAD_VIDAMED_CHECKLIST.md
│  ├─ Informe_Problema_Despliegue_Vercel_Web2.md
│  ├─ Recomendaciones para el despliegue en vercel.md
│  └─ vercel-serverless-plan.md
├─ documentacion/
│  ├─ Analisis Tecnico del proyecto VIDAMED.md
│  ├─ Comandos de la Terminal.md
│  ├─ Configuracion_ElevenLabs.md
│  ├─ DIAGNOSTICO_CHATBOT_IA.md
│  ├─ DOCUMENTACION_PROYECTO.md
│  ├─ Examenes clinicos en vzla.md
│  ├─ MODULO_RESULTADOS_VIDAMED.md
│  ├─ PLANES_COMERCIALES.md
│  ├─ SISTEMA_CHAT_PROFESIONAL.md
│  ├─ SOLICITUD_PRESUPUESTO.txt
│  └─ SOLUCION_SEO.md
├─ public/
│  ├─ Captura de pantalla 2025-07-16 234037.png
│  ├─ Captura de pantalla 2025-07-16 234131.png
│  ├─ Gemini_Generated_Image_30pwzh30pwzh30pw.png
│  ├─ Image_fx (38).jpg
│  ├─ Image_fx (40).jpg
│  ├─ Image_fx (41).jpg
│  ├─ Image_fx (42).jpg
│  ├─ favicon.ico
│  ├─ favicon.svg
│  ├─ pwa-192x192.png
│  ├─ pwa-512x512.png
│  ├─ pwa-512x512.svg
│  └─ video_seccion_hero.mp4
├─ scripts/
│  ├─ db/
│  │  ├─ README.md
│  │  └─ fix_inventory_rls.js
│  ├─ dev/
│  │  ├─ README.md
│  │  ├─ insert-test-data.js
│  │  ├─ process_json.ps1
│  │  └─ test-endpoint.js
│  ├─ advanced-table-scan.js
│  ├─ db-setup.mjs
│  ├─ debug-data-access.js
│  ├─ mcp-execute-sql.js
│  ├─ mcp-extensions.js
│  ├─ mcp-list-tables.js
│  ├─ mcp-project-info.js
│  ├─ mcp-sample-data.js
│  ├─ mcp-tools-README.md
│  └─ read-only-tools.js
├─ src/
│  ├─ components/
│  │  ├─ admin/
│  │  │  ├─ AdminLayout.tsx
│  │  │  ├─ AdvancedFilters.tsx
│  │  │  ├─ BlogAiGeneratorModal.tsx
│  │  │  ├─ FileUploadModal.tsx
│  │  │  ├─ FormFieldBuilder.tsx
│  │  │  ├─ ImageUpload.tsx
│  │  │  ├─ InterpretationModal.tsx
│  │  │  ├─ InventoryCard.tsx
│  │  │  ├─ InventoryForm.tsx
│  │  │  ├─ InventoryTable.tsx
│  │  │  ├─ ManualResultForm.tsx
│  │  │  ├─ PatientForm.tsx
│  │  │  ├─ PatientSelectorModal.tsx
│  │  │  ├─ PostForm.tsx
│  │  │  ├─ PostForm_CON_IA.tsx.bak
│  │  │  ├─ ProtectedRoute.tsx
│  │  │  ├─ ResultViewer.tsx
│  │  │  ├─ ResultsTable.tsx
│  │  │  ├─ StudyForm.tsx
│  │  │  ├─ TestimonialViewer.tsx
│  │  │  ├─ UnifiedEntryModal.tsx
│  │  │  └─ ViewToggle.tsx
│  │  ├─ common/
│  │  │  ├─ EmptyState.tsx
│  │  │  ├─ Modal.tsx
│  │  │  └─ Pagination.tsx
│  │  ├─ ChatWidget.tsx
│  │  ├─ Footer.tsx
│  │  ├─ Header.tsx
│  │  ├─ InterpretationViewerModal.tsx
│  │  ├─ Logo.tsx
│  │  ├─ TestimonialForm.tsx
│  │  └─ VoiceChat.tsx
│  ├─ constants/
│  │  └─ permissionsSchema.ts
│  ├─ context/
│  │  └─ StatisticsContext.tsx
│  ├─ data/
│  │  ├─ constants.ts
│  │  └─ studyTemplates.ts
│  ├─ hooks/
│  │  ├─ useChat.ts
│  │  ├─ useDocumentTitle.ts
│  │  └─ useMediaQuery.ts
│  ├─ pages/
│  │  ├─ admin/
│  │  │  ├─ AppointmentsAdminPage.tsx
│  │  │  ├─ DashboardPage.tsx
│  │  │  ├─ ExpensesAdminPage.tsx
│  │  │  ├─ InventoryPage.tsx
│  │  │  ├─ PatientDetailPage.tsx
│  │  │  ├─ PatientsAdminPage.tsx
│  │  │  ├─ PostsAdminPage.tsx
│  │  │  ├─ ResultsPage.tsx
│  │  │  ├─ SiteConfigPage.tsx
│  │  │  ├─ StatisticsPage.tsx
│  │  │  ├─ StudiesAdminPage.tsx
│  │  │  ├─ TestimonialsAdminPage.tsx
│  │  │  ├─ UserAuditPage.tsx
│  │  │  └─ UsersManagementPage.tsx
│  │  ├─ AboutPage.tsx
│  │  ├─ BlogPage.tsx
│  │  ├─ ContactPage.tsx
│  │  ├─ ForgotPasswordPage.tsx
│  │  ├─ HomePage.tsx
│  │  ├─ LoginPage.tsx
│  │  ├─ NewPasswordPage.tsx
│  │  ├─ NotFoundPage.tsx
│  │  ├─ PatientPortalPage.tsx
│  │  ├─ PostPage.tsx
│  │  ├─ PrivacyPolicyPage.tsx
│  │  ├─ SchedulingPage.tsx
│  │  ├─ StudiesPage.tsx
│  │  └─ TermsOfServicePage.tsx
│  ├─ services/
│  │  ├─ apiFetch.ts
│  │  ├─ audit.ts
│  │  └─ supabaseClient.ts
│  ├─ types/
│  │  └─ index.ts
│  ├─ utils/
│  │  ├─ env.ts
│  │  ├─ formatters.ts
│  │  └─ permissions.ts
│  ├─ App.tsx
│  ├─ index.css
│  ├─ index.tsx
│  └─ vite-env.d.ts
├─ supabase/
│  ├─ .temp/
│  │  ├─ cli-latest
│  │  ├─ gotrue-version
│  │  ├─ pooler-url
│  │  ├─ postgres-version
│  │  ├─ rest-version
│  │  └─ storage-version
│  ├─ migrations/
│  │  ├─ 2025-11-07_user_management.sql
│  │  ├─ 2025-11-13_create_stock_function.sql
│  │  ├─ 2025-11-13_fix_inventory_rls.sql
│  │  ├─ 2025-11-13_fix_results_materials.sql
│  │  ├─ 2025-11-13_fix_trigger_desactualizado.sql
│  │  ├─ 2025-11-13_fix_trigger_unidades_totales.sql
│  │  ├─ 2025-11-13_setup_inventory.sql
│  │  ├─ 2025-11-13_single_migration.sql
│  │  ├─ 2025-11-13_stock_inventory_enhancement.sql
│  │  └─ README.md
│  ├─ scripts/
│  │  ├─ apply_migrations.ps1
│  │  └─ generate_single_migration.ps1
│  └─ seeds/
│     ├─ 2025-11-13_populate_estudios.sql
│     ├─ 2025-11-13_test_data.sql
│     ├─ 2025-11-13_test_inventory_materials.sql
│     ├─ 2025-11-13_update_statements.sql
│     └─ README.md
├─ .env.example
├─ .gitignore
├─ .gitmessage.txt
├─ .npmrc
├─ README.md
├─ index.html
├─ metadata.json
├─ package-lock.json
├─ package.json
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
├─ tailwind.config.js
├─ tsconfig.json
├─ vercel.json
├─ vidamed-laboratorio-parametros.json
└─ vite.config.ts

# Nota sobre `node_modules/`
- La carpeta `node_modules/` existe (generada por el gestor de paquetes) pero no se incluye su listado completo aquí por su tamaño y naturaleza generada. El mapa anterior refleja 100% del código fuente, configuración y artefactos de build presentes en el repositorio.
```

## Descripción detallada: dependencias, compilación y despliegue (Vercel)

- `package.json`
  - Proyecto `vidamed-laboratorio-clinico` privado, `type: module`.
  - Scripts: `dev` (`vite`), `build` (`vite build`), `preview` (`vite preview`). Incluye un script experimental `fix-inventory-rls` no funcional.
  - Dependencias clave frontend/backend: `react`/`react-dom` 19, `react-router-dom` 7, `vite` 6, `vite-plugin-pwa`, `tailwindcss/typography`, `@supabase/supabase-js`, utilidades (`date-fns`, `react-select`, `react-toastify`, etc.). Backend: `express`, `cors`, `nodemailer`, `pdfkit`, cliente AWS Bedrock (`@aws-sdk/client-bedrock-runtime`) y ElevenLabs (`@elevenlabs/react`).
  - DevDependencies: tipados TS (`@types/*`), `typescript` 5.7, `ts-node`/`tsx` para scripts.

- `pnpm-lock.yaml` y `package-lock.json`
  - Coexisten ambos locks. En despliegue Vercel se usa `npm ci` (ver `vercel.json`), por lo que el lock efectivo es `package-lock.json`. `pnpm-lock.yaml` refleja uso local de PNPM; mantener ambos puede causar divergencias si las versiones difieren.

- `pnpm-workspace.yaml`
  - Monorepo con dos paquetes: raíz (`.`) y `api/`. Permite gestionar dependencias separadas si se decide usar PNPM Workspaces localmente.

- `.npmrc`
  - `node-linker=hoisted` (configuración de PNPM). NPM ignora esta clave; aplica si se usa PNPM.

- `.gitignore`
  - Excluye `node_modules/`, `dist/`, variables de entorno `.env` (raíz y `api/.env`), `.vercel/`, y metadatos de editores.

- `.env.example`
  - Plantilla de variables para frontend (`VITE_*`) y backend (privadas: `SUPABASE_*`, `AWS_*`, SMTP, WhatsApp, `CRON_SECRET`). Importante: contiene valores reales de ejemplo; en producción deben configurarse en Vercel (Environment Variables) y este archivo no debe contener secretos válidos.

- `tsconfig.json`
  - Target `ES2020`, `module: ESNext`, JSX `react-jsx`. Modo bundler (`moduleResolution: bundler`) y `noEmit`. `baseUrl: .` y alias `@/* -> ./src/*`. Incluye `src` y `api`; excluye `node_modules` y `dist`.

- `tailwind.config.js`
  - Escanea `index.html`, `src/**/*`, `pages/**/*`, `components/**/*`. Extiende paleta de colores corporativa y usa plugin `@tailwindcss/typography`.

- `index.html`
  - SPA de entrada para Vite: `#root` y carga `./src/index.tsx`. Incluye Tailwind vía CDN y `importmap` para ESM de `react`, `react-dom`, `react-router-dom`, `@google/genai`, `lucide-react`. Registra `manifest.webmanifest` para PWA.

- `vite.config.ts`
  - Base `/`. Alias `@ -> ./src` y `@google/genai` (resolución a node_modules).
  - Plugin `VitePWA` con `registerType: autoUpdate`, manifiesto y Workbox con límite de cache 5MB.
  - `server.proxy` en dev: proxifica `/api` a `http://127.0.0.1:3001` (servidor Express local).
  - `preview` público (`host: true`), puerto `4173`.

- `vercel.json`
  - `installCommand`: `npm ci` (bloquea a `package-lock.json`).
  - `buildCommand`: `npm run build` (ejecuta `vite build`).
  - `outputDirectory`: `dist` (artefactos estáticos de Vite). En producción, Vercel sirve `dist/` como sitio estático SPA.
  - `functions`: `api/**/*.ts` con `runtime: nodejs20.x`, `memory: 1024`, `maxDuration: 30` (segundos). Cada archivo `.ts` bajo `api/` se despliega como función Serverless en la ruta correspondiente.
  - `crons`: 1 tarea programada que invoca `GET /api/reminders/send-next-day` con un parámetro `token` embebido en la URL; el `schedule` es `0 16 * * *` (diario a las 16:00 UTC). Recomendación: mover el secreto a env y validar en servidor.
  - `rewrites`:
    - `/api/:path*` → `/api/:path*` (pasa endpoints a funciones).
    - `/(.*)` → `/index.html` (fallback de SPA: todas las rutas al frontend).
  - `headers`: cacheo agresivo para `/assets/*` (immutable, 1 año), `manifest.webmanifest` y `favicon.ico` (1 día).

- `api/.vercel/project.json`
  - Metadatos de enlace a proyecto Vercel: `projectId`, `orgId`, `projectName` (`proyecto-vidamed-api`). Usado por la CLI para deploy/local.

### Funciones Serverless (API en Vercel)
- Estructura bajo `api/` mapea 1:1 a rutas HTTP:
  - `chat.ts` → `POST /api/chat`: orquestación IA + herramientas (`getAvailability`, `getAvailableHours`, `scheduleAppointment`, `getStudiesInfo`). Valida env privados (`AWS_BEARER_TOKEN_BEDROCK`, `SUPABASE_*`).
  - `interpretar.ts` → `POST /api/interpretar`: análisis médico basado en resultados guardados (`resultados_pacientes`) usando Bedrock.
  - `generate-blog-post.ts` → `POST /api/generate-blog-post`: generación de contenido para el blog vía IA.
  - `voice/token.ts` → `GET /api/voice/token`: emisión de token para agente de voz (ElevenLabs) sin exponer secreto en cliente.
  - `availability/slots.ts` → `GET /api/availability/slots`: listas de horarios disponibles por fecha y ubicación.
  - `availability/block.ts` → `POST /api/availability/block` y `DELETE /api/availability/block`: bloqueo/desbloqueo administrativo de horarios.
  - `appointments/send-confirmation.ts` → `POST /api/appointments/send-confirmation`: email de confirmación de cita.
  - `reminders/send-next-day.ts` → `GET /api/reminders/send-next-day`: recordatorios masivos de citas del día siguiente (invocado por Cron Vercel).
  - `notify/email.ts` y `notify/whatsapp.ts` → notificaciones (SMTP y WhatsApp Cloud API).
  - `users/index.ts`, `users/[id].ts`, `users/[id]/permissions.ts` → CRUD de usuarios y permisos granulares.
  - `_utils/*`, `bedrock.ts`, `config.ts` → utilidades compartidas para auditoría, permisos, cliente Bedrock y default model.
- `dev.ts` e `index.ts` dentro de `api/` son servidores Express para entorno local (no se despliegan como serverless); Vite proxifica contra `http://127.0.0.1:3001`.

### Flujo de compilación (build)
- Ejecutado por Vercel: `npm ci` → `npm run build`.
- `vite build` compila React + TS, aplica `vite-plugin-pwa` y genera `dist/` con:
  - `index.html` optimizado, `assets/` (JS/CSS con hash), `manifest.webmanifest`, `registerSW.js`, `sw.js`, íconos PWA y archivos estáticos del sitio.
- No hay SSR; es una SPA con fallback a `index.html` por `rewrites`.

### Flujo de despliegue (deploy) en Vercel
- Sitio estático: contenido de `dist/` servido en producción.
- API Serverless: cada archivo `api/**/*.ts` se construye y despliega como función Node.js 20.
- Cron Vercel: ejecuta ruta `GET /api/reminders/send-next-day` de forma programada.
- Variables de entorno:
  - Deben configurarse en Vercel (Project Settings → Environment Variables) para Production/Preview/Development. La app depende de `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AWS_BEARER_TOKEN_BEDROCK`, SMTP/WhatsApp, etc.
- Seguridad de rutas:
  - Endpoints administrativos (`availability/block`, `users/*`) deben validar identidad/rol (se proveen utilidades en `_utils/auth.ts`/`permissions.ts`). No exponer secretos en `VITE_*`.

## Observaciones y recomendaciones técnicas
- Bloqueo de gestor de paquetes: `vercel.json` usa `npm ci` mientras el repo declara `pnpm-workspace.yaml` y `.npmrc` de PNPM. Mantener ambos puede producir diferencias de resolución. Recomendación: unificar (o bien usar PNPM en local y NPM en Vercel con lock sincronizado, o migrar `installCommand` a `pnpm i --frozen-lockfile`).
- `crons` en `vercel.json` incluye un `token` en la URL. Recomendación: mover el secreto a `CRON_SECRET` en env y validar en servidor (p. ej., `req.query.token` contra `process.env.CRON_SECRET`).
- `.env.example` contiene valores reales de ejemplo. Debe reemplazarse por placeholders no válidos para evitar exposición accidental.
- El script `fix-inventory-rls` en `package.json` no ejecuta SQL válido actualmente; limpiar o mover a `scripts/db/*` con control de errores.
- `index.html` usa `importmap` CDN; en build de Vite no se usa CDN, se empaqueta desde dependencias locales. Mantener coherencia entre dev y prod.

