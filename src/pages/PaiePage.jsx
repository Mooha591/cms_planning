import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Coins,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEntries } from "../context/EntriesContext";
import { formatHours, monthKeyOf } from "../lib/time";
import { chf, defaultKmRate, loadRates, loadRecu, saveRates, saveRecu } from "../lib/paie";

// Paie par employeur : pour le mois affiché, ce que chaque agence te
// doit (heures × taux horaire + km × taux km) comparé à ce que tu as
// réellement reçu. Taux et montants reçus mémorisés sur l'appareil.
export default function PaiePage() {
  const { entries } = useEntries();
  const navigate = useNavigate();

  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const monthKey = monthKeyOf(viewMonth);
  const monthLabel = viewMonth.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const [rates, setRates] = useState(loadRates);
  const [recu, setRecu] = useState(loadRecu);
  const kmDefault = defaultKmRate();

  function setRate(emp, field, value) {
    setRates((prev) => {
      const next = { ...prev, [emp]: { ...prev[emp], [field]: value } };
      saveRates(next);
      return next;
    });
  }

  function setRecuValue(emp, value) {
    setRecu((prev) => {
      const month = { ...prev[monthKey], [emp]: value };
      const next = { ...prev, [monthKey]: month };
      saveRecu(next);
      return next;
    });
  }

  const rows = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      if (!e.date.startsWith(monthKey)) continue;
      const key = e.employeur || "";
      const acc = map.get(key) || { heures: 0, km: 0, jours: 0 };
      acc.heures += Number(e.heures) || 0;
      acc.km += Number(e.km) || 0;
      acc.jours += 1;
      map.set(key, acc);
    }
    return [...map.entries()]
      .map(([emp, t]) => {
        const r = rates[emp] || {};
        const tauxH = Number(r.h) || 0;
        const tauxKm = r.km != null && r.km !== "" ? Number(r.km) : kmDefault;
        const du = t.heures * tauxH + t.km * tauxKm;
        const recuRaw = recu[monthKey]?.[emp];
        const hasRecu = recuRaw != null && recuRaw !== "";
        const recuVal = Number(recuRaw) || 0;
        return { emp, ...t, tauxH, tauxKm, du, hasRecu, recuVal, ecart: recuVal - du };
      })
      .sort((a, b) => b.heures - a.heures);
  }, [entries, monthKey, rates, recu, kmDefault]);

  const totals = rows.reduce(
    (acc, r) => {
      acc.du += r.du;
      acc.recu += r.hasRecu ? r.recuVal : 0;
      acc.hasAnyRecu = acc.hasAnyRecu || r.hasRecu;
      return acc;
    },
    { du: 0, recu: 0, hasAnyRecu: false },
  );

  return (
    <div className="mx-auto max-w-xl px-4 pb-36 pt-6">
      <button
        onClick={() => navigate("/")}
        className="mb-3 flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
      >
        <ArrowLeft size={14} /> Accueil
      </button>

      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-white shadow-sm dark:bg-teal-700">
          <Coins size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-teal-900 dark:text-teal-300">
            Paie par agence
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Ce que chaque agence te doit, vs ce que tu as reçu
          </p>
        </div>
      </header>

      {/* Sélecteur de mois */}
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-2 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          aria-label="Mois précédent"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-medium capitalize text-slate-700 dark:text-slate-200">
          {monthLabel}
        </span>
        <button
          onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          aria-label="Mois suivant"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
          Aucune journée ce mois-ci.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <section
              key={r.emp || "_none"}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                  {r.emp || "Sans agence"}
                </h2>
                <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
                  {formatHours(r.heures)} · {r.km.toLocaleString("fr-CH")} km · {r.jours} j
                </span>
              </div>

              {/* Taux */}
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-500 dark:text-slate-400">
                  Taux horaire (CHF/h)
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.05"
                    placeholder="ex : 32"
                    value={rates[r.emp]?.h ?? ""}
                    onChange={(e) => setRate(r.emp, "h", e.target.value)}
                    className="input mt-1"
                  />
                </label>
                <label className="text-xs text-slate-500 dark:text-slate-400">
                  Taux km (CHF/km)
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.05"
                    placeholder={String(kmDefault)}
                    value={rates[r.emp]?.km ?? ""}
                    onChange={(e) => setRate(r.emp, "km", e.target.value)}
                    className="input mt-1"
                  />
                </label>
              </div>

              {/* Dû / reçu / écart */}
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <span className="text-sm text-slate-500 dark:text-slate-400">Dû estimé</span>
                <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {r.tauxH > 0 ? chf.format(r.du) : "— (définis le taux horaire)"}
                </span>
              </div>

              <label className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
                Reçu
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.05"
                  placeholder="montant versé"
                  value={recu[monthKey]?.[r.emp] ?? ""}
                  onChange={(e) => setRecuValue(r.emp, e.target.value)}
                  className="input max-w-[10rem] text-right"
                />
              </label>

              {r.hasRecu && r.tauxH > 0 && (
                <div
                  className={`mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${
                    r.ecart >= -0.5
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {r.ecart >= -0.5 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                    {r.ecart >= -0.5 ? "OK" : "Manque"}
                  </span>
                  <span className="tabular-nums">
                    {r.ecart >= -0.5
                      ? `+${chf.format(r.ecart)}`
                      : chf.format(Math.abs(r.ecart)) + " en moins"}
                  </span>
                </div>
              )}
            </section>
          ))}

          {/* Total */}
          <section className="rounded-2xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-900 dark:bg-teal-950/30">
            <div className="flex items-center justify-between text-sm">
              <span className="text-teal-800 dark:text-teal-300">Total dû estimé</span>
              <span className="font-semibold tabular-nums text-teal-900 dark:text-teal-200">
                {chf.format(totals.du)}
              </span>
            </div>
            {totals.hasAnyRecu && (
              <>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-teal-800 dark:text-teal-300">Total reçu</span>
                  <span className="font-semibold tabular-nums text-teal-900 dark:text-teal-200">
                    {chf.format(totals.recu)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm font-semibold">
                  <span className="text-teal-800 dark:text-teal-300">Écart</span>
                  <span
                    className={`tabular-nums ${
                      totals.recu - totals.du >= -0.5
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-rose-700 dark:text-rose-400"
                    }`}
                  >
                    {chf.format(totals.recu - totals.du)}
                  </span>
                </div>
              </>
            )}
          </section>

          <p className="px-1 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
            Estimation indicative (brut), hors suppléments, 13ᵉ salaire, vacances et cotisations.
            Taux et montants reçus sont enregistrés sur cet appareil uniquement.
          </p>
        </div>
      )}
    </div>
  );
}
