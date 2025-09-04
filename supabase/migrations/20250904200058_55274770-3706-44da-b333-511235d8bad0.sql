-- Crear tabla de agentes IA (solo si no existe)
CREATE TABLE IF NOT EXISTS public.agentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  openai_api_key TEXT,
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'entrenando')),
  tokens_utilizados INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de documentos (solo si no existe)
CREATE TABLE IF NOT EXISTS public.documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agente_id UUID NOT NULL REFERENCES public.agentes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  archivo_url TEXT,
  contenido_extraido TEXT,
  tamano_archivo INTEGER,
  estado_procesamiento TEXT DEFAULT 'pendiente' CHECK (estado_procesamiento IN ('pendiente', 'procesando', 'completado', 'error')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de conversaciones (solo si no existe)
CREATE TABLE IF NOT EXISTS public.conversaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agente_id UUID NOT NULL REFERENCES public.agentes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de mensajes (solo si no existe)
CREATE TABLE IF NOT EXISTS public.mensajes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversacion_id UUID NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rol TEXT NOT NULL CHECK (rol IN ('usuario', 'asistente')),
  contenido TEXT NOT NULL,
  tokens_utilizados INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de integraciones n8n (solo si no existe)
CREATE TABLE IF NOT EXISTS public.integraciones_n8n (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agente_id UUID NOT NULL REFERENCES public.agentes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_url TEXT,
  estado TEXT DEFAULT 'inactivo' CHECK (estado IN ('activo', 'inactivo')),
  eventos TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integraciones_n8n ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para agentes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agentes' AND policyname = 'Los usuarios pueden ver sus propios agentes') THEN
        CREATE POLICY "Los usuarios pueden ver sus propios agentes" 
        ON public.agentes FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agentes' AND policyname = 'Los usuarios pueden crear sus propios agentes') THEN
        CREATE POLICY "Los usuarios pueden crear sus propios agentes" 
        ON public.agentes FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agentes' AND policyname = 'Los usuarios pueden actualizar sus propios agentes') THEN
        CREATE POLICY "Los usuarios pueden actualizar sus propios agentes" 
        ON public.agentes FOR UPDATE 
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agentes' AND policyname = 'Los usuarios pueden eliminar sus propios agentes') THEN
        CREATE POLICY "Los usuarios pueden eliminar sus propios agentes" 
        ON public.agentes FOR DELETE 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Continuar con políticas para otras tablas...
-- Políticas RLS para documentos
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documentos' AND policyname = 'Los usuarios pueden ver sus propios documentos') THEN
        CREATE POLICY "Los usuarios pueden ver sus propios documentos" 
        ON public.documentos FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documentos' AND policyname = 'Los usuarios pueden crear sus propios documentos') THEN
        CREATE POLICY "Los usuarios pueden crear sus propios documentos" 
        ON public.documentos FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documentos' AND policyname = 'Los usuarios pueden actualizar sus propios documentos') THEN
        CREATE POLICY "Los usuarios pueden actualizar sus propios documentos" 
        ON public.documentos FOR UPDATE 
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documentos' AND policyname = 'Los usuarios pueden eliminar sus propios documentos') THEN
        CREATE POLICY "Los usuarios pueden eliminar sus propios documentos" 
        ON public.documentos FOR DELETE 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Crear bucket de storage para documentos si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;