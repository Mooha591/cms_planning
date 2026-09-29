import { useEffect, useMemo, useRef, useState } from "react";
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
import { usePlanning } from "../context/PlanningContext";
import { useAgencyLogos } from "../context/LogosContext";
import Field from "../components/Field";
import TypeSelector from "../components/TypeSelector";
import PauseSelector from "../components/PauseSelector";
import TimeInput from "../components/TimeInput";
import AgencyLogo from "../components/AgencyLogo";
import { fileToLogoDataUrl } from "../lib/image";
import {
  computeHours,
  coupeGap,
  durMin,
  formatDuree,
  formatHours,
  todayISO,
} from "../lib/time";
import { CMS_BY_SECTEUR, EMPLOYEURS, POSTES, SECTEURS } from "../lib/constants";

const emptyForm = {
  date: todayISO(),
  type: "journee",
  debut: "",
  fin: "",
  debut2: "",
  fin2: "",
  pause: "",
  poste: "",
  employeur: "",
  cms: "",
  secteur: "",
  km: "",
  note: "",
};

// Page de création / modification d'une journée
export default function EntryFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { entries, upsert, getById } = useEntries();
  const { remove: removePlannedShift } = usePlanning();
  const { logos, setLogo, removeLogo } = useAgencyLogos();
  const [logoError, setLogoError] = useState("");

  async function handleLogoFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !form.employeur) return;
    setLogoError("");
    try {
      const dataUrl = await fileToLogoDataUrl(file, 128);
      await setLogo(form.employeur, dataUrl);
    } catch (err) {
      setLogoError(err?.message || "Échec de l'ajout du logo.");
    }
  }

  const editing = Boolean(id);
  const duplicateFrom = location.state?.duplicateFrom;
  // Mission planifiée qu'on « valide » : pré-remplit le formulaire en
  // gardant sa date, et sera supprimée du planning une fois enregistrée.
  const fromPlanning = location.state?.fromPlanning;
  // Jour vide cliqué dans le calendrier de l'accueil : pré-remplit juste la date.
  const prefillDate = location.state?.date;

  // État initial : formulaire vide, pré-rempli en édition, depuis une
  // mission du planning, ou depuis une journée à dupliquer.
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
          poste: e.poste || "",
          employeur: e.employeur || "",
          cms: e.cms || "",
          secteur: e.secteur || "",
          km: String(e.km ?? ""),
          note: e.note || "",
        };
      }
    }
    if (fromPlanning) {
      return {
        ...emptyForm,
        date: fromPlanning.date,
        type: fromPlanning.type || "journee",
        debut: fromPlanning.debut || "",
        fin: fromPlanning.fin || "",
        poste: fromPlanning.poste || "",
        employeur: fromPlanning.employeur || "",
        cms: fromPlanning.cms || "",
        secteur: fromPlanning.secteur || "",
      };
    }
    if (prefillDate) {
      return { ...emptyForm, date: prefillDate };
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
        employeur: duplicateFrom.employeur || "",
        cms: duplicateFrom.cms || "",
        secteur: duplicateFrom.secteur || "",
        km: String(duplicateFrom.km ?? ""),
        // Note volontairement pas reprise : elle décrit une intervention
        // précise, pas pertinente à copier telle quelle sur un autre jour.
        note: "",
      };
    }
    return emptyForm;
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  // "Autre…" : l'employeur n'est pas dans la liste, on le saisit à la main
  const [autreEmployeur, setAutreEmployeur] = useState(
    () => !!form.employeur && !EMPLOYEURS.includes(form.employeur),
  );
  // "Autre…" pour le CMS : on saisit un CMS pas encore vu pour ce secteur.
  const [autreCms, setAutreCms] = useState(false);

  // Changer de secteur remet à zéro le CMS (il dépend du secteur choisi).
  function handleSecteurChange(v) {
    setForm((f) => ({ ...f, secteur: v, cms: "" }));
    setAutreCms(false);
  }

  const isCoupe = form.type === "coupe";
  const isJournee = form.type === "journee_complete";
  const isSplit = isCoupe || isJournee; // deux créneaux à l'écran
  const gap = coupeGap(form);
  const previewHours = computeHours(form);
  const part1 = durMin(form.debut, form.fin);
  const part2 = durMin(form.debut2, form.fin2);

  // Libellés des deux créneaux selon le type
  const split = isCoupe
    ? {
        first: "Premier service",
        second: "Reprise (après-midi ou soir)",
        short1: "1er service",
        short2: "reprise",
        gapZero: "entre les deux services",
        box: "border-violet-100 bg-violet-50/50 dark:border-violet-900/50 dark:bg-violet-950/20",
        label: "text-violet-700 dark:text-violet-400",
      }
    : {
        first: "Matin",
        second: "Après-midi",
        short1: "matin",
        short2: "après-midi",
        gapZero: "aucune",
        box: "border-sky-100 bg-sky-50/50 dark:border-sky-900/50 dark:bg-sky-950/20",
        label: "text-sky-700 dark:text-sky-400",
      };

  // Liste des CMS déjà saisis pour l'autocomplétion
  const cmsSuggestions = useMemo(
    () => [...new Set(entries.map((e) => e.cms).filter(Boolean))].sort(),
    [entries],
  );

  // Récap des heures déjà faites pour l'employeur choisi : le mois de la
  // journée en cours d'un côté, le total de l'autre. La journée éditée
  // est exclue pour ne pas la compter deux fois pendant la saisie.
  const employeurStats = useMemo(() => {
    if (!form.employeur) return null;
    const monthKey = (form.date || "").slice(0, 7);
    let moisH = 0;
    let moisJ = 0;
    let totalH = 0;
    for (const e of entries) {
      if (e.id === id || e.employeur !== form.employeur) continue;
      const h = Number(e.heures) || 0;
      totalH += h;
      if (e.date.startsWith(monthKey)) {
        moisH += h;
        moisJ += 1;
      }
    }
    return { moisH, moisJ, totalH };
  }, [entries, form.employeur, form.date, id]);

  // Estimation des km à partir de l'historique pour la même destination :
  // d'abord les passages au même CMS, sinon la moyenne du secteur. On
  // prend la médiane (robuste aux trajets exceptionnels).
  const kmSuggestion = useMemo(() => {
    const sample = (pred) =>
      entries
        .filter((e) => e.id !== id && (Number(e.km) || 0) > 0 && pred(e))
        .map((e) => Number(e.km));

    let vals = [];
    let label = "";
    const cmsKey = form.cms.trim().toLowerCase();
    if (cmsKey) {
      const v = sample((e) => (e.cms || "").trim().toLowerCase() === cmsKey);
      if (v.length >= 2) {
        vals = v;
        label = `d'après ${v.length} passages à ${form.cms.trim()}`;
      }
    }
    if (!vals.length && form.secteur) {
      const v = sample((e) => e.secteur === form.secteur);
      if (v.length >= 3) {
        vals = v;
        label = `moyenne du secteur ${form.secteur}`;
      }
    }
    if (!vals.length) return null;

    vals.sort((a, b) => a - b);
    const mid = Math.floor(vals.length / 2);
    const median = vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
    return { km: Math.round(median), label };
  }, [entries, form.cms, form.secteur, id]);

  // Le champ « nom du lieu » s'adapte au poste choisi
  const lieu = {
    "": { label: "CMS", ph: "Centre médico-social" },
    CMS: { label: "CMS", ph: "Centre médico-social" },
    "Garde 1:1": { label: "Bénéficiaire / lieu", ph: "ex : Mme Dupont" },
    EMS: { label: "Nom de l'EMS", ph: "ex : EMS des Tilleuls" },
    EPSM: { label: "Nom de l'EPSM", ph: "ex : EPSM du Lac" },
    Autre: { label: "Lieu", ph: "ex : hôpital, domicile…" },
  }[form.poste] || { label: "Lieu", ph: "" };

  // CMS proposés pour le secteur choisi : construits à partir des CMS déjà
  // saisis pour ce secteur (aucune liste devinée). Vide → saisie libre.
  const cmsBySecteur = useMemo(() => {
    const map = {};
    for (const e of entries) {
      const sec = e.secteur;
      const c = (e.cms || "").trim();
      if (!sec || !c) continue;
      (map[sec] ||= new Set()).add(c);
    }
    return map;
  }, [entries]);
  const cmsOptions = useMemo(() => {
    const officiels = CMS_BY_SECTEUR[form.secteur] || [];
    const historique = [...(cmsBySecteur[form.secteur] || [])];
    return [...new Set([...officiels, ...historique])]
      .filter((c) => /^cms/i.test(c.trim())) // seulement les vrais CMS
      .sort((a, b) => a.localeCompare(b, "fr"));
  }, [cmsBySecteur, form.secteur]);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const noteRef = useRef(null);

  // La zone de message s'adapte à la longueur du texte saisi.
  useEffect(() => {
    const el = noteRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [form.note]);

  // En changeant de type, on pré-remplit une heure plausible si le champ
  // est vide : reprise à 16h pour un coupé, 13h30 pour une journée
  // matin/après-midi, début à 18h pour un service du soir.
  function setType(v) {
    setForm((f) => ({
      ...f,
      type: v,
      debut: !f.debut && v === "soir" ? "18:00" : f.debut,
      debut2:
        !f.debut2 && v === "coupe"
          ? "16:00"
          : !f.debut2 && v === "journee_complete"
            ? "13:30"
            : f.debut2,
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
      return setError(
        isJournee
          ? "Indique l'heure de début et de fin du matin."
          : "Indique l'heure de début et l'heure de fin.",
      );
    } else if (isJournee && Boolean(form.debut2) !== Boolean(form.fin2)) {
      return setError("Complète l'heure de début ET de fin de l'après-midi.");
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
        debut2: isSplit ? form.debut2 : "",
        fin2: isSplit ? form.fin2 : "",
        pause:
          isCoupe || (isJournee && form.debut2 && form.fin2)
            ? coupeGap(form)
            : Number(form.pause) || 0,
        poste: form.poste,
        employeur: form.employeur.trim(),
        heures,
        cms: form.cms.trim(),
        secteur: form.secteur,
        km: Number(form.km) || 0,
        note: form.note.trim(),
      });
      if (fromPlanning?.id) {
        await removePlannedShift(fromPlanning.id).catch(() => {});
      }
      // Ramène sur l'Accueil en affichant le mois de la journée saisie
      // (sinon une journée d'un autre mois « disparaît » de la vue).
      navigate("/", { state: { focusDate: form.date } });
    } catch (err) {
      setSaving(false);
      setError(`Impossible d'enregistrer : ${err.message || "vérifie ta connexion et réessaie."}`);
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
            : fromPlanning
              ? "Valider la mission"
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
        {isSplit ? (
          <div className="space-y-3">
            {/* Créneau 1 : matin (ou premier service) */}
            <div className={`rounded-xl border p-3 ${split.box}`}>
              <div
                className={`mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${split.label}`}
              >
                <Sunrise size={14} /> {split.first}
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

            {/* Écart calculé (coupure du coupé / pause déjeuner de la journée) */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
              <Coffee size={14} />
              {isCoupe ? "Coupure " : "Pause déjeuner "}
              {gap > 0 ? `de ${formatDuree(gap)}` : split.gapZero}
            </div>

            {/* Créneau 2 : après-midi (ou reprise du soir) */}
            <div className={`rounded-xl border p-3 ${split.box}`}>
              <div
                className={`mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${split.label}`}
              >
                <Sunset size={14} /> {split.second}
                {isJournee && (
                  <span className="font-normal normal-case tracking-normal text-slate-400 dark:text-slate-500">
                    · facultatif
                  </span>
                )}
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
            <Field label="Pause" full>
              <PauseSelector
                value={form.pause}
                onChange={(v) => setField("pause", v)}
              />
            </Field>
          </div>
        )}

        {/* Lieu : poste + secteur + nom de la structure */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Poste">
            <select
              value={form.poste}
              onChange={(e) => setField("poste", e.target.value)}
              className="input"
            >
              <option value="">Non précisé</option>
              {POSTES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Secteur">
            <select
              value={form.secteur}
              onChange={(e) => handleSecteurChange(e.target.value)}
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
          <Field label={lieu.label} full>
            {cmsOptions.length > 0 ? (
              <>
                <select
                  value={autreCms ? "__autre" : form.cms}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "__autre") {
                      setAutreCms(true);
                      setField("cms", "");
                    } else {
                      setAutreCms(false);
                      setField("cms", v);
                    }
                  }}
                  className="input"
                >
                  <option value="">Non précisé</option>
                  {cmsOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__autre">Autre…</option>
                </select>
                {autreCms && (
                  <input
                    type="text"
                    autoFocus
                    list="cms-list"
                    placeholder={lieu.ph}
                    value={form.cms}
                    onChange={(e) => setField("cms", e.target.value)}
                    className="input mt-2"
                  />
                )}
              </>
            ) : (
              <input
                type="text"
                list="cms-list"
                placeholder={lieu.ph}
                value={form.cms}
                onChange={(e) => setField("cms", e.target.value)}
                className="input"
              />
            )}
            <datalist id="cms-list">
              {cmsSuggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>

        {/* Employeur / agence */}
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

          {form.employeur && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <AgencyLogo
                employeur={form.employeur}
                size={32}
                className="rounded-md border border-slate-200 dark:border-slate-700"
              />
              <label className="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-teal-400 hover:text-teal-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-teal-500 dark:hover:text-teal-400">
                {logos[form.employeur] ? "Changer le logo" : "Ajouter le logo"}
                <input type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
              </label>
              {logos[form.employeur] && (
                <button
                  type="button"
                  onClick={() => removeLogo(form.employeur)}
                  className="text-xs font-medium text-slate-400 transition hover:text-rose-500 dark:text-slate-500"
                >
                  Retirer
                </button>
              )}
              {logoError && (
                <span className="w-full text-xs text-rose-600 dark:text-rose-400">{logoError}</span>
              )}
            </div>
          )}

          {employeurStats && (
            <p className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              Chez <span className="font-medium text-slate-700 dark:text-slate-200">{form.employeur}</span> :{" "}
              <span className="font-semibold tabular-nums text-teal-700 dark:text-teal-400">
                {formatHours(employeurStats.moisH)}
              </span>{" "}
              ce mois-ci
              {employeurStats.moisJ > 0 && ` (${employeurStats.moisJ} j)`} · total{" "}
              <span className="font-semibold tabular-nums text-teal-700 dark:text-teal-400">
                {formatHours(employeurStats.totalH)}
              </span>
            </p>
          )}
        </div>

        {/* Kilomètres */}
        <div className="mt-3">
          <Field label="Kilomètres">
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
          {kmSuggestion && Number(form.km) !== kmSuggestion.km && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Estimation :{" "}
                <span className="font-semibold tabular-nums text-teal-700 dark:text-teal-400">
                  ≈ {kmSuggestion.km} km
                </span>{" "}
                <span className="text-slate-400 dark:text-slate-500">· {kmSuggestion.label}</span>
              </span>
              <button
                type="button"
                onClick={() => setField("km", String(kmSuggestion.km))}
                className="font-medium text-teal-700 hover:underline dark:text-teal-400"
              >
                Utiliser
              </button>
            </p>
          )}
        </div>

        {/* Message de transmission */}
        <div className="mt-3">
          <Field label="Message de transmission">
            <textarea
              ref={noteRef}
              rows={3}
              placeholder="ex : Mme Martin fatiguée ce matin, arrivée 8h10, repas ok, mal dormi"
              value={form.note}
              onChange={(e) => setField("note", e.target.value)}
              className="input resize-none overflow-hidden"
            />
          </Field>
        </div>

        {/* Aperçu heures */}
        <div className="mt-4 rounded-xl bg-teal-50 px-4 py-3 dark:bg-teal-950/40">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium text-teal-800 dark:text-teal-300">
              <Clock size={16} /> Heures travaillées
            </span>
            <span className="text-lg font-semibold tabular-nums text-teal-900 dark:text-teal-200">
              {previewHours > 0 ? formatHours(previewHours) : "—"}
            </span>
          </div>
          {isSplit && part1 > 0 && part2 > 0 && (
            <p className="mt-1 text-right text-xs tabular-nums text-teal-700/80 dark:text-teal-300/70">
              {split.short1} {formatDuree(part1)} · {split.short2} {formatDuree(part2)}
            </p>
          )}
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
