import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, FileText, MessageSquare, Zap, Shield, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Koonetxa Chats
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Crea, entrena y gestiona agentes de IA personalizados que interactúan con tus documentos. 
            Una plataforma completa para potenciar tu productividad con inteligencia artificial.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Comenzar Gratis
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
              Iniciar Sesión
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Funcionalidades Principales</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Todo lo que necesitas para crear y gestionar agentes de IA potentes y personalizados
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <Bot className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Agentes Personalizados</CardTitle>
              <CardDescription>
                Crea agentes de IA únicos con tu propia API key de OpenAI y entrenalos con tus documentos
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <FileText className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Gestión de Documentos</CardTitle>
              <CardDescription>
                Sube PDFs, imágenes, texto y más. Procesamiento automático con OCR y extracción de contenido
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <MessageSquare className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Chat Inteligente</CardTitle>
              <CardDescription>
                Conversa con tus agentes usando el contexto de todos tus documentos cargados
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <Zap className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Integración n8n</CardTitle>
              <CardDescription>
                Automatiza flujos de trabajo con webhooks y conecta tus agentes a otros servicios
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <Shield className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Privacidad Total</CardTitle>
              <CardDescription>
                Tus datos están completamente aislados y seguros. Cada usuario tiene su propio espacio privado
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <Globe className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Interfaz en Español</CardTitle>
              <CardDescription>
                Diseño limpio, intuitivo y completamente responsive. Navegación en español nativo
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">¿Listo para comenzar?</h2>
          <p className="text-muted-foreground mb-8">
            Únete a Koonetxa Chats y comienza a crear agentes de IA personalizados hoy mismo.
            Plan gratuito disponible sin compromiso.
          </p>
          <Button size="lg" onClick={() => navigate('/auth')}>
            Crear Cuenta Gratis
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">
            © 2025 Koonetxa Chats. Plataforma SaaS para agentes de IA personalizados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
