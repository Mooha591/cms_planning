import { Car } from "lucide-react";
import { useSyncedLocalStorage } from "../lib/useLocalStorage";

const STORAGE_KEY = "kyzenday:taux-km";
// Taux kilométrique usuel en Suisse : CHF 0.70 / km
const DEFAULT_TAUX = "0.70";

const chfFormatter = new Intl.NumberFormat("fr-CH", {
  style: "currency",
  currency: "CHF",
  maximumFractionDigits: 2,
});

// Estimation de l'indemnité kilométrique à partir d'un taux au km saisi
// par l'utilisateur (mémorisé sur cet appareil), même principe que
// <SalaryEstimate />. Pré-rempli à 0.70 (barème suisse).
export default function KmEstimate({ km }) {
  const [taux, handleChange] = useSyncedLocalStorage(STORAGE_KEY, DEFAULT_TAUX);

  const total = (Number(taux) || 0) * (Number(km) || 0);

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Car size={14} /> Indemnité kilométrique
      </h2>
      <div className="flex items-center gap-3">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Taux au km (CHF/km)
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.05"
            placeholder="ex : 0.70"
            value={taux}
            onChange={(e) => handleChange(e.target.value)}
            className="input"
          />
        </label>
        <div className="pt-5 text-right">
          <p className="text-lg font-semibold tabular-nums text-teal-800 dark:text-teal-400">
            {taux ? chfFormatter.format(total) : "—"}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">indemnité estimée</p>
        </div>
      </div>
      {taux && (
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          Estimation indicative ({(Number(km) || 0).toLocaleString("fr-CH")} km × {taux} CHF —
          barème usuel : 0.70).
        </p>
      )}
    </section>
  );
}
