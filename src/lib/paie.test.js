import { describe, expect, it } from "vitest";
import { comparePay } from "./paie";

describe("comparePay", () => {
  it("calcule le brut attendu comme heures * taux", () => {
    expect(comparePay(120, 32, "").attendu).toBe(3840);
  });

  it("sans montant reçu, reste en attente (rien à comparer)", () => {
    const r = comparePay(120, 32, "");
    expect(r.statut).toBe("attente");
    expect(r.ecart).toBeNull();
    expect(comparePay(120, 32, null).statut).toBe("attente");
    expect(comparePay(120, 32, "abc").statut).toBe("attente");
  });

  it("signale un sous-paiement et le traduit en heures manquantes", () => {
    // Dû : 120 h × 32 = 3840 ; reçu : 3520 → manque 320 = 10 h
    const r = comparePay(120, 32, 3520);
    expect(r.statut).toBe("manque");
    expect(r.ecart).toBe(-320);
    expect(r.heuresEcart).toBeCloseTo(-10, 5);
  });

  it("signale aussi un trop-perçu", () => {
    expect(comparePay(100, 30, 3200).statut).toBe("surplus");
  });

  it("tolère un petit écart d'arrondi (paie conforme)", () => {
    expect(comparePay(100, 30, 3000.5).statut).toBe("ok");
    expect(comparePay(100, 30, 2999.2).statut).toBe("ok");
  });

  it("ne divise pas par zéro quand le taux est absent", () => {
    const r = comparePay(100, 0, 500);
    expect(r.attendu).toBe(0);
    expect(r.heuresEcart).toBeNull();
  });
});
