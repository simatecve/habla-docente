-- Corregir la función handle_new_message para evitar creación automática de leads y conversaciones duplicadas
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  lead_record public.leads%ROWTYPE;
  conversacion_record public.conversaciones_whatsapp%ROWTYPE;
BEGIN
  -- Solo procesar si tenemos un número de WhatsApp válido
  IF NEW.numero_whatsapp IS NULL OR NEW.numero_whatsapp = '' THEN
    RAISE EXCEPTION 'Número de WhatsApp es requerido';
  END IF;
  
  -- Buscar lead existente usando el número real de WhatsApp (no pushname)
  SELECT * INTO lead_record 
  FROM public.leads 
  WHERE numero_whatsapp = NEW.numero_whatsapp;
  
  -- Solo crear lead si no existe Y tenemos datos válidos
  IF NOT FOUND THEN
    -- Solo crear lead automáticamente si tenemos información mínima válida
    IF NEW.nombre IS NOT NULL AND NEW.nombre != '' THEN
      INSERT INTO public.leads (user_id, nombre, pushname, numero_whatsapp)
      VALUES (NEW.user_id, NEW.nombre, NEW.pushname, NEW.numero_whatsapp)
      RETURNING * INTO lead_record;
    ELSE
      -- Si no tenemos información suficiente, no crear lead automáticamente
      RAISE EXCEPTION 'Lead no encontrado para número % y no se puede crear automáticamente sin nombre', NEW.numero_whatsapp;
    END IF;
  END IF;
  
  -- Actualizar lead_id en el mensaje
  NEW.lead_id = lead_record.id;
  
  -- Buscar conversación existente usando lead_id + instancia
  SELECT * INTO conversacion_record
  FROM public.conversaciones_whatsapp
  WHERE lead_id = lead_record.id 
    AND instancia_whatsapp = NEW.instanca_nombre;
  
  IF NOT FOUND THEN
    -- Solo crear conversación si no existe
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