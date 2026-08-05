// app/mascotas/ui.js
// Piezas compartidas por los modales de mascotas (fichas, vacunas, tratamientos).
"use client";

const SPECIES_ICONS = {
  perro: "🐕", gato: "🐈", ave: "🐦", pajaro: "🐦", conejo: "🐇",
  serpiente: "🐍", hamster: "🐹", tortuga: "🐢", pez: "🐟", caballo: "🐴",
};

export function getSpeciesIcon(especie) {
  if (!especie) return "🐾";
  const key = especie.toLowerCase();
  for (const [k, icon] of Object.entries(SPECIES_ICONS)) {
    if (key.includes(k)) return icon;
  }
  return "🐾";
}

export function ModalBase({ title, subtitle, onClose, children, maxWidth = 560 }) {
  return (
    <div className="modal-overlay">
      <div className="modal card" style={{
        maxWidth, width: "92vw", maxHeight: "88vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
        }}>
          <div>
            <div className="title" style={{ fontSize: 18 }}>{title}</div>
            {subtitle && <div className="subtitle" style={{ fontSize: 13 }}>{subtitle}</div>}
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

export function ErrorList({ errors }) {
  if (!errors?.length) return null;
  return (
    <div style={{
      marginTop: 12, padding: "10px 14px", borderRadius: 8,
      background: "rgba(251,113,133,0.08)", border: "1px solid rgba(251,113,133,0.2)",
      color: "#fb7185", fontSize: 13,
    }}>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {errors.map((e, i) => <li key={i}>{e}</li>)}
      </ul>
    </div>
  );
}

export function EmptyState({ icon, children }) {
  return (
    <div style={{
      padding: "32px 24px", textAlign: "center", borderRadius: 10,
      border: "1px dashed rgba(255,255,255,0.1)", color: "var(--subtext)",
    }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
      <div>{children}</div>
    </div>
  );
}

// Filtros en forma de chips (Todas / Tratamientos / Sueltas…)
export function FilterChips({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
      {options.map(o => {
        const activo = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 999,
              cursor: "pointer", transition: "all .15s",
              background: activo ? "rgba(96,165,250,0.16)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${activo ? "rgba(96,165,250,0.45)" : "rgba(255,255,255,0.1)"}`,
              color: activo ? "var(--accent)" : "var(--subtext)",
            }}
          >
            {o.label}{o.count != null && ` (${o.count})`}
          </button>
        );
      })}
    </div>
  );
}
