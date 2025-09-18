import React, { useState } from 'react';
import ConversationsList from '@/components/ConversationsList';
import ChatWindow from '@/components/ChatWindow';

interface Conversation {
  id: string;
  lead_id: string;
  instancia_id: string;
  ultimo_mensaje: string;
  ultimo_mensaje_fecha: string;
  no_leidos: number;
  leads: {
    nombre: string;
    pushname: string;
    numero_whatsapp: string;
  };
}

const ConversationsPage: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  return (
    <div className="h-screen flex">
      {/* Sidebar with conversations list */}
      <div className="w-1/3 border-r border-gray-200 bg-white">
        <ConversationsList
          onSelectConversation={(conversation) => setSelectedConversation(conversation)}
          selectedConversationId={selectedConversation?.id}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1">
        {selectedConversation ? (
          <ChatWindow conversation={selectedConversation} />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-2xl font-semibold mb-2">Bienvenido a WhatsApp Web</h2>
              <p className="text-lg">Selecciona una conversación para comenzar a chatear</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationsPage;