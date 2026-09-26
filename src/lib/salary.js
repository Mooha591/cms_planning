// Calcul brut/net partagé — évite d'avoir la même formule dupliquée (et
// potentiellement divergente) dans plusieurs composants (SalaryEstimate,
// EmployeurBreakdown…).
export function computeSalary(heures, taux, chargesPct) {
  const h = Number(heures) || 0;
  const t = Number(taux) || 0;
  const brut = t * h;
  // Les charges sont un pourcentage : on le borne à [0, 100] pour éviter
  // un net négatif ou supérieur au brut en cas de saisie farfelue.
  const charges = Math.min(100, Math.max(0, Number(chargesPct) || 0));
  const net = brut * (1 - charges / 100);
  return { brut, net, charges };
}
