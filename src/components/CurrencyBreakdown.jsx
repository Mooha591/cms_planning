import { Coins } from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";

const formatterCache = new Map();
function formatIn(code, amount) {
  if (!formatterCache.has(code)) {
    formatterCache.set(
      code,
      new Intl.NumberFormat("fr-FR", { style: "currency", currency: code }),
    );
  }
  return formatterCache.get(code).format(amount);
}

// Récap par devise : combien a réellement été dépensé/gagné dans chaque
// devise (sans conversion — c'est l'argent qui a vraiment bougé sur
// chaque compte), plus un total converti en EUR et en CHF pour comparer.
export default function CurrencyBreakdown({ transactions }) {
  const { convertTo, ratesLoading, ratesError } = useCurrency();

  if (transactions.length === 0) return null;

  const byCurrency = new Map();
  for (const t of transactions) {
    const code = t.currency || "EUR";
    const acc = byCurrency.get(code) || { revenus: 0, depenses: 0 };
    const montant = Number(t.montant) || 0;
    if (t.type === "revenu") acc.revenus += montant;
    else acc.depenses += montant;
    byCurrency.set(code, acc);
  }

  // Rien d'intéressant à montrer si tout est dans une seule devise
  if (byCurrency.size <= 1) return null;

  const rows = [...byCurrency.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const totalEUR = rows.reduce(
    (sum, [code, v]) =>
      sum + convertTo(v.revenus - v.depenses, code, "EUR"),
    0,
  );
  const totalCHF = rows.reduce(
    (sum, [code, v]) =>
      sum + convertTo(v.revenus - v.depenses, code, "CHF"),
    0,
  );

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Coins size={14} /> Par devise
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <th className="pb-1.5 font-medium">Devise</th>
              <th className="pb-1.5 text-right font-medium">Revenus</th>
              <th className="pb-1.5 text-right font-medium">Dépenses</th>
              <th className="pb-1.5 text-right font-medium">Solde</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([code, v]) => (
              <tr
                key={code}
                className="border-t border-slate-100 dark:border-slate-800"
              >
                <td className="py-1.5 font-semibold text-slate-700 dark:text-slate-200">
                  {code}
                </td>
                <td className="py-1.5 text-right tabular-nums text-teal-700 dark:text-teal-400">
                  {formatIn(code, v.revenus)}
                </td>
                <td className="py-1.5 text-right tabular-nums text-rose-600 dark:text-rose-400">
                  {formatIn(code, v.depenses)}
                </td>
                <td className="py-1.5 text-right font-medium tabular-nums text-slate-700 dark:text-slate-200">
                  {formatIn(code, v.revenus - v.depenses)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
        <span className="font-medium text-slate-500 dark:text-slate-400">
          Total converti
        </span>
        {ratesLoading ? (
          <span className="text-slate-400 dark:text-slate-500">…</span>
        ) : ratesError ? (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            Taux indisponibles
          </span>
        ) : (
          <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
            {formatIn("EUR", totalEUR)} · {formatIn("CHF", totalCHF)}
          </span>
        )}
      </div>
    </section>
  );
}
