import { computeMinutes, countUniqueDays, formatDateLong, formatHours, todayISO } from "./time";
import { computeSalary } from "./salary";

// Assistant 100% local : comprend les questions courantes (heures, jours,
// km, résumé, budget, employeur, planning) et répond directement à partir
// des données de l'app — aucun appel à une IA externe, donc instantané,
// gratuit, illimité et fonctionne hors-ligne. Tous les chiffres viennent du
// code fiable de l'app (mêmes fonctions que les écrans).

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

// minuscules + sans accents + apostrophes en espaces, pour comparer facilement
// (ex. « aujourd'hui » → « aujourd hui », « j'ai » → « j ai »).
function norm(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, " ");
}

function readLocal(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function money(n, cur) {
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${Math.round(n)} ${cur}`;
  }
}

const pad2 = (n) => String(n).padStart(2, "0");
const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Repère une DATE PRÉCISE dans la question : « aujourd'hui », « hier »,
// « avant-hier », « le 29/09 », « 29/09/2026 », « le 15 septembre ».
// Renvoie la date au format ISO, ou null si aucune date précise.
function parseDay(qn, now) {
  if (/avant[ -]?hier/.test(qn)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 2);
    return isoOf(d);
  }
  if (/\bhier\b/.test(qn)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return isoOf(d);
  }
  if (/aujourd ?hui|ce jour|ma journee d aujourd/.test(qn)) return isoOf(now);

  // 29/09 ou 29/09/2026 (accepte / . -)
  const slash = qn.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/);
  if (slash) {
    const day = Number(slash[1]);
    const mon = Number(slash[2]);
    let yr = slash[3] ? Number(slash[3]) : now.getFullYear();
    if (yr < 100) yr += 2000;
    if (day >= 1 && day <= 31 && mon >= 1 && mon <= 12) return `${yr}-${pad2(mon)}-${pad2(day)}`;
  }

  // 15 septembre / le 3 aout
  for (let i = 0; i < 12; i++) {
    const mm = qn.match(new RegExp(`\\b(\\d{1,2})\\s+${norm(MOIS[i])}\\b`));
    if (mm) {
      const day = Number(mm[1]);
      const yrMatch = qn.match(/\b(20\d{2})\b/);
      const yr = yrMatch ? Number(yrMatch[1]) : now.getFullYear();
      if (day >= 1 && day <= 31) return `${yr}-${pad2(i + 1)}-${pad2(day)}`;
    }
  }

  // « le 29 » seul → jour du mois en cours
  const md = qn.match(/\ble (\d{1,2})\b/);
  if (md) {
    const day = Number(md[1]);
    if (day >= 1 && day <= 31) return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(day)}`;
  }
  return null;
}

// -------- Détection de la période visée par la question --------
function detectScope(qn) {
  const now = new Date(todayISO() + "T00:00:00");
  const y = now.getFullYear();
  const m = now.getMonth();
  const mk = (yr, mo) => `${yr}-${String(mo + 1).padStart(2, "0")}`;
  const yearMatch = qn.match(/\b(20\d{2})\b/);

  // Date précise en priorité (le plus spécifique)
  const day = parseDay(qn, now);
  if (day) return { type: "day", date: day, label: `le ${formatDateLong(day)}` };

  if (/annee derniere|an dernier|annee passee/.test(qn)) {
    return { type: "year", year: y - 1, label: `en ${y - 1}` };
  }
  if (/cette annee|sur l ?annee|dans l ?annee|de l ?annee|annuel|annee en cours|l ?annee/.test(qn)) {
    const yr = yearMatch ? Number(yearMatch[1]) : y;
    return { type: "year", year: yr, label: `en ${yr}` };
  }
  if (yearMatch && /an\b|annee/.test(qn)) {
    return { type: "year", year: Number(yearMatch[1]), label: `en ${yearMatch[1]}` };
  }
  if (/mois dernier|mois passe|le mois d avant/.test(qn)) {
    const d = new Date(y, m - 1, 1);
    return { type: "month", key: mk(d.getFullYear(), d.getMonth()), label: `en ${MOIS[d.getMonth()]} ${d.getFullYear()}` };
  }
  for (let i = 0; i < 12; i++) {
    if (qn.includes(norm(MOIS[i]))) {
      const yr = yearMatch ? Number(yearMatch[1]) : y;
      return { type: "month", key: mk(yr, i), label: `en ${MOIS[i]} ${yr}` };
    }
  }
  return { type: "month", key: mk(y, m), label: "ce mois-ci" };
}

