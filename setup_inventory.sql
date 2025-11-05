-- 1. Crear la tabla de inventario
CREATE TABLE inventario (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    imagen_url TEXT,
    cantidad_stock INT NOT NULL DEFAULT 0,
    unidad_medida TEXT,
    fecha_ultima_compra TIMESTAMPTZ,
    costo_ultima_compra_bs NUMERIC,
    costo_ultima_compra_usd NUMERIC,
    proveedor TEXT,
    notas TEXT,
    -- Columna para el umbral de stock bajo
    stock_minimo INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear la tabla de relación estudio-materiales
CREATE TABLE estudio_materiales (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    estudio_id BIGINT REFERENCES public.estudios(id) ON DELETE CASCADE,
    material_id BIGINT REFERENCES public.inventario(id) ON DELETE RESTRICT,
    cantidad_usada INT NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear la función para descontar stock
CREATE OR REPLACE FUNCTION descontar_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE inventario
    SET cantidad_stock = cantidad_stock - NEW.cantidad_usada
    WHERE id = NEW.material_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear el trigger que llama a la función
CREATE TRIGGER trigger_descontar_stock
AFTER INSERT ON estudio_materiales
FOR EACH ROW
EXECUTE FUNCTION descontar_stock();

-- 5. Habilitar Row Level Security (RLS) para las nuevas tablas
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE estudio_materiales ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas de acceso para RLS
-- Permitir a los usuarios autenticados (administradores) leer todo el inventario
CREATE POLICY "Allow authenticated users to read inventory"
ON inventario FOR SELECT
TO authenticated
USING (true);

-- Permitir a los usuarios autenticados (administradores) realizar todas las operaciones en el inventario
CREATE POLICY "Allow full access for authenticated users on inventory"
ON inventario FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Permitir a los usuarios autenticados (administradores) leer los materiales de los estudios
CREATE POLICY "Allow authenticated users to read study materials"
ON estudio_materiales FOR SELECT
TO authenticated
USING (true);

-- Permitir a los usuarios autenticados (administradores) realizar todas las operaciones en los materiales de los estudios
CREATE POLICY "Allow full access for authenticated users on study materials"
ON estudio_materiales FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);