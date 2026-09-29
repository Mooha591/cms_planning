import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";

const DistancesContext = createContext(null);

// Distances domicile ↔ CMS de l'utilisateur connecté : { [cms]: km (aller) }.
// Stockées PAR COMPTE (table user_settings), donc propres à chaque personne —
// un collègue qui habite ailleurs a ses propres distances.
export function DistancesProvider({ children }) {
  const { user } = useAuth();
  const [distances, setDistances] = useState({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("user_settings")
      .select("cms_distances")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setDistances(data.cms_distances || {});
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Enregistre (ou efface si vide) la distance aller d'un CMS.
  async function setDistance(cms, value) {
    if (!cms) return;
    const next = { ...distances };
    const raw = String(value).trim();
    if (raw === "") delete next[cms];
    else next[cms] = Number(raw);

    const { error } = await supabase.from("user_settings").upsert({
      user_id: user.id,
      cms_distances: next,
      updated_at: new Date().toISOString(),
    });
    if (error) return;
    setDistances(next);
  }

  return (
    <DistancesContext.Provider value={{ distances, setDistance }}>
      {children}
    </DistancesContext.Provider>
  );
}

export function useDistances() {
  const ctx = useContext(DistancesContext);
  if (!ctx) {
    throw new Error("useDistances doit être utilisé dans un <DistancesProvider>");
  }
  return ctx;
}
