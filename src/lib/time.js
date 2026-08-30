// -------- Utilitaires de dates et de calcul d'heures --------

// Date du jour au format "YYYY-MM-DD" (heure locale)
export function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

// Clé de mois "YYYY-MM" à partir d'un objet Date
export function monthKeyOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Durée en minutes entre deux heures "HH:MM" (gère le passage de minuit)
export function durMin(a, b) {
  if (!a || !b) return 0;
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  let m = bh * 60 + bm - (ah * 60 + am);
  if (m < 0) m += 24 * 60;
  return m;
}

// Minutes -> heures décimales arrondies (ex : 90 -> 1.5)
export function toHours(min) {
  return Math.round((min / 60) * 100) / 100;
}

// Heures travaillées d'une saisie selon son type
//   coupé   : (matin fin - début) + (soir fin - début)
//   autres  : (fin - début) - pause du midi
export function computeHours(f) {
  if (f.type === "coupe") {
    return toHours(durMin(f.debut, f.fin) + durMin(f.debut2, f.fin2));
  }
  const m = durMin(f.debut, f.fin) - (Number(f.pause) || 0);
  return toHours(Math.max(0, m));
}

// Durée de la coupure du midi d'un coupé (entre fin matin et reprise soir)
export function coupeGap(f) {
  if (!f.fin || !f.debut2) return 0;
  return durMin(f.fin, f.debut2);
}

// Heures décimales -> "7h30"
export function formatHours(h) {
  const n = Number(h) || 0;
  const H = Math.floor(n);
  const m = Math.round((n - H) * 60);
  return m === 0 ? `${H}h` : `${H}h${String(m).padStart(2, "0")}`;
}

// Minutes -> "45 min" / "1h30"
export function formatDuree(min) {
  const n = Number(min) || 0;
  if (n === 0) return "0";
  if (n < 60) return `${n} min`;
  const H = Math.floor(n / 60);
  const m = n % 60;
  return m === 0 ? `${H}h` : `${H}h${String(m).padStart(2, "0")}`;
}

// "2026-08-25" -> "lun. 25 août"
export function formatDateLong(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// "2026-08-25" -> "25/08/2026"
export function formatDateShort(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR");
}

// Les n derniers mois calendaires (dont le mois en cours), du plus ancien
// au plus récent — sert de base aux graphiques d'évolution.
export function lastMonths(n) {
  const now = new Date();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }
  return out;
}
