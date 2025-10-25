// 🏗️ MCP Tool: LIST TABLES - Lista todas las tablas existentes
// Equivalente a list_tables del servidor MCP de Supabase

// Credenciales del proyecto VIDAMED
const supabaseUrl = "https://pmcobxdfirhydkbatthd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtY29ieGRmaXJoeWRrYmF0dGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNzM1NTMsImV4cCI6MjA2Nzg0OTU1M30.XIT0V98hXEVKRjB70_hLM1PgZQXFTXoQahcGtjtNMtA";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  console.log('📋 MCP: LIST TABLES - Equivalente a list_tables\n');

const projectTables = [
    'citas', 'pacientes', 'estudios', 'inventario', 'testimonios', 'site_config'
  ];

  const tableDescriptions = {
    'citas': 'Citas médicas',
    'pacientes': 'Pacientes',
    'estudios': 'Estudios médicos',
    'inventario': 'Inventario médico',
    'testimonios': 'Testimonios',
    'site_config': 'Configuración del sitio'
  };

  console.log('📊 Verificando existencia de tablas:');
  let existingCount = 0;

  for (const tableName of projectTables) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`  ❌ ${tableName} - No existe`);
      } else {
        console.log(`  ✅ ${tableName} - Existe (${count || 0} registros)`);
        existingCount++;
      }
    } catch (err) {
      console.log(`  ❌ ${tableName} - Error al verificar`);
    }
  }

  console.log(`\n📈 Resumen: ${existingCount}/${projectTables.length} tablas existen`);
  console.log('🔒 Solo lectura - ningún dato modificado\n');
}

listTables();
