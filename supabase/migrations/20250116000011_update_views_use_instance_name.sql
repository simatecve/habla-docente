-- Actualizar vistas y políticas RLS para trabajar con nombre_instancia
-- Fecha: 2025-01-16

-- Eliminar vistas existentes
DROP VIEW IF EXISTS vista_conversaciones_whatsapp;
DROP VIEW IF EXISTS vista_mensajes_whatsapp;

-- Recrear vista de conversaciones con nombre_instancia
CREATE VIEW vista_conversaciones_whatsapp AS
SELECT 
    c.id,
    c.nombre_instancia,
    c.numero_whatsapp,
    c.nombre_contacto,
    c.ultimo_mensaje,
    c.direccion_ultimo_mensaje,
    c.ultimo_mensaje_fecha,
    c.mensajes_no_leidos,
    c.estado,
    c.created_at,
    c.updated_at,
    -- Información adicional calculada
    CASE 
        WHEN c.nombre_contacto IS NOT NULL AND c.nombre_contacto != '' 
        THEN c.nombre_contacto 
        ELSE c.numero_whatsapp 
    END as nombre_mostrar,
    CASE 
        WHEN c.ultimo_mensaje_fecha > NOW() - INTERVAL '1 day' THEN 'hoy'
        WHEN c.ultimo_mensaje_fecha > NOW() - INTERVAL '7 days' THEN 'esta_semana'
        WHEN c.ultimo_mensaje_fecha > NOW() - INTERVAL '30 days' THEN 'este_mes'
        ELSE 'anterior'
    END as periodo_ultimo_mensaje
FROM conversaciones_whatsapp c
WHERE c.user_id = auth.uid();

-- Recrear vista de mensajes con nombre_instancia
CREATE VIEW vista_mensajes_whatsapp AS
SELECT 
    m.id,
    m.conversacion_id,
    m.nombre_instancia,
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
    m.updated_at,
    -- Información adicional calculada
    CASE 
        WHEN m.created_at > NOW() - INTERVAL '1 day' THEN 'hoy'
        WHEN m.created_at > NOW() - INTERVAL '7 days' THEN 'esta_semana'
        WHEN m.created_at > NOW() - INTERVAL '30 days' THEN 'este_mes'
        ELSE 'anterior'
    END as periodo_mensaje,
    -- Información de la conversación
    c.nombre_contacto,
    c.estado as estado_conversacion
FROM mensajes_whatsapp m
JOIN conversaciones_whatsapp c ON m.conversacion_id = c.id
WHERE m.user_id = auth.uid() AND c.user_id = auth.uid();

-- Habilitar RLS en las vistas
ALTER VIEW vista_conversaciones_whatsapp SET (security_barrier = true);
ALTER VIEW vista_mensajes_whatsapp SET (security_barrier = true);

-- Otorgar permisos en las vistas
GRANT SELECT ON vista_conversaciones_whatsapp TO authenticated;
GRANT SELECT ON vista_mensajes_whatsapp TO authenticated;

-- Agregar comentarios a las vistas
COMMENT ON VIEW vista_conversaciones_whatsapp IS 'Vista segura de conversaciones de WhatsApp con información calculada usando nombre_instancia';
COMMENT ON VIEW vista_mensajes_whatsapp IS 'Vista segura de mensajes de WhatsApp con información de conversación usando nombre_instancia';

-- Función auxiliar para validar nombre de instancia
CREATE OR REPLACE FUNCTION validar_nombre_instancia(p_nombre_instancia TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Validar que el nombre de instancia no esté vacío y tenga formato válido
    RETURN p_nombre_instancia IS NOT NULL 
           AND LENGTH(TRIM(p_nombre_instancia)) > 0 
           AND LENGTH(p_nombre_instancia) <= 100
           AND p_nombre_instancia ~ '^[a-zA-Z0-9_-]+$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función auxiliar para obtener estadísticas por instancia
CREATE OR REPLACE FUNCTION obtener_estadisticas_instancia(p_nombre_instancia TEXT)
RETURNS TABLE (
    nombre_instancia TEXT,
    total_conversaciones BIGINT,
    conversaciones_activas BIGINT,
    total_mensajes BIGINT,
    mensajes_no_leidos BIGINT,
    ultimo_mensaje_fecha TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p_nombre_instancia,
        COUNT(DISTINCT c.id) as total_conversaciones,
        COUNT(DISTINCT CASE WHEN c.estado = 'activa' THEN c.id END) as conversaciones_activas,
        COUNT(m.id) as total_mensajes,
        SUM(c.mensajes_no_leidos) as mensajes_no_leidos,
        MAX(c.ultimo_mensaje_fecha) as ultimo_mensaje_fecha
    FROM conversaciones_whatsapp c
    LEFT JOIN mensajes_whatsapp m ON c.id = m.conversacion_id
    WHERE c.nombre_instancia = p_nombre_instancia
    AND c.user_id = auth.uid()
    GROUP BY c.nombre_instancia;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener resumen de instancias
CREATE OR REPLACE FUNCTION obtener_resumen_instancias()
RETURNS TABLE (
    nombre_instancia TEXT,
    total_conversaciones BIGINT,
    mensajes_no_leidos BIGINT,
    ultima_actividad TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.nombre_instancia,
        COUNT(c.id) as total_conversaciones,
        SUM(c.mensajes_no_leidos) as mensajes_no_leidos,
        MAX(c.ultimo_mensaje_fecha) as ultima_actividad
    FROM conversaciones_whatsapp c
    WHERE c.user_id = auth.uid()
    GROUP BY c.nombre_instancia
    ORDER BY ultima_actividad DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agregar comentarios a las funciones auxiliares
COMMENT ON FUNCTION validar_nombre_instancia IS 'Valida que el nombre de instancia tenga un formato correcto';
COMMENT ON FUNCTION obtener_estadisticas_instancia IS 'Obtiene estadísticas detalladas de una instancia específica';
COMMENT ON FUNCTION obtener_resumen_instancias IS 'Obtiene un resumen de todas las instancias del usuario';