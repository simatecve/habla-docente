-- Crear tabla de perfiles de usuario
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT,
  email TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'freemium' CHECK (plan IN ('freemium', 'premium')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Crear tabla de agentes IA
CREATE TABLE public.agentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  openai_api_key TEXT, -- Encriptada en el frontend
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'entrenando')),
  tokens_utilizados INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de documentos
CREATE TABLE public.documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agente_id UUID NOT NULL REFERENCES public.agentes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'pdf', 'txt', 'imagen', 'texto'
  archivo_url TEXT, -- URL en Supabase Storage
  contenido_extraido TEXT, -- Texto extraído del documento
  tamano_archivo INTEGER,
  estado_procesamiento TEXT DEFAULT 'pendiente' CHECK (estado_procesamiento IN ('pendiente', 'procesando', 'completado', 'error')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de conversaciones
CREATE TABLE public.conversaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agente_id UUID NOT NULL REFERENCES public.agentes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de mensajes
CREATE TABLE public.mensajes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversacion_id UUID NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rol TEXT NOT NULL CHECK (rol IN ('usuario', 'asistente')),
  contenido TEXT NOT NULL,
  tokens_utilizados INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de integraciones n8n
CREATE TABLE public.integraciones_n8n (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agente_id UUID NOT NULL REFERENCES public.agentes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_url TEXT,
  estado TEXT DEFAULT 'inactivo' CHECK (estado IN ('activo', 'inactivo')),
  eventos TEXT[], -- Array de eventos que disparan el webhook
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integraciones_n8n ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Los usuarios pueden ver su propio perfil" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden insertar su propio perfil" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Políticas RLS para agentes
CREATE POLICY "Los usuarios pueden ver sus propios agentes" 
ON public.agentes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus propios agentes" 
ON public.agentes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propios agentes" 
ON public.agentes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propios agentes" 
ON public.agentes FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para documentos
CREATE POLICY "Los usuarios pueden ver sus propios documentos" 
ON public.documentos FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus propios documentos" 
ON public.documentos FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propios documentos" 
ON public.documentos FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propios documentos" 
ON public.documentos FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para conversaciones
CREATE POLICY "Los usuarios pueden ver sus propias conversaciones" 
ON public.conversaciones FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus propias conversaciones" 
ON public.conversaciones FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propias conversaciones" 
ON public.conversaciones FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propias conversaciones" 
ON public.conversaciones FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para mensajes
CREATE POLICY "Los usuarios pueden ver sus propios mensajes" 
ON public.mensajes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus propios mensajes" 
ON public.mensajes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para integraciones n8n
CREATE POLICY "Los usuarios pueden ver sus propias integraciones" 
ON public.integraciones_n8n FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus propias integraciones" 
ON public.integraciones_n8n FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propias integraciones" 
ON public.integraciones_n8n FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propias integraciones" 
ON public.integraciones_n8n FOR DELETE 
USING (auth.uid() = user_id);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER actualizar_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_updated_at();

CREATE TRIGGER actualizar_agentes_updated_at
  BEFORE UPDATE ON public.agentes
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_updated_at();

CREATE TRIGGER actualizar_documentos_updated_at
  BEFORE UPDATE ON public.documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_updated_at();

CREATE TRIGGER actualizar_conversaciones_updated_at
  BEFORE UPDATE ON public.conversaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_updated_at();

CREATE TRIGGER actualizar_integraciones_n8n_updated_at
  BEFORE UPDATE ON public.integraciones_n8n
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_updated_at();

-- Función para manejar nuevos usuarios (crear perfil automáticamente)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nombre, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre', NEW.raw_user_meta_data ->> 'full_name', 'Usuario'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Crear bucket de storage para documentos
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', false);

-- Políticas de storage para documentos
CREATE POLICY "Los usuarios pueden ver sus propios archivos" 
ON storage.objects FOR SELECT 
USING (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Los usuarios pueden subir sus propios archivos" 
ON storage.objects FOR INSERT 
WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Los usuarios pueden actualizar sus propios archivos" 
ON storage.objects FOR UPDATE 
USING (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Los usuarios pueden eliminar sus propios archivos" 
ON storage.objects FOR DELETE 
USING (auth.uid()::text = (storage.foldername(name))[1]);