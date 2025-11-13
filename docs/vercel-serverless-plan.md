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
  - `GET/POST /api/reminders/send-next-day` — Enviar recordatorios de citas del día siguiente.
  - Notas:
    - El cron de Vercel invoca `GET` al `path`; por eso el handler acepta `GET` además de `POST`.
    - La ruta valida opcionalmente `CRON_SECRET` vía query `?token=...` y soporta `dryRun=true` y `limit=N` para pruebas.
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
  - Opcional: `SUPABASE_SERVICE_ROLE` (alias soportado por algunas funciones)
- Correos (nodemailer)
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
  - `EMAIL_FROM`, `EMAIL_REPLY_TO`
- WhatsApp
  - `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_DEFAULT_COUNTRY_CODE` (ej. `58`)
- IA (Bedrock / AWS)
  - `AWS_BEARER_TOKEN_BEDROCK` (o credenciales compatibles con la lib usada)
- Voz (ElevenLabs)
  - `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`
- Otros
  - `PATIENT_PORTAL_URL` (si se incluye en mensajes/links)
  - Cualquier clave de auditoría o URL estática usada en plantillas de email.
  - Recordatorios (cron y gating):
    - `CRON_SECRET` (secreto para proteger el path del cron; se pasa vía query)
    - `ENABLE_REMINDERS` (`true`/`false` para activar/desactivar el envío en producción) ejemplo: ENABLE_REMINDERS=true

## 6) Configuración de Vercel (`vercel.json`) — propuesta
- Rutas y funciones: Vercel detecta `api/*.ts` automáticamente.
- Cron (UTC):
```json
{
  "crons": [
    { "path": "/api/reminders/send-next-day?token=${CRON_SECRET}", "schedule": "0 16 * * *" }
  ],
  "functions": {
    "api/**.ts": { "maxDuration": 30, "memory": 512 }
  }
}
```
- Ajustar `schedule` según la zona horaria deseada. El ejemplo `0 16 * * *` dispara a las 16:00 UTC (12:00 PM Caracas, UTC−4). `maxDuration` y `memory` pueden variarse por endpoint si alguno requiere más recursos (por ejemplo, `chat`, `interpretar` o `generate-blog-post`).

### Notas sobre el cron y el handler de recordatorios
- El cron ejecuta siempre a la hora programada, exista o no exista una cita. El handler consulta citas de "mañana" y si no hay, simplemente devuelve `count: 0` sin enviar notificaciones.
- Seguridad: el `path` incluye `?token=${CRON_SECRET}` y el handler valida el token.
- Pruebas: se puede invocar manualmente con:
  - `GET /api/reminders/send-next-day?dryRun=true&token=${CRON_SECRET}` — No envía, solo simula y retorna conteo.
  - `GET /api/reminders/send-next-day?limit=3&token=${CRON_SECRET}` — Envía a los primeros 3 (si hay), útil en staging.

## 7) Seguridad y validaciones
- Encabezados de identidad: los endpoints internos deben validar `x-user-id` y `x-user-email` (enviados por `apiFetch.ts`) y comprobar permisos con Supabase Admin.
- Principle of least privilege: usar `SUPABASE_SERVICE_ROLE_KEY` solo en funciones serverless y nunca en el frontend.
- Input validation: validar body/query con `zod` o esquema equivalente en cada función.
- Auditoría: reutilizar/centralizar `logAudit` del lado serverless para todas las acciones sensibles.
- Rate limiting (recomendado): aplicar rate limit a `chat`, `generate-blog-post`, y endpoints de disponibilidad si se espera alto tráfico.
 - Recordatorios: el handler `send-next-day` incluye gating por entorno: sólo envía en `VERCEL_ENV=production` cuando `ENABLE_REMINDERS=true`. En `dryRun=true` simula sin enviar.

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
  - Solución: `api/reminders/send-next-day.ts` acepta `GET/POST`, valida `CRON_SECRET`, soporta `dryRun` y `limit`. Configurar cron en `vercel.json` (ej. `0 16 * * *` para 12:00 Caracas) y variables `ENABLE_REMINDERS=true` en producción.

