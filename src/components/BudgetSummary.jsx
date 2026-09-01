import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import Stat from "./Stat";

const chfFormatter = new Intl.NumberFormat("fr-CH", {
  style: "currency",
  currency: "CHF",
  maximumFractionDigits: 0,
});

// Bandeau récapitulatif du mois (revenus / dépenses / solde) + navigation
export default function BudgetSummary({ monthLabel, totals, onPrev, onNext }) {
  return (
    <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 to-teal-900 text-white shadow-md shadow-teal-900/15">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onPrev}
          className="rounded-lg p-1.5 text-teal-100 transition hover:bg-white/10 hover:text-white"
          aria-label="Mois précédent"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-medium capitalize tracking-wide">
          {monthLabel}
        </span>
        <button
          onClick={onNext}
          className="rounded-lg p-1.5 text-teal-100 transition hover:bg-white/10 hover:text-white"
          aria-label="Mois suivant"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10">
        <Stat
          icon={<TrendingUp size={16} />}
          value={chfFormatter.format(totals.revenus)}
          label="Revenus"
        />
        <Stat
          icon={<TrendingDown size={16} />}
          value={chfFormatter.format(totals.depenses)}
          label="Dépenses"
        />
        <Stat
          icon={<Wallet size={16} />}
          value={chfFormatter.format(totals.solde)}
          label="Solde"
        />
      </div>
    </section>
  );
}
