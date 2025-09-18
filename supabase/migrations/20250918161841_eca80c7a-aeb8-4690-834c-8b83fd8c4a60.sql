-- Actualizar función handle_new_message para eliminar creación automática de leads
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
  -- Buscar el lead usando el número de WhatsApp real (no el pushname)
  SELECT * INTO lead_record 
  FROM public.leads 
  WHERE user_id = NEW.user_id AND numero_whatsapp = NEW.numero_whatsapp;
  
  -- Si no existe el lead, no procesar el mensaje
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Actualizar lead_id en el mensaje
  NEW.lead_id = lead_record.id;
  
  -- Buscar conversación existente usando lead_id + instancia (esto evita duplicados)
  SELECT * INTO conversacion_record
  FROM public.conversaciones_whatsapp
  WHERE user_id = NEW.user_id 
    AND lead_id = lead_record.id 
    AND instancia_whatsapp = NEW.instanca_nombre;
  
  IF NOT FOUND THEN
    -- Solo crear nueva conversación si no existe una para este lead + instancia
    INSERT INTO public.conversaciones_whatsapp (user_id, lead_id, instancia_whatsapp, ultimo_mensaje, ultimo_mensaje_fecha)
    VALUES (NEW.user_id, lead_record.id, NEW.instanca_nombre, NEW.mensaje, NEW.created_at)
    RETURNING * INTO conversacion_record;
  ELSE
    -- Actualizar la conversación existente (un solo lugar por lead + instancia)
    UPDATE public.conversaciones_whatsapp 
    SET ultimo_mensaje = NEW.mensaje,
        ultimo_mensaje_fecha = NEW.created_at,
        no_leidos = CASE WHEN NEW.direccion = 'recibido' THEN no_leidos + 1 ELSE no_leidos END,
        updated_at = now()
    WHERE id = conversacion_record.id;
  END IF;
  
  -- Actualizar conversacion_id en el mensaje
  NEW.conversacion_id = conversacion_record.id;
  
  RETURN NEW;
END;
$function$;