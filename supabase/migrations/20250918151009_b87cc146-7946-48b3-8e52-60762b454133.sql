-- Actualizar la función handle_new_message para usar nombres de instancia
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  lead_record public.leads%ROWTYPE;
  conversacion_record public.conversaciones_whatsapp%ROWTYPE;
BEGIN
  -- Buscar o crear el lead
  SELECT * INTO lead_record 
  FROM public.leads 
  WHERE user_id = NEW.user_id AND numero_whatsapp = NEW.pushname;
  
  IF NOT FOUND THEN
    INSERT INTO public.leads (user_id, nombre, pushname, numero_whatsapp)
    VALUES (NEW.user_id, NEW.nombre, NEW.pushname, NEW.pushname)
    RETURNING * INTO lead_record;
  END IF;
  
  -- Actualizar lead_id en el mensaje
  NEW.lead_id = lead_record.id;
  
  -- Buscar o crear la conversación usando el nombre de la instancia
  SELECT * INTO conversacion_record
  FROM public.conversaciones_whatsapp
  WHERE user_id = NEW.user_id AND lead_id = lead_record.id AND instancia_whatsapp = NEW.instanca_nombre;
  
  IF NOT FOUND THEN
    INSERT INTO public.conversaciones_whatsapp (user_id, lead_id, instancia_whatsapp, ultimo_mensaje, ultimo_mensaje_fecha)
    VALUES (NEW.user_id, lead_record.id, NEW.instanca_nombre, NEW.mensaje, NEW.created_at)
    RETURNING * INTO conversacion_record;
  ELSE
    -- Actualizar la conversación existente
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

-- Eliminar la constraint única existente si existe
ALTER TABLE public.conversaciones_whatsapp DROP CONSTRAINT IF EXISTS conversaciones_whatsapp_user_id_lead_id_instancia_id_key;

-- Crear nueva constraint única usando instancia_whatsapp en lugar de instancia_id
ALTER TABLE public.conversaciones_whatsapp ADD CONSTRAINT conversaciones_whatsapp_user_id_lead_id_instancia_unique 
UNIQUE (user_id, lead_id, instancia_whatsapp);