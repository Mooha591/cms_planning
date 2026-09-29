// Trajets domicile ↔ CMS, pour estimer les kilomètres déductibles.
// L'utilisateur saisit la distance ALLER (domicile → CMS) de chaque CMS ;
// on compte un aller-retour par jour travaillé à ce CMS.
//
// Volontairement : on calcule un nombre de KM, jamais un montant déductible
// (le barème fiscal dépend de l'année et de la situation — c'est à
// l'utilisateur de l'appliquer).

const DISTANCES_KEY = "kyzenday:distance-cms";

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
    const oneWay = Number(distances[cms]) || 0;
    const jours = dates.size;
    const kmTotal = jours * oneWay * 2; // un aller-retour par jour travaillé
    if (oneWay > 0) totalKm += kmTotal;
    perCms.push({ cms, jours, oneWay, kmTotal });
  }
  perCms.sort((a, b) => b.kmTotal - a.kmTotal || b.jours - a.jours);
  return { perCms, totalKm };
}
