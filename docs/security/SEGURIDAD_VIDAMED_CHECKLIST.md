# Informe Técnico de Seguridad VIDAMED — Checklist de Endurecimiento

> Actualizado: 2025-11-11
> Estado general: endurecimiento pendiente; no se han aplicado parches aún.

## Cómo usar este checklist
- Marca cada ítem con `[x]` cuando se complete y describe brevemente el cambio (commit, PR, fecha).
- Prioriza primero los riesgos críticos (XSS, endpoints sin autenticación, CORS permisivo, headers de seguridad).
- Mantén evidencia: enlace a PR, captura, pruebas ejecutadas.

---

## Resumen ejecutivo
- Riesgos críticos identificados:
  - XSS en blog público por render de HTML crudo (`ReactMarkdown` + `rehypeRaw`) en `src/pages/PostPage.tsx`.
  - Manipulación directa del DOM con `innerHTML` para impresión en `src/components/admin/ResultViewer.tsx`.
  - Endpoints sensibles públicos o sin verificación de rol: `/api/interpretar`, `/api/notify/*`, `/api/generate-blog-post`, `/api/appointments/send-confirmation`, `/api/chat`, `/api/voice/token`.
  - CORS permisivo y ausencia de headers de seguridad HTTP en `api/index.ts`.
- Riesgos medios:
  - Enlaces y contenido del chat sin sanitización/validación robusta (`src/components/ChatWidget.tsx`).
  - Auditoría con metadatos potencialmente sensibles sin límite ni normalización (`src/services/audit.ts`, `api/_utils/audit.ts`).

---

## Vulnerabilidades y causas (diagnóstico)
- XSS almacenado/reflejado: permitir HTML crudo vía `rehypeRaw` y render sin sanitización facilita inyección de `<script>`, eventos y URLs maliciosas.
- DOM clobbering/HTML injection: uso de `document.body.innerHTML` para flujos de impresión puede ejecutar HTML no confiable.
- Exposición de endpoints: falta de middleware de autenticación/autorización (admin) y controles de abuso (rate limit/captcha).
- Política CORS/headers: configuración amplia y ausencia de `CSP`, `X-Frame-Options`, `X-Content-Type-Options`, etc.
- Validación/sanitización de entradas: validaciones distribuidas e inconsistentes; falta de capa unificada en backend.

---

## Checklist de implementación por fases

### Fase 1 — Críticos (bloquea explotación inmediata)
- [ ] Deshabilitar `rehypeRaw` y sanitizar Markdown del blog con `rehype-sanitize`/`DOMPurify` en `src/pages/PostPage.tsx`.
- [ ] Sanitizar enlaces/markdown del chat y limitar protocolos (`http`, `https`, `mailto`) en `src/components/ChatWidget.tsx`.
- [ ] Remplazar `document.body.innerHTML` en `ResultViewer.tsx` por una plantilla de impresión segura (contenedor aislado/iframe `sandbox` o `print-only`).
- [ ] Restringir CORS a dominios permitidos (producción y previsualización) y bloquear orígenes desconocidos en `api/index.ts`.
- [ ] Añadir `helmet` y configurar headers de seguridad (CSP, Frameguard, NoSniff, XSS Protection deshabilitada, Referrer-Policy) en `api/index.ts`.
- [ ] Aplicar rate limiting y slow down a `/api/chat`, `/api/voice/token`, `/api/notify/*`.
- [ ] Implementar sanitización y validación de TODOS los inputs (frontend y backend) en sitio público y privado.
- [ ] Fortalecer RLS en Supabase para tablas sensibles (`appointments`, `patients`, `study_results`, `blog_posts`) y revisar políticas existentes.
- [ ] Endurecer auditoría: minimizar metadatos sensibles, normalizar campos y registrar IP/origen.

### Fase 2 — Controles de abuso y datos
- [ ] Rate limit global y por IP/usuario; `express-slow-down` para bursts; almacenamiento de contadores.
- [ ] Honeypot invisible y tiempo mínimo de relleno en formularios públicos.
- [ ] Heurísticas de contenido anti‑spam: límites de longitud/URLs, rechazo de repetición y patrones.
- [ ] Revisión de funciones RPC y procedimientos: validar parámetros, evitar SQL dinámico.
- [ ] Minimizar uso de `service_role` en backend; segmentar claves por servicio y entorno.

### Fase 3 — Endurecimiento continuo y monitoreo
- [ ] Observabilidad y alertas: métricas, logs, dashboards, alertas de tasa de error/429/XSS detectado.
- [ ] Pruebas SAST/DAST periódicas (pipeline CI) y pentests dirigidos.
- [ ] Rotación de claves/secrets y escaneo de secretos; política de expiación.
- [ ] Documentación de permisos y revisión trimestral de roles/ACL/RLS.
- [ ] Tokens de acción firmados para operaciones sensibles (e.g., agendamiento, notificaciones).

