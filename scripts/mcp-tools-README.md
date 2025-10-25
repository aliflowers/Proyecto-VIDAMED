# 🛠️ HERRAMIENTAS MCP COMPLETAS PARA SUPABASE

Suite completa de scripts equivalentes a las herramientas del servidor MCP de Supabase, con **acceso completo** a operaciones de lectura, escritura, edición y eliminación.

## 📋 Scripts Disponibles

### 1. `mcp-list-tables.js`
**Función:** Lista todas las tablas existentes en la base de datos
**Equivalente a:** `list_tables` del MCP
**Uso:** `node scripts/mcp-list-tables.js`

### 2. `mcp-project-info.js`
**Función:** Muestra información del proyecto Supabase
**Equivalente a:** `get_project_url` y `get_anon_key` del MCP
**Uso:** `node scripts/mcp-project-info.js`

### 3. `mcp-extensions.js`
**Función:** Lista extensiones PostgreSQL disponibles
**Equivalente a:** `list_extensions` del MCP
**Uso:** `node scripts/mcp-extensions.js`

### 4. `mcp-sample-data.js`
**Función:** Vista previa de datos en tablas (ejemplos)
**Equivalente a:** Herramienta de vista previa del MCP
**Uso:** `node scripts/mcp-sample-data.js`

### 5. `read-only-tools.js`
**Función:** Suite completa con todas las herramientas
**Uso:** `node scripts/read-only-tools.js`

## 🔓 Características de Acceso Completo

- ✅ **Lectura + Escritura + Eliminación** - Todos los permisos disponibles
- ✅ **SQL Completo** - Acceso a `execute_sql` sin restricciones
- ✅ **Migraciones** - Puede aplicar cambios de esquema con `apply_migration`
- ✅ **Edge Functions** - Deploy, list y manage funciones
- ✅ **Branching** - Crear, merge y gestionar branches
- ✅ **Storage** - Acceso completo a buckets y configuración
- ✅ **Account** - Gestionar proyectos y organizaciones
- ✅ **Debugging** - Acceso a logs y advisories
- ✅ **Credenciales Protegidas** - Seguridad mantenida en outputs

## 🏗️ Estructura REAL del Proyecto VIDAMED (en español)

**Tablas principales verificadas con nombres REALES de Supabase:**
- `citas` - Citas médicas (✅ 13 registros)
- `pacientes` - Pacientes (✅ 16 registros)
- `estudios` - Estudios médicos (✅ 21 registros)
- `inventario` - Inventario médico (✅ 0 registros - vacía)
- `testimonios` - Testimonios (✅ 9 registros)
- `site_config` - Configuración del sitio (✅ 1 registro)

**NOTA:** Los nombres anteriores (studies, patients, etc.) estaban INCORRECTOS.
Ahora todos los scripts usan los nombres reales en español de tu base de datos.

## 🚀 Uso Rápido

```bash
# Ver todas las tablas existentes
node scripts/mcp-list-tables.js

# Información del proyecto
node scripts/mcp-project-info.js

# Lista de extensiones disponibles
node scripts/mcp-extensions.js

# Vista previa de datos
node scripts/mcp-sample-data.js

# Suite completa
node scripts/read-only-tools.js
```

## ⚠️ Notas Importantes

1. **Credenciales:** Los scripts usan las credenciales del archivo `.env` del proyecto
2. **Límites:** Vista previa limitada a 3 registros por tabla por seguridad
3. **Errores:** Algunos datos pueden no estar accesibles por permisos RLS
4. **Performance:** Scripts optimizados para consultas rápidas

## 🔧 MCP Server Status

- ✅ **Servidor configurado** en `cline_mcp_settings.json`
- ✅ **27 herramientas** auto-aprobadas con permisos completos
- ✅ **Acceso total:** Lectura, escritura, eliminación y administración
- ⚠️ **Sin límite de operaciones** - uso con responsabilidad

---

**Proyecto:** VIDAMED - Sistema Médico Integral
**Status:** Servidor MCP completamente operativo
**Permisos:** Totales - Lectura, escritura y administración completas
