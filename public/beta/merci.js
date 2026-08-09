// Page de remerciement — affiche le bon contenu selon deux paramètres URL,
// transmis par script.js (page d'inscription) juste avant la redirection :
//   ?statut=invited|pending   → auto-validé ou en attente (cf. api/beta.js)
//   ?plateforme=android|iphone → pour les instructions d'installation
//
// Lu depuis l'URL plutôt que depuis une donnée transmise en POST classique
// (ex. sessionStorage) : cette page peut aussi être rechargée/repartagée
// telle quelle sans perdre son état, et reste un fichier statique simple
// sans dépendance à un état de navigation antérieur.

const params = new URLSearchParams(window.location.search);
const statut = params.get("statut");
const plateforme = params.get("plateforme");

const blocValide = document.getElementById("bloc-valide");
const blocAttente = document.getElementById("bloc-attente");
const etapesAndroid = document.getElementById("etapes-android");
const etapesIphone = document.getElementById("etapes-iphone");

// Repli sûr : seul un statut EXPLICITEMENT "invited" affiche le bloc
// auto-validé — toute autre valeur (pending, absente, inattendue) garde
// le bloc "en attente" par défaut déjà visible dans le HTML. Annoncer un
// accès actif qui ne l'est pas serait le pire des deux erreurs possibles.
if (statut === "invited") {
  blocValide.dataset.visible = "true";
  blocAttente.dataset.visible = "false";

  if (plateforme === "android") {
    etapesAndroid.dataset.visible = "true";
  } else if (plateforme === "iphone") {
    etapesIphone.dataset.visible = "true";
  }
  // Si plateforme est absente/inattendue, aucun bloc d'étapes ne s'affiche
  // (le message de bienvenue générique + l'e-mail reçu suffisent) — pas de
  // repli arbitraire sur une plateforme au hasard.
}
