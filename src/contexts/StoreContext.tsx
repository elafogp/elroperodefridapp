import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Product, Customer, Transaction, Expense, Apartado, Pickup, Investment, Supplier, Salary, CajaChicaEntry, ProductVariation } from '@/types';

interface StoreContextType {
  loading: boolean;
  exchangeRate: number;
  setExchangeRate: (rate: number) => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  addProduct: (p: Product) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  addCustomer: (c: Customer) => void;
  updateCustomer: (c: Customer) => void;
  deleteCustomer: (id: string) => void;
  transactions: Transaction[];
  addTransaction: (t: Transaction) => void;
  updateTransaction: (t: Transaction) => void;
  expenses: Expense[];
  addExpense: (e: Expense) => void;
  updateExpense: (e: Expense) => void;
  deleteExpense: (id: string) => void;
  apartados: Apartado[];
  addApartado: (a: Apartado) => void;
  updateApartado: (a: Apartado) => void;
  pickups: Pickup[];
  addPickup: (p: Pickup) => void;
  updatePickup: (p: Pickup) => void;
  investments: Investment[];
  addInvestment: (i: Investment) => void;
  updateInvestment: (i: Investment) => void;
  deleteInvestment: (id: string) => void;
  suppliers: Supplier[];
  addSupplier: (s: Supplier) => void;
  updateSupplier: (s: Supplier) => void;
  deleteSupplier: (id: string) => void;
  salaries: Salary[];
  addSalary: (s: Salary) => void;
  updateSalary: (s: Salary) => void;
  deleteSalary: (id: string) => void;
  cajaChica: CajaChicaEntry[];
  addCajaChicaEntry: (e: CajaChicaEntry) => void;
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

// Settings stored in localStorage since no settings table exists
function saveLocalSetting(key: string, value: unknown) {
  try { localStorage.setItem(`store_${key}`, JSON.stringify(value)); } catch {}
}
function loadLocalSetting<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(`store_${key}`);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

// ===== DB → App mappers =====

function dbToProduct(row: any, variations: ProductVariation[]): Product {
  return {
    id: row.id,
    name: row.nombre || '',          // Lee 'nombre'
    sku: row.sku || '',
    category: row.descripcion || '', // Lee 'descripcion' (aquí estaba el error)
    subcategory: row.subcategory || '',
    costUSD: Number(row.cost_usd) || 0,
    priceUSD: Number(row.precio) || 0, // Lee 'precio'
    hasVariations: row.has_variations || false,
    variations,
    simpleStock: Number(row.stock) || 0, // Lee 'stock'
    photos: row.photos || [],
    lowStockThreshold: row.low_stock_threshold || 3,
    publishOnline: row.publish_online || false,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function dbToCustomer(row: any): Customer {
  return {
    id: row.id,
    name: row.name,
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
    type: row.type,
    items: (row.items as any) || [],
    customerId: row.customer_id || undefined,
    paymentMethod: row.payment_method,
    splitPayment: row.split_payment as any,
    totalUSD: Number(row.total_usd) || 0,
    totalLocal: Number(row.total_local) || 0,
    exchangeRate: Number(row.exchange_rate) || 0,
    discount: Number(row.discount) || 0,
    sellerId: row.seller_id || '',
    sellerName: row.seller_name || '',
    notes: row.notes || '',
    origin: row.origin || 'fisico',
    fulfillment: row.fulfillment || undefined,
    shippingAddress: row.shipping_address || undefined,
    trackingNumber: row.tracking_number || undefined,
    shippingCompany: row.shipping_company || undefined,
    voided: row.voided || false,
    returnReason: row.return_reason || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [exchangeRate, _setExchangeRate] = useState(() => loadLocalSetting('rate', 36.5));
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
  const [lowStockThreshold, _setLowStockThreshold] = useState(() => loadLocalSetting('low_stock', 3));
  const [customCategories, _setCustomCategories] = useState<Record<string, { label: string; subcategories: string[] }>>(() => loadLocalSetting('custom_categories', {}));
  const [customColors, _setCustomColors] = useState<string[]>(() => loadLocalSetting('custom_colors', []));
  const [customSizes, _setCustomSizes] = useState<string[]>(() => loadLocalSetting('custom_sizes', []));

  useEffect(() => {
    async function loadAll() {
      try {
        // Load products + variations
        const [{ data: prodRows }, { data: varRows }] = await Promise.all([
          supabase.from('productos').select('*').order('created_at', { ascending: false }),
          supabase.from('product_variations').select('*'),
        ]);

        const variationsByProduct: Record<string, ProductVariation[]> = {};
        (varRows || []).forEach((v: any) => {
          if (!variationsByProduct[v.product_id]) variationsByProduct[v.product_id] = [];
          variationsByProduct[v.product_id].push({ id: v.id, size: v.size || '', color: v.color || '', stock: v.stock || 0 });
        });

        setProducts((prodRows || []).map((r: any) => dbToProduct(r, variationsByProduct[r.id] || [])));

        // Load everything else in parallel
        const [
          { data: custRows },
          { data: txRows },
          { data: expRows },
          { data: apartRows },
          { data: pickRows },
          { data: invRows },
          { data: suppRows },
          { data: salRows },
          { data: cajaRows },
        ] = await Promise.all([
          supabase.from('clientes').select('*').order('created_at', { ascending: false }),
          supabase.from('transacciones').select('*').order('created_at', { ascending: false }),
          supabase.from('gastos').select('*').order('created_at', { ascending: false }),
          supabase.from('apartados').select('*').order('created_at', { ascending: false }),
          supabase.from('pickups').select('*').order('created_at', { ascending: false }),
          supabase.from('inversiones').select('*').order('created_at', { ascending: false }),
          supabase.from('proveedores').select('*').order('created_at', { ascending: false }),
          supabase.from('salarios').select('*').order('created_at', { ascending: false }),
          supabase.from('caja_chica').select('*').order('created_at', { ascending: false }),
        ]);

        setCustomers((custRows || []).map(dbToCustomer));
        setTransactions((txRows || []).map(dbToTransaction));
        setExpenses((expRows || []).map((r: any) => ({
          id: r.id, amount: Number(r.amount), currency: r.currency as 'USD' | 'LOCAL',
          category: r.category || '', description: r.description || '', date: r.date || '',
          exchangeRate: r.exchange_rate ? Number(r.exchange_rate) : undefined,
          receiptPhoto: r.receipt_photo || undefined, createdAt: r.created_at,
        })));
        setApartados((apartRows || []).map((r: any) => ({
          id: r.id, transactionId: r.transaction_id || '', customerId: r.customer_id || '',
          items: (r.items as any) || [], totalUSD: Number(r.total_usd),
          firstPayment: Number(r.first_payment), secondPayment: Number(r.second_payment),
          status: r.status || 'pendiente', createdAt: r.created_at,
          expiresAt: r.expires_at || '', completedAt: r.completed_at || undefined,
        })));
        setPickups((pickRows || []).map((r: any) => ({
          id: r.id, transactionId: r.transaction_id || '', customerId: r.customer_id || '',
          customerName: r.customer_name || '', items: (r.items as any) || [],
          status: r.status || 'pendiente', notes: r.notes || '',
          createdAt: r.created_at, deliveredAt: r.delivered_at || undefined,
        })));
        setInvestments((invRows || []).map((r: any) => ({
          id: r.id, concept: r.concept, totalCost: Number(r.total_cost),
          paidAmount: Number(r.paid_amount), month: r.month || '',
          status: r.status as 'en_camino' | 'ingresado', supplier: r.supplier || '',
          notes: r.notes || '', paymentHistory: (r.payment_history as any) || [],
          createdAt: r.created_at,
        })));
        setSuppliers((suppRows || []).map((r: any) => ({
          id: r.id, name: r.name, contact: r.contact || '',
          totalDebt: Number(r.total_debt), payments: (r.payments as any) || [],
          notes: r.notes || '', createdAt: r.created_at,
        })));
        setSalaries((salRows || []).map((r: any) => ({
          id: r.id, userId: r.user_id || '', userName: r.user_name || '',
          role: r.role as any, baseSalaryUSD: Number(r.base_salary_usd),
          paidAmount: Number(r.paid_amount), paymentHistory: (r.payment_history as any) || [],
          month: r.month || '', status: r.status as 'pendiente' | 'pagado',
          createdAt: r.created_at,
        })));
        setCajaChica((cajaRows || []).map((r: any) => ({
          id: r.id, type: r.type as 'ingreso' | 'egreso', amount: Number(r.amount),
          description: r.description || '', date: r.date || '', createdAt: r.created_at,
        })));
      } catch (err) {
        console.error('Error loading data from Supabase:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const setExchangeRate = useCallback((rate: number) => {
    _setExchangeRate(rate);
    saveLocalSetting('rate', rate);
  }, []);

  // ---- Products (tabla: productos) ----
// ---- Products (tabla: productos) ----
 const addProduct = useCallback(async (p: Product) => {
    // 1. Actualiza la pantalla de inmediato
    setProducts(prev => [p, ...prev]);

    // 2. Enviamos TODO, incluyendo el ID que genera la App
    const { error: prodError } = await supabase.from('productos').insert({
      id: p.id,               // <--- IMPORTANTE: Lo pusimos de vuelta
      nombre: p.name, 
      descripcion: p.category, 
      precio: p.priceUSD, 
      stock: p.simpleStock || 0
    });

    if (prodError) {
      console.error("❌ Error de Supabase:", prodError);
      alert("Error al guardar: " + prodError.message);
    } else {
      console.log("✅ ¡ÉXITO! Producto guardado con ID:", p.id);
    }

    // Si tienes variaciones, también se guardan
    if (p.variations.length > 0) {
      await supabase.from('product_variations').insert(
        p.variations.map(v => ({ 
          id: v.id, 
          product_id: p.id, 
          size: v.size, 
          color: v.color, 
          stock: v.stock 
        }))
      );
    }
  }, []);

  const updateProduct = useCallback(async (p: Product) => {
    setProducts(prev => prev.map(x => x.id === p.id ? p : x));
    
    const { error } = await supabase.from('productos').update({
      nombre: p.name, 
      descripcion: p.category, 
      precio: p.priceUSD, 
      stock: p.simpleStock || 0
    }).eq('id', p.id);

    if (error) alert("Error al actualizar: " + error.message);
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    setProducts(prev => prev.filter(x => x.id !== id));
    
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) alert("Error al borrar: " + error.message);
  }, []);

  // ---- Customers (tabla: clientes) ----
  const addCustomer = useCallback((c: Customer) => {
    setCustomers(prev => [c, ...prev]);
    supabase.from('clientes').insert({
      id: c.id, name: c.name, cedula: c.cedula, phone: c.phone, instagram: c.instagram,
      birthday: c.birthday, notes: c.notes, discount_codes: c.discountCodes,
      lifetime_spend: c.lifetimeSpend,
    });
  }, []);

  const updateCustomer = useCallback((c: Customer) => {
    setCustomers(prev => prev.map(x => x.id === c.id ? c : x));
    supabase.from('clientes').update({
      name: c.name, cedula: c.cedula, phone: c.phone, instagram: c.instagram,
      birthday: c.birthday, notes: c.notes, discount_codes: c.discountCodes,
      lifetime_spend: c.lifetimeSpend,
    }).eq('id', c.id);
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    setCustomers(prev => prev.filter(x => x.id !== id));
    supabase.from('clientes').delete().eq('id', id);
  }, []);

  // ---- Transactions (tabla: transacciones) ----
  const addTransaction = useCallback((t: Transaction) => {
    setTransactions(prev => [t, ...prev]);
    supabase.from('transacciones').insert({
      id: t.id, type: t.type, items: t.items as any, customer_id: t.customerId || null,
      payment_method: t.paymentMethod, split_payment: t.splitPayment as any || null,
      total_usd: t.totalUSD, total_local: t.totalLocal, exchange_rate: t.exchangeRate,
      discount: t.discount, seller_id: t.sellerId, seller_name: t.sellerName || null,
      notes: t.notes, origin: t.origin, fulfillment: t.fulfillment || null,
      shipping_address: t.shippingAddress || null, tracking_number: t.trackingNumber || null,
      shipping_company: t.shippingCompany || null, voided: t.voided || false,
      return_reason: t.returnReason || null,
    });
  }, []);

  const updateTransaction = useCallback((t: Transaction) => {
    setTransactions(prev => prev.map(x => x.id === t.id ? t : x));
    supabase.from('transacciones').update({
      type: t.type, items: t.items as any, customer_id: t.customerId || null,
      payment_method: t.paymentMethod, split_payment: t.splitPayment as any || null,
      total_usd: t.totalUSD, total_local: t.totalLocal, exchange_rate: t.exchangeRate,
      discount: t.discount, seller_id: t.sellerId, seller_name: t.sellerName || null,
      notes: t.notes, origin: t.origin, fulfillment: t.fulfillment || null,
      shipping_address: t.shippingAddress || null, tracking_number: t.trackingNumber || null,
      shipping_company: t.shippingCompany || null, voided: t.voided || false,
      return_reason: t.returnReason || null,
    }).eq('id', t.id);
  }, []);

  // ---- Expenses (tabla: gastos) ----
  const addExpense = useCallback((e: Expense) => {
    setExpenses(prev => [e, ...prev]);
    supabase.from('gastos').insert({
      id: e.id, amount: e.amount, currency: e.currency, category: e.category,
      description: e.description, date: e.date, exchange_rate: e.exchangeRate || null,
      receipt_photo: e.receiptPhoto || null,
    });
  }, []);

  const updateExpense = useCallback((e: Expense) => {
    setExpenses(prev => prev.map(x => x.id === e.id ? e : x));
    supabase.from('gastos').update({
      amount: e.amount, currency: e.currency, category: e.category,
      description: e.description, date: e.date, exchange_rate: e.exchangeRate || null,
      receipt_photo: e.receiptPhoto || null,
    }).eq('id', e.id);
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(x => x.id !== id));
    supabase.from('gastos').delete().eq('id', id);
  }, []);

  // ---- Apartados ----
  const addApartado = useCallback((a: Apartado) => {
    setApartados(prev => [a, ...prev]);
    supabase.from('apartados').insert({
      id: a.id, transaction_id: a.transactionId, customer_id: a.customerId,
      items: a.items as any, total_usd: a.totalUSD, first_payment: a.firstPayment,
      second_payment: a.secondPayment, status: a.status,
      expires_at: a.expiresAt, completed_at: a.completedAt || null,
    });
  }, []);

  const updateApartado = useCallback((a: Apartado) => {
    setApartados(prev => prev.map(x => x.id === a.id ? a : x));
    supabase.from('apartados').update({
      transaction_id: a.transactionId, customer_id: a.customerId,
      items: a.items as any, total_usd: a.totalUSD, first_payment: a.firstPayment,
      second_payment: a.secondPayment, status: a.status,
      expires_at: a.expiresAt, completed_at: a.completedAt || null,
    }).eq('id', a.id);
  }, []);

  // ---- Pickups ----
  const addPickup = useCallback((p: Pickup) => {
    setPickups(prev => [p, ...prev]);
    supabase.from('pickups').insert({
      id: p.id, transaction_id: p.transactionId, customer_id: p.customerId,
      customer_name: p.customerName, items: p.items as any, status: p.status,
      notes: p.notes, delivered_at: p.deliveredAt || null,
    });
  }, []);

  const updatePickup = useCallback((p: Pickup) => {
    setPickups(prev => prev.map(x => x.id === p.id ? p : x));
    supabase.from('pickups').update({
      transaction_id: p.transactionId, customer_id: p.customerId,
      customer_name: p.customerName, items: p.items as any, status: p.status,
      notes: p.notes, delivered_at: p.deliveredAt || null,
    }).eq('id', p.id);
  }, []);

  // ---- Investments (tabla: inversiones) ----
  const addInvestment = useCallback((i: Investment) => {
    setInvestments(prev => [i, ...prev]);
    supabase.from('inversiones').insert({
      id: i.id, concept: i.concept, total_cost: i.totalCost, paid_amount: i.paidAmount,
      month: i.month, status: i.status, supplier: i.supplier || null,
      notes: i.notes, payment_history: i.paymentHistory as any,
    });
  }, []);

  const updateInvestment = useCallback((i: Investment) => {
    setInvestments(prev => prev.map(x => x.id === i.id ? i : x));
    supabase.from('inversiones').update({
      concept: i.concept, total_cost: i.totalCost, paid_amount: i.paidAmount,
      month: i.month, status: i.status, supplier: i.supplier || null,
      notes: i.notes, payment_history: i.paymentHistory as any,
    }).eq('id', i.id);
  }, []);

  const deleteInvestment = useCallback((id: string) => {
    setInvestments(prev => prev.filter(x => x.id !== id));
    supabase.from('inversiones').delete().eq('id', id);
  }, []);

  // ---- Suppliers (tabla: proveedores) ----
  const addSupplier = useCallback((s: Supplier) => {
    setSuppliers(prev => [s, ...prev]);
    supabase.from('proveedores').insert({
      id: s.id, name: s.name, contact: s.contact, total_debt: s.totalDebt,
      payments: s.payments as any, notes: s.notes,
    });
  }, []);

  const updateSupplier = useCallback((s: Supplier) => {
    setSuppliers(prev => prev.map(x => x.id === s.id ? s : x));
    supabase.from('proveedores').update({
      name: s.name, contact: s.contact, total_debt: s.totalDebt,
      payments: s.payments as any, notes: s.notes,
    }).eq('id', s.id);
  }, []);

  const deleteSupplier = useCallback((id: string) => {
    setSuppliers(prev => prev.filter(x => x.id !== id));
    supabase.from('proveedores').delete().eq('id', id);
  }, []);

  // ---- Salaries (tabla: salarios) ----
  const addSalary = useCallback((s: Salary) => {
    setSalaries(prev => [s, ...prev]);
    supabase.from('salarios').insert({
      id: s.id, user_id: s.userId, user_name: s.userName, role: s.role,
      base_salary_usd: s.baseSalaryUSD, paid_amount: s.paidAmount,
      payment_history: s.paymentHistory as any, month: s.month, status: s.status,
    });
  }, []);

  const updateSalary = useCallback((s: Salary) => {
    setSalaries(prev => prev.map(x => x.id === s.id ? s : x));
    supabase.from('salarios').update({
      user_id: s.userId, user_name: s.userName, role: s.role,
      base_salary_usd: s.baseSalaryUSD, paid_amount: s.paidAmount,
      payment_history: s.paymentHistory as any, month: s.month, status: s.status,
    }).eq('id', s.id);
  }, []);

  const deleteSalary = useCallback((id: string) => {
    setSalaries(prev => prev.filter(x => x.id !== id));
    supabase.from('salarios').delete().eq('id', id);
  }, []);

  // ---- Caja Chica ----
  const addCajaChicaEntry = useCallback((e: CajaChicaEntry) => {
    setCajaChica(prev => [e, ...prev]);
    supabase.from('caja_chica').insert({
      id: e.id, type: e.type, amount: e.amount, description: e.description, date: e.date,
    });
  }, []);

  // ---- Settings (localStorage) ----
  const setLowStockThreshold = useCallback((n: number) => {
    _setLowStockThreshold(n);
    saveLocalSetting('low_stock', n);
  }, []);

  const setCustomCategories = useCallback<React.Dispatch<React.SetStateAction<Record<string, { label: string; subcategories: string[] }>>>>((val) => {
    _setCustomCategories(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      saveLocalSetting('custom_categories', next);
      return next;
    });
  }, []);

  const setCustomColors = useCallback<React.Dispatch<React.SetStateAction<string[]>>>((val) => {
    _setCustomColors(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      saveLocalSetting('custom_colors', next);
      return next;
    });
  }, []);

  const setCustomSizes = useCallback<React.Dispatch<React.SetStateAction<string[]>>>((val) => {
    _setCustomSizes(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      saveLocalSetting('custom_sizes', next);
      return next;
    });
  }, []);

  return (
    <StoreContext.Provider value={{
      loading,
      exchangeRate, setExchangeRate,
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
