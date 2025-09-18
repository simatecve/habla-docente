import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Paperclip, Phone, Video } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  mensaje: string;
  direccion: 'enviado' | 'recibido';
  tipo_mensaje: string;
  url_adjunto?: string;
  created_at: string;
}

interface Lead {
  nombre: string;
  pushname: string;
  numero_whatsapp: string;
}

interface Conversation {
  id: string;
  lead_id: string;
  instancia_whatsapp: string;
  leads: Lead;
}

interface ChatWindowProps {
  conversation: Conversation;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!conversation) return;

    try {
      const { data, error } = await supabase
        .from('mensajes_whatsapp')
        .select('*')
        .eq('conversacion_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const typedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        mensaje: msg.mensaje,
        direccion: msg.direccion as 'enviado' | 'recibido',
        tipo_mensaje: msg.tipo_mensaje,
        url_adjunto: msg.url_adjunto,
        created_at: msg.created_at
      }));
      
      setMessages(typedMessages);

      // Marcar mensajes como leídos
      await supabase
        .from('conversaciones_whatsapp')
        .update({ no_leidos: 0 })
        .eq('id', conversation.id);

    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Error al cargar los mensajes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [conversation]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('mensajes_whatsapp')
        .insert({
          user_id: user.id,
          conversacion_id: conversation.id,
          lead_id: conversation.lead_id,
          instanca_nombre: conversation.instancia_whatsapp,
          nombre: conversation.leads.nombre,
          pushname: conversation.leads.pushname,
          mensaje: newMessage,
          direccion: 'enviado',
          tipo_mensaje: 'text'
        });

      if (error) throw error;

      setNewMessage('');
      await loadMessages();

      toast({
        title: "Mensaje enviado",
        description: "Tu mensaje ha sido enviado correctamente",
      });

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Error al enviar el mensaje",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Selecciona una conversación</p>
          <p className="text-sm">Elige una conversación para comenzar a chatear</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-green-50">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarFallback className="bg-green-100 text-green-700">
              {getInitials(conversation.leads.nombre || conversation.leads.pushname)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-gray-900">
              {conversation.leads.nombre || conversation.leads.pushname}
            </h3>
            <p className="text-sm text-gray-600">
              {conversation.leads.numero_whatsapp}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Video className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Send className="h-6 w-6 animate-spin" />
            <span className="ml-2">Cargando mensajes...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No hay mensajes en esta conversación</p>
            <p className="text-sm">Envía un mensaje para comenzar</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.direccion === 'enviado' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.direccion === 'enviado'
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-gray-900 border'
                }`}
              >
                <p className="text-sm">{message.mensaje}</p>
                {message.url_adjunto && (
                  <div className="mt-2">
                    <img 
                      src={message.url_adjunto} 
                      alt="Adjunto" 
                      className="max-w-full rounded"
                    />
                  </div>
                )}
                <p className={`text-xs mt-1 ${
                  message.direccion === 'enviado' ? 'text-green-100' : 'text-gray-500'
                }`}>
                  {formatTime(message.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Escribe un mensaje..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={!newMessage.trim() || sending}
            className="bg-green-500 hover:bg-green-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;