import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { CHART_COLOR } from "../../lib/chartColor";

const W = 320;
const H = 100;
const PAD_X = 6;
const PAD_TOP = 10;
const PAD_BOTTOM = 8;

// Graphique d'évolution mensuelle (série unique) : aire + ligne, avec
// crosshair et infobulle au survol/focus. Une seule teinte de marque —
// pas de légende nécessaire pour une série unique (cf. skill dataviz).
export default function TrendChart({ points, formatValue }) {
  const { theme } = useTheme();
  const color = theme === "dark" ? CHART_COLOR.dark : CHART_COLOR.light;
  const [hoverIdx, setHoverIdx] = useState(null);

  const max = Math.max(...points.map((p) => p.value), 1);
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
  const baseY = PAD_TOP + innerH;

  const coords = points.map((p, i) => ({
    ...p,
    x: PAD_X + i * stepX,
    y: baseY - (p.value / max) * innerH,
  }));

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    `M${coords[0].x.toFixed(1)},${baseY} ` +
    coords.map((c) => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ") +
    ` L${coords[coords.length - 1].x.toFixed(1)},${baseY} Z`;

  const lastIdx = coords.length - 1;
  const activeIdx = hoverIdx ?? lastIdx;
  const active = coords[activeIdx];

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let best = Infinity;
    coords.forEach((c, i) => {
      const d = Math.abs(c.x - px);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHoverIdx(nearest);
  }

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
          role="img"
          aria-label={points.map((p) => `${p.label} : ${formatValue(p.value)}`).join(", ")}
        >
          <line
            x1={PAD_X}
            x2={W - PAD_X}
            y1={baseY}
            y2={baseY}
            className="stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="1"
          />
          <path d={areaPath} fill={color} opacity={0.12} stroke="none" />
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {hoverIdx !== null && (
            <line
              x1={active.x}
              x2={active.x}
              y1={PAD_TOP}
              y2={baseY}
              className="stroke-slate-300 dark:stroke-slate-600"
              strokeWidth="1"
            />
          )}
          {coords.map((c, i) => (
            <circle
              key={c.label}
              cx={c.x}
              cy={c.y}
              r={i === activeIdx ? 4 : 0}
              fill={color}
              className="stroke-white dark:stroke-slate-900"
              strokeWidth="2"
            />
          ))}
        </svg>

        {/* Infobulle : valeur au point actif (survol, ou dernier point par défaut).
            Ancrage horizontal adapté près des bords pour ne jamais déborder
            de la carte (le dernier point, collé au bord droit, est l'état
            par défaut — donc pas un simple cas limite du survol). */}
        <div
          className={`pointer-events-none absolute flex -translate-y-[calc(100%+6px)] flex-col items-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-center shadow-md dark:border-slate-700 dark:bg-slate-800 ${
            active.x / W < 0.12
              ? "translate-x-0"
              : active.x / W > 0.88
                ? "-translate-x-full"
                : "-translate-x-1/2"
          }`}
          style={{
            left: `${(active.x / W) * 100}%`,
            top: `${(active.y / H) * 100}%`,
          }}
        >
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
            {formatValue(active.value)}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {active.label}
          </span>
        </div>
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
        {points.map((p, i) => (
          <span
            key={p.label}
            className={
              i === activeIdx ? "font-semibold text-teal-700 dark:text-teal-400" : ""
            }
          >
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}
