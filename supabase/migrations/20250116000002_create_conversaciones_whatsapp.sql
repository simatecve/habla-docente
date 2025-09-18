-- Crear tabla de conversaciones de WhatsApp
CREATE TABLE conversaciones_whatsapp (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    instancia_id UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
    numero_whatsapp VARCHAR(20) NOT NULL,
    nombre_contacto VARCHAR(255),
    ultimo_mensaje TEXT,
    ultimo_mensaje_fecha TIMESTAMP WITH TIME ZONE,
    direccion_ultimo_mensaje VARCHAR(10) CHECK (direccion_ultimo_mensaje IN ('enviado', 'recibido')),
    mensajes_no_leidos INTEGER DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'activa' CHECK (estado IN ('activa', 'archivada', 'bloqueada')),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX idx_conversaciones_whatsapp_instancia_numero ON conversaciones_whatsapp(instancia_id, numero_whatsapp);
CREATE INDEX idx_conversaciones_whatsapp_user_id ON conversaciones_whatsapp(user_id);
CREATE INDEX idx_conversaciones_whatsapp_ultimo_mensaje_fecha ON conversaciones_whatsapp(ultimo_mensaje_fecha DESC);

-- Crear constraint único para evitar conversaciones duplicadas
CREATE UNIQUE INDEX idx_conversaciones_whatsapp_unique ON conversaciones_whatsapp(instancia_id, numero_whatsapp);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_conversaciones_whatsapp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_conversaciones_whatsapp_updated_at
    BEFORE UPDATE ON conversaciones_whatsapp
    FOR EACH ROW
    EXECUTE FUNCTION update_conversaciones_whatsapp_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE conversaciones_whatsapp ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean sus propias conversaciones
CREATE POLICY "Los usuarios solo pueden ver sus propias conversaciones" ON conversaciones_whatsapp
    FOR ALL USING (auth.uid() = user_id);

-- Comentarios para documentación
COMMENT ON TABLE conversaciones_whatsapp IS 'Tabla para almacenar las conversaciones de WhatsApp por instancia';
COMMENT ON COLUMN conversaciones_whatsapp.instancia_id IS 'ID de la instancia de WhatsApp';
COMMENT ON COLUMN conversaciones_whatsapp.numero_whatsapp IS 'Número de teléfono del contacto (formato internacional)';
COMMENT ON COLUMN conversaciones_whatsapp.nombre_contacto IS 'Nombre del contacto si está disponible';
COMMENT ON COLUMN conversaciones_whatsapp.ultimo_mensaje IS 'Contenido del último mensaje de la conversación';
COMMENT ON COLUMN conversaciones_whatsapp.ultimo_mensaje_fecha IS 'Fecha y hora del último mensaje';
COMMENT ON COLUMN conversaciones_whatsapp.direccion_ultimo_mensaje IS 'Dirección del último mensaje: enviado o recibido';
COMMENT ON COLUMN conversaciones_whatsapp.mensajes_no_leidos IS 'Contador de mensajes no leídos';
COMMENT ON COLUMN conversaciones_whatsapp.estado IS 'Estado de la conversación: activa, archivada, bloqueada';