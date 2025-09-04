import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Send,
  Copy,
  Trash2,
  Bot,
  User,
  Loader2,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Search
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  agentId: string;
}

interface Agent {
  id: string;
  nombre: string;
  descripcion: string;
  estado: string;
}

interface ChatProps {
  initialAgentId?: string;
  onAgentChange?: (agentId: string | null) => void;
}

const Chat: React.FC<ChatProps> = ({ initialAgentId, onAgentChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const urlAgentId = searchParams.get('agentId');
  const [agentId, setAgentId] = useState(urlAgentId || initialAgentId || '');
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update agentId when URL parameter changes
  useEffect(() => {
    const urlAgentId = searchParams.get('agente');
    if (urlAgentId && urlAgentId !== agentId) {
      setAgentId(urlAgentId);
    }
  }, [searchParams]);

  // Load agent info when agentId changes
  useEffect(() => {
    if (agentId && agentId.trim()) {
      loadAgent(agentId.trim());
    } else {
      setAgent(null);
      setMessages([]);
      setConversationId(null);
    }
  }, [agentId]);

  const loadAgent = async (id: string) => {
    setLoadingAgent(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('agentes')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Agente no encontrado o no tienes permisos para acceder a él');
        } else {
          setError('Error al cargar el agente');
        }
        setAgent(null);
        return;
      }

      setAgent(data);
      await loadConversation(id);
      
    } catch (error) {
      console.error('Error loading agent:', error);
      setError('Error al cargar el agente');
      setAgent(null);
    } finally {
      setLoadingAgent(false);
    }
  };

  const loadConversation = async (agentId: string) => {
    try {
      // Get or create conversation
      let { data: conversation, error: convError } = await supabase
        .from('conversaciones')
        .select('*')
        .eq('agente_id', agentId)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (convError && convError.code === 'PGRST116') {
        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from('conversaciones')
          .insert({
            agente_id: agentId,
            user_id: user?.id,
            titulo: 'Nueva conversación'
          })
          .select()
          .single();

        if (createError) throw createError;
        conversation = newConv;
      } else if (convError) {
        throw convError;
      }

      setConversationId(conversation.id);

      // Load messages
      const { data: messages, error: msgError } = await supabase
        .from('mensajes')
        .select('*')
        .eq('conversacion_id', conversation.id)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;

      const formattedMessages: Message[] = messages.map(msg => ({
        id: msg.id,
        content: msg.contenido,
        role: msg.rol as 'user' | 'assistant',
        timestamp: new Date(msg.created_at),
        agentId: agentId
      }));

      setMessages(formattedMessages);
      
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la conversación",
        variant: "destructive",
      });
    }
  };

  const handleAgentIdChange = (value: string) => {
    setAgentId(value);
    if (onAgentChange) {
      onAgentChange(value || null);
    }
  };

  // Función para formatear la respuesta del webhook
  const formatWebhookResponse = (text: string): string => {
    if (!text) return '';
    
    return text
      // Convertir **texto** a negritas
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convertir saltos de línea dobles a párrafos
      .replace(/\n\n/g, '</p><p>')
      // Convertir saltos de línea simples a <br>
      .replace(/\n/g, '<br>')
      // Envolver en párrafos si no está ya envuelto
      .replace(/^(?!<p>)/, '<p>')
      .replace(/(?!<\/p>)$/, '</p>')
      // Limpiar párrafos vacíos
      .replace(/<p><\/p>/g, '');
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !agent || !conversationId || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      role: 'user',
      timestamp: new Date(),
      agentId: agent.id
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Save user message
      await supabase
        .from('mensajes')
        .insert({
          conversacion_id: conversationId,
          user_id: user?.id,
          rol: 'usuario',
          contenido: userMessage.content
        });

      // Enviar mensaje al webhook
      const webhookUrl = 'https://app-zuenvio.aykjp9.easypanel.host/webhook/e62ad48e-ed56-4d16-8429-56418fb0e873/chat';
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          agentId: agent.id,
          agentName: agent.nombre,
          userId: user?.id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const webhookData = await response.json();
      const aiResponse = webhookData.output || webhookData.response || webhookData.message || 'No se recibió respuesta del webhook';
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: formatWebhookResponse(aiResponse),
        role: 'assistant',
        timestamp: new Date(),
        agentId: agent.id
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
      setIsLoading(false);

      // Save AI message
      await supabase
        .from('mensajes')
        .insert({
          conversacion_id: conversationId,
          user_id: user?.id,
          rol: 'asistente',
          contenido: aiMessage.content
        });
      
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      setIsTyping(false);
      
      // Mostrar mensaje de error más específico
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      toast({
        title: "Error",
        description: `No se pudo enviar el mensaje: ${errorMessage}`,
        variant: "destructive",
      });
      
      // Agregar mensaje de error en el chat
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        content: `Error: No se pudo conectar con el webhook. ${errorMessage}`,
        role: 'assistant',
        timestamp: new Date(),
        agentId: agent.id
      };
      
      setMessages(prev => [...prev, errorMsg]);
     }
   };

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "¡Copiado!",
        description: "Mensaje copiado al portapapeles",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar el mensaje",
        variant: "destructive",
      });
    }
  };

  const clearConversation = async () => {
    if (!conversationId) return;

    try {
      await supabase
        .from('mensajes')
        .delete()
        .eq('conversacion_id', conversationId);

      setMessages([]);
      toast({
        title: "Conversación limpiada",
        description: "Todos los mensajes han sido eliminados",
      });
    } catch (error) {
      console.error('Error clearing conversation:', error);
      toast({
        title: "Error",
        description: "No se pudo limpiar la conversación",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-white/20 shadow-lg">
        <div className="max-w-4xl mx-auto p-4">
          {/* Agent ID Input - Solo mostrar si no viene desde URL */}
          {!searchParams.get('agente') && (
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ingresa el ID del agente..."
                    value={agentId}
                    onChange={(e) => handleAgentIdChange(e.target.value)}
                    className="pl-10 bg-white/70 dark:bg-gray-800/70 border-white/30 focus:border-purple-400 focus:ring-purple-200"
                  />
                </div>
              </div>
              {messages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearConversation}
                  className="bg-white/70 hover:bg-red-50 border-white/30 hover:border-red-200"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          
          {/* Botón de limpiar conversación cuando viene desde URL */}
          {searchParams.get('agente') && messages.length > 0 && (
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={clearConversation}
                className="bg-white/70 hover:bg-red-50 border-white/30 hover:border-red-200"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar conversación
              </Button>
            </div>
          )}

          {/* Agent Info Header */}
          {loadingAgent ? (
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/50 dark:bg-gray-800/50">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <div>
                <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
              </div>
            </div>
          ) : agent ? (
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200/30">
              <Avatar className="h-10 w-10 bg-gradient-to-r from-purple-500 to-pink-500">
                <AvatarFallback className="text-white font-semibold">
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">{agent.nombre}</h3>
                <p className="text-sm text-muted-foreground">
                  {agent.descripcion || 'Agente de IA personalizado'}
                </p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                agent.estado === 'activo'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
              }`}>
                {agent.estado}
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200/50">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">Ingresa un ID de agente para comenzar</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-4xl mx-auto p-4">
          <div className="h-full overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent">
            {messages.length === 0 && agent ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-6 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 mb-4">
                  <MessageSquare className="h-12 w-12 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  ¡Comienza una conversación!
                </h3>
                <p className="text-muted-foreground max-w-md">
                  Escribe tu primer mensaje para comenzar a chatear con {agent.nombre}
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 animate-in slide-in-from-bottom-2 duration-300 ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Avatar className={`h-8 w-8 flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500'
                  }`}>
                    <AvatarFallback className="text-white text-sm font-semibold">
                      {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex-1 max-w-xs sm:max-w-md lg:max-w-lg ${
                    message.role === 'user' ? 'flex flex-col items-end' : ''
                  }`}>
                    <div className={`group relative p-3 rounded-2xl shadow-sm ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-br-md'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-md'
                    }`}>
                      <div 
                        className="text-sm leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: message.content }}
                      />
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyMessage(message.content)}
                        className={`absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                          message.role === 'user'
                            ? 'hover:bg-white/20 text-white/70 hover:text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <span className={`text-xs text-muted-foreground mt-1 ${
                      message.role === 'user' ? 'text-right' : ''
                    }`}>
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              ))
            )}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start space-x-3 animate-in slide-in-from-bottom-2 duration-300">
                <Avatar className="h-8 w-8 bg-gradient-to-r from-purple-500 to-pink-500">
                  <AvatarFallback className="text-white text-sm font-semibold">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-2xl rounded-bl-md shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-t border-white/20 shadow-lg">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                placeholder={agent ? `Escribe un mensaje a ${agent.nombre}...` : "Selecciona un agente para comenzar..."}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!agent || isLoading}
                className="min-h-[44px] max-h-32 resize-none bg-white/70 dark:bg-gray-800/70 border-white/30 focus:border-purple-400 focus:ring-purple-200 rounded-2xl"
                rows={1}
              />
            </div>
            <Button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || !agent || isLoading}
              className="h-11 w-11 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;