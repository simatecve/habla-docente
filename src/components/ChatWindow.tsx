import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Phone, Video, MoreVertical, Smile } from 'lucide-react';

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

interface Message {
  id: string;
  conversacion_id: string;
  nombre_instancia: string;
  numero_telefono: string;
  mensaje: string;
  tipo_mensaje: string;
  direccion: string;
  leido: boolean;
  mensaje_id_whatsapp: string;
  created_at: string;
}

interface ChatWindowProps {
  conversation: Conversation;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Consulta directa a la tabla mensajes_whatsapp
      const { data, error } = await supabase
        .from('mensajes_whatsapp')
        .select('*')
        .eq('conversacion_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        setError('Error al cargar los mensajes');
        setMessages([]);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Error de conexión');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [conversation.id, user]);

  // Suscripción en tiempo real
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mensajes_whatsapp',
          filter: `conversacion_id=eq.${conversation.id}`,
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      // Aquí iría la lógica para enviar el mensaje a través de WhatsApp
      // Por ahora solo limpiamos el input
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  const getDisplayName = () => {
    return conversation.pushname || 
           conversation.nombre_contacto || 
           conversation.numero_whatsapp;
  };

  const getInitials = () => {
    const name = getDisplayName();
    if (name && name !== conversation.numero_whatsapp) {
      return name
        .trim()
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return conversation.numero_whatsapp.slice(-2);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gray-100 p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-medium mr-3">
              {getInitials()}
            </div>
            <div className="flex-1">
              <h2 className="font-medium text-gray-900">{getDisplayName()}</h2>
              <p className="text-sm text-gray-500">Cargando...</p>
            </div>
          </div>
        </div>

        {/* Loading state */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-2"></div>
            <p className="text-gray-500">Cargando mensajes...</p>
          </div>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header estilo WhatsApp */}
      <div className="bg-gray-100 p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-medium mr-3">
            {getInitials()}
          </div>
          <div className="flex-1">
            <h2 className="font-medium text-gray-900">{getDisplayName()}</h2>
            <div className="flex items-center">
              <p className="text-sm text-gray-500">
                {conversation.numero_whatsapp}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="ghost" className="p-2 hover:bg-gray-200">
            <Phone className="h-5 w-5" />
          </Button>
          <Button size="sm" variant="ghost" className="p-2 hover:bg-gray-200">
            <Video className="h-5 w-5" />
          </Button>
          <Button size="sm" variant="ghost" className="p-2 hover:bg-gray-200">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-center text-sm mb-4">{error}</p>
            <Button onClick={loadMessages} variant="outline" size="sm">
              Reintentar
            </Button>
          </div>
        ) : Object.keys(messageGroups).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-center text-sm">
              No hay mensajes en esta conversación
            </p>
          </div>
        ) : (
          Object.entries(messageGroups).map(([date, dayMessages]) => (
            <div key={date} className="space-y-2">
              {/* Separador de fecha */}
              <div className="flex justify-center">
                <span className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 shadow-sm">
                  {formatDate(dayMessages[0].created_at)}
                </span>
              </div>

              {/* Mensajes del día */}
              <div className="space-y-2">
                {dayMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direccion === 'saliente' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.direccion === 'saliente'
                          ? 'bg-green-500 text-white'
                          : 'bg-white text-gray-900 shadow-sm'
                      }`}
                    >
                      <p className="text-sm">{message.contenido}</p>
                      <div className={`flex items-center justify-end mt-1 space-x-1 ${
                        message.direccion === 'saliente' ? 'text-green-100' : 'text-gray-500'
                      }`}>
                        <span className="text-xs">
                          {formatTime(message.created_at)}
                        </span>
                        {message.direccion === 'saliente' && (
                          <div className="flex">
                            <div className={`w-3 h-3 ${
                              message.estado_mensaje === 'leido' ? 'text-blue-200' : 'text-green-200'
                            }`}>
                              ✓✓
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Área de entrada de mensaje */}
      <div className="bg-gray-100 p-4 border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Button 
            type="button" 
            size="sm" 
            variant="ghost" 
            className="p-2 hover:bg-gray-200"
            disabled={usingMockData}
          >
            <Smile className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={usingMockData ? "Modo demo - no se pueden enviar mensajes" : "Escribe un mensaje"}
              className="pr-12 bg-white border-gray-300 focus:border-green-500 focus:ring-green-500"
              disabled={sending || usingMockData}
            />
          </div>
          
          <Button 
            type="submit" 
            size="sm" 
            disabled={!newMessage.trim() || sending || usingMockData}
            className="bg-green-500 hover:bg-green-600 text-white p-2"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;