## Hallazgos
- `index.html` no incluye `link rel="manifest"` (index.html:3–47).
- `vite.config.ts` usa `manifestFilename: 'manifest.json'` (vite.config.ts:23), distinto de lo esperado por `vercel.json` que expone `/manifest.webmanifest` (vercel.json:29–33).
- En `public/` existen `pwa-192x192.png` y `pwa-512x512.png`, además de `favicon.svg` y `pwa-512x512.svg`. No existen `favicon.ico`, `apple-touch-icon.png`, `masked-icon.svg` que se listan en `includeAssets` (public LS, vite.config.ts:22–23).
- Endpoints de usuarios en producción (`api/users/index.ts`, `api/users/[id].ts`, `api/users/[id]/permissions.ts`) operan con Service Role y no validan autenticación/autorización (api/users/index.ts:12–19, 21–57; api/users/[id].ts:15–77; api/users/[id]/permissions.ts:15–29, 31–55). El mirror de dev (`api/dev.ts`) repite el patrón (api/dev.ts:520–674, 676–732). Las utilidades de permisos existentes no se usan para gating.

## Cambios PWA
1) Añadir en `index.html` dentro de `<head>`: `<link rel="manifest" href="/manifest.webmanifest">`.
2) Cambiar en `vite.config.ts` `manifestFilename` a `'manifest.webmanifest'` para alinear con `vercel.json`.
3) Ajustar `includeAssets` en `vite.config.ts` para reflejar lo que realmente existe en `public/` (p.ej. reemplazar `favicon.ico`/`apple-touch-icon.png`/`masked-icon.svg` por `favicon.svg` y `pwa-512x512.svg`, o eliminarlos si no son necesarios).
4) Verificar `icons` del `manifest` apuntan a `pwa-192x192.png` y `pwa-512x512.png` ya presentes en `public/`.

## Endpoints Seguros (sin romper permisos existentes)
1) Implementar verificación de autenticación basada en Supabase JWT en cada endpoint sensible:
- Crear un helper ligero `getAuthUser(req)` que use un cliente Supabase con `ANON_KEY` para resolver el usuario a partir del `Authorization: Bearer <token>`.
- Normalizar el rol con `normalizeRole` y usarlo para decisiones.
2) Gatear endpoints de gestión de usuarios exclusivamente a rol `Administrador`:
- `GET/POST /api/users` (api/users/index.ts).
- `PUT/DELETE /api/users/:id` y `GET/PUT /api/users/:id/permissions` (api/users/[id].ts y api/users/[id]/permissions.ts).
3) Mantener compatibilidad con utilidades de permisos:
- Seguir usando `normalizeModuleName`, `normalizeActionName` y `maybeRemapModuleForAction` donde aplique.
- Para estos endpoints, la política será "solo Administrador", por lo que no habrá conflicto con la matriz de `src/utils/permissions.ts`; si se desea granularidad futura, se podrá invocar `hasPermission(user, 'pacientes', 'crear')`, etc.
4) Endurecer el mirror de desarrollo `api/dev.ts` igual que producción para `/api/users*` y operaciones administrativas (`/api/availability/block` DELETE/POST):
- Requerir `Authorization` y rol `Administrador`.
- Conservar CORS de dev.

## Verificación
- Cargar `index.html` y confirmar que el navegador descarga `/manifest.webmanifest` sin errores.
- Revisar en Vercel que las cabeceras para `/manifest.webmanifest` y `/favicon.ico` sigan coherentes; si no se sirve `favicon.ico`, actualizar `vercel.json` o añadir el asset.
- Probar endpoints con y sin `Authorization`: sin token → 401; token de usuario no admin → 403; token admin → 2xx.
- Confirmar que los endpoints siguen creando/actualizando `user_profiles` y `user_permissions` correctamente.

## Entregables
- `index.html` con `<link rel="manifest" ...>`.
- `vite.config.ts` con `manifestFilename: 'manifest.webmanifest'` y `includeAssets` coherentes.
- Endpoints `/api/users*` y dev mirror protegidos por rol `Administrador`.
- Notas de prueba y verificación ejecutadas.

¿Confirmas que proceda con estos cambios?