-- Crear políticas RLS para la tabla inventario
-- Esto corrige el error 400 Bad Request en las actualizaciones

-- Primero verificar si las políticas ya existen
DO $$
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Verificar política de lectura
    SELECT EXISTS(
        SELECT 1 FROM pg_policies
        WHERE tablename = 'inventario'
        AND policyname = 'Public inventory view'
    ) INTO policy_exists;

    IF NOT policy_exists THEN
        CREATE POLICY "Public inventory view" ON inventario
        FOR SELECT USING (true);
        RAISE NOTICE 'Política de lectura creada';
    END IF;

    -- Verificar política de escritura para usuarios autenticados
    SELECT EXISTS(
        SELECT 1 FROM pg_policies
        WHERE tablename = 'inventario'
        AND policyname = 'Authenticated inventory full access'
    ) INTO policy_exists;

    IF NOT policy_exists THEN
        CREATE POLICY "Authenticated inventory full access" ON inventario
        TO authenticated
        USING (true)
        WITH CHECK (true);
        RAISE NOTICE 'Política de escritura creada';
    END IF;
END $$;
