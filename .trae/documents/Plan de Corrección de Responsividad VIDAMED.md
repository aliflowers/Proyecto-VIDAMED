## Objetivo
- Garantizar que los módulos clave se rendericen correctamente en móviles (≤360–414 px) y tablets, sin desbordes ni recortes.
- Corregir los problemas reportados en: ChatWidget, calendario (DayPicker) en SchedulingPage, menú hamburguesa del panel privado, BlogAiGeneratorModal y TestimonialsAdminPage.

## Diagnóstico por módulo
### ChatWidget (`src/components/ChatWidget.tsx`)
- Panel del chat: contenedor `fixed` con `w-full max-w-sm right-6` (líneas 143–154 de `src/components/ChatWidget.tsx:143`). En pantallas de 320–360 px, `w-full` + `right-6` desplaza el panel hacia la izquierda, produciendo recorte.
- Causa: ancho `100vw` con offset `right-6` deja el borde izquierdo en negativo. 
- Solución: usar `inset-x-4` en móviles (márgenes simétricos) y sólo anclar a `right-6` en `sm+`. Alternativa: centrar con `left-1/2 -translate-x-1/2` y limitar ancho con `max-w-[calc(100vw-2rem)]`.

### Calendario en SchedulingPage (`src/pages/SchedulingPage.tsx`)
- `react-day-picker` importado con estilo por defecto (línea 8). En móviles, los números de días se desbordan a la derecha del contenedor.
- Causas probables: `table-layout: auto` del mes, `min-width` del bloque del mes y el tamaño de celdas (`--rdp-cell-size`) no adaptado al ancho disponible.
- Solución: forzar `table-layout: fixed` y `width: 100%` en `.rdp-table`, asegurar que `.rdp`/`.rdp-month` no tengan `min-width` que rompa el flujo, y definir `--rdp-cell-size` relativa al viewport. Se aplicará en `src/index.css` para no crear archivos nuevos.

### Menú hamburguesa panel privado (Admin)
- Ubicación encontrada: `src/components/admin/AdminLayout.tsx` (sidebar y overlay móvil). El sidebar móvil y desktop no tienen `overflow-y-auto` en su contenedor.
- Causa: contenido del menú más alto que la pantalla en algunos dispositivos; sin scroll interno, partes del menú quedan inaccesibles.
- Solución: añadir `overflow-y-auto` al `aside` (móvil y desktop), bloquear el scroll del fondo (`body`) cuando el sidebar esté abierto para evitar “scroll bleed”. Igual estrategia para el menú público en `src/components/Header.tsx` (panel móvil): limitar altura con `max-h-[80vh]` y `overflow-y-auto`.

### BlogAiGeneratorModal (`src/components/admin/BlogAiGeneratorModal.tsx`)
- Contenedor modal `w-full max-w-2xl` con contenido extenso; en móviles puede exceder la altura visible.
- Causa: el contenido no está dentro de un contenedor con `max-h` y scroll.
- Solución: en el card interno agregar `max-h-[85vh] overflow-y-auto`, reducir paddings en `sm` y hacer que el footer de acciones sea responsivo (`flex-col sm:flex-row`). Mantener grillas como `grid-cols-1 md:grid-cols-3` pero asegurar que el bloque de categorías tenga `max-h-32 sm:max-h-48 overflow-y-auto`.

### TestimonialsAdminPage (`src/pages/admin/TestimonialsAdminPage.tsx`)
- Tabla sin wrapper de scroll horizontal; en móviles puede romper layout.
- Causa: ancho mínimo de columnas en tablas sobre pantallas estrechas.
- Solución: envolver la tabla en un contenedor con `overflow-x-auto max-w-full`, ajustar tipografía (`text-sm`) y truncado controlado. Mantener `truncate` en la columna de texto y permitir scroll horizontal.

## Cambios Propuestos (concretos)
### 1) ChatWidget
- Modificar el contenedor del panel:
  - Móviles: `className="fixed bottom-24 inset-x-4 w-auto max-w-[calc(100vw-2rem)] h-[70vh] ..."`
  - `sm+`: `className="fixed bottom-24 right-6 w-[360px] max-w-sm ..."`
- Opcional: centrar con `left-1/2 -translate-x-1/2` en `xs` si prefieres anclar al botón sólo en `sm+`.

### 2) DayPicker (SchedulingPage)
- En `src/index.css` (al final, para mayor especificidad):
  - `.rdp { width: 100%; }
     .rdp-months { width: 100%; }
     .rdp-month { margin: 0 auto; }
     .rdp-table { table-layout: fixed; width: 100%; }
     .rdp-caption { padding: 0 0.5rem; }`
  - Variables para móviles (opcional):
    - `.rdp { --rdp-cell-size: clamp(36px, 12vw, 44px); }`
- En el componente, añadir `className="w-full"` al `DayPicker` y envolverlo en un `div` con `overflow-hidden` si detectamos recortes por padding del contenedor padre.

### 3) Sidebar/AdminLayout
- `aside` desktop: añadir `overflow-y-auto` y `max-h-screen`.
- `aside` móvil: añadir `overflow-y-auto max-h-screen`. 
- Al abrir sidebar móvil: bloquear fondo con `document.body.style.overflow = 'hidden'` en `useEffect`. Retirar al cerrar.

### 4) Header (menú móvil público)
- Wrapper del menú móvil: `max-h-[80vh] overflow-y-auto`.
- Bloquear fondo cuando `isOpen` sea `true` (mismo `useEffect`).

### 5) BlogAiGeneratorModal
- Card interno: `className="bg-white rounded-lg shadow-xl p-4 sm:p-8 w-full max-w-2xl max-h-[85vh] overflow-y-auto"`.
- Footer: `className="flex flex-col sm:flex-row justify-end gap-3 sm:space-x-4 mt-6"`.
- Bloque de categorías: mantener `max-h-32 sm:max-h-48 overflow-y-auto`.

### 6) TestimonialsAdminPage
- Envolver `<table>` con `<div className="overflow-x-auto max-w-full">`.
- Ajustar celdas a `text-sm` en `xs` y mantener `truncate` en el texto.

## Validación y Pruebas
- Probar en dispositivos de referencia: 320, 360, 390, 414, 768, 1024 px.
- Navegadores: Chrome/Android, Safari/iOS (verificar `safe-area` y notch).
- Casos:
  - Chat: abrir/cerrar en 320–360 px; confirmar panel centrado sin recortes.
  - Calendario: meses largos (30/31), semanas que empiezan en domingo/lunes; confirmar sin desbordes.
  - Sidebar y menú móvil: contenido largo > altura de pantalla; confirmar scroll interno y bloqueo de fondo.
  - Blog modal: interacción completa dentro de `85vh` y scroll independiente.
  - Testimonios: tabla accesible con scroll horizontal.

## Consideraciones y Riesgos
- Orden de carga CSS: si algún estilo no se aplica, aumentar especificidad o mover reglas al final de `src/index.css`.
- Conflictos de bloqueo de fondo: unificar la política en una utilidad (opcional) si hay más modales (p.ej., `ChatWidget`).
- Accesibilidad: añadir `aria-modal`, foco inicial en modales y cierre con `Esc` (mejorable en iteración siguiente).

## Entregables
- Ajustes de clases en componentes indicados.
- Overrides CSS en `src/index.css` para DayPicker.
- Verificación manual con checklist de breakpoints y casos arriba.

¿Confirmas este plan para proceder con la implementación de los cambios y la verificación?