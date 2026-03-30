import { useStore } from '@/contexts/StoreContext';
import { motion } from 'framer-motion';
import { Truck, CheckCircle, Package, MessageCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function Pickups() {
  const { pickups, updatePickup, customers } = useStore();

  const pending = pickups.filter(p => p.status === 'pendiente');
  const delivered = pickups.filter(p => p.status === 'entregado');

  const handleDeliver = (id: string) => {
    const pickup = pickups.find(p => p.id === id);
    if (pickup) updatePickup({ ...pickup, status: 'entregado', deliveredAt: new Date().toISOString() });
  };

  const getWhatsAppUrl = (pickup: typeof pickups[0]) => {
    const customer = customers.find(c => c.id === pickup.customerId);
    if (!customer?.phone) return '';
    const msg = `Hola ${customer.name}, tu pedido en El Ropero de Frida está listo para recoger. ¡Te esperamos en tienda! 🛍️`;
    return `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-semibold">Recogen en Tienda</h1>
        <p className="text-sm text-muted-foreground mt-1">{pending.length} pedidos pendientes</p>
      </div>

      {pending.length === 0 && delivered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Truck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No hay pedidos para recoger</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-display font-semibold flex items-center gap-2">
                <Package className="w-5 h-5 text-camel" />Pendientes ({pending.length})
              </h3>
              {pending.map(p => (
                <motion.div key={p.id} layout className="bg-card border border-camel/30 rounded-xl p-5 shadow-soft">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-display text-lg font-semibold">{p.customerName}</h4>
                      <p className="text-xs text-muted-foreground">Creado: {format(parseISO(p.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.items.map((item, i) => (
                          <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                            {item.product.name}{item.variation ? ` (${item.variation.size}/${item.variation.color})` : ''} x{item.quantity}
                          </span>
                        ))}
                      </div>
                      {p.notes && <p className="text-xs text-muted-foreground mt-2">Nota: {p.notes}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleDeliver(p.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:opacity-90">
                        <CheckCircle className="w-4 h-4" />Entregado
                      </button>
                      {getWhatsAppUrl(p) && (
                        <a href={getWhatsAppUrl(p)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#25D366] text-white text-xs font-medium hover:opacity-90">
                          <MessageCircle className="w-3.5 h-3.5" />Avisar
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {delivered.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-display font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />Entregados ({delivered.length})
              </h3>
              {delivered.slice(0, 10).map(p => (
                <div key={p.id} className="bg-card border border-border rounded-xl p-4 shadow-soft opacity-70">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{p.customerName}</h4>
                      <p className="text-xs text-muted-foreground">Entregado: {p.deliveredAt ? format(parseISO(p.deliveredAt), 'dd/MM/yyyy HH:mm') : '-'}</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Entregado</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
