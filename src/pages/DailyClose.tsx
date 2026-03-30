import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DollarSign, CreditCard, Smartphone, FileText, Clock, PiggyBank, Plus, X, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { CajaChicaEntry } from '@/types';

export default function DailyClose() {
  const { transactions, expenses, exchangeRate, apartados, cajaChica, addCajaChicaEntry, addExpense } = useStore();
  const { user } = useAuth();
  const [showCajaForm, setShowCajaForm] = useState(false);
  const [cajaAmount, setCajaAmount] = useState('');
  const [cajaDesc, setCajaDesc] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [cajaMenor, setCajaMenor] = useState('');

  const cajaMenorAmount = parseFloat(cajaMenor) || 0;
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

  const dayTx = useMemo(() => transactions.filter(t => t.createdAt.startsWith(dateStr) && !t.voided), [transactions, dateStr]);
  const dayExpenses = useMemo(() => expenses.filter(e => (e.date || e.createdAt?.slice(0, 10)) === dateStr), [expenses, dateStr]);

  const totalDivisa = dayTx.filter(t => t.paymentMethod === 'divisa').reduce((s, t) => s + t.totalUSD, 0);
  const totalPagoMovil = dayTx.filter(t => t.paymentMethod === 'pago_movil').reduce((s, t) => s + t.totalUSD, 0);
  const totalZelle = dayTx.filter(t => t.paymentMethod === 'zelle').reduce((s, t) => s + t.totalUSD, 0);

  const mixtoTx = dayTx.filter(t => t.paymentMethod === 'mixto');
  const mixtoDivisa = mixtoTx.reduce((s, t) => s + (t.splitPayment?.divisa || 0), 0);
  const mixtoPM = mixtoTx.reduce((s, t) => s + (t.splitPayment?.pago_movil || 0), 0);
  const mixtoZelle = mixtoTx.reduce((s, t) => s + (t.splitPayment?.zelle || 0), 0);

  const finalDivisa = totalDivisa + mixtoDivisa;
  const finalPM = totalPagoMovil + mixtoPM;
  const finalZelle = totalZelle + mixtoZelle;
  const grandTotal = finalDivisa + finalPM + finalZelle;

  const todayApartadoDeposits = apartados
    .filter(a => a.createdAt.startsWith(dateStr))
    .reduce((s, a) => s + a.firstPayment, 0);

  const todayCajaOut = cajaChica.filter(e => e.date === dateStr && e.type === 'egreso').reduce((s, e) => s + e.amount, 0);
  const totalExpensesDay = dayExpenses.reduce((s, e) => s + (e.currency === 'USD' ? e.amount : e.amount / (e.exchangeRate || exchangeRate)), 0);

  // Efectivo Total en Caja = Caja Menor + Cash Sales (divisa) - Cash Expenses
  const efectivoEnCaja = cajaMenorAmount + finalDivisa - todayCajaOut;

  const handleCajaExpense = () => {
    if (!cajaAmount || !cajaDesc) return;
    const amount = parseFloat(cajaAmount);
    if (amount <= 0) return;
    addCajaChicaEntry({
      id: crypto.randomUUID(), type: 'egreso', amount, description: cajaDesc, date: dateStr, createdAt: new Date().toISOString(),
    });
    addExpense({
      id: crypto.randomUUID(), amount, currency: 'USD', category: 'Caja Chica', description: cajaDesc, date: dateStr, exchangeRate, createdAt: new Date().toISOString(),
    });
    setCajaAmount('');
    setCajaDesc('');
    setShowCajaForm(false);
  };

  const summary = [
    { label: 'Divisa (USD)', icon: <DollarSign className="w-5 h-5" />, usd: finalDivisa, color: 'bg-primary/10 text-primary' },
    { label: 'Pago Móvil', icon: <Smartphone className="w-5 h-5" />, usd: finalPM, color: 'bg-secondary/10 text-secondary' },
    { label: 'Zelle', icon: <CreditCard className="w-5 h-5" />, usd: finalZelle, color: 'bg-primary/10 text-primary' },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold">El Ropero de Frida</h1>
        <p className="text-xs">Cierre de Caja</p>
      </div>

      <div className="text-center print:hidden">
        <h1 className="text-3xl font-display font-semibold">Cierre de Caja</h1>
        <p className="text-sm text-muted-foreground mt-1">{format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
        <p className="text-xs text-muted-foreground">Vendedor: {user?.name}</p>
      </div>

      {/* Date picker & Caja Menor */}
      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, "d MMM yyyy", { locale: es })}
              {isToday && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Hoy</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        <div className="flex items-center gap-2 flex-1">
          <label className="text-xs text-muted-foreground whitespace-nowrap font-medium">💰 Caja Menor (Base):</label>
          <input type="number" value={cajaMenor} onChange={e => setCajaMenor(e.target.value)} placeholder="0.00"
            className="flex-1 px-3 py-2 rounded-lg border border-input bg-card text-sm" step="0.01" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden print:shadow-none print:border-0">
        <div className="p-6 border-b border-border bg-muted/30 print:bg-transparent">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total del Día</p>
            <p className="text-4xl font-display font-bold print:text-2xl">${grandTotal.toFixed(2)}</p>
            <p className="text-sm text-secondary font-medium mt-1">Bs {(grandTotal * exchangeRate).toFixed(2)}</p>
          </div>
        </div>

        <div className="p-6 space-y-4 print:p-2 print:space-y-2">
          {summary.map(s => (
            <div key={s.label} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 print:p-2 print:rounded-none print:border-b print:border-dashed">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.color} print:hidden`}>{s.icon}</div>
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-display font-bold print:text-sm">${s.usd.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Bs {(s.usd * exchangeRate).toFixed(2)}</p>
              </div>
            </div>
          ))}

          {todayApartadoDeposits > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-camel/5 print:p-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-camel/10 text-camel print:hidden"><Clock className="w-5 h-5" /></div>
                <span className="text-sm font-medium">Abonos de Apartados</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-display font-bold print:text-sm">${todayApartadoDeposits.toFixed(2)}</p>
              </div>
            </div>
          )}

          {todayCajaOut > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-destructive/5 print:p-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10 text-destructive print:hidden"><PiggyBank className="w-5 h-5" /></div>
                <span className="text-sm font-medium">Gastos Caja Chica</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-display font-bold text-destructive print:text-sm">-${todayCajaOut.toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* Caja Menor + Efectivo en Caja */}
          {cajaMenorAmount > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20 print:p-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary print:hidden"><DollarSign className="w-5 h-5" /></div>
                <div>
                  <span className="text-sm font-medium">Efectivo Total en Caja</span>
                  <p className="text-[10px] text-muted-foreground">Base: ${cajaMenorAmount.toFixed(2)} + Ventas Efectivo - Gastos</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-display font-bold print:text-sm ${efectivoEnCaja < 0 ? 'text-destructive' : ''}`}>${efectivoEnCaja.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border print:p-2 space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between"><span>Transacciones</span><span className="font-bold text-foreground">{dayTx.length}</span></div>
          <div className="flex justify-between"><span>Gastos del día</span><span className="font-bold text-foreground">${totalExpensesDay.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Tasa del día</span><span className="font-bold text-foreground">{exchangeRate} Bs/$</span></div>
          <div className="flex justify-between"><span>Vendedor</span><span className="font-bold text-foreground">{user?.name}</span></div>
          <div className="flex justify-between"><span>Fecha</span><span className="font-bold text-foreground">{format(selectedDate, 'dd/MM/yyyy')}</span></div>
        </div>
      </div>

      <div className="flex gap-3 print:hidden">
        <button onClick={() => window.print()}
          className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm uppercase tracking-wider hover:opacity-90 flex items-center justify-center gap-2">
          <FileText className="w-4 h-4" />Imprimir Cierre
        </button>
        {isToday && (
          <button onClick={() => setShowCajaForm(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border text-sm font-medium hover:bg-muted">
            <Plus className="w-4 h-4" />Gasto Caja Chica
          </button>
        )}
      </div>

      {showCajaForm && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={() => setShowCajaForm(false)}>
          <div className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">Gasto de Caja Chica</h3>
                <button onClick={() => setShowCajaForm(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
              </div>
              <input type="number" value={cajaAmount} onChange={e => setCajaAmount(e.target.value)} placeholder="Monto USD"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" step="0.01" />
              <input type="text" value={cajaDesc} onChange={e => setCajaDesc(e.target.value)} placeholder="Descripción"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" />
              <div className="flex gap-2">
                <button onClick={() => setShowCajaForm(false)} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground">Cancelar</button>
                <button onClick={handleCajaExpense} className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium">Registrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
