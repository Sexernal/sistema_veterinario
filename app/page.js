"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "../lib/api";               // API remota de Laravel
import expressApi from "../lib/expressApi"; // API Express local

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("profesor"); // 'local' - 'profesor' - 'express'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [canShowRegister, setCanShowRegister] = useState(true); // si el backend impide registro, lo ocultamos

  // Ajustes visuales oscuros
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
    background: "#0b1220", // opaco
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

  const setAxiosNoAuth = () => {
    try { delete api.defaults.headers.common["Authorization"]; } catch {}
    try { delete expressApi.defaults.headers.common["Authorization"]; } catch {}
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);

    // 1) Modo local fallback
    if (mode === "local") {
      if (email === "gmail@ejemplo.com" && password === "1234") {
        const usuarioLocal = { id: 0, nombre: "Usuario DEMO", email, role: "guest", source: "local" };
        localStorage.setItem("user", JSON.stringify(usuarioLocal));
        localStorage.setItem("token", "local");
        localStorage.setItem("user_source", "local");
        setAxiosNoAuth();
        setLoading(false);
        // Dashboard permitido pero con acciones restringidas
        router.replace("/dashboard");
        return;
      } else {
        setError("Credenciales demo, inválidas para el modo Local.");
        setLoading(false);
        return;
      }
    }

    // 2) Modo API remota de Laravel
    if (mode === "profesor") {
      try {
        const res = await api.post("/api/login", { email, password });
        const token = res.data?.token || res.data?.access_token || res.data?.data?.token || null;
        if (!token) throw new Error("Token no encontrado en respuesta de login (Laravel)");
        localStorage.setItem("token", token);
        localStorage.setItem("user_source", "profesor");
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        // obtener perfil
        let perfil = null;
        try {
          const perfilRes = await api.get("/api/profile");
          perfil = perfilRes.data?.data || perfilRes.data || { email };
        } catch (pErr) {
          perfil = { email, nombre: email, role: "user" };
        }

        // Laravel users via this route are treated as normal users (no admin)
        perfil.role = perfil.role || "user";

        localStorage.setItem("user", JSON.stringify(perfil));
        setLoading(false);
        router.replace("/dashboard");
        return;
      } catch (err) {
        console.error(err.response?.data || err.message);
        setError(err.response?.data?.message || err.message || "Error login profesor");
        setLoading(false);
        return;
      }
    }

    // 3) Modo API Express local (roles admin)
    if (mode === "express") {
      try {
        const res = await expressApi.post("/auth/login", { email, password });

        // el servidor puede devolver token en varios lugares; chequeamos con prioridad
        const token =
          res.data?.token ||
          res.data?.data?.token ||
          res.data?.access_token ||
          null;
        if (!token) throw new Error("Token no encontrado en respuesta Express");

        localStorage.setItem("token", token);
        localStorage.setItem("user_source", "express");
        expressApi.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        // Si la respuesta del login ya trae el usuario, usarlo:
        let usuario = res.data?.data?.user || res.data?.data || res.data?.user || null;

        // Si login no devolvió user completo, pedir profile
        if (!usuario || !usuario.email) {
          const perfilRes = await expressApi.get("/auth/profile");
          usuario = perfilRes.data?.data || perfilRes.data || { email };
        }

        // Dejar que el backend nos diga el role; si no viene, default user
        usuario.role = usuario.role || "user";

        localStorage.setItem("user", JSON.stringify(usuario));
        setLoading(false);
        router.replace("/dashboard");
        return;
      } catch (err) {
        console.error(err.response?.data || err.message);
        setError(err.response?.data?.message || err.message || "Error login express");
        setLoading(false);
        return;
      }
    }

    setError("Modo desconocido");
    setLoading(false);
  }; // fin del handleSubmit

  // --- componentes del registro modal ---
  function RegisterModal({ onClose }) {
    const [nombre, setNombre] = useState("");
    const [emailR, setEmailR] = useState("");
    const [telefono, setTelefono] = useState("");
    const [passwordR, setPasswordR] = useState("");
    const [loadingR, setLoadingR] = useState(false);
    const [errorsR, setErrorsR] = useState([]);

    const validateClient = () => {
      const errs = [];
      if (!nombre || nombre.trim().length < 2) errs.push("El nombre debe tener al menos 2 caracteres.");
      if (!emailR || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailR)) errs.push("Email inválido.");
      if (!telefono || telefono.trim().length < 7) errs.push("Teléfono inválido (min 7 caracteres).");
      if (!passwordR || passwordR.length < 8) errs.push("La contraseña debe tener al menos 8 caracteres.");
      if (!/[A-Z]/.test(passwordR)) errs.push("La contraseña debe tener al menos una letra MAYÚSCULA.");
      if (!/[a-z]/.test(passwordR)) errs.push("La contraseña debe tener al menos una letra minúscula.");
      if (!/\d/.test(passwordR)) errs.push("La contraseña debe tener al menos un número.");
      if (!/[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]/.test(passwordR)) errs.push("La contraseña debe tener al menos un carácter especial.");
      setErrorsR(errs);
      return errs.length === 0;
    };

    const handleRegister = async (e) => {
      e.preventDefault();
      setErrorsR([]);
      if (!validateClient()) return;
      setLoadingR(true);

      try {
        // Intentamos registrar via expressApi (tu API local)
        // Enviamos role: "user" para dejar claro la intención (el backend debe forzar role en servidor)
        const payload = { nombre, email: emailR, telefono, password: passwordR, role: "user" };
        const res = await expressApi.post("/auth/register", payload);

        // Respuesta del servidor: token posible
        const token =
          res.data?.token ||
          res.data?.access_token ||
          res.data?.data?.token ||
          null;

        if (token) {
          localStorage.setItem("token", token);
          expressApi.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          const usuario = res.data?.data?.user || { nombre, email: emailR, role: "user" };
          usuario.role = "user"; // doble seguridad client-side
          localStorage.setItem("user", JSON.stringify(usuario));
          localStorage.setItem("user_source", "express");
          setLoadingR(false);
          onClose();
          window.location.href = "/dashboard";
          return;
        } else {
          setLoadingR(false);
          onClose();
          alert("Registro creado. Pide al administrador que active la cuenta o inicia sesión si recibiste credenciales.");
          return;
        }
      } catch (err) {
        console.error(err.response?.data || err.message);
        const srv = err.response?.data;

        // Si backend devuelve 403 -> registro protegido por admin
        if (err.response?.status === 403 || (srv && srv.message && /admin/i.test(srv.message))) {
          setErrorsR(["Registro restringido: solo administradores pueden crear cuentas."]);
          setCanShowRegister(false);
          setLoadingR(false);
          return;
        }

        // Normalizar errores de diferentes formatos
        const msgs = [];
        if (srv?.errors && Array.isArray(srv.errors)) {
          srv.errors.forEach(e => {
            // express-validator -> { param, msg }, o custom -> { field, message }
            const field = e.param || e.field || e.path || 'campo';
            const message = e.msg || e.message || JSON.stringify(e);
            msgs.push(`${field}: ${message}`);
          });
        } else if (srv?.message) {
          msgs.push(srv.message);
        } else {
          msgs.push(err.message || "Error desconocido");
        }

        setErrorsR(msgs);
        setLoadingR(false);
      }
    };

    return (
      <div style={{
        position: "fixed", inset: 0, background: "rgba(2,6,23,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
      }}>
        <div style={{ ...cardStyle, width: 560, position: "relative" }}>
          <button onClick={onClose} aria-label="Cerrar registro"
            style={{ position: "absolute", right: 12, top: 10, background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "#cbd8ea" }}>
            ✕
          </button>

          <div style={logoStyle}>
            <div style={{ ...pawStyle }}>🐾</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#e6eef8" }}>Registrar usuario</div>
              <div style={{ fontSize: 12, color: "#9fb0c8" }}>Crea una cuenta para el sistema veterinario (usuario normal no admin)</div>
            </div>
          </div>

          <form onSubmit={handleRegister}>
            <label style={{ display: "block", marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e6eef8" }}>Nombre</div>
              <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </label>

            <label style={{ display: "block", marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e6eef8" }}>Email</div>
              <input className="input" type="email" value={emailR} onChange={(e) => setEmailR(e.target.value)} required />
            </label>

            <label style={{ display: "block", marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e6eef8" }}>Teléfono</div>
              <input className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} required />
            </label>

            <label style={{ display: "block", marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e6eef8" }}>Contraseña</div>
              <input className="input" type="password" value={passwordR} onChange={(e) => setPasswordR(e.target.value)} required />
              <small style={{ color: "#9fb0c8" }}>
                Mín 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial.
              </small>
            </label>

            {errorsR.length > 0 && (
              <div style={{ marginTop: 10, color: "crimson" }}>
                <strong>Errores:</strong>
                <ul>
                  {errorsR.map((er, i) => <li key={i}>{er}</li>)}
                </ul>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button className="btn" type="submit" disabled={loadingR}>{loadingR ? "Registrando..." : "Registrar"}</button>
              <button type="button" className="btn" style={{ background: "transparent", color: "#60a5fa", border: "1px solid rgba(255,255,255,0.06)" }} onClick={onClose}>Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  // --- fin del RegisterModal ---

  return (
    <div style={backgroundStyle}>
      <div style={cardStyle}>
        <div style={logoStyle}>
          <div style={pawStyle}>🐾</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#e6eef8" }}>VetCare</div>
            <div style={{ color: "#9fb0c8", fontSize: 13 }}>Sistema de gestión veterinaria</div>
          </div>
        </div>

        <h2 style={{ marginTop: 12, marginBottom: 4, color: "#e6eef8" }}>Iniciar sesión</h2>
        <p style={{ marginTop: 0, marginBottom: 12, color: "#9fb0c8" }}>Selecciona el modo y accede con tus credenciales.</p>

        <form onSubmit={handleSubmit} aria-label="form-login">
          <label style={{ display: "block", marginTop: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e6eef8" }}>Modo</div>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="input">
              <option value="profesor">API Laravel (remota)</option>
              <option value="express">API Express (local)</option>
              <option value="local">Local (fallback)</option>
            </select>
          </label>

          <label style={{ display: "block", marginTop: 8 }}>
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

        <p style={{ fontSize: 13, color: "#9fb0c8", marginTop: 12 }}>
          -Prueba Local: <b>gmail@ejemplo.com</b> / <b>1234</b> — modo Local fallback(solo dashboard). <br />
          -API Laravel: <b>admin@ejemplo.com</b> / <b>admin123</b> - modo API Laravel<br />
          -API Express (local): se usan los usuarios creados en la base de datos (Elisa es la unica admin).
        </p>

        <div style={{ textAlign: "center", marginTop: 12 }}>
          {canShowRegister && (
            <button
              onClick={() => setShowRegister(true)}
              className="btn"
              style={{ width: "auto", padding: "8px 14px", background: "linear-gradient(90deg,#10b981,#059669)", marginTop: 6 }}
              aria-label="Abrir registro"
            >
              ¿No tienes cuenta? (Registrar usuario)
            </button>
          )}
          {!canShowRegister && (
            <div style={{ color: "#9fb0c8", fontSize: 13 }}>
              Registro deshabilitado: solo administradores pueden crear cuentas.
            </div>
          )}
        </div>
      </div>

      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}
    </div>
  );
}