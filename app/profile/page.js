// app/profile/page.js
"use client";
import { useState, useEffect } from "react";
import expressApi from "../../lib/expressApi";
import { useRouter } from "next/navigation";

function Field({ label, value, onChange, type = "text", readOnly = false, hint }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5, marginBottom: 4 }}>
        {label}
      </div>
      <input
        className="input"
        type={type}
        value={value}
        onChange={onChange ? e => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        style={readOnly ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
      />
      {hint && <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 3 }}>{hint}</div>}
    </label>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, marginTop: 24 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.8 }}>{title}</span>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [nombre,          setNombre]          = useState("");
  const [email,           setEmail]           = useState("");
  const [telefono,        setTelefono]        = useState("");
  const [direccion,       setDireccion]       = useState("");
  const [especialidad,    setEspecialidad]    = useState("");

  const [showPassSection,    setShowPassSection]    = useState(false);
  const [currentPassword,    setCurrentPassword]    = useState("");
  const [newPassword,        setNewPassword]        = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPass,        setShowNewPass]        = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState({ text: "", type: "" }); // type: "success" | "error"

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) { router.replace("/"); return; }
    const u = JSON.parse(raw);
    setUser(u);
    setNombre(u.nombre       || "");
    setEmail(u.email         || "");
    setTelefono(u.telefono   || "");
    setDireccion(u.direccion || "");
    setEspecialidad(u.especialidad || "");
  }, [router]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: "", type: "" });
    try {
      const payload = { nombre, email, telefono, direccion };
      if (user?.role === "admin") payload.especialidad = especialidad;
      if (showPassSection && newPassword) {
        if (!currentPassword) { setMsg({ text: "Debes ingresar tu contraseña actual.", type: "error" }); setLoading(false); return; }
        if (newPassword !== confirmNewPassword) { setMsg({ text: "Las contraseñas no coinciden.", type: "error" }); setLoading(false); return; }
        payload.currentPassword = currentPassword;
        payload.newPassword     = newPassword;
      }
      const res     = await expressApi.put("/auth/profile", payload);
      const updated = res.data?.data || res.data;
      localStorage.setItem("user", JSON.stringify({ ...user, ...updated }));
      setUser(prev => ({ ...prev, ...updated }));
      setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword(""); setShowPassSection(false);
      setMsg({ text: "Perfil actualizado correctamente ✓", type: "success" });
    } catch (err) {
      setMsg({ text: err.response?.data?.message || err.message || "Error al guardar.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const isDoctor = user.role === "admin";

  return (
    <div style={{ padding: 24, maxWidth: 640, margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div>
          <h1 className="title" style={{ margin: 0, fontSize: 22 }}>
            {isDoctor ? "🩺 Mi perfil" : "📋 Mi perfil"}
          </h1>
          <div className="subtitle" style={{ fontSize: 13 }}>
            {isDoctor ? "Veterinario" : "Recepcionista"} · Cédula {user.cedula || "—"}
          </div>
        </div>
        <button className="btn-ghost" onClick={() => router.push("/dashboard")}>← Volver</button>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <form onSubmit={handleSave}>

          {/* ── Identificación ── */}
          <SectionHeader icon="🪪" title="Identificación" />
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 14,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>🪪</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)" }}>CÉDULA (no modificable)</div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2 }}>{user.cedula || "—"}</div>
            </div>
          </div>

          {/* ── Información personal ── */}
          <SectionHeader icon="👤" title="Información personal" />
          <Field label="NOMBRE COMPLETO" value={nombre} onChange={setNombre} hint="Tu nombre completo tal como aparecerá en el sistema" />

          {isDoctor && (
            <Field
              label="ESPECIALIDAD"
              value={especialidad}
              onChange={setEspecialidad}
              hint="Ej: Medicina interna, Cirugía, Dermatología..."
            />
          )}

          {/* ── Contacto ── */}
          <SectionHeader icon="📬" title="Contacto" />
          <Field label="CORREO GMAIL" value={email} onChange={setEmail} type="email" hint="Este correo se usará para notificaciones" />
          <Field label="TELÉFONO" value={telefono} onChange={setTelefono} hint="Ej: +506 8888-9999" />
          <Field label="DIRECCIÓN" value={direccion} onChange={setDireccion} hint="Tu dirección de residencia" />

          {/* ── Seguridad ── */}
          <SectionHeader icon="🔒" title="Seguridad" />
          <button
            type="button"
            onClick={() => { setShowPassSection(v => !v); setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword(""); }}
            className="btn-ghost"
            style={{ marginBottom: 14, fontSize: 13 }}
          >
            {showPassSection ? "▲ Ocultar cambio de contraseña" : "▼ Cambiar contraseña"}
          </button>

          {showPassSection && (
            <div style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Field label="CONTRASEÑA ACTUAL" value={currentPassword} onChange={setCurrentPassword} type="password" />

              <label style={{ display: "block", marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5, marginBottom: 4 }}>NUEVA CONTRASEÑA</div>
                <div style={{ position: "relative" }}>
                  <input
                    className="input"
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Escribe tu nueva contraseña"
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(v => !v)}
                    style={{
                      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", color: "#9fb0c8", fontSize: 14,
                    }}
                    tabIndex={-1}
                  >
                    {showNewPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </label>

              <label style={{ display: "block", marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", letterSpacing: 0.5, marginBottom: 4 }}>CONFIRMAR NUEVA CONTRASEÑA</div>
                <input
                  className="input"
                  type={showNewPass ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                />
                {confirmNewPassword && newPassword !== confirmNewPassword && (
                  <div style={{ fontSize: 11, color: "#fca5a5", marginTop: 3 }}>Las contraseñas no coinciden.</div>
                )}
              </label>
            </div>
          )}

          {/* Mensaje */}
          {msg.text && (
            <div style={{
              marginTop: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13,
              background: msg.type === "success" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${msg.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
              color: msg.type === "success" ? "#6ee7b7" : "#fca5a5",
            }}>
              {msg.text}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <button className="btn" type="submit" disabled={loading} style={{ minWidth: 140 }}>
              {loading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}