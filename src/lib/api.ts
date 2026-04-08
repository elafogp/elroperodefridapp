const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${msg}`);
  }
  return res.json();
}

export const api = {
  // Products
  getProducts: () => request<any[]>('/productos'),
  createProduct: (p: any) => request<any>('/productos', { method: 'POST', body: JSON.stringify(p) }),
  updateProduct: (id: string, p: any) => request<any>(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  deleteProduct: (id: string) => request<void>(`/productos/${id}`, { method: 'DELETE' }),

  // Variations
  getVariations: () => request<any[]>('/product_variations'),
  createVariations: (vars: any[]) => request<any>('/product_variations', { method: 'POST', body: JSON.stringify(vars) }),
  deleteVariationsByProduct: (productId: string) => request<void>(`/product_variations/by-product/${productId}`, { method: 'DELETE' }),

  // Customers
  getCustomers: () => request<any[]>('/clientes'),
  createCustomer: (c: any) => request<any>('/clientes', { method: 'POST', body: JSON.stringify(c) }),
  updateCustomer: (id: string, c: any) => request<any>(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(c) }),
  deleteCustomer: (id: string) => request<void>(`/clientes/${id}`, { method: 'DELETE' }),

  // Transactions
  getTransactions: () => request<any[]>('/transacciones'),
  createTransaction: (t: any) => request<any>('/transacciones', { method: 'POST', body: JSON.stringify(t) }),
  updateTransaction: (id: string, t: any) => request<any>(`/transacciones/${id}`, { method: 'PUT', body: JSON.stringify(t) }),

  // Expenses
  getExpenses: () => request<any[]>('/gastos'),
  createExpense: (e: any) => request<any>('/gastos', { method: 'POST', body: JSON.stringify(e) }),
  updateExpense: (id: string, e: any) => request<any>(`/gastos/${id}`, { method: 'PUT', body: JSON.stringify(e) }),
  deleteExpense: (id: string) => request<void>(`/gastos/${id}`, { method: 'DELETE' }),

  // Caja Chica
  getCajaChica: () => request<any[]>('/caja_chica'),
  createCajaChica: (e: any) => request<any>('/caja_chica', { method: 'POST', body: JSON.stringify(e) }),

  // Apartados
  getApartados: () => request<any[]>('/apartados'),
  createApartado: (a: any) => request<any>('/apartados', { method: 'POST', body: JSON.stringify(a) }),
  updateApartado: (id: string, a: any) => request<any>(`/apartados/${id}`, { method: 'PUT', body: JSON.stringify(a) }),

  // Pickups
  getPickups: () => request<any[]>('/pickups'),
  createPickup: (p: any) => request<any>('/pickups', { method: 'POST', body: JSON.stringify(p) }),
  updatePickup: (id: string, p: any) => request<any>(`/pickups/${id}`, { method: 'PUT', body: JSON.stringify(p) }),

  // Investments
  getInvestments: () => request<any[]>('/inversiones'),
  createInvestment: (i: any) => request<any>('/inversiones', { method: 'POST', body: JSON.stringify(i) }),
  updateInvestment: (id: string, i: any) => request<any>(`/inversiones/${id}`, { method: 'PUT', body: JSON.stringify(i) }),
  deleteInvestment: (id: string) => request<void>(`/inversiones/${id}`, { method: 'DELETE' }),

  // Suppliers
  getSuppliers: () => request<any[]>('/proveedores'),
  createSupplier: (s: any) => request<any>('/proveedores', { method: 'POST', body: JSON.stringify(s) }),
  updateSupplier: (id: string, s: any) => request<any>(`/proveedores/${id}`, { method: 'PUT', body: JSON.stringify(s) }),
  deleteSupplier: (id: string) => request<void>(`/proveedores/${id}`, { method: 'DELETE' }),

  // Salaries
  getSalaries: () => request<any[]>('/salarios'),
  createSalary: (s: any) => request<any>('/salarios', { method: 'POST', body: JSON.stringify(s) }),
  updateSalary: (id: string, s: any) => request<any>(`/salarios/${id}`, { method: 'PUT', body: JSON.stringify(s) }),
  deleteSalary: (id: string) => request<void>(`/salarios/${id}`, { method: 'DELETE' }),

  // Exchange rate
  getExchangeRate: (fecha: string) => request<any>(`/tasas_cambio/${fecha}`).catch(() => null),
  upsertExchangeRate: (fecha: string, valor: number) =>
    request<any>('/tasas_cambio', { method: 'POST', body: JSON.stringify({ fecha, valor }) }),

  // Stock discount
  discountStock: (productId: string, variationId: string | null, qty: number) =>
    request<any>('/stock/discount', { method: 'POST', body: JSON.stringify({ productId, variationId, qty }) }),
};
