import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StoreProvider, useStore } from "@/contexts/StoreContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import POS from "@/pages/POS";
import Inventory from "@/pages/Inventory";
import Customers from "@/pages/Customers";
import Expenses from "@/pages/Expenses";
import DailyClose from "@/pages/DailyClose";
import Apartados from "@/pages/Apartados";
import Pickups from "@/pages/Pickups";
import SalesHistory from "@/pages/SalesHistory";
import Investments from "@/pages/Investments";
import Suppliers from "@/pages/Suppliers";
import Salaries from "@/pages/Salaries";
import Resumen from "@/pages/Resumen";
import CajaChica from "@/pages/CajaChica";
import SettingsPage from "@/pages/Settings";
import Catalog from "@/pages/Catalog";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user } = useAuth();
  const { loading } = useStore();

  if (!user) return <Login />;
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-2">El Ropero de Frida</h2>
        <p className="text-sm text-muted-foreground animate-pulse">Cargando datos...</p>
      </div>
    </div>
  );

  const defaultRoute = user.role === 'admin' ? '/dashboard' : user.role === 'seller' ? '/pos' : '/inventory';

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to={defaultRoute} replace />} />
        {user.role === 'admin' && <Route path="/dashboard" element={<Dashboard />} />}
        {(user.role === 'admin' || user.role === 'seller') && <Route path="/pos" element={<POS />} />}
        {(user.role === 'admin' || user.role === 'warehouse') && <Route path="/inventory" element={<Inventory />} />}
        {(user.role === 'admin' || user.role === 'seller') && <Route path="/customers" element={<Customers />} />}
        {(user.role === 'admin' || user.role === 'seller') && <Route path="/apartados" element={<Apartados />} />}
        {(user.role === 'admin' || user.role === 'seller' || user.role === 'warehouse') && <Route path="/pickups" element={<Pickups />} />}
        {user.role === 'admin' && <Route path="/sales-history" element={<SalesHistory />} />}
        {(user.role === 'admin' || user.role === 'seller') && <Route path="/daily-close" element={<DailyClose />} />}
        {(user.role === 'admin' || user.role === 'seller') && <Route path="/caja-menor" element={<CajaChica />} />}
        {user.role === 'admin' && <Route path="/expenses" element={<Expenses />} />}
        {user.role === 'admin' && <Route path="/investments" element={<Investments />} />}
        {user.role === 'admin' && <Route path="/suppliers" element={<Suppliers />} />}
        {user.role === 'admin' && <Route path="/salaries" element={<Salaries />} />}
        {user.role === 'admin' && <Route path="/resumen" element={<Resumen />} />}
        {user.role === 'admin' && <Route path="/settings" element={<SettingsPage />} />}
        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </Layout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <StoreProvider>
          <BrowserRouter>
            <Routes>
              {/* Public catalog route - no auth required */}
              <Route path="/catalogo" element={<StoreProvider><Catalog /></StoreProvider>} />
              <Route path="*" element={<AppRoutes />} />
            </Routes>
          </BrowserRouter>
        </StoreProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
