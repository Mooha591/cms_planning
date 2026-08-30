// Sauvegarde / restauration complète des données (toutes les journées,
// tous les mois confondus) — indépendant de l'export CSV mensuel.

const BACKUP_VERSION = 1;

// Construit et télécharge un fichier de sauvegarde JSON
export function exportBackup(entries) {
  const payload = {
    app: "KyzenDay",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    entries,
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kyzenday-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Valide qu'un objet ressemble à une journée exploitable
function isValidEntry(e) {
  return (
    e &&
    typeof e === "object" &&
    typeof e.id !== "undefined" &&
    typeof e.date === "string"
  );
}

// Lit un fichier de sauvegarde et renvoie la liste des journées qu'il
// contient. Rejette si le fichier n'est pas un JSON de sauvegarde valide.
export function parseBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch {
        reject(new Error("Le fichier n'est pas un JSON valide."));
        return;
      }
      const entries = Array.isArray(data) ? data : data?.entries;
      if (!Array.isArray(entries) || !entries.every(isValidEntry)) {
        reject(new Error("Ce fichier ne ressemble pas à une sauvegarde KyzenDay."));
        return;
      }
      resolve(entries);
    };
    reader.readAsText(file);
  });
}
