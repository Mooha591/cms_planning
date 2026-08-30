import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Clock, MapPin, Plus } from "lucide-react";
import { usePlanning } from "../context/PlanningContext";
import { useEntries } from "../context/EntriesContext";
import Field from "../components/Field";
import TypeSelector from "../components/TypeSelector";
import TimeInput from "../components/TimeInput";
import { durMin, formatDuree, todayISO } from "../lib/time";
import { EMPLOYEURS, SECTEURS } from "../lib/constants";

const emptyForm = {
  date: todayISO(),
  type: "journee",
  debut: "",
  fin: "",
  employeur: "",
  secteur: "",
  cms: "",
  lieu: "",
  note: "",
};

// Création / modification d'une mission planifiée
export default function PlanningFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { upsert, getById } = usePlanning();
  const { entries } = useEntries();
  const editing = Boolean(id);

  const [form, setForm] = useState(() => {
    if (id) {
      const s = getById(id);
      if (s) {
        return {
          date: s.date,
          type: s.type || "journee",
          debut: s.debut || "",
          fin: s.fin || "",
          employeur: s.employeur || "",
          secteur: s.secteur || "",
          cms: s.cms || "",
          lieu: s.lieu || "",
          note: s.note || "",
        };
      }
    }
    return emptyForm;
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [autreEmployeur, setAutreEmployeur] = useState(
    () => !!form.employeur && !EMPLOYEURS.includes(form.employeur),
  );

  const cmsSuggestions = useMemo(
    () => [...new Set(entries.map((e) => e.cms).filter(Boolean))].sort(),
    [entries],
  );

  const duree = durMin(form.debut, form.fin);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    if (!form.date) return setError("Indique la date.");
    if (form.debut && form.fin && durMin(form.debut, form.fin) <= 0)
      return setError("L'heure de fin doit être après l'heure de début.");

    setSaving(true);
    setError("");
    try {
      await upsert({
        id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: form.date,
        type: form.type,
        debut: form.debut,
        fin: form.fin,
        employeur: form.employeur.trim(),
        secteur: form.secteur,
        cms: form.cms.trim(),
        lieu: form.lieu.trim(),
        note: form.note.trim(),
      });
      navigate("/planning");
    } catch {
      setSaving(false);
      setError("Impossible d'enregistrer : vérifie ta connexion et réessaie.");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-6">
      <header className="mb-5 flex items-center gap-3">
        <button
          onClick={() => navigate("/planning")}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Retour"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-semibold tracking-tight text-teal-900 dark:text-teal-300">
          {editing ? "Modifier la mission" : "Planifier une mission"}
        </h1>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4">
          <TypeSelector value={form.type} onChange={(v) => setField("type", v)} />
        </div>

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

        <div className="grid grid-cols-2 gap-3">
          <Field label="Heure de début">
            <TimeInput value={form.debut} onChange={(v) => setField("debut", v)} />
          </Field>
          <Field label="Heure de fin">
            <TimeInput value={form.fin} onChange={(v) => setField("fin", v)} />
          </Field>
        </div>
        {duree > 0 && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <Clock size={13} /> Durée prévue : {formatDuree(duree)}
          </p>
        )}

        <div className="mt-3">
          <Field label="Employeur">
            <select
              value={autreEmployeur ? "__autre" : form.employeur}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__autre") {
                  setAutreEmployeur(true);
                  setField("employeur", "");
                } else {
                  setAutreEmployeur(false);
                  setField("employeur", v);
                }
              }}
              className="input"
            >
              <option value="">Aucun / non précisé</option>
              {EMPLOYEURS.map((em) => (
                <option key={em} value={em}>
                  {em}
                </option>
              ))}
              <option value="__autre">Autre…</option>
            </select>
            {autreEmployeur && (
              <input
                type="text"
                autoFocus
                placeholder="Nom de l'employeur"
                value={form.employeur}
                maxLength={40}
                onChange={(e) => setField("employeur", e.target.value)}
                className="input mt-2"
              />
            )}
          </Field>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="CMS">
            <input
              type="text"
              list="cms-list-plan"
              placeholder="Centre médico-social"
              value={form.cms}
              onChange={(e) => setField("cms", e.target.value)}
              className="input"
            />
            <datalist id="cms-list-plan">
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
              <option value="">Non précisé</option>
              {SECTEURS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lieu / adresse" full>
            <div className="relative">
              <MapPin
                size={15}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              />
              <input
                type="text"
                placeholder="ex : 12 rue du Lac, Nyon"
                value={form.lieu}
                onChange={(e) => setField("lieu", e.target.value)}
                className="input pl-8"
              />
            </div>
          </Field>
          <Field label="Note" full>
            <textarea
              rows={2}
              placeholder="Précisions, code d'entrée, matériel…"
              value={form.note}
              onChange={(e) => setField("note", e.target.value)}
              className="input resize-none"
            />
          </Field>
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
              <Check size={18} /> Enregistrer
            </>
          ) : (
            <>
              <Plus size={18} /> Planifier
            </>
          )}
        </button>
      </section>
    </div>
  );
}
