import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, MessageSquare, Users } from 'lucide-react';

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
  user_id?: string;
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

const DatabaseViewer: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  const loadConversations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('conversaciones_whatsapp')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setConversations(data || []);
    } catch (err: any) {
      setError(`Error cargando conversaciones: ${err.message}`);
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId?: string) => {
    if (!conversationId) {
      // Cargar todos los mensajes
      try {
        const { data, error } = await supabase
          .from('mensajes_whatsapp')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          throw error;
        }

        setMessages(data || []);
      } catch (err: any) {
        setError(`Error cargando mensajes: ${err.message}`);
        console.error('Error loading messages:', err);
      }
    } else {
      // Cargar mensajes de una conversación específica
      try {
        const { data, error } = await supabase
          .from('mensajes_whatsapp')
          .select('*')
          .eq('conversacion_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        setMessages(data || []);
      } catch (err: any) {
        setError(`Error cargando mensajes: ${err.message}`);
        console.error('Error loading messages:', err);
      }
    }
  };

  useEffect(() => {
    loadConversations();
    loadMessages();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES');
  };

  const handleConversationClick = (conversationId: string) => {
    setSelectedConversation(conversationId);
    loadMessages(conversationId);
  };

  const handleShowAllMessages = () => {
    setSelectedConversation(null);
    loadMessages();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center">
            <Database className="mr-2" />
            Datos de la Base de Datos
          </h1>
          <Button 
            onClick={() => {
              loadConversations();
              loadMessages(selectedConversation || undefined);
            }}
            disabled={loading}
            className="flex items-center"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversaciones */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Conversaciones ({conversations.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Haz clic en una conversación para ver sus mensajes
            </p>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Cargando conversaciones...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No hay conversaciones en la base de datos
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => handleConversationClick(conversation.id)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedConversation === conversation.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">
                        {conversation.pushname || conversation.nombre_contacto || conversation.numero_whatsapp}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {conversation.mensajes_no_leidos > 0 && (
                          <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                            {conversation.mensajes_no_leidos}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          conversation.estado === 'activa' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {conversation.estado}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-1">
                      📱 {conversation.numero_whatsapp}
                    </p>
                    
                    {conversation.ultimo_mensaje && (
                      <div className="mb-2">
                        <p className="text-sm text-gray-500 truncate">
                          💬 {conversation.ultimo_mensaje}
                        </p>
                        <p className="text-xs text-gray-400">
                          {conversation.ultimo_mensaje_fecha && formatDate(conversation.ultimo_mensaje_fecha)}
                        </p>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
                      <p><strong>ID:</strong> {conversation.id}</p>
                      <p><strong>Instancia:</strong> {conversation.instancia_id}</p>
                      <p><strong>Creado:</strong> {formatDate(conversation.created_at)}</p>
                      {conversation.user_id && <p><strong>Usuario:</strong> {conversation.user_id}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mensajes */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                Mensajes ({messages.length})
              </h2>
              {selectedConversation && (
                <Button
                  onClick={handleShowAllMessages}
                  variant="outline"
                  size="sm"
                >
                  Ver todos los mensajes
                </Button>
              )}
            </div>
            {selectedConversation ? (
              <p className="text-sm text-gray-600 mt-1">
                📋 Mostrando mensajes de la conversación seleccionada
              </p>
            ) : (
              <p className="text-sm text-gray-600 mt-1">
                📋 Mostrando los últimos 50 mensajes de todas las conversaciones
              </p>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Cargando mensajes...
              </div>
            ) : messages.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {selectedConversation 
                  ? "No hay mensajes en esta conversación" 
                  : "No hay mensajes en la base de datos"
                }
              </div>
            ) : (
              <div className="divide-y">
                {messages.map((message) => (
                  <div key={message.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          message.direccion === 'entrante' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {message.direccion === 'entrante' ? '📥 Entrante' : '📤 Saliente'}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {message.tipo_mensaje}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        message.estado_mensaje === 'entregado' 
                          ? 'bg-green-100 text-green-800'
                          : message.estado_mensaje === 'leido'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {message.estado_mensaje}
                      </span>
                    </div>
                    
                    <div className={`p-3 rounded-lg mb-2 ${
                      message.direccion === 'entrante' 
                        ? 'bg-gray-100 text-gray-900' 
                        : 'bg-blue-500 text-white'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">
                        {message.contenido}
                      </p>
                      <p className={`text-xs mt-1 ${
                        message.direccion === 'entrante' ? 'text-gray-500' : 'text-blue-100'
                      }`}>
                        {formatDate(message.created_at)}
                      </p>
                    </div>
                    
                    <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
                      <div className="grid grid-cols-2 gap-2">
                        <p><strong>ID:</strong> {message.id}</p>
                        <p><strong>Conversación:</strong> {message.conversacion_id}</p>
                        <p><strong>WhatsApp ID:</strong> {message.mensaje_whatsapp_id}</p>
                        <p><strong>Creado:</strong> {formatDate(message.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900">Total Conversaciones</h3>
          <p className="text-2xl font-bold text-blue-600">{conversations.length}</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-900">Total Mensajes</h3>
          <p className="text-2xl font-bold text-green-600">{messages.length}</p>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="font-semibold text-yellow-900">Conversaciones Activas</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {conversations.filter(c => c.estado === 'activa').length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DatabaseViewer;