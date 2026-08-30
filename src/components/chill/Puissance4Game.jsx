import { useState } from "react";
import { ArrowLeft, Grid3x3, PartyPopper, RotateCcw } from "lucide-react";

// Puissance 4 — deux joueurs sur le même écran. On lâche un pion dans
// une colonne, il tombe au plus bas. Premier à aligner 4 pions
// (horizontal, vertical ou diagonale) gagne. Plateau plein sans
// alignement : match nul.

const COLS = 7;
const ROWS = 6;
const EMPTY = Array(COLS * ROWS).fill(null);

const DISC = {
  R: "bg-rose-500 shadow-inner",
  Y: "bg-amber-400 shadow-inner",
};

// Y a-t-il 4 pions alignés de la couleur `p` quelque part sur le plateau ?
function hasWon(board, p) {
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r * COLS + c] !== p) continue;
      for (const [dr, dc] of dirs) {
        let k = 1;
        while (k < 4) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr * COLS + nc] !== p) break;
          k++;
        }
        if (k === 4) return true;
      }
    }
  }
  return false;
}

export default function Puissance4Game({ onExit }) {
  const [board, setBoard] = useState(EMPTY);
  const [turn, setTurn] = useState("R");
  const [names, setNames] = useState({ R: "Rouge", Y: "Jaune" });
  const [winner, setWinner] = useState(null); // "R" · "Y" · "draw" · null

  function drop(col) {
    if (winner) return;
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!board[r * COLS + col]) {
        row = r;
        break;
      }
    }
    if (row < 0) return; // colonne pleine

    const next = [...board];
    next[row * COLS + col] = turn;
    setBoard(next);

    if (hasWon(next, turn)) {
      setWinner(turn);
    } else if (next.every(Boolean)) {
      setWinner("draw");
    } else {
      setTurn(turn === "R" ? "Y" : "R");
    }
  }

  function reset() {
    setBoard(EMPTY);
    setTurn("R");
    setWinner(null);
  }

  const status =
    winner === "draw"
      ? "Match nul — plateau plein."
      : winner
        ? `${names[winner]} aligne 4 et gagne ! 🎉`
        : `Au tour de ${names[turn]}`;

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
            Deux joueurs, même écran · aligne 4 pions pour gagner
          </p>
        </div>
      </header>

      {/* Joueurs */}
      <div className="mb-4 flex gap-2">
        {["R", "Y"].map((p) => (
          <div
            key={p}
            className={`flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 transition ${
              turn === p && !winner
                ? "border-teal-400 bg-teal-50 dark:border-teal-500 dark:bg-teal-500/10"
                : "border-slate-200 dark:border-slate-800"
            }`}
          >
            <span className={`h-3.5 w-3.5 shrink-0 rounded-full ${p === "R" ? "bg-rose-500" : "bg-amber-400"}`} />
            <input
              className="w-full min-w-0 bg-transparent text-sm font-medium text-slate-700 outline-none dark:text-slate-200"
              value={names[p]}
              maxLength={14}
              onChange={(e) => setNames((n) => ({ ...n, [p]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      {/* Plateau */}
      <div className="flex gap-1.5 rounded-2xl bg-blue-600 p-2 shadow-lg dark:bg-blue-700 sm:gap-2 sm:p-3">
        {Array.from({ length: COLS }).map((_, col) => {
          const colFull = Boolean(board[col]);
          return (
            <button
              key={col}
              onClick={() => drop(col)}
              disabled={Boolean(winner) || colFull}
              aria-label={`Colonne ${col + 1}`}
              className="group flex flex-1 flex-col gap-1.5 rounded-lg py-0.5 transition enabled:hover:bg-white/10 disabled:cursor-not-allowed sm:gap-2"
            >
              {Array.from({ length: ROWS }).map((__, row) => {
                const v = board[row * COLS + col];
                return (
                  <span
                    key={row}
                    className={`aspect-square rounded-full ${
                      v ? DISC[v] : "bg-white/90 dark:bg-slate-200"
                    }`}
                  />
                );
              })}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-sm font-medium text-slate-600 dark:text-slate-300">
        {status}
      </p>

      {winner && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            <PartyPopper size={22} />
          </span>
          <p className="mt-2 font-bold text-slate-800 dark:text-slate-100">
            {winner === "draw" ? "Match nul" : `${names[winner]} gagne !`}
          </p>
        </div>
      )}

      <button
        onClick={reset}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-medium text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        <RotateCcw size={18} /> Nouvelle partie
      </button>
    </div>
  );
}
