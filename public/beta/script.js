const form = document.getElementById("beta-form");
const statusElement = document.getElementById("form-status");
const submitButton = form.querySelector('button[type="submit"]');

// Encart iOS — affiché/masqué selon le choix "Android"/"iPhone" du
// fieldset "Votre téléphone". Écoute sur le fieldset entier (délégation
// d'événement) plutôt que sur chaque input radio individuellement : plus
// court, et couvre aussi le cas où d'autres options de plateforme
// s'ajouteraient un jour (ex. tablette) sans avoir à modifier ce script.
const encartIos = document.getElementById("encart-ios");
const platformFieldset = form.querySelector('input[name="platform"]').closest("fieldset");

platformFieldset.addEventListener("change", (event) => {
  if (event.target.name !== "platform") {
    return;
  }

  encartIos.hidden = event.target.value !== "iphone";
});

function getBooleanRadioValue(name) {
  const selected = form.querySelector(
    `input[name="${name}"]:checked`,
  );

  if (!selected) {
    return null;
  }

  return selected.value === "oui";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  statusElement.textContent = "";
  statusElement.className = "form-status";

  const formData = new FormData(form);
  const platform = formData.get("platform");

  const payload = {
    firstName: formData.get("firstName"),
    email: formData.get("email"),
    platform,
    runningLevel: formData.get("runningLevel"),
    runsPerWeek: Number(formData.get("runsPerWeek")),
    favoriteDistance: formData.get("favoriteDistance"),
    usesStrava: getBooleanRadioValue("usesStrava"),
    message: formData.get("message"),
    consent: formData.get("consent") === "on",
    website: formData.get("website"),
  };

  submitButton.disabled = true;
  submitButton.textContent = "Envoi en cours…";

  try {
    const response = await fetch("/api/beta", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message ||
          "La candidature n’a pas pu être envoyée.",
      );
    }

    // Redirection vers la page de remerciement dédiée (ajout) — le statut
    // réel (autoValidee) vient de la réponse API, jamais deviné côté
    // client, pour ne jamais afficher par erreur un accès actif qui ne
    // l'est pas. platform est repris tel quel du formulaire, déjà validé
    // côté serveur (ALLOWED_PLATFORMS) donc sûr à transmettre tel quel
    // dans l'URL.
    const statutUrl = result.autoValidee ? "invited" : "pending";
    const params = new URLSearchParams({ statut: statutUrl, plateforme: platform });
    window.location.href = `/beta/merci.html?${params.toString()}`;
  } catch (error) {
    statusElement.textContent = error.message;
    statusElement.className = "form-status error";
    submitButton.disabled = false;
    submitButton.textContent = "Envoyer ma candidature";
  }
});

