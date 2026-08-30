import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Dices, Hand, PartyPopper, Play, RotateCcw, Users } from "lucide-react";

// « Le Cochon » — petit jeu de dés en pass-and-play, à 2, 3 ou 4.
// Aucun serveur : tout se joue sur l'appareil qu'on se passe entre
// joueurs, pour le fun pendant une pause.
//
// Règle : à ton tour tu lances le dé autant de fois que tu veux, chaque
// résultat s'ajoute à la cagnotte du tour. Mais si tu fais un 1, tu
// perds toute la cagnotte et la main passe au joueur suivant.
// « Banquer » met la cagnotte du tour à l'abri dans ton score. Le
// premier à atteindre l'objectif gagne la partie.

// Cases allumées d'un dé 3×3 selon la face (0 = haut-gauche … 8 = bas-droite).
const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const COLORS = [
  { dot: "bg-teal-500", text: "text-teal-700 dark:text-teal-300", soft: "bg-teal-50 dark:bg-teal-500/10" },
  { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", soft: "bg-amber-50 dark:bg-amber-500/10" },
  { dot: "bg-rose-500", text: "text-rose-700 dark:text-rose-300", soft: "bg-rose-50 dark:bg-rose-500/10" },
  { dot: "bg-indigo-500", text: "text-indigo-700 dark:text-indigo-300", soft: "bg-indigo-50 dark:bg-indigo-500/10" },
];

const TARGETS = [50, 100, 150];
const DEFAULT_NAMES = ["Alex", "Sam", "Charlie", "Robin"];

function Die({ value, rolling }) {
  const filled = new Set(PIPS[value] ?? []);
  return (
    <div
      className={`grid h-24 w-24 grid-cols-3 grid-rows-3 gap-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg transition-transform duration-150 dark:border-slate-300 ${
        rolling ? "rotate-12 scale-110" : "rotate-0 scale-100"
      }`}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className={`m-auto h-3.5 w-3.5 rounded-full ${filled.has(i) ? "bg-slate-800" : "bg-transparent"}`}
        />
      ))}
    </div>
  );
}

