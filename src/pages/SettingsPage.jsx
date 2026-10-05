import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  KeyRound,
  Settings as SettingsIcon,
  Trash2,
  Type,
  User,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabaseClient";
import Field from "../components/Field";

// Page Réglages & compte : profil, sécurité, affichage, synchronisation,
// suppression du compte.
export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { textSize, setTextSize, textSizes } = useTheme();
  const navigate = useNavigate();

  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // -------- Profil --------
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  // Garde le formulaire aligné sur la vraie valeur enregistrée (ex : après
  // un rechargement, ou une mise à jour de session ailleurs dans l'app).
  useEffect(() => {
    setDisplayName(user?.user_metadata?.full_name || "");
    setEmail(user?.email || "");
  }, [user]);

  async function saveProfile() {
    setProfileSaving(true);
    setProfileMessage(null);
    const payload = { data: { full_name: displayName.trim() } };
    if (email.trim() && email.trim() !== user?.email) payload.email = email.trim();
    const { error } = await supabase.auth.updateUser(payload);
    setProfileSaving(false);
    if (error) {
      setProfileMessage({ type: "error", text: error.message });
      return;
    }
    setProfileMessage({
      type: "ok",
      text:
        payload.email
          ? "Profil enregistré. Vérifie ta boîte mail pour confirmer la nouvelle adresse."
          : "Profil enregistré.",
    });
  }

  // -------- Sécurité --------
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  async function savePassword() {
    setPasswordMessage(null);
    if (password.length < 6) {
      setPasswordMessage({ type: "error", text: "Le mot de passe doit faire au moins 6 caractères." });
      return;
    }
    if (password !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Les deux mots de passe ne correspondent pas." });
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPasswordSaving(false);
    if (error) {
      setPasswordMessage({ type: "error", text: error.message });
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setPasswordMessage({ type: "ok", text: "Mot de passe mis à jour." });
  }

  // -------- Suppression du compte --------
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function deleteAccount() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      const { data, error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await signOut();
      navigate("/");
    } catch (err) {
      setDeleting(false);
      setConfirmingDelete(false);
      setDeleteError(err.message || "Échec de la suppression, réessaie.");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-36 pt-6">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-white shadow-sm dark:bg-teal-700">
          <SettingsIcon size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-teal-900 dark:text-teal-300">
            Réglages & compte
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Gère ton profil, ta sécurité et ta synchronisation.
          </p>
        </div>
      </header>

      {/* Synchronisation */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {online ? <Wifi size={14} /> : <WifiOff size={14} />} Synchronisation
        </h2>
        <div
          className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${
            online
              ? "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
          }`}
        >
          {online ? <Wifi size={16} /> : <WifiOff size={16} />}
          {online
            ? "En ligne — tes changements sont synchronisés avec Supabase."
            : "Hors ligne — reconnecte-toi pour synchroniser tes changements."}
        </div>
      </section>

      {/* Affichage */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <Type size={14} /> Taille du texte
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {textSizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setTextSize(size)}
              className={`rounded-xl border px-2 py-2.5 text-center text-sm font-medium capitalize transition ${
                textSize === size
                  ? "border-teal-600 bg-teal-700 text-white dark:border-teal-500 dark:bg-teal-600"
                  : "border-slate-200 bg-white text-slate-600 hover:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          Agrandit tout le texte de l'app pour un meilleur confort de lecture.
        </p>
      </section>

      {/* Profil */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <User size={14} /> Profil
        </h2>
        <div className="space-y-3">
          <Field label="Nom affiché">
            <input
              type="text"
              placeholder="Ton nom"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Adresse e-mail">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </Field>
        </div>
        {profileMessage && (
          <p
            className={`mt-3 text-sm ${
              profileMessage.type === "ok"
                ? "text-teal-700 dark:text-teal-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {profileMessage.text}
          </p>
        )}
        <button
          onClick={saveProfile}
          disabled={profileSaving}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-medium text-white shadow-sm transition hover:bg-teal-800 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          {profileSaving ? "Enregistrement…" : "Enregistrer le profil"}
        </button>
      </section>

      {/* Sécurité */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <KeyRound size={14} /> Sécurité
        </h2>
        <div className="space-y-3">
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
            />
          </Field>
        </div>
        {passwordMessage && (
          <p
            className={`mt-3 text-sm ${
              passwordMessage.type === "ok"
                ? "text-teal-700 dark:text-teal-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {passwordMessage.text}
          </p>
        )}
        <button
          onClick={savePassword}
          disabled={passwordSaving || !password}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-medium text-white shadow-sm transition hover:bg-teal-800 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          {passwordSaving ? (
            "Enregistrement…"
          ) : (
            <>
              <Check size={18} /> Changer le mot de passe
            </>
          )}
        </button>
      </section>

      {/* Compte (zone à risque) */}
      <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 dark:border-rose-900/50 dark:bg-rose-950/10">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
          <AlertTriangle size={14} /> Zone à risque
        </h2>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
          Supprime définitivement ton compte et toutes tes données (journées,
          budget, planning). Cette action est irréversible.
        </p>
        {deleteError && (
          <p className="mb-3 text-sm text-rose-600 dark:text-rose-400">{deleteError}</p>
        )}
        <button
          onClick={deleteAccount}
          disabled={deleting}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
            confirmingDelete
              ? "bg-rose-600 text-white hover:bg-rose-700"
              : "border border-rose-300 bg-white text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-950/30"
          }`}
        >
          <Trash2 size={18} />
          {deleting
            ? "Suppression…"
            : confirmingDelete
              ? "Confirmer la suppression définitive"
              : "Supprimer mon compte"}
        </button>
      </section>
    </div>
  );
}