function inScope(dateStr, scope) {
  if (!dateStr) return false;
  if (scope.type === "day") return dateStr === scope.date;
  if (scope.type === "year") return dateStr.startsWith(`${scope.year}-`);
  return dateStr.startsWith(scope.key);
}

// -------- Agrégations --------
function sumHeures(entries) {
  return entries.reduce((a, e) => a + (Number(e.heures) || 0), 0);
}
function sumKm(entries) {
  return entries.reduce((a, e) => a + (Number(e.km) || 0), 0);
}

// Types de service, dans l'ordre d'une journée. `id` correspond au champ
// `type` stocké sur chaque journée (cf. lib/constants.js).
const TYPES_LIST = [
  { id: "matin", sing: "matin", plur: "matins" },
  { id: "journee", sing: "après-midi", plur: "après-midis" },
  { id: "soir", sing: "soir", plur: "soirs" },
  { id: "journee_complete", sing: "journée complète", plur: "journées complètes" },
  { id: "coupe", sing: "coupé", plur: "coupés" },
];

// Classe UN jour (toutes ses saisies) en un seul type, selon sa composition
// réelle : un matin ne compte comme « matin » que si le jour n'a NI aprem NI
// soir ; s'il y a au moins deux demi-journées (ex. matin + soir), c'est une
// « journée complète ». Un « coupé » ou une « journée complète » saisis tels
// quels gardent leur type.
function classifyDay(dayEntries) {
  const types = new Set(dayEntries.map((e) => e.type));
  if (types.has("coupe")) return "coupe";
  if (types.has("journee_complete")) return "journee_complete";
  const slots = [];
  if (types.has("matin")) slots.push("matin");
  if (types.has("journee")) slots.push("journee"); // aprem
  if (types.has("soir")) slots.push("soir");
  if (slots.length >= 2) return "journee_complete"; // matin + aprem/soir, etc.
  if (slots.length === 1) return slots[0];
  return null;
}

// Compte les jours par type réel (un jour = un seul type, cf. classifyDay).
function dayTypeCounts(entries) {
  const byDate = new Map();
  for (const e of entries) {
    const arr = byDate.get(e.date) || [];
    arr.push(e);
    byDate.set(e.date, arr);
  }
  const counts = { matin: 0, journee: 0, soir: 0, journee_complete: 0, coupe: 0 };
  for (const [, dayEntries] of byDate) {
    const t = classifyDay(dayEntries);
    if (t && counts[t] !== undefined) counts[t] += 1;
  }
  return counts;
}

// Quels types de service la question vise-t-elle ? (qn est déjà sans accents)
function typesVises(qn) {
  const out = [];
  if (/\bmatin/.test(qn)) out.push(TYPES_LIST[0]);
  if (/aprem|apres midi|apres-midi/.test(qn)) out.push(TYPES_LIST[1]);
  if (/\bsoir/.test(qn)) out.push(TYPES_LIST[2]);
  // « journée » / « journées » = le type Journée (complète). « jour » / « jours »
  // (sans le « -née ») reste « jours travaillés » et n'est pas capté ici.
  if (/journee/.test(qn)) out.push(TYPES_LIST[3]);
  if (/coupe|coupes/.test(qn)) out.push(TYPES_LIST[4]);
  return out;
}

function reponseTypes(scope, entries, which) {
  if (entries.length === 0) return `Aucune journée enregistrée ${scope.label}.`;
  const counts = dayTypeCounts(entries);
  const fmt = (t) => {
    const n = counts[t.id] || 0;
    return `${n} ${n > 1 ? t.plur : t.sing}`;
  };
  if (which === "all") {
    const lignes = TYPES_LIST.map((t) => `• ${fmt(t)}`);
    return `Répartition par type ${scope.label} :\n${lignes.join("\n")}`;
  }
  return `Tu as fait ${which.map(fmt).join(", ")} ${scope.label}.`;
}

