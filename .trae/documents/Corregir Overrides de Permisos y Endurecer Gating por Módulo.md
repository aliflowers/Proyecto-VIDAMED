## Cambios de alcance
- Expenses: acceso exclusivo para `anamariaprieto@labvidamed.com`.
- PACIENTES: acciones → `ver`, `crear`, `editar` (eliminar se elimina del esquema/UI).
- CITAS: añadir `confirmar` y `cancelar` además de `gestionar_disponibilidad`, `reprogramar`, `ver`.
- SITE_CONFIG: solo gestión de hero (imágenes/video). Se elimina `actualizar_tasa_cambio` de este módulo; la tasa de cambio permanece en `ESTUDIOS`.
- BLOG/SEO: incluir acciones y gating detallado para publicaciones.

## Backend
1) Lectura de overrides
- Agregar `requireSelfOrAdmin(req, targetUserId)` en `api/_utils/auth.js`.
- `GET /api/users/:id/permissions`: permitir lectura cuando el token pertenece al mismo usuario o sea Administrador. `PUT` permanece solo Admin.
- Aplicar el mismo ajuste en mirror dev `api/dev.ts`.

2) Normalización
- Eliminar remapeo `maybeRemapModuleForAction(estudios→site_config)` ligado a `actualizar_tasa_cambio` en `api/_utils/permissions.(js|ts)` y `src/utils/permissions.ts`.

## Esquema de permisos (actualizado)
- `pacientes`: `ver`, `crear`, `editar`.
- `citas`: `ver`, `gestionar_disponibilidad`, `reprogramar`, `confirmar`, `cancelar`.
- `inventario`: `ver`, `crear`, `editar`, `eliminar`.
- `estudios`: `ver`, `crear`, `editar`, `eliminar`, `actualizar_tasa_cambio`.
- `resultados`: `ver`, `crear`, `editar`, `eliminar`, `enviar_email`, `enviar_whatsapp`, `imprimir`.
- `site_config`: `ver`, `editar` (gestión hero).
- `publicaciones_blog` (Blog/SEO): `ver`, `crear`, `editar`, `eliminar`.
- `testimonios`: `ver`, `crear`, `editar`, `eliminar`.

## Blog/SEO — Acciones y Gating
- Páginas afectadas: `PostsAdminPage` (gestión de artículos), y cualquier componente de edición/creación de posts.
- Reglas de UI:
  - Botón “Crear publicación” → requiere `can('crear')` en `publicaciones_blog`.
  - Editar publicación → `can('editar')` en `publicaciones_blog`.
  - Eliminar publicación → `can('eliminar')` en `publicaciones_blog`.
  - Listado/visualización → `can('ver')`.
- Generador IA (`/api/generate-blog-post`):
  - Gatear invocación a usuarios con `can('crear')` en `publicaciones_blog`.
  - Mantener `Authorization: Bearer` en `apiFetch`; auditar acción “Generar contenido blog”.
- SEO: edición de campos `meta_titulo`, `meta_descripcion`, `keywords` se considera parte de `editar`.

## Frontend
1) Hook centralizado
- Crear `useUserPermissions()` que cargue `role` y `overrides` vía `apiFetch` con `Authorization`, y normalice módulos/acciones.
- Adoptar el hook en: `PatientsAdminPage`, `StudiesAdminPage`, `ResultsPage`, `InventoryPage`, `AppointmentsAdminPage`, `PostsAdminPage` y `SiteConfigPage`.

2) UI y reglas por módulo
- `PatientsAdminPage`: remover referencias a “eliminar”; aplicar `can('crear')` y `can('editar')` para botones/handlers.
- `AppointmentsAdminPage`: añadir gating para `confirmar` y `cancelar` además de existentes.
- `SiteConfigPage`: gating `ver`/`editar` (hero); sin tasa.
- `StudiesAdminPage`: mantener `actualizar_tasa_cambio` y gating de edición masiva.
- `InventoryPage`: usar `apiFetch` para overrides; mantener gating ya presente.
- `PostsAdminPage`: implementar los `can()` descritos en Blog/SEO; gatear generador IA al `can('crear')`.

3) Rutas especiales
- En `ProtectedRoute`/page-level: restringir `/admin/expenses` exclusivamente a `anamariaprieto@labvidamed.com`.
- `auditoria`: mantener restricción solo-owners según la política actual; si se requiere, limitar también a `anamariaprieto@...`.

## Verificación
- Asistente con override `PACIENTES:crear=false` → “Registrar Nuevo Paciente” deshabilitado y acción bloqueada.
- CITAS: `confirmar`/`cancelar` respetan overrides; `gestionar_disponibilidad` y `reprogramar` también.
- BLOG/