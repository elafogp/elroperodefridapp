import { useState } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Salary } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Wallet, X, CheckCircle, Clock, DollarSign, UserPlus } from 'lucide-react';
import { format } from 'date-fns';

export default function Salaries() {
  const { salaries, addSalary, updateSalary, deleteSalary } = useStore();
  const { managedUsers, addManagedUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'yyyy-MM'));
  const [showPaymentFor, setShowPaymentFor] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const filtered = salaries.filter(s => !monthFilter || s.month === monthFilter);
  const totalPending = filtered.filter(s => s.status === 'pendiente').reduce((sum, s) => sum + s.baseSalaryUSD - (s.paidAmount || 0), 0);
  const totalPaid = filtered.reduce((sum, s) => sum + (s.paidAmount || 0), 0);

  const handleAddPayment = (sal: Salary) => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) return;
    const payment = { id: crypto.randomUUID(), amount, date: new Date().toISOString(), notes: '' };
    const newPaid = (sal.paidAmount || 0) + amount;
    const isFullyPaid = newPaid >= sal.baseSalaryUSD;
    updateSalary({
      ...sal,
      paidAmount: Math.min(newPaid, sal.baseSalaryUSD),
      status: isFullyPaid ? 'pagado' : 'pendiente',
      paymentHistory: [...(sal.paymentHistory || []), payment],
    });
    setPaymentAmount('');
    setShowPaymentFor(null);
  };

  const exportMonth = () => {
    const csv = 'Empleado,Rol,Salario USD,Pagado,Restante,Estado,Mes\n' + filtered.map(s =>
      `"${s.userName}","${s.role === 'seller' ? 'Vendedor' : s.role === 'warehouse' ? 'Bodega' : 'Admin'}",${s.baseSalaryUSD},${s.paidAmount || 0},${s.baseSalaryUSD - (s.paidAmount || 0)},"${s.status}","${s.month}"`
    ).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `salarios_${monthFilter}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold">Salarios (USD)</h1>
          <p className="text-sm text-muted-foreground mt-1">Pendiente: ${totalPending.toFixed(2)} • Pagado: ${totalPaid.toFixed(2)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-card text-sm" />
          <button onClick={exportMonth} className="px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted">📥 Excel</button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowAddStaff(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/30 text-primary text-xs font-medium hover:bg-primary/10">
            <UserPlus className="w-3.5 h-3.5" />Agregar Personal
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            <Plus className="w-4 h-4" />Registrar
          </motion.button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Wallet className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No hay salarios para este mes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.slice().reverse().map(sal => {
            const paid = sal.paidAmount || 0;
            const remaining = sal.baseSalaryUSD - paid;
            const pct = sal.baseSalaryUSD > 0 ? Math.min(100, (paid / sal.baseSalaryUSD) * 100) : 0;
            return (
              <div key={sal.id} className="bg-card border border-border rounded-xl p-4 shadow-soft">
                <div className="flex items-center gap-4 mb-3">
                  <div className={`p-2 rounded-lg ${sal.status === 'pagado' ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
                    {sal.status === 'pagado' ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{sal.userName}</p>
                    <p className="text-xs text-muted-foreground">{sal.role === 'seller' ? 'Vendedor' : sal.role === 'warehouse' ? 'Bodega' : 'Admin'} • {sal.month}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">${sal.baseSalaryUSD.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">Pagado: ${paid.toFixed(2)} • Resta: ${remaining.toFixed(2)}</p>
                  </div>
                  {sal.status !== 'pagado' && (
                    <button onClick={() => setShowPaymentFor(showPaymentFor === sal.id ? null : sal.id)}
                      className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium hover:opacity-90">
                      <DollarSign className="w-3 h-3 inline" /> Abono
                    </button>
                  )}
                  <button onClick={() => { if (confirm('¿Eliminar?')) deleteSalary(sal.id); }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-[hsl(320,40%,70%)] rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{pct.toFixed(0)}% pagado</p>

                {/* Payment input */}
                {showPaymentFor === sal.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 flex gap-2">
                    <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                      placeholder="Monto USD" step="0.01" className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                    <button onClick={() => handleAddPayment(sal)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Pagar</button>
                    <button onClick={() => setShowPaymentFor(null)} className="px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground">✕</button>
                  </motion.div>
                )}

                {/* Payment history */}
                {(sal.paymentHistory || []).length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Historial de Pagos</p>
                    {(sal.paymentHistory || []).map(p => (
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

      {/* Add Salary Modal */}
      <AnimatePresence>
        {showForm && (
          <SalaryFormModal users={managedUsers}
            onClose={() => setShowForm(false)}
            onSave={(s) => { addSalary(s); setShowForm(false); }}
          />
        )}
      </AnimatePresence>

      {/* Add Staff Modal */}
      <AnimatePresence>
        {showAddStaff && (
          <AddStaffModal
            onClose={() => setShowAddStaff(false)}
            onSave={(u) => { addManagedUser(u); setShowAddStaff(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AddStaffModal({ onClose, onSave }: { onClose: () => void; onSave: (u: any) => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'seller' | 'warehouse'>('seller');
  const [password, setPassword] = useState('');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-sm">
        <div className="p-5 space-y-4">
          <h3 className="font-display text-lg font-semibold">Agregar Personal</h3>
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre*</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" /></div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Rol</label>
            <div className="flex gap-2">
              <button onClick={() => setRole('seller')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${role === 'seller' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>🛍️ Vendedor</button>
              <button onClick={() => setRole('warehouse')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${role === 'warehouse' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>📦 Bodega</button>
            </div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Contraseña (opcional)</label>
            <input type="text" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" /></div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground">Cancelar</button>
            <button onClick={() => { if (!name) return; onSave({ id: crypto.randomUUID(), name, role, email: '', password: password || undefined }); }}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Guardar</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SalaryFormModal({ users, onClose, onSave }: { users: any[]; onClose: () => void; onSave: (s: Salary) => void }) {
  const [userId, setUserId] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));

  const selectedUser = users.find(u => u.id === userId);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-sm">
        <div className="p-5 space-y-4">
          <h3 className="font-display text-lg font-semibold">Registrar Salario (USD)</h3>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Empleado</label>
            <select value={userId} onChange={e => setUserId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm">
              <option value="">Seleccionar...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role === 'seller' ? 'Vendedor' : 'Bodega'})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Salario Base (USD)</label>
            <input type="number" value={baseSalary} onChange={e => setBaseSalary(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" step="0.01" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Mes</label>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground">Cancelar</button>
            <button onClick={() => {
              if (!userId || !baseSalary) return;
              onSave({
                id: crypto.randomUUID(),
                userId,
                userName: selectedUser?.name || '',
                role: selectedUser?.role || 'seller',
                baseSalaryUSD: parseFloat(baseSalary),
                paidAmount: 0,
                paymentHistory: [],
                month,
                status: 'pendiente',
                createdAt: new Date().toISOString(),
              });
            }} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Guardar</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
