-- Actualizar triggers para trabajar con nombre_instancia en lugar de instancia_id
-- Fecha: 2025-01-16

-- Eliminar triggers existentes
DROP TRIGGER IF EXISTS trigger_actualizar_conversacion_insert ON mensajes_whatsapp;
DROP TRIGGER IF EXISTS trigger_actualizar_conversacion_update ON mensajes_whatsapp;
DROP TRIGGER IF EXISTS trigger_actualizar_conversacion_delete ON mensajes_whatsapp;

-- Eliminar funciones de trigger existentes
DROP FUNCTION IF EXISTS actualizar_conversacion_al_insertar_mensaje();
DROP FUNCTION IF EXISTS actualizar_conversacion_al_actualizar_mensaje();
DROP FUNCTION IF EXISTS actualizar_conversacion_al_eliminar_mensaje();
DROP FUNCTION IF EXISTS recalcular_estadisticas_conversacion(UUID);
DROP FUNCTION IF EXISTS limpiar_conversaciones_vacias();

-- Función para actualizar conversación al insertar mensaje (usando nombre_instancia)
CREATE OR REPLACE FUNCTION actualizar_conversacion_al_insertar_mensaje()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar la conversación con el nuevo mensaje
    UPDATE conversaciones_whatsapp SET
        ultimo_mensaje = NEW.mensaje,
        direccion_ultimo_mensaje = NEW.direccion,
        ultimo_mensaje_fecha = NEW.created_at,
        mensajes_no_leidos = CASE 
            WHEN NEW.direccion = 'recibido' THEN mensajes_no_leidos + 1 
            ELSE mensajes_no_leidos 
        END,
        updated_at = NOW()
    WHERE id = NEW.conversacion_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar conversación al actualizar mensaje (usando nombre_instancia)
CREATE OR REPLACE FUNCTION actualizar_conversacion_al_actualizar_mensaje()
RETURNS TRIGGER AS $$
DECLARE
    v_es_ultimo_mensaje BOOLEAN;
BEGIN
    -- Verificar si este es el último mensaje de la conversación
    SELECT EXISTS(
        SELECT 1 FROM mensajes_whatsapp 
        WHERE conversacion_id = NEW.conversacion_id 
        AND created_at > NEW.created_at
    ) INTO v_es_ultimo_mensaje;
    
    -- Si es el último mensaje, actualizar la conversación
    IF NOT v_es_ultimo_mensaje THEN
        UPDATE conversaciones_whatsapp SET
            ultimo_mensaje = NEW.mensaje,
            direccion_ultimo_mensaje = NEW.direccion,
            ultimo_mensaje_fecha = NEW.created_at,
            updated_at = NOW()
        WHERE id = NEW.conversacion_id;
    END IF;
    
    -- Si cambió el estado de leído, actualizar contador
    IF OLD.leido != NEW.leido AND NEW.direccion = 'recibido' THEN
        UPDATE conversaciones_whatsapp SET
            mensajes_no_leidos = CASE 
                WHEN NEW.leido THEN GREATEST(mensajes_no_leidos - 1, 0)
                ELSE mensajes_no_leidos + 1
            END
        WHERE id = NEW.conversacion_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar conversación al eliminar mensaje (usando nombre_instancia)
CREATE OR REPLACE FUNCTION actualizar_conversacion_al_eliminar_mensaje()
RETURNS TRIGGER AS $$
DECLARE
    v_ultimo_mensaje RECORD;
    v_mensajes_no_leidos INTEGER;
