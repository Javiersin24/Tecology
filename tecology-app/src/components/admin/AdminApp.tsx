"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { store } from "@/lib/store";
import { useCatalogData, useLeads } from "@/lib/useStore";
import { DEFAULT_SERVICES, EMPTY_CATALOG } from "@/lib/seed";
import { COLOR } from "@/lib/theme";
import { supabase } from "@/lib/supabaseClient";
import type { CatalogData, Product, Spec, Tier, UseCase } from "@/lib/types";

/** Token de la sesión admin, para llamar a los endpoints protegidos (/api/admin/*). */
async function adminToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

type Tab = "productos" | "usos" | "leads" | "zoho";
type CatKey = "laptops" | "desktop" | "combos" | "monitores";

const CAT_META: { key: CatKey; label: string }[] = [
  { key: "laptops", label: "Laptops" },
  { key: "desktop", label: "Desktop" },
  { key: "combos", label: "Combos" },
  { key: "monitores", label: "Monitores" },
];
const TIERS: { full: Tier; abbr: string }[] = [
  { full: "Básico", abbr: "B" },
  { full: "Recomendado", abbr: "R" },
  { full: "Empresarial", abbr: "E" },
];
const TIER_ORDER: Record<string, number> = { "Básico": 0, "Recomendado": 1, "Empresarial": 2 };

interface Draft {
  name: string; model: string; price: string; tier: Tier; warranty: string;
  img: string; ideal: string; specs: Spec[]; featuresText: string;
  servicesText: string; includesText: string; uses: string[];
  zohoItemId: string; zohoItemName: string;
}
interface UseDraft { icon: string; name: string; desc: string }

const labelStyle: CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: COLOR.muted, marginBottom: 6 };
const inputStyle: CSSProperties = { width: "100%", padding: "11px 13px", border: `1px solid ${COLOR.borderInput}`, borderRadius: 11, fontSize: 13.5, color: COLOR.ink, background: "#fff", outline: "none" };
const inputMuted: CSSProperties = { width: "100%", padding: "11px 13px", border: "1px solid #e6e6ec", borderRadius: 11, fontSize: 13, color: "#3a3a3f", background: "#fafbfc", outline: "none" };
const areaStyle: CSSProperties = { ...inputStyle, resize: "vertical", lineHeight: 1.5 };
const bannerStyle: CSSProperties = { background: "#eef3ff", border: "1px solid #d6e4ff", borderRadius: 13, padding: "13px 16px", marginBottom: 18, display: "flex", gap: 10, alignItems: "flex-start" };
const bannerText: CSSProperties = { margin: 0, color: "#33507d", fontSize: 12.5, lineHeight: 1.5 };
const cardShadow = "0 8px 22px -18px rgba(0,0,0,.3)";

function blankDraft(cat: CatKey): Draft {
  const specs: Spec[] = cat === "combos"
    ? [{ k: "Equipo", v: "" }, { k: "Monitor", v: "" }, { k: "Periféricos", v: "" }, { k: "Extra", v: "" }]
    : [{ k: "Procesador", v: "" }, { k: "Memoria", v: "" }, { k: "Almacenamiento", v: "" }, { k: "Pantalla", v: "" }];
  return { name: "", model: "", price: "$", tier: "Básico", warranty: "Garantía 1 año", img: "", ideal: "", specs, featuresText: "", servicesText: DEFAULT_SERVICES.join("\n"), includesText: "", uses: [], zohoItemId: "", zohoItemName: "" };
}

function slug(name: string): string {
  return (name || "uso").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || ("uso-" + Date.now());
}

