import { useState, useMemo } from 'react';
import { useStore } from '@/contexts/StoreContext';
import type { Expense } from '@/types';
import { EXPENSE_CATEGORIES } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Receipt, Camera, X, Edit2, Trash2, PiggyBank, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { es } from 'date-fns/locale';

const CHART_COLORS = ['hsl(300,29%,73%)', 'hsl(30,38%,59%)', 'hsl(0,72%,51%)', 'hsl(120,40%,50%)', 'hsl(220,60%,55%)', 'hsl(45,80%,50%)', 'hsl(280,40%,60%)'];

export default function Expenses() {
  const { expenses, addExpense, updateExpense, deleteExpense, exchangeRate, cajaChica, addCajaChicaEntry } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'yyyy-MM'));

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const filtered = expenses.filter(e => !monthFilter || e.date.startsWith(monthFilter));
  const totalUSD = filtered.reduce((s, e) => s + (e.currency === 'USD' ? e.amount : e.amount / (e.exchangeRate || exchangeRate)), 0);

  // Gastos del día (se resetea cada mañana)
  const todayExpenses = expenses.filter(e => e.date === todayStr);
  const todayExpenseTotal = todayExpenses.reduce((s, e) => s + (e.currency === 'USD' ? e.amount : e.amount / (e.exchangeRate || exchangeRate)), 0);

  // Saldo acumulativo de Caja Menor (todo el historial)
  const cajaBalance = useMemo(() => {
    return cajaChica.reduce((s, e) => s + (e.type === 'ingreso' ? e.amount : -e.amount), 0);
  }, [cajaChica]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => {
      const cat = e.category || 'Otro';
      map[cat] = (map[cat] || 0) + (e.currency === 'USD' ? e.amount : e.amount / (e.exchangeRate || exchangeRate));
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered, exchangeRate]);

  const trendData = useMemo(() => {
    const last30: Record<string, number> = {};
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      last30[format(d, 'yyyy-MM-dd')] = 0;
    }
    filtered.forEach(e => {
      if (last30[e.date] !== undefined) {
        last30[e.date] += e.currency === 'USD' ? e.amount : e.amount / (e.exchangeRate || exchangeRate);
      }
    });
    return Object.entries(last30).map(([date, amount]) => ({ name: format(parseISO(date), 'dd', { locale: es }), gastos: amount }));
  }, [filtered, exchangeRate]);

  const exportMonth = () => {
    const csv = 'Fecha,Descripción,Categoría,Monto,Moneda,Tasa\n' + filtered.map(e =>
      `"${e.date}","${e.description}","${e.category || ''}",${e.amount},"${e.currency}",${e.exchangeRate || ''}`
    ).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `gastos_${monthFilter}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleSaveExpense = (e: Expense, pagarConCaja: boolean) => {
    if (editExpense) {
      updateExpense(e);
    } else {
      addExpense(e);
      // Si se paga con caja menor, registrar egreso en caja chica
      if (pagarConCaja) {
        const amountUSD = e.currency === 'USD' ? e.amount : e.amount / (e.exchangeRate || exchangeRate);
        addCajaChicaEntry({
          id: crypto.randomUUID(),
          type: 'egreso',
          amount: amountUSD,
          description: `Gasto: ${e.description}`,
          date: e.date,
          createdAt: new Date().toISOString(),
        });
      }
    }
    setShowForm(false);
    setEditExpense(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold">Gastos</h1>
          <p className="text-sm text-muted-foreground mt-1">Total mes: ${totalUSD.toFixed(2)} USD</p>
        </div>
        <div className="flex gap-2">
          <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-card text-sm" />
          <button onClick={exportMonth} className="px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted">📥 Excel</button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setEditExpense(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            <Plus className="w-4 h-4" />Registrar Gasto
          </motion.button>
        </div>
      </div>

      {/* Caja Menor + Gastos del Día */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className={`bg-card border rounded-xl p-5 shadow-soft ${cajaBalance < 0 ? 'border-destructive' : 'border-border'}`}>
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="w-5 h-5 text-primary" />
            <h3 className="font-display text-sm font-semibold">Caja Menor (Acumulado)</h3>
            {cajaBalance < 0 && <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />}
          </div>
          <p className={`text-2xl font-display font-bold ${cajaBalance < 0 ? 'text-destructive' : 'text-foreground'}`}>
            ${cajaBalance.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Saldo acumulativo (ingresos − egresos)</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-5 h-5 text-secondary" />
            <h3 className="font-display text-sm font-semibold">Gastos del Día</h3>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">${todayExpenseTotal.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{todayExpenses.length} gastos registrados hoy</p>
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <h3 className="font-display text-sm font-semibold mb-3">Por Categoría</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <h3 className="font-display text-sm font-semibold mb-3">Tendencia (30 días)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                <Bar dataKey="gastos" fill="hsl(30,38%,59%)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Receipt className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No hay gastos este mes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.slice().reverse().map(expense => (
            <div key={expense.id} className="bg-card border border-border rounded-xl p-4 shadow-soft flex items-center gap-4 group">
              <div className="p-2 rounded-lg bg-secondary/10">
                {expense.receiptPhoto ? <img src={expense.receiptPhoto} alt="Recibo" className="w-10 h-10 rounded object-cover" /> : <Receipt className="w-5 h-5 text-secondary" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{expense.description}</p>
                <p className="text-xs text-muted-foreground">{expense.date} • {expense.category || 'Sin categoría'}</p>
              </div>
              <span className="text-sm font-bold">${expense.amount.toFixed(2)} {expense.currency}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditExpense(expense); setShowForm(true); }} className="p-1 rounded hover:bg-muted"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => { if (confirm('¿Eliminar gasto?')) deleteExpense(expense.id); }} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <ExpenseFormModal expense={editExpense} exchangeRate={exchangeRate} cajaBalance={cajaBalance}
            onClose={() => { setShowForm(false); setEditExpense(null); }}
            onSave={handleSaveExpense}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ExpenseFormModal({ expense, exchangeRate, cajaBalance, onClose, onSave }: {
  expense: Expense | null; exchangeRate: number; cajaBalance: number;
  onClose: () => void; onSave: (e: Expense, pagarConCaja: boolean) => void;
}) {
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [currency, setCurrency] = useState<'USD' | 'LOCAL'>(expense?.currency || 'USD');
  const [category, setCategory] = useState(expense?.category || EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState(expense?.description || '');
  const [date, setDate] = useState(expense?.date || format(new Date(), 'yyyy-MM-dd'));
  const [receiptPhoto, setReceiptPhoto] = useState(expense?.receiptPhoto || '');
  const [pagarConCaja, setPagarConCaja] = useState(false);

  const amountNum = parseFloat(amount) || 0;
  const amountUSD = currency === 'USD' ? amountNum : amountNum / exchangeRate;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) setReceiptPhoto(ev.target.result as string); };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display text-xl font-semibold">{expense ? 'Editar' : 'Registrar'} Gasto</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-primary/30 rounded-lg text-sm text-primary cursor-pointer hover:bg-primary/5">
            <Camera className="w-4 h-4" />{receiptPhoto ? 'Cambiar Foto' : 'Tomar Foto del Recibo'}
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
          </label>
          {receiptPhoto && (
            <div className="relative">
              <img src={receiptPhoto} alt="Recibo" className="w-full h-40 object-cover rounded-lg" />
              <button onClick={() => setReceiptPhoto('')} className="absolute top-1 right-1 bg-foreground/60 text-background rounded-full p-1"><X className="w-3 h-3" /></button>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Monto</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" step="0.01" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Moneda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value as any)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm">
                <option value="USD">USD</option><option value="LOCAL">Bs</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoría</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm">
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripción</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" />
          </div>

          {/* Toggle Pagar con Caja Menor */}
          {!expense && (
            <div className={`border rounded-lg p-3 transition-colors ${pagarConCaja ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={pagarConCaja} onChange={e => setPagarConCaja(e.target.checked)}
                  className="rounded border-primary text-primary focus:ring-primary" />
                <div className="flex-1">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <PiggyBank className="w-4 h-4 text-primary" /> Pagar con Caja Menor
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    Saldo disponible: ${cajaBalance.toFixed(2)} USD
                  </span>
                </div>
              </label>
              {pagarConCaja && amountUSD > cajaBalance && (
                <p className="text-[10px] text-destructive mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> El monto excede el saldo de caja menor
                </p>
              )}
            </div>
          )}
        </div>
        <div className="p-5 border-t border-border flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted">Cancelar</button>
          <button onClick={() => {
            if (!amount || !description) return;
            onSave({
              id: expense?.id || crypto.randomUUID(), amount: parseFloat(amount), currency, category, description, date, exchangeRate, receiptPhoto: receiptPhoto || undefined, createdAt: expense?.createdAt || new Date().toISOString()
            }, pagarConCaja);
          }} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Guardar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
