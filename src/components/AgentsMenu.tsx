import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Bot,
  Plus,
  MessageSquare,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  Calendar,
  Zap
} from 'lucide-react';

interface Agente {
  id: string;
  nombre: string;
  descripcion: string;
  estado: string;
  tokens_utilizados: number;
  created_at: string;
}

const AgentsMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Cargar agentes del usuario
  const loadAgentes = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agentes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgentes(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
      setError('Error al cargar los agentes');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar agente
  const deleteAgente = async (agente: Agente) => {
    const confirmDelete = confirm(
      `¿Estás seguro de que quieres eliminar el agente "${agente.nombre}"? Esta acción no se puede deshacer.`
    );
    
    if (!confirmDelete) return;

    setDeletingId(agente.id);
    
    try {
      const { error } = await supabase
        .from('agentes')
        .delete()
        .eq('id', agente.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Agente eliminado correctamente",
      });
      
      // Recargar la lista
      loadAgentes();
    } catch (error) {
      console.error('Error al eliminar agente:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el agente",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Obtener variante del badge según el estado
  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'activo':
        return 'default';
      case 'inactivo':
        return 'secondary';
      default:
        return 'default';
    }
  };

  useEffect(() => {
    loadAgentes();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Cargando agentes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón de crear agente */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text bg-gradient-to-r from-blue-600 to-purple-600">
            Mis Agentes
          </h2>
          <p className="text-muted-foreground">
            Gestiona tus agentes de IA personalizados
          </p>
        </div>
        <Button 
          onClick={() => navigate('/agentes/nuevo')} 
          className="hover-lift bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 shadow-lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Crear Agente
        </Button>
      </div>

      {/* Lista de agentes */}
      {agentes.length === 0 ? (
        <Card className="hover-lift modern-shadow">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 rounded-full mb-4">
              <Bot className="h-12 w-12 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aún no tienes agentes</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Crea tu primer agente de IA para comenzar a chatear con tus documentos y aprovechar el poder de la inteligencia artificial.
            </p>
            <Button 
              onClick={() => navigate('/agentes/nuevo')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear mi primer agente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agentes.map((agente) => (
            <Card 
              key={agente.id} 
              className="hover-lift modern-shadow border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 transition-all duration-300 hover:shadow-xl"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                      {agente.nombre}
                    </CardTitle>
                  </div>
                  <Badge variant={getEstadoBadgeVariant(agente.estado)}>
                    {agente.estado || 'activo'}
                  </Badge>
                </div>
                <CardDescription className="text-sm text-gray-600 dark:text-gray-300">
                  {agente.descripcion || 'Sin descripción'}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Estadísticas */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Zap className="h-3 w-3" />
                      <span>{agente.tokens_utilizados} tokens</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(agente.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* Botones de acción */}
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => navigate(`/chat?agente=${agente.id}`)}
                      className="flex-1 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/20"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Chat
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => navigate(`/agentes/${agente.id}/editar`)}
                      className="hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-900/20"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => deleteAgente(agente)}
                      disabled={deletingId === agente.id}
                      className="hover:bg-red-50 hover:border-red-300 hover:text-red-600 dark:hover:bg-red-900/20"
                    >
                      {deletingId === agente.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentsMenu;