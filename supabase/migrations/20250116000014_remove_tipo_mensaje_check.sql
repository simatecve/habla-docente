-- Eliminar la restricción CHECK del campo tipo_mensaje
-- Esto permite enviar cualquier valor (image, text, document, etc.)

ALTER TABLE mensajes_whatsapp 
DROP CONSTRAINT IF EXISTS mensajes_whatsapp_tipo_mensaje_check;

-- Opcional: Cambiar el valor por defecto a NULL para mayor flexibilidad
ALTER TABLE mensajes_whatsapp 
ALTER COLUMN tipo_mensaje DROP DEFAULT;

-- Comentario: Ahora tipo_mensaje acepta cualquier valor de texto
COMMENT ON COLUMN mensajes_whatsapp.tipo_mensaje IS 'Tipo de mensaje - acepta cualquier valor (image, text, video, audio, document, etc.)';