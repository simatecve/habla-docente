-- =====================================================
-- SISTEMA SIMPLIFICADO WHATSAPP - CONVERSACIONES Y MENSAJES
-- =====================================================
-- Este archivo contiene únicamente las tablas necesarias y la lógica
-- para crear/actualizar conversaciones automáticamente al insertar mensajes

-- Eliminar tablas existentes si existen
DROP TABLE IF EXISTS mensajes_whatsapp CASCADE;
DROP TABLE IF EXISTS conversaciones_whatsapp CASCADE;

-- =====================================================
-- 1. TABLA CONVERSACIONES WHATSAPP
-- =====================================================

CREATE TABLE conversaciones_whatsapp (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre_instancia TEXT NOT NULL,
    numero_telefono TEXT NOT NULL,
    nombre_contacto TEXT,
    ultimo_mensaje TEXT,
    fecha_ultimo_mensaje TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mensajes_no_leidos INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint único para evitar conversaciones duplicadas
    UNIQUE(nombre_instancia, numero_telefono)
);

-- Índices para optimizar consultas
CREATE INDEX idx_conversaciones_instancia ON conversaciones_whatsapp(nombre_instancia);
CREATE INDEX idx_conversaciones_telefono ON conversaciones_whatsapp(numero_telefono);
CREATE INDEX idx_conversaciones_fecha ON conversaciones_whatsapp(fecha_ultimo_mensaje DESC);

-- =====================================================
-- 2. TABLA MENSAJES WHATSAPP
-- =====================================================

CREATE TABLE mensajes_whatsapp (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversacion_id UUID NOT NULL REFERENCES conversaciones_whatsapp(id) ON DELETE CASCADE,
    nombre_instancia TEXT NOT NULL,
    numero_telefono TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    tipo_mensaje TEXT DEFAULT 'text' CHECK (tipo_mensaje IN ('text', 'image', 'audio', 'video', 'document')),
    direccion TEXT NOT NULL CHECK (direccion IN ('entrante', 'saliente')),
    leido BOOLEAN DEFAULT FALSE,
    mensaje_id_whatsapp TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índice único para evitar mensajes duplicados de WhatsApp
    UNIQUE(nombre_instancia, mensaje_id_whatsapp)
);

-- Índices para optimizar consultas
CREATE INDEX idx_mensajes_conversacion ON mensajes_whatsapp(conversacion_id);
CREATE INDEX idx_mensajes_instancia ON mensajes_whatsapp(nombre_instancia);
CREATE INDEX idx_mensajes_telefono ON mensajes_whatsapp(numero_telefono);
CREATE INDEX idx_mensajes_fecha ON mensajes_whatsapp(created_at DESC);
CREATE INDEX idx_mensajes_no_leidos ON mensajes_whatsapp(leido) WHERE leido = FALSE;

-- =====================================================
-- 3. FUNCIÓN PARA CREAR/ACTUALIZAR CONVERSACIÓN
-- =====================================================

CREATE OR REPLACE FUNCTION crear_o_actualizar_conversacion()
RETURNS TRIGGER AS $$
DECLARE
    conversacion_existente UUID;
BEGIN
    -- Buscar si ya existe una conversación para esta instancia y número
    SELECT id INTO conversacion_existente
    FROM conversaciones_whatsapp
    WHERE nombre_instancia = NEW.nombre_instancia 
    AND numero_telefono = NEW.numero_telefono;
    
    IF conversacion_existente IS NOT NULL THEN
        -- Actualizar conversación existente
        UPDATE conversaciones_whatsapp
        SET 
            ultimo_mensaje = NEW.mensaje,
            fecha_ultimo_mensaje = NEW.created_at,
            mensajes_no_leidos = CASE 
                WHEN NEW.direccion = 'entrante' AND NEW.leido = FALSE 
                THEN mensajes_no_leidos + 1 
                ELSE mensajes_no_leidos 
            END,
            updated_at = NOW()
        WHERE id = conversacion_existente;
        
        -- Asignar el ID de la conversación existente al mensaje
        NEW.conversacion_id = conversacion_existente;
    ELSE
        -- Crear nueva conversación
        INSERT INTO conversaciones_whatsapp (
            nombre_instancia,
            numero_telefono,
            ultimo_mensaje,
            fecha_ultimo_mensaje,
            mensajes_no_leidos,
            created_at,
            updated_at
        ) VALUES (
            NEW.nombre_instancia,
            NEW.numero_telefono,
            NEW.mensaje,
            NEW.created_at,
            CASE WHEN NEW.direccion = 'entrante' AND NEW.leido = FALSE THEN 1 ELSE 0 END,
            NOW(),
            NOW()
        ) RETURNING id INTO conversacion_existente;
        
        -- Asignar el ID de la nueva conversación al mensaje
        NEW.conversacion_id = conversacion_existente;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. FUNCIÓN PARA ACTUALIZAR CONVERSACIÓN AL MARCAR COMO LEÍDO
-- =====================================================

CREATE OR REPLACE FUNCTION actualizar_conversacion_leido()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actualizar si el mensaje cambió de no leído a leído
    IF OLD.leido = FALSE AND NEW.leido = TRUE THEN
        UPDATE conversaciones_whatsapp
        SET 
            mensajes_no_leidos = GREATEST(mensajes_no_leidos - 1, 0),
            updated_at = NOW()
        WHERE id = NEW.conversacion_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Trigger para crear/actualizar conversación al insertar mensaje