export default function CochonGame({ onExit }) {
  const [phase, setPhase] = useState("setup"); // setup · play · over
  const [count, setCount] = useState(2);
  const [names, setNames] = useState(DEFAULT_NAMES.slice(0, 2));
  const [target, setTarget] = useState(100);

  const [scores, setScores] = useState([]);
  const [current, setCurrent] = useState(0);
  const [turnTotal, setTurnTotal] = useState(0);
  const [die, setDie] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState("");

  const timers = useRef([]);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current.forEach(clearInterval);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  function setPlayerCount(n) {
    setCount(n);
    setNames((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(DEFAULT_NAMES[next.length] ?? `Joueur ${next.length + 1}`);
      return next.slice(0, n);
    });
  }

  function startGame() {
    clearTimers();
    setScores(Array(count).fill(0));
    setCurrent(0);
    setTurnTotal(0);
    setDie(1);
    setRolling(false);
    setMessage("");
    setPhase("play");
  }

  function nextPlayer() {
    setTurnTotal(0);
    setCurrent((c) => (c + 1) % count);
  }

  function roll() {
    if (rolling) return;
    setRolling(true);
    setMessage("");

    const spin = setInterval(() => setDie(1 + Math.floor(Math.random() * 6)), 80);
    timers.current.push(spin);

    const stop = setTimeout(() => {
      clearInterval(spin);
      const result = 1 + Math.floor(Math.random() * 6);
      setDie(result);
      setRolling(false);

      if (result === 1) {
        setMessage(`Cochon ! ${names[current]} perd la cagnotte du tour.`);
        const pass = setTimeout(nextPlayer, 1100);
        timers.current.push(pass);
      } else {
        setTurnTotal((t) => t + result);
      }
    }, 650);
    timers.current.push(stop);
  }

  function bank() {
    if (rolling || turnTotal === 0) return;
    const newScore = scores[current] + turnTotal;
    const nextScores = scores.map((s, i) => (i === current ? newScore : s));
    setScores(nextScores);

    if (newScore >= target) {
      setMessage(`${names[current]} atteint ${newScore} points 🎉`);
      setPhase("over");
      return;
    }
    setMessage(`${names[current]} banque ${turnTotal} points.`);
    nextPlayer();
  }

  function replay() {
    clearTimers();
    setScores(Array(count).fill(0));
    setCurrent(0);
    setTurnTotal(0);
    setDie(1);
    setRolling(false);
    setMessage("");
    setPhase("play");
  }

  const winner = phase === "over" ? scores.indexOf(Math.max(...scores)) : -1;

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
          <Dices size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-teal-900 dark:text-teal-300">
            Le Cochon
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Jeu de dés en pass-and-play · à 2, 3 ou 4, pour la pause
          </p>
        </div>
      </header>

      {phase === "setup" && (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <Users size={16} /> Nombre de joueurs
            </p>
            <div className="flex gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setPlayerCount(n)}
                  className={`flex-1 rounded-xl border px-4 py-2.5 font-medium transition ${
                    count === n
                      ? "border-teal-500 bg-teal-50 text-teal-700 dark:border-teal-500 dark:bg-teal-500/10 dark:text-teal-300"
                      : "border-slate-200 text-slate-600 hover:border-teal-300 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {names.map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`h-3 w-3 shrink-0 rounded-full ${COLORS[i].dot}`} />
                <input
                  className="input"
                  value={name}
                  maxLength={16}
                  onChange={(e) =>
                    setNames((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
                  }
                  placeholder={`Joueur ${i + 1}`}
                />
              </div>
            ))}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Objectif de points
            </p>
            <div className="flex gap-2">
              {TARGETS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTarget(t)}
                  className={`flex-1 rounded-xl border px-4 py-2.5 font-medium transition ${
                    target === t
                      ? "border-teal-500 bg-teal-50 text-teal-700 dark:border-teal-500 dark:bg-teal-500/10 dark:text-teal-300"
                      : "border-slate-200 text-slate-600 hover:border-teal-300 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startGame}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-medium text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            <Play size={18} /> Commencer
          </button>

          <p className="text-center text-xs leading-relaxed text-slate-400 dark:text-slate-500">
            À ton tour, lance le dé autant de fois que tu veux : chaque résultat s'ajoute à ta
            cagnotte. Mais un&nbsp;1 fait tout perdre et passe la main. «&nbsp;Banquer&nbsp;» met
            la cagnotte à l'abri dans ton score.
          </p>
        </section>
      )}

      {phase === "play" && (
        <>
          {/* Scores */}
          <div className="mb-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
            {names.map((name, i) => (
              <div
                key={i}
                className={`rounded-2xl border p-3 text-center transition ${
                  i === current
                    ? `border-teal-400 ${COLORS[i].soft} dark:border-teal-500`
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${COLORS[i].dot}`} />
                  <span className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                    {name}
                  </span>
                </div>
                <p className={`mt-1 text-2xl font-bold tabular-nums ${COLORS[i].text}`}>
                  {scores[i]}
                </p>
              </div>
            ))}
          </div>

          {/* Table de jeu */}
          <div
            className="rounded-[2rem] border-[6px] border-amber-900/70 p-6 text-center shadow-lg"
            style={{ background: "radial-gradient(ellipse at 50% 0%, #0d6b4f 0%, #0b5940 55%, #073d2c 100%)" }}
          >
            <p className="text-sm font-medium text-white/90">
              Au tour de <span className="font-bold text-white">{names[current]}</span>
            </p>
            <p className="mt-0.5 text-xs text-white/60">Objectif : {target} points</p>

            <div className="my-6 flex justify-center">
              <Die value={die} rolling={rolling} />
            </div>

            <div className="inline-flex items-baseline gap-2 rounded-full bg-black/25 px-4 py-1.5">
              <span className="text-xs text-white/70">Cagnotte du tour</span>
              <span className="text-xl font-bold tabular-nums text-white">{turnTotal}</span>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={roll}
                disabled={rolling}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold text-teal-800 shadow transition hover:bg-teal-50 disabled:opacity-60"
              >
                <Dices size={18} /> Lancer
              </button>
              <button
                onClick={bank}
                disabled={rolling || turnTotal === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/40 px-4 py-3 font-semibold text-white transition hover:bg-white/10 disabled:opacity-40"
              >
                <Hand size={18} /> Banquer
              </button>
            </div>
          </div>

          <p className="mt-3 min-h-[1.25rem] text-center text-sm font-medium text-slate-600 dark:text-slate-300">
            {message}
          </p>

          <button
            onClick={() => setPhase("setup")}
            className="mt-2 w-full text-center text-xs font-medium text-slate-400 hover:underline dark:text-slate-500"
          >
            Recommencer une partie
          </button>
        </>
      )}

      {phase === "over" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            <PartyPopper size={26} />
          </span>
          <h2 className="mt-3 text-xl font-bold text-slate-800 dark:text-slate-100">
            {names[winner]} gagne !
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {scores[winner]} points — bravo 🏆
          </p>

          <ul className="mx-auto mt-4 max-w-xs space-y-1.5 text-left">
            {names
              .map((name, i) => ({ name, score: scores[i], i }))
              .sort((a, b) => b.score - a.score)
              .map(({ name, score, i }) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60"
                >
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <span className={`h-2.5 w-2.5 rounded-full ${COLORS[i].dot}`} />
                    {name}
                  </span>
                  <span className="font-bold tabular-nums text-slate-800 dark:text-slate-100">
                    {score}
                  </span>
                </li>
              ))}
          </ul>

          <div className="mt-5 flex gap-2">
            <button
              onClick={replay}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-medium text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              <RotateCcw size={18} /> Rejouer
            </button>
            <button
              onClick={() => setPhase("setup")}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-medium text-slate-700 transition hover:border-teal-400 dark:border-slate-700 dark:text-slate-200"
            >
              Changer les joueurs
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
