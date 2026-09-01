// Paie par employeur — configuration stockée sur l'appareil (pas de
// table Supabase pour l'instant) : les taux par agence et les montants
// réellement reçus, mois par mois.

const RATES_KEY = "kyzenday:paie-taux"; // { [employeur]: { h, km } }
const RECU_KEY = "kyzenday:paie-recu"; // { [moisKey]: { [employeur]: montant } }
const KM_KEY = "kyzenday:taux-km"; // taux km global (carte Indemnité kilométrique)

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}

function write(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
  } catch {
    // stockage indisponible : la valeur ne sera juste pas mémorisée
  }
}

export function loadRates() {
  return read(RATES_KEY);
}

export function saveRates(rates) {
  write(RATES_KEY, rates);
}

export function loadRecu() {
  return read(RECU_KEY);
}

export function saveRecu(recu) {
  write(RECU_KEY, recu);
}

// Taux au km par défaut : celui de la carte « Indemnité kilométrique »,
// sinon le barème suisse usuel (0.70).
export function defaultKmRate() {
  try {
    const v = localStorage.getItem(KM_KEY);
    return v != null && v !== "" ? Number(v) : 0.7;
  } catch {
    return 0.7;
  }
}

export const chf = new Intl.NumberFormat("fr-CH", {
  style: "currency",
  currency: "CHF",
  maximumFractionDigits: 2,
});
