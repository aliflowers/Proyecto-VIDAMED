# Plan de Serverless en Vercel — Inventario, Hallazgos y Acciones

## 1) Resumen ejecutivo
- Objetivo: desplegar el 100% de funciones y módulos como funciones serverless en Vercel, sin servidores Express dedicados.
- Estado actual: varias funciones ya están en `api/` (chat, interpretar, notificaciones, voice, blog), pero faltan funciones clave que hoy existen solo en el servidor Express de desarrollo/producción (`api/dev.ts` y `api/index.ts`).
- Brechas detectadas: disponibilidad de horarios, bloqueo/desbloqueo de horarios, confirmación de citas, y gestión de usuarios/roles/permisos no están exportadas como funciones serverless.
- Acción propuesta: crear funciones serverless dedicadas para cada endpoint faltante, estandarizar el acceso a Supabase Admin, validar encabezados `x-user-id`/`x-user-email`, y configurar `vercel.json` para cron, memoria y timeouts.

## 2) Inventario de funciones serverless existentes (ya en `api/`)
- `api/chat.ts` — Chat de IA (VidaBot) con Bedrock + Supabase.
- `api/interpretar.ts` — Interpretación de análisis con IA + Supabase.
- `api/notify/email.ts` — Envío de emails con resultados (usa `nodemailer`, genera PDFs con `pdfkit`).
- `api/notify/whatsapp.ts` — Notificaciones de resultados por WhatsApp.
- `api/voice/token.ts` — Token de conversación de ElevenLabs para voz.
- `api/generate-blog-post.ts` — Generación de contenido para blog con Bedrock.

Observación: `api/notify/appointment-email.ts` contiene utilidades (`sendAppointmentConfirmationEmail`, `sendAppointmentReminderEmail`) pero NO exporta un handler `(req, res)`. Se debe envolver en una función serverless propia.

## 3) Endpoints faltantes a convertir en funciones serverless
Estos endpoints son consumidos por el frontend y hoy viven solo en los servidores Express (`api/dev.ts`/`api/index.ts`).

- Disponibilidad de horarios
  - `GET /api/availability/slots` — Obtiene slots/horarios disponibles.
  - `POST /api/availability/block` — Bloquea un horario/slot.
  - `DELETE /api/availability/block` — Desbloquea un horario/slot.
  - Archivos propuestos:
    - `api/availability/slots.ts`
    - `api/availability/block.ts`

- Confirmación de citas
  - `POST /api/appointments/send-confirmation` — Envía email de confirmación al paciente (adjunta o referencia detalles de la cita).
  - Archivo propuesto:
    - `api/appointments/send-confirmation.ts` (envolver y reutilizar funciones de `api/notify/appointment-email.ts`).

- Gestión de usuarios y permisos (vía Supabase Admin)
  - `GET /api/users` — Listar usuarios.
  - `POST /api/users` — Crear usuario.
  - `PUT /api/users/:id` — Actualizar usuario.
  - `DELETE /api/users/:id` — Eliminar usuario.
  - `GET /api/users/:id/permissions` — Obtener permisos granulares.
  - `PUT /api/users/:id/permissions` — Actualizar permisos granulares.
  - Archivos propuestos (rutas dinámicas en Vercel):
    - `api/users/index.ts` (GET, POST)
    - `api/users/[id].ts` (PUT, DELETE)
    - `api/users/[id]/permissions.ts` (GET, PUT)

- Recordatorios programados (cron)
  - `POST /api/reminders/send-next-day` — Enviar recordatorios de citas del día siguiente.
  - Archivo propuesto:
    - `api/reminders/send-next-day.ts` (reubicar/convertir la lógica existente de `api/index.ts`).

## 4) Módulos y dependencias backend — Mapa funcional
- Citas y disponibilidad
  - Frontend: `SchedulingPage.tsx`, `AppointmentsAdminPage.tsx` consumen `/api/availability/*` y `/api/appointments/send-confirmation`.
  - Backend: lógica en Express (dev/prod) y utilidades en `notify/appointment-email.ts`.
- Resultados y notificaciones
  - Frontend: `ResultsPage.tsx`, `ResultsTable.tsx` llaman `/api/interpretar`, `/api/notify/email`, `/api/notify/whatsapp`.
  - Backend: funciones serverless ya presentes.
- Chat/voz
  - Frontend: `src/hooks/useChat.ts` → `/api/chat`; `VoiceChat.tsx` → `/api/voice/token`.
  - Backend: funciones serverless ya presentes (chat, voice).
- Gestión de usuarios, roles y permisos
  - Frontend: `UsersManagementPage.tsx` vía `apiFetch` con encabezados `x-user-id`/`x-user-email`.
  - Backend: endpoints aún no exportados como funciones serverless.

## 5) Variables de entorno requeridas (Vercel Project → Settings → Environment Variables)
- Supabase
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY` (para cliente web si se usa)
  - `SUPABASE_SERVICE_ROLE_KEY` (solo en serverless, nunca exponer al cliente)
- Correos (nodemailer)
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
  - `EMAIL_FROM`, `EMAIL_REPLY_TO`
- WhatsApp
  - `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- IA (Bedrock / AWS)
  - `AWS_BEARER_TOKEN_BEDROCK` (o credenciales compatibles con la lib usada)
