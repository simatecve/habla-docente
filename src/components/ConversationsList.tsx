import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MessageCircle, Plus } from 'lucide-react';

interface Conversation {
  id: string;
  instancia_id: string;
  numero_whatsapp: string;
  nombre_contacto?: string;
  pushname?: string;
  ultimo_mensaje?: string;
  ultimo_mensaje_fecha?: string;
  direccion_ultimo_mensaje?: string;
  mensajes_no_leidos: number;
  estado: string;
  created_at: string;
  updated_at: string;
}

interface ConversationsListProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversationId?: string;
}

const ConversationsList: React.FC<ConversationsListProps> = ({
  onSelectConversation,
  selectedConversationId,
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadConversations = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Consulta directa a la tabla conversaciones_whatsapp
      const { data, error } = await supabase
        .from('conversaciones_whatsapp')
        .select('*')
        .eq('estado', 'activa')
        .order('ultimo_mensaje_fecha', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error loading conversations:', error);
        setError('Error al cargar las conversaciones');
        setConversations([]);
        return;
      }

      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setError('Error de conexión');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user]);

  // Suscripción en tiempo real
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('conversaciones_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversaciones_whatsapp',
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filteredConversations = conversations.filter((conversation) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      conversation.nombre_contacto?.toLowerCase().includes(searchLower) ||
      conversation.pushname?.toLowerCase().includes(searchLower) ||
      conversation.numero_whatsapp.includes(searchTerm) ||
      conversation.ultimo_mensaje?.toLowerCase().includes(searchLower)
    );
  });

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes <= 1 ? 'ahora' : `hace ${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `hace ${Math.floor(diffInHours)}h`;
    } else if (diffInHours < 48) {
      return 'ayer';
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  const getInitials = (name?: string, phone?: string) => {
    if (name && name.trim()) {
      return name
        .trim()
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return phone ? phone.slice(-2) : '??';
  };

  const getDisplayName = (conversation: Conversation) => {
    return conversation.pushname || 
           conversation.nombre_contacto || 
           conversation.numero_whatsapp;
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gray-100 p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-800">Chats</h1>
            <Button size="sm" variant="ghost" className="p-2">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar o empezar un chat nuevo"
              className="pl-10 bg-white border-gray-300"
              disabled
            />
          </div>
        </div>

        {/* Loading state */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-2"></div>
            <p className="text-gray-500">Cargando conversaciones...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header estilo WhatsApp */}
      <div className="bg-gray-100 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-800">Chats</h1>
          </div>
          <Button size="sm" variant="ghost" className="p-2 hover:bg-gray-200">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar o empezar un chat nuevo"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-gray-300 focus:border-green-500 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Lista de conversaciones */}
      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
            <MessageCircle className="h-16 w-16 mb-4 opacity-30 text-red-400" />
            <h3 className="text-lg font-medium mb-2 text-red-600">Error</h3>
            <p className="text-center text-sm mb-4">{error}</p>
            <Button onClick={loadConversations} variant="outline" size="sm">
              Reintentar
            </Button>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
            <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">No hay conversaciones</h3>
            <p className="text-center text-sm">
              {searchTerm 
                ? 'No se encontraron conversaciones que coincidan con tu búsqueda'
                : 'Cuando tengas conversaciones de WhatsApp, aparecerán aquí'
              }
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onSelectConversation(conversation)}
              className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${
                selectedConversationId === conversation.id ? 'bg-gray-100' : ''
              }`}
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-white font-medium mr-3 flex-shrink-0">
                {getInitials(getDisplayName(conversation), conversation.numero_whatsapp)}
              </div>

              {/* Contenido de la conversación */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-gray-900 truncate">
                    {getDisplayName(conversation)}
                  </h3>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {formatTime(conversation.ultimo_mensaje_fecha)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 truncate">
                    {conversation.ultimo_mensaje || 'Sin mensajes'}
                  </p>
                  
                  {/* Badge de mensajes no leídos */}
                  {conversation.mensajes_no_leidos > 0 && (
                    <span className="bg-green-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center flex-shrink-0 ml-2">
                      {conversation.mensajes_no_leidos > 99 ? '99+' : conversation.mensajes_no_leidos}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationsList;