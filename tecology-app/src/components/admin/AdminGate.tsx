"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { COLOR } from "@/lib/theme";
import AdminApp from "./AdminApp";

/** Protege /admin. Con Supabase pide iniciar sesión; en modo local pasa directo. */
export default function AdminGate() {
  if (!isSupabaseConfigured || !supabase) {
    return <AdminApp />;
  }
  return <Gated client={supabase} />;
}

function Gated({ client }: { client: SupabaseClient }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let alive = true;
    client.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setAuthed(!!data.session);
      setReady(true);
    });
    const { data: sub } = client.auth.onAuthStateChange((_e, session) => setAuthed(!!session));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [client]);

  if (!ready) {
    return (
      <div style={{ minHeight: "100dvh", background: COLOR.panelBg, display: "flex", alignItems: "center", justifyContent: "center", color: COLOR.muted2, fontSize: 14 }}>
        Cargando…
      </div>
    );
  }
  if (!authed) return <Login client={client} />;
  return <AdminApp onSignOut={() => client.auth.signOut()} />;
}

function Login({ client }: { client: SupabaseClient }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setErr("Correo o contraseña incorrectos.");
  };

  const input: CSSProperties = {
    width: "100%", padding: "13px 14px", border: `1px solid ${COLOR.borderInput}`,
    borderRadius: 12, fontSize: 14.5, color: COLOR.ink, background: "#fff", outline: "none",
  };
  const label: CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: COLOR.muted, marginBottom: 6 };

  return (
    <div style={{ minHeight: "100dvh", background: "radial-gradient(1000px 600px at 50% -10%, #0d1830 0%, #06080f 60%, #04060b 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 22, padding: 28, boxShadow: "0 40px 100px -30px rgba(0,0,0,.6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: "#0a1f4a", display: "flex", alignItems: "center", justifyContent: "center", padding: 7 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/tecology-mark.png" alt="Tecology" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(1.6)" }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.01em", lineHeight: 1 }}>Tecology</div>
            <div style={{ fontSize: 12, color: COLOR.muted2, marginTop: 3 }}>Panel administrativo</div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Correo</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@tecology.com" autoComplete="username" style={input} required />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={label}>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" style={input} required />
        </div>

        {err && <div style={{ color: "#c0392b", fontSize: 13, marginBottom: 14 }}>{err}</div>}

        <button type="submit" disabled={busy} style={{ width: "100%", padding: 14, border: "none", borderRadius: 12, background: busy ? "#7ba7ff" : COLOR.blue, color: "#fff", fontSize: 15, fontWeight: 600, cursor: busy ? "wait" : "pointer", boxShadow: "0 12px 28px -12px rgba(10,102,255,.6)" }}>
          {busy ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
