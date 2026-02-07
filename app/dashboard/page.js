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
            <div className="title">Crear doctor</div>
            <div className="subtitle">Solo doctores pueden crear otras cuentas de doctores</div>
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
            <input className="input" value={form.telefono} onChange={(e)=>setForm({...form, telefono:e.target.value})} placeholder="+506 8888-9999" required/>
          </label>

          <label style={{ display: "block", marginTop: 8 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>Contraseña</div>
            <input className="input" type="password" value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})} />
            <small style={{ color: 'var(--subtext)' }}>Mín 8 caracteres, con min 1 mayuscula, numeros y simbolos ejem !</small>
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
            <input className="input" value={form.telefono} onChange={(e)=>setForm({...form, telefono:e.target.value})} placeholder="+506 8888-9999" required/>
            <small style={{ color: 'var(--subtext)' }}>mínimo 8 dígitos.</small>
          </label>

          <label style={{display:'block', marginTop:8}}>
            <div style={{fontSize:13, fontWeight:600}}>Dirección</div>
            <input className="input" value={form.direccion} onChange={(e)=>setForm({...form, direccion:e.target.value})} />
          </label>

          <hr style={{ margin: '12px 0' }} />

          <label style={{display:'block', marginTop:8}}>
            <div style={{fontSize:13, fontWeight:600}}>Contraseña</div>
            <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Dejar vacío si no quieres crear contraseña" />
            <small style={{ color: 'var(--subtext)' }}>Obligatoria si el propietario quiere tener una cuenta para iniciar sesión en la app mobile</small>
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
            <div style={{fontSize:13, fontWeight:600}}>Historial médico (nota breve)</div>
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
            <small style={{ color:'var(--subtext)' }}>No puedes dejarlo vacio.</small>
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

