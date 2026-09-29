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
  // APREMADOL (Ouest lausannois)
  { match: "renens", km: 49 },
  { match: "bussigny", km: 48 },
  { match: "prilly", km: 50 },
  // La Côte — « gland ville » / « gland region » avant tout « gland » générique
  { match: "gland ville", km: 19 },
  { match: "gland region", km: 20 },
  { match: "morges", km: 39 },
  { match: "nyon", km: 15 },
  { match: "rolle", km: 26 },
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

// Nombre d'allers-retours domicile↔travail pour UN jour, selon sa composition :
//   - coupé : deux services séparés (retour maison entre les deux) → 2
//   - matin + soir (après-midi libre → on rentre) → 2
//   - matin + après-midi (continu, on reste) → 1
//   - service unique / journée complète → 1
function tripsForDay(dayEntries) {
  const types = new Set(dayEntries.map((e) => e.type));
  if (types.has("coupe")) return 2;
  const hasMatin = types.has("matin");
  const hasAprem = types.has("journee"); // "journee" = après-midi (Aprem)
  const hasSoir = types.has("soir");
  // Un service du soir après un service de journée = retour maison entre-temps.
  if (hasSoir && (hasMatin || hasAprem)) return 2;
  return 1;
}

// À partir des journées et des distances aller (par CMS), calcule pour chaque
// CMS : les jours travaillés, le nombre d'allers-retours (selon le type de
// journée), la distance aller, et le total km. Plus le grand total.
export function computeCommute(entries, distances) {
  // cms -> (date -> saisies de ce jour), pour compter les A/R jour par jour
  const byCms = new Map();
  for (const e of entries) {
    const cms = (e.cms || "").trim();
    if (!cms) continue;
    if (!byCms.has(cms)) byCms.set(cms, new Map());
    const byDate = byCms.get(cms);
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date).push(e);
  }

  const perCms = [];
  let totalKm = 0;
  for (const [cms, byDate] of byCms) {
    const { km: oneWay, isDefault } = resolveOneWay(cms, distances);
    let jours = 0;
    let allersRetours = 0;
    for (const [, dayEntries] of byDate) {
      jours += 1;
      allersRetours += tripsForDay(dayEntries);
    }
    const kmTotal = allersRetours * oneWay * 2; // chaque A/R = 2 × distance aller
    if (oneWay > 0) totalKm += kmTotal;
    perCms.push({ cms, jours, allersRetours, oneWay, isDefault, kmTotal });
  }
  perCms.sort((a, b) => b.kmTotal - a.kmTotal || b.jours - a.jours);
  return { perCms, totalKm };
}

// Km domicile↔CMS attribués PAR JOURNÉE (par saisie), pour les afficher en
// colonne dans un relevé. Un créneau « continu » (après-midi juste après le
// matin) ne rajoute pas de trajet ; un soir après une journée, ou un coupé,
// en rajoute un. La somme de la colonne = total déductible.
export function computeEntryCommute(entries, distances) {
  const groups = new Map(); // "date__cms" -> saisies
  for (const e of entries) {
    const cms = (e.cms || "").trim();
    const key = `${e.date}__${cms}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }

  const perEntry = new Map(); // id -> km attribués
  let totalKm = 0;
  for (const [key, group] of groups) {
    const cms = key.split("__")[1] || "";
    const { km: oneWay } = cms ? resolveOneWay(cms, distances) : { km: 0 };
    const sorted = [...group].sort((a, b) => ((a.debut || "") < (b.debut || "") ? -1 : 1));
    let presenceJour = false; // a-t-on déjà un créneau de jour (matin/aprem) ?
    for (const e of sorted) {
      let trips;
      if (e.type === "coupe") {
        trips = 2; // deux services séparés
      } else if (!presenceJour) {
        trips = 1; // premier créneau du jour
      } else if (e.type === "soir") {
        trips = 1; // soir après une journée = retour maison puis re-trajet
      } else {
        trips = 0; // continu (aprem juste après le matin)
      }
      if (e.type !== "soir") presenceJour = true;
      const km = trips * oneWay * 2;
      perEntry.set(e.id, km);
      if (oneWay > 0) totalKm += km;
    }
  }
  return { perEntry, totalKm };
}
