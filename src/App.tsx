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
import AgentPlayground from "./pages/AgentPlayground";
import Chat from "./components/Chat";
import NotFound from "./pages/NotFound";
import {
  Bot,
  MessageSquare,
  Plus,
  Home,
  User,
  LogOut,
  Menu,
  X,
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            
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

// Navigation Component
const Navigation: React.FC = () => {
  const { sidebarOpen, setSidebarOpen, currentAgentId } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const navigationItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: Home,
      description: 'Vista general'
    },
    {
      name: 'Crear Agente',
      path: '/agentes/nuevo',
      icon: Plus,
      description: 'Nuevo agente de IA'
    },
    {
      name: 'Chat',
      path: '/chat',
      icon: MessageSquare,
      description: 'Conversar con agentes'
    }
  ];

  const handleAgentCreated = (agentId: string) => {
    // Auto-redirect to chat after agent creation
    navigate('/chat');
    // Set the agent ID for immediate use
    setTimeout(() => {
      // This will be handled by the Chat component
    }, 100);
  };

  if (!user || location.pathname === '/' || location.pathname === '/auth' || location.pathname === '/landing') {
    return null;
  }

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <nav className={`fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 transform bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-r border-white/20 shadow-lg transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200/30 text-purple-700 dark:text-purple-300'
                    : 'hover:bg-gray-100/50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                <div className={`p-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
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
      <div className="flex">
        <Navigation />
        <main className="flex-1 lg:ml-64 transition-all duration-300">
          <div className="min-h-[calc(100vh-4rem)]">
            {children}
          </div>
        </main>
      </div>
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
            <Route path="/agentes/:id/playground" element={<AgentPlayground />} />
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
