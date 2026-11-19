import { Component } from "react";

// Capture les erreurs de rendu React (donnée corrompue, bug d'un composant…)
// pour éviter l'écran blanc : affiche un écran de secours au lieu de laisser
// tout l'arbre React se démonter. Doit rester un composant de classe :
// React n'expose pas encore d'équivalent en hook.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Point de branchement pour un suivi d'erreurs en prod (Sentry, etc.).
    console.error("Erreur de rendu interceptée :", error, info);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-gradient-to-b from-teal-50/60 to-slate-50 px-6 text-center dark:from-slate-950 dark:to-slate-900">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Une erreur est survenue
          </h1>
          <p className="max-w-sm text-sm text-slate-600 dark:text-slate-400">
            L'application a rencontré un problème inattendu. Tes données sont en
            sécurité : recharge la page pour continuer.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            Recharger l'application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
