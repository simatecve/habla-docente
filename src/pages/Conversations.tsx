import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RefreshCw, MessageSquare, Users, Search, MoreVertical, Phone, VideoIcon, Smile, Paperclip, Mic, Send, ArrowDownLeft, ArrowUpRight, Download, Play, Pause, Volume2 } from 'lucide-react';

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
  mensaje_id_whatsapp?: string;
  mensaje: string;
  tipo_mensaje: 'texto' | 'imagen' | 'video' | 'audio' | 'documento' | 'ubicacion' | 'contacto' | 'sticker';
  direccion: 'entrante' | 'saliente';
  estado_mensaje: string;
  url_adjunto?: string;
  nombre_archivo?: string;
  mime_type?: string;
  created_at: string;
  updated_at: string;
}

const ConversationsPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Función auxiliar para detectar tipo de archivo por URL
  const getFileTypeFromUrl = (url: string) => {
    const urlLower = url.toLowerCase();
    
    // Imágenes
    if (urlLower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/)) {
      return 'image';
    }
    
    // Audio
    if (urlLower.match(/\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/)) {
      return 'audio';
    }
    
    // Video
    if (urlLower.match(/\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv)(\?.*)?$/)) {
      return 'video';
    }
    
    // Todo lo demás es documento
    return 'document';
  };

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
      setMessages([]);
      return;
    }
    
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
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Hoy';
    } else if (diffDays === 2) {
      return 'Ayer';
    } else if (diffDays <= 7) {
      return date.toLocaleDateString('es-ES', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
  };

  const getContactName = (conversation: Conversation) => {
    return conversation.pushname || conversation.nombre_contacto || conversation.numero_whatsapp || 'Sin nombre';
  };

  const filteredConversations = conversations.filter(conv => {
    const contactName = getContactName(conv);
    const phoneNumber = conv.numero_whatsapp || '';
    return contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           phoneNumber.includes(searchTerm);
  });

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar - Lista de conversaciones estilo WhatsApp */}
      <div className="w-1/3 min-w-[320px] max-w-[400px] bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Header del sidebar - FIJO */}
        <div className="bg-gray-50 p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-gray-800">Chats</h1>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadConversations}
                disabled={loading}
                className="p-2 hover:bg-gray-200 rounded-full"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-200 rounded-full">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Barra de búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar o empezar un chat nuevo"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Lista de conversaciones - CON SCROLL */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
          
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto mb-2"></div>
              Cargando conversaciones...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? 'No se encontraron conversaciones' : 'No hay conversaciones'}
            </div>
          ) : (
            <div>
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation)}
                  className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-gray-100' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {getContactName(conversation).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Información de la conversación */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex flex-col">
                        <h3 className="font-medium text-gray-900 truncate">
                          {getContactName(conversation)}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {conversation.numero_telefono}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {conversation.ultimo_mensaje_fecha && formatTime(conversation.ultimo_mensaje_fecha)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.ultimo_mensaje || 'Sin mensajes'}
                      </p>
                      {conversation.mensajes_no_leidos > 0 && (
                        <span className="bg-green-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {conversation.mensajes_no_leidos}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Área principal del chat */}
      <div className="flex-1 flex flex-col h-full">
        {selectedConversation ? (
          <>
            {/* Header del chat - FIJO */}
            <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center flex-shrink-0">
              <div className="flex items-center flex-1">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-semibold">
                    {getContactName(selectedConversation).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="font-medium text-gray-900">
                    {getContactName(selectedConversation)}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedConversation.numero_telefono}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-200 rounded-full">
                  <Search className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-200 rounded-full">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-200 rounded-full">
                  <VideoIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-200 rounded-full">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Área de mensajes - CON SCROLL */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 min-h-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f0f0f0' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}>
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  No hay mensajes en esta conversación
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`flex ${message.direccion === 'saliente' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${
                        message.direccion === 'saliente' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}>
                        {/* Icono del mensaje */}
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-1 ${
                          message.direccion === 'saliente' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-400 text-white'
                        }`}>
                          {message.direccion === 'saliente' ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownLeft className="h-3 w-3" />
                          )}
                        </div>
                        
                        {/* Burbuja del mensaje */}
                        <div
                          className={`px-4 py-2 rounded-lg shadow-sm ${
                            message.direccion === 'saliente'
                              ? 'bg-green-500 text-white rounded-br-sm'
                              : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                          }`}
                        >
                          {/* Contenido del adjunto si existe - solo verificar url_adjunto */}
                          {message.url_adjunto && (
                            <div className="mb-2">
                              {/* Imagen - detectar por extensión de URL */}
                              {getFileTypeFromUrl(message.url_adjunto) === 'image' && (
                                <div className="relative">
                                  <img 
                                    src={message.url_adjunto} 
                                    alt={message.nombre_archivo || 'Imagen'}
                                    className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                    style={{ maxHeight: '300px', maxWidth: '250px' }}
                                    onClick={() => window.open(message.url_adjunto, '_blank')}
                                  />
                                </div>
                              )}
                              
                              {/* Audio - detectar por extensión de URL */}
                              {getFileTypeFromUrl(message.url_adjunto) === 'audio' && (
                                <div className={`flex items-center space-x-2 p-2 rounded-lg ${
                                  message.direccion === 'saliente' ? 'bg-green-600' : 'bg-gray-100'
                                }`}>
                                  <button className={`p-1 rounded-full ${
                                    message.direccion === 'saliente' ? 'bg-green-700 text-white' : 'bg-gray-300 text-gray-700'
                                  }`}>
                                    <Play className="h-4 w-4" />
                                  </button>
                                  <div className="flex-1">
                                    <audio controls className="w-full h-8">
                                      <source src={message.url_adjunto} />
                                      Tu navegador no soporta el elemento de audio.
                                    </audio>
                                  </div>
                                  <Volume2 className="h-4 w-4 opacity-60" />
                                </div>
                              )}
                              
                              {/* Video - detectar por extensión de URL */}
                              {getFileTypeFromUrl(message.url_adjunto) === 'video' && (
                                <div className="relative">
                                  <video 
                                    controls
                                    className="max-w-full h-auto rounded-lg"
                                    style={{ maxHeight: '300px', maxWidth: '250px' }}
                                  >
                                    <source src={message.url_adjunto} />
                                    Tu navegador no soporta el elemento de video.
                                  </video>
                                </div>
                              )}
                              
                              {/* Documento - para todo lo demás */}
                              {getFileTypeFromUrl(message.url_adjunto) === 'document' && (
                                <div className={`flex items-center space-x-3 p-3 rounded-lg border ${
                                  message.direccion === 'saliente' 
                                    ? 'bg-green-600 border-green-700' 
                                    : 'bg-gray-50 border-gray-200'
                                }`}>
                                  <div className={`p-2 rounded-full ${
                                    message.direccion === 'saliente' ? 'bg-green-700' : 'bg-gray-200'
                                  }`}>
                                    <Download className={`h-4 w-4 ${
                                      message.direccion === 'saliente' ? 'text-white' : 'text-gray-600'
                                    }`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${
                                      message.direccion === 'saliente' ? 'text-white' : 'text-gray-900'
                                    }`}>
                                      {message.nombre_archivo || 'Documento'}
                                    </p>
                                    <p className={`text-xs ${
                                      message.direccion === 'saliente' ? 'text-green-100' : 'text-gray-500'
                                    }`}>
                                      Archivo adjunto
                                    </p>
                                  </div>
                                  <button 
                                    onClick={() => window.open(message.url_adjunto, '_blank')}
                                    className={`px-3 py-1 rounded text-xs font-medium ${
                                      message.direccion === 'saliente' 
                                        ? 'bg-green-700 text-white hover:bg-green-800' 
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                  >
                                    Descargar
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Texto del mensaje - mostrar siempre que exista, incluso con adjuntos */}
                          {message.mensaje && message.mensaje.trim() !== '' && (
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.mensaje}
                            </p>
                          )}
                          
                          {/* Mensaje por defecto si no hay texto pero sí adjunto */}
                          {message.url_adjunto && (!message.mensaje || message.mensaje.trim() === '') && (
                            <p className={`text-xs italic ${
                              message.direccion === 'saliente' ? 'text-green-100' : 'text-gray-500'
                            }`}>
                              {getFileTypeFromUrl(message.url_adjunto) === 'image' && 'Imagen'}
                              {getFileTypeFromUrl(message.url_adjunto) === 'audio' && 'Audio'}
                              {getFileTypeFromUrl(message.url_adjunto) === 'video' && 'Video'}
                              {getFileTypeFromUrl(message.url_adjunto) === 'document' && 'Documento'}
                            </p>
                          )}

                          <div className={`text-xs mt-1 ${
                            message.direccion === 'saliente' ? 'text-green-100' : 'text-gray-500'
                          } flex items-center justify-end`}>
                            <span>{formatTime(message.created_at)}</span>
                            {message.direccion === 'saliente' && (
                              <span className="ml-1">
                                {message.estado_mensaje === 'leido' ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Área de escritura - FIJA */}
            <div className="bg-gray-50 p-4 border-t border-gray-200 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-200 rounded-full">
                  <Smile className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-200 rounded-full">
                  <Paperclip className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Escribe un mensaje"
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-200 rounded-full">
                  <Mic className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center text-gray-500 max-w-md">
              <div className="text-8xl mb-6 opacity-20">💬</div>
              <h2 className="text-3xl font-light mb-4 text-gray-700">WhatsApp Web</h2>
              <p className="text-lg text-gray-500 mb-2">
                Envía y recibe mensajes sin mantener tu teléfono conectado.
              </p>
              <p className="text-sm text-gray-400">
                Usa WhatsApp en hasta 4 dispositivos vinculados y 1 teléfono a la vez.
              </p>
              <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">💡 Consejo:</span> Selecciona una conversación de la lista para comenzar a chatear
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationsPage;