import { useStore } from '@/contexts/StoreContext';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, MessageCircle, DollarSign } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { useState } from 'react';

export default function Apartados() {
  const { apartados, updateApartado, customers } = useStore();
  const [filter, setFilter] = useState<'all' | 'pendiente' | 'completado' | 'vencido'>('all');

  const now = new Date();

  const processed = apartados.map(a => {
    const expires = parseISO(a.expiresAt);
    const daysLeft = differenceInDays(expires, now);
    const isExpired = daysLeft < 0 && a.status === 'pendiente';
    return { ...a, daysLeft, isExpired, status: isExpired ? 'vencido' as const : a.status };
  });

  const filtered = processed.filter(a => filter === 'all' || a.status === filter);

  const handleComplete = (apartado: typeof processed[0]) => {
    const remaining = apartado.totalUSD - apartado.firstPayment - apartado.secondPayment;
    updateApartado({ ...apartado, status: 'completado', secondPayment: remaining, completedAt: new Date().toISOString() });
  };

  const getCustomer = (id: string) => customers.find(c => c.id === id);

  const getWhatsAppUrl = (apartado: typeof processed[0]) => {
    const customer = getCustomer(apartado.customerId);
    if (!customer?.phone) return '';
    const remaining = (apartado.totalUSD - apartado.firstPayment - apartado.secondPayment).toFixed(2);
    const msg = `¡Hola! 🌸 Te escribimos de El Ropero de Frida para recordarte que tienes un apartado pendiente.\n\n*Saldo por pagar:* $${remaining}\n\nRecuerda que el plazo máximo para completarlo y retirar tus prendas es de 15 días. ¡Te esperamos!`;
    return `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-semibold">Apartados</h1>
        <p className="text-sm text-muted-foreground mt-1">{apartados.length} apartados registrados</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'pendiente', 'completado', 'vencido'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'
            }`}>
            {f === 'all' ? 'Todos' : f === 'pendiente' ? 'Pendientes' : f === 'completado' ? 'Completados' : 'Vencidos'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No hay apartados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(a => {
            const customer = getCustomer(a.customerId);
            const remaining = a.totalUSD - a.firstPayment - a.secondPayment;
            return (
              <motion.div key={a.id} layout
                className={`bg-card border rounded-xl p-5 shadow-soft ${
                  a.status === 'vencido' ? 'border-destructive/40' : a.daysLeft <= 2 && a.status === 'pendiente' ? 'border-camel/40' : 'border-border'
                }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-display text-lg font-semibold">{customer?.name || 'Cliente'}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        a.status === 'completado' ? 'bg-green-100 text-green-700' :
                        a.status === 'vencido' ? 'bg-destructive/10 text-destructive' :
                        'bg-camel/10 text-foreground'
                      }`}>
                        {a.status === 'completado' ? '✓ Pago Completo' : a.status === 'vencido' ? '✗ Vencido' : `${Math.max(0, a.daysLeft)} días restantes`}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Creado: {format(parseISO(a.createdAt), 'dd/MM/yyyy')} • Vence: {format(parseISO(a.expiresAt), 'dd/MM/yyyy')}</p>
                    <div className="flex gap-4 mt-2">
                      <span className="text-sm"><span className="text-muted-foreground">Total:</span> <span className="font-bold">${a.totalUSD.toFixed(2)}</span></span>
                      <span className="text-sm"><span className="text-muted-foreground">Abonado:</span> <span className="font-bold text-green-600">${a.firstPayment.toFixed(2)}</span></span>
                      <span className="text-sm"><span className="text-muted-foreground">Pendiente:</span> <span className="font-bold text-destructive">${remaining.toFixed(2)}</span></span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {a.items.map((item, i) => (
                        <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">{item.product.name}{item.variation ? ` (${item.variation.size}/${item.variation.color})` : ''} x{item.quantity}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {a.status === 'pendiente' && (
                      <>
                        <button onClick={() => handleComplete(a)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-medium hover:opacity-90">
                          <DollarSign className="w-3.5 h-3.5" />Registrar Pago
                        </button>
                        {customer?.phone && (
                          <a href={getWhatsAppUrl(a)} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#25D366] text-white text-xs font-medium hover:opacity-90">
                            <MessageCircle className="w-3.5 h-3.5" />Recordar
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
