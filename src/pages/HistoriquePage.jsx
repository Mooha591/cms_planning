import { useMemo, useState } from "react";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  Car,
  CalendarDays,
  Trophy,
} from "lucide-react";
import { useEntries } from "../context/EntriesContext";
import Stat from "../components/Stat";
import SecteurBreakdown from "../components/SecteurBreakdown";
import EmployeurBreakdown from "../components/EmployeurBreakdown";
import SalaryEstimate from "../components/SalaryEstimate";
import KmEstimate from "../components/KmEstimate";
import YearHeatmap from "../components/YearHeatmap";
import { computeMinutes, formatHours } from "../lib/time";

const MOIS_INIT = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MOIS_LONG = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

// Onglet Année : bilan d'une année civile — totaux, évolution mois par
// mois, carte de l'année, records, répartitions.
export default function HistoriquePage() {
  const { entries, loading } = useEntries();
  const nowYear = new Date().getFullYear();
  const [year, setYear] = useState(nowYear);

  const yearEntries = useMemo(
    () => entries.filter((e) => e.date.startsWith(`${year}-`)),
    [entries, year],
  );

  const stats = useMemo(() => {
    const monthly = Array(12).fill(0);
    const monthlyKm = Array(12).fill(0);
    let heures = 0;
    let minutes = 0;
    let km = 0;
    const jours = new Set();
    let longestDay = { heures: 0, date: null };
    for (const e of yearEntries) {
      const h = Number(e.heures) || 0;
      const k = Number(e.km) || 0;
      const m = Number(e.date.slice(5, 7)) - 1;
      heures += h;
      minutes += computeMinutes(e);
      km += k;
      jours.add(e.date);
      monthly[m] += h;
      monthlyKm[m] += k;
      if (h > longestDay.heures) longestDay = { heures: h, date: e.date };
    }
    const topMonthIdx = monthly.indexOf(Math.max(...monthly));
    return {
      monthly,
      monthlyKm,
      heures,
      minutes,
      km,
      jours: jours.size,
      longestDay,
      topMonthIdx: monthly[topMonthIdx] > 0 ? topMonthIdx : -1,
      moyenne: jours.size ? heures / jours.size : 0,
    };
  }, [yearEntries]);

  const maxMonth = Math.max(...stats.monthly, 1);
  const maxMonthKm = Math.max(...stats.monthlyKm, 1);
  const hasData = yearEntries.length > 0;

  return (
    <div className="mx-auto max-w-xl px-4 pb-36 pt-6">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-white shadow-sm dark:bg-teal-700">
          <CalendarRange size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-teal-900 dark:text-teal-300">
            Année
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Bilan et historique par année
          </p>
        </div>
      </header>

      {/* Bandeau année + totaux */}
      <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 to-teal-900 text-white shadow-md shadow-teal-900/15">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="rounded-lg p-1.5 text-teal-100 transition hover:bg-white/10 hover:text-white"
            aria-label="Année précédente"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-medium tracking-wide">{year}</span>
          <button
            onClick={() => setYear((y) => Math.min(nowYear, y + 1))}
            disabled={year >= nowYear}
            className="rounded-lg p-1.5 text-teal-100 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
            aria-label="Année suivante"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10">
          <Stat icon={<Car size={16} />} value={stats.km.toLocaleString("fr-FR")} unit="km" label="Kilomètres" />
          <Stat icon={<Clock size={16} />} value={formatHours(stats.heures)} label="Heures" />
          <Stat
            icon={<CalendarDays size={16} />}
            value={stats.jours}
            label={stats.jours > 1 ? "Jours" : "Jour"}
          />
        </div>
      </section>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">Chargement…</p>
      ) : !hasData ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
          Aucune journée enregistrée en {year}.
        </div>
      ) : (
        <>
          {/* Évolution mois par mois */}
          <section className="mb-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Heures par mois
              </h2>
              <div className="flex h-28 items-end gap-1.5">
                {stats.monthly.map((h, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        title={`${MOIS_LONG[i]} : ${formatHours(h)}`}
                        className="w-full rounded-t bg-teal-500 transition-all dark:bg-teal-400"
                        style={{ height: `${Math.max((h / maxMonth) * 100, h > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {MOIS_INIT[i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-3 flex items-center justify-between text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <span>Kilomètres par mois</span>
                <span className="font-normal normal-case tabular-nums text-slate-400 dark:text-slate-500">
                  {stats.km.toLocaleString("fr-FR")} km sur l'année
                </span>
              </h2>
              <div className="flex h-28 items-end gap-1.5">
                {stats.monthlyKm.map((k, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        title={`${MOIS_LONG[i]} : ${k.toLocaleString("fr-FR")} km`}
                        className="w-full rounded-t bg-sky-500 transition-all dark:bg-sky-400"
                        style={{ height: `${Math.max((k / maxMonthKm) * 100, k > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {MOIS_INIT[i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <YearHeatmap entries={entries} year={year} />

          {/* Records */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Trophy size={14} /> Records {year}
            </h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Mois le plus chargé</span>
                <span className="font-semibold capitalize text-slate-800 dark:text-slate-100">
                  {stats.topMonthIdx >= 0
                    ? `${MOIS_LONG[stats.topMonthIdx]} · ${formatHours(stats.monthly[stats.topMonthIdx])}`
                    : "—"}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Journée la plus longue</span>
                <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {stats.longestDay.date
                    ? `${formatHours(stats.longestDay.heures)} (${stats.longestDay.date.slice(8)}/${stats.longestDay.date.slice(5, 7)})`
                    : "—"}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Moyenne par jour travaillé</span>
                <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {formatHours(stats.moyenne)}
                </span>
              </li>
            </ul>
          </section>

          <SecteurBreakdown entries={yearEntries} />
          <EmployeurBreakdown entries={yearEntries} />
          <SalaryEstimate heures={stats.minutes / 60} />
          <KmEstimate km={stats.km} />
        </>
      )}
    </div>
  );
}
