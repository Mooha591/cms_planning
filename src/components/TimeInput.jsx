// Champ horaire au format 24h "HH:MM" saisi au clavier, sans passer par
// le picker natif du navigateur (qui affiche AM/PM selon la langue/région
// du système, même quand la page est en français).
export default function TimeInput({ value, onChange, className = "" }) {
  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
    const masked =
      digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
    onChange(masked);
  }

  // À la sortie du champ : complète et borne l'heure (23) et les minutes (59)
  function handleBlur() {
    if (!value) return;
    const [h = "", m = ""] = value.split(":");
    if (h === "") return;
    const hh = Math.min(23, Number(h) || 0);
    const mm = Math.min(59, Number(m) || 0);
    onChange(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="HH:MM"
      maxLength={5}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`input tabular-nums ${className}`}
    />
  );
}
