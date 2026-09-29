import { describe, it, expect } from "vitest";
import { findOverlaps } from "./overlap";
const others = [
  { id:"a", date:"2026-09-29", debut:"08:00", fin:"12:00", employeur:"FICOBA", _kind:"journée" },
  { id:"b", date:"2026-09-29", debut:"14:00", fin:"18:00", employeur:"OKJob", _kind:"mission" },
  { id:"c", date:"2026-09-28", debut:"08:00", fin:"12:00", _kind:"mission" },
  { id:"d", date:"2026-09-29", debut:"20:00", fin:"02:00", _kind:"mission" }, // passe minuit
];
describe("findOverlaps", () => {
  it("détecte un chevauchement franc", () => {
    expect(findOverlaps({ date:"2026-09-29", debut:"09:00", fin:"11:00" }, others).map(o=>o.id)).toEqual(["a"]);
  });
  it("pas de chevauchement si créneaux adjacents (12:00-14:00)", () => {
    expect(findOverlaps({ date:"2026-09-29", debut:"12:00", fin:"14:00" }, others)).toEqual([]);
  });
  it("ignore les autres dates", () => {
    expect(findOverlaps({ date:"2026-09-27", debut:"08:00", fin:"12:00" }, others)).toEqual([]);
  });
  it("chevauchement multiple", () => {
    expect(findOverlaps({ date:"2026-09-29", debut:"10:00", fin:"15:00" }, others).map(o=>o.id).sort()).toEqual(["a","b"]);
  });
  it("gère un créneau existant qui passe minuit", () => {
    expect(findOverlaps({ date:"2026-09-29", debut:"21:00", fin:"23:00" }, others).map(o=>o.id)).toEqual(["d"]);
  });
  it("chevauchement d'une journée à 2 créneaux (candidat)", () => {
    // candidat matin+aprem, recoupe a (matin) et b (aprem)
    expect(findOverlaps({ date:"2026-09-29", debut:"08:00", fin:"12:00", debut2:"14:00", fin2:"18:00" }, others).map(o=>o.id).sort()).toEqual(["a","b"]);
  });
});
