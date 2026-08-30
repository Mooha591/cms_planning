import { useState } from "react";
import { KeyRound, LogIn, Mail, Lock, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import Field from "../components/Field";

// Page de connexion / création de compte / mot de passe oublié
export default function LoginPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  function switchMode(next) {
    setMode(next);
    setError("");
    setInfo("");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (mode === "forgot") {
      if (!email) return setError("Indique ton email.");
      setBusy(true);
      const { error: resetError } = await resetPassword(email);
      setBusy(false);
      if (resetError) return setError(traduireErreur(resetError.message));
      setInfo("Email envoyé ! Clique sur le lien reçu pour choisir un nouveau mot de passe.");
      return;
    }

    if (!email || !password) {
      setError("Indique ton email et ton mot de passe.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }

    setBusy(true);
    const { data, error: authError } =
      mode === "signin"
        ? await signIn(email, password)
        : await signUp(email, password);
    setBusy(false);

    if (authError) {
      setError(traduireErreur(authError.message));
      return;
    }
    if (mode === "signup" && !data.session) {
      setInfo(
        "Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.",
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-teal-50/60 to-slate-50 px-4 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo size={44} />
          <h1 className="text-2xl font-bold tracking-tight text-teal-900 dark:text-teal-300">
            KyzenDay
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Carnet de tournée · connecte-toi pour accéder à tes journées
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          {mode !== "forgot" && (
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                  mode === "signin"
                    ? "border-teal-700 bg-teal-700 text-white dark:border-teal-600 dark:bg-teal-600"
                    : "border-slate-200 bg-white text-slate-600 hover:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-600"
                }`}
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                  mode === "signup"
                    ? "border-teal-700 bg-teal-700 text-white dark:border-teal-600 dark:bg-teal-600"
                    : "border-slate-200 bg-white text-slate-600 hover:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-600"
                }`}
              >
                Créer un compte
              </button>
            </div>
          )}

          {mode === "forgot" && (
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
              Indique ton email, tu recevras un lien pour choisir un nouveau
              mot de passe.
            </p>
          )}

          <div className="space-y-3">
            <Field label="Email">
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="toi@exemple.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-9"
                />
              </div>
            </Field>
            {mode !== "forgot" && (
              <Field label="Mot de passe">
                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="password"
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-9"
                  />
                </div>
              </Field>
            )}
          </div>

          {mode === "signin" && (
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              className="mt-2 text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
            >
              Mot de passe oublié ?
            </button>
          )}

          {error && (
            <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}
          {info && (
            <p className="mt-3 text-sm text-teal-700 dark:text-teal-400">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-medium text-white shadow-sm transition hover:bg-teal-800 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            {mode === "signin" ? (
              <>
                <LogIn size={18} /> {busy ? "Connexion…" : "Se connecter"}
              </>
            ) : mode === "signup" ? (
              <>
                <UserPlus size={18} /> {busy ? "Création…" : "Créer mon compte"}
              </>
            ) : (
              <>
                <KeyRound size={18} /> {busy ? "Envoi…" : "Envoyer le lien"}
              </>
            )}
          </button>

          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className="mt-3 w-full text-center text-xs font-medium text-slate-500 hover:underline dark:text-slate-400"
            >
              ← Retour à la connexion
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

// Messages d'erreur Supabase les plus courants, en français
function traduireErreur(message) {
  if (/invalid login credentials/i.test(message))
    return "Email ou mot de passe incorrect.";
  if (/already registered/i.test(message))
    return "Un compte existe déjà avec cet email.";
  if (/email not confirmed/i.test(message))
    return "Confirme d'abord ton adresse email (lien envoyé par mail).";
  return message;
}
