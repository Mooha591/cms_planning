import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";

const PlanningContext = createContext(null);

// Missions planifiées (à venir) de l'utilisateur connecté, persistées sur
// Supabase (table "planning", filtrée par utilisateur via RLS). Une fois
// une mission effectuée, on la « valide » : elle devient une journée du
// carnet (table entries) et disparaît d'ici.
export function PlanningProvider({ children }) {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("planning")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) setError(fetchError.message);
        else setShifts(data ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function upsert(shift) {
    const row = { ...shift, user_id: user.id };
    const { data, error: upsertError } = await supabase
      .from("planning")
      .upsert(row)
      .select()
      .single();
    if (upsertError) {
      setError(upsertError.message);
      throw upsertError;
    }
    setShifts((list) => {
      const i = list.findIndex((s) => s.id === data.id);
      const next = i === -1 ? [...list, data] : list.map((s) => (s.id === data.id ? data : s));
      return next.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    });
    return data;
  }

  async function remove(id) {
    const { error: deleteError } = await supabase.from("planning").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setShifts((list) => list.filter((s) => s.id !== id));
  }

  function getById(id) {
    return shifts.find((s) => s.id === id);
  }

  // Importe une liste de missions (restauration d'une sauvegarde) : fusionne
  // par id. Renvoie le nombre de missions effectivement importées.
  async function importShifts(imported) {
    if (!imported || imported.length === 0) return 0;
    const rows = imported.map((s) => ({ ...s, user_id: user.id }));
    const { data, error: importError } = await supabase
      .from("planning")
      .upsert(rows)
      .select();
    if (importError) {
      setError(importError.message);
      return 0;
    }
    setShifts((list) => {
      const next = [...list];
      for (const row of data) {
        const i = next.findIndex((s) => s.id === row.id);
        if (i === -1) next.push(row);
        else next[i] = row;
      }
      return next.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    });
    return data.length;
  }

  return (
    <PlanningContext.Provider
      value={{ shifts, loading, error, upsert, remove, getById, importShifts }}
    >
      {children}
    </PlanningContext.Provider>
  );
}

export function usePlanning() {
  const ctx = useContext(PlanningContext);
  if (!ctx) {
    throw new Error("usePlanning doit être utilisé dans un <PlanningProvider>");
  }
  return ctx;
}
