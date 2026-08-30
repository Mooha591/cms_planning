import { useState } from "react";
import { ChevronRight, Dices, Grid3x3 } from "lucide-react";
import CochonGame from "../components/chill/CochonGame";
import Puissance4 from "../components/chill/Puissance4";

// Onglet « Chill » : un petit menu de jeux à faire pendant la pause,
// tous en local sur l'appareil (rien côté serveur). On choisit un jeu,
// il prend tout l'écran, et « Retour aux jeux » ramène ici.

const GAMES = [
  { id: "cochon", name: "Le Cochon", desc: "Jeu de dés · 2 à 4 joueurs", icon: Dices },
  {
    id: "puissance4",
    name: "Puissance 4",
    desc: "Aligne 4 pions · en ligne ou sur l'appareil · 2 joueurs",
    icon: Grid3x3,
  },
];

export default function ChillPage() {
  const [game, setGame] = useState(null);

  if (game === "cochon") return <CochonGame onExit={() => setGame(null)} />;
  if (game === "puissance4") return <Puissance4 onExit={() => setGame(null)} />;

  return (
    <div className="mx-auto max-w-xl px-4 pb-36 pt-6">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-white shadow-sm dark:bg-teal-700">
          <Dices size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-teal-900 dark:text-teal-300">
            Chill
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Petits jeux à plusieurs, pour la pause
          </p>
        </div>
      </header>

      <div className="space-y-3">
        {GAMES.map((g) => (
          <button
            key={g.id}
            onClick={() => setGame(g.id)}
            className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-teal-300 hover:shadow dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-700"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-white dark:bg-teal-700">
              <g.icon size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-800 dark:text-slate-100">{g.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{g.desc}</p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-slate-300 dark:text-slate-600" />
          </button>
        ))}
      </div>
    </div>
  );
}
