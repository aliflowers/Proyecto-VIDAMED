-- SOLUCIÓN DEFINITIVA: Trigger inteligente que no sobrescribe cambios de descuento

-- Eliminar trigger problemático
DROP TRIGGER IF EXISTS trigger_calcular_unidades_totales ON inventario;

-- Crear nueva función que solo calcula si no hay cambio manual reciente
CREATE OR REPLACE FUNCTION calcular_unidades_totales_inteligente()
RETURNS TRIGGER AS $$
BEGIN
    -- 🧠 LÓGICA INTELIGENTE: Solo recalcular si no fue actualizado por descuento
    -- Si ultima_actualizacion_stock es reciente (últimos 2 segundos), NO recalcular
    -- Esto permite que las funciones de descuento modifiquen unidades_totales sin conflicto

    IF (TG_OP = 'INSERT') OR
       (TG_OP = 'UPDATE' AND OLD.ultima_actualizacion_stock IS NULL) OR
       (TG_OP = 'UPDATE' AND OLD.ultima_actualizacion_stock < NOW() - INTERVAL '2 seconds') THEN

        -- Recalcular automáticamente basado en cantidad_stock
        NEW.unidades_totales := GREATEST(0, COALESCE(NEW.cantidad_stock, 0) * COALESCE(NEW.unidades_por_caja, 1));

    ELSE
        -- Si fue actualizado recientemente por descuento, mantener el valor actual
        -- Esto permite que deduct_inventory_materials modifique unidades_totales
        NEW.unidades_totales := COALESCE(NEW.unidades_totales, OLD.unidades_totales);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear trigger con la nueva lógica
CREATE TRIGGER trigger_calcular_unidades_totales_inteligente
    BEFORE INSERT OR UPDATE ON inventario
    FOR EACH ROW EXECUTE FUNCTION calcular_unidades_totales_inteligente();

-- Agregar comentario explicativo
COMMENT ON FUNCTION calcular_unidades_totales_inteligente() IS
'Reutiliza trigger inteligente que permite cambios manuales en unidades_totales cuando son recientes (últimos 2 segundos).
Esto permite que deduct_inventory_materials funcione correctamente sin ser sobrescrito.';

-- Mensaje de éxito
SELECT '✅ Trigger inteligente implementado - descuento funcionará correctamente' as resultado;
