import { useEffect, useState } from "react";
import {
  Briefcase,
  Building2,
  Car,
  Check,
  Clock,
  Coffee,
  Copy,
  MapPin,
  Pencil,
  Sunrise,
  Sunset,
  Trash2,
} from "lucide-react";
import TypeBadge from "./TypeBadge";
import { durMin, formatDateLong, formatDuree, formatHours } from "../lib/time";

// Carte d'une journée dans la liste
export default function EntryCard({ entry, onEdit, onDelete, onDuplicate }) {
  // Deux créneaux à afficher dès qu'un second est renseigné : coupé
  // (matin/soir) comme journée (matin/après-midi).
  const split = Boolean(entry.debut2 && entry.fin2);
  const splitLabels =
    entry.type === "coupe" ? ["1er", "reprise"] : ["matin", "aprem"];

  // Suppression à double-tap : le premier clic arme la confirmation,
  // le second (dans les 3s) supprime réellement.
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  function handleDeleteClick() {
    if (confirming) {
      setConfirming(false);
      onDelete(entry.id);
    } else {
      setConfirming(true);
    }
  }

  return (
    <li className="fade-in rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-teal-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Ligne date + type + total heures */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold capitalize text-slate-800 dark:text-slate-100">
              {formatDateLong(entry.date)}
            </span>
            <TypeBadge type={entry.type} />
            {entry.poste && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {entry.poste}
              </span>
            )}
            <span className="ml-auto text-sm font-semibold tabular-nums text-teal-800 dark:text-teal-400">
              {formatHours(entry.heures)}
            </span>
          </div>

          {/* Détails horaires / km / CMS */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
            {split ? (
              <>
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Sunrise size={14} className="text-slate-400 dark:text-slate-500" />
                  {entry.debut} – {entry.fin}
                </span>
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Sunset size={14} className="text-slate-400 dark:text-slate-500" />
                  {entry.debut2} – {entry.fin2}
                </span>
                <span className="inline-flex items-center gap-1.5 tabular-nums text-slate-400 dark:text-slate-500">
                  {splitLabels[0]} {formatDuree(durMin(entry.debut, entry.fin))} · {splitLabels[1]}{" "}
                  {formatDuree(durMin(entry.debut2, entry.fin2))}
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Clock size={14} className="text-slate-400 dark:text-slate-500" />
                  {entry.debut} – {entry.fin}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Coffee size={14} className="text-slate-400 dark:text-slate-500" />
                  {entry.pause ? formatDuree(entry.pause) : "sans pause"}
                </span>
              </>
            )}
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Car size={14} className="text-slate-400 dark:text-slate-500" />
              {(Number(entry.km) || 0).toLocaleString("fr-FR")} km
            </span>
            {entry.cms && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} className="text-slate-400 dark:text-slate-500" />
                {entry.cms}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Building2 size={14} className="text-slate-400 dark:text-slate-500" />
              {entry.secteur || "Non défini"}
            </span>
            {entry.employeur && (
              <span className="inline-flex items-center gap-1.5">
                <Briefcase size={14} className="text-slate-400 dark:text-slate-500" />
                {entry.employeur}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onEdit(entry.id)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-teal-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-teal-400"
            aria-label="Modifier"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onDuplicate(entry)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-teal-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-teal-400"
            aria-label="Dupliquer"
          >
            <Copy size={16} />
          </button>
          {confirming ? (
            <button
              onClick={handleDeleteClick}
              className="flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-1.5 text-xs font-medium text-white"
              aria-label="Confirmer la suppression"
            >
              <Check size={14} /> Confirmer
            </button>
          ) : (
            <button
              onClick={handleDeleteClick}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
              aria-label="Supprimer"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
