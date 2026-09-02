import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Plus } from "lucide-react";
import { useBudget } from "../context/BudgetContext";
import { CURRENCIES, useCurrency } from "../context/CurrencyContext";
import Field from "../components/Field";
import { BUDGET_CATEGORIES, BUDGET_TYPES } from "../lib/budgetConstants";
import { todayISO } from "../lib/time";

// Page de création / modification d'une transaction de budget
export default function BudgetFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { upsert, getById } = useBudget();
  const { currency: displayCurrency } = useCurrency();

  const editing = Boolean(id);

  const [form, setForm] = useState(() => {
    if (id) {
      const t = getById(id);
      if (t) {
        return {
          date: t.date,
          type: t.type,
          libelle: t.libelle || "",
          categorie: t.categorie || "",
          montant: String(t.montant ?? ""),
          currency: t.currency || "EUR",
        };
      }
    }
    // Nouvelle transaction : la devise saisie par défaut suit la devise
    // d'affichage actuelle, modifiable si ce paiement était dans une autre.
    return {
      date: todayISO(),
      type: "depense",
      libelle: "",
      categorie: "",
      montant: "",
      currency: displayCurrency,
    };
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    if (!form.date) return setError("Indique la date.");
    if (!form.libelle.trim()) return setError("Indique un libellé.");
    const montant = Number(form.montant);
    if (!montant || montant <= 0)
      return setError("Indique un montant valide.");

    setSaving(true);
    setError("");
    try {
      await upsert({
        id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: form.date,
        type: form.type,
        libelle: form.libelle.trim(),
        categorie: form.categorie,
        montant,
        currency: form.currency,
      });
      navigate("/budget");
    } catch (err) {
      setSaving(false);
      setError(`Impossible d'enregistrer : ${err.message || "vérifie ta connexion et réessaie."}`);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-6">
      <header className="mb-5 flex items-center gap-3">
        <button
          onClick={() => navigate("/budget")}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Retour"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-semibold tracking-tight text-teal-900 dark:text-teal-300">
          {editing ? "Modifier la transaction" : "Nouvelle transaction"}
        </h1>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 grid grid-cols-2 gap-2">
          {BUDGET_TYPES.map((t) => {
            const active = form.type === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setField("type", t.id)}
                className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                  active ? t.seg : t.segIdle
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <Field label="Date">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setField("date", e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Libellé">
            <input
              type="text"
              placeholder="ex : Courses Carrefour"
              value={form.libelle}
              onChange={(e) => setField("libelle", e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Catégorie">
            <select
              value={form.categorie}
              onChange={(e) => setField("categorie", e.target.value)}
              className="input"
            >
              <option value="">—</option>
              {BUDGET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Field label="Montant">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="ex : 45.90"
                value={form.montant}
                onChange={(e) => setField("montant", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Devise">
              <select
                value={form.currency}
                onChange={(e) => setField("currency", e.target.value)}
                className="input"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </Field>
          </div>
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
              <Plus size={18} /> Ajouter la transaction
            </>
          )}
        </button>
      </section>
    </div>
  );
}
