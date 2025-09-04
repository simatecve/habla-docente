import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Bot, FileText, MessageSquare, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Agente {
  id: string;
  nombre: string;
  descripcion: string;
  estado: string;
  tokens_utilizados: number;
  created_at: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchAgentes();
  }, [user, navigate]);

  const fetchAgentes = async () => {
    try {
      const { data, error } = await supabase
        .from('agentes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgentes(data || []);
    } catch (error) {
      console.error('Error al obtener agentes:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los agentes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">HablaDocente</h1>
            <p className="text-muted-foreground">Bienvenido, {user?.email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/perfil')}>
              <Settings className="h-4 w-4 mr-2" />
              Perfil
            </Button>
            <Button variant="outline" onClick={signOut}>
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agentes</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{agentes.length}</div>
              <p className="text-xs text-muted-foreground">
                Agentes creados
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tokens</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {agentes.reduce((total, agente) => total + agente.tokens_utilizados, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Tokens utilizados
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversaciones</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Conversaciones activas
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Freemium</div>
              <p className="text-xs text-muted-foreground">
                Plan actual
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Agentes */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Mis Agentes</h2>
          <Button onClick={() => navigate('/agentes/nuevo')}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Agente
          </Button>
        </div>

        {agentes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aún no tienes agentes</h3>
              <p className="text-muted-foreground mb-4 text-center">
                Crea tu primer agente de IA para comenzar a chatear con tus documentos
              </p>
              <Button onClick={() => navigate('/agentes/nuevo')}>
                <Plus className="h-4 w-4 mr-2" />
                Crear mi primer agente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agentes.map((agente) => (
              <Card key={agente.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{agente.nombre}</CardTitle>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      agente.estado === 'activo' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                    }`}>
                      {agente.estado}
                    </span>
                  </div>
                  <CardDescription>{agente.descripcion || 'Sin descripción'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {agente.tokens_utilizados} tokens usados
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/agentes/${agente.id}/chat`)}
                      >
                        Chat
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => navigate(`/agentes/${agente.id}`)}
                      >
                        Ver
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;