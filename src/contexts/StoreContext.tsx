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

function saveLocal(key: string, value: unknown) {
  try { localStorage.setItem(`store_${key}`, JSON.stringify(value)); } catch {}
}
function loadLocal<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(`store_${key}`); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

// ── helpers: today as YYYY-MM-DD ──
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ══════════════════════════════════════
//  DB → App mappers  (match REAL columns)
// ══════════════════════════════════════

// productos: id, nombre, descripcion, precio, stock, created_at
function dbToProduct(row: any, variations: ProductVariation[]): Product {
  return {
    id: row.id,
    name: row.nombre || '',
    sku: '',
    category: row.descripcion || '',
    subcategory: '',
    costUSD: 0,
    priceUSD: Number(row.precio) || 0,
    hasVariations: variations.length > 0,
    variations,
    simpleStock: Number(row.stock) || 0,
    photos: [],
    lowStockThreshold: 3,
    publishOnline: false,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

// product_variations: id, product_id, size, color, stock, created_at
function dbToVariation(v: any): ProductVariation {
  return { id: v.id, size: v.size || '', color: v.color || '', stock: Number(v.stock) || 0 };
}

// clientes: id, name, cedula, phone, instagram, notes, created_at
function dbToCustomer(row: any): Customer {
  return {
    id: row.id,
    name: row.name || '',
    cedula: row.cedula || '',
    phone: row.phone || '',
    instagram: row.instagram || '',
    birthday: '',
    notes: row.notes || '',
    discountCodes: [],
    lifetimeSpend: 0,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

// transacciones: id, items, cliente_id, metodo_pago, total_usd, total_local, tasa_usada, created_at
function dbToTransaction(row: any): Transaction {
  return {
    id: row.id,
    type: 'sale',
    items: (row.items as any) || [],
    customerId: row.cliente_id || undefined,
    paymentMethod: row.metodo_pago || 'efectivo',
    splitPayment: undefined,
    totalUSD: Number(row.total_usd) || 0,
    totalLocal: Number(row.total_local) || 0,
    exchangeRate: Number(row.tasa_usada) || 0,
    discount: 0,
    sellerId: '',
    sellerName: '',
    notes: '',
    origin: 'fisico',
    voided: false,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

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
  const [lowStockThreshold, _setLowStockThreshold] = useState(() => loadLocal('low_stock', 3));
  const [customCategories, _setCustomCategories] = useState<Record<string, { label: string; subcategories: string[] }>>(() => loadLocal('custom_categories', {}));
  const [customColors, _setCustomColors] = useState<string[]>(() => loadLocal('custom_colors', []));
  const [customSizes, _setCustomSizes] = useState<string[]>(() => loadLocal('custom_sizes', []));

  // ── Load all data on mount ──
  useEffect(() => {
    async function loadAll() {
      try {
        // 1. Exchange rate from tasas_cambio (today's row)
        const { data: rateRow } = await supabase
          .from('tasas_cambio')
          .select('valor')
          .eq('fecha', todayStr())
          .maybeSingle();
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
          // gastos: id, descripcion, fecha, monto
          supabase.from('gastos').select('*').order('fecha', { ascending: false }),
          supabase.from('apartados').select('*'),
          supabase.from('pickups').select('*'),
          // inversiones: id, descripcion, fecha, monto
          supabase.from('inversiones').select('*').order('fecha', { ascending: false }),
          supabase.from('proveedores').select('*'),
          supabase.from('salarios').select('*'),
          supabase.from('caja_chica').select('*').order('created_at', { ascending: false }),
        ]);

        setCustomers((custRows || []).map(dbToCustomer));
        setTransactions((txRows || []).map(dbToTransaction));

        // gastos → Expense
        setExpenses((expRows || []).map((r: any) => ({
          id: r.id,
          amount: Number(r.monto) || 0,
          currency: 'USD' as const,
          category: '',
          description: r.descripcion || '',
          date: r.fecha || '',
          createdAt: r.fecha || new Date().toISOString(),
        })));

        // apartados (minimal: id, cliente_id)
        setApartados((apartRows || []).map((r: any) => ({
          id: r.id,
          transactionId: '',
          customerId: r.cliente_id || '',
          items: [],
          totalUSD: 0,
          firstPayment: 0,
          secondPayment: 0,
          status: 'pendiente' as const,
          createdAt: new Date().toISOString(),
          expiresAt: '',
        })));

        // pickups (minimal: id, transaccion_id, estado)
        setPickups((pickRows || []).map((r: any) => ({
          id: r.id,
          transactionId: r.transaccion_id || '',
          customerId: '',
          customerName: '',
          items: [],
          status: r.estado || 'pendiente',
          notes: '',
          createdAt: new Date().toISOString(),
        })));

        // inversiones → Investment
        setInvestments((invRows || []).map((r: any) => ({
          id: r.id,
          concept: r.descripcion || '',
          totalCost: Number(r.monto) || 0,
          paidAmount: 0,
          month: r.fecha || '',
          status: 'en_camino' as const,
          supplier: '',
          notes: '',
          paymentHistory: [],
          createdAt: r.fecha || new Date().toISOString(),
        })));

        // proveedores → Supplier
        setSuppliers((suppRows || []).map((r: any) => ({
          id: r.id,
          name: r.nombre || '',
          contact: r.contacto || '',
          totalDebt: 0,
          payments: [],
          notes: '',
          createdAt: new Date().toISOString(),
        })));

        // salarios → Salary
        setSalaries((salRows || []).map((r: any) => ({
          id: r.id,
          userId: '',
          userName: '',
          role: 'vendedor' as any,
          baseSalaryUSD: Number(r.monto) || 0,
          paidAmount: 0,
          paymentHistory: [],
          month: '',
          status: 'pendiente' as const,
          createdAt: new Date().toISOString(),
        })));

        // caja_chica: id, tipo, monto, descripcion, fecha, created_at
        setCajaChica((cajaRows || []).map((r: any) => ({
          id: r.id,
          type: r.tipo === 'egreso' ? 'egreso' : 'ingreso',
          amount: Number(r.monto) || 0,
          description: r.descripcion || '',
          date: r.fecha || '',
          createdAt: r.created_at || new Date().toISOString(),
        })));
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  // ── Exchange rate: upsert to tasas_cambio ──
  const setExchangeRate = useCallback(async (rate: number) => {
    _setExchangeRate(rate);
    const fecha = todayStr();
    await supabase.from('tasas_cambio').upsert(
      { fecha, valor: rate },
      { onConflict: 'fecha' }
    );
  }, []);

  // ── Products ──
  const addProduct = useCallback(async (p: Product) => {
    setProducts(prev => [p, ...prev]);
    const { error } = await supabase.from('productos').insert({
      id: p.id,
      nombre: p.name,
      descripcion: p.category,
      precio: p.priceUSD,
      stock: p.simpleStock || 0,
    });
    if (error) console.error('addProduct error:', error);

    if (p.variations.length > 0) {
      await supabase.from('product_variations').insert(
        p.variations.map(v => ({ id: v.id, product_id: p.id, size: v.size, color: v.color, stock: v.stock }))
      );
    }
  }, []);

  const updateProduct = useCallback(async (p: Product) => {
    setProducts(prev => prev.map(x => x.id === p.id ? p : x));
    await supabase.from('productos').update({
      nombre: p.name,
      descripcion: p.category,
      precio: p.priceUSD,
      stock: p.simpleStock || 0,
    }).eq('id', p.id);
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    setProducts(prev => prev.filter(x => x.id !== id));
    await supabase.from('productos').delete().eq('id', id);
  }, []);

  // ── Customers ──
  const addCustomer = useCallback(async (c: Customer) => {
    setCustomers(prev => [c, ...prev]);
    await supabase.from('clientes').insert({
      id: c.id, name: c.name, cedula: c.cedula, phone: c.phone,
      instagram: c.instagram, notes: c.notes,
    });
  }, []);

  const updateCustomer = useCallback(async (c: Customer) => {
    setCustomers(prev => prev.map(x => x.id === c.id ? c : x));
    await supabase.from('clientes').update({
      name: c.name, cedula: c.cedula, phone: c.phone,
      instagram: c.instagram, notes: c.notes,
    }).eq('id', c.id);
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    setCustomers(prev => prev.filter(x => x.id !== id));
    await supabase.from('clientes').delete().eq('id', id);
  }, []);

  // ── Transactions (+ stock discount) ──
  const addTransaction = useCallback(async (t: Transaction) => {
    setTransactions(prev => [t, ...prev]);

    // 1. Insert transaction
    await supabase.from('transacciones').insert({
      id: t.id,
      items: t.items as any,
      cliente_id: t.customerId || null,
      metodo_pago: t.paymentMethod,
      total_usd: t.totalUSD,
      total_local: t.totalLocal,
      tasa_usada: t.exchangeRate,
    });

    // 2. Discount stock for each item
    for (const item of t.items) {
      if (item.variationId) {
        // Discount from product_variations
        const { data: vRow } = await supabase
          .from('product_variations')
          .select('stock')
          .eq('id', item.variationId)
          .single();
        if (vRow) {
          await supabase.from('product_variations')
            .update({ stock: Math.max(0, vRow.stock - item.quantity) })
            .eq('id', item.variationId);
        }
      } else {
        // Discount from productos.stock
        const { data: pRow } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', item.productId)
          .single();
        if (pRow) {
          await supabase.from('productos')
            .update({ stock: Math.max(0, pRow.stock - item.quantity) })
            .eq('id', item.productId);
        }
      }

      // Update local state stock
      setProducts(prev => prev.map(prod => {
        if (prod.id !== item.productId) return prod;
        if (item.variationId) {
          return {
            ...prod,
            variations: prod.variations.map(v =>
              v.id === item.variationId ? { ...v, stock: Math.max(0, v.stock - item.quantity) } : v
            ),
          };
        }
        return { ...prod, simpleStock: Math.max(0, prod.simpleStock - item.quantity) };
      }));
    }
  }, []);

  const updateTransaction = useCallback(async (t: Transaction) => {
    setTransactions(prev => prev.map(x => x.id === t.id ? t : x));
    await supabase.from('transacciones').update({
      items: t.items as any,
      cliente_id: t.customerId || null,
      metodo_pago: t.paymentMethod,
      total_usd: t.totalUSD,
      total_local: t.totalLocal,
      tasa_usada: t.exchangeRate,
    }).eq('id', t.id);
  }, []);

  // ── Expenses (gastos: id, descripcion, fecha, monto) ──
  const addExpense = useCallback(async (e: Expense) => {
    setExpenses(prev => [e, ...prev]);
    await supabase.from('gastos').insert({
      id: e.id, descripcion: e.description, fecha: e.date, monto: e.amount,
    });
  }, []);

  const updateExpense = useCallback(async (e: Expense) => {
    setExpenses(prev => prev.map(x => x.id === e.id ? e : x));
    await supabase.from('gastos').update({
      descripcion: e.description, fecha: e.date, monto: e.amount,
    }).eq('id', e.id);
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    setExpenses(prev => prev.filter(x => x.id !== id));
    await supabase.from('gastos').delete().eq('id', id);
  }, []);

  // ── Apartados (minimal: id, cliente_id) ──
  const addApartado = useCallback(async (a: Apartado) => {
    setApartados(prev => [a, ...prev]);
    await supabase.from('apartados').insert({ id: a.id, cliente_id: a.customerId || null });
  }, []);

  const updateApartado = useCallback(async (a: Apartado) => {
    setApartados(prev => prev.map(x => x.id === a.id ? a : x));
    await supabase.from('apartados').update({ cliente_id: a.customerId || null }).eq('id', a.id);
  }, []);

  // ── Pickups (minimal: id, transaccion_id, estado) ──
  const addPickup = useCallback(async (p: Pickup) => {
    setPickups(prev => [p, ...prev]);
    await supabase.from('pickups').insert({
      id: p.id, transaccion_id: p.transactionId || null, estado: p.status,
    });
  }, []);

  const updatePickup = useCallback(async (p: Pickup) => {
    setPickups(prev => prev.map(x => x.id === p.id ? p : x));
    await supabase.from('pickups').update({
      transaccion_id: p.transactionId || null, estado: p.status,
    }).eq('id', p.id);
  }, []);

  // ── Investments (inversiones: id, descripcion, fecha, monto) ──
  const addInvestment = useCallback(async (i: Investment) => {
    setInvestments(prev => [i, ...prev]);
    await supabase.from('inversiones').insert({
      id: i.id, descripcion: i.concept, fecha: i.month, monto: i.totalCost,
    });
  }, []);

  const updateInvestment = useCallback(async (i: Investment) => {
    setInvestments(prev => prev.map(x => x.id === i.id ? i : x));
    await supabase.from('inversiones').update({
      descripcion: i.concept, fecha: i.month, monto: i.totalCost,
    }).eq('id', i.id);
  }, []);

  const deleteInvestment = useCallback(async (id: string) => {
    setInvestments(prev => prev.filter(x => x.id !== id));
    await supabase.from('inversiones').delete().eq('id', id);
  }, []);

  // ── Suppliers (proveedores: id, nombre, contacto) ──
  const addSupplier = useCallback(async (s: Supplier) => {
    setSuppliers(prev => [s, ...prev]);
    await supabase.from('proveedores').insert({ id: s.id, nombre: s.name, contacto: s.contact });
  }, []);

  const updateSupplier = useCallback(async (s: Supplier) => {
    setSuppliers(prev => prev.map(x => x.id === s.id ? s : x));
    await supabase.from('proveedores').update({ nombre: s.name, contacto: s.contact }).eq('id', s.id);
  }, []);

  const deleteSupplier = useCallback(async (id: string) => {
    setSuppliers(prev => prev.filter(x => x.id !== id));
    await supabase.from('proveedores').delete().eq('id', id);
  }, []);

  // ── Salaries (salarios: id, monto) ──
  const addSalary = useCallback(async (s: Salary) => {
    setSalaries(prev => [s, ...prev]);
    await supabase.from('salarios').insert({ id: s.id, monto: s.baseSalaryUSD });
  }, []);

  const updateSalary = useCallback(async (s: Salary) => {
    setSalaries(prev => prev.map(x => x.id === s.id ? s : x));
    await supabase.from('salarios').update({ monto: s.baseSalaryUSD }).eq('id', s.id);
  }, []);

  const deleteSalary = useCallback(async (id: string) => {
    setSalaries(prev => prev.filter(x => x.id !== id));
    await supabase.from('salarios').delete().eq('id', id);
  }, []);

  // ── Caja Chica (id, tipo, monto, descripcion, fecha, created_at) ──
  const addCajaChicaEntry = useCallback(async (e: CajaChicaEntry) => {
    setCajaChica(prev => [e, ...prev]);
    await supabase.from('caja_chica').insert({
      id: e.id, tipo: e.type, monto: e.amount, descripcion: e.description, fecha: e.date,
    });
  }, []);

  // ── Settings (localStorage - no settings table) ──
  const setLowStockThreshold = useCallback((n: number) => {
    _setLowStockThreshold(n); saveLocal('low_stock', n);
  }, []);

  const setCustomCategories = useCallback<React.Dispatch<React.SetStateAction<Record<string, { label: string; subcategories: string[] }>>>>((val) => {
    _setCustomCategories(prev => { const next = typeof val === 'function' ? val(prev) : val; saveLocal('custom_categories', next); return next; });
  }, []);

  const setCustomColors = useCallback<React.Dispatch<React.SetStateAction<string[]>>>((val) => {
    _setCustomColors(prev => { const next = typeof val === 'function' ? val(prev) : val; saveLocal('custom_colors', next); return next; });
  }, []);

  const setCustomSizes = useCallback<React.Dispatch<React.SetStateAction<string[]>>>((val) => {
    _setCustomSizes(prev => { const next = typeof val === 'function' ? val(prev) : val; saveLocal('custom_sizes', next); return next; });
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
