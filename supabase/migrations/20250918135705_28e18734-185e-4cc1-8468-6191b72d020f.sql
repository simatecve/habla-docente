-- Crear tabla para instancias de WhatsApp
CREATE TABLE public.instancias_whatsapp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nombre_instancia TEXT NOT NULL,
  numero_whatsapp TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'desconectado',
  codigo_qr TEXT,
  webhook_respuesta JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.instancias_whatsapp ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY "Los usuarios pueden ver sus propias instancias de WhatsApp" 
ON public.instancias_whatsapp 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus propias instancias de WhatsApp" 
ON public.instancias_whatsapp 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propias instancias de WhatsApp" 
ON public.instancias_whatsapp 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propias instancias de WhatsApp" 
ON public.instancias_whatsapp 
FOR DELETE 
USING (auth.uid() = user_id);

-- Agregar trigger para actualizar updated_at
CREATE TRIGGER update_instancias_whatsapp_updated_at
BEFORE UPDATE ON public.instancias_whatsapp
FOR EACH ROW
EXECUTE FUNCTION public.actualizar_updated_at();