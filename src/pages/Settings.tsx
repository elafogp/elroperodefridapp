import { useState, useRef, useCallback } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import type { User, UserRole } from '@/types';
import { motion } from 'framer-motion';
import { Settings, UserPlus, Edit2, Trash2, Download, Save, Upload, Database, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import localforage from 'localforage';

const dataStore = localforage.createInstance({ name: 'elropero', storeName: 'data' });

export default function SettingsPage() {
  const { exchangeRate, setExchangeRate, lowStockThreshold, setLowStockThreshold } = useStore();
  const { managedUsers, addManagedUser, updateManagedUser, deleteManagedUser } = useAuth();
  const [rateInput, setRateInput] = useState(exchangeRate.toString());
  const [thresholdInput, setThresholdInput] = useState(lowStockThreshold.toString());
  const [isDragging, setIsDragging] = useState(false);

  const handleRateSave = () => { const r = parseFloat(rateInput); if (r > 0) setExchangeRate(r); };
  const handleThresholdSave = () => { const n = parseInt(thresholdInput); if (n > 0) setLowStockThreshold(n); };

  const handleBackupJSON = async () => {
    const keys = await dataStore.keys();
    const backup: Record<string, any> = {};
    for (const key of keys) backup[key] = await dataStore.getItem(key);
    backup['__auth_users'] = JSON.parse(localStorage.getItem('boutique_managed_users') || '[]');
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `elropero_backup_${format(new Date(), 'yyyy-MM-dd_HHmm')}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleBackupExcel = async () => {
    const keys = await dataStore.keys();
    const data: Record<string, any> = {};
    for (const key of keys) data[key] = await dataStore.getItem(key);
    // Export as CSV multi-sheet simulation
    let csvContent = '';
    for (const [key, value] of Object.entries(data)) {
      if (!Array.isArray(value) || value.length === 0) continue;
      csvContent += `\n\n=== ${key.toUpperCase()} ===\n`;
      const headers = Object.keys(value[0]);
      csvContent += headers.join(',') + '\n';
      value.forEach((row: any) => {
        csvContent += headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
      });
    }
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `elropero_audit_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleRestore = async (file: File) => {
    if (!confirm('⚠️ Esto reemplazará TODOS los datos actuales. ¿Continuar?')) return;
    const text = await file.text();
    try {
      const backup = JSON.parse(text);
      for (const [key, value] of Object.entries(backup)) {
        if (key === '__auth_users') localStorage.setItem('boutique_managed_users', JSON.stringify(value));
        else await dataStore.setItem(key, value);
      }
      alert('✅ Datos restaurados. La página se recargará.');
      window.location.reload();
    } catch { alert('❌ Error al restaurar. Archivo inválido.'); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleRestore(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) handleRestore(file);
    else alert('Por favor arrastra un archivo .json');
  }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-display font-semibold flex items-center gap-2"><Settings className="w-7 h-7 text-primary" />Configuración</h1>

      {/* General */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-soft space-y-4">
        <h3 className="font-display text-lg font-semibold">General</h3>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground w-40">Tasa del día (Bs/$)</label>
          <input type="number" value={rateInput} onChange={e => setRateInput(e.target.value)} className="w-24 px-3 py-2 border border-input rounded-lg text-sm bg-background" step="0.1" />
          <button onClick={handleRateSave} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1"><Save className="w-3 h-3" />Guardar</button>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground w-40">Umbral stock bajo</label>
          <input type="number" value={thresholdInput} onChange={e => setThresholdInput(e.target.value)} className="w-24 px-3 py-2 border border-input rounded-lg text-sm bg-background" />
          <button onClick={handleThresholdSave} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1"><Save className="w-3 h-3" />Guardar</button>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-soft space-y-4">
        <h3 className="font-display text-lg font-semibold">Gestión de Usuarios</h3>
        <p className="text-xs text-muted-foreground">Roles: Vendedor (POS/Clientes) o Bodega (solo Inventario). Contraseña Bodega: f1234</p>
        <UserManagement users={managedUsers} onAdd={addManagedUser} onUpdate={updateManagedUser} onDelete={deleteManagedUser} />
      </div>

      {/* Backup & Restore */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-soft space-y-4">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Database className="w-5 h-5 text-primary" />Copia de Seguridad</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleBackupJSON}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Download className="w-4 h-4" />JSON Snapshot
          </button>
          <button onClick={handleBackupExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90">
            <FileSpreadsheet className="w-4 h-4" />Excel Auditoría
          </button>
        </div>

        {/* Drag & Drop Restore */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
          }`}>
          <Upload className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Arrastra un archivo .json aquí para restaurar</p>
          <p className="text-xs text-muted-foreground/60 mt-1">o haz clic para seleccionar</p>
          <input type="file" accept=".json" onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
        <p className="text-xs text-muted-foreground">La copia incluye productos, clientes, ventas, gastos, inversiones, proveedores y salarios.</p>
      </div>
    </div>
  );
}

function UserManagement({ users, onAdd, onUpdate, onDelete }: {
  users: User[]; onAdd: (u: User) => void; onUpdate: (u: User) => void; onDelete: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('seller');
  const [password, setPassword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = () => {
    if (!name) return;
    if (editingId) {
      onUpdate({ id: editingId, name, role, email: '', password: password || undefined });
      setEditingId(null);
    } else {
      onAdd({ id: crypto.randomUUID(), name, role, email: '', password: password || undefined });
    }
    setName(''); setPassword('');
  };

  const startEdit = (u: User) => { setEditingId(u.id); setName(u.name); setRole(u.role); setPassword(u.password || ''); };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre"
          className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border border-input bg-background text-sm" />
        <select value={role} onChange={e => setRole(e.target.value as UserRole)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
          <option value="seller">Vendedor</option>
          <option value="warehouse">Bodega</option>
        </select>
        <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña"
          className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border border-input bg-background text-sm" />
        <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1">
          <UserPlus className="w-3.5 h-3.5" />{editingId ? 'Actualizar' : 'Agregar'}
        </button>
      </div>
      {users.map(u => (
        <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <span className="text-sm font-medium">{u.name}</span>
            <span className="text-xs text-muted-foreground ml-2">{u.role === 'seller' ? 'Vendedor' : 'Bodega'}</span>
            {u.password && <span className="text-xs text-muted-foreground ml-2">🔒</span>}
          </div>
          <div className="flex gap-1">
            <button onClick={() => startEdit(u)} className="p-1 rounded hover:bg-muted"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
            <button onClick={() => { if (confirm('¿Eliminar usuario?')) onDelete(u.id); }} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}
