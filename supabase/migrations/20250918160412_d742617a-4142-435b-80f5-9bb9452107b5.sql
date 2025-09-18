-- Agregar foreign keys faltantes para las relaciones
ALTER TABLE public.conversaciones_whatsapp 
ADD CONSTRAINT conversaciones_whatsapp_lead_id_fkey 
FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

ALTER TABLE public.mensajes_whatsapp 
ADD CONSTRAINT mensajes_whatsapp_lead_id_fkey 
FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

ALTER TABLE public.mensajes_whatsapp 
ADD CONSTRAINT mensajes_whatsapp_conversacion_id_fkey 
FOREIGN KEY (conversacion_id) REFERENCES public.conversaciones_whatsapp(id) ON DELETE CASCADE;