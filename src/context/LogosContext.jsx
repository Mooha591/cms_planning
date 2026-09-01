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

  async function setLogo(employeur, dataUrl) {
    if (!employeur) return;
    setLogos((prev) => ({ ...prev, [employeur]: dataUrl }));
    const { error } = await supabase.from("agency_logos").upsert({
      id: `${user.id}::${employeur}`,
      user_id: user.id,
      employeur,
      data_url: dataUrl,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  async function removeLogo(employeur) {
    setLogos((prev) => {
      const next = { ...prev };
      delete next[employeur];
      return next;
    });
    await supabase.from("agency_logos").delete().eq("id", `${user.id}::${employeur}`);
  }

  return (
    <LogosContext.Provider value={{ logos, setLogo, removeLogo }}>
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
