// app/propietarios/page.js
"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import expressApi from "../../lib/expressApi";

// ─── Helper: icono por especie ────────────────────────────────────────────────
const SPECIES_ICONS = {
  perro:"🐕", gato:"🐈", ave:"🐦", pajaro:"🐦", conejo:"🐇",
  serpiente:"🐍", hamster:"🐹", tortuga:"🐢", pez:"🐟", caballo:"🐴",
};
const getSpeciesIcon = (especie) => SPECIES_ICONS[(especie||"").toLowerCase()] || "🐾";

// ─── ModalBase con scroll ─────────────────────────────────────────────────────
function ModalBase({ title, subtitle, onClose, children, maxWidth = 560 }) {
  return (
    <div className="modal-overlay">
      <div className="modal card" style={{
        maxWidth, width:"92vw", maxHeight:"88vh",
        display:"flex", flexDirection:"column", overflow:"hidden",
      }}>
        <div style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,0.06)", flexShrink:0,
        }}>
          <div>
            <div className="title" style={{ fontSize:18 }}>{title}</div>
            {subtitle && <div className="subtitle" style={{ fontSize:13 }}>{subtitle}</div>}
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize:18 }}>✕</button>
        </div>
        <div style={{ padding:18, overflowY:"auto", flex:1 }}>{children}</div>
      </div>
    </div>
  );
}

function ErrorList({ errors }) {
  if (!errors.length) return null;
  return (
    <div style={{
      marginTop:12, padding:"10px 14px", borderRadius:8,
      background:"rgba(251,113,133,0.08)", border:"1px solid rgba(251,113,133,0.2)",
      color:"#fb7185", fontSize:13,
    }}>
      <ul style={{ margin:0, paddingLeft:18 }}>
        {errors.map((e,i) => <li key={i}>{e}</li>)}
      </ul>
    </div>
  );
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
      if (password.length < 8)         e.push("Contraseña: mínimo 8 caracteres.");
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
            <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Cédula (opcional)</div>
            <input className="input" inputMode="numeric" maxLength={9} value={cedula}
              onChange={e=>onCedulaChange(e.target.value)} placeholder="000000000" />
            <small style={{ color:"var(--subtext)" }}>9 dígitos. Requerida para inicio de sesión en la app móvil.</small>
          </label>
        )}
        {[{label:"Nombre",key:"nombre",type:"text"},{label:"Email",key:"email",type:"email"},{label:"Dirección",key:"direccion",type:"text"}]
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
          <small style={{ color:"var(--subtext)" }}>Mínimo 7 dígitos. Permite + - ( ) . y espacios.</small>
        </label>
        <hr style={{ margin:"14px 0", borderColor:"rgba(255,255,255,0.05)" }} />
        <label style={{ display:"block", marginTop:10 }}>
          <div style={{ fontSize:13, fontWeight:600 }}>{isEditing?"Nueva contraseña (opcional)":"Contraseña (opcional)"}</div>
          <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)}
            placeholder={isEditing?"Dejar vacío para no cambiar":"Dejar vacío si no necesita acceso a la app móvil"} />
          <small style={{ color:"var(--subtext)" }}>{isEditing?"Solo si deseas cambiar la contraseña del propietario.":"Solo si el propietario va a iniciar sesión en la app móvil."}</small>
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
    edad:initial?.edad||"", historial_medico:initial?.historial_medico||"",
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
      const payload = {...form, edad:form.edad?Number(form.edad):null, owner_id:Number(form.owner_id)};
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
          <div style={{ fontSize:13, fontWeight:600 }}>Edad (años)</div>
          <input className="input" type="number" min="0" value={form.edad}
            onChange={e=>setForm(f=>({...f,edad:e.target.value}))} />
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

// ─── Fichas médicas ───────────────────────────────────────────────────────────
const TIPO_OPCIONES = [
  { value:"consulta",        label:"Consulta general"   },
  { value:"vacunacion",      label:"Vacunación"         },
  { value:"cirugia",         label:"Cirugía"            },
  { value:"urgencia",        label:"Urgencia"           },
  { value:"control",         label:"Control / revisión" },
  { value:"desparasitacion", label:"Desparasitación"    },
  { value:"otro",            label:"Otro"               },
];
const TIPO_LABELS = Object.fromEntries(TIPO_OPCIONES.map(t=>[t.value,t.label]));