---

## Anti‑abuso sin proveedor (Rate limit + Honeypot + Tiempo mínimo)

- Frontend:
  - Agregar campo honeypot oculto (p.ej., `company`) que los usuarios legítimos dejan vacío.
  - Registrar `startTime` al montar el formulario; calcular `elapsed` al enviar y exigir un umbral (> 3s).
  - Normalizar entradas y limitar longitud/URLs antes del envío.
- Backend:
  - Validar honeypot vacío y rechazar si `elapsed` < umbral configurado por formulario.
  - Aplicar rate limit por IP/usuario y `express-slow-down` en bursts para `/api/chat`, `/api/appointments/*`, `/api/voice/token`, `/api/notify/*`, `/api/contact`.
  - Heurísticas de contenido: longitud máxima, límite de URLs, detección de repetición y patrones comunes de spam.
- Auditoría y métricas:
  - Registrar bloqueos por honeypot/tiempo y rate limiting; monitorear tasas de rechazo para ajustar umbrales.
- UX:
  - Transparente, sin desafíos visibles; configurable por formulario según sensibilidad.
 - Aplicación adicional:
   - Portal de pacientes (`src/pages/PatientPortalPage.tsx`): aplicar honeypot y umbral de tiempo > 3s al formulario de cédula.
 - Umbrales iniciales:
   - `/api/chat`: 15 solicitudes/minuto por IP/usuario.
   - Agendamiento (`/api/appointments/*`): 5 solicitudes/minuto por IP/usuario.
   - Recuperación (`/api/reset/*` o equivalente): 5 solicitudes/minuto por IP/usuario.

---

## Políticas de entrada (sanitización y validación)
**Estado: Incluido en el plan — pendiente de implementación.**

- Frontend: sanitizar valores de inputs antes de renderizar o enviar (quitar scripts/eventos/URLs peligrosas; normalizar cadenas; limitar longitud; listas blancas de protocolos). 
- Backend: validar esquema con zod/ajv por endpoint; sanitizar y normalizar; rechazar entradas con patrones de inyección; registrar intentos.
- Base de datos: evitar SQL dinámico; usar consultas parametrizadas y RPC; RLS estricta.
- Ámbitos: aplicar en sitio público (blog, contacto, chat) y privado (panel admin, subida de imágenes, creación/edición de pacientes, estudios, resultados).

> Nota sobre SQL Injection: con `supabase-js` y políticas RLS el riesgo se reduce si se evitan consultas SQL crudas. Si existe SQL dinámico en algún servicio/función, se debe migrar a consultas parametrizadas o RPC con validación rígida.

---

## Detalles técnicos y referencias de código
- Blog (público): `src/pages/PostPage.tsx` — `ReactMarkdown` con `rehypeRaw` (permitir HTML crudo) ⇒ sustituir por `rehype-sanitize` + `DOMPurify`.
- Chat (público): `src/components/ChatWidget.tsx` — sanitizar enlaces y contenido; limitar render de HTML.
- Impresión (admin): `src/components/admin/ResultViewer.tsx` — evitar `document.body.innerHTML`; usar plantilla segura.
- Backend: `api/index.ts` — configurar `CORS` estricto, `helmet`, rate limiting; proteger endpoints mediante verificación de roles/ACL existente.
- Auditoría: `src/services/audit.ts`, `api/_utils/audit.ts` — limitar metadatos, agregar IP/origen.
- Supabase: `src/services/supabaseClient.ts` — revisar clientes y ámbitos; reforzar RLS.

---

## Validación y pruebas sugeridas
- DAST: escaneo automatizado de XSS/CSRF/headers y fuzzing de inputs.
- Pruebas manuales: intentar inyectar `<script>`, `javascript:` en enlaces, atributos con `onerror`, imágenes con `srcdoc`, HTML en chat/post.
- Verificación de headers: inspeccionar CSP, Frameguard, NoSniff, Referrer-Policy.
- CORS: probar bloqueo de orígenes no permitidos.
- Rate limiting: comprobar 429 con bursts controlados.
- Honeypot: enviar formularios con el campo oculto relleno debe devolver 400/429.
- Tiempo mínimo: simular envíos con `elapsed` < umbral; verificar rechazo o tarpitting.
- Anti‑spam: forzar mensajes largos o con demasiadas URLs; comprobar bloqueo.
 - Portal de pacientes: pruebas con cédula + honeypot o `elapsed` < umbral deben devolver 400/429.

---

## Causas y cómo se corrigen (guía de remediación)
- Causa XSS: render de HTML sin sanitización (blog/chat) y manipulación `innerHTML`.
  - Corrección: sanitización (`rehype-sanitize`/`DOMPurify`), deshabilitar `rehypeRaw`, plantillas de impresión seguras.
