-- Agregar materiales de prueba al inventario para testing
-- Necesarios para probar el descuento de stock automático

-- Agregar materiales básicos de laboratorio
INSERT INTO inventario (
    nombre,
    descripcion,
    categoria,
    sku,
    cantidad_stock,
    unidad_medida,
    stock_minimo,
    unidades_por_caja,
    precio_unitario,
    precio_caja,
    ubicacion,
    proveedor,
    fecha_caducidad,
    lote,
    notas
) VALUES
-- 🩸 Materiales hematológicos
(
    'Tubos Vacutainer EDTA',
    'Tubos de vacío con anticoagulante EDTA para hemogramas',
    'Hematología',
    'TUBE-EDTA-01',
    50,
    'unidades',
    10,
    100,
    0.5,
    45.0,
    'Frigorífico A-1',
    'Vacutainer Corp',
    '2026-12-31',
    'LOT-EDTA-2025-1',
    'Temperatura: 4°C. No agitar después de recogida.'
),
(
    'Fórmulas de dilución manual',
    'Concentrados para dilución manual de muestras sanguíneas',
    'Hematología',
    'DIL-BCP-02',
    25,
    'cajas',
    5,
    50,
    12.0,
    580.0,
    'Estante Hematología',
    'LabSolutions Inc',
    '2027-06-30',
    'LOT-BCP-2025-2',
    'Para uso exclusivo en contador de células automatizado.'
),
(
    'Reactivos para química sanguínea',
    'Panel básico de reactivos químicos para análisis metabólico',
    'Química',
    'CHEM-PANEL-03',
    15,
    'kits',
    3,
    20,
    25.0,
    480.0,
    'Refrigerador de reactivos',
    'Clinical Diagnostics',
    '2025-12-31',
    'LOT-CHEM-2025-3',
    'Mantener a temperatura controlada. Calibración mensual requerida.'
),
(
    'Jeringas desechables 5ml',
    'Jeringas estériles para extracción de muestras',
    'Material general',
    'SYR-5ML-04',
    30,
    'cajas',
    6,
    100,
    0.15,
    12.5,
    'Gabinete general',
    'MediSupplies',
    '2026-08-15',
    'LOT-SYR-2025-4',
    'Agujas incluidas. Desechar después de uso único.'
),
(
    'Contenedores para orina',
    'Frascos estériles para muestras de orina',
    'Uroanálisis',
    'URI-CONT-05',
    100,
    'unidades',
    20,
    200,
    0.1,
    18.0,
    'Área de recepción',
    'MetalPlas Industries',
    '2027-01-31',
    'LOT-URI-2025-5',
    'Capacidad: 100ml. Esterilización UV semanal.'
)
ON CONFLICT (sku) DO NOTHING;

-- Asegurar que el trigger de calculo automático funcione
-- (Ya debería estar configurado el trigger calcular_unidades_totales)

-- Mostrar materiales insertados
SELECT
    nombre,
    sku,
    cantidad_stock,
    unidades_por_caja,
    cantidad_stock * unidades_por_caja as unidades_totales_calculadas
FROM inventario
WHERE sku IN (
    'TUBE-EDTA-01',
    'DIL-BCP-02',
    'CHEM-PANEL-03',
    'SYR-5ML-04',
    'URI-CONT-05'
)
ORDER BY sku;

-- Mensaje de confirmación
SELECT '✅ Materiales de prueba agregados al inventario correctamente' as resultado;