CREATE TRIGGER trigger_crear_conversacion
    BEFORE INSERT ON mensajes_whatsapp
    FOR EACH ROW
    EXECUTE FUNCTION crear_o_actualizar_conversacion();

-- Trigger para actualizar contador de no leídos
CREATE TRIGGER trigger_actualizar_leido
    AFTER UPDATE ON mensajes_whatsapp
    FOR EACH ROW
    WHEN (OLD.leido IS DISTINCT FROM NEW.leido)
    EXECUTE FUNCTION actualizar_conversacion_leido();

-- =====================================================
-- 6. FUNCIÓN AUXILIAR PARA INSERTAR MENSAJES
-- =====================================================

CREATE OR REPLACE FUNCTION insertar_mensaje_whatsapp(
    p_nombre_instancia TEXT,
    p_numero_telefono TEXT,
    p_mensaje TEXT,
    p_tipo_mensaje TEXT DEFAULT 'text',
    p_direccion TEXT DEFAULT 'entrante',
    p_mensaje_id_whatsapp TEXT DEFAULT NULL,
    p_nombre_contacto TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    mensaje_id UUID;
BEGIN
    -- Insertar el mensaje (el trigger se encargará de crear/actualizar la conversación)
    INSERT INTO mensajes_whatsapp (
        nombre_instancia,
        numero_telefono,
        mensaje,
        tipo_mensaje,
        direccion,
        mensaje_id_whatsapp,
        leido
    ) VALUES (
        p_nombre_instancia,
        p_numero_telefono,
        p_mensaje,
        p_tipo_mensaje,
        p_direccion,
        p_mensaje_id_whatsapp,
        CASE WHEN p_direccion = 'saliente' THEN TRUE ELSE FALSE END
    ) RETURNING id INTO mensaje_id;
    
    -- Si se proporcionó un nombre de contacto, actualizar la conversación
    IF p_nombre_contacto IS NOT NULL THEN
        UPDATE conversaciones_whatsapp
        SET nombre_contacto = p_nombre_contacto
        WHERE nombre_instancia = p_nombre_instancia 
        AND numero_telefono = p_numero_telefono
        AND (nombre_contacto IS NULL OR nombre_contacto = '');
    END IF;
    
    RETURN mensaje_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. FUNCIÓN PARA MARCAR MENSAJES COMO LEÍDOS
-- =====================================================

CREATE OR REPLACE FUNCTION marcar_mensajes_leidos(
    p_nombre_instancia TEXT,
    p_numero_telefono TEXT
)
RETURNS INTEGER AS $$
DECLARE
    mensajes_actualizados INTEGER;
BEGIN
    UPDATE mensajes_whatsapp
    SET leido = TRUE
    WHERE nombre_instancia = p_nombre_instancia
    AND numero_telefono = p_numero_telefono
    AND leido = FALSE;
    
    GET DIAGNOSTICS mensajes_actualizados = ROW_COUNT;
    RETURN mensajes_actualizados;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. FUNCIÓN PARA OBTENER CONVERSACIONES
-- =====================================================

CREATE OR REPLACE FUNCTION obtener_conversaciones_whatsapp(
    p_nombre_instancia TEXT,
    p_limite INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    numero_telefono TEXT,
    nombre_contacto TEXT,
    ultimo_mensaje TEXT,
    fecha_ultimo_mensaje TIMESTAMP WITH TIME ZONE,
    mensajes_no_leidos INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.numero_telefono,
        c.nombre_contacto,
        c.ultimo_mensaje,
        c.fecha_ultimo_mensaje,
        c.mensajes_no_leidos,
        c.created_at
    FROM conversaciones_whatsapp c
    WHERE c.nombre_instancia = p_nombre_instancia
    ORDER BY c.fecha_ultimo_mensaje DESC
    LIMIT p_limite OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. FUNCIÓN PARA OBTENER MENSAJES DE UNA CONVERSACIÓN
-- =====================================================

CREATE OR REPLACE FUNCTION obtener_mensajes_conversacion(
    p_conversacion_id UUID,
    p_limite INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    mensaje TEXT,
    tipo_mensaje TEXT,
    direccion TEXT,
    leido BOOLEAN,
    mensaje_id_whatsapp TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.mensaje,
        m.tipo_mensaje,
        m.direccion,
        m.leido,
        m.mensaje_id_whatsapp,
        m.created_at
    FROM mensajes_whatsapp m
    WHERE m.conversacion_id = p_conversacion_id
    ORDER BY m.created_at ASC
    LIMIT p_limite OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE conversaciones_whatsapp IS 'Tabla que almacena las conversaciones de WhatsApp por instancia';
COMMENT ON TABLE mensajes_whatsapp IS 'Tabla que almacena todos los mensajes de WhatsApp';

COMMENT ON FUNCTION crear_o_actualizar_conversacion() IS 'Función trigger que crea o actualiza automáticamente una conversación al insertar un mensaje';
COMMENT ON FUNCTION insertar_mensaje_whatsapp(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Función para insertar mensajes de WhatsApp con creación automática de conversación';
COMMENT ON FUNCTION marcar_mensajes_leidos(TEXT, TEXT) IS 'Función para marcar todos los mensajes de una conversación como leídos';
COMMENT ON FUNCTION obtener_conversaciones_whatsapp(TEXT, INTEGER, INTEGER) IS 'Función para obtener las conversaciones de una instancia específica';
COMMENT ON FUNCTION obtener_mensajes_conversacion(UUID, INTEGER, INTEGER) IS 'Función para obtener los mensajes de una conversación específica';