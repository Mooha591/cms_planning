import { STORAGE_KEY } from "./constants";

// Lecture des saisies depuis le stockage local du navigateur
export function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Sauvegarde des saisies
export function saveEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // stockage indisponible : on ignore silencieusement
  }
}
