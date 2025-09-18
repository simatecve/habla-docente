import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, QrCode, Phone } from 'lucide-react';

const WhatsAppConnection: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [nombreInstancia, setNombreInstancia] = useState('');
  const [numeroWhatsapp, setNumeroWhatsapp] = useState('');
  const [instanciaCreada, setInstanciaCreada] = useState<any>(null);

  const crearInstancia = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "Debes estar autenticado para crear una instancia",
        variant: "destructive",
      });
      return;
    }

    if (!nombreInstancia || !numeroWhatsapp) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Obtener datos del perfil del usuario
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        throw new Error('Error al obtener datos del perfil');
      }

      // Datos para enviar al webhook
      const webhookData = {
        usuario: {
          id: user.id,
          email: user.email,
          nombre: profile?.nombre || 'Usuario',
          plan: profile?.plan || 'freemium'
        },
        instancia: {
          nombre_instancia: nombreInstancia,
          numero_whatsapp: numeroWhatsapp
        }
      };

      // Llamar al webhook
      const webhookResponse = await fetch('https://app-zuenvio.aykjp9.easypanel.host/webhook/crear_instancia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      const webhookResult = await webhookResponse.json();

      if (webhookResponse.ok && Array.isArray(webhookResult) && webhookResult.length > 0 && webhookResult[0].status === 'STARTING') {
        // Si el webhook responde OK, guardar en la base de datos
        const { data: instancia, error: dbError } = await supabase
          .from('instancias_whatsapp')
          .insert({
            user_id: user.id,
            nombre_instancia: nombreInstancia,
            numero_whatsapp: numeroWhatsapp,
            estado: 'desconectado',
            webhook_respuesta: webhookResult
          })
          .select()
          .single();

        if (dbError) {
          throw new Error('Error al guardar en la base de datos');
        }

        setInstanciaCreada(instancia);
        toast({
          title: "¡Éxito!",
          description: "Instancia de WhatsApp creada correctamente",
        });

        // Limpiar formulario
        setNombreInstancia('');
        setNumeroWhatsapp('');
      } else {
        throw new Error(webhookResult.message || 'Error en el webhook');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Error al crear la instancia de WhatsApp",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const conectarConQR = async () => {
    if (!instanciaCreada) return;

    setIsLoading(true);
    try {
      // Aquí implementarías la lógica para obtener el código QR
      toast({
        title: "Función en desarrollo",
        description: "La conexión por código QR estará disponible pronto",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error al conectar con código QR",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Conectar WhatsApp
          </CardTitle>
          <CardDescription>
            Configura tu instancia de WhatsApp para enviar mensajes automáticos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!instanciaCreada ? (
            <form onSubmit={crearInstancia} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombreInstancia">Nombre de la Instancia</Label>
                <Input
                  id="nombreInstancia"
                  type="text"
                  placeholder="Ej: Mi WhatsApp Business"
                  value={nombreInstancia}
                  onChange={(e) => setNombreInstancia(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numeroWhatsapp">Número de WhatsApp</Label>
                <Input
                  id="numeroWhatsapp"
                  type="tel"
                  placeholder="Ej: +52 55 1234 5678"
                  value={numeroWhatsapp}
                  onChange={(e) => setNumeroWhatsapp(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando instancia...
                  </>
                ) : (
                  'Crear Instancia'
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800">Instancia Creada</h3>
                <p className="text-green-700">
                  {instanciaCreada.nombre_instancia} - {instanciaCreada.numero_whatsapp}
                </p>
                <p className="text-sm text-green-600">
                  Estado: {instanciaCreada.estado}
                </p>
              </div>

              <Button 
                onClick={conectarConQR} 
                disabled={isLoading}
                className="w-full"
                variant="default"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    Conectar con Código QR
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppConnection;