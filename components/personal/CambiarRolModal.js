// components/personal/CambiarRolModal.js
// Confirmación del cambio de rol. Pide la contraseña del propio administrador:
// así, aunque alguien encuentre su sesión abierta, no puede ascender a nadie.
"use client";
import { useState } from "react";
import expressApi from "../../lib/expressApi";
import { ModalBase, ErrorList } from "../ui";

// Qué gana o pierde la persona con cada rol, en palabras claras
const QUE_IMPLICA = {
  superadmin: [
    "Acceso completo al sistema",
    "Reportes y estadísticas del negocio",
    "Catálogo de precios de las comandas",
    "Gestión del personal (puede ascender a otros)",
  ],
  admin: [
    "Atender pacientes: fichas, vacunas y tratamientos",
    "Propietarios, mascotas y citas",
    "Consolidado diario",
    "SIN acceso a reportes ni al catálogo de precios",
  ],
  user: [
    "Agendar y gestionar citas",
    "Ver comandas y marcarlas como cobradas",
    "Notificaciones",
    "SIN acceso a fichas, mascotas ni propietarios",
  ],
};

export default function CambiarRolModal({ persona, rolDestino, roles, onClose, onHecho }) {
  const [password, setPassword] = useState("");
  const [errors, setErrors]     = useState([]);
  const [loading, setLoading]   = useState(false);

  const etiqueta = roles.find(r => r.value === rolDestino)?.label || rolDestino;
  const esAscenso = rolDestino === "superadmin";

  const submit = async (ev) => {
    ev.preventDefault();
    if (!password) { setErrors(["Escribe tu contraseña para confirmar."]); return; }
    setErrors([]); setLoading(true);
    try {
      const res = await expressApi.put(`/personal/${persona.id}/rol`, { role: rolDestino, password });
      onHecho(res.data?.data, res.data?.message);
    } catch (err) {
      setErrors([err?.response?.data?.message || err.message || "No se pudo cambiar el rol"]);
    } finally { setLoading(false); }
  };

  return (
    <ModalBase
      title={esAscenso ? "⚠️ Ascender a Administrador" : "Cambiar rol"}
      subtitle={persona.nombre}
      onClose={onClose}
      maxWidth={460}
    >
      <form onSubmit={submit}>
        <div style={{
          padding: "14px 16px", borderRadius: 10, marginBottom: 16,
          background: esAscenso ? "rgba(245,158,11,0.08)" : "rgba(96,165,250,0.07)",
          border: `1px solid ${esAscenso ? "rgba(245,158,11,0.3)" : "rgba(96,165,250,0.25)"}`,
        }}>
          <div style={{ fontSize: 13, marginBottom: 10, lineHeight: 1.6 }}>
            <strong>{persona.nombre}</strong> pasará de{" "}
            <strong>{persona.role_label}</strong> a <strong>{etiqueta}</strong>.
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", marginBottom: 6 }}>
            CON ESE ROL PODRÁ:
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--subtext)", lineHeight: 1.7 }}>
            {(QUE_IMPLICA[rolDestino] || []).map((linea, i) => <li key={i}>{linea}</li>)}
          </ul>
        </div>

        <label style={{ display: "block" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Confirma con <strong>tu</strong> contraseña
          </div>
          <input
            className="input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            autoFocus
            required
          />
          <small style={{ color: "var(--subtext)", display: "block", marginTop: 6, lineHeight: 1.5 }}>
            Se pide para confirmar que eres tú quien hace el cambio. Se avisará por
            correo a {persona.nombre.split(" ")[0]} y a los demás administradores.
          </small>
        </label>

        <ErrorList errors={errors} />

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button className="btn" type="submit" disabled={loading} style={{
            flex: 1,
            background: esAscenso ? "linear-gradient(90deg, #f59e0b, #d97706)" : undefined,
          }}>
            {loading ? "Aplicando..." : `Sí, cambiar a ${etiqueta}`}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </ModalBase>
  );
}
