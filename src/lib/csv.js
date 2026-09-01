import { typeMeta } from "./constants";

// Construit et télécharge un CSV (séparateur ";", compatible Excel FR)
export function exportEntriesCSV(entries, totals, monthKey) {
  if (!entries.length) return;

  const head = [
    "Date",
    "Type",
    "Début",
    "Fin",
    "Reprise début",
    "Reprise fin",
    "Coupure/Pause (min)",
    "CMS",
    "Secteur",
    "Employeur",
    "Poste",
    "Kilomètres",
    "Heures",
  ];

  const rows = [...entries]
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .map((e) =>
      [
        e.date,
        typeMeta(e.type).label,
        e.debut || "",
        e.fin || "",
        e.debut2 || "",
        e.fin2 || "",
        e.pause ?? 0,
        e.cms || "",
        e.secteur || "Non défini",
        e.employeur || "",
        e.poste || "",
        String(e.km ?? 0).replace(".", ","),
        String(e.heures ?? 0).replace(".", ","),
      ].join(";")
    );

  rows.push("");
  rows.push(
    `TOTAL;;;;;;;;;;;${String(totals.km).replace(".", ",")};${String(
      totals.heures
    ).replace(".", ",")}`
  );

  const csv = "\uFEFF" + [head.join(";"), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tournees-${monthKey}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
