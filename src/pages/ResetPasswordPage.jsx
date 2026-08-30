import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, KeyRound } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import Logo from "../components/Logo";
import Field from "../components/Field";

// Page ouverte via le lien reçu par email ("mot de passe oublié").
// Supabase authentifie temporairement le visiteur via le lien (évènement
// PASSWORD_RECOVERY) ; on lui permet ensuite de choisir un nouveau
// mot de passe.
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Au cas où l'évènement serait déjà passé avant le montage du composant
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate("/"), 1500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-teal-50/60 to-slate-50 px-4 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo size={44} />
          <h1 className="text-2xl font-bold tracking-tight text-teal-900 dark:text-teal-300">
            Nouveau mot de passe
          </h1>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {done ? (
            <p className="flex items-center gap-2 text-sm text-teal-700 dark:text-teal-400">
              <Check size={16} /> Mot de passe mis à jour, redirection…
            </p>
          ) : !ready ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Vérification du lien reçu par email…
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <Field label="Nouveau mot de passe">
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Confirmer le mot de passe">
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input"
                />
              </Field>

              {error && (
                <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-medium text-white shadow-sm transition hover:bg-teal-800 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                <KeyRound size={18} />{" "}
                {busy ? "Enregistrement…" : "Changer le mot de passe"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
