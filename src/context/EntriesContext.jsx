import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";

const EntriesContext = createContext(null);

// Fournit la liste des journées de l'utilisateur connecté + les actions
// pour les modifier, avec persistance sur Supabase (table "entries",
// filtrée par utilisateur via Row Level Security).
export function EntriesProvider({ children }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chargement initial des journées de l'utilisateur connecté
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("entries")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) setError(fetchError.message);
        else setEntries(data ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Ajoute une nouvelle journée ou met à jour une journée existante (même id)
  async function upsert(entry) {
    const row = { ...entry, user_id: user.id };
    const { data, error: upsertError } = await supabase
      .from("entries")
      .upsert(row)
      .select()
      .single();
    if (upsertError) {
      setError(upsertError.message);
      throw upsertError;
    }
    setEntries((list) => {
      const i = list.findIndex((e) => e.id === data.id);
      if (i === -1) return [data, ...list];
      const next = [...list];
      next[i] = data;
      return next;
    });
    return data;
  }

  // Supprime une journée
  async function remove(id) {
    const { error: deleteError } = await supabase
      .from("entries")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setEntries((list) => list.filter((e) => e.id !== id));
  }

  // Récupère une journée par son id
  function getById(id) {
    return entries.find((e) => e.id === id);
  }

  // Importe une liste de journées (restauration d'une sauvegarde, ou
  // migration des anciennes données locales) : fusionne par id.
  // Renvoie le nombre de journées effectivement importées.
  async function importEntries(imported) {
    const rows = imported.map((e) => ({ ...e, user_id: user.id }));
    const { data, error: importError } = await supabase
      .from("entries")
      .upsert(rows)
      .select();
    if (importError) {
      setError(importError.message);
      return 0;
    }
    setEntries((list) => {
      const next = [...list];
      for (const row of data) {
        const i = next.findIndex((e) => e.id === row.id);
        if (i === -1) next.push(row);
        else next[i] = row;
      }
      return next;
    });
    return data.length;
  }

  return (
    <EntriesContext.Provider
      value={{ entries, loading, error, upsert, remove, getById, importEntries }}
    >
      {children}
    </EntriesContext.Provider>
  );
}

// Hook d'accès au contexte des journées
export function useEntries() {
  const ctx = useContext(EntriesContext);
  if (!ctx) {
    throw new Error("useEntries doit être utilisé dans un <EntriesProvider>");
  }
  return ctx;
}
