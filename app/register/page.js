"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import expressApi from "../../lib/expressApi";

export default function RegisterPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverErrors, setServerErrors] = useState([]);
  const [clientErrors, setClientErrors] = useState([]);

  const validateClient = () => {
    const errs = [];
    if (!nombre || nombre.trim().length < 2) errs.push("El nombre debe tener al menos 2 caracteres.");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push("Email inválido.");
    if (!telefono || telefono.trim().length < 7) errs.push("Teléfono inválido (min 7 caracteres).");

    // contraseña: 8+, 1 mayúscula, 1 minúscula, 1 número, 1 especial
    const pass = password || "";
    if (pass.length < 8) errs.push("La contraseña debe tener al menos 8 caracteres.");
    if (!/[A-Z]/.test(pass)) errs.push("La contraseña debe tener al menos una letra MAYÚSCULA.");
    if (!/[a-z]/.test(pass)) errs.push("La contraseña debe tener al menos una letra minúscula.");
    if (!/\d/.test(pass)) errs.push("La contraseña debe tener al menos un número.");
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) errs.push("La contraseña debe tener al menos un carácter especial.");

    setClientErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerErrors([]);
    setClientErrors([]);

    if (!validateClient()) return;

    setLoading(true);
    try {
      const res = await expressApi.post("/auth/register", { nombre, email, telefono, password });
      // extraer token (robusto)
      const token =
        res.data?.token ||
        res.data?.access_token ||
        res.data?.data?.token ||
        null;

      if (!token) {
        setServerErrors(["No se recibió token del servidor."]);
        setLoading(false);
        return;
      }

      // guardar token y user, y redirigir al dashboard
      localStorage.setItem("token", token);
      expressApi.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      const usuario = res.data?.data?.user || {};
      localStorage.setItem("user", JSON.stringify(usuario));
      localStorage.setItem("user_source", "express");

      setLoading(false);
      router.replace("/dashboard");
    } catch (err) {
      // Si backend manda un array de errores (express-validator) lo mostramos
      const srv = err.response?.data;
      if (srv?.errors && Array.isArray(srv.errors)) {
        const msgs = srv.errors.map(e => (e.msg ? `${e.param || e.field}: ${e.msg}` : JSON.stringify(e)));
        setServerErrors(msgs);
      } else if (srv?.message) {
        setServerErrors([srv.message]);
      } else {
        setServerErrors([err.message || "Error desconocido"]);
      }
      setLoading(false);
    }
  };

  return (
    <div className="center-screen">
      <div className="card" style={{ maxWidth: 520 }}>
        <h2 className="title">Registro</h2>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Nombre</div>
            <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </label>

          <label style={{ display: "block", marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Email</div>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <label style={{ display: "block", marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Teléfono</div>
            <input className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} required />
          </label>

          <label style={{ display: "block", marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Contraseña</div>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <small style={{ color: "rgba(0,0,0,0.6)" }}>
              Mín 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial.
            </small>
          </label>

          {clientErrors.length > 0 && (
            <div style={{ marginTop: 10, color: "crimson" }}>
              <strong>Errores (antes de enviar):</strong>
              <ul>
                {clientErrors.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}

          {serverErrors.length > 0 && (
            <div style={{ marginTop: 10, color: "crimson" }}>
              <strong>Errores del servidor:</strong>
              <ul>
                {serverErrors.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          <button className="btn" type="submit" disabled={loading} style={{ marginTop: 12 }}>
            {loading ? "Registrando..." : "Registrar"}
          </button>
        </form>
      </div>
    </div>
  );
}