## 12) Operativa de Recordatorios — Diseño y Flujo
- Objetivo: enviar recordatorios un día antes de cada cita a las 12:00 PM (hora Caracas).
- Estrategia: configurar un cron diario a las 12:00 PM Caracas (16:00 UTC). El handler filtra automáticamente las citas de "mañana" y envía notificaciones por email y WhatsApp a quienes tengan datos válidos.
- Comportamiento sin citas reales: el cron se ejecuta igual, pero el handler retorna `ok: true, count: 0`; no hay envíos.
- Activación controlada:
  - Producción: `VERCEL_ENV=production` (automático) y `ENABLE_REMINDERS=true`.
  - Pruebas: usar `dryRun=true` y/o `limit=N`.
- Mejoras opcionales (no implementadas):
  - Orquestación por evento al crear una cita (programar un mensaje futuro por cita) usando un servicio de colas/scheduler (p.ej. QStash). El enfoque actual (cron diario) es más simple y suficiente para el requerimiento.

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

## 13) Checklist de Preparación para Producción

Use esta lista como verificación previa al despliegue final. Se recomienda marcar cada ítem y guardar evidencias (capturas, logs) en el repositorio o en la plataforma de despliegue.

- Repositorio y CI/CD
  - [ ] Proyecto conectado a GitHub y Vercel con despliegues automáticos en PR (preview) y en main (production).
  - [ ] Reglas de protección de ramas configuradas (revisión obligatoria, status checks, bloqueo de force-push).
  - [ ] Pipeline genera builds sin errores (preview y production).

- Entorno y variables
  - [ ] `ENABLE_REMINDERS=true` en Production (gating de recordatorios).
  - [ ] `CRON_SECRET` configurado en Production y coincidencia exacta con el token usado en `vercel.json`.
  - [ ] Credenciales Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (solo server), `SUPABASE_ANON_KEY` (si aplica).
  - [ ] SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `EMAIL_REPLY_TO`.
  - [ ] WhatsApp: `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_DEFAULT_COUNTRY_CODE`.
  - [ ] IA/Voz: `AWS_BEARER_TOKEN_BEDROCK`, `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`.
  - [ ] `PATIENT_PORTAL_URL` y cualquier URL/clave requerida por plantillas.

- Endpoints serverless (presencia y salud)
  - [ ] Disponibilidad: `api/availability/slots.ts`, `api/availability/block.ts` responden correctamente.
  - [ ] Citas: `api/appointments/send-confirmation.ts` envía correos de confirmación.
  - [ ] Recordatorios: `api/reminders/send-next-day.ts` acepta `GET/POST`, valida `token`, soporta `dryRun` y `limit`.
  - [ ] Notificaciones: `api/notify/email.ts`, `api/notify/whatsapp.ts` operativas.
  - [ ] Chat/IA: `api/chat.ts` estable y con credenciales válidas.
  - [ ] Interpretación: `api/interpretar.ts` estable.
  - [ ] Voz: `api/voice/token.ts` estable.
  - [ ] Usuarios: `api/users/index.ts`, `api/users/[id].ts`, `api/users/[id]/permissions.ts` con validación de permisos.

- Base de datos (Supabase)
  - [ ] Migraciones actualizadas y aplicadas (sin drift).
  - [ ] Políticas RLS revisadas en tablas sensibles (`citas`, `pacientes`, disponibilidad, resultados, etc.).
  - [ ] Clave service role usada solo del lado serverless; nunca en frontend.
  - [ ] Índices y rendimiento revisados para consultas críticas (slots, citas, recordatorios).

- Cron y recordatorios
  - [ ] `vercel.json` contiene el bloque `crons` con `schedule: "0 16 * * *"` (12:00 PM Caracas) y `path` con token literal.
  - [ ] Prueba `dryRun`: `GET /api/reminders/send-next-day?dryRun=true&token=...` retorna `count` esperado sin enviar.
  - [ ] Prueba limitada: `limit=N` validada con envíos reales en entorno controlado.
  - [ ] Nota: Vercel no expande variables de entorno dentro de `vercel.json`. Si se desea usar token en el path del cron, debe ser un valor literal, y el mismo valor debe existir en `CRON_SECRET` de Production.

