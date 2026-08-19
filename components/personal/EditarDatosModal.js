// components/personal/EditarDatosModal.js
// Corregir nombre, correo y teléfono del personal.
//
// Existe sobre todo por el correo: quien se dio de alta solo con la cédula
// quedó con uno de relleno (@pendiente.vet) y sin un correo real no puede
// restablecer su contraseña si se le olvida.
"use client";
import { useState } from "react";
import expressApi from "../../lib/expressApi";
import { ModalBase, ErrorList } from "../ui";

export default function EditarDatosModal({ persona, onClose, onHecho }) {
  const [form, setForm] = useState({
    nombre:   persona.nombre   || "",
    // El correo de relleno se muestra vacío: es basura, no un dato que
    // valga la pena conservar ni corregir a medias.
    email:    persona.correo_utilizable ? (persona.email || "") : "",
    telefono: persona.telefono || "",
  });
  const [errors, setErrors]   = useState([]);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (ev) => {
    ev.preventDefault();
    const e = [];
    if (!form.nombre.trim()) e.push("El nombre es obligatorio.");
    if (!form.email.trim())  e.push("El correo es obligatorio.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      e.push("El correo no tiene un formato válido.");
    setErrors(e);
    if (e.length) return;

    setLoading(true);
    try {
      const res = await expressApi.put(`/personal/${persona.id}`, {
        nombre:   form.nombre.trim(),
        email:    form.email.trim(),
        telefono: form.telefono.trim(),
      });
      onHecho(res.data?.data, "Datos actualizados");
    } catch (err) {
      setErrors([err?.response?.data?.message || err.message || "No se pudo guardar"]);
    } finally { setLoading(false); }
  };

  return (
    <ModalBase title="✎ Editar datos" subtitle={persona.nombre} onClose={onClose} maxWidth={440}>
      <form onSubmit={submit}>
        {!persona.correo_utilizable && (
          <div style={{
            padding: "12px 14px", borderRadius: 8, marginBottom: 16, fontSize: 12.5, lineHeight: 1.6,
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b",
          }}>
            ⚠️ Esta persona no tiene un correo real. Sin uno no puede restablecer
            su contraseña si la olvida.
          </div>
        )}

        <label style={{ display: "block" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Nombre</div>
          <input className="input" value={form.nombre} onChange={set("nombre")} required />
        </label>

        <label style={{ display: "block", marginTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Correo</div>
          <input className="input" type="email" value={form.email} onChange={set("email")}
            placeholder="nombre@ejemplo.com" autoComplete="off" required />
        </label>

        <label style={{ display: "block", marginTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Teléfono</div>
          <input className="input" value={form.telefono} onChange={set("telefono")}
            placeholder="+506 8888-8888" />
        </label>

        <div style={{ marginTop: 12, fontSize: 12, color: "var(--subtext)" }}>
          Cédula: <strong>{persona.cedula || "—"}</strong> · Rol: <strong>{persona.role_label}</strong>
          <br />
          La cédula y el rol no se editan aquí: la cédula es con lo que inicia sesión,
          y el rol se cambia desde el botón de ascender.
        </div>

        <ErrorList errors={errors} />

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button className="btn" type="submit" disabled={loading} style={{ flex: 1 }}>
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </ModalBase>
  );
}
