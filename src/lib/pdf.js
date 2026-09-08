import { typeMeta } from "./constants";
import { budgetTypeMeta } from "./budgetConstants";
import { formatDateShort, formatHours } from "./time";

const TEAL = [15, 118, 110]; // teal-700, couleur de marque

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
