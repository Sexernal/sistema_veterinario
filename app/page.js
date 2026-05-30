"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import expressApi from "../lib/expressApi";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await expressApi.post("/auth/login", { email, password });
      const token =
        res.data?.token ||
        res.data?.data?.token ||
        res.data?.access_token ||
        null;
      if (!token) throw new Error("No se pudo obtener el token de autenticación");

      localStorage.setItem("token", token);
      localStorage.setItem("user_source", "express");
      expressApi.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      let usuario = res.data?.data?.user || res.data?.user || null;
      if (!usuario || !usuario.email) {
        const perfilRes = await expressApi.get("/auth/profile");
        usuario = perfilRes.data?.data || perfilRes.data || { email };
      }
      usuario.role = usuario.role || "user";
      localStorage.setItem("user", JSON.stringify(usuario));
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Credenciales incorrectas. Intente de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-screen">
      <div style={{ width: 400, maxWidth: "96%" }}>

        {/* Branding */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: "linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 34, marginBottom: 14,
            boxShadow: "0 8px 32px rgba(96,165,250,0.25)"
          }}>🐾</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#e6eef8", letterSpacing: "-0.5px" }}>VetCare</div>
          <div style={{ color: "#9fb0c8", fontSize: 13, marginTop: 4 }}>Sistema de gestión veterinaria</div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#e6eef8" }}>Bienvenido de vuelta</div>
            <div style={{ color: "#9fb0c8", fontSize: 13, marginTop: 3 }}>Ingresa tus credenciales para continuar</div>
          </div>

          <form onSubmit={handleSubmit}>
            <label style={{ display: "block" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#cbd8ea", marginBottom: 4 }}>Correo electrónico</div>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="tu@clinica.com"
                autoComplete="email"
              />
            </label>

            <label style={{ display: "block", marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#cbd8ea", marginBottom: 4 }}>Contraseña</div>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "#9fb0c8", fontSize: 15, padding: "0 2px",
                    display: "flex", alignItems: "center"
                  }}
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </label>

            {error && (
              <div style={{
                marginTop: 14, padding: "10px 14px", borderRadius: 8,
                background: "rgba(251,113,133,0.08)",
                border: "1px solid rgba(251,113,133,0.25)",
                color: "#fb7185", fontSize: 13
              }}>
                {error}
              </div>
            )}

            <button
              className="btn"
              type="submit"
              disabled={loading}
              style={{
                marginTop: 20, width: "100%", padding: "12px 0",
                fontSize: 14, letterSpacing: "0.3px",
                background: loading
                  ? "rgba(96,165,250,0.3)"
                  : "linear-gradient(90deg, #60a5fa, #2563eb)"
              }}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, color: "#6b7fa0", fontSize: 12 }}>
          VetCare © {new Date().getFullYear()} — Todos los derechos reservados
        </div>
      </div>
    </div>
  );
}