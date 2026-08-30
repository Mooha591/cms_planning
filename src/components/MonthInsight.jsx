import { Sparkles } from "lucide-react";
import { monthKeyOf, formatHours } from "../lib/time";

// Résumé généré automatiquement : compare le mois affiché au mois
// précédent et met en avant le secteur principal.
export default function MonthInsight({ entries, monthEntries, viewMonth, totals }) {
  if (monthEntries.length === 0) return null;

  const prevMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
  const prevKey = monthKeyOf(prevMonth);
  const prevEntries = entries.filter((e) => e.date.startsWith(prevKey));
  const prevHeures = prevEntries.reduce((s, e) => s + (Number(e.heures) || 0), 0);

  let evolution = null;
  if (prevHeures > 0) {
    const pct = Math.round(((totals.heures - prevHeures) / prevHeures) * 100);
    if (pct !== 0) {
      const label = prevMonth.toLocaleDateString("fr-FR", { month: "long" });
      evolution = `${pct > 0 ? "en hausse" : "en baisse"} de ${Math.abs(pct)}% par rapport à ${label}`;
    }
  }

  const bySecteur = new Map();
  for (const e of monthEntries) {
    const key = e.secteur || "Non défini";
    bySecteur.set(key, (bySecteur.get(key) || 0) + (Number(e.heures) || 0));
  }
  const top = [...bySecteur.entries()].sort((a, b) => b[1] - a[1])[0];
  const topSecteur =
    top && bySecteur.size > 1 ? `Secteur principal : ${top[0]} (${formatHours(top[1])}).` : null;

  return (
    <div className="mb-6 flex items-start gap-2 rounded-2xl bg-teal-50 p-3 text-sm text-teal-800 dark:bg-teal-950/30 dark:text-teal-300">
      <Sparkles size={16} className="mt-0.5 shrink-0" />
      <p>
        Ce mois-ci : <strong>{formatHours(totals.heures)}</strong> et{" "}
        <strong>{totals.km.toLocaleString("fr-FR")} km</strong>
        {evolution ? `, ${evolution}` : ""}. {topSecteur}
      </p>
    </div>
  );
}
