"use client";

import { useEffect, useMemo, useState } from "react";
import expressApi from "../../lib/expressApi";
import { useRouter } from "next/navigation";

/* ----------------- PetModalSimple: crear / editar mascota -------------- */
function PetModalSimple({ onClose, onCreated, owners = [], initial = null, openMedicalAfterCreate = null }) {
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

  useEffect(() => {
    if (!form.owner_id && owners[0]) setForm(f => ({ ...f, owner_id: owners[0].id }));
  }, [owners]);

  const submit = async (e) => {
    e?.preventDefault();
    setErrors([]);
    if (!form.nombre || !form.owner_id) return setErrors(['Nombre y propietario son requeridos']);
    setLoading(true);
    try {
      let created;
      if (initial && initial.id) {
        const res = await expressApi.put(`/mascotas/${initial.id}`, form);
        created = res.data?.data || res.data;
      } else {
        const res = await expressApi.post('/mascotas', form);
        created = res.data?.data || res.data;
      }
      onCreated(created);
      if (!initial && typeof openMedicalAfterCreate === 'function') openMedicalAfterCreate(created);
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

          <label style={{ marginTop:8 }}>Historial médico (nota breve)
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

/* ----------------- RecordDetailModal: muestra ficha completa -------------- */
function RecordDetailModal({ record, onClose }) {
  if (!record) return null;

  const fechaStr = record.fecha_display || (record.fecha ? new Date(record.fecha).toLocaleString() : '-');
  const pesoStr = (record.peso || record.peso === 0) ? `${Number(record.peso).toFixed(2)} kg` : '-';
  const creador = record.creado_por_nombre || '—';

  return (
    <div className="modal-overlay">
      <div className="modal card" style={{ maxWidth:720 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div className="title">Ficha — {record.tipo || 'Registro'}</div>
            <div className="subtitle">{record.mascota_nombre || ''}</div>
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div style={{ marginTop:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div><strong>Fecha:</strong><div style={{ color:'var(--subtext)' }}>{fechaStr}</div></div>
            <div><strong>Peso:</strong><div style={{ color:'var(--subtext)' }}>{pesoStr}</div></div>
            <div style={{ gridColumn: '1 / -1', marginTop:6 }}>
              <strong>Atendido por:</strong>
              <div style={{ color:'var(--subtext)' }}>{creador}</div>
            </div>
          </div>

          <div style={{ marginTop:10 }}>
            <strong>Nota / Observaciones:</strong>
            <div style={{ whiteSpace:'pre-wrap', color:'#cbd8ee', marginTop:6 }}>{record.nota || '-'}</div>
          </div>

          {record.filepath && (
            <div style={{ marginTop:12, display:'flex', gap:8 }}>
              <a className="btn" href={record.filepath} target="_blank" rel="noreferrer">Abrir archivo</a>
              <a className="btn-ghost" href={record.filepath} target="_blank" rel="noreferrer" download>Descargar</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------- MedicalModal: ver/crear registros médicos -------------- */
function MedicalModal({ onClose, pet, onUploaded }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [tipo, setTipo] = useState('');
  const [nota, setNota] = useState('');
  const [peso, setPeso] = useState('');
  const [fecha, setFecha] = useState('');
  const [detail, setDetail] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  useEffect(() => {
    if (!pet) return;
    fetchRecords();
  }, [pet]);

  const fetchRecords = async () => {
    if (!pet) return;
    setLoading(true);
    try {
      const res = await expressApi.get(`/medical-records?pet_id=${pet.id}`);
      setRecords(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching medical records', err);
      alert('Error cargando fichas médicas');
    } finally { setLoading(false); }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
  };

  // Ahora archivo es OPCIONAL
  const uploadRecord = async (e) => {
    e?.preventDefault();
    if (!pet) return alert('Mascota no disponible');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('pet_id', pet.id);
      fd.append('tipo', tipo || 'consulta');
      fd.append('nota', nota || '');
      if (peso !== '') fd.append('peso', peso);
      if (fecha) fd.append('fecha', fecha);
      if (file) fd.append('file', file); // opcional

      const res = await expressApi.post('/medical-records', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const created = res.data?.data || res.data;
      setFile(null); setTipo(''); setNota(''); setPeso(''); setFecha('');
      onUploaded && onUploaded(created);
      fetchRecords();
    } catch (err) {
      console.error('Upload error', err);
      alert(err?.response?.data?.message || err.message || 'Error subiendo ficha');
    } finally { setUploading(false); }
  };

  const deleteRecord = async (id) => {
    if (!confirm('Eliminar ficha médica?')) return;
    try {
      await expressApi.delete(`/medical-records/${id}`);
      fetchRecords();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Error eliminando');
    }
  };

  const renderPreviewLink = (r) => {
    const url = r.filepath || '';
    if (!url) return null;
    const ext = (url.split('.').pop() || '').toLowerCase();
    const isImage = ['png','jpg','jpeg','webp','gif'].includes(ext);
    return (
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <a className="btn" href={url} target="_blank" rel="noreferrer">Abrir archivo</a>
        <a className="btn-ghost" href={url} target="_blank" rel="noreferrer" download>Descargar</a>
        {isImage && <button className="btn-ghost" onClick={()=>setImagePreviewUrl(url)}>Ver imagen</button>}
      </div>
    );
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="modal card" style={{ maxWidth:720, maxHeight:'80vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px' }}>
            <div>
              <div className="title">Ficha médica — {pet?.nombre}</div>
              <div className="subtitle">Sube exámenes, fotos, recetas o registros</div>
            </div>
            <button className="btn-ghost" onClick={onClose}>✕</button>
          </div>

          <div style={{ padding:16, overflowY:'auto' }}>
            <form onSubmit={uploadRecord}>
              <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap:8 }}>
                <label>Tipo (ej: radiografía, análisis) <input className="input" value={tipo} onChange={e=>setTipo(e.target.value)} /></label>
                <label>Peso (kg) <input className="input" value={peso} onChange={e=>setPeso(e.target.value)} /></label>
              </div>

              <label style={{ marginTop:8 }}>Fecha <input className="input" type="date" value={fecha} onChange={e=>setFecha(e.target.value)} /></label>

              <label style={{ marginTop:8 }}>Archivo (PDF / Imagen)
                <input className="input" type="file" accept=".pdf,image/*" onChange={handleFileChange} />
                <small style={{ color:'var(--subtext)' }}>Opcional — no es obligatorio subir archivo.</small>
              </label>

              <label style={{ marginTop:8 }}>Nota / Observaciones
                <textarea className="input" rows={3} value={nota} onChange={e=>setNota(e.target.value)} />
              </label>

              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <button className="btn" type="submit" disabled={uploading}>{uploading ? 'Subiendo...' : 'Subir ficha'}</button>
                <button type="button" className="btn-ghost" onClick={()=>{ setFile(null); setTipo(''); setNota(''); setPeso(''); setFecha(''); }}>Limpiar</button>
              </div>
            </form>

            <hr style={{ margin:'12px 0' }} />

            <div>
              <h4>Registros ({records.length})</h4>
              {loading ? <div className="card">Cargando fichas...</div> : (
                <div style={{ display:'grid', gap:8 }}>
                  {records.length === 0 && <div className="card">No hay fichas médicas</div>}

                  {/* Scrollable list para evitar que modal crezca */}
                  <div style={{ display:'grid', gap:8, maxHeight:'42vh', overflowY:'auto', paddingRight:8 }}>
                    {records.map(r => {
                      const fechaStr = r.fecha_display || (r.fecha ? new Date(r.fecha).toLocaleString() : '-');
                      const pesoStr = (r.peso || r.peso === 0) ? `${Number(r.peso).toFixed(2)} kg` : '-';
                      const creador = r.creado_por_nombre || '—';
                      return (
                        <div key={r.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div>
                            <div style={{ fontWeight:700 }}>
                              {r.tipo || 'Archivo'} <small style={{ color:'var(--subtext)' }}>{fechaStr}</small>
                            </div>
                            <div style={{ color:'var(--subtext)' }}>
                              {r.nota ? (r.nota.length>140 ? r.nota.substring(0,140)+'...' : r.nota) : (r.filename || '-')}
                            </div>
                            <div style={{ color:'var(--subtext)', marginTop:6 }}>
                              <small> Peso: {pesoStr} • Atendido por: {creador} </small>
                            </div>
                          </div>

                          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                            <button className="btn" onClick={()=>setDetail(r)}>Ver ficha</button>
                            {renderPreviewLink(r)}
                            <button className="btn" style={{ background:'linear-gradient(90deg,#ef4444,#f97316)' }} onClick={()=>deleteRecord(r.id)}>Eliminar</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {detail && <RecordDetailModal record={detail} onClose={()=>setDetail(null)} />}

      {imagePreviewUrl && (
        <div className="modal-overlay" onClick={()=>setImagePreviewUrl(null)} style={{ cursor:'pointer' }}>
          <div className="modal card" style={{ maxWidth: '90vw', maxHeight:'90vh', display:'flex', justifyContent:'center', alignItems:'center' }} onClick={(e)=>e.stopPropagation()}>
            <div style={{ width:'100%', height:'100%', display:'flex', justifyContent:'center', alignItems:'center' }}>
              <img src={imagePreviewUrl} alt="preview" style={{ maxWidth:'100%', maxHeight:'88vh', objectFit:'contain', borderRadius:8 }} />
            </div>
            <button className="btn-ghost" onClick={()=>setImagePreviewUrl(null)} style={{ position:'absolute', right:12, top:12 }}>✕</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ----------------- Página principal de mascotas ------------------- */
export default function MascotasPage() {
  const router = useRouter();
  const [pets, setPets] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [medicalPet, setMedicalPet] = useState(null);

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

  const openMedicalForPet = (petObj) => {
    setMedicalPet(petObj);
    setShowMedicalModal(true);
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
                <button className="btn" onClick={()=>openMedicalForPet(p)}>Ficha médica</button>
                <button className="btn" style={{ background:'linear-gradient(90deg,#ef4444,#f97316)' }} onClick={()=>removePet(p.id)}>Eliminar</button>
              </div>
            </div>
            {p.historial_medico && <div style={{ color:'#cbd8ee' }}>{p.historial_medico.substring(0,140)}{p.historial_medico.length>140?'...':''}</div>}
          </div>
        ))}
      </div>

      {showModal && <PetModalSimple
        initial={editing}
        owners={owners}
        onClose={()=>{ setShowModal(false); setEditing(null); }}
        onCreated={(c)=>{
          setPets(prev => {
            const exists = prev.find(x=>x.id === c.id);
            if (exists) return prev.map(x => x.id === c.id ? c : x);
            return [c, ...prev];
          });
        }}
        openMedicalAfterCreate={(createdPet) => {
          setTimeout(()=> openMedicalForPet(createdPet), 200);
        }}
      />}

      {showMedicalModal && medicalPet && <MedicalModal
        pet={medicalPet}
        onClose={()=>{ setShowMedicalModal(false); setMedicalPet(null); }}
        onUploaded={(r)=> { /* opcional: fetchAll(); */ }}
      />}

      <div style={{ position:'fixed', right:18, bottom:18 }}>
        <button className="btn btn-ghost" onClick={()=>router.push('/dashboard')} style={{ padding:'10px 14px' }}>← Volver al Dashboard</button>
      </div>
    </div>
  );
}