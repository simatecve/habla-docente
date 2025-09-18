-- Modificar tabla mensajes_whatsapp para usar nombre_instancia en lugar de instancia_id
-- Fecha: 2025-01-16

-- Eliminar la restricción de clave foránea existente con instancias
ALTER TABLE mensajes_whatsapp 
DROP CONSTRAINT IF EXISTS mensajes_whatsapp_instancia_id_fkey;

-- Eliminar índices existentes
DROP INDEX IF EXISTS idx_mensajes_instancia_numero;
DROP INDEX IF EXISTS idx_mensajes_conversacion_fecha;
DROP INDEX IF EXISTS idx_mensajes_whatsapp_id;

-- Cambiar el tipo de columna de UUID a TEXT
ALTER TABLE mensajes_whatsapp 
ALTER COLUMN instancia_id TYPE TEXT;

-- Renombrar la columna para mayor claridad
ALTER TABLE mensajes_whatsapp 
RENAME COLUMN instancia_id TO nombre_instancia;

-- Recrear índices con el nombre actualizado
CREATE INDEX idx_mensajes_nombre_instancia_numero 
ON mensajes_whatsapp(nombre_instancia, numero_whatsapp);

CREATE INDEX idx_mensajes_conversacion_fecha 
ON mensajes_whatsapp(conversacion_id, created_at DESC);

CREATE INDEX idx_mensajes_whatsapp_id 
ON mensajes_whatsapp(mensaje_id_whatsapp);

CREATE INDEX idx_mensajes_nombre_instancia_fecha 
ON mensajes_whatsapp(nombre_instancia, created_at DESC);

-- Actualizar comentarios
COMMENT ON COLUMN mensajes_whatsapp.nombre_instancia IS 'Nombre de la instancia de WhatsApp (texto)';

-- Actualizar las políticas RLS existentes
DROP POLICY IF EXISTS "mensajes_select_policy" ON mensajes_whatsapp;
DROP POLICY IF EXISTS "mensajes_insert_policy" ON mensajes_whatsapp;
DROP POLICY IF EXISTS "mensajes_update_policy" ON mensajes_whatsapp;
DROP POLICY IF EXISTS "mensajes_delete_policy" ON mensajes_whatsapp;

-- Recrear políticas RLS
CREATE POLICY "mensajes_select_policy" ON mensajes_whatsapp
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "mensajes_insert_policy" ON mensajes_whatsapp
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "mensajes_update_policy" ON mensajes_whatsapp
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "mensajes_delete_policy" ON mensajes_whatsapp
    FOR DELETE USING (auth.uid() = user_id);