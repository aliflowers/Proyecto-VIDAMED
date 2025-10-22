# Informe de Resolución de Incidente: Metadatos SEO

**Fecha:** 16 de Julio de 2025
**Proyecto:** Laboratorio Clínico VidaMed
**Problema:** Los metadatos de SEO (`meta_title`, `meta_description`, `keywords`) no se reflejaban correctamente en el `<head>` del HTML en las páginas de los posts del blog.

---

## 1. Resumen del Problema

Al editar una publicación del blog y añadir metadatos SEO, estos cambios no se aplicaban a la página del post correspondiente. Específicamente, las etiquetas `<meta name="description">` y `<meta name="keywords">` no aparecían en el DOM, aunque la etiqueta `<title>` sí se actualizaba.

## 2. Proceso de Diagnóstico y Depuración

Se siguió un proceso iterativo para aislar la causa raíz del problema, descartando varias hipótesis en el camino.

### Intento 1: Verificación del Flujo de Datos Básico
*   **Acción:** Se revisó el código desde el formulario (`PostForm.tsx`) hasta la página de visualización (`PostPage.tsx`).
*   **Hallazgo:** La lógica para capturar, guardar y pasar los datos a través de los componentes parecía correcta.
*   **Resultado:** El problema persistió.

### Intento 2: Solución con `react-helmet-async`
*   **Acción:** Se intentó implementar `react-helmet-async`, la librería estándar de la industria para manejar el `<head>` en aplicaciones React.
*   **Hallazgo:** La instalación falló debido a un conflicto de dependencias con la versión de React del proyecto (React 19). La librería no era compatible.
*   **Resultado:** Se descartó esta solución y se optó por un enfoque manual.

### Intento 3: Solución con Hook Manual (`useDocumentTitle.ts`)
*   **Acción:** Se creó un hook personalizado que manipulaba directamente el DOM para crear y actualizar las metaetiquetas.
*   **Hallazgo:** A pesar de que la lógica del hook era correcta, las etiquetas seguían sin aparecer. Esto apuntaba a un problema más profundo.

### Intento 4: Verificación de Políticas de Seguridad (RLS)
*   **Acción:** Se utilizó la herramienta `get_advisors` del MCP de Supabase para revisar la configuración de seguridad.
*   **Hallazgo:** Se descubrió que la tabla `publicaciones_blog` tenía la Seguridad a Nivel de Fila (RLS) activada, pero **no existía una política que permitiera la lectura pública (`SELECT`) de las nuevas columnas de metadatos**.
*   **Diagnóstico Clave:** Supabase, por seguridad, no devuelve un error cuando una política RLS bloquea el acceso a ciertas columnas; simplemente las omite de la respuesta. Esto explicaba por qué el frontend nunca recibía los datos de los metadatos, a pesar de que estaban guardados en la base de datos.

## 3. Solución Final Implementada

La solución definitiva consistió en corregir la configuración de seguridad y limpiar el código de los intentos fallidos.

1.  **Corrección de la Política de Seguridad (RLS):**
    *   Se ejecutó una migración de base de datos para eliminar la política de lectura pública existente (que estaba incompleta) y crear una nueva que permitiera explícitamente el acceso de lectura a **todas** las columnas de la tabla `publicaciones_blog` para el rol `anon` (visitantes públicos).
    *   **Comando SQL:**
        ```sql
        DROP POLICY IF EXISTS "Allow public read access to blog posts" ON public.publicaciones_blog;
        CREATE POLICY "Allow public read access to all blog post columns" ON public.publicaciones_blog FOR SELECT TO anon USING (true);
        ```

2.  **Simplificación del Código:**
    *   Se eliminó la librería `react-helmet-async` y sus componentes asociados (`HelmetProvider`, `SEO.tsx`) para evitar conflictos.
    *   Se restauró el uso del hook manual `useDocumentTitle.ts`, que ahora, al recibir los datos correctos de la base de datos, funciona como se esperaba.

## 4. Conclusión

El problema raíz no era un error en la lógica de la aplicación React, sino una configuración de permisos incompleta en la capa de la base de datos. La naturaleza "silenciosa" del fallo de la política RLS dificultó el diagnóstico inicial. La solución final, que combina la corrección de los permisos de la base de datos con un hook manual robusto para la manipulación del DOM, ha demostrado ser efectiva y ha resuelto el problema de forma definitiva.
