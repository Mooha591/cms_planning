import { useEffect, useState } from "react";
import { ArrowLeft, Grid3x3, LogOut, PartyPopper, RotateCcw, Wifi } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

// Puissance 4 « en ligne » : une seule partie partagée (ligne « main »
// dans la table p4_game). Deux personnes connectées au site prennent
// chacune une couleur ; les coups passent par Supabase et sont
// synchronisés en temps réel (postgres_changes). Le tour de chacun est
// verrouillé côté base (.eq("turn", maCouleur)) pour éviter les
// coups simultanés.

const COLS = 7;
const ROWS = 6;
const EMPTY = Array(COLS * ROWS).fill(null);
const DISC = { R: "bg-rose-500 shadow-inner", Y: "bg-amber-400 shadow-inner" };

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

function displayName(user) {
  return (
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Joueur"
  );
}

export default function Puissance4Online({ onExit }) {
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let channel;

    async function init() {
      const { data, error: fetchError } = await supabase
        .from("p4_game")
        .select("*")
        .eq("id", "main")
        .single();

      if (fetchError) setError("Table indisponible. As-tu exécuté p4_schema.sql ?");
      setGame(data ?? null);
      setLoading(false);

      channel = supabase
        .channel("p4-main")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "p4_game", filter: "id=eq.main" },
          (payload) => setGame(payload.new),
        )
        .subscribe();
    }

    init();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <Shell onExit={onExit}>
        <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
          Connexion à la table…
        </p>
      </Shell>
    );
  }

  if (!game) {
    return (
      <Shell onExit={onExit}>
        <p className="py-10 text-center text-sm text-rose-600 dark:text-rose-400">
          {error || "Partie introuvable."}
        </p>
      </Shell>
    );
  }

  const board = Array.isArray(game.board) && game.board.length === COLS * ROWS ? game.board : EMPTY;
  const myColor = game.red_id === user?.id ? "R" : game.yellow_id === user?.id ? "Y" : null;
  const bothSeated = Boolean(game.red_id && game.yellow_id);
  const seatName = { R: game.red_name, Y: game.yellow_name };
  const myTurn = myColor && !game.winner && bothSeated && game.turn === myColor;

  async function join(color) {
    if (busy || myColor) return;
    setBusy(true);
    setError("");
    const patch =
      color === "R"
        ? { red_id: user.id, red_name: displayName(user) }
        : { yellow_id: user.id, yellow_name: displayName(user) };
    let q = supabase.from("p4_game").update(patch).eq("id", "main");
    q = color === "R" ? q.is("red_id", null) : q.is("yellow_id", null);
    const { error: joinError } = await q;
    setBusy(false);
    if (joinError) setError("Place déjà prise. Réessaie.");
  }

  async function leave() {
    if (busy || !myColor) return;
    setBusy(true);
    const patch =
      myColor === "R"
        ? { red_id: null, red_name: null }
        : { yellow_id: null, yellow_name: null };
    await supabase
      .from("p4_game")
      .update({ ...patch, board: EMPTY, turn: "R", winner: null, updated_at: new Date().toISOString() })
      .eq("id", "main");
    setBusy(false);
  }

  async function drop(col) {
    if (busy || !myTurn || board[col]) return;
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!board[r * COLS + col]) {
        row = r;
        break;
      }
    }
    if (row < 0) return;

    const next = [...board];
    next[row * COLS + col] = myColor;
    const won = hasWon(next, myColor);
    const full = next.every(Boolean);

    setBusy(true);
    setError("");
    const { error: moveError } = await supabase
      .from("p4_game")
      .update({
        board: next,
        winner: won ? myColor : full ? "draw" : null,
        turn: won || full ? game.turn : myColor === "R" ? "Y" : "R",
        updated_at: new Date().toISOString(),
      })
      .eq("id", "main")
      .eq("turn", myColor);
    setBusy(false);
    if (moveError) setError("Coup refusé. Réessaie.");
  }

  async function newGame() {
    if (busy) return;
    setBusy(true);
    await supabase
      .from("p4_game")
      .update({ board: EMPTY, turn: "R", winner: null, updated_at: new Date().toISOString() })
      .eq("id", "main");
    setBusy(false);
  }

  const status = !bothSeated
    ? "En attente d'un second joueur…"
    : game.winner === "draw"
      ? "Match nul — plateau plein."
      : game.winner
        ? `${seatName[game.winner]} aligne 4 et gagne ! 🎉`
        : myTurn
          ? "À toi de jouer"
          : `Au tour de ${seatName[game.turn]}`;

  return (
    <Shell onExit={onExit}>
      {/* Sièges */}
      <div className="mb-4 flex gap-2">
        {["R", "Y"].map((c) => {
          const occupied = c === "R" ? game.red_id : game.yellow_id;
          const isMine = myColor === c;
          return (
            <div
              key={c}
              className={`flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 transition ${
                game.turn === c && !game.winner && bothSeated
                  ? "border-teal-400 bg-teal-50 dark:border-teal-500 dark:bg-teal-500/10"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <span
                className={`h-3.5 w-3.5 shrink-0 rounded-full ${c === "R" ? "bg-rose-500" : "bg-amber-400"}`}
              />
              {occupied ? (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {seatName[c]}
                    {isMine && " (toi)"}
                  </span>
                  {isMine && (
                    <button
                      onClick={leave}
                      disabled={busy}
                      className="shrink-0 text-slate-400 transition hover:text-rose-500 disabled:opacity-50"
                      aria-label="Quitter la place"
                    >
                      <LogOut size={15} />
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => join(c)}
                  disabled={busy || Boolean(myColor)}
                  className="flex-1 text-left text-sm font-medium text-teal-700 transition hover:underline disabled:text-slate-400 disabled:no-underline dark:text-teal-400"
                >
                  Prendre cette place
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Plateau */}
      <div className="flex gap-1.5 rounded-2xl bg-blue-600 p-2 shadow-lg dark:bg-blue-700 sm:gap-2 sm:p-3">
        {Array.from({ length: COLS }).map((_, col) => (
          <button
            key={col}
            onClick={() => drop(col)}
            disabled={!myTurn || busy || Boolean(board[col])}
            aria-label={`Colonne ${col + 1}`}
            className="group flex flex-1 flex-col gap-1.5 rounded-lg py-0.5 transition enabled:hover:bg-white/10 disabled:cursor-not-allowed sm:gap-2"
          >
            {Array.from({ length: ROWS }).map((__, row) => {
              const v = board[row * COLS + col];
              return (
                <span
                  key={row}
                  className={`aspect-square rounded-full ${v ? DISC[v] : "bg-white/90 dark:bg-slate-200"}`}
                />
              );
            })}
          </button>
        ))}
      </div>

      <p className="mt-4 text-center text-sm font-medium text-slate-600 dark:text-slate-300">
        {status}
      </p>
      {error && (
        <p className="mt-1 text-center text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}

      {game.winner && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            <PartyPopper size={22} />
          </span>
          <p className="mt-2 font-bold text-slate-800 dark:text-slate-100">
            {game.winner === "draw" ? "Match nul" : `${seatName[game.winner]} gagne !`}
          </p>
        </div>
      )}

      {myColor && (
        <button
          onClick={newGame}
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-medium text-white transition hover:bg-teal-800 disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          <RotateCcw size={18} /> Nouvelle partie
        </button>
      )}
    </Shell>
  );
}

function Shell({ onExit, children }) {
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
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-teal-900 dark:text-teal-300">
            Puissance 4
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
              <Wifi size={12} /> en ligne
            </span>
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Table partagée · joue contre une personne connectée au site
          </p>
        </div>
      </header>

      {children}
    </div>
  );
}
