// app/dashboard/page.js
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import expressApi from "../../lib/expressApi";

/* --------------------- CreateAdminModal --------------------- */
function CreateAdminModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", password: "" });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = [];
    if (!form.nombre || form.nombre.trim().length < 2) e.push("Nombre mínimo 2 caracteres.");
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.push("Email inválido.");
    if (!form.password || form.password.length < 8) e.push("Contraseña mínimo 8 caracteres.");
    setErrors(e);
    return e.length === 0;
  };

  const submit = async (ev) => {
    ev?.preventDefault();
    setErrors([]);
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await expressApi.post('/auth/register-admin', {
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono,
        password: form.password
      });

      // El servidor debería devolver data.user (con role = 'admin')
      const newAdmin = res.data?.data?.user || res.data?.data || res.data;
      onCreated && onCreated(newAdmin);
      onClose();
    } catch (err) {
      const srv = err.response?.data;
      if (srv?.errors && Array.isArray(srv.errors)) {
        setErrors(srv.errors.map(x => x.msg || x.message || JSON.stringify(x)));
      } else if (srv?.message) {
        setErrors([srv.message]);
      } else {
        setErrors([err.message || 'Error desconocido']);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div className="title">Crear administrador</div>
            <div className="subtitle">Solo administradores pueden crear otras cuentas admin</div>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit} style={{ marginTop:12 }}>
          <label style={{ display: "block", marginTop: 8 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>Nombre</div>
            <input className="input" value={form.nombre} onChange={(e)=>setForm({...form, nombre:e.target.value})} />
          </label>

          <label style={{ display: "block", marginTop: 8 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>Email</div>
            <input className="input" type="email" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} />
          </label>

          <label style={{ display: "block", marginTop: 8 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>Teléfono</div>
            <input className="input" value={form.telefono} onChange={(e)=>setForm({...form, telefono:e.target.value})} />
          </label>

          <label style={{ display: "block", marginTop: 8 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>Contraseña</div>
            <input className="input" type="password" value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})} />
            <small style={{ color: 'var(--subtext)' }}>Mín 8 caracteres.</small>
          </label>

          {errors.length > 0 && (
            <div style={{ marginTop:10, color:'crimson' }}>
              <ul>{errors.map((x,i)=><li key={i}>{x}</li>)}</ul>
            </div>
          )}

          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button className="btn" type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear admin'}</button>
            <button className="btn-ghost" type="button" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* --------------------- CreatePropietarioModal --------------------- */
function CreatePropModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", direccion: "" });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const validate = () => {
    const e = [];
    if (!form.nombre || form.nombre.trim().length < 2) e.push("Nombre mínimo 2 caracteres.");
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.push("Email inválido.");
    setErrors(e);
    return e.length === 0;
  };
  const submit = async (ev) => {
    ev?.preventDefault();
    setErrors([]);
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await expressApi.post('/propietarios', form);
      const created = res.data?.data || res.data;
      onCreated(created);
      onClose();
    } catch (err) {
      const srv = err.response?.data;
      if (srv?.message) setErrors([srv.message]); else setErrors([err.message || 'Error desconocido']);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div className="title">Crear propietario</div>
            <div className="subtitle">Registra los datos del propietario</div>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit} style={{ marginTop:12 }}>
          <label style={{display:'block', marginTop:8}}>
            <div style={{fontSize:13, fontWeight:600}}>Nombre</div>
            <input className="input" value={form.nombre} onChange={(e)=>setForm({...form, nombre:e.target.value})} required />
          </label>

          <label style={{display:'block', marginTop:8}}>
            <div style={{fontSize:13, fontWeight:600}}>Email</div>
            <input className="input" type="email" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} required />
          </label>

          <label style={{display:'block', marginTop:8}}>
            <div style={{fontSize:13, fontWeight:600}}>Teléfono</div>
            <input className="input" value={form.telefono} onChange={(e)=>setForm({...form, telefono:e.target.value})} />
          </label>

          <label style={{display:'block', marginTop:8}}>
            <div style={{fontSize:13, fontWeight:600}}>Dirección</div>
            <input className="input" value={form.direccion} onChange={(e)=>setForm({...form, direccion:e.target.value})} />
          </label>

          {errors.length>0 && (
            <div style={{ marginTop:10, color:'crimson' }}>
              <ul>{errors.map((x,i)=><li key={i}>{x}</li>)}</ul>
            </div>
          )}

          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button className="btn" type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear propietario'}</button>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* --------------------- CreateMascotaModal --------------------- */
function CreateMascotaModal({ onClose, propietarios = [], onCreated }) {
  const [form, setForm] = useState({ nombre: "", especie: "", raza: "", edad: "", historial_medico: "", owner_id: "" });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const validate = () => {
    const e = [];
    if (!form.nombre || form.nombre.trim().length < 1) e.push("Nombre es requerido.");
    if (!form.owner_id) e.push("Debe seleccionar un propietario.");
    setErrors(e);
    return e.length === 0;
  };
  const submit = async (ev) => {
    ev?.preventDefault();
    setErrors([]);
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        nombre: form.nombre,
        especie: form.especie,
        raza: form.raza,
        edad: form.edad ? Number(form.edad) : null,
        historial_medico: form.historial_medico,
        owner_id: Number(form.owner_id)
      };
      const res = await expressApi.post('/mascotas', payload);
      const created = res.data?.data || res.data;
      onCreated(created);
      onClose();
    } catch (err) {
      const srv = err.response?.data;
      if (srv?.message) setErrors([srv.message]); else setErrors([err.message || 'Error desconocido']);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div className="title">Crear mascota</div>
            <div className="subtitle">Registra el paciente veterinario</div>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit} style={{ marginTop:12 }}>
          <label style={{display:'block', marginTop:8}}>
            <div style={{fontSize:13, fontWeight:600}}>Nombre</div>
            <input className="input" value={form.nombre} onChange={(e)=>setForm({...form, nombre:e.target.value})} required />
          </label>

          <div style={{display:'flex', gap:8}}>
            <label style={{flex:1, marginTop:8}}>
              <div style={{fontSize:13, fontWeight:600}}>Especie</div>
              <input className="input" value={form.especie} onChange={(e)=>setForm({...form, especie:e.target.value})} />
            </label>
            <label style={{flex:1, marginTop:8}}>
              <div style={{fontSize:13, fontWeight:600}}>Raza</div>
              <input className="input" value={form.raza} onChange={(e)=>setForm({...form, raza:e.target.value})} />
            </label>
          </div>

          <label style={{display:'block', marginTop:8}}>
            <div style={{fontSize:13, fontWeight:600}}>Edad (años)</div>
            <input className="input" type="number" value={form.edad} onChange={(e)=>setForm({...form, edad:e.target.value})} />
          </label>

          <label style={{display:'block', marginTop:8}}>
            <div style={{fontSize:13, fontWeight:600}}>Propietario</div>
            <select className="input" value={form.owner_id} onChange={(e)=>setForm({...form, owner_id:e.target.value})}>
              <option value="">-- Seleccionar propietario --</option>
              {propietarios.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.email}</option>)}
            </select>
          </label>

          <label style={{display:'block', marginTop:8}}>
            <div style={{fontSize:13, fontWeight:600}}>Historial médico</div>
            <textarea className="input" rows={3} value={form.historial_medico} onChange={(e)=>setForm({...form, historial_medico:e.target.value})} />
          </label>

          {errors.length>0 && <div style={{marginTop:10, color:'crimson'}}><ul>{errors.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}

          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button className="btn" type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear mascota'}</button>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* --------------------- Profile Modal (nuevo) --------------------- */
function ProfileModal({ onClose, userCurrent, onUpdated }) {
  const [form, setForm] = useState({
    nombre: userCurrent?.nombre || "",
    email: userCurrent?.email || "",
    telefono: userCurrent?.telefono || "",
    currentPassword: "",
    newPassword: ""
  });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const validate = () => {
    const e = [];
    if (!form.nombre || form.nombre.trim().length < 2) e.push("Nombre mínimo 2 caracteres.");
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.push("Email inválido.");
    // Si quiere cambiar contraseña, exigir current + min length
    if (form.newPassword) {
      if (!form.currentPassword) e.push("Contraseña actual requerida para cambiar la contraseña.");
      if (form.newPassword.length < 8) e.push("Nueva contraseña: mínimo 8 caracteres.");
    }
    setErrors(e);
    return e.length === 0;
  };

  const submit = async (ev) => {
    ev?.preventDefault();
    setErrors([]);
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono,
        currentPassword: form.currentPassword || undefined,
        newPassword: form.newPassword || undefined
      };
      const res = await expressApi.put('/auth/profile', payload);
      const updated = res.data?.data || res.data;
      // Actualizar storage y notificar al padre
      localStorage.setItem('user', JSON.stringify(updated));
      onUpdated && onUpdated(updated);
      onClose();
    } catch (err) {
      const srv = err.response?.data;
      // manejar errores tanto array como message
      if (srv?.errors && Array.isArray(srv.errors)) {
        setErrors(srv.errors.map(x => x.msg || x.message || JSON.stringify(x)));
      } else if (srv?.message) {
        setErrors([srv.message]);
      } else {
        setErrors([err.message || "Error desconocido"]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal card" style={{ maxWidth:560 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div className="title">Editar perfil</div>
            <div className="subtitle">Actualiza tu información (y tu contraseña si lo deseas)</div>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit} style={{ marginTop:12 }}>
          <label style={{ display:'block', marginTop:8 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>Nombre</div>
            <input className="input" value={form.nombre} onChange={(e)=>setForm({...form, nombre:e.target.value})} required />
          </label>

          <label style={{ display:'block', marginTop:8 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>Email</div>
            <input className="input" type="email" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} required />
          </label>

          <label style={{ display:'block', marginTop:8 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>Teléfono</div>
            <input className="input" value={form.telefono} onChange={(e)=>setForm({...form, telefono:e.target.value})} />
            <small style={{ color:'var(--subtext)' }}>Puedes dejarlo vacío si no quieres mostrarlo.</small>
          </label>

          <hr style={{ margin: '12px 0' }} />

          <label style={{ display:'block', marginTop:8 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>Contraseña actual</div>
            <input className="input" type="password" value={form.currentPassword} onChange={(e)=>setForm({...form, currentPassword:e.target.value})} />
            <small style={{ color:'var(--subtext)' }}>Requerida sólo si vas a cambiar la contraseña.</small>
          </label>

          <label style={{ display:'block', marginTop:8 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>Nueva contraseña</div>
            <input className="input" type="password" value={form.newPassword} onChange={(e)=>setForm({...form, newPassword:e.target.value})} />
            <small style={{ color:'var(--subtext)' }}>Dejar vacío si no deseas cambiarla (mín 8 caracteres si la llenas).</small>
          </label>

          {errors.length>0 && (
            <div style={{ marginTop:10, color:'crimson' }}>
              <ul>{errors.map((x,i)=><li key={i}>{x}</li>)}</ul>
            </div>
          )}

          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button className="btn" type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar cambios'}</button>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* --------------------- Dashboard principal (incluye todo) --------------------- */
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userSource, setUserSource] = useState(null); // <-- nuevo: fuente de login (express|profesor|local)
  const [totals, setTotals] = useState({ propietarios: 0, mascotas: 0 });
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // modales
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showPropModal, setShowPropModal] = useState(false);
  const [showMascotaModal, setShowMascotaModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // propietarios list (para selector en crear mascota)
  const [propietariosList, setPropietariosList] = useState([]);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return router.replace('/');
    const parsed = JSON.parse(raw);
    setUser(parsed);

    // leer la fuente de login guardada por el login page (express|profesor|local)
    const src = localStorage.getItem('user_source') || parsed.source || null;
    setUserSource(src);

    (async () => {
      setLoadingMetrics(true);
      try {
        const [pRes, mRes] = await Promise.all([
          expressApi.get('/propietarios?page=1&limit=1'),
          expressApi.get('/mascotas?page=1&limit=1')
        ]);
        const pTotal = pRes.data?.meta?.total ?? Number(pRes.headers['x-total-count'] || 0);
        const mTotal = mRes.data?.meta?.total ?? Number(mRes.headers['x-total-count'] || 0);
        setTotals({ propietarios: pTotal, mascotas: mTotal });

        // obtener primeros propietarios para selector (lim 50)
        const listRes = await expressApi.get('/propietarios?page=1&limit=50');
        const list = listRes.data?.data || listRes.data || [];
        setPropietariosList(list);
      } catch (err) {
        console.warn('Métricas o lista no disponibles', err?.message || err);
      } finally {
        setLoadingMetrics(false);
      }
    })();
  }, [router]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_source');
    router.replace('/');
  };

  if (!user) return null;
  const isAdmin = user.role === 'admin';

  const onPropCreated = (newP) => {
    setTotals(t => ({ ...t, propietarios: t.propietarios + 1 }));
    setPropietariosList(prev => [ ...(Array.isArray(prev) ? prev : []), newP ]);
  };

  const onMascotaCreated = (newM) => {
    setTotals(t => ({ ...t, mascotas: t.mascotas + 1 }));
  };

  // callback cuando perfil se actualiza (ProfileModal)
  const handleProfileUpdated = (updatedUser) => {
    setUser(updatedUser);
    // ya guardamos en localStorage desde el modal, pero reforzamos
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // permiso UI: solo usuarios que iniciaron por 'express' pueden ver/abrir el modal
  const canEditProfile = userSource === 'express';

  return (
    <div style={{ padding:24 }}>
      <div className="card" style={{ padding:16, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:56, height:56, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>🐾</div>
          <div>
            <div style={{ fontSize:20, fontWeight:800 }}>VetCare</div>
            <div className="subtitle">Sistema veterinario</div>
          </div>
        </div>

        <div style={{ textAlign:'right' }}>
          <div className="small-muted">Usuario</div>
          <div style={{ fontWeight:700 }}>{user.nombre || user.email}</div>
          <div className="small-muted">Rol: <strong style={{ color: isAdmin ? 'var(--accent-2)' : 'var(--subtext)' }}>{user.role}</strong></div>

          {/* BOTÓN para abrir modal Perfil (debajo del role) -> solo si user_source === 'express' */}
          {canEditProfile ? (
            <div style={{ marginTop: 8 }}>
              <button className="btn-ghost" onClick={() => setShowProfileModal(true)} style={{ padding: '7px 10px' }}>Editar perfil</button>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <small className="small-muted">Editar perfil no disponible (método de acceso: {userSource || 'desconocido'})</small>
            </div>
          )}
        </div>
      </div>

      {/* Controles - separados en View / Create */}
      <div style={{ display:'flex', gap:16, marginTop:16, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ fontWeight:700, color:'var(--subtext)', marginRight:8 }}>Vistas</div>
          <button className="btn" onClick={() => { if(isAdmin) router.push('/propietarios'); else alert('Acceso denegado: solo admins'); }}>Ver propietarios</button>
          <button className="btn" onClick={() => { if(isAdmin) router.push('/mascotas'); else alert('Acceso denegado: solo admins'); }}>Ver mascotas</button>
        </div>

        <div style={{ width:1, height:36, background:'rgba(255,255,255,0.03)' }} />

        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ fontWeight:700, color:'var(--subtext)', marginRight:8 }}>Acciones</div>
          <button className="btn" onClick={() => isAdmin ? setShowPropModal(true) : alert('Acceso denegado: solo admins')}>Crear propietario</button>
          <button className="btn" onClick={() => isAdmin ? setShowMascotaModal(true) : alert('Acceso denegado: solo admins')}>Crear mascota</button>
          <button className="btn-success" onClick={() => isAdmin ? setShowAdminModal(true) : alert('Acceso denegado: solo admins')}>Crear administrador</button>
        </div>
      </div>

      <div style={{ marginTop:20 }} className="metrics">
        <div className="card">
          <h3 style={{ margin:0 }}>Total propietarios</h3>
          <div style={{ fontSize:28, fontWeight:800, marginTop:8 }}>{loadingMetrics ? 'Cargando...' : totals.propietarios}</div>
          <div style={{ marginTop:10 }} className="small-muted">Listado de propietarios</div>
        </div>

        <div className="card">
          <h3 style={{ margin:0 }}>Total mascotas</h3>
          <div style={{ fontSize:28, fontWeight:800, marginTop:8 }}>{loadingMetrics ? 'Cargando...' : totals.mascotas}</div>
          <div style={{ marginTop:10 }} className="small-muted">Listado de mascotas.</div>
        </div>
      </div>

      {!isAdmin && (
        <div style={{ marginTop:18, padding:12, borderRadius:10, background: 'rgba(255,255,255,0.02)' }}>
          <strong>Atención:</strong> Tu cuenta tiene permisos de usuario. Podrás visualizar datos pero las acciones de creación/edición/eliminación están reservadas a administradores.
        </div>
      )}

      {/* Modales */}
      {canEditProfile && showProfileModal && <ProfileModal userCurrent={user} onClose={() => setShowProfileModal(false)} onUpdated={handleProfileUpdated} />}
      {showAdminModal && <CreateAdminModal onClose={()=>setShowAdminModal(false)} onCreated={(n)=>console.log('Admin creado', n)} />}
      {showPropModal && <CreatePropModal onClose={()=>setShowPropModal(false)} onCreated={onPropCreated} />}
      {showMascotaModal && <CreateMascotaModal onClose={()=>setShowMascotaModal(false)} propietarios={propietariosList} onCreated={onMascotaCreated} />}

      {/* Botón logout fijo */}
      <div className="logout-fixed">
        <button className="btn btn-danger" onClick={logout}>Cerrar sesión</button>
      </div>
    </div>
  );
}