/* --------------------- CreateCitaModal (nuevo: same as app/citas/page.js) --------------------- */
/* Reemplacé el CreateCitaModal antiguo por la versión slot-driven para usar la misma UI/logic. */
function CreateCitaModal({ onClose, propietarios = [], onCreated }) {
  const [propietarioId, setPropietarioId] = useState(propietarios[0]?.id || "");
  const [mascotas, setMascotas] = useState([]);
  const [mascotaId, setMascotaId] = useState("");
  const [veterinarios, setVeterinarios] = useState([]);
  const [veterinarioId, setVeterinarioId] = useState(""); // opcional
  const [fecha, setFecha] = useState(""); // YYYY-MM-DD
  const [fechaHora, setFechaHora] = useState(""); // 'YYYY-MM-DDTHH:MM'
  const [duracion, setDuracion] = useState(30);
  const [tipo, setTipo] = useState("consulta general");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  // today string para min en date inputs
  const todayDate = new Date().toISOString().slice(0,10);

  useEffect(() => {
    if (propietarios.length && !propietarioId) setPropietarioId(propietarios[0].id);
  }, [propietarios]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [mRes, uRes] = await Promise.all([
          expressApi.get("/mascotas?page=1&limit=500"),
          expressApi.get("/users?page=1&limit=500")
        ]);
        const allPets = mRes.data?.data || [];
        setMascotas(allPets.filter(p => String(p.owner_id) === String(propietarioId) || String(p.propietario_id) === String(propietarioId)));
        const users = uRes.data?.data || [];
        setVeterinarios(users.filter(u => (u.role || "").toLowerCase() === "admin"));
      } catch (err) {
        console.warn("Error cargando mascotas/veterinarios", err);
      }
    };
    fetch();
    setMascotaId("");
    setVeterinarioId("");
  }, [propietarioId]);

  const getDurationForTipo = (t) => {
    const map = {
      "consulta general": 30,
      "vacunacion": 20,
      "urgencia": 60,
      "cirugia": 120,
      "peluqueria": 45,
      "control": 20,
      "desparacitacion": 15
    };
    return map[(t || "").toLowerCase()] || 30;
  };

  const parseTimeToMinutes = (hhmm) => {
    const [hh, mm] = hhmm.split(":").map(Number);
    return hh * 60 + mm;
  };
  const minutesToTimeStr = (m) => {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
  };

  const overlaps = (aStart, aEnd, bStart, bEnd) => (aStart < bEnd && bStart < aEnd);

  const generateSlotsLocal = (dateStr, tipoStr, vetList, existingCitas) => {
    if (!dateStr || !tipoStr) return { slotsByVet: {}, durationMin: 0 };
    const durationMin = getDurationForTipo(tipoStr);

    const getWindowsForTipo = (t) => {
      const low = (t || "").toLowerCase();
      switch (low) {
        case "vacunacion": return [{ from: "08:00", to: "12:30" }, { from: "14:00", to: "17:00" }];
        case "cirugia": return [{ from: "08:00", to: "12:00" }];
        case "peluqueria": return [{ from: "09:00", to: "16:00" }];
        case "urgencia": return [{ from: "07:00", to: "17:00" }];
        case "control":
        case "desparacitacion": return [{ from: "07:00", to: "17:00" }];
        default: return [{ from: "07:00", to: "17:00" }];
      }
    };

    const CLINIC_OPEN = "07:00";
    const CLINIC_CLOSE = "17:00";
    const step = 15;

    const citasByVet = {};
    for (const c of existingCitas) {
      const vid = c.veterinario_id ? String(c.veterinario_id) : "null";
      if (!citasByVet[vid]) citasByVet[vid] = [];
      const start = new Date(c.fecha_inicio || c.fecha || "");
      const end = new Date(start.getTime() + Number(c.duracion_min || c.duracion || 0) * 60000);
      citasByVet[vid].push({ start, end });
    }

    const slotsByVet = {};
    const windows = getWindowsForTipo(tipoStr);

    for (const vet of vetList) {
      const vid = String(vet.id);
      slotsByVet[vid] = [];
      for (const w of windows) {
        const windowFromMin = Math.max(parseTimeToMinutes(CLINIC_OPEN), parseTimeToMinutes(w.from));
        const windowToMin = Math.min(parseTimeToMinutes(CLINIC_CLOSE), parseTimeToMinutes(w.to));
        const lastStartMin = windowToMin - durationMin;
        for (let t = windowFromMin; t <= lastStartMin; t += step) {
          const timeStr = minutesToTimeStr(t);
          const startIsoLocal = `${dateStr}T${timeStr}`;
          const start = new Date(`${dateStr}T${timeStr}:00`);
          if (isNaN(start.getTime())) continue;
          const end = new Date(start.getTime() + durationMin * 60000);
          const vetCitas = citasByVet[vid] || [];
          let conflict = false;
          for (const c of vetCitas) {
            if (overlaps(start.getTime(), end.getTime(), c.start.getTime(), c.end.getTime())) {
              conflict = true;
              break;
            }
          }
          if (!conflict) {
            slotsByVet[vid].push({ timeStr, startIsoLocal });
          }
        }
      }
      slotsByVet[vid].sort((a,b)=> (a.startIsoLocal > b.startIsoLocal ? 1 : -1));
    }

    return { slotsByVet, durationMin };
  };

  const [slotsByVet, setSlotsByVet] = useState({});
  const [isGeneratingSlots, setIsGeneratingSlots] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setSlotsByVet({});
      if (!fecha) return;
      const dObj = new Date(`${fecha}T00:00:00`);
      if (isNaN(dObj.getTime())) return;
      const day = dObj.getDay();
      if (day === 0) {
        setErrors([ "La clínica está cerrada los domingos. Si es una urgencia, llame por teléfono." ]);
        setFecha("");
        return;
      } else {
        setErrors([]);
      }
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      if (dObj < todayStart) {
        setErrors([ "No se pueden agendar citas en días pasados." ]);
        setFecha("");
        return;
      }

      setIsGeneratingSlots(true);
      try {
        const q = `/citas/slots?date=${encodeURIComponent(fecha)}&tipo=${encodeURIComponent(tipo)}${veterinarioId ? `&veterinario_id=${encodeURIComponent(veterinarioId)}` : ''}`;
        let usedSlotsByVet = {};
        try {
          const res = await expressApi.get(q);
          if (res.data && res.data.success && res.data.data && res.data.data.slotsByVet) {
            usedSlotsByVet = res.data.data.slotsByVet;
          } else {
            const cRes = await expressApi.get(`/citas?page=1&limit=1000`);
            const all = cRes.data?.data || [];
            const vetList = veterinarioId ? (veterinarios.filter(v => String(v.id) === String(veterinarioId))) : veterinarios;
            const { slotsByVet: sByV } = generateSlotsLocal(fecha, tipo, vetList, all);
            usedSlotsByVet = sByV;
          }
        } catch (err) {
          const cRes = await expressApi.get(`/citas?page=1&limit=1000`);
          const all = cRes.data?.data || [];
          const vetList = veterinarioId ? (veterinarios.filter(v => String(v.id) === String(veterinarioId))) : veterinarios;
          const { slotsByVet: sByV } = generateSlotsLocal(fecha, tipo, vetList, all);
          usedSlotsByVet = sByV;
        }

        if (!mounted) return;
        setSlotsByVet(usedSlotsByVet);
      } catch (err) {
        console.error("Error generando slots", err);
        if (mounted) setSlotsByVet({});
      } finally {
        if (mounted) setIsGeneratingSlots(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [fecha, tipo, veterinarioId, veterinarios]);

  useEffect(()=> {
    const d = getDurationForTipo(tipo);
    setDuracion(d);
    setFechaHora("");
  }, [tipo]);

  function toSQLDatetime(dtLocal) {
    if (!dtLocal) return null;
    const d = new Date(dtLocal);
    if (isNaN(d.getTime())) return null;
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  const validate = () => {
    const e = [];
    if (!propietarioId) e.push("Propietario requerido.");
    if (!mascotaId) e.push("Mascota requerida.");
    if (!fechaHora) e.push("Debe seleccionar una franja horaria disponible.");
    if (!duracion || Number(duracion) <= 0) e.push("Duración inválida.");
    if (fechaHora) {
      const dt = new Date(fechaHora);
      if (isNaN(dt.getTime())) {
        e.push("Fecha/hora inválida.");
      } else {
        const now = new Date();
        if (dt.getTime() < now.getTime()) e.push("No se pueden agendar citas en el pasado.");
      }
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
        mascota_id: Number(mascotaId),
        propietario_id: Number(propietarioId),
        veterinario_id: veterinarioId ? Number(veterinarioId) : null,
        tipo_consulta: tipo,
        motivo: motivo || null,
        fecha_inicio: toSQLDatetime(fechaHora),
        duracion_min: Number(duracion)
      };
      const res = await expressApi.post("/citas", payload);
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

  const renderSlotsForVet = (vet) => {
    if (!vet) return null;
    const vid = String(vet.id);
    const list = slotsByVet[vid] || [];
    if (!list.length) return <div className="small-muted">Sin horarios disponibles para este veterinario / tipo</div>;
    return (
      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        {list.map(s => (
          <button
            key={s.startIsoLocal}
            className="btn-ghost"
            onClick={()=> {
              setFechaHora(s.startIsoLocal);
              setDuracion(getDurationForTipo(tipo));
            }}
            style={{
              borderRadius:8,
              padding:'6px 8px',
              fontSize:12,
              minWidth:56,
              textAlign:'center',
              lineHeight:'18px'
            }}
          >
            {s.timeStr}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal card" style={{ maxWidth:820, maxHeight:'82vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px' }}>
          <div>
            <div className="title">Crear cita</div>
            <div className="subtitle">Agenda una cita para una mascota</div>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding:16, overflowY:'auto' }}>
          <form onSubmit={submit} style={{ marginTop:0 }}>
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
              <label>Veterinario (opc)
                <select className="input" value={veterinarioId} onChange={e=>setVeterinarioId(e.target.value)}>
                  <option value="">-- Cualquiera --</option>
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
              <label>Fecha (no domingos)
                <input className="input" type="date" value={fecha} min={todayDate} onChange={e=>setFecha(e.target.value)} />
              </label>

              <label>Duración (min)
                <input className="input" type="number" min={5} value={duracion} onChange={e=>setDuracion(e.target.value)} disabled />
              </label>
            </div>

            <div style={{ marginTop:8 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>Horarios disponibles</div>

              {isGeneratingSlots ? <div className="card">Generando horarios...</div> : (
                <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight:8 }}>
                  {veterinarioId ? (
                    <div style={{ marginBottom:8 }}>
                      <div style={{ fontWeight:700, marginBottom:6 }}>
                        {(veterinarios.find(v=>String(v.id)===String(veterinarioId))?.nombre) || 'Veterinario'}
                      </div>
                      {renderSlotsForVet(veterinarios.find(v=>String(v.id)===String(veterinarioId)) || null)}
                    </div>
                  ) : (
                    <div style={{ display:'grid', gap:12 }}>
                      {veterinarios.length === 0 && <div className="small-muted">No hay veterinarios disponibles</div>}
                      {veterinarios.map(v => (
                        <div key={v.id} style={{ padding:8, borderRadius:8, border:'1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                            <div style={{ fontWeight:700 }}>{v.nombre} <small style={{ color:'var(--subtext)' }}>{v.email}</small></div>
                          </div>
                          {renderSlotsForVet(v)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop:10, color:'var(--subtext)' }}>
                <small>Selecciona una fecha (lunes a sábado). Luego elige una franja horaria. Si no ves franjas disponibles revisa la lista de citas del día (pueden estar todas ocupadas).</small>
              </div>
            </div>

            <label style={{ marginTop:8 }}>Motivo (opcional)
              <textarea className="input" rows={3} value={motivo} onChange={(e)=>setMotivo(e.target.value)} />
            </label>

            {errors.length>0 && (<div style={{ marginTop:10, color:'crimson' }}><ul>{errors.map((x,i)=><li key={i}>{x}</li>)}</ul></div>)}

            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button className="btn" type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Crear cita'}</button>
              <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
            </div>
          </form>
        </div>
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

  // -------------------------
  // Admin creation secret
  // -------------------------
  // Si quieres cambiar la clave sin tocar el frontend, define en .env:
  // NEXT_PUBLIC_ADMIN_SECRET=miClaveSegura
  const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'admin_secret_default';

  const handleCreateAdminClick = () => {
    if (!isAdmin) { alert('Acceso denegado: solo admins'); return; }
    const code = prompt('Ingresa la clave para crear doctor:');
    if (!code) return;
    if (code === ADMIN_SECRET) {
      setShowAdminModal(true);
    } else {
      alert('Clave incorrecta.');
    }
  };

  return (
    <div style={{ padding:24 }}>
      <div className="card" style={{ padding:16, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:56, height:56, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>🐾</div>
          <div>
            <div style={{ fontSize:20, fontWeight:800 }}>VetCare Clinic</div>
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
          <button className="btn-success" onClick={handleCreateAdminClick}>Crear doctor</button>
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