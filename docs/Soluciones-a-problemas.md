# 📋 **RECOMENDACIÓN PARA VERIFICACIÓN DE ARCHIVOS**

## **🎯 Solicitud al Agente de Desarrollo**

Necesito que realices un **análisis exhaustivo** de todos los archivos TypeScript en `/api` del repositorio `Proyecto-VIDAMED` para clasificarlos correctamente en dos categorías:

---

## **📊 CATEGORÍAS A IDENTIFICAR**

### **Categoría A: ENDPOINTS SERVERLESS (mantener en `/api` sin renombrar)**

**Criterios de identificación:**

1. **Exportan `export default`** con un handler HTTP compatible con Vercel:
   ```typescript
   // Patrón típico de endpoint serverless
   export default async function handler(req, res) { ... }
   // O
   export default async (req: VercelRequest, res: VercelResponse) => { ... }
   ```

2. **NO son importados** por otros archivos (o solo para tipos/tests)

3. **Responden directamente a peticiones HTTP** sin necesidad de routing adicional

4. **Corresponden a rutas dinámicas** de Vercel (ej: `users/[id].ts` → `/api/users/123`)

***

### **Categoría B: UTILIDADES/LÓGICA DE NEGOCIO (renombrar o mover fuera de `/api`)**

**Criterios de identificación:**

1. **Exportan funciones/clases/constantes** para ser usadas por otros archivos:
   ```typescript
   // Patrón típico de módulo interno
   export function processChat(message: string) { ... }
   export class BedrockClient { ... }
   export const config = { ... }
   ```

2. **SON importados** por `api/index.ts` u otros endpoints

3. **NO manejan peticiones HTTP directamente**, solo proveen lógica de negocio

4. **Dependen del routing de Express** (en `api/index.ts`) para ser accesibles vía HTTP

***

## **🔍 INSTRUCCIONES DE VERIFICACIÓN**

### **Paso 1: Analizar cada archivo en `/api`**

Para cada archivo `.ts` en `/api` y sus subdirectorios, verifica:

```bash
# 1. Buscar export default
grep -n "export default" api/**/*.ts

# 2. Buscar imports de cada archivo
grep -r "from './chat'" api/
grep -r "from './interpretar'" api/
grep -r "from './bedrock'" api/
# ... repetir para cada archivo

# 3. Verificar si tiene handler HTTP típico
grep -n "VercelRequest\|VercelResponse\|(req, res)" api/**/*.ts
```

***

### **Paso 2: Clasificar cada archivo**

Crea una tabla con esta estructura:

| Archivo | Tipo de Export | Importado por | Categoría | Acción |
|---------|----------------|---------------|-----------|---------|
| `api/index.ts` | `export default app` (Express) | Ninguno | **Endpoint** | ✅ MANTENER |
| `api/chat.ts` | `export function processChat` | `api/index.ts` | **Utilidad** | ⚠️ RENOMBRAR o MOVER |
| `api/users/[id].ts` | `export default handler` | Ninguno | **Endpoint** | ✅ MANTENER |
| `api/notify/email.ts` | `export default sendEmail` | Ninguno | **Endpoint** | ✅ MANTENER |
| `api/bedrock.ts` | `export class BedrockClient` | `api/chat.ts` | **Utilidad** | ⚠️ RENOMBRAR o MOVER |

***

### **Paso 3: Aplicar acciones según clasificación**

#### **Para archivos CATEGORÍA A (Endpoints):**
✅ **NO modificar** - Dejar en `/api` sin renombrar

#### **Para archivos CATEGORÍA B (Utilidades):**
Elegir UNA de estas dos estrategias:

***

## **🎨 ESTRATEGIAS DE SOLUCIÓN**

### **ESTRATEGIA 1: RENOMBRAR CON PREFIJO `_` (MÁS RÁPIDA)**

**Caracteres que Vercel NO reconoce como funciones serverless:**

