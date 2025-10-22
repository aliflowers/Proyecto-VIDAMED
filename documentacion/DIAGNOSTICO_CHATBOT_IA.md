# Diagnóstico y Evolución del Agente de IA (VidaBot)

**Fecha:** 24 de Agosto de 2025

## 1. Problema Central

El agente de IA VidaBot, a pesar de tener acceso a herramientas funcionales para consultar la base de datos, exhibe un comportamiento conversacional rígido, ilógico y propenso a errores. El problema principal es su incapacidad para determinar correctamente la intención del usuario, lo que resulta en:
-   Ignorar preguntas directas sobre información de estudios (ej. precios).
-   Iniciar de forma prematura e incorrecta el flujo de agendamiento de citas.
-   Entrar en bucles de conversación confusos cuando el usuario intenta corregirlo.
-   Fallar en la búsqueda de estudios si el usuario no proporciona el nombre exacto.

## 2. Historial de Iteraciones y Soluciones

A continuación se detalla la evolución de las soluciones implementadas en el backend (`api/index.ts`) y en la base de datos para intentar corregir este comportamiento.

### Intento 1: Prompt Básico y Búsqueda Simple

-   **Lógica:** El `systemInstruction` inicial contenía una lista de pasos numerados para agendar una cita. La función `getStudiesInfo` usaba una búsqueda simple y sensible a mayúsculas.
-   **Resultado:** Fallo total. El bot no podía encontrar estudios a menos que el nombre fuera exacto y se atascaba constantemente en el flujo de agendamiento.

### Intento 2: Búsqueda Flexible (`ilike`)

-   **Lógica:** Se modificó la función `getStudiesInfo` para usar el operador `ilike` de PostgreSQL, haciendo la búsqueda insensible a mayúsculas y permitiendo coincidencias parciales.
    ```typescript
    // api/index.ts
    const { data, error } = await supabaseAdmin
        .from('estudios')
        .select(...)
        .ilike('nombre', `%${studyName}%`);
    ```
-   **Resultado:** Mejora leve, pero no solucionó problemas de acentos o de palabras clave desordenadas (ej. "examen de funcion renal"). El bot seguía siendo muy rígido.

### Intento 3: Función SQL (v1) y Prompt Mejorado

-   **Lógica SQL:** Se creó una función RPC en Supabase (`search_studies`) para manejar la búsqueda, eliminando palabras vacías (`stop words`) y usando `unaccent` para ignorar acentos.
-   **Lógica del Prompt:** Se reescribió el `systemInstruction` para introducir una "Regla de Oro", instruyendo al bot a priorizar la búsqueda de información.
-   **Resultado:** Fallo. La función SQL tenía un error lógico en cómo limpiaba las palabras y seguía siendo sensible a mayúsculas. El `prompt`, a pesar de la "Regla de Oro", no fue suficiente para evitar que el bot priorizara el flujo de agendamiento.

### Intento 4: Función SQL (v2 - Robusta)

-   **Lógica SQL:** Se corrigió la función `search_studies` para ser verdaderamente insensible a mayúsculas y acentos, y para manejar las palabras vacías de forma más fiable.
    ```sql
    -- api/index.ts -> getStudiesInfo ahora llama a esta función
    const { data, error } = await supabaseAdmin
        .rpc('search_studies', { search_term: studyName });

    -- Función en Supabase
    CREATE OR REPLACE FUNCTION search_studies(search_term TEXT) ...
    ...
    SELECT bool_and(lower(unaccent(s.nombre)) LIKE '%' || q_word || '%')
    FROM unnest(query_words) AS q_word
    ...
    ```
-   **Resultado:** La búsqueda en la base de datos se volvió muy efectiva. Sin embargo, el problema de lógica del bot persistió. La conversación más reciente demuestra que el bot todavía ignora la intención del usuario y se lanza prematuramente a agendar, incluso cuando la búsqueda falla.

## 3. Causa Raíz Definitiva

El enfoque de controlar un flujo de aplicación lógico y con estado (como agendar una cita) a través de un único `prompt` de lenguaje natural es fundamentalmente frágil. El modelo de IA no "ejecuta" las reglas como un programa; las "interpreta". La sección detallada y estructurada del **Proceso de Agendamiento** crea un sesgo cognitivo en el modelo que anula las directivas más abstractas como la "Regla de Oro".

El problema no es que el bot no sea inteligente, sino que le estamos pidiendo que sea un gestor de estado conversacional, una tarea para la que los `prompts` simples no son la herramienta adecuada.

## 4. Solución Propuesta: Arquitectura Robusta (Código como Cerebro)

La solución definitiva es invertir el control.

1.  **El Backend (`api/index.ts`) debe ser el cerebro:** El código debe gestionar el estado de la conversación (ej. `esperando_estudio`, `esperando_fecha`, etc.).
2.  **La IA se convierte en una herramienta de NLU (Natural Language Understanding):**
    *   Se crea un `prompt` y un modelo de IA muy simple con una única misión: **extraer el nombre de un estudio médico de una frase.**
    *   Se mantiene el bot conversacional actual, pero se le quitan las herramientas de búsqueda para que no intente actuar por su cuenta.
3.  **Nuevo Flujo Lógico en el Backend:**
    *   **Paso A:** El backend recibe el mensaje del usuario.
    *   **Paso B:** Lo envía a la IA "extractora".
    *   **Paso C (Decisión Lógica):**
        *   **SI** la IA extrajo un nombre de estudio, el código del backend ejecuta la función `search_studies`, formatea la respuesta y se la envía al usuario.
        *   **SI NO** se extrajo un nombre, el código del backend pasa el mensaje a la IA "conversacional" para que continúe el flujo de la conversación (ej. seguir pidiendo datos para la cita).

Este modelo es robusto porque la decisión crítica ya no depende de la interpretación de la IA, sino de un `if/else` en el código, que es 100% predecible.