function topBy(entries, field) {
  const map = new Map();
  for (const e of entries) {
    const key = e[field];
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + (Number(e.heures) || 0));
  }
  let best = null;
  for (const [name, heures] of map) {
    if (!best || heures > best.heures) best = { name, heures };
  }
  return best;
}

function salaireNet(entries) {
  const taux = readLocal("kyzenday:taux-horaire");
  if (!taux) return null;
  const charges = readLocal("kyzenday:taux-charges") || "15";
  const cur = readLocal("kyzenday:currency") || "EUR";
  const minutes = entries.reduce((a, e) => a + computeMinutes(e), 0);
  const { net } = computeSalary(minutes / 60, taux, charges);
  return money(net, cur);
}

function sumByCurrency(txs, type) {
  const m = {};
  for (const t of txs) {
    if (type && t.type !== type) continue;
    const cur = t.currency || "EUR";
    m[cur] = (m[cur] || 0) + (Number(t.montant) || 0);
  }
  return m;
}
function moneyList(m) {
  const parts = Object.entries(m).map(([c, v]) => money(v, c));
  return parts.length ? parts.join(" + ") : "0";
}

// -------- Réponses par intention --------
function reponseResume(scope, entries) {
  if (entries.length === 0) return `Je n'ai aucune journée enregistrée ${scope.label}.`;
  const jours = countUniqueDays(entries);
  const lignes = [
    `Résumé ${scope.label} :`,
    `• ${formatHours(sumHeures(entries))} sur ${jours} jour${jours > 1 ? "s" : ""}`,
    `• ${sumKm(entries).toLocaleString("fr-FR")} km`,
  ];
  const emp = topBy(entries, "employeur");
  if (emp) lignes.push(`• Employeur principal : ${emp.name} (${formatHours(emp.heures)})`);
  const sect = topBy(entries, "secteur");
  if (sect) lignes.push(`• Secteur principal : ${sect.name} (${formatHours(sect.heures)})`);
  const net = salaireNet(entries);
  if (net) lignes.push(`• Salaire net estimé : ${net}`);
  return lignes.join("\n");
}

const TYPE_LABEL = {
  matin: "matin",
  journee: "après-midi",
  soir: "soir",
  journee_complete: "journée complète",
  coupe: "coupé",
};

// Détail d'un jour précis : type réel du jour + chaque créneau saisi.
function reponseJour(scope, entries) {
  if (entries.length === 0) return `Tu n'as rien enregistré ${scope.label}.`;
  const type = TYPE_LABEL[classifyDay(entries)] || "journée";
  const h = sumHeures(entries);
  const km = sumKm(entries);
  const lignes = [`${scope.label} : ${type}, ${formatHours(h)}, ${km.toLocaleString("fr-FR")} km.`];
  const tries = [...entries].sort((a, b) => ((a.debut || "") < (b.debut || "") ? -1 : 1));
  for (const e of tries) {
    const creneau = e.debut && e.fin ? `${e.debut}–${e.fin}` : "";
    const deux = e.debut2 && e.fin2 ? ` puis ${e.debut2}–${e.fin2}` : "";
    const emp = e.employeur ? ` · ${e.employeur}` : "";
    const lieu = e.cms ? ` (${e.cms})` : "";
    lignes.push(`• ${creneau}${deux}${emp}${lieu}`);
  }
  return lignes.join("\n");
}

