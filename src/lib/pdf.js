import { typeMeta } from "./constants";
import { formatDateShort, formatHours } from "./time";

const TEAL = [15, 118, 110]; // teal-700, couleur de marque

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
      e.cms || "—",
      `${(Number(e.km) || 0).toLocaleString("fr-FR")} km`,
      formatHours(e.heures),
    ]);

  autoTable(doc, {
    startY: 34,
    head: [["Date", "Type", "Horaires", "Secteur", "CMS", "Km", "Heures"]],
    body: rows,
    foot: [
      [
        "",
        "",
        "",
        "",
        "TOTAL",
        `${totals.km.toLocaleString("fr-FR")} km`,
        formatHours(totals.heures),
      ],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
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

// "08:00 – 12:00" ou, pour un coupé, les deux services l'un sous l'autre
function formatPlage(e) {
  if (e.type === "coupe") {
    return `${e.debut}–${e.fin} / ${e.debut2}–${e.fin2}`;
  }
  return `${e.debut}–${e.fin}`;
}
