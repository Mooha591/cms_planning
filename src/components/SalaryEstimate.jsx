import { useState } from "react";
import { Coins } from "lucide-react";
import { formatHours } from "../lib/time";

const STORAGE_KEY = "kyzenday:taux-horaire";

const eurFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

// Estimation du salaire brut du mois à partir d'un taux horaire saisi par
// l'utilisateur (mémorisé sur cet appareil).
export default function SalaryEstimate({ heures }) {
  const [taux, setTaux] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });

  function handleChange(v) {
    setTaux(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      // stockage indisponible : la valeur ne sera juste pas mémorisée
    }
  }

  const brut = (Number(taux) || 0) * heures;

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Coins size={14} /> Estimation du salaire
      </h2>
      <div className="flex items-center gap-3">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Taux horaire (€/h)
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="ex : 13.50"
            value={taux}
            onChange={(e) => handleChange(e.target.value)}
            className="input"
          />
        </label>
        <div className="pt-5 text-right">
          <p className="text-lg font-semibold tabular-nums text-teal-800 dark:text-teal-400">
            {taux ? eurFormatter.format(brut) : "—"}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">brut estimé</p>
        </div>
      </div>
      {taux && (
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          Estimation indicative ({formatHours(heures)} × {taux} €), hors
          charges et cotisations.
        </p>
      )}
    </section>
  );
}
