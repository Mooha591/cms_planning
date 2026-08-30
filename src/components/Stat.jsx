// Un indicateur du bandeau récap (km / heures / jours)
export default function Stat({ icon, value, unit, label }) {
  return (
    <div className="min-w-0 px-2 py-4 text-center sm:px-3">
      <div className="mb-1.5 flex items-center justify-center">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-teal-100">
          {icon}
        </span>
      </div>
      <div className="text-xl font-semibold leading-none tabular-nums">
        {value}
        {unit && (
          <span className="ml-0.5 text-sm font-normal text-teal-200">
            {unit}
          </span>
        )}
      </div>
      <div className="mt-1 break-words text-[11px] uppercase tracking-wide text-teal-200">
        {label}
      </div>
    </div>
  );
}
