import { useState } from 'react';
import { useStore } from '@/contexts/StoreContext';
import type { Supplier, SupplierPayment } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Building2, Edit2, Trash2, X, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function Suppliers() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const [paymentSupplierId, setPaymentSupplierId] = useState<string | null>(null);

  const totalDebt = suppliers.reduce((s, sup) => {
    const paid = sup.payments.reduce((ps, p) => ps + p.amount, 0);
    return s + sup.totalDebt - paid;
  }, 0);

  const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  const handleAddPayment = (supplierId: string, amount: number, notes: string) => {
    const sup = suppliers.find(s => s.id === supplierId);
    if (!sup) return;
    const payment: SupplierPayment = { id: crypto.randomUUID(), amount, date: format(new Date(), 'yyyy-MM-dd'), notes };
    updateSupplier({ ...sup, payments: [...sup.payments, payment] });
    setPaymentSupplierId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold">Proveedores</h1>
          <p className="text-sm text-muted-foreground mt-1">Deuda total: {formatCOP(totalDebt)}</p>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setEditItem(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          <Plus className="w-4 h-4" />Nuevo Proveedor
        </motion.button>
      </div>

      {suppliers.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No hay proveedores</p>
        </div>
      ) : (
        <div className="space-y-4">
          {suppliers.map(sup => {
            const totalPaid = sup.payments.reduce((s, p) => s + p.amount, 0);
            const remaining = sup.totalDebt - totalPaid;
            return (
              <div key={sup.id} className="bg-card border border-border rounded-xl p-5 shadow-soft group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-display text-lg font-semibold">{sup.name}</h4>
                    <p className="text-xs text-muted-foreground">{sup.contact}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditItem(sup); setShowForm(true); }} className="p-1 rounded hover:bg-muted"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => { if (confirm('¿Eliminar proveedor?')) deleteSupplier(sup.id); }} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                </div>
                <div className="flex gap-4 mb-3 text-sm">
                  <span><span className="text-muted-foreground">Deuda:</span> <span className="font-bold">{formatCOP(sup.totalDebt)}</span></span>
                  <span><span className="text-muted-foreground">Pagado:</span> <span className="font-bold text-green-600">{formatCOP(totalPaid)}</span></span>
                  <span><span className="text-muted-foreground">Pendiente:</span> <span className="font-bold text-destructive">{formatCOP(remaining)}</span></span>
                </div>
                {sup.payments.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Historial de Pagos:</p>
                    <div className="space-y-1">
                      {sup.payments.map(p => (
                        <div key={p.id} className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded">
                          <span>{p.date} - {p.notes || 'Abono'}</span>
                          <span className="font-bold text-green-600">{formatCOP(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {remaining > 0 && (
                  <button onClick={() => setPaymentSupplierId(sup.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-medium hover:opacity-90">
                    <DollarSign className="w-3.5 h-3.5" />Registrar Pago
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <SupplierFormModal item={editItem}
            onClose={() => { setShowForm(false); setEditItem(null); }}
            onSave={(s) => { if (editItem) updateSupplier(s); else addSupplier(s); setShowForm(false); setEditItem(null); }}
            formatCOP={formatCOP}
          />
        )}
        {paymentSupplierId && (
          <PaymentModal
            onClose={() => setPaymentSupplierId(null)}
            onSave={(amount, notes) => handleAddPayment(paymentSupplierId, amount, notes)}
            formatCOP={formatCOP}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SupplierFormModal({ item, onClose, onSave, formatCOP }: { item: Supplier | null; onClose: () => void; onSave: (s: Supplier) => void; formatCOP: (n: number) => string }) {
  const [name, setName] = useState(item?.name || '');
  const [contact, setContact] = useState(item?.contact || '');
  const [totalDebt, setTotalDebt] = useState(item?.totalDebt?.toString() || '');
  const [notes, setNotes] = useState(item?.notes || '');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display text-xl font-semibold">{item ? 'Editar' : 'Nuevo'} Proveedor</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre*</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Contacto</label>
            <input type="text" value={contact} onChange={e => setContact(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Deuda Total (COP)</label>
            <input type="number" value={totalDebt} onChange={e => setTotalDebt(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm resize-none" /></div>
        </div>
        <div className="p-5 border-t border-border flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground">Cancelar</button>
          <button onClick={() => { if (!name) return; onSave({ id: item?.id || crypto.randomUUID(), name, contact, totalDebt: parseFloat(totalDebt) || 0, payments: item?.payments || [], notes, createdAt: item?.createdAt || new Date().toISOString() }); }}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Guardar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PaymentModal({ onClose, onSave, formatCOP }: { onClose: () => void; onSave: (amount: number, notes: string) => void; formatCOP: (n: number) => string }) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-sm">
        <div className="p-5 space-y-4">
          <h3 className="font-display text-lg font-semibold">Registrar Pago (COP)</h3>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Monto en COP"
            className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" />
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas (opcional)"
            className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" />
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground">Cancelar</button>
            <button onClick={() => { if (!amount) return; onSave(parseFloat(amount), notes); }}
              className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-medium">Guardar</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
