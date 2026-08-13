/**
 * age-category.js
 * Catégorie d'âge FFA — extrait de index.html le 13/08/2026 (chantier
 * "réduction de taille d'index.html", petits modules de calcul pur
 * d'abord — cf. inventaire §16). Même principe que predictor.js/
 * session-analysis.js : vrai module ES, fonctions pures, aucune
 * dépendance à l'état global (window.*, PLAN, etc.) ni au DOM.
 *
 * Règles officielles (athle.fr, "les catégories d'âge en 2026") : la
 * catégorie dépend de l'ANNÉE de naissance (pas du jour exact), et la
 * saison FFA bascule chaque 1er septembre — les catégories valables du
 * 01/09/N au 31/08/(N+1) sont calculées sur l'année de fin de saison
 * (ex. saison 2025-2026, valable jusqu'au 31/08/2026, catégorie calculée
 * avec 2026 comme année de référence). Grille figée au 19/07/2026,
 * valable jusqu'au 31/08/2026 (à réviser chaque rentrée de septembre) :
 * Masters (MA) 1991 et avant, Seniors (SE) 1992-2003, Espoirs (ES)
 * 2004-2006, Juniors (JU) 2007-2008, Cadets (CA) 2009-2010, Minimes (MI)
 * 2011-2012, Benjamins (BE) 2013-2014, Poussins (PO) 2015-2016, Éveil
 * Athlétique (EA) 2017-2019, Baby Athlé (BB) 2020 et après. Masters
 * subdivisés en tranches de 5 ans (M0 = 1987-1991, M1 = 1982-1986, etc.).
 */

export function calculerAnneeReferenceSaisonFFA(dateReference) {
  const d = dateReference ? new Date(dateReference+"T00:00:00") : new Date();
  // Bascule le 1er septembre : avant cette date, on est encore dans la
  // saison de l'année en cours (référence = année en cours) ; à partir du
  // 1er septembre, on bascule sur la saison suivante (référence = année
  // en cours + 1).
  return d.getMonth() >= 8 ? d.getFullYear() + 1 : d.getFullYear();
}

export function calculerCategorieAgeFFA(anneeNaissance, dateReference) {
  if (!anneeNaissance) return null;
  const anneeRef = calculerAnneeReferenceSaisonFFA(dateReference);
  const age = anneeRef - anneeNaissance;
  if (age >= 35) {
    const indexMaster = Math.min(10, Math.floor((age - 35) / 5));
    return { code: "M"+indexMaster, label: "Master "+indexMaster };
  }
  if (age >= 23) return { code: "SE", label: "Senior" };
  if (age >= 20) return { code: "ES", label: "Espoir" };
  if (age >= 18) return { code: "JU", label: "Junior" };
  if (age >= 16) return { code: "CA", label: "Cadet" };
  if (age >= 14) return { code: "MI", label: "Minime" };
  if (age >= 12) return { code: "BE", label: "Benjamin" };
  if (age >= 10) return { code: "PO", label: "Poussin" };
  return { code: "EA", label: "Éveil athlétique" };
}
