import { PAUSE_CHIPS } from "../lib/constants";
import { formatDuree } from "../lib/time";

// Sélecteur rapide de la pause du midi (chips + saisie libre en minutes)
export default function PauseSelector({ value, onChange }) {
  const current = value === "" || value === undefined ? null : Number(value);
  const isChip = PAUSE_CHIPS.includes(current);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PAUSE_CHIPS.map((min) => {
          const active = isChip && current === min;
          return (
            <button
              key={min}
              type="button"
              onClick={() => onChange(String(min))}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "border-teal-700 bg-teal-700 text-white dark:border-teal-600 dark:bg-teal-600"
                  : "border-slate-200 bg-white text-slate-600 hover:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-600"
              }`}
            >
              {min === 0 ? "Sans pause" : formatDuree(min)}
            </button>
          );
        })}
      </div>

      <input
        type="number"
        inputMode="numeric"
        min="0"
        placeholder="Autre durée (min)"
        value={isChip ? "" : (value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className="input mt-2"
      />
    </div>
  );
}
