import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bot, 
  ArrowLeft,
  Loader2, 
  Lightbulb, 
  FileText, 
  Sparkles,
  User,
  Brain,
  Save,
  AlertCircle
} from 'lucide-react';

interface FormData {
  nombre: string;
  descripcion: string;
}

interface FormErrors {
  nombre?: string;
  descripcion?: string;
}

interface Agente {
  id: string;
  nombre: string;
  descripcion: string;
  estado: string;
  tokens_utilizados: number;
  created_at: string;
}

const EditAgent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [agente, setAgente] = useState<Agente | null>(null);
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    descripcion: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAgent, setLoadingAgent] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos del agente
  const loadAgent = async () => {
    if (!id || !user) return;
    
    try {
      setLoadingAgent(true);
      const { data, error } = await supabase
        .from('agentes')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Agente no encontrado o no tienes permisos para editarlo');
        } else {
          throw error;
        }
        return;
      }

      setAgente(data);
      setFormData({
        nombre: data.nombre || '',
        descripcion: data.descripcion || ''
      });
    } catch (error) {
      console.error('Error loading agent:', error);
      setError('Error al cargar el agente');
    } finally {
      setLoadingAgent(false);
    }
  };

  // Validación de campos
  const validateField = (name: keyof FormData, value: string): string | undefined => {
    switch (name) {
      case 'nombre':
        if (!value.trim()) return 'El nombre es requerido';
        if (value.length < 3) return 'El nombre debe tener al menos 3 caracteres';
        if (value.length > 50) return 'El nombre no puede exceder 50 caracteres';
        break;
      case 'descripcion':
        if (value.length > 200) return 'La descripción no puede exceder 200 caracteres';
        break;
    }
    return undefined;
  };

  const handleInputChange = (name: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Validación en tiempo real
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    Object.keys(formData).forEach(key => {
      const fieldName = key as keyof FormData;
      const error = validateField(fieldName, formData[fieldName]);
      if (error) newErrors[fieldName] = error;
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !id) {
      toast({
        title: "Error",
        description: "Debes estar autenticado para editar un agente",
        variant: "destructive",
      });
      return;
    }

    if (!validateForm()) {
      toast({
        title: "Error de validación",
        description: "Por favor corrige los errores en el formulario",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('agentes')
        .update({
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || 'Agente de IA personalizado'
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast({
        title: "¡Agente actualizado exitosamente!",
        description: `El agente "${formData.nombre}" ha sido actualizado correctamente`,
      });

      // Redirigir al detalle del agente
      navigate(`/agentes/${id}`);
      
    } catch (error) {
      console.error('Error updating agent:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el agente. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAgent();
  }, [id, user]);

  if (loadingAgent) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando agente...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <div className="mt-6">
          <Button 
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!agente) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Agente no encontrado</AlertDescription>
        </Alert>
        
        <div className="mt-6">
          <Button 
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button 
          onClick={() => navigate(`/agentes/${id}`)}
          variant="ghost"
          className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Agente
        </Button>
        
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold gradient-text bg-gradient-to-r from-blue-600 to-purple-600">
              Editar Agente
            </h1>
            <p className="text-muted-foreground">
              Modifica la configuración de "{agente.nombre}"
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl">
        <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <span>Configuración del Agente</span>
            </CardTitle>
            <CardDescription>
              Actualiza las características y comportamiento de tu agente de IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="nombre" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Nombre del Agente</span>
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  placeholder="Ej: Asistente Educativo, Consultor de Marketing..."
                  className={`transition-all duration-200 ${
                    errors.nombre 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'focus:border-purple-500 focus:ring-purple-200'
                  }`}
                  maxLength={50}
                />
                <div className="flex justify-between items-center">
                  {errors.nombre && (
                    <span className="text-sm text-red-500">{errors.nombre}</span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formData.nombre.length}/50
                  </span>
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="descripcion" className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Descripción (Opcional)</span>
                </Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => handleInputChange('descripcion', e.target.value)}
                  placeholder="Describe brevemente las capacidades y propósito de tu agente..."
                  className={`transition-all duration-200 resize-none ${
                    errors.descripcion 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'focus:border-purple-500 focus:ring-purple-200'
                  }`}
                  rows={3}
                  maxLength={200}
                />
                <div className="flex justify-between items-center">
                  {errors.descripcion && (
                    <span className="text-sm text-red-500">{errors.descripcion}</span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formData.descripcion.length}/200
                  </span>
                </div>
              </div>



              {/* Botones de acción */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/agentes/${id}`)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || Object.keys(errors).some(key => errors[key as keyof FormErrors])}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditAgent;