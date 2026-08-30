import { TrendingUp } from "lucide-react";
import { lastMonths, monthKeyOf, formatHours } from "../lib/time";
import TrendChart from "./charts/TrendChart";

// Évolution des heures et des kilomètres sur les 6 derniers mois calendaires
// (mois sans saisie inclus, à 0). Deux graphiques séparés : heures et
// kilomètres n'ont pas la même échelle (jamais de double axe).
export default function MonthlyTrends({ entries }) {
  const months = lastMonths(6);

  const points = months.map((m) => {
    const key = monthKeyOf(m);
    const monthEntries = entries.filter((e) => e.date.startsWith(key));
    const heures = monthEntries.reduce((s, e) => s + (Number(e.heures) || 0), 0);
    const km = monthEntries.reduce((s, e) => s + (Number(e.km) || 0), 0);
    return {
      label: m.toLocaleDateString("fr-FR", { month: "short" }),
      heures: Math.round(heures * 100) / 100,
      km,
    };
  });

  const hasAnyData = points.some((p) => p.heures > 0 || p.km > 0);
  if (!hasAnyData) return null;

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <TrendingUp size={14} /> Évolution (6 derniers mois)
      </h2>

      <div className="space-y-6">
        <div>
          <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Heures
          </p>
          <TrendChart
            points={points.map((p) => ({ label: p.label, value: p.heures }))}
            formatValue={formatHours}
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Kilomètres
          </p>
          <TrendChart
            points={points.map((p) => ({ label: p.label, value: p.km }))}
            formatValue={(v) => `${v.toLocaleString("fr-FR")} km`}
          />
        </div>
      </div>
    </section>
  );
}
