import { typeMeta } from "../lib/constants";

// Pastille colorée du type de service
export default function TypeBadge({ type }) {
  const m = typeMeta(type);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${m.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}
