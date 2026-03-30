export type UserRole = 'admin' | 'seller' | 'warehouse';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  password?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  subcategory: string;
  costUSD: number;
  priceUSD: number;
  hasVariations: boolean;
  variations: ProductVariation[];
  simpleStock?: number;
  photos: string[];
  lowStockThreshold: number;
  publishOnline: boolean;
  createdAt: string;
}

export interface ProductVariation {
  id: string;
  size: string;
  color: string;
  stock: number;
}

export interface Customer {
  id: string;
  name: string;
  cedula: string;
  phone: string;
  instagram?: string;
  birthday: string;
  notes: string;
  discountCodes: string[];
  lifetimeSpend: number;
  createdAt: string;
}

export type TransactionType = 'sale' | 'exchange' | 'warranty' | 'apartado';
export type PaymentMethod = 'divisa' | 'pago_movil' | 'zelle' | 'mixto';
export type SalesOrigin = 'fisico' | 'redes';
export type FulfillmentType = 'encomienda' | 'delivery' | 'recoge_en_tienda';
export type ApartadoStatus = 'pendiente' | 'completado' | 'vencido';
export type PickupStatus = 'pendiente' | 'entregado';

export interface SplitPayment {
  divisa: number;
  pago_movil: number;
  zelle: number;
}

export interface CartItem {
  product: Product;
  variation?: ProductVariation;
  quantity: number;
  priceUSD: number;
  discount: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  items: CartItem[];
  customerId?: string;
  paymentMethod: PaymentMethod;
  splitPayment?: SplitPayment;
  totalUSD: number;
  totalLocal: number;
  exchangeRate: number;
  discount: number;
  sellerId: string;
  sellerName?: string;
  notes: string;
  origin: SalesOrigin;
  fulfillment?: FulfillmentType;
  shippingAddress?: string;
  trackingNumber?: string;
  shippingCompany?: string;
  voided?: boolean;
  returnReason?: string;
  createdAt: string;
}

export interface Apartado {
  id: string;
  transactionId: string;
  customerId: string;
  items: CartItem[];
  totalUSD: number;
  firstPayment: number;
  secondPayment: number;
  status: ApartadoStatus;
  createdAt: string;
  expiresAt: string;
  completedAt?: string;
}

export interface Pickup {
  id: string;
  transactionId: string;
  customerId: string;
  customerName: string;
  items: CartItem[];
  status: PickupStatus;
  notes: string;
  createdAt: string;
  deliveredAt?: string;
}

export interface Expense {
  id: string;
  amount: number;
  currency: 'USD' | 'LOCAL';
  category: string;
  description: string;
  date: string;
  exchangeRate?: number;
  receiptPhoto?: string;
  createdAt: string;
}

export interface DailyClose {
  id: string;
  date: string;
  sellerId: string;
  totalDivisa: number;
  totalPagoMovil: number;
  totalZelle: number;
  transactionCount: number;
  createdAt: string;
}

export interface InvestmentPayment {
  id: string;
  amount: number;
  date: string;
  notes: string;
}

export interface Investment {
  id: string;
  concept: string;
  totalCost: number;
  paidAmount: number;
  month: string;
  status: 'en_camino' | 'ingresado';
  supplier?: string;
  notes: string;
  paymentHistory: InvestmentPayment[];
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  amount: number;
  date: string;
  notes: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  totalDebt: number;
  payments: SupplierPayment[];
  notes: string;
  createdAt: string;
}

export interface SalaryPayment {
  id: string;
  amount: number;
  date: string;
  notes: string;
}

export interface Salary {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  baseSalaryUSD: number;
  paidAmount: number;
  paymentHistory: SalaryPayment[];
  month: string;
  status: 'pendiente' | 'pagado';
  createdAt: string;
}

export interface CajaChicaEntry {
  id: string;
  type: 'ingreso' | 'egreso';
  amount: number;
  description: string;
  date: string;
  createdAt: string;
}

export const CATEGORIES: Record<string, { label: string; subcategories: string[] }> = {
  women: {
    label: 'Mujer',
    subcategories: ['Blazers', 'Pantalones', 'Zapatos', 'Accesorios', 'Suéteres', 'Blusas', 'Vestidos', 'Faldas'],
  },
  girls: {
    label: 'Niñas',
    subcategories: ['General'],
  },
};

export const EXPENSE_CATEGORIES = [
  'Alquiler', 'Servicios', 'Transporte', 'Empaque', 'Marketing', 'Mantenimiento', 'Caja Chica', 'Otro'
];

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '35', '36', '37', '38', '39', '40'];
export const COLORS = [
  'Negro', 'Blanco', 'Beige', 'Camel', 'Rosa', 'Lila', 'Azul', 'Rojo', 'Verde', 'Gris', 'Marrón',
];
