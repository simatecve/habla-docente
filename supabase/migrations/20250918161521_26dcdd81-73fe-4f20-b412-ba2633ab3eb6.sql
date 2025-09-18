-- Habilitar RLS en todas las tablas que no lo tienen
ALTER TABLE public.agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversaciones_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instancias_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snippets ENABLE ROW LEVEL SECURITY;

-- Corregir las funciones para que tengan search_path seguro
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
  
  -- Si no existe el lead, crear uno solo si tenemos datos válidos
  IF NOT FOUND THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.actualizar_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;