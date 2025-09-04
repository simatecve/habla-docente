import React, { useState, useEffect } from 'react';
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
  Copy, 
  CheckCircle, 
  Loader2, 
  Lightbulb, 
  FileText, 
  Sparkles,
  User,
  Brain
} from 'lucide-react';

interface CreateAgentProps {
  onAgentCreated?: (agentId: string) => void;
}

interface FormData {
  nombre: string;
  descripcion: string;
  systemPrompt: string;
}

interface FormErrors {
  nombre?: string;
  descripcion?: string;
  systemPrompt?: string;
}

const PREDEFINED_PROMPTS = [
  {
    title: "Asistente Educativo",
    description: "Especializado en enseñanza y aprendizaje",
    prompt: "Eres un asistente educativo especializado en ayudar a estudiantes y profesores. Tu objetivo es explicar conceptos de manera clara, proporcionar ejemplos prácticos y fomentar el aprendizaje activo. Siempre mantén un tono amigable y motivador."
  },
  {
    title: "Consultor de Negocios",
    description: "Experto en estrategia empresarial",
    prompt: "Eres un consultor de negocios experimentado con expertise en estrategia, marketing y operaciones. Proporciona análisis detallados, recomendaciones prácticas y insights basados en mejores prácticas de la industria."
  },
  {
    title: "Asistente Técnico",
    description: "Especialista en programación y tecnología",
    prompt: "Eres un asistente técnico especializado en programación, desarrollo de software y tecnología. Proporciona soluciones claras, código bien documentado y explicaciones técnicas precisas adaptadas al nivel del usuario."
  },
  {
    title: "Analista de Documentos",
    description: "Experto en análisis y síntesis de información",
    prompt: "Eres un analista experto en procesar y sintetizar información de documentos. Tu función es extraer insights clave, identificar patrones importantes y proporcionar resúmenes claros y accionables."
  }
];

const CreateAgent: React.FC<CreateAgentProps> = ({ onAgentCreated }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    descripcion: '',
    systemPrompt: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      case 'systemPrompt':
        if (!value.trim()) return 'El prompt del sistema es requerido';
        if (value.length < 20) return 'El prompt debe tener al menos 20 caracteres';
        if (value.length > 2000) return 'El prompt no puede exceder 2000 caracteres';
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
    
    if (!user) {
      toast({
        title: "Error",
        description: "Debes estar autenticado para crear un agente",
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
      const { data, error } = await supabase
        .from('agentes')
        .insert({
          user_id: user.id,
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || formData.systemPrompt.substring(0, 100) + '...',
          estado: 'activo'
        })
        .select()
        .single();

      if (error) throw error;

      setCreatedAgentId(data.id);
      setShowSuccess(true);
      
      toast({
        title: "¡Agente creado exitosamente!",
        description: `El agente "${formData.nombre}" ha sido creado con ID: ${data.id}`,
      });

      // Reset form
      setFormData({ nombre: '', descripcion: '', systemPrompt: '' });
      setSelectedPromptIndex(null);
      
      // Callback
      if (onAgentCreated) {
        onAgentCreated(data.id);
      }
      
    } catch (error) {
      console.error('Error creating agent:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el agente. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "¡Copiado!",
        description: "ID copiado al portapapeles",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar al portapapeles",
        variant: "destructive",
      });
    }
  };

  const selectPredefinedPrompt = (index: number) => {
    const prompt = PREDEFINED_PROMPTS[index];
    setFormData(prev => ({ ...prev, systemPrompt: prompt.prompt }));
    setSelectedPromptIndex(index);
    setErrors(prev => ({ ...prev, systemPrompt: undefined }));
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className={`text-center space-y-4 transform transition-all duration-1000 ${
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <div className="flex items-center justify-center space-x-3">
            <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <Bot className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Crear Nuevo Agente
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Diseña tu asistente de IA personalizado con capacidades únicas
          </p>
        </div>

        {/* Success Message */}
        {showSuccess && createdAgentId && (
          <div className={`transform transition-all duration-500 ${
            showSuccess ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'
          }`}>
            <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-green-800 dark:text-green-200">
                    ¡Agente creado exitosamente!
                  </span>
                  <br />
                  <span className="text-sm text-green-600 dark:text-green-300">
                    ID: {createdAgentId}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(createdAgentId)}
                  className="ml-4 border-green-300 text-green-700 hover:bg-green-100"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar ID
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className={`backdrop-blur-sm bg-white/70 dark:bg-gray-900/70 border-white/20 shadow-xl transform transition-all duration-700 hover:shadow-2xl ${
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}>
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <span>Configuración del Agente</span>
                </CardTitle>
                <CardDescription>
                  Define las características y comportamiento de tu agente de IA
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

                  {/* System Prompt */}
                  <div className="space-y-2">
                    <Label htmlFor="systemPrompt" className="flex items-center space-x-2">
                      <Brain className="h-4 w-4" />
                      <span>Prompt del Sistema</span>
                      <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="systemPrompt"
                      value={formData.systemPrompt}
                      onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
                      placeholder="Define el comportamiento, personalidad y expertise de tu agente. Sé específico sobre cómo debe responder y qué tipo de ayuda debe proporcionar..."
                      className={`transition-all duration-200 resize-none ${
                        errors.systemPrompt 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                          : 'focus:border-purple-500 focus:ring-purple-200'
                      }`}
                      rows={8}
                      maxLength={2000}
                    />
                    <div className="flex justify-between items-center">
                      {errors.systemPrompt && (
                        <span className="text-sm text-red-500">{errors.systemPrompt}</span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formData.systemPrompt.length}/2000
                      </span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || Object.keys(errors).some(key => errors[key as keyof FormErrors])}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creando Agente...
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4 mr-2" />
                        Crear Agente
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Predefined Prompts */}
          <div className="space-y-6">
            <Card className={`backdrop-blur-sm bg-white/70 dark:bg-gray-900/70 border-white/20 shadow-xl transform transition-all duration-700 delay-200 ${
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  <span>Prompts Predefinidos</span>
                </CardTitle>
                <CardDescription>
                  Usa estos ejemplos como punto de partida
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {PREDEFINED_PROMPTS.map((prompt, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md transform hover:scale-[1.02] ${
                      selectedPromptIndex === index
                        ? 'border-purple-300 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 hover:border-purple-200 bg-white/50 dark:bg-gray-800/50'
                    }`}
                    onClick={() => selectPredefinedPrompt(index)}
                  >
                    <h4 className="font-medium text-sm mb-1">{prompt.title}</h4>
                    <p className="text-xs text-muted-foreground">{prompt.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className={`backdrop-blur-sm bg-white/70 dark:bg-gray-900/70 border-white/20 shadow-xl transform transition-all duration-700 delay-300 ${
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}>
              <CardHeader>
                <CardTitle className="text-sm">💡 Consejos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p>• Sé específico sobre el rol y expertise del agente</p>
                <p>• Define el tono y estilo de comunicación</p>
                <p>• Incluye ejemplos de cómo debe responder</p>
                <p>• Especifica limitaciones si es necesario</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAgent;