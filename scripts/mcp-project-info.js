// 🌐 MCP Tool: PROJECT INFO - Información del proyecto
// Equivalente a get_project_url y get_anon_key del servidor MCP de Supabase

// Credenciales del proyecto VIDAMED
const supabaseUrl = "https://pmcobxdfirhydkbatthd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtY29ieGRmaXJoeWRrYmF0dGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNzM1NTMsImV4cCI6MjA2Nzg0OTU1M30.XIT0V98hXEVKRjB70_hLM1PgZQXFTXoQahcGtjtNMtA";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getProjectInfo() {
  console.log('🌐 MCP: PROJECT INFO - Equivalente a get_project_url y get_anon_key\n');

  console.log('📋 Información del proyecto Supabase:');
  console.log(`  📍 URL del proyecto: ${supabaseUrl}`);
  console.log(`  🔑 Clave anónima: ${supabaseKey.substring(0, 20)}... (truncada)`);
  console.log(`  🆔 Project Reference: pmcobxdfirhydkbatthd`);
  console.log(`  🌍 Región: us-east-1 (AWS)`);

  // Verificar conexión y estadísticas básicas
  console.log('\n🔍 Verificando estado de conexión:');
  try {
    const tables = ['users', 'studies', 'posts'];
    let connectedTables = 0;

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          console.log(`  ✅ Tabla '${table}': ${count || 0} registros`);
          connectedTables++;
        } else {
          console.log(`  ❌ Tabla '${table}': ${error.message}`);
        }
      } catch (err) {
        console.log(`  ❌ Tabla '${table}': Error de conexión`);
      }
    }

    console.log(`\n📊 Estado: ${connectedTables}/${tables.length} tablas accesibles`);

    if (connectedTables > 0) {
      console.log('✅ Proyecto conectado y operativo');
    } else {
      console.log('⚠️  Conexión limitada - verificar permisos');
    }

  } catch (error) {
    console.log(`❌ Error general de conexión: ${error.message}`);
  }

  console.log('\n🔒 Solo lectura - ningún dato modificado\n');
}

getProjectInfo();
