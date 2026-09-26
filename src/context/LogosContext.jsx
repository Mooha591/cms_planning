import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";

const LogosContext = createContext(null);

// Logos des agences d'intérim de l'utilisateur : { [employeur]: dataUrl }.
// Persistés sur Supabase (table agency_logos, une ligne par employeur).
export function LogosProvider({ children }) {
  const { user } = useAuth();
  const [logos, setLogos] = useState({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("agency_logos")
      .select("employeur, data_url")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setLogos(Object.fromEntries(data.map((r) => [r.employeur, r.data_url])));
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // L'état local n'est appliqué qu'après confirmation de Supabase (comme
  // les autres contexts) : évite un logo affiché comme enregistré alors que
  // l'écriture a en fait échoué (ex : coupure réseau).
  async function setLogo(employeur, dataUrl) {
    if (!employeur) return;
    const { error } = await supabase.from("agency_logos").upsert({
      id: `${user.id}::${employeur}`,
      user_id: user.id,
      employeur,
      data_url: dataUrl,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    setLogos((prev) => ({ ...prev, [employeur]: dataUrl }));
  }

  async function removeLogo(employeur) {
    const { error } = await supabase
      .from("agency_logos")
      .delete()
      .eq("id", `${user.id}::${employeur}`);
    if (error) return; // échec silencieux : le logo reste affiché, pas d'incohérence
    setLogos((prev) => {
      const next = { ...prev };
      delete next[employeur];
      return next;
    });
  }

  // Importe plusieurs logos d'un coup (restauration d'une sauvegarde).
  async function importLogos(imported) {
    if (!imported) return 0;
    const entries = Object.entries(imported).filter(([employeur, dataUrl]) => employeur && dataUrl);
    if (entries.length === 0) return 0;
    const rows = entries.map(([employeur, dataUrl]) => ({
      id: `${user.id}::${employeur}`,
      user_id: user.id,
      employeur,
      data_url: dataUrl,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("agency_logos").upsert(rows);
    if (error) return 0;
    setLogos((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    return entries.length;
  }

  return (
    <LogosContext.Provider value={{ logos, setLogo, removeLogo, importLogos }}>
      {children}
    </LogosContext.Provider>
  );
}

export function useAgencyLogos() {
  const ctx = useContext(LogosContext);
  if (!ctx) {
    throw new Error("useAgencyLogos doit être utilisé dans un <LogosProvider>");
  }
  return ctx;
}