function tipoDisplay(f) {
  if (f.tipo === "otro" && f.tipo_personalizado) return f.tipo_personalizado;
  return TIPO_LABELS[f.tipo] || f.tipo;
}

// ── Formulario crear/editar ficha ─────────────────────────────────────────────
function FichaForm({ petId, initial = null, onSaved, onCancel }) {
  const isEditing = !!initial?.id;
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    tipo:              initial?.tipo              || "consulta",
    tipo_personalizado:initial?.tipo_personalizado|| "",
    fecha:             (initial?.fecha||"").split(" ")[0]||(initial?.fecha||"").split("T")[0]||today,
    peso:              initial?.peso              ?? "",
    temperatura:       initial?.temperatura       ?? "",
    nota:              initial?.nota              || "",
  });
  const [file, setFile]       = useState(null);
  const [errors, setErrors]   = useState([]);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = [];
    if (form.tipo === "otro" && !form.tipo_personalizado.trim())
      e.push("Especifica el tipo de consulta.");
    setErrors(e); return e.length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault(); if (!validate()) return;
    setErrors([]); setLoading(true);
    try {
      const fd = new FormData();
      fd.append("mascota_id", petId);
      fd.append("tipo",  form.tipo);
      fd.append("fecha", form.fecha);
      if (form.tipo === "otro" && form.tipo_personalizado)
        fd.append("tipo_personalizado", form.tipo_personalizado.trim());
      if (form.peso !== "")        fd.append("peso",        form.peso);
      if (form.temperatura !== "") fd.append("temperatura", form.temperatura);
      if (form.nota)               fd.append("nota",        form.nota);
      if (file)                    fd.append("file",        file);

      const res = isEditing
        ? await expressApi.put(`/medical-records/${initial.id}`, fd)
        : await expressApi.post("/medical-records", fd);
      onSaved(res.data?.data || res.data);
    } catch (err) {
      setErrors([err?.response?.data?.message || err.message || "Error al guardar"]);
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} style={{
      background:"rgba(255,255,255,0.03)", borderRadius:10,
      padding:"14px 16px", border:"1px solid rgba(255,255,255,0.07)", marginBottom:16,
    }}>
      <div style={{ fontWeight:700, fontSize:13, marginBottom:10, color:"var(--accent)" }}>
        {isEditing ? "Editar ficha" : "Nueva ficha médica"}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <label>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>Tipo</div>
          <select className="input" value={form.tipo}
            onChange={e=>setForm(f=>({...f,tipo:e.target.value,tipo_personalizado:""}))}>
            {TIPO_OPCIONES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>Fecha</div>
          <input className="input" type="date" value={form.fecha}
            onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} required />
        </label>
      </div>

      {/* Campo para especificar tipo cuando se elige "Otro" */}
      {form.tipo === "otro" && (
        <label style={{ display:"block", marginTop:8 }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>Especificar tipo de consulta</div>
          <input className="input" value={form.tipo_personalizado}
            onChange={e=>setForm(f=>({...f,tipo_personalizado:e.target.value}))}
            placeholder="Ej: Corte de uñas, baño medicado..." required />
        </label>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:8 }}>
        <label>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>Peso (kg, opcional)</div>
          <input className="input" type="number" step="0.1" min="0" value={form.peso}
            onChange={e=>setForm(f=>({...f,peso:e.target.value}))} placeholder="Ej: 4.5" />
        </label>
        <label>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>Temperatura (°C, opcional)</div>
          <input className="input" type="number" step="0.1" min="30" max="45" value={form.temperatura}
            onChange={e=>setForm(f=>({...f,temperatura:e.target.value}))} placeholder="Ej: 38.5" />
        </label>
      </div>

      <label style={{ display:"block", marginTop:8 }}>
        <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>Observaciones / Nota</div>
        <textarea className="input" rows={3} value={form.nota}
          onChange={e=>setForm(f=>({...f,nota:e.target.value}))}
          placeholder="Diagnóstico, tratamiento, observaciones..." />
      </label>

      <label style={{ display:"block", marginTop:8 }}>
        <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>Archivo adjunto (opcional)</div>
        <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={e=>setFile(e.target.files?.[0]||null)}
          style={{ color:"var(--text)", fontSize:13 }} />
        <small style={{ color:"var(--subtext)" }}>PDF, PNG, JPG o WEBP · máx 10 MB.</small>
      </label>

      <ErrorList errors={errors} />
      <div style={{ display:"flex", gap:8, marginTop:12 }}>
        <button className="btn" type="submit" disabled={loading}>
          {loading?"Guardando...":(isEditing?"Guardar cambios":"Crear ficha")}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

// ── Modal ver ficha completa (solo lectura) ───────────────────────────────────
function FichaDetailModal({ ficha, onClose }) {
  const tipo = tipoDisplay(ficha);
  return (
    <ModalBase
      title="📋 Ficha médica"
      subtitle={`${ficha.mascota_nombre || "Mascota"} — ${ficha.fecha_display || ficha.fecha}`}
      onClose={onClose}
      maxWidth={620}
    >
      {/* Encabezado de tipo */}
      <div style={{
        display:"inline-flex", alignItems:"center", gap:8, marginBottom:18,
        padding:"6px 14px", borderRadius:8,
        background:"rgba(96,165,250,0.1)", border:"1px solid rgba(96,165,250,0.2)",
        fontWeight:700, fontSize:14, color:"var(--accent)",
      }}>
        {tipo}
      </div>

      {/* Grid de datos */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--subtext)", letterSpacing:0.5, marginBottom:4 }}>FECHA</div>
          <div style={{ fontSize:14 }}>{ficha.fecha_display || ficha.fecha || "—"}</div>
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--subtext)", letterSpacing:0.5, marginBottom:4 }}>VETERINARIO</div>
          <div style={{ fontSize:14 }}>{ficha.creado_por_nombre ? `Dr. ${ficha.creado_por_nombre}` : "—"}</div>
        </div>
        {ficha.peso != null && ficha.peso !== "" && (
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--subtext)", letterSpacing:0.5, marginBottom:4 }}>PESO</div>
            <div style={{ fontSize:14 }}>⚖️ {ficha.peso} kg</div>
          </div>
        )}
        {ficha.temperatura != null && ficha.temperatura !== "" && (
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--subtext)", letterSpacing:0.5, marginBottom:4 }}>TEMPERATURA</div>
            <div style={{ fontSize:14 }}>🌡️ {ficha.temperatura} °C</div>
          </div>
        )}
      </div>

      {/* Observaciones */}
      {ficha.nota ? (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--subtext)", letterSpacing:0.5, marginBottom:8 }}>OBSERVACIONES</div>
          <div style={{
            whiteSpace:"pre-wrap", lineHeight:1.6, fontSize:14,
            padding:"12px 14px", borderRadius:10,
            background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
          }}>
            {ficha.nota}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom:16, color:"var(--subtext)", fontSize:13, fontStyle:"italic" }}>
          Sin observaciones registradas.
        </div>
      )}

      {/* Archivo adjunto */}
      {ficha.filepath && (
        <a
          href={ficha.filepath}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display:"inline-flex", alignItems:"center", gap:8,
            padding:"8px 16px", borderRadius:8, textDecoration:"none",
            background:"rgba(96,165,250,0.08)", border:"1px solid rgba(96,165,250,0.25)",
            color:"var(--accent)", fontSize:13, fontWeight:600,
          }}
        >
          📎 Ver archivo adjunto
        </a>
      )}
    </ModalBase>
  );
}

