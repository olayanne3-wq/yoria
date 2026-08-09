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
