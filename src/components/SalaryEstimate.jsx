import { Coins } from "lucide-react";
import { formatHours } from "../lib/time";
import { computeSalary } from "../lib/salary";
import { useSyncedLocalStorage } from "../lib/useLocalStorage";
import { useCurrency } from "../context/CurrencyContext";

const TAUX_KEY = "kyzenday:taux-horaire";
const CHARGES_KEY = "kyzenday:taux-charges";
const DEFAULT_CHARGES = "15"; // % — ordre de grandeur des cotisations salariales (ajustable)

// Estimation du salaire brut ET net, à partir d'un taux horaire et d'un
// taux de charges saisis par l'utilisateur (mémorisés sur cet appareil).
// Le taux horaire est exprimé dans la devise choisie dans Budget, pour
// que ce ne soit pas figé en CHF si l'utilisateur travaille ailleurs.
export default function SalaryEstimate({ heures }) {
  const { currency, format } = useCurrency();
  const [taux, handleTauxChange] = useSyncedLocalStorage(TAUX_KEY, "");
  const [charges, handleChargesChange] = useSyncedLocalStorage(CHARGES_KEY, DEFAULT_CHARGES);

  const { brut, net, charges: tauxCharges } = computeSalary(heures, taux, charges);

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Coins size={14} /> Estimation du salaire
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Taux horaire ({currency}/h)
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.05"
            placeholder="ex : 32.00"
            value={taux}
            onChange={(e) => handleTauxChange(e.target.value)}
            className="input"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Charges (%)
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            step="0.5"
            value={charges}
            onChange={(e) => handleChargesChange(e.target.value)}
            className="input"
          />
        </label>
      </div>

      {taux && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-center dark:bg-slate-800/60">
            <p className="text-lg font-semibold tabular-nums text-slate-700 dark:text-slate-200">
              {format(brut)}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">brut estimé</p>
          </div>
          <div className="rounded-xl bg-teal-50 px-3 py-2 text-center dark:bg-teal-950/30">
            <p className="text-lg font-semibold tabular-nums text-teal-800 dark:text-teal-400">
              {format(net)}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">net estimé</p>
          </div>
        </div>
      )}

      {taux && (
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          Estimation indicative ({formatHours(heures)} × {taux} {currency}, −
          {tauxCharges}% de charges). Le taux de charges par défaut est un
          ordre de grandeur, ajuste-le selon ta situation réelle.
        </p>
      )}
    </section>
  );
}
