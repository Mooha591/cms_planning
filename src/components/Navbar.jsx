import { Link } from "react-router-dom";
import { LogOut, Moon, Settings, Sparkles, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

// Barre supérieure : marque de l'app + réglages (thème, déconnexion).
// La navigation entre pages vit dans <BottomNav />.
export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();

  return (
    <header className="sticky top-0 z-20 bg-teal-900 text-white shadow-sm dark:bg-slate-950">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-2.5">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-lg font-bold tracking-tight">KyzenDay</span>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            to="/assistant"
            className="rounded-lg p-1.5 text-teal-100 transition hover:bg-white/10"
            aria-label="Assistant"
          >
            <Sparkles size={18} />
          </Link>
          <button
            onClick={toggleTheme}
            className="rounded-lg p-1.5 text-teal-100 transition hover:bg-white/10"
            aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link
            to="/reglages"
            className="rounded-lg p-1.5 text-teal-100 transition hover:bg-white/10"
            aria-label="Réglages"
          >
            <Settings size={18} />
          </Link>
          <button
            onClick={signOut}
            className="rounded-lg p-1.5 text-teal-100 transition hover:bg-white/10"
            aria-label="Se déconnecter"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
