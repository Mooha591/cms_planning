import { todayISO } from "../lib/time";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Grille du mois : un point sous chaque jour où une journée est enregistrée.
// Cliquer un jour le sélectionne (le détail s'affiche juste en dessous) —
// évite de faire défiler toute la liste pour retrouver une journée précise.
export default function MonthCalendar({ viewMonth, entriesByDate, selectedDate, onSelectDate }) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = lundi
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayISO();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <span key={`blank-${i}`} />;
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const worked = entriesByDate.has(iso);
          const isToday = iso === today;
          const isSelected = iso === selectedDate;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate(isSelected ? null : iso)}
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-sm tabular-nums transition ${
                isSelected
                  ? "bg-teal-700 text-white dark:bg-teal-600"
                  : isToday
                    ? "text-teal-800 ring-1 ring-inset ring-teal-500 dark:text-teal-300"
                    : worked
                      ? "text-slate-700 hover:bg-teal-50 dark:text-slate-200 dark:hover:bg-teal-950/30"
                      : "text-slate-400 hover:bg-slate-50 dark:text-slate-600 dark:hover:bg-slate-800/60"
              }`}
            >
              {d}
              <span
                className={`h-1 w-1 rounded-full ${
                  worked ? (isSelected ? "bg-white" : "bg-teal-600 dark:bg-teal-400") : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
