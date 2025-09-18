-- Políticas adicionales de RLS para conversaciones_whatsapp

-- Política para insertar conversaciones (solo el usuario autenticado)
CREATE POLICY "Los usuarios pueden crear sus propias conversaciones" ON conversaciones_whatsapp
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para actualizar conversaciones (solo el propietario)
CREATE POLICY "Los usuarios pueden actualizar sus propias conversaciones" ON conversaciones_whatsapp
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para eliminar conversaciones (solo el propietario)
CREATE POLICY "Los usuarios pueden eliminar sus propias conversaciones" ON conversaciones_whatsapp
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas adicionales de RLS para mensajes_whatsapp

-- Política para insertar mensajes (solo el usuario autenticado)
CREATE POLICY "Los usuarios pueden crear sus propios mensajes" ON mensajes_whatsapp
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para actualizar mensajes (solo el propietario)
CREATE POLICY "Los usuarios pueden actualizar sus propios mensajes" ON mensajes_whatsapp
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para eliminar mensajes (solo el propietario)
CREATE POLICY "Los usuarios pueden eliminar sus propios mensajes" ON mensajes_whatsapp
    FOR DELETE USING (auth.uid() = user_id);

-- Crear vista para conversaciones con estadísticas
CREATE OR REPLACE VIEW vista_conversaciones_whatsapp AS
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
    c.user_id,
    c.created_at,
    c.updated_at,
    -- Estadísticas adicionales
    (SELECT COUNT(*) FROM mensajes_whatsapp m WHERE m.conversacion_id = c.id) as total_mensajes,
    (SELECT COUNT(*) FROM mensajes_whatsapp m WHERE m.conversacion_id = c.id AND m.direccion = 'enviado') as mensajes_enviados,
    (SELECT COUNT(*) FROM mensajes_whatsapp m WHERE m.conversacion_id = c.id AND m.direccion = 'recibido') as mensajes_recibidos,
    -- Información de la instancia
    wi.nombre as nombre_instancia,
    wi.numero as numero_instancia
FROM conversaciones_whatsapp c
LEFT JOIN whatsapp_instances wi ON c.instancia_id = wi.id
WHERE c.user_id = auth.uid();

-- Crear vista para mensajes con información de conversación
CREATE OR REPLACE VIEW vista_mensajes_whatsapp AS
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
    m.user_id,
    m.metadata,
    m.created_at,
    m.updated_at,
    -- Información de la conversación
    c.nombre_contacto,
    c.estado as estado_conversacion,
    -- Información de la instancia
    wi.nombre as nombre_instancia,
    wi.numero as numero_instancia,
    -- Información del mensaje de respuesta (si aplica)
    mr.mensaje as mensaje_respuesta_contenido,
    mr.direccion as mensaje_respuesta_direccion
FROM mensajes_whatsapp m
LEFT JOIN conversaciones_whatsapp c ON m.conversacion_id = c.id
LEFT JOIN whatsapp_instances wi ON m.instancia_id = wi.id
LEFT JOIN mensajes_whatsapp mr ON m.mensaje_respuesta_id = mr.id
WHERE m.user_id = auth.uid();

-- Habilitar RLS en las vistas
ALTER VIEW vista_conversaciones_whatsapp SET (security_invoker = true);
ALTER VIEW vista_mensajes_whatsapp SET (security_invoker = true);

-- Función para obtener mensajes de una conversación con paginación
CREATE OR REPLACE FUNCTION obtener_mensajes_conversacion(
    p_conversacion_id UUID,
    p_limite INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    conversacion_id UUID,
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
    updated_at TIMESTAMP WITH TIME ZONE,
    mensaje_respuesta_contenido TEXT,
    mensaje_respuesta_direccion VARCHAR(10)
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

    -- Verificar que el usuario tiene acceso a la conversación
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
        m.updated_at,
        mr.mensaje as mensaje_respuesta_contenido,
        mr.direccion as mensaje_respuesta_direccion
    FROM mensajes_whatsapp m
    LEFT JOIN mensajes_whatsapp mr ON m.mensaje_respuesta_id = mr.id
    WHERE m.conversacion_id = p_conversacion_id
    AND m.user_id = v_user_id
    ORDER BY m.created_at ASC
    LIMIT p_limite
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para buscar conversaciones por texto
CREATE OR REPLACE FUNCTION buscar_conversaciones_whatsapp(
    p_texto_busqueda TEXT,
    p_instancia_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_limite INTEGER DEFAULT 20
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
    updated_at TIMESTAMP WITH TIME ZONE,
    relevancia REAL
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
        c.updated_at,
        -- Calcular relevancia basada en coincidencias
        (
            CASE WHEN c.nombre_contacto ILIKE '%' || p_texto_busqueda || '%' THEN 3.0 ELSE 0.0 END +
            CASE WHEN c.numero_whatsapp ILIKE '%' || p_texto_busqueda || '%' THEN 2.0 ELSE 0.0 END +
            CASE WHEN c.ultimo_mensaje ILIKE '%' || p_texto_busqueda || '%' THEN 1.0 ELSE 0.0 END
        ) as relevancia
    FROM conversaciones_whatsapp c
    WHERE c.user_id = v_user_id
    AND (p_instancia_id IS NULL OR c.instancia_id = p_instancia_id)
    AND c.estado = 'activa'
    AND (
        c.nombre_contacto ILIKE '%' || p_texto_busqueda || '%' OR
        c.numero_whatsapp ILIKE '%' || p_texto_busqueda || '%' OR
        c.ultimo_mensaje ILIKE '%' || p_texto_busqueda || '%'
    )
    ORDER BY relevancia DESC, c.ultimo_mensaje_fecha DESC NULLS LAST
    LIMIT p_limite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios para documentación
COMMENT ON VIEW vista_conversaciones_whatsapp IS 'Vista con conversaciones y estadísticas adicionales para el usuario autenticado';
COMMENT ON VIEW vista_mensajes_whatsapp IS 'Vista con mensajes y información relacionada para el usuario autenticado';
COMMENT ON FUNCTION obtener_mensajes_conversacion IS 'Obtiene los mensajes de una conversación con paginación y verificación de permisos';
COMMENT ON FUNCTION buscar_conversaciones_whatsapp IS 'Busca conversaciones por texto en nombre, número o último mensaje';