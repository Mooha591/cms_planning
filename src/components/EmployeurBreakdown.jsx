import { useState } from "react";
import { Briefcase } from "lucide-react";
import { formatHours } from "../lib/time";
import { useCurrency } from "../context/CurrencyContext";
import AgencyLogo from "./AgencyLogo";

const RATES_KEY = "kyzenday:taux-par-employeur";
const CHARGES_KEY = "kyzenday:taux-charges";
const DEFAULT_CHARGES = "15";

function readRates() {
  try {
    return JSON.parse(localStorage.getItem(RATES_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeRates(rates) {
  try {
    localStorage.setItem(RATES_KEY, JSON.stringify(rates));
  } catch {
    // stockage indisponible : les taux ne seront juste pas mémorisés
  }
}

// Tableau des heures/km/paie du mois, par employeur / agence — un taux
// horaire propre à chaque agence (elles paient rarement le même tarif)
// permet d'estimer la paie brute/nette de chacune.
export default function EmployeurBreakdown({ entries }) {
  const { format } = useCurrency();
  const [rates, setRates] = useState(readRates);
  const [charges] = useState(() => Number(localStorage.getItem(CHARGES_KEY)) || Number(DEFAULT_CHARGES));

  const byEmployeur = new Map();
  for (const e of entries) {
    if (!e.employeur) continue;
    const acc = byEmployeur.get(e.employeur) || { heures: 0, km: 0, jours: 0 };
    acc.heures += Number(e.heures) || 0;
    acc.km += Number(e.km) || 0;
    acc.jours += 1;
    byEmployeur.set(e.employeur, acc);
  }

  // Rien à montrer si aucune journée n'a d'employeur renseigné
  if (byEmployeur.size === 0) return null;

  const rows = [...byEmployeur.entries()].sort((a, b) => b[1].heures - a[1].heures);

  function setRate(employeur, value) {
    setRates((r) => {
      const next = { ...r, [employeur]: value };
      writeRates(next);
      return next;
    });
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Briefcase size={14} /> Par employeur
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <th className="pb-1.5 pr-2 font-medium">Employeur</th>
              <th className="pb-1.5 pr-2 text-right font-medium">Jours</th>
              <th className="pb-1.5 pr-2 text-right font-medium">Heures</th>
              <th className="pb-1.5 pr-2 text-right font-medium">Km</th>
              <th className="pb-1.5 pr-2 text-right font-medium">Taux/h</th>
              <th className="pb-1.5 text-right font-medium">Brut · Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([employeur, t]) => {
              const taux = rates[employeur] ?? "";
              const brut = (Number(taux) || 0) * t.heures;
              const net = brut * (1 - charges / 100);
              return (
                <tr key={employeur} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <AgencyLogo employeur={employeur} size={16} />
                      <span className="min-w-0 truncate font-semibold text-slate-700 dark:text-slate-200">
                        {employeur}
                      </span>
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {t.jours}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-medium tabular-nums text-teal-700 dark:text-teal-400">
                    {formatHours(t.heures)}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {t.km.toLocaleString("fr-FR")}
                  </td>
                  <td className="py-1.5 pr-2 text-right">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.05"
                      placeholder="—"
                      value={taux}
                      onChange={(e) => setRate(employeur, e.target.value)}
                      className="input h-7 w-16 px-1.5 text-right text-xs"
                    />
                  </td>
                  <td className="py-1.5 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {taux ? (
                      <>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {format(brut)}
                        </span>{" "}
                        ·{" "}
                        <span className="font-semibold text-teal-700 dark:text-teal-400">
                          {format(net)}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
