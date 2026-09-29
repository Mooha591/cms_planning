import { typeMeta } from "./constants";
import { budgetTypeMeta } from "./budgetConstants";
import { computeMinutes, countUniqueDays, formatDateShort, formatHours } from "./time";
import { computeSalary } from "./salary";
import { computeCommute, readDistances } from "./commute";

const TEAL = [15, 118, 110]; // teal-700, couleur de marque

const MOIS_LONG = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function readLocal(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function readRatesMap() {
  try {
    return JSON.parse(localStorage.getItem("kyzenday:taux-par-employeur") || "{}");
  } catch {
    return {};
  }
}
function money(n, cur) {
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${Math.round(n)} ${cur}`;
  }
}

// Sous-totaux par devise (sans conversion), pour le pied du tableau
function totalsByCurrency(transactions) {
  const map = new Map();
  for (const t of transactions) {
    const code = t.currency || "EUR";
    const acc = map.get(code) || { revenus: 0, depenses: 0 };
    const montant = Number(t.montant) || 0;
    if (t.type === "revenu") acc.revenus += montant;
    else acc.depenses += montant;
    map.set(code, acc);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

// Construit et télécharge un relevé d'heures mensuel en PDF, mis en page
// (en-tête, tableau des journées, total). jsPDF (~250 Ko) n'est chargé
// qu'au moment où l'export est vraiment demandé, pas au chargement de l'app.
export async function exportMonthPDF({ entries, totals, monthLabel, monthKey }) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...TEAL);
  doc.text("KyzenDay", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90);
  const label = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  doc.text(`Relevé d'heures — ${label}`, 14, 26);

  const rows = [...entries]
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .map((e) => [
      formatDateShort(e.date),
      typeMeta(e.type).label,
      formatPlage(e),
      e.secteur || "Non défini",
      e.poste || "—",
      e.employeur || "—",
      e.cms || "—",
      `${(Number(e.km) || 0).toLocaleString("fr-FR")} km`,
      formatHours(e.heures),
    ]);

  autoTable(doc, {
    startY: 34,
    head: [["Date", "Type", "Horaires", "Secteur", "Poste", "Employeur", "CMS", "Km", "Heures"]],
    body: rows,
    foot: [
      [
        "",
        "",
        "",
        "",
        "",
        "",
        "TOTAL",
        `${totals.km.toLocaleString("fr-FR")} km`,
        formatHours(totals.heures),
      ],
    ],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: TEAL, textColor: 255 },
    footStyles: {
      fillColor: [240, 253, 250],
      textColor: TEAL,
      fontStyle: "bold",
    },
  });

  const finalY = doc.lastAutoTable?.finalY ?? 34;
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(
    `${totals.jours} journée${totals.jours > 1 ? "s" : ""} enregistrée${
      totals.jours > 1 ? "s" : ""
    } · généré le ${new Date().toLocaleDateString("fr-FR")} avec KyzenDay`,
    14,
    finalY + 10,
  );

  doc.save(`kyzenday-releve-${monthKey}.pdf`);
}

