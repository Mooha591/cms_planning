import { Link, useLocation } from "react-router-dom";
import { CalendarDays, Dices, Plus, Wallet } from "lucide-react";

const TABS = [
  { to: "/", label: "Accueil", icon: CalendarDays, match: (p) => p === "/" },
  {
    to: "/nouveau",
    label: "Nouveau",
    icon: Plus,
    match: (p) => p === "/nouveau" || p.startsWith("/modifier"),
  },
  {
    to: "/budget",
    label: "Budget",
    icon: Wallet,
    match: (p) => p.startsWith("/budget"),
  },
  {
    to: "/chill",
    label: "Chill",
    icon: Dices,
    match: (p) => p.startsWith("/chill"),
  },
];

// Barre de navigation principale, fixée en bas de l'écran (pattern
// mobile standard : plus de place qu'une rangée de liens tout en haut,
// et ne grandit pas avec le nombre d'onglets).
export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-xl">
        {TABS.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${
                active
                  ? "text-teal-700 dark:text-teal-400"
                  : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