// ── Modal de lista de fichas ──────────────────────────────────────────────────
function FichasModal({ pet, onClose, isAdmin = false }) {
  const [fichas, setFichas]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [editingFicha, setEditingFicha] = useState(null);
  const [viewingFicha, setViewingFicha] = useState(null);

  useEffect(() => { fetchFichas(); }, []);

  const fetchFichas = async () => {
    setLoading(true);
    try {
      const res = await expressApi.get(`/medical-records?pet_id=${pet.id}`);
      setFichas(res.data?.data || []);
    } catch (err) {
      console.error("Error cargando fichas:", err);
    } finally { setLoading(false); }
  };

  const handleSaved = (saved) => {
    setFichas(prev => {
      const exists = prev.find(f=>f.id===saved.id);
      return exists ? prev.map(f=>f.id===saved.id?saved:f) : [saved,...prev];
    });
    setShowForm(false); setEditingFicha(null);
  };

  const deleteFicha = async (id) => {
    if (!confirm("¿Eliminar esta ficha médica?")) return;
    try {
      await expressApi.delete(`/medical-records/${id}`);
      setFichas(prev=>prev.filter(f=>f.id!==id));
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Error al eliminar");
    }
  };

  if (viewingFicha) {
    return <FichaDetailModal ficha={viewingFicha} onClose={()=>setViewingFicha(null)} />;
  }

  return (
    <ModalBase
      title={`Fichas médicas — ${pet.nombre}`}
      subtitle={`${pet.especie?getSpeciesIcon(pet.especie)+" "+pet.especie:"Mascota"} · ${fichas.length} registro${fichas.length!==1?"s":""}`}
      onClose={onClose}
      maxWidth={700}
    >
      {isAdmin && !showForm && !editingFicha && (
        <button className="btn" onClick={()=>setShowForm(true)} style={{ marginBottom:12 }}>
          + Nueva ficha
        </button>
      )}

      {showForm && (
        <FichaForm petId={pet.id} onSaved={handleSaved} onCancel={()=>setShowForm(false)} />
      )}
      {editingFicha && (
        <FichaForm petId={pet.id} initial={editingFicha} onSaved={handleSaved} onCancel={()=>setEditingFicha(null)} />
      )}

      {loading ? (
        <div style={{ padding:"20px 0", textAlign:"center", color:"var(--subtext)" }}>Cargando fichas...</div>
      ) : fichas.length === 0 ? (
        <div style={{
          padding:"32px 24px", textAlign:"center", borderRadius:10,
          border:"1px dashed rgba(255,255,255,0.1)", color:"var(--subtext)",
        }}>
          <div style={{ fontSize:36, marginBottom:8 }}>📋</div>
          <div>No hay fichas médicas registradas aún.</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {fichas.map(f => (
            <div key={f.id} style={{
              padding:"12px 14px", borderRadius:10,
              border:"1px solid rgba(255,255,255,0.08)",
              background:"rgba(255,255,255,0.03)",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <span style={{
                      fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:99,
                      background:"rgba(96,165,250,0.12)", color:"var(--accent)",
                    }}>
                      {tipoDisplay(f)}
                    </span>
                    <span className="small-muted">{f.fecha_display || f.fecha}</span>
                    {f.peso        && <span className="small-muted">⚖️ {f.peso} kg</span>}
                    {f.temperatura && <span className="small-muted">🌡️ {f.temperatura} °C</span>}
                    {f.creado_por_nombre && <span className="small-muted">Dr. {f.creado_por_nombre}</span>}
                  </div>
                  {f.nota && (
                    <div style={{ marginTop:6, fontSize:13, lineHeight:1.5, color:"var(--subtext)" }}>
                      {f.nota.length > 120 ? f.nota.slice(0,120)+"…" : f.nota}
                    </div>
                  )}
                  {f.filepath && (
                    <a href={f.filepath} target="_blank" rel="noopener noreferrer"
                      style={{ display:"inline-block", marginTop:6, fontSize:12, color:"var(--accent)" }}>
                      📎 Archivo adjunto
                    </a>
                  )}
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
                  <button
                    className="btn"
                    style={{ padding:"4px 10px", fontSize:12,
                      background:"rgba(96,165,250,0.1)", border:"1px solid rgba(96,165,250,0.3)", color:"var(--accent)" }}
                    onClick={()=>setViewingFicha(f)}
                  >
                    Ver
                  </button>
                  {isAdmin && (
                    <>
                      <button className="btn" style={{ padding:"4px 10px", fontSize:12 }}
                        onClick={()=>{ setEditingFicha(f); setShowForm(false); }}>
                        Editar
                      </button>
                      <button className="btn-danger" style={{ padding:"4px 10px", fontSize:12 }}
                        onClick={()=>deleteFicha(f.id)}>
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
  const [fichasTarget, setFichasTarget] = useState(null);

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
                            {[p.raza, p.edad!=null?`${p.edad} años`:null].filter(Boolean).join(" · ")}
                          </div>
                          {p.historial_medico && (
                            <div style={{ marginTop:4, fontSize:12, color:"var(--subtext)", lineHeight:1.4 }}>
                              {p.historial_medico.length>100?p.historial_medico.slice(0,100)+"…":p.historial_medico}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                        <button className="btn"
                          style={{ background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.3)", color:"var(--accent-2)" }}
                          onClick={()=>setFichasTarget(p)}>
                          📋 Fichas
                        </button>
                        <button className="btn" onClick={()=>setPetModal(p)}>Editar</button>
                        <button className="btn-danger" onClick={()=>deletePet(p.id)}>Eliminar</button>
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
    </div>
  );
}