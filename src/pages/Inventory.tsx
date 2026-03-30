import { useState, useMemo, useRef } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Product, ProductVariation } from '@/types';
import { CATEGORIES, SIZES, COLORS } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, X, Package, AlertTriangle, Trash2, Image, Download, Upload } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';

// Fuzzy matching: trim, lowercase, remove accents
function normalize(str: string): string {
  return str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function fuzzyMatch(input: string, candidates: string[]): string | null {
  const norm = normalize(input);
  if (!norm) return null;
  for (const c of candidates) {
    if (normalize(c) === norm) return c;
  }
  return null;
}

export default function Inventory() {
  const { products, addProduct, updateProduct, deleteProduct, lowStockThreshold, customCategories, setCustomCategories, customColors, setCustomColors, customSizes, setCustomSizes, transactions } = useStore();
  const { user } = useAuth();
  const isSeller = user?.role === 'seller';
  const isAdmin = user?.role === 'admin';
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const allCategories = useMemo(() => ({ ...CATEGORIES, ...customCategories }), [customCategories]);
  const allColors = useMemo(() => [...COLORS, ...customColors], [customColors]);
  const allSizes = useMemo(() => [...SIZES, ...customSizes], [customSizes]);

  const validTx = transactions.filter(t => !t.voided);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const lowStockProducts = products.filter(p => {
    if (p.hasVariations) return p.variations.some(v => v.stock > 0 && v.stock < lowStockThreshold);
    return (p.simpleStock || 0) > 0 && (p.simpleStock || 0) < lowStockThreshold;
  });

  const isDeadStock = (p: Product) => {
    const daysSince = differenceInDays(new Date(), parseISO(p.createdAt));
    if (daysSince < 30) return false;
    return !validTx.some(t => t.items.some(i => i.product.id === p.id));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['ID', 'Nombre', 'Categoría', 'Subcategoría', 'Precio USD', 'Costo USD', 'Stock', 'Talla', 'Color'],
      ['', 'Ejemplo Blusa', 'Mujer', 'Blusas', '25.00', '10.00', '5', 'M', 'Negro'],
      ['', 'Ejemplo Vestido', 'Mujer', 'Vestidos', '35.00', '15.00', '3', 'S', 'Rosa'],
    ]);
    // Add data validation notes
    ws['!cols'] = [
      { wch: 36 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
      { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');

    // Add a reference sheet with existing categories/sizes/colors
    const catLabels = Object.entries(allCategories).map(([k, v]) => [k, v.label, v.subcategories.join(', ')]);
    const refData = [
      ['--- CATEGORÍAS (puedes escribir nuevas) ---', '', ''],
      ['Clave', 'Nombre', 'Subcategorías'],
      ...catLabels,
      ['', '', ''],
      ['--- TALLAS (puedes escribir nuevas) ---', '', ''],
      ...allSizes.map(s => [s, '', '']),
      ['', '', ''],
      ['--- COLORES (puedes escribir nuevos) ---', '', ''],
      ...allColors.map(c => [c, '', '']),
    ];
    const refWs = XLSX.utils.aoa_to_sheet(refData);
    XLSX.utils.book_append_sheet(wb, refWs, 'Referencia');

    XLSX.writeFile(wb, 'plantilla_inventario.xlsx');
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      let created = 0, updated = 0;

      // Build lookup maps for fuzzy matching
      const catLabelToKey: Record<string, string> = {};
      Object.entries(allCategories).forEach(([k, v]) => {
        catLabelToKey[normalize(k)] = k;
        catLabelToKey[normalize(v.label)] = k;
      });

      rows.forEach(row => {
        const existingId = row['ID'] || row['id'] || '';
        const name = row['Nombre'] || row['nombre'] || '';
        if (!name) return;
        const price = parseFloat(row['Precio USD'] || row['precio'] || '0');
        const cost = parseFloat(row['Costo USD'] || row['costo'] || '0');
        const stock = parseInt(row['Stock'] || row['stock'] || '0');
        const rawCategory = String(row['Categoría'] || row['categoria'] || 'Mujer').trim();
        const rawSubcategory = String(row['Subcategoría'] || row['subcategoria'] || 'General').trim();
        const rawSize = String(row['Talla'] || row['talla'] || '').trim();
        const rawColor = String(row['Color'] || row['color'] || '').trim();

        // Fuzzy match category
        const normCat = normalize(rawCategory);
        let categoryKey = catLabelToKey[normCat];
        if (!categoryKey) {
          // Auto-create new category
          categoryKey = rawCategory.toLowerCase().replace(/\s+/g, '_');
          setCustomCategories(prev => ({
            ...prev,
            [categoryKey!]: { label: rawCategory, subcategories: ['General'] }
          }));
          catLabelToKey[normCat] = categoryKey;
          catLabelToKey[normalize(categoryKey)] = categoryKey;
        }

        // Fuzzy match subcategory
        const currentCat = allCategories[categoryKey];
        const existingSubs = currentCat?.subcategories || ['General'];
        let matchedSub = fuzzyMatch(rawSubcategory, existingSubs);
        if (!matchedSub && rawSubcategory) {
          // Auto-create subcategory
          matchedSub = rawSubcategory;
          setCustomCategories(prev => {
            const existing = prev[categoryKey!] || allCategories[categoryKey!] || { label: rawCategory, subcategories: [] };
            return {
              ...prev,
              [categoryKey!]: { ...existing, subcategories: [...existing.subcategories, rawSubcategory] }
            };
          });
        }

        // Fuzzy match size & color, auto-create if new
        let matchedSize = '';
        if (rawSize) {
          matchedSize = fuzzyMatch(rawSize, allSizes) || '';
          if (!matchedSize) {
            matchedSize = rawSize;
            setCustomSizes(prev => prev.includes(rawSize) ? prev : [...prev, rawSize]);
          }
        }
        let matchedColor = '';
        if (rawColor) {
          matchedColor = fuzzyMatch(rawColor, allColors) || '';
          if (!matchedColor) {
            matchedColor = rawColor;
            setCustomColors(prev => prev.includes(rawColor) ? prev : [...prev, rawColor]);
          }
        }

        // Check for existing product by ID
        if (existingId) {
          const existing = products.find(p => p.id === existingId);
          if (existing) {
            const updatedProduct = { ...existing, name, priceUSD: price, costUSD: cost, category: categoryKey, subcategory: matchedSub || 'General' };
            if (matchedSize && matchedColor) {
              // Update or add variation
              const existingVar = existing.variations.find(v => normalize(v.size) === normalize(matchedSize) && normalize(v.color) === normalize(matchedColor));
              if (existingVar) {
                updatedProduct.variations = existing.variations.map(v => v.id === existingVar.id ? { ...v, stock } : v);
              } else {
                updatedProduct.variations = [...existing.variations, { id: crypto.randomUUID(), size: matchedSize, color: matchedColor, stock }];
              }
              updatedProduct.hasVariations = true;
            } else {
              updatedProduct.simpleStock = stock;
            }
            updateProduct(updatedProduct);
            updated++;
            return;
          }
        }

        // Create new product
        const hasVar = !!(matchedSize && matchedColor);
        addProduct({
          id: crypto.randomUUID(), name, sku: '', category: categoryKey, subcategory: matchedSub || 'General',
          costUSD: cost, priceUSD: price,
          hasVariations: hasVar,
          variations: hasVar ? [{ id: crypto.randomUUID(), size: matchedSize, color: matchedColor, stock }] : [],
          simpleStock: hasVar ? undefined : stock,
          photos: [], lowStockThreshold: 3, publishOnline: false, createdAt: new Date().toISOString(),
        });
        created++;
      });
      alert(`Importación completa: ${created} creados, ${updated} actualizados`);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const exportInventory = () => {
    const data: any[] = [];
    products.forEach(p => {
      const catLabel = allCategories[p.category]?.label || p.category;
      if (p.hasVariations && p.variations.length > 0) {
        p.variations.forEach(v => {
          data.push({
            ID: p.id, Nombre: p.name, SKU: p.sku || '', Categoría: catLabel, Subcategoría: p.subcategory,
            'Precio USD': p.priceUSD, 'Costo USD': p.costUSD, Stock: v.stock, Talla: v.size, Color: v.color,
          });
        });
      } else {
        data.push({
          ID: p.id, Nombre: p.name, SKU: p.sku || '', Categoría: catLabel, Subcategoría: p.subcategory,
          'Precio USD': p.priceUSD, 'Costo USD': p.costUSD, Stock: p.simpleStock || 0, Talla: '', Color: '',
        });
      }
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, 'inventario.xlsx');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold">Inventario</h1>
          <p className="text-sm text-muted-foreground mt-1">{products.length} productos registrados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={downloadTemplate} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted">
            <Download className="w-3 h-3" />Plantilla Excel
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted">
            <Upload className="w-3 h-3" />Subir Excel
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} className="hidden" />
          {isAdmin && (
            <button onClick={exportInventory} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted">
              📥 Exportar
            </button>
          )}
          {isAdmin && (
            <button onClick={() => {
              const name = prompt('Nombre de la nueva categoría:');
              if (!name) return;
              const key = name.toLowerCase().replace(/\s+/g, '_');
              setCustomCategories(prev => ({ ...prev, [key]: { label: name, subcategories: ['General'] } }));
            }} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted">
              <Plus className="w-3 h-3" />Categoría
            </button>
          )}
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setEditProduct(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" />Nuevo Producto
          </motion.button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, SKU o escanear código..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-input bg-card text-sm">
          <option value="all">Todas las categorías</option>
          {Object.entries(allCategories).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="bg-camel/5 border border-camel/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-camel" />
            <h3 className="font-display text-lg font-semibold">Stock Bajo</h3>
          </div>
          <div className="space-y-2">
            {lowStockProducts.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between bg-card rounded-lg p-3 border border-border">
                <div>
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {p.hasVariations ? p.variations.filter(v => v.stock > 0 && v.stock < lowStockThreshold).map(v => `${v.size}/${v.color}: ${v.stock}`).join(', ') : `Stock: ${p.simpleStock}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No hay productos</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(product => {
            const totalStock = product.hasVariations ? product.variations.reduce((s, v) => s + v.stock, 0) : (product.simpleStock || 0);
            const dead = isDeadStock(product);
            return (
              <motion.div key={product.id} layout className={`bg-card border rounded-xl p-5 shadow-soft hover:shadow-card transition-shadow group ${dead ? 'border-destructive/30' : 'border-border'}`}>
                {product.photos.length > 0 && (
                  <div className="mb-3 rounded-lg overflow-hidden h-32 bg-muted">
                    <img src={product.photos[0]} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-display text-lg font-semibold">{product.name}</h4>
                    <p className="text-xs text-muted-foreground">{allCategories[product.category]?.label || product.category} • {product.subcategory}</p>
                    {product.sku && <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { setEditProduct(product); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-muted"><Edit2 className="w-4 h-4 text-muted-foreground" /></button>
                    <button onClick={() => { if (confirm('¿Eliminar producto?')) deleteProduct(product.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-muted-foreground" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div><p className="text-xs text-muted-foreground">Precio</p><p className="text-sm font-bold">${product.priceUSD.toFixed(2)}</p></div>
                  {!isSeller && <div><p className="text-xs text-muted-foreground">Costo</p><p className="text-sm font-medium text-muted-foreground">${product.costUSD.toFixed(2)}</p></div>}
                  <div className="ml-auto text-right">
                    <p className="text-xs text-muted-foreground">Stock</p>
                    <p className="text-sm font-bold">{totalStock}</p>
                    {totalStock === 0 && <span className="text-xs text-destructive font-bold">Agotado</span>}
                  </div>
                </div>
                {product.hasVariations && (
                  <div className="flex flex-wrap gap-1">
                    {product.variations.map(v => (
                      <span key={v.id} className={`text-xs px-2 py-0.5 rounded-md border ${
                        v.stock === 0 ? 'border-destructive/30 text-destructive/60 line-through' :
                        v.stock < lowStockThreshold ? 'border-camel/40 bg-camel/5 text-foreground' : 'border-border text-muted-foreground'
                      }`}>{v.size}/{v.color}: {v.stock}</span>
                    ))}
                  </div>
                )}
                {dead && <span className="inline-block mt-2 text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded font-medium">⚠️ Rotación Baja - Sugerir Oferta</span>}
                {product.publishOnline && <span className="inline-block mt-2 ml-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded">🌐 Online</span>}
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <ProductFormModal product={editProduct} categories={allCategories} isSeller={isSeller} isAdmin={isAdmin || false}
            allColors={allColors} allSizes={allSizes}
            onAddColor={(c) => setCustomColors(prev => [...prev, c])}
            onAddSize={(s) => setCustomSizes(prev => [...prev, s])}
            onAddSubcategory={(cat, sub) => {
              const existing = allCategories[cat];
              if (existing) setCustomCategories(prev => ({ ...prev, [cat]: { ...existing, subcategories: [...existing.subcategories, sub] } }));
            }}
            onClose={() => setShowForm(false)}
            onSave={(p) => { if (editProduct) updateProduct(p); else addProduct(p); setShowForm(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductFormModal({ product, categories, isSeller, isAdmin, allColors, allSizes, onAddColor, onAddSize, onAddSubcategory, onClose, onSave }: {
  product: Product | null;
  categories: Record<string, { label: string; subcategories: string[] }>;
  isSeller: boolean;
  isAdmin: boolean;
  allColors: string[];
  allSizes: string[];
  onAddColor: (c: string) => void;
  onAddSize: (s: string) => void;
  onAddSubcategory: (cat: string, sub: string) => void;
  onClose: () => void;
  onSave: (p: Product) => void;
}) {
  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [category, setCategory] = useState(product?.category || Object.keys(categories)[0] || 'women');
  const [subcategory, setSubcategory] = useState(product?.subcategory || '');
  const [costUSD, setCostUSD] = useState(product?.costUSD?.toString() || '');
  const [priceUSD, setPriceUSD] = useState(product?.priceUSD?.toString() || '');
  const [hasVariations, setHasVariations] = useState(product?.hasVariations ?? true);
  const [simpleStock, setSimpleStock] = useState(product?.simpleStock?.toString() || '0');
  const [variations, setVariations] = useState<ProductVariation[]>(product?.variations || []);
  const [photos, setPhotos] = useState<string[]>(product?.photos || []);
  const [publishOnline, setPublishOnline] = useState(product?.publishOnline ?? false);
  const [newSize, setNewSize] = useState(allSizes[0]);
  const [newColor, setNewColor] = useState(allColors[0]);
  const [newStock, setNewStock] = useState('1');
  const [newSubcategory, setNewSubcategory] = useState('');

  const addVariation = () => {
    setVariations(prev => [...prev, { id: crypto.randomUUID(), size: newSize, color: newColor, stock: parseInt(newStock) || 0 }]);
  };

  const updateVariationStock = (id: string, stock: number) => {
    setVariations(prev => prev.map(v => v.id === id ? { ...v, stock } : v));
  };

  const removeVariation = (id: string) => setVariations(prev => prev.filter(v => v.id !== id));

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).slice(0, 3 - photos.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setPhotos(prev => [...prev, ev.target!.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const subcats = categories[category]?.subcategories || [];

  const handleSave = () => {
    if (!name || !priceUSD) return;
    onSave({
      id: product?.id || crypto.randomUUID(),
      name, sku, category,
      subcategory: subcategory || subcats[0] || '',
      costUSD: parseFloat(costUSD) || 0,
      priceUSD: parseFloat(priceUSD),
      hasVariations,
      variations: hasVariations ? variations : [],
      simpleStock: hasVariations ? undefined : parseInt(simpleStock) || 0,
      photos,
      lowStockThreshold: product?.lowStockThreshold || 3,
      publishOnline,
      createdAt: product?.createdAt || new Date().toISOString(),
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-start justify-center pt-10 px-4 overflow-y-auto" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-lg mb-10">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display text-xl font-semibold">{product ? 'Editar' : 'Nuevo'} Producto</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre*</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">SKU / Código Web</label>
              <input type="text" value={sku} onChange={e => setSku(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" placeholder="Ej: BLAZ-001" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoría</label>
              <select value={category} onChange={e => { setCategory(e.target.value); setSubcategory(''); }} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm">
                {Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Subcategoría</label>
              <select value={subcategory} onChange={e => setSubcategory(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm">
                {subcats.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="flex gap-1 mt-1">
                <input type="text" value={newSubcategory} onChange={e => setNewSubcategory(e.target.value)} placeholder="+ subcategoría"
                  className="flex-1 px-2 py-1 rounded border border-input bg-background text-xs" />
                <button onClick={() => { if (newSubcategory.trim()) { onAddSubcategory(category, newSubcategory.trim()); setSubcategory(newSubcategory.trim()); setNewSubcategory(''); } }}
                  className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs">+</button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {!isSeller && (
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Costo (USD)</label>
                <input type="number" value={costUSD} onChange={e => setCostUSD(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" step="0.01" /></div>
            )}
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Precio (USD)*</label>
              <input type="number" value={priceUSD} onChange={e => setPriceUSD(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" step="0.01" /></div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Fotos (máx. 3)</label>
            <div className="flex gap-2 mb-2">
              {photos.map((p, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                  <img src={p} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 bg-foreground/60 text-background rounded-full p-0.5"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
            {photos.length < 3 && (
              <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-primary/30 rounded-lg text-sm text-primary cursor-pointer hover:bg-primary/5">
                <Image className="w-4 h-4" />Agregar Foto
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
              </label>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Publicar en Tienda Online</label>
            <button onClick={() => setPublishOnline(!publishOnline)}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${publishOnline ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
              {publishOnline ? '🌐 Sí' : 'No'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-muted-foreground">¿Tiene variaciones (talla/color)?</label>
            <button onClick={() => setHasVariations(!hasVariations)}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${hasVariations ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {hasVariations ? 'Sí' : 'No'}
            </button>
          </div>

          {hasVariations ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Variaciones</label>
              <div className="flex gap-2 mb-2">
                <div className="flex-1">
                  <select value={newSize} onChange={e => setNewSize(e.target.value)} className="w-full px-2 py-2 rounded-lg border border-input bg-background text-xs">
                    {allSizes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {isAdmin && (
                    <button onClick={() => { const s = prompt('Nueva talla:'); if (s) { onAddSize(s); setNewSize(s); } }}
                      className="text-[10px] text-primary mt-0.5 hover:underline">+ Talla</button>
                  )}
                </div>
                <div className="flex-1">
                  <select value={newColor} onChange={e => setNewColor(e.target.value)} className="w-full px-2 py-2 rounded-lg border border-input bg-background text-xs">
                    {allColors.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {isAdmin && (
                    <button onClick={() => { const c = prompt('Nuevo color:'); if (c) { onAddColor(c); setNewColor(c); } }}
                      className="text-[10px] text-primary mt-0.5 hover:underline">+ Color</button>
                  )}
                </div>
                <input type="number" value={newStock} onChange={e => setNewStock(e.target.value)} className="w-16 px-2 py-2 rounded-lg border border-input bg-background text-xs" min="0" />
                <button onClick={addVariation} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs">+</button>
              </div>
              {variations.length > 0 && (
                <div className="space-y-1">
                  {variations.map(v => (
                    <div key={v.id} className="flex items-center gap-2 text-xs bg-muted/50 p-2 rounded-lg">
                      <span className="flex-1">{v.size} / {v.color}</span>
                      <input type="number" value={v.stock} onChange={e => updateVariationStock(v.id, parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 rounded border border-input bg-background text-xs text-center" min="0" />
                      <button onClick={() => removeVariation(v.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Stock Inicial</label>
              <input type="number" value={simpleStock} onChange={e => setSimpleStock(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" min="0" />
            </div>
          )}
        </div>
        <div className="p-5 border-t border-border flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted">Cancelar</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Guardar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
