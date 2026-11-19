import { ShieldCheck, AlertTriangle, Check, Info } from "lucide-react";
import { formatHours } from "../lib/time";
import { comparePay } from "../lib/paie";
import { useSyncedLocalStorage } from "../lib/useLocalStorage";
import { useCurrency } from "../context/CurrencyContext";
import AgencyLogo from "./AgencyLogo";

// Taux par agence — clé PARTAGÉE avec <EmployeurBreakdown /> : on réutilise
// les taux déjà saisis là-bas, pas besoin de les redemander.
const RATES_KEY = "kyzenday:taux-par-employeur";
// Montants bruts reçus (fiche de paie), par mois puis par employeur :
// { "2026-11": { "Agence A": "3520", ... }, ... }
const RECU_KEY = "kyzenday:paie-recue";

function parse(raw) {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

// Contrôle de paie : compare, pour chaque agence, le brut DÛ (heures saisies ×
// taux) au brut REÇU (saisi depuis la fiche de paie), et signale tout écart —
// traduit en heures non payées. Le but : repérer en un coup d'œil si une
// agence a oublié des heures.
export default function PaieCheck({ entries, monthKey }) {
  const { currency, format } = useCurrency();
  const [ratesRaw] = useSyncedLocalStorage(RATES_KEY, "{}");
  const [recuRaw, setRecuRaw] = useSyncedLocalStorage(RECU_KEY, "{}");

  const rates = parse(ratesRaw);
  const allRecu = parse(recuRaw);
  const recuMonth = allRecu[monthKey] || {};

  // Heures du mois par employeur (même règle que la répartition par agence).
  const byEmployeur = new Map();
  for (const e of entries) {
    if (!e.employeur) continue;
    byEmployeur.set(e.employeur, (byEmployeur.get(e.employeur) || 0) + (Number(e.heures) || 0));
  }

  if (byEmployeur.size === 0) return null;

  const rows = [...byEmployeur.entries()].sort((a, b) => b[1] - a[1]);

  function setRecu(employeur, value) {
    const next = { ...allRecu, [monthKey]: { ...recuMonth, [employeur]: value } };
    setRecuRaw(JSON.stringify(next));
  }

  // Total du manque sur les agences dont la paie est renseignée, pour une
  // alerte globale en tête de section.
  let manqueTotal = 0;
  for (const [employeur, heures] of rows) {
    const { statut, ecart } = comparePay(heures, rates[employeur], recuMonth[employeur]);
    if (statut === "manque") manqueTotal += -ecart;
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <ShieldCheck size={14} /> Contrôle de paie
      </h2>
      <p className="mb-3 text-[11px] text-slate-400 dark:text-slate-500">
        Saisis le <strong>brut</strong> de ta fiche de paie : l'app vérifie
        qu'il correspond à tes heures.
      </p>

      {manqueTotal > 0.5 && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            Il te manque <strong>{format(manqueTotal)}</strong> ce mois sur
            l'ensemble de tes agences. Vérifie tes fiches de paie.
          </span>
        </div>
      )}

      <ul className="space-y-3">
        {rows.map(([employeur, heures]) => {
          const taux = rates[employeur];
          const hasTaux = Number(taux) > 0;
          const recu = recuMonth[employeur] ?? "";
          const { attendu, ecart, heuresEcart, statut } = comparePay(heures, taux, recu);

          return (
            <li
              key={employeur}
              className="rounded-xl border border-slate-100 p-3 dark:border-slate-800"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <AgencyLogo employeur={employeur} size={16} />
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {employeur}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {formatHours(heures)}
                  {hasTaux && (
                    <>
                      {" "}
                      × {taux} = <strong>{format(attendu)}</strong>
                    </>
                  )}
                </span>
              </div>

              {!hasTaux ? (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                  <Info size={13} className="shrink-0" />
                  Définis le taux horaire de cette agence dans « Par employeur »
                  pour activer le contrôle.
                </p>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    Brut reçu
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.05"
                      placeholder={`${currency}`}
                      value={recu}
                      onChange={(e) => setRecu(employeur, e.target.value)}
                      className="input h-8 w-24 px-2 text-right text-xs"
                    />
                  </label>

                  {statut === "ok" && (
                    <span className="flex items-center gap-1 text-xs font-medium text-teal-700 dark:text-teal-400">
                      <Check size={14} /> Conforme
                    </span>
                  )}
                  {statut === "manque" && (
                    <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                      Il manque {format(-ecart)}
                      {heuresEcart != null && (
                        <> (≈ {formatHours(-heuresEcart)} non payées)</>
                      )}
                    </span>
                  )}
                  {statut === "surplus" && (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      Payé en plus : {format(ecart)}
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
