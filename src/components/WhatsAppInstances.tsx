import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, QrCode, Phone, Plus, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QRCodeLib from 'qrcode';

interface WhatsAppInstance {
  id: string;
  nombre: string;
  numero: string;
  estatus: 'pendiente' | 'conectado' | 'desconectado';
  webhook_response?: any;
  qr_data?: string;
  created_at: string;
  updated_at: string;
}

const WhatsAppInstances: React.FC = () => {
  const { user } = useAuth();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [currentInstance, setCurrentInstance] = useState<WhatsAppInstance | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Form data
  const [nombre, setNombre] = useState('');
  const [numero, setNumero] = useState('');

  // Cargar instancias
  const loadInstances = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInstances(data || []);
    } catch (error: any) {
      console.error('Error loading instances:', error);
      toast({
        title: "Error",
        description: "Error al cargar las instancias",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstances();
  }, [user]);

  // Crear nueva instancia
  const createInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !nombre.trim() || !numero.trim()) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      // Obtener datos del perfil del usuario
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.warn('No se pudo obtener el perfil, usando datos básicos');
      }

      // Preparar datos para el webhook
      const webhookData = {
        usuario: {
          id: user.id,
          email: user.email,
          nombre: profile?.nombre || user.email?.split('@')[0] || 'Usuario',
          plan: profile?.plan || 'freemium'
        },
        instancia: {
          nombre_instancia: nombre.trim(),
          numero_whatsapp: numero.trim()
        }
      };

      console.log('Enviando datos al webhook:', webhookData);

      // Llamar al webhook de crear instancia
      const response = await fetch('https://app-zuenvio.aykjp9.easypanel.host/webhook/crear_instancia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      const responseText = await response.text();
      let webhookResult: any;
      
      try {
        webhookResult = JSON.parse(responseText);
      } catch {
        webhookResult = { message: responseText };
      }

      console.log('Respuesta del webhook:', webhookResult);

      // Si el webhook responde OK, crear el registro en la BD
      if (response.ok) {
        const { data: newInstance, error: dbError } = await supabase
          .from('whatsapp_instances')
          .insert({
            user_id: user.id,
            nombre: nombre.trim(),
            numero: numero.trim(),
            estatus: 'pendiente',
            webhook_response: webhookResult
          })
          .select()
          .single();

        if (dbError) throw dbError;

        // Actualizar la lista de instancias
        setInstances(prev => [newInstance, ...prev]);
        
        // Limpiar formulario
        setNombre('');
        setNumero('');
        setShowCreateForm(false);

        toast({
          title: "¡Éxito!",
          description: "Instancia de WhatsApp creada correctamente",
        });
      } else {
        throw new Error(webhookResult.message || 'Error en el webhook');
      }
    } catch (error: any) {
      console.error('Error creating instance:', error);
      toast({
        title: "Error",
        description: error.message || "Error al crear la instancia",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // Conectar con código QR
  const connectWithQR = async (instance: WhatsAppInstance) => {
    if (!user) return;

    setConnecting(instance.id);

    try {
      // Obtener datos del perfil del usuario
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.warn('No se pudo obtener el perfil, usando datos básicos');
      }

      // Preparar datos para el webhook
      const webhookData = {
        usuario: {
          id: user.id,
          email: user.email,
          nombre: profile?.nombre || user.email?.split('@')[0] || 'Usuario',
          plan: profile?.plan || 'freemium'
        },
        instancia: {
          nombre_instancia: instance.nombre,
          numero_whatsapp: instance.numero
        }
      };

      console.log('Enviando datos al webhook QR:', webhookData);

      // Llamar al webhook de QR
      const response = await fetch('https://app-zuenvio.aykjp9.easypanel.host/webhook/qr_instancia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      const responseText = await response.text();
      let webhookResult: any;
      
      try {
        webhookResult = JSON.parse(responseText);
      } catch {
        webhookResult = responseText;
      }

      console.log('Respuesta del webhook QR:', webhookResult);

      if (response.ok && webhookResult) {
        // Guardar los datos del QR en la instancia
        const { error: updateError } = await supabase
          .from('whatsapp_instances')
          .update({ qr_data: typeof webhookResult === 'string' ? webhookResult : JSON.stringify(webhookResult) })
          .eq('id', instance.id);

        if (updateError) {
          console.warn('Error updating QR data:', updateError);
        }

        // Generar imagen QR
        const qrText = typeof webhookResult === 'string' ? webhookResult : JSON.stringify(webhookResult);
        try {
          const qrImageDataUrl = await QRCodeLib.toDataURL(qrText, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrImageUrl(qrImageDataUrl);
        } catch (qrError) {
          console.error('Error generating QR image:', qrError);
          // Fallback: usar el texto como está
          setQrImageUrl('');
        }

        // Mostrar el modal con el QR
        setQrData(qrText);
        setCurrentInstance(instance);
        setShowQRModal(true);
      } else {
        throw new Error('Error al obtener el código QR');
      }
    } catch (error: any) {
      console.error('Error connecting with QR:', error);
      toast({
        title: "Error",
        description: error.message || "Error al obtener el código QR",
        variant: "destructive",
      });
    } finally {
      setConnecting(null);
    }
  };

  // Confirmar conexión
  const confirmConnection = async () => {
    if (!currentInstance) return;

    setConfirming(true);

    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ estatus: 'conectado' })
        .eq('id', currentInstance.id);

      if (error) throw error;

      // Actualizar la lista local
      setInstances(prev => 
        prev.map(inst => 
          inst.id === currentInstance.id 
            ? { ...inst, estatus: 'conectado' as const }
            : inst
        )
      );

      setShowQRModal(false);
      setCurrentInstance(null);
      setQrData('');
      setQrImageUrl('');

      toast({
        title: "¡Éxito!",
        description: "WhatsApp conectado correctamente",
      });
    } catch (error: any) {
      console.error('Error confirming connection:', error);
      toast({
        title: "Error",
        description: "Error al confirmar la conexión",
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  const getStatusColor = (estatus: string) => {
    switch (estatus) {
      case 'conectado': return 'text-green-600 bg-green-50 border-green-200';
      case 'pendiente': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'desconectado': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (estatus: string) => {
    switch (estatus) {
      case 'conectado': return 'Conectado';
      case 'pendiente': return 'Pendiente';
      case 'desconectado': return 'Desconectado';
      default: return estatus;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Cargando instancias...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Instancias de WhatsApp
            </div>
            <Button 
              onClick={() => setShowCreateForm(true)} 
              disabled={showCreateForm}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nueva Instancia
            </Button>
          </CardTitle>
          <CardDescription>
            Gestiona tus instancias de WhatsApp para enviar mensajes automáticos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {showCreateForm && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">Crear Nueva Instancia</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={createInstance} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre de la Instancia</Label>
                    <Input
                      id="nombre"
                      type="text"
                      placeholder="Ej: Mi WhatsApp Business"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      disabled={creating}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numero">Número de WhatsApp</Label>
                    <Input
                      id="numero"
                      type="tel"
                      placeholder="Ej: +52 55 1234 5678"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      disabled={creating}
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={creating} className="flex-1">
                      {creating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        'Crear Instancia'
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowCreateForm(false);
                        setNombre('');
                        setNumero('');
                      }}
                      disabled={creating}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {instances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tienes instancias de WhatsApp configuradas</p>
              <p className="text-sm">Haz clic en "Nueva Instancia" para comenzar</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {instances.map((instance) => (
                <Card key={instance.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold">{instance.nombre}</h3>
                        <p className="text-sm text-muted-foreground">{instance.numero}</p>
                        <span className={`inline-block px-2 py-1 text-xs rounded border ${getStatusColor(instance.estatus)}`}>
                          {getStatusText(instance.estatus)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {instance.estatus !== 'conectado' && (
                          <Button 
                            onClick={() => connectWithQR(instance)}
                            disabled={connecting === instance.id}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            {connecting === instance.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <QrCode className="h-4 w-4" />
                            )}
                            Conectar con código QR
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal QR */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="max-w-md bg-white border border-gray-200 shadow-lg">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <QrCode className="h-5 w-5 text-blue-600" />
              Código QR de WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-6 p-4">
            {/* Imagen QR */}
            <div className="bg-white p-6 rounded-lg border-2 border-gray-100 shadow-sm">
              {qrImageUrl ? (
                <div className="text-center">
                  <img 
                    src={qrImageUrl} 
                    alt="Código QR de WhatsApp" 
                    className="w-64 h-64 mx-auto"
                  />
                  <p className="text-sm text-gray-600 mt-3">
                    Código QR generado
                  </p>
                </div>
              ) : qrData ? (
                <div className="text-center">
                  <div className="bg-gray-50 p-4 rounded border text-xs font-mono break-all max-h-32 overflow-y-auto text-gray-700">
                    {qrData}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Datos del código QR recibidos del webhook
                  </p>
                </div>
              ) : (
                <div className="w-64 h-64 bg-gray-100 rounded flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              )}
            </div>
            
            {/* Instrucciones */}
            <div className="text-center space-y-2 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <p className="text-sm font-medium text-blue-900">
                Escanea este código QR con tu aplicación de WhatsApp
              </p>
              <p className="text-xs text-blue-700">
                Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo
              </p>
            </div>
            
            {/* Botón de confirmación */}
            <Button 
              onClick={confirmConnection}
              disabled={confirming}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {confirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Ya conecté mi WhatsApp
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppInstances;