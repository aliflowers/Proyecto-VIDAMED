## Objetivo
- Reducir el conteo de funciones serverless por debajo de 12 sin romper el frontend ni la UI.
- Mantener `api/index.ts` como entrada única que enruta vía Express.
- Renombrar archivos bajo `api/` con prefijo `_` para que Vercel los ignore, conforme documentación.

## Criterios
- Categoría A (Endpoints reales): permanecen en `api/` sin renombrar.
- Categoría B (Utilidades/duplicados de rutas ya servidas por `api/index.ts`): renombrar con `_` y actualizar imports.

## Inventario y Clasificación
- Mantener:
  - `api/index.ts` (router Express principal)
  - `api/notify/email.ts` (endpoint POST `/api/notify/email`)
  - `api/voice/token.ts` (endpoint GET `/api/voice/token`)
  - `api/users/index.ts`, `api/users/[id].ts`, `api/users/[id]/permissions.ts` (endpoints de usuarios)
- Renombrar (ya servidos por `api/index.ts` o utilidades):
  - `api/chat.ts` → `api/_chat.ts`
  - `api/interpretar.ts` → `api/_interpretar.ts`
  - `api/generate-blog-post.ts` → `api/_generate-blog-post.ts`
  - `api/availability/slots.ts` → `api/availability/_slots.ts`
  - `api/availability/block.ts` → `api/availability/_block.ts`
  - `api/appointments/send-confirmation.ts` → `api/appointments/_send-confirmation.ts`
  - `api/reminders/send-next-day.ts` → `api/reminders/_send-next-day.ts`
  - `api/notify/whatsapp.ts` (ya deshabilitado como `.ts.disabled`) → sin cambios
  - `api/notify/appointment-email.ts` → `api/notify/_appointment-email.ts` (actualizar imports)

## Cambios detallados
- Renombrar archivos con `git mv` para preservar historial.
- Actualizar imports en:
  - `api/index.ts`: cambiar `import { sendAppointmentConfirmationEmail, sendAppointmentReminderEmail } from './notify/appointment-email.js'` a `import { sendAppointmentConfirmationEmail, sendAppointmentReminderEmail } from './notify/_appointment-email.js'`.
  - `api/dev.ts`: cambiar `import { sendAppointmentConfirmationEmail } from './notify/appointment-email.js'` a `import { sendAppointmentConfirmationEmail } from './notify/_appointment-email.js'`.
  - `api/dev.ts`: eliminar o proteger la importación de `./notify/whatsapp.js` y registrar un stub 501 para `/api/notify/whatsapp` (igual que en `api/index.ts`).

## Verificación técnica
- Conteo:
  - Buscar endpoints activos: `grep -n "export default" api/**/*.ts` y confirmar ≤12.
- Tipos:
  - Ejecutar `npx tsc --noEmit` desde la raíz y corregir TS2307/TS6133 que aparezcan.
- Pruebas de rutas (sin levantar servidores automáticamente):
  - Confirmar que las rutas servidas por `api/index.ts` existen: `/api/chat`, `/api/interpretar`, `/api/generate-blog-post`, `/api/availability/slots`, `/api/availability/block`, `/api/appointments/send-confirmation`, `/api/notify/email`.
- Despliegue:
  - Verificar logs de Vercel para confirmar que no se excede el límite de 12.

## Comandos a ejecutar
- Renombrados:
  - `git mv api/chat.ts api/_chat.ts`
  - `git mv api/interpretar.ts api/_interpretar.ts`
  - `git mv api/generate-blog-post.ts api/_generate-blog-post.ts`
  - `git mv api/availability/slots.ts api/availability/_slots.ts`
  - `git mv api/availability/block.ts api/availability/_block.ts`
  - `git mv api/appointments/send-confirmation.ts api/appointments/_send-confirmation.ts`
  - `git mv api/reminders/send-next-day.ts api/reminders/_send-next-day.ts`
  - `git mv api/notify/appointment-email.ts api/notify/_appointment-email.ts`
- Verificación:
  - `npx tsc --noEmit`

## Riesgos y Mitigación
- Riesgo: imports rotos tras renombrar. Mitigación: actualizar rutas en `api/index.ts` y `api/dev.ts` y ejecutar `npx tsc`.
- Riesgo: rutas duplicadas. Mitigación: mantener únicamente `api/index.ts` como router para esas rutas, renombrar los duplicados.
- Riesgo: límite no disminuye. Mitigación: confirmar conteo con `grep` y, si es necesario, renombrar adicionales hasta ≤12.

## Explicación del error y solución
- Causa: Vercel cuenta una función por cada archivo `.ts` en `api/`; había 14, excediendo el límite de 12 del plan Hobby.
- Solución: reducir el número de archivos detectados renombrando los no necesarios con `_` (ignorados por Vercel) y centralizar rutas en `api/index.ts`.

## Entregables
- Renombrados aplicados y imports actualizados.
- Verificación `npx tsc --noEmit` sin errores.
- Listado de endpoints activos final (≤12).

¿Confirmas que proceda con esta implementación y verificación?