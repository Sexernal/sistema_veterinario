// app/citas/page.js 
"use client";

import { useEffect, useMemo, useState } from "react";
import expressApi from "../../lib/expressApi";
import { useRouter } from "next/navigation";

/* ----------------- CreateCitaModal (nuevo: usa backend /citas/slots si está disponible) ----------------- */
function CreateCitaModal({ propietarios = [], onClose, onCreated }) {
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

  // Mapeo duraciones (mismos valores que en backend)
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

  // Helpers tiempo
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

  // Fallback: generar slots en frontend si backend no responde
  const generateSlotsLocal = (dateStr, tipoStr, vetList, existingCitas) => {
    if (!dateStr || !tipoStr) return { slotsByVet: {}, durationMin: 0 };
    const durationMin = getDurationForTipo(tipoStr);

    // Ventanas (misma regla simplificada que backend)
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
            slotsByVet[vid].push({ start, timeStr, startIsoLocal: `${dateStr}T${timeStr}` });
          }
        }
      }
      slotsByVet[vid].sort((a,b)=> a.start.getTime() - b.start.getTime());
    }

    return { slotsByVet, durationMin };
  };

  // slots por vet (desde backend o generado local)
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
      // bloquear domingos
      if (day === 0) {
        setErrors([ "La clínica está cerrada los domingos. Si es una urgencia, llame por teléfono." ]);
        setFecha("");
        return;
      } else {
        setErrors([]);
      }
      // bloquear fechas en el pasado
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      if (dObj < todayStart) {
        setErrors([ "No se pueden agendar citas en días pasados." ]);
        setFecha("");
        return;
      }

      setIsGeneratingSlots(true);
      try {
        // Intentamos pedir slots al backend (preferible)
        const q = `/citas/slots?date=${encodeURIComponent(fecha)}&tipo=${encodeURIComponent(tipo)}${veterinarioId ? `&veterinario_id=${encodeURIComponent(veterinarioId)}` : ''}`;
        let usedSlotsByVet = {};
        try {
          const res = await expressApi.get(q);
          if (res.data && res.data.success && res.data.data && res.data.data.slotsByVet) {
            usedSlotsByVet = res.data.data.slotsByVet;
            // backend devuelve { slotsByVet: { vetId: [ { timeStr, startIsoLocal, ... } ] } }
          } else {
            // fallback: obtener citas y calcular localmente
            const cRes = await expressApi.get(`/citas?page=1&limit=1000`);
            const all = cRes.data?.data || [];
            const vetList = veterinarioId ? (veterinarios.filter(v => String(v.id) === String(veterinarioId))) : veterinarios;
            const { slotsByVet: sByV } = generateSlotsLocal(fecha, tipo, vetList, all);
            usedSlotsByVet = sByV;
          }
        } catch (err) {
          // error en backend slots => fallback local
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
    // bloquear slots en el pasado
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
      onClose();
    } catch (err) {
      if (err?.response?.status === 409) {
        setErrors([err.response.data?.message || "Conflicto: cita solapada (backend)"]);
      } else {
        setErrors([err?.response?.data?.message || err.message || "Error creando cita"]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Botones de slot estilo compacto
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
            <div className="subtitle">Selecciona fecha y luego una franja horaria disponible</div>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding:16, overflowY:'auto' }}>
          <form onSubmit={submit}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
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

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
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

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
              <label>Fecha (no domingos)
                <input className="input" type="date" value={fecha} min={todayDate} onChange={e=>setFecha(e.target.value)} />
              </label>

              <label>Duración (min)
                <input className="input" type="number" min={5} value={duracion} onChange={e=>setDuracion(e.target.value)} disabled />
                <small style={{ color:'var(--subtext)' }}>Se fija automáticamente por tipo</small>
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
              <textarea className="input" rows={3} value={motivo} onChange={e=>setMotivo(e.target.value)} />
            </label>

            {errors.length>0 && <div style={{ marginTop:10, color:'crimson' }}><ul>{errors.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}

            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button className="btn" type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Crear cita'}</button>
              <button className="btn-ghost" type="button" onClick={onClose}>Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ----------------- Detail modal (sin cambios funcionales) ----------------- */
function CitaDetailModal({ cita, onClose, onUpdated }) {
  if (!cita) return null;
  const fechaStr = cita.fecha_inicio ? new Date(cita.fecha_inicio).toLocaleString() : '-';
  const lowerEstado = (cita.estado || '').toLowerCase();
  const isTerminal = lowerEstado === 'completada' || lowerEstado === 'cancelada';

  return (
    <div className="modal-overlay">
      <div className="modal card" style={{ maxWidth:720 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div className="title">Cita — {cita.tipo_consulta || 'Consulta'}</div>
            <div className="subtitle">{cita.mascota_nombre || ''}</div>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div style={{ marginTop:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div><strong>Fecha:</strong><div style={{ color:'var(--subtext)' }}>{fechaStr}</div></div>
            <div><strong>Duración:</strong><div style={{ color:'var(--subtext)' }}>{cita.duracion_min} min</div></div>
            <div style={{ gridColumn:'1 / -1', marginTop:6 }}>
              <strong>Veterinario:</strong> <div style={{ color:'var(--subtext)' }}>{cita.veterinario_nombre || '—'}</div>
              <strong>Propietario:</strong> <div style={{ color:'var(--subtext)' }}>{cita.propietario_nombre || '—'}</div>
            </div>
          </div>

          <div style={{ marginTop:10 }}>
            <strong>Motivo:</strong>
            <div style={{ whiteSpace:'pre-wrap', color:'#cbd8ee', marginTop:6 }}>{cita.motivo || '-'}</div>
          </div>

          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button
              className="btn"
              onClick={async ()=>{ 
                if (isTerminal) return;
                try {
                  await expressApi.patch(`/citas/${cita.id}/status`, { estado: 'confirmada' });
                  onUpdated && onUpdated();
                  onClose();
                } catch (err) { alert(err?.response?.data?.message || err.message || 'Error'); }
              }}
              disabled={isTerminal}
            >
              Confirmar
            </button>

            <button
              className="btn"
              onClick={async ()=>{ 
                if (isTerminal) return;
                if (!confirm('¿Marcar esta cita como completada? Esta acción es final.')) return;
                try {
                  await expressApi.patch(`/citas/${cita.id}/status`, { estado: 'completada' });
                  onUpdated && onUpdated();
                  onClose();
                } catch (err) { alert(err?.response?.data?.message || err.message || 'Error'); }
              }}
              disabled={isTerminal}
            >
              Marcar completada
            </button>

            <button
              className="btn"
              style={{ background:'linear-gradient(90deg,#ef4444,#f97316)' }}
              onClick={async ()=>{ 
                if (isTerminal) return;
                if (!confirm('¿Cancelar esta cita? Esta acción pondrá el estado en "cancelada".')) return;
                try {
                  await expressApi.patch(`/citas/${cita.id}/status`, { estado: 'cancelada' });
                  onUpdated && onUpdated();
                  onClose();
                } catch (err) { alert(err?.response?.data?.message || err.message || 'Error'); }
              }}
              disabled={isTerminal}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------- Página principal Citas (ajustes UI: scroll en lista) ----------------- */
export default function CitasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [citas, setCitas] = useState([]);
  const [propietarios, setPropietarios] = useState([]);
  const [veterinarios, setVeterinarios] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);

  const [filterProp, setFilterProp] = useState('');
  const [filterVet, setFilterVet] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return router.replace('/');
    try {
      const user = JSON.parse(raw);
      if (user.role !== 'admin') {
        alert('Acceso denegado: sólo administradores pueden acceder.');
        router.replace('/dashboard');
      }
    } catch (e) {
      router.replace('/');
    }
  }, [router]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cRes, pRes, uRes] = await Promise.all([
        expressApi.get(`/citas?page=${page}&limit=${limit}`),
        expressApi.get(`/propietarios?page=1&limit=500`),
        expressApi.get(`/users?page=1&limit=500`)
      ]);
      setCitas(cRes.data?.data || []);
      setTotal(cRes.data?.meta?.total || Number(cRes.headers['x-total-count'] || 0));
      setPropietarios(pRes.data?.data || []);
      setVeterinarios((uRes.data?.data || []).filter(u => (u.role || '').toLowerCase() === 'admin'));
    } catch (err) {
      console.error('Error fetching citas', err);
      alert('Error cargando citas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=> { fetchAll(); }, [page]);

  const filtered = useMemo(()=> {
    return citas.filter(c => {
      if (filterProp && String(c.propietario_id) !== String(filterProp)) return false;
      if (filterVet && (String(c.veterinario_id || '') !== String(filterVet))) return false;
      if (filterEstado && c.estado !== filterEstado) return false;
      if (filterDate) {
        const d = new Date(c.fecha_inicio || c.fecha || '');
        if (isNaN(d.getTime())) return false;
        const iso = d.toISOString().slice(0,10);
        if (iso !== filterDate) return false;
      }
      return true;
    });
  }, [citas, filterProp, filterVet, filterEstado, filterDate]);

  const openCreate = () => setShowCreate(true);
  const onCreated = (c) => {
    setCitas(prev => [c, ...prev]);
    setTotal(t=> t+1);
  };

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <h1>Citas</h1>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn" onClick={openCreate}>Crear cita</button>
          <button className="btn-ghost" onClick={()=>router.push('/dashboard')}>← Volver al Dashboard</button>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <select className="input" value={filterProp} onChange={e=>setFilterProp(e.target.value)}>
          <option value="">Todos los propietarios</option>
          {propietarios.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>

        <select className="input" value={filterVet} onChange={e=>setFilterVet(e.target.value)}>
          <option value="">Todos los veterinarios</option>
          {veterinarios.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>

        <select className="input" value={filterEstado} onChange={e=>setFilterEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pendiente">pendiente</option>
          <option value="confirmada">confirmada</option>
          <option value="completada">completada</option>
          <option value="cancelada">cancelada</option>
        </select>

        <input className="input" type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} />
        <button className="btn-ghost" onClick={()=>{ setFilterProp(''); setFilterVet(''); setFilterEstado(''); setFilterDate(''); }}>Limpiar</button>
      </div>

      {loading ? <div className="card">Cargando citas...</div> : (
        <>
          <div style={{ display:'grid', gap:8, maxHeight: '60vh', overflowY: 'auto', paddingRight: 8 }}>
            {filtered.length === 0 && <div className="card">No hay citas</div>}
            {filtered.map(c => {
              const isCancelled = (c.estado || '').toLowerCase() === 'cancelada';
              const isCompleted = (c.estado || '').toLowerCase() === 'completada';
              const cardStyle = {
                display:'flex',
                justifyContent:'space-between',
                alignItems:'center',
                background: isCancelled
                  ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.18), rgba(239, 68, 68, 0.18))'
                  : isCompleted
                    ? 'linear-gradient(90deg, rgba(16,185,129,0.14), rgba(16,185,129,0.14))'
                    : undefined,
                border: isCancelled ? '1px solid rgba(255, 0, 0, 0.14)' : isCompleted ? '1px solid rgba(34,197,94,0.14)' : undefined
              };
              return (
                <div key={c.id} className="card" style={cardStyle}>
                  <div>
                    <div style={{ fontWeight:700 }}>{c.mascota_nombre || '—'} <small style={{ color:'var(--subtext)' }}>{new Date(c.fecha_inicio).toLocaleString()}</small></div>
                    <div style={{ color:'var(--subtext)' }}>{c.propietario_nombre || '-'} • {c.veterinario_nombre || '-'}</div>
                    <div style={{ color:'var(--subtext)' }}>Estado: {c.estado} • {c.duracion_min} min</div>
                  </div>

                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn" onClick={()=>setDetail(c)}>Ver / Acciones</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div className="small-muted">Mostrando {filtered.length} de {total}</div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-ghost" onClick={()=>setPage(Math.max(1, page-1))}>Anterior</button>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}><strong>{page}</strong></div>
              <button className="btn-ghost" onClick={()=>setPage(page+1)}>Siguiente</button>
            </div>
          </div>
        </>
      )}

      {showCreate && <CreateCitaModal propietarios={propietarios} onClose={()=>setShowCreate(false)} onCreated={(c)=>{ onCreated(c); }} />}

      {detail && <CitaDetailModal cita={detail} onClose={()=>{ setDetail(null); fetchAll(); }} onUpdated={()=>fetchAll()} />}
    </div>
  );
}