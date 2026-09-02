// Taux de change (référence EUR), via l'API gratuite Frankfurter (BCE) —
// mis en cache 12h sur cet appareil pour éviter de re-fetcher à chaque
// rendu et rester utilisable si le réseau est momentanément coupé.
const CACHE_KEY = "kyzenday:exchange-rates";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const CURRENCIES_TO_FETCH = "CHF,USD,GBP,CAD";

export async function getRates() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.rates;
    }
  } catch {
    // cache illisible : on retente un fetch réseau
  }

  const res = await fetch(
    `https://api.frankfurter.dev/v1/latest?from=EUR&to=${CURRENCIES_TO_FETCH}`,
  );
  if (!res.ok) throw new Error("Impossible de récupérer les taux de change.");
  const data = await res.json();
  const rates = { EUR: 1, ...data.rates };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, fetchedAt: Date.now() }));
  } catch {
    // stockage indisponible : tant pis, on re-fetchera la prochaine fois
  }
  return rates;
}

// Convertit un montant d'une devise à une autre via les taux (base EUR)
export function convertAmount(amount, from, to, rates) {
  const n = Number(amount) || 0;
  if (from === to || !rates) return n;
  const amountInEur = n / (rates[from] ?? 1);
  return amountInEur * (rates[to] ?? 1);
}
