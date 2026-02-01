"use client";

import { useEffect, useMemo, useState } from "react";
import expressApi from "../../lib/expressApi";
import { useRouter } from "next/navigation";

/* Reutilizo el mismo MedicalModal que en mascotas para mantener comportamiento consistente */
function MedicalModal({ onClose, pet, onUploaded }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [tipo, setTipo] = useState('');
  const [nota, setNota] = useState('');
  const [peso, setPeso] = useState('');
  const [fecha, setFecha] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => { if (pet) fetchRecords(); }, [pet]);

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

  const handleFileChange = (e) => setFile(e.target.files?.[0] || null);

  const uploadRecord = async (e) => {
    e?.preventDefault();
    if (!pet) return alert('Mascota no disponible');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('pet_id', pet.id);
      fd.append('tipo', tipo || '');
      fd.append('nota', nota || '');
      if (peso !== '') fd.append('peso', peso);
      if (fecha) fd.append('fecha', fecha);
      if (file) fd.append('file', file); // opcional
      const res = await expressApi.post('/medical-records', fd, { headers: { 'Content-Type': 'multipart/form-data' }});
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
    const url = r.filepath || r.url || '';
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
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding: '12px 16px' }}>
            <div>
              <div className="title">Ficha médica — {pet?.nombre}</div>
              <div className="subtitle">Sube exámenes, fotos, recetas o registros</div>
            </div>
            <button className="btn-ghost" onClick={onClose}>✕</button>
          </div>

          <div style={{ padding:16, overflowY:'auto' }}>
            <form onSubmit={uploadRecord}>
              <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap:8 }}>
                <label>Tipo <input className="input" value={tipo} onChange={e=>setTipo(e.target.value)} /></label>
                <label>Peso (kg) <input className="input" value={peso} onChange={e=>setPeso(e.target.value)} /></label>
              </div>

              <label style={{ marginTop:8 }}>Fecha <input className="input" type="date" value={fecha} onChange={e=>setFecha(e.target.value)} /></label>

              <label style={{ marginTop:8 }}>Archivo (PDF / Imagen)
                <input className="input" type="file" accept=".pdf,image/*" onChange={handleFileChange} />
                <small style={{ color:'var(--subtext)' }}>Opcional — no es obligatorio subir archivo.</small>
              </label>

              <label style={{ marginTop:8 }}>Nota <textarea className="input" rows={3} value={nota} onChange={e=>setNota(e.target.value)} /></label>

              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <button className="btn" type="submit" disabled={uploading}>{uploading ? 'Subiendo...' : 'Subir ficha'}</button>
                <button type="button" className="btn-ghost" onClick={()=>{ setFile(null); setTipo(''); setNota(''); }}>Limpiar</button>
              </div>
            </form>

            <hr style={{ margin:'12px 0' }} />

            <div>
              <h4>Registros ({records.length})</h4>
              {loading ? <div className="card">Cargando fichas...</div> : (
                <div style={{ display:'grid', gap:8 }}>
                  {records.length === 0 && <div className="card">No hay fichas médicas</div>}

                  {/* Scrollable list para no ampliar modal */}
                  <div style={{ display:'grid', gap:8, maxHeight:'42vh', overflowY:'auto', paddingRight:8 }}>
                    {records.map(r => {
                      const fechaStr = r.fecha ? (r.fecha_display || new Date(r.fecha).toLocaleString()) : '-';
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

      {/* Detail modal */}
      {detail && (
        <div className="modal-overlay">
          <div className="modal card" style={{ maxWidth:720 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div className="title">Ficha — {detail.tipo || 'Registro'}</div>
                <div className="subtitle">{detail.mascota_nombre || ''}</div>
              </div>
              <button className="btn-ghost" onClick={()=>setDetail(null)}>✕</button>
            </div>

            <div style={{ marginTop:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div><strong>Fecha:</strong><div style={{ color:'var(--subtext)' }}>{detail.fecha_display || (detail.fecha ? new Date(detail.fecha).toLocaleString() : '-')}</div></div>
                <div><strong>Peso:</strong><div style={{ color:'var(--subtext)' }}>{(detail.peso || detail.peso === 0) ? `${Number(detail.peso).toFixed(2)} kg` : '-'}</div></div>
                <div style={{ gridColumn: '1 / -1', marginTop:6 }}>
                  <strong>Atendido por:</strong>
                  <div style={{ color:'var(--subtext)' }}>{detail.creado_por_nombre || '—'}</div>
                </div>
              </div>

              <div style={{ marginTop:10 }}>
                <strong>Nota / Observaciones:</strong>
                <div style={{ whiteSpace:'pre-wrap', color:'#cbd8ee', marginTop:6 }}>{detail.nota || '-'}</div>
              </div>

              {detail.filepath && (
                <div style={{ marginTop:12, display:'flex', gap:8 }}>
                  <a className="btn" href={detail.filepath} target="_blank" rel="noreferrer">Abrir archivo</a>
                  <a className="btn-ghost" href={detail.filepath} target="_blank" rel="noreferrer" download>Descargar</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image preview modal */}
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

/* ----------------- CreateOwnerModal y CreatePetModal ----------------- */

function CreateOwnerModal({ onClose, onCreated, initial = null }) {
  const [form, setForm] = useState({
    nombre: initial?.nombre || "",
    email: initial?.email || "",
    telefono: initial?.telefono || "",
    direccion: initial?.direccion || ""
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=> {
    // si editando, no prellenar password fields
    setPassword('');
    setConfirmPassword('');
  }, [initial]);

  const validate = () => {
    const e = [];
    if (!form.nombre || form.nombre.trim().length < 2) e.push("Nombre mínimo 2 caracteres.");
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.push("Email inválido.");
    const tel = (form.telefono || "").trim();
    if (!tel) e.push("Teléfono requerido.");
    else {
      if (/[^0-9+\-\s().]/.test(tel)) e.push("Teléfono inválido");
      const digitCount = (tel.match(/\d/g) || []).length;
      if (digitCount < 7) e.push("Teléfono inválido: debe tener al menos 7 dígitos.");
    }
    if (!form.direccion || form.direccion.trim().length < 5) e.push("Dirección requerida.");

    // password optional, pero si viene validar longitud y confirm
    if (password) {
      if (password.length < 8) e.push("La contraseña debe tener al menos 8 caracteres.");
      if (password !== confirmPassword) e.push("Las contraseñas no coinciden.");
    }

    setErrors(e);
    return e.length === 0;
  };

  const onTelefonoChange = (v) => { const cleaned = v.replace(/[^0-9+\-\s().]/g, ""); setForm(f => ({ ...f, telefono: cleaned })); };

  const submit = async (ev) => {
    ev?.preventDefault();
    setErrors([]);
    if (!validate()) return;
    setLoading(true);
    try {
      let created;
      const payload = { ...form };
      if (password) payload.password = password; // enviar solo si hay contraseña

      if (initial && initial.id) {
        const res = await expressApi.put(`/propietarios/${initial.id}`, payload);
        created = res.data?.data || res.data;
      } else {
        const res = await expressApi.post('/propietarios', payload);
        created = res.data?.data || res.data;
      }
      onCreated(created);
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
            <input className="input" inputMode="tel" value={form.telefono} onChange={(e)=>onTelefonoChange(e.target.value)} placeholder="+506 8888-9999" required />
            <small style={{ color: 'var(--subtext)' }}>Permite + - ( ) . y espacios; mínimo 7 dígitos.</small>
          </label>

          <label style={{ display:'block', marginTop:8 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>Dirección</div>
            <input className="input" value={form.direccion} onChange={(e)=>setForm({...form, direccion:e.target.value})} required />
          </label>

          <hr style={{ margin:'12px 0' }} />

          <label style={{ display:'block', marginTop:8 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>Contraseña (opcional)</div>
            <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Dejar vacío para no cambiar/crear contraseña" />
            <small style={{ color:'var(--subtext)' }}>Si la añades, el propietario podrá iniciar sesión en la app con email+contraseña.</small>
          </label>

          <label style={{ display:'block', marginTop:8 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>Confirmar contraseña</div>
            <input className="input" type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} />
          </label>

          {errors.length>0 && (<div style={{ marginTop:10, color:'crimson' }}><ul>{errors.map((x,i)=><li key={i}>{x}</li>)}</ul></div>)}

          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button className="btn" type="submit" disabled={loading}>{loading ? 'Guardando...' : (initial ? 'Guardar' : 'Crear propietario')}</button>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreatePetModal({ onClose, onCreated, owners = [], initial = null, openMedicalAfterCreate = null }) {
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
      let created;
      if (initial && initial.id) {
        const res = await expressApi.put(`/mascotas/${initial.id}`, form);
        created = res.data?.data || res.data;
      } else {
        const res = await expressApi.post('/mascotas', form);
        created = res.data?.data || res.data;
      }
      onCreated(created);
      onClose();
      if (!initial && typeof openMedicalAfterCreate === 'function') {
        openMedicalAfterCreate(created);
      }
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

/* ----------------- Página principal Propietarios ----------------- */
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

  // Medical
  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [medicalPet, setMedicalPet] = useState(null);

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

  const handleOwnerCreated = (created) => {
    setOwners(prev => {
      const exists = prev.find(p => p.id === created.id);
      if (exists) return prev.map(p => p.id === created.id ? created : p);
      return [created, ...prev];
    });
    setSelectedOwnerId(created.id);
  };

  const handlePetCreated = (created) => {
    setPets(prev => {
      const exists = prev.find(p => p.id === created.id);
      if (exists) return prev.map(p => p.id === created.id ? created : p);
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

  const openMedicalForPet = (pet) => { setMedicalPet(pet); setShowMedicalModal(true); };

  if (loading) return <div style={{ padding:24 }}><div className="card">Cargando datos...</div></div>;

  return (
    <>
      <div style={{ padding:24, display:'grid', gridTemplateColumns:'320px 1fr', gap:16 }}>
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
                        <button className="btn" onClick={()=>openMedicalForPet(p)}>Ficha médica</button>
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

      {showOwnerModal && <CreateOwnerModal initial={ownerEditing} onClose={()=>{ setShowOwnerModal(false); setOwnerEditing(null); }} onCreated={handleOwnerCreated} />}

      {showPetModal && <CreatePetModal
        initial={petEditing}
        owners={owners}
        onClose={()=>{ setShowPetModal(false); setPetEditing(null); }}
        onCreated={(c)=>{ handlePetCreated(c); }}
        openMedicalAfterCreate={(createdPet) => {
          setTimeout(()=> openMedicalForPet(createdPet), 200);
        }}
      />}

      {showMedicalModal && medicalPet && <MedicalModal pet={medicalPet} onClose={()=>{ setShowMedicalModal(false); setMedicalPet(null); }} onUploaded={(r)=>{/* opcional refrescar */}} />}

      <div style={{ position: 'fixed', right: 16, bottom: 16 }}>
        <button className="btn-ghost" onClick={() => router.push('/dashboard')}>← Volver al Dashboard</button>
      </div>
    </>
  );
}