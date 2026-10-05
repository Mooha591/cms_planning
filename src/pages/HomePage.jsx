import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  FileText,
  List,
  NotebookPen,
  Plus,
  Upload,
  HardDriveDownload,
  CloudUpload,
} from "lucide-react";
import { useEntries } from "../context/EntriesContext";
import { useAuth } from "../context/AuthContext";
import { useBudget } from "../context/BudgetContext";
import { usePlanning } from "../context/PlanningContext";
import { useAgencyLogos } from "../context/LogosContext";
import { useDistances } from "../context/DistancesContext";
import MonthSummary from "../components/MonthSummary";
import MonthInsight from "../components/MonthInsight";
import SecteurBreakdown from "../components/SecteurBreakdown";
import EmployeurBreakdown from "../components/EmployeurBreakdown";
import MonthlyTrends from "../components/MonthlyTrends";
import SalaryEstimate from "../components/SalaryEstimate";
import KmEstimate from "../components/KmEstimate";
import MonthCalendar from "../components/MonthCalendar";
import EntryCard from "../components/EntryCard";
import { computeMinutes, countUniqueDays, formatDateLong, monthKeyOf, todayISO } from "../lib/time";
import { exportEntriesCSV } from "../lib/csv";
import { exportMonthPDF, exportEmployerPDF } from "../lib/pdf";
import { applyBackupSettings, exportBackup, parseBackupFile } from "../lib/backup";
import { loadEntries as loadLocalEntries } from "../lib/storage";

const MIGRATION_DISMISSED_KEY = "kyzenday:migration-dismissed";
const STATS_OPEN_KEY = "kyzenday:stats-open";
const HOME_VIEW_KEY = "kyzenday:home-view";

