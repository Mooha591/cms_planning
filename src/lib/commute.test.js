import { describe, it, expect } from "vitest";
import { computeCommute } from "./commute";
const entries = [
  { date:"2026-09-01", cms:"Nyon", km:20 },
  { date:"2026-09-01", cms:"Nyon", km:10 }, // même jour, même CMS -> 1 aller-retour
  { date:"2026-09-02", cms:"Nyon", km:20 },
  { date:"2026-09-03", cms:"Gland", km:15 },
  { date:"2026-09-04", cms:"", km:5 },       // sans CMS -> ignoré
];
describe("computeCommute", () => {
  it("compte 1 aller-retour par jour distinct et par CMS", () => {
    const { perCms, totalKm } = computeCommute(entries, { Nyon: "12", Gland: "8" });
    const nyon = perCms.find(r=>r.cms==="Nyon");
    const gland = perCms.find(r=>r.cms==="Gland");
    expect(nyon.jours).toBe(2);            // 01 et 02
    expect(nyon.kmTotal).toBe(2*12*2);     // 48
    expect(gland.jours).toBe(1);
    expect(gland.kmTotal).toBe(1*8*2);     // 16
    expect(totalKm).toBe(48+16);           // 64
  });
  it("ignore les CMS sans distance dans le total", () => {
    const { totalKm } = computeCommute(entries, { Nyon: "12" });
    expect(totalKm).toBe(48); // Gland non compté (pas de distance)
  });
});
