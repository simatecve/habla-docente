-- Modificar tabla conversaciones_whatsapp para usar nombre_instancia en lugar de instancia_id
-- Fecha: 2025-01-16

-- Eliminar la restricción de clave foránea existente
ALTER TABLE conversaciones_whatsapp 
DROP CONSTRAINT IF EXISTS conversaciones_whatsapp_instancia_id_fkey;

-- Eliminar el índice existente
DROP INDEX IF EXISTS idx_conversaciones_instancia_numero;

-- Cambiar el tipo de columna de UUID a TEXT
ALTER TABLE conversaciones_whatsapp 
ALTER COLUMN instancia_id TYPE TEXT;

-- Renombrar la columna para mayor claridad
ALTER TABLE conversaciones_whatsapp 
RENAME COLUMN instancia_id TO nombre_instancia;

-- Crear nuevo índice con el nombre actualizado
CREATE INDEX idx_conversaciones_nombre_instancia_numero 
ON conversaciones_whatsapp(nombre_instancia, numero_whatsapp);

-- Actualizar la restricción única
ALTER TABLE conversaciones_whatsapp 
DROP CONSTRAINT IF EXISTS conversaciones_whatsapp_instancia_id_numero_whatsapp_key;

ALTER TABLE conversaciones_whatsapp 
ADD CONSTRAINT conversaciones_whatsapp_nombre_instancia_numero_whatsapp_key 
UNIQUE (nombre_instancia, numero_whatsapp);

-- Actualizar comentarios
COMMENT ON COLUMN conversaciones_whatsapp.nombre_instancia IS 'Nombre de la instancia de WhatsApp (texto)';

-- Actualizar las políticas RLS existentes
DROP POLICY IF EXISTS "conversaciones_select_policy" ON conversaciones_whatsapp;
DROP POLICY IF EXISTS "conversaciones_insert_policy" ON conversaciones_whatsapp;
DROP POLICY IF EXISTS "conversaciones_update_policy" ON conversaciones_whatsapp;
DROP POLICY IF EXISTS "conversaciones_delete_policy" ON conversaciones_whatsapp;

-- Recrear políticas RLS
CREATE POLICY "conversaciones_select_policy" ON conversaciones_whatsapp
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "conversaciones_insert_policy" ON conversaciones_whatsapp
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversaciones_update_policy" ON conversaciones_whatsapp
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "conversaciones_delete_policy" ON conversaciones_whatsapp
    FOR DELETE USING (auth.uid() = user_id);