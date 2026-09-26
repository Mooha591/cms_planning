import { useCallback, useEffect, useState } from "react";

// Hook localStorage partagé entre plusieurs composants montés en même temps
// (ex : le taux de charges modifié dans <SalaryEstimate /> doit se refléter
// immédiatement dans <EmployeurBreakdown />, sans recharger la page).
// L'évènement "storage" natif ne se déclenche que dans les AUTRES onglets —
// on diffuse donc en plus un CustomEvent local pour prévenir les composants
// du même onglet.
const LOCAL_EVENT = "kyzenday:local-storage";

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}

export function useSyncedLocalStorage(key, fallback) {
  const [value, setValue] = useState(() => read(key, fallback));

  useEffect(() => {
    function onStorage(e) {
      if (e.key === key) setValue(read(key, fallback));
    }
    function onLocal(e) {
      if (e.detail?.key === key) setValue(read(key, fallback));
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(LOCAL_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOCAL_EVENT, onLocal);
    };
  }, [key, fallback]);

  const update = useCallback(
    (v) => {
      setValue(v);
      try {
        localStorage.setItem(key, v);
      } catch {
        // stockage indisponible : la valeur ne sera juste pas mémorisée
      }
      window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: { key } }));
    },
    [key],
  );

  return [value, update];
}
