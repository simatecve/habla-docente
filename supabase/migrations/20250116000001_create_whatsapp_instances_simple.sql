-- Crear tabla simple para instancias de WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    numero VARCHAR(50) NOT NULL,
    estatus VARCHAR(50) DEFAULT 'pendiente' CHECK (estatus IN ('pendiente', 'conectado', 'desconectado')),
    webhook_response JSONB,
    qr_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user_id ON public.whatsapp_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_estatus ON public.whatsapp_instances(estatus);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_created_at ON public.whatsapp_instances(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Los usuarios pueden ver sus propias instancias de WhatsApp" 
ON public.whatsapp_instances FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus propias instancias de WhatsApp" 
ON public.whatsapp_instances FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propias instancias de WhatsApp" 
ON public.whatsapp_instances FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propias instancias de WhatsApp" 
ON public.whatsapp_instances FOR DELETE 
USING (auth.uid() = user_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_whatsapp_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at
CREATE TRIGGER update_whatsapp_instances_updated_at
    BEFORE UPDATE ON public.whatsapp_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_instances_updated_at();

-- Conceder permisos
GRANT ALL ON public.whatsapp_instances TO authenticated;