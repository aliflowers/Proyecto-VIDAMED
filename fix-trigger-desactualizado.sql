-- CORRECCIÓN DEFINITIVA DEL TRIGGER PARA PERMITIR DESCUENTO DIRECTO DE UNIDADES_TOTALES

-- Eliminar trigger conflictivo
DROP TRIGGER IF EXISTS trigger_calcular_unidades_totales_inteligente ON inventario;

-- Crear nueva función que permite cambios directos en unidades_totales
CREATE OR REPLACE FUNCTION calcular_unidades_totales_inteligente()
RETURNS TRIGGER AS $$
BEGIN
    -- NUEVA LÓGICA SIMPLIFICADA:
    -- - Si unidades_totales fue modificada directamente, respetar ese valor
    -- - Solo recalcular cuando unidades_totales NO fue modificada (viene NULL)
    -- - Esto permite que deduct_inventory_materials modifique unidades_totales sin conflicto

    IF (TG_OP = 'INSERT') OR
       (TG_OP = 'UPDATE' AND OLD.unidades_totales = NEW.unidades_totales) THEN
        -- Si unidades_totales no cambió, recalcular automáticamente
        NEW.unidades_totales := GREATEST(0, COALESCE(NEW.cantidad_stock, 0) * COALESCE(NEW.unidades_por_caja, 1));
    END IF;
    -- Si unidades_totales cambió (como en deduct_inventory_materials), mantener el nuevo valor

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear trigger con la nueva lógica
CREATE TRIGGER trigger_calcular_unidades_totales_inteligente
    BEFORE INSERT OR UPDATE ON inventario
    FOR EACH ROW EXECUTE FUNCTION calcular_unidades_totales_inteligente();