// ── Modale légale légère (14/08/2026) ────────────────────────────────────
// Remplace l'ouverture en nouvel onglet de cgu.html/privacy.html/
// sante.html (demande explicite de Laurent : une fenêtre en surimpression
// est préférable à un onglet sans bouton retour). Vanilla JS pur, pas de
// dépendance au framework el()/card() de l'app principale (index.html) —
// ce site bêta est un HTML/CSS/JS statique indépendant.
// SOURCE DE VÉRITÉ du contenu reste public/cgu.html, public/privacy.html,
// public/sante.html — toute mise à jour de texte doit être répercutée aux
// DEUX endroits (page statique + ce fichier), comme pour la modale
// équivalente côté app principale (cf. index.html, ouvrirModaleTexte()).
const CONTENU_LEGAL = {
  cgu: {
    titre: "📄 Conditions générales d'utilisation",
    html: `
      <p class="ml-updated">Yoria — dernière mise à jour : 13 août 2026</p>
      <div class="ml-avertissement"><strong>⚕️ Avant toute chose</strong><p>Yoria génère des plans d'entraînement, pas un avis médical. Consulte un médecin avant de démarrer ou reprendre une activité sportive.</p></div>
      <h3>1. Éditeur du service</h3>
      <p>Nom : [À COMPLÉTER — nom et prénom de l'exploitant]. Statut : Entrepreneur individuel (micro-entreprise). SIRET : [À COMPLÉTER]. Adresse : [À COMPLÉTER]. Contact : olayanne.site@gmail.com</p>
      <p>Ces conditions ne prennent pleinement effet qu'une fois l'immatriculation de l'activité effectuée et les informations ci-dessus complétées. Tant que ce n'est pas le cas, aucun abonnement payant n'est proposé au public.</p>
      <h3>2. Objet</h3>
      <p>Yoria est une application de planification d'entraînement à la course à pied. Elle génère des plans d'entraînement adaptatifs à partir des informations renseignées par l'utilisateur et les ajuste au fil du temps selon les séances réalisées.</p>
      <h3>3. Nature du service — ce que Yoria n'est pas</h3>
      <p>Les plans générés sont des outils d'aide à l'entraînement. Ils ne constituent ni un avis médical, ni une garantie de résultat, ni un suivi médical continu. L'utilisateur reste seul responsable de l'appréciation de son état de santé.</p>
      <h3>4. Création de compte</h3>
      <p>L'utilisation de Yoria nécessite la création d'un compte (email et mot de passe). L'utilisateur est responsable de la confidentialité de ses identifiants.</p>
      <h3>5. Abonnement et tarifs</h3>
      <p>Abonnement payant à 7€/mois (ou tarif annuel réduit), traité par Stripe. Yoria ne stocke jamais les coordonnées bancaires. Renouvellement automatique sauf résiliation avant échéance.</p>
      <h3>6. Résiliation et remboursement</h3>
      <p>Résiliation possible à tout moment depuis les Réglages, effective en fin de période payée. Droit de rétractation de 14 jours conformément au Code de la consommation, sauf exécution immédiate demandée et acceptée par l'utilisateur.</p>
      <h3>7. Suppression de compte</h3>
      <p>Suppression complète possible à tout moment, irréversible, conformément à la Politique de confidentialité.</p>
      <h3>8. Propriété intellectuelle</h3>
      <p>L'application est protégée par le droit de la propriété intellectuelle. Les données saisies par l'utilisateur lui appartiennent.</p>
      <h3>9. Disponibilité du service</h3>
      <p>Yoria s'efforce d'assurer un accès continu, sans garantie de disponibilité absolue.</p>
      <h3>10. Limitation de responsabilité</h3>
      <p>Dans les limites permises par la loi, Yoria ne saurait être tenu responsable des dommages liés à la pratique sportive elle-même, à la non-atteinte d'un objectif, ou à une information erronée fournie par l'utilisateur.</p>
      <h3>11. Évolution des conditions</h3>
      <p>Ces conditions peuvent évoluer ; toute modification substantielle sera portée à la connaissance des utilisateurs avant sa prise d'effet.</p>
      <h3>12. Droit applicable et litiges</h3>
      <p>Droit français. Solution amiable recherchée en priorité ; à défaut, tribunaux français compétents.</p>
      <div class="ml-contact"><strong>Contact</strong><br>olayanne.site@gmail.com</div>
    `,
  },
  privacy: {
    titre: "🔒 Politique de confidentialité",
    html: `
      <p class="ml-updated">Run by Léa — dernière mise à jour : 13 juillet 2026</p>
      <p>Run by Léa (Yoria) est une application personnelle de planification d'entraînement running. Cette page explique quelles données sont collectées, pourquoi, et comment elles sont protégées.</p>
      <h3>1. Données collectées</h3>
      <p>Compte (email/mot de passe chiffré) ; Profil coureur (prénom, nom, année de naissance, poids, taille, FC max, records) ; Données d'entraînement (plans, séances, notes, objectifs) ; Localisation approximative (météo locale uniquement, non stockée) ; Données Strava en option (activités de course).</p>
      <h3>2. Pourquoi ces données sont collectées</h3>
      <p>Exclusivement pour générer et adapter le plan d'entraînement, synchroniser entre appareils, et fournir la météo pertinente. Aucune donnée utilisée à des fins publicitaires.</p>
      <h3>3. Stockage et sécurité</h3>
      <p>Stockées sur Supabase (PostgreSQL), chiffrement en transit (HTTPS), isolation stricte (Row Level Security). Copie locale sur l'appareil pour le hors ligne.</p>
      <h3>4. Partage avec des tiers</h3>
      <p>Jamais vendues ni partagées à des fins commerciales. Transitent uniquement par Strava (si connecté), Open-Meteo (météo, sans donnée identifiable), Anthropic/Claude (messages de coaching, sans donnée de compte).</p>
      <h3>5. Vos droits</h3>
      <p>Consultation/modification depuis les Réglages, déconnexion Strava, suppression complète du compte sur demande.</p>
      <h3>6. Conservation des données</h3>
      <p>Conservées tant que le compte est actif ; supprimées intégralement en cas de suppression de compte.</p>
      <div class="ml-contact"><strong>Contact</strong><br>olayanne.site@gmail.com</div>
    `,
  },
  sante: {
    titre: "⚕️ Recommandations santé",
    html: `
      <p>Yoria génère des plans d'entraînement adaptatifs à partir des informations que tu renseignes. Ces plans sont des outils d'aide à l'entraînement, pas un avis médical.</p>
      <h3>Avant de commencer</h3>
      <p>Consulte un médecin avant de démarrer ou reprendre une activité sportive, en particulier avec un antécédent cardiaque, une blessure récente, une pathologie chronique, ou après une longue interruption.</p>
      <h3>Pendant ton entraînement</h3>
      <p>Écoute ton corps avant les recommandations de l'app. Douleur inhabituelle, essoufflement anormal, vertiges ou gêne thoracique doivent toujours faire arrêter l'effort immédiatement.</p>
      <h3>Reste vigilant</h3>
      <p>Yoria ajuste ton plan à partir de tes séances et ressentis, mais ne peut ni te suivre médicalement, ni détecter une urgence. Pour toute question de santé, un professionnel reste le bon interlocuteur.</p>
      <div class="ml-contact"><strong>Contact</strong><br>olayanne.site@gmail.com</div>
    `,
  },
};

function ouvrirModaleLegale(cle) {
  const contenu = CONTENU_LEGAL[cle];
  if (!contenu) return;

  const overlay = document.createElement("div");
  overlay.className = "ml-overlay";
  overlay.innerHTML = `
    <div class="ml-panel">
      <div class="ml-head">
        <span class="ml-titre">${contenu.titre}</span>
        <button type="button" class="ml-fermer" aria-label="Fermer">Fermer</button>
      </div>
      <div class="ml-corps">${contenu.html}</div>
    </div>
  `;

  const fermer = () => document.body.removeChild(overlay);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) fermer(); });
  overlay.querySelector(".ml-fermer").addEventListener("click", fermer);
  document.addEventListener("keydown", function escFermer(e) {
    if (e.key === "Escape") { fermer(); document.removeEventListener("keydown", escFermer); }
  });

  document.body.appendChild(overlay);
}

document.querySelectorAll("[data-modale-legale]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    ouvrirModaleLegale(el.dataset.modaleLegale);
  });
});
