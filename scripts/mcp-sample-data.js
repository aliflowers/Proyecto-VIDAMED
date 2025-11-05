// 📋 MCP Tool: SAMPLE DATA - Vista previa de datos en tablas
// Equivalente a una herramienta de vista previa del servidor MCP de Supabase

// Credenciales del proyecto VIDAMED
const supabaseUrl = "https://pmcobxdfirhydkbatthd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtY29ieGRmaXJoeWRrYmF0dGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNzM1NTMsImV4cCI6MjA2Nzg0OTU1M30.XIT0V98hXEVKRjB70_hLM1PgZQXFTXoQahcGtjtNMtA";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getSampleData() {
  console.log('📋 MCP: SAMPLE DATA - Vista previa de datos en tablas\n');

  // Tablas reales en español con sus campos correctos
  const tablesToPreview = [
    {
      name: 'citas',
      description: 'Citas médicas',
      sampleFields: ['id', 'paciente_id', 'fecha_cita', 'estudios_solicitados', 'ubicacion']
    },
    {
      name: 'pacientes',
      description: 'Pacientes',
      sampleFields: ['nombres', 'apellidos', 'cedula_identidad', 'email', 'telefono']
    },
    {
      name: 'estudios',
      description: 'Estudios médicos',
      sampleFields: ['id', 'nombre', 'categoria', 'precio_usd', 'tiempo_entrega']
    },
    {
      name: 'inventario',
      description: 'Inventario médico',
      sampleFields: ['id', 'nombre', 'cantidad_stock', 'unidad_medida', 'stock_minimo']
    },
    {
      name: 'testimonios',
      description: 'Testimonios',
      sampleFields: ['id', 'texto', 'autor', 'ciudad', 'is_approved']
    },
    {
      name: 'site_config',
      description: 'Configuración del sitio',
      sampleFields: ['id', 'tasa_bcv_global']
    }
  ];

  for (const table of tablesToPreview) {
    console.log(`📊 Vista previa de '${table.name}' (${table.description}):`);
    try {
      // Obtener estadísticas y muestra de datos
      const { data, error, count } = await supabase
        .from(table.name)
        .select(table.sampleFields.join(', '))
        .limit(3)
        .order('created_at', { ascending: false });

      if (error) {
        console.log(`  ❌ Error: ${error.message}`);
      } else if (data && data.length > 0) {
        console.log(`  ✅ Total: ${count || 0} registros | Mostrando: ${data.length} ejemplos`);

        data.forEach((row, index) => {
          console.log(`    ${index + 1}. ${formatDataPreview(row)}`);
        });
      } else {
        console.log(`  ℹ️  Tabla vacía o sin datos accesibles`);
      }
    } catch (err) {
      console.log(`  ❌ Error al consultar: ${err.message}`);
    }
    console.log('');
  }

  // Resumen estadístico general
  console.log('📈 RESUMEN ESTADÍSTICO GENERAL:');
  try {
    const summaryTables = ['studies', 'patients', 'posts', 'inventory'];
    console.log('Conteo de registros por tabla:');

    for (const table of summaryTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          console.log(`  📊 ${table}: ${count || 0} registros`);
        }
      } catch (err) {
        // Ignorar errores en resumen
      }
    }
  } catch (err) {
    // Ignorar errores en resumen
  }

  console.log('\n🔒 Solo lectura - vista previa de datos sin modificaciones\n');
}

// Función auxiliar para formatear la vista previa de datos
function formatDataPreview(row) {
  const preview = Object.entries(row)
    .map(([key, value]) => {
      let displayValue = value;
      if (typeof value === 'string' && value.length > 30) {
        displayValue = value.substring(0, 30) + '...';
      } else if (value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/))) {
        displayValue = new Date(value).toLocaleDateString();
      }
      return `${key}: ${displayValue}`;
    })
    .join(' | ');

  return preview;
}

getSampleData();
