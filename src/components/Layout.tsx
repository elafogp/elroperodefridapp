import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Receipt,
  DollarSign, LogOut, Menu, X, Clock, Truck, Settings,
  FileText, Briefcase, Building2, Wallet, Bell, ShoppingBag
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, setYear, differenceInDays } from 'date-fns';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
  section?: 'main' | 'admin' | 'bottom';
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Inicio', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['admin'], section: 'main' },
  { to: '/pos', label: 'Punto de Venta', icon: <ShoppingCart className="w-5 h-5" />, roles: ['admin', 'seller'], section: 'main' },
  { to: '/inventory', label: 'Inventario', icon: <Package className="w-5 h-5" />, roles: ['admin', 'warehouse'], section: 'main' },
  { to: '/customers', label: 'Clientes', icon: <Users className="w-5 h-5" />, roles: ['admin', 'seller'], section: 'main' },
  { to: '/apartados', label: 'Apartados', icon: <Clock className="w-5 h-5" />, roles: ['admin', 'seller'], section: 'main' },
  { to: '/pickups', label: 'Recogen en Tienda', icon: <Truck className="w-5 h-5" />, roles: ['admin', 'seller', 'warehouse'], section: 'main' },
  { to: '/sales-history', label: 'Historial de Ventas', icon: <FileText className="w-5 h-5" />, roles: ['admin'], section: 'main' },
  { to: '/daily-close', label: 'Cierre de Caja', icon: <DollarSign className="w-5 h-5" />, roles: ['admin', 'seller'], section: 'main' },
  { to: '/caja-menor', label: 'Caja Menor', icon: <Wallet className="w-5 h-5" />, roles: ['admin', 'seller'], section: 'main' },
  { to: '/expenses', label: 'Gastos', icon: <Receipt className="w-5 h-5" />, roles: ['admin'], section: 'admin' },
  { to: '/investments', label: 'Inversiones', icon: <Briefcase className="w-5 h-5" />, roles: ['admin'], section: 'admin' },
  { to: '/suppliers', label: 'Proveedores', icon: <Building2 className="w-5 h-5" />, roles: ['admin'], section: 'admin' },
  { to: '/salaries', label: 'Salarios', icon: <Wallet className="w-5 h-5" />, roles: ['admin'], section: 'admin' },
  { to: '/resumen', label: 'Resumen', icon: <FileText className="w-5 h-5" />, roles: ['admin'], section: 'admin' },
  { to: '/settings', label: 'Configuración', icon: <Settings className="w-5 h-5" />, roles: ['admin'], section: 'bottom' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { products, customers, apartados, lowStockThreshold, suppliers } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const prevCountRef = useRef(0);

  const filteredNav = navItems.filter(item => user && item.roles.includes(user.role));
  const mainNav = filteredNav.filter(i => i.section === 'main');
  const adminNav = filteredNav.filter(i => i.section === 'admin');
  const bottomNav = filteredNav.filter(i => i.section === 'bottom');

  // Notification alerts
  const notifications = useMemo(() => {
    const alerts: { icon: string; text: string; link: string; type: 'warning' | 'info' | 'danger' }[] = [];
    const today = new Date();

    // Low stock
    const lowStock = products.filter(p =>
      p.hasVariations ? p.variations.some(v => v.stock > 0 && v.stock < (lowStockThreshold || 3)) :
        (p.simpleStock || 0) > 0 && (p.simpleStock || 0) < (lowStockThreshold || 3)
    );
    if (lowStock.length > 0) alerts.push({ icon: '⚠️', text: `${lowStock.length} producto(s) con stock bajo (<3)`, link: '/inventory', type: 'warning' });

    // Birthdays today
    const birthdays = customers.filter(c => {
      if (!c.birthday) return false;
      try { const b = parseISO(c.birthday); return b.getMonth() === today.getMonth() && b.getDate() === today.getDate(); } catch { return false; }
    });
    if (birthdays.length > 0) alerts.push({ icon: '🎂', text: `Cumpleaños hoy: ${birthdays.map(c => c.name).join(', ')}`, link: '/customers', type: 'info' });

    // Due apartados
    const dueApartados = apartados.filter(a => {
      if (a.status !== 'pendiente') return false;
      try { return differenceInDays(parseISO(a.expiresAt), today) <= 2; } catch { return false; }
    });
    if (dueApartados.length > 0) alerts.push({ icon: '⏰', text: `${dueApartados.length} apartado(s) próximos a vencer`, link: '/apartados', type: 'danger' });

    // Supplier debts
    const highDebt = suppliers.filter(s => {
      const paid = s.payments.reduce((sum, p) => sum + p.amount, 0);
      return (s.totalDebt - paid) > 0;
    });
    if (highDebt.length > 0 && user?.role === 'admin') alerts.push({ icon: '💰', text: `${highDebt.length} proveedor(es) con deuda pendiente`, link: '/suppliers', type: 'warning' });

    return alerts;
  }, [products, customers, apartados, suppliers, lowStockThreshold, user]);

  // Play notification sound when new alerts arrive
  useEffect(() => {
    if (notifications.length > prevCountRef.current && prevCountRef.current > 0) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.value = 0.08;
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } catch {}
    }
    prevCountRef.current = notifications.length;
  }, [notifications.length]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-sidebar-border">
        <h2 className="text-2xl font-display font-semibold text-foreground tracking-tight">El Ropero de Frida</h2>
        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-body">
          {user?.role === 'admin' ? 'Administrador' : user?.role === 'seller' ? 'Vendedor' : 'Bodega'}
        </p>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {mainNav.map(item => (
          <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive ? 'bg-primary text-primary-foreground shadow-soft' : 'text-sidebar-foreground hover:bg-sidebar-accent'
            }`}>
            {item.icon}{item.label}
          </NavLink>
        ))}
        {adminNav.length > 0 && (
          <>
            <div className="pt-3 pb-1 px-4"><span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Administración</span></div>
            {adminNav.map(item => (
              <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-primary text-primary-foreground shadow-soft' : 'text-sidebar-foreground hover:bg-sidebar-accent'
                }`}>
                {item.icon}{item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>
      <div className="p-4 border-t border-sidebar-border print:hidden space-y-1">
        {bottomNav.map(item => (
          <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive ? 'bg-primary text-primary-foreground shadow-soft' : 'text-sidebar-foreground hover:bg-sidebar-accent'
            }`}>
            {item.icon}{item.label}
          </NavLink>
        ))}
        <div className="flex items-center gap-3 px-4 py-2 mt-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-display font-semibold text-sm">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
          </div>
        </div>
        <button onClick={logout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all w-full">
          <LogOut className="w-4 h-4" />Cerrar Sesión
        </button>
        {/* Developer footer */}
        <div className="pt-3 text-center">
          <a href="https://www.felipeogonzalez.com" target="_blank" rel="noreferrer"
            className="felipe-glow text-[9px] text-muted-foreground/40 tracking-wider hover:text-primary transition-all duration-300">
            By: Felipe O. González
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar border-r border-sidebar-border fixed inset-y-0 left-0 z-30 print:hidden">
        <SidebarContent />
      </aside>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-soft print:hidden">
        <h2 className="text-xl font-display font-semibold">El Ropero de Frida</h2>
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <div className="relative">
            <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-lg hover:bg-muted relative">
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[9px] font-bold flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-muted">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {/* Desktop notification bell in top-right */}
      <div className="hidden lg:block fixed top-4 right-6 z-40 print:hidden">
        <div className="relative">
          <button onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-xl bg-card border border-border shadow-soft hover:shadow-card transition-all relative">
            <Bell className="w-5 h-5 text-foreground" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {notifications.length}
              </span>
            )}
          </button>
          <AnimatePresence>
            {showNotifications && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-elevated z-50 overflow-hidden">
                <div className="p-3 border-b border-border">
                  <p className="text-xs font-semibold text-foreground">🔔 Notificaciones ({notifications.length})</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-xs text-muted-foreground text-center">Sin alertas pendientes ✨</p>
                  ) : (
                    notifications.map((n, i) => (
                      <NavLink key={i} to={n.link} onClick={() => setShowNotifications(false)}
                        className={`flex items-start gap-2 p-3 hover:bg-muted/50 border-b border-border/50 last:border-0 ${
                          n.type === 'danger' ? 'bg-destructive/5' : n.type === 'warning' ? 'bg-camel/5' : ''
                        }`}>
                        <span className="text-sm">{n.icon}</span>
                        <span className="text-xs text-foreground">{n.text}</span>
                      </NavLink>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 bg-sidebar z-50 shadow-elevated">
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">{children}</div>
        {/* Fixed developer footer on main area */}
        <div className="hidden lg:block fixed bottom-3 right-6 print:hidden z-30">
          <a href="https://www.felipeogonzalez.com" target="_blank" rel="noreferrer"
            className="felipe-glow text-[10px] text-muted-foreground/30 tracking-wider hover:text-primary transition-all duration-300">
            By: Felipe O. González
          </a>
        </div>
      </main>
    </div>
  );
}
