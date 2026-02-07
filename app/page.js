// app/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import expressApi from "../lib/expressApi";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const backgroundStyle = {
    background:
      "radial-gradient(1000px 600px at 10% 10%, rgba(96,165,250,0.04), transparent), #080b14",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  };

  const cardStyle = {
    width: 420,
    maxWidth: "96%",
    borderRadius: 14,
    padding: 22,
    boxShadow: "0 12px 40px rgba(2,6,23,0.6)",
    background: "#0b1220",
    border: "1px solid rgba(255,255,255,0.04)",
    color: "#e6eef8"
  };

  const logoStyle = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  };

  const pawStyle = {
    fontSize: 28,
    transform: "rotate(-12deg)",
  };

  // Ensure no stray Authorization header
  const clearAuthHeader = () => {
    try { delete expressApi.defaults.headers.common["Authorization"]; } catch {}
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await expressApi.post("/auth/login", { email, password });

      const token =
        res.data?.data?.token ||
        res.data?.token ||
        res.data?.access_token ||
        null;

      if (!token) throw new Error("Token no encontrado en la respuesta del servidor");

      localStorage.setItem("token", token);
      localStorage.setItem("user_source", "express");
      expressApi.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      let usuario = res.data?.data?.user || res.data?.data || res.data?.user || null;
      if (!usuario || !usuario.email) {
        const perfilRes = await expressApi.get("/auth/profile");
        usuario = perfilRes.data?.data || perfilRes.data || { email };
      }

      usuario.role = usuario.role || "user";
      localStorage.setItem("user", JSON.stringify(usuario));
      setLoading(false);
      router.replace("/dashboard");
      return;
    } catch (err) {
      console.error("Login express error:", err.response?.data || err.message);
      setError(err.response?.data?.message || err.message || "Error al iniciar sesión");
      clearAuthHeader();
      setLoading(false);
      return;
    }
  };

  return (
    <div style={backgroundStyle}>
      <div style={cardStyle}>
        <div style={logoStyle}>
          <div style={pawStyle}>🐾</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#e6eef8" }}>VetCare Clinic</div>
            <div style={{ color: "#9fb0c8", fontSize: 13 }}>Sistema de gestión veterinaria</div>
          </div>
        </div>

        <h2 style={{ marginTop: 12, marginBottom: 4, color: "#e6eef8" }}>Iniciar sesión</h2>
        <p style={{ marginTop: 0, marginBottom: 12, color: "#9fb0c8" }}>
          Inicia sesión con tu cuenta de doctor o recepcionista.
        </p>

        <form onSubmit={handleSubmit} aria-label="form-login">
          <label style={{ display: "block", marginTop: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e6eef8" }}>Correo</div>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@ejemplo.com" />
          </label>

          <label style={{ display: "block", marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e6eef8" }}>Contraseña</div>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          </label>

          {error && <p style={{ color: "crimson", marginTop: 10 }}>{error}</p>}

          <button className="btn" type="submit" disabled={loading} style={{ marginTop: 10 }}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div style={{ color: "#9fb0c8", fontSize: 13 }}>
            Las cuentas admin (doctor) deben ser creadas por un administrador desde el dashboard.
          </div>
        </div>
      </div>
    </div>
  );
}