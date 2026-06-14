// app/mascotas/VacunasModal.js
"use client";
import { useEffect, useState } from "react";
import expressApi from "../../lib/expressApi";

const VACUNAS_COMUNES = [
  "Rabia", "Parvovirus", "Moquillo", "Hepatitis", "Leptospirosis",
  "Bordetella", "Polivalente (Quíntuple)", "Séxtuple",
  "Triple felina", "Leucemia felina", "Otra",
];

function addOneYear(ymd) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  return `${y + 1}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function ModalBase({ title, subtitle, onClose, children, maxWidth = 720 }) {
  return (
    <div className="modal-overlay">
      <div className="modal card" style={{
        maxWidth, width: "92vw", maxHeight: "88vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
        }}>
          <div>
            <div className="title" style={{ fontSize: 18 }}>{title}</div>
            {subtitle && <div className="subtitle" style={{ fontSize: 13 }}>{subtitle}</div>}
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

function ErrorList({ errors }) {
  if (!errors.length) return null;
  return (
    <div style={{
      marginTop: 12, padding: "10px 14px", borderRadius: 8,
      background: "rgba(251,113,133,0.08)", border: "1px solid rgba(251,113,133,0.2)",
      color: "#fb7185", fontSize: 13,
    }}>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {errors.map((e, i) => <li key={i}>{e}</li>)}
      </ul>
    </div>
  );
}

function EstadoBadge({ estado, dias }) {
  const map = {
    vencida:     { bg: "rgba(239,68,68,0.12)",   bd: "rgba(239,68,68,0.35)",   col: "#ef4444",        icon: "⚠️", label: dias != null ? `Vencida hace ${Math.abs(dias)} d` : "Vencida" },
    proxima:     { bg: "rgba(245,158,11,0.12)",  bd: "rgba(245,158,11,0.35)",  col: "#f59e0b",        icon: "🔔", label: dias === 0 ? "Vence hoy" : `En ${dias} d` },
    vigente:     { bg: "rgba(52,211,153,0.12)",  bd: "rgba(52,211,153,0.3)",   col: "#34d399",        icon: "✅", label: "Vigente" },
    completado:  { bg: "rgba(167,139,250,0.12)", bd: "rgba(167,139,250,0.3)",  col: "#a78bfa",        icon: "✓",  label: "Ciclo completado" },
    sin_proxima: { bg: "rgba(255,255,255,0.05)", bd: "rgba(255,255,255,0.12)", col: "var(--subtext)", icon: "—",  label: "Sin próxima" },
  };
  const c = map[estado] || map.sin_proxima;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
      background: c.bg, border: `1px solid ${c.bd}`, color: c.col, whiteSpace: "nowrap",
    }}>
      {c.icon} {c.label}
    </span>
  );
}

function AplicarForm({ vacuna, onSaved, onCancel }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    fecha_aplicacion: today,
    fecha_proxima:    "",
    producto:         vacuna.producto || "",
    lote:             "",
    notas:            "",
  });
  const [errors, setErrors]   = useState([]);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (ev) => {
    ev.preventDefault();
    const e = [];
    if (!form.fecha_aplicacion) e.push("La fecha de aplicación es obligatoria.");
    if (form.fecha_proxima && form.fecha_proxima < form.fecha_aplicacion)
      e.push("La próxima dosis no puede ser anterior a la fecha de aplicación.");
    setErrors(e);
    if (e.length) return;
    setLoading(true);
    try {
      const res = await expressApi.post(`/vacunas/${vacuna.id}/aplicar`, {
        fecha_aplicacion: form.fecha_aplicacion,
        fecha_proxima:    form.fecha_proxima || null,
        producto:         form.producto || null,
        lote:             form.lote     || null,
        notas:            form.notas    || null,
      });
      onSaved(res.data.registro_anterior, res.data.nuevo_registro);
    } catch (err) {
      setErrors([err?.response?.data?.message || err.message || "Error al registrar"]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{
      marginTop: 10, padding: "12px 14px", borderRadius: 8,
      background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.25)",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#34d399", marginBottom: 10 }}>
        ✅ Registrar dosis aplicada — {vacuna.nombre_vacuna}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Fecha de aplicación</div>
          <input className="input" type="date" value={form.fecha_aplicacion}
            onChange={set("fecha_aplicacion")} required />
        </label>
        <label>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
            <span>Próxima dosis (opcional)</span>
            <button type="button"
              onClick={() => setForm(f => ({ ...f, fecha_proxima: addOneYear(f.fecha_aplicacion) }))}
              style={{ background: "none", border: "none", color: "#a78bfa", cursor: "pointer", fontSize: 11, padding: 0 }}>
              +1 año
            </button>
          </div>
          <input className="input" type="date" value={form.fecha_proxima} onChange={set("fecha_proxima")} />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        <label>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Producto / Marca (opcional)</div>
          <input className="input" value={form.producto} onChange={set("producto")} placeholder="Ej: Nobivac..." />
        </label>
        <label>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Lote (opcional)</div>
          <input className="input" value={form.lote} onChange={set("lote")} placeholder="Ej: A1234B" />
        </label>
      </div>
      <label style={{ display: "block", marginTop: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Notas (opcional)</div>
        <textarea className="input" rows={2} value={form.notas} onChange={set("notas")}
          placeholder="Observaciones de la aplicación..." />
      </label>
      <ErrorList errors={errors} />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="btn" type="submit" disabled={loading} style={{
          background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.4)", color: "#34d399",
        }}>
          {loading ? "Registrando..." : "✅ Confirmar aplicación"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

function VacunaForm({ petId, initial = null, onSaved, onCancel }) {
  const isEditing = !!initial?.id;
  const today = new Date().toISOString().split("T")[0];
  const initialNombre = initial?.nombre_vacuna || "";
  const esComun = VACUNAS_COMUNES.includes(initialNombre);
  const [selVacuna, setSelVacuna]   = useState(initialNombre ? (esComun ? initialNombre : "Otra") : "Rabia");
  const [otraVacuna, setOtraVacuna] = useState(esComun ? "" : initialNombre);
  const [form, setForm] = useState({
    fecha_aplicacion: initial?.fecha_aplicacion || today,
    fecha_proxima:    initial?.fecha_proxima    || "",
    producto:         initial?.producto         || "",
    lote:             initial?.lote             || "",
    notas:            initial?.notas            || "",
  });
  const [errors, setErrors]   = useState([]);
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (ev) => {
    ev.preventDefault();
    const nombre = selVacuna === "Otra" ? otraVacuna.trim() : selVacuna;
    const e = [];
    if (!nombre)                e.push("Indica el nombre de la vacuna.");
    if (!form.fecha_aplicacion) e.push("La fecha de aplicación es obligatoria.");
    if (form.fecha_proxima && form.fecha_proxima < form.fecha_aplicacion)
      e.push("La próxima dosis no puede ser anterior a la fecha de aplicación.");
    setErrors(e);
    if (e.length) return;
    setLoading(true);
    try {
      const payload = {
        mascota_id: petId, nombre_vacuna: nombre,
        fecha_aplicacion: form.fecha_aplicacion,
        fecha_proxima: form.fecha_proxima || null,
        producto: form.producto || null, lote: form.lote || null, notas: form.notas || null,
      };
      const res = isEditing
        ? await expressApi.put(`/vacunas/${initial.id}`, payload)
        : await expressApi.post("/vacunas", payload);
      onSaved(res.data?.data || res.data);
    } catch (err) {
      setErrors([err?.response?.data?.message || err.message || "Error al guardar"]);
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} style={{
      background: "rgba(255,255,255,0.03)", borderRadius: 10,
      padding: "14px 16px", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 16,
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "#a78bfa" }}>
        {isEditing ? "Editar vacuna" : "Nueva vacuna"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Vacuna</div>
          <select className="input" value={selVacuna} onChange={e => setSelVacuna(e.target.value)}>
            {VACUNAS_COMUNES.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        {selVacuna === "Otra" ? (
          <label>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Especificar nombre</div>
            <input className="input" value={otraVacuna} onChange={e => setOtraVacuna(e.target.value)}
              placeholder="Nombre de la vacuna" required />
          </label>
        ) : <div />}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        <label>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Fecha de aplicación</div>
          <input className="input" type="date" value={form.fecha_aplicacion}
            onChange={set("fecha_aplicacion")} required />
        </label>
        <label>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
            <span>Próxima dosis (opcional)</span>
            <button type="button" onClick={() => setForm(f => ({ ...f, fecha_proxima: addOneYear(f.fecha_aplicacion) }))}
              style={{ background: "none", border: "none", color: "#a78bfa", cursor: "pointer", fontSize: 11, padding: 0 }}>
              +1 año
            </button>
          </div>
          <input className="input" type="date" value={form.fecha_proxima} onChange={set("fecha_proxima")} />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        <label>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Producto / Marca (opcional)</div>
          <input className="input" value={form.producto} onChange={set("producto")} placeholder="Ej: Nobivac, Vanguard..." />
        </label>
        <label>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Lote (opcional)</div>
          <input className="input" value={form.lote} onChange={set("lote")} placeholder="Ej: A1234B" />
        </label>
      </div>
      <label style={{ display: "block", marginTop: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Notas (opcional)</div>
        <textarea className="input" rows={2} value={form.notas} onChange={set("notas")}
          placeholder="Reacciones, observaciones..." />
      </label>
      <ErrorList errors={errors} />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Guardando..." : (isEditing ? "Guardar cambios" : "Registrar vacuna")}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

export default function VacunasModal({ pet, onClose, isAdmin = false }) {
  const [vacunas, setVacunas]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [editing, setEditing]             = useState(null);
  const [aplicarTarget, setAplicarTarget] = useState(null);

  const fetchVacunas = async () => {
    setLoading(true);
    try {
      const res = await expressApi.get(`/vacunas?pet_id=${pet.id}`);
      setVacunas(res.data?.data || []);
    } catch (err) {
      console.error("Error cargando vacunas:", err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchVacunas(); }, []);

  const handleSaved = (saved) => {
    setVacunas(prev => {
      const exists = prev.find(v => v.id === saved.id);
      return exists ? prev.map(v => v.id === saved.id ? saved : v) : [saved, ...prev];
    });
    setShowForm(false);
    setEditing(null);
  };

  const handleAplicar = (registroAnterior, nuevoRegistro) => {
    setVacunas(prev => {
      const updated = prev.map(v => v.id === registroAnterior.id ? registroAnterior : v);
      return [nuevoRegistro, ...updated];
    });
    setAplicarTarget(null);
  };

  const deleteVacuna = async (id) => {
    if (!confirm("¿Eliminar este registro de vacuna?")) return;
    try {
      await expressApi.delete(`/vacunas/${id}`);
      setVacunas(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Error al eliminar");
    }
  };

  return (
    <ModalBase title={`💉 Libro de vacunas — ${pet.nombre}`}
      subtitle={`${vacunas.length} registro${vacunas.length !== 1 ? "s" : ""}`}
      onClose={onClose}>
      {isAdmin && !showForm && !editing && (
        <button className="btn" onClick={() => setShowForm(true)} style={{ marginBottom: 12 }}>
          + Nueva vacuna
        </button>
      )}
      {showForm && <VacunaForm petId={pet.id} onSaved={handleSaved} onCancel={() => setShowForm(false)} />}
      {editing  && <VacunaForm petId={pet.id} initial={editing} onSaved={handleSaved} onCancel={() => setEditing(null)} />}

      {loading ? (
        <div style={{ padding: "20px 0", textAlign: "center", color: "var(--subtext)" }}>Cargando vacunas...</div>
      ) : vacunas.length === 0 ? (
        <div style={{ padding: "32px 24px", textAlign: "center", borderRadius: 10,
          border: "1px dashed rgba(255,255,255,0.1)", color: "var(--subtext)" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>💉</div>
          <div>No hay vacunas registradas aún.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {vacunas.map(v => (
            <div key={v.id} style={{
              padding: "12px 14px", borderRadius: 10,
              border: v.estado === "completado" ? "1px solid rgba(167,139,250,0.2)" : "1px solid rgba(255,255,255,0.08)",
              background: v.estado === "completado" ? "rgba(167,139,250,0.04)" : "rgba(255,255,255,0.03)",
              opacity: v.estado === "completado" ? 0.75 : 1,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontSize: 15 }}>💉 {v.nombre_vacuna}</span>
                    <EstadoBadge estado={v.estado} dias={v.dias_restantes} />
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Aplicada</div>
                      <div style={{ fontSize: 13 }}>{v.fecha_aplicacion_display}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Próxima dosis</div>
                      <div style={{ fontSize: 13 }}>{v.fecha_proxima_display}</div>
                    </div>
                    {v.veterinario_nombre && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Aplicó</div>
                        <div style={{ fontSize: 13 }}>Dr. {v.veterinario_nombre}</div>
                      </div>
                    )}
                  </div>
                  {(v.producto || v.lote) && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--subtext)" }}>
                      {v.producto && <span>🏷️ {v.producto}</span>}
                      {v.producto && v.lote && <span> · </span>}
                      {v.lote && <span>Lote: {v.lote}</span>}
                    </div>
                  )}
                  {v.notas && (
                    <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, color: "var(--subtext)" }}>
                      {v.notas}
                    </div>
                  )}
                  {aplicarTarget === v.id && (
                    <AplicarForm vacuna={v} onSaved={handleAplicar} onCancel={() => setAplicarTarget(null)} />
                  )}
                </div>
                {isAdmin && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
                    {(v.estado === "vencida" || v.estado === "proxima") && aplicarTarget !== v.id && (
                      <button className="btn" style={{
                        padding: "4px 10px", fontSize: 11, whiteSpace: "nowrap",
                        background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.35)", color: "#34d399",
                      }}
                        onClick={() => { setAplicarTarget(v.id); setEditing(null); setShowForm(false); }}>
                        ✅ Aplicar dosis
                      </button>
                    )}
                    <button className="btn" style={{ padding: "4px 10px", fontSize: 12 }}
                      onClick={() => { setEditing(v); setShowForm(false); setAplicarTarget(null); }}>
                      Editar
                    </button>
                    <button className="btn-danger" style={{ padding: "4px 10px", fontSize: 12 }}
                      onClick={() => deleteVacuna(v.id)}>
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalBase>
  );
}