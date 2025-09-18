-- Función para crear o actualizar conversación automáticamente
CREATE OR REPLACE FUNCTION crear_o_actualizar_conversacion(
    p_instancia_id UUID,
    p_numero_whatsapp VARCHAR(20),
    p_mensaje TEXT,
    p_direccion VARCHAR(10),
    p_user_id UUID,
    p_nombre_contacto VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_conversacion_id UUID;
    v_mensajes_no_leidos INTEGER;
BEGIN
    -- Intentar encontrar conversación existente
    SELECT id INTO v_conversacion_id
    FROM conversaciones_whatsapp
    WHERE instancia_id = p_instancia_id 
    AND numero_whatsapp = p_numero_whatsapp
    AND user_id = p_user_id;

    -- Calcular mensajes no leídos (solo si es mensaje recibido)
    IF p_direccion = 'recibido' THEN
        v_mensajes_no_leidos := 1;
    ELSE
        v_mensajes_no_leidos := 0;
    END IF;

    -- Si la conversación existe, actualizarla
    IF v_conversacion_id IS NOT NULL THEN
        UPDATE conversaciones_whatsapp
        SET 
            ultimo_mensaje = p_mensaje,
            ultimo_mensaje_fecha = NOW(),
            direccion_ultimo_mensaje = p_direccion,
            mensajes_no_leidos = CASE 
                WHEN p_direccion = 'recibido' THEN mensajes_no_leidos + 1
                ELSE mensajes_no_leidos
            END,
            nombre_contacto = COALESCE(p_nombre_contacto, nombre_contacto),
            updated_at = NOW()
        WHERE id = v_conversacion_id;
    ELSE
        -- Si no existe, crear nueva conversación
        INSERT INTO conversaciones_whatsapp (
            instancia_id,
            numero_whatsapp,
            nombre_contacto,
            ultimo_mensaje,
            ultimo_mensaje_fecha,
            direccion_ultimo_mensaje,
            mensajes_no_leidos,
            user_id
        ) VALUES (
            p_instancia_id,
            p_numero_whatsapp,
            p_nombre_contacto,
            p_mensaje,
            NOW(),
            p_direccion,
            v_mensajes_no_leidos,
            p_user_id
        ) RETURNING id INTO v_conversacion_id;
    END IF;

    RETURN v_conversacion_id;
END;
$$ LANGUAGE plpgsql;

-- Función para insertar mensaje y manejar conversación automáticamente
CREATE OR REPLACE FUNCTION insertar_mensaje_whatsapp(
    p_instancia_id UUID,
    p_numero_whatsapp VARCHAR(20),
    p_direccion VARCHAR(10),
    p_mensaje TEXT,
    p_tipo_mensaje VARCHAR(20) DEFAULT 'texto',
    p_url_adjunto TEXT DEFAULT NULL,
    p_nombre_archivo VARCHAR(255) DEFAULT NULL,
    p_tamaño_archivo BIGINT DEFAULT NULL,
    p_mime_type VARCHAR(100) DEFAULT NULL,
    p_mensaje_id_whatsapp VARCHAR(255) DEFAULT NULL,
    p_mensaje_respuesta_id UUID DEFAULT NULL,
    p_estado_mensaje VARCHAR(20) DEFAULT 'enviado',
    p_user_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_nombre_contacto VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_conversacion_id UUID;
    v_mensaje_id UUID;
    v_user_id UUID;
BEGIN
    -- Obtener user_id si no se proporciona
    IF p_user_id IS NULL THEN
        v_user_id := auth.uid();
    ELSE
        v_user_id := p_user_id;
    END IF;

    -- Verificar que el user_id no sea nulo
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No se pudo determinar el usuario autenticado';
    END IF;

    -- Crear o actualizar conversación
    v_conversacion_id := crear_o_actualizar_conversacion(
        p_instancia_id,
        p_numero_whatsapp,
        p_mensaje,
        p_direccion,
        v_user_id,
        p_nombre_contacto
    );

    -- Insertar el mensaje
    INSERT INTO mensajes_whatsapp (
        conversacion_id,
        instancia_id,
        numero_whatsapp,
        direccion,
        mensaje,
        tipo_mensaje,
        url_adjunto,
        nombre_archivo,
        tamaño_archivo,
        mime_type,
        mensaje_id_whatsapp,
        mensaje_respuesta_id,
        estado_mensaje,
        user_id,
        metadata
    ) VALUES (
        v_conversacion_id,
        p_instancia_id,
        p_numero_whatsapp,
        p_direccion,
        p_mensaje,
        p_tipo_mensaje,
        p_url_adjunto,
        p_nombre_archivo,
        p_tamaño_archivo,
        p_mime_type,
        p_mensaje_id_whatsapp,
        p_mensaje_respuesta_id,
        p_estado_mensaje,
        v_user_id,
        p_metadata
    ) RETURNING id INTO v_mensaje_id;

    RETURN v_mensaje_id;
END;
$$ LANGUAGE plpgsql;

-- Función para marcar mensajes como leídos
CREATE OR REPLACE FUNCTION marcar_mensajes_leidos(
    p_conversacion_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_user_id UUID;
    v_mensajes_actualizados INTEGER;
BEGIN
    -- Obtener user_id si no se proporciona
    IF p_user_id IS NULL THEN
        v_user_id := auth.uid();
    ELSE
        v_user_id := p_user_id;
    END IF;

    -- Marcar mensajes como leídos
    UPDATE mensajes_whatsapp
    SET 
        leido = TRUE,
        fecha_leido = NOW(),
        updated_at = NOW()
    WHERE conversacion_id = p_conversacion_id
    AND user_id = v_user_id
    AND leido = FALSE
    AND direccion = 'recibido';

    GET DIAGNOSTICS v_mensajes_actualizados = ROW_COUNT;

    -- Actualizar contador en conversación
    UPDATE conversaciones_whatsapp
    SET 
        mensajes_no_leidos = 0,
        updated_at = NOW()
    WHERE id = p_conversacion_id
    AND user_id = v_user_id;

    RETURN v_mensajes_actualizados;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener conversaciones con último mensaje
CREATE OR REPLACE FUNCTION obtener_conversaciones_whatsapp(
    p_instancia_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_limite INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    instancia_id UUID,
    numero_whatsapp VARCHAR(20),
    nombre_contacto VARCHAR(255),
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
        c.ultimo_mensaje,
        c.ultimo_mensaje_fecha,
        c.direccion_ultimo_mensaje,
        c.mensajes_no_leidos,
        c.estado,
        c.created_at,
        c.updated_at
    FROM conversaciones_whatsapp c
    WHERE c.user_id = v_user_id
    AND (p_instancia_id IS NULL OR c.instancia_id = p_instancia_id)
    AND c.estado = 'activa'
    ORDER BY c.ultimo_mensaje_fecha DESC NULLS LAST
    LIMIT p_limite
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON FUNCTION crear_o_actualizar_conversacion IS 'Crea una nueva conversación o actualiza una existente con el último mensaje';
COMMENT ON FUNCTION insertar_mensaje_whatsapp IS 'Inserta un mensaje y maneja automáticamente la conversación asociada';
COMMENT ON FUNCTION marcar_mensajes_leidos IS 'Marca todos los mensajes no leídos de una conversación como leídos';
COMMENT ON FUNCTION obtener_conversaciones_whatsapp IS 'Obtiene las conversaciones de WhatsApp ordenadas por último mensaje';