Según [documentación oficial de Vercel](https://vercel.com/docs/functions/configuring-functions):

1. **Prefijo `_` (underscore):**
   ```
   api/_chat.ts          ← Vercel IGNORA
   api/_interpretar.ts   ← Vercel IGNORA
   api/_bedrock.ts       ← Vercel IGNORA
   api/_utils/helper.ts  ← Vercel IGNORA
   ```

2. **Prefijo `.` (punto):**
   ```
   api/.config.ts        ← Vercel IGNORA
   api/.helpers.ts       ← Vercel IGNORA
   ```

3. **Sufijo `.d.ts` (definiciones de tipos):**
   ```
   api/types.d.ts        ← Vercel IGNORA
   ```

**Ejemplo de aplicación:**
```bash
# Renombrar archivos de utilidad
git mv api/chat.ts api/_chat.ts
git mv api/interpretar.ts api/_interpretar.ts
git mv api/bedrock.ts api/_bedrock.ts
git mv api/config.ts api/_config.ts

# Actualizar imports en api/index.ts
# De: import { processChat } from './chat'
# A:  import { processChat } from './_chat'
```

**Ventajas:**
- ⚡ Rápido (solo renombrar y actualizar imports)
- 🔄 Reversible fácilmente
- 📁 Mantiene estructura actual
- ⏱️ 10-15 minutos de trabajo

**Desventajas:**
- 🤔 Nomenclatura menos semántica (prefijo `_` puede confundir)

***

### **ESTRATEGIA 2: MOVER A `/server` (MÁS ORGANIZADA)**

**Estructura recomendada:**
```
proyecto/
├── api/                    ← Solo endpoints HTTP reales
│   ├── index.ts           ✅ Endpoint principal
│   ├── users/
│   │   ├── index.ts       ✅ GET/POST /api/users
│   │   ├── [id].ts        ✅ GET/PUT/DELETE /api/users/123
│   │   └── [id]/
│   │       └── permissions.ts ✅ /api/users/123/permissions
│   ├── notify/
│   │   └── email.ts       ✅ POST /api/notify/email
│   └── ...
└── server/                 ← Lógica de negocio
    ├── services/
    │   ├── chat.ts        🔧 Lógica del chat
    │   ├── interpretar.ts 🔧 Lógica de interpretación
    │   └── blog.ts        🔧 Generación de posts
    ├── clients/
    │   └── bedrock.ts     🔧 Cliente AWS Bedrock
    └── config/
        └── index.ts       🔧 Configuración
```

**Ejemplo de aplicación:**
```bash
# Crear estructura
mkdir -p server/services
mkdir -p server/clients
mkdir -p server/config

# Mover archivos
git mv api/chat.ts server/services/chat.ts
git mv api/interpretar.ts server/services/interpretar.ts
git mv api/bedrock.ts server/clients/bedrock.ts
git mv api/config.ts server/config/index.ts

# Actualizar imports en api/index.ts
# De: import { processChat } from './chat'
# A:  import { processChat } from '../server/services/chat'
```

**Ventajas:**
- 📂 Mejor organización del código
- 🎯 Separación clara de responsabilidades
- 📈 Escalabilidad a largo plazo
- 💡 Más semántico y mantenible

**Desventajas:**
- ⏱️ Más tiempo (30-40 minutos)
- 🔧 Más cambios en imports

***

## **✅ VERIFICACIÓN POST-CAMBIOS**

Después de aplicar cualquiera de las estrategias:

```bash
# 1. Compilar TypeScript
npx tsc --noEmit

# 2. Ejecutar localmente
npm run dev

# 3. Probar endpoints críticos
curl http://localhost:5173/api/chat -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'

curl http://localhost:5173/api/interpretar -X POST \
  -H "Content-Type: application/json" \
  -d '{"resultId":"123"}'

# 4. Verificar que TODO funcione igual que antes
```

***

## **🎯 OBJETIVO FINAL**

Reducir de **14 funciones serverless** a **≤12 funciones** manteniendo:
- ✅ Toda la funcionalidad intacta
- ✅ Todos los endpoints accesibles
- ✅ Misma lógica de negocio
- ✅ Sin cambios en el comportamiento

---

## **📝 SOLICITUD ESPECÍFICA AL AGENTE**

Por favor, realiza lo siguiente:

1. ✅ **Analiza cada archivo** en `/api` y sus subdirectorios
2. ✅ **Clasifica** cada uno en Categoría A o B según los criterios
3. ✅ **Crea una tabla** con la clasificación completa
4. ✅ **Recomienda** cuál estrategia (renombrar o mover) es más práctica para este proyecto
5. ✅ **Proporciona** los comandos exactos para implementar la solución
6. ✅ **Verifica** que después de los cambios se mantengan ≤12 funciones serverless

***

## **📚 REFERENCIAS OFICIALES**

- [Vercel: Ignoring Files in Functions](https://vercel.com/docs/functions/configuring-functions#ignoring-files)
- [GitHub Issue: Exclude files from /api](https://github.com/vercel/vercel/discussions/46)
- [Vercel: File System API Routes](https://vercel.com/docs/concepts/functions/serverless-functions/runtimes/node-js#file-system-api-routes)

