// app/mascotas/FichaForm.js
// Alta y edición de una ficha médica, incluido el campo que la agrupa
// dentro de un tratamiento.
"use client";
import { useState } from "react";
import expressApi from "../../lib/expressApi";
import { ErrorList } from "../ui";
import ComandaSection from "./ComandaSection";
import { TIPO_OPCIONES, tipoDisplay, camposDeSeguimiento } from "./fichasUtils";
import { hoyLocal, aFechaInput } from "../fechas";

// ─── Selector "es seguimiento de…" ────────────────────────────────────────────
// Codifica la opción como "t:<id>" (tratamiento existente) o "f:<id>"
// (ficha suelta que se convertirá en el arranque de un tratamiento nuevo).
function SeguimientoSelect({ value, onChange, tratamientos, fichas, excluirFichaId }) {
  const activos     = tratamientos.filter(t => t.estado === "activo");
  const finalizados = tratamientos.filter(t => t.estado !== "activo");
  const sueltas     = fichas
    .filter(f => !f.tratamiento_id && Number(f.id) !== Number(excluirFichaId))
    .slice(0, 20);

  const opcionTratamiento = (t) => (
    <option key={`t${t.id}`} value={`t:${t.id}`}>
      🩺 {t.nombre} ({t.total_fichas} ficha{t.total_fichas !== 1 ? "s" : ""})
    </option>
  );

  return (
    <label style={{ display:"block", marginTop:8 }}>
      <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>
        🔗 Seguimiento de <span style={{ color:"var(--subtext)", fontWeight:400 }}>(opcional)</span>
      </div>
      <select className="input" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Ninguno — consulta nueva</option>

        {activos.length > 0 && (
          <optgroup label="Tratamientos en curso">
            {activos.map(opcionTratamiento)}
          </optgroup>
        )}
        {finalizados.length > 0 && (
          <optgroup label="Tratamientos finalizados">
            {finalizados.map(opcionTratamiento)}
          </optgroup>
        )}
        {sueltas.length > 0 && (
          <optgroup label="Consultas sueltas — al elegir una se crea el tratamiento">
            {sueltas.map(f => (
              <option key={`f${f.id}`} value={`f:${f.id}`}>
                📋 {(f.fecha_display || f.fecha || "").split(",")[0]} · {tipoDisplay(f)}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <small style={{ color:"var(--subtext)", display:"block", marginTop:4, lineHeight:1.5 }}>
        Si esta consulta es continuación de otra, elígela aquí y las dos quedarán
        agrupadas en un mismo tratamiento.
      </small>
    </label>
  );
}

// ─── Formulario de ficha ──────────────────────────────────────────────────────
function FichaForm({ petId, initial = null, onSaved, onCancel, tratamientos = [], fichas = [] }) {
  const isEditing = !!initial?.id;
  const [form, setForm] = useState({
    tipo:               initial?.tipo               || "consulta",
    tipo_personalizado: initial?.tipo_personalizado || "",
    fecha:              aFechaInput(initial?.fecha) || hoyLocal(),
    peso:               initial?.peso               ?? "",
    temperatura:        initial?.temperatura        ?? "",
    nota:               initial?.nota               || "",
  });
  const [seguimiento, setSeguimiento] = useState(
    initial?.tratamiento_id ? `t:${initial.tratamiento_id}` : ""
  );
  const [file, setFile]                 = useState(null);
  const [comandaItems, setComandaItems] = useState([]);
  const [errors, setErrors]             = useState([]);
  const [loading, setLoading]           = useState(false);

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

      for (const [k, v] of Object.entries(camposDeSeguimiento(seguimiento))) fd.append(k, v);

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

      <SeguimientoSelect
        value={seguimiento}
        onChange={setSeguimiento}
        tratamientos={tratamientos}
        fichas={fichas}
        excluirFichaId={initial?.id}
      />

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

export default FichaForm;
