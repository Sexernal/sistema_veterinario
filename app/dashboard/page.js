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

/* --------------------- CreatePropietarioModal (AHORA permite password opcional) --------------------- */
function CreatePropModal({ onClose, onCreated }) {
  // ahora password opcional + confirmPassword
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", direccion: "" });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = [];
    if (!form.nombre || form.nombre.trim().length < 2) e.push("Nombre mínimo 2 caracteres.");
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.push("Email inválido.");
    // password es opcional: si se provee validar requisitos
    if (password) {
      if (password.length < 8) e.push("La contraseña debe tener al menos 8 caracteres.");
      if (password !== confirmPassword) e.push("Las contraseñas no coinciden.");
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
      // enviar password solo si lo proporcionó el admin
      const payload = { ...form };
      if (password) payload.password = password;

      const res = await expressApi.post('/propietarios', payload);
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

          <hr style={{ margin: '12px 0' }} />

          <label style={{display:'block', marginTop:8}}>
            <div style={{fontSize:13, fontWeight:600}}>Contraseña (opcional)</div>
            <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Dejar vacío si no quieres crear contraseña" />
            <small style={{ color: 'var(--subtext)' }}>Si la añades, el propietario podrá iniciar sesión en la app con email + contraseña.</small>
          </label>

          <label style={{display:'block', marginTop:8}}>
            <div style={{fontSize:13, fontWeight:600}}>Confirmar contraseña</div>
            <input className="input" type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} />
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
      localStorage.setItem('user', JSON.stringify(updated));
      onUpdated && onUpdated(updated);
      onClose();
    } catch (err) {
      const srv = err.response?.data;
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

/* --------------------- CreateCitaModal (nuevo) --------------------- */
function CreateCitaModal({ onClose, propietarios = [], onCreated }) {
  const [propietarioId, setPropietarioId] = useState(propietarios[0]?.id || '');
  const [mascotas, setMascotas] = useState([]);
  const [mascotaId, setMascotaId] = useState('');
  const [veterinarios, setVeterinarios] = useState([]);
  const [veterinarioId, setVeterinarioId] = useState('');
  const [fechaHora, setFechaHora] = useState(''); // datetime-local value: "YYYY-MM-DDTHH:MM"
  const [duracion, setDuracion] = useState(30);
  const [tipo, setTipo] = useState('consulta general');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (propietarios.length && !propietarioId) {
      setPropietarioId(propietarios[0].id);
    }
  }, [propietarios]);

  useEffect(() => {
    // fetch mascotas y veterinarios once modal opens or propietario changes
    const fetchData = async () => {
      try {
        // mascotas: pedir lista amplia y filtrar por owner_id (API lista mascotas)
        const [mRes, uRes] = await Promise.all([
          expressApi.get('/mascotas?page=1&limit=500'),
          expressApi.get('/users?page=1&limit=200') // traer usuarios y filtrar admins
        ]);
        const allPets = mRes.data?.data || [];
        setMascotas(allPets.filter(p => String(p.owner_id) === String(propietarioId) || String(p.propietario_id) === String(propietarioId)));
        const users = uRes.data?.data || [];
        const vets = users.filter(u => (u.role || '').toLowerCase() === 'admin');
        setVeterinarios(vets);
      } catch (err) {
        console.warn('No se pudieron cargar mascotas/veterinarios', err?.message || err);
      }
    };

    fetchData();
  }, [propietarioId]);

  useEffect(() => {
    // reset mascota selection when propietario changes
    setMascotaId('');
  }, [propietarioId]);

  const validate = () => {
    const e = [];
    if (!propietarioId) e.push('Propietario requerido.');
    if (!mascotaId) e.push('Mascota requerida.');
    if (!fechaHora) e.push('Fecha y hora requeridas.');
    // validate datetime format: simple
    if (fechaHora && isNaN(new Date(fechaHora).getTime())) e.push('Fecha/hora inválida.');
    if (!duracion || Number(duracion) <= 0) e.push('Duración inválida.');
    setErrors(e);
    return e.length === 0;
  };

  function toSQLDatetime(dtLocal) {
    // dtLocal is "YYYY-MM-DDTHH:MM" -> convert to "YYYY-MM-DD HH:MM:SS"
    if (!dtLocal) return null;
    const d = new Date(dtLocal);
    if (isNaN(d.getTime())) return null;
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  const submit = async (ev) => {
    ev?.preventDefault();
    setErrors([]);
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        mascota_id: Number(mascotaId),
        propietario_id: Number(propietarioId),
        veterinario_id: veterinarioId ? Number(veterinarioId) : null,
        tipo_consulta: tipo,
        motivo: motivo || null,
        fecha_inicio: toSQLDatetime(fechaHora),
        duracion_min: Number(duracion)
      };

      const res = await expressApi.post('/citas', payload);
      const created = res.data?.data || res.data;
      onCreated && onCreated(created);
      alert('Cita creada correctamente');
      onClose();
    } catch (err) {
      if (err?.response?.status === 409) {
        alert(err.response.data?.message || 'Conflicto: cita solapada');
      } else {
        const msg = err?.response?.data?.message || err.message || 'Error creando cita';
        setErrors([msg]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal card" style={{ maxWidth:720 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div className="title">Crear cita</div>
            <div className="subtitle">Agenda una cita para una mascota</div>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit} style={{ marginTop:12 }}>
          <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap:8 }}>
            <label>Propietario
              <select className="input" value={propietarioId} onChange={e=>setPropietarioId(e.target.value)}>
                <option value="">Selecciona propietario</option>
                {propietarios.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.email}</option>)}
              </select>
            </label>

            <label>Mascota
              <select className="input" value={mascotaId} onChange={e=>setMascotaId(e.target.value)}>
                <option value="">Selecciona mascota</option>
                {mascotas.map(m => <option key={m.id} value={m.id}>{m.nombre} — {m.especie || m.raza || ''}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap:8, marginTop:8 }}>
            <label>Veterinario (opcional)
              <select className="input" value={veterinarioId} onChange={e=>setVeterinarioId(e.target.value)}>
                <option value="">-- Ninguno --</option>
                {veterinarios.map(v => <option key={v.id} value={v.id}>{v.nombre} — {v.email}</option>)}
              </select>
            </label>

            <label>Tipo de consulta
              <select className="input" value={tipo} onChange={e=>setTipo(e.target.value)}>
                <option value="consulta general">Consulta general</option>
                <option value="vacunacion">Vacunación</option>
                <option value="urgencia">Urgencia</option>
                <option value="cirugia">Cirugía</option>
                <option value="peluqueria">Peluquería</option>
                <option value="control">Control</option>
                <option value="desparacitacion">Desparasitación</option>
              </select>
            </label>
          </div>

          <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap:8, marginTop:8 }}>
            <label>Fecha y hora
              <input className="input" type="datetime-local" value={fechaHora} onChange={e=>setFechaHora(e.target.value)} />
            </label>

            <label>Duración (min)
              <input className="input" type="number" min={5} value={duracion} onChange={e=>setDuracion(e.target.value)} />
            </label>
          </div>

          <label style={{ marginTop:8 }}>Motivo (opcional)
            <textarea className="input" rows={3} value={motivo} onChange={e=>setMotivo(e.target.value)} />
          </label>

          {errors.length>0 && (<div style={{ marginTop:10, color:'crimson' }}><ul>{errors.map((x,i)=><li key={i}>{x}</li>)}</ul></div>)}

          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button className="btn" type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Crear cita'}</button>
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
  const [userSource, setUserSource] = useState(null);
  const [totals, setTotals] = useState({ propietarios: 0, mascotas: 0 });
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showPropModal, setShowPropModal] = useState(false);
  const [showMascotaModal, setShowMascotaModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // nuevo: modal de citas
  const [showCitaModal, setShowCitaModal] = useState(false);

  const [propietariosList, setPropietariosList] = useState([]);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return router.replace('/');
    const parsed = JSON.parse(raw);
    setUser(parsed);

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

  const onCitaCreated = (newCita) => {
    // puedes manejar notificaciones o refrescar métricas si deseas
    console.log('Cita creada', newCita);
  };

  const handleProfileUpdated = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

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

      <div style={{ display:'flex', gap:16, marginTop:16, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ fontWeight:700, color:'var(--subtext)', marginRight:8 }}>Vistas</div>
          <button className="btn" onClick={() => { if(isAdmin) router.push('/propietarios'); else alert('Acceso denegado: solo admins'); }}>Ver propietarios</button>
          <button className="btn" onClick={() => { if(isAdmin) router.push('/mascotas'); else alert('Acceso denegado: solo admins'); }}>Ver mascotas</button>
          <button className="btn" onClick={() => { if(isAdmin) router.push('/citas'); else alert('Acceso denegado: solo admins'); }}>Ver citas</button>
        </div>

        <div style={{ width:1, height:36, background:'rgba(255,255,255,0.03)' }} />

        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ fontWeight:700, color:'var(--subtext)', marginRight:8 }}>Acciones</div>
          <button className="btn" onClick={() => isAdmin ? setShowPropModal(true) : alert('Acceso denegado: solo admins')}>Crear propietario</button>
          <button className="btn" onClick={() => isAdmin ? setShowMascotaModal(true) : alert('Acceso denegado: solo admins')}>Crear mascota</button>
          <button className="btn" onClick={() => isAdmin ? setShowCitaModal(true) : alert('Acceso denegado: solo admins')}>Crear cita</button>
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

      {canEditProfile && showProfileModal && <ProfileModal userCurrent={user} onClose={() => setShowProfileModal(false)} onUpdated={handleProfileUpdated} />}
      {showAdminModal && <CreateAdminModal onClose={()=>setShowAdminModal(false)} onCreated={(n)=>console.log('Admin creado', n)} />}
      {showPropModal && <CreatePropModal onClose={()=>setShowPropModal(false)} onCreated={onPropCreated} />}
      {showMascotaModal && <CreateMascotaModal onClose={()=>setShowMascotaModal(false)} propietarios={propietariosList} onCreated={onMascotaCreated} />}
      {showCitaModal && <CreateCitaModal onClose={()=>setShowCitaModal(false)} propietarios={propietariosList} onCreated={onCitaCreated} />}

      <div className="logout-fixed">
        <button className="btn btn-danger" onClick={logout}>Cerrar sesión</button>
      </div>
    </div>
  );
}