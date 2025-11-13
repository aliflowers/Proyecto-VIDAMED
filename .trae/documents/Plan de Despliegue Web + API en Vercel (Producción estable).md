## Objetivo
Garantizar que el frontend (Vite) y el backend (funciones serverless en `api/**`) queden desplegados en producción, operen bajo el mismo dominio o subdominio según convenga, y se comuniquen correctamente.

## Diagnóstico del bloqueo
- El error “Function Runtimes must have a valid version (now-php@1.0.0)” proviene de un override de runtime heredado a nivel de proyecto en Vercel (no del repo ni de `vercel.json`). Esto bloquea builds cuando el Root está en la raíz.

## Estrategia general
- Intento preferido: Proyecto único (web + API) con Root vacío y `vercel.json` gobernando funciones. Si el override persiste, separación en dos proyectos (web y api) con CORS y subdominio dedicado para el API.

## Fase 1 — Proyecto Web (Root vacío)
1. Crear un proyecto nuevo en Vercel desde el repo:
- Framework Preset: `Vite`
- Root Directory: campo vacío
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm ci`
- Node.js Version: `20.x`
2. Variables de entorno (web):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE="/api"`
- Importar `.env` con guía tipo `.env.example` y completar valores reales.
3. Functions (Dashboard):
- No definir overrides de runtime; dejar que `vercel.json` maneje funciones `api/**/*.ts`.
4. Deploy y validación:
- Build logs con `vite build` y publicación `dist/`.
- Validar `/` y rutas SPA; si el dashboard muestra código, verificar dominio asignado.
5. Dominio:
- Asignar `proyecto-vidamed.vercel.app` al proyecto web.

## Fase 2 — API en el mismo proyecto (si el override no bloquea)
1. `vercel.json` gobierna funciones:
- `api/**/*.ts` → `runtime: nodejs20.x`
- Cron `/api/reminders/send-next-day?token=...`
- Headers estáticos y rewrite SPA para frontend.
2. Variables de entorno (privadas):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`
- `SMTP_*`, `WHATSAPP_*`, `AWS_*`
- `CRON_SECRET`, `ENABLE_REMINDERS=true`, `PATIENT_PORTAL_URL`
3. Validación:
- Frontend llama `/api/users` con `Authorization` (gating admin → 2xx; no admin → 403; sin token → 401).
- `GET /api/voice/token` responde token (ElevenLabs configurado).
- Cron ejecuta según `schedule` y `CRON_SECRET`.

## Fase 3 — Separación Web + API (si el override persiste)
1. Proyecto API separado:
- Root Directory: `api`
- Build Command: `npm run build` (tsc)
- Node.js Version: `20.x`
- Variables privadas como arriba.
2. Subdominio API:
- Asignar `api.proyecto-vidamed.vercel.app` al proyecto API.
3. Frontend (proyecto web):
- `VITE_API_BASE="https://api.proyecto-vidamed.vercel.app"`
- Re-deploy web.
4. CORS en API:
- Responder `OPTIONS` con `Access-Control-Allow-Origin` (dominio del web), `Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS`, `Access-Control-Allow-Headers: Authorization, Content-Type`.
- Incluir `Access-Control-Allow-Origin` en respuestas principales.
5. Validación end-to-end:
- Frontend ↔ API con `Authorization` funciona sin bloqueos CORS.

## Fase 4 — Verificaciones finales
- PWA: `manifest.webmanifest` y assets están disponibles, headers de cache correctos.
- Rutas SPA internas rinden (rewrite a `/index.html`), `/api/*` no afectadas.
- Voice chat: `GET /api/voice/token` devuelve token; UI “Llamar a un Asistente” funcional.
- Cron: invocar manualmente `GET /api/reminders/send-next-day?dryRun=true&token=...` para verificar.
- Auditoría y permisos: módulos bloqueados/permitidos según overrides; UsersManagementPage opera granularmente.

## Entregables
- Proyecto web activo con dominio principal y frontend en `dist/`.
- API operativa bajo `/api/**` o subdominio `api.` según el escenario.
- Variables de entorno cargadas y probadas.
- Validaciones funcionales y de seguridad (401/403/2xx; CORS si aplica).

¿Confirmas que proceda con la Fase 1 (proyecto web con Root vacío y build Vite) y, si el override aparece otra vez, continúe con la separación Web+API y CORS para dejar todo operativo?