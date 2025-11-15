## Resumen del Estado Actual
- Chat UI y flujo:
  - `src/components/ChatWidget.tsx`: envía mensajes vía `useChat` y muestra respuestas.
  - `src/hooks/useChat.ts`: POST a `/api/chat` con historial filtrado del saludo inicial.
- Backend Bedrock:
  - `api/_chat.ts`: orquestador con Amazon Bedrock (OpenAI‑compatible). Herramientas:
    - `getStudiesInfo` → RPC `search_studies` (consulta estudios) en `api/_chat.ts:291–302`.
    - `getAvailability`, `getAvailableHours` y `scheduleAppointment` (citas) en `api/_chat.ts:339–616`.
  - Clasificador de intención y extractor:
    - Prompt clasificador en `api/_chat.ts:97`.
    - Prompt extractor de estudio en `api/_chat.ts:99`.
  - Prompt conversacional (slot‑filling rígido) en `api/_chat.ts:159–202`.
  - Config Bedrock y temperatura baja: `api/_chat.ts:43` y `api/config.ts:1–4`.
- Voz: `src/components/VoiceChat.tsx` usa ElevenLabs, independiente del NLU.

## Problemas Detectados
- Tono rígido y excesivamente exacto por el prompt conversacional y `temperature` baja.
- Extracción de estudio exige nombre único y exacto; poca tolerancia a errores ortográficos y jerga local.
- `getStudiesInfo` depende de `search_studies` sin fuzzy robusto; se pierde cuando el paciente escribe variantes (“perfil 20”, “prueba del embarazo”, “hemograma”, etc.).
- Comprensión de tiempo/fecha limitada a tokens definidos; falta manejo de expresiones naturales (“mañana”, “en la tarde”, “tipo 9”).

## Objetivos
1) Tono más humano, cercano y adaptado a Venezuela.
2) NLU flexible ante errores ortográficos y sinónimos populares.
3) Búsqueda semántica/fuzzy de estudios sin requerir nombre exacto.
4) Flujo de agenda menos rígido pero igual de confiable.
5) Telemetría y pruebas para validar mejoras.

## Plan Técnico por Fases

### Fase 1: Persona y Tono Conversacional
- Revisar y reescribir `conversationalSystemInstructionText` (`api/_chat.ts:159–202`) para:
  - Mantener estructura de slots pero con lenguaje cercano: breves confirmaciones, empatía, explicaciones cortas.
  - Incluir directrices: comprender jerga venezolana (“porfa”, “chévere”, “vaina”), ortografía con errores comunes y abreviaturas.
  - Permitir micro‑variaciones de estilo; subir `temperature` a 0.5–0.7 en turnos conversacionales (`api/_chat.ts:43`).
- Ajustar el prompt “concise” (`api/_chat.ts:1032–1041`) para mantener calidez y sugerencias claras.

### Fase 2: Extracción de Estudio Amigable
- Reescribir `entityExtractorSystemInstruction` (`api/_chat.ts:99`) para:
  - Aceptar múltiples candidatos y retornar una lista priorizada cuando haya ambigüedad.
  - Entender abreviaturas y slang: “perfil 20”, “TSH”, “prueba embarazo”, “orina general”, “hemograma”.
  - Implementar post‑proceso: seguir usando `sanitizeExtractedStudyName` (`api/_chat.ts:109–124`) pero soportar listas.
- Ampliar `toCanonicalStudyName` (`api/_chat.ts:127–139`) con más sinónimos locales (LDL=“colesterol malo”, HbA1c, glucosa, T3/T4, VIH, VDRL, PCR, etc.).

### Fase 3: Búsqueda Flexible en BD
- Mejorar RPC `search_studies` (Postgres) para fuzzy semántico:
  - Añadir `unaccent` + `pg_trgm` (similaridad y `word_similarity`) y `ILIKE` con n‑gramas.
  - Opcional: tabla `study_aliases` con alias populares; JOIN para resolver a nombre canónico.
  - Opcional: embeddings con `pgvector` (+ Titan Embeddings en Bedrock) para similitud semántica cuando la consulta sea libre.
- Cambiar `getStudiesInfo` (`api/_chat.ts:291–302`) para aceptar lista de candidatos y devolver top‑k resultados con score.

### Fase 4: Comprensión de Fechas y Horas Naturales
- Extender normalizadores:
  - Tokens para “mañana”, “pasado mañana”, “mediodía”, “tipo 9”, “a primera hora” → mapeo a HH:mm y fecha (`api/_chat.ts:250–289`).
  - Preguntas de seguimiento más naturales: si dice “tipo 9”, ofrecer 09:00/09:30 si están libres.

### Fase 5: Herramientas y Flujo con Fallbacks
- En `CONSULTA_ESTUDIO` (`api/_chat.ts:813–913`):
  - Si no hay match exacto, mostrar top coincidencias fuzzy con resumen breve por opción y pedir confirmación.
- En `AGENDAR_CITA` (`api/_chat.ts:915–958` y `971–1049`):
  - Mantener slot‑filling pero permitir confirmaciones naturales (“perfecto”, “dale”, “me sirve”) ya contempladas en `confirmWords` (`api/_chat.ts:79`).
  - Forzar llamada a `getAvailableHours` después de confirmar día; ya está en prompt, reforzar con validación.

### Fase 6: Telemetría y QA
- Log enriquecido con intención, candidatos de estudio y estrategia de búsqueda (exacta/fuzzy/embeddings) usando `logServerAudit` (`api/_chat.ts:909, 948, 983, 1025`).
- Conjunto de pruebas:
  - Unit tests para `normalize`, `toCanonicalStudyName`, split de múltiples estudios.
  - Tests de RPC con entradas con typos y jerga local.
  - Conversaciones E2E simuladas (scripts Bedrock) para validar tono y herramienta.

### Fase 7: Seguridad y Rendimiento
- Asegurar que no se expongan claves; ya se usa `SUPABASE_SERVICE_ROLE_KEY` en backend (`api/_chat.ts:24–41`).
- Rate‑limit y cache liviana en `getStudiesInfo` para consultas repetidas.
- Validar que `scheduleAppointment` siga evitando choques y cumpla el rango de cédula (`api/_chat.ts:526–533, 226–236`).

## Cambios Concretos (Primera Iteración)
1) Prompt conversacional más humano y subida de `temperature` a 0.6 para mensajes conversacionales.
2) Prompt extractor: permitir lista de estudios; post‑proceso soporta múltiples.
3) Ampliar diccionario de sinónimos locales y abreviaturas en `toCanonicalStudyName`.
4) Actualizar `search_studies` para fuzzy con `pg_trgm` y `unaccent`; retornar top‑k.
5) Fallback de sugerencias cuando no haya match claro; respuesta con opciones y solicitud de confirmación.
6) Extender normalización de tiempo (“tipo N”, “en la tarde/mañana”).
7) Pruebas y logs para medir mejoras.

## Entregables
- Prompts revisados y parámetros ajustados.
- RPC y, opcionalmente, tabla `study_aliases` y/o embeddings.
- Código de normalización y sinónimos.
- Pruebas unitarias y E2E.
- Registro ampliado para auditoría y métricas.

## Confirmación
¿Apruebas este plan maestro para empezar a implementarlo en iteraciones, iniciando por prompts y fuzzy search de estudios?