import { budgetTypeMeta } from "./budgetConstants";

const num = (n) => String(Number(n) || 0).replace(".", ",");

// Regroupe les transactions par devise (sans conversion — les vrais
// montants qui ont bougé sur chaque compte), pour les sous-totaux.
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

// Construit et télécharge un CSV du budget du mois (séparateur ";",
// compatible Excel FR). Chaque transaction garde sa devise d'origine ;
// les sous-totaux sont calculés par devise, sans conversion.
export function exportBudgetCSV(transactions, monthKey) {
  if (!transactions.length) return;

  const head = ["Date", "Type", "Libellé", "Catégorie", "Montant", "Devise"];

  const rows = [...transactions]
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .map((t) =>
      [
        t.date,
        budgetTypeMeta(t.type).label,
        (t.libelle || "").replace(/;/g, ","),
        t.categorie || "",
        num(t.montant),
        t.currency || "EUR",
      ].join(";"),
    );

  rows.push("");
  for (const [code, v] of totalsByCurrency(transactions)) {
    rows.push(`TOTAL;Revenus;;;${num(v.revenus)};${code}`);
    rows.push(`TOTAL;Dépenses;;;${num(v.depenses)};${code}`);
    rows.push(`TOTAL;Solde;;;${num(v.revenus - v.depenses)};${code}`);
  }

  const csv = "﻿" + [head.join(";"), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `budget-${monthKey}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
