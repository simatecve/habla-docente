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

interface UserStats {
  totalConversations: number;
  totalMessages: number;
  totalAgents: number;
  totalTokens: number;
  recentConversations: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalConversations: 0,
    totalMessages: 0,
    totalAgents: 0,
    totalTokens: 0,
    recentConversations: 0
  });
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

      if (error) {
        console.error('Error fetching agentes:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los agentes",
          variant: "destructive",
        });
        return;
      }

      setAgentes(data || []);
      
      // Fetch user stats after agentes are loaded
      await fetchUserStats(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error inesperado al cargar los agentes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async (agentesData: Agente[]) => {
    try {
      // Obtener total de conversaciones
      const { count: conversationsCount } = await supabase
        .from('conversaciones')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Obtener total de mensajes
      const { count: messagesCount } = await supabase
        .from('mensajes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Obtener conversaciones recientes (últimos 7 días)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: recentConversationsCount } = await supabase
        .from('conversaciones')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .gte('created_at', sevenDaysAgo.toISOString());

      // Calcular tokens totales de los agentes
      const totalTokens = agentesData.reduce((total, agente) => total + agente.tokens_utilizados, 0);

      setUserStats({
        totalConversations: conversationsCount || 0,
        totalMessages: messagesCount || 0,
        totalAgents: agentesData.length,
        totalTokens: totalTokens,
        recentConversations: recentConversationsCount || 0
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
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
        <div className="px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Koonetxa Chats</h1>
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

      <div className="px-4 py-8">
        {/* Resumen Principal */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium gradient-text">Agentes</CardTitle>
              <Bot className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">{userStats.totalAgents}</div>
              <p className="text-xs text-muted-foreground">
                Agentes creados
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium gradient-text">Tokens</CardTitle>
              <FileText className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {userStats.totalTokens}
              </div>
              <p className="text-xs text-muted-foreground">
                Tokens utilizados
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium gradient-text">Conversaciones</CardTitle>
              <MessageSquare className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">{userStats.totalConversations}</div>
              <p className="text-xs text-muted-foreground">
                Conversaciones totales
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium gradient-text">Mensajes</CardTitle>
              <MessageSquare className="h-5 w-5 text-pink-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">{userStats.totalMessages}</div>
              <p className="text-xs text-muted-foreground">
                Mensajes enviados y recibidos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas Adicionales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium gradient-text">Actividad Reciente</CardTitle>
              <MessageSquare className="h-5 w-5 text-cyan-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">{userStats.recentConversations}</div>
              <p className="text-xs text-muted-foreground">
                Conversaciones en los últimos 7 días
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium gradient-text">Promedio por Conversación</CardTitle>
              <MessageSquare className="h-5 w-5 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {userStats.totalConversations > 0 
                  ? Math.round(userStats.totalMessages / userStats.totalConversations)
                  : 0
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Mensajes por conversación
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium gradient-text">Plan Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Freemium</div>
              <p className="text-xs text-muted-foreground">
                Plan gratuito activo
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Agentes */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold gradient-text">Mis Agentes</h2>
          <Button onClick={() => navigate('/agentes/nuevo')} className="hover-lift bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 shadow-lg">
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
                        onClick={() => navigate(`/chat?agente=${agente.id}`)}
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