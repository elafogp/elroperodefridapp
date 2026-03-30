import { useStore } from '@/contexts/StoreContext';
import { useMemo, useState } from 'react';
import { CATEGORIES } from '@/types';
import { Search, ShoppingBag } from 'lucide-react';

export default function Catalog() {
  const { products, customCategories } = useStore();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const allCategories = useMemo(() => ({ ...CATEGORIES, ...customCategories }), [customCategories]);

  const filtered = products.filter(p => {
    const totalStock = p.hasVariations ? p.variations.reduce((s, v) => s + v.stock, 0) : (p.simpleStock || 0);
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || p.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/80 to-lilac-dark/70 py-12 px-6 text-center">
        <h1 className="text-4xl font-display font-bold text-white">El Ropero de Frida</h1>
        <p className="text-white/70 text-sm mt-2 uppercase tracking-widest">Catálogo</p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar productos..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-card text-sm" />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="px-4 py-3 rounded-xl border border-input bg-card text-sm">
            <option value="all">Todas</option>
            {Object.entries(allCategories).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No se encontraron productos</p>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {filtered.map(product => {
              const totalStock = product.hasVariations ? product.variations.reduce((s, v) => s + v.stock, 0) : (product.simpleStock || 0);
              const available = totalStock > 0;
              return (
                <div key={product.id} className="break-inside-avoid bg-card border border-border rounded-xl overflow-hidden shadow-soft">
                  {product.photos.length > 0 ? (
                    <img src={product.photos[0]} alt={product.name} className="w-full object-cover" style={{ minHeight: '180px' }} />
                  ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center">
                      <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-display text-lg font-semibold text-foreground">{product.name}</h3>
                    <p className="text-xs text-muted-foreground">{allCategories[product.category]?.label || product.category}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-lg font-bold text-foreground">${product.priceUSD.toFixed(2)}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        available ? 'bg-green-100 text-green-700' : 'bg-destructive/10 text-destructive'
                      }`}>
                        {available ? 'Disponible' : 'Agotado'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-6 border-t border-border">
        <a href="https://www.felipeogonzalez.com" target="_blank" rel="noreferrer"
          className="felipe-glow text-[10px] text-muted-foreground/40 tracking-wider hover:text-primary transition-all duration-300">
          By: Felipe O. González
        </a>
      </div>
    </div>
  );
}