function reponseBudget(qn, scope, txs) {
  if (txs.length === 0) return `Aucune transaction de budget ${scope.label}.`;
  if (/voiture|essence|carburant|\bauto\b|gasoil|diesel/.test(qn)) {
    const cats = ["voiture", "auto", "essence", "carburant", "gasoil", "diesel"];
    const m = {};
    for (const t of txs) {
      if (t.type !== "depense") continue;
      const cat = norm(t.categorie);
      if (!cats.some((c) => cat.includes(c))) continue;
      const cur = t.currency || "EUR";
      m[cur] = (m[cur] || 0) + (Number(t.montant) || 0);
    }
    if (Object.keys(m).length === 0) return `Aucune dépense « voiture » enregistrée ${scope.label}.`;
    return `Tes dépenses voiture ${scope.label} : ${moneyList(m)}.`;
  }
  if (/revenu|rentre|touche|encaisse/.test(qn)) {
    return `Revenus ${scope.label} : ${moneyList(sumByCurrency(txs, "revenu"))}.`;
  }
  if (/solde|reste|il me reste|epargne/.test(qn)) {
    const r = sumByCurrency(txs, "revenu");
    const d = sumByCurrency(txs, "depense");
    const curs = new Set([...Object.keys(r), ...Object.keys(d)]);
    const parts = [...curs].map((c) => money((r[c] || 0) - (d[c] || 0), c));
    return `Solde ${scope.label} : ${parts.length ? parts.join(" + ") : "0"}.`;
  }
  return `Dépenses ${scope.label} : ${moneyList(sumByCurrency(txs, "depense"))}.`;
}

function reponsePlanning(qn, shifts) {
  const today = todayISO();
  const upcoming = shifts
    .filter((s) => (s.date || "") >= today)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (/repos|libre|conge|off|jour sans/.test(qn)) {
    if (upcoming.length === 0) {
      return "Tu n'as aucune mission planifiée : tes prochains jours sont tous libres 🙂";
    }
    const missionDates = new Set(upcoming.map((s) => s.date));
    const base = new Date(today + "T00:00:00");
    const libres = [];
    for (let i = 0; i < 10; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!missionDates.has(iso)) libres.push(iso);
    }
    if (libres.length === 0) return "Tu as une mission chaque jour sur les 10 prochains jours 💪";
    return `Sur les 10 prochains jours, tu es libre : ${libres.slice(0, 8).map(formatDateLong).join(", ")}.`;
  }

  if (upcoming.length === 0) return "Tu n'as aucune mission planifiée pour l'instant.";
  const lignes = upcoming.slice(0, 6).map((s) => {
    const h = s.debut && s.fin ? ` ${s.debut}–${s.fin}` : "";
    const emp = s.employeur ? ` · ${s.employeur}` : "";
    const lieu = s.lieu || s.cms ? ` (${s.lieu || s.cms})` : "";
    return `• ${formatDateLong(s.date)}${h}${emp}${lieu}`;
  });
  return `Tes prochaines missions :\n${lignes.join("\n")}`;
}

function reponseSalaire(scope, entries) {
  if (entries.length === 0) return `Aucune journée enregistrée ${scope.label}.`;
  const taux = readLocal("kyzenday:taux-horaire");
  if (!taux) {
    return "Je ne connais pas encore ton taux horaire. Renseigne-le dans l'estimation du salaire (accueil → Statistiques) et je pourrai calculer.";
  }
  const net = salaireNet(entries);
  const brutMin = entries.reduce((a, e) => a + computeMinutes(e), 0) / 60;
  const charges = readLocal("kyzenday:taux-charges") || "15";
  const cur = readLocal("kyzenday:currency") || "EUR";
  const { brut } = computeSalary(brutMin, taux, charges);
  return `Salaire estimé ${scope.label} : ${money(brut, cur)} brut, ${net} net (${formatHours(brutMin)} × ${taux} ${cur}, −${charges}% de charges). Estimation indicative.`;
}

function fallback() {
  return [
    "Je n'ai pas bien compris 🤔 Je peux te répondre sur :",
    "• tes heures (« combien d'heures ce mois-ci ? »)",
    "• tes jours travaillés",
    "• par type de service (« combien de matins ? », « combien de coupés ? »)",
    "• tes km",
    "• un résumé du mois (« fais-moi le résumé »)",
    "• ton budget (« mes dépenses », « coût voiture »)",
    "• ton employeur principal",
    "• ton salaire estimé",
    "• tes prochaines missions / jours de repos",
    "",
    "Tu peux préciser une période : « en août », « cette année », « le mois dernier ».",
  ].join("\n");
}

