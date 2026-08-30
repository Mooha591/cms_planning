import { TYPES } from "../lib/constants";

// Sélecteur segmenté du type de service (Matin / Aprem / Journée / Coupé)
export default function TypeSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {TYPES.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
              active ? t.seg : t.segIdle
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
