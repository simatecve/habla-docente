-- Corregir función handle_new_message para lógica real de conversaciones
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  lead_record public.leads%ROWTYPE;
  conversacion_record public.conversaciones_whatsapp%ROWTYPE;
BEGIN
  -- Buscar el lead usando el número de WhatsApp real
  SELECT * INTO lead_record 
  FROM public.leads 
  WHERE user_id = NEW.user_id AND numero_whatsapp = NEW.numero_whatsapp;
  
  -- Si no existe el lead, no procesar el mensaje
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Actualizar lead_id en el mensaje
  NEW.lead_id = lead_record.id;
  
  -- Buscar conversación existente usando lead_id + instancia
  -- Usar el campo correcto para la instancia
  SELECT * INTO conversacion_record
  FROM public.conversaciones_whatsapp
  WHERE user_id = NEW.user_id 
    AND lead_id = lead_record.id 
    AND COALESCE(instancia_whatsapp, '') = COALESCE(NEW.instanca_nombre, '');
  
  IF NOT FOUND THEN
    -- Crear nueva conversación solo si no existe una para este lead + instancia
    INSERT INTO public.conversaciones_whatsapp (
      user_id, 
      lead_id, 
      instancia_whatsapp, 
      ultimo_mensaje, 
      ultimo_mensaje_fecha,
      no_leidos
    )
    VALUES (
      NEW.user_id, 
      lead_record.id, 
      NEW.instanca_nombre, 
      NEW.mensaje, 
      NEW.created_at,
      CASE WHEN NEW.direccion = 'recibido' THEN 1 ELSE 0 END
    )
    RETURNING * INTO conversacion_record;
    
    RAISE LOG 'Nueva conversación creada: %, Lead: %, Instancia: %', 
      conversacion_record.id, lead_record.id, NEW.instanca_nombre;
  ELSE
    -- Actualizar la conversación existente
    UPDATE public.conversaciones_whatsapp 
    SET ultimo_mensaje = NEW.mensaje,
        ultimo_mensaje_fecha = NEW.created_at,
        no_leidos = CASE 
          WHEN NEW.direccion = 'recibido' THEN no_leidos + 1 
          ELSE no_leidos 
        END,
        updated_at = now()
    WHERE id = conversacion_record.id;
    
    RAISE LOG 'Conversación actualizada: %, Mensaje: %', 
      conversacion_record.id, NEW.mensaje;
  END IF;
  
  -- Actualizar conversacion_id en el mensaje
  NEW.conversacion_id = conversacion_record.id;
  
  RETURN NEW;
END;
$function$;

-- Limpiar mensajes huérfanos que no tienen conversacion_id
-- Primero crear conversaciones para mensajes existentes sin conversacion_id
DO $$
DECLARE
  mensaje_record RECORD;
  lead_record public.leads%ROWTYPE;
  conversacion_record public.conversaciones_whatsapp%ROWTYPE;
BEGIN
  FOR mensaje_record IN 
    SELECT * FROM public.mensajes_whatsapp WHERE conversacion_id IS NULL
  LOOP
    -- Buscar el lead para este mensaje
    SELECT * INTO lead_record 
    FROM public.leads 
    WHERE user_id = mensaje_record.user_id 
      AND numero_whatsapp = mensaje_record.numero_whatsapp;
    
    IF FOUND THEN
      -- Buscar conversación existente
      SELECT * INTO conversacion_record
      FROM public.conversaciones_whatsapp
      WHERE user_id = mensaje_record.user_id 
        AND lead_id = lead_record.id 
        AND COALESCE(instancia_whatsapp, '') = COALESCE(mensaje_record.instanca_nombre, '');
      
      IF NOT FOUND THEN
        -- Crear nueva conversación
        INSERT INTO public.conversaciones_whatsapp (
          user_id, 
          lead_id, 
          instancia_whatsapp, 
          ultimo_mensaje, 
          ultimo_mensaje_fecha,
          no_leidos
        )
        VALUES (
          mensaje_record.user_id, 
          lead_record.id, 
          mensaje_record.instanca_nombre, 
          mensaje_record.mensaje, 
          mensaje_record.created_at,
          CASE WHEN mensaje_record.direccion = 'recibido' THEN 1 ELSE 0 END
        )
        RETURNING * INTO conversacion_record;
      END IF;
      
      -- Actualizar el mensaje con la conversacion_id
      UPDATE public.mensajes_whatsapp 
      SET conversacion_id = conversacion_record.id,
          lead_id = lead_record.id
      WHERE id = mensaje_record.id;
    ELSE
      -- Si no hay lead, eliminar el mensaje huérfano
      DELETE FROM public.mensajes_whatsapp WHERE id = mensaje_record.id;
    END IF;
  END LOOP;
END $$;