// -------- Point d'entrée --------
export function answerQuestion(question, { entries = [], transactions = [], shifts = [] }) {
  const qn = norm(question);
  const scope = detectScope(qn);
  const scoped = entries.filter((e) => inScope(e.date, scope));
  const scopedTx = transactions.filter((t) => inScope(t.date, scope));

  // Planning (avant tout : « prochaines », « repos »…)
  if (/planning|mission|a venir|prochaine|repos|libre|conge|jour sans/.test(qn)) {
    return reponsePlanning(qn, shifts);
  }
  // Résumé / bilan
  if (/resume|bilan|recap|synthese|le point|fais.*(mois|semaine)|comment.*(mois|va)/.test(qn)) {
    return reponseResume(scope, scoped);
  }
  // Répartition par type (tous les types d'un coup)
  if (/repartition|par type|chaque type|types de|quels types/.test(qn)) {
    return reponseTypes(scope, scoped, "all");
  }
  // Comptage d'un ou plusieurs types précis (matins, soirs, coupés…)
  const typesDemandes = typesVises(qn);
  if (typesDemandes.length > 0) {
    return reponseTypes(scope, scoped, typesDemandes);
  }
  // Employeur principal
  if (/(employeur|agence|boite|patron).*(plus|top|principal)|quel employeur|qui.*(fait travaill|employe le plus)/.test(qn)) {
    if (scoped.length === 0) return `Aucune journée enregistrée ${scope.label}.`;
    const emp = topBy(scoped, "employeur");
    if (!emp) return `Aucun employeur renseigné ${scope.label}.`;
    return `${scope.label === "ce mois-ci" ? "Ce mois-ci" : scope.label}, ton employeur principal est ${emp.name} avec ${formatHours(emp.heures)}.`;
  }
  // Secteur principal
  if (/(secteur|zone).*(plus|top|principal)|quel secteur/.test(qn)) {
    if (scoped.length === 0) return `Aucune journée enregistrée ${scope.label}.`;
    const sect = topBy(scoped, "secteur");
    if (!sect) return `Aucun secteur renseigné ${scope.label}.`;
    return `Ton secteur principal ${scope.label} est ${sect.name} avec ${formatHours(sect.heures)}.`;
  }
  // Budget
  if (/depense|depenser|coute|\bcout\b|budget|revenu|solde|voiture|essence|carburant|rentre|touche/.test(qn)) {
    return reponseBudget(qn, scope, scopedTx);
  }
  // Salaire
  if (/salaire|paie|paye|brut|\bnet\b|gagne|combien.*(gagn|paye)/.test(qn)) {
    return reponseSalaire(scope, scoped);
  }
  // Km
  if (/\bkm\b|kilometre|distance|route|roule/.test(qn)) {
    if (scoped.length === 0) return `Aucune journée enregistrée ${scope.label}.`;
    return `Tu as fait ${sumKm(scoped).toLocaleString("fr-FR")} km ${scope.label}.`;
  }
  // Jours travaillés — on exige « jour » comme vrai mot (\b) pour ne pas
  // capter le « jour » caché dans « aujourd'hui ».
  if (/(combien|nombre).*\bjours?\b|\bjours?\b.*(travaill|bosse|taff)/.test(qn)) {
    if (scoped.length === 0) return `Tu n'as travaillé aucun jour ${scope.label}.`;
    const j = countUniqueDays(scoped);
    return `Tu as travaillé ${j} jour${j > 1 ? "s" : ""} ${scope.label}.`;
  }
  // Heures (métrique de travail par défaut)
  if (/heure|\bh\b|bosse|travaill|taff|combien.*(fait|bosse)/.test(qn)) {
    if (scoped.length === 0) return `Aucune journée enregistrée ${scope.label}.`;
    return `Tu as travaillé ${formatHours(sumHeures(scoped))} ${scope.label}.`;
  }

  // Question sur un jour précis sans métrique explicite : on décrit le jour.
  if (scope.type === "day") return reponseJour(scope, scoped);

  return fallback();
}
