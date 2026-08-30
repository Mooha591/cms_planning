// Clé de stockage local (sauvegarde/restauration, cf. lib/backup.js)
export const BUDGET_STORAGE_KEY = "kyzenday:budget";

// Catégories de transactions proposées
export const BUDGET_CATEGORIES = [
  "Salaire",
  "Loyer",
  "Courses",
  "Transport",
  "Santé",
  "Loisirs",
  "Factures",
  "Autre",
];

// Les deux types de transaction et leurs couleurs (classes Tailwind statiques)
export const BUDGET_TYPES = [
  {
    id: "revenu",
    label: "Revenu",
    seg: "bg-teal-700 text-white border-teal-700",
    segIdle:
      "bg-white text-teal-800 border-teal-200 hover:border-teal-500 dark:bg-slate-900 dark:text-teal-400 dark:border-teal-900 dark:hover:border-teal-600",
    badge: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
    amountClass: "text-teal-700 dark:text-teal-400",
    sign: "+",
  },
  {
    id: "depense",
    label: "Dépense",
    seg: "bg-rose-600 text-white border-rose-600",
    segIdle:
      "bg-white text-rose-700 border-rose-200 hover:border-rose-400 dark:bg-slate-900 dark:text-rose-400 dark:border-rose-900 dark:hover:border-rose-600",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    amountClass: "text-rose-600 dark:text-rose-400",
    sign: "−",
  },
];

// Retrouve les métadonnées d'un type à partir de son id
export const budgetTypeMeta = (id) =>
  BUDGET_TYPES.find((t) => t.id === id) || BUDGET_TYPES[1];
