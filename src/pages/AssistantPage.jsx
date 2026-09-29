import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Send, AlertTriangle } from "lucide-react";
import { useEntries } from "../context/EntriesContext";
import { useBudget } from "../context/BudgetContext";
import { usePlanning } from "../context/PlanningContext";
import { supabase } from "../lib/supabaseClient";
import { buildAssistantContext } from "../lib/assistantContext";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SUGGESTIONS = [
  "Combien d'heures ai-je travaillé ce mois-ci ?",
  "Fais-moi le résumé de mon mois.",
  "Quels sont mes prochains jours de repos ?",
  "Combien de km ai-je fait cette année ?",
  "Quel employeur m'a fait travailler le plus ?",
];

export default function AssistantPage() {
  const { entries } = useEntries();
  const { transactions } = useBudget();
  const { shifts } = usePlanning();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  // Le contexte (données déjà calculées) est reconstruit à chaque envoi pour
  // rester à jour, mais on mémorise la fonction sur les données sources.
  const contextSource = useMemo(
    () => ({ entries, transactions, shifts }),
    [entries, transactions, shifts],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function ask(question) {
    const q = question.trim();
    if (!q || loading) return;
    setError("");
    setInput("");
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    // Une bulle assistant est-elle déjà affichée ? (dès le 1er morceau reçu)
    let started = false;
    try {
      const context = buildAssistantContext(contextSource);
      // On appelle la fonction directement (pas via functions.invoke, qui
      // attend la réponse complète) pour pouvoir lire le flux au fur et à mesure.
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token ?? "";
      const res = await fetch(`${SUPABASE_URL}/functions/v1/assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_ANON,
        },
        body: JSON.stringify({ question: q, context, history }),
      });

      if (!res.ok) {
        let msg = `Erreur de l'assistant (${res.status}).`;
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
          if (body?.detail) msg += ` — ${typeof body.detail === "string" ? body.detail.slice(0, 400) : ""}`;
        } catch {
          // corps illisible : on garde le message générique
        }
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        if (!started) {
          started = true;
          setLoading(false);
          setMessages((prev) => [...prev, { role: "assistant", text: acc }]);
        } else {
          setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", text: acc }]);
        }
      }
      if (!acc.trim()) throw new Error("L'assistant n'a pas su répondre, reformule ta question.");
    } catch (err) {
      setError(err.message || "L'assistant est indisponible, réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-[100dvh] max-w-xl flex-col px-4 pt-6">
      <header className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-white shadow-sm dark:bg-teal-700">
          <Sparkles size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-teal-900 dark:text-teal-300">
            Assistant
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Pose une question sur ton travail, ton budget, ton planning
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Salut 👋 Je réponds à partir de tes données (heures, km, budget,
              planning). Essaie une des questions ci-dessous ou écris la tienne.
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-400 dark:hover:bg-teal-900/40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                m.role === "user"
                  ? "bg-teal-700 text-white dark:bg-teal-600"
                  : "border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="sticky bottom-0 flex items-end gap-2 border-t border-slate-200 bg-white/80 py-3 backdrop-blur pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-950/80"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(input);
            }
          }}
          rows={1}
          placeholder="Écris ta question…"
          className="input max-h-32 flex-1 resize-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white transition hover:bg-teal-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-teal-600 dark:hover:bg-teal-500"
          aria-label="Envoyer"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
