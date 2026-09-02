import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { convertAmount, getRates } from "../lib/exchangeRates";

const CurrencyContext = createContext(null);
const STORAGE_KEY = "kyzenday:currency";
const DEFAULT_CURRENCY = "EUR";

export const CURRENCIES = [
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "CHF", symbol: "CHF", label: "Franc suisse" },
  { code: "USD", symbol: "$", label: "Dollar américain" },
  { code: "GBP", symbol: "£", label: "Livre sterling" },
  { code: "CAD", symbol: "CA$", label: "Dollar canadien" },
];

function getInitial() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (CURRENCIES.some((c) => c.code === stored)) return stored;
  } catch {
    // stockage indisponible : on retombe sur la devise par défaut
  }
  return DEFAULT_CURRENCY;
}

// Devise d'affichage du budget, choisie par l'utilisateur et mémorisée sur
// cet appareil, + les taux de change permettant de vraiment convertir les
// montants (chaque transaction garde sa devise d'origine ; ce contexte
// convertit à l'affichage, pas en base).
export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(getInitial);
  const [rates, setRates] = useState(null);
  const [ratesError, setRatesError] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, currency);
    } catch {
      // stockage indisponible : le choix ne sera juste pas mémorisé
    }
  }, [currency]);

  useEffect(() => {
    getRates()
      .then(setRates)
      .catch((e) => setRatesError(e.message));
  }, []);

  const format = useMemo(() => {
    const formatter = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
    });
    return (n) => formatter.format(Number(n) || 0);
  }, [currency]);

  // Convertit un montant depuis sa devise d'origine vers la devise
  // d'affichage actuellement choisie. Tant que les taux n'ont pas encore
  // été chargés, renvoie le montant tel quel (pas de conversion trompeuse).
  function toDisplay(amount, from = "EUR") {
    if (!rates) return Number(amount) || 0;
    return convertAmount(amount, from, currency, rates);
  }

  // Convertit vers une devise arbitraire (pas forcément celle affichée) —
  // sert par ex. à montrer un total à la fois en EUR et en CHF.
  function convertTo(amount, from, to) {
    if (!rates) return Number(amount) || 0;
    return convertAmount(amount, from, to, rates);
  }

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        format,
        toDisplay,
        convertTo,
        rates,
        ratesLoading: !rates && !ratesError,
        ratesError,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency doit être utilisé dans un <CurrencyProvider>");
  }
  return ctx;
}
