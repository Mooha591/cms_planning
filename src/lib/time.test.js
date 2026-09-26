import { describe, expect, it } from "vitest";
import { computeHours, computeMinutes, countUniqueDays, durMin } from "./time";

describe("durMin", () => {
  it("calcule une durée normale", () => {
    expect(durMin("08:00", "12:00")).toBe(240);
  });

  it("gère le passage de minuit", () => {
    expect(durMin("22:00", "02:00")).toBe(240);
  });

  it("renvoie 0 si une heure manque", () => {
    expect(durMin("", "12:00")).toBe(0);
    expect(durMin("08:00", "")).toBe(0);
  });
});

describe("computeHours", () => {
  it("déduit la pause d'une journée simple", () => {
    // 08:00 -> 17:00 = 9h, moins 45 min de pause = 8h15
    expect(computeHours({ type: "journee", debut: "08:00", fin: "17:00", pause: 45 })).toBe(8.25);
  });

  it("sans pause, ne déduit rien", () => {
    expect(computeHours({ type: "journee", debut: "08:00", fin: "12:00", pause: 0 })).toBe(4);
  });

  it("ne descend jamais sous 0 si la pause dépasse la durée", () => {
    expect(computeHours({ type: "journee", debut: "08:00", fin: "08:30", pause: 60 })).toBe(0);
  });

  it("additionne les deux créneaux d'un coupé, sans déduire de pause", () => {
    // 08:00-12:00 (4h) + 16:00-19:00 (3h) = 7h, la coupure elle-même n'est pas payée
    expect(
      computeHours({ type: "coupe", debut: "08:00", fin: "12:00", debut2: "16:00", fin2: "19:00" }),
    ).toBe(7);
  });

  it("additionne les deux créneaux d'une journée complète matin/après-midi", () => {
    expect(
      computeHours({
        type: "journee_complete",
        debut: "08:00",
        fin: "12:00",
        debut2: "13:30",
        fin2: "17:30",
      }),
    ).toBe(8);
  });
});

describe("computeMinutes", () => {
  it("retombe sur les mêmes minutes que computeHours * 60 (cas simple)", () => {
    const entry = { type: "journee", debut: "08:00", fin: "17:00", pause: 45 };
    expect(computeMinutes(entry)).toBe(495); // 9h - 45min = 8h15 = 495 min
  });

  it("se rabat sur le champ heures si pas d'horaires (donnée importée)", () => {
    expect(computeMinutes({ type: "journee", heures: 7.5 })).toBe(450);
  });
});

describe("countUniqueDays", () => {
  it("compte 1 seul jour même avec 2 saisies à la même date", () => {
    const entries = [
      { date: "2026-03-05", heures: 4 },
      { date: "2026-03-05", heures: 3 },
    ];
    expect(countUniqueDays(entries)).toBe(1);
  });

  it("compte chaque date distincte", () => {
    const entries = [
      { date: "2026-03-05" },
      { date: "2026-03-06" },
      { date: "2026-03-06" },
      { date: "2026-03-07" },
    ];
    expect(countUniqueDays(entries)).toBe(3);
  });

  it("renvoie 0 pour une liste vide", () => {
    expect(countUniqueDays([])).toBe(0);
  });
});
