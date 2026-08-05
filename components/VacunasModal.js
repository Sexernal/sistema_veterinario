// app/mascotas/VacunasModal.js
"use client";
import { useEffect, useState } from "react";
import expressApi from "../lib/expressApi";
import { ModalBase, ErrorList, EmptyState } from "./ui";
import { hoyLocal, aFechaInput, sumarAnios } from "./fechas";

const VACUNAS_COMUNES = [
  "Rabia", "Parvovirus", "Moquillo", "Hepatitis", "Leptospirosis",
  "Bordetella", "Polivalente (Quíntuple)", "Séxtuple",
  "Triple felina", "Leucemia felina", "Otra",
];


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
  const [form, setForm] = useState({
    fecha_aplicacion: hoyLocal(),
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
              onClick={() => setForm(f => ({ ...f, fecha_proxima: sumarAnios(f.fecha_aplicacion) }))}
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
  const initialNombre = initial?.nombre_vacuna || "";
  const esComun = VACUNAS_COMUNES.includes(initialNombre);
  const [selVacuna, setSelVacuna]   = useState(initialNombre ? (esComun ? initialNombre : "Otra") : "Rabia");
  const [otraVacuna, setOtraVacuna] = useState(esComun ? "" : initialNombre);
  const [form, setForm] = useState({
    fecha_aplicacion: aFechaInput(initial?.fecha_aplicacion) || hoyLocal(),
    fecha_proxima:    aFechaInput(initial?.fecha_proxima),
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
            <button type="button" onClick={() => setForm(f => ({ ...f, fecha_proxima: sumarAnios(f.fecha_aplicacion) }))}
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

// ─── Agrupación de dosis por serie de vacuna ──────────────────────────────────
// Cada serie (1ª, 2ª, 3ª dosis...) comparte el mismo grupo_id que asigna el API.
function agruparPorSerie(vacunas) {
  const map = new Map();
  for (const v of vacunas) {
    const g = v.grupo_id ?? v.id;
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(v);
  }

  const grupos = [];
  for (const [grupoId, lista] of map) {
    // Dosis más reciente primero
    const dosis = lista.slice().sort((a, b) => {
      const fa = a.fecha_aplicacion || "";
      const fb = b.fecha_aplicacion || "";
      if (fa !== fb) return fa < fb ? 1 : -1;
      return b.id - a.id;
    });
    grupos.push({
      grupoId,
      nombre: dosis[0].nombre_vacuna,
      dosis,
      actual: dosis[0],   // la dosis vigente de la serie
      total: dosis.length,
    });
  }

  // Primero lo que requiere acción: vencidas → próximas → vigentes → completadas
  const prioridad = { vencida: 0, proxima: 1, vigente: 2, sin_proxima: 3, completado: 4 };
  grupos.sort((a, b) => {
    const pa = prioridad[a.actual.estado] ?? 9;
    const pb = prioridad[b.actual.estado] ?? 9;
    if (pa !== pb) return pa - pb;
    return (b.actual.fecha_aplicacion || "").localeCompare(a.actual.fecha_aplicacion || "");
  });
  return grupos;
}

function DatoMini({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 13 }}>{children}</div>
    </div>
  );
}

// Una dosis dentro de la serie
function DosisItem({ v, numero, esActual, isAdmin, onEditar, onEliminar }) {
  const completado = v.estado === "completado";
  return (
    <div style={{
      display: "flex", gap: 10, padding: "10px 12px",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      background: esActual ? "rgba(255,255,255,0.02)" : "transparent",
      opacity: completado ? 0.7 : 1,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: 12, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800,
        background: completado ? "rgba(167,139,250,0.15)" : "rgba(96,165,250,0.15)",
        border: `1px solid ${completado ? "rgba(167,139,250,0.35)" : "rgba(96,165,250,0.35)"}`,
        color: completado ? "#a78bfa" : "var(--accent)",
      }}>{numero}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>
            {numero}ª dosis · {v.fecha_aplicacion_display}
          </span>
          <EstadoBadge estado={v.estado} dias={v.dias_restantes} />
          {esActual && v.total_dosis > 1 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-2)" }}>ACTUAL</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
          <DatoMini label="Próxima dosis">{v.fecha_proxima_display}</DatoMini>
          {v.veterinario_nombre && <DatoMini label="Aplicó">Dr. {v.veterinario_nombre}</DatoMini>}
        </div>
        {(v.producto || v.lote) && (
          <div style={{ marginTop: 5, fontSize: 12, color: "var(--subtext)" }}>
            {v.producto && <span>🏷️ {v.producto}</span>}
            {v.producto && v.lote && <span> · </span>}
            {v.lote && <span>Lote: {v.lote}</span>}
          </div>
        )}
        {v.notas && (
          <div style={{ marginTop: 5, fontSize: 12.5, lineHeight: 1.5, color: "var(--subtext)" }}>
            {v.notas}
          </div>
        )}
      </div>

      {isAdmin && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
          <button className="btn" style={{ padding: "3px 9px", fontSize: 11 }} onClick={() => onEditar(v)}>
            Editar
          </button>
          <button className="btn-danger" style={{ padding: "3px 9px", fontSize: 11 }} onClick={() => onEliminar(v.id)}>
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

export default function VacunasModal({ pet, onClose, isAdmin = false }) {
  const [vacunas, setVacunas]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [editing, setEditing]             = useState(null);
  const [aplicarTarget, setAplicarTarget] = useState(null);
  const [expandidos, setExpandidos]       = useState(() => new Set());

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

  const grupos = agruparPorSerie(vacunas);

  const toggleGrupo = (grupoId) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(grupoId)) next.delete(grupoId); else next.add(grupoId);
      return next;
    });
  };

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
    // Deja la serie abierta para que se vea la dosis recién agregada
    const g = nuevoRegistro.grupo_id ?? nuevoRegistro.id;
    setExpandidos(prev => new Set(prev).add(g));
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

  const editarDosis = (v) => { setEditing(v); setShowForm(false); setAplicarTarget(null); };

  return (
    <ModalBase title={`💉 Libro de vacunas — ${pet.nombre}`}
      subtitle={`${grupos.length} vacuna${grupos.length !== 1 ? "s" : ""} · ${vacunas.length} dosis registrada${vacunas.length !== 1 ? "s" : ""}`}
      onClose={onClose} maxWidth={720}>
      {isAdmin && !showForm && !editing && (
        <button className="btn" onClick={() => setShowForm(true)} style={{ marginBottom: 12 }}>
          + Nueva vacuna
        </button>
      )}
      {showForm && <VacunaForm petId={pet.id} onSaved={handleSaved} onCancel={() => setShowForm(false)} />}
      {editing  && <VacunaForm petId={pet.id} initial={editing} onSaved={handleSaved} onCancel={() => setEditing(null)} />}

      {loading ? (
        <div style={{ padding: "20px 0", textAlign: "center", color: "var(--subtext)" }}>Cargando vacunas...</div>
      ) : grupos.length === 0 ? (
        <EmptyState icon="💉">No hay vacunas registradas aún.</EmptyState>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {grupos.map(g => {
            const actual = g.actual;
            const completado = actual.estado === "completado";
            const abierto = expandidos.has(g.grupoId);
            const puedeAplicar = actual.estado === "vencida" || actual.estado === "proxima";

            return (
              <div key={g.grupoId} style={{
                borderRadius: 10, overflow: "hidden",
                border: completado ? "1px solid rgba(167,139,250,0.2)" : "1px solid rgba(255,255,255,0.08)",
                background: completado ? "rgba(167,139,250,0.04)" : "rgba(255,255,255,0.03)",
              }}>
                {/* ── Encabezado de la serie ── */}
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, fontSize: 15 }}>💉 {g.nombre}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                          background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.25)",
                          color: "var(--accent)", whiteSpace: "nowrap",
                        }}>
                          {g.total} dosis
                        </span>
                        <EstadoBadge estado={actual.estado} dias={actual.dias_restantes} />
                      </div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
                        <DatoMini label="Última aplicación">{actual.fecha_aplicacion_display}</DatoMini>
                        <DatoMini label="Próxima dosis">{actual.fecha_proxima_display}</DatoMini>
                        {actual.veterinario_nombre && <DatoMini label="Aplicó">Dr. {actual.veterinario_nombre}</DatoMini>}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
                      {isAdmin && puedeAplicar && aplicarTarget !== actual.id && (
                        <button className="btn" style={{
                          padding: "4px 10px", fontSize: 11, whiteSpace: "nowrap",
                          background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.35)", color: "#34d399",
                        }}
                          onClick={() => { setAplicarTarget(actual.id); setEditing(null); setShowForm(false); }}>
                          ✅ Aplicar dosis
                        </button>
                      )}
                      <button className="btn-ghost" style={{
                        padding: "4px 10px", fontSize: 11, whiteSpace: "nowrap",
                        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                      }}
                        onClick={() => toggleGrupo(g.grupoId)}>
                        {abierto ? "▲ Ocultar" : `▼ Ver ${g.total > 1 ? "historial" : "detalle"}`}
                      </button>
                    </div>
                  </div>

                  {aplicarTarget === actual.id && (
                    <AplicarForm vacuna={actual} onSaved={handleAplicar} onCancel={() => setAplicarTarget(null)} />
                  )}
                </div>

                {/* ── Historial de dosis de la serie ── */}
                {abierto && (
                  <div style={{ background: "rgba(0,0,0,0.15)" }}>
                    {g.dosis.map((v, idx) => (
                      <DosisItem
                        key={v.id}
                        v={v}
                        numero={g.total - idx}
                        esActual={idx === 0}
                        isAdmin={isAdmin}
                        onEditar={editarDosis}
                        onEliminar={deleteVacuna}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ModalBase>
  );
}
