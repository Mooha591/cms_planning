// Clé de stockage local
export const STORAGE_KEY = "crs:tournees";

// Durées de pause proposées en un tap (minutes)
export const PAUSE_CHIPS = [0, 30, 45, 60, 90];

// Secteurs auxquels une journée/mission peut être rattachée
export const SECTEURS = ["La Côte", "APREMADOL", "APROMAD", "ASPMAD", "Autre"];

// CMS officiels par secteur (fournis par l'utilisateur). Affichés dans une
// liste déroulante. « Autre » et les secteurs absents d'ici → saisie libre,
// et les CMS déjà saisis dans l'historique s'ajoutent automatiquement.
export const CMS_BY_SECTEUR = {
  "La Côte": [
    "CMS d'Aubonne",
    "CMS de Gland Région",
    "CMS de Gland Ville",
    "CMS de Morges-Est",
    "CMS de Morges-Ouest",
    "CMS de Nyon",
    "CMS de Rolle",
    "CMS de Saint-Prex",
    "CMS de Terre-Sainte",
  ],
  APREMADOL: [
    "CMS de Bussigny et Villars-Ste-Croix",
    "CMS d'Ecublens, Saint-Sulpice et Chavannes-près-Renens",
    "CMS de Renens Nord-Crissier",
    "CMS Renens Sud",
  ],
  APROMAD: [
    "CMS de Cully",
    "CMS d'Echallens",
    "CMS d'Epalinges",
    "CMS du Mont",
    "CMS d'Oron",
    "CMS de Prilly Nord",
    "CMS de Prilly Sud",
    "CMS de Pully",
  ],
  ASPMAD: [
    "CMS Cossonay",
    "CMS Grandson",
    "CMS La Vallée",
    "CMS Orbe",
    "CMS Sainte-Croix",
    "CMS Vallorbe",
    "CMS Yverdon",
    "CMS Yvonand",
  ],
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
