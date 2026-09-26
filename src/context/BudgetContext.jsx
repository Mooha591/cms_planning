import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";

const BudgetContext = createContext(null);

// Fournit les transactions (revenus/dépenses) de l'utilisateur connecté,
// persistées sur Supabase (table "budget_transactions", RLS par utilisateur).
export function BudgetProvider({ children }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("budget_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) setError(fetchError.message);
        else setTransactions(data ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function upsert(transaction) {
    const row = { ...transaction, user_id: user.id };
    const { data, error: upsertError } = await supabase
      .from("budget_transactions")
      .upsert(row)
      .select()
      .single();
    if (upsertError) {
      setError(upsertError.message);
      throw upsertError;
    }
    setTransactions((list) => {
      const i = list.findIndex((t) => t.id === data.id);
      if (i === -1) return [data, ...list];
      const next = [...list];
      next[i] = data;
      return next;
    });
    return data;
  }

  async function remove(id) {
    const { error: deleteError } = await supabase
      .from("budget_transactions")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setTransactions((list) => list.filter((t) => t.id !== id));
  }

  function getById(id) {
    return transactions.find((t) => t.id === id);
  }

  // Importe une liste de transactions (restauration d'une sauvegarde) :
  // fusionne par id. Renvoie le nombre de transactions effectivement importées.
  async function importTransactions(imported) {
    if (!imported || imported.length === 0) return 0;
    const rows = imported.map((t) => ({ ...t, user_id: user.id }));
    const { data, error: importError } = await supabase
      .from("budget_transactions")
      .upsert(rows)
      .select();
    if (importError) {
      setError(importError.message);
      return 0;
    }
    setTransactions((list) => {
      const next = [...list];
      for (const row of data) {
        const i = next.findIndex((t) => t.id === row.id);
        if (i === -1) next.push(row);
        else next[i] = row;
      }
      return next;
    });
    return data.length;
  }

  return (
    <BudgetContext.Provider
      value={{ transactions, loading, error, upsert, remove, getById, importTransactions }}
    >
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) {
    throw new Error("useBudget doit être utilisé dans un <BudgetProvider>");
  }
  return ctx;
}
