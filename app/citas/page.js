// app/citas/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import expressApi from "../../lib/expressApi";
import { useRouter } from "next/navigation";

/* ----------------- CreateCitaModal (similar al que ya tienes en dashboard) ----------------- */
function CreateCitaModal({ propietarios = [], onClose, onCreated }) {
  const [propietarioId, setPropietarioId] = useState(propietarios[0]?.id || "");
  const [mascotas, setMascotas] = useState([]);
  const [mascotaId, setMascotaId] = useState("");
  const [veterinarios, setVeterinarios] = useState([]);
  const [veterinarioId, setVeterinarioId] = useState("");
  const [fechaHora, setFechaHora] = useState("");
  const [duracion, setDuracion] = useState(30);
  const [tipo, setTipo] = useState("consulta general");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (propietarios.length && !propietarioId) setPropietarioId(propietarios[0].id);
  }, [propietarios]);

  useEffect(() => {
    // traer mascotas y usuarios (filtrar admins para veterinarios)
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
    if (!fechaHora) e.push("Fecha y hora requeridas.");
    if (fechaHora && isNaN(new Date(fechaHora).getTime())) e.push("Fecha/hora inválida.");
    if (!duracion || Number(duracion) <= 0) e.push("Duración inválida.");
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
        setErrors([err.response.data?.message || "Conflicto: cita solapada"]);
      } else {
        setErrors([err?.response?.data?.message || err.message || "Error creando cita"]);
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

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
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

          {errors.length>0 && <div style={{ marginTop:10, color:'crimson' }}><ul>{errors.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}

          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button className="btn" type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Crear cita'}</button>
            <button className="btn-ghost" type="button" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ----------------- Detail modal ----------------- */
function CitaDetailModal({ cita, onClose, onUpdated }) {
  if (!cita) return null;
  const fechaStr = cita.fecha_inicio ? new Date(cita.fecha_inicio).toLocaleString() : '-';
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
            <button className="btn" onClick={async ()=>{
              try {
                await expressApi.patch(`/citas/${cita.id}/status`, { estado: 'confirmada' });
                onUpdated && onUpdated();
                onClose();
              } catch (err) { alert(err?.response?.data?.message || err.message || 'Error'); }
            }}>Confirmar</button>

            <button className="btn" onClick={async ()=>{
              try {
                await expressApi.patch(`/citas/${cita.id}/status`, { estado: 'completada' });
                onUpdated && onUpdated();
                onClose();
              } catch (err) { alert(err?.response?.data?.message || err.message || 'Error'); }
            }}>Marcar completada</button>

            <button className="btn" style={{ background:'linear-gradient(90deg,#ef4444,#f97316)' }} onClick={async ()=>{
              if (!confirm('¿Eliminar (cancelar) esta cita?')) return;
              try {
                await expressApi.delete(`/citas/${cita.id}`);
                onUpdated && onUpdated();
                onClose();
              } catch (err) { alert(err?.response?.data?.message || err.message || 'Error'); }
            }}>Cancelar / Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------- Página principal Citas ----------------- */
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
    // prefijo para mantener la lista actual; podrías re-fetch si prefieres
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
          <div style={{ display:'grid', gap:8 }}>
            {filtered.length === 0 && <div className="card">No hay citas</div>}
            {filtered.map(c => (
              <div key={c.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontWeight:700 }}>{c.mascota_nombre || '—'} <small style={{ color:'var(--subtext)' }}>{new Date(c.fecha_inicio).toLocaleString()}</small></div>
                  <div style={{ color:'var(--subtext)' }}>{c.propietario_nombre || '-'} • {c.veterinario_nombre || '-'}</div>
                  <div style={{ color:'var(--subtext)' }}>Estado: {c.estado} • {c.duracion_min} min</div>
                </div>

                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn" onClick={()=>setDetail(c)}>Ver / Acciones</button>
                </div>
              </div>
            ))}
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