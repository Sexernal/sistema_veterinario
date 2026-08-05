// app/mascotas/page.js
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


// ─── Modal crear / editar mascota ─────────────────────────────────────────────
function PetModal({ onClose, onSaved, owners = [], initial = null }) {
  const isEditing = Boolean(initial?.id);
  const [form, setForm] = useState({
    nombre:           initial?.nombre           || "",
    especie:          initial?.especie          || "",
    raza:             initial?.raza             || "",
    fecha_nacimiento: toDateInput(initial?.fecha_nacimiento),
    historial_medico: initial?.historial_medico || "",
    owner_id:         initial?.owner_id         || (owners[0]?.id || ""),
  });
  const [errors, setErrors]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!form.owner_id && owners[0]) setForm(f=>({...f,owner_id:owners[0].id}));
  }, [owners]);

  const validate = () => {
    const e = [];
    if (!form.nombre.trim()) e.push("Nombre es requerido.");
    if (!form.owner_id)      e.push("Debe seleccionar un propietario.");
    setErrors(e); return e.length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault(); if (!validate()) return;
    setLoading(true);
    try {
      const payload = {...form, fecha_nacimiento: form.fecha_nacimiento || null, owner_id:Number(form.owner_id)};
      const res = isEditing
        ? await expressApi.put(`/mascotas/${initial.id}`, payload)
        : await expressApi.post("/mascotas", payload);
      onSaved(res.data?.data||res.data); onClose();
    } catch (err) {
      setErrors([err?.response?.data?.message||err.message||"Error desconocido"]);
    } finally { setLoading(false); }
  };

  const set = (key) => (e) => setForm(f=>({...f,[key]:e.target.value}));

  return (
    <ModalBase title={isEditing?"Editar mascota":"Nueva mascota"}
      subtitle="Datos del paciente veterinario" onClose={onClose}>
      <form onSubmit={submit} style={{ marginTop:14 }}>
        <label style={{ display:"block" }}>
          <div style={{ fontSize:13, fontWeight:600 }}>Nombre</div>
          <input className="input" value={form.nombre} onChange={set("nombre")} required />
        </label>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 }}>
          <label>
            <div style={{ fontSize:13, fontWeight:600 }}>Especie</div>
            <input className="input" value={form.especie} onChange={set("especie")} placeholder="Perro, Gato..." />
          </label>
          <label>
            <div style={{ fontSize:13, fontWeight:600 }}>Raza</div>
            <input className="input" value={form.raza} onChange={set("raza")} />
          </label>
          <label>
            <div style={{ fontSize:13, fontWeight:600 }}>Fecha de nacimiento</div>
            <input className="input" type="date" value={form.fecha_nacimiento} onChange={set("fecha_nacimiento")} />
          </label>
          <label>
            <div style={{ fontSize:13, fontWeight:600 }}>Propietario</div>
            <select className="input" value={form.owner_id} onChange={set("owner_id")} required>
              <option value="">-- Seleccionar --</option>
              {owners.map(o=><option key={o.id} value={o.id}>{o.nombre} — {o.email}</option>)}
            </select>
          </label>
        </div>
        <label style={{ display:"block", marginTop:10 }}>
          <div style={{ fontSize:13, fontWeight:600 }}>Observaciones</div>
          <textarea className="input" rows={3} value={form.historial_medico}
            onChange={set("historial_medico")} placeholder="Notas generales del historial..." />
        </label>
        <ErrorList errors={errors} />
        <div style={{ display:"flex", gap:8, marginTop:16 }}>
          <button className="btn" type="submit" disabled={loading}>
            {loading?"Guardando...":(isEditing?"Guardar cambios":"Crear mascota")}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </ModalBase>
  );
}