- Causa exposición: endpoints sin auth/rol y sin controles de abuso.
  - Corrección: verificación robusta de roles/ACL por endpoint, rate limiting, honeypot y tiempo mínimo.
- Causa CORS/headers: configuración por defecto amplia.
  - Corrección: `helmet` + CORS restringido + CSP adecuada al proyecto.
- Causa validación: esquema de entradas no centralizado.
  - Corrección: validación/sanitización unificada por endpoint; rechazo temprano.

---

## Registro de avances
- Fase 1:
  - Sanitización blog: [ ]
  - Sanitización chat: [ ]
  - Impresión segura: [ ]
  - CORS restringido: [ ]
  - Headers `helmet`: [ ]
  - Protección de endpoints por roles/ACL: [ ]
  - Rate limiting: [ ]
  - Sanitización global de inputs (frontend/backend): [ ]
  - RLS reforzada: [ ]
  - Auditoría endurecida: [ ]
- Fase 2:
  - Anti-abuso sin proveedor (rate limit + honeypot + tiempo mínimo): [ ]
  - Revisión RPC/SQL: [ ]
  - Minimizar `service_role`: [ ]
- Fase 3:
  - Observabilidad y alertas: [ ]
  - SAST/DAST: [ ]
  - Rotación de secretos: [ ]
  - Revisión de permisos: [ ]
  - Tokens de acción: [ ]

---

## Aprobaciones y evidencias
- PR/Commit de cada ítem (enlace):
- Fecha de despliegue/verificación:
- Evidencias (capturas/logs):

## Cobertura de formularios e inputs críticos (explícito)
**Estado: Incluido en el plan — pendiente de implementación.**

- Frontends públicos:
  - [ ] `src/pages/LoginPage.tsx` — email/usuario y contraseña. Validar formato de email; longitud de contraseña mínima/máxima; no renderizar nunca la contraseña; normalizar email (trim, lower).
  - [ ] `src/pages/ForgotPasswordPage.tsx` — email y token. Validar email; token de reset con esquema estricto; rate limit envíos.
  - [ ] `src/pages/SchedulingPage.tsx` — nombre, teléfono, email, fecha, estudio y observaciones. Sanitizar nombre (alfanumérico, espacios y acentos controlados), teléfono (solo dígitos, `+`, `-`, espacios), email; validar fecha y estudio; límites de longitud; `zod` en frontend y backend.
  - [ ] `src/pages/PatientPortalPage.tsx` — cédula/número de identidad. Solo dígitos; longitud/prefijo conforme a normativa; trim; normalización; validación adicional en backend y registro de intentos; aplicar honeypot y tiempo mínimo de relleno (> 3s).
  - [ ] `src/pages/ContactPage.tsx` — nombre, email, mensaje. Sanitizar posibles HTML antes de mostrar; validar y normalizar en backend; anti-spam.
  - [ ] `src/components/ChatWidget.tsx` — mensaje del usuario. Bloquear HTML; permitir solo texto y enlaces seguros; rate limit y validación backend.

- Frontends privados/admin:
  - [ ] `src/pages/admin/PostsAdminPage.tsx` / `src/pages/admin/PostForm.tsx` — título, resumen, contenido, categorías. Usar `rehype-sanitize`/`DOMPurify` en render; validar y normalizar en backend.
  - [ ] `src/pages/admin/StudiesAdminPage.tsx` — creación/edición de estudios. Validar campos textuales y numéricos; normalización y límites.
  - [ ] `src/components/admin/InterpretationViewerModal.tsx` y flujos de carga de resultados — textos extensos y números. Validación estricta y normalización; evitar render de HTML crudo.

- Backend (endpoints):
  - [ ] `/api/chat` — validar/normalizar `message`; bloquear HTML/URLs peligrosas; rate limit por IP/usuario.
  - [ ] `/api/interpretar` — validar IDs/payload; esquemas `zod`/`ajv`; auditar origen.
  - [ ] `/api/notify/*` — validar `result_id`, teléfono/email; evitar traversal; auditoría y rate limit.
  - [ ] `/api/generate-blog-post` — limitar prompt y salida; sanitizar contenido y controlar longitud.
  - [ ] `/api/appointments/*` — validar agendamiento: nombres, teléfonos, fechas; evitar inyección en datos ICS.
  - [ ] `/api/voice/token` — validar origen/autorización; aplicar rate limit; no exponer API key.

- Observaciones:
  - La contraseña no se “sanitiza” (para no alterar su valor); se valida longitud y se maneja con hash seguro en backend. La mitigación de SQLi y XSS recae en validaciones de backend y en nunca renderizar contraseñas ni reflejar su contenido.
