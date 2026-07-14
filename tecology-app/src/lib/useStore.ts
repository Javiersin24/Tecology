"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { store } from "./store";
import type { CatalogData, Lead } from "./types";

/** Fuerza un re-render cuando el store cambia (datos o leads). */
export function useStoreVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => store.subscribe(() => setVersion((v) => v + 1)), []);
  return version;
}

/** Carga los datos del catálogo y se re-suscribe a los cambios. */
export function useCatalogData(): CatalogData | null {
  const subscribe = useCallback((cb: () => void) => store.subscribe(cb), []);
  // El server no tiene localStorage: devuelve null hasta hidratar en cliente.
  const get = useCallback(() => (typeof window === "undefined" ? null : true), []);
  useSyncExternalStore(subscribe, get, () => null);

  const [data, setData] = useState<CatalogData | null>(null);
  useEffect(() => {
    const read = () => setData(store.load());
    read();
    return store.subscribe(read);
  }, []);
  return data;
}

/** Leads reactivos para el panel admin. */
export function useLeads(): Lead[] {
  const [leads, setLeads] = useState<Lead[]>([]);
  useEffect(() => {
    const read = () => setLeads(store.getLeads());
    read();
    return store.subscribe(read);
  }, []);
  return leads;
}
