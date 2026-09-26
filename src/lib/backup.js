// Sauvegarde / restauration complète des données de l'utilisateur —
// journées, budget, planning, logos d'agences et réglages (taux horaire,
// charges, taux par employeur, taux kilométrique, devise). Indépendant des
// exports CSV/PDF mensuels, qui ne portent que sur un mois donné.

const BACKUP_VERSION = 2;

// Clés localStorage incluses dans la sauvegarde — uniquement des réglages,
// jamais de données de session ou de préférences d'affichage éphémères.
const SETTINGS_KEYS = [
  "kyzenday:taux-horaire",
  "kyzenday:taux-charges",
  "kyzenday:taux-par-employeur",
  "kyzenday:taux-km",
  "kyzenday:currency",
];

function readSettings() {
  const settings = {};
  for (const key of SETTINGS_KEYS) {
    try {
      const v = localStorage.getItem(key);
      if (v !== null) settings[key] = v;
    } catch {
      // stockage indisponible : ce réglage sera juste absent de la sauvegarde
    }
  }
  return settings;
}

// N'écrit que des clés de réglages connues — jamais de contenu arbitraire
// venu d'un fichier importé.
function writeSettings(settings) {
  if (!settings || typeof settings !== "object") return;
  for (const key of SETTINGS_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(settings, key)) continue;
    try {
      localStorage.setItem(key, settings[key]);
    } catch {
      // stockage indisponible : ce réglage ne sera juste pas restauré
    }
  }
}

// Construit et télécharge un fichier de sauvegarde JSON complet.
export function exportBackup({ entries = [], transactions = [], planning = [], logos = {} }) {
  const payload = {
    app: "KyzenDay",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    entries,
    transactions,
    planning,
    logos, // { [employeur]: dataUrl }
    settings: readSettings(),
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

// Un objet daté avec un id suffit à valider une journée/transaction/mission
function hasIdAndDate(e) {
  return e && typeof e === "object" && typeof e.id !== "undefined" && typeof e.date === "string";
}

// Lit un fichier de sauvegarde et renvoie son contenu structuré, prêt à être
// prévisualisé avant import (rien n'est écrit ici). Reste compatible avec
// les anciens fichiers v1 (juste un tableau — ou {entries: [...]}).
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

      // Sauvegarde v1 : un tableau de journées, ou { entries: [...] } sans
      // les autres catégories.
      const rawEntries = Array.isArray(data) ? data : data?.entries;
      if (!Array.isArray(rawEntries) || !rawEntries.every(hasIdAndDate)) {
        reject(new Error("Ce fichier ne ressemble pas à une sauvegarde KyzenDay."));
        return;
      }

      const transactions = Array.isArray(data?.transactions) ? data.transactions : [];
      const planning = Array.isArray(data?.planning) ? data.planning : [];
      const logos = data?.logos && typeof data.logos === "object" ? data.logos : {};
      const settings = data?.settings && typeof data.settings === "object" ? data.settings : null;

      if (!transactions.every(hasIdAndDate) || !planning.every(hasIdAndDate)) {
        reject(new Error("Ce fichier ne ressemble pas à une sauvegarde KyzenDay valide."));
        return;
      }

      resolve({
        version: Array.isArray(data) ? 1 : data?.version || 1,
        entries: rawEntries,
        transactions,
        planning,
        logos,
        settings,
        // Résumé affiché avant confirmation de l'import — jamais d'import
        // silencieux.
        summary: {
          entries: rawEntries.length,
          transactions: transactions.length,
          planning: planning.length,
          logos: Object.keys(logos).length,
          settings: !!settings && Object.keys(settings).length > 0,
        },
      });
    };
    reader.readAsText(file);
  });
}

// Applique les réglages (taux, devise…) d'une sauvegarde restaurée.
export function applyBackupSettings(settings) {
  writeSettings(settings);
}
