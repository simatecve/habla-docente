import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Search, Plus, Phone, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Lead {
  id: string;
  nombre: string;
  pushname: string;
  numero_whatsapp: string;
  created_at: string;
}

const LeadsPage: React.FC = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newLead, setNewLead] = useState({
    nombre: '',
    pushname: '',
    numero_whatsapp: ''
  });
  const [creating, setCreating] = useState(false);

  const loadLeads = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      console.error('Error loading leads:', error);
      toast({
        title: "Error",
        description: "Error al cargar los contactos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [user]);

  const createLead = async () => {
    if (!user || !newLead.numero_whatsapp.trim()) return;

    setCreating(true);
    try {
      const { error } = await supabase
        .from('leads')
        .insert({
          user_id: user.id,
          nombre: newLead.nombre.trim() || null,
          pushname: newLead.pushname.trim() || newLead.numero_whatsapp,
          numero_whatsapp: newLead.numero_whatsapp.trim()
        });

      if (error) throw error;

      toast({
        title: "Contacto creado",
        description: "El contacto ha sido agregado correctamente",
      });

      setNewLead({ nombre: '', pushname: '', numero_whatsapp: '' });
      setShowCreateDialog(false);
      await loadLeads();

    } catch (error: any) {
      console.error('Error creating lead:', error);
      toast({
        title: "Error",
        description: error.message || "Error al crear el contacto",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.pushname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.numero_whatsapp.includes(searchTerm)
  );

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contactos / Leads
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Contacto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Contacto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input
                      id="nombre"
                      placeholder="Nombre completo"
                      value={newLead.nombre}
                      onChange={(e) => setNewLead({ ...newLead, nombre: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pushname">Pushname</Label>
                    <Input
                      id="pushname"
                      placeholder="Nombre en WhatsApp"
                      value={newLead.pushname}
                      onChange={(e) => setNewLead({ ...newLead, pushname: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero">Número de WhatsApp *</Label>
                    <Input
                      id="numero"
                      placeholder="+52 55 1234 5678"
                      value={newLead.numero_whatsapp}
                      onChange={(e) => setNewLead({ ...newLead, numero_whatsapp: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={createLead} 
                      disabled={creating || !newLead.numero_whatsapp.trim()}
                      className="flex-1"
                    >
                      {creating ? 'Creando...' : 'Crear Contacto'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateDialog(false)}
                      disabled={creating}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            Gestiona tus contactos y leads de WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar contactos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Leads List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Users className="h-6 w-6 animate-spin" />
              <span className="ml-2">Cargando contactos...</span>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">
                {searchTerm ? 'No se encontraron contactos' : 'No tienes contactos'}
              </p>
              <p className="text-sm">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Agrega tu primer contacto para comenzar'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLeads.map((lead) => (
                <Card key={lead.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-green-100 text-green-700">
                          {getInitials(lead.nombre || lead.pushname)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {lead.nombre || lead.pushname}
                        </h3>
                        {lead.nombre && lead.pushname && (
                          <p className="text-sm text-gray-600 truncate">
                            @{lead.pushname}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                          <Phone className="h-3 w-3 mr-1" />
                          {lead.numero_whatsapp}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-gray-400">
                            {new Date(lead.created_at).toLocaleDateString('es-ES')}
                          </span>
                          <Button variant="outline" size="sm">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Chat
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadsPage;