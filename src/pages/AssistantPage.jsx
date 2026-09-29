import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { useEntries } from "../context/EntriesContext";
import { useBudget } from "../context/BudgetContext";
import { usePlanning } from "../context/PlanningContext";
import { answerQuestion } from "../lib/localAssistant";

// Assistant 100% local : les réponses sont calculées dans l'app à partir des
// données (heures, budget, planning) — aucun appel réseau, aucune IA externe.
// Instantané, gratuit, illimité, fonctionne hors-ligne.
export default function AssistantPage() {
  const { entries } = useEntries();
  const { transactions } = useBudget();
  const { shifts } = usePlanning();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  function ask(question) {
    const q = question.trim();
    if (!q) return;
    setInput("");
    const reponse = answerQuestion(q, { entries, transactions, shifts });
    setMessages((prev) => [
      ...prev,
      { role: "user", text: q },
      { role: "assistant", text: reponse },
    ]);
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

      <div className="flex-1 space-y-3 pb-4">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Salut 👋 Je réponds instantanément à partir de tes données (heures,
            km, budget, planning), même hors-ligne. Écris ta question.
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
          disabled={!input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white transition hover:bg-teal-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-teal-600 dark:hover:bg-teal-500"
          aria-label="Envoyer"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