export default function AdminApp({ onSignOut }: { onSignOut?: () => void }) {
  const loaded = useCatalogData();
  const data = loaded ?? EMPTY_CATALOG;
  const leadsRaw = useLeads();

  const [tab, setTab] = useState<Tab>("productos");
  const [cat, setCat] = useState<CatKey>("laptops");
  const [editCat, setEditCat] = useState<CatKey | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [useId, setUseId] = useState<string | null>(null);
  const [useDraft, setUseDraft] = useState<UseDraft | null>(null);
  const [uploading, setUploading] = useState(false);

  const catLabelMap: Record<string, string> = { laptops: "Laptops", desktop: "Desktop", combos: "Combos", monitores: "Monitores" };

  // ---- mutaciones -------------------------------------------------------
  // Opera sobre una copia de los datos ya cargados y persiste el resultado.
  // Al guardar, el store notifica (realtime/local) y la UI se refresca sola.
  const mutate = (fn: (d: CatalogData) => void) => {
    if (!loaded) return; // nunca guardar sobre el catálogo vacío de respaldo
    const d: CatalogData = structuredClone(loaded);
    fn(d);
    void store.save(d).catch((e) => {
      console.error("Tecology: no se pudo guardar", e);
      alert("No se pudo guardar el cambio. Revisa tu conexión e inténtalo de nuevo.");
    });
  };

  const openEdit = (c: CatKey, p: Product | null) => {
    const d: Draft = p
      ? {
          name: p.name || "", model: p.model || "", price: p.price || "", tier: p.tier || "Básico",
          warranty: p.warranty || "", img: p.img || "", ideal: p.ideal || "",
          specs: (p.specs || []).map((s) => ({ k: s.k, v: s.v })),
          featuresText: (p.features || []).join("\n"),
          servicesText: (p.services && p.services.length ? p.services : DEFAULT_SERVICES).join("\n"),
          includesText: (p.includes || []).map((i) => (i.icon ? i.icon + " " : "") + i.label).join("\n"),
          uses: Array.isArray(p.uses) ? [...p.uses] : [],
          zohoItemId: p.zohoItemId || "", zohoItemName: p.zohoItemName || "",
        }
      : blankDraft(c);
    while (d.specs.length < 4) d.specs.push({ k: "", v: "" });
    setEditCat(c); setEditId(p ? p.id : null); setDraft(d);
  };

  const saveDraft = () => {
    if (!draft || !draft.name.trim() || !editCat) return;
    const features = draft.featuresText.split("\n").map((x) => x.trim()).filter(Boolean);
    const services = draft.servicesText.split("\n").map((x) => x.trim()).filter(Boolean);
    let includes: { icon: string; label: string }[] | null = null;
    if (editCat === "combos") {
      includes = draft.includesText.split("\n").map((x) => x.trim()).filter(Boolean).map((line) => {
        const m = line.match(/^(\p{Extended_Pictographic}\uFE0F?)\s*(.*)$/u);
        return m && m[2] ? { icon: m[1], label: m[2] } : { icon: "•", label: line };
      });
    }
    mutate((d) => {
      const block = d.categories[editCat];
      if (!block) return;
      const prod: Partial<Product> = {
        name: draft.name.trim(), model: draft.model, price: draft.price, tier: draft.tier,
        warranty: draft.warranty, img: draft.img, ideal: draft.ideal, features, services,
        specs: draft.specs.filter((s) => s.k && s.v),
        uses: Array.isArray(draft.uses) ? draft.uses : [],
        zohoItemId: draft.zohoItemId || undefined, zohoItemName: draft.zohoItemName || undefined,
      };
      if (includes && includes.length) prod.includes = includes;
      if (editId) {
        const i = block.plans.findIndex((p) => p.id === editId);
        if (i >= 0) block.plans[i] = { ...block.plans[i], ...prod };
      } else {
        block.plans.push({ ...(prod as Product), id: editCat.slice(0, 2) + "-" + Date.now(), active: true });
      }
    });
    setDraft(null); setEditId(null); setEditCat(null);
  };

  const openUse = (u: UseCase | null) => {
    setUseId(u ? u.id : null);
    setUseDraft(u ? { icon: u.icon || "", name: u.name || "", desc: u.desc || "" } : { icon: "🏢", name: "", desc: "" });
  };
  const saveUse = () => {
    if (!useDraft || !useDraft.name.trim()) return;
    mutate((d) => {
      if (!Array.isArray(d.useCases)) d.useCases = [];
      if (useId) {
        const i = d.useCases.findIndex((x) => x.id === useId);
        if (i >= 0) d.useCases[i] = { ...d.useCases[i], icon: useDraft.icon, name: useDraft.name.trim(), desc: useDraft.desc };
      } else {
        let id = slug(useDraft.name);
        while (d.useCases.some((x) => x.id === id)) id += "-1";
        d.useCases.push({ id, icon: useDraft.icon || "•", name: useDraft.name.trim(), desc: useDraft.desc });
      }
    });
    setUseDraft(null); setUseId(null);
  };
  const deleteUse = (id: string) => {
    mutate((d) => {
      d.useCases = (d.useCases || []).filter((u) => u.id !== id);
      Object.keys(d.categories || {}).forEach((k) => {
        (d.categories[k].plans || []).forEach((p) => { if (Array.isArray(p.uses)) p.uses = p.uses.filter((x) => x !== id); });
      });
    });
  };

  const exportCsv = async () => {
    const leads = await store.getLeads();
    const cols = ["createdAt", "nombre", "apellido", "empresa", "cargo", "correo", "codigo", "telefono", "colaboradores", "uso", "renovar", "categorias", "vistos", "favoritos", "cotizo", "segundos"];
    const esc = (v: unknown) => {
      if (v == null) v = "";
      if (Array.isArray(v)) v = v.join(" | ");
      return '"' + String(v).replace(/"/g, '""') + '"';
    };
    const rows = [cols.join(",")].concat(leads.map((l) => cols.map((c) => esc((l as unknown as Record<string, unknown>)[c])).join(",")));
    const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "tecology-leads.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onImgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      // El store comprime a 640px y, con Supabase, sube al bucket y devuelve la URL.
      const url = await store.uploadImage(f);
      setDraft((s) => (s ? { ...s, img: url } : s));
    } catch (err) {
      console.error("Tecology: no se pudo subir la imagen", err);
      alert("No se pudo subir la imagen. Inténtalo con otra o revisa tu conexión.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // ---- valores derivados -----------------------------------------------
  let totalActive = 0, totalAll = 0;
  Object.keys(data.categories).forEach((k) => {
    data.categories[k].plans.forEach((p) => { totalAll++; if (p.active !== false) totalActive++; });
  });
  const quoted = leadsRaw.filter((l) => l.cotizo).length;
  const stats = [
    { icon: "🟢", label: "Productos activos", value: totalActive, color: COLOR.ink },
    { icon: "📦", label: "Total en catálogo", value: totalAll, color: COLOR.ink },
    { icon: "👤", label: "Clientes potenciales", value: leadsRaw.length, color: COLOR.blue },
    { icon: "✅", label: "Cotizaciones", value: quoted, color: COLOR.green },
  ];

  const storeUses = Array.isArray(data.useCases) ? data.useCases : [];
  const countByUse: Record<string, number> = {};
  Object.keys(data.categories).forEach((k) => {
    data.categories[k].plans.forEach((p) => {
      (Array.isArray(p.uses) ? p.uses : []).forEach((uid) => { countByUse[uid] = (countByUse[uid] || 0) + 1; });
    });
  });

  const block = data.categories[cat] ?? { label: "", plans: [] };
  const products = [...block.plans].sort((a, b) => (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9));

  const palette = ["#0A66FF", "#12b76a", "#7c5cff", "#e8833a", "#d6455d", "#0e9aa7"];

  return (
    <div style={{ minHeight: "100dvh", background: COLOR.panelBg, color: COLOR.ink }}>
      {/* Top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid #e6e6ec" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "14px 26px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "#0a1f4a", display: "flex", alignItems: "center", justifyContent: "center", padding: 6 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/tecology-mark.png" alt="Tecology" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(1.6)" }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em", lineHeight: 1 }}>Tecology</div>
            <div style={{ fontSize: 11.5, color: COLOR.muted2, marginTop: 2 }}>Panel administrativo</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => { if (confirm("Restaurar los productos y tipos de uso de ejemplo. Los productos que hayas creado no se borran. ¿Continuar?")) void store.reset().catch(() => alert("No se pudo restaurar.")); }} style={{ padding: "9px 15px", borderRadius: 10, border: `1px solid ${COLOR.borderInput}`, background: "#fff", color: "#3a3a3f", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>↺ Restaurar demo</button>
            <Link href="/" style={{ padding: "9px 17px", borderRadius: 10, background: COLOR.ink, color: "#fff", fontSize: 12.5, fontWeight: 600, display: "inline-block" }}>Ver catálogo →</Link>
            {onSignOut && (
              <button onClick={onSignOut} style={{ padding: "9px 15px", borderRadius: 10, border: `1px solid ${COLOR.borderInput}`, background: "#fff", color: "#3a3a3f", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Cerrar sesión</button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "26px 26px 100px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 26 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #ececf1", borderRadius: 16, padding: "18px 20px", boxShadow: cardShadow }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLOR.muted2, fontSize: 12.5, fontWeight: 600 }}>{s.icon} {s.label}</div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.03em", marginTop: 8, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "inline-flex", background: "#e9eaef", borderRadius: 13, padding: 4, marginBottom: 22 }}>
          {([["productos", "Catálogo"], ["usos", "Tipos de uso"], ["leads", "Clientes potenciales"], ["zoho", "Cotizaciones (Zoho)"]] as [Tab, string][]).map(([key, label]) => {
            const on = tab === key;
            return (
              <button key={key} onClick={() => setTab(key)} style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: on ? "#fff" : "transparent", color: on ? COLOR.ink : COLOR.muted, fontSize: 13.5, fontWeight: 600, cursor: "pointer", boxShadow: on ? "0 2px 8px -2px rgba(0,0,0,.15)" : "none", transition: "all .2s" }}>{label}</button>
            );
          })}
        </div>

        {/* PRODUCTS */}
        {tab === "productos" && (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
              <div className="tec-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", flex: 1, minWidth: 0 }}>
                {CAT_META.map((c) => {
                  const on = cat === c.key;
                  const count = (data.categories[c.key]?.plans || []).length;
                  return (
                    <button key={c.key} onClick={() => setCat(c.key)} style={{ padding: "9px 15px", borderRadius: 999, border: `1px solid ${on ? COLOR.blue : "#e2e2e8"}`, background: on ? COLOR.blue : "#fff", color: on ? "#fff" : "#3a3a3f", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                      {c.label} <span style={{ opacity: 0.6, fontWeight: 600 }}>{count}</span>
                    </button>
                  );
                })}
              </div>
              <button onClick={() => openEdit(cat, null)} style={{ padding: "11px 20px", borderRadius: 12, border: "none", background: COLOR.blue, color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer", boxShadow: "0 10px 22px -10px rgba(10,102,255,.6)", whiteSpace: "nowrap" }}>+ Nuevo producto</button>
            </div>

            <div style={bannerStyle}>
              <span style={{ fontSize: 15 }}>💡</span>
              <p style={bannerText}>En el catálogo del evento se muestran las opciones <b>activas</b> ordenadas por nivel. El producto marcado como <b>Recomendado</b> aparece destacado en el centro. Cambie el nivel o desactive un producto aquí — sin tocar código.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {products.map((p) => {
                const inactive = p.active === false;
                const specSummary = (p.specs || []).map((s) => s.v).filter(Boolean).slice(0, 3).join(" · ");
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", background: "#fff", border: "1px solid #ececf1", borderRadius: 18, padding: "16px 18px", boxShadow: cardShadow, opacity: inactive ? 0.5 : 1, transition: "opacity .2s" }}>
                    <div style={{ width: 88, height: 66, flex: "0 0 88px", borderRadius: 12, overflow: "hidden", background: "repeating-linear-gradient(135deg,#f1f3f8,#f1f3f8 8px,#e9edf4 8px,#e9edf4 16px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {p.img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.img} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 9, color: "#9aa3b5", letterSpacing: ".06em" }}>sin foto</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: "-.01em" }}>{p.name}</div>
                      <div style={{ fontSize: 12.5, color: COLOR.muted2, marginTop: 3 }}>{p.model}</div>
                      <div style={{ fontSize: 12.5, color: "#5a606e", marginTop: 5 }}>{specSummary}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 9 }}>
                      <div style={{ fontSize: 19, fontWeight: 800, color: COLOR.green }}>{p.price}</div>
                      <div style={{ display: "flex", background: "#f0f1f5", borderRadius: 9, padding: 3 }}>
                        {TIERS.map((t) => {
                          const on = p.tier === t.full;
                          return (
                            <button
                              key={t.full}
                              title={t.full}
                              onClick={() => mutate((d) => { const q = d.categories[cat].plans.find((x) => x.id === p.id); if (q) q.tier = t.full; })}
                              style={{ width: 30, height: 26, borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: on ? (t.full === "Recomendado" ? COLOR.blue : "#fff") : "transparent", color: on ? (t.full === "Recomendado" ? "#fff" : COLOR.ink) : "#9aa3b5", boxShadow: on ? "0 2px 6px -2px rgba(0,0,0,.25)" : "none" }}
                            >
                              {t.abbr}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                      <button
                        onClick={() => mutate((d) => { const q = d.categories[cat].plans.find((x) => x.id === p.id); if (q) q.active = q.active === false; })}
                        title={inactive ? "Inactivo — no se muestra en el catálogo" : "Activo — visible en el catálogo"}
                        style={{ width: 46, height: 27, borderRadius: 999, border: "none", cursor: "pointer", padding: 0, position: "relative", background: inactive ? "#d2d5dd" : COLOR.green, transition: "background .2s" }}
                      >
                        <span style={{ position: "absolute", top: 3, left: inactive ? 3 : 22, width: 21, height: 21, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.3)", transition: "left .2s" }} />
                      </button>
                      <div style={{ display: "flex", gap: 7 }}>
                        <button onClick={() => openEdit(cat, p)} style={{ padding: "8px 15px", borderRadius: 999, border: `1px solid ${COLOR.borderInput}`, background: "#fff", color: COLOR.ink, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Editar</button>
                        <button onClick={() => mutate((d) => { const b = d.categories[cat]; b.plans = b.plans.filter((x) => x.id !== p.id); })} title="Eliminar" style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid #f1d5d5", background: "#fdf2f2", color: "#c0392b", fontSize: 14, cursor: "pointer" }}>✕</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* USE CASES */}
        {tab === "usos" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-.01em" }}>Tipos de uso</h2>
              <button onClick={() => openUse(null)} style={{ marginLeft: "auto", padding: "11px 20px", borderRadius: 12, border: "none", background: COLOR.blue, color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer", boxShadow: "0 10px 22px -10px rgba(10,102,255,.6)" }}>+ Nuevo tipo de uso</button>
            </div>
            <div style={bannerStyle}>
              <span style={{ fontSize: 15 }}>🎯</span>
              <p style={bannerText}>Estos son los escenarios que el visitante elige en el registro. Al crear o editar un producto, márcalo con los tipos de uso a los que aplica: el catálogo mostrará solo esos productos según lo que elija cada visitante.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
              {storeUses.map((u) => {
                const n = countByUse[u.id] || 0;
                return (
                  <div key={u.id} style={{ background: "#fff", border: "1px solid #ececf1", borderRadius: 16, padding: "16px 18px", boxShadow: cardShadow, display: "flex", gap: 13, alignItems: "flex-start" }}>
                    <div style={{ width: 44, height: 44, flex: "0 0 44px", borderRadius: 12, background: "#f4f6fb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{u.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em" }}>{u.name}</div>
                      <div style={{ fontSize: 12.5, color: COLOR.muted2, lineHeight: 1.4, marginTop: 2 }}>{u.desc}</div>
                      <div style={{ fontSize: 11.5, color: "#adb2bd", marginTop: 7 }}>{n} producto{n === 1 ? "" : "s"}</div>
                      <div style={{ display: "flex", gap: 7, marginTop: 11 }}>
                        <button onClick={() => openUse(u)} style={{ padding: "7px 14px", borderRadius: 999, border: `1px solid ${COLOR.borderInput}`, background: "#fff", color: COLOR.ink, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Editar</button>
                        <button onClick={() => deleteUse(u.id)} title="Eliminar" style={{ width: 31, height: 31, borderRadius: 999, border: "1px solid #f1d5d5", background: "#fdf2f2", color: "#c0392b", fontSize: 13, cursor: "pointer" }}>✕</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* LEADS */}
        {tab === "leads" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-.01em" }}>Registros del evento</h2>
              {leadsRaw.length > 0 && (
                <>
                  <button onClick={exportCsv} style={{ marginLeft: "auto", padding: "9px 15px", borderRadius: 10, border: `1px solid ${COLOR.borderInput}`, background: "#fff", color: "#3a3a3f", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>⬇ Exportar CSV</button>
                  <button onClick={() => { if (confirm("Se eliminarán todos los registros de clientes. Esta acción no se puede deshacer. ¿Continuar?")) void store.clearLeads().catch(() => alert("No se pudo vaciar.")); }} style={{ padding: "9px 15px", borderRadius: 10, border: "1px solid #f1d5d5", background: "#fdf2f2", color: "#c0392b", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Vaciar</button>
                </>
              )}
            </div>

            {leadsRaw.length === 0 && (
              <div style={{ background: "#fff", border: "1px dashed #d2d5dd", borderRadius: 18, padding: "52px 30px", textAlign: "center", animation: "tecFade .4s ease" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Aún no hay registros</div>
                <p style={{ margin: "0 auto", maxWidth: 380, color: COLOR.muted2, fontSize: 13.5, lineHeight: 1.5 }}>Cada visitante que complete el formulario del <Link href="/">catálogo</Link> aparecerá aquí con sus datos y su actividad de navegación.</p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[...leadsRaw].reverse().map((l, idx) => {
                const nom = ((l.nombre || "") + " " + (l.apellido || "")).trim() || "Sin nombre";
                const initials = (((l.nombre || "?")[0] || "?") + ((l.apellido || "")[0] || "")).toUpperCase();
                const tel = ((l.codigo || "") + " " + (l.telefono || "")).trim() || "—";
                const fecha = l.createdAt ? new Date(l.createdAt).toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" }) : "";
                return (
                  <div key={l.id} style={{ background: "#fff", border: "1px solid #ececf1", borderRadius: 16, padding: "18px 20px", boxShadow: cardShadow }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: palette[idx % palette.length], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, flex: "0 0 42px" }}>{initials}</div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.01em" }}>{nom}</div>
                        <div style={{ fontSize: 12.5, color: COLOR.muted2 }}>{l.cargo || "—"} · {l.empresa || "—"}</div>
                      </div>
                      <span style={l.cotizo
                        ? { padding: "6px 12px", borderRadius: 999, background: "#e9f9f0", color: "#0e9155", fontSize: 12, fontWeight: 700 }
                        : { padding: "6px 12px", borderRadius: 999, background: "#f0f1f5", color: "#9aa3b5", fontSize: 12, fontWeight: 600 }}>
                        {l.cotizo ? "✓ Cotización solicitada" : "Solo navegó"}
                      </span>
                      <span style={{ marginLeft: "auto", fontSize: 12, color: "#9aa3b5" }}>{fecha}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                      <Chip>✉️ {l.correo || "—"}</Chip>
                      <Chip>📞 {tel}</Chip>
                      <Chip>👥 {(l.colaboradores || "—")} colab.</Chip>
                      <span style={{ padding: "7px 12px", borderRadius: 9, background: "#eaf1ff", color: COLOR.blue, fontSize: 12.5, fontWeight: 600 }}>🎯 {l.uso || "—"}</span>
                      <Chip>🔄 {l.renovar || "—"}</Chip>
                    </div>
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f0f0f4", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, fontSize: 12.5, color: COLOR.muted2 }}>
                      <LeadMeta label="Categorías" value={(l.categorias || []).join(", ") || "—"} />
                      <LeadMeta label="Productos vistos" value={(l.vistos || []).join(", ") || "—"} />
                      <LeadMeta label="Favoritos" value={(l.favoritos || []).join(", ") || "—"} />
                      <LeadMeta label="Navegación" value={l.segundos ? l.segundos + " segundos" : "—"} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ZOHO SETTINGS */}
        {tab === "zoho" && <ZohoSettingsPanel />}
      </div>

      {/* PRODUCT MODAL */}
      {draft && editCat && (
        <ModalShell onClose={() => { setDraft(null); setEditId(null); setEditCat(null); }}>
          <div style={{ padding: "22px 26px", borderBottom: "1px solid #f0f0f4", display: "flex", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-.01em" }}>{editId ? "Editar producto" : "Nuevo producto"}</h3>
            <span style={{ marginLeft: 12, padding: "5px 11px", borderRadius: 999, background: "#f0f1f5", color: COLOR.muted, fontSize: 12, fontWeight: 600 }}>{catLabelMap[editCat]}</span>
            <button onClick={() => { setDraft(null); setEditId(null); setEditCat(null); }} style={closeBtn}>✕</button>
          </div>
          <div className="tec-scroll" style={{ padding: "22px 26px", overflowY: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div><label style={labelStyle}>Nombre</label><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="ThinkPad T14" style={inputStyle} /></div>
              <div><label style={labelStyle}>Modelo / línea</label><input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder="Gen 4 · vPro" style={inputStyle} /></div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Nivel en el catálogo</label>
              <div style={{ display: "flex", gap: 8 }}>
                {TIERS.map((t) => {
                  const on = draft.tier === t.full;
                  return <button key={t.full} onClick={() => setDraft({ ...draft, tier: t.full })} style={{ flex: 1, padding: "11px 8px", borderRadius: 11, border: `1px solid ${on ? COLOR.blue : COLOR.borderInput}`, background: on ? "#eaf1ff" : "#fff", color: on ? COLOR.blue : COLOR.muted, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{t.full}</button>;
                })}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div><label style={labelStyle}>Precio</label><input value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="$699" style={inputStyle} /></div>
              <div><label style={labelStyle}>Garantía</label><input value={draft.warranty} onChange={(e) => setDraft({ ...draft, warranty: e.target.value })} placeholder="Garantía 3 años" style={inputStyle} /></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Recomendado para <span style={{ color: "#adb2bd", fontWeight: 400 }}>— tipos de uso donde aparece este producto</span></label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {storeUses.map((u) => {
                  const on = draft.uses.includes(u.id);
                  return (
                    <button key={u.id} onClick={() => setDraft({ ...draft, uses: on ? draft.uses.filter((x) => x !== u.id) : [...draft.uses, u.id] })} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 999, border: `1px solid ${on ? COLOR.blue : COLOR.borderInput}`, background: on ? "#eaf1ff" : "#fff", color: on ? COLOR.blue : "#3a3a3f", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                      <span>{u.icon}</span>{u.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <label style={labelStyle}>Especificaciones</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {draft.specs.map((s, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 8 }}>
                  <input value={s.k} onChange={(e) => setDraft({ ...draft, specs: draft.specs.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)) })} placeholder="Procesador" style={inputMuted} />
                  <input value={s.v} onChange={(e) => setDraft({ ...draft, specs: draft.specs.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)) })} placeholder="Intel Core i7" style={inputStyle} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Ideal para</label>
              <textarea value={draft.ideal} onChange={(e) => setDraft({ ...draft, ideal: e.target.value })} rows={2} placeholder="Profesionales que necesitan…" style={areaStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Características destacadas <span style={{ color: "#adb2bd", fontWeight: 400 }}>— una por línea</span></label>
              <textarea value={draft.featuresText} onChange={(e) => setDraft({ ...draft, featuresText: e.target.value })} rows={3} placeholder={"Seguridad Intel vPro\nCarga rápida"} style={areaStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Servicios incluidos <span style={{ color: "#adb2bd", fontWeight: 400 }}>— uno por línea</span></label>
              <textarea value={draft.servicesText} onChange={(e) => setDraft({ ...draft, servicesText: e.target.value })} rows={3} placeholder={"Garantía on-site\nConfiguración lista"} style={areaStyle} />
            </div>
            {editCat === "combos" && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>El combo incluye <span style={{ color: "#adb2bd", fontWeight: 400 }}>— una línea por artículo, emoji opcional</span></label>
                <textarea value={draft.includesText} onChange={(e) => setDraft({ ...draft, includesText: e.target.value })} rows={4} placeholder={'💻 Laptop ThinkPad\n🖥 Monitor 24"'} style={areaStyle} />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Vincular con artículo de Zoho <span style={{ color: "#adb2bd", fontWeight: 400 }}>— para que &ldquo;Solicitar cotización&rdquo; genere una cotización real</span></label>
              <ZohoLinkPicker
                value={draft.zohoItemId ? { id: draft.zohoItemId, name: draft.zohoItemName } : null}
                onChange={(item) => setDraft({ ...draft, zohoItemId: item?.id || "", zohoItemName: item?.name || "" })}
              />
            </div>
            <label style={labelStyle}>Imagen del producto</label>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ width: 100, height: 72, borderRadius: 12, overflow: "hidden", background: "repeating-linear-gradient(135deg,#f1f3f8,#f1f3f8 8px,#e9edf4 8px,#e9edf4 16px)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 100px" }}>
                {draft.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.img} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 9, color: "#9aa3b5" }}>sin foto</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ padding: "10px 14px", borderRadius: 11, border: "1px dashed #c7ccd6", background: "#fafbfc", color: COLOR.blue, fontSize: 12.5, fontWeight: 600, cursor: uploading ? "wait" : "pointer", textAlign: "center", opacity: uploading ? 0.6 : 1 }}>
                  {uploading ? "Subiendo…" : "Subir imagen"}
                  <input type="file" accept="image/*" disabled={uploading} onChange={onImgFile} style={{ display: "none" }} />
                </label>
                <input value={draft.img} onChange={(e) => setDraft({ ...draft, img: e.target.value })} placeholder="…o pegue una URL" style={inputMuted} />
              </div>
            </div>
          </div>
          <div style={{ padding: "18px 26px", borderTop: "1px solid #f0f0f4", display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => { setDraft(null); setEditId(null); setEditCat(null); }} style={cancelBtn}>Cancelar</button>
            <button onClick={saveDraft} style={saveBtn}>Guardar producto</button>
          </div>
        </ModalShell>
      )}

      {/* USE MODAL */}
      {useDraft && (
        <ModalShell maxWidth={440} onClose={() => { setUseDraft(null); setUseId(null); }}>
          <div style={{ padding: "22px 26px", borderBottom: "1px solid #f0f0f4", display: "flex", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-.01em" }}>{useId ? "Editar tipo de uso" : "Nuevo tipo de uso"}</h3>
            <button onClick={() => { setUseDraft(null); setUseId(null); }} style={closeBtn}>✕</button>
          </div>
          <div style={{ padding: "22px 26px" }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: "0 0 74px" }}>
                <label style={labelStyle}>Icono</label>
                <input value={useDraft.icon} onChange={(e) => setUseDraft({ ...useDraft, icon: e.target.value })} placeholder="🏢" style={{ ...inputStyle, textAlign: "center", fontSize: 20 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Nombre</label>
                <input value={useDraft.name} onChange={(e) => setUseDraft({ ...useDraft, name: e.target.value })} placeholder="Oficina administrativa" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Descripción corta</label>
              <input value={useDraft.desc} onChange={(e) => setUseDraft({ ...useDraft, desc: e.target.value })} placeholder="Office, navegación y multitarea." style={inputStyle} />
            </div>
          </div>
          <div style={{ padding: "18px 26px", borderTop: "1px solid #f0f0f4", display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => { setUseDraft(null); setUseId(null); }} style={cancelBtn}>Cancelar</button>
            <button onClick={saveUse} style={saveBtn}>Guardar</button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// ---- vínculo con artículo de Zoho ------------------------------------------
interface ZohoItem { id: string; name: string; rate?: number; sku?: string }

function ZohoLinkPicker({ value, onChange }: { value: ZohoItem | null; onChange: (item: ZohoItem | null) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ZohoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true); setErr(null);
      const token = await adminToken();
      if (!token) { setErr("Sesión no disponible."); setLoading(false); return; }
      try {
        const res = await fetch(`/api/admin/zoho-items?search=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(body.error || "Error buscando en Zoho.");
        setResults(body.items || []);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "No se pudo conectar con Zoho.");
      } finally {
        if (alive) setLoading(false);
      }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [query, open]);

  if (value && !open) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 13px", border: "1px solid #d6e4ff", background: "#eef3ff", borderRadius: 11, fontSize: 13 }}>
        <span style={{ color: COLOR.blue, fontWeight: 600 }}>✓ {value.name}</span>
        <button type="button" onClick={() => setOpen(true)} style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: 8, border: "1px solid #dcdce2", background: "#fff", color: "#3a3a3f", fontSize: 12, cursor: "pointer" }}>Cambiar</button>
        <button type="button" onClick={() => onChange(null)} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #f1d5d5", background: "#fdf2f2", color: "#c0392b", fontSize: 12, cursor: "pointer" }}>Quitar</button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar artículo en Zoho por nombre…"
        style={inputStyle}
      />
      {open && (
        <div style={{ marginTop: 6, border: "1px solid #e6e6ec", borderRadius: 11, background: "#fff", maxHeight: 220, overflowY: "auto", boxShadow: "0 12px 28px -14px rgba(0,0,0,.25)" }}>
          {loading && <div style={{ padding: 12, fontSize: 12.5, color: COLOR.muted2 }}>Buscando…</div>}
          {!loading && err && <div style={{ padding: 12, fontSize: 12.5, color: "#c0392b" }}>{err}</div>}
          {!loading && !err && results.length === 0 && <div style={{ padding: 12, fontSize: 12.5, color: COLOR.muted2 }}>Sin resultados. Escribe para buscar.</div>}
          {!loading && results.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => { onChange(it); setOpen(false); setQuery(""); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 13px", border: "none", borderTop: "1px solid #f0f0f4", background: "#fff", cursor: "pointer", fontSize: 13 }}
            >
              <div style={{ fontWeight: 600, color: COLOR.ink }}>{it.name}</div>
              <div style={{ fontSize: 11.5, color: COLOR.muted2 }}>{it.sku ? it.sku + " · " : ""}{it.rate != null ? `$${it.rate}` : ""}</div>
            </button>
          ))}
          <button type="button" onClick={() => setOpen(false)} style={{ display: "block", width: "100%", textAlign: "center", padding: "8px", border: "none", borderTop: "1px solid #f0f0f4", background: "#fafbfc", color: COLOR.muted, cursor: "pointer", fontSize: 12 }}>Cerrar</button>
        </div>
      )}
    </div>
  );
}

// ---- configuración de Zoho (ayudante de conexión OAuth) --------------------
function ZohoSettingsPanel() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [grantToken, setGrantToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const connect = async () => {
    setErr(null); setRefreshToken(null); setBusy(true);
    try {
      const token = await adminToken();
      if (!token) throw new Error("Sesión no disponible. Vuelve a iniciar sesión.");
      const res = await fetch("/api/admin/zoho-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ clientId: clientId.trim(), clientSecret: clientSecret.trim(), grantToken: grantToken.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "No se pudo conectar.");
      setRefreshToken(body.refreshToken);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo conectar con Zoho.");
    } finally {
      setBusy(false);
    }
  };

  const copyToken = () => {
    if (!refreshToken) return;
    navigator.clipboard?.writeText(refreshToken).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const testConnection = async () => {
    setTesting(true); setTestResult(null);
    try {
      const token = await adminToken();
      if (!token) throw new Error("Sesión no disponible. Vuelve a iniciar sesión.");
      const res = await fetch("/api/admin/zoho-test", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      setTestResult({ ok: !!body.ok, message: body.message || body.error || "Sin detalle." });
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : "No se pudo probar la conexión." });
    } finally {
      setTesting(false);
    }
  };

  const [creatingSp, setCreatingSp] = useState(false);
  const [spResult, setSpResult] = useState<{ ok: boolean; message: string } | null>(null);
  const createSalesperson = async () => {
    setCreatingSp(true); setSpResult(null);
    try {
      const token = await adminToken();
      if (!token) throw new Error("Sesión no disponible. Vuelve a iniciar sesión.");
      const res = await fetch("/api/admin/zoho-salesperson", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: "Tecology" }),
      });
      const body = await res.json();
      setSpResult({ ok: !!body.ok, message: body.message || body.error || "Sin detalle." });
    } catch (e) {
      setSpResult({ ok: false, message: e instanceof Error ? e.message : "No se pudo crear el vendedor." });
    } finally {
      setCreatingSp(false);
    }
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 700, letterSpacing: "-.01em" }}>Cotizaciones reales en Zoho Books</h2>
      <p style={{ margin: "0 0 18px", color: COLOR.muted2, fontSize: 13.5, lineHeight: 1.5, maxWidth: 640 }}>
        Cuando esto está conectado, cada visitante que toque <b>“Solicitar cotización”</b> genera una cotización real en tu Zoho Books y descarga <b>ese mismo PDF</b>. Este panel te ayuda a obtener el <b>refresh token</b> que necesitas — el resto de la conexión (las variables en Vercel) las agregas tú una sola vez.
      </p>

      {/* Diagnóstico: prueba la conexión completa y muestra el error real */}
      <div style={{ border: "1px solid #ececf1", borderRadius: 14, padding: "16px 18px", marginBottom: 22, background: "#fff", maxWidth: 640 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>Estado de la conexión</div>
            <div style={{ fontSize: 12.5, color: COLOR.muted2, marginTop: 2 }}>Crea y borra una cotización de prueba para verificar que todo funciona.</div>
          </div>
          <button onClick={testConnection} disabled={testing} style={{ marginLeft: "auto", padding: "11px 18px", borderRadius: 11, border: "none", background: testing ? "#7ba7ff" : COLOR.ink, color: "#fff", fontSize: 13, fontWeight: 600, cursor: testing ? "wait" : "pointer" }}>
            {testing ? "Probando…" : "Probar conexión"}
          </button>
        </div>
        {testResult && (
          <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 11, fontSize: 13, lineHeight: 1.5, background: testResult.ok ? "#eef9f1" : "#fdf2f2", border: `1px solid ${testResult.ok ? "#b9e6c6" : "#f1d5d5"}`, color: testResult.ok ? "#0e9155" : "#c0392b" }}>
            {testResult.ok ? "✓ " : "✕ "}{testResult.message}
          </div>
        )}
      </div>

      {/* Vendedor: algunas cuentas de Zoho lo exigen en cada cotización */}
      <div style={{ border: "1px solid #ececf1", borderRadius: 14, padding: "16px 18px", marginBottom: 22, background: "#fff", maxWidth: 640 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>Vendedor</div>
            <div style={{ fontSize: 12.5, color: COLOR.muted2, marginTop: 2, lineHeight: 1.5 }}>Si tu Zoho exige un vendedor en las cotizaciones y la cuenta no tiene ninguno, créalo aquí con un clic (se llamará “Tecology”). Si ya tienes uno, no se crea otro.</div>
          </div>
          <button onClick={createSalesperson} disabled={creatingSp} style={{ padding: "11px 18px", borderRadius: 11, border: `1px solid ${COLOR.borderInput}`, background: "#fff", color: COLOR.ink, fontSize: 13, fontWeight: 600, cursor: creatingSp ? "wait" : "pointer" }}>
            {creatingSp ? "Creando…" : "Crear vendedor"}
          </button>
        </div>
        {spResult && (
          <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 11, fontSize: 13, lineHeight: 1.5, background: spResult.ok ? "#eef9f1" : "#fdf2f2", border: `1px solid ${spResult.ok ? "#b9e6c6" : "#f1d5d5"}`, color: spResult.ok ? "#0e9155" : "#c0392b" }}>
            {spResult.ok ? "✓ " : "✕ "}{spResult.message}
          </div>
        )}
      </div>

      <div style={bannerStyle}>
        <span style={{ fontSize: 15 }}>1️⃣</span>
        <p style={bannerText}>
          Ve a <b>api-console.zoho.com</b> → <b>Add Client</b> → <b>Self Client</b>. Copia el <b>Client ID</b> y <b>Client Secret</b> que te da.
        </p>
      </div>
      <div style={bannerStyle}>
        <span style={{ fontSize: 15 }}>2️⃣</span>
        <p style={bannerText}>
          En la pestaña <b>Generate Code</b> del mismo Self Client, pon el scope <code>ZohoBooks.fullaccess.all</code>, duración 10 minutos, y genera un <b>Grant Token</b>. Úsalo aquí abajo <b>rápido</b> — caduca en pocos minutos y solo sirve una vez.
        </p>
      </div>

      <div style={{ display: "grid", gap: 12, maxWidth: 480, marginTop: 4, marginBottom: 6 }}>
        <div><label style={labelStyle}>Client ID</label><input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="1000.XXXXXXXXXXXXXXXX" style={inputStyle} /></div>
        <div><label style={labelStyle}>Client Secret</label><input value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="••••••••••••••••" style={inputStyle} /></div>
        <div><label style={labelStyle}>Grant Token</label><input value={grantToken} onChange={(e) => setGrantToken(e.target.value)} placeholder="1000.xxxx...xxxx" style={inputStyle} /></div>
      </div>

      <button
        onClick={connect}
        disabled={busy || !clientId || !clientSecret || !grantToken}
        style={{ padding: "12px 22px", border: "none", borderRadius: 12, background: busy ? "#7ba7ff" : COLOR.blue, color: "#fff", fontSize: 14, fontWeight: 600, cursor: busy ? "wait" : "pointer", opacity: !clientId || !clientSecret || !grantToken ? 0.5 : 1 }}
      >
        {busy ? "Conectando…" : "Conectar con Zoho"}
      </button>

      {err && <div style={{ marginTop: 14, color: "#c0392b", fontSize: 13, maxWidth: 480 }}>{err}</div>}

      {refreshToken && (
        <div style={{ marginTop: 20, background: "#eef9f1", border: "1px solid #b9e6c6", borderRadius: 13, padding: "16px 18px", maxWidth: 640 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0e9155", marginBottom: 8 }}>✓ Conectado — copia este refresh token</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code style={{ flex: 1, padding: "10px 12px", background: "#fff", border: "1px solid #d6e4ff", borderRadius: 9, fontSize: 12, wordBreak: "break-all" }}>{refreshToken}</code>
            <button onClick={copyToken} style={{ padding: "10px 14px", borderRadius: 9, border: "none", background: COLOR.blue, color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{copied ? "¡Copiado!" : "Copiar"}</button>
          </div>
          <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "#33507d", lineHeight: 1.6 }}>
            En Vercel → tu proyecto → <b>Settings → Environment Variables</b>, agrega:
          </p>
          <pre style={{ margin: "8px 0 0", padding: 12, background: "#fff", border: "1px solid #d6e4ff", borderRadius: 9, fontSize: 11.5, lineHeight: 1.7, overflowX: "auto" }}>
{`ZOHO_CLIENT_ID=${clientId}
ZOHO_CLIENT_SECRET=${clientSecret}
ZOHO_REFRESH_TOKEN=${refreshToken}
ZOHO_ORGANIZATION_ID=890449919
ZOHO_TAX_ID=6580479000000259031`}
          </pre>
          <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "#33507d" }}>Luego <b>Redeploy</b> el último despliegue para que tomen efecto.</p>
        </div>
      )}

      <div style={{ marginTop: 26, paddingTop: 20, borderTop: "1px solid #ececf1", maxWidth: 640 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Antes de activarlo</div>
        <p style={{ margin: 0, fontSize: 12.5, color: COLOR.muted2, lineHeight: 1.6 }}>
          Vincula cada producto con su artículo real de Zoho desde <b>Catálogo → Editar producto → “Vincular con artículo de Zoho”</b>. Los productos sin vincular igual aparecen en la cotización (con su nombre y precio del catálogo), pero vincularlos mantiene tu inventario y reportes en Zoho más precisos.
        </p>
      </div>
    </div>
  );
}

// ---- pequeños helpers de UI ------------------------------------------------
function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ padding: "7px 12px", borderRadius: 9, background: "#f5f6f8", color: "#3a3a3f", fontSize: 12.5 }}>{children}</span>;
}
function LeadMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "#adb2bd", marginBottom: 2 }}>{label}</span>
      <span style={{ color: "#3a3a3f" }}>{value}</span>
    </div>
  );
}
function ModalShell({ children, onClose, maxWidth = 600 }: { children: React.ReactNode; onClose: () => void; maxWidth?: number }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(8,12,22,.5)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "tecFade .2s ease" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 22, maxWidth, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 40px 100px -30px rgba(0,0,0,.55)", animation: "tecPop .28s cubic-bezier(.2,.8,.2,1)" }}>
        {children}
      </div>
    </div>
  );
}

const closeBtn: CSSProperties = { marginLeft: "auto", width: 34, height: 34, borderRadius: "50%", border: "none", background: "#f0f1f5", color: "#3a3a3f", fontSize: 16, cursor: "pointer" };
const cancelBtn: CSSProperties = { padding: "12px 20px", borderRadius: 12, border: `1px solid ${COLOR.borderInput}`, background: "#fff", color: "#3a3a3f", fontSize: 14, fontWeight: 600, cursor: "pointer" };
const saveBtn: CSSProperties = { padding: "12px 26px", borderRadius: 12, border: "none", background: COLOR.blue, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 10px 22px -10px rgba(10,102,255,.6)" };
