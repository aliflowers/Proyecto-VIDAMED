// Script para insertar datos de prueba para el sistema de IA de resultados
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Variables de entorno faltantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function insertTestData() {
  console.log('🧪 Insertando datos de prueba para IA...\n');

  try {
    // 1. Insertar paciente
    const { data: patient, error: patientError } = await supabase
      .from('pacientes')
      .upsert({
        cedula_identidad: '98765432',
        nombres: 'Carlos',
        apellidos: 'Rodríguez',
        email: 'carlos.rodriguez@email.com',
        telefono: '+58412987654',
        direccion: 'Maracaibo, Venezuela'
      })
      .select()
      .single();

    if (patientError) {
      console.error('❌ Error insertando paciente:', patientError);
      return;
    }

    console.log('✅ Paciente insertado:', patient.nombres, patient.apellidos);

    // 2. Insertar estudio
    const { data: study, error: studyError } = await supabase
      .from('estudios')
      .upsert({
        id: 1,
        nombre: 'Hemograma Completo',
        categoria: 'Hematología',
        descripcion: 'Análisis completo de sangre periférica',
        preparacion: 'Ayuno de 8 horas',
        costo_usd: 15.0,
        costo_bs: 2775.0,
        tasa_bcv: 185,
        tiempo_entrega: '2 horas',
        campos_formulario: [
          {"name": "globulos_rojos", "label": "Glóbulos Rojos", "type": "number", "unit": "x10^6/μL", "min_normal": 4.2, "max_normal": 5.4},
          {"name": "hemoglobina", "label": "Hemoglobina", "type": "number", "unit": "g/dL", "min_normal": 12.0, "max_normal": 16.0},
          {"name": "hematocrito", "label": "Hematocrito", "type": "number", "unit": "%", "min_normal": 37.0, "max_normal": 52.0},
          {"name": "globulos_blancos", "label": "Glóbulos Blancos", "type": "number", "unit": "/μL", "min_normal": 4500, "max_normal": 11000},
          {"name": "plaquetas", "label": "Plaquetas", "type": "number", "unit": "x10^3/μL", "min_normal": 150, "max_normal": 450}
        ],
        veces_realizado: 0,
        background_url: 'https://example.com/hemo-bg.jpg'
      })
      .select()
      .single();

    if (studyError) {
      console.error('❌ Error insertando estudio:', studyError);
      return;
    }

    console.log('✅ Estudio insertado:', study.nombre);

    // 3. Insertar resultado con valores anormales (anemia)
    const resultData1 = {
      tipo: 'manual',
      valores: {
        globulos_rojos: 3.8,
        hemoglobina: 9.5,
        hematocrito: 32.0,
        globulos_blancos: 6200,
        plaquetas: 280
      },
      paciente_nombres: patient.nombres,
      paciente_apellidos: patient.apellidos,
      paciente_cedula: patient.cedula_identidad,
      fecha_ingreso_manual: new Date().toISOString()
    };

    const { data: result1, error: result1Error } = await supabase
      .from('resultados_pacientes')
      .insert({
        paciente_id: patient.id,
        estudio_id: study.id,
        resultado_data: resultData1
      })
      .select()
      .single();

    if (result1Error) {
      console.error('❌ Error insertando resultado 1:', result1Error);
      return;
    }

    console.log('✅ Resultado 1 insertado (ID:', result1.id, ') - Valores anormales');

    // 4. Insertar otro resultado con valores normales
    const resultData2 = {
      tipo: 'manual',
      valores: {
        globulos_rojos: 4.8,
        hemoglobina: 14.2,
        hematocrito: 42.0,
        globulos_blancos: 7000,
        plaquetas: 320
      },
      paciente_nombres: patient.nombres,
      paciente_apellidos: patient.apellidos,
      paciente_cedula: patient.cedula_identidad,
      fecha_ingreso_manual: new Date(Date.now() - 86400000).toISOString() // Ayer
    };

    const { data: result2, error: result2Error } = await supabase
      .from('resultados_pacientes')
      .insert({
        paciente_id: patient.id,
        estudio_id: study.id,
        resultado_data: resultData2
      })
      .select()
      .single();

    if (result2Error) {
      console.error('❌ Error insertando resultado 2:', result2Error);
      return;
    }

    console.log('✅ Resultado 2 insertado (ID:', result2.id, ') - Valores normales');

    console.log('\n🎉 DATOS DE PRUEBA INSERTADOS EXITOSAMENTE!');
    console.log('\n📋 IDs importantes para testing:');
    console.log('- Paciente ID:', patient.id);
    console.log('- Estudio ID:', study.id);
    console.log('- Resultado anormal (supuesto anemia):', result1.id);
    console.log('- Resultado normal:', result2.id);

    console.log('\n🤖 Ahora puedes probar el endpoint /api/interpretar con result_id:', result1.id, 'o', result2.id);

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

insertTestData();
