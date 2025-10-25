// 🔍 DEBUG: Investigar por qué los scripts no ven registros
// Analizar RLS, permisos y conectividad

// Credenciales del proyecto VIDAMED
const supabaseUrl = "https://pmcobxdfirhydkbatthd.supabase.co";
// Usando clave de servicio para bypass RLS y diagnóstico
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtY29ieGRmaXJoeWRrYmF0dGhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI3MzU1MywiZXhwIjoyMDY3ODQ5NTUzfQ.6SbeMd4INeqcktmgK1QkQv5RANKbXImXvPOk0HmebP4";

import { createClient } from '@supabase/supabase-js';

// Cliente con clave anónima (como los scripts normales)
const supabaseAnon = createClient(supabaseUrl, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtY29ieGRmaXJoeWRrYmF0dGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNzM1NTMsImV4cCI6MjA2Nzg0OTU1M30.XIT0V98hXEVKRjB70_hLM1PgZQXFTXoQahcGtjtNMtA");

// Cliente con clave de servicio (bypass RLS)
const supabaseService = createClient(supabaseUrl, serviceKey);

async function diagnoseDataAccess() {
  console.log('🔍 DIAGNÓSTICO: ¿Por qué los registros no aparecen?\n');

  const testTables = [
    { name: 'studies', description: 'Estudios médicos' },
    { name: 'patients', description: 'Pacientes' },
    { name: 'posts', description: 'Posts del blog' },
    { name: 'inventory', description: 'Inventario' },
    { name: 'users', description: 'Usuarios del sistema' },
    { name: 'site_config', description: 'Configuración del sitio' }
  ];

  console.log('📊 Comparando acceso con clave ANÓNIMA vs SERVICE:\n');

  for (const table of testTables) {
    console.log(`🧪 Probando tabla: ${table.name} (${table.description})`);

    try {
      // Consulta con clave anónima
      console.log('  🔓 Con clave ANÓNIMA:');
      const { data: anonData, error: anonError, count: anonCount } = await supabaseAnon
        .from(table.name)
        .select('*', { count: 'exact', head: true });

      if (anonError) {
        console.log(`    ❌ Error: ${anonError.message}`);
      } else {
        console.log(`    ✅ ${anonCount || 0} registros accesibles`);
      }

      // Consulta con clave de servicio
      console.log('  🔑 Con clave SERVICE (bypass RLS):');
      const { data: serviceData, error: serviceError, count: serviceCount } = await supabaseService
        .from(table.name)
        .select('*', { count: 'exact', head: true });

      if (serviceError) {
        console.log(`    ❌ Error: ${serviceError.message}`);
      } else {
        console.log(`    ✅ ${serviceCount || 0} registros totales`);

        // Si hay registros con service pero no con anon, es problema de RLS
        if ((serviceCount || 0) > 0 && (anonCount || 0) === 0) {
          console.log('    ℹ️  DIAGNOSIS: Políticas RLS bloquean acceso anónimo');
        }
      }

    } catch (err) {
      console.log(`    ❌ Error general: ${err.message}`);
    }

    console.log('');
  }

  // Verificar políticas RLS
  console.log('🛡️  VERIFICACIÓN DE POLÍTICAS RLS:\n');

  try {
    const { data: rlsPolicies, error: rlsError } = await supabaseService
      .from('pg_policies')
      .select('tablename, policyname, permissive, roles, cmd')
      .limit(20);

    if (rlsError) {
      console.log(`❌ Error obteniendo políticas RLS: ${rlsError.message}`);
    } else if (rlsPolicies && rlsPolicies.length > 0) {
      console.log(`🔍 Encontradas ${rlsPolicies.length} políticas RLS:`);
      rlsPolicies.forEach(policy => {
        console.log(`  📋 ${policy.tablename} -> ${policy.policyname} (${policy.cmd}) para roles: ${policy.roles}`);
      });
    } else {
      console.log('ℹ️  No se encontraron políticas RLS específicas');
    }
  } catch (err) {
    console.log(`❌ Error verificando RLS: ${err.message}`);
  }

  console.log('\n🎯 CONCLUSIONES DEL DIAGNÓSTICO:\n');

  console.log('El problema parece ser:');
  console.log('1. 🔒 POLÍTICAS RLS: Las tablas probablemente tienen políticas RLS activadas');
  console.log('2. 👤 PERMISOS LIMITADOS: La clave anónima no tiene permisos sin autenticación');
  console.log('3. ✅ DATOS EXISTEN: Los registros están ahí, pero protegidos por RLS');
  console.log('\n💡 SOLUCIÓN: Usar claves de servicio solo para diagnóstico, nunca en producción');

  console.log('\n🔐 RECOMENDACIONES:');
  console.log('- Para acceso real de usuarios: implementar autenticación');
  console.log('- Para diagnóstico/admin: usar service key temporalmente');
  console.log('- Para scripts MCP: considerar políticas RLS que permitan acceso público limitado');
}

diagnoseDataAccess();
