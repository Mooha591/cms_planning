import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Wallet } from "lucide-react";
import { useBudget } from "../context/BudgetContext";
import { CURRENCIES, useCurrency } from "../context/CurrencyContext";
import BudgetSummary from "../components/BudgetSummary";
import CurrencyBreakdown from "../components/CurrencyBreakdown";
import TransactionCard from "../components/TransactionCard";
import { monthKeyOf } from "../lib/time";

// Page Budget : récap du mois (revenus/dépenses/solde) + liste des transactions
export default function BudgetPage() {
  const { transactions, loading, remove } = useBudget();
  const { currency, setCurrency, toDisplay, ratesError } = useCurrency();
  const navigate = useNavigate();

  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const monthKey = monthKeyOf(viewMonth);

  const monthTransactions = useMemo(
    () =>
      transactions
        .filter((t) => t.date.startsWith(monthKey))
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [transactions, monthKey],
  );

  // Chaque transaction garde sa devise d'origine ; on convertit vers la
  // devise d'affichage choisie avant de sommer, sinon additionner des
  // EUR et des CHF tels quels n'aurait aucun sens.
  const totals = useMemo(
    () =>
      monthTransactions.reduce(
        (acc, t) => {
          const montant = toDisplay(t.montant, t.currency || "EUR");
          if (t.type === "revenu") acc.revenus += montant;
          else acc.depenses += montant;
          acc.solde = acc.revenus - acc.depenses;
          return acc;
        },
        { revenus: 0, depenses: 0, solde: 0 },
      ),
    [monthTransactions, toDisplay],
  );

  const monthLabel = viewMonth.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  function changeMonth(delta) {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-36 pt-6">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-white shadow-sm dark:bg-teal-700">
          <Wallet size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-teal-900 dark:text-teal-300">
            Budget
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Revenus & dépenses du mois
          </p>
        </div>
        <label className="shrink-0">
          <span className="sr-only">Devise</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code}
              </option>
            ))}
          </select>
        </label>
      </header>

      {ratesError && (
        <p className="mb-4 text-xs text-amber-600 dark:text-amber-400">
          Taux de change indisponibles ({ratesError}) : montants affichés
          sans conversion pour l'instant.
        </p>
      )}

      <BudgetSummary
        monthLabel={monthLabel}
        totals={totals}
        onPrev={() => changeMonth(-1)}
        onNext={() => changeMonth(1)}
      />

      <CurrencyBreakdown transactions={monthTransactions} />

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Transactions du mois
        </h2>

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
            Chargement…
          </p>
        ) : monthTransactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aucune transaction enregistrée pour ce mois.
            </p>
            <button
              onClick={() => navigate("/budget/nouveau")}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
            >
              <Plus size={16} /> Ajouter une transaction
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {monthTransactions.map((t) => (
              <TransactionCard
                key={t.id}
                transaction={t}
                onEdit={(id) => navigate(`/budget/modifier/${id}`)}
                onDelete={remove}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Bouton flottant : nouvelle transaction (au-dessus de la barre du bas) */}
      <button
        onClick={() => navigate("/budget/nouveau")}
        className="fixed bottom-20 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-teal-700 px-5 py-3 font-medium text-white shadow-lg shadow-teal-900/20 transition hover:bg-teal-800 hover:shadow-xl active:scale-95 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        <Plus size={18} /> Nouvelle transaction
      </button>
    </div>
  );
}
