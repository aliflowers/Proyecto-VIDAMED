// Script rápido para probar el endpoint /api/interpretar sin insertar datos

async function testEndpoint() {
  console.log('🧪 Probando endpoint /api/interpretar...\n');

  try {
    // Probar con diferentes result IDs posibles
    const possibleIds = [1, 2, 3, 4, 5];

    for (const resultId of possibleIds) {
      console.log(`🔍 Probando result_id: ${resultId}`);

      try {
        const response = await fetch('http://localhost:3001/api/interpretar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ result_id: resultId })
        });

        console.log(`   Status: ${response.status}`);

        if (response.status === 200) {
          const data = await response.json();
          console.log(`   ✅ Success: ${data.interpretation?.length || 0} caracteres`);
          console.log(`   🎉 FUNCIONANDO! Resultado encontrado con ID: ${resultId}`);
          return;
        } else {
          const errorData = await response.json().catch(() => ({ error: 'No se pudo parsear JSON' }));
          console.log(`   ❌ Error: ${errorData.error}`);
        }
      } catch (fetchError) {
        console.log(`   ❌ Fetch error: ${fetchError.message}`);
      }

      console.log('');
    }

    console.log('❌ Ninguno de los IDs de prueba funcionó. Revisa tus datos EN BD o corrige el endpoint.');
    console.log('\n🔍 CONSEJOS:');
    console.log('1. Verifica que hayas executado fix_results_materials.sql');
    console.log('2. Asegúrate que hay resultados en resultados_pacientes');
    console.log('3. Ejecuta node scripts/advanced-table-scan.js resultados_pacientes');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testEndpoint();
