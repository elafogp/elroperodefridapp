import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
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
    id: row.id, name: row.name || '', cedula: row.cedula || '',
    phone: row.phone || '', instagram: row.instagram || '',
    birthday: row.birthday || '', notes: row.notes || '',
    discountCodes: row.discount_codes || [], lifetimeSpend: Number(row.lifetime_spend) || 0,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function dbToTransaction(row: any): Transaction {
  return {
    id: row.id, type: row.tipo || 'sale', items: row.items || [],
    customerId: row.cliente_id || undefined, paymentMethod: row.metodo_pago || 'divisa',
    splitPayment: row.split_payment || undefined, totalUSD: Number(row.total_usd) || 0,
    totalLocal: Number(row.total_local) || 0, exchangeRate: Number(row.tasa_usada) || 0,
    discount: Number(row.descuento) || 0, sellerId: row.seller_id || '',
    sellerName: row.seller_name || '', notes: row.notas || '',
    origin: row.origen || 'fisico', fulfillment: row.fulfillment || undefined,
    shippingAddress: row.shipping_address || undefined,
    trackingNumber: row.tracking_number || undefined,
    shippingCompany: row.shipping_company || undefined,
    voided: Boolean(row.voided), returnReason: row.return_reason || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function dbToExpense(r: any): Expense {
  return {
    id: r.id, amount: Number(r.monto) || 0,
    currency: (r.currency || 'USD') as 'USD' | 'LOCAL',
    category: r.categoria || '', description: r.descripcion || '',
    date: r.fecha || '', exchangeRate: r.tasa_cambio ? Number(r.tasa_cambio) : undefined,
    receiptPhoto: r.receipt_photo || undefined,
    createdAt: r.created_at || r.fecha || new Date().toISOString(),
  };
}

function dbToCajaChica(r: any): CajaChicaEntry {
  return {
    id: r.id, type: r.tipo === 'egreso' ? 'egreso' : 'ingreso',
    amount: Number(r.monto) || 0, description: r.descripcion || '',
    date: r.fecha || '', createdAt: r.created_at || new Date().toISOString(),
  };
}

function dbToApartado(r: any): Apartado {
  return {
    id: r.id, transactionId: r.transaccion_id || '', customerId: r.cliente_id || '',
    items: r.items || [], totalUSD: Number(r.total_usd) || 0,
    firstPayment: Number(r.first_payment) || 0, secondPayment: Number(r.second_payment) || 0,
    status: r.status || 'pendiente', createdAt: r.created_at || new Date().toISOString(),
    expiresAt: r.expires_at || '', completedAt: r.completed_at || undefined,
  };
}

function dbToPickup(r: any): Pickup {
  return {
    id: r.id, transactionId: r.transaccion_id || '', customerId: r.cliente_id || '',
    customerName: r.customer_name || '', items: r.items || [],
    status: r.estado || 'pendiente', notes: r.notas || '',
    createdAt: r.created_at || new Date().toISOString(),
    deliveredAt: r.delivered_at || undefined,
  };
}

function dbToInvestment(r: any): Investment {
  return {
    id: r.id, concept: r.descripcion || '', totalCost: Number(r.monto) || 0,
    paidAmount: Number(r.paid_amount) || 0, month: r.fecha || '',
    status: r.status || 'en_camino', supplier: r.supplier || '',
    notes: r.notas || '', paymentHistory: r.payment_history || [],
    createdAt: r.created_at || r.fecha || new Date().toISOString(),
  };
}

function dbToSupplier(r: any): Supplier {
  return {
    id: r.id, name: r.nombre || '', contact: r.contacto || '',
    totalDebt: Number(r.total_debt) || 0, payments: r.payments || [],
    notes: r.notas || '', createdAt: r.created_at || new Date().toISOString(),
  };
}

function dbToSalary(r: any): Salary {
  return {
    id: r.id, userId: r.user_id || '', userName: r.user_name || '',
    role: r.role || 'seller', baseSalaryUSD: Number(r.monto) || 0,
    paidAmount: Number(r.paid_amount) || 0, paymentHistory: r.payment_history || [],
    month: r.month || '', status: r.status || 'pendiente',
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
    try {
      const [prodRows, varRows] = await Promise.all([api.getProducts(), api.getVariations()]);
      const varsByProduct: Record<string, ProductVariation[]> = {};
      (varRows || []).forEach((v: any) => {
        if (!varsByProduct[v.product_id]) varsByProduct[v.product_id] = [];
        varsByProduct[v.product_id].push(dbToVariation(v));
      });
      setProducts((prodRows || []).map((r: any) => dbToProduct(r, varsByProduct[r.id] || [])));
    } catch (err) { console.error('refreshProducts:', err); }
  }, []);

  const refreshTransactions = useCallback(async () => {
    try {
      const data = await api.getTransactions();
      setTransactions((data || []).map(dbToTransaction));
    } catch (err) { console.error('refreshTransactions:', err); }
  }, []);

  const refreshCustomers = useCallback(async () => {
    try {
      const data = await api.getCustomers();
      setCustomers((data || []).map(dbToCustomer));
    } catch (err) { console.error('refreshCustomers:', err); }
  }, []);

  const refreshCajaChica = useCallback(async () => {
    try {
      const data = await api.getCajaChica();
      setCajaChica((data || []).map(dbToCajaChica));
    } catch (err) { console.error('refreshCajaChica:', err); }
  }, []);

  const refreshExpenses = useCallback(async () => {
    try {
      const data = await api.getExpenses();
      setExpenses((data || []).map(dbToExpense));
    } catch (err) { console.error('refreshExpenses:', err); }
  }, []);

  // ── Load all on mount ──
  useEffect(() => {
    async function loadAll() {
      try {
        const rateRow = await api.getExchangeRate(todayStr());
        if (rateRow?.valor) _setExchangeRate(Number(rateRow.valor));

        const [prodRows, varRows, custRows, txRows, expRows, apartRows, pickRows, invRows, suppRows, salRows, cajaRows] = await Promise.all([
          api.getProducts().catch(() => []),
          api.getVariations().catch(() => []),
          api.getCustomers().catch(() => []),
          api.getTransactions().catch(() => []),
          api.getExpenses().catch(() => []),
          api.getApartados().catch(() => []),
          api.getPickups().catch(() => []),
          api.getInvestments().catch(() => []),
          api.getSuppliers().catch(() => []),
          api.getSalaries().catch(() => []),
          api.getCajaChica().catch(() => []),
        ]);

        const varsByProduct: Record<string, ProductVariation[]> = {};
        (varRows || []).forEach((v: any) => {
          if (!varsByProduct[v.product_id]) varsByProduct[v.product_id] = [];
          varsByProduct[v.product_id].push(dbToVariation(v));
        });
        setProducts((prodRows || []).map((r: any) => dbToProduct(r, varsByProduct[r.id] || [])));
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

  // ── Exchange rate ──
  const setExchangeRate = useCallback(async (rate: number) => {
    _setExchangeRate(rate);
    try { await api.upsertExchangeRate(todayStr(), rate); } catch (err) { console.error('setExchangeRate:', err); }
  }, []);

  // ── Products ──
  const addProduct = useCallback(async (p: Product) => {
    try {
      await api.createProduct({
        id: p.id, sku: p.sku, nombre: p.name, categoria: p.category,
        subcategoria: p.subcategory, costo_usd: p.costUSD, precio: p.priceUSD,
        stock: p.simpleStock || 0, fotos: p.photos,
      });
      if (p.variations.length > 0) {
        await api.createVariations(p.variations.map(v => ({ id: v.id, product_id: p.id, size: v.size, color: v.color, stock: v.stock })));
      }
    } catch (err) { console.error('addProduct:', err); }
    await refreshProducts();
  }, [refreshProducts]);

  const updateProduct = useCallback(async (p: Product) => {
    try {
      await api.updateProduct(p.id, {
        sku: p.sku, nombre: p.name, categoria: p.category,
        subcategoria: p.subcategory, costo_usd: p.costUSD, precio: p.priceUSD,
        stock: p.simpleStock || 0, fotos: p.photos,
      });
      await api.deleteVariationsByProduct(p.id);
      if (p.variations.length > 0) {
        await api.createVariations(p.variations.map(v => ({ id: v.id, product_id: p.id, size: v.size, color: v.color, stock: v.stock })));
      }
    } catch (err) { console.error('updateProduct:', err); }
    await refreshProducts();
  }, [refreshProducts]);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      await api.deleteVariationsByProduct(id);
      await api.deleteProduct(id);
    } catch (err) { console.error('deleteProduct:', err); }
    await refreshProducts();
  }, [refreshProducts]);

  // ── Customers ──
  const addCustomer = useCallback(async (c: Customer) => {
    try { await api.createCustomer({ id: c.id, name: c.name, cedula: c.cedula, phone: c.phone, instagram: c.instagram, notes: c.notes }); } catch (err) { console.error(err); }
    await refreshCustomers();
  }, [refreshCustomers]);

  const updateCustomer = useCallback(async (c: Customer) => {
    try { await api.updateCustomer(c.id, { name: c.name, cedula: c.cedula, phone: c.phone, instagram: c.instagram, notes: c.notes }); } catch (err) { console.error(err); }
    await refreshCustomers();
  }, [refreshCustomers]);

  const deleteCustomer = useCallback(async (id: string) => {
    try { await api.deleteCustomer(id); } catch (err) { console.error(err); }
    await refreshCustomers();
  }, [refreshCustomers]);

  // ── Transactions + Stock ──
  const addTransaction = useCallback(async (t: Transaction) => {
    try {
      await api.createTransaction({
        id: t.id, tipo: t.type, items: t.items, cliente_id: t.customerId || null,
        metodo_pago: t.paymentMethod, split_payment: t.splitPayment || null,
        total_usd: t.totalUSD, total_local: t.totalLocal, tasa_usada: t.exchangeRate,
        descuento: t.discount, seller_id: t.sellerId, seller_name: t.sellerName || '',
        notas: t.notes, origen: t.origin, fulfillment: t.fulfillment || null,
        shipping_address: t.shippingAddress || null, tracking_number: t.trackingNumber || null,
        shipping_company: t.shippingCompany || null, voided: t.voided || false,
        return_reason: t.returnReason || null,
      });
      for (const item of t.items) {
        await api.discountStock(item.product.id, item.variation?.id || null, item.quantity);
      }
    } catch (err) { console.error('addTransaction:', err); }
    await Promise.all([refreshTransactions(), refreshProducts()]);
  }, [refreshTransactions, refreshProducts]);

  const updateTransaction = useCallback(async (t: Transaction) => {
    try {
      await api.updateTransaction(t.id, {
        tipo: t.type, items: t.items, cliente_id: t.customerId || null,
        metodo_pago: t.paymentMethod, total_usd: t.totalUSD, total_local: t.totalLocal,
        tasa_usada: t.exchangeRate, descuento: t.discount, voided: t.voided || false,
        return_reason: t.returnReason || null, notas: t.notes,
      });
    } catch (err) { console.error(err); }
    await refreshTransactions();
  }, [refreshTransactions]);

  // ── Expenses ──
  const addExpense = useCallback(async (e: Expense) => {
    try { await api.createExpense({ id: e.id, descripcion: e.description, fecha: e.date, monto: e.amount, categoria: e.category }); } catch (err) { console.error(err); }
    await refreshExpenses();
  }, [refreshExpenses]);

  const updateExpense = useCallback(async (e: Expense) => {
    try { await api.updateExpense(e.id, { descripcion: e.description, fecha: e.date, monto: e.amount, categoria: e.category }); } catch (err) { console.error(err); }
    await refreshExpenses();
  }, [refreshExpenses]);

  const deleteExpense = useCallback(async (id: string) => {
    try { await api.deleteExpense(id); } catch (err) { console.error(err); }
    await refreshExpenses();
  }, [refreshExpenses]);

  // ── Apartados ──
  const addApartado = useCallback(async (a: Apartado) => {
    try { await api.createApartado({ id: a.id, transaccion_id: a.transactionId, cliente_id: a.customerId, items: a.items, total_usd: a.totalUSD, first_payment: a.firstPayment, second_payment: a.secondPayment, status: a.status, expires_at: a.expiresAt }); } catch (err) { console.error(err); }
    try { const data = await api.getApartados(); setApartados((data || []).map(dbToApartado)); } catch {}
  }, []);

  const updateApartado = useCallback(async (a: Apartado) => {
    try { await api.updateApartado(a.id, { status: a.status, second_payment: a.secondPayment, completed_at: a.completedAt || null }); } catch (err) { console.error(err); }
    try { const data = await api.getApartados(); setApartados((data || []).map(dbToApartado)); } catch {}
  }, []);

  // ── Pickups ──
  const addPickup = useCallback(async (p: Pickup) => {
    try { await api.createPickup({ id: p.id, transaccion_id: p.transactionId, cliente_id: p.customerId, customer_name: p.customerName, items: p.items, estado: p.status, notas: p.notes }); } catch (err) { console.error(err); }
    try { const data = await api.getPickups(); setPickups((data || []).map(dbToPickup)); } catch {}
  }, []);

  const updatePickup = useCallback(async (p: Pickup) => {
    try { await api.updatePickup(p.id, { estado: p.status, delivered_at: p.deliveredAt || null }); } catch (err) { console.error(err); }
    try { const data = await api.getPickups(); setPickups((data || []).map(dbToPickup)); } catch {}
  }, []);

  // ── Investments ──
  const addInvestment = useCallback(async (i: Investment) => {
    try { await api.createInvestment({ id: i.id, descripcion: i.concept, fecha: i.month, monto: i.totalCost }); } catch (err) { console.error(err); }
    try { const data = await api.getInvestments(); setInvestments((data || []).map(dbToInvestment)); } catch {}
  }, []);

  const updateInvestment = useCallback(async (i: Investment) => {
    try { await api.updateInvestment(i.id, { descripcion: i.concept, fecha: i.month, monto: i.totalCost }); } catch (err) { console.error(err); }
    try { const data = await api.getInvestments(); setInvestments((data || []).map(dbToInvestment)); } catch {}
  }, []);

  const deleteInvestment = useCallback(async (id: string) => {
    try { await api.deleteInvestment(id); } catch (err) { console.error(err); }
    try { const data = await api.getInvestments(); setInvestments((data || []).map(dbToInvestment)); } catch {}
  }, []);

  // ── Suppliers ──
  const addSupplier = useCallback(async (s: Supplier) => {
    try { await api.createSupplier({ id: s.id, nombre: s.name, contacto: s.contact }); } catch (err) { console.error(err); }
    try { const data = await api.getSuppliers(); setSuppliers((data || []).map(dbToSupplier)); } catch {}
  }, []);

  const updateSupplier = useCallback(async (s: Supplier) => {
    try { await api.updateSupplier(s.id, { nombre: s.name, contacto: s.contact }); } catch (err) { console.error(err); }
    try { const data = await api.getSuppliers(); setSuppliers((data || []).map(dbToSupplier)); } catch {}
  }, []);

  const deleteSupplier = useCallback(async (id: string) => {
    try { await api.deleteSupplier(id); } catch (err) { console.error(err); }
    try { const data = await api.getSuppliers(); setSuppliers((data || []).map(dbToSupplier)); } catch {}
  }, []);

  // ── Salaries ──
  const addSalary = useCallback(async (s: Salary) => {
    try { await api.createSalary({ id: s.id, monto: s.baseSalaryUSD }); } catch (err) { console.error(err); }
    try { const data = await api.getSalaries(); setSalaries((data || []).map(dbToSalary)); } catch {}
  }, []);

  const updateSalary = useCallback(async (s: Salary) => {
    try { await api.updateSalary(s.id, { monto: s.baseSalaryUSD }); } catch (err) { console.error(err); }
    try { const data = await api.getSalaries(); setSalaries((data || []).map(dbToSalary)); } catch {}
  }, []);

  const deleteSalary = useCallback(async (id: string) => {
    try { await api.deleteSalary(id); } catch (err) { console.error(err); }
    try { const data = await api.getSalaries(); setSalaries((data || []).map(dbToSalary)); } catch {}
  }, []);

  // ── Caja Chica ──
  const addCajaChicaEntry = useCallback(async (e: CajaChicaEntry) => {
    try { await api.createCajaChica({ id: e.id, tipo: e.type, monto: e.amount, descripcion: e.description, fecha: e.date }); } catch (err) { console.error(err); }
    await refreshCajaChica();
  }, [refreshCajaChica]);

  // ── Settings (local only) ──
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