// Page d'accueil : récap du mois + liste des journées
export default function HomePage() {
  const { entries, loading, remove, importEntries } = useEntries();
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name?.trim();
  const { transactions, importTransactions } = useBudget();
  const { shifts, importShifts } = usePlanning();
  const { logos, importLogos } = useAgencyLogos();
  const { distances } = useDistances();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [backupMessage, setBackupMessage] = useState(null);
  // Sauvegarde en attente de confirmation : rien n'est importé tant que
  // l'utilisateur n'a pas vu et validé le résumé (nombre de journées,
  // transactions, missions, logos et réglages contenus dans le fichier).
  const [pendingRestore, setPendingRestore] = useState(null);
  const [restoring, setRestoring] = useState(false);
  // Repliée par défaut : au quotidien, ça évite de rallonger la page
  // avant la liste des journées. Le choix (ouvert/fermé) est mémorisé.
  const [statsOpen, setStatsOpen] = useState(
    () => localStorage.getItem(STATS_OPEN_KEY) === "1",
  );
  function toggleStats() {
    setStatsOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(STATS_OPEN_KEY, next ? "1" : "0");
      } catch {
        // stockage indisponible : le choix ne sera juste pas mémorisé
      }
      return next;
    });
  }

  // Anciennes données trouvées dans le stockage local du navigateur
  // (avant le passage au compte Supabase) : proposer de les migrer.
  const [localBackup, setLocalBackup] = useState([]);
  const [migrating, setMigrating] = useState(false);
  useEffect(() => {
    if (loading || entries.length > 0) return;
    if (localStorage.getItem(MIGRATION_DISMISSED_KEY)) return;
    const old = loadLocalEntries();
    if (old.length > 0) setLocalBackup(old);
  }, [loading, entries.length]);

  async function handleMigrate() {
    setMigrating(true);
    const count = await importEntries(localBackup);
    setMigrating(false);
    setLocalBackup([]);
    localStorage.setItem(MIGRATION_DISMISSED_KEY, "1");
    setBackupMessage({
      type: "ok",
      text: `${count} ancienne${count > 1 ? "s" : ""} journée${count > 1 ? "s" : ""} importée${count > 1 ? "s" : ""} dans ton compte.`,
    });
  }

  function dismissMigration() {
    localStorage.setItem(MIGRATION_DISMISSED_KEY, "1");
    setLocalBackup([]);
  }

  // Choisir un fichier ne l'importe pas tout de suite : on affiche d'abord
  // un résumé (aperçu) pour que l'utilisateur valide ce qu'il va écraser.
  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de réimporter le même fichier plus tard
    if (!file) return;
    setBackupMessage(null);
    try {
      const parsed = await parseBackupFile(file);
      setPendingRestore(parsed);
    } catch (err) {
      setBackupMessage({ type: "error", text: err.message });
    }
  }

  function cancelRestore() {
    setPendingRestore(null);
  }

  async function confirmRestore() {
    if (!pendingRestore) return;
    setRestoring(true);
    const [entriesCount, transactionsCount, planningCount, logosCount] = await Promise.all([
      importEntries(pendingRestore.entries),
      importTransactions(pendingRestore.transactions),
      importShifts(pendingRestore.planning),
      importLogos(pendingRestore.logos),
    ]);
    applyBackupSettings(pendingRestore.settings);
    setRestoring(false);
    setPendingRestore(null);
    const parts = [];
    if (entriesCount) parts.push(`${entriesCount} journée${entriesCount > 1 ? "s" : ""}`);
    if (transactionsCount) parts.push(`${transactionsCount} transaction${transactionsCount > 1 ? "s" : ""}`);
    if (planningCount) parts.push(`${planningCount} mission${planningCount > 1 ? "s" : ""}`);
    if (logosCount) parts.push(`${logosCount} logo${logosCount > 1 ? "s" : ""}`);
    setBackupMessage({
      type: "ok",
      text: parts.length > 0 ? `Importé : ${parts.join(", ")}.` : "Rien à importer dans ce fichier.",
    });
  }

  const [viewMonth, setViewMonth] = useState(() => {
    // Après l'ajout d'une journée, on ouvre l'Accueil sur le mois de
    // cette journée (transmis via l'état de navigation).
    const focus = location.state?.focusDate;
    const d = focus ? new Date(`${focus}T00:00:00`) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const monthKey = monthKeyOf(viewMonth);

  // Journées du mois affiché, les plus récentes d'abord
  const monthEntries = useMemo(
    () =>
      entries
        .filter((e) => e.date.startsWith(monthKey))
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [entries, monthKey],
  );

  // Vue "Journées du mois" : liste (par défaut) ou calendrier — utile pour
  // sauter directement à un jour précis sans faire défiler tout le mois.
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem(HOME_VIEW_KEY) || "liste",
  );
  function changeViewMode(mode) {
    setViewMode(mode);
    try {
      localStorage.setItem(HOME_VIEW_KEY, mode);
    } catch {
      // stockage indisponible : le choix ne sera juste pas mémorisé
    }
  }

  const [selectedDate, setSelectedDate] = useState(null);
  useEffect(() => {
    setSelectedDate(null);
  }, [monthKey]);

  const entriesByDate = useMemo(() => {
    const map = new Map();
    for (const e of monthEntries) {
      const arr = map.get(e.date);
      if (arr) arr.push(e);
      else map.set(e.date, [e]);
    }
    return map;
  }, [monthEntries]);

  const selectedEntries = selectedDate ? entriesByDate.get(selectedDate) || [] : [];

  // Employeurs distincts du mois, pour proposer un relevé par agence.
  const monthEmployers = useMemo(
    () => [...new Set(monthEntries.map((e) => (e.employeur || "").trim()).filter(Boolean))].sort(),
    [monthEntries],
  );

  // Totaux du mois — "jours" compte les dates distinctes, pas les lignes
  // (un jour saisi en 2 créneaux séparés ne doit compter qu'une fois).
  const totals = useMemo(() => {
    const acc = monthEntries.reduce(
      (acc, e) => {
        acc.km += Number(e.km) || 0;
        acc.heures += Number(e.heures) || 0;
        acc.minutes += computeMinutes(e);
        return acc;
      },
      { km: 0, heures: 0, minutes: 0 },
    );
    acc.jours = countUniqueDays(monthEntries);
    return acc;
  }, [monthEntries]);

  const monthLabel = viewMonth.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  function changeMonth(delta) {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-36 pt-6">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-white shadow-sm dark:bg-teal-700">
          <NotebookPen size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-teal-900 dark:text-teal-300">
            {displayName ? `Bonjour, ${displayName}` : "Carnet de tournée"}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Auxiliaire de santé CRS · suivi des heures & kilomètres
          </p>
        </div>
      </header>

      {localBackup.length > 0 && (
        <div className="mb-6 rounded-2xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-800 dark:bg-teal-950/30">
          <p className="flex items-center gap-1.5 text-sm font-medium text-teal-800 dark:text-teal-300">
            <CloudUpload size={16} />
            {localBackup.length} ancienne
            {localBackup.length > 1 ? "s" : ""} journée
            {localBackup.length > 1 ? "s" : ""} trouvée
            {localBackup.length > 1 ? "s" : ""} sur cet appareil
          </p>
          <p className="mt-1 text-xs text-teal-700 dark:text-teal-400">
            Enregistrées avant la mise en place de ton compte. Les importer
            dans ton compte pour les retrouver partout ?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleMigrate}
              disabled={migrating}
              className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              {migrating ? "Import…" : "Importer dans mon compte"}
            </button>
            <button
              onClick={dismissMigration}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 dark:text-teal-400 dark:hover:bg-teal-900/40"
            >
              Ignorer
            </button>
          </div>
        </div>
      )}

      <MonthSummary
        monthLabel={monthLabel}
        totals={totals}
        onPrev={() => changeMonth(-1)}
        onNext={() => changeMonth(1)}
      />

      {monthEntries.length > 0 && (
        <section className="mb-6">
          <button
            type="button"
            onClick={toggleStats}
            aria-expanded={statsOpen}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold uppercase tracking-wide text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
          >
            Statistiques du mois
            <ChevronDown
              size={18}
              className={`transition-transform ${statsOpen ? "rotate-180" : ""}`}
            />
          </button>
          {statsOpen && (
            <div className="mt-4">
              <MonthInsight
                entries={entries}
                monthEntries={monthEntries}
                viewMonth={viewMonth}
                totals={totals}
              />
              <SecteurBreakdown entries={monthEntries} />
              <EmployeurBreakdown entries={monthEntries} />
              <MonthlyTrends entries={entries} />
              <SalaryEstimate heures={totals.minutes / 60} />
              <KmEstimate km={totals.km} />
            </div>
          )}
        </section>
      )}

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Journées du mois
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => changeViewMode("liste")}
                aria-pressed={viewMode === "liste"}
                aria-label="Vue liste"
                className={`rounded-md p-1.5 transition ${
                  viewMode === "liste"
                    ? "bg-teal-700 text-white dark:bg-teal-600"
                    : "text-slate-400 hover:text-teal-700 dark:text-slate-500 dark:hover:text-teal-400"
                }`}
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => changeViewMode("calendrier")}
                aria-pressed={viewMode === "calendrier"}
                aria-label="Vue calendrier"
                className={`rounded-md p-1.5 transition ${
                  viewMode === "calendrier"
                    ? "bg-teal-700 text-white dark:bg-teal-600"
                    : "text-slate-400 hover:text-teal-700 dark:text-slate-500 dark:hover:text-teal-400"
                }`}
              >
                <CalendarDays size={14} />
              </button>
            </div>
            {monthEntries.length > 0 && (
              <>
                <button
                  onClick={() => exportEntriesCSV(monthEntries, totals, monthKey)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-400 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-500 dark:hover:text-teal-400"
                >
                  <Download size={14} /> CSV
                </button>
                <button
                  onClick={() =>
                    exportMonthPDF({ entries: monthEntries, totals, monthLabel, monthKey, distances })
                  }
                  className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
                >
                  <FileText size={14} /> PDF
                </button>
              </>
            )}
          </div>
        </div>

        {monthEmployers.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900">
            <span className="font-medium text-slate-500 dark:text-slate-400">
              Relevé pour l'agence :
            </span>
            {monthEmployers.map((emp) => (
              <button
                key={emp}
                onClick={() =>
                  exportEmployerPDF({
                    entries: monthEntries,
                    employer: emp,
                    monthLabel,
                    monthKey,
                    workerName: displayName,
                  })
                }
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 font-medium text-slate-600 hover:border-teal-400 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-500 dark:hover:text-teal-400"
              >
                <FileText size={13} /> {emp}
              </button>
            ))}
          </div>
        )}

        {viewMode === "calendrier" && (
          <div className="mb-3">
            <MonthCalendar
              viewMonth={viewMonth}
              entriesByDate={entriesByDate}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
            {monthKey !== monthKeyOf(new Date()) && (
              <button
                onClick={() => {
                  setViewMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
                  setSelectedDate(todayISO());
                }}
                className="mt-2 text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
              >
                Revenir à aujourd'hui
              </button>
            )}
          </div>
        )}

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
            Chargement…
          </p>
        ) : viewMode === "calendrier" ? (
          !selectedDate ? (
            <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              Clique un jour du calendrier pour voir ou ajouter ta journée.
            </p>
          ) : selectedEntries.length > 0 ? (
            <ul className="space-y-2">
              {selectedEntries.map((e) => (
                <EntryCard
                  key={e.id}
                  entry={e}
                  onEdit={(id) => navigate(`/modifier/${id}`)}
                  onDelete={remove}
                  onDuplicate={(entry) =>
                    navigate("/nouveau", { state: { duplicateFrom: entry } })
                  }
                />
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 py-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aucune journée le {formatDateLong(selectedDate)}.
              </p>
              <button
                onClick={() => navigate("/nouveau", { state: { date: selectedDate } })}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
              >
                <Plus size={16} /> Ajouter cette journée
              </button>
            </div>
          )
        ) : monthEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aucune journée enregistrée pour ce mois.
            </p>
            <button
              onClick={() => navigate("/nouveau")}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
            >
              <Plus size={16} /> Ajouter une journée
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {monthEntries.map((e) => (
              <EntryCard
                key={e.id}
                entry={e}
                onEdit={(id) => navigate(`/modifier/${id}`)}
                onDelete={remove}
                onDuplicate={(entry) =>
                  navigate("/nouveau", { state: { duplicateFrom: entry } })
                }
              />
            ))}
          </ul>
        )}
      </section>

      {/* Bouton flottant : nouvelle journée (au-dessus de la barre du bas) */}
      <button
        onClick={() => navigate("/nouveau")}
        className="fixed bottom-20 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-teal-700 px-5 py-3 font-medium text-white shadow-lg shadow-teal-900/20 transition hover:bg-teal-800 hover:shadow-xl active:scale-95 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        <Plus size={18} /> Nouvelle journée
      </button>

      <div className="mt-8 border-t border-slate-200 pt-4 text-center dark:border-slate-800">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Tes données sont synchronisées sur ton compte.
        </p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <button
            onClick={() => exportBackup({ entries, transactions, planning: shifts, logos })}
            disabled={
              entries.length === 0 &&
              transactions.length === 0 &&
              shifts.length === 0 &&
              Object.keys(logos).length === 0
            }
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-400 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-500 dark:hover:text-teal-400"
          >
            <HardDriveDownload size={14} /> Sauvegarder
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-400 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-500 dark:hover:text-teal-400"
          >
            <Upload size={14} /> Restaurer
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>

        {pendingRestore && (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left dark:border-amber-900/50 dark:bg-amber-950/20">
            <p className="flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-300">
              <AlertTriangle size={16} /> Aperçu de la sauvegarde
            </p>
            <ul className="mt-2 space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
              <li>{pendingRestore.summary.entries} journée{pendingRestore.summary.entries > 1 ? "s" : ""}</li>
              <li>{pendingRestore.summary.transactions} transaction{pendingRestore.summary.transactions > 1 ? "s" : ""} de budget</li>
              <li>{pendingRestore.summary.planning} mission{pendingRestore.summary.planning > 1 ? "s" : ""} planifiée{pendingRestore.summary.planning > 1 ? "s" : ""}</li>
              <li>{pendingRestore.summary.logos} logo{pendingRestore.summary.logos > 1 ? "s" : ""} d'agence</li>
              <li>{pendingRestore.summary.settings ? "Réglages inclus (taux, devise…)" : "Aucun réglage dans ce fichier"}</li>
            </ul>
            <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-500">
              Les éléments déjà existants (même id) seront mis à jour, rien n'est supprimé.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={confirmRestore}
                disabled={restoring}
                className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Check size={14} /> {restoring ? "Import…" : "Confirmer l'import"}
              </button>
              <button
                onClick={cancelRestore}
                disabled={restoring}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/40"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {backupMessage && (
          <p
            className={`mt-2 text-xs ${
              backupMessage.type === "ok"
                ? "text-teal-700 dark:text-teal-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {backupMessage.text}
          </p>
        )}
      </div>
    </div>
  );
}
