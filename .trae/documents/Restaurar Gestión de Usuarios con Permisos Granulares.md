## Diagnóstico
- La página `UsersManagementPage.tsx` se había reemplazado por utilidades, perdiendo el componente React y su UI de edición/gestión granular.
- Endpoints ya seguros y disponibles: `GET/POST /api/users`, `PUT/DELETE /api/users/:id`, `GET/PUT /api/users/:id/permissions`.
- Normalizadores/permiso por rol existen en `src/utils/permissions.ts` y backend (`api/_utils/permissions.*`).

## Objetivos
1) Recuperar la UI completa para:
- Crear, listar, editar y eliminar usuarios (incluyendo cambio de rol).
- Gestionar permisos granulares por módulo/acción vía checkboxes.
2) Mantener coherencia con normalizadores de módulo/acción.
3) Usar `Authorization: Bearer` y mostrar estado/errores claros.

## Diseño de la UI
- Secciones:
1. Encabezado: rol del actor y acciones globales (refrescar).
2. Formulario “Crear usuario”: nombre, apellido, cédula, email, password, sede, rol.
3. Tabla de usuarios: `nombre, apellido, cédula, email, sede, rol, acciones`.
4. Modal “Editar usuario”: campos editables + selector de rol.
5. Modal “Permisos (overrides)”: grid por módulo→acciones con checkboxes:
- Estado visual: Default (gris) vs Override (activo) → `true/false`.
- Tooltips indicando si el permiso viene del rol o del override.

## Esquema de permisos (frontend)
- Fuente: `src/utils/permissions.ts`.
- Construcción:
- Derivar lista canónica de módulos de `defaultPermissions` (keys) y acciones por módulo a partir de unión de acciones definidas y comunes (`ver, crear, editar, eliminar, imprimir, enviar_email, enviar_whatsapp, gestionar_disponibilidad, reprogramar, actualizar_tasa_cambio`).
- Normalizar con `normalizeModuleName` y `normalizeActionName`.

## Flujo de datos
- Listado: `GET /api/users` → setUsers.
- Edición:
- `PUT /api/users/:id` con campos cambiados (incluye `app_metadata.role`).
- Overrides:
- `GET /api/users/:id/permissions` → aplicar normalizadores y poblar grid.
- `PUT /api/users/:id/permissions` → enviar arreglo `{ module, action, allowed }` solo de overrides (no defaults).
- Eliminación: `DELETE /api/users/:id`.

## Lógica de checkboxes
- Efectivo = `hasPermission(user, modulo, accion)` del frontend (opcional para mostrar vista previa), pero en el editor trabajamos solo con overrides.
- Tres estados por acción:
1. Sin override → usa default del rol (mostrado en gris y deshabilitar edición si se quiere evitar inconsistencias).
2. Override `true` → forzar permitir.
3. Override `false` → forzar negar (incluido para Admin, que por default permite todo).
- Persistir únicamente las acciones con override explícito.

## Implementación
1) Crear `src/constants/permissionsSchema.ts` con módulos y acciones canónicos (derivados de utils).
2) Extender `UsersManagementPage.tsx`:
- Estado: `selectedUser`, `editUserForm`, `overridesMap`.
- Modales: `EditUserModal`, `PermissionsModal` (subcomponentes inline o archivos separados según tu estilo).
- Integración con `apiFetch` (ya envía `Authorization`).
3) Usar los normalizadores en todas las escrituras/lecturas.
4) Añadir feedback (toasts, banners) para 2xx, 401/403, 4xx.

## Validación
- Admin autenticado:
- Ver lista, abrir permisos de un usuario, crear, editar rol, eliminar.
- Admin con override `false` sobre acción “inventario:crear” → comprobar que en UI de inventario el botón crear se oculta/bloquea (si aplica).
- No admin → 403 en endpoints.

## Entregables
- `src/constants/permissionsSchema.ts`.
- `src/pages/admin/UsersManagementPage.tsx` con UI completa.
- (Opcional) `src/components/admin/EditUserModal.tsx` y `PermissionsModal.tsx` si se prefiere modularizar.

## Observaciones
- Mantener los warnings de múltiples GoTrueClient bajo observación (no bloqueante). Si aparecen efectos colaterales, centralizamos el cliente en `supabaseClient` y evitamos instancias paralelas.

¿Quieres que aplique estos cambios ahora para recuperar la UI avanzada y la gestión granular de permisos?