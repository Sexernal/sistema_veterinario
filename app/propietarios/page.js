// app/propietarios/page.js
"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import expressApi from "../../lib/expressApi";
import VacunasModal from "../../components/VacunasModal";
import FichasModal from "../../components/fichas/FichasModal";
import { ModalBase, ErrorList, getSpeciesIcon } from "../../components/ui";
import { aFechaInput as toDateInput } from "../../components/fechas";

function calcEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const ymd = typeof fechaNacimiento === "string" ? fechaNacimiento.slice(0, 10) : null;
  const nac = ymd ? new Date(ymd + "T00:00:00") : new Date(fechaNacimiento);
  if (isNaN(nac.getTime())) return null;
  const hoy = new Date();
  if (nac > hoy) return null;
  let years  = hoy.getFullYear() - nac.getFullYear();
  let months = hoy.getMonth()    - nac.getMonth();
  if (hoy.getDate() < nac.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  if (years <= 0 && months <= 0) {
    const dias = Math.max(0, Math.floor((hoy - nac) / 86400000));
    return dias === 0 ? "Recién nacido" : `${dias} día${dias !== 1 ? "s" : ""}`;
  }
  if (years === 0)  return `${months} ${months === 1 ? "mes" : "meses"}`;
  if (months === 0) return `${years} año${years !== 1 ? "s" : ""}`;
  return `${years} año${years !== 1 ? "s" : ""} y ${months} ${months === 1 ? "mes" : "meses"}`;
}

