// Trajets domicile ↔ CMS, pour estimer les kilomètres déductibles.
// L'utilisateur saisit la distance ALLER (domicile → CMS) de chaque CMS ;
// on compte un aller-retour par jour travaillé à ce CMS.
//
// Volontairement : on calcule un nombre de KM, jamais un montant déductible
// (le barème fiscal dépend de l'année et de la situation — c'est à
// l'utilisateur de l'appliquer).

const DISTANCES_KEY = "kyzenday:distance-cms";

// Distances aller (domicile → CMS) connues, pré-remplies automatiquement
// pour que le calcul se fasse sans rien saisir. Domicile de référence :
// 700 rte de Divonne-les-Bains, 01220 Grilly. La correspondance se fait sur
// le nom du CMS (insensible à la casse/aux accents, « CMS Renens » ou
// « renens » fonctionnent). L'utilisateur peut toujours corriger.
const KNOWN_DISTANCES = [
  { match: "renens", km: 49 },
  { match: "bussigny", km: 48 },
  { match: "prilly", km: 50 },
];

function normCms(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Distance aller par défaut pour un CMS (km), ou null si inconnu.
export function defaultDistanceFor(cms) {
  const n = normCms(cms);
  for (const d of KNOWN_DISTANCES) {
    if (n.includes(d.match)) return d.km;
  }
  return null;
}

// Distance aller retenue pour un CMS : valeur saisie par l'utilisateur si
// présente, sinon la valeur connue par défaut, sinon 0.
function resolveOneWay(cms, distances) {
  const custom = distances[cms];
  if (custom !== undefined && custom !== null && String(custom).trim() !== "") {
    const n = Number(custom);
    if (!Number.isNaN(n)) return { km: n, isDefault: false };
  }
  const def = defaultDistanceFor(cms);
  if (def != null) return { km: def, isDefault: true };
  return { km: 0, isDefault: false };
}

export function readDistances() {
  try {
    return JSON.parse(localStorage.getItem(DISTANCES_KEY) || "{}");
  } catch {
    return {};
  }
}

export function writeDistances(map) {
  try {
    localStorage.setItem(DISTANCES_KEY, JSON.stringify(map));
  } catch {
    // stockage indisponible : les distances ne seront juste pas mémorisées
  }
}

// À partir des journées et des distances aller (par CMS), calcule pour chaque
// CMS : le nombre de jours travaillés (dates distinctes), la distance aller,
// et le total aller-retour de l'année. Plus le grand total.
export function computeCommute(entries, distances) {
  const daysByCms = new Map(); // cms -> Set de dates distinctes
  for (const e of entries) {
    const cms = (e.cms || "").trim();
    if (!cms) continue;
    if (!daysByCms.has(cms)) daysByCms.set(cms, new Set());
    daysByCms.get(cms).add(e.date);
  }

  const perCms = [];
  let totalKm = 0;
  for (const [cms, dates] of daysByCms) {
    const { km: oneWay, isDefault } = resolveOneWay(cms, distances);
    const jours = dates.size;
    const kmTotal = jours * oneWay * 2; // un aller-retour par jour travaillé
    if (oneWay > 0) totalKm += kmTotal;
    perCms.push({ cms, jours, oneWay, isDefault, kmTotal });
  }
  perCms.sort((a, b) => b.kmTotal - a.kmTotal || b.jours - a.jours);
  return { perCms, totalKm };
}
