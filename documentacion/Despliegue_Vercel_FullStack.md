# Despliegue Full‑Stack en Vercel (Frontend Vite + Funciones Serverless)

Este documento describe cómo desplegar el proyecto de VidaMed como una solución full‑stack en Vercel: el frontend (Vite/React) y el backend mediante funciones serverless en la ruta `/api/*`. Incluye requisitos, variables de entorno, arquitectura, pasos de despliegue, pruebas y consideraciones de seguridad/fiabilidad.

## Arquitectura
- Frontend: Vite/React, build estático en `dist/`.
- Backend: Funciones serverless en Vercel ubicadas bajo el directorio `api/` en la raíz del repo.
- Endpoints actuales (ya compatibles con serverless):
  - `POST /api/notify/whatsapp` → `api/notify/whatsapp.ts`
  - `POST /api/notify/email` → `api/notify/email.ts`
  - `POST /api/chat` → `api/chat.ts`
  - `GET /api/voice/token` → `api/voice/token.ts`
  - `POST /api/interpretar` → `api/interpretar.ts`

Estos archivos exportan una función por defecto `(req, res)` compatible con el modelo de funciones de Vercel (Node.js). En producción, ya no se levanta un servidor Express completo; cada endpoint se ejecuta de forma aislada.

## Requisitos de entorno
- Node.js runtime en Vercel: usar funciones serverless (Node 18/20). Recomendado: Node 20.
- Variables de entorno (configurarlas en el dashboard de Vercel; no usar `.env` allí). Para desarrollo local, `.env` en `api/` ya está preparado.

### Variables requeridas
Backend (Serverless):
- Supabase
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (clave de servicio, solo backend)
- Gemini
  - `GEMINI_API_KEY`
- ElevenLabs (Voice)
  - `ELEVENLABS_API_KEY`
  - `ELEVENLABS_AGENT_ID` (opcional si se pasa por query)
