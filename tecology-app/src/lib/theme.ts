// Tokens de diseño compartidos entre catálogo y admin.
export const COLOR = {
  blue: "#0A66FF",
  blueHover: "#2f80ff",
  green: "#12b76a",
  ink: "#0a0c14",
  muted: "#6e6e73",
  muted2: "#8a8f9c",
  border: "#ececf1",
  borderInput: "#dcdce2",
  lightBg: "#f5f5f7",
  panelBg: "#f4f5f7",
  favPink: "#ff5a7a",
} as const;

export const CATEGORY_META: Record<
  string,
  { icon: string; name: string; desc: string; btn: string; shot: string; short: string }
> = {
  laptops: { icon: "💻", name: "Laptops", desc: "Equipos empresariales para movilidad y productividad.", btn: "Ver laptops", shot: "laptop shot", short: "Laptops" },
  desktop: { icon: "🖥", name: "Desktop", desc: "Computadoras de escritorio para oficinas y empresas.", btn: "Ver desktops", shot: "desktop shot", short: "Desktop" },
  combos: { icon: "📦", name: "Combos Empresariales", desc: "Soluciones completas listas para trabajar.", btn: "Ver combos", shot: "combo shot", short: "Combos" },
  monitores: { icon: "🖥", name: "Monitores", desc: "Monitores para productividad y estaciones de trabajo.", btn: "Ver monitores", shot: "monitor shot", short: "Monitores" },
};

export interface CountryCode {
  label: string;
  dial: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { label: "🇨🇷 +506", dial: "+506" },
  { label: "🇵🇦 +507", dial: "+507" },
  { label: "🇳🇮 +505", dial: "+505" },
  { label: "🇬🇹 +502", dial: "+502" },
  { label: "🇸🇻 +503", dial: "+503" },
  { label: "🇭🇳 +504", dial: "+504" },
  { label: "🇲🇽 +52", dial: "+52" },
  { label: "🇺🇸 +1", dial: "+1" },
  { label: "🇨🇴 +57", dial: "+57" },
];
