"use client";

import { useEffect, useState } from "react";
import { store } from "./store";
import type { CatalogData, Lead } from "./types";

/** Carga los datos del catálogo y se re-suscribe a los cambios (realtime). */
export function useCatalogData(): CatalogData | null {
  const [data, setData] = useState<CatalogData | null>(null);
  useEffect(() => {
    let alive = true;
    const read = () => {
      store
        .load()
        .then((d) => {
          if (alive) setData(d);
        })
        .catch((e) => console.error("Tecology: error al cargar el catálogo", e));
    };
    read();
    const unsub = store.subscribe(read);
    return () => {
      alive = false;
      unsub();
    };
  }, []);
  return data;
}

/** Leads reactivos para el panel admin. */
export function useLeads(): Lead[] {
  const [leads, setLeads] = useState<Lead[]>([]);
  useEffect(() => {
    let alive = true;
    const read = () => {
      store
        .getLeads()
        .then((l) => {
          if (alive) setLeads(l);
        })
        .catch((e) => console.error("Tecology: error al cargar leads", e));
    };
    read();
    const unsub = store.subscribe(read);
    return () => {
      alive = false;
      unsub();
    };
  }, []);
  return leads;
}