BEGIN
    -- Buscar el nuevo último mensaje
    SELECT mensaje, direccion, created_at
    INTO v_ultimo_mensaje
    FROM mensajes_whatsapp 
    WHERE conversacion_id = OLD.conversacion_id
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Contar mensajes no leídos
    SELECT COUNT(*)::INTEGER
    INTO v_mensajes_no_leidos
    FROM mensajes_whatsapp 
    WHERE conversacion_id = OLD.conversacion_id 
    AND direccion = 'recibido' 
    AND leido = FALSE;
    
    IF v_ultimo_mensaje IS NOT NULL THEN
        -- Actualizar conversación con el nuevo último mensaje
        UPDATE conversaciones_whatsapp SET
            ultimo_mensaje = v_ultimo_mensaje.mensaje,
            direccion_ultimo_mensaje = v_ultimo_mensaje.direccion,
            ultimo_mensaje_fecha = v_ultimo_mensaje.created_at,
            mensajes_no_leidos = v_mensajes_no_leidos,
            updated_at = NOW()
        WHERE id = OLD.conversacion_id;
    ELSE
        -- No hay más mensajes, eliminar la conversación
        DELETE FROM conversaciones_whatsapp 
        WHERE id = OLD.conversacion_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Función para recalcular estadísticas de conversación (usando nombre_instancia)
CREATE OR REPLACE FUNCTION recalcular_estadisticas_conversacion(
    p_conversacion_id UUID
) RETURNS VOID AS $$
DECLARE
    v_ultimo_mensaje RECORD;
    v_mensajes_no_leidos INTEGER;
BEGIN
    -- Buscar el último mensaje
    SELECT mensaje, direccion, created_at
    INTO v_ultimo_mensaje
    FROM mensajes_whatsapp 
    WHERE conversacion_id = p_conversacion_id
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Contar mensajes no leídos
    SELECT COUNT(*)::INTEGER
    INTO v_mensajes_no_leidos
    FROM mensajes_whatsapp 
    WHERE conversacion_id = p_conversacion_id 
    AND direccion = 'recibido' 
    AND leido = FALSE;
    
    -- Actualizar conversación
    UPDATE conversaciones_whatsapp SET
        ultimo_mensaje = v_ultimo_mensaje.mensaje,
        direccion_ultimo_mensaje = v_ultimo_mensaje.direccion,
        ultimo_mensaje_fecha = v_ultimo_mensaje.created_at,
        mensajes_no_leidos = v_mensajes_no_leidos,
        updated_at = NOW()
    WHERE id = p_conversacion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpiar conversaciones vacías (usando nombre_instancia)
CREATE OR REPLACE FUNCTION limpiar_conversaciones_vacias()
RETURNS INTEGER AS $$
DECLARE
    v_eliminadas INTEGER;
BEGIN
    -- Eliminar conversaciones sin mensajes
    WITH conversaciones_vacias AS (
        DELETE FROM conversaciones_whatsapp c
        WHERE NOT EXISTS (
            SELECT 1 FROM mensajes_whatsapp m 
            WHERE m.conversacion_id = c.id
        )
        AND c.user_id = auth.uid()
        RETURNING id
    )
    SELECT COUNT(*)::INTEGER INTO v_eliminadas FROM conversaciones_vacias;
    
    RETURN v_eliminadas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear triggers actualizados
CREATE TRIGGER trigger_actualizar_conversacion_insert
    AFTER INSERT ON mensajes_whatsapp
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_conversacion_al_insertar_mensaje();

CREATE TRIGGER trigger_actualizar_conversacion_update
    AFTER UPDATE ON mensajes_whatsapp
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_conversacion_al_actualizar_mensaje();

CREATE TRIGGER trigger_actualizar_conversacion_delete
    AFTER DELETE ON mensajes_whatsapp
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_conversacion_al_eliminar_mensaje();

-- Agregar comentarios
COMMENT ON FUNCTION actualizar_conversacion_al_insertar_mensaje IS 'Trigger para actualizar conversación al insertar mensaje usando nombre_instancia';
COMMENT ON FUNCTION actualizar_conversacion_al_actualizar_mensaje IS 'Trigger para actualizar conversación al modificar mensaje usando nombre_instancia';
COMMENT ON FUNCTION actualizar_conversacion_al_eliminar_mensaje IS 'Trigger para actualizar conversación al eliminar mensaje usando nombre_instancia';
COMMENT ON FUNCTION recalcular_estadisticas_conversacion IS 'Recalcula las estadísticas de una conversación usando nombre_instancia';
COMMENT ON FUNCTION limpiar_conversaciones_vacias IS 'Elimina conversaciones que no tienen mensajes usando nombre_instancia';