"use client";

// Límite de error a nivel de app: si una pantalla lanza un error, muestra el
// mensaje real (en vez de que el navegador colapse la página), para poder
// diagnosticar rápido. Debe ser un componente cliente.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#0b0f1a", color: "#e9eefc", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 560, width: "100%", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: 26 }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Algo falló al cargar esta pantalla</div>
        <p style={{ color: "#98a2bd", fontSize: 14, lineHeight: 1.5, margin: "0 0 16px" }}>
          Comparte este mensaje con soporte para resolverlo:
        </p>
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12.5, lineHeight: 1.5, background: "#05070d", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: 14, color: "#ffb4b4", margin: "0 0 18px", maxHeight: 260, overflow: "auto" }}>
          {error?.message || "Error desconocido"}
          {error?.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
        <button onClick={reset} style={{ padding: "12px 22px", border: "none", borderRadius: 12, background: "#0A66FF", color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}>
          Reintentar
        </button>
      </div>
    </div>
  );
}
