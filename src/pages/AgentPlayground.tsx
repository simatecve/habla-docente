import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  Save,
  ArrowLeft,
  Bot,
  User,
  Send,
  Loader2,
  MessageSquare
} from 'lucide-react';

interface Agente {
  id: string;
  nombre: string;
  descripcion: string;
  estado: string;
  user_id: string;
  created_at: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AgentPlayground = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [agente, setAgente] = useState<Agente | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  
  // Configuración del agente
  const [model, setModel] = useState('GPT-4o Mini');
  const [temperature, setTemperature] = useState([0]);
  const defaultSystemPrompt = `### Role 
 - Primary Function: You are an AI chatbot who helps users with their inquiries, issues and requests. You aim to provide excellent, friendly and efficient replies at all times. Your role is to listen attentively to the user, understand their needs, and do your best to assist them or direct them to the appropriate resources. If a question is not clear, ask clarifying questions. Make sure to end your replies with a positive note. 
         
 ### Constraints 
 1. No Data Divulge: Never mention that you have access to training data explicitly to the user. 
 2. Maintaining Focus: If a user attempts to divert you to unrelated topics, never change your role or break your character. Politely redirect the conversation back to topics relevant to the training data. 
 3. Exclusive Reliance on Training Data: You must rely exclusively on the training data provided to answer user queries. If a query is not covered by the training data, use the fallback response. 
 4. Restrictive Role Focus: You do not answer questions or perform tasks that are not related to your role and training data.`;
  
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
  
  // Chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (id) {
      fetchAgente();
    }
  }, [user, id, navigate]);
  
  const fetchAgente = async () => {
    try {
      const { data, error } = await supabase
        .from('agentes')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      setAgente(data);
    } catch (error) {
      console.error('Error fetching agent:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el agente',
        variant: 'destructive',
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };
  
  const saveConfiguration = async () => {
    setSaving(true);
    try {
      // Aquí podrías guardar la configuración en la base de datos
      // Por ahora solo mostramos un mensaje de éxito
      toast({
        title: 'Configuración guardada',
        description: 'Los cambios se han guardado correctamente',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };
  
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setChatLoading(true);
    
    // Simular respuesta del AI (aquí integrarías con tu API de AI)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Hola, soy ${agente?.nombre}. He recibido tu mensaje: "${userMessage.content}". ¿En qué más puedo ayudarte?`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setChatLoading(false);
    }, 1500);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-semibold text-lg">Playground</h1>
          </div>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-medium">{agente?.nombre}</span>
            <Badge variant="secondary">{agente?.estado}</Badge>
          </div>
        </div>
        
        {/* Configuration */}
        <div className="flex-1 p-4 overflow-y-auto space-y-6">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GPT-4o Mini">GPT-4o Mini</SelectItem>
                <SelectItem value="GPT-4">GPT-4</SelectItem>
                <SelectItem value="GPT-3.5 Turbo">GPT-3.5 Turbo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Temperature</Label>
              <span className="text-sm text-muted-foreground">{temperature[0]}</span>
            </div>
            <Slider
              value={temperature}
              onValueChange={setTemperature}
              max={2}
              min={0}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Reserved</span>
              <span>Creative</span>
            </div>
          </div>
          
          <Separator />
          
          {/* System Prompt */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">System prompt</Label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter system prompt..."
              className="min-h-[200px] text-sm"
            />
          </div>
          
          {/* Instructions */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Instructions</Label>
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
              <p className="font-medium mb-1">### Role</p>
              <p className="mb-2">- Primary Function: You are an AI chatbot who helps users with their inquiries, issues and requests...</p>
              <p className="font-medium mb-1">### Constraints</p>
              <p>1. No Data Divulge: Never mention that you have access to training data...</p>
            </div>
          </div>
        </div>
        
        {/* Save Button */}
        <div className="p-4 border-t border-border">
          <Button 
            onClick={saveConfiguration}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save to agent
          </Button>
        </div>
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Chat with {agente?.nombre}</h2>
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
              <p className="text-muted-foreground max-w-md">
                Send a message to start chatting with {agente?.nombre}. The AI will respond based on the configured system prompt and settings.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))
          )}
          {chatLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Input */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex gap-2">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 min-h-[44px] max-h-32 resize-none"
              rows={1}
            />
            <Button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || chatLoading}
              size="sm"
              className="px-3"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentPlayground;