"use client";

import { useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { store } from "@/lib/store";
import { useCatalogData } from "@/lib/useStore";
import { CATEGORY_META, COUNTRY_CODES, COLOR } from "@/lib/theme";
import { CATEGORY_ORDER } from "@/lib/seed";
import type { CategoryKey, Product, UseCase } from "@/lib/types";

type Screen = "welcome" | "register" | "categories" | "catalog" | "detail" | "final";

interface FormState {
  nombre: string;
  apellido: string;
  empresa: string;
  cargo: string;
  colaboradores: string;
  correo: string;
  telefono: string;
  codigo: string;
}

const EMPTY_FORM: FormState = {
  nombre: "", apellido: "", empresa: "", cargo: "", colaboradores: "",
  correo: "", telefono: "", codigo: "+506",
};

const labelStyle: CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: COLOR.muted, marginBottom: 6,
};
const inputStyle: CSSProperties = {
  width: "100%", padding: "13px 14px", border: `1px solid ${COLOR.borderInput}`,
  borderRadius: 12, fontSize: 14.5, color: COLOR.ink, background: "#fff", outline: "none",
};
const sectionTitle: CSSProperties = {
  fontSize: 13, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase",
  color: COLOR.ink, marginBottom: 12,
};

export default function CatalogApp() {
  const data = useCatalogData();

  const [screen, setScreen] = useState<Screen>("welcome");
  const [, setHistory] = useState<Screen[]>([]);
  const [renew, setRenew] = useState<string | null>(null);
  const [use, setUse] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [favs, setFavs] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [visited, setVisited] = useState<string[]>([]);
  const [viewed, setViewed] = useState<string[]>([]);
  const [navStart, setNavStart] = useState<number | null>(null);

  const uses: UseCase[] = data?.useCases ?? [];
  const selUse = uses.find((u) => u.id === use) ?? null;
  const onDark = screen === "catalog"; // dirección A: el catálogo es oscuro

  // ---- navegación -------------------------------------------------------
  const go = (s: Screen) => {
    setHistory((h) => [...h, screen]);
    setScreen(s);
  };
  const back = () => {
    setHistory((h) => {
      const copy = [...h];
      const prev = copy.pop();
      if (prev) setScreen(prev);
      return copy;
    });
  };
  const reset = () => {
    setScreen("welcome"); setHistory([]); setProductId(null); setRenew(null);
    setUse(null); setCategory(null); setFavs([]); setForm(EMPTY_FORM);
    setLeadId(null); setVisited([]); setViewed([]); setNavStart(null);
  };

  // ---- leads ------------------------------------------------------------
  const syncLead = (patch: Record<string, unknown>) => {
    if (leadId) store.updateLead(leadId, patch);
  };
  const saveLead = (u: UseCase) => {
    const base = { ...form, renovar: renew, uso: u.name };
    if (leadId) {
      store.updateLead(leadId, base);
      return;
    }
    const id = store.addLead({ ...base, categorias: [], vistos: [], favoritos: [], cotizo: false });
    setLeadId(id);
  };
  const requestQuote = () => {
    if (leadId) {
      store.updateLead(leadId, {
        cotizo: true,
        segundos: navStart ? Math.round((Date.now() - navStart) / 1000) : null,
      });
    }
    reset();
  };

  const toggleFav = (id: string) => {
    setFavs((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (data) {
        const names: string[] = [];
        next.forEach((fid) => {
          Object.values(data.categories).forEach((c) => {
            const p = c.plans.find((x) => x.id === fid);
            if (p) names.push(p.name);
          });
        });
        syncLead({ favoritos: names });
      }
      return next;
    });
  };

  const selectCategory = (k: CategoryKey, fromCategories: boolean) => {
    const name = CATEGORY_META[k].name;
    const nextVisited = visited.includes(name) ? visited : [...visited, name];
    setVisited(nextVisited);
    setCategory(k);
    if (fromCategories) {
      setHistory((h) => [...h, "categories"]);
      setScreen("catalog");
    }
    syncLead({ categorias: nextVisited });
  };

  const openProduct = (p: Product) => {
    const nextViewed = viewed.includes(p.name) ? viewed : [...viewed, p.name];
    setViewed(nextViewed);
    setHistory((h) => [...h, "catalog"]);
    setProductId(p.id);
    setScreen("detail");
    syncLead({ vistos: nextViewed });
  };

  // ---- producto en detalle ---------------------------------------------
  const currentProduct = (() => {
    if (!productId || !data) return null;
    for (const key of Object.keys(data.categories)) {
      const p = data.categories[key].plans.find((x) => x.id === productId);
      if (p) return { p, catKey: key };
    }
    return null;
  })();

  // ---- indicador de pasos ----------------------------------------------
  const stepMap: Record<Screen, number> = {
    welcome: -1, register: 0, categories: 1, catalog: 2, detail: 2, final: 3,
  };
  const activeStep = stepMap[screen];

  if (!data) {
    // SSR / primer render antes de hidratar localStorage
    return <div className="tec-stage"><div className="tec-device" /></div>;
  }

  const showChrome = screen !== "welcome";

  return (
    <div className="tec-stage">
      <div className="tec-device" style={{ background: deviceBg(screen) }}>
        {showChrome && (
          <AppBar
            onDark={onDark}
            activeStep={activeStep}
            onCatalogDark={onDark}
            onBack={back}
            onReset={reset}
          />
        )}

        <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={screen}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
              style={{ position: "absolute", inset: 0 }}
            >
              {screen === "welcome" && <Welcome onStart={() => { setNavStart(Date.now()); go("register"); }} />}
              {screen === "register" && (
                <Register
                  form={form}
                  setForm={setForm}
                  renew={renew}
                  setRenew={setRenew}
                  uses={uses}
                  use={use}
                  setUse={setUse}
                  canContinue={!!selUse}
                  onContinue={() => {
                    if (!selUse) return;
                    saveLead(selUse);
                    go("categories");
                  }}
                />
              )}
              {screen === "categories" && (
                <Categories
                  selUse={selUse}
                  onSelect={(k) => selectCategory(k, true)}
                />
              )}
              {screen === "catalog" && (
                <Catalog
                  data={data}
                  category={category ?? "laptops"}
                  selUse={selUse}
                  favs={favs}
                  onTab={(k) => selectCategory(k, false)}
                  onToggleFav={toggleFav}
                  onOpen={openProduct}
                  onContinue={() => go("final")}
                />
              )}
              {screen === "detail" && currentProduct && (
                <Detail
                  product={currentProduct.p}
                  related={data.categories[currentProduct.catKey].plans.filter((x) => x.id !== currentProduct.p.id)}
                  isFav={favs.includes(currentProduct.p.id)}
                  onToggleFav={() => toggleFav(currentProduct.p.id)}
                  onOpenRelated={(id) => setProductId(id)}
                  onQuote={() => go("final")}
                />
              )}
              {screen === "final" && (
                <Final
                  favList={favProducts(data, favs)}
                  onQuote={requestQuote}
                  onReset={reset}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// App bar
// ===========================================================================
function AppBar({
  onDark, activeStep, onBack, onReset,
}: {
  onDark: boolean;
  onCatalogDark: boolean;
  activeStep: number;
  onBack: () => void;
  onReset: () => void;
}) {
  const barBg = onDark ? "rgba(8,12,22,.72)" : "rgba(255,255,255,.72)";
  const barBorder = onDark ? "rgba(255,255,255,.08)" : COLOR.border;
  const chipBg = onDark ? "rgba(255,255,255,.1)" : "#f0f0f4";
  const chipInk = onDark ? "#fff" : "#3a3a3f";
  const chip: CSSProperties = {
    width: 38, height: 38, borderRadius: "50%", border: "none", background: chipBg,
    color: chipInk, cursor: "pointer", display: "flex", alignItems: "center",
    justifyContent: "center",
  };
  return (
    <div
      style={{
        flex: "0 0 auto", height: 52, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 16px", zIndex: 35, background: barBg,
        backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
        borderBottom: `1px solid ${barBorder}`,
      }}
    >
      <button onClick={onBack} aria-label="Volver" style={{ ...chip, fontSize: 19 }}>‹</button>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/tecology-logo.png"
          alt="Tecology"
          style={{ height: 15, display: "block", filter: onDark ? "brightness(1.4)" : "none" }}
        />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: i === activeStep ? 22 : 7, height: 7, borderRadius: 4,
                background: i <= activeStep ? COLOR.blue : onDark ? "rgba(255,255,255,.25)" : "#d2d5dd",
                transition: "all .3s",
              }}
            />
          ))}
        </div>
      </div>
      <button onClick={onReset} aria-label="Reiniciar" style={{ ...chip, fontSize: 15 }}>⟲</button>
    </div>
  );
}

// ===========================================================================
// Welcome (dirección A: oscura, editorial, minimalista)
// ===========================================================================
function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div
      className="tec-scroll"
      style={{
        position: "absolute", inset: 0, overflow: "hidden",
        background: "radial-gradient(120% 80% at 50% 0%, #0e1e3e 0%, #070b16 60%, #05070d 100%)",
        animation: "tecFade .6s ease both",
      }}
    >
      {/* Aquí puede ir un <video> de fondo; el medallón es semi-transparente para lucir sobre él. */}
      <div
        style={{
          position: "absolute", inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)",
          backgroundSize: "38px 38px",
          maskImage: "radial-gradient(80% 60% at 50% 30%, #000 0%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(80% 60% at 50% 30%, #000 0%, transparent 75%)",
        }}
      />
      <div
        style={{
          position: "absolute", top: 150, left: "calc(50% - 115px)", width: 220, height: 220,
          borderRadius: "50%", overflow: "hidden", background: "rgba(10,20,42,.35)",
          backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
          border: "1px solid rgba(120,160,255,.28)",
          boxShadow: "0 30px 80px -20px rgba(20,60,140,.65)",
          animation: "tecFloat 6s ease-in-out infinite", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 40,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/tecology-mark.png"
          alt="Tecology"
          style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 4px 18px rgba(0,0,0,.35))" }}
        />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 30px 42px" }}>
        <h1 style={{ margin: 0, color: "#fff", fontSize: 38, lineHeight: 1.06, fontWeight: 700, letterSpacing: "-.02em", textWrap: "balance", animation: "tecUp .7s .12s ease both" }}>
          La tecnología adecuada para hacer crecer su empresa
        </h1>
        <p style={{ margin: "16px 0 26px", color: "#98a2bd", fontSize: 16, lineHeight: 1.5, fontWeight: 400, maxWidth: 300, animation: "tecUp .7s .2s ease both" }}>
          Descubra las soluciones ideales para su empresa en menos de un minuto.
        </p>
        <button
          onClick={onStart}
          style={{ animation: "tecUp .7s .28s ease both", width: "100%", padding: 17, border: "none", borderRadius: 16, background: "#fff", color: "#0a0c14", fontSize: 16, fontWeight: 600, cursor: "pointer", boxShadow: "0 14px 34px -12px rgba(255,255,255,.35)" }}
        >
          Comenzar
        </button>
        <p style={{ textAlign: "center", margin: "14px 0 0", color: "#59657f", fontSize: 12, animation: "tecFade 1s .4s ease both" }}>
          Menos de 1 minuto · Sin compromiso
        </p>
      </div>
    </div>
  );
}

// ===========================================================================
// Register + clasificación de necesidades
// ===========================================================================
function Register({
  form, setForm, renew, setRenew, uses, use, setUse, canContinue, onContinue,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  renew: string | null;
  setRenew: (v: string) => void;
  uses: UseCase[];
  use: string | null;
  setUse: (v: string) => void;
  canContinue: boolean;
  onContinue: () => void;
}) {
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <div className="tec-scroll" style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "22px 20px 120px", background: COLOR.lightBg, animation: "tecUp .5s ease both" }}>
        <h2 style={{ margin: "0 0 6px", color: COLOR.ink, fontSize: 26, fontWeight: 700, letterSpacing: "-.02em" }}>Cuéntenos sobre usted</h2>
        <p style={{ margin: "0 0 22px", color: COLOR.muted, fontSize: 14, lineHeight: 1.5 }}>Para preparar una recomendación a la medida de su empresa.</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Field label="Nombre"><input placeholder="Ana" value={form.nombre} onChange={set("nombre")} style={inputStyle} /></Field>
          <Field label="Apellido"><input placeholder="Rodríguez" value={form.apellido} onChange={set("apellido")} style={inputStyle} /></Field>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Field label="Empresa"><input placeholder="Nombre de la empresa" value={form.empresa} onChange={set("empresa")} style={inputStyle} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Field label="Cargo"><input placeholder="Gerente de TI" value={form.cargo} onChange={set("cargo")} style={inputStyle} /></Field>
          <Field label="Colaboradores"><input placeholder="25" value={form.colaboradores} onChange={set("colaboradores")} style={inputStyle} /></Field>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Field label="Correo electrónico"><input placeholder="ana@empresa.com" value={form.correo} onChange={set("correo")} style={inputStyle} /></Field>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Teléfono</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={form.codigo}
              onChange={set("codigo")}
              style={{
                flex: "0 0 118px", padding: "13px 10px", border: `1px solid ${COLOR.borderInput}`,
                borderRadius: 12, fontSize: 14, color: COLOR.ink, background: "#fff", outline: "none",
                appearance: "none", WebkitAppearance: "none",
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path d='M1 1l4 4 4-4' stroke='%236e6e73' stroke-width='1.5' fill='none'/></svg>\")",
                backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
              }}
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.dial} value={c.dial}>{c.label}</option>
              ))}
            </select>
            <input placeholder="0000 0000" value={form.telefono} onChange={set("telefono")} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 26 }}>
          <label style={labelStyle}>¿Planea renovar equipos?</label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {["Sí", "No", "En evaluación"].map((label) => {
              const on = renew === label;
              return (
                <button
                  key={label}
                  onClick={() => setRenew(label)}
                  style={{
                    flex: 1, padding: "12px 8px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                    cursor: "pointer", border: `1px solid ${on ? COLOR.blue : COLOR.borderInput}`,
                    background: on ? "#eaf1ff" : "#fff", color: on ? COLOR.blue : "#3a3a3f",
                    transition: "all .2s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ height: 1, background: "#e8e8ed", margin: "0 0 22px" }} />

        <h3 style={{ margin: "0 0 5px", color: COLOR.ink, fontSize: 20, fontWeight: 700, letterSpacing: "-.01em" }}>¿Qué tipo de uso necesita?</h3>
        <p style={{ margin: "0 0 18px", color: COLOR.muted, fontSize: 14 }}>Seleccione el escenario principal de los equipos.</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {uses.map((u) => {
            const on = use === u.id;
            return (
              <button
                key={u.id}
                onClick={() => setUse(u.id)}
                style={{
                  textAlign: "left", padding: 14, borderRadius: 16, cursor: "pointer", background: "#fff",
                  border: `1.5px solid ${on ? COLOR.blue : COLOR.border}`,
                  boxShadow: on ? "0 12px 26px -14px rgba(10,102,255,.5)" : "0 6px 16px -14px rgba(0,0,0,.3)",
                  transform: on ? "translateY(-2px)" : "none", transition: "all .2s",
                }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, background: on ? "#eaf1ff" : "#f5f5f7" }}>{u.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLOR.ink, marginTop: 11 }}>{u.name}</div>
                <div style={{ fontSize: 11.5, color: COLOR.muted, lineHeight: 1.4, marginTop: 3 }}>{u.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 20px 24px", background: "linear-gradient(180deg,rgba(245,245,247,0),#f5f5f7 34%)" }}>
        <button
          onClick={onContinue}
          disabled={!canContinue}
          style={{
            width: "100%", padding: 16, border: "none", borderRadius: 14, fontSize: 15.5, fontWeight: 600,
            cursor: canContinue ? "pointer" : "not-allowed", background: canContinue ? COLOR.blue : "#c7ccd6",
            color: "#fff", boxShadow: canContinue ? "0 14px 30px -12px rgba(10,102,255,.6)" : "none",
            transition: "all .25s",
          }}
        >
          {canContinue ? "Continuar" : "Seleccione un tipo de uso"}
        </button>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

// ===========================================================================
// Categorías
// ===========================================================================
function Categories({ selUse, onSelect }: { selUse: UseCase | null; onSelect: (k: CategoryKey) => void }) {
  return (
    <div className="tec-scroll" style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "22px 20px 40px", background: COLOR.lightBg, animation: "tecUp .5s ease both" }}>
      {selUse && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 13px", borderRadius: 999, background: "#eaf1ff", color: COLOR.blue, fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>
          <span>{selUse.icon}</span> Personalizado para {selUse.name}
        </div>
      )}
      <h2 style={{ margin: "0 0 6px", color: COLOR.ink, fontSize: 26, fontWeight: 700, letterSpacing: "-.02em" }}>¿Qué desea explorar?</h2>
      <p style={{ margin: "0 0 22px", color: COLOR.muted, fontSize: 14, lineHeight: 1.5 }}>Elija una categoría para ver una selección a la medida.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {CATEGORY_ORDER.map((k) => {
          const c = CATEGORY_META[k];
          return (
            <button
              key={k}
              onClick={() => onSelect(k as CategoryKey)}
              className="tec-catcard"
              style={{
                textAlign: "left", border: `1px solid ${COLOR.border}`, background: "#fff", borderRadius: 20,
                padding: 0, overflow: "hidden", cursor: "pointer", boxShadow: "0 8px 24px -16px rgba(0,0,0,.35)",
                transition: "transform .25s ease, box-shadow .25s ease",
              }}
            >
              <div style={{ height: 130, background: "repeating-linear-gradient(135deg,#f1f3f8,#f1f3f8 10px,#e9edf4 10px,#e9edf4 20px)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <span style={{ position: "absolute", top: 14, left: 16, fontSize: 26 }}>{c.icon}</span>
                <span style={{ fontFamily: "monospace", fontSize: 11, color: "#9aa3b5", letterSpacing: ".1em" }}>{c.shot}</span>
              </div>
              <div style={{ padding: "16px 18px 18px" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: COLOR.ink }}>{c.name}</div>
                <div style={{ fontSize: 13.5, color: COLOR.muted, lineHeight: 1.5, margin: "5px 0 12px" }}>{c.desc}</div>
                <span style={{ color: COLOR.blue, fontSize: 14, fontWeight: 600 }}>{c.btn} →</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===========================================================================
// Catálogo (dirección A: oscuro, tarjetas de planes)
// ===========================================================================
function Catalog({
  data, category, selUse, favs, onTab, onToggleFav, onOpen, onContinue,
}: {
  data: NonNullable<ReturnType<typeof useCatalogData>>;
  category: CategoryKey;
  selUse: UseCase | null;
  favs: string[];
  onTab: (k: CategoryKey) => void;
  onToggleFav: (id: string) => void;
  onOpen: (p: Product) => void;
  onContinue: () => void;
}) {
  const block = data.categories[category] ?? data.categories.laptops;
  const activePlans = block.plans.filter((p) => p.active !== false);
  let plans = activePlans;
  if (selUse) {
    const matched = activePlans.filter((p) => Array.isArray(p.uses) && p.uses.includes(selUse.id));
    const untagged = activePlans.filter((p) => !Array.isArray(p.uses) || !p.uses.length);
    plans = matched.length ? matched : untagged.length ? untagged : activePlans;
  }

  return (
    <>
      <div className="tec-scroll" style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "18px 0 110px", background: "#080c16", animation: "tecUp .5s ease both" }}>
        <div className="tec-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 20px 4px", marginBottom: 8 }}>
          {CATEGORY_ORDER.map((k) => {
            const on = category === k;
            return (
              <button
                key={k}
                onClick={() => onTab(k as CategoryKey)}
                style={{
                  padding: "9px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  whiteSpace: "nowrap", transition: "all .2s",
                  border: `1px solid ${on ? COLOR.blue : "rgba(255,255,255,.12)"}`,
                  background: on ? COLOR.blue : "rgba(255,255,255,.05)", color: on ? "#fff" : "#aeb7cc",
                }}
              >
                {CATEGORY_META[k].name}
              </button>
            );
          })}
        </div>
        <div style={{ padding: "8px 20px 4px" }}>
          {selUse && (
            <div style={{ fontSize: 12.5, color: "#94a0bd", marginBottom: 2 }}>
              Seleccionado para <b style={{ color: "#fff" }}>{selUse.name}</b>
            </div>
          )}
          <h2 style={{ margin: "2px 0 4px", color: "#fff", fontSize: 24, fontWeight: 700, letterSpacing: "-.02em" }}>{block.label}</h2>
          <p style={{ margin: "0 0 6px", color: "#94a0bd", fontSize: 13.5 }}>Tres opciones seleccionadas para su empresa.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "12px 20px 0" }}>
          {plans.map((p) => (
            <PlanCard key={p.id} product={p} isFav={favs.includes(p.id)} onFav={() => onToggleFav(p.id)} onOpen={() => onOpen(p)} />
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 20px 22px", background: "linear-gradient(180deg,rgba(0,0,0,0),#080c16 40%)" }}>
        <button onClick={onContinue} style={{ width: "100%", padding: 15, border: "none", borderRadius: 14, background: COLOR.blue, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "0 12px 28px -12px rgba(10,102,255,.6)" }}>
          Continuar con mi propuesta
        </button>
      </div>
    </>
  );
}

function PlanCard({ product: p, isFav, onFav, onOpen }: { product: Product; isFav: boolean; onFav: () => void; onOpen: () => void }) {
  const rec = p.tier === "Recomendado";
  const ink = "#fff";
  const muted = "#94a0bd";
  const shotBg = "repeating-linear-gradient(135deg,#0d152a,#0d152a 10px,#111c36 10px,#111c36 20px)";
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      style={{
        position: "relative", borderRadius: 22, padding: rec ? "30px 22px 24px" : 22,
        background: rec ? "#0f1e3c" : "rgba(255,255,255,.045)",
        border: `1px solid ${rec ? "#2f6bff" : "rgba(255,255,255,.1)"}`,
        boxShadow: rec ? "0 30px 60px -24px rgba(30,90,220,.6)" : "0 10px 30px -20px rgba(0,0,0,.6)",
        transform: rec ? "scale(1.02)" : "none",
      }}
    >
      {rec && (
        <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", padding: "7px 16px", borderRadius: 999, background: COLOR.blue, color: "#fff", fontSize: 11.5, fontWeight: 700, letterSpacing: ".03em", whiteSpace: "nowrap", boxShadow: "0 10px 24px -10px rgba(10,102,255,.8)" }}>
          ⭐ Más recomendado
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: rec ? "#6ea0ff" : "#8b93a7" }}>{p.tier}</span>
        <button onClick={onFav} aria-label="Favorito" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1, color: isFav ? COLOR.favPink : "rgba(255,255,255,.4)" }}>{isFav ? "♥" : "♡"}</button>
      </div>
      <div style={{ height: rec ? 220 : 196, borderRadius: 14, overflow: "hidden", background: p.img ? "#fff" : shotBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        {p.img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.img} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <span style={{ fontFamily: "monospace", fontSize: 11, color: "#5f7196", letterSpacing: ".1em" }}>product shot</span>
        )}
      </div>
      <div style={{ fontSize: rec ? 20 : 18, fontWeight: 700, color: ink, letterSpacing: "-.01em" }}>{p.name}</div>
      <div style={{ fontSize: 13, color: muted, margin: "2px 0 14px" }}>{p.model}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 16 }}>
        {p.specs.map((s, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
            <span style={{ color: muted }}>{s.k}</span>
            <span style={{ color: ink, fontWeight: 600 }}>{s.v}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 14 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: COLOR.green, letterSpacing: "-.02em" }}>{p.price}</span>
        <span style={{ fontSize: 12.5, color: muted }}>+ IVA</span>
      </div>
      <button onClick={onOpen} style={{ width: "100%", padding: 14, borderRadius: 13, border: "none", cursor: "pointer", fontSize: 14.5, fontWeight: 600, background: rec ? COLOR.blue : "rgba(255,255,255,.1)", color: "#fff" }}>
        Ver detalles
      </button>
    </motion.div>
  );
}

// ===========================================================================
// Detalle del producto
// ===========================================================================
function Detail({
  product: p, related, isFav, onToggleFav, onOpenRelated, onQuote,
}: {
  product: Product;
  related: Product[];
  isFav: boolean;
  onToggleFav: () => void;
  onOpenRelated: (id: string) => void;
  onQuote: () => void;
}) {
  const rec = p.tier === "Recomendado";
  const services = ["Garantía on-site", "Configuración lista", "Migración de datos", "Soporte Tecology"];
  const accessories = ["Docking Station USB-C", "Mouse inalámbrico", "Mochila ejecutiva", "UPS 650VA"];
  return (
    <>
      <div className="tec-scroll" style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "0 0 130px", background: "#fff", animation: "tecUp .5s ease both" }}>
        <div style={{ height: 300, background: p.img ? "#fff" : "repeating-linear-gradient(135deg,#f1f3f8,#f1f3f8 12px,#e9edf4 12px,#e9edf4 24px)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          {p.img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.img} alt={p.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: 24 }} />
          ) : (
            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#9aa3b5", letterSpacing: ".1em" }}>product gallery</span>
          )}
          <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
            <div style={{ width: 22, height: 5, borderRadius: 3, background: COLOR.blue }} />
            <div style={{ width: 8, height: 5, borderRadius: 3, background: "#c7ccd6" }} />
            <div style={{ width: 8, height: 5, borderRadius: 3, background: "#c7ccd6" }} />
          </div>
        </div>
        <div style={{ padding: "22px 20px 0" }}>
          {rec && (
            <span style={{ display: "inline-block", padding: "5px 11px", borderRadius: 999, background: "#eaf1ff", color: COLOR.blue, fontSize: 11.5, fontWeight: 700, letterSpacing: ".05em", marginBottom: 10 }}>⭐ Más recomendado</span>
          )}
          <h2 style={{ margin: 0, color: COLOR.ink, fontSize: 25, fontWeight: 700, letterSpacing: "-.02em" }}>{p.name}</h2>
          <div style={{ color: COLOR.muted, fontSize: 14, marginTop: 3 }}>{p.model}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "14px 0 4px" }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: COLOR.green, letterSpacing: "-.02em" }}>{p.price}</span>
            <span style={{ fontSize: 13, color: COLOR.muted }}>+ IVA</span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: COLOR.muted, fontSize: 13, marginBottom: 22 }}>🛡 {p.warranty}</div>

          <div style={sectionTitle}>Especificaciones técnicas</div>
          <div style={{ border: "1px solid #ececf1", borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
            {p.specs.map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", background: i % 2 ? "#fafafb" : undefined, borderTop: i > 0 ? "1px solid #f0f0f4" : undefined }}>
                <span style={{ color: COLOR.muted, fontSize: 14 }}>{s.k}</span>
                <span style={{ color: COLOR.ink, fontSize: 14, fontWeight: 600 }}>{s.v}</span>
              </div>
            ))}
          </div>

          <div style={sectionTitle}>Características destacadas</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {p.features.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "#1d1d1f", lineHeight: 1.45 }}>
                <span style={{ color: COLOR.green, fontWeight: 700 }}>✓</span>{f}
              </div>
            ))}
          </div>

          <div style={{ background: COLOR.lightBg, borderRadius: 16, padding: "16px 18px", marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: COLOR.muted, marginBottom: 6 }}>Ideal para</div>
            <div style={{ fontSize: 14.5, color: COLOR.ink, lineHeight: 1.5 }}>{p.ideal}</div>
          </div>

          {p.includes && p.includes.length > 0 && (
            <>
              <div style={sectionTitle}>Este combo incluye</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
                {p.includes.map((it, i) => (
                  <div key={i} style={{ border: "1px solid #ececf1", borderRadius: 12, padding: 12, fontSize: 13, color: COLOR.ink, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{it.icon}</span>{it.label}
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={sectionTitle}>Servicios incluidos</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
            {services.map((sv) => (
              <span key={sv} style={{ padding: "8px 12px", borderRadius: 999, background: "#eaf1ff", color: COLOR.blue, fontSize: 12.5, fontWeight: 500 }}>{sv}</span>
            ))}
          </div>

          <div style={sectionTitle}>Accesorios compatibles</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 26 }}>
            {accessories.map((a) => (
              <span key={a} style={{ padding: "8px 12px", borderRadius: 10, background: COLOR.lightBg, color: "#3a3a3f", fontSize: 12.5, fontWeight: 500 }}>{a}</span>
            ))}
          </div>

          <div style={sectionTitle}>Productos relacionados</div>
          <div className="tec-scroll" style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, margin: "0 -20px", paddingLeft: 20, paddingRight: 20 }}>
            {related.map((r) => (
              <button key={r.id} onClick={() => onOpenRelated(r.id)} style={{ flex: "0 0 150px", textAlign: "left", border: "1px solid #ececf1", background: "#fff", borderRadius: 14, padding: 12, cursor: "pointer" }}>
                <div style={{ height: 80, borderRadius: 9, background: p.img && r.img ? "#f5f5f7" : "repeating-linear-gradient(135deg,#f1f3f8,#f1f3f8 8px,#e9edf4 8px,#e9edf4 16px)", marginBottom: 10, overflow: "hidden" }}>
                  {r.img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.img} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  )}
                </div>
                <div style={{ fontSize: 12, color: COLOR.muted }}>{r.tier}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: COLOR.ink, lineHeight: 1.3 }}>{r.name}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLOR.green, marginTop: 4 }}>{r.price}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 20px 22px", background: "#fff", borderTop: "1px solid #ececf1", display: "flex", gap: 10 }}>
        <button onClick={onToggleFav} aria-label="Agregar a favoritos" style={{ width: 52, flex: "0 0 52px", border: "1px solid #dcdce2", borderRadius: 14, background: "#fff", fontSize: 18, cursor: "pointer", color: isFav ? COLOR.favPink : "#c7ccd6" }}>{isFav ? "♥" : "♡"}</button>
        <button onClick={onQuote} style={{ flex: 1, padding: 15, border: "none", borderRadius: 14, background: COLOR.blue, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "0 12px 28px -12px rgba(10,102,255,.6)" }}>Solicitar cotización</button>
      </div>
    </>
  );
}

