-- Función RPC para descontar stock de materiales en VIDAMED
-- Se ejecuta automáticamente al guardar resultados médicos

-- Crear función RPC descontar_stock si no existe
CREATE OR REPLACE FUNCTION descontar_stock(
    materiales JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    material_record JSONB;
    material_id TEXT;
    cantidad_usada TEXT;
    cantidad_actual INTEGER;
    cantidad_descontar INTEGER;
BEGIN
    -- Validar que el parámetro no sea null
    IF materiales IS NULL OR jsonb_array_length(materiales) = 0 THEN
        RAISE EXCEPTION 'El parámetro materiales no puede ser null o vacío';
    END IF;

    -- Procesar cada material del array
    FOR material_record IN SELECT * FROM jsonb_array_elements(materiales)
    LOOP
        -- Extraer valores del JSON
        material_id := material_record->>'id';
        cantidad_usada := material_record->>'cantidad_usada';

        -- Validar que los valores existan
        IF material_id IS NULL THEN
            RAISE EXCEPTION 'Material ID no puede ser null';
        END IF;

        -- Convertir cantidad usada a entero
        BEGIN
            cantidad_descontar := cantidad_usada::INTEGER;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Cantidad usada inválida para material %: %', material_id, cantidad_usada;
        END

        -- Verificar que la cantidad sea positiva
        IF cantidad_descontar <= 0 THEN
            RAISE EXCEPTION 'La cantidad a descontar debe ser positiva para material %', material_id;
        END IF;

        -- Obtener el stock actual del material
        SELECT cantidad_stock INTO cantidad_actual
        FROM inventario
        WHERE id::TEXT = material_id;

        IF cantidad_actual IS NULL THEN
            RAISE EXCEPTION 'Material con ID % no encontrado en el inventario', material_id;
        END IF;

        -- Verificar que hay suficiente stock
        IF cantidad_actual < cantidad_descontar THEN
            RAISE EXCEPTION 'Stock insuficiente para material %. Stock actual: %, requerido: %',
                           material_id, cantidad_actual, cantidad_descontar;
        END IF;

        -- Descontar del inventario
        UPDATE inventario
        SET cantidad_stock = cantidad_stock - cantidad_descontar,
            ultima_actualizacion_stock = NOW()
        WHERE id::TEXT = material_id;

        RAISE NOTICE 'Descontados % unidades del material ID: % (stock restante: %)',
                    cantidad_descontar, material_id, cantidad_actual - cantidad_descontar;
    END LOOP;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error descontando stock: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agregar comentario descriptivo
COMMENT ON FUNCTION descontar_stock(JSONB) IS
'Descuenta unidades del inventario para materiales utilizados en estudios médicos.
Parámetro: materiales JSONB array con objetos {"id": "material_id", "cantidad_usada": "numero"}.
Se ejecuta automáticamente al guardar resultados con materiales seleccionados.';

-- Mensaje de éxito
SELECT '✅ Función descontar_stock creada/actualizada exitosamente' as resultado;
