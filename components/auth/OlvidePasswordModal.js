// components/auth/OlvidePasswordModal.js
// Paso 1 del restablecimiento: la persona escribe su cédula y el sistema
// le manda un enlace al correo registrado. El paso 2 vive en /restablecer.
"use client";
import { useState } from "react";
import expressApi from "../../lib/expressApi";
import { ModalBase, ErrorList } from "../ui";

export default function OlvidePasswordModal({ onClose, cedulaInicial = "" }) {
  const [cedula, setCedula]   = useState(cedulaInicial);
  const [enviado, setEnviado] = useState(null);   // { email_enmascarado, minutos }
  const [errors, setErrors]   = useState([]);
  const [loading, setLoading] = useState(false);

  const submit = async (ev) => {
    ev.preventDefault();
    if (!/^\d{9}$/.test(cedula)) {
      setErrors(["La cédula debe tener exactamente 9 dígitos."]);
      return;
    }
    setErrors([]); setLoading(true);
    try {
      const res = await expressApi.post("/auth/password-reset/solicitar", { cedula });
      setEnviado(res.data?.data || {});
    } catch (err) {
      setErrors([err?.response?.data?.message || err.message || "No se pudo enviar el correo"]);
    } finally { setLoading(false); }
  };

  return (
    <ModalBase
      title="🔑 Restablecer contraseña"
      subtitle={enviado ? "Revisa tu correo" : "Te enviaremos un enlace al correo registrado"}
      onClose={onClose}
      maxWidth={440}
    >
      {enviado ? (
        <div>
          <div style={{
            padding: "16px 18px", borderRadius: 10, marginBottom: 16,
            background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.3)",
          }}>
            <div style={{ fontSize: 14, color: "#34d399", fontWeight: 700, marginBottom: 8 }}>
              ✅ Enviamos las instrucciones a
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, wordBreak: "break-all" }}>
              {enviado.email_enmascarado}
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--subtext)", lineHeight: 1.7 }}>
            <p style={{ margin: "0 0 8px" }}>
              Abre el correo y pulsa <strong>Cambiar mi contraseña</strong>. El enlace vence
              en {enviado.minutos || 30} minutos y solo funciona una vez.
            </p>
            <p style={{ margin: 0 }}>
              ¿No te llegó? Revisa la carpeta de spam. Si el correo que aparece arriba ya no
              es tuyo, contacta a la clínica para actualizarlo.
            </p>
          </div>
          <button className="btn" onClick={onClose} style={{ marginTop: 18, width: "100%" }}>
            Entendido
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--subtext)", lineHeight: 1.6 }}>
            Escribe tu cédula y te enviaremos un enlace al correo que tienes registrado
            en el sistema.
          </p>
          <label style={{ display: "block" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Cédula</div>
            <input
              className="input"
              value={cedula}
              onChange={e => setCedula(e.target.value.replace(/\D/g, "").slice(0, 9))}
              placeholder="123456789"
              inputMode="numeric"
              autoFocus
              required
            />
          </label>
          <ErrorList errors={errors} />
          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <button className="btn" type="submit" disabled={loading} style={{ flex: 1 }}>
              {loading ? "Enviando..." : "Enviar instrucciones"}
            </button>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      )}
    </ModalBase>
  );
}
