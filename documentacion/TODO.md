# Plan de Migración a Arquitectura Híbrida (Vercel Serverless + Supabase Edge) y Setup de Desarrollo

Este documento guía los pasos a implementar para que todos los servicios funcionen perfectamente en desarrollo y preparar la arquitectura de producción.

## Objetivos

- Reemplazar el servidor Express actual por funciones serverless.
- IA (Gemini) en Vercel (Node) para máxima compatibilidad.
- Operaciones de Base de Datos (RPC/consultas/insert/update) en Supabase Edge Functions (Deno) para baja latencia y seguridad (service_role solo en Supabase).
- ElevenLabs en Vercel (Node) con endpoints /api/voice/* para ocultar API keys y soportar WebRTC/WS.
- Dejar el entorno de desarrollo listo: Vite (frontend) + Vercel dev (API) + opcional Edge Functions local.

---

## Pasos Técnicos (Ejecución)

1) Endpoints serverless en Vercel
- [ ] Crear /api/chat.ts: portar la lógica de /api/index.ts (IA Gemini + orquestación). En desarrollo usará variables de entorno (GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
- [ ] Crear /api/voice/token.ts: obtiene conversation token de ElevenLabs vía `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=...` con header `xi-api-key`.
- [ ] (Opcional) /api/voice/synthesize.ts u otros según se necesiten (TTS/ASR).

2) Ajustes frontend para desarrollo
- [ ] Ajustar vite.config.ts:
  - En modo development: proxy `'/api'` → `http://localhost:3000` (vercel dev).
  - Remover/condicionar HMR wss de ngrok para evitar conflictos.
- [ ] Corregir components/VoiceChat.tsx:
  - No usar `VITE_ELEVENLABS_AGENT_ID` en el cliente; mantener `ELEVENLABS_AGENT_ID` privado en backend.
  - Obtener `conversationToken` desde `/api/voice/token` y pasar a `startSession({ connectionType: 'webrtc' })`.

3) Supabase Edge Functions (plantillas)
- [ ] Crear funciones:
  - `search_studies`: busca estudios (RPC o SELECT afinado).
  - `check_availability`: valida fecha disponible/ocupada.
  - `schedule_appointment`: crea cita e inserta paciente si falta.
- [ ] Inicialmente, `api/chat.ts` puede seguir llamando directamente a Supabase con `service_role` para mantener desarrollo funcional. Posteriormente, se moverá la lógica a Edge y `chat.ts` invocará las Edge por HTTP.

4) Limpieza/compatibilidad
- [ ] Mantener `api/index.ts` como respaldo temporal (no usado por Vercel) hasta finalizar migración. Luego renombrar a `_legacy_express.ts` o eliminar bajo aprobación.
- [ ] Documentar variables de entorno y comandos de desarrollo.

---

## Variables de Entorno (Desarrollo)

Frontend (.env):
- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_ANON_KEY=...`
- (No declares variables de ElevenLabs en el cliente; usa `/api/voice/token`)

Vercel dev (crear `.env` o configurar con `vercel env`):
- `GEMINI_API_KEY=...`
- `ELEVENLABS_API_KEY=...`
- (Temporalmente en dev) `SUPABASE_URL=...`
- (Temporalmente en dev) `SUPABASE_SERVICE_ROLE_KEY=...`

Supabase local (solo si sirves Edge en local):
- `SUPABASE_SERVICE_ROLE_KEY=...`

---

## Variables de Entorno (Notificaciones)

WhatsApp (Meta Cloud API):
- `WHATSAPP_API_TOKEN=...` Token de acceso de la app (Bearer).
- `WHATSAPP_PHONE_NUMBER_ID=...` ID del número de WhatsApp Business.
- `WHATSAPP_DEFAULT_COUNTRY_CODE=58` (opcional) Código país para normalizar teléfonos sin prefijo.
- `PATIENT_PORTAL_URL=https://vidamed.example.com/portal` (opcional) URL del portal de pacientes para incluir en el mensaje.

Email (SMTP):
- `SMTP_HOST=...` Host del servidor SMTP.
- `SMTP_PORT=465` Puerto (465 para SSL, 587 para STARTTLS).
- `SMTP_USER=...` Usuario de autenticación SMTP.
- `SMTP_PASS=...` Password de autenticación SMTP.
- `EMAIL_FROM="VidaMed <no-reply@vidamed.com>"` Remitente mostrado (opcional).
- `EMAIL_REPLY_TO=support@vidamed.com` Dirección de respuesta (opcional).

Notas:
- Las rutas de desarrollo del backend usan Express en `http://127.0.0.1:3001` (proxy Vite `/api`).
- El backend lee variables tanto con nombre directo como con prefijo `VITE_` o `PRIVATE_` para flexibilidad en dev.
- El envío de email requiere que `analisis_estado` sea `'aprobado'`; si no, el backend responde con `INTERPRETATION_NOT_APPROVED`.
- Si el paciente no tiene email, la API responde `NO_EMAIL`. Para WhatsApp, si no hay teléfono, responde `NO_PHONE`.

---

## Modo Desarrollo (Comandos)

- Terminal 1 (frontend): `pnpm dev` → http://localhost:5173
- Terminal 2 (API serverless): `vercel dev` → http://localhost:3000
- Terminal 3 (opcional funciones Edge locales): `supabase functions serve` → http://127.0.0.1:54321/functions/v1/<name>

Flujo:
- Frontend → `/api/chat` (Vercel dev) → Gemini
- Frontend → `/api/voice/token` (Vercel dev) → ElevenLabs token
- `chat.ts` (Vercel) → (temporal) Supabase con service_role → BD
- Posteriormente: `chat.ts` → Supabase Edge Functions → BD

---

## Pruebas: Alcance y Lista

A. Web pública
- [ ] Rutas: Home, Studies (?q=), Scheduling, PatientPortal, Blog, Post, About, Contact, Terms, Privacy.
- [ ] Componentes: Header/Footer, ChatWidget, carruseles Embla (autoplay), lazy-load de imágenes.

B. Panel Admin
- [ ] Login + ProtectedRoute, AdminLayout.
- [ ] Módulos: Dashboard, Studies, Posts, Testimonials, Appointments, Patients, PatientDetail, Statistics, SiteConfig.
- [ ] Formularios, uploads, modales, conteos (StatisticsContext).

C. Backend / API
- [ ] `/api/chat` (Vercel): happy/error/edge-cases; intención CONSULTA_ESTUDIO / AGENDAR_CITA / SALUDO / DESCONOCIDO.
- [ ] `/api/voice/token` (Vercel): token retrieval, errores, latencia.
- [ ] (Luego) Edge Functions: permisos RLS, RPCs, validación de parámetros, errores.

D. PWA
- [ ] Manifest, offline básico, autoUpdate, instalación.

E. Rendimiento
- [ ] Code-splitting (lazy routes), LCP/CLS, paginación y `select` de columnas específicas.
- [ ] Cache (opcional TanStack Query).

---

## Checklist de Verificación (Dev listo)

- [ ] Vite proxy a `http://localhost:3000` y sin conflictos de HMR.
- [ ] `/api/chat` responde y ChatWidget funciona end-to-end.
- [ ] `/api/voice/token` emite token y `VoiceChat` conecta con agente (webrtc).
- [ ] Conexión a Supabase operativa (cuentas, tablas, RPC).

---

## Notas y Riesgos

- El SDK `@google/generative-ai` en Deno (Edge) puede requerir wrappers; por eso IA se mantiene en Vercel (Node).
- Evitar exponer `SUPABASE_SERVICE_ROLE_KEY` en Vercel en producción. En dev se permite temporalmente para acelerar el flujo; luego se moverá al 100% a Edge.

---

## Estado de Ejecución

- [ ] Crear endpoints /api/chat.ts y /api/voice/token.ts
- [ ] Ajustar vite.config.ts (proxy dev + HMR)
- [ ] Corregir components/VoiceChat.tsx (import.meta.env + token)
- [ ] Plantillas Edge Functions
- [ ] Pruebas de critical-path
- [ ] Migración de lógica de BD a Edge Functions