// ===========================================================================
// Pantalla final
// ===========================================================================
function Final({
  favList, onQuote, onReset,
}: {
  favList: { name: string; price: string }[];
  onQuote: () => void;
  onReset: () => void;
}) {
  return (
    <div className="tec-scroll" style={{ position: "absolute", inset: 0, overflowY: "auto", background: "radial-gradient(120% 70% at 50% 0%, #0e1e3e 0%, #070b16 62%, #05070d 100%)", animation: "tecFade .5s ease both" }}>
      <div style={{ padding: "120px 28px 40px", minHeight: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#0A66FF,#2f80ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, marginBottom: 26, animation: "tecScale .6s ease both", boxShadow: "0 20px 50px -16px rgba(10,102,255,.7)", color: "#fff" }}>✓</div>
        <h2 style={{ margin: 0, color: "#fff", fontSize: 30, lineHeight: 1.14, fontWeight: 700, letterSpacing: "-.02em", textWrap: "balance", animation: "tecUp .6s .08s ease both" }}>¿Le gustaría recibir una propuesta personalizada?</h2>
        <p style={{ margin: "16px 0 0", color: "#98a2bd", fontSize: 15.5, lineHeight: 1.55, animation: "tecUp .6s .16s ease both" }}>Uno de nuestros asesores puede preparar una cotización según las necesidades de su empresa.</p>

        {favList.length > 0 && (
          <div style={{ marginTop: 24, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, padding: "16px 18px", animation: "tecUp .6s .2s ease both" }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#7f8aa6", marginBottom: 10 }}>Sus favoritos ({favList.length})</div>
            {favList.map((f, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
                <span style={{ color: "#e9eefc", fontSize: 14, fontWeight: 500 }}>{f.name}</span>
                <span style={{ color: COLOR.green, fontSize: 14, fontWeight: 700 }}>{f.price}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 11, animation: "tecUp .6s .26s ease both" }}>
          <button onClick={onQuote} style={{ width: "100%", padding: 16, border: "none", borderRadius: 14, background: COLOR.green, color: "#fff", fontSize: 15.5, fontWeight: 600, cursor: "pointer", boxShadow: "0 14px 32px -12px rgba(18,183,106,.6)" }}>Solicitar cotización</button>
          <button onClick={onReset} style={{ width: "100%", padding: 16, border: "1px solid rgba(255,255,255,.18)", borderRadius: 14, background: "rgba(255,255,255,.06)", color: "#fff", fontSize: 15.5, fontWeight: 600, cursor: "pointer" }}>Agendar reunión</button>
          <button onClick={onReset} style={{ width: "100%", padding: 16, border: "1px solid rgba(255,255,255,.18)", borderRadius: 14, background: "transparent", color: "#c3ccdf", fontSize: 15.5, fontWeight: 500, cursor: "pointer" }}>Descargar catálogo PDF</button>
        </div>
        <div style={{ flex: 1 }} />
        <p style={{ textAlign: "center", margin: "30px 0 0", color: "#59657f", fontSize: 12 }}>
          Tecology · Soluciones tecnológicas para empresas · <Link href="/admin" style={{ color: "#6ea0ff" }}>Panel admin</Link>
        </p>
      </div>
    </div>
  );
}

// ===========================================================================
// Helpers
// ===========================================================================
function deviceBg(screen: Screen): string {
  switch (screen) {
    case "welcome": return "#000";
    case "register":
    case "categories": return COLOR.lightBg;
    case "catalog": return "#080c16";
    case "detail": return "#fff";
    case "final": return "#05070d";
    default: return COLOR.lightBg;
  }
}

function favProducts(data: NonNullable<ReturnType<typeof useCatalogData>>, favs: string[]) {
  return favs
    .map((id) => {
      for (const k of Object.keys(data.categories)) {
        const p = data.categories[k].plans.find((x) => x.id === id);
        if (p) return { name: p.name, price: p.price };
      }
      return null;
    })
    .filter((x): x is { name: string; price: string } => !!x);
}
