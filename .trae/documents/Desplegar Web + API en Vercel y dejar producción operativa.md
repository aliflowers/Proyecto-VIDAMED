## Objetivo
Lograr un despliegue estable en producción donde el frontend (Vite) y el backend (funciones serverless en `api/**`) estén activos, se comuniquen correctamente y el dominio principal muestre el sitio funcional.

## Causa del bloqueo actual
- El proyecto con Root en la raíz falla con "Function Runtimes must have a valid version (now-php@1.0.0)", que indica un override legacy de runtime a nivel de proyecto en el Dashboard. No proviene del `vercel.json` ni del código.

## Estrategia
1) Crear un proyecto web limpio (Root vacío) y validar build `vite` sin tocar código.
2) Asignar el dominio principal a este proyecto web.
3) Mantener funciones bajo `/api/**` gobernadas por `vercel.json` (runtime `nodejs20.x`) en el mismo proyecto. Si el override persiste, separar en dos proyectos (web + api) y configurar CORS.
4) Verificar comunicación frontend↔backend y variables de entorno.

## Pasos detallados (Proyecto Único preferido)
1. Proyecto Web (Root vacío):
- Framework: Vite
- Build: `npm run build`
- Output: `dist`
- Install: `npm ci`
- Node.js Version: 20.x
- Functions: sin overrides en Dashboard (dejar que `vercel.json` gobierne)
- Domain: mover `proyecto-vidamed.vercel.app` a este proyecto.

2. Variables de entorno (en el mismo proyecto):
- Frontend (públicas): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE="/api"`
- Serverless (privadas): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `SMTP_*`, `WHATSAPP_*`, `AWS_*`, `CRON_SECRET`, `ENABLE_REMINDERS=true`, `PATIENT_PORTAL_URL`

3. Deploy y verificación:
- Build logs deben mostrar `vite build` y publicación de `dist/`
- Frontend: abrir `/` y rutas internas (ej. `/admin/...`)
- Backend: llamar `/api/users` con `Authorization` desde la app (gating admin activo)
- Recordatorios: cron habilitado según `vercel.json` y `CRON_SECRET`

4. Mitigaciones:
- Si el runtime override persiste (y no es editable): crear segundo proyecto API con Root `api`, Build `tsc`. Asignar subdominio `api.<dominio>`, poner `VITE_API_BASE` a ese subdominio y añadir CORS en API (permitir `Authorization, Content-Type`, responder `OPTIONS`).
- Opcional SPA fallback: si alguna ruta interna da 404, añadimos en `vercel.json` una rewrite `{ source: "/(.*)", destination: "/index.html" }` después de la regla `/api/*`.

## Validación final
- Frontend renderiza (no muestra código)
- Funciones `/api/*` operativas (401/403/2xx según gating)
- Cron de recordatorios ejecutando con `CRON_SECRET`
- Voice chat (ElevenLabs) responde `GET /api/voice/token` con token válido

## Entregables
- Proyecto web activo con dominio principal
- Funciones operativas bajo `/api/**`
- Variables de entorno cargadas en Vercel
- Pruebas de conectividad y gating exitosas

¿Confirmas que proceda a crear/desplegar el proyecto web, reasignar el dominio y, si hiciera falta, separar el API como proyecto secundario con CORS, para dejar todo operativo en producción?