import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, QrCode, Phone } from 'lucide-react';
import QRModal from './QRModal';

const WhatsAppConnection: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [nombreInstancia, setNombreInstancia] = useState('');
  const [numeroWhatsapp, setNumeroWhatsapp] = useState('');
  const [instanciaCreada, setInstanciaCreada] = useState<any>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [instancias, setInstancias] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loadingInstancias, setLoadingInstancias] = useState(true);

  // Cargar instancias del usuario
  const cargarInstancias = async () => {
    if (!user) return;

    setLoadingInstancias(true);
    try {
      const { data, error } = await supabase
        .from('instancias_whatsapp')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error('Error al cargar las instancias');
      }

      setInstancias(data || []);
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Error al cargar las instancias",
        variant: "destructive",
      });
    } finally {
      setLoadingInstancias(false);
    }
  };

  // Cargar instancias al montar el componente
  React.useEffect(() => {
    cargarInstancias();
  }, [user]);

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

      const webhookText = await webhookResponse.text();
      let webhookResult: any;
      try {
        webhookResult = JSON.parse(webhookText);
      } catch {
        webhookResult = webhookText;
      }
      const getStatus = (r: any): string | null => {
        if (r == null) return null;
        if (typeof r === 'string') return r.toLowerCase();
        if (Array.isArray(r)) return getStatus(r[0]);
        if (typeof r === 'object') {
          const s = (r.status ?? r.Status ?? r.state ?? r.STATE);
          return s ? String(s).toLowerCase() : null;
        }
        return null;
      };
      const webhookStatus = getStatus(webhookResult);

      if (webhookResponse.ok && (webhookStatus === 'starting' || webhookStatus === 'ok')) {
        // Si el webhook responde OK, guardar en la base de datos
        const { data: instancia, error: dbError } = await supabase
          .from('instancias_whatsapp')
          .insert({
            user_id: user.id,
            nombre_instancia: nombreInstancia,
            numero_whatsapp: numeroWhatsapp,
            estado: 'pendiente',
            webhook_respuesta: webhookResult
          })
          .select()
          .single();

        if (dbError) {
          throw new Error('Error al guardar en la base de datos');
        }

        setInstanciaCreada(instancia);
        // Actualizar la lista de instancias
        await cargarInstancias();
        toast({
          title: "¡Éxito!",
          description: "Instancia de WhatsApp creada correctamente",
        });

        // Limpiar formulario y volver a la vista de lista
        setNombreInstancia('');
        setNumeroWhatsapp('');
        setShowCreateForm(false);
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
    if (!instanciaCreada || !user) return;

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

      // Datos para enviar al webhook del QR
      const webhookData = {
        usuario: {
          id: user.id,
          email: user.email,
          nombre: profile?.nombre || 'Usuario',
          plan: profile?.plan || 'freemium'
        },
        instancia: {
          nombre_instancia: instanciaCreada.nombre_instancia,
          numero_whatsapp: instanciaCreada.numero_whatsapp
        }
      };

      // Llamar al webhook del QR
      const webhookResponse = await fetch('https://n8n.kanbanpro.com.ar/webhook/qr_instancia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      const webhookText = await webhookResponse.text();
      let webhookResult: any;
      try {
        webhookResult = JSON.parse(webhookText);
      } catch {
        webhookResult = webhookText;
      }

      if (webhookResponse.ok && webhookResult) {
        // Asumir que la respuesta contiene el código QR
        setQrCode(webhookResult.qrCode || webhookResult);
        setShowQRModal(true);
      } else {
        throw new Error('Error al obtener el código QR');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Error al obtener el código QR",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmarConexion = async () => {
    if (!instanciaCreada) return;

    setIsConfirming(true);
    try {
      // Actualizar el estado de la instancia a "conectado"
      const { error: updateError } = await supabase
        .from('instancias_whatsapp')
        .update({ estado: 'conectado' })
        .eq('id', instanciaCreada.id);

      if (updateError) {
        throw new Error('Error al actualizar el estado de la instancia');
      }

      // Actualizar el estado local
      // Actualizar el estado local en la lista de instancias
      const updatedInstancias = instancias.map(inst => 
        inst.id === instanciaCreada.id ? { ...inst, estado: 'conectado' } : inst
      );
      setInstancias(updatedInstancias);
      setInstanciaCreada({ ...instanciaCreada, estado: 'conectado' });
      setShowQRModal(false);
      
      toast({
        title: "¡Éxito!",
        description: "WhatsApp conectado correctamente",
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Error al confirmar la conexión",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const conectarInstancia = async (instancia: any) => {
    setInstanciaCreada(instancia);
    await conectarConQR();
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'conectado': return 'text-green-600 bg-green-50 border-green-200';
      case 'pendiente': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'desconectado': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Instancias de WhatsApp
            </div>
            <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
              Agregar Nueva Instancia
            </Button>
          </CardTitle>
          <CardDescription>
            Gestiona tus instancias de WhatsApp para enviar mensajes automáticos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {showCreateForm ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Crear Nueva Instancia</h3>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateForm(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </div>
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
            </div>
          ) : (
            <div className="space-y-4">
              {loadingInstancias ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Cargando instancias...</span>
                </div>
              ) : instancias.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tienes instancias de WhatsApp configuradas</p>
                  <p className="text-sm">Haz clic en "Agregar Nueva Instancia" para comenzar</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {instancias.map((instancia) => (
                    <div key={instancia.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{instancia.nombre_instancia}</h3>
                          <p className="text-sm text-muted-foreground">{instancia.numero_whatsapp}</p>
                          <span className={`inline-block px-2 py-1 text-xs rounded border ${getEstadoColor(instancia.estado)}`}>
                            {instancia.estado.charAt(0).toUpperCase() + instancia.estado.slice(1)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {instancia.estado !== 'conectado' && (
                            <Button 
                              onClick={() => conectarInstancia(instancia)}
                              disabled={isLoading}
                              variant="outline"
                              size="sm"
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <QrCode className="mr-2 h-4 w-4" />
                                  Conectar
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <QRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrCode={qrCode}
        onConfirmConnection={confirmarConexion}
        isConfirming={isConfirming}
      />
    </div>
  );
};

export default WhatsAppConnection;