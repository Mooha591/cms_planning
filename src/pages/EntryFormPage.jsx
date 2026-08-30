import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Clock,
  Coffee,
  Plus,
  Sunrise,
  Sunset,
} from "lucide-react";
import { useEntries } from "../context/EntriesContext";
import Field from "../components/Field";
import TypeSelector from "../components/TypeSelector";
import PauseSelector from "../components/PauseSelector";
import TimeInput from "../components/TimeInput";
import {
  computeHours,
  coupeGap,
  formatDuree,
  formatHours,
  todayISO,
} from "../lib/time";
import { SECTEURS } from "../lib/constants";

const emptyForm = {
  date: todayISO(),
  type: "journee",
  debut: "",
  fin: "",
  debut2: "",
  fin2: "",
  pause: "",
  cms: "",
  secteur: "",
  km: "",
};

// Page de création / modification d'une journée
export default function EntryFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { entries, upsert, getById } = useEntries();

  const editing = Boolean(id);
  const duplicateFrom = location.state?.duplicateFrom;

  // État initial : formulaire vide, pré-rempli en édition, ou pré-rempli
  // depuis une journée à dupliquer (date remise à aujourd'hui)
  const [form, setForm] = useState(() => {
    if (id) {
      const e = getById(id);
      if (e) {
        return {
          date: e.date,
          type: e.type,
          debut: e.debut || "",
          fin: e.fin || "",
          debut2: e.debut2 || "",
          fin2: e.fin2 || "",
          pause: e.type !== "coupe" && e.pause ? String(e.pause) : "",
          cms: e.cms || "",
          secteur: e.secteur || "",
          km: String(e.km ?? ""),
        };
      }
    }
    if (duplicateFrom) {
      return {
        date: todayISO(),
        type: duplicateFrom.type,
        debut: duplicateFrom.debut || "",
        fin: duplicateFrom.fin || "",
        debut2: duplicateFrom.debut2 || "",
        fin2: duplicateFrom.fin2 || "",
        pause:
          duplicateFrom.type !== "coupe" && duplicateFrom.pause
            ? String(duplicateFrom.pause)
            : "",
        cms: duplicateFrom.cms || "",
        secteur: duplicateFrom.secteur || "",
        km: String(duplicateFrom.km ?? ""),
      };
    }
    return emptyForm;
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isCoupe = form.type === "coupe";
  const gap = coupeGap(form);
  const previewHours = computeHours(form);

  // Liste des CMS déjà saisis pour l'autocomplétion
  const cmsSuggestions = useMemo(
    () => [...new Set(entries.map((e) => e.cms).filter(Boolean))].sort(),
    [entries],
  );

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // En passant en "Coupé", on pré-remplit la reprise du soir à 16h
  // (heure de reprise la plus courante) si elle n'est pas déjà saisie.
  function setType(v) {
    setForm((f) => ({
      ...f,
      type: v,
      debut2: v === "coupe" && !f.debut2 ? "16:00" : f.debut2,
    }));
  }

  async function submit() {
    if (!form.date) return setError("Indique la date.");
    if (!form.secteur) return setError("Sélectionne un secteur.");
    if (isCoupe) {
      if (!form.debut || !form.fin)
        return setError("Renseigne les horaires du premier service (début et fin).");
      if (!form.debut2 || !form.fin2)
        return setError("Renseigne les horaires de la reprise (début et fin).");
    } else if (!form.debut || !form.fin) {
      return setError("Indique l'heure de début et l'heure de fin.");
    }

    const heures = computeHours(form);
    if (heures <= 0)
      return setError("La durée calculée est nulle : vérifie les horaires.");

    setSaving(true);
    setError("");
    try {
      await upsert({
        id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: form.date,
        type: form.type,
        debut: form.debut,
        fin: form.fin,
        debut2: isCoupe ? form.debut2 : "",
        fin2: isCoupe ? form.fin2 : "",
        pause: isCoupe ? coupeGap(form) : Number(form.pause) || 0,
        heures,
        cms: form.cms.trim(),
        secteur: form.secteur,
        km: Number(form.km) || 0,
      });
      navigate("/");
    } catch {
      setSaving(false);
      setError("Impossible d'enregistrer : vérifie ta connexion et réessaie.");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-6">
      <header className="mb-5 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Retour"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-semibold tracking-tight text-teal-900 dark:text-teal-300">
          {editing
            ? "Modifier la journée"
            : duplicateFrom
              ? "Dupliquer une journée"
              : "Nouvelle journée"}
        </h1>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Type de service */}
        <div className="mb-4">
          <TypeSelector value={form.type} onChange={setType} />
        </div>

        {/* Date */}
        <div className="mb-3">
          <Field label="Date">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setField("date", e.target.value)}
              className="input"
            />
          </Field>
        </div>

        {/* Horaires */}
        {isCoupe ? (
          <div className="space-y-3">
            {/* Matin */}
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-950/20">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-400">
                <Sunrise size={14} /> Premier service
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Début">
                  <TimeInput
                    value={form.debut}
                    onChange={(v) => setField("debut", v)}
                  />
                </Field>
                <Field label="Fin">
                  <TimeInput
                    value={form.fin}
                    onChange={(v) => setField("fin", v)}
                  />
                </Field>
              </div>
            </div>

            {/* Coupure calculée */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
              <Coffee size={14} />
              Coupure{" "}
              {gap > 0 ? `de ${formatDuree(gap)}` : "entre les deux services"}
            </div>

            {/* Soir */}
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-950/20">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-400">
                <Sunset size={14} /> Reprise (après-midi ou soir)
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Début">
                  <TimeInput
                    value={form.debut2}
                    onChange={(v) => setField("debut2", v)}
                  />
                </Field>
                <Field label="Fin">
                  <TimeInput
                    value={form.fin2}
                    onChange={(v) => setField("fin2", v)}
                  />
                </Field>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Heure de début">
              <TimeInput
                value={form.debut}
                onChange={(v) => setField("debut", v)}
              />
            </Field>
            <Field label="Heure de fin">
              <TimeInput value={form.fin} onChange={(v) => setField("fin", v)} />
            </Field>
            <Field label="Pause du midi" full>
              <PauseSelector
                value={form.pause}
                onChange={(v) => setField("pause", v)}
              />
            </Field>
          </div>
        )}

        {/* CMS + secteur + kilomètres */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="CMS">
            <input
              type="text"
              list="cms-list"
              placeholder="Centre médico-social"
              value={form.cms}
              onChange={(e) => setField("cms", e.target.value)}
              className="input"
            />
            <datalist id="cms-list">
              {cmsSuggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Secteur">
            <select
              value={form.secteur}
              onChange={(e) => setField("secteur", e.target.value)}
              className="input"
            >
              <option value="" disabled>
                Sélectionner
              </option>
              {SECTEURS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kilomètres" full>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              placeholder="ex : 42"
              value={form.km}
              onChange={(e) => setField("km", e.target.value)}
              className="input"
            />
          </Field>
        </div>

        {/* Aperçu heures */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-teal-50 px-4 py-3 dark:bg-teal-950/40">
          <span className="flex items-center gap-2 text-sm font-medium text-teal-800 dark:text-teal-300">
            <Clock size={16} /> Heures travaillées
          </span>
          <span className="text-lg font-semibold tabular-nums text-teal-900 dark:text-teal-200">
            {previewHours > 0 ? formatHours(previewHours) : "—"}
          </span>
        </div>

        {error && (
          <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={saving}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-medium text-white shadow-sm transition hover:bg-teal-800 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          {saving ? (
            "Enregistrement…"
          ) : editing ? (
            <>
              <Check size={18} /> Enregistrer les modifications
            </>
          ) : (
            <>
              <Plus size={18} /> Ajouter la journée
            </>
          )}
        </button>
      </section>
    </div>
  );
}
