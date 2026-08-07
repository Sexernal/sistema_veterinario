// components/auth/NuevaPasswordForm.js
// Paso 2 del restablecimiento: el formulario donde se escribe la contraseña
// nueva. Vive aparte de la página para poder reutilizarlo (perfil, etc).
"use client";
import { useState } from "react";
import { ErrorList } from "../ui";

export const PASSWORD_MIN = 8;

// Mismas reglas que valida el API. Se comprueban aquí para dar aviso
// inmediato, pero el servidor vuelve a validarlas: esto es comodidad,
// no seguridad.
export function validarPassword(password) {
  if (typeof password !== "string" || password.length < PASSWORD_MIN)
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`;
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
    return "La contraseña debe combinar letras y números";
  return null;
}

// Fuerza aproximada, solo como guía visual
function fuerza(p) {
  let n = 0;
  if (p.length >= 8)  n++;
  if (p.length >= 12) n++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) n++;
  if (/[0-9]/.test(p)) n++;
  if (/[^a-zA-Z0-9]/.test(p)) n++;
  if (n <= 2) return { label: "Débil",     color: "#fb7185", pct: 33  };
  if (n === 3) return { label: "Aceptable", color: "#f59e0b", pct: 66  };
  return { label: "Fuerte", color: "#34d399", pct: 100 };
}

export default function NuevaPasswordForm({ onSubmit, loading = false, textoBoton = "Cambiar contraseña" }) {
  const [password, setPassword] = useState("");
  const [repetir, setRepetir]   = useState("");
  const [ver, setVer]           = useState(false);
  const [errors, setErrors]     = useState([]);

  const f = password ? fuerza(password) : null;

  const submit = (ev) => {
    ev.preventDefault();
    const e = [];
    const invalida = validarPassword(password);
    if (invalida) e.push(invalida);
    if (password !== repetir) e.push("Las contraseñas no coinciden.");
    setErrors(e);
    if (e.length) return;
    onSubmit(password);
  };

  return (
    <form onSubmit={submit}>
      <label style={{ display: "block" }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Contraseña nueva</div>
        <div style={{ position: "relative" }}>
          <input
            className="input"
            type={ver ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            autoFocus
            required
          />
          <button
            type="button"
            onClick={() => setVer(v => !v)}
            style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: "#9fb0c8", fontSize: 15,
            }}
            tabIndex={-1}
          >
            {ver ? "🙈" : "👁️"}
          </button>
        </div>
      </label>

      {f && (
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div style={{ width: `${f.pct}%`, height: "100%", background: f.color, transition: "all .2s" }} />
          </div>
          <div style={{ fontSize: 11, color: f.color, marginTop: 4, fontWeight: 600 }}>{f.label}</div>
        </div>
      )}

      <label style={{ display: "block", marginTop: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Repetir contraseña</div>
        <input
          className="input"
          type={ver ? "text" : "password"}
          value={repetir}
          onChange={e => setRepetir(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />
      </label>

      <div style={{ marginTop: 10, fontSize: 12, color: "var(--subtext)", lineHeight: 1.6 }}>
        Mínimo {PASSWORD_MIN} caracteres, combinando letras y números.
      </div>

      <ErrorList errors={errors} />

      <button className="btn" type="submit" disabled={loading}
        style={{ marginTop: 18, width: "100%", padding: "12px 0", fontSize: 14 }}>
        {loading ? "Guardando..." : textoBoton}
      </button>
    </form>
  );
}
