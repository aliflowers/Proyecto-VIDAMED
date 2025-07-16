# Reporte de Error: Metadatos de Palabras Clave (Keywords)

## 1. Descripción del Problema

Al editar una publicación del blog y añadir palabras clave en el campo correspondiente del formulario, los cambios no se reflejan en la metaetiqueta `<meta name="keywords" ...>` en el HTML de la página del post, a pesar de que los datos parecen guardarse correctamente en la base de datos.

## 2. Flujo de Datos Esperado

1.  **Formulario (`PostForm.tsx`):** El administrador introduce una cadena de palabras clave separadas por comas (ej. "salud, análisis, sangre").
2.  **Envío (`PostForm.tsx`):** Al guardar, la cadena se convierte en un array de JavaScript (ej. `['salud', 'análisis', 'sangre']`).
3.  **Guardado (`PostsAdminPage.tsx`):** Este array se envía a Supabase para ser guardado en la columna `keywords` de la tabla `publicaciones_blog`, que es de tipo `TEXT[]`.
4.  **Obtención (`PostPage.tsx`):** Al cargar la página de un post, se obtienen los datos de la publicación, incluyendo el array de `keywords`.
5.  **Renderizado (`useDocumentTitle.ts`):** Un hook personalizado toma el array de `keywords`, lo convierte de nuevo a una cadena separada por comas, y lo inserta en el atributo `content` de la metaetiqueta `keywords`.

## 3. Intentos de Solución Realizados

Se han intentado múltiples enfoques para solucionar este problema, atacando diferentes puntos del flujo de datos:

1.  **Verificación del Mapeo de Datos:** Se confirmó que la propiedad `keywords` se estaba incluyendo correctamente al obtener los datos de la base de datos y al pasarlos entre componentes.
2.  **Habilitación de RLS:** Se detectó que la tabla `publicaciones_blog` no tenía la Seguridad a Nivel de Fila (RLS) habilitada. Se habilitó y se crearon las políticas adecuadas para permitir la lectura y escritura por parte de los usuarios correspondientes.
3.  **Formato de Datos para Supabase:** Se experimentó cambiando el formato en que se enviaba el array a Supabase (de un array de JS a un string con formato de array de PostgreSQL `'{a,b,c}'`). Se revirtió este cambio al confirmar que la librería cliente de Supabase maneja los arrays de JS de forma nativa.
4.  **Consistencia de Tipos:** Se revisó y corrigió el flujo de datos para asegurar que la conversión entre el array de la base de datos y la cadena de texto del formulario fuera consistente en todo momento.
5.  **Depuración con `console.log`:** Se añadieron múltiples `console.log` que confirmaron que:
    *   El frontend envía a Supabase un array de strings correctamente formateado.
    *   El frontend recibe de Supabase un array de strings correctamente formateado.
    *   El hook `useDocumentTitle` recibe el array de `keywords` correctamente.

## 4. Estado Actual y Causa Raíz Desconocida

A pesar de que todas las verificaciones de código y depuración indican que el flujo de datos es correcto, el resultado final sigue siendo el mismo: la metaetiqueta `keywords` no se actualiza.

Las posibles causas restantes son complejas y probablemente están relacionadas con el entorno o con un comportamiento muy sutil de las librerías involucradas:

*   **Problema de Caché Persistente:** Podría haber una capa de caché (en Supabase, en el navegador, o en algún punto intermedio) que está sirviendo una versión antigua de los datos del post, incluso después de la actualización.
*   **Conflicto de `useEffect`:** Aunque se ha simplificado, podría seguir existiendo un conflicto sutil entre el `useEffect` del hook `useDocumentTitle` y el ciclo de vida del componente `PostPage`.
*   **Interferencia de Extensiones:** Es posible, aunque poco probable, que una extensión del navegador esté interfiriendo con la manipulación del DOM.

Se recomienda una revisión por un segundo par de ojos o intentar probar el comportamiento en un navegador diferente o en modo incógnito para descartar problemas de caché/extensiones.