- Notificaciones (Correo y WhatsApp)
  - [ ] SMTP probado con confirmación y recordatorio (plantillas correctas, remitentes válidos).
  - [ ] WhatsApp probado con mensajes reales (formato internacional correcto, código de país por defecto).
  - [ ] Manejo de errores/logs visibles en Vercel (incluye conteo de envíos y auditoría).

- Observabilidad y auditoría
  - [ ] `logAudit` usado en operaciones sensibles; auditoría almacena `actor`, `acción`, `resultado`.
  - [ ] Monitoreo de funciones en Vercel (Logs, Monitoring) sin errores recurrentes.
  - [ ] Alertas operativas definidas (opcional) para fallos en recordatorios.

- Rendimiento y configuración
  - [ ] `runtime`, `memory` y `maxDuration` adecuados en `vercel.json` (p.ej. `nodejs20.x`, 512–1024 MB, 30s; elevar en funciones pesadas si es necesario).
  - [ ] Respuestas HTTP y formatos JSON consistentes con el frontend.

- Frontend y UX
  - [ ] Flujo de agendamiento (`SchedulingPage.tsx`) probado end-to-end.
  - [ ] Portal del paciente y páginas principales sin errores.
  - [ ] Assets, caché y headers estáticos correctos.

- Pruebas y calidad
  - [ ] Casos manuales críticos ejecutados: agendar, confirmar, consultar disponibilidad, enviar recordatorios, notificar resultados.
  - [ ] Comportamiento sin citas para “mañana” probado: handler retorna `count: 0`.

- Seguridad y cumplimiento
  - [ ] Secretos no expuestos en el frontend ni en commits públicos (salvo la decisión consciente de incluir el token en `vercel.json`).
  - [ ] Aplicación de “principle of least privilege” y validación de permisos en endpoints.
  - [ ] Revisar CSP/headers de seguridad (opcional) y sanitización de inputs.

- SEO y PWA
  - [ ] `manifest.webmanifest` y `favicon` con caché adecuada.
  - [ ] Meta tags y sitemap/robots (si aplica).

## 14) FAQ — Cambios en Producción con GitHub

Pregunta: ¿Si ya estando en producción quiero hacer nuevas modificaciones como por ejemplo robustecer la seguridad de la aplicación web, es posible hacerlo ya estando en producción con el proyecto conectado a GitHub?

Respuesta corta: Sí. Con GitHub + Vercel, puedes iterar en ramas, obtener despliegues preview automáticos, validar cambios (incluyendo seguridad), y luego fusionar a `main` para actualizar producción sin downtime en la mayoría de los casos.

Flujo recomendado:
- Crear una rama de feature (p.ej. `feature/seguridad-csp-rate-limit`).
- Implementar cambios de seguridad (headers, validaciones, rate limiting, ajustes de permisos) y abrir un Pull Request.
- Vercel desplegará automáticamente un entorno preview para esa rama. Validar allí los cambios.
- Si los cambios requieren nuevas variables de entorno, configúralas en Vercel (Preview/Production) antes de fusionar.
- Si hay migraciones de base de datos, usa el flujo de migraciones de Supabase (CLI) y considera migraciones reversibles. En producción, planifica ventanas si hay riesgo.
- Una vez aprobada la PR, fusiona a `main`: Vercel desplegará a producción. Monitorea logs y métricas.
- Si algo falla, puedes revertir el commit o usar el rollback de Vercel al despliegue anterior.

Notas y buenas prácticas:
- Evita incluir secretos en el repositorio. Para el cron con token en `vercel.json`, entiende el trade-off: Vercel no expande variables en `vercel.json`, por lo que el token en el `path` debe ser literal. Puedes mitigar el riesgo manteniendo el repo privado, rotando `CRON_SECRET` periódicamente, y validando además el gating por entorno (`ENABLE_REMINDERS`).
- Usa gating de características: no habilites nuevas funciones sin las variables/flags correctas en producción.
- Introduce cambios de seguridad gradualmente y con monitorización (p.ej. activar CSP en modo report-only primero).
- Mantén reglas de protección en `main` y require status checks antes de desplegar.