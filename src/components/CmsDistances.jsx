import { useMemo, useState } from "react";
import { Home } from "lucide-react";
import { computeCommute, readDistances, writeDistances } from "../lib/commute";

// Tableau des trajets domicile ↔ CMS de l'année : l'utilisateur saisit la
// distance ALLER de chaque CMS, on affiche les jours travaillés et le total
// aller-retour — utile pour les km déductibles aux impôts. La distance est
// mémorisée sur l'appareil (par nom de CMS).
export default function CmsDistances({ entries }) {
  const [distances, setDistances] = useState(readDistances);
  const { perCms, totalKm } = useMemo(
    () => computeCommute(entries, distances),
    [entries, distances],
  );

  if (perCms.length === 0) return null;

  function setDist(cms, value) {
    setDistances((d) => {
      const next = { ...d, [cms]: value };
      writeDistances(next);
      return next;
    });
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Home size={14} /> Trajets domicile ↔ CMS
      </h2>
      <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
        Saisis la distance aller (domicile → CMS). Le total compte un
        aller-retour par jour travaillé.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <th className="pb-1.5 pr-2 font-medium">CMS</th>
              <th className="pb-1.5 pr-2 text-right font-medium">Jours</th>
              <th className="pb-1.5 pr-2 text-right font-medium">Aller (km)</th>
              <th className="pb-1.5 text-right font-medium">Total A/R</th>
            </tr>
          </thead>
          <tbody>
            {perCms.map((r) => (
              <tr key={r.cms} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1.5 pr-2 font-semibold text-slate-700 dark:text-slate-200">
                  {r.cms}
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                  {r.jours}
                </td>
                <td className="py-1.5 pr-2 text-right">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    placeholder="—"
                    value={distances[r.cms] ?? ""}
                    onChange={(e) => setDist(r.cms, e.target.value)}
                    className="input h-7 w-16 px-1.5 text-right text-xs"
                  />
                </td>
                <td className="py-1.5 text-right font-medium tabular-nums text-teal-700 dark:text-teal-400">
                  {r.kmTotal > 0 ? `${r.kmTotal.toLocaleString("fr-FR")} km` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 dark:border-slate-700">
              <td className="pt-2 font-semibold text-slate-700 dark:text-slate-200" colSpan={3}>
                Total déductible (km)
              </td>
              <td className="pt-2 text-right font-bold tabular-nums text-teal-800 dark:text-teal-300">
                {totalKm.toLocaleString("fr-FR")} km
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
        Total indicatif de kilomètres. Applique ton propre barème kilométrique
        pour la déduction — les règles fiscales ne sont pas calculées ici.
      </p>
    </section>
  );
}
