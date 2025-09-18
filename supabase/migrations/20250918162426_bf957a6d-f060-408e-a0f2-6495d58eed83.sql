-- Crear trigger para ejecutar handle_new_message al insertar mensajes
DROP TRIGGER IF EXISTS trg_handle_new_message ON public.mensajes_whatsapp;
CREATE TRIGGER trg_handle_new_message
BEFORE INSERT ON public.mensajes_whatsapp
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_message();