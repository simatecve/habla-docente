-- Crear tabla de snippets de texto para agentes
CREATE TABLE IF NOT EXISTS public.snippets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agente_id UUID NOT NULL REFERENCES public.agentes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en la tabla snippets
ALTER TABLE public.snippets ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para snippets
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'snippets' AND policyname = 'Los usuarios pueden ver sus propios snippets') THEN
        CREATE POLICY "Los usuarios pueden ver sus propios snippets" 
        ON public.snippets FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'snippets' AND policyname = 'Los usuarios pueden crear sus propios snippets') THEN
        CREATE POLICY "Los usuarios pueden crear sus propios snippets" 
        ON public.snippets FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'snippets' AND policyname = 'Los usuarios pueden actualizar sus propios snippets') THEN
        CREATE POLICY "Los usuarios pueden actualizar sus propios snippets" 
        ON public.snippets FOR UPDATE 
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'snippets' AND policyname = 'Los usuarios pueden eliminar sus propios snippets') THEN
        CREATE POLICY "Los usuarios pueden eliminar sus propios snippets" 
        ON public.snippets FOR DELETE 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_snippets_agente_id ON public.snippets(agente_id);
CREATE INDEX IF NOT EXISTS idx_snippets_user_id ON public.snippets(user_id);
CREATE INDEX IF NOT EXISTS idx_snippets_created_at ON public.snippets(created_at DESC);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en snippets
DROP TRIGGER IF EXISTS update_snippets_updated_at ON public.snippets;
CREATE TRIGGER update_snippets_updated_at
    BEFORE UPDATE ON public.snippets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();