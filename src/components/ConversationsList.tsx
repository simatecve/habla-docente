import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface Lead {
  nombre: string;
  pushname: string;
  numero_whatsapp: string;
}

interface Conversation {
  id: string;
  lead_id: string;
  instancia_id: string;
  ultimo_mensaje: string;
  ultimo_mensaje_fecha: string;
  no_leidos: number;
  leads: Lead;
}

interface ConversationsListProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversationId?: string;
}

const ConversationsList: React.FC<ConversationsListProps> = ({
  onSelectConversation,
  selectedConversationId
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadConversations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversaciones_whatsapp')
        .select(`
          id,
          lead_id,
          instancia_id,
          ultimo_mensaje,
          ultimo_mensaje_fecha,
          no_leidos,
          leads!inner (
            nombre,
            pushname,
            numero_whatsapp
          )
        `)
        .eq('user_id', user.id)
        .order('ultimo_mensaje_fecha', { ascending: false });

      if (error) throw error;
      
      const typedConversations: Conversation[] = (data || []).map(conv => ({
        id: conv.id,
        lead_id: conv.lead_id,
        instancia_id: conv.instancia_id,
        ultimo_mensaje: conv.ultimo_mensaje,
        ultimo_mensaje_fecha: conv.ultimo_mensaje_fecha,
        no_leidos: conv.no_leidos,
        leads: Array.isArray(conv.leads) ? conv.leads[0] : conv.leads
      }));
      
      setConversations(typedConversations);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Error",
        description: "Error al cargar las conversaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user]);

  const filteredConversations = conversations.filter(conv =>
    conv.leads.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.leads.pushname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.leads.numero_whatsapp.includes(searchTerm)
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ayer';
    } else if (days < 7) {
      return date.toLocaleDateString('es-ES', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <MessageCircle className="h-6 w-6 animate-spin" />
        <span className="ml-2">Cargando conversaciones...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-green-50">
        <h2 className="text-xl font-semibold text-green-800 mb-3">Conversaciones</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar conversaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No hay conversaciones</p>
            <p className="text-sm">Las conversaciones aparecerán aquí cuando recibas mensajes</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation)}
                className={`p-3 cursor-pointer transition-colors border-b border-gray-100 hover:bg-gray-50 ${
                  selectedConversationId === conversation.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {getInitials(conversation.leads.nombre || conversation.leads.pushname)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {conversation.leads.nombre || conversation.leads.pushname}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {conversation.no_leidos > 0 && (
                          <Badge variant="default" className="bg-green-500 text-white">
                            {conversation.no_leidos}
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {conversation.ultimo_mensaje_fecha && formatTime(conversation.ultimo_mensaje_fecha)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {conversation.ultimo_mensaje}
                    </p>
                    <p className="text-xs text-gray-400">
                      {conversation.leads.numero_whatsapp}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationsList;