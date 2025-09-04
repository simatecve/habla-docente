import React from 'react';
import { useNavigate } from 'react-router-dom';
import CreateAgent from '@/components/CreateAgent';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const CreateAgentPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleAgentCreated = (agentId: string) => {
    // Redirigir al dashboard después de crear el agente
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <CreateAgent onAgentCreated={handleAgentCreated} />
  );
};

export default CreateAgentPage;