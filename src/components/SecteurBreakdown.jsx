import { useState } from "react";
import { Building2 } from "lucide-react";
import { countUniqueDays, formatHours } from "../lib/time";
import { useTheme } from "../context/ThemeContext";
import { CHART_COLOR } from "../lib/chartColor";

// Répartition des heures du mois par secteur, en barres horizontales.
// Comparaison de magnitude sur des catégories nominales : une seule teinte
// (pas d'identité à coder par couleur), triée décroissant, valeur en bout
// de barre. Cf. skill dataviz.
export default function SecteurBreakdown({ entries }) {
  const { theme } = useTheme();
  const color = theme === "dark" ? CHART_COLOR.dark : CHART_COLOR.light;
  const [active, setActive] = useState(null);

  if (entries.length === 0) return null;

  // Un jour est compté une seule fois même s'il a plusieurs saisies —
  // cf. countUniqueDays.
  const bySecteur = new Map();
  const entriesBySecteur = new Map();
  for (const e of entries) {
    const key = e.secteur || "Non défini";
    const acc = bySecteur.get(key) || { heures: 0, km: 0 };
    acc.heures += Number(e.heures) || 0;
    acc.km += Number(e.km) || 0;
    bySecteur.set(key, acc);
    const list = entriesBySecteur.get(key) || [];
    list.push(e);
    entriesBySecteur.set(key, list);
  }
  for (const [key, acc] of bySecteur) {
    acc.jours = countUniqueDays(entriesBySecteur.get(key));
  }

  const rows = [...bySecteur.entries()].sort((a, b) => b[1].heures - a[1].heures);

  // Rien d'intéressant à montrer si tout est dans un seul secteur
  if (rows.length <= 1) return null;

  const max = Math.max(...rows.map(([, t]) => t.heures), 1);

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Building2 size={14} /> Répartition par secteur
      </h2>
      <ul className="space-y-3">
        {rows.map(([secteur, t]) => {
          const pct = (t.heures / max) * 100;
          const isActive = active === secteur;
          return (
            <li key={secteur}>
              <button
                type="button"
                onFocus={() => setActive(secteur)}
                onBlur={() => setActive(null)}
                onMouseEnter={() => setActive(secteur)}
                onMouseLeave={() => setActive(null)}
                aria-label={`${secteur} : ${formatHours(t.heures)}, ${t.jours} jour${
                  t.jours > 1 ? "s" : ""
                }, ${t.km.toLocaleString("fr-FR")} km`}
                className="block w-full rounded text-left"
              >
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">
                    {secteur}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                    {formatHours(t.heures)}
                  </span>
                </div>
                <div className="h-6 w-full overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-6 transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: color,
                      opacity: isActive ? 1 : 0.85,
                      borderRadius: "0 4px 4px 0",
                    }}
                  />
                </div>
                <p
                  className={`mt-1 text-xs text-slate-400 transition-opacity dark:text-slate-500 ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {t.jours} jour{t.jours > 1 ? "s" : ""} ·{" "}
                  {t.km.toLocaleString("fr-FR")} km
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
