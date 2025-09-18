-- Crear tabla de leads/contactos
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nombre TEXT,
  pushname TEXT,
  numero_whatsapp TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, numero_whatsapp)
);

-- Crear tabla de conversaciones
CREATE TABLE public.conversaciones_whatsapp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  instancia_id UUID NOT NULL,
  ultimo_mensaje TEXT,
  ultimo_mensaje_fecha TIMESTAMP WITH TIME ZONE,
  no_leidos INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, lead_id, instancia_id)
);

-- Crear tabla de mensajes
CREATE TABLE public.mensajes_whatsapp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversacion_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  instancia_id UUID NOT NULL,
  nombre TEXT,
  pushname TEXT,
  mensaje TEXT NOT NULL,
  tipo_mensaje TEXT DEFAULT 'text',
  direccion TEXT NOT NULL CHECK (direccion IN ('enviado', 'recibido')),
  url_adjunto TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversaciones_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_whatsapp ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para leads
CREATE POLICY "Los usuarios pueden ver sus propios leads" 
ON public.leads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus propios leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propios leads" 
ON public.leads 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propios leads" 
ON public.leads 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para conversaciones
CREATE POLICY "Los usuarios pueden ver sus propias conversaciones" 
ON public.conversaciones_whatsapp 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus propias conversaciones" 
ON public.conversaciones_whatsapp 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propias conversaciones" 
ON public.conversaciones_whatsapp 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propias conversaciones" 
ON public.conversaciones_whatsapp 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para mensajes
CREATE POLICY "Los usuarios pueden ver sus propios mensajes" 
ON public.mensajes_whatsapp 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus propios mensajes" 
ON public.mensajes_whatsapp 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Triggers para updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversaciones_whatsapp_updated_at
BEFORE UPDATE ON public.conversaciones_whatsapp
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Función para crear o actualizar conversación cuando se crea un mensaje
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
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
  
  -- Buscar o crear la conversación
  SELECT * INTO conversacion_record
  FROM public.conversaciones_whatsapp
  WHERE user_id = NEW.user_id AND lead_id = lead_record.id AND instancia_id = NEW.instancia_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.conversaciones_whatsapp (user_id, lead_id, instancia_id, ultimo_mensaje, ultimo_mensaje_fecha)
    VALUES (NEW.user_id, lead_record.id, NEW.instancia_id, NEW.mensaje, NEW.created_at)
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
$$ LANGUAGE plpgsql;

-- Trigger para manejar nuevos mensajes
CREATE TRIGGER handle_new_message_trigger
BEFORE INSERT ON public.mensajes_whatsapp
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_message();