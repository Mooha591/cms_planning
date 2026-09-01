import { useEffect, useState } from "react";
import { Check, Pencil, Tag, Trash2 } from "lucide-react";
import { budgetTypeMeta } from "../lib/budgetConstants";
import { formatDateLong } from "../lib/time";

const chfFormatter = new Intl.NumberFormat("fr-CH", {
  style: "currency",
  currency: "CHF",
});

// Carte d'une transaction dans la liste du budget
export default function TransactionCard({ transaction, onEdit, onDelete }) {
  const meta = budgetTypeMeta(transaction.type);

  // Suppression à double-tap, comme pour les journées
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  function handleDeleteClick() {
    if (confirming) {
      setConfirming(false);
      onDelete(transaction.id);
    } else {
      setConfirming(true);
    }
  }

  return (
    <li className="fade-in rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-teal-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 truncate font-semibold text-slate-800 dark:text-slate-100">
              {transaction.libelle || "(sans libellé)"}
            </span>
            <span
              className={`ml-auto shrink-0 text-sm font-semibold tabular-nums ${meta.amountClass}`}
            >
              {meta.sign} {chfFormatter.format(Number(transaction.montant) || 0)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
            <span className="capitalize">{formatDateLong(transaction.date)}</span>
            {transaction.categorie && (
              <span className="inline-flex items-center gap-1">
                <Tag size={13} className="text-slate-400 dark:text-slate-500" />
                {transaction.categorie}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onEdit(transaction.id)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-teal-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-teal-400"
            aria-label="Modifier"
          >
            <Pencil size={16} />
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