// Récapitulatif ANNUEL (pour archives / déclaration) : totaux de l'année,
// détail mois par mois, détail par employeur avec estimation de paie, et
// bilan budget par devise. Ce n'est pas un document officiel : les montants
// brut/net sont des estimations basées sur les taux saisis par l'utilisateur.
export async function exportYearPDF({ year, entries = [], transactions = [] }) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const yearEntries = entries.filter((e) => (e.date || "").startsWith(`${year}-`));
  const yearTx = transactions.filter((t) => (t.date || "").startsWith(`${year}-`));

  const doc = new jsPDF();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...TEAL);
  doc.text("KyzenDay", 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(`Récapitulatif annuel — ${year}`, 14, 26);

  const totHeures = yearEntries.reduce((a, e) => a + (Number(e.heures) || 0), 0);
  const totKm = yearEntries.reduce((a, e) => a + (Number(e.km) || 0), 0);
  const totJours = countUniqueDays(yearEntries);
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(
    `${totJours} jour${totJours > 1 ? "s" : ""} travaillé${totJours > 1 ? "s" : ""}  ·  ${formatHours(totHeures)}  ·  ${totKm.toLocaleString("fr-FR")} km`,
    14,
    33,
  );

  // Détail mois par mois (mois sans activité omis)
  const monthlyRows = [];
  for (let m = 0; m < 12; m++) {
    const key = `${year}-${String(m + 1).padStart(2, "0")}`;
    const me = yearEntries.filter((e) => e.date.startsWith(key));
    if (me.length === 0) continue;
    monthlyRows.push([
      MOIS_LONG[m].charAt(0).toUpperCase() + MOIS_LONG[m].slice(1),
      String(countUniqueDays(me)),
      formatHours(me.reduce((a, e) => a + (Number(e.heures) || 0), 0)),
      `${me.reduce((a, e) => a + (Number(e.km) || 0), 0).toLocaleString("fr-FR")} km`,
    ]);
  }
  autoTable(doc, {
    startY: 40,
    head: [["Mois", "Jours", "Heures", "Km"]],
    body: monthlyRows,
    foot: [["TOTAL", String(totJours), formatHours(totHeures), `${totKm.toLocaleString("fr-FR")} km`]],
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: TEAL, textColor: 255 },
    footStyles: { fillColor: [240, 253, 250], textColor: TEAL, fontStyle: "bold" },
  });

  // Détail par employeur (+ estimation de paie si un taux est configuré)
  const globalTaux = readLocal("kyzenday:taux-horaire");
  const charges = readLocal("kyzenday:taux-charges") || "15";
  const cur = readLocal("kyzenday:currency") || "EUR";
  const perEmp = readRatesMap();
  const anyRate = !!globalTaux || Object.keys(perEmp).length > 0;

  const byEmp = new Map();
  for (const e of yearEntries) {
    if (!e.employeur) continue;
    const acc = byEmp.get(e.employeur) || { entries: [], heures: 0, km: 0, minutes: 0 };
    acc.entries.push(e);
    acc.heures += Number(e.heures) || 0;
    acc.km += Number(e.km) || 0;
    acc.minutes += computeMinutes(e);
    byEmp.set(e.employeur, acc);
  }
  const empRows = [...byEmp.entries()]
    .sort((a, b) => b[1].heures - a[1].heures)
    .map(([emp, t]) => {
      const base = [emp, String(countUniqueDays(t.entries)), formatHours(t.heures), `${t.km.toLocaleString("fr-FR")} km`];
      if (anyRate) {
        const taux = perEmp[emp] || globalTaux || "";
        if (taux) {
          const { brut, net } = computeSalary(t.minutes / 60, taux, charges);
          base.push(money(brut, cur), money(net, cur));
        } else {
          base.push("—", "—");
        }
      }
      return base;
    });

  if (empRows.length > 0) {
    autoTable(doc, {
      startY: (doc.lastAutoTable?.finalY ?? 40) + 8,
      head: [anyRate ? ["Employeur", "Jours", "Heures", "Km", "Brut est.", "Net est."] : ["Employeur", "Jours", "Heures", "Km"]],
      body: empRows,
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: TEAL, textColor: 255 },
    });
  }

  // Bilan budget de l'année, par devise (sans conversion)
  if (yearTx.length > 0) {
    const budgetRows = totalsByCurrency(yearTx).map(([code, v]) => [
      code,
      `${v.revenus.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}`,
      `${v.depenses.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}`,
      `${(v.revenus - v.depenses).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}`,
    ]);
    autoTable(doc, {
      startY: (doc.lastAutoTable?.finalY ?? 40) + 8,
      head: [["Budget — devise", "Revenus", "Dépenses", "Solde"]],
      body: budgetRows,
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: TEAL, textColor: 255 },
    });
  }

  // Trajets domicile ↔ CMS (km déductibles) — seulement les CMS avec une
  // distance renseignée
  const { perCms, totalKm } = computeCommute(yearEntries, readDistances());
  const commuteRows = perCms
    .filter((r) => r.oneWay > 0)
    .map((r) => [
      r.cms,
      String(r.jours),
      `${r.oneWay.toLocaleString("fr-FR")} km`,
      `${r.kmTotal.toLocaleString("fr-FR")} km`,
    ]);
  const hasCommute = commuteRows.length > 0;
  if (hasCommute) {
    autoTable(doc, {
      startY: (doc.lastAutoTable?.finalY ?? 40) + 8,
      head: [["Trajet domicile ↔ CMS", "Jours", "Aller", "Total A/R"]],
      body: commuteRows,
      foot: [["TOTAL km domicile ↔ CMS", "", "", `${totalKm.toLocaleString("fr-FR")} km`]],
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: TEAL, textColor: 255 },
      footStyles: { fillColor: [240, 253, 250], textColor: TEAL, fontStyle: "bold" },
    });
  }

  const finalY = doc.lastAutoTable?.finalY ?? 40;
  doc.setFontSize(8);
  doc.setTextColor(150);
  const notes = [];
  if (anyRate) {
    notes.push("Les montants brut/net sont une ESTIMATION basée sur les taux que tu as saisis — pas des chiffres officiels.");
  }
  if (hasCommute) {
    notes.push("Km domicile ↔ CMS : total indicatif (1 aller-retour par jour travaillé). Applique ton propre barème kilométrique.");
  }
  notes.push(`Document récapitulatif pour tes archives — généré le ${new Date().toLocaleDateString("fr-FR")} avec KyzenDay.`);
  doc.text(notes, 14, finalY + 8);

  doc.save(`kyzenday-recap-${year}.pdf`);
}

