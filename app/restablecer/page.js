// app/restablecer/page.js
// Destino del enlace que llega por correo: /restablecer?token=...
// Verifica el token antes de mostrar el formulario para no hacer escribir
// una contraseña que después va a ser rechazada.
"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import expressApi from "../../lib/expressApi";
import NuevaPasswordForm from "../../components/auth/NuevaPasswordForm";

function Tarjeta({ children }) {
  return (
    <div className="center-screen">
      <div className="card" style={{ width: "100%", maxWidth: 420, padding: 28 }}>
        {children}
      </div>
    </div>
  );
}

function Aviso({ tipo, titulo, children }) {
  const c = tipo === "error"
    ? { bg: "rgba(251,113,133,0.08)", bd: "rgba(251,113,133,0.28)", col: "#fb7185", icon: "⚠️" }
    : { bg: "rgba(52,211,153,0.08)",  bd: "rgba(52,211,153,0.3)",   col: "#34d399", icon: "✅" };
  return (
    <div style={{
      padding: "16px 18px", borderRadius: 10,
      background: c.bg, border: `1px solid ${c.bd}`,
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: c.col, marginBottom: 8 }}>
        {c.icon} {titulo}
      </div>
      <div style={{ fontSize: 13, color: "var(--subtext)", lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function Restablecer() {
  const router = useRouter();
  const params = useSearchParams();
  const token  = params.get("token") || "";

  // verificando | valido | invalido | listo
  const [estado, setEstado]   = useState("verificando");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  // Se comprueba el token SIN gastarlo: si ya venció, la persona se entera
  // antes de escribir nada.
  useEffect(() => {
    if (!token) { setEstado("invalido"); setMensaje("El enlace no incluye un token."); return; }
    expressApi.get(`/auth/password-reset/verificar?token=${encodeURIComponent(token)}`)
      .then(() => setEstado("valido"))
      .catch(err => {
        setEstado("invalido");
        setMensaje(err?.response?.data?.message || "El enlace no es válido o ya venció.");
      });
  }, [token]);

  const cambiar = async (password) => {
    setLoading(true);
    try {
      await expressApi.post("/auth/password-reset/confirmar", { token, password });
      setEstado("listo");
    } catch (err) {
      setEstado("invalido");
      setMensaje(err?.response?.data?.message || "No se pudo cambiar la contraseña.");
    } finally { setLoading(false); }
  };

  if (estado === "verificando") {
    return (
      <Tarjeta>
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--subtext)" }}>
          Verificando el enlace...
        </div>
      </Tarjeta>
    );
  }

  if (estado === "invalido") {
    return (
      <Tarjeta>
        <Aviso tipo="error" titulo="Enlace no válido">
          <p style={{ margin: "0 0 10px" }}>{mensaje}</p>
          <p style={{ margin: 0 }}>
            Los enlaces vencen a los 30 minutos y solo sirven una vez. Vuelve al inicio
            de sesión y pide uno nuevo.
          </p>
        </Aviso>
        <button className="btn" onClick={() => router.replace("/")}
          style={{ marginTop: 18, width: "100%", padding: "12px 0" }}>
          Volver al inicio de sesión
        </button>
      </Tarjeta>
    );
  }

  if (estado === "listo") {
    return (
      <Tarjeta>
        <Aviso tipo="ok" titulo="Contraseña cambiada">
          Ya puedes iniciar sesión con tu contraseña nueva.
        </Aviso>
        <button className="btn" onClick={() => router.replace("/")}
          style={{ marginTop: 18, width: "100%", padding: "12px 0" }}>
          Ir al inicio de sesión
        </button>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta>
      <div style={{ marginBottom: 20 }}>
        <div className="title" style={{ fontSize: 20 }}>🔑 Nueva contraseña</div>
        <div className="subtitle" style={{ marginTop: 4 }}>
          Escribe la contraseña con la que vas a entrar de ahora en adelante.
        </div>
      </div>
      <NuevaPasswordForm onSubmit={cambiar} loading={loading} />
    </Tarjeta>
  );
}

// useSearchParams exige Suspense para que Next pueda prerenderizar la ruta
export default function RestablecerPage() {
  return (
    <Suspense fallback={<Tarjeta><div style={{ padding: "24px 0", textAlign: "center", color: "var(--subtext)" }}>Cargando...</div></Tarjeta>}>
      <Restablecer />
    </Suspense>
  );
}
