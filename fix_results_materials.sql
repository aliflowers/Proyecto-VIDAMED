-- 🎯 FIX: Módulo de Resultados - Funcionalidad de Materiales
-- Fecha: 24 octubre 2025

-- ✅ 1. Verificar si existe tabla resultado_materiales (relación resulta-material)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resultado_materiales') THEN
        CREATE TABLE resultado_materiales (
            id SERIAL PRIMARY KEY,
            resultado_id INTEGER NOT NULL REFERENCES resultados_pacientes(id) ON DELETE CASCADE,
            material_id INTEGER NOT NULL REFERENCES inventario(id),
            cantidad_usada INTEGER NOT NULL DEFAULT 1,
            fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(resultado_id, material_id)
        );

        CREATE INDEX idx_resultado_materiales_resultado_id ON resultado_materiales(resultado_id);
        CREATE INDEX idx_resultado_materiales_material_id ON resultado_materiales(material_id);
    END IF;
END $$;

-- ✅ 2. Función RPC para descontar múltiples materiales del inventario
CREATE OR REPLACE FUNCTION deduct_inventory_materials(
    materials JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    material_record JSONB;
    current_stock INTEGER;
BEGIN
    -- Procesar cada material
    FOR material_record IN SELECT * FROM jsonb_array_elements(materials)
    LOOP
        -- Verificar stock disponible
        SELECT cantidad_stock INTO current_stock
        FROM inventario
        WHERE id = (material_record->>'id')::INTEGER;

        IF current_stock IS NULL THEN
            RAISE EXCEPTION 'Material ID % no encontrado', (material_record->>'id');
        END IF;

        -- Validar que hay stock suficiente
        IF current_stock < (material_record->>'cantidad_usada')::INTEGER THEN
            RAISE EXCEPTION 'Stock insuficiente para material ID % (necesario: %, disponible: %)',
                          (material_record->>'id'),
                          (material_record->>'cantidad_usada'),
                          current_stock;
        END IF;

        -- Descontar del inventario - CORREGIDO: Descontar de unidades_totales, no de cantidad_stock
        UPDATE inventario
        SET unidades_totales = unidades_totales - (material_record->>'cantidad_usada')::INTEGER,
            ultima_actualizacion_stock = NOW() -- Marcar actualización para que el trigger inteligente funcione
        WHERE id = (material_record->>'id')::INTEGER;

        RAISE NOTICE 'Descontado % unidades del material ID % (unidades_totales)', (material_record->>'cantidad_usada'), (material_record->>'id');
    END LOOP;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error descontando materiales del inventario: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ 3. Función auxiliar para registrar materiales utilizados en un resultado
CREATE OR REPLACE FUNCTION record_result_materials(
    result_id_param INTEGER,
    materials_data JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    material_record JSONB;
    material_id INTEGER;
    cantidad_usada INTEGER;
BEGIN
    -- Insertar materiales utilizados en la tabla de relación
    FOR material_record IN SELECT * FROM jsonb_array_elements(materials_data)
    LOOP
        material_id := (material_record->>'material_id')::INTEGER;
        cantidad_usada := (material_record->>'cantidad_usada')::INTEGER;

        INSERT INTO resultado_materiales (resultado_id, material_id, cantidad_usada)
        VALUES (result_id_param, material_id, cantidad_usada);
    END LOOP;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error registrando materiales utilizados: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ 4. Modificar tabla resultados_pacientes si es necesario
DO $$
BEGIN
    -- Verificar si ya tiene la columna materiales_utilizados
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resultados_pacientes' AND column_name = 'materiales_utilizados') THEN
        -- Agregar columna JSONB para almacenar materiales utilizados (opcional, backup)
        ALTER TABLE resultados_pacientes ADD COLUMN materiales_utilizados JSONB;
        RAISE NOTICE 'Columna materiales_utilizados agregada a resultados_pacientes';
    ELSE
        RAISE NOTICE 'Columna materiales_utilizados ya existe en resultados_pacientes';
    END IF;
END $$;

-- ✅ 5. Política RLS básica para resultado_materiales (si está activo RLS)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        -- Políticas RLS para resultado_materiales
        ALTER TABLE resultado_materiales ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow authenticated users to insert result materials" ON resultado_materiales
        FOR INSERT TO authenticated WITH CHECK (true);

        CREATE POLICY "Allow authenticated users to select result materials" ON resultado_materiales
        FOR SELECT TO authenticated USING (true);

        CREATE POLICY "Allow authenticated users to update result materials" ON resultado_materiales
        FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

        RAISE NOTICE 'Políticas RLS configuradas para resultado_materiales';
    END IF;
END $$;

-- ✅ 6. Comentarios y metadata
COMMENT ON FUNCTION deduct_inventory_materials(JSONB) IS 'Descuenta múltiples materiales del inventario y valida stock suficiente';
COMMENT ON FUNCTION record_result_materials(INTEGER, JSONB) IS 'Registra los materiales utilizados en un resultado médico';
COMMENT ON TABLE resultado_materiales IS 'Relación entre resultados médicos y materiales de laboratorio utilizados';

-- ✅ RESUMEN:
-- 🎯 Función deduct_inventory_materials() creada para descontar stock
-- 🎯 Función record_result_materials() creada para registro de materiales
-- 🎯 Tabla resultado_materiales creada para relacionar resultados-materiales
-- 🎯 Políticas RLS configuradas appropriately
-- 🎯 Columna backup en resultados_pacientes agregada

-- 🚀 Módulo de Resultados listo para implementación completa!
