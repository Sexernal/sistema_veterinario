// app/mascotas/FichaRow.js
// Una ficha en la lista. Se usa suelta (tarjeta de primer nivel) y también
// dentro de la tarjeta de un tratamiento, donde va numerada.
"use client";
import { tipoDisplay, numeroCirculo } from "./fichasUtils";

// ─── Una ficha dentro de la lista ─────────────────────────────────────────────
function FichaRow({ ficha, indice, isAdmin, onVer, onEditar, onEliminar, onDesagrupar, suelta = false }) {
  return (
    <div style={{
      display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8,
      // Las sueltas son tarjetas de primer nivel (van a la par de los
      // tratamientos); las agrupadas viven dentro de una y van más tenues.
      padding: suelta ? "12px 14px" : "10px 12px",
      borderRadius: suelta ? 10 : 8,
      background: suelta ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.025)",
      border: `1px solid rgba(255,255,255,${suelta ? "0.08" : "0.06"})`,
    }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          {indice != null && (
            <span style={{ fontSize:15, color:"#a78bfa", fontWeight:700 }}>{numeroCirculo(indice)}</span>
          )}
          <span style={{
            fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:99,
            background:"rgba(96,165,250,0.12)", color:"var(--accent)",
          }}>{tipoDisplay(ficha)}</span>
          <span className="small-muted">{ficha.fecha_display || ficha.fecha}</span>
          {ficha.peso        && <span className="small-muted">⚖️ {ficha.peso} kg</span>}
          {ficha.temperatura && <span className="small-muted">🌡️ {ficha.temperatura} °C</span>}
          {ficha.creado_por_nombre && <span className="small-muted">Dr. {ficha.creado_por_nombre}</span>}
        </div>
        {ficha.nota && (
          <div style={{ marginTop:6, fontSize:13, lineHeight:1.5, color:"var(--subtext)" }}>
            {ficha.nota.length > 120 ? ficha.nota.slice(0, 120) + "…" : ficha.nota}
          </div>
        )}
        {ficha.filepath && (
          <a href={ficha.filepath} target="_blank" rel="noopener noreferrer"
            style={{ display:"inline-block", marginTop:6, fontSize:12, color:"var(--accent)" }}>
            📎 Archivo adjunto
          </a>
        )}
      </div>
      <div style={{ display:"flex", gap:6, flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
        <button className="btn"
          style={{ padding:"4px 10px", fontSize:12,
            background:"rgba(96,165,250,0.1)", border:"1px solid rgba(96,165,250,0.3)", color:"var(--accent)" }}
          onClick={() => onVer(ficha)}>
          Ver
        </button>
        {isAdmin && (
          <>
            <button className="btn" style={{ padding:"4px 10px", fontSize:12 }}
              onClick={() => onEditar(ficha)}>
              Editar
            </button>
            {onDesagrupar && (
              <button className="btn"
                style={{ padding:"4px 10px", fontSize:12,
                  background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.28)", color:"#a78bfa" }}
                title="Sacar esta consulta del tratamiento (no la elimina)"
                onClick={() => onDesagrupar(ficha)}>
                Desagrupar
              </button>
            )}
            <button className="btn-danger" style={{ padding:"4px 10px", fontSize:12 }}
              onClick={() => onEliminar(ficha.id)}>
              Eliminar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default FichaRow;
