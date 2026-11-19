import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";

const EntriesContext = createContext(null);

// Au-delà de ce délai, on cesse d'attendre Supabase et on affiche une erreur
// avec un bouton « Réessayer », plutôt que de laisser « Chargement… » tourner
// indéfiniment (ex : projet Supabase en veille, réseau coupé).
const LOAD_TIMEOUT_MS = 12000;

// Fournit la liste des journées de l'utilisateur connecté + les actions
// pour les modifier, avec persistance sur Supabase (table "entries",
// filtrée par utilisateur via Row Level Security).
export function EntriesProvider({ children }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Incrémenté par reload() pour relancer le chargement (bouton « Réessayer »).
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // Chargement des journées de l'utilisateur connecté, avec garde-fou :
  // si Supabase ne répond pas sous LOAD_TIMEOUT_MS, on sort de l'attente et
  // on expose une erreur au lieu de rester bloqué sur « Chargement… ».
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const timeout = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Délai dépassé")),
        LOAD_TIMEOUT_MS,
      );
    });

    const query = supabase
      .from("entries")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    Promise.race([query, timeout])
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) setError(fetchError.message);
        else setEntries(data ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(
          "Impossible de charger tes journées. Vérifie ta connexion, puis réessaie.",
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

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
    if (!imported || imported.length === 0) return 0;
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
      value={{ entries, loading, error, reload, upsert, remove, getById, importEntries }}
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
