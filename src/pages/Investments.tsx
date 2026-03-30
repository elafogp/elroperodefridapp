import { useState } from 'react';
import { useStore } from '@/contexts/StoreContext';
import type { Investment } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Briefcase, Edit2, Trash2, X, Star, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function Investments() {
  const { investments, addInvestment, updateInvestment, deleteInvestment } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Investment | null>(null);
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'yyyy-MM'));
  const [showPaymentFor, setShowPaymentFor] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const filtered = investments.filter(i => !monthFilter || i.month === monthFilter);
  const total = filtered.reduce((s, i) => s + i.totalCost, 0);
  const totalPaid = filtered.reduce((s, i) => s + (i.paidAmount || 0), 0);

  const handleAddPayment = (inv: Investment) => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) return;
    const payment = { id: crypto.randomUUID(), amount, date: new Date().toISOString(), notes: '' };
    const newPaid = (inv.paidAmount || 0) + amount;
    updateInvestment({
      ...inv,
      paidAmount: Math.min(newPaid, inv.totalCost),
      paymentHistory: [...(inv.paymentHistory || []), payment],
    });
    setPaymentAmount('');
    setShowPaymentFor(null);
  };

  const exportMonth = () => {
    const csv = 'Concepto,Proveedor,Costo Total,Pagado,Estado,Mes\n' + filtered.map(i =>
      `"${i.concept}","${i.supplier || ''}",${i.totalCost},${i.paidAmount || 0},"${i.status}","${i.month}"`
    ).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `inversiones_${monthFilter}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold">Inversiones</h1>
          <p className="text-sm text-muted-foreground mt-1">Total: ${total.toFixed(2)} USD • Pagado: ${totalPaid.toFixed(2)}</p>
        </div>
        <div className="flex gap-2">
          <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-card text-sm" />
          <button onClick={exportMonth} className="px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted">📥 Excel</button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setEditItem(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            <Plus className="w-4 h-4" />Nueva Inversión
          </motion.button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Briefcase className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No hay inversiones en este mes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.slice().reverse().map(inv => {
            const pct = inv.totalCost > 0 ? Math.min(100, ((inv.paidAmount || 0) / inv.totalCost) * 100) : 0;
            const isComplete = pct >= 100;
            return (
              <div key={inv.id} className="bg-card border border-border rounded-xl p-5 shadow-soft group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${inv.status === 'ingresado' ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{inv.concept}</p>
                      <p className="text-xs text-muted-foreground">{inv.supplier || ''} • {inv.month} • {inv.status === 'en_camino' ? '🚚 En camino' : '✅ Ingresado'}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditItem(inv); setShowForm(true); }} className="p-1 rounded hover:bg-muted"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => { if (confirm('¿Eliminar?')) deleteInvestment(inv.id); }} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-bold">${inv.totalCost.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground">Pagado: ${(inv.paidAmount || 0).toFixed(2)}</span>
                  {isComplete && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium"><Star className="w-3 h-3 inline" /> ¡INVENTARIO 100% TUYO!</span>}
                  {!isComplete && (
                    <button onClick={() => setShowPaymentFor(showPaymentFor === inv.id ? null : inv.id)}
                      className="ml-auto text-xs bg-primary text-primary-foreground px-3 py-1 rounded-lg font-medium hover:opacity-90">
                      <DollarSign className="w-3 h-3 inline" /> Registrar Pago
                    </button>
                  )}
                </div>
                {/* Pink progress bar */}
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-[hsl(320,40%,70%)] rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{pct.toFixed(0)}% pagado</p>

                {/* Payment input */}
                {showPaymentFor === inv.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 flex gap-2">
                    <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                      placeholder="Monto USD" step="0.01" className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                    <button onClick={() => handleAddPayment(inv)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Pagar</button>
                    <button onClick={() => setShowPaymentFor(null)} className="px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground">✕</button>
                  </motion.div>
                )}

                {/* Payment history */}
                {(inv.paymentHistory || []).length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Historial de Pagos</p>
                    {(inv.paymentHistory || []).map(p => (
                      <div key={p.id} className="flex justify-between text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1">
                        <span>{new Date(p.date).toLocaleDateString('es-VE')}</span>
                        <span className="font-medium text-foreground">${p.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <InvestmentFormModal item={editItem}
            onClose={() => { setShowForm(false); setEditItem(null); }}
            onSave={(i) => { if (editItem) updateInvestment(i); else addInvestment(i); setShowForm(false); setEditItem(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function InvestmentFormModal({ item, onClose, onSave }: { item: Investment | null; onClose: () => void; onSave: (i: Investment) => void }) {
  const [concept, setConcept] = useState(item?.concept || '');
  const [totalCost, setTotalCost] = useState(item?.totalCost?.toString() || '');
  const [paidAmount, setPaidAmount] = useState(item?.paidAmount?.toString() || '0');
  const [month, setMonth] = useState(item?.month || format(new Date(), 'yyyy-MM'));
  const [status, setStatus] = useState<'en_camino' | 'ingresado'>(item?.status || 'en_camino');
  const [supplier, setSupplier] = useState(item?.supplier || '');
  const [notes, setNotes] = useState(item?.notes || '');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display text-xl font-semibold">{item ? 'Editar' : 'Nueva'} Inversión</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Concepto*</label>
            <input type="text" value={concept} onChange={e => setConcept(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" placeholder="Ej: Mercancía Temporada" /></div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Proveedor</label>
            <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Costo Total (USD)</label>
              <input type="number" value={totalCost} onChange={e => setTotalCost(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" step="0.01" /></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Pagado (USD)</label>
              <input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" step="0.01" /></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Mes</label>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" /></div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Estado</label>
            <div className="flex gap-2">
              <button onClick={() => setStatus('en_camino')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${status === 'en_camino' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>🚚 En camino</button>
              <button onClick={() => setStatus('ingresado')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${status === 'ingresado' ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>✅ Ingresado</button>
            </div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm resize-none" /></div>
        </div>
        <div className="p-5 border-t border-border flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground">Cancelar</button>
          <button onClick={() => { if (!concept || !totalCost) return; onSave({ id: item?.id || crypto.randomUUID(), concept, totalCost: parseFloat(totalCost), paidAmount: parseFloat(paidAmount) || 0, month, status, supplier, notes, paymentHistory: item?.paymentHistory || [], createdAt: item?.createdAt || new Date().toISOString() }); }}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Guardar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
