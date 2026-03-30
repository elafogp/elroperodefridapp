import { useStore } from '@/contexts/StoreContext';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, PiggyBank, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CajaChica() {
  const { cajaChica, addCajaChicaEntry, exchangeRate } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<'ingreso' | 'egreso'>('ingreso');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');

  const saldoTotal = useMemo(() => {
    return cajaChica.reduce((sum, e) => e.type === 'ingreso' ? sum + e.amount : sum - e.amount, 0);
  }, [cajaChica]);

  const gastosHoy = useMemo(() => {
    return cajaChica
      .filter(e => e.date === today && e.type === 'egreso')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [cajaChica, today]);

  const ingresosHoy = useMemo(() => {
    return cajaChica
      .filter(e => e.date === today && e.type === 'ingreso')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [cajaChica, today]);

  const handleSubmit = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0 || !description.trim()) return;
    addCajaChicaEntry({
      id: crypto.randomUUID(),
      type,
      amount: val,
      description: description.trim(),
      date: today,
      createdAt: new Date().toISOString(),
    });
    setAmount('');
    setDescription('');
    setShowForm(false);
  };

  const sorted = [...cajaChica].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-display font-semibold">Caja Menor</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestión de efectivo acumulativo</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 text-center shadow-card">
          <PiggyBank className="w-6 h-6 mx-auto text-primary mb-2" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Saldo Acumulado</p>
          <p className={`text-3xl font-display font-bold mt-1 ${saldoTotal < 0 ? 'text-destructive' : 'text-foreground'}`}>
            ${saldoTotal.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">Bs {(saldoTotal * exchangeRate).toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 text-center shadow-card">
          <ArrowUpCircle className="w-6 h-6 mx-auto text-secondary mb-2" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Ingresos Hoy</p>
          <p className="text-2xl font-display font-bold mt-1 text-secondary">${ingresosHoy.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 text-center shadow-card">
          <ArrowDownCircle className="w-6 h-6 mx-auto text-destructive mb-2" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Gastos Hoy</p>
          <p className="text-2xl font-display font-bold mt-1 text-destructive">${gastosHoy.toFixed(2)}</p>
        </div>
      </div>

      {/* Add Entry Button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Agregar Movimiento
        </Button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-5 space-y-4">
              <h3 className="font-display text-lg font-semibold">Nuevo Movimiento</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setType('ingreso')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${type === 'ingreso' ? 'bg-secondary text-secondary-foreground border-secondary' : 'border-border text-muted-foreground'}`}
                >
                  ➕ Ingreso
                </button>
                <button
                  onClick={() => setType('egreso')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${type === 'egreso' ? 'bg-destructive text-destructive-foreground border-destructive' : 'border-border text-muted-foreground'}`}
                >
                  ➖ Egreso
                </button>
              </div>
              <input
                type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="Monto USD" step="0.01"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm"
              />
              <input
                type="text" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Descripción"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground">Cancelar</button>
                <button onClick={handleSubmit} className={`flex-1 py-2 rounded-lg text-sm font-medium text-white ${type === 'ingreso' ? 'bg-secondary' : 'bg-destructive'}`}>
                  Registrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold">Historial de Movimientos</h2>
        </div>
        {sorted.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No hay movimientos registrados aún.</p>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map(entry => (
              <div key={entry.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {entry.type === 'ingreso' ? (
                    <ArrowUpCircle className="w-5 h-5 text-secondary" />
                  ) : (
                    <ArrowDownCircle className="w-5 h-5 text-destructive" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">{entry.date}</p>
                  </div>
                </div>
                <p className={`text-sm font-bold ${entry.type === 'ingreso' ? 'text-secondary' : 'text-destructive'}`}>
                  {entry.type === 'ingreso' ? '+' : '-'}${entry.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
