import React, { createContext, useContext, useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "./components/AppSidebar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateAgentPage from "./pages/CreateAgent";
import AgentDetail from "./pages/AgentDetail";
import EditAgentPage from "./pages/EditAgent";
import AgentsMenuPage from "./pages/AgentsMenu";
import WhatsAppConnectionPage from "./pages/WhatsAppConnection";

import Chat from "./components/Chat";
import NotFound from "./pages/NotFound";
import {
  Bot,
  LogOut,
  ChevronRight,
  Menu
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
      case '/agentes':
        return 'Mis Agentes';
      case '/agentes/nuevo':
        return 'Crear Agente';
      case '/chat':
        return 'Chat';
      default:
        if (location.pathname.includes('/agentes/') && location.pathname.includes('/editar')) {
          return 'Editar Agente';
        }
        if (location.pathname.includes('/agentes/')) {
          return 'Detalle del Agente';
        }
        return 'Koonetxa Chats';
    }
  };

  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Inicio', path: '/dashboard' }];
    
    if (paths.includes('agentes')) {
      breadcrumbs.push({ name: 'Agentes', path: '/agentes' });
      if (paths.includes('nuevo')) {
        breadcrumbs.push({ name: 'Crear Agente', path: '/agentes/nuevo' });
      } else if (paths.includes('editar')) {
        breadcrumbs.push({ name: 'Editar Agente', path: location.pathname });
      } else if (paths.length > 1) {
        breadcrumbs.push({ name: 'Detalle', path: location.pathname });
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
    <header className="sticky top-0 z-50 backdrop-blur-md bg-gradient-to-r from-purple-50/90 via-blue-50/90 to-pink-50/90 dark:from-purple-900/90 dark:via-blue-900/90 dark:to-pink-900/90 border-b border-purple-200/30 dark:border-purple-700/30 shadow-xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <div className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-105 hover-lift">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
                  Koonetxa Chats
                </h1>
              </div>
            </Link>
          </div>

          {/* Breadcrumbs */}
          <div className="hidden md:flex items-center space-x-2 text-sm">
            {getBreadcrumbs().map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                {index > 0 && <ChevronRight className="h-4 w-4 text-purple-400" />}
                <Link
                  to={crumb.path}
                  className={`transition-colors hover-lift ${
                    index === getBreadcrumbs().length - 1
                      ? 'text-purple-700 dark:text-purple-300 font-semibold'
                      : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
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
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {user.email}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                {getPageTitle()}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="text-gray-600 dark:text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover-lift transition-all duration-200"
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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold">Koonetxa Chats</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
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
                <Route path="/agentes" element={<AgentsMenuPage />} />
                <Route path="/agentes/nuevo" element={<CreateAgentPage />} />
                <Route path="/agentes/:id" element={<AgentDetail />} />
                <Route path="/agentes/:id/editar" element={<EditAgentPage />} />
                <Route path="/whatsapp" element={<WhatsAppConnectionPage />} />

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
