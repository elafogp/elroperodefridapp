import { useState, useMemo } from 'react';
import { useStore } from '@/contexts/StoreContext';
import type { Customer } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Users, X, Phone, Cake, CreditCard, Edit2, Trash2, MessageCircle, Star } from 'lucide-react';

export default function Customers() {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useStore();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [birthdayFilter, setBirthdayFilter] = useState<'all' | 'upcoming' | string>('all');

  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const filtered = useMemo(() => {
    let result = customers.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) || c.cedula.includes(search) || c.phone.includes(search)
    );
    if (birthdayFilter === 'upcoming') {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      result = result.filter(c => {
        if (!c.birthday) return false;
        const bday = new Date(c.birthday);
        const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
        return thisYear >= today && thisYear <= nextWeek;
      });
    } else if (birthdayFilter !== 'all') {
      const monthIdx = parseInt(birthdayFilter);
      result = result.filter(c => c.birthday && new Date(c.birthday).getMonth() === monthIdx);
    }
    return result;
  }, [customers, search, birthdayFilter]);

  const handleSave = (c: Customer) => {
    if (editCustomer) updateCustomer(c);
    else addCustomer(c);
    setShowForm(false);
    setEditCustomer(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">{customers.length} clientes registrados</p>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setEditCustomer(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          <Plus className="w-4 h-4" />Nuevo Cliente
        </motion.button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, cédula o teléfono..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <select value={birthdayFilter} onChange={e => setBirthdayFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-input bg-card text-sm">
          <option value="all">Todos</option>
          <option value="upcoming">🎂 Cumpleaños próximos</option>
          {months.map((m, i) => <option key={i} value={i.toString()}>{m}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No hay clientes</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(customer => {
            const isVIP = (customer.lifetimeSpend || 0) >= 300;
            return (
              <motion.div key={customer.id} layout className="bg-card border border-border rounded-xl p-5 shadow-soft group">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-lg flex-shrink-0 ${isVIP ? 'bg-yellow-100 text-yellow-700' : 'bg-primary/10 text-primary'}`}>
                    {isVIP ? '⭐' : customer.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <h4 className="font-display text-lg font-semibold truncate">{customer.name}</h4>
                      {isVIP && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">VIP</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><CreditCard className="w-3 h-3" />{customer.cedula}</div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditCustomer(customer); setShowForm(true); }} className="p-1 rounded hover:bg-muted"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => { if (confirm('¿Eliminar cliente?')) deleteCustomer(customer.id); }} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />{customer.phone}
                      <a href="#" onClick={(e) => { e.preventDefault(); window.open(`https://wa.me/${customer.phone.replace(/[\s+]/g, '')}`, '_blank', 'noreferrer'); }}
                        className="ml-auto text-[#25D366]"><MessageCircle className="w-3.5 h-3.5" /></a>
                    </div>
                  )}
                  {customer.instagram && <div className="flex items-center gap-2 text-sm text-muted-foreground">📸 {customer.instagram}</div>}
                  {customer.birthday && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Cake className="w-3.5 h-3.5" />{customer.birthday}</div>}
                  <div className="text-xs text-muted-foreground">Total compras: <span className="font-semibold text-foreground">${(customer.lifetimeSpend || 0).toFixed(2)}</span></div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showForm && <CustomerFormModal customer={editCustomer} onClose={() => { setShowForm(false); setEditCustomer(null); }} onSave={handleSave} />}
      </AnimatePresence>
    </div>
  );
}

function CustomerFormModal({ customer, onClose, onSave }: { customer: Customer | null; onClose: () => void; onSave: (c: Customer) => void }) {
  const [name, setName] = useState(customer?.name || '');
  const [cedula, setCedula] = useState(customer?.cedula || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [instagram, setInstagram] = useState(customer?.instagram || '');
  const [birthday, setBirthday] = useState(customer?.birthday || '');
  const [notes, setNotes] = useState(customer?.notes || '');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display text-xl font-semibold">{customer ? 'Editar' : 'Nuevo'} Cliente</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">👤 Nombre*</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">📱 WhatsApp</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">📸 Instagram</label>
              <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" placeholder="@usuario" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">🪪 Cédula</label>
              <input type="text" value={cedula} onChange={e => setCedula(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">🎂 Cumpleaños</label>
              <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" /></div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm resize-none" /></div>
        </div>
        <div className="p-5 border-t border-border flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted">Cancelar</button>
          <button onClick={() => { if (!name) return; onSave({ id: customer?.id || crypto.randomUUID(), name, cedula, phone, instagram, birthday, notes, discountCodes: customer?.discountCodes || [], lifetimeSpend: customer?.lifetimeSpend || 0, createdAt: customer?.createdAt || new Date().toISOString() }); }}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Guardar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
