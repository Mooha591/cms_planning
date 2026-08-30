import { Calendar, Car, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import Stat from "./Stat";
import { formatHours } from "../lib/time";

// Bandeau récapitulatif du mois + navigation entre les mois
export default function MonthSummary({ monthLabel, totals, onPrev, onNext }) {
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
          icon={<Car size={16} />}
          value={totals.km.toLocaleString("fr-FR")}
          unit="km"
          label="Kilomètres"
        />
        <Stat
          icon={<Clock size={16} />}
          value={formatHours(totals.heures)}
          label="Heures"
        />
        <Stat
          icon={<Calendar size={16} />}
          value={totals.jours}
          label={totals.jours > 1 ? "Jours" : "Jour"}
        />
      </div>
    </section>
  );
}
