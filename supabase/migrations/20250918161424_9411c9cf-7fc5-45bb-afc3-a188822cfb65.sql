-- Primero limpiar los datos duplicados/incorrectos
-- Eliminar leads que tienen pushname como numero_whatsapp (datos incorrectos)
DELETE FROM public.leads 
WHERE numero_whatsapp IN ('Koonetxa') OR numero_whatsapp = pushname;

-- Eliminar conversaciones huérfanas que quedaron sin lead válido
DELETE FROM public.conversaciones_whatsapp 
WHERE lead_id NOT IN (SELECT id FROM public.leads);

-- Reasignar mensajes al lead correcto
UPDATE public.mensajes_whatsapp 
SET lead_id = (
  SELECT id FROM public.leads 
  WHERE numero_whatsapp = mensajes_whatsapp.numero_whatsapp 
  LIMIT 1
)
WHERE lead_id IS NULL OR lead_id NOT IN (SELECT id FROM public.leads);

-- Reasignar mensajes a la conversación correcta
UPDATE public.mensajes_whatsapp 
SET conversacion_id = (
  SELECT id FROM public.conversaciones_whatsapp 
  WHERE lead_id = mensajes_whatsapp.lead_id 
  AND instancia_whatsapp = mensajes_whatsapp.instanca_nombre
  LIMIT 1
)
WHERE conversacion_id IS NULL OR conversacion_id NOT IN (SELECT id FROM public.conversaciones_whatsapp);

-- Corregir la función handle_new_message para evitar creación automática de leads
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  lead_record public.leads%ROWTYPE;
  conversacion_record public.conversaciones_whatsapp%ROWTYPE;
BEGIN
  -- Buscar el lead usando el número de WhatsApp real (no el pushname)
  SELECT * INTO lead_record 
  FROM public.leads 
  WHERE user_id = NEW.user_id AND numero_whatsapp = NEW.numero_whatsapp;
  
  -- Si no existe el lead, NO crear uno automáticamente
  -- En su lugar, registrar un error o simplemente no procesar
  IF NOT FOUND THEN
    -- Opción 1: Fallar silenciosamente (comentar la línea siguiente para activar)
    -- RAISE EXCEPTION 'Lead no encontrado para el número %', NEW.numero_whatsapp;
    
    -- Opción 2: Procesar sin lead (lead_id quedará NULL)
    -- NEW.lead_id = NULL;
    -- RETURN NEW;
    
    -- Opción 3: Crear lead solo si tenemos datos válidos
    IF NEW.numero_whatsapp IS NOT NULL AND NEW.numero_whatsapp != '' THEN
      INSERT INTO public.leads (user_id, nombre, pushname, numero_whatsapp)
      VALUES (NEW.user_id, COALESCE(NEW.nombre, NEW.pushname), NEW.pushname, NEW.numero_whatsapp)
      RETURNING * INTO lead_record;
    ELSE
      -- Si no tenemos un número válido, no procesar
      RETURN NEW;
    END IF;
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
$function$