// 🚀 MCP Tool: EXECUTE SQL - Ejecutar comandos SQL en Supabase
// Equivalente a execute_sql del servidor MCP de Supabase con accesos completos

// Credenciales del proyecto VIDAMED (usando SERVICE KEY para acceso completo)
const supabaseUrl = "https://pmcobxdfirhydkbatthd.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtY29ieGRmaXJoeWRrYmF0dGhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI3MzU1MywiZXhwIjoyMDY3ODQ5NTUzfQ.6SbeMd4INeqcktmgK1QkQv5RANKbXImXvPOk0HmebP4";

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';

// Cliente Supabase con SERVICE KEY (acceso total, bypass RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function provideSqlInstructions() {
  console.log('🚀 INSTRUCCIONES PARA EJECUTAR SQL EN SUPABASE\n');
  console.log('❌ La función deduct_inventory_materials no existe en la base de datos.\n');

  try {
    // Leer archivo SQL
    console.log('📄 Leyendo archivo fix_results_materials.sql...');
    const sqlContent = await fs.readFile('./fix_results_materials.sql', 'utf8');
    console.log(`✅ Archivo SQL cargado (${sqlContent.length} caracteres)\n`);

    // Mostrar instrucciones claras
    console.log('🔧 PARA SOLUCIONAR EL ERROR 400 DEL SERVIDOR:');
    console.log('');
    console.log('1. 📊 Ve al dashboard de Supabase:');
    console.log('   https://supabase.com/dashboard');
    console.log('');
    console.log('2. 📁 Selecciona tu proyecto: pmcobxdfirhydkbatthd');
    console.log('');
    console.log('3. 🛠️  Ve a la sección "SQL Editor"');
    console.log('');
    console.log('4. 📝 Crea una nueva query y pega el siguiente SQL completo:');
    console.log('');
    console.log('==================================================');
    console.log(sqlContent);
    console.log('==================================================');
    console.log('');
    console.log('5. ▶️  Presiona "Run" para ejecutar');
    console.log('');
    console.log('6. ✅ Verifica que aparezca el mensaje de éxito');
    console.log('');
    console.log('7. 🔄 Después de ejecutar, prueba guardar un resultado en la app');
    console.log('');
    console.log('📋 ¿POR QUÉ FALLÓ EL GUARDADO?');
    console.log('   - La función deduct_inventory_materials no existe');
    console.log('   - El archivo SQL no ha sido ejecutado en la base de datos');
    console.log('   - Los materiales no se pueden descontar sin esta función');
    console.log('');
    console.log('⚡ Una vez ejecutado el SQL, la aplicación funcionará correctamente.');

  } catch (error) {
    console.log(`❌ Error al leer archivo SQL: ${error.message}`);
  }

  console.log('\n🔒 Instrucciones listas - ejecutar SQL manualmente en Supabase\n');
}

provideSqlInstructions();
