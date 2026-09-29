// Détection de chevauchement horaire entre une mission en cours de saisie et
// les journées / missions déjà enregistrées le même jour.

function toMinutes(t) {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Intervalles [début, fin] (en minutes) d'une saisie, qui peut avoir un ou
// deux créneaux (coupé, journée matin/après-midi). Un créneau dont la fin est
// ≤ au début est considéré comme passant minuit (+24 h).
function intervalsOf(item) {
  const res = [];
  const add = (a, b) => {
    const s = toMinutes(a);
    let e = toMinutes(b);
    if (s === null || e === null) return;
    if (e <= s) e += 1440;
    res.push([s, e]);
  };
  add(item.debut, item.fin);
  if (item.debut2 && item.fin2) add(item.debut2, item.fin2);
  return res;
}

function intervalsOverlap(a, b) {
  return a[0] < b[1] && b[0] < a[1];
}

// Renvoie les éléments de `others` qui chevauchent `candidate` le même jour.
// `candidate` et les éléments comparés portent { date, debut, fin, debut2?, fin2? }.
export function findOverlaps(candidate, others) {
  const cand = intervalsOf(candidate);
  if (cand.length === 0) return [];
  const hits = [];
  for (const o of others) {
    if (!o || o.date !== candidate.date) continue;
    const oi = intervalsOf(o);
    if (oi.some((x) => cand.some((c) => intervalsOverlap(c, x)))) hits.push(o);
  }
  return hits;
}
