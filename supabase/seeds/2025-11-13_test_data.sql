-- Datos de prueba SIMPLIFICADOS para probar endpoint /api/interpretar
-- Solo lo esencial para IA: paciente + estudio + resultado

-- Insertar paciente de prueba
INSERT INTO pacientes (nombres, apellidos, cedula_identidad, email, telefono, direccion)
SELECT 'Ana', 'García', '12345678', 'ana.garcia@email.com', '+58412345678', 'Caracas, Venezuela'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE cedula_identidad = '12345678');

-- Insertar estudio de prueba (Hemograma completo)
INSERT INTO estudios (nombre, categoria, descripcion, preparacion, costo_usd, costo_bs, tasa_bcv, tiempo_entrega, campos_formulario, veces_realizado, background_url)
SELECT 'Hemograma Completo', 'Hematología', 'Análisis completo de sangre periférica', 'Ayuno de 8 horas', 15.0, 2775.0, 185, '2 horas',
'[
  {"name": "globulos_rojos", "label": "Glóbulos Rojos", "type": "number", "unit": "x10^6/μL", "min_normal": 4.2, "max_normal": 5.4},
  {"name": "hemoglobina", "label": "Hemoglobina", "type": "number", "unit": "g/dL", "min_normal": 12.0, "max_normal": 16.0},
  {"name": "hematocrito", "label": "Hematocrito", "type": "number", "unit": "%", "min_normal": 37.0, "max_normal": 52.0},
  {"name": "globulos_blancos", "label": "Glóbulos Blancos", "type": "number", "unit": "/μL", "min_normal": 4500, "max_normal": 11000},
  {"name": "plaquetas", "label": "Plaquetas", "type": "number", "unit": "x10^3/μL", "min_normal": 150, "max_normal": 450}
]'::jsonb, 0, 'https://example.com/hemo-bg.jpg'
WHERE NOT EXISTS (SELECT 1 FROM estudios WHERE nombre = 'Hemograma Completo');

-- Crear una instancia del script Node para insertar resultados directamente
-- Dado que no podemos usar funciones RPC complejas, solo insertaremos los datos básicos
