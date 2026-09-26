import { describe, expect, it } from "vitest";
import { computeSalary } from "./salary";

describe("computeSalary", () => {
  it("calcule le brut comme taux * heures", () => {
    const { brut } = computeSalary(10, 30, 0);
    expect(brut).toBe(300);
  });

  it("applique les charges au net, pas au brut", () => {
    const { brut, net } = computeSalary(10, 30, 15);
    expect(brut).toBe(300);
    expect(net).toBeCloseTo(255, 5); // 300 * 0.85
  });

  it("traite taux/heures manquants comme 0, jamais NaN", () => {
    expect(computeSalary(undefined, undefined, 15)).toEqual({ brut: 0, net: 0, charges: 15 });
    expect(computeSalary(10, "", 15).brut).toBe(0);
  });

  it("borne les charges entre 0 et 100 (jamais de net négatif ou > brut)", () => {
    expect(computeSalary(10, 30, 150).net).toBe(0);
    expect(computeSalary(10, 30, -20).net).toBe(300);
  });
});
