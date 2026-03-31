import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  Product, ProductVariation, Customer, Transaction, Expense,
  Apartado, Pickup, Investment, Supplier, Salary, CajaChicaEntry,
} from '@/types';

interface StoreContextType {
  loading: boolean;
  exchangeRate: number;
  setExchangeRate: (rate: number) => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  addProduct: (p: Product) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  addCustomer: (c: Customer) => Promise<void>;
  updateCustomer: (c: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  transactions: Transaction[];
  addTransaction: (t: Transaction) => Promise<void>;
  updateTransaction: (t: Transaction) => Promise<void>;
  expenses: Expense[];
  addExpense: (e: Expense) => Promise<void>;
  updateExpense: (e: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  apartados: Apartado[];
  addApartado: (a: Apartado) => Promise<void>;
  updateApartado: (a: Apartado) => Promise<void>;
  pickups: Pickup[];
  addPickup: (p: Pickup) => Promise<void>;
  updatePickup: (p: Pickup) => Promise<void>;
  investments: Investment[];
  addInvestment: (i: Investment) => Promise<void>;
  updateInvestment: (i: Investment) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  suppliers: Supplier[];
  addSupplier: (s: Supplier) => Promise<void>;
  updateSupplier: (s: Supplier) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  salaries: Salary[];
  addSalary: (s: Salary) => Promise<void>;
  updateSalary: (s: Salary) => Promise<void>;
  deleteSalary: (id: string) => Promise<void>;
  cajaChica: CajaChicaEntry[];
  addCajaChicaEntry: (e: CajaChicaEntry) => Promise<void>;
  lowStockThreshold: number;
  setLowStockThreshold: (n: number) => void;
  customCategories: Record<string, { label: string; subcategories: string[] }>;
  setCustomCategories: React.Dispatch<React.SetStateAction<Record<string, { label: string; subcategories: string[] }>>>;
  customColors: string[];
  setCustomColors: React.Dispatch<React.SetStateAction<string[]>>;
  customSizes: string[];
  setCustomSizes: React.Dispatch<React.SetStateAction<string[]>>;
}

const StoreContext = createContext<StoreContextType | null>(null);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ══════════════════════════════════════
//  DB → App mappers
// ══════════════════════════════════════

function dbToProduct(row: any, variations: ProductVariation[]): Product {
  let photos: string[] = [];
  if (row.fotos) {
    try { photos = typeof row.fotos === 'string' ? JSON.parse(row.fotos) : row.fotos; } catch { photos = []; }
  }
  return {
    id: row.id,
    name: row.nombre || '',
    sku: row.sku || '',
    category: row.categoria || '',
    subcategory: row.subcategoria || '',
    costUSD: Number(row.costo_usd) || 0,
    priceUSD: Number(row.precio) || 0,
    hasVariations: variations.length > 0,
    variations,
    simpleStock: Number(row.stock) || 0,
    photos,
    lowStockThreshold: Number(row.low_stock_threshold) || 3,
    publishOnline: Boolean(row.publish_online),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function dbToVariation(v: any): ProductVariation {
  return { id: v.id, size: v.size || '', color: v.color || '', stock: Number(v.stock) || 0 };
}

function dbToCustomer(row: any): Customer {
  return {
    id: row.id,
    name: row.name || '',
    cedula: row.cedula || '',
    phone: row.phone || '',
    instagram: row.instagram || '',
    birthday: row.birthday || '',
    notes: row.notes || '',
    discountCodes: row.discount_codes || [],
    lifetimeSpend: Number(row.lifetime_spend) || 0,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function dbToTransaction(row: any): Transaction {
  return {
    id: row.id,
    type: row.tipo || 'sale',
    items: (row.items as any) || [],
    customerId: row.cliente_id || undefined,
    paymentMethod: row.metodo_pago || 'divisa',
    splitPayment: row.split_payment || undefined,
    totalUSD: Number(row.total_usd) || 0,
    totalLocal: Number(row.total_local) || 0,
    exchangeRate: Number(row.tasa_usada) || 0,
    discount: Number(row.descuento) || 0,
    sellerId: row.seller_id || '',
    sellerName: row.seller_name || '',
    notes: row.notas || '',
    origin: row.origen || 'fisico',
    fulfillment: row.fulfillment || undefined,
    shippingAddress: row.shipping_address || undefined,
    trackingNumber: row.tracking_number || undefined,
    shippingCompany: row.shipping_company || undefined,
    voided: Boolean(row.voided),
    returnReason: row.return_reason || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function dbToExpense(r: any): Expense {
  return {
    id: r.id,
    amount: Number(r.monto) || 0,
    currency: (r.currency || 'USD') as 'USD' | 'LOCAL',
    category: r.categoria || '',
    description: r.descripcion || '',
    date: r.fecha || '',
    exchangeRate: r.tasa_cambio ? Number(r.tasa_cambio) : undefined,
    receiptPhoto: r.receipt_photo || undefined,
    createdAt: r.created_at || r.fecha || new Date().toISOString(),
  };
}

function dbToCajaChica(r: any): CajaChicaEntry {
  return {
    id: r.id,
    type: r.tipo === 'egreso' ? 'egreso' : 'ingreso',
    amount: Number(r.monto) || 0,
    description: r.descripcion || '',
    date: r.fecha || '',
    createdAt: r.created_at || new Date().toISOString(),
  };
}

function dbToApartado(r: any): Apartado {
  return {
    id: r.id,
    transactionId: r.transaccion_id || '',
    customerId: r.cliente_id || '',
    items: (r.items as any) || [],
    totalUSD: Number(r.total_usd) || 0,
    firstPayment: Number(r.first_payment) || 0,
    secondPayment: Number(r.second_payment) || 0,
    status: r.status || 'pendiente',
    createdAt: r.created_at || new Date().toISOString(),
    expiresAt: r.expires_at || '',
    completedAt: r.completed_at || undefined,
  };
}

function dbToPickup(r: any): Pickup {
  return {
    id: r.id,
    transactionId: r.transaccion_id || '',
    customerId: r.cliente_id || '',
    customerName: r.customer_name || '',
    items: (r.items as any) || [],
    status: r.estado || 'pendiente',
    notes: r.notas || '',
    createdAt: r.created_at || new Date().toISOString(),
    deliveredAt: r.delivered_at || undefined,
  };
}

function dbToInvestment(r: any): Investment {
  return {
    id: r.id,
    concept: r.descripcion || '',
    totalCost: Number(r.monto) || 0,
    paidAmount: Number(r.paid_amount) || 0,
    month: r.fecha || '',
    status: r.status || 'en_camino',
    supplier: r.supplier || '',
    notes: r.notas || '',
    paymentHistory: (r.payment_history as any) || [],
    createdAt: r.created_at || r.fecha || new Date().toISOString(),
  };
}

function dbToSupplier(r: any): Supplier {
  return {
    id: r.id,
    name: r.nombre || '',
    contact: r.contacto || '',
    totalDebt: Number(r.total_debt) || 0,
    payments: (r.payments as any) || [],
    notes: r.notas || '',
    createdAt: r.created_at || new Date().toISOString(),
  };
}

function dbToSalary(r: any): Salary {
  return {
    id: r.id,
    userId: r.user_id || '',
    userName: r.user_name || '',
    role: r.role || 'seller',
    baseSalaryUSD: Number(r.monto) || 0,
    paidAmount: Number(r.paid_amount) || 0,
    paymentHistory: (r.payment_history as any) || [],
    month: r.month || '',
    status: r.status || 'pendiente',
    createdAt: r.created_at || new Date().toISOString(),
  };
}

// ══════════════════════════════════════
//  Provider
// ══════════════════════════════════════

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [exchangeRate, _setExchangeRate] = useState(36.5);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [apartados, setApartados] = useState<Apartado[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [cajaChica, setCajaChica] = useState<CajaChicaEntry[]>([]);
  const [lowStockThreshold, _setLowStockThreshold] = useState(3);
  const [customCategories, _setCustomCategories] = useState<Record<string, { label: string; subcategories: string[] }>>({});
  const [customColors, _setCustomColors] = useState<string[]>([]);
  const [customSizes, _setCustomSizes] = useState<string[]>([]);

  // ── Refresh helpers ──
  const refreshProducts = useCallback(async () => {
    const [{ data: prodRows }, { data: varRows }] = await Promise.all([
      supabase.from('productos').select('*').order('created_at', { ascending: false }),
      supabase.from('product_variations').select('*'),
    ]);
    const varsByProduct: Record<string, ProductVariation[]> = {};
    (varRows || []).forEach((v: any) => {
      if (!varsByProduct[v.product_id]) varsByProduct[v.product_id] = [];
      varsByProduct[v.product_id].push(dbToVariation(v));
    });
    setProducts((prodRows || []).map((r: any) => dbToProduct(r, varsByProduct[r.id] || [])));
  }, []);

  const refreshTransactions = useCallback(async () => {
    const { data } = await supabase.from('transacciones').select('*').order('created_at', { ascending: false });
    setTransactions((data || []).map(dbToTransaction));
  }, []);

  const refreshCustomers = useCallback(async () => {
    const { data } = await supabase.from('clientes').select('*').order('created_at', { ascending: false });
    setCustomers((data || []).map(dbToCustomer));
  }, []);

  const refreshCajaChica = useCallback(async () => {
    const { data } = await supabase.from('caja_chica').select('*').order('created_at', { ascending: false });
    setCajaChica((data || []).map(dbToCajaChica));
  }, []);

  const refreshExpenses = useCallback(async () => {
    const { data } = await supabase.from('gastos').select('*').order('fecha', { ascending: false });
    setExpenses((data || []).map(dbToExpense));
  }, []);

  // ── Load all data on mount ──
  useEffect(() => {
    async function loadAll() {
      try {
        // 1. Exchange rate
        const { data: rateRow } = await supabase
          .from('tasas_cambio').select('valor').eq('fecha', todayStr()).maybeSingle();
        if (rateRow) _setExchangeRate(Number(rateRow.valor));

        // 2. Products + variations
        const [{ data: prodRows }, { data: varRows }] = await Promise.all([
          supabase.from('productos').select('*').order('created_at', { ascending: false }),
          supabase.from('product_variations').select('*'),
        ]);
        const varsByProduct: Record<string, ProductVariation[]> = {};
        (varRows || []).forEach((v: any) => {
          if (!varsByProduct[v.product_id]) varsByProduct[v.product_id] = [];
          varsByProduct[v.product_id].push(dbToVariation(v));
        });
        setProducts((prodRows || []).map((r: any) => dbToProduct(r, varsByProduct[r.id] || [])));

        // 3. Everything else in parallel
        const [
          { data: custRows }, { data: txRows }, { data: expRows },
          { data: apartRows }, { data: pickRows }, { data: invRows },
          { data: suppRows }, { data: salRows }, { data: cajaRows },
        ] = await Promise.all([
          supabase.from('clientes').select('*').order('created_at', { ascending: false }),
          supabase.from('transacciones').select('*').order('created_at', { ascending: false }),
          supabase.from('gastos').select('*').order('fecha', { ascending: false }),
          supabase.from('apartados').select('*'),
          supabase.from('pickups').select('*'),
          supabase.from('inversiones').select('*').order('fecha', { ascending: false }),
          supabase.from('proveedores').select('*'),
          supabase.from('salarios').select('*'),
          supabase.from('caja_chica').select('*').order('created_at', { ascending: false }),
        ]);

        setCustomers((custRows || []).map(dbToCustomer));
        setTransactions((txRows || []).map(dbToTransaction));
        setExpenses((expRows || []).map(dbToExpense));
        setApartados((apartRows || []).map(dbToApartado));
        setPickups((pickRows || []).map(dbToPickup));
        setInvestments((invRows || []).map(dbToInvestment));
        setSuppliers((suppRows || []).map(dbToSupplier));
        setSalaries((salRows || []).map(dbToSalary));
        setCajaChica((cajaRows || []).map(dbToCajaChica));
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  // ── Exchange rate: upsert ──
  const setExchangeRate = useCallback(async (rate: number) => {
    _setExchangeRate(rate);
    await supabase.from('tasas_cambio').upsert({ fecha: todayStr(), valor: rate }, { onConflict: 'fecha' });
  }, []);

  // ══════════════════════════════════════
  //  Products
  // ══════════════════════════════════════

  const addProduct = useCallback(async (p: Product) => {
    const { error } = await supabase.from('productos').insert({
      id: p.id,
      sku: p.sku,
      nombre: p.name,
      categoria: p.category,
      subcategoria: p.subcategory,
      costo_usd: p.costUSD,
      precio: p.priceUSD,
      stock: p.simpleStock || 0,
      fotos: p.photos,
    });
    if (error) console.error('addProduct:', error);

    if (p.variations.length > 0) {
      const { error: vErr } = await supabase.from('product_variations').insert(
        p.variations.map(v => ({ id: v.id, product_id: p.id, size: v.size, color: v.color, stock: v.stock }))
      );
      if (vErr) console.error('addProduct variations:', vErr);
    }
    await refreshProducts();
  }, [refreshProducts]);

  const updateProduct = useCallback(async (p: Product) => {
    await supabase.from('productos').update({
      sku: p.sku,
      nombre: p.name,
      categoria: p.category,
      subcategoria: p.subcategory,
      costo_usd: p.costUSD,
      precio: p.priceUSD,
      stock: p.simpleStock || 0,
      fotos: p.photos,
    }).eq('id', p.id);

    // Replace variations: delete old, insert new
    await supabase.from('product_variations').delete().eq('product_id', p.id);
    if (p.variations.length > 0) {
      await supabase.from('product_variations').insert(
        p.variations.map(v => ({ id: v.id, product_id: p.id, size: v.size, color: v.color, stock: v.stock }))
      );
    }
    await refreshProducts();
  }, [refreshProducts]);

  const deleteProduct = useCallback(async (id: string) => {
    await supabase.from('product_variations').delete().eq('product_id', id);
    await supabase.from('productos').delete().eq('id', id);
    await refreshProducts();
  }, [refreshProducts]);

  // ══════════════════════════════════════
  //  Customers
  // ══════════════════════════════════════

  const addCustomer = useCallback(async (c: Customer) => {
    await supabase.from('clientes').insert({
      id: c.id, name: c.name, cedula: c.cedula, phone: c.phone,
      instagram: c.instagram, notes: c.notes,
    });
    await refreshCustomers();
  }, [refreshCustomers]);

  const updateCustomer = useCallback(async (c: Customer) => {
    await supabase.from('clientes').update({
      name: c.name, cedula: c.cedula, phone: c.phone,
      instagram: c.instagram, notes: c.notes,
    }).eq('id', c.id);
    await refreshCustomers();
  }, [refreshCustomers]);

  const deleteCustomer = useCallback(async (id: string) => {
    await supabase.from('clientes').delete().eq('id', id);
    await refreshCustomers();
  }, [refreshCustomers]);

  // ══════════════════════════════════════
  //  Transactions + Stock Discount
  // ══════════════════════════════════════

  const addTransaction = useCallback(async (t: Transaction) => {
    // 1. Insert transaction
    const { error } = await supabase.from('transacciones').insert({
      id: t.id,
      tipo: t.type,
      items: t.items as any,
      cliente_id: t.customerId || null,
      metodo_pago: t.paymentMethod,
      split_payment: t.splitPayment ? (t.splitPayment as any) : null,
      total_usd: t.totalUSD,
      total_local: t.totalLocal,
      tasa_usada: t.exchangeRate,
      descuento: t.discount,
      seller_id: t.sellerId,
      seller_name: t.sellerName || '',
      notas: t.notes,
      origen: t.origin,
      fulfillment: t.fulfillment || null,
      shipping_address: t.shippingAddress || null,
      tracking_number: t.trackingNumber || null,
      shipping_company: t.shippingCompany || null,
      voided: t.voided || false,
      return_reason: t.returnReason || null,
    });
    if (error) console.error('addTransaction:', error);

    // 2. Discount stock
    for (const item of t.items) {
      if (item.variation) {
        const { data: vRow } = await supabase
          .from('product_variations').select('stock').eq('id', item.variation.id).single();
        if (vRow) {
          await supabase.from('product_variations')
            .update({ stock: Math.max(0, vRow.stock - item.quantity) })
            .eq('id', item.variation.id);
        }
      } else {
        const { data: pRow } = await supabase
          .from('productos').select('stock').eq('id', item.product.id).single();
        if (pRow) {
          await supabase.from('productos')
            .update({ stock: Math.max(0, pRow.stock - item.quantity) })
            .eq('id', item.product.id);
        }
      }
    }

    // 3. Refresh from DB
    await Promise.all([refreshTransactions(), refreshProducts()]);
  }, [refreshTransactions, refreshProducts]);

  const updateTransaction = useCallback(async (t: Transaction) => {
    await supabase.from('transacciones').update({
      tipo: t.type,
      items: t.items as any,
      cliente_id: t.customerId || null,
      metodo_pago: t.paymentMethod,
      total_usd: t.totalUSD,
      total_local: t.totalLocal,
      tasa_usada: t.exchangeRate,
      descuento: t.discount,
      voided: t.voided || false,
      return_reason: t.returnReason || null,
      notas: t.notes,
    }).eq('id', t.id);
    await refreshTransactions();
  }, [refreshTransactions]);

  // ══════════════════════════════════════
  //  Expenses
  // ══════════════════════════════════════

  const addExpense = useCallback(async (e: Expense) => {
    await supabase.from('gastos').insert({
      id: e.id, descripcion: e.description, fecha: e.date, monto: e.amount, categoria: e.category,
    });
    await refreshExpenses();
  }, [refreshExpenses]);

  const updateExpense = useCallback(async (e: Expense) => {
    await supabase.from('gastos').update({
      descripcion: e.description, fecha: e.date, monto: e.amount, categoria: e.category,
    }).eq('id', e.id);
    await refreshExpenses();
  }, [refreshExpenses]);

  const deleteExpense = useCallback(async (id: string) => {
    await supabase.from('gastos').delete().eq('id', id);
    await refreshExpenses();
  }, [refreshExpenses]);

  // ══════════════════════════════════════
  //  Apartados
  // ══════════════════════════════════════

  const addApartado = useCallback(async (a: Apartado) => {
    await supabase.from('apartados').insert({
      id: a.id, transaccion_id: a.transactionId, cliente_id: a.customerId,
      items: a.items as any, total_usd: a.totalUSD,
      first_payment: a.firstPayment, second_payment: a.secondPayment,
      status: a.status, expires_at: a.expiresAt,
    });
    const { data } = await supabase.from('apartados').select('*');
    setApartados((data || []).map(dbToApartado));
  }, []);

  const updateApartado = useCallback(async (a: Apartado) => {
    await supabase.from('apartados').update({
      status: a.status, second_payment: a.secondPayment,
      completed_at: a.completedAt || null,
    }).eq('id', a.id);
    const { data } = await supabase.from('apartados').select('*');
    setApartados((data || []).map(dbToApartado));
  }, []);

  // ══════════════════════════════════════
  //  Pickups
  // ══════════════════════════════════════

  const addPickup = useCallback(async (p: Pickup) => {
    await supabase.from('pickups').insert({
      id: p.id, transaccion_id: p.transactionId, cliente_id: p.customerId,
      customer_name: p.customerName, items: p.items as any,
      estado: p.status, notas: p.notes,
    });
    const { data } = await supabase.from('pickups').select('*');
    setPickups((data || []).map(dbToPickup));
  }, []);

  const updatePickup = useCallback(async (p: Pickup) => {
    await supabase.from('pickups').update({
      estado: p.status, delivered_at: p.deliveredAt || null,
    }).eq('id', p.id);
    const { data } = await supabase.from('pickups').select('*');
    setPickups((data || []).map(dbToPickup));
  }, []);

  // ══════════════════════════════════════
  //  Investments
  // ══════════════════════════════════════

  const addInvestment = useCallback(async (i: Investment) => {
    await supabase.from('inversiones').insert({
      id: i.id, descripcion: i.concept, fecha: i.month, monto: i.totalCost,
    });
    const { data } = await supabase.from('inversiones').select('*').order('fecha', { ascending: false });
    setInvestments((data || []).map(dbToInvestment));
  }, []);

  const updateInvestment = useCallback(async (i: Investment) => {
    await supabase.from('inversiones').update({
      descripcion: i.concept, fecha: i.month, monto: i.totalCost,
    }).eq('id', i.id);
    const { data } = await supabase.from('inversiones').select('*').order('fecha', { ascending: false });
    setInvestments((data || []).map(dbToInvestment));
  }, []);

  const deleteInvestment = useCallback(async (id: string) => {
    await supabase.from('inversiones').delete().eq('id', id);
    const { data } = await supabase.from('inversiones').select('*').order('fecha', { ascending: false });
    setInvestments((data || []).map(dbToInvestment));
  }, []);

  // ══════════════════════════════════════
  //  Suppliers
  // ══════════════════════════════════════

  const addSupplier = useCallback(async (s: Supplier) => {
    await supabase.from('proveedores').insert({ id: s.id, nombre: s.name, contacto: s.contact });
    const { data } = await supabase.from('proveedores').select('*');
    setSuppliers((data || []).map(dbToSupplier));
  }, []);

  const updateSupplier = useCallback(async (s: Supplier) => {
    await supabase.from('proveedores').update({ nombre: s.name, contacto: s.contact }).eq('id', s.id);
    const { data } = await supabase.from('proveedores').select('*');
    setSuppliers((data || []).map(dbToSupplier));
  }, []);

  const deleteSupplier = useCallback(async (id: string) => {
    await supabase.from('proveedores').delete().eq('id', id);
    const { data } = await supabase.from('proveedores').select('*');
    setSuppliers((data || []).map(dbToSupplier));
  }, []);

  // ══════════════════════════════════════
  //  Salaries
  // ══════════════════════════════════════

  const addSalary = useCallback(async (s: Salary) => {
    await supabase.from('salarios').insert({ id: s.id, monto: s.baseSalaryUSD });
    const { data } = await supabase.from('salarios').select('*');
    setSalaries((data || []).map(dbToSalary));
  }, []);

  const updateSalary = useCallback(async (s: Salary) => {
    await supabase.from('salarios').update({ monto: s.baseSalaryUSD }).eq('id', s.id);
    const { data } = await supabase.from('salarios').select('*');
    setSalaries((data || []).map(dbToSalary));
  }, []);

  const deleteSalary = useCallback(async (id: string) => {
    await supabase.from('salarios').delete().eq('id', id);
    const { data } = await supabase.from('salarios').select('*');
    setSalaries((data || []).map(dbToSalary));
  }, []);

  // ══════════════════════════════════════
  //  Caja Chica
  // ══════════════════════════════════════

  const addCajaChicaEntry = useCallback(async (e: CajaChicaEntry) => {
    await supabase.from('caja_chica').insert({
      id: e.id, tipo: e.type, monto: e.amount, descripcion: e.description, fecha: e.date,
    });
    await refreshCajaChica();
  }, [refreshCajaChica]);

  // ══════════════════════════════════════
  //  Settings (no DB table — keep in state)
  // ══════════════════════════════════════

  const setLowStockThreshold = useCallback((n: number) => { _setLowStockThreshold(n); }, []);

  const setCustomCategories = useCallback<React.Dispatch<React.SetStateAction<Record<string, { label: string; subcategories: string[] }>>>>((val) => {
    _setCustomCategories(prev => typeof val === 'function' ? val(prev) : val);
  }, []);

  const setCustomColors = useCallback<React.Dispatch<React.SetStateAction<string[]>>>((val) => {
    _setCustomColors(prev => typeof val === 'function' ? val(prev) : val);
  }, []);

  const setCustomSizes = useCallback<React.Dispatch<React.SetStateAction<string[]>>>((val) => {
    _setCustomSizes(prev => typeof val === 'function' ? val(prev) : val);
  }, []);

  return (
    <StoreContext.Provider value={{
      loading, exchangeRate, setExchangeRate,
      products, setProducts, addProduct, updateProduct, deleteProduct,
      customers, setCustomers, addCustomer, updateCustomer, deleteCustomer,
      transactions, addTransaction, updateTransaction,
      expenses, addExpense, updateExpense, deleteExpense,
      apartados, addApartado, updateApartado,
      pickups, addPickup, updatePickup,
      investments, addInvestment, updateInvestment, deleteInvestment,
      suppliers, addSupplier, updateSupplier, deleteSupplier,
      salaries, addSalary, updateSalary, deleteSalary,
      cajaChica, addCajaChicaEntry,
      lowStockThreshold, setLowStockThreshold,
      customCategories, setCustomCategories,
      customColors, setCustomColors,
      customSizes, setCustomSizes,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
