import type { CatalogData } from "./types";

// Datos semilla (demo). En producción viven en Supabase; aquí siembran el
// almacén local la primera vez y respaldan el botón "Restaurar demo".
export const SEED_DATA: CatalogData = {
  useCases: [
    { id: "oficina", icon: "🏢", name: "Oficina administrativa", desc: "Office, navegación y multitarea." },
    { id: "ejecutivos", icon: "💼", name: "Ejecutivos", desc: "Movilidad, reuniones y productividad." },
    { id: "programacion", icon: "💻", name: "Programación", desc: "Alto rendimiento para desarrollo." },
    { id: "diseno", icon: "🎨", name: "Diseño gráfico", desc: "Adobe, AutoCAD, Illustrator." },
    { id: "video", icon: "🎥", name: "Edición de video", desc: "Premiere, DaVinci y multimedia." },
    { id: "contabilidad", icon: "📊", name: "Contabilidad", desc: "ERP, SAP y QuickBooks." },
    { id: "clinicas", icon: "🏥", name: "Clínicas", desc: "Consultorios y expedientes." },
    { id: "educacion", icon: "🏫", name: "Educación", desc: "Colegios y laboratorios." },
    { id: "hoteles", icon: "🏨", name: "Hoteles", desc: "Recepción, reservas y admin." },
    { id: "callcenter", icon: "📞", name: "Call Center", desc: "Jornadas prolongadas y estables." },
    { id: "logistica", icon: "📦", name: "Logística", desc: "Inventario, bodega y facturación." },
    { id: "industria", icon: "🏭", name: "Industria", desc: "Producción y gestión robusta." },
  ],
  categories: {
    laptops: {
      label: "Laptops empresariales",
      plans: [
        {
          id: "lt-b", active: true, img: "", tier: "Básico", name: "ThinkPad L14", model: "Gen 4 · Business", price: "$499", warranty: "Garantía 1 año",
          specs: [{ k: "Procesador", v: "Intel Core i5" }, { k: "Memoria", v: "16 GB RAM" }, { k: "Almacenamiento", v: "512 GB SSD" }, { k: "Pantalla", v: '14" FHD' }],
          ideal: "Tareas administrativas, Office, navegación y multitarea diaria en oficina.",
          features: ["Diseño ligero y resistente", "Teclado con resistencia a derrames", "Batería para toda la jornada"],
        },
        {
          id: "lt-r", active: true, img: "", tier: "Recomendado", name: "ThinkPad T14", model: "Gen 4 · vPro", price: "$699", warranty: "Garantía 3 años on-site",
          specs: [{ k: "Procesador", v: "Intel Core i7" }, { k: "Memoria", v: "16 GB RAM" }, { k: "Almacenamiento", v: "512 GB SSD" }, { k: "Pantalla", v: '14" FHD IPS' }],
          ideal: "Profesionales que necesitan rendimiento, seguridad y movilidad para el día a día.",
          features: ["Chasis reforzado certificación militar", "Seguridad Intel vPro", "Carga rápida y RAM ampliable"],
        },
        {
          id: "lt-e", active: true, img: "", tier: "Empresarial", name: "EliteBook 840 G10", model: "Core Ultra · Elite", price: "$999", warranty: "Garantía 3 años on-site",
          specs: [{ k: "Procesador", v: "Intel Core Ultra 7" }, { k: "Memoria", v: "32 GB RAM" }, { k: "Almacenamiento", v: "1 TB SSD" }, { k: "Pantalla", v: '14" WUXGA antirreflejo' }],
          ideal: "Ejecutivos y equipos que demandan máximo rendimiento y seguridad avanzada.",
          features: ["Pantalla WUXGA de bajo consumo", "Cámara con obturador de privacidad", "Ampliable en RAM y SSD"],
        },
      ],
    },
    desktop: {
      label: "Computadoras de escritorio",
      plans: [
        {
          id: "dk-b", active: true, img: "", tier: "Básico", name: "ThinkCentre Neo 50s", model: "SFF · Business", price: "$459", warranty: "Garantía 1 año",
          specs: [{ k: "Procesador", v: "Intel Core i5" }, { k: "Memoria", v: "16 GB RAM" }, { k: "Almacenamiento", v: "512 GB SSD" }, { k: "Formato", v: "Small Form Factor" }],
          ideal: "Puestos administrativos, recepción y trabajo de oficina de uso general.",
          features: ["Formato compacto que ahorra espacio", "Bajo consumo energético", "Fácil mantenimiento"],
        },
        {
          id: "dk-r", active: true, img: "", tier: "Recomendado", name: "OptiPlex 7010", model: "Tower · vPro", price: "$649", warranty: "Garantía 3 años on-site",
          specs: [{ k: "Procesador", v: "Intel Core i7" }, { k: "Memoria", v: "16 GB RAM" }, { k: "Almacenamiento", v: "512 GB SSD" }, { k: "Formato", v: "Tower expandible" }],
          ideal: "Estaciones de trabajo estables para multitarea y sistemas empresariales.",
          features: ["Chasis expandible sin herramientas", "Seguridad de nivel empresarial", "Alto rendimiento sostenido"],
        },
        {
          id: "dk-e", active: true, img: "", tier: "Empresarial", name: "HP Elite Tower 800 G9", model: "Core Ultra · Elite", price: "$929", warranty: "Garantía 3 años on-site",
          specs: [{ k: "Procesador", v: "Intel Core Ultra 7" }, { k: "Memoria", v: "32 GB RAM" }, { k: "Almacenamiento", v: "1 TB SSD" }, { k: "Formato", v: "Tower · gráficos dedicados" }],
          ideal: "Diseño, ingeniería y cargas de trabajo intensivas en la empresa.",
          features: ["Preparado para gráficos dedicados", "Refrigeración optimizada", "Máxima capacidad de expansión"],
        },
      ],
    },
    combos: {
      label: "Combos empresariales",
      plans: [
        {
          id: "cb-b", active: true, img: "", tier: "Básico", name: "Combo Oficina Básico", model: "Solución lista para trabajar", price: "$649", warranty: "Garantía 1 año",
          specs: [{ k: "Equipo", v: "ThinkPad L14" }, { k: "Monitor", v: '24" FHD' }, { k: "Periféricos", v: "Mouse + Teclado" }, { k: "Extra", v: "Mochila" }],
          ideal: "Equipar un nuevo puesto administrativo completo desde el primer día.",
          features: ["Todo listo para conectar y trabajar", "Compatibilidad garantizada", "Precio especial de paquete"],
          includes: [{ icon: "💻", label: "Laptop ThinkPad" }, { icon: "🖥", label: 'Monitor 24"' }, { icon: "🖱", label: "Mouse inalámbrico" }, { icon: "⌨️", label: "Teclado" }, { icon: "🎒", label: "Mochila" }],
        },
        {
          id: "cb-r", active: true, img: "", tier: "Recomendado", name: "Combo Productividad", model: "Estación completa", price: "$949", warranty: "Garantía 3 años",
          specs: [{ k: "Equipo", v: "ThinkPad T14" }, { k: "Monitor", v: '27" QHD' }, { k: "Docking", v: "USB-C incluido" }, { k: "Periféricos", v: "Mouse + Teclado" }],
          ideal: "Colaboradores que alternan entre escritorio y movilidad con una sola estación.",
          features: ["Docking station para un solo cable", "Monitor QHD de gran formato", "Ergonomía y productividad"],
          includes: [{ icon: "💻", label: "Laptop ThinkPad T14" }, { icon: "🖥", label: 'Monitor 27" QHD' }, { icon: "🔌", label: "Docking Station" }, { icon: "🖱", label: "Mouse" }, { icon: "⌨️", label: "Teclado" }, { icon: "🎒", label: "Mochila" }],
        },
        {
          id: "cb-e", active: true, img: "", tier: "Empresarial", name: "Combo Ejecutivo", model: "Solución premium", price: "$1,299", warranty: "Garantía 3 años on-site",
          specs: [{ k: "Equipo", v: "EliteBook 840 G10" }, { k: "Monitor", v: '27" 4K' }, { k: "Respaldo", v: "UPS 650VA" }, { k: "Docking", v: "USB-C incluido" }],
          ideal: "Gerencias y ejecutivos que requieren rendimiento, respaldo y presentación premium.",
          features: ["Respaldo de energía UPS", "Monitor 4K y docking", "Setup ejecutivo completo"],
          includes: [{ icon: "💻", label: "EliteBook 840" }, { icon: "🖥", label: 'Monitor 27" 4K' }, { icon: "🔌", label: "Docking Station" }, { icon: "🔋", label: "UPS 650VA" }, { icon: "🖱", label: "Mouse" }, { icon: "🎒", label: "Mochila" }],
        },
      ],
    },
    monitores: {
      label: "Monitores profesionales",
      plans: [
        {
          id: "mn-b", active: true, img: "", tier: "Básico", name: "ThinkVision T24i", model: '24" · Oficina', price: "$149", warranty: "Garantía 3 años",
          specs: [{ k: "Tamaño", v: "24 pulgadas" }, { k: "Resolución", v: "Full HD 1080p" }, { k: "Panel", v: "IPS" }, { k: "Puertos", v: "HDMI · DisplayPort" }],
          ideal: "Puestos administrativos y de oficina que necesitan una pantalla confiable.",
          features: ["Panel IPS con buenos ángulos", "Base ajustable en altura", "Bajo consumo"],
        },
        {
          id: "mn-r", active: true, img: "", tier: "Recomendado", name: "Dell P2725H", model: '27" · Productividad', price: "$229", warranty: "Garantía 3 años",
          specs: [{ k: "Tamaño", v: "27 pulgadas" }, { k: "Resolución", v: "QHD 1440p" }, { k: "Panel", v: "IPS · 100 Hz" }, { k: "Puertos", v: "USB-C · HDMI · DP" }],
          ideal: "Multitarea cómoda con más espacio y conectividad USB-C de un solo cable.",
          features: ["USB-C con carga incluida", "Marco ultra delgado", "Diseño ergonómico completo"],
        },
        {
          id: "mn-e", active: true, img: "", tier: "Empresarial", name: "HP Z27k G3", model: '27" · Estación de trabajo', price: "$549", warranty: "Garantía 3 años on-site",
          specs: [{ k: "Tamaño", v: "27 pulgadas" }, { k: "Resolución", v: "4K UHD" }, { k: "Panel", v: "IPS · 99% sRGB" }, { k: "Puertos", v: "USB-C 100W · DP" }],
          ideal: "Diseño, edición y trabajo que exige color preciso y máxima definición.",
          features: ["4K con color calibrado de fábrica", "USB-C 100W para portátiles", "Ideal para diseño y edición"],
        },
      ],
    },
  },
};

export const CATEGORY_ORDER: string[] = ["laptops", "desktop", "combos", "monitores"];

export const CATEGORY_LABELS: Record<string, string> = {
  laptops: "Laptops empresariales",
  desktop: "Computadoras de escritorio",
  combos: "Combos empresariales",
  monitores: "Monitores profesionales",
};

/** Catálogo vacío de respaldo mientras cargan los datos reales. */
export const EMPTY_CATALOG: CatalogData = {
  categories: Object.fromEntries(
    CATEGORY_ORDER.map((k) => [k, { label: CATEGORY_LABELS[k] || k, plans: [] }]),
  ),
  useCases: [],
};
