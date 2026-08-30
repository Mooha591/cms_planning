import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Download,
  FileText,
  NotebookPen,
  Plus,
  Upload,
  HardDriveDownload,
  CloudUpload,
} from "lucide-react";
import { useEntries } from "../context/EntriesContext";
import MonthSummary from "../components/MonthSummary";
import MonthInsight from "../components/MonthInsight";
import SecteurBreakdown from "../components/SecteurBreakdown";
import EmployeurBreakdown from "../components/EmployeurBreakdown";
import MonthlyTrends from "../components/MonthlyTrends";
import SalaryEstimate from "../components/SalaryEstimate";
import EntryCard from "../components/EntryCard";
import { monthKeyOf } from "../lib/time";
import { exportEntriesCSV } from "../lib/csv";
import { exportMonthPDF } from "../lib/pdf";
import { exportBackup, parseBackupFile } from "../lib/backup";
import { loadEntries as loadLocalEntries } from "../lib/storage";

const MIGRATION_DISMISSED_KEY = "kyzenday:migration-dismissed";

// Page d'accueil : récap du mois + liste des journées
export default function HomePage() {
  const { entries, loading, remove, importEntries } = useEntries();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [backupMessage, setBackupMessage] = useState(null);

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

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de réimporter le même fichier plus tard
    if (!file) return;
    try {
      const imported = await parseBackupFile(file);
      const count = await importEntries(imported);
      setBackupMessage({
        type: "ok",
        text: `${count} journée${count > 1 ? "s" : ""} importée${count > 1 ? "s" : ""}.`,
      });
    } catch (err) {
      setBackupMessage({ type: "error", text: err.message });
    }
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

  // Totaux du mois
  const totals = useMemo(
    () =>
      monthEntries.reduce(
        (acc, e) => {
          acc.km += Number(e.km) || 0;
          acc.heures += Number(e.heures) || 0;
          acc.jours += 1;
          return acc;
        },
        { km: 0, heures: 0, jours: 0 },
      ),
    [monthEntries],
  );

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
            Carnet de tournée
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

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Journées du mois
          </h2>
          {monthEntries.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => exportEntriesCSV(monthEntries, totals, monthKey)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-400 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-500 dark:hover:text-teal-400"
              >
                <Download size={14} /> CSV
              </button>
              <button
                onClick={() =>
                  exportMonthPDF({ entries: monthEntries, totals, monthLabel, monthKey })
                }
                className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                <FileText size={14} /> PDF
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
            Chargement…
          </p>
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

      {monthEntries.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Statistiques
          </h2>
          <MonthInsight
            entries={entries}
            monthEntries={monthEntries}
            viewMonth={viewMonth}
            totals={totals}
          />
          <SecteurBreakdown entries={monthEntries} />
          <EmployeurBreakdown entries={monthEntries} />
          <MonthlyTrends entries={entries} />
          <SalaryEstimate heures={totals.heures} />
        </section>
      )}

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
            onClick={() => exportBackup(entries)}
            disabled={entries.length === 0}
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
