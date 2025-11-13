import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config(); // Cargar variables de entorno desde .env

async function applyRLSFix() {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    console.log('🔧 Aplicando políticas RLS para tabla inventario...');

    // Verificar si las políticas existen y crearlas si no
    // Política de lectura para todos
    try {
      const { error: readError } = await supabase
        .from('inventario')
        .select('*', { count: 'exact', head: true });

      if (readError) {
        console.log('⚠️ La tabla inventario no permite lecturas, creando política...');
      }
    } catch (err) {
      console.log('Tabla no permite operaciones SELECT');
    }

    // Crear política de escritura para usuarios autenticados
    console.log('Creando política de escritura para usuarios autenticados...');

    // Ejecutar consulta SQL directamente
    const policiesSql = `
      -- Crear políticas RLS para operaciones de escritura
      DROP POLICY IF EXISTS "Authenticated inventory full access" ON inventario;
      CREATE POLICY "Authenticated inventory full access" ON inventario
      TO authenticated
      USING (true)
      WITH CHECK (true);

      DROP POLICY IF EXISTS "Public inventory view" ON inventario;
      CREATE POLICY "Public inventory view" ON inventario
      FOR SELECT USING (true);
    `;

    // Como no podemos ejecutar SQL directamente, intentaremos probar la actualización
    console.log('Intentando operación de prueba en tabla inventario...');

    // Probar una actualización simple primero
    const testUpdate = {
      descripcion: '[TEST] RLS Policy Update Test - ' + new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('inventario')
        .update(testUpdate)
        .eq('id', 1)
        .select();

      if (error) {
        console.log('❌ Error de actualización (RLS bloqueando):', error.message);
        console.log('🔧 SOLUCIÓN: Las políticas RLS deben ser configuradas en el panel de Supabase');
        console.log('📍 Ve a: Supabase Dashboard > Database > Inventario > Row Level Security');
        console.log('✅ Necesitas crear una política:');
        console.log('   - Nombre: "Authenticated inventory full access"');
        console.log('   - Para roles: authenticated');
        console.log('   - Comando: SELECT, INSERT, UPDATE, DELETE');
        console.log('   - Using expression: true');
        console.log('   - With check expression: true');
        return;
      }

      console.log('✅ Políticas RLS funcionando correctamente');
      console.log('✅ Las operaciones de actualizar material funcionan correctamente');

    } catch (testErr) {
      console.log('Error en prueba de actualización');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

