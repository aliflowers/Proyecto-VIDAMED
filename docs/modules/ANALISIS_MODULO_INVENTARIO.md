# Análisis y Planificación del Módulo de Inventario

Este documento detalla el plan de desarrollo para el nuevo módulo de "Inventario" dentro del área de administración de VIDAMED.

## Funcionalidades Principales

- [x] **Gestión de Materiales:** Crear, leer, actualizar y eliminar materiales del inventario.
- [x] **Visualización de Inventario:** Mostrar los materiales en tarjetas modales con información clave (imagen, nombre, stock, fecha de última compra, costos en Bs y $).
- [x] **Integración con Estudios:** Permitir la selección de materiales utilizados al registrar un estudio.
- [x] **Actualización Automática de Stock:** Descontar automáticamente del inventario los materiales utilizados en un estudio.

## Plan de Desarrollo

### Fase 1: Base de Datos (Supabase)

- [x] Definir y crear la tabla `inventario`.
  - `id` (PK, autoincremental)
  - `nombre` (texto)
  - `descripcion` (texto)
  - `imagen_url` (texto)
  - `cantidad_stock` (entero)
  - `unidad_medida` (texto)
  - `fecha_ultima_compra` (timestamp)
  - `costo_ultima_compra_bs` (numérico)
  - `costo_ultima_compra_usd` (numérico)
  - `proveedor` (texto)
  - `notas` (texto)
- [x] Definir y crear la tabla `estudio_materiales`.
  - `id` (PK, autoincremental)
  - `estudio_id` (FK a `estudios`)
  - `material_id` (FK a `inventario`)
  - `cantidad_usada` (entero)
  - `observaciones` (texto)
- [x] Crear un *trigger* en Supabase para actualizar `cantidad_stock` en `inventario` al insertar en `estudio_materiales`.

### Fase 2: UI del Módulo de Inventario

- [x] Crear la ruta y el componente de página `pages/admin/InventoryPage.tsx`.
- [x] Desarrollar el componente `components/admin/InventoryCard.tsx` para mostrar cada material.
- [x] Implementar el componente `components/admin/InventoryForm.tsx` para el CRUD de materiales.
- [x] Conectar la UI con los *endpoints* de Supabase para la gestión de inventario.

### Fase 3: Integración con el Módulo de Estudios

- [x] Modificar `components/admin/StudyForm.tsx` para añadir la sección de "Materiales Utilizados".
- [x] Poblar el selector de materiales desde la tabla `inventario`.
- [x] Guardar los datos de materiales utilizados en la tabla `estudio_materiales` al guardar un estudio.

### Fase 4: Funcionalidades Adicionales

- [ ] **Alertas de Stock Bajo:**
  - [ ] Añadir un umbral de stock mínimo a la tabla `inventario`.
  - [ ] Implementar indicadores visuales para materiales con stock bajo.
- [ ] **Informes de Inventario en Estadísticas:**
  - [ ] Crear RPCs en Supabase para obtener estadísticas de uso de materiales.
  - [ ] Añadir nuevos gráficos en `pages/admin/StatisticsPage.tsx`.
- [ ] **Historial de Compras:**
  - [ ] Crear la tabla `historial_compras`.
  - [ ] Implementar la lógica para registrar cada compra de material.
