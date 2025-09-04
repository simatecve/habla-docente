import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import TextSnippets from '@/components/TextSnippets';

import { 
  ArrowLeft, 
  Bot, 
  Calendar, 
  User, 
  Settings, 
  MessageSquare,
  Loader2,
  AlertCircle,
  Edit,
  Trash2
} from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type Agente = Database['public']['Tables']['agentes']['Row'];

const AgentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [agente, setAgente] = useState<Agente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Cargar datos del agente
  const loadAgente = async () => {
    if (!user || !id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('agentes')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Agente no encontrado o no tienes permisos para acceder a él');
        } else {
          setError('Error al cargar el agente');
        }
        return;
      }

      setAgente(data);
    } catch (error) {
      console.error('Error al cargar agente:', error);
      setError('Error al cargar el agente');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar agente
  const deleteAgente = async () => {
    if (!agente || !user) return;
    
    const confirmDelete = confirm(
      `¿Estás seguro de que quieres eliminar el agente "${agente.nombre}"? Esta acción no se puede deshacer y eliminará todos los snippets asociados.`
    );
    
    if (!confirmDelete) return;

    setDeleting(true);
    
    try {
      const { error } = await supabase
        .from('agentes')
        .delete()
        .eq('id', agente.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Agente eliminado correctamente",
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error al eliminar agente:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el agente",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Obtener color del badge según el estado
  const getEstadoBadgeVariant = (estado: string | null) => {
    switch (estado) {
      case 'activo':
        return 'default';
      case 'inactivo':
        return 'secondary';
      case 'entrenando':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  useEffect(() => {
    loadAgente();
  }, [id, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando agente...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8">
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
      <div className="px-4 py-8">
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
    <div className="px-4 py-8">
      {/* Header con navegación */}
      <div className="mb-8">
        <Button 
          onClick={() => navigate('/dashboard')}
          variant="ghost"
          className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Dashboard
        </Button>
        
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            
            <div>
              <h1 className="text-3xl font-bold mb-2">{agente.nombre}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Agente IA</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Creado el {new Date(agente.created_at).toLocaleDateString()}</span>
                </div>
                <Badge variant={getEstadoBadgeVariant(agente.estado)}>
                  {agente.estado || 'activo'}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => navigate(`/chat?agente=${agente.id}`)}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Chatear
            </Button>
            

            

            
            <Button 
              variant="outline"
              onClick={() => navigate(`/agentes/${agente.id}/editar`)}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
            
            <Button 
              variant="outline"
              onClick={deleteAgente}
              disabled={deleting}
              className="flex items-center gap-2 text-destructive hover:text-destructive"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Eliminar
            </Button>
          </div>
        </div>
      </div>

      {/* Información del agente */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-8">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Información</TabsTrigger>
              <TabsTrigger value="snippets">Snippets</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              {/* Descripción */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Descripción
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {agente.descripcion ? (
                    <p className="text-muted-foreground leading-relaxed">
                      {agente.descripcion}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic">
                      Este agente no tiene descripción.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="snippets">
              <Card>
                <CardContent className="p-6">
                  <TextSnippets agenteId={agente.id} />
                </CardContent>
              </Card>
            </TabsContent>
            

          </Tabs>
        </div>

        {/* Sidebar con información adicional */}
        <div className="space-y-6">
          {/* Estadísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estadísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tokens utilizados</span>
                <span className="font-semibold">
                  {agente.tokens_utilizados?.toLocaleString() || '0'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Estado</span>
                <Badge variant={getEstadoBadgeVariant(agente.estado)}>
                  {agente.estado || 'activo'}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Última actualización</span>
                <span className="text-sm">
                  {new Date(agente.updated_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Configuración */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">API Key configurada</span>
                <Badge variant={agente.openai_api_key ? 'default' : 'secondary'}>
                  {agente.openai_api_key ? 'Sí' : 'No'}
                </Badge>
              </div>
              
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => navigate(`/agentes/${agente.id}/editar`)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Acciones rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acciones rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => navigate(`/chat?agente=${agente.id}`)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Iniciar conversación
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => navigate(`/agentes/${agente.id}/documentos`)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Gestionar documentos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AgentDetail;