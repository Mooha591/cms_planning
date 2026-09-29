import { computeMinutes, countUniqueDays } from "./time";

// Construit un résumé STRUCTURÉ et déjà calculé des données de l'utilisateur,
// destiné à l'assistant IA. Principe de sûreté : c'est le code de l'app (fiable
// et testé) qui calcule tous les chiffres — l'IA ne fait que les lire et
// répondre en langage naturel, elle ne recalcule jamais rien elle-même.
//
// On envoie des agrégats par mois (pas les lignes brutes) : compact, précis,
// et ça évite d'exposer chaque intervention en détail.

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function round(n) {
  return Math.round(n * 100) / 100;
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  return `${MONTHS_FR[Number(m) - 1]} ${y}`;
}

// Agrège une liste de journées par mois : heures, jours travaillés (dates
// distinctes), km, et répartitions par employeur / secteur / type.
function summariseEntries(entries) {
  const byMonth = new Map();
  for (const e of entries) {
    const key = (e.date || "").slice(0, 7);
    if (!key) continue;
    const acc = byMonth.get(key) || {
      entries: [],
      heures: 0,
      km: 0,
      parEmployeur: {},
      parSecteur: {},
      parType: {},
    };
    acc.entries.push(e);
    acc.heures += round(computeMinutes(e) / 60);
    acc.km += Number(e.km) || 0;
    if (e.employeur) acc.parEmployeur[e.employeur] = round((acc.parEmployeur[e.employeur] || 0) + computeMinutes(e) / 60);
    const sect = e.secteur || "Non défini";
    acc.parSecteur[sect] = round((acc.parSecteur[sect] || 0) + computeMinutes(e) / 60);
    if (e.type) acc.parType[e.type] = (acc.parType[e.type] || 0) + 1;
    byMonth.set(key, acc);
  }

  const mois = [];
  for (const [key, acc] of [...byMonth.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))) {
    mois.push({
      mois: monthLabel(key),
      cle: key,
      heures: round(acc.heures),
      jours_travailles: countUniqueDays(acc.entries),
      km: acc.km,
      heures_par_employeur: acc.parEmployeur,
      heures_par_secteur: acc.parSecteur,
      nombre_saisies_par_type: acc.parType,
    });
  }
  return mois;
}

// Agrège les transactions par mois et par devise (l'app gère plusieurs
// devises) + le détail des dépenses par catégorie (utile pour « coût voiture »).
function summariseBudget(transactions) {
  const byMonth = new Map();
  for (const t of transactions) {
    const key = (t.date || "").slice(0, 7);
    if (!key) continue;
    const cur = t.currency || "EUR";
    const acc = byMonth.get(key) || { devises: {}, depenses_par_categorie: {} };
    const d = acc.devises[cur] || { revenus: 0, depenses: 0 };
    const montant = Number(t.montant) || 0;
    if (t.type === "revenu") d.revenus = round(d.revenus + montant);
    else d.depenses = round(d.depenses + montant);
    acc.devises[cur] = d;
    if (t.type === "depense" && t.categorie) {
      const catKey = `${t.categorie} (${cur})`;
      acc.depenses_par_categorie[catKey] = round((acc.depenses_par_categorie[catKey] || 0) + montant);
    }
    byMonth.set(key, acc);
  }

  const mois = [];
  for (const [key, acc] of [...byMonth.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))) {
    const devises = {};
    for (const [cur, d] of Object.entries(acc.devises)) {
      devises[cur] = { revenus: d.revenus, depenses: d.depenses, solde: round(d.revenus - d.depenses) };
    }
    mois.push({ mois: monthLabel(key), cle: key, devises, depenses_par_categorie: acc.depenses_par_categorie });
  }
  return mois;
}

function readLocal(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

// Rassemble tout le contexte à envoyer à l'assistant.
export function buildAssistantContext({ entries = [], transactions = [], shifts = [] }) {
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  return {
    date_du_jour: todayISO,
    resume: {
      total_journees_enregistrees: entries.length,
      total_transactions: transactions.length,
      missions_planifiees: shifts.length,
    },
    reglages: {
      taux_horaire: readLocal("kyzenday:taux-horaire", null),
      taux_charges_pct: readLocal("kyzenday:taux-charges", null),
      taux_km: readLocal("kyzenday:taux-km", null),
      devise_affichage: readLocal("kyzenday:currency", "EUR"),
    },
    travail_par_mois: summariseEntries(entries),
    budget_par_mois: summariseBudget(transactions),
    planning_a_venir: shifts
      .filter((s) => (s.date || "") >= todayISO)
      .slice(0, 30)
      .map((s) => ({
        date: s.date,
        employeur: s.employeur || null,
        secteur: s.secteur || null,
        horaires: s.debut && s.fin ? `${s.debut}–${s.fin}` : null,
        lieu: s.lieu || s.cms || null,
      })),
    note_types: {
      matin: "service du matin",
      journee: "après-midi",
      soir: "service du soir",
      journee_complete: "journée complète (matin + après-midi)",
      coupe: "journée coupée (deux services séparés)",
    },
  };
}
