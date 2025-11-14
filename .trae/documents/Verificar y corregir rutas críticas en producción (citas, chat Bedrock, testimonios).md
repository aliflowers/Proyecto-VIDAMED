## Objetivo
- Consolidar rutas de producción hacia `api/index.ts` mediante `vercel.json` (Opción B) para resolver 404 en `/api/availability/slots` y errores del chat.
- Crear una política RLS en Supabase que permita `INSERT` a rol `anon` en `public.testimonios` con controles de campos y moderación por defecto.

## Cambios a aplicar
### Vercel (router único)
1) Crear `vercel.json` en la raíz con:
```
{
  "version": 2,
  "functions": {
    "api/index.ts": { "runtime": "nodejs20.x" }
  },
  "rewrites": [ { "source": "/api/:path*", "destination": "/api/index.ts" } ]
}
```
2) Desplegar y verificar que `/api/chat`, `/api/availability/slots`, `/api/availability/block`, `/api/appointments/send-confirmation`, `/api/notify/email` respondan en producción.

### Supabase (RLS testimonios)
1) Habilitar RLS (si no está ya) y crear política de `INSERT` para rol `anon`:
- `INSERT` permitido cuando: `texto` no nulo, `rating` 1..5, `autor` no nulo, `estudio_realizado` no nulo, `is_approved=false`.
- Conceder privilegio `INSERT` al rol `anon` si fuese necesario.
2) (Opcional) Añadir trigger anti-spam: limitar un insert por IP por día o validar longitud mínima de `texto`.

## Verificación
- Agendamiento:
  - Navegar Scheduling, seleccionar fecha y ubicación → `/api/availability/slots` devuelve `available` con horarios.
  - Confirmar agendamiento → `POST` a `/api/appointments/send-confirmation` OK.
- Chat IA:
  - Enviar mensaje → `/api/chat` responde con texto; revisar logs de modelo y token.
- Testimonios:
  - Enviar testimonio desde Portal → `INSERT` exitoso y `is_approved=false`.

## Riesgos y mitigación
- `vercel.json`: validar en preview antes de producción.
- RLS para `anon`: moderar con `is_approved=false` y opcional trigger; evitar exposición de columnas sensibles.

## Entregables
- Archivo `vercel.json` en la raíz.
- Política RLS aplicada en `public.testimonios`.
- Reporte de pruebas en producción confirmando funcionamiento.

¿Confirmas que proceda a aplicar la política RLS vía Supabase MCP y a verificar las rutas tras los rewrites? 