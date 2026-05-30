// app/mascotas/page.js
"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import expressApi from "../../lib/expressApi";

// ─── Helper: icono por especie ────────────────────────────────────────────────
// Para agregar una especie nueva, agrega una entrada aquí.
const SPECIES_ICONS = {
  perro:    "🐕",
  gato:     "🐈",
  ave:      "🐦",
  pajaro:   "🐦",
  conejo:   "🐇",
  serpiente:"🐍",
  hamster:  "🐹",
  tortuga:  "🐢",
  pez:      "🐟",
  caballo:  "🐴",
};

function getSpeciesIcon(especie) {
  if (!especie) return "🐾";
  const key = especie.toLowerCase();
  for (const [k, icon] of Object.entries(SPECIES_ICONS)) {
    if (key.includes(k)) return icon;
  }
  return "🐾";
}

// ─── Componentes UI reutilizables (locales a este archivo) ────────────────────

function ModalBase({ title, subtitle, onClose, children }) {
  return (
    <div className="modal-overlay">
      <div className="modal card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="title">{title}</div>
            {subtitle && <div className="subtitle">{subtitle}</div>}
          </div>
          <button
            className="btn-ghost"
            onClick={onClose}
            style={{ padding: "4px 8px", fontSize: 16 }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorList({ errors }) {
  if (!errors.length) return null;
  return (
    <div style={{
      marginTop: 12, padding: "10px 14px", borderRadius: 8,
      background: "rgba(251,113,133,0.08)",
      border: "1px solid rgba(251,113,133,0.2)",
      color: "#fb7185", fontSize: 13,
    }}>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {errors.map((e, i) => <li key={i}>{e}</li>)}
      </ul>
    </div>
  );
}

// ─── Modal crear / editar mascota ─────────────────────────────────────────────

function PetModal({ onClose, onSaved, owners = [], initial = null }) {
  const isEditing = Boolean(initial?.id);
  const [form, setForm] = useState({
    nombre:           initial?.nombre           || "",
    especie:          initial?.especie          || "",
    raza:             initial?.raza             || "",
    edad:             initial?.edad             ?? "",
    historial_medico: initial?.historial_medico || "",
    owner_id:         initial?.owner_id         || (owners[0]?.id || ""),
  });
  const [errors, setErrors]   = useState([]);
  const [loading, setLoading] = useState(false);

  // Si la lista de dueños llega después del montaje, seleccionar el primero
  useEffect(() => {
    if (!form.owner_id && owners[0]) setForm(f => ({ ...f, owner_id: owners[0].id }));
  }, [owners]);

  const validate = () => {
    const e = [];
    if (!form.nombre.trim())  e.push("Nombre es requerido.");
    if (!form.owner_id)       e.push("Debe seleccionar un propietario.");
    setErrors(e);
    return e.length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        edad:     form.edad !== "" ? Number(form.edad) : null,
        owner_id: Number(form.owner_id),
      };
      const res = isEditing
        ? await expressApi.put(`/mascotas/${initial.id}`, payload)
        : await expressApi.post("/mascotas", payload);
      onSaved(res.data?.data || res.data);
      onClose();
    } catch (err) {
      const srv = err?.response?.data;
      setErrors([srv?.message || err.message || "Error desconocido"]);
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <ModalBase
      title={isEditing ? "Editar mascota" : "Nueva mascota"}
      subtitle="Datos del paciente veterinario"
      onClose={onClose}
    >
      <form onSubmit={submit} style={{ marginTop: 14 }}>
        <label style={{ display: "block" }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Nombre</div>
          <input className="input" value={form.nombre} onChange={set("nombre")} required />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <label>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Especie</div>
            <input className="input" value={form.especie} onChange={set("especie")} placeholder="Perro, Gato..." />
          </label>
          <label>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Raza</div>
            <input className="input" value={form.raza} onChange={set("raza")} />
          </label>
          <label>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Edad (años)</div>
            <input className="input" type="number" min="0" value={form.edad} onChange={set("edad")} />
          </label>
          <label>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Propietario</div>
            <select className="input" value={form.owner_id} onChange={set("owner_id")} required>
              <option value="">-- Seleccionar --</option>
              {owners.map(o => (
                <option key={o.id} value={o.id}>{o.nombre} — {o.email}</option>
              ))}
            </select>
          </label>
        </div>

        <label style={{ display: "block", marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Historial médico</div>
          <textarea
            className="input"
            rows={3}
            value={form.historial_medico}
            onChange={set("historial_medico")}
            placeholder="Notas generales del historial..."
          />
        </label>

        <ErrorList errors={errors} />

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Guardando..." : (isEditing ? "Guardar cambios" : "Crear mascota")}
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
  const [pets, setPets]       = useState([]);
  const [owners, setOwners]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("");
  const [modal, setModal]     = useState({ open: false, pet: null }); // { open, pet }

  // Verificar sesión — cualquier rol del personal puede acceder
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return router.replace("/");
    try { JSON.parse(raw); } catch { router.replace("/"); }
  }, [router]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, oRes] = await Promise.all([
        expressApi.get("/mascotas?page=1&limit=500"),
        expressApi.get("/propietarios?page=1&limit=500"),
      ]);
      setPets(pRes.data?.data   || []);
      setOwners(oRes.data?.data || []);
    } catch (err) {
      console.error(err);
      alert("Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  // Lista de especies únicas para el filtro
  const speciesList = useMemo(() => {
    const s = new Set(pets.map(p => p.especie).filter(Boolean));
    return Array.from(s).sort();
  }, [pets]);

  // Mascotas filtradas por búsqueda + especie
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return pets.filter(p => {
      if (speciesFilter && p.especie !== speciesFilter) return false;
      if (!q) return true;
      return (
        (p.nombre             || "").toLowerCase().includes(q) ||
        (p.raza               || "").toLowerCase().includes(q) ||
        (p.propietario_nombre || "").toLowerCase().includes(q) ||
        (p.owner_name         || "").toLowerCase().includes(q)
      );
    });
  }, [pets, filter, speciesFilter]);

  const openCreate = ()     => setModal({ open: true, pet: null });
  const openEdit   = (pet)  => setModal({ open: true, pet });
  const closeModal = ()     => setModal({ open: false, pet: null });

  const handleSaved = (saved) => {
    setPets(prev => {
      const exists = prev.find(x => x.id === saved.id);
      return exists
        ? prev.map(x => x.id === saved.id ? saved : x)
        : [saved, ...prev];
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta mascota? Esta acción no se puede deshacer.")) return;
    try {
      await expressApi.delete(`/mascotas/${id}`);
      setPets(prev => prev.filter(x => x.id !== id));
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Error al eliminar");
    }
  };

  // ─ Render ─

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card" style={{ padding: "24px 32px", color: "var(--subtext)" }}>
          Cargando mascotas...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>

      {/* ── Barra superior ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "#0b1220",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        padding: "0 24px",
        display: "flex", alignItems: "center", gap: 12,
        height: 64, flexWrap: "wrap",
      }}>
        {/* Título + conteo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
          <button
            className="btn-ghost"
            onClick={() => router.push("/dashboard")}
            style={{ padding: "6px 10px", fontSize: 13 }}
          >
            ← Dashboard
          </button>
          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.06)" }} />
          <span style={{ fontWeight: 900, fontSize: 17 }}>Mascotas</span>
          <span style={{
            background: "rgba(96,165,250,0.12)",
            border: "1px solid rgba(96,165,250,0.25)",
            color: "var(--accent)",
            borderRadius: 20, padding: "2px 10px",
            fontSize: 12, fontWeight: 700,
          }}>
            {filtered.length}
          </span>
        </div>

        {/* Controles de búsqueda */}
        <div style={{ display: "flex", gap: 8, flex: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <input
            className="input"
            placeholder="Buscar nombre, raza o dueño..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ maxWidth: 240 }}
          />
          <select
            className="input"
            value={speciesFilter}
            onChange={e => setSpeciesFilter(e.target.value)}
            style={{ maxWidth: 160 }}
          >
            <option value="">Todas las especies</option>
            {speciesList.map(s => (
              <option key={s} value={s}>{getSpeciesIcon(s)} {s}</option>
            ))}
          </select>
          <button className="btn" onClick={openCreate} style={{ whiteSpace: "nowrap" }}>
            + Nueva mascota
          </button>
        </div>
      </header>

      {/* ── Grid de mascotas ── */}
      <main style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>

        {filtered.length === 0 && (
          <div style={{
            textAlign: "center", padding: "60px 24px",
            color: "var(--subtext)", fontSize: 15,
          }}>
            {filter || speciesFilter
              ? "No se encontraron mascotas con esos filtros."
              : "No hay mascotas registradas aún."}
          </div>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
        }}>
          {filtered.map(p => (
            <PetCard
              key={p.id}
              pet={p}
              onEdit={() => openEdit(p)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </div>
      </main>

      {/* ── Modal ── */}
      {modal.open && (
        <PetModal
          initial={modal.pet}
          owners={owners}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ─── PetCard — componente separado para mantener el render limpio ─────────────

function PetCard({ pet, onEdit, onDelete }) {
  const icon     = getSpeciesIcon(pet.especie);
  const ownerName = pet.propietario_nombre || pet.owner_name || "-";

  return (
    <div className="card" style={{
      display: "flex",
      flexDirection: "column",
      padding: 0,
      overflow: "hidden",
    }}>
      {/* Card header */}
      <div style={{
        padding: "16px 18px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        display: "flex", alignItems: "flex-start", gap: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: "rgba(96,165,250,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text)" }}>
            {pet.nombre}
          </div>
          <div style={{ color: "var(--subtext)", fontSize: 13, marginTop: 2 }}>
            {[pet.especie, pet.raza].filter(Boolean).join(" · ") || "Sin clasificar"}
            {pet.edad != null ? ` · ${pet.edad} años` : ""}
          </div>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: "12px 18px", flex: 1 }}>
        <div style={{ fontSize: 12, color: "var(--subtext)", marginBottom: 6 }}>
          <span style={{ marginRight: 4 }}>👤</span>
          {ownerName}
        </div>
        {pet.historial_medico && (
          <div style={{ fontSize: 13, color: "#aebfd8", lineHeight: 1.5 }}>
            {pet.historial_medico.length > 100
              ? `${pet.historial_medico.substring(0, 100)}...`
              : pet.historial_medico}
          </div>
        )}
        {!pet.historial_medico && (
          <div style={{ fontSize: 12, color: "rgba(174,191,216,0.35)", fontStyle: "italic" }}>
            Sin historial registrado
          </div>
        )}
      </div>

      {/* Card footer — acciones */}
      <div style={{
        padding: "10px 18px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        display: "flex", gap: 8,
      }}>
        <button
          className="btn"
          onClick={onEdit}
          style={{ flex: 1, padding: "7px 0", fontSize: 13 }}
        >
          Ver / Editar
        </button>
        <button
          className="btn btn-danger"
          onClick={onDelete}
          style={{ flex: 1, padding: "7px 0", fontSize: 13 }}
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}