"use client";

import { useEffect, useMemo, useState } from "react";
import expressApi from "../../lib/expressApi";
import { useRouter } from "next/navigation";

/*
  Página Propietarios + Mascotas (mejorada)
  - Protección: solo admin puede abrir
  - Evita duplicados al editar (reemplaza en vez de prepend)
  - Validación teléfono (permite + - ( ) . espacios; no letras) y campos obligatorios
  - Botón fijo "Volver al Dashboard"
*/

function CreateOwnerModal({ onClose, onCreated, initial = null }) {
  const [form, setForm] = useState({
    nombre: initial?.nombre || "",
    email: initial?.email || "",
    telefono: initial?.telefono || "",
    direccion: initial?.direccion || ""
  });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = [];
    if (!form.nombre || form.nombre.trim().length < 2) e.push("Nombre mínimo 2 caracteres.");
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.push("Email inválido.");

    // Teléfono: permitir dígitos y símbolos + - ( ) . y espacios, pero no letras.
    const tel = (form.telefono || "").trim();
    if (!tel) {
      e.push("Teléfono requerido.");
    } else {
      if (/[^0-9+\-\s().]/.test(tel)) {
        e.push("Teléfono inválido: solo dígitos y símbolos + - ( ) . y espacios.");
      }
      const digitCount = (tel.match(/\d/g) || []).length;
      if (digitCount < 7) {
        e.push("Teléfono inválido: debe tener al menos 7 dígitos.");
      }
    }

    if (!form.direccion || form.direccion.trim().length < 5) e.push("Dirección requerida.");
    setErrors(e);
    return e.length === 0;
  };

  // Forzar caracteres válidos mientras escribe: solo 0-9 + - ( ) . y espacios
  const onTelefonoChange = (v) => {
    const cleaned = v.replace(/[^0-9+\-\s().]/g, "");
    setForm(f => ({ ...f, telefono: cleaned }));
  };

  const submit = async (ev) => {
    ev?.preventDefault();
    setErrors([]);
    if (!validate()) return;
    setLoading(true);
    try {
      if (initial && initial.id) {
        const res = await expressApi.put(`/propietarios/${initial.id}`, form);
        onCreated(res.data?.data || res.data);
      } else {
        const res = await expressApi.post('/propietarios', form);
        onCreated(res.data?.data || res.data);
      }
      onClose();
    } catch (err) {
      const srv = err?.response?.data;
      const msg = srv?.message || err.message || 'Error desconocido';
      setErrors([msg]);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal card" style={{ maxWidth:560 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div className="title">{initial ? 'Editar propietario' : 'Crear propietario'}</div>
            <div className="subtitle">Registra los datos del propietario</div>
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
            <input
              className="input"
              inputMode="tel"
              value={form.telefono}
              onChange={(e)=>onTelefonoChange(e.target.value)}
              placeholder="+506 8888-9999"
              required
            />
            <small style={{ color: 'var(--subtext)' }}>Permite + - ( ) . y espacios; mínimo 7 dígitos.</small>
          </label>

          <label style={{ display:'block', marginTop:8 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>Dirección</div>
            <input className="input" value={form.direccion} onChange={(e)=>setForm({...form, direccion:e.target.value})} required />
          </label>

          {errors.length>0 && (
            <div style={{ marginTop:10, color:'crimson' }}>
              <ul>{errors.map((x,i)=><li key={i}>{x}</li>)}</ul>
            </div>
          )}

          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button className="btn" type="submit" disabled={loading}>{loading ? 'Guardando...' : (initial ? 'Guardar' : 'Crear propietario')}</button>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreatePetModal({ onClose, onCreated, owners = [], initial = null }) {
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

  useEffect(()=>{ if(!form.owner_id && owners[0]) setForm(f=>({ ...f, owner_id: owners[0].id })); }, [owners]);

  const validate = () => {
    const e = [];
    if (!form.nombre || !form.owner_id) e.push('Nombre y propietario son requeridos');
    setErrors(e);
    return e.length === 0;
  };

  const submit = async (ev) => {
    ev?.preventDefault();
    setErrors([]);
    if (!validate()) return;
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
      const msg = err?.response?.data?.message || err.message || 'Error';
      setErrors([msg]);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal card" style={{ maxWidth:640 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div className="title">{initial ? 'Editar mascota' : 'Nueva mascota'}</div>
            <div className="subtitle">Asocia la mascota a un propietario</div>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit} style={{ marginTop:12 }}>
          <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap:8 }}>
            <label>Nombre <input className="input" value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} required/></label>
            <label>Especie <input className="input" value={form.especie} onChange={e=>setForm({...form, especie:e.target.value})}/></label>
            <label>Raza <input className="input" value={form.raza} onChange={e=>setForm({...form, raza:e.target.value})}/></label>
            <label>Edad <input className="input" type="number" value={form.edad} onChange={e=>setForm({...form, edad:e.target.value})}/></label>
          </div>

          <label style={{ marginTop:8 }}>Propietario
            <select className="input" value={form.owner_id} onChange={e=>setForm({...form, owner_id:e.target.value})} required>
              <option value="">Selecciona propietario</option>
              {owners.map(o => <option key={o.id} value={o.id}>{o.nombre} — {o.email}</option>)}
            </select>
          </label>

          <label style={{ marginTop:8 }}>Historial médico
            <textarea className="input" rows={3} value={form.historial_medico} onChange={e=>setForm({...form, historial_medico:e.target.value})}></textarea>
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

export default function PropietariosPage() {
  const router = useRouter();
  const [owners, setOwners] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState(null);

  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [ownerEditing, setOwnerEditing] = useState(null);

  const [showPetModal, setShowPetModal] = useState(false);
  const [petEditing, setPetEditing] = useState(null);

  // PROTECCIÓN: evita que un user abra manualmente la ruta
  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return router.replace('/');
    const user = JSON.parse(raw);
    if (user.role !== 'admin') {
      alert('Acceso denegado: sólo administradores pueden acceder.');
      router.replace('/dashboard');
    }
  }, [router]);

  useEffect(()=>{ fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [pRes, oRes] = await Promise.all([
        expressApi.get('/mascotas?page=1&limit=500'),
        expressApi.get('/propietarios?page=1&limit=500')
      ]);
      setPets(pRes.data?.data || []);
      setOwners(oRes.data?.data || []);
      if ((oRes.data?.data || []).length > 0 && selectedOwnerId === null) setSelectedOwnerId(oRes.data.data[0].id);
    } catch (err) {
      console.error(err);
      alert('Error cargando datos');
    } finally { setLoading(false); }
  };

  const petsByOwner = useMemo(() => {
    const map = {};
    for (const pet of pets) {
      const oid = pet.owner_id || pet.propietario_id || pet.ownerId || pet.propietarioId;
      if (!oid) continue;
      map[oid] = (map[oid] || 0) + 1;
    }
    return map;
  }, [pets]);

  const filteredOwners = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return owners;
    return owners.filter(o => (o.nombre||'').toLowerCase().includes(q) || (o.email||'').toLowerCase().includes(q));
  }, [owners, filter]);

  const selectedOwner = owners.find(o => o.id === selectedOwnerId) || null;

  // Manejo de insert/update para propietarios sin duplicados
  const handleOwnerCreated = (created) => {
    setOwners(prev => {
      const exists = prev.find(p => p.id === created.id);
      if (exists) {
        // actualizar inplace
        return prev.map(p => p.id === created.id ? created : p);
      }
      // nuevo -> prepend
      return [created, ...prev];
    });
    setSelectedOwnerId(created.id);
  };

  // Manejo de insert/update para mascotas sin duplicados
  const handlePetCreated = (created) => {
    setPets(prev => {
      const exists = prev.find(p => p.id === created.id);
      if (exists) {
        return prev.map(p => p.id === created.id ? created : p);
      }
      return [created, ...prev];
    });
  };

  const removePet = async (id) => {
    if (!confirm('Eliminar mascota?')) return;
    try {
      await expressApi.delete(`/mascotas/${id}`);
      setPets(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Error al eliminar');
    }
  };

  const handleOwnerDelete = async (ownerId) => {
    if (!confirm('Eliminar propietario? Esto eliminará sus mascotas.')) return;
    try {
      await expressApi.delete(`/propietarios/${ownerId}`);
      setOwners(prev => prev.filter(x => x.id !== ownerId));
      setPets(prev => prev.filter(p => p.owner_id !== ownerId));
      if (selectedOwnerId === ownerId) setSelectedOwnerId(null);
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Error al eliminar propietario');
    }
  };

  if (loading) return <div style={{ padding:24 }}><div className="card">Cargando datos...</div></div>;

  return (
    <>
      <div style={{ padding:24, display:'grid', gridTemplateColumns:'320px 1fr', gap:16 }}>
        {/* Left column: owners list */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <h2>Propietarios</h2>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn" onClick={()=>{ setOwnerEditing(null); setShowOwnerModal(true); }}>Nuevo</button>
            </div>
          </div>

          <div style={{ marginBottom:10 }}>
            <input className="input" placeholder="Buscar por nombre o email" value={filter} onChange={e=>setFilter(e.target.value)} />
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {filteredOwners.map(o => (
              <div key={o.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', background: (selectedOwnerId===o.id) ? 'linear-gradient(90deg, rgba(37,99,235,0.12), rgba(37,99,235,0.06))' : undefined }} onClick={() => setSelectedOwnerId(o.id)}>
                <div>
                  <div style={{ fontWeight:800 }}>{o.nombre}</div>
                  <div style={{ color:'var(--subtext)' }}>{o.email} • {o.telefono || '-'}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:800 }}>{petsByOwner[o.id] || 0}</div>
                  <div style={{ fontSize:12, color:'var(--subtext)' }}>mascotas</div>
                </div>
              </div>
            ))}
            {filteredOwners.length === 0 && <div className="card">No se encontraron propietarios</div>}
          </div>
        </div>

        {/* Right column: detail / pet list */}
        <div>
          {!selectedOwner && <div className="card">Selecciona un propietario para ver detalle</div>}

          {selectedOwner && (
            <div className="card" style={{ padding:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                <div>
                  <h3 style={{ margin:0 }}>{selectedOwner.nombre}</h3>
                  <div style={{ color:'var(--subtext)' }}>{selectedOwner.email} • {selectedOwner.telefono || '-'}</div>
                  {selectedOwner.direccion && <div style={{ marginTop:8 }}>{selectedOwner.direccion}</div>}
                </div>

                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <button className="btn" onClick={()=>{ setOwnerEditing(selectedOwner); setShowOwnerModal(true); }}>Editar</button>
                  <button className="btn-ghost" onClick={()=>handleOwnerDelete(selectedOwner.id)}>Eliminar</button>
                </div>
              </div>

              <hr style={{ margin:'12px 0' }} />

              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <h4 style={{ margin:0 }}>Mascotas ({petsByOwner[selectedOwner.id] || 0})</h4>
                  <div>
                    <button className="btn" onClick={()=>{ setPetEditing(null); setShowPetModal(true); }}>Agregar mascota</button>
                  </div>
                </div>

                <div style={{ display:'grid', gap:8 }}>
                  {pets.filter(p=> (p.owner_id || p.propietario_id) == selectedOwner.id).map(p => (
                    <div key={p.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontWeight:800 }}>{p.nombre} <small style={{ color:'var(--subtext)' }}>({p.especie || '-'})</small></div>
                        <div style={{ color:'var(--subtext)' }}>{p.raza || '-'} • {p.edad ?? '-'} años</div>
                        {p.historial_medico && <div style={{ marginTop:6, color:'#cbd8ee' }}>{p.historial_medico.substring(0,120)}{p.historial_medico.length>120?'...':''}</div>}
                      </div>

                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        <button className="btn" onClick={()=>{ setPetEditing(p); setShowPetModal(true); }}>Ver / Editar</button>
                        <button className="btn" style={{ background:'linear-gradient(90deg,#ef4444,#f97316)' }} onClick={()=>removePet(p.id)}>Eliminar</button>
                      </div>
                    </div>
                  ))}

                  {pets.filter(p=> (p.owner_id || p.propietario_id) == selectedOwner.id).length === 0 && (
                    <div className="card">Este propietario no tiene mascotas registradas.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modales flotantes */}
      {showOwnerModal && <CreateOwnerModal initial={ownerEditing} onClose={()=>{ setShowOwnerModal(false); setOwnerEditing(null); }} onCreated={handleOwnerCreated} />}
      {showPetModal && <CreatePetModal initial={petEditing} owners={owners} onClose={()=>{ setShowPetModal(false); setPetEditing(null); }} onCreated={handlePetCreated} />}

      {/* Botón volver al dashboard fijo */}
      <div style={{ position: 'fixed', right: 16, bottom: 16 }}>
        <button className="btn-ghost" onClick={() => router.push('/dashboard')}>← Volver al Dashboard</button>
      </div>
    </>
  );
}
