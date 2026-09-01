import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { EntriesProvider } from "./context/EntriesContext";
import { BudgetProvider } from "./context/BudgetContext";
import { PlanningProvider } from "./context/PlanningContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import Logo from "./components/Logo";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// Pages chargées à la demande (code-splitting) : seul le bundle de la
// page réellement visitée est téléchargé, pas les cinq d'un coup.
const HomePage = lazy(() => import("./pages/HomePage"));
const EntryFormPage = lazy(() => import("./pages/EntryFormPage"));
const BudgetPage = lazy(() => import("./pages/BudgetPage"));
const BudgetFormPage = lazy(() => import("./pages/BudgetFormPage"));
const PlanningPage = lazy(() => import("./pages/PlanningPage"));
const PlanningFormPage = lazy(() => import("./pages/PlanningFormPage"));
const HistoriquePage = lazy(() => import("./pages/HistoriquePage"));
const ChillPage = lazy(() => import("./pages/ChillPage"));

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-teal-50/60 to-slate-50 dark:from-slate-950 dark:to-slate-900">
      <div className="animate-pulse">
        <Logo size={40} />
      </div>
    </div>
  );
}

// Définition des routes (pages) de l'application
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Accessible sans session active : le lien de l'email crée une
              session de récupération temporaire, gérée dans la page elle-même. */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/*" element={<AuthGate />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

// N'affiche l'app qu'une fois la session vérifiée : écran de connexion si
// personne n'est authentifié, sinon les pages protégées.
function AuthGate() {
  const { session, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!session) return <LoginPage />;

  return (
    <EntriesProvider>
      <BudgetProvider>
       <PlanningProvider>
        <div className="relative min-h-[100dvh] w-full text-left text-slate-900 dark:text-slate-100">
          {/* Dégradé de fond peint une seule fois (couche fixe) plutôt que
              repeint à chaque frame pendant le scroll */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-teal-50/60 to-slate-50 dark:from-slate-950 dark:to-slate-900"
          />
          <Navbar />
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/nouveau" element={<EntryFormPage />} />
              <Route path="/modifier/:id" element={<EntryFormPage />} />
              <Route path="/budget" element={<BudgetPage />} />
              <Route path="/budget/nouveau" element={<BudgetFormPage />} />
              <Route path="/budget/modifier/:id" element={<BudgetFormPage />} />
              <Route path="/planning" element={<PlanningPage />} />
              <Route path="/planning/nouveau" element={<PlanningFormPage />} />
              <Route path="/planning/modifier/:id" element={<PlanningFormPage />} />
              <Route path="/historique" element={<HistoriquePage />} />
              <Route path="/chill" element={<ChillPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <BottomNav />
        </div>
       </PlanningProvider>
      </BudgetProvider>
    </EntriesProvider>
  );
}
