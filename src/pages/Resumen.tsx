import { useState, useMemo } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { motion } from 'framer-motion';
import { DollarSign, TrendingDown, TrendingUp, Users, ShoppingBag } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, subMonths, subDays, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type FilterMode = 'day' | 'current_month' | 'last_month' | 'last_7' | 'last_30';

export default function Resumen() {
  const { transactions, expenses, customers, exchangeRate } = useStore();
  const [filterMode, setFilterMode] = useState<FilterMode>('current_month');
  const [specificDate, setSpecificDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { dateRange, label } = useMemo(() => {
    const now = new Date();
    if (filterMode === 'day') {
      const d = parseISO(specificDate);
      return { dateRange: { start: specificDate, end: specificDate }, label: format(d, "d 'de' MMMM yyyy", { locale: es }) };
    }
    if (filterMode === 'last_month') {
      const prev = subMonths(now, 1);
      return { dateRange: { start: format(startOfMonth(prev), 'yyyy-MM-dd'), end: format(endOfMonth(prev), 'yyyy-MM-dd') }, label: format(prev, "MMMM yyyy", { locale: es }) };
    }
    if (filterMode === 'last_7') {
      return { dateRange: { start: format(subDays(now, 6), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') }, label: 'Últimos 7 días' };
    }
    if (filterMode === 'last_30') {
      return { dateRange: { start: format(subDays(now, 29), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') }, label: 'Últimos 30 días' };
    }
    return { dateRange: { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') }, label: format(now, "MMMM yyyy", { locale: es }) };
  }, [filterMode, specificDate]);

  const inRange = (dateStr: string) => {
    const d = dateStr.slice(0, 10);
    return d >= dateRange.start && d <= dateRange.end;
  };

  const validTx = transactions.filter(t => !t.voided && t.type === 'sale' && inRange(t.createdAt));
  const totalSold = validTx.reduce((s, t) => s + t.totalUSD, 0);
  const filteredExpenses = expenses.filter(e => inRange(e.createdAt));
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.currency === 'USD' ? e.amount : e.amount / (e.exchangeRate || exchangeRate)), 0);
  const netProfit = totalSold - totalExpenses;
  const newCustomers = customers.filter(c => inRange(c.createdAt)).length;
  const avgTicket = validTx.length > 0 ? totalSold / validTx.length : 0;

  // Chart data: daily sales trend
  const trendData = useMemo(() => {
    try {
      const start = parseISO(dateRange.start);
      const end = parseISO(dateRange.end);
      const days = eachDayOfInterval({ start, end });
      return days.map(day => {
        const ds = format(day, 'yyyy-MM-dd');
        const daySales = transactions.filter(t => !t.voided && t.type === 'sale' && t.createdAt.startsWith(ds)).reduce((s, t) => s + t.totalUSD, 0);
        const dayExp = expenses.filter(e => (e.date || e.createdAt?.slice(0, 10)) === ds).reduce((s, e) => s + (e.currency === 'USD' ? e.amount : e.amount / (e.exchangeRate || exchangeRate)), 0);
        return { date: format(day, 'dd/MM'), ventas: +daySales.toFixed(2), gastos: +dayExp.toFixed(2) };
      });
    } catch { return []; }
  }, [dateRange, transactions, expenses, exchangeRate]);

  // Payment method distribution
  const paymentData = useMemo(() => {
    const methods: Record<string, number> = { 'Divisa': 0, 'Pago Móvil': 0, 'Zelle': 0 };
    validTx.forEach(t => {
      if (t.paymentMethod === 'mixto' && t.splitPayment) {
        methods['Divisa'] += t.splitPayment.divisa || 0;
        methods['Pago Móvil'] += t.splitPayment.pago_movil || 0;
        methods['Zelle'] += t.splitPayment.zelle || 0;
      } else if (t.paymentMethod === 'divisa') methods['Divisa'] += t.totalUSD;
      else if (t.paymentMethod === 'pago_movil') methods['Pago Móvil'] += t.totalUSD;
      else if (t.paymentMethod === 'zelle') methods['Zelle'] += t.totalUSD;
    });
    return Object.entries(methods).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value: +value.toFixed(2) }));
  }, [validTx]);

  const COLORS_CHART = ['hsl(300, 29%, 73%)', 'hsl(30, 38%, 59%)', 'hsl(210, 60%, 55%)'];

  const filters: { mode: FilterMode; label: string }[] = [
    { mode: 'day', label: 'Día' },
    { mode: 'current_month', label: 'Mes actual' },
    { mode: 'last_month', label: 'Mes anterior' },
    { mode: 'last_7', label: '7 días' },
    { mode: 'last_30', label: '30 días' },
  ];

  const cards = [
    { label: 'Ingresos Totales', value: `$${totalSold.toFixed(2)}`, icon: <DollarSign className="w-6 h-6" />, color: 'bg-primary/10 text-primary' },
    { label: 'Gastos', value: `$${totalExpenses.toFixed(2)}`, icon: <TrendingDown className="w-6 h-6" />, color: 'bg-destructive/10 text-destructive' },
    { label: 'Ganancia Neta', value: `$${netProfit.toFixed(2)}`, icon: <TrendingUp className="w-6 h-6" />, color: netProfit >= 0 ? 'bg-green-100 text-green-700' : 'bg-destructive/10 text-destructive' },
    { label: 'Ticket Promedio', value: `$${avgTicket.toFixed(2)}`, icon: <ShoppingBag className="w-6 h-6" />, color: 'bg-secondary/10 text-secondary' },
    { label: 'Nuevos Clientes', value: newCustomers, icon: <Users className="w-6 h-6" />, color: 'bg-primary/10 text-primary' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold">Resumen Financiero</h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">{label}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map(f => (
            <button key={f.mode} onClick={() => setFilterMode(f.mode)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${filterMode === f.mode ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
              {f.label}
            </button>
          ))}
          {filterMode === 'day' && (
            <input type="date" value={specificDate} onChange={e => setSpecificDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input bg-card text-sm" />
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-5 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{c.label}</span>
              <div className={`p-2 rounded-xl ${c.color}`}>{c.icon}</div>
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{c.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sales Trend Area Chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-6 shadow-soft">
          <h3 className="font-display text-lg font-semibold mb-4">Tendencia de Ventas</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(300, 29%, 73%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(300, 29%, 73%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(30, 8%, 46%)" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(30, 8%, 46%)" />
                <Tooltip
                  contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(30, 20%, 88%)', fontSize: '12px' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                />
                <Area type="monotone" dataKey="ventas" stroke="hsl(300, 29%, 73%)" fill="url(#salesGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Income vs Expenses Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-6 shadow-soft">
          <h3 className="font-display text-lg font-semibold mb-4">Ingresos vs Gastos</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(30, 8%, 46%)" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(30, 8%, 46%)" />
                <Tooltip
                  contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(30, 20%, 88%)', fontSize: '12px' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="ventas" name="Ventas" fill="hsl(300, 29%, 73%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" name="Gastos" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Donut Chart */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-xl p-6 shadow-soft">
          <h3 className="font-display text-lg font-semibold mb-4">Métodos de Pago</h3>
          <div className="h-64 flex items-center justify-center">
            {paymentData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {paymentData.map((_, i) => <Cell key={i} fill={COLORS_CHART[i % COLORS_CHART.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, '']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Sales detail list */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-card border border-border rounded-xl p-6 shadow-soft">
          <h3 className="font-display text-lg font-semibold mb-4">Ventas del Período ({validTx.length})</h3>
          {validTx.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin ventas en este período</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {validTx.slice().reverse().slice(0, 20).map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{tx.items.map(i => i.product.name).join(', ')}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(tx.createdAt).toLocaleString('es-VE')}</p>
                  </div>
                  <span className="text-sm font-bold">${tx.totalUSD.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
