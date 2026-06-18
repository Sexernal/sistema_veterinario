// app/mascotas/page.js
"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import expressApi from "../../lib/expressApi";
import VacunasModal from "./VacunasModal";

// ─── Helper: icono por especie ────────────────────────────────────────────────
const SPECIES_ICONS = {
  perro:"🐕", gato:"🐈", ave:"🐦", pajaro:"🐦", conejo:"🐇",
  serpiente:"🐍", hamster:"🐹", tortuga:"🐢", pez:"🐟", caballo:"🐴",
};
function getSpeciesIcon(especie) {
  if (!especie) return "🐾";
  const key = especie.toLowerCase();
  for (const [k, icon] of Object.entries(SPECIES_ICONS)) {
    if (key.includes(k)) return icon;
  }
  return "🐾";
}

function toDateInput(val) {
  if (!val) return "";
  if (typeof val === "string") return val.slice(0, 10);
  try { return new Date(val).toISOString().slice(0, 10); } catch { return ""; }
}

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
        {errors.map((e,i)=><li key={i}>{e}</li>)}
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

// ── Sección comanda dentro del formulario de ficha ────────────────────────────
function ComandaSection({ fichaId, items, onItemsChange }) {
  const [servicios, setServicios]           = useState([]);
  const [loadingS, setLoadingS]             = useState(true);
  const [manualDesc, setManualDesc]         = useState("");
  const [manualPrecio, setManualPrecio]     = useState("");
  const [manualCantidad, setManualCantidad] = useState("1");

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, cRes] = await Promise.all([
          expressApi.get("/servicios"),
          fichaId ? expressApi.get(`/fichas/${fichaId}/comanda`) : Promise.resolve(null),
        ]);
        setServicios(sRes.data?.data || []);
        if (cRes?.data?.data?.items?.length) {
          onItemsChange(cRes.data.data.items.map(i => ({
            tipo:            i.tipo,
            servicio_id:     i.servicio_id,
            descripcion:     i.descripcion,
            cantidad:        Number(i.cantidad),
            precio_unitario: Number(i.precio_unitario),
          })));
        }
      } catch { } finally { setLoadingS(false); }
    };
    load();
  }, [fichaId]); // solo al montar

  const total = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);

  const toggleServicio = (s) => {
    const idx = items.findIndex(i => i.servicio_id === s.id && i.tipo === "servicio");
    if (idx >= 0) {
      onItemsChange(items.filter((_, i) => i !== idx));
    } else {
      onItemsChange([...items, { tipo: "servicio", servicio_id: s.id, descripcion: s.nombre, cantidad: 1, precio_unitario: Number(s.precio) }]);
    }
  };

  const updateQty = (idx, val) => {
    const n = Math.max(0.01, Number(val) || 1);
    onItemsChange(items.map((item, i) => i === idx ? { ...item, cantidad: n } : item));
  };

  const removeItem = (idx) => onItemsChange(items.filter((_, i) => i !== idx));

  const addManual = () => {
    if (!manualDesc.trim() || !manualPrecio) return;
    onItemsChange([...items, {
      tipo: "manual", servicio_id: null,
      descripcion: manualDesc.trim(),
      cantidad: Math.max(0.01, Number(manualCantidad) || 1),
      precio_unitario: Math.max(0, Number(manualPrecio)),
    }]);
    setManualDesc(""); setManualPrecio(""); setManualCantidad("1");
  };

  // Agrupar por categoría
  const byCategory = {};
  for (const s of servicios) {
    const cat = s.categoria || "General";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(s);
  }

  const CRC = (n) => `₡${Number(n || 0).toLocaleString("es-CR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div style={{ marginTop: 16, borderTop: "2px solid rgba(52,211,153,0.2)", paddingTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 17 }}>🧾</span>
        <div style={{ fontWeight: 800, fontSize: 14 }}>Comanda</div>
        <span style={{ fontSize: 12, color: "var(--subtext)" }}>— facturación de la consulta</span>
      </div>

      {/* Catálogo de servicios */}
      {loadingS ? (
        <div style={{ fontSize: 12, color: "var(--subtext)", marginBottom: 12 }}>Cargando servicios...</div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--subtext)", marginBottom: 8, letterSpacing: "0.07em", textTransform: "uppercase" }}>
            Servicios — clic para agregar / quitar
          </div>
          {Object.entries(byCategory).map(([cat, svcs]) => (
            <div key={cat} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--subtext)", marginBottom: 5, letterSpacing: 1, textTransform: "uppercase" }}>{cat}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {svcs.map(s => {
                  const sel = items.some(i => i.servicio_id === s.id && i.tipo === "servicio");
                  return (
                    <button key={s.id} type="button" onClick={() => toggleServicio(s)} style={{
                      padding: "5px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer",
                      border: sel ? "1px solid rgba(52,211,153,0.6)" : "1px solid rgba(255,255,255,0.12)",
                      background: sel ? "rgba(52,211,153,0.18)" : "rgba(255,255,255,0.04)",
                      color: sel ? "#34d399" : "var(--text)", fontWeight: sel ? 700 : 400,
                      transition: "all 0.12s",
                    }}>
                      {s.nombre}
                      <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.75 }}>{CRC(s.precio)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ítem manual */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--subtext)", marginBottom: 8, letterSpacing: "0.07em", textTransform: "uppercase" }}>
          Agregar ítem manual (medicamentos, otros)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 90px auto", gap: 6, alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--subtext)", marginBottom: 3 }}>Descripción</div>
            <input className="input" placeholder="Ej: Amoxicilina 500mg" value={manualDesc}
              onChange={e => setManualDesc(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addManual())} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--subtext)", marginBottom: 3 }}>Cant.</div>
            <input className="input" type="number" min="0.01" step="0.01" value={manualCantidad}
              onChange={e => setManualCantidad(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--subtext)", marginBottom: 3 }}>Precio ₡</div>
            <input className="input" type="number" min="0" value={manualPrecio}
              onChange={e => setManualPrecio(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addManual())} />
          </div>
          <button type="button" className="btn" onClick={addManual} disabled={!manualDesc.trim() || !manualPrecio}>
            + Agregar
          </button>
        </div>
      </div>

      {/* Lista de ítems */}
      {items.length === 0 ? (
        <div style={{
          padding: "14px 16px", borderRadius: 10, textAlign: "center",
          border: "1px dashed rgba(255,255,255,0.1)", color: "var(--subtext)", fontSize: 13, fontStyle: "italic",
        }}>
          No hay ítems en la comanda aún
        </div>
      ) : (
        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.09)" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 62px 95px 30px",
            gap: 8, padding: "6px 12px",
            background: "rgba(255,255,255,0.04)",
            fontSize: 10, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase",
          }}>
            <span>Descripción</span>
            <span style={{ textAlign: "center" }}>Cant.</span>
            <span style={{ textAlign: "right" }}>Subtotal</span>
            <span />
          </div>
          {items.map((item, idx) => (
            <div key={idx} style={{
              display: "grid", gridTemplateColumns: "1fr 62px 95px 30px",
              gap: 8, padding: "8px 12px", alignItems: "center",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(255,255,255,0.015)",
            }}>
              <div style={{ fontSize: 12 }}>
                {item.descripcion}
                {item.tipo === "manual" && (
                  <span style={{ marginLeft: 6, fontSize: 10, color: "var(--subtext)", padding: "1px 5px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)" }}>manual</span>
                )}
                <div style={{ fontSize: 10, color: "var(--subtext)" }}>{CRC(item.precio_unitario)} c/u</div>
              </div>
              <input type="number" min="0.01" step="0.01" value={item.cantidad}
                onChange={e => updateQty(idx, e.target.value)}
                style={{
                  width: "100%", textAlign: "center", padding: "4px 6px",
                  borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)", color: "var(--text)", fontSize: 12,
                }} />
              <div style={{ textAlign: "right", fontSize: 13, fontWeight: 700 }}>
                {CRC(item.cantidad * item.precio_unitario)}
              </div>
              <button type="button" onClick={() => removeItem(idx)} style={{
                width: 24, height: 24, borderRadius: 6, border: "none",
                background: "rgba(239,68,68,0.15)", color: "#ef4444",
                cursor: "pointer", fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
              }}>×</button>
            </div>
          ))}
          <div style={{
            display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14,
            padding: "10px 12px",
            background: "rgba(52,211,153,0.06)", borderTop: "1px solid rgba(52,211,153,0.2)",
          }}>
            <span style={{ fontSize: 12, color: "var(--subtext)" }}>{items.length} ítem{items.length !== 1 ? "s" : ""}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)" }}>TOTAL</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#34d399" }}>{CRC(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function FichaForm({ petId, initial = null, onSaved, onCancel }) {
  const isEditing = !!initial?.id;
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    tipo:               initial?.tipo               || "consulta",
    tipo_personalizado: initial?.tipo_personalizado || "",
    fecha:              (initial?.fecha || "").split(" ")[0] || (initial?.fecha || "").split("T")[0] || today,
    peso:               initial?.peso               ?? "",
    temperatura:        initial?.temperatura        ?? "",
    nota:               initial?.nota               || "",
  });
  const [file, setFile]             = useState(null);
  const [comandaItems, setComandaItems] = useState([]);
  const [errors, setErrors]         = useState([]);
  const [loading, setLoading]       = useState(false);

  const validate = () => {
    const e = [];
    if (form.tipo === "otro" && !form.tipo_personalizado.trim())
      e.push("Especifica el tipo de consulta.");
    setErrors(e);
    return e.length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
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

      const savedFicha = res.data?.data || res.data;

      // Guardar comanda (siempre al editar para permitir borrar ítems, y al crear si hay ítems)
      if (comandaItems.length > 0 || isEditing) {
        try {
          await expressApi.put(`/fichas/${savedFicha.id}/comanda`, { items: comandaItems });
        } catch (err) {
          console.warn("Error guardando comanda:", err);
        }
      }

      onSaved(savedFicha);
    } catch (err) {
      setErrors([err?.response?.data?.message || err.message || "Error al guardar"]);
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} style={{
      background: "rgba(255,255,255,0.03)", borderRadius: 10,
      padding: "14px 16px", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 16,
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "var(--accent)" }}>
        {isEditing ? "Editar ficha" : "Nueva ficha médica"}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Tipo</div>
          <select className="input" value={form.tipo}
            onChange={e => setForm(f => ({ ...f, tipo: e.target.value, tipo_personalizado: "" }))}>
            {TIPO_OPCIONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Fecha</div>
          <input className="input" type="date" value={form.fecha}
            onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
        </label>
      </div>

      {form.tipo === "otro" && (
        <label style={{ display: "block", marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Especificar tipo de consulta</div>
          <input className="input" value={form.tipo_personalizado}
            onChange={e => setForm(f => ({ ...f, tipo_personalizado: e.target.value }))}
            placeholder="Ej: Corte de uñas, baño medicado..." required />
        </label>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        <label>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Peso (kg, opcional)</div>
          <input className="input" type="number" step="0.1" min="0" value={form.peso}
            onChange={e => setForm(f => ({ ...f, peso: e.target.value }))} placeholder="Ej: 4.5" />
        </label>
        <label>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Temperatura (°C, opcional)</div>
          <input className="input" type="number" step="0.1" min="30" max="45" value={form.temperatura}
            onChange={e => setForm(f => ({ ...f, temperatura: e.target.value }))} placeholder="Ej: 38.5" />
        </label>
      </div>

      <label style={{ display: "block", marginTop: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Observaciones / Nota</div>
        <textarea className="input" rows={3} value={form.nota}
          onChange={e => setForm(f => ({ ...f, nota: e.target.value }))}
          placeholder="Diagnóstico, tratamiento, observaciones..." />
      </label>

      <label style={{ display: "block", marginTop: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Archivo adjunto (opcional)</div>
        <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={e => setFile(e.target.files?.[0] || null)}
          style={{ color: "var(--text)", fontSize: 13 }} />
        <small style={{ color: "var(--subtext)" }}>PDF, PNG, JPG o WEBP · máx 10 MB.</small>
      </label>

      {/* Comanda */}
      <ComandaSection fichaId={initial?.id} items={comandaItems} onItemsChange={setComandaItems} />

      <ErrorList errors={errors} />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Guardando..." : (isEditing ? "Guardar cambios" : "Crear ficha")}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

function FichaDetailModal({ ficha, onClose }) {
  const tipo = tipoDisplay(ficha);
  const [comanda, setComanda]           = useState(null);
  const [loadingComanda, setLoadingComanda] = useState(true);

  useEffect(() => {
    expressApi.get(`/fichas/${ficha.id}/comanda`)
      .then(res => setComanda(res.data?.data || null))
      .catch(() => setComanda(null))
      .finally(() => setLoadingComanda(false));
  }, [ficha.id]);

  const items = comanda?.items || [];
  const total = comanda?.total  || 0;

  const CRC = (n) =>
    `₡${Number(n || 0).toLocaleString("es-CR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <ModalBase
      title="📋 Ficha médica"
      subtitle={`${ficha.mascota_nombre || "Mascota"} — ${ficha.fecha_display || ficha.fecha}`}
      onClose={onClose}
      maxWidth={660}
    >
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18,
        padding: "6px 14px", borderRadius: 8,
        background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)",
        fontWeight: 700, fontSize: 14, color: "var(--accent)",
      }}>
        {tipo}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5, marginBottom: 4 }}>FECHA</div>
          <div style={{ fontSize: 14 }}>{ficha.fecha_display || ficha.fecha || "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5, marginBottom: 4 }}>VETERINARIO</div>
          <div style={{ fontSize: 14 }}>{ficha.creado_por_nombre ? `Dr. ${ficha.creado_por_nombre}` : "—"}</div>
        </div>
        {ficha.peso != null && ficha.peso !== "" && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5, marginBottom: 4 }}>PESO</div>
            <div style={{ fontSize: 14 }}>⚖️ {ficha.peso} kg</div>
          </div>
        )}
        {ficha.temperatura != null && ficha.temperatura !== "" && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5, marginBottom: 4 }}>TEMPERATURA</div>
            <div style={{ fontSize: 14 }}>🌡️ {ficha.temperatura} °C</div>
          </div>
        )}
      </div>

      {ficha.nota ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5, marginBottom: 8 }}>OBSERVACIONES</div>
          <div style={{
            whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 14,
            padding: "12px 14px", borderRadius: 10,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
          }}>
            {ficha.nota}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 16, color: "var(--subtext)", fontSize: 13, fontStyle: "italic" }}>
          Sin observaciones registradas.
        </div>
      )}

      {ficha.filepath && (
        <a href={ficha.filepath} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "8px 16px", borderRadius: 8, textDecoration: "none",
          background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.25)",
          color: "var(--accent)", fontSize: 13, fontWeight: 600,
        }}>
          📎 Ver archivo adjunto
        </a>
      )}

      {/* Comanda */}
      {!loadingComanda && items.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "2px solid rgba(52,211,153,0.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              🧾 Comanda
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#34d399" }}>{CRC(total)}</div>
          </div>
          <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
            {items.map((item, idx) => (
              <div key={idx} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", fontSize: 13,
                borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}>
                <span>
                  {item.descripcion}
                  {item.tipo === "manual" && (
                    <span style={{ marginLeft: 6, fontSize: 10, color: "var(--subtext)", padding: "1px 5px", borderRadius: 3, border: "1px solid rgba(255,255,255,0.1)" }}>manual</span>
                  )}
                </span>
                <span style={{ color: "var(--subtext)", flexShrink: 0, marginLeft: 10, fontSize: 12 }}>
                  {Number(item.cantidad)} × {CRC(item.precio_unitario)} =
                  <span style={{ fontWeight: 700, color: "var(--text)", marginLeft: 4 }}>
                    {CRC(Number(item.cantidad) * Number(item.precio_unitario))}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 6, fontSize: 12 }}>
            {comanda.cobrado
              ? <span style={{ color: "#34d399" }}>✅ Cobrado</span>
              : <span style={{ color: "#f59e0b" }}>⏳ Pendiente de cobro en recepción</span>}
          </div>
        </div>
      )}
    </ModalBase>
  );
}

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
      setFichas(res.data?.data||[]);
    } catch (err) { console.error("Error cargando fichas:", err); }
    finally { setLoading(false); }
  };

  const handleSaved = (saved) => {
    setFichas(prev=>{ const e=prev.find(f=>f.id===saved.id); return e?prev.map(f=>f.id===saved.id?saved:f):[saved,...prev]; });
    setShowForm(false); setEditingFicha(null);
  };

  const deleteFicha = async (id) => {
    if (!confirm("¿Eliminar esta ficha médica?")) return;
    try {
      await expressApi.delete(`/medical-records/${id}`);
      setFichas(prev=>prev.filter(f=>f.id!==id));
    } catch (err) { alert(err?.response?.data?.message||err.message||"Error al eliminar"); }
  };

  if (viewingFicha) {
    return <FichaDetailModal ficha={viewingFicha} onClose={()=>setViewingFicha(null)} />;
  }

  return (
    <ModalBase
      title={`Fichas médicas — ${pet.nombre}`}
      subtitle={`${pet.especie?getSpeciesIcon(pet.especie)+" "+pet.especie:"Mascota"} · ${fichas.length} registro${fichas.length!==1?"s":""}`}
      onClose={onClose} maxWidth={700}
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

      {loading?(
        <div style={{ padding:"20px 0", textAlign:"center", color:"var(--subtext)" }}>Cargando fichas...</div>
      ):fichas.length===0?(
        <div style={{
          padding:"32px 24px", textAlign:"center", borderRadius:10,
          border:"1px dashed rgba(255,255,255,0.1)", color:"var(--subtext)",
        }}>
          <div style={{ fontSize:36, marginBottom:8 }}>📋</div>
          <div>No hay fichas médicas registradas aún.</div>
        </div>
      ):(
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {fichas.map(f=>(
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
                    }}>{tipoDisplay(f)}</span>
                    <span className="small-muted">{f.fecha_display||f.fecha}</span>
                    {f.peso        && <span className="small-muted">⚖️ {f.peso} kg</span>}
                    {f.temperatura && <span className="small-muted">🌡️ {f.temperatura} °C</span>}
                    {f.creado_por_nombre && <span className="small-muted">Dr. {f.creado_por_nombre}</span>}
                  </div>
                  {f.nota&&(
                    <div style={{ marginTop:6, fontSize:13, lineHeight:1.5, color:"var(--subtext)" }}>
                      {f.nota.length>120?f.nota.slice(0,120)+"…":f.nota}
                    </div>
                  )}
                  {f.filepath&&(
                    <a href={f.filepath} target="_blank" rel="noopener noreferrer"
                      style={{ display:"inline-block", marginTop:6, fontSize:12, color:"var(--accent)" }}>
                      📎 Archivo adjunto
                    </a>
                  )}
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
                  <button className="btn"
                    style={{ padding:"4px 10px", fontSize:12,
                      background:"rgba(96,165,250,0.1)", border:"1px solid rgba(96,165,250,0.3)", color:"var(--accent)" }}
                    onClick={()=>setViewingFicha(f)}>
                    Ver
                  </button>
                  {isAdmin&&(
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