// ─── Página principal de Mascotas ─────────────────────────────────────────────
export default function MascotasPage() {
  const router = useRouter();
  const [user, setUser]     = useState(null);
  const [pets, setPets]     = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("");
  const [modal, setModal]             = useState({ open:false, pet:null });
  const [fichasTarget, setFichasTarget] = useState(null);
  const [vacunasTarget, setVacunasTarget] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return router.replace("/");
    try { setUser(JSON.parse(raw)); } catch { router.replace("/"); }
  }, [router]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, oRes] = await Promise.all([
        expressApi.get("/mascotas?page=1&limit=500"),
        expressApi.get("/propietarios?page=1&limit=500"),
      ]);
      setPets(pRes.data?.data||[]);
      setOwners(oRes.data?.data||[]);
    } catch (err) {
      console.error(err); alert("Error cargando datos");
    } finally { setLoading(false); }
  };

  const speciesList = useMemo(() => {
    const s = new Set(pets.map(p=>p.especie).filter(Boolean));
    return Array.from(s).sort();
  }, [pets]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return pets.filter(p => {
      if (speciesFilter && p.especie !== speciesFilter) return false;
      if (!q) return true;
      return (
        (p.nombre||"").toLowerCase().includes(q)||
        (p.raza||"").toLowerCase().includes(q)||
        (p.propietario_nombre||"").toLowerCase().includes(q)||
        (p.owner_name||"").toLowerCase().includes(q)
      );
    });
  }, [pets, filter, speciesFilter]);

  const isAdmin = user?.role === "admin";

  const openCreate = ()    => setModal({ open:true, pet:null });
  const openEdit   = (pet) => setModal({ open:true, pet });
  const closeModal = ()    => setModal({ open:false, pet:null });

  const handleSaved = (saved) => {
    setPets(prev => {
      const exists = prev.find(x=>x.id===saved.id);
      return exists ? prev.map(x=>x.id===saved.id?saved:x) : [saved,...prev];
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta mascota? Esta acción no se puede deshacer.")) return;
    try {
      await expressApi.delete(`/mascotas/${id}`);
      setPets(prev=>prev.filter(x=>x.id!==id));
    } catch (err) {
      alert(err?.response?.data?.message||err.message||"Error al eliminar");
    }
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div className="card" style={{ padding:"24px 32px", color:"var(--subtext)" }}>Cargando mascotas...</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh" }}>
      {/* ── Barra superior ── */}
      <header style={{
        position:"sticky", top:0, zIndex:100,
        background:"#0b1220",
        borderBottom:"1px solid rgba(255,255,255,0.05)",
        padding:"0 24px",
        display:"flex", alignItems:"center", gap:12,
        height:64, flexWrap:"wrap",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, flex:"0 0 auto" }}>
          <button className="btn-ghost" onClick={()=>router.push("/dashboard")}
            style={{ padding:"6px 10px", fontSize:13 }}>← Volver</button>
          <div style={{ width:1, height:24, background:"rgba(255,255,255,0.06)" }} />
          <span style={{ fontWeight:900, fontSize:17 }}>Mascotas</span>
          <span style={{
            background:"rgba(96,165,250,0.12)", border:"1px solid rgba(96,165,250,0.25)",
            color:"var(--accent)", borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:700,
          }}>{filtered.length}</span>
        </div>
        <div style={{ display:"flex", gap:8, flex:1, justifyContent:"flex-end", flexWrap:"wrap" }}>
          <input className="input" placeholder="Buscar nombre, raza o dueño..."
            value={filter} onChange={e=>setFilter(e.target.value)} style={{ maxWidth:240 }} />
          <select className="input" value={speciesFilter}
            onChange={e=>setSpeciesFilter(e.target.value)} style={{ maxWidth:160 }}>
            <option value="">Todas las especies</option>
            {speciesList.map(s=><option key={s} value={s}>{getSpeciesIcon(s)} {s}</option>)}
          </select>
          <button className="btn" onClick={openCreate} style={{ whiteSpace:"nowrap" }}>+ Nueva mascota</button>
        </div>
      </header>

      {/* ── Grid de mascotas ── */}
      <main style={{ padding:"24px", maxWidth:1200, margin:"0 auto" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 24px", color:"var(--subtext)", fontSize:15 }}>
            {filter||speciesFilter?"No se encontraron mascotas con esos filtros.":"No hay mascotas registradas aún."}
          </div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:14 }}>
          {filtered.map(p=>(
            <PetCard key={p.id} pet={p}
              isAdmin={isAdmin}
              onEdit={()=>openEdit(p)}
              onDelete={()=>handleDelete(p.id)}
              onFichas={()=>setFichasTarget(p)}
              onVacunas={()=>setVacunasTarget(p)}
            />
          ))}
        </div>
      </main>

      {modal.open && (
        <PetModal initial={modal.pet} owners={owners} onClose={closeModal} onSaved={handleSaved} />
      )}
      {fichasTarget && (
        <FichasModal pet={fichasTarget} onClose={()=>setFichasTarget(null)} isAdmin={isAdmin} />
      )}
            {vacunasTarget && (
        <VacunasModal pet={vacunasTarget} onClose={()=>setVacunasTarget(null)} isAdmin={isAdmin} />
      )}
    </div>
  );
}

// ─── PetCard ──────────────────────────────────────────────────────────────────
function PetCard({ pet, onEdit, onDelete, onFichas, onVacunas, isAdmin }) {
  const icon      = getSpeciesIcon(pet.especie);
  const ownerName = pet.propietario_nombre || pet.owner_name || "-";

  return (
    <div className="card" style={{ display:"flex", flexDirection:"column", padding:0, overflow:"hidden" }}>
      <div style={{
        padding:"16px 18px 12px",
        borderBottom:"1px solid rgba(255,255,255,0.04)",
        display:"flex", alignItems:"flex-start", gap:12,
      }}>
        <div style={{
          width:44, height:44, borderRadius:10, flexShrink:0,
          background:"rgba(96,165,250,0.1)",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:22,
        }}>{icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:800, fontSize:15, color:"var(--text)" }}>{pet.nombre}</div>
          <div style={{ color:"var(--subtext)", fontSize:13, marginTop:2 }}>
            {[pet.especie,pet.raza].filter(Boolean).join(" · ")||"Sin clasificar"}
            {(() => { const t = calcEdad(pet.fecha_nacimiento) || (pet.edad!=null?`${pet.edad} años`:null); return t?` · ${t}`:""; })()}
          </div>
        </div>
      </div>

      <div style={{ padding:"12px 18px", flex:1 }}>
        <div style={{ fontSize:12, color:"var(--subtext)", marginBottom:6 }}>
          <span style={{ marginRight:4 }}>👤</span>{ownerName}
        </div>
        {pet.historial_medico?(
          <div style={{ fontSize:13, color:"#aebfd8", lineHeight:1.5 }}>
            {pet.historial_medico.length>100?`${pet.historial_medico.substring(0,100)}...`:pet.historial_medico}
          </div>
        ):(
          <div style={{ fontSize:12, color:"rgba(174,191,216,0.35)", fontStyle:"italic" }}>Sin historial registrado</div>
        )}
      </div>

      <div style={{
        padding:"10px 18px", borderTop:"1px solid rgba(255,255,255,0.04)",
        display:"flex", flexDirection:"column", gap:8,
      }}>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn" onClick={onFichas}
            style={{ flex:1, padding:"7px 0", fontSize:12,
              background:"rgba(52,211,153,0.08)", border:"1px solid rgba(52,211,153,0.25)", color:"var(--accent-2)" }}>
            📋 Fichas
          </button>
          <button className="btn" onClick={onVacunas}
            style={{ flex:1, padding:"7px 0", fontSize:12,
              background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.3)", color:"#a78bfa" }}>
            💉 Vacunas
          </button>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn" onClick={onEdit} style={{ flex:1, padding:"7px 0", fontSize:13 }}>
            Editar
          </button>
          <button className="btn btn-danger" onClick={onDelete} style={{ flex:1, padding:"7px 0", fontSize:13 }}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
