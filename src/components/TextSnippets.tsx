import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  FileText, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type Snippet = Database['public']['Tables']['snippets']['Row'];
type SnippetInsert = Database['public']['Tables']['snippets']['Insert'];
type SnippetUpdate = Database['public']['Tables']['snippets']['Update'];

interface TextSnippetsProps {
  agenteId: string;
}

interface EditingSnippet {
  id: string;
  titulo: string;
  descripcion: string;
}

export const TextSnippets: React.FC<TextSnippetsProps> = ({ agenteId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<EditingSnippet | null>(null);
  const [savingSnippetId, setSavingSnippetId] = useState<string | null>(null);
  const [deletingSnippetId, setDeletingSnippetId] = useState<string | null>(null);
  
  // Estados para el formulario de creación
  const [newSnippet, setNewSnippet] = useState({
    titulo: '',
    descripcion: ''
  });

  // Cargar snippets del agente
  const loadSnippets = async () => {
    if (!user || !agenteId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('snippets')
        .select('*')
        .eq('agente_id', agenteId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSnippets(data || []);
    } catch (error) {
      console.error('Error al cargar snippets:', error);
      setError('Error al cargar los snippets');
      toast({
        title: "Error",
        description: "No se pudieron cargar los snippets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Crear nuevo snippet
  const createSnippet = async () => {
    if (!user || !newSnippet.titulo.trim() || !newSnippet.descripcion.trim()) {
      toast({
        title: "Error",
        description: "El título y la descripción son obligatorios",
        variant: "destructive",
      });
      return;
    }

    setSavingSnippetId('new');
    
    try {
      const snippetData: SnippetInsert = {
        agente_id: agenteId,
        user_id: user.id,
        titulo: newSnippet.titulo.trim(),
        descripcion: newSnippet.descripcion.trim()
      };

      const { data, error } = await supabase
        .from('snippets')
        .insert([snippetData])
        .select()
        .single();

      if (error) throw error;

      setSnippets(prev => [data, ...prev]);
      setNewSnippet({ titulo: '', descripcion: '' });
      setIsCreating(false);
      
      toast({
        title: "Éxito",
        description: "Snippet creado correctamente",
      });
    } catch (error) {
      console.error('Error al crear snippet:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el snippet",
        variant: "destructive",
      });
    } finally {
      setSavingSnippetId(null);
    }
  };

  // Actualizar snippet
  const updateSnippet = async (id: string) => {
    if (!editingSnippet || !editingSnippet.titulo.trim() || !editingSnippet.descripcion.trim()) {
      toast({
        title: "Error",
        description: "El título y la descripción son obligatorios",
        variant: "destructive",
      });
      return;
    }

    setSavingSnippetId(id);
    
    try {
      const updateData: SnippetUpdate = {
        titulo: editingSnippet.titulo.trim(),
        descripcion: editingSnippet.descripcion.trim()
      };

      const { data, error } = await supabase
        .from('snippets')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (error) throw error;

      setSnippets(prev => prev.map(snippet => 
        snippet.id === id ? data : snippet
      ));
      setEditingSnippet(null);
      
      toast({
        title: "Éxito",
        description: "Snippet actualizado correctamente",
      });
    } catch (error) {
      console.error('Error al actualizar snippet:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el snippet",
        variant: "destructive",
      });
    } finally {
      setSavingSnippetId(null);
    }
  };

  // Eliminar snippet
  const deleteSnippet = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este snippet?')) {
      return;
    }

    setDeletingSnippetId(id);
    
    try {
      const { error } = await supabase
        .from('snippets')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;

      setSnippets(prev => prev.filter(snippet => snippet.id !== id));
      
      toast({
        title: "Éxito",
        description: "Snippet eliminado correctamente",
      });
    } catch (error) {
      console.error('Error al eliminar snippet:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el snippet",
        variant: "destructive",
      });
    } finally {
      setDeletingSnippetId(null);
    }
  };

  // Iniciar edición
  const startEditing = (snippet: Snippet) => {
    setEditingSnippet({
      id: snippet.id,
      titulo: snippet.titulo,
      descripcion: snippet.descripcion
    });
  };

  // Cancelar edición
  const cancelEditing = () => {
    setEditingSnippet(null);
  };

  // Cancelar creación
  const cancelCreating = () => {
    setIsCreating(false);
    setNewSnippet({ titulo: '', descripcion: '' });
  };

  useEffect(() => {
    loadSnippets();
  }, [agenteId, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando snippets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón para agregar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Text Snippets
          </h3>
          <p className="text-sm text-muted-foreground">
            Fragmentos de texto reutilizables para este agente
          </p>
        </div>
        
        {!isCreating && (
          <Button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Agregar Snippet
          </Button>
        )}
      </div>

      {/* Formulario de creación */}
      {isCreating && (
        <Card className="border-dashed border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Nuevo Snippet</CardTitle>
            <CardDescription>
              Crea un nuevo fragmento de texto para este agente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="new-titulo">Título</Label>
              <Input
                id="new-titulo"
                value={newSnippet.titulo}
                onChange={(e) => setNewSnippet(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Título del snippet"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="new-descripcion">Descripción</Label>
              <Textarea
                id="new-descripcion"
                value={newSnippet.descripcion}
                onChange={(e) => setNewSnippet(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Contenido del snippet"
                className="mt-1 min-h-[100px]"
                rows={4}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={createSnippet}
                disabled={savingSnippetId === 'new'}
                className="flex items-center gap-2"
              >
                {savingSnippetId === 'new' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar
              </Button>
              
              <Button 
                variant="outline" 
                onClick={cancelCreating}
                disabled={savingSnippetId === 'new'}
              >
                <X className="h-4 w-4" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de snippets */}
      {snippets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay snippets</h3>
            <p className="text-muted-foreground text-center mb-4">
              Este agente no tiene snippets de texto aún.
            </p>
            {!isCreating && (
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primer snippet
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {snippets.map((snippet) => (
            <Card key={snippet.id} className="transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {editingSnippet?.id === snippet.id ? (
                      <Input
                        value={editingSnippet.titulo}
                        onChange={(e) => setEditingSnippet(prev => 
                          prev ? { ...prev, titulo: e.target.value } : null
                        )}
                        className="font-semibold text-base"
                        placeholder="Título del snippet"
                      />
                    ) : (
                      <CardTitle className="text-base">{snippet.titulo}</CardTitle>
                    )}
                    
                    <CardDescription className="mt-1">
                      Creado el {new Date(snippet.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    {editingSnippet?.id === snippet.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateSnippet(snippet.id)}
                          disabled={savingSnippetId === snippet.id}
                          className="flex items-center gap-1"
                        >
                          {savingSnippetId === snippet.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                          disabled={savingSnippetId === snippet.id}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(snippet)}
                          disabled={!!editingSnippet || !!savingSnippetId}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteSnippet(snippet.id)}
                          disabled={deletingSnippetId === snippet.id || !!editingSnippet || !!savingSnippetId}
                          className="text-destructive hover:text-destructive"
                        >
                          {deletingSnippetId === snippet.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {editingSnippet?.id === snippet.id ? (
                  <Textarea
                    value={editingSnippet.descripcion}
                    onChange={(e) => setEditingSnippet(prev => 
                      prev ? { ...prev, descripcion: e.target.value } : null
                    )}
                    className="min-h-[100px]"
                    placeholder="Contenido del snippet"
                    rows={4}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {snippet.descripcion}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TextSnippets;