// "08:00 – 12:00" ou, quand il y a deux créneaux (coupé, ou journée
// matin/après-midi), les deux plages séparées par un slash
function formatPlage(e) {
  if (e.debut2 && e.fin2) {
    return `${e.debut}–${e.fin} / ${e.debut2}–${e.fin2}`;
  }
  return `${e.debut}–${e.fin}`;
}

// Construit et télécharge un relevé de budget mensuel en PDF. Chaque
// transaction garde sa devise d'origine ; le pied de tableau donne les
// sous-totaux par devise, sans conversion (cf. CurrencyBreakdown à
// l'écran, même logique).
export async function exportBudgetPDF({ transactions, monthLabel, monthKey }) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...TEAL);
  doc.text("KyzenDay", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90);
  const label = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  doc.text(`Budget — ${label}`, 14, 26);

  const rows = [...transactions]
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .map((t) => [
      formatDateShort(t.date),
      budgetTypeMeta(t.type).label,
      t.libelle || "—",
      t.categorie || "—",
      `${(t.type === "revenu" ? "+" : "−")} ${Number(t.montant).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} ${t.currency || "EUR"}`,
    ]);

  const foot = totalsByCurrency(transactions).map(([code, v]) => [
    "",
    `TOTAL ${code}`,
    `Revenus : ${v.revenus.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}`,
    `Dépenses : ${v.depenses.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}`,
    `Solde : ${(v.revenus - v.depenses).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: 34,
    head: [["Date", "Type", "Libellé", "Catégorie", "Montant"]],
    body: rows,
    foot,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: TEAL, textColor: 255 },
    footStyles: {
      fillColor: [240, 253, 250],
      textColor: TEAL,
      fontStyle: "bold",
      fontSize: 7,
    },
  });

  const finalY = doc.lastAutoTable?.finalY ?? 34;
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(
    `${transactions.length} transaction${transactions.length > 1 ? "s" : ""} · généré le ${new Date().toLocaleDateString("fr-FR")} avec KyzenDay`,
    14,
    finalY + 10,
  );

  doc.save(`kyzenday-budget-${monthKey}.pdf`);
}
