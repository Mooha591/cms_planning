import { useState } from "react";
import { ArrowLeft, Grid3x3, Users, Wifi } from "lucide-react";
import Puissance4Local from "./Puissance4Game";
import Puissance4Online from "./Puissance4Online";

// Choix du mode avant de lancer Puissance 4 : contre une personne
// connectée au site (table partagée en temps réel) ou à deux sur le
// même appareil.

export default function Puissance4({ onExit }) {
  const [mode, setMode] = useState(null);

  if (mode === "online") return <Puissance4Online onExit={onExit} />;
  if (mode === "local") return <Puissance4Local onExit={onExit} />;

  return (
    <div className="mx-auto max-w-xl px-4 pb-36 pt-6">
      <button
        onClick={onExit}
        className="mb-3 flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
      >
        <ArrowLeft size={14} /> Retour aux jeux
      </button>

      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-white shadow-sm dark:bg-teal-700">
          <Grid3x3 size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-teal-900 dark:text-teal-300">
            Puissance 4
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Comment veux-tu jouer ?
          </p>
        </div>
      </header>

      <div className="space-y-3">
        <button
          onClick={() => setMode("online")}
          className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-teal-300 hover:shadow dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-700"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-white dark:bg-teal-700">
            <Wifi size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-800 dark:text-slate-100">En ligne</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Contre une personne connectée au site, en temps réel
            </p>
          </div>
        </button>

        <button
          onClick={() => setMode("local")}
          className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-teal-300 hover:shadow dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-700"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-white dark:bg-teal-700">
            <Users size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-800 dark:text-slate-100">Sur cet appareil</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              À deux, chacun son tour sur le même écran
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
