// Clé de stockage local
export const STORAGE_KEY = "crs:tournees";

// Durées de pause proposées en un tap (minutes)
export const PAUSE_CHIPS = [0, 30, 45, 60, 90];

// Secteurs auxquels une journée/mission peut être rattachée
export const SECTEURS = ["La Côte", "APREMADOL", "APROMAD", "ABSMAD", "Autre"];

// CMS proposés par secteur (canton de Vaud) : permet de choisir le CMS dans
// une liste plutôt que de le taper. Listes indicatives, à compléter au besoin.
// « Autre » n'a pas de liste : saisie libre.
export const CMS_BY_SECTEUR = {
  "La Côte": [
    "Nyon", "Gland", "Rolle", "Aubonne", "Morges", "Gimel", "Begnins",
    "Coppet", "Saint-Prex", "Cossonay",
  ],
  APREMADOL: [
    "Renens", "Bussigny", "Prilly", "Crissier", "Écublens",
    "Chavannes-près-Renens", "Saint-Sulpice", "Villars-Sainte-Croix",
  ],
  APROMAD: [
    "Pully", "Lutry", "Cully", "Oron", "Savigny", "Épalinges",
    "Belmont-sur-Lausanne", "Paudex",
  ],
  ABSMAD: ["Payerne", "Avenches", "Moudon", "Lucens"],
};

// Type de poste / structure où la journée est effectuée
export const POSTES = ["CMS", "Garde 1:1", "EMS", "EPSM", "Autre"];

// Employeurs / agences pour lesquels une journée peut être effectuée
export const EMPLOYEURS = [
  "FICOBA",
  "One Placement",
  "OKJob Genève",
  "OKJob Lausanne",
  "Assisteo",
  "Medicalis Genève",
];

// Types de service et leurs couleurs (classes Tailwind statiques)
export const TYPES = [
  {
    id: "matin",
    label: "Matin",
    seg: "bg-amber-500 text-white border-amber-500",
    segIdle:
      "bg-white text-amber-700 border-amber-200 hover:border-amber-400 dark:bg-slate-900 dark:text-amber-400 dark:border-amber-900 dark:hover:border-amber-600",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  {
    id: "journee",
    label: "Aprem",
    seg: "bg-teal-700 text-white border-teal-700",
    segIdle:
      "bg-white text-teal-800 border-teal-200 hover:border-teal-500 dark:bg-slate-900 dark:text-teal-400 dark:border-teal-900 dark:hover:border-teal-600",
    badge: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
    dot: "bg-teal-700",
  },
  {
    id: "soir",
    label: "Soir",
    seg: "bg-indigo-600 text-white border-indigo-600",
    segIdle:
      "bg-white text-indigo-700 border-indigo-200 hover:border-indigo-400 dark:bg-slate-900 dark:text-indigo-400 dark:border-indigo-900 dark:hover:border-indigo-600",
    badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
    dot: "bg-indigo-600",
  },
  {
    id: "journee_complete",
    label: "Journée",
    seg: "bg-sky-600 text-white border-sky-600",
    segIdle:
      "bg-white text-sky-700 border-sky-200 hover:border-sky-400 dark:bg-slate-900 dark:text-sky-400 dark:border-sky-900 dark:hover:border-sky-600",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
    dot: "bg-sky-600",
  },
  {
    id: "coupe",
    label: "Coupé",
    seg: "bg-violet-600 text-white border-violet-600",
    segIdle:
      "bg-white text-violet-700 border-violet-200 hover:border-violet-400 dark:bg-slate-900 dark:text-violet-400 dark:border-violet-900 dark:hover:border-violet-600",
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
    dot: "bg-violet-600",
  },
];

// Retrouve les métadonnées d'un type à partir de son id
export const typeMeta = (id) => TYPES.find((t) => t.id === id) || TYPES[1];