- Voz (ElevenLabs)
  - `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`
- Otros
  - `PATIENT_PORTAL_URL` (si se incluye en mensajes/links)
  - Cualquier clave de auditoría o URL estática usada en plantillas de email.

## 6) Configuración de Vercel (`vercel.json`) — propuesta
- Rutas y funciones: Vercel detecta `api/*.ts` automáticamente.
- Cron (UTC):
```json
{
  "crons": [
    { "path": "/api/reminders/send-next-day", "schedule": "0 22 * * *" }
  ],
  "functions": {
    "api/**.ts": { "maxDuration": 30, "memory": 512 }
  }
}
```
- Ajustar `schedule` según la zona horaria deseada. `maxDuration` y `memory` pueden variarse por endpoint si alguno requiere más recursos (por ejemplo, `chat`, `interpretar` o `generate-blog-post`).

## 7) Seguridad y validaciones
- Encabezados de identidad: los endpoints internos deben validar `x-user-id` y `x-user-email` (enviados por `apiFetch.ts`) y comprobar permisos con Supabase Admin.
- Principle of least privilege: usar `SUPABASE_SERVICE_ROLE_KEY` solo en funciones serverless y nunca en el frontend.
- Input validation: validar body/query con `zod` o esquema equivalente en cada función.
- Auditoría: reutilizar/centralizar `logAudit` del lado serverless para todas las acciones sensibles.
- Rate limiting (recomendado): aplicar rate limit a `chat`, `generate-blog-post`, y endpoints de disponibilidad si se espera alto tráfico.

## 8) Plan de acción (detallado y ordenado)
1. Crear funciones serverless faltantes:
   - `api/availability/slots.ts`
   - `api/availability/block.ts`
   - `api/appointments/send-confirmation.ts` (usando `sendAppointmentConfirmationEmail`)
   - `api/users/index.ts`, `api/users/[id].ts`, `api/users/[id]/permissions.ts`
   - `api/reminders/send-next-day.ts`
2. Extraer/centralizar cliente Supabase Admin en `api/_utils/supabaseAdmin.ts` para evitar duplicación.
3. Implementar validación de encabezados y permisos en funciones de usuarios y disponibilidad.
4. Configurar `vercel.json` con `crons` y `functions` (memoria/timeout).
5. Revisar variables de entorno en Vercel y crear las faltantes.
6. Pruebas de integración:
   - Frontend → `/api/availability/slots` y `/api/availability/block` (alta/edición/bloqueos).
   - Flujo de confirmación de citas → `/api/appointments/send-confirmation`.
   - Gestión de usuarios/roles/permisos desde `UsersManagementPage.tsx`.
   - Chat, interpretar, voice token, notificaciones.
7. Observabilidad: confirmar logs de auditoría y errores en Vercel (Logs, Monitoring).

## 9) Errores/Gaps detectados y cómo resolverlos
- Falta de funciones serverless para disponibilidad y bloqueo de horarios.
  - Causa: estas rutas solo existen en servidores Express (`api/dev.ts`/`api/index.ts`).
  - Solución: crear `api/availability/slots.ts` y `api/availability/block.ts` con la misma lógica, usando Supabase y audit.
- Falta de función serverless para enviar confirmación de citas.
  - Causa: el frontend llama a `/api/appointments/send-confirmation`, pero no existe un handler serverless; solo utilidades en `notify/appointment-email.ts`.
  - Solución: crear `api/appointments/send-confirmation.ts` que reciba `{ appointmentId | patientId | email }` y delegue a `sendAppointmentConfirmationEmail`.
- Gestión de usuarios/permisos no disponible como serverless.
  - Causa: rutas presentes en el servidor Express de dev, no expuestas en `api/`.
  - Solución: crear las funciones dinámicas `api/users/*`, validar permisos y auditar.
- Recordatorios diarios no configurados.
  - Causa: lógica en `api/index.ts` sin cron en Vercel.
  - Solución: `api/reminders/send-next-day.ts` + cron en `vercel.json`.

## 10) Anexo — Estructura de archivos a crear
```
api/
  availability/
    slots.ts
    block.ts
  appointments/
    send-confirmation.ts
  users/
    index.ts
    [id].ts
    [id]/permissions.ts
  reminders/
    send-next-day.ts
api/_utils/
  supabaseAdmin.ts
  audit.ts (opcional si queremos centralizar logAudit)
vercel.json
```

## 11) Notas de implementación
- Reutilizar tipos y lógica de `api/dev.ts`/`api/index.ts` para mantener consistencia.
- Mantener las respuestas JSON y códigos HTTP para no romper el frontend.
- Asegurar que todas las nuevas funciones lean `x-user-id`/`x-user-email` y verifiquen permisos.
- No iniciar servidores manualmente en Vercel; solo funciones serverless.

---

Este documento sirve como guía de implementación y checklist para completar la migración a funciones serverless en Vercel, cubriendo el 100% de los módulos y funcionalidades del proyecto.