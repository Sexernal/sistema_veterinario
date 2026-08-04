// app/mascotas/TratamientoCard.js
// Tarjeta plegable de un tratamiento con sus consultas adentro.
"use client";
import { useState } from "react";
import expressApi from "../../lib/expressApi";
import { ErrorList } from "./ui";
import FichaRow from "./FichaRow";
import { getEstadoTratamiento, duracionTexto } from "./fichasUtils";


function EstadoTratamientoBadge({ estado }) {
  const c = getEstadoTratamiento(estado);
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:999,
      background:c.bg, border:`1px solid ${c.bd}`, color:c.col, whiteSpace:"nowrap",
    }}>
      {c.icon} {c.label}
    </span>
  );
}

// ─── Formulario para renombrar / describir un tratamiento ─────────────────────
function TratamientoForm({ tratamiento, onSaved, onCancel }) {
  const [nombre, setNombre]   = useState(tratamiento.nombre || "");
  const [motivo, setMotivo]   = useState(tratamiento.motivo || "");
  const [errors, setErrors]   = useState([]);
  const [loading, setLoading] = useState(false);

  const submit = async (ev) => {
    ev.preventDefault();
    if (!nombre.trim()) { setErrors(["El nombre del tratamiento es obligatorio."]); return; }
    setErrors([]); setLoading(true);
    try {
      const res = await expressApi.put(`/tratamientos/${tratamiento.id}`, {
        nombre: nombre.trim(),
        motivo: motivo.trim() || null,
      });
      onSaved(res.data?.data || res.data);
    } catch (err) {
      setErrors([err?.response?.data?.message || err.message || "Error al guardar"]);
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} style={{
      marginTop:10, padding:"12px 14px", borderRadius:8,
      background:"rgba(167,139,250,0.05)", border:"1px solid rgba(167,139,250,0.25)",
    }}>
      <div style={{ fontSize:12, fontWeight:700, color:"#a78bfa", marginBottom:10 }}>
        ✏️ Editar tratamiento
      </div>
      <label style={{ display:"block" }}>
        <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>Nombre</div>
        <input className="input" value={nombre} onChange={e => setNombre(e.target.value)}
          placeholder="Ej: Otitis oído derecho" maxLength={160} required />
      </label>
      <label style={{ display:"block", marginTop:8 }}>
        <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>Motivo / diagnóstico (opcional)</div>
        <textarea className="input" rows={2} value={motivo} onChange={e => setMotivo(e.target.value)}
          placeholder="Detalle del cuadro que se está tratando..." />
      </label>
      <ErrorList errors={errors} />
      <div style={{ display:"flex", gap:8, marginTop:10 }}>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

// ─── Tarjeta de tratamiento con sus fichas adentro ────────────────────────────
function TratamientoCard({
  tratamiento, fichas, isAdmin, abierto, onToggle,
  onVerFicha, onEditarFicha, onEliminarFicha, onDesagrupar,
  onTratamientoActualizado, onEliminarTratamiento,
}) {
  const [editando, setEditando] = useState(false);
  const [ocupado, setOcupado]   = useState(false);
  const activo   = tratamiento.estado === "activo";
  const duracion = duracionTexto(tratamiento);

  const cambiarEstado = async () => {
    setOcupado(true);
    try {
      const res = await expressApi.put(`/tratamientos/${tratamiento.id}`, {
        estado: activo ? "finalizado" : "activo",
      });
      onTratamientoActualizado(res.data?.data || res.data);
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Error al cambiar el estado");
    } finally { setOcupado(false); }
  };

  return (
    <div style={{
      borderRadius:10, overflow:"hidden",
      border:`1px solid ${activo ? "rgba(245,158,11,0.28)" : "rgba(167,139,250,0.22)"}`,
      background:activo ? "rgba(245,158,11,0.04)" : "rgba(167,139,250,0.04)",
    }}>
      {/* Cabecera */}
      <div style={{ padding:"12px 14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontWeight:800, fontSize:15 }}>🩺 {tratamiento.nombre}</span>
              <EstadoTratamientoBadge estado={tratamiento.estado} />
            </div>
            <div style={{ marginTop:6, fontSize:12, color:"var(--subtext)", display:"flex", gap:10, flexWrap:"wrap" }}>
              <span>
                {tratamiento.primera_ficha_display}
                {tratamiento.ultima_ficha_display !== tratamiento.primera_ficha_display &&
                  ` → ${tratamiento.ultima_ficha_display}`}
              </span>
              {duracion && <span>· {duracion}</span>}
              <span>· {fichas.length} ficha{fichas.length !== 1 ? "s" : ""}</span>
            </div>
            {tratamiento.motivo && (
              <div style={{ marginTop:6, fontSize:13, lineHeight:1.5, color:"var(--subtext)" }}>
                {tratamiento.motivo}
              </div>
            )}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:5, flexShrink:0, alignItems:"flex-end" }}>
            <button className="btn-ghost" style={{ padding:"3px 8px", fontSize:12, whiteSpace:"nowrap" }}
              onClick={onToggle}>
              {abierto ? "▾ Ocultar" : "▸ Ver fichas"}
            </button>
            {isAdmin && !editando && (
              <>
                <button className="btn" style={{ padding:"3px 9px", fontSize:11, whiteSpace:"nowrap" }}
                  onClick={() => setEditando(true)}>
                  Editar
                </button>
                <button className="btn" disabled={ocupado}
                  style={{ padding:"3px 9px", fontSize:11, whiteSpace:"nowrap",
                    background: activo ? "rgba(52,211,153,0.1)" : "rgba(245,158,11,0.1)",
                    border: `1px solid ${activo ? "rgba(52,211,153,0.35)" : "rgba(245,158,11,0.35)"}`,
                    color: activo ? "#34d399" : "#f59e0b" }}
                  onClick={cambiarEstado}>
                  {activo ? "✓ Finalizar" : "🔄 Reabrir"}
                </button>
                <button className="btn-danger" style={{ padding:"3px 9px", fontSize:11, whiteSpace:"nowrap" }}
                  title="Deshace la agrupación. Las fichas NO se eliminan."
                  onClick={() => onEliminarTratamiento(tratamiento)}>
                  Deshacer grupo
                </button>
              </>
            )}
          </div>
        </div>

        {editando && (
          <TratamientoForm
            tratamiento={tratamiento}
            onSaved={(t) => { setEditando(false); onTratamientoActualizado(t); }}
            onCancel={() => setEditando(false)}
          />
        )}
      </div>

      {/* Fichas del tratamiento, en orden cronológico */}
      {abierto && (
        <div style={{
          padding:"0 14px 14px", display:"flex", flexDirection:"column", gap:8,
        }}>
          {fichas.map((f, i) => (
            <FichaRow
              key={f.id}
              ficha={f}
              indice={i + 1}
              isAdmin={isAdmin}
              onVer={onVerFicha}
              onEditar={onEditarFicha}
              onEliminar={onEliminarFicha}
              onDesagrupar={onDesagrupar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TratamientoCard;
