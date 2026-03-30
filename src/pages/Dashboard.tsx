import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DollarSign, ShoppingBag, Users, TrendingUp, Cake, Clock, MessageCircle, Wallet, RefreshCw, PiggyBank, Package, Gift, AlertTriangle } from 'lucide-react';
import { format, addDays, parseISO, setYear, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

// Paleta artística: Rosa mexicano, Terracota, Verde oliva
const ROSA_MEXICANO = '#E4007C';
const TERRACOTA = '#C8553D';
const VERDE_OLIVA = '#6B8F3D';
const DONUT_COLORS = [ROSA_MEXICANO, TERRACOTA, VERDE_OLIVA];

export default function Dashboard() {
  const { exchangeRate, setExchangeRate, products, customers, transactions, expenses, apartados, salaries, investments, lowStockThreshold, cajaChica } = useStore();
  const navigate = useNavigate();
  const [rateInput, setRateInput] = useState(exchangeRate.toString());

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const validTx = transactions.filter(t => !t.voided);
  const todayTx = validTx.filter(t => t.createdAt.startsWith(todayStr));
  const todayRevenue = todayTx.reduce((s, t) => s + t.totalUSD, 0);
  const totalRevenue = validTx.filter(t => t.type === 'sale').reduce((s, t) => s + t.totalUSD, 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.currency === 'USD' ? e.amount : e.amount / (e.exchangeRate || exchangeRate)), 0);
  const totalSalaries = salaries.filter(s => s.status === 'pagado').reduce((s, sal) => s + sal.baseSalaryUSD, 0);
  const totalInvestments = investments.reduce((s, i) => s + i.totalCost, 0);
  const netProfit = totalRevenue - totalExpenses - totalSalaries - totalInvestments;

  const pendingApartados = apartados.filter(a => a.status === 'pendiente');
  const pendingSalaries = salaries.filter(s => s.status === 'pendiente');

  const todayBirthdays = customers.filter(c => {
    if (!c.birthday) return false;
    try { const bday = parseISO(c.birthday); return bday.getMonth() === today.getMonth() && bday.getDate() === today.getDate(); } catch { return false; }
  });

  // Caja menor acumulativa
  const cajaBalance = useMemo(() => cajaChica.reduce((s, e) => s + (e.type === 'ingreso' ? e.amount : -e.amount), 0), [cajaChica]);

  // Top 5 best sellers
  const topProducts = useMemo(() => {
    const counts: Record<string, { name: string; count: number; stock: number }> = {};
    validTx.forEach(t => t.items.forEach(item => {
      const id = item.product.id;
      if (!counts[id]) {
        const p = products.find(pp => pp.id === id);
        const totalStock = p ? (p.hasVariations ? p.variations.reduce((s, v) => s + v.stock, 0) : (p.simpleStock || 0)) : 0;
        counts[id] = { name: item.product.name, count: 0, stock: totalStock };
      }
      counts[id].count += item.quantity;
    }));
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [transactions, products]);

  // Last 3 sales
  const lastSales = validTx.filter(t => t.type === 'sale').slice(-3).reverse();

  // Payment methods donut (today)
  const paymentData = useMemo(() => {
    let efectivo = 0, digital = 0, zelle = 0;
    todayTx.forEach(t => {
      if (t.paymentMethod === 'divisa') efectivo += t.totalUSD;
      else if (t.paymentMethod === 'pago_movil') digital += t.totalUSD;
      else if (t.paymentMethod === 'zelle') zelle += t.totalUSD;
      else if (t.paymentMethod === 'mixto' && t.splitPayment) {
        efectivo += t.splitPayment.divisa;
        digital += t.splitPayment.pago_movil;
        zelle += t.splitPayment.zelle;
      }
    });
    return [
      { name: 'Efectivo', value: efectivo },
      { name: 'P. Móvil', value: digital },
      { name: 'Zelle', value: zelle },
    ].filter(d => d.value > 0);
  }, [transactions]);

  // Daily sales trend (last 14 days) - Line chart
  const trendData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(today, -13 + i);
      const ds = format(d, 'yyyy-MM-dd');
      return { name: format(d, 'dd/MM'), ventas: validTx.filter(t => t.createdAt.startsWith(ds)).reduce((s, t) => s + t.totalUSD, 0) };
    });
  }, [transactions]);

  // Top products bar chart data
  const topProductsBarData = useMemo(() => {
    return topProducts.map(p => ({ name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name, vendidos: p.count }));
  }, [topProducts]);

  const handleRateUpdate = () => { const r = parseFloat(rateInput); if (r > 0) setExchangeRate(r); };

  // Low stock products
  const lowStockProducts = products.filter(p => {
    const stock = p.hasVariations ? p.variations.reduce((s, v) => s + v.stock, 0) : (p.simpleStock || 0);
    return stock > 0 && stock <= (p.lowStockThreshold || lowStockThreshold);
  });

  const stats = [
    { label: 'Ventas Hoy', value: `$${todayRevenue.toFixed(2)}`, icon: <DollarSign className="w-5 h-5" />, color: 'bg-primary/10 text-primary' },
    { label: 'Ganancia Neta', value: `$${netProfit.toFixed(2)}`, icon: <TrendingUp className="w-5 h-5" />, color: netProfit >= 0 ? 'bg-green-100 text-green-700' : 'bg-destructive/10 text-destructive' },
    { label: 'Transacciones Hoy', value: todayTx.length, icon: <ShoppingBag className="w-5 h-5" />, color: 'bg-primary/10 text-primary' },
    { label: 'Clientes', value: customers.length, icon: <Users className="w-5 h-5" />, color: 'bg-secondary/10 text-secondary' },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden h-40 bg-gradient-to-r from-primary/80 via-lilac-dark/70 to-primary/60">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-lilac-dark/80" />
        <div className="relative z-10 h-full flex flex-col justify-center px-8">
          <h1 className="text-4xl font-display font-bold text-white">DASHBOARD</h1>
          <p className="text-white/80 font-body text-sm mt-1 uppercase tracking-widest">El Ropero de Frida</p>
          <p className="text-white/60 text-xs mt-1">{format(today, "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
        </div>
      </div>

      {/* Birthday alert */}
      {todayBirthdays.length > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center gap-3">
          <Cake className="w-6 h-6 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">🎂 ¡Cumpleaños Hoy!</p>
            <p className="text-xs text-muted-foreground">{todayBirthdays.map(c => c.name).join(', ')}</p>
          </div>
          {todayBirthdays[0]?.phone && (
            <a href={`https://wa.me/${todayBirthdays[0].phone.replace(/[\s+]/g, '')}?text=${encodeURIComponent(`¡Feliz cumpleaños ${todayBirthdays[0].name}! 🎂🌸 De parte de El Ropero de Frida.`)}`}
              target="_blank" rel="noreferrer" className="ml-auto text-xs bg-[#25D366] text-white px-3 py-1.5 rounded-lg font-medium">
              <MessageCircle className="w-3 h-3 inline mr-1" />Felicitar
            </a>
          )}
        </div>
      )}

      {/* Tasa Widget */}
      <div className="bg-card border-2 border-primary/30 rounded-xl p-6 shadow-soft flex items-center gap-6">
        <div className="p-3 rounded-xl bg-primary/10">
          <DollarSign className="w-8 h-8 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Tasa del Día</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-display font-bold text-foreground">1$ =</span>
            <input type="number" value={rateInput} onChange={e => setRateInput(e.target.value)}
              className="text-3xl font-display font-bold bg-transparent border-b-2 border-primary/40 w-24 outline-none text-foreground" step="0.1" />
            <span className="text-3xl font-display font-bold text-foreground">Bs</span>
          </div>
        </div>
        <button onClick={handleRateUpdate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <RefreshCw className="w-4 h-4" />Actualizar
        </button>
      </div>

      {/* Alerts */}
      {(pendingApartados.length > 0 || pendingSalaries.length > 0 || lowStockProducts.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {pendingApartados.length > 0 && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-3 py-2 text-xs font-medium text-foreground">
              <Clock className="w-4 h-4 text-primary" />{pendingApartados.length} apartados pendientes
            </div>
          )}
          {pendingSalaries.length > 0 && (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-xs font-medium text-foreground">
              <Wallet className="w-4 h-4 text-destructive" />{pendingSalaries.length} salarios pendientes
            </div>
          )}
          {lowStockProducts.length > 0 && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2 text-xs font-medium text-foreground">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />{lowStockProducts.length} productos con stock bajo
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-5 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</span>
              <div className={`p-2 rounded-lg ${s.color}`}>{s.icon}</div>
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Caja Menor */}
      <div className={`bg-card border rounded-xl p-5 shadow-soft ${cajaBalance < 0 ? 'border-destructive' : 'border-border'}`}>
        <div className="flex items-center gap-2 mb-3">
          <PiggyBank className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-semibold">Caja Menor (Acumulado)</h3>
          {cajaBalance < 0 && <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded font-bold animate-pulse">⚠️ BALANCE NEGATIVO</span>}
        </div>
        <p className={`text-3xl font-display font-bold ${cajaBalance < 0 ? 'text-destructive' : 'text-foreground'}`}>
          ${cajaBalance.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">USD</span>
        </p>
      </div>

      {/* CHARTS ROW: Daily Sales Line + Top Products Bar */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Ventas Diarias - Line/Area Chart */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
          <h3 className="font-display text-lg font-semibold mb-4">📈 Ventas Diarias (14 días)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ROSA_MEXICANO} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={TERRACOTA} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Ventas']}
                contentStyle={{ borderRadius: '8px', border: `1px solid ${TERRACOTA}` }} />
              <Area type="monotone" dataKey="ventas" stroke={ROSA_MEXICANO} fill="url(#salesGradient)" strokeWidth={2.5} dot={{ fill: ROSA_MEXICANO, r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Productos Más Vendidos - Bar Chart */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
          <h3 className="font-display text-lg font-semibold mb-4">🏆 Productos Más Vendidos</h3>
          {topProductsBarData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Sin ventas aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProductsBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                <Tooltip formatter={(v: number) => [`${v} uds`, 'Vendidos']}
                  contentStyle={{ borderRadius: '8px', border: `1px solid ${VERDE_OLIVA}` }} />
                <Bar dataKey="vendidos" radius={[0, 4, 4, 0]}>
                  {topProductsBarData.map((_, i) => (
                    <Cell key={i} fill={[ROSA_MEXICANO, TERRACOTA, VERDE_OLIVA, ROSA_MEXICANO, TERRACOTA][i % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Top Products List */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
          <div className="flex items-center gap-2 mb-4"><Package className="w-5 h-5 text-primary" /><h3 className="font-display text-lg font-semibold">Top Productos</h3></div>
          {topProducts.length === 0 ? <p className="text-sm text-muted-foreground">Sin ventas aún</p> : (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary w-5">{i + 1}.</span>
                    <span className="text-sm font-medium truncate max-w-[120px]">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{p.count} uds</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${p.stock < 3 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                      {p.stock}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Last 3 Sales */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold">Últimas Ventas</h3>
            <button onClick={() => navigate('/sales-history')} className="text-xs text-primary hover:underline">Ver todo →</button>
          </div>
          {lastSales.length === 0 ? <p className="text-sm text-muted-foreground">Sin ventas</p> : (
            <div className="space-y-2">
              {lastSales.map(tx => {
                const cust = customers.find(c => c.id === tx.customerId);
                return (
                  <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{cust?.name || 'Sin cliente'}</p>
                      <p className="text-[10px] text-muted-foreground">{format(parseISO(tx.createdAt), 'HH:mm')}</p>
                    </div>
                    <span className="text-sm font-bold">${tx.totalUSD.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Methods Donut */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
          <h3 className="font-display text-lg font-semibold mb-4">Métodos de Pago (Hoy)</h3>
          {paymentData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Sin datos</p> : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={paymentData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {paymentData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Upcoming Birthdays */}
      {(() => {
        const upcoming = customers.filter(c => {
          if (!c.birthday) return false;
          try {
            const bday = parseISO(c.birthday);
            const thisYear = setYear(bday, today.getFullYear());
            const diff = differenceInDays(thisYear, today);
            return diff >= 0 && diff <= 30;
          } catch { return false; }
        }).sort((a, b) => {
          const da = setYear(parseISO(a.birthday!), today.getFullYear());
          const db = setYear(parseISO(b.birthday!), today.getFullYear());
          return differenceInDays(da, today) - differenceInDays(db, today);
        }).slice(0, 5);

        if (upcoming.length === 0) return null;
        return (
          <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
            <div className="flex items-center gap-2 mb-4"><Gift className="w-5 h-5 text-primary" /><h3 className="font-display text-lg font-semibold">Próximos Cumpleaños</h3></div>
            <div className="space-y-2">
              {upcoming.map(c => {
                const bday = parseISO(c.birthday!);
                const thisYear = setYear(bday, today.getFullYear());
                const daysLeft = differenceInDays(thisYear, today);
                return (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎂</span>
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{format(bday, 'dd MMM', { locale: es })}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${daysLeft === 0 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {daysLeft === 0 ? '¡HOY!' : `en ${daysLeft} días`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
