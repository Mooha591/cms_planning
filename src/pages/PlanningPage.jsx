import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  CalendarClock,
  Check,
  MapPin,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";
import { usePlanning } from "../context/PlanningContext";
import TypeBadge from "../components/TypeBadge";
import { formatDateLong, todayISO } from "../lib/time";

// Onglet Planning : les missions à venir. « Valider » transforme une
// mission en journée du carnet (pré-remplit le formulaire de saisie).
export default function PlanningPage() {
  const { shifts, loading, remove } = usePlanning();
  const navigate = useNavigate();

  const today = todayISO();
  const upcoming = shifts.filter((s) => s.date >= today);
  const late = shifts
    .filter((s) => s.date < today)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  function valider(shift) {
    navigate("/nouveau", { state: { fromPlanning: shift } });
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-36 pt-6">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-white shadow-sm dark:bg-teal-700">
          <CalendarClock size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-teal-900 dark:text-teal-300">
            Planning
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Tes missions à venir
          </p>
        </div>
      </header>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
          Chargement…
        </p>
      ) : shifts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aucune mission planifiée.
          </p>
          <button
            onClick={() => navigate("/planning/nouveau")}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
          >
            <Plus size={16} /> Planifier une mission
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {late.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                À valider ({late.length})
              </h2>
              <ul className="space-y-2">
                {late.map((s) => (
                  <ShiftCard
                    key={s.id}
                    shift={s}
                    overdue
                    onValidate={() => valider(s)}
                    onEdit={() => navigate(`/planning/modifier/${s.id}`)}
                    onDelete={() => remove(s.id)}
                  />
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              À venir
            </h2>
            {upcoming.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 py-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500">
                Rien de planifié pour l'instant.
              </p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((s, i) => (
                  <ShiftCard
                    key={s.id}
                    shift={s}
                    next={i === 0}
                    onValidate={() => valider(s)}
                    onEdit={() => navigate(`/planning/modifier/${s.id}`)}
                    onDelete={() => remove(s.id)}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <button
        onClick={() => navigate("/planning/nouveau")}
        className="fixed bottom-20 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-teal-700 px-5 py-3 font-medium text-white shadow-lg shadow-teal-900/20 transition hover:bg-teal-800 hover:shadow-xl active:scale-95 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        <Plus size={18} /> Planifier
      </button>
    </div>
  );
}

function ShiftCard({ shift, next, overdue, onValidate, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <li
      className={`fade-in rounded-2xl border bg-white p-3 shadow-sm dark:bg-slate-900 ${
        next
          ? "border-teal-300 ring-1 ring-teal-200 dark:border-teal-700 dark:ring-teal-900"
          : overdue
            ? "border-amber-200 dark:border-amber-900/60"
            : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold capitalize text-slate-800 dark:text-slate-100">
              {formatDateLong(shift.date)}
            </span>
            <TypeBadge type={shift.type} />
            {next && (
              <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[11px] font-semibold text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                Prochaine
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
            {shift.debut && shift.fin && (
              <span className="tabular-nums">
                {shift.debut} – {shift.fin}
              </span>
            )}
            {shift.employeur && (
              <span className="inline-flex items-center gap-1.5">
                <Briefcase size={14} className="text-slate-400 dark:text-slate-500" />
                {shift.employeur}
              </span>
            )}
            {shift.secteur && <span>{shift.secteur}</span>}
            {shift.cms && <span>{shift.cms}</span>}
            {shift.lieu && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} className="text-slate-400 dark:text-slate-500" />
                {shift.lieu}
              </span>
            )}
          </div>

          {shift.note && (
            <p className="mt-1.5 inline-flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <StickyNote size={13} className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" />
              {shift.note}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-teal-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-teal-400"
            aria-label="Modifier"
          >
            <Pencil size={16} />
          </button>
          {confirming ? (
            <button
              onClick={() => {
                setConfirming(false);
                onDelete();
              }}
              className="flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-1.5 text-xs font-medium text-white"
            >
              <Check size={14} /> Confirmer
            </button>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
              aria-label="Supprimer"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onValidate}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        <Check size={15} /> Valider → journée
      </button>
    </li>
  );
}