- WhatsApp Cloud API
  - `WHATSAPP_API_TOKEN`
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_DEFAULT_COUNTRY_CODE` (ej. `58`)
  - `PATIENT_PORTAL_URL` (URL pública del portal)
- SMTP (Email)
  - `SMTP_HOST`
  - `SMTP_PORT` (ej. `465` SSL o `587` STARTTLS)
  - `SMTP_USER`
  - `SMTP_PASS`
  - `EMAIL_FROM` (ej. `VidaMed <no-reply@vidamed.com>`) 
  - `EMAIL_REPLY_TO` (opcional)

Notas:
- Evita usar prefijos `VITE_` para secretos en producción (exponen variables al cliente). Usa las variables sin prefijo en Vercel.
- Mantén las claves de servicio de Supabase exclusivamente en el backend.

## Pasos de Despliegue en Vercel (full‑stack)
1) Importar el repositorio en Vercel.
2) Configurar variables de entorno en el dashboard del proyecto (Production y Preview).
3) Configuración de build del frontend:
   - Vercel detecta Vite automáticamente.
   - Build Command: `npm run build` (en raíz del proyecto).
   - Output Directory: `dist`.
4) Funciones serverless:
   - Vercel mapea automáticamente archivos bajo `api/` a rutas `/api/*`.
   - Recomendado definir runtime en `vercel.json` si quieres fijar Node 20:
     ```json
     {
       "functions": {
         "api/**/*.ts": { "runtime": "nodejs20.x", "memory": 512, "maxDuration": 10 }
       }
     }
     ```
   - El archivo actual `vercel.json` ya permite las rutas `/api/*`; puedes ampliar con la clave `functions` si lo deseas.
5) Deploy: `vercel` o botón de Deploy en el dashboard.

## Desarrollo local
- Frontend: `npm run dev` (Vite). Proxy de desarrollo ya configurado (`/api` → `http://127.0.0.1:3001`).
- Backend (modo server local): `npm run dev` dentro de `api` para pruebas con Express. 
- Alternativa serverless local: `vercel dev` en la raíz para simular funciones `/api/*`. 
  - Recomendado para validar comportamientos específicos de serverless.

## Migración desde Express a Serverless
- Estado actual:
  - Handlers en `api/notify/*`, `api/chat.ts`, `api/voice/token.ts`, `api/interpretar.ts` ya exportan `default (req,res)`.
  - En producción, se usarán directamente como funciones serverless.
- Qué evitar en serverless:
  - `app.listen()` y procesos persistentes.
  - Dependencias que requieran estado global o sockets largos.
- Ajustes recomendados:
  - Asegurar que el frontend consuma rutas `/api/*` relativas (ya implementado en la UI).
  - Mantener la generación de PDF (`pdfkit`) acotada (tiempos de ejecución cortos).
  - Evitar dependencias que obliguen Edge Runtime; usamos Node Runtime por `nodemailer` y `pdfkit`.

## Seguridad y fiabilidad
- Serverless es seguro si:
  - Las credenciales viven en variables de entorno del backend (Vercel) y nunca en el cliente.
  - Se valida entrada (p.ej., `result_id`) y estados (p.ej., interpretación aprobada) como ya lo hace el backend.
- Email en serverless:
  - Muchos proveedores bloquean el puerto 25; usa `465` (SSL) o `587` (STARTTLS) con un proveedor confiable.
  - Alternativa robusta: servicios de email vía API (Resend, SendGrid) para evitar bloqueos SMTP.
- WhatsApp Cloud API:
  - HTTP/HTTPS estándar; es adecuado para serverless.
  - Maneja errores del Graph API como ya está implementado.
- Cold starts y rendimiento:
  - Serverless puede tener *cold starts*. Nuestras funciones son cortas y deberían mantenerse dentro de límites de tiempo.
  - Evita grandes cargas síncronas; PDF generado es ligero.

## Pruebas Post‑Deploy
- WhatsApp: `POST /api/notify/whatsapp` con `{"result_id": <ID>}` y teléfono válido en el paciente.
- Email: `POST /api/notify/email` con `{"result_id": <ID>}` y resultado con interpretación IA `aprobado`.
- Chat IA: `POST /api/chat` con `history` válido.
- Voice: `GET /api/voice/token` con `ELEVENLABS_*` configuradas.

## Mantenimiento
- Logs y observabilidad: Usa los logs de Vercel para cada función (errores y tiempos).
- Seguridad: Rotación periódica de claves (`SMTP_PASS`, `WHATSAPP_API_TOKEN`, etc.).
- Entregabilidad de Email: Configura SPF/DKIM/DMARC en tu dominio.

## Preguntas frecuentes
- ¿Es posible migrar a funciones serverless? Sí. El proyecto ya está estructurado para ello.
- ¿Funcionará perfectamente? Con las variables correctas y pruebas, sí. Considera pruebas de alto volumen si esperas picos.
- ¿Es seguro? Sí, siempre que mantengas secretos en el backend y apliques validaciones y buenas prácticas de envío.

## Errores recientes y cómo se resolvieron
- TS2307 (no encuentra `nodemailer`/`pdfkit`): faltaban paquetes runtime → Instalados `nodemailer`/`pdfkit`.
- TS7016 (faltan definiciones de tipos): faltaban tipos → Instalados `@types/nodemailer` y `@types/pdfkit`.
- TS7006 (parámetros `any` en eventos de `pdfkit`): con `strict` activo hay que tipar → se tipó `chunk: Buffer` y `err: Error` en `notify/email.ts`.

---

Si quieres, puedo ampliar `vercel.json` con `functions` (Node 20, memoria y duración) y añadir una sección de *checklist* previa al deploy (validación de variables, endpoints activos, salud de Supabase y SMTP/WhatsApp). No se aplican cambios de configuración sin tu confirmación.