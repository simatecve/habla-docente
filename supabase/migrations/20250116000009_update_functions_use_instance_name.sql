-- Actualizar funciones para trabajar con nombre_instancia en lugar de instancia_id
-- Fecha: 2025-01-16

-- Eliminar funciones existentes
DROP FUNCTION IF EXISTS crear_o_actualizar_conversacion(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, UUID);
DROP FUNCTION IF EXISTS insertar_mensaje_whatsapp(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS marcar_mensajes_leidos(UUID);
DROP FUNCTION IF EXISTS obtener_conversaciones_whatsapp(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS obtener_mensajes_conversacion(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS buscar_conversaciones_whatsapp(TEXT, TEXT);

-- Función para crear o actualizar conversación (usando nombre_instancia)
CREATE OR REPLACE FUNCTION crear_o_actualizar_conversacion(
    p_nombre_instancia TEXT,
    p_numero_whatsapp TEXT,
    p_nombre_contacto TEXT DEFAULT NULL,
    p_ultimo_mensaje TEXT DEFAULT NULL,
    p_direccion_ultimo_mensaje TEXT DEFAULT NULL,
    p_ultimo_mensaje_fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_user_id UUID DEFAULT auth.uid()
) RETURNS UUID AS $$
DECLARE
    v_conversacion_id UUID;
BEGIN
    -- Buscar conversación existente
    SELECT id INTO v_conversacion_id
    FROM conversaciones_whatsapp
    WHERE nombre_instancia = p_nombre_instancia 
    AND numero_whatsapp = p_numero_whatsapp
    AND user_id = p_user_id;
    
    IF v_conversacion_id IS NOT NULL THEN
        -- Actualizar conversación existente
        UPDATE conversaciones_whatsapp SET
            nombre_contacto = COALESCE(p_nombre_contacto, nombre_contacto),
            ultimo_mensaje = COALESCE(p_ultimo_mensaje, ultimo_mensaje),
            direccion_ultimo_mensaje = COALESCE(p_direccion_ultimo_mensaje, direccion_ultimo_mensaje),
            ultimo_mensaje_fecha = COALESCE(p_ultimo_mensaje_fecha, ultimo_mensaje_fecha),
            updated_at = NOW()
        WHERE id = v_conversacion_id;
        
        -- Incrementar contador de no leídos si es mensaje recibido
        IF p_direccion_ultimo_mensaje = 'recibido' THEN
            UPDATE conversaciones_whatsapp 
            SET mensajes_no_leidos = mensajes_no_leidos + 1
            WHERE id = v_conversacion_id;
        END IF;
    ELSE
        -- Crear nueva conversación
        INSERT INTO conversaciones_whatsapp (
            nombre_instancia, numero_whatsapp, nombre_contacto,
            ultimo_mensaje, direccion_ultimo_mensaje, ultimo_mensaje_fecha,
            mensajes_no_leidos, user_id
        ) VALUES (
            p_nombre_instancia, p_numero_whatsapp, p_nombre_contacto,
            p_ultimo_mensaje, p_direccion_ultimo_mensaje, p_ultimo_mensaje_fecha,
            CASE WHEN p_direccion_ultimo_mensaje = 'recibido' THEN 1 ELSE 0 END,
            p_user_id
        ) RETURNING id INTO v_conversacion_id;
    END IF;
    
    RETURN v_conversacion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para insertar mensaje de WhatsApp (usando nombre_instancia)
CREATE OR REPLACE FUNCTION insertar_mensaje_whatsapp(
    p_nombre_instancia TEXT,
    p_numero_whatsapp TEXT,
    p_direccion TEXT,
    p_mensaje TEXT,
    p_tipo_mensaje TEXT DEFAULT 'texto',
    p_url_adjunto TEXT DEFAULT NULL,
    p_nombre_archivo TEXT DEFAULT NULL,
    p_tamaño_archivo INTEGER DEFAULT NULL,
    p_mime_type TEXT DEFAULT NULL,
    p_mensaje_id_whatsapp TEXT DEFAULT NULL,
    p_mensaje_respuesta_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_conversacion_id UUID;
    v_mensaje_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    -- Crear o actualizar conversación
    v_conversacion_id := crear_o_actualizar_conversacion(
        p_nombre_instancia,
        p_numero_whatsapp,
        NULL, -- nombre_contacto se puede actualizar después
        p_mensaje,
        p_direccion,
        NOW(),
        v_user_id
    );
    
    -- Insertar mensaje
    INSERT INTO mensajes_whatsapp (
        conversacion_id, nombre_instancia, numero_whatsapp,
        direccion, mensaje, tipo_mensaje,
        url_adjunto, nombre_archivo, tamaño_archivo, mime_type,
        mensaje_id_whatsapp, mensaje_respuesta_id, metadata, user_id
    ) VALUES (
        v_conversacion_id, p_nombre_instancia, p_numero_whatsapp,
        p_direccion, p_mensaje, p_tipo_mensaje,
        p_url_adjunto, p_nombre_archivo, p_tamaño_archivo, p_mime_type,
        p_mensaje_id_whatsapp, p_mensaje_respuesta_id, p_metadata, v_user_id
    ) RETURNING id INTO v_mensaje_id;
    
    RETURN v_mensaje_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar mensajes como leídos
CREATE OR REPLACE FUNCTION marcar_mensajes_leidos(
    p_conversacion_id UUID
) RETURNS VOID AS $$
BEGIN
    -- Marcar mensajes como leídos
    UPDATE mensajes_whatsapp 
    SET leido = TRUE, fecha_leido = NOW()
    WHERE conversacion_id = p_conversacion_id 
    AND direccion = 'recibido' 
    AND leido = FALSE
    AND user_id = auth.uid();
    
    -- Resetear contador de no leídos
    UPDATE conversaciones_whatsapp 
    SET mensajes_no_leidos = 0
    WHERE id = p_conversacion_id 
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener conversaciones (usando nombre_instancia)
CREATE OR REPLACE FUNCTION obtener_conversaciones_whatsapp(
    p_nombre_instancia TEXT DEFAULT NULL,
    p_limite INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    nombre_instancia TEXT,
    numero_whatsapp TEXT,
    nombre_contacto TEXT,
    ultimo_mensaje TEXT,
    direccion_ultimo_mensaje TEXT,
    ultimo_mensaje_fecha TIMESTAMP WITH TIME ZONE,
    mensajes_no_leidos INTEGER,
    estado TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id, c.nombre_instancia, c.numero_whatsapp, c.nombre_contacto,
        c.ultimo_mensaje, c.direccion_ultimo_mensaje, c.ultimo_mensaje_fecha,
        c.mensajes_no_leidos, c.estado, c.created_at, c.updated_at
    FROM conversaciones_whatsapp c
    WHERE c.user_id = auth.uid()
    AND (p_nombre_instancia IS NULL OR c.nombre_instancia = p_nombre_instancia)
    ORDER BY c.ultimo_mensaje_fecha DESC NULLS LAST
    LIMIT p_limite OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener mensajes de una conversación
CREATE OR REPLACE FUNCTION obtener_mensajes_conversacion(
    p_conversacion_id UUID,
    p_limite INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    conversacion_id UUID,
    nombre_instancia TEXT,
    numero_whatsapp TEXT,
    direccion TEXT,
    mensaje TEXT,
    tipo_mensaje TEXT,
    url_adjunto TEXT,
    nombre_archivo TEXT,
    tamaño_archivo INTEGER,
    mime_type TEXT,
    mensaje_id_whatsapp TEXT,
    mensaje_respuesta_id TEXT,
    estado_mensaje TEXT,
    leido BOOLEAN,
    fecha_leido TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Verificar que el usuario tiene acceso a esta conversación
    IF NOT EXISTS (
        SELECT 1 FROM conversaciones_whatsapp 
        WHERE conversaciones_whatsapp.id = p_conversacion_id 
        AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'No tienes acceso a esta conversación';
    END IF;
    
    RETURN QUERY
    SELECT 
        m.id, m.conversacion_id, m.nombre_instancia, m.numero_whatsapp,
        m.direccion, m.mensaje, m.tipo_mensaje,
        m.url_adjunto, m.nombre_archivo, m.tamaño_archivo, m.mime_type,
        m.mensaje_id_whatsapp, m.mensaje_respuesta_id, m.estado_mensaje,
        m.leido, m.fecha_leido, m.metadata, m.created_at, m.updated_at
    FROM mensajes_whatsapp m
    WHERE m.conversacion_id = p_conversacion_id
    AND m.user_id = auth.uid()
    ORDER BY m.created_at DESC
    LIMIT p_limite OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para buscar conversaciones (usando nombre_instancia)
CREATE OR REPLACE FUNCTION buscar_conversaciones_whatsapp(
    p_termino_busqueda TEXT,
    p_nombre_instancia TEXT DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    nombre_instancia TEXT,
    numero_whatsapp TEXT,
    nombre_contacto TEXT,
    ultimo_mensaje TEXT,
    direccion_ultimo_mensaje TEXT,
    ultimo_mensaje_fecha TIMESTAMP WITH TIME ZONE,
    mensajes_no_leidos INTEGER,
    relevancia REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id, c.nombre_instancia, c.numero_whatsapp, c.nombre_contacto,
        c.ultimo_mensaje, c.direccion_ultimo_mensaje, c.ultimo_mensaje_fecha,
        c.mensajes_no_leidos,
        (
            CASE WHEN c.nombre_contacto ILIKE '%' || p_termino_busqueda || '%' THEN 3.0 ELSE 0.0 END +
            CASE WHEN c.numero_whatsapp ILIKE '%' || p_termino_busqueda || '%' THEN 2.0 ELSE 0.0 END +
            CASE WHEN c.ultimo_mensaje ILIKE '%' || p_termino_busqueda || '%' THEN 1.0 ELSE 0.0 END
        ) as relevancia
    FROM conversaciones_whatsapp c
    WHERE c.user_id = auth.uid()
    AND (p_nombre_instancia IS NULL OR c.nombre_instancia = p_nombre_instancia)
    AND (
        c.nombre_contacto ILIKE '%' || p_termino_busqueda || '%' OR
        c.numero_whatsapp ILIKE '%' || p_termino_busqueda || '%' OR
        c.ultimo_mensaje ILIKE '%' || p_termino_busqueda || '%'
    )
    ORDER BY relevancia DESC, c.ultimo_mensaje_fecha DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agregar comentarios a las funciones
COMMENT ON FUNCTION crear_o_actualizar_conversacion IS 'Crea una nueva conversación o actualiza una existente usando nombre de instancia';
COMMENT ON FUNCTION insertar_mensaje_whatsapp IS 'Inserta un mensaje de WhatsApp y gestiona automáticamente la conversación usando nombre de instancia';
COMMENT ON FUNCTION marcar_mensajes_leidos IS 'Marca los mensajes de una conversación como leídos';
COMMENT ON FUNCTION obtener_conversaciones_whatsapp IS 'Obtiene las conversaciones de WhatsApp del usuario usando nombre de instancia';
COMMENT ON FUNCTION obtener_mensajes_conversacion IS 'Obtiene los mensajes de una conversación específica';
COMMENT ON FUNCTION buscar_conversaciones_whatsapp IS 'Busca conversaciones por término usando nombre de instancia';