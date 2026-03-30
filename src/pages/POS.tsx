import { useState, useMemo } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import type { CartItem, TransactionType, PaymentMethod, Product, ProductVariation, SalesOrigin, FulfillmentType, SplitPayment, Customer } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Trash2, Search, X, Package, MessageCircle, Printer, Star, XCircle } from 'lucide-react';
import { addDays } from 'date-fns';

export default function POS() {
  const { products, exchangeRate, addTransaction, customers, addCustomer, updateCustomer, addApartado, addPickup, updateProduct } = useStore();
  const { user } = useAuth();
  const isSeller = user?.role === 'seller';
  const [cart, setCart] = useState<CartItem[]>([]);
  const [txType, setTxType] = useState<TransactionType>('sale');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('divisa');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [search, setSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showDiscount, setShowDiscount] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [isMixto, setIsMixto] = useState(false);
  const [splitPayment, setSplitPayment] = useState<SplitPayment>({ divisa: 0, pago_movil: 0, zelle: 0 });
  const [origin, setOrigin] = useState<SalesOrigin>('fisico');
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('recoge_en_tienda');
  const [shippingAddress, setShippingAddress] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingCompany, setShippingCompany] = useState('');
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [abonoInicial, setAbonoInicial] = useState('');
  const [returnReason, setReturnReason] = useState('');

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.cedula.includes(customerSearch) || c.phone.includes(customerSearch)
  );

  const selectedCustomer = customers.find(c => c.id === customerId);

  const addToCart = (product: Product, variation?: ProductVariation) => {
    if (variation && variation.stock <= 0) return;
    if (!product.hasVariations && (product.simpleStock || 0) <= 0) return;
    setCart(prev => {
      const existing = prev.find(c => variation ? (c.product.id === product.id && c.variation?.id === variation.id) : c.product.id === product.id);
      if (existing) {
        const maxStock = variation ? variation.stock : (product.simpleStock || 0);
        if (existing.quantity >= maxStock) return prev;
        return prev.map(c => {
          const match = variation ? (c.product.id === product.id && c.variation?.id === variation.id) : c.product.id === product.id;
          return match ? { ...c, quantity: c.quantity + 1 } : c;
        });
      }
      return [...prev, { product, variation, quantity: 1, priceUSD: product.priceUSD, discount: 0 }];
    });
  };

  const updateQty = (idx: number, delta: number) => {
    setCart(prev => prev.map((c, i) => {
      if (i !== idx) return c;
      const maxStock = c.variation ? c.variation.stock : (c.product.simpleStock || 0);
      const newQty = c.quantity + delta;
      if (newQty <= 0 || newQty > maxStock) return c;
      return { ...c, quantity: newQty };
    }));
  };

  const removeItem = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx));
  const clearCart = () => setCart([]);

  const subtotalUSD = cart.reduce((s, c) => s + c.priceUSD * c.quantity, 0);
  const discountAmount = subtotalUSD * (discount / 100);
  const totalUSD = subtotalUSD - discountAmount;
  const totalLocal = totalUSD * exchangeRate;

  const defaultAbono = totalUSD * 0.5;
  const actualAbono = abonoInicial ? parseFloat(abonoInicial) : defaultAbono;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (!customerId) return; // Customer mandatory for all checkout types

    const tx = {
      id: crypto.randomUUID(),
      type: txType,
      items: cart,
      customerId: customerId || undefined,
      paymentMethod: isMixto ? 'mixto' as PaymentMethod : payMethod,
      splitPayment: isMixto ? splitPayment : undefined,
      totalUSD,
      totalLocal,
      exchangeRate, // Store the rate at time of transaction
      discount,
      sellerId: user?.id || '',
      sellerName: user?.name || '',
      notes,
      origin,
      fulfillment: origin === 'redes' ? fulfillment : undefined,
      shippingAddress: origin === 'redes' && (fulfillment === 'encomienda' || fulfillment === 'delivery') ? shippingAddress : undefined,
      trackingNumber: origin === 'redes' && fulfillment === 'encomienda' ? trackingNumber : undefined,
      shippingCompany: origin === 'redes' && fulfillment === 'encomienda' ? shippingCompany : undefined,
      returnReason: (txType === 'exchange' || txType === 'warranty') ? returnReason : undefined,
      createdAt: new Date().toISOString(),
    };
    addTransaction(tx);

    // Stock adjustments
    cart.forEach(item => {
      const prod = products.find(p => p.id === item.product.id);
      if (!prod) return;
      if (txType === 'exchange') {
        // Restock for exchanges
        if (item.variation) {
          updateProduct({ ...prod, variations: prod.variations.map(v => v.id === item.variation!.id ? { ...v, stock: v.stock + item.quantity } : v) });
        } else if (!prod.hasVariations) {
          updateProduct({ ...prod, simpleStock: (prod.simpleStock || 0) + item.quantity });
        }
      } else if (txType === 'warranty') {
        // Don't restock warranties (damaged)
      } else {
        // Normal deduction
        if (item.variation) {
          updateProduct({ ...prod, variations: prod.variations.map(v => v.id === item.variation!.id ? { ...v, stock: v.stock - item.quantity } : v) });
        } else if (!prod.hasVariations) {
          updateProduct({ ...prod, simpleStock: (prod.simpleStock || 0) - item.quantity });
        }
      }
    });

    if (customerId && txType === 'sale') {
      const cust = customers.find(c => c.id === customerId);
      if (cust) updateCustomer({ ...cust, lifetimeSpend: (cust.lifetimeSpend || 0) + totalUSD });
    }

    if (txType === 'apartado' && customerId) {
      addApartado({
        id: crypto.randomUUID(),
        transactionId: tx.id,
        customerId,
        items: cart,
        totalUSD,
        firstPayment: actualAbono,
        secondPayment: 0,
        status: 'pendiente',
        createdAt: new Date().toISOString(),
        expiresAt: addDays(new Date(), 15).toISOString(),
      });
    }

    if (origin === 'redes' && fulfillment === 'recoge_en_tienda' && customerId) {
      addPickup({
        id: crypto.randomUUID(),
        transactionId: tx.id,
        customerId,
        customerName: selectedCustomer?.name || '',
        items: cart,
        status: 'pendiente',
        notes,
        createdAt: new Date().toISOString(),
      });
    }

    setLastTransaction({ ...tx, customerName: selectedCustomer?.name, customerPhone: selectedCustomer?.phone });
    setCart([]);
    setDiscount(0);
    setNotes('');
    setCustomerId('');
    setSplitPayment({ divisa: 0, pago_movil: 0, zelle: 0 });
    setIsMixto(false);
    setShippingAddress('');
    setTrackingNumber('');
    setShippingCompany('');
    setAbonoInicial('');
    setReturnReason('');
    setShowReceipt(true);
  };

  const openWhatsApp = (url: string) => {
    window.open(url, '_blank', 'noreferrer');
  };

  const generateWhatsAppReceipt = () => {
    if (!lastTransaction?.customerPhone) return '';
    const phone = lastTransaction.customerPhone.replace(/[\s+]/g, '');
    const itemsList = lastTransaction.items.map((item: CartItem) => {
      const varLabel = item.variation ? ` (${item.variation.size}/${item.variation.color})` : '';
      return `• ${item.product.name}${varLabel} x${item.quantity} — $${(item.priceUSD * item.quantity).toFixed(2)}`;
    }).join('\n');
    const msg = `🌸 *El Ropero de Frida* 🌸\n━━━━━━━━━━━━━━━━━━━\n¡Hola ${lastTransaction.customerName || ''}! Gracias por tu compra.\n\n📋 *Detalle de tu pedido:*\n${itemsList}\n\n${lastTransaction.discount > 0 ? `🏷️ Descuento: ${lastTransaction.discount}%\n` : ''}💰 *TOTAL: $${lastTransaction.totalUSD.toFixed(2)} USD*\n💱 Bs ${lastTransaction.totalLocal.toFixed(2)} (Tasa: ${lastTransaction.exchangeRate})\n━━━━━━━━━━━━━━━━━━━\n✨ ¡Gracias por preferirnos! Te esperamos pronto. 🌸`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const generateWhatsAppShipping = () => {
    if (!lastTransaction?.customerPhone || !lastTransaction?.shippingCompany) return '';
    const phone = lastTransaction.customerPhone.replace(/[\s+]/g, '');
    const msg = `¡Hola! 🌸 Tu pedido de El Ropero de Frida ya está en camino.\n\n*Fue enviado por:* ${lastTransaction.shippingCompany}\n*Número de Guía:* ${lastTransaction.trackingNumber || 'Pendiente'}\n\nPor favor avísanos en cuanto lo tengas en tus manos.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const handleNewCustomerSave = (c: Customer) => {
    addCustomer(c);
    setCustomerId(c.id);
    setShowNewCustomer(false);
    setShowCustomerDropdown(false);
  };

  const payMethods: { value: PaymentMethod; label: string }[] = [
    { value: 'divisa', label: 'Divisa (USD)' },
    { value: 'pago_movil', label: 'Pago Móvil' },
    { value: 'zelle', label: 'Zelle' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-display font-semibold">Punto de Venta</h1>
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 shadow-soft">
          <span className="text-xs text-muted-foreground">Tasa:</span>
          <span className="text-sm font-bold text-foreground">{exchangeRate} Bs/$</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-3">
          {/* Transaction type buttons */}
          <div className="flex flex-wrap gap-2">
            {(['sale', 'apartado'] as TransactionType[]).map(t => (
              <button key={t} onClick={() => setTxType(t)}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                  txType === t ? 'bg-primary text-primary-foreground shadow-card' : 'bg-card border-2 border-primary/30 text-primary hover:bg-primary/10'
                }`}>{t === 'sale' ? '🛒 Venta' : '📋 Apartado'}</button>
            ))}
            {(['exchange', 'warranty'] as TransactionType[]).map(t => (
              <button key={t} onClick={() => setTxType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  txType === t ? 'border-foreground/30 bg-muted text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
                }`}>{t === 'exchange' ? '🔄 Cambio' : '🛡️ Garantía'}</button>
            ))}
          </div>

          {/* Return reason for exchange/warranty */}
          {(txType === 'exchange' || txType === 'warranty') && (
            <div className="bg-camel/5 border border-camel/30 rounded-lg p-3">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Motivo del {txType === 'exchange' ? 'cambio' : 'reclamo'}</label>
              <select value={returnReason} onChange={e => setReturnReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">Seleccionar...</option>
                <option value="defecto">Defecto de fábrica</option>
                <option value="talla">Talla incorrecta</option>
                <option value="estilo">Cambio de estilo</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          )}

          {/* Origin */}
          <div className="flex gap-2">
            <button onClick={() => setOrigin('fisico')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${origin === 'fisico' ? 'bg-secondary text-secondary-foreground' : 'bg-card border border-border text-muted-foreground'}`}>
              🏪 Punto Físico
            </button>
            <button onClick={() => setOrigin('redes')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${origin === 'redes' ? 'bg-secondary text-secondary-foreground' : 'bg-card border border-border text-muted-foreground'}`}>
              📱 Redes Sociales
            </button>
          </div>

          {origin === 'redes' && (
            <div className="bg-card border border-border rounded-lg p-3 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Tipo de Entrega</label>
              <div className="flex gap-2">
                {(['encomienda', 'delivery', 'recoge_en_tienda'] as FulfillmentType[]).map(f => (
                  <button key={f} onClick={() => setFulfillment(f)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${fulfillment === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {f === 'encomienda' ? '📦 Encomienda' : f === 'delivery' ? '🚗 Delivery' : '🏪 Recoge'}
                  </button>
                ))}
              </div>
              {(fulfillment === 'encomienda' || fulfillment === 'delivery') && (
                <div className="space-y-2">
                  <input type="text" value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} placeholder="Dirección de envío"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                  {fulfillment === 'encomienda' && (
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={shippingCompany} onChange={e => setShippingCompany(e.target.value)} placeholder="Empresa de envío"
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                      <input type="text" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="Nro. de guía"
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Product search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto o escanear código de barras..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm" autoFocus />
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">{products.length === 0 ? 'Agrega productos desde Inventario' : 'No se encontraron productos'}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-card border border-border rounded-xl p-3 shadow-soft">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h4 className="font-medium text-sm text-foreground">{product.name}</h4>
                      <p className="text-xs text-muted-foreground">{product.category} • {product.sku || 'Sin SKU'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-foreground">${product.priceUSD.toFixed(2)}</span>
                      {!isSeller && <p className="text-[10px] text-muted-foreground">C: ${product.costUSD.toFixed(2)}</p>}
                    </div>
                  </div>
                  {product.hasVariations ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {product.variations.map(v => (
                        <button key={v.id} onClick={() => addToCart(product, v)} disabled={v.stock <= 0}
                          className={`text-xs px-2 py-0.5 rounded-md border transition-all ${
                            v.stock <= 0 ? 'border-border text-muted-foreground/40 cursor-not-allowed line-through' : 'border-primary/30 text-foreground hover:bg-primary hover:text-primary-foreground'
                          }`}>{v.size}/{v.color} ({v.stock})</button>
                      ))}
                    </div>
                  ) : (
                    <button onClick={() => addToCart(product)} disabled={(product.simpleStock || 0) <= 0}
                      className={`mt-1 text-xs px-3 py-1 rounded-md border transition-all ${
                        (product.simpleStock || 0) <= 0 ? 'border-border text-muted-foreground/40 cursor-not-allowed' : 'border-primary/30 text-foreground hover:bg-primary hover:text-primary-foreground'
                      }`}>
                      {(product.simpleStock || 0) <= 0 ? 'Agotado' : `Agregar (${product.simpleStock})`}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart panel */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl shadow-card sticky top-4">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <h3 className="font-display text-lg font-semibold">Carrito</h3>
              <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{cart.length}</span>
              {cart.length > 0 && (
                <button onClick={clearCart} className="p-1 text-muted-foreground hover:text-destructive" title="Limpiar Carrito">
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
              <AnimatePresence>
                {cart.map((item, idx) => (
                  <motion.div key={`${item.product.id}-${item.variation?.id || 'simple'}`}
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">{item.variation ? `${item.variation.size}/${item.variation.color}` : 'Simple'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(idx, -1)} className="p-1 rounded hover:bg-muted"><Minus className="w-3 h-3" /></button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(idx, 1)} className="p-1 rounded hover:bg-muted"><Plus className="w-3 h-3" /></button>
                    </div>
                    <span className="text-sm font-semibold w-14 text-right">${(item.priceUSD * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeItem(idx)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {cart.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Carrito vacío</p>}
            </div>

            <div className="p-4 border-t border-border space-y-3">
              {/* Customer */}
              <div className="relative">
                <label className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1">
                  Cliente (requerido) {selectedCustomer && (selectedCustomer.lifetimeSpend || 0) >= 300 ? '⭐ VIP' : ''}
                  {selectedCustomer && fulfillment === 'recoge_en_tienda' && <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">🏠 Recoge</span>}
                  <button onClick={() => setShowNewCustomer(true)} className="ml-auto text-primary text-[10px] font-bold hover:underline">+ Nuevo</button>
                </label>
                <div className="relative">
                  <input type="text" value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder={selectedCustomer ? selectedCustomer.name : 'Buscar cliente...'}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                  {selectedCustomer && (
                    <button onClick={() => { setCustomerId(''); setCustomerSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                  {showCustomerDropdown && customerSearch && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-elevated z-20 max-h-40 overflow-y-auto">
                      {filteredCustomers.map(c => (
                        <button key={c.id} onClick={() => { setCustomerId(c.id); setCustomerSearch(''); setShowCustomerDropdown(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-2">
                          <span>{c.name}</span>
                          {(c.lifetimeSpend || 0) >= 300 && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                          <span className="text-xs text-muted-foreground ml-auto">{c.cedula}</span>
                        </button>
                      ))}
                      <button onClick={() => { setShowNewCustomer(true); setShowCustomerDropdown(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-primary/10 text-sm text-primary font-medium border-t border-border">
                        <Plus className="w-3 h-3 inline mr-1" />Crear Cliente Nuevo
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Discount */}
              <div className="flex items-center gap-2">
                <button onClick={() => setShowDiscount(!showDiscount)} className="text-xs text-primary hover:underline">% Descuento</button>
                {showDiscount && (
                  <input type="number" value={discount} onChange={e => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-16 px-2 py-1 rounded border border-input bg-background text-xs text-center" placeholder="%" />
                )}
              </div>

              {/* Payment */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-xs text-muted-foreground font-medium">Método de Pago</label>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                    <input type="checkbox" checked={isMixto} onChange={e => setIsMixto(e.target.checked)} className="rounded" />Mixto
                  </label>
                </div>
                {isMixto ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-[10px] text-muted-foreground">Divisa $</label>
                      <input type="number" value={splitPayment.divisa} onChange={e => setSplitPayment(p => ({ ...p, divisa: Number(e.target.value) }))}
                        className="w-full px-2 py-1.5 rounded border border-input bg-background text-xs" step="0.01" /></div>
                    <div><label className="text-[10px] text-muted-foreground">P.Móvil $</label>
                      <input type="number" value={splitPayment.pago_movil} onChange={e => setSplitPayment(p => ({ ...p, pago_movil: Number(e.target.value) }))}
                        className="w-full px-2 py-1.5 rounded border border-input bg-background text-xs" step="0.01" /></div>
                    <div><label className="text-[10px] text-muted-foreground">Zelle $</label>
                      <input type="number" value={splitPayment.zelle} onChange={e => setSplitPayment(p => ({ ...p, zelle: Number(e.target.value) }))}
                        className="w-full px-2 py-1.5 rounded border border-input bg-background text-xs" step="0.01" /></div>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    {payMethods.map(m => (
                      <button key={m.value} onClick={() => setPayMethod(m.value)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${payMethod === m.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {txType === 'apartado' && (
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1 block">Abono Inicial (USD)</label>
                  <input type="number" value={abonoInicial} onChange={e => setAbonoInicial(e.target.value)}
                    placeholder={`${defaultAbono.toFixed(2)} (50%)`}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" step="0.01" />
                </div>
              )}

              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={1} placeholder="Notas..."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs resize-none" />

              {/* Totals */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>${subtotalUSD.toFixed(2)}</span></div>
                {discount > 0 && <div className="flex justify-between text-sm text-destructive"><span>Descuento ({discount}%)</span><span>-${discountAmount.toFixed(2)}</span></div>}
                <div className="flex justify-between text-lg font-bold"><span>Total</span><span>${totalUSD.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm text-muted-foreground"><span>En Bs</span><span>Bs {totalLocal.toFixed(2)}</span></div>
                {txType === 'apartado' && <div className="flex justify-between text-sm text-primary font-medium"><span>Abono inicial</span><span>${actualAbono.toFixed(2)}</span></div>}
              </div>

              <button onClick={handleCheckout} disabled={cart.length === 0 || !customerId}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm uppercase tracking-wider hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
                {txType === 'apartado' ? 'Registrar Apartado' : 'Facturar'}
              </button>
              {!customerId && cart.length > 0 && (
                <p className="text-[10px] text-destructive text-center mt-1">⚠️ Selecciona un cliente para continuar</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceipt && lastTransaction && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center px-4 print:bg-transparent print:backdrop-blur-none" onClick={() => setShowReceipt(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-sm print:shadow-none print:border-0 print:max-w-none print:rounded-none">
              <div className="p-6 print:p-2 print:text-[10px]" id="receipt-content">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-display font-bold print:text-sm">El Ropero de Frida</h2>
                  <p className="text-xs text-muted-foreground">Comprobante de {lastTransaction.type === 'sale' ? 'Venta' : lastTransaction.type === 'apartado' ? 'Apartado' : lastTransaction.type === 'exchange' ? 'Cambio' : 'Garantía'}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">#{lastTransaction.id.slice(0, 8)} • {new Date(lastTransaction.createdAt).toLocaleString('es-VE')}</p>
                </div>
                <div className="border-t border-dashed border-border pt-3 space-y-1">
                  {lastTransaction.items.map((item: CartItem, i: number) => (
                    <div key={i} className="flex justify-between text-sm print:text-[10px]">
                      <span>{item.product.name}{item.variation ? ` (${item.variation.size}/${item.variation.color})` : ''} x{item.quantity}</span>
                      <span className="font-medium">${(item.priceUSD * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-border mt-3 pt-3">
                  <div className="flex justify-between font-bold text-lg print:text-sm"><span>Total</span><span>${lastTransaction.totalUSD.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm text-muted-foreground"><span>Bs</span><span>{lastTransaction.totalLocal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs text-muted-foreground"><span>Tasa</span><span>{lastTransaction.exchangeRate} Bs/$</span></div>
                  {/* Payment breakdown */}
                  {lastTransaction.paymentMethod === 'mixto' && lastTransaction.splitPayment && (
                    <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">Desglose de pago:</p>
                      {lastTransaction.splitPayment.divisa > 0 && <div className="flex justify-between"><span>Divisa USD</span><span>${lastTransaction.splitPayment.divisa.toFixed(2)}</span></div>}
                      {lastTransaction.splitPayment.pago_movil > 0 && <div className="flex justify-between"><span>Pago Móvil</span><span>${lastTransaction.splitPayment.pago_movil.toFixed(2)} (Bs {(lastTransaction.splitPayment.pago_movil * lastTransaction.exchangeRate).toFixed(2)})</span></div>}
                      {lastTransaction.splitPayment.zelle > 0 && <div className="flex justify-between"><span>Zelle</span><span>${lastTransaction.splitPayment.zelle.toFixed(2)}</span></div>}
                    </div>
                  )}
                  {lastTransaction.customerName && <p className="text-xs text-muted-foreground mt-1">Cliente: {lastTransaction.customerName}</p>}
                  <p className="text-xs text-muted-foreground">Vendedor: {lastTransaction.sellerName}</p>
                </div>
                <p className="text-center text-xs text-muted-foreground mt-4 print:mt-2">¡Gracias por tu compra! 🌸</p>
              </div>
              <div className="p-4 border-t border-border flex flex-wrap gap-2 print:hidden">
                <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                  <Printer className="w-4 h-4" />Imprimir
                </button>
                {lastTransaction.customerPhone && (
                  <button onClick={() => openWhatsApp(generateWhatsAppReceipt())}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#25D366] text-white text-sm font-medium">
                    <MessageCircle className="w-4 h-4" />WhatsApp
                  </button>
                )}
                {lastTransaction.shippingCompany && lastTransaction.customerPhone && (
                  <button onClick={() => openWhatsApp(generateWhatsAppShipping())}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#25D366]/80 text-white text-xs font-medium">
                    📦 Envío
                  </button>
                )}
                <button onClick={() => setShowReceipt(false)} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground">Cerrar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Customer modal */}
      <AnimatePresence>
        {showNewCustomer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={() => setShowNewCustomer(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-sm">
              <QuickCustomerForm onSave={handleNewCustomerSave} onClose={() => setShowNewCustomer(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuickCustomerForm({ onSave, onClose }: { onSave: (c: Customer) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cedula, setCedula] = useState('');
  const [instagram, setInstagram] = useState('');
  const [birthday, setBirthday] = useState('');

  return (
    <div className="p-5 space-y-3">
      <h3 className="font-display text-lg font-semibold">Nuevo Cliente</h3>
      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="👤 Nombre*"
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="📱 WhatsApp"
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
      <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="📸 Instagram"
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
      <input type="text" value={cedula} onChange={e => setCedula(e.target.value)} placeholder="🪪 Cédula"
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
      <div>
        <label className="text-xs text-muted-foreground">🎂 Cumpleaños</label>
        <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground">Cancelar</button>
        <button onClick={() => { if (!name) return; onSave({ id: crypto.randomUUID(), name, phone, cedula, instagram, birthday, notes: '', discountCodes: [], lifetimeSpend: 0, createdAt: new Date().toISOString() }); }}
          className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Guardar</button>
      </div>
    </div>
  );
}
