-- Habilitar RLS en las tablas de WhatsApp
ALTER TABLE public.conversaciones_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instancias_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;