// ─── Modal: Crear / Editar Propietario ───────────────────────────────────────
function OwnerModal({ onClose, onSaved, initial = null }) {
  const isEditing = !!initial?.id;
  const [form, setForm] = useState({
    nombre:    initial?.nombre    || "",
    email:     initial?.email     || "",
    telefono:  initial?.telefono  || "",
    direccion: initial?.direccion || "",
  });
  const [cedula, setCedula]                   = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors]   = useState([]);
  const [loading, setLoading] = useState(false);

  const onCedulaChange   = (v) => setCedula(v.replace(/\D/g,"").slice(0,9));
  const onTelefonoChange = (v) => setForm(f=>({...f,telefono:v.replace(/[^0-9+\-\s().]/g,"")}));

  const validate = () => {
    const e = [];
    if (form.nombre.trim().length < 2)   e.push("Nombre mínimo 2 caracteres.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.push("Email inválido.");
    const tel = form.telefono.trim();
    if (!tel) { e.push("Teléfono requerido."); }
    else {
      if (/[^0-9+\-\s().]/.test(tel)) e.push("Teléfono: solo dígitos y + - ( ) . espacios.");
      if ((tel.match(/\d/g)||[]).length < 7) e.push("Teléfono: mínimo 7 dígitos.");
    }
    if (form.direccion.trim().length < 5) e.push("Dirección requerida (mínimo 5 caracteres).");
    if (!isEditing && cedula && cedula.length !== 9) e.push("Cédula debe tener exactamente 9 dígitos.");
    if (password) {
      if (password !== confirmPassword) e.push("Las contraseñas no coinciden.");
    }
    setErrors(e);
    return e.length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { ...form };
      if (!isEditing) { if (cedula) payload.cedula=cedula; if (password) payload.password=password; }
      else { if (password) payload.password=password; }
      const res = isEditing
        ? await expressApi.put(`/propietarios/${initial.id}`, payload)
        : await expressApi.post("/propietarios", payload);
      onSaved(res.data?.data || res.data);
      onClose();
    } catch (err) {
      setErrors([err?.response?.data?.message || err.message || "Error desconocido"]);
    } finally { setLoading(false); }
  };

  return (
    <ModalBase title={isEditing?"Editar propietario":"Nuevo propietario"}
      subtitle="Registra los datos del dueño de la mascota" onClose={onClose}>
      <form onSubmit={submit}>
        {isEditing && initial?.cedula && (
          <div style={{ marginBottom:4 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>Cédula</div>
            <div style={{
              display:"inline-flex", alignItems:"center", gap:8, padding:"6px 14px", borderRadius:8,
              background:"rgba(96,165,250,0.08)", border:"1px solid rgba(96,165,250,0.2)",
              fontFamily:"monospace", fontSize:15, fontWeight:700, letterSpacing:"0.1em",
            }}>🪪 {initial.cedula}</div>
            <div style={{ marginTop:4, fontSize:11, color:"var(--subtext)" }}>La cédula no se puede modificar.</div>
          </div>
        )}
        {!isEditing && (
          <label style={{ display:"block", marginBottom:4 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Cédula</div>
            <input className="input" inputMode="numeric" maxLength={9} value={cedula}
              onChange={e=>onCedulaChange(e.target.value)} placeholder="000000000" />
            <small style={{ color:"var(--subtext)" }}>9 dígitos. Requerida para inicio de sesión en la app móvil.</small>
          </label>
        )}
        {[{label:"Nombre Completo",key:"nombre",type:"text"},{label:"Email",key:"email",type:"email"},{label:"Dirección",key:"direccion",type:"text"}]
          .map(({label,key,type})=>(
          <label key={key} style={{ display:"block", marginTop:10 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>{label}</div>
            <input className="input" type={type} value={form[key]}
              onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} required />
          </label>
        ))}
        <label style={{ display:"block", marginTop:10 }}>
          <div style={{ fontSize:13, fontWeight:600 }}>Teléfono</div>
          <input className="input" inputMode="tel" value={form.telefono}
            onChange={e=>onTelefonoChange(e.target.value)} placeholder="+506 8888-9999" required />
          <small style={{ color:"var(--subtext)" }}>8 dígitos. Favor seguir el formato mostrado.</small>
        </label>
        <hr style={{ margin:"14px 0", borderColor:"rgba(255,255,255,0.05)" }} />
        <label style={{ display:"block", marginTop:10 }}>
          <div style={{ fontSize:13, fontWeight:600 }}>{isEditing?"Nueva contraseña (opcional)":"Contraseña"}</div>
          <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)}
            placeholder={isEditing?"Dejar vacío para no cambiar":"Dejar vacío si no necesita acceso a la app móvil"} />
          <small style={{ color:"var(--subtext)" }}>{isEditing?"Solo si deseas cambiar la contraseña del propietario.":"Para que el usuario pueda iniciar sesión desde la app móvil."}</small>
        </label>
        {password && (
          <label style={{ display:"block", marginTop:10 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>Confirmar contraseña</div>
            <input className="input" type="password" value={confirmPassword}
              onChange={e=>setConfirmPassword(e.target.value)} placeholder="Repetir contraseña" />
          </label>
        )}
        <ErrorList errors={errors} />
        <div style={{ display:"flex", gap:8, marginTop:16 }}>
          <button className="btn" type="submit" disabled={loading}>
            {loading?"Guardando...":(isEditing?"Guardar cambios":"Crear propietario")}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </ModalBase>
  );
}

// ─── Modal: Crear / Editar Mascota ───────────────────────────────────────────
function PetModal({ onClose, onSaved, owners = [], initial = null }) {
  const isEditing = !!initial?.id;
  const [form, setForm] = useState({
    nombre:initial?.nombre||"", especie:initial?.especie||"", raza:initial?.raza||"",
    fecha_nacimiento:toDateInput(initial?.fecha_nacimiento), historial_medico:initial?.historial_medico||"",
    owner_id:initial?.owner_id||owners[0]?.id||"",
  });
  const [errors,setErrors]   = useState([]);
  const [loading,setLoading] = useState(false);

  const validate = () => {
    const e = [];
    if (!form.nombre.trim()) e.push("Nombre es requerido.");
    if (!form.owner_id)      e.push("Debe seleccionar un propietario.");
    setErrors(e); return e.length===0;
  };

  const submit = async (ev) => {
    ev.preventDefault(); if (!validate()) return;
    setLoading(true);
    try {
      const payload = {...form, fecha_nacimiento:form.fecha_nacimiento||null, owner_id:Number(form.owner_id)};
      const res = isEditing
        ? await expressApi.put(`/mascotas/${initial.id}`, payload)
        : await expressApi.post("/mascotas", payload);
      onSaved(res.data?.data||res.data); onClose();
    } catch (err) { setErrors([err?.response?.data?.message||err.message||"Error"]); }
    finally { setLoading(false); }
  };

  return (
    <ModalBase title={isEditing?"Editar mascota":"Nueva mascota"}
      subtitle="Asocia la mascota a un propietario" onClose={onClose} maxWidth={600}>
      <form onSubmit={submit}>
        <label style={{ display:"block", marginTop:10 }}>
          <div style={{ fontSize:13, fontWeight:600 }}>Nombre</div>
          <input className="input" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} required />
        </label>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:10 }}>
          {[{label:"Especie",key:"especie"},{label:"Raza",key:"raza"}].map(({label,key})=>(
            <label key={key}>
              <div style={{ fontSize:13, fontWeight:600 }}>{label}</div>
              <input className="input" value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} />
            </label>
          ))}
        </div>
        <label style={{ display:"block", marginTop:10 }}>
          <div style={{ fontSize:13, fontWeight:600 }}>Fecha de nacimiento</div>
          <input className="input" type="date" value={form.fecha_nacimiento}
            onChange={e=>setForm(f=>({...f,fecha_nacimiento:e.target.value}))} />
        </label>
        <label style={{ display:"block", marginTop:10 }}>
          <div style={{ fontSize:13, fontWeight:600 }}>Propietario</div>
          <select className="input" value={form.owner_id}
            onChange={e=>setForm(f=>({...f,owner_id:e.target.value}))} required>
            <option value="">-- Seleccionar propietario --</option>
            {owners.map(o=><option key={o.id} value={o.id}>{o.nombre} — {o.email}</option>)}
          </select>
        </label>
        <label style={{ display:"block", marginTop:10 }}>
          <div style={{ fontSize:13, fontWeight:600 }}>Observaciones</div>
          <textarea className="input" rows={3} value={form.historial_medico}
            onChange={e=>setForm(f=>({...f,historial_medico:e.target.value}))} />
        </label>
        <ErrorList errors={errors} />
        <div style={{ display:"flex", gap:8, marginTop:16 }}>
          <button className="btn" type="submit" disabled={loading}>{loading?"Guardando...":"Guardar"}</button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </ModalBase>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function PropietariosPage() {
  const router = useRouter();
  const [user, setUser]               = useState(null);
  const [owners, setOwners]           = useState([]);
  const [pets,   setPets]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState(null);
  const [ownerModal, setOwnerModal]   = useState(null);
  const [petModal,   setPetModal]     = useState(null);
  const [fichasTarget, setFichasTarget]   = useState(null);
  const [vacunasTarget, setVacunasTarget] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return router.replace("/");
    setUser(JSON.parse(raw));
    fetchAll();
  }, [router]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [oRes, pRes] = await Promise.all([
        expressApi.get("/propietarios?page=1&limit=500"),
        expressApi.get("/mascotas?page=1&limit=500"),
      ]);
      const ownerList = oRes.data?.data || [];
      setOwners(ownerList);
      setPets(pRes.data?.data || []);
      setSelectedOwnerId(prev => prev ?? ownerList[0]?.id ?? null);
    } catch (err) { console.error("Error cargando datos:", err); }
    finally { setLoading(false); }
  };

  const petsByOwner = useMemo(() => {
    const map = {};
    for (const p of pets) {
      const oid = p.owner_id || p.propietario_id;
      if (oid) map[oid] = (map[oid]||0)+1;
    }
    return map;
  }, [pets]);

  const filteredOwners = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return owners;
    return owners.filter(o=>
      (o.nombre||"").toLowerCase().includes(q)||
      (o.email||"").toLowerCase().includes(q)||
      (o.telefono||"").includes(q)||
      (o.cedula||"").includes(q)
    );
  }, [owners, filter]);

  const selectedOwner = owners.find(o=>o.id===selectedOwnerId) ?? null;
  const selectedPets  = pets.filter(p=>(p.owner_id||p.propietario_id)==selectedOwnerId);
  const isAdmin       = user?.role === "admin";

  const handleOwnerSaved = (saved) => {
    setOwners(prev=>{ const e=prev.find(o=>o.id===saved.id); return e?prev.map(o=>o.id===saved.id?saved:o):[saved,...prev]; });
    setSelectedOwnerId(saved.id);
  };
  const handlePetSaved = (saved) => {
    setPets(prev=>{ const e=prev.find(p=>p.id===saved.id); return e?prev.map(p=>p.id===saved.id?saved:p):[saved,...prev]; });
  };

  const deleteOwner = async (id) => {
    if (!confirm("¿Eliminar este propietario? También se eliminarán sus mascotas.")) return;
    try {
      await expressApi.delete(`/propietarios/${id}`);
      setOwners(prev=>prev.filter(o=>o.id!==id));
      setPets(prev=>prev.filter(p=>p.owner_id!==id&&p.propietario_id!==id));
      setSelectedOwnerId(prev=>prev===id?(owners.find(o=>o.id!==id)?.id??null):prev);
    } catch (err) { alert(err?.response?.data?.message||err.message||"Error al eliminar"); }
  };

  const deletePet = async (id) => {
    if (!confirm("¿Eliminar esta mascota?")) return;
    try {
      await expressApi.delete(`/mascotas/${id}`);
      setPets(prev=>prev.filter(p=>p.id!==id));
    } catch (err) { alert(err?.response?.data?.message||err.message||"Error al eliminar"); }
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
      <div className="card" style={{ padding:32, textAlign:"center" }}>
        <div style={{ fontSize:36, marginBottom:10 }}>⏳</div>
        <div>Cargando datos...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)" }}>
      <header style={{
        position:"sticky", top:0, zIndex:100,
        background:"rgba(11,16,32,0.92)", backdropFilter:"blur(12px)",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
        padding:"0 24px", height:60,
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button className="btn-ghost" onClick={()=>router.push("/dashboard")}
            style={{ padding:"6px 12px", fontSize:13 }}>← Volver</button>
          <div style={{ width:1, height:24, background:"rgba(255,255,255,0.08)" }} />
          <div style={{ fontWeight:800, fontSize:16 }}>
            Propietarios
            <span style={{ marginLeft:8, fontSize:12, fontWeight:400, color:"var(--subtext)" }}>
              {owners.length} registrados
            </span>
          </div>
        </div>
        <button className="btn" onClick={()=>setOwnerModal("new")}>+ Nuevo propietario</button>
      </header>

      <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", height:"calc(100vh - 60px)" }}>
        {/* Panel izquierdo */}
        <div style={{ borderRight:"1px solid rgba(255,255,255,0.06)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ padding:"12px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
            <input className="input" placeholder="Buscar por nombre, email o cédula..."
              value={filter} onChange={e=>setFilter(e.target.value)} style={{ margin:0 }} />
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"8px" }}>
            {filteredOwners.length === 0 && (
              <div style={{ padding:16, textAlign:"center", color:"var(--subtext)", fontSize:13 }}>
                No se encontraron propietarios
              </div>
            )}
            {filteredOwners.map(o => {
              const active = selectedOwnerId === o.id;
              return (
                <button key={o.id} onClick={()=>setSelectedOwnerId(o.id)}
                  style={{
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                    width:"100%", padding:"11px 13px", borderRadius:10, marginBottom:4,
                    border:`1px solid ${active?"rgba(96,165,250,0.4)":"transparent"}`,
                    background:active?"rgba(96,165,250,0.08)":"transparent",
                    color:"var(--text)", textAlign:"left", cursor:"pointer", transition:"all 0.12s",
                  }}
                  onMouseEnter={e=>{ if(!active) e.currentTarget.style.background="rgba(255,255,255,0.03)"; }}
                  onMouseLeave={e=>{ if(!active) e.currentTarget.style.background="transparent"; }}
                >
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.nombre}</div>
                    <div className="small-muted" style={{ fontSize:12, marginTop:2 }}>{o.email}</div>
                    {o.cedula && <div style={{ fontSize:11, color:"var(--subtext)", marginTop:2, fontFamily:"monospace" }}>🪪 {o.cedula}</div>}
                  </div>
                  <div style={{
                    minWidth:36, height:36, borderRadius:8, marginLeft:8, flexShrink:0,
                    background:active?"rgba(96,165,250,0.15)":"rgba(255,255,255,0.05)",
                    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  }}>
                    <div style={{ fontSize:13, fontWeight:800, color:active?"var(--accent)":"var(--text)" }}>{petsByOwner[o.id]||0}</div>
                    <div style={{ fontSize:9, color:"var(--subtext)", lineHeight:1 }}>pets</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel derecho */}
        <div style={{ overflowY:"auto", padding:24 }}>
          {!selectedOwner ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:8, color:"var(--subtext)" }}>
              <div style={{ fontSize:48 }}>👈</div>
              <div style={{ fontWeight:600 }}>Selecciona un propietario</div>
              <div style={{ fontSize:13 }}>para ver su información y mascotas</div>
            </div>
          ) : (
            <>
              <div className="card" style={{ marginBottom:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <div style={{ display:"flex", gap:14, alignItems:"center" }}>
                    <div style={{
                      width:52, height:52, borderRadius:12, fontSize:24, flexShrink:0,
                      background:"rgba(96,165,250,0.1)", border:"1px solid rgba(96,165,250,0.2)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>👤</div>
                    <div>
                      <div style={{ fontWeight:800, fontSize:18 }}>{selectedOwner.nombre}</div>
                      <div className="small-muted">{selectedOwner.email}</div>
                      {selectedOwner.telefono  && <div className="small-muted">{selectedOwner.telefono}</div>}
                      {selectedOwner.direccion && <div className="small-muted" style={{ marginTop:4 }}>{selectedOwner.direccion}</div>}
                      {selectedOwner.cedula && (
                        <div style={{
                          display:"inline-flex", alignItems:"center", gap:6, marginTop:6,
                          padding:"4px 10px", borderRadius:6,
                          background:"rgba(96,165,250,0.08)", border:"1px solid rgba(96,165,250,0.15)",
                          fontFamily:"monospace", fontSize:13,
                        }}>🪪 {selectedOwner.cedula}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                    <button className="btn" onClick={()=>setOwnerModal(selectedOwner)}>Editar</button>
                    <button className="btn-danger" onClick={()=>deleteOwner(selectedOwner.id)}>Eliminar</button>
                  </div>
                </div>
              </div>

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontWeight:800, fontSize:16 }}>Mascotas</span>
                  <span style={{ fontSize:12, fontWeight:700, padding:"2px 8px", borderRadius:99, background:"rgba(96,165,250,0.12)", color:"var(--accent)" }}>
                    {selectedPets.length}
                  </span>
                </div>
                <button className="btn" onClick={()=>setPetModal("new")}>+ Agregar mascota</button>
              </div>

              {selectedPets.length === 0 ? (
                <div style={{ padding:"36px 24px", borderRadius:12, textAlign:"center", border:"1px dashed rgba(255,255,255,0.1)", color:"var(--subtext)" }}>
                  <div style={{ fontSize:40, marginBottom:10 }}>🐾</div>
                  <div style={{ fontWeight:600 }}>Sin mascotas registradas</div>
                  <div style={{ fontSize:13, marginTop:4 }}>Este propietario aún no tiene pacientes.</div>
                  <button className="btn" style={{ marginTop:14 }} onClick={()=>setPetModal("new")}>Agregar primera mascota</button>
                </div>
              ) : (
                <div style={{ display:"grid", gap:10 }}>
                  {selectedPets.map(p => (
                    <div key={p.id} className="card" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                      <div style={{ display:"flex", gap:12, alignItems:"center", minWidth:0 }}>
                        <div style={{
                          width:46, height:46, borderRadius:10, fontSize:22, flexShrink:0,
                          background:"rgba(52,211,153,0.08)", border:"1px solid rgba(52,211,153,0.15)",
                          display:"flex", alignItems:"center", justifyContent:"center",
                        }}>{getSpeciesIcon(p.especie)}</div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:15 }}>
                            {p.nombre}
                            {p.especie && <span style={{ marginLeft:6, fontSize:12, color:"var(--subtext)", fontWeight:400 }}>({p.especie})</span>}
                          </div>
                          <div className="small-muted">
                            {[p.raza, calcEdad(p.fecha_nacimiento) || (p.edad!=null?`${p.edad} años`:null)].filter(Boolean).join(" · ")}
                          </div>
                          {p.historial_medico && (
                            <div style={{ marginTop:4, fontSize:12, color:"var(--subtext)", lineHeight:1.4 }}>
                              {p.historial_medico.length>100?p.historial_medico.slice(0,100)+"…":p.historial_medico}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8, flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
                        <button className="btn"
                          style={{ padding:"6px 10px", fontSize:12, background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.3)", color:"var(--accent-2)" }}
                          onClick={()=>setFichasTarget(p)}>
                          📋 Fichas
                        </button>
                        <button className="btn"
                          style={{ padding:"6px 10px", fontSize:12, background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.3)", color:"#a78bfa" }}
                          onClick={()=>setVacunasTarget(p)}>
                          💉 Vacunas
                        </button>
                        <button className="btn" style={{ padding:"6px 10px", fontSize:12 }} onClick={()=>setPetModal(p)}>Editar</button>
                        <button className="btn-danger" style={{ padding:"6px 10px", fontSize:12 }} onClick={()=>deletePet(p.id)}>Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {ownerModal !== null && (
        <OwnerModal initial={ownerModal==="new"?null:ownerModal}
          onClose={()=>setOwnerModal(null)} onSaved={handleOwnerSaved} />
      )}
      {petModal !== null && (
        <PetModal initial={petModal==="new"?null:petModal} owners={owners}
          onClose={()=>setPetModal(null)} onSaved={handlePetSaved} />
      )}
      {fichasTarget !== null && (
        <FichasModal pet={fichasTarget} onClose={()=>setFichasTarget(null)} isAdmin={isAdmin} />
      )}
      {vacunasTarget !== null && (
        <VacunasModal pet={vacunasTarget} onClose={()=>setVacunasTarget(null)} isAdmin={isAdmin} />
      )}
    </div>
  );
}