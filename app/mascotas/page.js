"use client";

import { useEffect, useMemo, useState } from "react";
import expressApi from "../../lib/expressApi";
import { useRouter } from "next/navigation";

/* Modal para crear/editar mascota*/
function PetModalSimple({ onClose, onCreated, owners = [], initial = null }) {
  const [form, setForm] = useState({
    nombre: initial?.nombre || '',
    especie: initial?.especie || '',
    raza: initial?.raza || '',
    edad: initial?.edad || '',
    historial_medico: initial?.historial_medico || '',
    owner_id: initial?.owner_id || (owners[0]?.id || '')
  });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!form.owner_id && owners[0]) setForm(f => ({ ...f, owner_id: owners[0].id })); }, [owners]);

  const submit = async (e) => {
    e?.preventDefault();
    setErrors([]);
    if (!form.nombre || !form.owner_id) return setErrors(['Nombre y propietario son requeridos']);
    setLoading(true);
    try {
      if (initial && initial.id) {
        const res = await expressApi.put(`/mascotas/${initial.id}`, form);
        onCreated(res.data?.data || res.data);
      } else {
        const res = await expressApi.post('/mascotas', form);
        onCreated(res.data?.data || res.data);
      }
      onClose();
    } catch (err) {
      setErrors([err?.response?.data?.message || err.message || 'Error']);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal card" style={{ maxWidth:700 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div className="title">{initial ? 'Editar mascota' : 'Nueva mascota'}</div>
            <div className="subtitle">Ficha del paciente</div>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit} style={{ marginTop:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <label>Nombre <input className="input" value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} required /></label>
            <label>Especie <input className="input" value={form.especie} onChange={e=>setForm({...form, especie:e.target.value})} /></label>
            <label>Raza <input className="input" value={form.raza} onChange={e=>setForm({...form, raza:e.target.value})} /></label>
            <label>Edad <input className="input" type="number" value={form.edad} onChange={e=>setForm({...form, edad:e.target.value})} /></label>
          </div>

          <label style={{ marginTop:8 }}>Propietario
            <select className="input" value={form.owner_id} onChange={e=>setForm({...form, owner_id:e.target.value})} required>
              <option value="">Selecciona propietario</option>
              {owners.map(o => <option key={o.id} value={o.id}>{o.nombre} — {o.email}</option>)}
            </select>
          </label>

          <label style={{ marginTop:8 }}>Historial médico
            <textarea className="input" rows={4} value={form.historial_medico} onChange={e=>setForm({...form, historial_medico:e.target.value})}></textarea>
          </label>

          {errors.length>0 && <div style={{ color:'crimson' }}><ul>{errors.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}

          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button className="btn" type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* Página principal de mascotas */
export default function MascotasPage() {
  const router = useRouter();
  const [pets, setPets] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  // Protección: solo admins pueden abrir esta página
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

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [pRes, oRes] = await Promise.all([
        expressApi.get('/mascotas?page=1&limit=500'),
        expressApi.get('/propietarios?page=1&limit=500')
      ]);
      setPets(pRes.data?.data || []);
      setOwners(oRes.data?.data || []);
    } catch (err) {
      console.error(err);
      alert('Error cargando datos');
    } finally { setLoading(false); }
  };

  const speciesList = useMemo(()=> {
    const s = new Set();
    for (const p of pets) if (p.especie) s.add(p.especie);
    return Array.from(s);
  }, [pets]);

  const filtered = useMemo(()=> {
    const q = filter.trim().toLowerCase();
    return pets.filter(p => {
      if (speciesFilter && p.especie !== speciesFilter) return false;
      if (!q) return true;
      return (p.nombre||'').toLowerCase().includes(q)
        || (p.raza||'').toLowerCase().includes(q)
        || (p.propietario_nombre||'').toLowerCase().includes(q);
    });
  }, [pets, filter, speciesFilter]);

  const openCreate = () => { setEditing(null); setShowModal(true); };
  const openEdit = (p) => { setEditing(p); setShowModal(true); };

  const removePet = async (id) => {
    if (!confirm('Eliminar mascota?')) return;
    try {
      await expressApi.delete(`/mascotas/${id}`);
      setPets(prev => prev.filter(x => x.id !== id));
    } catch (err) { alert(err?.response?.data?.message || err.message || 'Error'); }
  };

  if (loading) return <div style={{ padding:24 }}><div className="card">Cargando mascotas...</div></div>;

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <h1>Mascotas</h1>
        <div style={{ display:'flex', gap:8 }}>
          <input className="input" placeholder="Buscar nombre, raza o dueño" value={filter} onChange={e=>setFilter(e.target.value)} />
          <select className="input" value={speciesFilter} onChange={e=>setSpeciesFilter(e.target.value)}>
            <option value="">Todas las especies</option>
            {speciesList.map(s=> <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn" onClick={openCreate}>Nueva mascota</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
        {filtered.map(p => (
          <div key={p.id} className="card" style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:800 }}>{p.nombre} <small style={{ color:'var(--subtext)' }}>({p.especie||'-'})</small></div>
                <div style={{ color:'var(--subtext)' }}>{p.raza || '-'} • {p.edad ?? '-'} años</div>
                <div style={{ marginTop:6, color:'var(--subtext)' }}>Dueño: {p.propietario_nombre || p.owner_name || '-'}</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <button className="btn" onClick={()=>openEdit(p)}>Ver / Editar</button>
                <button className="btn" style={{ background:'linear-gradient(90deg,#ef4444,#f97316)' }} onClick={()=>removePet(p.id)}>Eliminar</button>
              </div>
            </div>
            {p.historial_medico && <div style={{ color:'#cbd8ee' }}>{p.historial_medico.substring(0,140)}{p.historial_medico.length>140?'...':''}</div>}
          </div>
        ))}
      </div>

      {showModal && <PetModalSimple initial={editing} owners={owners} onClose={()=>{ setShowModal(false); setEditing(null); }} onCreated={(c)=>{
        // evitar duplicados
        setPets(prev => {
          const exists = prev.find(x=>x.id === c.id);
          if (exists) return prev.map(x => x.id === c.id ? c : x);
          return [c, ...prev];
        });
      }} />}

      <div style={{ position:'fixed', right:18, bottom:18 }}>
        <button className="btn btn-ghost" onClick={()=>router.push('/dashboard')} style={{ padding:'10px 14px' }}>← Volver al Dashboard</button>
      </div>
    </div>
  );
}
