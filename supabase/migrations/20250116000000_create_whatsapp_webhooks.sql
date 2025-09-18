-- Crear tabla para webhooks de WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_webhooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    instancia_id UUID NOT NULL REFERENCES public.instancias_whatsapp(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- 'message_received', 'message_sent', 'status_change', 'qr_generated', 'connection_status'
    payload JSONB NOT NULL,
    from_number VARCHAR(50),
    to_number VARCHAR(50),
    message_id VARCHAR(255),
    status VARCHAR(50), -- 'pending', 'sent', 'delivered', 'read', 'failed'
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Crear tabla para configuración de webhooks de WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    instancia_id UUID NOT NULL REFERENCES public.instancias_whatsapp(id) ON DELETE CASCADE,
    webhook_url TEXT NOT NULL,
    secret_token VARCHAR(255),
    events TEXT[] DEFAULT ARRAY['message_received', 'message_sent', 'status_change'],
    is_active BOOLEAN DEFAULT true,
    retry_attempts INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla para logs de webhooks de WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    webhook_config_id UUID NOT NULL REFERENCES public.whatsapp_webhook_config(id) ON DELETE CASCADE,
    instancia_id UUID NOT NULL REFERENCES public.instancias_whatsapp(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    attempt_number INTEGER DEFAULT 1,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla para mensajes de WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    instancia_id UUID NOT NULL REFERENCES public.instancias_whatsapp(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_id VARCHAR(255) UNIQUE,
    from_number VARCHAR(50) NOT NULL,
    to_number VARCHAR(50) NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'document', 'audio', 'video'
    content TEXT,
    media_url TEXT,
    media_caption TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'read', 'failed'
    direction VARCHAR(20) NOT NULL, -- 'inbound', 'outbound'
    timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla para contactos de WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    instancia_id UUID NOT NULL REFERENCES public.instancias_whatsapp(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    profile_picture_url TEXT,
    is_business BOOLEAN DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(instancia_id, phone_number)
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhooks_instancia_id ON public.whatsapp_webhooks(instancia_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhooks_user_id ON public.whatsapp_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhooks_event_type ON public.whatsapp_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhooks_processed ON public.whatsapp_webhooks(processed);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhooks_created_at ON public.whatsapp_webhooks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_config_user_id ON public.whatsapp_webhook_config(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_config_instancia_id ON public.whatsapp_webhook_config(instancia_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_config_active ON public.whatsapp_webhook_config(is_active);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_logs_config_id ON public.whatsapp_webhook_logs(webhook_config_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_logs_instancia_id ON public.whatsapp_webhook_logs(instancia_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_logs_executed_at ON public.whatsapp_webhook_logs(executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instancia_id ON public.whatsapp_messages(instancia_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON public.whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_message_id ON public.whatsapp_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from_number ON public.whatsapp_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_to_number ON public.whatsapp_messages(to_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction ON public.whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON public.whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON public.whatsapp_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_instancia_id ON public.whatsapp_contacts(instancia_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_user_id ON public.whatsapp_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone_number ON public.whatsapp_contacts(phone_number);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.whatsapp_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhook_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para whatsapp_webhooks
CREATE POLICY "Los usuarios pueden ver sus propios webhooks de WhatsApp" 
ON public.whatsapp_webhooks FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear webhooks de WhatsApp" 
ON public.whatsapp_webhooks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus webhooks de WhatsApp" 
ON public.whatsapp_webhooks FOR UPDATE 
USING (auth.uid() = user_id);

-- Políticas RLS para whatsapp_webhook_config
CREATE POLICY "Los usuarios pueden ver su configuración de webhooks de WhatsApp" 
ON public.whatsapp_webhook_config FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear configuración de webhooks de WhatsApp" 
ON public.whatsapp_webhook_config FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar su configuración de webhooks de WhatsApp" 
ON public.whatsapp_webhook_config FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar su configuración de webhooks de WhatsApp" 
ON public.whatsapp_webhook_config FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para whatsapp_webhook_logs
CREATE POLICY "Los usuarios pueden ver logs de sus webhooks de WhatsApp" 
ON public.whatsapp_webhook_logs FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.whatsapp_webhook_config 
        WHERE whatsapp_webhook_config.id = whatsapp_webhook_logs.webhook_config_id 
        AND whatsapp_webhook_config.user_id = auth.uid()
    )
);

CREATE POLICY "Sistema puede insertar logs de webhooks de WhatsApp" 
ON public.whatsapp_webhook_logs FOR INSERT 
WITH CHECK (true);

-- Políticas RLS para whatsapp_messages
CREATE POLICY "Los usuarios pueden ver sus mensajes de WhatsApp" 
ON public.whatsapp_messages FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear mensajes de WhatsApp" 
ON public.whatsapp_messages FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus mensajes de WhatsApp" 
ON public.whatsapp_messages FOR UPDATE 
USING (auth.uid() = user_id);

-- Políticas RLS para whatsapp_contacts
CREATE POLICY "Los usuarios pueden ver sus contactos de WhatsApp" 
ON public.whatsapp_contacts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear contactos de WhatsApp" 
ON public.whatsapp_contacts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus contactos de WhatsApp" 
ON public.whatsapp_contacts FOR UPDATE 
USING (auth.uid() = user_id);

-- Triggers para actualizar updated_at
CREATE TRIGGER update_whatsapp_webhook_config_updated_at
    BEFORE UPDATE ON public.whatsapp_webhook_config
    FOR EACH ROW
    EXECUTE FUNCTION public.actualizar_updated_at();

CREATE TRIGGER update_whatsapp_messages_updated_at
    BEFORE UPDATE ON public.whatsapp_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.actualizar_updated_at();

CREATE TRIGGER update_whatsapp_contacts_updated_at
    BEFORE UPDATE ON public.whatsapp_contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.actualizar_updated_at();

-- Función para procesar webhooks de WhatsApp
CREATE OR REPLACE FUNCTION process_whatsapp_webhook(
    p_instancia_id UUID,
    p_event_type VARCHAR,
    p_payload JSONB
) RETURNS UUID AS $$
DECLARE
    webhook_id UUID;
    user_id_var UUID;
BEGIN
    -- Obtener el user_id de la instancia
    SELECT user_id INTO user_id_var
    FROM public.instancias_whatsapp
    WHERE id = p_instancia_id;
    
    -- Insertar el webhook
    INSERT INTO public.whatsapp_webhooks (
        instancia_id,
        user_id,
        event_type,
        payload,
        from_number,
        to_number,
        message_id,
        status
    ) VALUES (
        p_instancia_id,
        user_id_var,
        p_event_type,
        p_payload,
        (p_payload->>'from')::VARCHAR(50),
        (p_payload->>'to')::VARCHAR(50),
        (p_payload->>'messageId')::VARCHAR(255),
        (p_payload->>'status')::VARCHAR(50)
    ) RETURNING id INTO webhook_id;
    
    RETURN webhook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de WhatsApp
CREATE OR REPLACE FUNCTION get_whatsapp_stats(p_user_id UUID, p_instancia_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_messages', COUNT(*),
        'sent_messages', COUNT(*) FILTER (WHERE direction = 'outbound'),
        'received_messages', COUNT(*) FILTER (WHERE direction = 'inbound'),
        'delivered_messages', COUNT(*) FILTER (WHERE status = 'delivered'),
        'read_messages', COUNT(*) FILTER (WHERE status = 'read'),
        'failed_messages', COUNT(*) FILTER (WHERE status = 'failed'),
        'total_contacts', (
            SELECT COUNT(DISTINCT phone_number) 
            FROM public.whatsapp_contacts 
            WHERE user_id = p_user_id 
            AND (p_instancia_id IS NULL OR instancia_id = p_instancia_id)
        )
    ) INTO stats
    FROM public.whatsapp_messages
    WHERE user_id = p_user_id
    AND (p_instancia_id IS NULL OR instancia_id = p_instancia_id)
    AND created_at >= NOW() - INTERVAL '30 days';
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permisos
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.whatsapp_webhooks TO authenticated;
GRANT ALL ON public.whatsapp_webhook_config TO authenticated;
GRANT ALL ON public.whatsapp_webhook_logs TO authenticated;
GRANT ALL ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_contacts TO authenticated;
GRANT EXECUTE ON FUNCTION process_whatsapp_webhook(UUID, VARCHAR, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_whatsapp_stats(UUID, UUID) TO authenticated;