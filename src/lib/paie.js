// Contrôle de paie : compare ce que l'agence a VERSÉ (brut de la fiche de
// paie) à ce qui est DÛ d'après les heures saisies (heures × taux horaire).
// On raisonne sur le BRUT, pas le net : le net dépend de déductions
// (cotisations, impôt à la source…) impossibles à estimer fidèlement, alors
// que le brut = heures × taux est une attente exacte et vérifiable.
//
// Tolérance : un petit écart (arrondis, minutes de pause comptées autrement)
// n'est pas une erreur. En dessous du seuil, on considère la paie conforme.
export function comparePay(heures, taux, brutRecu, { tolerance = 1 } = {}) {
  const h = Number(heures) || 0;
  const t = Number(taux) || 0;
  const attendu = t * h;

  // Aucun montant reçu saisi → rien à comparer (l'utilisateur n'a pas encore
  // renseigné sa fiche de paie).
  if (brutRecu === "" || brutRecu == null || Number.isNaN(Number(brutRecu))) {
    return { attendu, recu: null, ecart: null, heuresEcart: null, statut: "attente" };
  }

  const recu = Number(brutRecu);
  const ecart = recu - attendu; // < 0 : il manque de l'argent ; > 0 : payé en plus
  // Heures correspondant à l'écart (utile : « ≈ 10 h non payées »)
  const heuresEcart = t > 0 ? ecart / t : null;

  let statut;
  if (Math.abs(ecart) <= tolerance) statut = "ok";
  else if (ecart < 0) statut = "manque"; // sous-payé
  else statut = "surplus"; // payé en plus (à vérifier aussi)

  return { attendu, recu, ecart, heuresEcart, statut };
}
