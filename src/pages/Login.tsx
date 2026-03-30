import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

const roles: { role: UserRole; emoji: string; label: string; desc: string }[] = [
  { role: 'admin', emoji: '👑', label: 'Administrador', desc: 'Control total' },
  { role: 'seller', emoji: '🛍️', label: 'Vendedor', desc: 'POS y clientes' },
  { role: 'warehouse', emoji: '📦', label: 'Bodega', desc: 'Inventario' },
];

export default function Login() {
  const { login, managedUsers } = useAuth();
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [showPreloader, setShowPreloader] = useState(false);
  const [preloaderPhase, setPreloaderPhase] = useState<'loading' | 'hello' | 'fadeout'>('loading');

  const usersForRole = selected ? managedUsers.filter((u) => u.role === selected) : [];

  const triggerShake = (msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleLogin = () => {
    if (!selected) { triggerShake('Selecciona un rol para continuar'); return; }
    if (selected === 'admin' && !name.trim()) { triggerShake('El campo de usuario es obligatorio'); return; }
    if (selected === 'seller' && usersForRole.length === 0 && !name.trim()) { triggerShake('El campo de nombre es obligatorio'); return; }
    if (selected === 'seller' && usersForRole.length > 0 && !selectedUserId) { triggerShake('Selecciona un vendedor'); return; }
    if ((selected === 'admin' || selected === 'warehouse') && !password) { triggerShake('La contraseña es obligatoria'); return; }

    let loginName = name;
    let loginPassword = password;

    if (selected === 'warehouse') {
      loginName = selectedUserId ? managedUsers.find((u) => u.id === selectedUserId)?.name || 'Bodega' : 'Bodega';
      loginPassword = password;
    } else if (selected !== 'admin' && selectedUserId) {
      const found = managedUsers.find((u) => u.id === selectedUserId);
      if (found) { loginName = found.name; loginPassword = password; }
    }

    const success = login(selected, loginName, loginPassword);
    if (!success) {
      triggerShake(selected === 'admin' ? 'Contraseña incorrecta' : selected === 'warehouse' ? 'Contraseña incorrecta' : 'Credenciales incorrectas');
    } else {
      setShowPreloader(true);
      setPreloaderPhase('loading');
    }
  };

  // Preloader timing: loading -> hello -> fadeout
  useEffect(() => {
    if (!showPreloader) return;
    if (preloaderPhase === 'loading') {
      const t = setTimeout(() => setPreloaderPhase('hello'), 1200);
      return () => clearTimeout(t);
    }
    if (preloaderPhase === 'hello') {
      const t = setTimeout(() => setPreloaderPhase('fadeout'), 800);
      return () => clearTimeout(t);
    }
  }, [showPreloader, preloaderPhase]);

  if (showPreloader) {
    return (
      <motion.div
        className="min-h-screen flex flex-col items-center justify-center bg-background"
        initial={{ opacity: 1 }}
        animate={{ opacity: preloaderPhase === 'fadeout' ? 0 : 1 }}
        transition={{ duration: 0.5 }}
        onAnimationComplete={() => {
          if (preloaderPhase === 'fadeout') {
            // Login already happened, app will re-render
          }
        }}
      >
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
          className="text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-[hsl(320,40%,70%)] mx-auto mb-6 flex items-center justify-center shadow-elevated">
            <span className="text-4xl text-white font-display font-bold">F</span>
          </div>
          <h1 className="text-3xl font-display font-semibold text-foreground mb-4">El Ropero de Frida</h1>
          {/* Progress bar */}
          <div className="w-64 mx-auto h-2 bg-muted rounded-full overflow-hidden mb-6">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-[hsl(320,40%,70%)] rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
            />
          </div>
          <AnimatePresence>
            {(preloaderPhase === 'hello' || preloaderPhase === 'fadeout') && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 0.5, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-2xl font-display font-semibold text-foreground"
              >
                ¡Hola!
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left: Geometric branding */}
      <div className="hidden lg:flex w-[45%] relative overflow-hidden items-center justify-center"
        style={{ background: 'linear-gradient(135deg, hsl(300 29% 73%), hsl(280 35% 60%), hsl(320 40% 70%))' }}>
        <div className="absolute inset-0">
          <div className="absolute top-[10%] left-[10%] w-32 h-32 border-2 border-white/20 rounded-full" />
          <div className="absolute top-[20%] right-[15%] w-24 h-24 border-2 border-white/15 rotate-45" />
          <div className="absolute bottom-[25%] left-[20%] w-40 h-40 border border-white/10 rounded-full" />
          <div className="absolute bottom-[15%] right-[10%] w-20 h-20 border-2 border-white/20 rotate-12 rounded-md" />
          <div className="absolute top-[50%] left-[40%] w-16 h-16 bg-white/5 rounded-full" />
          <div className="absolute top-[35%] left-[5%] w-48 h-48 border border-white/8 rounded-full" />
          <div className="absolute bottom-[40%] right-[25%] w-12 h-12 bg-white/10 rotate-45" />
        </div>

        <div className="relative z-10 flex flex-col gap-4 px-8">
          <p className="text-white/70 text-xs uppercase tracking-[0.3em] font-body mb-2 text-center">Selecciona tu rol</p>
          {roles.map(({ role, emoji, label, desc }) => (
            <motion.button key={role} whileHover={{ scale: 1.03, x: 4 }} whileTap={{ scale: 0.98 }}
              onClick={() => { setSelected(role); setError(''); setPassword(''); setSelectedUserId(''); setName(''); }}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-left transition-all w-64 ${
                selected === role
                  ? 'bg-white text-foreground shadow-elevated'
                  : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border border-white/10'
              }`}>
              <span className="text-2xl">{emoji}</span>
              <div>
                <div className="font-display text-lg font-semibold leading-tight">{label}</div>
                <div className={`text-xs ${selected === role ? 'text-muted-foreground' : 'text-white/60'}`}>{desc}</div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Right: Login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-[hsl(320,40%,70%)] mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl text-white font-display font-bold">F</span>
            </div>
            <h1 className="text-4xl font-display font-semibold text-foreground tracking-tight">El Ropero de Frida</h1>
            <p className="text-muted-foreground mt-1 font-body text-[10px] tracking-[0.35em] uppercase">Sistema de Gestión</p>
          </div>

          {/* Mobile role selector */}
          <div className="lg:hidden mb-6">
            <label className="block text-xs font-medium text-muted-foreground mb-2">Selecciona tu rol</label>
            <div className="flex gap-2">
              {roles.map(({ role, emoji, label }) => (
                <button key={role} onClick={() => { setSelected(role); setError(''); setPassword(''); setSelectedUserId(''); setName(''); }}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium transition-all ${
                    selected === role ? 'bg-primary text-primary-foreground shadow-soft' : 'bg-card border border-border text-muted-foreground'
                  }`}>
                  <span className="text-lg">{emoji}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {selected && (
              <motion.div key={selected} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`space-y-4 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
                {selected === 'admin' && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">👤 Usuario</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Administrador"
                      className="w-full px-4 py-3 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm" />
                  </div>
                )}

                {selected === 'seller' && (
                  <>
                    {usersForRole.length > 0 ? (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">👤 Usuario</label>
                        <select value={selectedUserId} onChange={(e) => { setSelectedUserId(e.target.value); if (e.target.value) setName(''); }}
                          className="w-full px-4 py-3 rounded-xl border border-input bg-card text-foreground text-sm">
                          <option value="">Seleccionar vendedor...</option>
                          {usersForRole.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">👤 Tu nombre</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ingresa tu nombre"
                          className="w-full px-4 py-3 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm" />
                      </div>
                    )}
                  </>
                )}

                {(selected === 'admin' || selected === 'warehouse' ||
                  (selected === 'seller' && (selectedUserId ? managedUsers.find((u) => u.id === selectedUserId)?.password : false))) && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">🔒 Contraseña</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder={selected === 'warehouse' ? 'Contraseña de bodega' : 'Ingresa la contraseña'}
                        className="w-full px-4 py-3 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm pr-12"
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className="text-sm text-destructive font-medium bg-destructive/10 rounded-lg px-3 py-2">{error}</motion.p>
                )}

                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={handleLogin}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-[hsl(320,40%,70%)] text-primary-foreground font-body font-semibold text-sm tracking-wide uppercase transition-all hover:opacity-90 shadow-soft">
                  Ingresar
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {!selected && <p className="text-center text-sm text-muted-foreground">Selecciona un rol para continuar</p>}

          <div className="text-center mt-8">
            <a href="https://www.felipeogonzalez.com" target="_blank" rel="noreferrer"
              className="felipe-glow text-[10px] text-muted-foreground/50 tracking-wider hover:text-primary transition-all duration-300">
              By: Felipe O. González
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
