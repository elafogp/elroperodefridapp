import { useState } from 'react';
import { useStore } from '@/contexts/StoreContext';
import type { Transaction, CartItem } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Ban, Printer, X, FileText, MessageCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function SalesHistory() {
  const { transactions, updateTransaction, customers } = useStore();
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const filtered = transactions.slice().reverse().filter(tx => {
    const customer = customers.find(c => c.id === tx.customerId);
    const matchSearch = !search || (customer?.name || '').toLowerCase().includes(search.toLowerCase()) || tx.id.includes(search);
    const matchMonth = !monthFilter || tx.createdAt.startsWith(monthFilter);
    return matchSearch && matchMonth;
  });

  const voidTransaction = (tx: Transaction) => {
    if (confirm('¿Anular esta venta?')) updateTransaction({ ...tx, voided: true });
  };

  const getCustomerName = (id?: string) => id ? customers.find(c => c.id === id)?.name || 'Sin nombre' : 'Sin cliente';
  const getCustomerPhone = (id?: string) => id ? customers.find(c => c.id === id)?.phone || '' : '';

  const exportMonth = () => {
    const csv = 'Fecha,Tipo,Cliente,Total USD,Método,Origen,Vendedor,Anulada\n' + filtered.map(t => {
      const c = customers.find(c => c.id === t.customerId);
      return `"${t.createdAt}","${t.type}","${c?.name || ''}",${t.totalUSD},"${t.paymentMethod}","${t.origin || 'fisico'}","${t.sellerName || ''}","${t.voided ? 'Sí' : 'No'}"`;
    }).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ventas_${monthFilter}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-display font-semibold">Historial de Ventas</h1>
        <div className="flex gap-2">
          <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-card text-sm" />
          <button onClick={exportMonth} className="px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted">📥 Excel</button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por cliente o ID..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No hay ventas en este período</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(tx => (
            <div key={tx.id} onClick={() => setSelectedTx(tx)}
              className={`bg-card border rounded-xl p-4 shadow-soft cursor-pointer hover:shadow-card transition-shadow ${tx.voided ? 'border-destructive/30 opacity-60' : 'border-border'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{getCustomerName(tx.customerId)}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${tx.type === 'sale' ? 'bg-primary/10 text-primary' : tx.type === 'apartado' ? 'bg-camel/10 text-foreground' : tx.type === 'exchange' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'}`}>
                      {tx.type === 'sale' ? 'Venta' : tx.type === 'exchange' ? 'Cambio' : tx.type === 'warranty' ? 'Garantía' : 'Apartado'}
                    </span>
                    {tx.voided && <span className="text-xs text-destructive font-bold">ANULADA</span>}
                    <span className="text-xs text-muted-foreground">{tx.origin === 'redes' ? '📱' : '🏪'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{format(parseISO(tx.createdAt), 'dd/MM/yyyy HH:mm')} • {tx.sellerName} • Tasa: {tx.exchangeRate} Bs/$</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">${tx.totalUSD.toFixed(2)}</span>
                  {!tx.voided && (
                    <button onClick={e => { e.stopPropagation(); voidTransaction(tx); }} className="p-1 rounded hover:bg-destructive/10" title="Anular">
                      <Ban className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {selectedTx && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={() => setSelectedTx(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-md">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h3 className="font-display text-xl font-semibold">Detalle de Venta</h3>
                <button onClick={() => setSelectedTx(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-3">
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <p>ID: <span className="font-mono text-foreground">{selectedTx.id.slice(0, 8)}</span></p>
                  <p>Cliente: <span className="font-medium text-foreground">{getCustomerName(selectedTx.customerId)}</span></p>
                  <p>Fecha: {format(parseISO(selectedTx.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                  <p>Vendedor: {selectedTx.sellerName}</p>
                  <p>Origen: {selectedTx.origin === 'redes' ? 'Redes Sociales' : 'Punto Físico'}</p>
                  <p>Tasa: {selectedTx.exchangeRate} Bs/$</p>
                  <p>Pago: {selectedTx.paymentMethod === 'mixto' ? 'Mixto' : selectedTx.paymentMethod === 'divisa' ? 'Divisa' : selectedTx.paymentMethod === 'pago_movil' ? 'Pago Móvil' : 'Zelle'}</p>
                </div>
                {/* Mixto breakdown */}
                {selectedTx.paymentMethod === 'mixto' && selectedTx.splitPayment && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                    <p className="font-medium text-foreground">Desglose Pago Mixto:</p>
                    {selectedTx.splitPayment.divisa > 0 && <div className="flex justify-between"><span>Divisa USD</span><span>${selectedTx.splitPayment.divisa.toFixed(2)}</span></div>}
                    {selectedTx.splitPayment.pago_movil > 0 && <div className="flex justify-between"><span>Pago Móvil</span><span>${selectedTx.splitPayment.pago_movil.toFixed(2)} (Bs {(selectedTx.splitPayment.pago_movil * selectedTx.exchangeRate).toFixed(2)})</span></div>}
                    {selectedTx.splitPayment.zelle > 0 && <div className="flex justify-between"><span>Zelle</span><span>${selectedTx.splitPayment.zelle.toFixed(2)}</span></div>}
                  </div>
                )}
                <div className="border-t border-border pt-3 space-y-1">
                  {selectedTx.items.map((item: CartItem, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.product.name}{item.variation ? ` (${item.variation.size}/${item.variation.color})` : ''} x{item.quantity}</span>
                      <span className="font-medium">${(item.priceUSD * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
                  <span>Total</span><span>${selectedTx.totalUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>En Bs</span><span>Bs {selectedTx.totalLocal.toFixed(2)}</span>
                </div>
                {selectedTx.notes && <p className="text-xs text-muted-foreground bg-muted p-2 rounded">Notas: {selectedTx.notes}</p>}
              </div>
              <div className="p-5 border-t border-border flex gap-2 flex-wrap">
                <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                  <Printer className="w-4 h-4" />Re-imprimir
                </button>
                {getCustomerPhone(selectedTx.customerId) && (
                  <button onClick={() => {
                    const phone = getCustomerPhone(selectedTx.customerId).replace(/[\s+]/g, '');
                    const custName = getCustomerName(selectedTx.customerId);
                    const itemsList = selectedTx.items.map((item: CartItem) => {
                      const varLabel = item.variation ? ` (${item.variation.size}/${item.variation.color})` : '';
                      return `• ${item.product.name}${varLabel} x${item.quantity} — $${(item.priceUSD * item.quantity).toFixed(2)}`;
                    }).join('\n');
                    const msg = `🌸 *El Ropero de Frida* 🌸\n━━━━━━━━━━━━━━━━━━━\n¡Hola ${custName}! Gracias por tu compra.\n\n📋 *Detalle:*\n${itemsList}\n\n💰 *TOTAL: $${selectedTx.totalUSD.toFixed(2)} USD*\n💱 Bs ${selectedTx.totalLocal.toFixed(2)}\n━━━━━━━━━━━━━━━━━━━\n✨ ¡Gracias por preferirnos! 🌸`;
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noreferrer');
                  }} className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#25D366] text-white text-sm font-medium">
                    <MessageCircle className="w-4 h-4" />WhatsApp
                  </button>
                )}
                {!selectedTx.voided && (
                  <button onClick={() => { voidTransaction(selectedTx); setSelectedTx(null); }}
                    className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium">Anular</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
