-- Crear tabla de mensajes de WhatsApp
CREATE TABLE mensajes_whatsapp (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversacion_id UUID NOT NULL REFERENCES conversaciones_whatsapp(id) ON DELETE CASCADE,
    instancia_id UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
    numero_whatsapp VARCHAR(20) NOT NULL,
    direccion VARCHAR(10) NOT NULL CHECK (direccion IN ('enviado', 'recibido')),
    mensaje TEXT NOT NULL,
    tipo_mensaje VARCHAR(20) DEFAULT 'texto' CHECK (tipo_mensaje IN ('texto', 'imagen', 'video', 'audio', 'documento', 'ubicacion', 'contacto', 'sticker')),
    url_adjunto TEXT,
    nombre_archivo VARCHAR(255),
    tamaño_archivo BIGINT,
    mime_type VARCHAR(100),
    mensaje_id_whatsapp VARCHAR(255), -- ID único del mensaje en WhatsApp
    mensaje_respuesta_id UUID REFERENCES mensajes_whatsapp(id), -- Para respuestas a mensajes
    estado_mensaje VARCHAR(20) DEFAULT 'enviado' CHECK (estado_mensaje IN ('enviando', 'enviado', 'entregado', 'leido', 'fallido')),
    leido BOOLEAN DEFAULT FALSE,
    fecha_leido TIMESTAMP WITH TIME ZONE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    metadata JSONB, -- Para datos adicionales del mensaje
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX idx_mensajes_whatsapp_conversacion_id ON mensajes_whatsapp(conversacion_id);
CREATE INDEX idx_mensajes_whatsapp_instancia_numero ON mensajes_whatsapp(instancia_id, numero_whatsapp);
CREATE INDEX idx_mensajes_whatsapp_user_id ON mensajes_whatsapp(user_id);
CREATE INDEX idx_mensajes_whatsapp_created_at ON mensajes_whatsapp(created_at DESC);
CREATE INDEX idx_mensajes_whatsapp_direccion ON mensajes_whatsapp(direccion);
CREATE INDEX idx_mensajes_whatsapp_tipo_mensaje ON mensajes_whatsapp(tipo_mensaje);
CREATE INDEX idx_mensajes_whatsapp_leido ON mensajes_whatsapp(leido) WHERE leido = FALSE;
CREATE INDEX idx_mensajes_whatsapp_mensaje_id_whatsapp ON mensajes_whatsapp(mensaje_id_whatsapp);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_mensajes_whatsapp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_mensajes_whatsapp_updated_at
    BEFORE UPDATE ON mensajes_whatsapp
    FOR EACH ROW
    EXECUTE FUNCTION update_mensajes_whatsapp_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE mensajes_whatsapp ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean sus propios mensajes
CREATE POLICY "Los usuarios solo pueden ver sus propios mensajes" ON mensajes_whatsapp
    FOR ALL USING (auth.uid() = user_id);

-- Comentarios para documentación
COMMENT ON TABLE mensajes_whatsapp IS 'Tabla para almacenar todos los mensajes de WhatsApp';
COMMENT ON COLUMN mensajes_whatsapp.conversacion_id IS 'ID de la conversación a la que pertenece el mensaje';
COMMENT ON COLUMN mensajes_whatsapp.instancia_id IS 'ID de la instancia de WhatsApp';
COMMENT ON COLUMN mensajes_whatsapp.numero_whatsapp IS 'Número de teléfono del contacto';
COMMENT ON COLUMN mensajes_whatsapp.direccion IS 'Dirección del mensaje: enviado o recibido';
COMMENT ON COLUMN mensajes_whatsapp.mensaje IS 'Contenido del mensaje de texto';
COMMENT ON COLUMN mensajes_whatsapp.tipo_mensaje IS 'Tipo de mensaje: texto, imagen, video, audio, documento, etc.';
COMMENT ON COLUMN mensajes_whatsapp.url_adjunto IS 'URL del archivo adjunto si aplica';
COMMENT ON COLUMN mensajes_whatsapp.nombre_archivo IS 'Nombre original del archivo adjunto';
COMMENT ON COLUMN mensajes_whatsapp.tamaño_archivo IS 'Tamaño del archivo en bytes';
COMMENT ON COLUMN mensajes_whatsapp.mime_type IS 'Tipo MIME del archivo adjunto';
COMMENT ON COLUMN mensajes_whatsapp.mensaje_id_whatsapp IS 'ID único del mensaje en WhatsApp';
COMMENT ON COLUMN mensajes_whatsapp.mensaje_respuesta_id IS 'ID del mensaje al que responde (si es una respuesta)';
COMMENT ON COLUMN mensajes_whatsapp.estado_mensaje IS 'Estado del mensaje: enviando, enviado, entregado, leído, fallido';
COMMENT ON COLUMN mensajes_whatsapp.leido IS 'Indica si el mensaje ha sido leído';
COMMENT ON COLUMN mensajes_whatsapp.fecha_leido IS 'Fecha y hora en que se leyó el mensaje';
COMMENT ON COLUMN mensajes_whatsapp.metadata IS 'Datos adicionales del mensaje en formato JSON';