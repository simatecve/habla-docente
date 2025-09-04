import React, { createContext, useContext, useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateAgentPage from "./pages/CreateAgent";
import AgentDetail from "./pages/AgentDetail";

import Chat from "./components/Chat";
import NotFound from "./pages/NotFound";
import {
  Bot,
  LogOut,
  ChevronRight
} from 'lucide-react';

const queryClient = new QueryClient();

// Global App Context
interface AppContextType {
  currentAgentId: string | null;
  setCurrentAgentId: (id: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

// Header Component
const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/agentes/nuevo':
        return 'Crear Agente';
      case '/chat':
        return 'Chat';
      default:
        return 'Koonetxa Chats';
    }
  };

  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Inicio', path: '/dashboard' }];
    
    if (paths.includes('agentes')) {
      breadcrumbs.push({ name: 'Agentes', path: '/dashboard' });
      if (paths.includes('nuevo')) {
        breadcrumbs.push({ name: 'Crear Agente', path: '/agentes/nuevo' });
      }
    }
    
    if (paths.includes('chat')) {
      breadcrumbs.push({ name: 'Chat', path: '/chat' });
    }
    
    return breadcrumbs;
  };

  if (!user || location.pathname === '/' || location.pathname === '/auth' || location.pathname === '/landing') {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-white/20 shadow-lg transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Koonetxa Chats
                </h1>
              </div>
            </Link>
          </div>

          {/* Breadcrumbs */}
          <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
            {getBreadcrumbs().map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                {index > 0 && <ChevronRight className="h-4 w-4" />}
                <Link
                  to={crumb.path}
                  className={`hover:text-purple-600 transition-colors ${
                    index === getBreadcrumbs().length - 1
                      ? 'text-purple-600 font-medium'
                      : 'hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  {crumb.name}
                </Link>
              </React.Fragment>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user.email}
              </p>
              <p className="text-xs text-muted-foreground">
                {getPageTitle()}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};



// Main Layout Component
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  
  const isAuthPage = location.pathname === '/' || location.pathname === '/auth' || location.pathname === '/landing';
  
  if (isAuthPage || !user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
      <Header />
      <main className="flex-1">
        <div className="min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </main>
    </div>
  );
};

// App Provider Component
const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AppContext.Provider value={{
      currentAgentId,
      setCurrentAgentId,
      sidebarOpen,
      setSidebarOpen
    }}>
      {children}
    </AppContext.Provider>
  );
};

// Chat Page Component
const ChatPage: React.FC = () => {
  const { currentAgentId, setCurrentAgentId } = useAppContext();
  
  return (
    <div className="h-[calc(100vh-4rem)]">
      <Chat 
        initialAgentId={currentAgentId || undefined}
        onAgentChange={setCurrentAgentId}
      />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Auth />} />
                <Route path="/landing" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/agentes/nuevo" element={<CreateAgentPage />} />
                <Route path="/agentes/:id" element={<AgentDetail />} />

                <Route path="/chat" element={<ChatPage />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
