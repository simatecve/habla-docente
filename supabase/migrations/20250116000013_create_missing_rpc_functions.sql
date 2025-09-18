-- Función para obtener mensajes de una conversación específica
CREATE OR REPLACE FUNCTION obtener_mensajes_conversacion(
    p_conversacion_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_limite INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    conversacion_id UUID,
    instancia_id UUID,
    numero_whatsapp VARCHAR(20),
    direccion VARCHAR(10),
    mensaje TEXT,
    tipo_mensaje VARCHAR(20),
    url_adjunto TEXT,
    nombre_archivo VARCHAR(255),
    tamaño_archivo BIGINT,
    mime_type VARCHAR(100),
    mensaje_id_whatsapp VARCHAR(255),
    mensaje_respuesta_id UUID,
    estado_mensaje VARCHAR(20),
    leido BOOLEAN,
    fecha_leido TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Obtener user_id si no se proporciona
    IF p_user_id IS NULL THEN
        v_user_id := auth.uid();
    ELSE
        v_user_id := p_user_id;
    END IF;

    -- Verificar que el usuario tiene acceso a esta conversación
    IF NOT EXISTS (
        SELECT 1 FROM conversaciones_whatsapp 
        WHERE id = p_conversacion_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'No tienes acceso a esta conversación';
    END IF;

    RETURN QUERY
    SELECT 
        m.id,
        m.conversacion_id,
        m.instancia_id,
        m.numero_whatsapp,
        m.direccion,
        m.mensaje,
        m.tipo_mensaje,
        m.url_adjunto,
        m.nombre_archivo,
        m.tamaño_archivo,
        m.mime_type,
        m.mensaje_id_whatsapp,
        m.mensaje_respuesta_id,
        m.estado_mensaje,
        m.leido,
        m.fecha_leido,
        m.metadata,
        m.created_at,
        m.updated_at
    FROM mensajes_whatsapp m
    WHERE m.conversacion_id = p_conversacion_id
    AND m.user_id = v_user_id
    ORDER BY m.created_at ASC
    LIMIT p_limite
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Función para buscar conversaciones por pushname
CREATE OR REPLACE FUNCTION buscar_conversaciones_por_pushname(
    p_pushname VARCHAR(255),
    p_user_id UUID DEFAULT NULL,
    p_limite INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    instancia_id UUID,
    numero_whatsapp VARCHAR(20),
    nombre_contacto VARCHAR(255),
    pushname VARCHAR(255),
    ultimo_mensaje TEXT,
    ultimo_mensaje_fecha TIMESTAMP WITH TIME ZONE,
    direccion_ultimo_mensaje VARCHAR(10),
    mensajes_no_leidos INTEGER,
    estado VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Obtener user_id si no se proporciona
    IF p_user_id IS NULL THEN
        v_user_id := auth.uid();
    ELSE
        v_user_id := p_user_id;
    END IF;

    RETURN QUERY
    SELECT 
        c.id,
        c.instancia_id,
        c.numero_whatsapp,
        c.nombre_contacto,
        c.pushname,
        c.ultimo_mensaje,
        c.ultimo_mensaje_fecha,
        c.direccion_ultimo_mensaje,
        c.mensajes_no_leidos,
        c.estado,
        c.created_at,
        c.updated_at
    FROM conversaciones_whatsapp c
    WHERE c.user_id = v_user_id
    AND c.estado = 'activa'
    AND (
        c.pushname ILIKE '%' || p_pushname || '%'
        OR c.nombre_contacto ILIKE '%' || p_pushname || '%'
        OR c.numero_whatsapp ILIKE '%' || p_pushname || '%'
    )
    ORDER BY c.ultimo_mensaje_fecha DESC NULLS LAST
    LIMIT p_limite;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON FUNCTION obtener_mensajes_conversacion IS 'Obtiene todos los mensajes de una conversación específica ordenados cronológicamente';
COMMENT ON FUNCTION buscar_conversaciones_por_pushname IS 'Busca conversaciones por pushname, nombre de contacto o número de teléfono';