-- Trigger para actualizar conversación cuando se inserta un mensaje
CREATE OR REPLACE FUNCTION trigger_actualizar_conversacion_nuevo_mensaje()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar la conversación con el nuevo mensaje
    UPDATE conversaciones_whatsapp
    SET 
        ultimo_mensaje = NEW.mensaje,
        ultimo_mensaje_fecha = NEW.created_at,
        direccion_ultimo_mensaje = NEW.direccion,
        mensajes_no_leidos = CASE 
            WHEN NEW.direccion = 'recibido' THEN mensajes_no_leidos + 1
            ELSE mensajes_no_leidos
        END,
        updated_at = NOW()
    WHERE id = NEW.conversacion_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para inserción de mensajes
CREATE TRIGGER trigger_mensaje_insertado
    AFTER INSERT ON mensajes_whatsapp
    FOR EACH ROW
    EXECUTE FUNCTION trigger_actualizar_conversacion_nuevo_mensaje();

-- Trigger para actualizar conversación cuando se actualiza un mensaje
CREATE OR REPLACE FUNCTION trigger_actualizar_conversacion_mensaje_actualizado()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actualizar si es el mensaje más reciente de la conversación
    IF NEW.created_at = (
        SELECT MAX(created_at) 
        FROM mensajes_whatsapp 
        WHERE conversacion_id = NEW.conversacion_id
    ) THEN
        UPDATE conversaciones_whatsapp
        SET 
            ultimo_mensaje = NEW.mensaje,
            direccion_ultimo_mensaje = NEW.direccion,
            updated_at = NOW()
        WHERE id = NEW.conversacion_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualización de mensajes
CREATE TRIGGER trigger_mensaje_actualizado
    AFTER UPDATE ON mensajes_whatsapp
    FOR EACH ROW
    EXECUTE FUNCTION trigger_actualizar_conversacion_mensaje_actualizado();

-- Trigger para recalcular mensajes no leídos cuando se marca como leído
CREATE OR REPLACE FUNCTION trigger_recalcular_mensajes_no_leidos()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo si cambió el estado de leído de FALSE a TRUE
    IF OLD.leido = FALSE AND NEW.leido = TRUE AND NEW.direccion = 'recibido' THEN
        UPDATE conversaciones_whatsapp
        SET 
            mensajes_no_leidos = GREATEST(mensajes_no_leidos - 1, 0),
            updated_at = NOW()
        WHERE id = NEW.conversacion_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para recálculo de mensajes no leídos
CREATE TRIGGER trigger_mensaje_leido
    AFTER UPDATE ON mensajes_whatsapp
    FOR EACH ROW
    WHEN (OLD.leido IS DISTINCT FROM NEW.leido)
    EXECUTE FUNCTION trigger_recalcular_mensajes_no_leidos();

-- Trigger para limpiar conversación cuando se elimina el último mensaje
CREATE OR REPLACE FUNCTION trigger_limpiar_conversacion_mensaje_eliminado()
RETURNS TRIGGER AS $$
DECLARE
    v_ultimo_mensaje RECORD;
BEGIN
    -- Buscar el nuevo último mensaje de la conversación
    SELECT mensaje, created_at, direccion
    INTO v_ultimo_mensaje
    FROM mensajes_whatsapp
    WHERE conversacion_id = OLD.conversacion_id
    ORDER BY created_at DESC
    LIMIT 1;

    -- Si hay mensajes, actualizar con el último
    IF FOUND THEN
        UPDATE conversaciones_whatsapp
        SET 
            ultimo_mensaje = v_ultimo_mensaje.mensaje,
            ultimo_mensaje_fecha = v_ultimo_mensaje.created_at,
            direccion_ultimo_mensaje = v_ultimo_mensaje.direccion,
            mensajes_no_leidos = (
                SELECT COUNT(*)
                FROM mensajes_whatsapp
                WHERE conversacion_id = OLD.conversacion_id
                AND direccion = 'recibido'
                AND leido = FALSE
            ),
            updated_at = NOW()
        WHERE id = OLD.conversacion_id;
    ELSE
        -- Si no hay mensajes, eliminar la conversación
        DELETE FROM conversaciones_whatsapp
        WHERE id = OLD.conversacion_id;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para eliminación de mensajes
CREATE TRIGGER trigger_mensaje_eliminado
    AFTER DELETE ON mensajes_whatsapp
    FOR EACH ROW
    EXECUTE FUNCTION trigger_limpiar_conversacion_mensaje_eliminado();

-- Función para recalcular estadísticas de conversación
CREATE OR REPLACE FUNCTION recalcular_estadisticas_conversacion(p_conversacion_id UUID)
RETURNS VOID AS $$
DECLARE
    v_ultimo_mensaje RECORD;
    v_mensajes_no_leidos INTEGER;
BEGIN
    -- Obtener el último mensaje
    SELECT mensaje, created_at, direccion
    INTO v_ultimo_mensaje
    FROM mensajes_whatsapp
    WHERE conversacion_id = p_conversacion_id
    ORDER BY created_at DESC
    LIMIT 1;

    -- Contar mensajes no leídos
    SELECT COUNT(*)
    INTO v_mensajes_no_leidos
    FROM mensajes_whatsapp
    WHERE conversacion_id = p_conversacion_id
    AND direccion = 'recibido'
    AND leido = FALSE;

    -- Actualizar conversación
    IF FOUND THEN
        UPDATE conversaciones_whatsapp
        SET 
            ultimo_mensaje = v_ultimo_mensaje.mensaje,
            ultimo_mensaje_fecha = v_ultimo_mensaje.created_at,
            direccion_ultimo_mensaje = v_ultimo_mensaje.direccion,
            mensajes_no_leidos = v_mensajes_no_leidos,
            updated_at = NOW()
        WHERE id = p_conversacion_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para limpiar conversaciones vacías
CREATE OR REPLACE FUNCTION limpiar_conversaciones_vacias()
RETURNS INTEGER AS $$
DECLARE
    v_conversaciones_eliminadas INTEGER;
BEGIN
    DELETE FROM conversaciones_whatsapp
    WHERE id NOT IN (
        SELECT DISTINCT conversacion_id
        FROM mensajes_whatsapp
        WHERE conversacion_id IS NOT NULL
    );

    GET DIAGNOSTICS v_conversaciones_eliminadas = ROW_COUNT;
    
    RETURN v_conversaciones_eliminadas;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON FUNCTION trigger_actualizar_conversacion_nuevo_mensaje IS 'Trigger que actualiza la conversación cuando se inserta un nuevo mensaje';
COMMENT ON FUNCTION trigger_actualizar_conversacion_mensaje_actualizado IS 'Trigger que actualiza la conversación cuando se modifica el último mensaje';
COMMENT ON FUNCTION trigger_recalcular_mensajes_no_leidos IS 'Trigger que recalcula los mensajes no leídos cuando se marca un mensaje como leído';
COMMENT ON FUNCTION trigger_limpiar_conversacion_mensaje_eliminado IS 'Trigger que limpia la conversación cuando se elimina un mensaje';
COMMENT ON FUNCTION recalcular_estadisticas_conversacion IS 'Recalcula las estadísticas de una conversación específica';
COMMENT ON FUNCTION limpiar_conversaciones_vacias IS 'Elimina conversaciones que no tienen mensajes asociados';