// app/page.js
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import expressApi from "../lib/expressApi";
import OlvidePasswordModal from "../components/auth/OlvidePasswordModal";

/* ── Estilos de inputs reutilizables ── */
const inputStyle = { display: "block", width: "100%", boxSizing: "border-box" };

/* ── Paso del modal de crear personal ── */
// null → oculto | "master" → contraseña maestra | "form" → datos del nuevo usuario

export default function LoginPage() {
  const router = useRouter();

  // ── Login ──
  const [cedula,      setCedula]      = useState("");
  const [password,    setPassword]    = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [showOlvide,  setShowOlvide]  = useState(false);

  // ── Modal crear personal ──
  const [step,           setStep]           = useState(null);   // null | "master" | "form"
  const [masterPass,     setMasterPass]     = useState("");
  const [masterLoading,  setMasterLoading]  = useState(false);
  const [masterError,    setMasterError]    = useState("");
  const [newRole,        setNewRole]        = useState("user"); // "admin" | "user"
  const [newCedula,      setNewCedula]      = useState("");
  const [newPassword,    setNewPassword]    = useState("");
  const [newPassConf,    setNewPassConf]    = useState("");
  const [showNewPass,    setShowNewPass]    = useState(false);
  const [createLoading,  setCreateLoading]  = useState(false);
  const [createError,    setCreateError]    = useState("");
  const [createSuccess,  setCreateSuccess]  = useState("");

  /* ────────────── LOGIN ────────────── */
  const handleLogin = async (e) => {
    e?.preventDefault();
    setError("");
    if (!/^\d{9}$/.test(cedula)) { setError("La cédula debe tener exactamente 9 dígitos."); return; }
    setLoading(true);
    try {
      const res   = await expressApi.post("/auth/login", { cedula, password });
      const token = res.data?.data?.token || res.data?.token || null;
      if (!token) throw new Error("No se pudo obtener el token de autenticación");

      localStorage.setItem("token", token);
      localStorage.setItem("user_source", "express");
      expressApi.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      let usuario = res.data?.data?.user || res.data?.user || null;
      if (!usuario) {
        const perfilRes = await expressApi.get("/auth/profile");
        usuario = perfilRes.data?.data || perfilRes.data || {};
      }
      usuario.role = usuario.role || "user";
      localStorage.setItem("user", JSON.stringify(usuario));
      router.replace("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Cédula o contraseña incorrecta.");
    } finally {
      setLoading(false);
    }
  };

  /* ────────────── MODAL: verificar contraseña maestra ────────────── */
  const handleVerifyMaster = async (e) => {
    e?.preventDefault();
    setMasterError("");
    if (!masterPass) { setMasterError("Escribe la contraseña maestra."); return; }
    setMasterLoading(true);
    try {
      await expressApi.post("/auth/verify-master", { masterPassword: masterPass });
      setStep("form");
    } catch (err) {
      setMasterError(err.response?.data?.message || "Contraseña maestra incorrecta.");
    } finally {
      setMasterLoading(false);
    }
  };

  /* ────────────── MODAL: crear personal ────────────── */
  const handleCreateStaff = async (e) => {
    e?.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    if (!/^\d{9}$/.test(newCedula))    { setCreateError("La cédula debe tener 9 dígitos.");       return; }
    if (newPassword.length < 6)         { setCreateError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (newPassword !== newPassConf)    { setCreateError("Las contraseñas no coinciden.");          return; }
    setCreateLoading(true);
    try {
      const res = await expressApi.post("/auth/register-staff", {
        masterPassword: masterPass,
        cedula: newCedula,
        password: newPassword,
        role: newRole,
      });
      setCreateSuccess(res.data?.message || "Usuario creado correctamente.");
      setNewCedula(""); setNewPassword(""); setNewPassConf("");
    } catch (err) {
      setCreateError(err.response?.data?.message || err.message || "Error al crear usuario.");
    } finally {
      setCreateLoading(false);
    }
  };

  const closeModal = () => {
    setStep(null); setMasterPass(""); setMasterError("");
    setNewCedula(""); setNewPassword(""); setNewPassConf("");
    setCreateError(""); setCreateSuccess(""); setNewRole("user");
  };

  /* ────────────── RENDER ────────────── */
  return (
    <div className="center-screen">
      <div style={{ width: 420, maxWidth: "96%" }}>

        {/* Branding */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: "linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 34, marginBottom: 14, boxShadow: "0 8px 32px rgba(96,165,250,0.25)",
          }}>🐾</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#e6eef8", letterSpacing: "-0.5px" }}>Veterinaria Cañas</div>
          <div style={{ color: "#9fb0c8", fontSize: 13, marginTop: 4 }}>Sistema de gestión veterinaria</div>
        </div>

        {/* Card de login */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#e6eef8" }}>Bienvenido de vuelta</div>
            <div style={{ color: "#9fb0c8", fontSize: 13, marginTop: 3 }}>Ingresa con tu número de cédula</div>
          </div>

          <form onSubmit={handleLogin}>
            <label style={{ display: "block" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#cbd8ea", marginBottom: 4 }}>
                Número de cédula
              </div>
              <input
                className="input"
                style={inputStyle}
                type="text"
                inputMode="numeric"
                maxLength={9}
                value={cedula}
                onChange={e => setCedula(e.target.value.replace(/\D/g, "").slice(0, 9))}
                required
                placeholder="123456789"
                autoComplete="username"
              />
              <div style={{ fontSize: 11, color: "#6b7fa0", marginTop: 3 }}>9 dígitos sin guiones</div>
            </label>

            <label style={{ display: "block", marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#cbd8ea", marginBottom: 4 }}>Contraseña</div>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  style={inputStyle}
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "#9fb0c8", fontSize: 15,
                  }}
                  tabIndex={-1}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </label>

            {error && (
              <div style={{
                marginTop: 14, padding: "10px 14px", borderRadius: 8,
                background: "rgba(251,113,133,0.08)", border: "1px solid rgba(251,113,133,0.25)", color: "#fb7185", fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              className="btn"
              type="submit"
              disabled={loading}
              style={{
                marginTop: 20, width: "100%", padding: "12px 0", fontSize: 14,
                background: loading ? "rgba(96,165,250,0.3)" : "linear-gradient(90deg, #60a5fa, #2563eb)",
              }}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>

            <button
              type="button"
              onClick={() => setShowOlvide(true)}
              style={{
                display: "block", margin: "14px auto 0", background: "none", border: "none",
                color: "#60a5fa", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 4,
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>

          {/* Botón crear personal */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
            <button
              onClick={() => setStep("master")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#60a5fa", fontSize: 13, fontWeight: 600,
                textDecoration: "underline", textUnderlineOffset: 3,
              }}
            >
              + Registrar nuevo personal
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, color: "#6b7fa0", fontSize: 12 }}>
          Veterinaria Cañas © {new Date().getFullYear()} — Todos los derechos reservados
        </div>
      </div>

      {/* ════════════ MODAL: crear personal ════════════ */}
      {step && (
        <div className="modal-overlay">
          <div className="modal card" style={{ maxWidth: 440, width: "92vw" }}>
            {/* Header */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div>
                <div className="title" style={{ fontSize: 17 }}>
                  {step === "master" ? "🔐 Acceso administrativo" : "👤 Nuevo personal"}
                </div>
                <div className="subtitle" style={{ fontSize: 12 }}>
                  {step === "master"
                    ? "Introduce la contraseña maestra del sistema"
                    : "Elige el rol y crea las credenciales de acceso"}
                </div>
              </div>
              <button className="btn-ghost" onClick={closeModal} style={{ fontSize: 18 }}>✕</button>
            </div>

            <div style={{ padding: 20 }}>
              {/* PASO 1: contraseña maestra */}
              {step === "master" && (
                <form onSubmit={handleVerifyMaster}>
                  <label style={{ display: "block" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--subtext)", marginBottom: 4 }}>
                      CONTRASEÑA MAESTRA
                    </div>
                    <input
                      className="input"
                      type="password"
                      value={masterPass}
                      onChange={e => setMasterPass(e.target.value)}
                      placeholder="••••••••"
                      autoFocus
                      style={{ width: "100%", boxSizing: "border-box" }}
                    />
                  </label>
                  {masterError && (
                    <div style={{ marginTop: 10, color: "#fb7185", fontSize: 13 }}>{masterError}</div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
                    <button type="button" className="btn-ghost" onClick={closeModal}>Cancelar</button>
                    <button type="submit" className="btn" disabled={masterLoading}>
                      {masterLoading ? "Verificando..." : "Continuar →"}
                    </button>
                  </div>
                </form>
              )}

              {/* PASO 2: datos del nuevo personal */}
              {step === "form" && (
                <form onSubmit={handleCreateStaff}>
                  {/* Selector de rol */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--subtext)", marginBottom: 8 }}>
                      TIPO DE PERSONAL
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        { value: "admin", label: "🩺 Veterinario",    desc: "Acceso completo al sistema" },
                        { value: "user",  label: "📋 Recepcionista",  desc: "Gestión de citas y propietarios" },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setNewRole(opt.value)}
                          style={{
                            padding: "12px 10px", borderRadius: 10, textAlign: "left",
                            cursor: "pointer", transition: "all 0.15s",
                            border: newRole === opt.value ? "2px solid var(--accent)" : "2px solid rgba(255,255,255,0.1)",
                            background: newRole === opt.value ? "rgba(16,217,160,0.1)" : "rgba(255,255,255,0.03)",
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 2 }}>{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <label style={{ display: "block", marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--subtext)", marginBottom: 4 }}>
                      CÉDULA (9 dígitos)
                    </div>
                    <input
                      className="input"
                      type="text"
                      inputMode="numeric"
                      maxLength={9}
                      value={newCedula}
                      onChange={e => setNewCedula(e.target.value.replace(/\D/g, "").slice(0, 9))}
                      placeholder="123456789"
                      style={{ width: "100%", boxSizing: "border-box" }}
                    />
                  </label>

                  <label style={{ display: "block", marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--subtext)", marginBottom: 4 }}>
                      CONTRASEÑA INICIAL
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        className="input"
                        type={showNewPass ? "text" : "password"}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        style={{ width: "100%", boxSizing: "border-box", paddingRight: 40 }}
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
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--subtext)", marginBottom: 4 }}>
                      CONFIRMAR CONTRASEÑA
                    </div>
                    <input
                      className="input"
                      type="password"
                      value={newPassConf}
                      onChange={e => setNewPassConf(e.target.value)}
                      placeholder="Repite la contraseña"
                      style={{ width: "100%", boxSizing: "border-box" }}
                    />
                  </label>

                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--subtext)", lineHeight: 1.5 }}>
                    💡 El usuario podrá agregar el resto de sus datos de su perfil al iniciar sesión.
                  </div>

                  {createError && (
                    <div style={{
                      marginTop: 10, padding: "8px 12px", borderRadius: 8,
                      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 13,
                    }}>
                      {createError}
                    </div>
                  )}
                  {createSuccess && (
                    <div style={{
                      marginTop: 10, padding: "8px 12px", borderRadius: 8,
                      background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#6ee7b7", fontSize: 13,
                    }}>
                      ✅ {createSuccess}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
                    <button type="button" className="btn-ghost" onClick={closeModal}>Cerrar</button>
                    <button type="submit" className="btn" disabled={createLoading}>
                      {createLoading ? "Creando..." : "Crear usuario"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {showOlvide && (
        <OlvidePasswordModal
          onClose={() => setShowOlvide(false)}
          cedulaInicial={cedula}
        />
      )}
    </div>
  );
}