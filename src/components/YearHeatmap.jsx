import { CalendarDays } from "lucide-react";
import { formatHours } from "../lib/time";

// Carte de l'année : une case par jour, teinte selon les heures
// travaillées ce jour-là (rampe séquentielle mono-teinte — quantité, pas
// d'identité à distinguer, cf. skill dataviz).
const BUCKET = [
  "bg-slate-100 dark:bg-slate-800", // 0 h
  "bg-teal-200 dark:bg-teal-900", // < 4 h
  "bg-teal-300 dark:bg-teal-700", // 4–7 h
  "bg-teal-400 dark:bg-teal-600", // 7–9 h
  "bg-teal-600 dark:bg-teal-400", // 9 h +
];

function bucketOf(h) {
  if (h <= 0) return 0;
  if (h < 4) return 1;
  if (h < 7) return 2;
  if (h < 9) return 3;
  return 4;
}

export default function YearHeatmap({ entries, year }) {
  const byDay = new Map();
  for (const e of entries) {
    if (!e.date.startsWith(`${year}-`)) continue;
    byDay.set(e.date, (byDay.get(e.date) || 0) + (Number(e.heures) || 0));
  }

  const months = Array.from({ length: 12 }, (_, m) => {
    const nbDays = new Date(year, m + 1, 0).getDate();
    const offset = (new Date(year, m, 1).getDay() + 6) % 7; // lundi = 0
    const label = new Date(year, m, 1).toLocaleDateString("fr-FR", { month: "short" });
    const days = Array.from({ length: nbDays }, (_, i) => {
      const d = String(i + 1).padStart(2, "0");
      const key = `${year}-${String(m + 1).padStart(2, "0")}-${d}`;
      return { day: i + 1, heures: byDay.get(key) || 0, key };
    });
    return { label, offset, days };
  });

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <CalendarDays size={14} /> Carte de l'année
      </h2>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {months.map((mo) => (
          <div key={mo.label}>
            <p className="mb-1 text-xs font-medium capitalize text-slate-500 dark:text-slate-400">
              {mo.label}
            </p>
            <div className="grid grid-cols-7 gap-[3px]">
              {Array.from({ length: mo.offset }).map((_, i) => (
                <span key={`o${i}`} />
              ))}
              {mo.days.map((d) => (
                <span
                  key={d.key}
                  title={`${d.day}/${mo.label} · ${d.heures > 0 ? formatHours(d.heures) : "repos"}`}
                  className={`aspect-square rounded-[2px] ${BUCKET[bucketOf(d.heures)]}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-end gap-1 text-[11px] text-slate-400 dark:text-slate-500">
        <span>moins</span>
        {BUCKET.map((c, i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-[2px] ${c}`} />
        ))}
        <span>plus</span>
      </div>
    </section>
  );
}
