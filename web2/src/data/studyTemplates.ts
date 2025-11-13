export const studyTemplates = [
  // Categoria: Hematología
  {
    value: 'hematologia-completa',
    label: 'Hematología Completa',
    category: 'Hematología',
    description: 'Análisis completo de las células sanguíneas para evaluar la salud general y detectar una amplia gama de trastornos.',
    preparation: 'Generalmente no requiere ayuno, pero siga las indicaciones de su médico.',
    campos_formulario: [
      { name: 'leucocitos', label: 'Leucocitos', unit: '10^3/uL', reference: '4.5 - 11.0' },
      { name: 'hematies', label: 'Hematíes', unit: '10^6/uL', reference: '4.2 - 5.9' },
      { name: 'hemoglobina', label: 'Hemoglobina', unit: 'g/dL', reference: '12.0 - 17.5' },
      { name: 'hematocrito', label: 'Hematocrito', unit: '%', reference: '36 - 52' },
      { name: 'vcm', label: 'VCM', unit: 'fL', reference: '80 - 100' },
      { name: 'hcm', label: 'HCM', unit: 'pg', reference: '27 - 34' },
      { name: 'chcm', label: 'CHCM', unit: 'g/dL', reference: '32 - 36' },
      { name: 'rdw', label: 'RDW', unit: '%', reference: '11.5 - 14.5' },
      { name: 'plaquetas', label: 'Plaquetas', unit: '10^3/uL', reference: '150 - 450' },
    ]
  },
  {
    value: 'vsg',
    label: 'VSG (Velocidad de Sedimentación Globular)',
    category: 'Hematología',
    description: 'Mide la velocidad con la que los glóbulos rojos se asientan, indicando posible inflamación en el cuerpo.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'vsg', label: 'VSG', unit: 'mm/h', reference: '0 - 20' }
    ]
  },
  {
    value: 'coagulacion',
    label: 'Coagulación (TPT, PT, INR)',
    category: 'Hematología',
    description: 'Evalúa la capacidad de la sangre para coagularse correctamente.',
    preparation: 'Informe a su médico sobre cualquier medicamento anticoagulante que esté tomando.',
    campos_formulario: [
      { name: 'tpt', label: 'TPT', unit: 'seg', reference: '25 - 35' },
      { name: 'pt', label: 'PT', unit: 'seg', reference: '11 - 13.5' },
      { name: 'inr', label: 'INR', unit: '', reference: '0.8 - 1.1' }
    ]
  },
  {
    value: 'grupo-sanguineo',
    label: 'Grupo Sanguíneo y Factor Rh',
    category: 'Hematología',
    description: 'Determina el tipo de sangre (A, B, AB, O) y el factor Rh (positivo o negativo).',
    preparation: 'No requiere preparación especial.',
    campos_formulario: [
      { name: 'grupo_sanguineo', label: 'Grupo Sanguíneo', unit: '', reference: 'N/A' },
      { name: 'factor_rh', label: 'Factor Rh', unit: '', reference: 'N/A' }
    ]
  },
  {
    value: 'reticulocitos',
    label: 'Reticulocitos',
    category: 'Hematología',
    description: 'Mide el porcentaje de glóbulos rojos jóvenes para evaluar la función de la médula ósea.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'reticulocitos', label: 'Reticulocitos', unit: '%', reference: '0.5 - 2.5' }
    ]
  },
  {
    value: 'coombs-directo',
    label: 'Coombs Directo',
    category: 'Hematología',
    description: 'Detecta anticuerpos adheridos a la superficie de los glóbulos rojos.',
    preparation: 'No requiere preparación especial.',
    campos_formulario: [
      { name: 'coombs_directo', label: 'Coombs Directo', unit: '', reference: 'Negativo' }
    ]
  },
  {
    value: 'coombs-indirecto',
    label: 'Coombs Indirecto',
    category: 'Hematología',
    description: 'Detecta anticuerpos contra los glóbulos rojos que están libres en el suero.',
    preparation: 'No requiere preparación especial.',
    campos_formulario: [
      { name: 'coombs_indirecto', label: 'Coombs Indirecto', unit: '', reference: 'Negativo' }
    ]
  },
  {
    value: 'frotis-sangre',
    label: 'Frotis de Sangre Periférica',
    category: 'Hematología',
    description: 'Examen microscópico de una muestra de sangre para observar la morfología de las células sanguíneas.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'observaciones', label: 'Observaciones Microscópicas', unit: '', reference: 'N/A' }
    ]
  },
  {
    value: 'tiempo-coagulacion-sangria',
    label: 'Tiempo de Coagulación y Sangría',
    category: 'Hematología',
    description: 'Mide el tiempo que tarda la sangre en coagular y en detenerse una hemorragia superficial.',
    preparation: 'Informe sobre medicamentos que afecten la coagulación.',
    campos_formulario: [
      { name: 'tiempo_coagulacion', label: 'Tiempo de Coagulación', unit: 'min', reference: '5 - 10' },
      { name: 'tiempo_sangria', label: 'Tiempo de Sangría', unit: 'min', reference: '1 - 9' }
    ]
  },
  {
    value: 'lupus-anticoagulante',
    label: 'Lupus Anticoagulante',
    category: 'Hematología',
    description: 'Prueba para detectar anticuerpos que pueden aumentar el riesgo de coágulos sanguíneos.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'lupus_anticoagulante', label: 'Lupus Anticoagulante', unit: '', reference: 'Negativo' }
    ]
  },
  // Categoria: Química Clínica y Metabolismo
  {
    value: 'glicemia',
    label: 'Glicemia',
    category: 'Química Clínica y Metabolismo',
    description: 'Mide el nivel de glucosa (azúcar) en la sangre.',
    preparation: 'Ayuno de 8 a 12 horas.',
    campos_formulario: [
      { name: 'glucosa', label: 'Glucosa', unit: 'mg/dL', reference: '70 - 100' }
    ]
  },
  {
    value: 'urea',
    label: 'Urea',
    category: 'Química Clínica y Metabolismo',
    description: 'Mide la cantidad de urea en la sangre, un producto de desecho del metabolismo de las proteínas.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'urea', label: 'Urea', unit: 'mg/dL', reference: '10 - 50' }
    ]
  },
  {
    value: 'creatinina',
    label: 'Creatinina',
    category: 'Química Clínica y Metabolismo',
    description: 'Mide el nivel de creatinina en la sangre, un indicador de la función renal.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'creatinina', label: 'Creatinina', unit: 'mg/dL', reference: '0.6 - 1.3' }
    ]
  },
  {
    value: 'acido-urico',
    label: 'Ácido Úrico',
    category: 'Química Clínica y Metabolismo',
    description: 'Mide los niveles de ácido úrico en la sangre. Niveles altos pueden causar gota.',
    preparation: 'Puede requerir ayuno. Consulte a su médico.',
    campos_formulario: [
      { name: 'acido_urico', label: 'Ácido Úrico', unit: 'mg/dL', reference: '2.4 - 7.0' }
    ]
  },
  {
    value: 'colesterol-total',
    label: 'Colesterol Total',
    category: 'Química Clínica y Metabolismo',
    description: 'Mide la cantidad total de colesterol en la sangre.',
    preparation: 'Ayuno de 9 a 12 horas.',
    campos_formulario: [
      { name: 'colesterol_total', label: 'Colesterol Total', unit: 'mg/dL', reference: '< 200' }
    ]
  },
  {
    value: 'colesterol-hdl',
    label: 'Colesterol HDL',
    category: 'Química Clínica y Metabolismo',
    description: 'Mide el "colesterol bueno", que ayuda a eliminar el colesterol de las arterias.',
    preparation: 'Ayuno de 9 a 12 horas.',
    campos_formulario: [
      { name: 'hdl', label: 'Colesterol HDL', unit: 'mg/dL', reference: '> 40' }
    ]
  },
  {
    value: 'colesterol-ldl',
    label: 'Colesterol LDL',
    category: 'Química Clínica y Metabolismo',
    description: 'Mide el "colesterol malo", que puede acumularse en las arterias.',
    preparation: 'Ayuno de 9 a 12 horas.',
    campos_formulario: [
      { name: 'ldl', label: 'Colesterol LDL', unit: 'mg/dL', reference: '< 100' }
    ]
  },
  {
    value: 'trigliceridos',
    label: 'Triglicéridos',
    category: 'Química Clínica y Metabolismo',
    description: 'Mide un tipo de grasa en la sangre.',
    preparation: 'Ayuno de 9 a 12 horas.',
    campos_formulario: [
      { name: 'trigliceridos', label: 'Triglicéridos', unit: 'mg/dL', reference: '< 150' }
    ]
  },
  {
    value: 'perfil-lipidico',
    label: 'Perfil Lipídico',
    category: 'Química Clínica y Metabolismo',
    description: 'Grupo de pruebas para medir los niveles de colesterol y triglicéridos.',
    preparation: 'Ayuno de 9 a 12 horas.',
    campos_formulario: [
      { name: 'colesterol_total', label: 'Colesterol Total', unit: 'mg/dL', reference: '< 200' },
      { name: 'hdl', label: 'Colesterol HDL', unit: 'mg/dL', reference: '> 40' },
      { name: 'ldl', label: 'Colesterol LDL', unit: 'mg/dL', reference: '< 100' },
      { name: 'vldl', label: 'Colesterol VLDL', unit: 'mg/dL', reference: '5 - 40' },
      { name: 'trigliceridos', label: 'Triglicéridos', unit: 'mg/dL', reference: '< 150' }
    ]
  },
  {
    value: 'perfil-hepatico',
    label: 'Perfil Hepático',
    category: 'Química Clínica y Metabolismo',
    description: 'Evalúa la función del hígado midiendo enzimas y proteínas hepáticas.',
    preparation: 'Puede requerir ayuno. Consulte a su médico.',
    campos_formulario: [
      { name: 'tgo', label: 'TGO (AST)', unit: 'U/L', reference: '5 - 40' },
      { name: 'tgp', label: 'TGP (ALT)', unit: 'U/L', reference: '7 - 56' },
      { name: 'bilirrubina_total', label: 'Bilirrubina Total', unit: 'mg/dL', reference: '0.1 - 1.2' },
      { name: 'fosfatasa_alcalina', label: 'Fosfatasa Alcalina', unit: 'U/L', reference: '44 - 147' }
    ]
  },
  {
    value: 'perfil-renal',
    label: 'Perfil Renal',
    category: 'Química Clínica y Metabolismo',
    description: 'Evalúa la función de los riñones.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'urea', label: 'Urea', unit: 'mg/dL', reference: '10 - 50' },
      { name: 'creatinina', label: 'Creatinina', unit: 'mg/dL', reference: '0.6 - 1.3' },
      { name: 'acido_urico', label: 'Ácido Úrico', unit: 'mg/dL', reference: '2.4 - 7.0' }
    ]
  },
  {
    value: 'proteinas-totales-fraccionadas',
    label: 'Proteínas Totales y Fraccionadas',
    category: 'Química Clínica y Metabolismo',
    description: 'Mide la cantidad total de proteínas en la sangre y las divide en albúmina y globulina.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'proteinas_totales', label: 'Proteínas Totales', unit: 'g/dL', reference: '6.0 - 8.3' },
      { name: 'albumina', label: 'Albúmina', unit: 'g/dL', reference: '3.4 - 5.4' },
      { name: 'globulina', label: 'Globulina', unit: 'g/dL', reference: '2.0 - 3.5' }
    ]
  },
  {
    value: 'electrolitos',
    label: 'Electrolitos (Sodio, Potasio, Cloro)',
    category: 'Química Clínica y Metabolismo',
    description: 'Mide los minerales esenciales para el equilibrio de líquidos y la función nerviosa y muscular.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'sodio', label: 'Sodio', unit: 'mEq/L', reference: '135 - 145' },
      { name: 'potasio', label: 'Potasio', unit: 'mEq/L', reference: '3.5 - 5.1' },
      { name: 'cloro', label: 'Cloro', unit: 'mEq/L', reference: '98 - 107' }
    ]
  },
  {
    value: 'calcio',
    label: 'Calcio',
    category: 'Química Clínica y Metabolismo',
    description: 'Mide el nivel de calcio en la sangre, importante para huesos, músculos y nervios.',
    preparation: 'Puede requerir ayuno.',
    campos_formulario: [
      { name: 'calcio', label: 'Calcio', unit: 'mg/dL', reference: '8.6 - 10.3' }
    ]
  },
  {
    value: 'fosforo',
    label: 'Fósforo',
    category: 'Química Clínica y Metabolismo',
    description: 'Mide el nivel de fósforo en la sangre, relacionado con la salud ósea y la energía celular.',
    preparation: 'Puede requerir ayuno.',
    campos_formulario: [
      { name: 'fosforo', label: 'Fósforo', unit: 'mg/dL', reference: '2.5 - 4.5' }
    ]
  },
  {
    value: 'magnesio',
    label: 'Magnesio',
    category: 'Química Clínica y Metabolismo',
    description: 'Mide el nivel de magnesio, crucial para la función muscular y nerviosa.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'magnesio', label: 'Magnesio', unit: 'mg/dL', reference: '1.7 - 2.2' }
    ]
  },
  {
    value: 'ldh',
    label: 'LDH (Lactato Deshidrogenasa)',
    category: 'Química Clínica y Metabolismo',
    description: 'Enzima que se encuentra en muchos tejidos del cuerpo. Niveles elevados pueden indicar daño tisular.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'ldh', label: 'LDH', unit: 'U/L', reference: '140 - 280' }
    ]
  },
  {
    value: 'ck-mb',
    label: 'CK-MB (Creatina Kinasa MB)',
    category: 'Química Clínica y Metabolismo',
    description: 'Enzima específica del corazón, utilizada para diagnosticar infartos de miocardio.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'ck_mb', label: 'CK-MB', unit: 'ng/mL', reference: '0 - 5' }
    ]
  },
  {
    value: 'ggt',
    label: 'Gama Glutamil Transferasa (GGT)',
    category: 'Química Clínica y Metabolismo',
    description: 'Enzima hepática sensible, útil para detectar enfermedades del hígado y de las vías biliares.',
    preparation: 'Puede requerir ayuno y abstinencia de alcohol.',
    campos_formulario: [
      { name: 'ggt', label: 'GGT', unit: 'U/L', reference: '5 - 40' }
    ]
  },
  {
    value: 'amilasa',
    label: 'Amilasa',
    category: 'Química Clínica y Metabolismo',
    description: 'Enzima producida por el páncreas y las glándulas salivales. Útil para diagnosticar pancreatitis.',
    preparation: 'Puede requerir ayuno.',
    campos_formulario: [
      { name: 'amilasa', label: 'Amilasa', unit: 'U/L', reference: '30 - 110' }
    ]
  },
  {
    value: 'lipasa',
    label: 'Lipasa',
    category: 'Química Clínica y Metabolismo',
    description: 'Enzima pancreática más específica que la amilasa para el diagnóstico de pancreatitis.',
    preparation: 'Puede requerir ayuno.',
    campos_formulario: [
      { name: 'lipasa', label: 'Lipasa', unit: 'U/L', reference: '0 - 160' }
    ]
  },
  // Categoria: Inmunología y Serología
  {
    value: 'vdrl',
    label: 'VDRL',
    category: 'Inmunología y Serología',
    description: 'Prueba de detección para la sífilis.',
    preparation: 'No requiere preparación especial.',
    campos_formulario: [
      { name: 'vdrl', label: 'VDRL', unit: '', reference: 'No Reactivo' }
    ]
  },
  {
    value: 'pcr',
    label: 'PCR (Proteína C Reactiva)',
    category: 'Inmunología y Serología',
    description: 'Mide el nivel de proteína C reactiva, un marcador de inflamación en el cuerpo.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'pcr', label: 'PCR', unit: 'mg/L', reference: '< 3.0' }
    ]
  },
  {
    value: 'factor-reumatoide',
    label: 'Factor Reumatoide',
    category: 'Inmunología y Serología',
    description: 'Detecta anticuerpos asociados con la artritis reumatoide y otras enfermedades autoinmunes.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'factor_reumatoide', label: 'Factor Reumatoide', unit: 'IU/mL', reference: '< 15' }
    ]
  },
  {
    value: 'anti-ccp',
    label: 'Anticuerpos Anti-CCP',
    category: 'Inmunología y Serología',
    description: 'Prueba específica para el diagnóstico de la artritis reumatoide.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'anti_ccp', label: 'Anti-CCP', unit: 'U/mL', reference: '< 20' }
    ]
  },
  {
    value: 'aso',
    label: 'Anti-estreptolisina O (ASO)',
    category: 'Inmunología y Serología',
    description: 'Detecta anticuerpos contra la bacteria estreptococo, útil para diagnosticar fiebres reumáticas.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'aso', label: 'ASO', unit: 'UI/mL', reference: '< 200' }
    ]
  },
  {
    value: 'monotest',
    label: 'Monotest (Mononucleosis)',
    category: 'Inmunología y Serología',
    description: 'Prueba para detectar anticuerpos contra el virus de Epstein-Barr, causante de la mononucleosis.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'monotest', label: 'Monotest', unit: '', reference: 'Negativo' }
    ]
  },
  {
    value: 'vih',
    label: 'Prueba de VIH (4ta Generación)',
    category: 'Inmunología y Serología',
    description: 'Detecta tanto anticuerpos contra el VIH como el antígeno p24, permitiendo un diagnóstico más temprano.',
    preparation: 'No requiere preparación especial.',
    campos_formulario: [
      { name: 'vih', label: 'Resultado VIH', unit: '', reference: 'No Reactivo' }
    ]
  },
  {
    value: 'hepatitis-b',
    label: 'Marcadores de Hepatitis B (HBsAg, Anti-HBc)',
    category: 'Inmunología y Serología',
    description: 'Pruebas para detectar infección actual o pasada por el virus de la Hepatitis B.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'hbsag', label: 'HBsAg', unit: '', reference: 'No Reactivo' },
      { name: 'anti_hbc', label: 'Anti-HBc Total', unit: '', reference: 'No Reactivo' }
    ]
  },
  {
    value: 'hepatitis-c',
    label: 'Marcadores de Hepatitis C (Anti-HCV)',
    category: 'Inmunología y Serología',
    description: 'Detecta anticuerpos contra el virus de la Hepatitis C.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'anti_hcv', label: 'Anti-HCV', unit: '', reference: 'No Reactivo' }
    ]
  },
  {
    value: 'hepatitis-a',
    label: 'Anti-Hepatitis A (IgM, IgG)',
    category: 'Inmunología y Serología',
    description: 'Detecta anticuerpos para infección reciente (IgM) o pasada/vacunación (IgG) contra Hepatitis A.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'anti_hav_igm', label: 'Anti-HAV IgM', unit: '', reference: 'No Reactivo' },
      { name: 'anti_hav_igg', label: 'Anti-HAV IgG', unit: '', reference: 'No Reactivo' }
    ]
  },
  {
    value: 'prueba-embarazo-hcg',
    label: 'Prueba de Embarazo (HCG)',
    category: 'Inmunología y Serología',
    description: 'Mide la hormona gonadotropina coriónica humana (hCG) en sangre para confirmar el embarazo.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'hcg_cuantitativa', label: 'hCG Cuantitativa', unit: 'mIU/mL', reference: '< 5 (No embarazada)' }
    ]
  },
  {
    value: 'toxoplasma',
    label: 'Toxoplasma (IgM, IgG)',
    category: 'Inmunología y Serología',
    description: 'Detecta anticuerpos para infección reciente (IgM) o pasada (IgG) por Toxoplasma gondii.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'toxo_igm', label: 'Toxoplasma IgM', unit: '', reference: 'No Reactivo' },
      { name: 'toxo_igg', label: 'Toxoplasma IgG', unit: '', reference: 'No Reactivo' }
    ]
  },
  {
    value: 'citomegalovirus',
    label: 'Citomegalovirus (IgM, IgG)',
    category: 'Inmunología y Serología',
    description: 'Detecta anticuerpos para infección reciente (IgM) o pasada (IgG) por Citomegalovirus (CMV).',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'cmv_igm', label: 'CMV IgM', unit: '', reference: 'No Reactivo' },
      { name: 'cmv_igg', label: 'CMV IgG', unit: '', reference: 'No Reactivo' }
    ]
  },
  {
    value: 'rubeola',
    label: 'Rubeola (IgM, IgG)',
    category: 'Inmunología y Serología',
    description: 'Detecta anticuerpos para infección reciente (IgM) o pasada/vacunación (IgG) contra la Rubeola.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'rubeola_igm', label: 'Rubeola IgM', unit: '', reference: 'No Reactivo' },
      { name: 'rubeola_igg', label: 'Rubeola IgG', unit: '', reference: 'No Reactivo' }
    ]
  },
  {
    value: 'herpes',
    label: 'Herpes (HSV 1 y 2)',
    category: 'Inmunología y Serología',
    description: 'Detecta anticuerpos contra los virus del Herpes Simple tipo 1 y 2.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'hsv1_igg', label: 'HSV-1 IgG', unit: '', reference: 'No Reactivo' },
      { name: 'hsv2_igg', label: 'HSV-2 IgG', unit: '', reference: 'No Reactivo' }
    ]
  },
  // Categoria: Hormonas
  {
    value: 'tsh',
    label: 'Hormona Estimulante de la Tiroides (TSH)',
    category: 'Hormonas',
    description: 'Mide la TSH en sangre, clave para diagnosticar trastornos de la tiroides.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'tsh', label: 'TSH', unit: 'uIU/mL', reference: '0.4 - 4.2' }
    ]
  },
  {
    value: 't4-libre',
    label: 'Tiroxina Libre (T4 Libre)',
    category: 'Hormonas',
    description: 'Mide la fracción libre de la hormona T4, que evalúa la función tiroidea.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 't4_libre', label: 'T4 Libre', unit: 'ng/dL', reference: '0.8 - 1.8' }
    ]
  },
  {
    value: 't3-libre',
    label: 'Triyodotironina Libre (T3 Libre)',
    category: 'Hormonas',
    description: 'Mide la fracción libre de la hormona T3.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 't3_libre', label: 'T3 Libre', unit: 'pg/mL', reference: '2.3 - 4.2' }
    ]
  },
  {
    value: 'perfil-tiroideo-completo',
    label: 'Perfil Tiroideo (Completo)',
    category: 'Hormonas',
    description: 'Evaluación exhaustiva de la función tiroidea.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'tsh', label: 'TSH', unit: 'uIU/mL', reference: '0.4 - 4.2' },
      { name: 't4_libre', label: 'T4 Libre', unit: 'ng/dL', reference: '0.8 - 1.8' },
      { name: 't3_libre', label: 'T3 Libre', unit: 'pg/mL', reference: '2.3 - 4.2' },
      { name: 't4_total', label: 'T4 Total', unit: 'µg/dL', reference: '4.5 - 12.5' },
      { name: 't3_total', label: 'T3 Total', unit: 'ng/dL', reference: '80 - 200' }
    ]
  },
  {
    value: 'prolactina',
    label: 'Prolactina',
    category: 'Hormonas',
    description: 'Mide los niveles de la hormona prolactina, relacionada con la producción de leche y la fertilidad.',
    preparation: 'Reposo de 30 minutos antes de la toma de muestra.',
    campos_formulario: [
      { name: 'prolactina', label: 'Prolactina', unit: 'ng/mL', reference: 'Mujeres: < 25, Hombres: < 20' }
    ]
  },
  {
    value: 'cortisol',
    label: 'Cortisol',
    category: 'Hormonas',
    description: 'Mide los niveles de cortisol, la "hormona del estrés".',
    preparation: 'Generalmente se toma por la mañana (AM) y por la tarde (PM).',
    campos_formulario: [
      { name: 'cortisol_am', label: 'Cortisol AM', unit: 'µg/dL', reference: '6.2 - 19.4' },
      { name: 'cortisol_pm', label: 'Cortisol PM', unit: 'µg/dL', reference: '2.3 - 11.9' }
    ]
  },
  {
    value: 'testosterona',
    label: 'Testosterona Total y Libre',
    category: 'Hormonas',
    description: 'Mide los niveles de la principal hormona sexual masculina.',
    preparation: 'Toma de muestra preferiblemente en la mañana.',
    campos_formulario: [
      { name: 'testosterona_total', label: 'Testosterona Total', unit: 'ng/dL', reference: '270 - 1070 (Hombres)' },
      { name: 'testosterona_libre', label: 'Testosterona Libre', unit: 'pg/mL', reference: '9.3 - 26.5 (Hombres)' }
    ]
  },
  {
    value: 'fsh',
    label: 'Hormona Folículo Estimulante (FSH)',
    category: 'Hormonas',
    description: 'Hormona clave para la función reproductiva en hombres y mujeres.',
    preparation: 'Depende del ciclo menstrual en mujeres. Consulte a su médico.',
    campos_formulario: [
      { name: 'fsh', label: 'FSH', unit: 'mIU/mL', reference: 'Variable' }
    ]
  },
  {
    value: 'lh',
    label: 'Hormona Luteinizante (LH)',
    category: 'Hormonas',
    description: 'Hormona que juega un papel crucial en la ovulación y la producción de testosterona.',
    preparation: 'Depende del ciclo menstrual en mujeres. Consulte a su médico.',
    campos_formulario: [
      { name: 'lh', label: 'LH', unit: 'mIU/mL', reference: 'Variable' }
    ]
  },
  {
    value: 'estradiol',
    label: 'Estradiol',
    category: 'Hormonas',
    description: 'Forma principal de estrógeno, la hormona sexual femenina.',
    preparation: 'Depende del ciclo menstrual. Consulte a su médico.',
    campos_formulario: [
      { name: 'estradiol', label: 'Estradiol', unit: 'pg/mL', reference: 'Variable' }
    ]
  },
  {
    value: 'progesterona',
    label: 'Progesterona',
    category: 'Hormonas',
    description: 'Hormona implicada en el ciclo menstrual y el embarazo.',
    preparation: 'Depende del ciclo menstrual. Consulte a su médico.',
    campos_formulario: [
      { name: 'progesterona', label: 'Progesterona', unit: 'ng/mL', reference: 'Variable' }
    ]
  },
  {
    value: 'insulina',
    label: 'Insulina',
    category: 'Hormonas',
    description: 'Mide los niveles de insulina en sangre, clave para el diagnóstico de resistencia a la insulina.',
    preparation: 'Ayuno de 8 a 12 horas.',
    campos_formulario: [
      { name: 'insulina_basal', label: 'Insulina Basal', unit: 'µU/mL', reference: '2.6 - 24.9' }
    ]
  },
  // Categoria: Marcadores Tumorales
  {
    value: 'psa',
    label: 'Antígeno Prostático Específico (PSA) Total y Libre',
    category: 'Marcadores Tumorales',
    description: 'Mide los niveles de PSA, una proteína producida por la próstata. Esencial para la detección del cáncer de próstata.',
    preparation: 'Se recomienda abstinencia sexual y no realizar ejercicio intenso 48 horas antes.',
    campos_formulario: [
      { name: 'psa_total', label: 'PSA Total', unit: 'ng/mL', reference: '< 4.0' },
      { name: 'psa_libre', label: 'PSA Libre', unit: '%', reference: '> 25' }
    ]
  },
  {
    value: 'cea',
    label: 'Antígeno Carcinoembrionario (CEA)',
    category: 'Marcadores Tumorales',
    description: 'Marcador tumoral utilizado en el seguimiento de ciertos tipos de cáncer, especialmente el colorrectal.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'cea', label: 'CEA', unit: 'ng/mL', reference: '< 5.0 (No fumadores)' }
    ]
  },
  {
    value: 'ca-125',
    label: 'Ca 125',
    category: 'Marcadores Tumorales',
    description: 'Marcador tumoral utilizado principalmente en el seguimiento del cáncer de ovario.',
    preparation: 'No requiere preparación especial.',
    campos_formulario: [
      { name: 'ca_125', label: 'Ca 125', unit: 'U/mL', reference: '< 35' }
    ]
  },
  {
    value: 'ca-15-3',
    label: 'Ca 15-3',
    category: 'Marcadores Tumorales',
    description: 'Marcador tumoral utilizado en el seguimiento del cáncer de mama.',
    preparation: 'No requiere preparación especial.',
    campos_formulario: [
      { name: 'ca_15_3', label: 'Ca 15-3', unit: 'U/mL', reference: '< 30' }
    ]
  },
  {
    value: 'ca-19-9',
    label: 'Ca 19-9',
    category: 'Marcadores Tumorales',
    description: 'Marcador tumoral utilizado en el seguimiento del cáncer de páncreas y otros cánceres gastrointestinales.',
    preparation: 'No requiere preparación especial.',
    campos_formulario: [
      { name: 'ca_19_9', label: 'Ca 19-9', unit: 'U/mL', reference: '< 37' }
    ]
  },
  {
    value: 'afp',
    label: 'Alfa Fetoproteína (AFP)',
    category: 'Marcadores Tumorales',
    description: 'Marcador tumoral para cáncer de hígado, testículos y ovarios. También se usa en el embarazo.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'afp', label: 'AFP', unit: 'ng/mL', reference: '< 10' }
    ]
  },
  // Categoria: Uroanálisis y Coproanálisis
  {
    value: 'uroanalisis',
    label: 'Examen de Orina Completo (Uroanálisis)',
    category: 'Uroanálisis y Coproanálisis',
    description: 'Análisis físico, químico y microscópico de la orina para detectar una variedad de trastornos.',
    preparation: 'Se requiere una muestra de la primera orina de la mañana en un recipiente estéril.',
    campos_formulario: [
      { name: 'color', label: 'Color', unit: '', reference: 'Amarillo' },
      { name: 'aspecto', label: 'Aspecto', unit: '', reference: 'Límpido' },
      { name: 'densidad', label: 'Densidad', unit: '', reference: '1.005 - 1.030' },
      { name: 'ph', label: 'pH', unit: '', reference: '4.5 - 8.0' },
      { name: 'proteinas', label: 'Proteínas', unit: '', reference: 'Negativo' },
      { name: 'glucosa', label: 'Glucosa', unit: '', reference: 'Negativo' },
      { name: 'cetonas', label: 'Cetonas', unit: '', reference: 'Negativo' },
      { name: 'sangre', label: 'Sangre', unit: '', reference: 'Negativo' },
      { name: 'leucocitos', label: 'Leucocitos', unit: '/campo', reference: '0 - 5' },
      { name: 'hematies', label: 'Hematíes', unit: '/campo', reference: '0 - 2' }
    ]
  },
  {
    value: 'urocultivo',
    label: 'Cultivo de Orina (Urocultivo)',
    category: 'Uroanálisis y Coproanálisis',
    description: 'Cultivo de una muestra de orina para detectar e identificar bacterias causantes de infecciones urinarias.',
    preparation: 'Se requiere una muestra de orina de la mitad del chorro en un recipiente estéril.',
    campos_formulario: [
      { name: 'resultado', label: 'Resultado del Cultivo', unit: '', reference: 'Sin crecimiento bacteriano' },
      { name: 'antibiograma', label: 'Antibiograma', unit: '', reference: 'N/A' }
    ]
  },
  {
    value: 'coproanalisis',
    label: 'Examen de Heces (Coproanálisis)',
    category: 'Uroanálisis y Coproanálisis',
    description: 'Análisis macroscópico y microscópico de las heces para detectar problemas digestivos.',
    preparation: 'Recoger la muestra en un recipiente limpio y seco.',
    campos_formulario: [
      { name: 'color', label: 'Color', unit: '', reference: 'Marrón' },
      { name: 'consistencia', label: 'Consistencia', unit: '', reference: 'Formada' },
      { name: 'parasitos', label: 'Parásitos', unit: '', reference: 'No se observan' }
    ]
  },
  {
    value: 'coproparasitologico-seriado',
    label: 'Coproparasitológico Seriado',
    category: 'Uroanálisis y Coproanálisis',
    description: 'Análisis de varias muestras de heces para aumentar la probabilidad de detectar parásitos.',
    preparation: 'Generalmente se requieren 3 muestras recogidas en días diferentes.',
    campos_formulario: [
      { name: 'muestra_1', label: 'Muestra 1', unit: '', reference: 'No se observan parásitos' },
      { name: 'muestra_2', label: 'Muestra 2', unit: '', reference: 'No se observan parásitos' },
      { name: 'muestra_3', label: 'Muestra 3', unit: '', reference: 'No se observan parásitos' }
    ]
  },
  {
    value: 'sangre-oculta-heces',
    label: 'Sangre Oculta en Heces',
    category: 'Uroanálisis y Coproanálisis',
    description: 'Prueba para detectar sangre no visible en las heces, un posible signo de sangrado gastrointestinal.',
    preparation: 'Puede requerir una dieta especial unos días antes. Consulte a su médico.',
    campos_formulario: [
      { name: 'afp', label: 'AFP', unit: 'ng/mL', reference: '< 10' }
    ]
  },
  // Categoria: Uroanálisis y Coproanálisis
  {
    value: 'uroanalisis',
    label: 'Examen de Orina Completo (Uroanálisis)',
    category: 'Uroanálisis y Coproanálisis',
    description: 'Análisis físico, químico y microscópico de la orina para detectar una variedad de trastornos.',
    preparation: 'Se requiere una muestra de la primera orina de la mañana en un recipiente estéril.',
    campos_formulario: [
      { name: 'color', label: 'Color', unit: '', reference: 'Amarillo' },
      { name: 'aspecto', label: 'Aspecto', unit: '', reference: 'Límpido' },
      { name: 'densidad', label: 'Densidad', unit: '', reference: '1.005 - 1.030' },
      { name: 'ph', label: 'pH', unit: '', reference: '4.5 - 8.0' },
      { name: 'proteinas', label: 'Proteínas', unit: '', reference: 'Negativo' },
      { name: 'glucosa', label: 'Glucosa', unit: '', reference: 'Negativo' },
      { name: 'cetonas', label: 'Cetonas', unit: '', reference: 'Negativo' },
      { name: 'sangre', label: 'Sangre', unit: '', reference: 'Negativo' },
      { name: 'leucocitos', label: 'Leucocitos', unit: '/campo', reference: '0 - 5' },
      { name: 'hematies', label: 'Hematíes', unit: '/campo', reference: '0 - 2' }
    ]
  },
  {
    value: 'urocultivo',
    label: 'Cultivo de Orina (Urocultivo)',
    category: 'Uroanálisis y Coproanálisis',
    description: 'Cultivo de una muestra de orina para detectar e identificar bacterias causantes de infecciones urinarias.',
    preparation: 'Se requiere una muestra de orina de la mitad del chorro en un recipiente estéril.',
    campos_formulario: [
      { name: 'resultado', label: 'Resultado del Cultivo', unit: '', reference: 'Sin crecimiento bacteriano' },
      { name: 'antibiograma', label: 'Antibiograma', unit: '', reference: 'N/A' }
    ]
  },
  {
    value: 'coproanalisis',
    label: 'Examen de Heces (Coproanálisis)',
    category: 'Uroanálisis y Coproanálisis',
    description: 'Análisis macroscópico y microscópico de las heces para detectar problemas digestivos.',
    preparation: 'Recoger la muestra en un recipiente limpio y seco.',
    campos_formulario: [
      { name: 'color', label: 'Color', unit: '', reference: 'Marrón' },
      { name: 'consistencia', label: 'Consistencia', unit: '', reference: 'Formada' },
      { name: 'parasitos', label: 'Parásitos', unit: '', reference: 'No se observan' }
    ]
  },
  {
    value: 'coproparasitologico-seriado',
    label: 'Coproparasitológico Seriado',
    category: 'Uroanálisis y Coproanálisis',
    description: 'Análisis de varias muestras de heces para aumentar la probabilidad de detectar parásitos.',
    preparation: 'Generalmente se requieren 3 muestras recogidas en días diferentes.',
    campos_formulario: [
      { name: 'muestra_1', label: 'Muestra 1', unit: '', reference: 'No se observan parásitos' },
      { name: 'muestra_2', label: 'Muestra 2', unit: '', reference: 'No se observan parásitos' },
      { name: 'muestra_3', label: 'Muestra 3', unit: '', reference: 'No se observan parásitos' }
    ]
  },
  {
    value: 'sangre-oculta-heces',
    label: 'Sangre Oculta en Heces',
    category: 'Uroanálisis y Coproanálisis',
    description: 'Prueba para detectar sangre no visible en las heces, un posible signo de sangrado gastrointestinal.',
    preparation: 'Puede requerir una dieta especial unos días antes. Consulte a su médico.',
    campos_formulario: [
      { name: 'sangre_oculta', label: 'Sangre Oculta', unit: '', reference: 'Negativo' }
    ]
  },
  // Categoria: Microbiología y Serología de Enfermedades Infecciosas
  {
    value: 'cultivo-secrecion',
    label: 'Cultivo de Secreción',
    category: 'Microbiología y Serología de Enfermedades Infecciosas',
    description: 'Cultivo de una muestra de secreción (heridas, garganta, etc.) para identificar microorganismos.',
    preparation: 'Depende del sitio de la muestra. Siga las indicaciones.',
    campos_formulario: [
      { name: 'resultado', label: 'Resultado del Cultivo', unit: '', reference: 'No se observan microorganismos patógenos' },
      { name: 'antibiograma', label: 'Antibiograma', unit: '', reference: 'N/A' }
    ]
  },
  {
    value: 'cultivo-esputo',
    label: 'Cultivo de Esputo',
    category: 'Microbiología y Serología de Enfermedades Infecciosas',
    description: 'Cultivo de una muestra de esputo para identificar bacterias o hongos en los pulmones, útil para tuberculosis.',
    preparation: 'Se requiere una muestra de la primera expectoración de la mañana.',
    campos_formulario: [
      { name: 'resultado_cultivo', label: 'Resultado del Cultivo', unit: '', reference: 'Sin crecimiento' },
      { name: 'baar', label: 'Baciloscopia (BAAR)', unit: '', reference: 'Negativo' }
    ]
  },
  {
    value: 'coprocultivo',
    label: 'Cultivo de Heces (Coprocultivo)',
    category: 'Microbiología y Serología de Enfermedades Infecciosas',
    description: 'Cultivo de una muestra de heces para detectar bacterias patógenas causantes de infecciones gastrointestinales.',
    preparation: 'Recoger la muestra en un recipiente estéril.',
    campos_formulario: [
      { name: 'resultado_cultivo', label: 'Resultado del Cultivo', unit: '', reference: 'No se aislan patógenos' }
    ]
  },
  {
    value: 'serologia-dengue',
    label: 'Serología para Dengue (NS1, IgM, IgG)',
    category: 'Microbiología y Serología de Enfermedades Infecciosas',
    description: 'Detecta el antígeno NS1 (infección temprana) y anticuerpos IgM (reciente) e IgG (pasada) para el virus del Dengue.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'ns1', label: 'Antígeno NS1', unit: '', reference: 'No Reactivo' },
      { name: 'dengue_igm', label: 'Dengue IgM', unit: '', reference: 'No Reactivo' },
      { name: 'dengue_igg', label: 'Dengue IgG', unit: '', reference: 'No Reactivo' }
    ]
  },
  {
    value: 'serologia-chikungunya',
    label: 'Serología para Chikungunya',
    category: 'Microbiología y Serología de Enfermedades Infecciosas',
    description: 'Detecta anticuerpos IgM e IgG contra el virus Chikungunya.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'chik_igm', label: 'Chikungunya IgM', unit: '', reference: 'No Reactivo' },
      { name: 'chik_igg', label: 'Chikungunya IgG', unit: '', reference: 'No Reactivo' }
    ]
  },
  {
    value: 'serologia-zika',
    label: 'Serología para Zika',
    category: 'Microbiología y Serología de Enfermedades Infecciosas',
    description: 'Detecta anticuerpos IgM e IgG contra el virus Zika.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'zika_igm', label: 'Zika IgM', unit: '', reference: 'No Reactivo' },
      { name: 'zika_igg', label: 'Zika IgG', unit: '', reference: 'No Reactivo' }
    ]
  },
  {
    value: 'gota-gruesa-malaria',
    label: 'Gota Gruesa para Malaria',
    category: 'Microbiología y Serología de Enfermedades Infecciosas',
    description: 'Examen microscópico de una gota de sangre para detectar el parásito de la malaria (Plasmodium).',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'resultado_gota_gruesa', label: 'Resultado Gota Gruesa', unit: '', reference: 'No se observan parásitos' }
    ]
  },
  {
    value: 'test-rapido-malaria',
    label: 'Test Rápido de Malaria',
    category: 'Microbiología y Serología de Enfermedades Infecciosas',
    description: 'Prueba rápida para la detección de antígenos del parásito de la malaria.',
    preparation: 'No requiere ayuno.',
    campos_formulario: [
      { name: 'resultado_test_rapido', label: 'Resultado Test Rápido', unit: '', reference: 'Negativo' }
    ]
  },
  {
    value: 'tuberculosis-baar',
    label: 'Tuberculosis (BAAR)',
    category: 'Microbiología y Serología de Enfermedades Infecciosas',
    description: 'Baciloscopia para detectar bacilos ácido-alcohol resistentes (BAAR), principalmente Mycobacterium tuberculosis.',
    preparation: 'Se requiere muestra de esputo, preferiblemente la primera de la mañana.',
    campos_formulario: [
      { name: 'baar', label: 'Resultado BAAR', unit: '', reference: 'Negativo' }
    ]
  },
  {
    value: 'helicobacter-pylori',
    label: 'Prueba de Helicobacter Pylori',
    category: 'Microbiología y Serología de Enfermedades Infecciosas',
    description: 'Detecta la presencia de la bacteria Helicobacter pylori, asociada a úlceras y gastritis.',
    preparation: 'Puede requerir ayuno, dependiendo si es en heces o aliento.',
    campos_formulario: [
      { name: 'h_pylori', label: 'Resultado H. Pylori', unit: '', reference: 'Negativo' }
    ]
  },
  // Categoria: Otros Estudios Especializados
  {
    value: 'curva-tolerancia-glucosa',
    label: 'Curva de Tolerancia a la Glucosa',
    category: 'Otros Estudios Especializados',
    description: 'Mide la respuesta del cuerpo a una carga de glucosa para diagnosticar diabetes gestacional o prediabetes.',
    preparation: 'Ayuno estricto de 8-12 horas. La prueba dura varias horas.',
    campos_formulario: [
      { name: 'glucosa_basal', label: 'Glucosa Basal', unit: 'mg/dL', reference: '70-100' },
      { name: 'glucosa_60min', label: 'Glucosa 60 min', unit: 'mg/dL', reference: '< 180' },
      { name: 'glucosa_120min', label: 'Glucosa 120 min', unit: 'mg/dL', reference: '< 140' }
    ]
  },
  {
    value: 'espermatograma',
    label: 'Espermatograma',
    category: 'Otros Estudios Especializados',
    description: 'Análisis del semen para evaluar la fertilidad masculina, midiendo cantidad, movilidad y morfología de los espermatozoides.',
    preparation: 'Abstinencia sexual de 2 a 5 días. La muestra debe entregarse en el laboratorio en menos de 1 hora.',
    campos_formulario: [
      { name: 'volumen', label: 'Volumen', unit: 'mL', reference: '>= 1.5' },
      { name: 'concentracion', label: 'Concentración', unit: 'millones/mL', reference: '>= 15' },
      { name: 'movilidad_progresiva', label: 'Movilidad Progresiva', unit: '%', reference: '>= 32' }
    ]
  },
  {
    value: 'analisis-calculos-renales',
    label: 'Análisis de Cálculos Renales',
    category: 'Otros Estudios Especializados',
    description: 'Análisis químico de un cálculo renal expulsado para determinar su composición y prevenir futuros episodios.',
    preparation: 'Recoger el cálculo (piedra) y llevarlo al laboratorio en un recipiente seco.',
    campos_formulario: [
      { name: 'composicion', label: 'Composición Principal', unit: '', reference: 'N/A' }
    ]
  },
  {
    value: 'esteroides',
    label: 'Esteroides',
    category: 'Otros Estudios Especializados',
    description: 'Análisis de niveles de hormonas esteroideas en sangre u orina.',
    preparation: 'Puede requerir ayuno y suspender ciertos medicamentos. Consulte a su médico.',
    campos_formulario: [
      { name: 'dhea', label: 'DHEA-S', unit: 'µg/dL', reference: 'Variable' },
      { name: 'cortisol_libre_urinario', label: 'Cortisol Libre Urinario', unit: 'µg/24h', reference: 'Variable' }
    ]
  },
  {
    value: 'analisis-lcr',
    label: 'Análisis de Líquido Cefalorraquídeo',
    category: 'Otros Estudios Especializados',
    description: 'Examen del líquido que rodea el cerebro y la médula espinal para diagnosticar infecciones o trastornos neurológicos.',
    preparation: 'Procedimiento de punción lumbar realizado por un especialista.',
    campos_formulario: [
      { name: 'aspecto', label: 'Aspecto', unit: '', reference: 'Claro, incoloro' },
      { name: 'proteinas', label: 'Proteínas', unit: 'mg/dL', reference: '15 - 45' },
      { name: 'glucosa', label: 'Glucosa', unit: 'mg/dL', reference: '50 - 80' }
    ]
  },
  {
    value: 'citoquimico-liquidos',
    label: 'Citoquímico de Líquidos Corporales',
    category: 'Otros Estudios Especializados',
    description: 'Análisis de células y componentes químicos en diversos líquidos corporales (pleural, ascítico, etc.).',
    preparation: 'La muestra es obtenida por un médico mediante un procedimiento específico.',
    campos_formulario: [
      { name: 'recuento_celular', label: 'Recuento Celular', unit: '/mm³', reference: 'Variable' },
      { name: 'diferencial', label: 'Diferencial', unit: '%', reference: 'Variable' }
    ]
  },
  {
    value: 'analisis-liquido-sinovial',
    label: 'Análisis de Líquido Sinovial',
    category: 'Otros Estudios Especializados',
    description: 'Examen del líquido de las articulaciones para diagnosticar gota, artritis u otras afecciones articulares.',
    preparation: 'La muestra se obtiene por artrocentesis, realizada por un médico.',
    campos_formulario: [
      { name: 'viscosidad', label: 'Viscosidad', unit: '', reference: 'Alta' },
      { name: 'cristales', label: 'Cristales', unit: '', reference: 'No se observan' }
    ]
  },
  {
    value: 'analisis-liquido-ascitico',
    label: 'Análisis de Líquido Ascítico',
    category: 'Otros Estudios Especializados',
    description: 'Análisis del líquido acumulado en el abdomen para determinar la causa de la ascitis.',
    preparation: 'La muestra se obtiene por paracentesis, realizada por un médico.',
    campos_formulario: [
      { name: 'gasa', label: 'Gradiente de Albúmina Suero-Ascitis (GASA)', unit: '', reference: 'Variable' }
    ]
  },
 
];
