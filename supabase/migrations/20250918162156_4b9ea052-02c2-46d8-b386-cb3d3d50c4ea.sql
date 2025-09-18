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

-- Hacer el campo conversacion_id NOT NULL ya que siempre debe tener valor
ALTER TABLE public.mensajes_whatsapp ALTER COLUMN conversacion_id SET NOT NULL;