const form = document.getElementById("beta-form");
const statusElement = document.getElementById("form-status");
const submitButton = form.querySelector('button[type="submit"]');

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

  const payload = {
    firstName: formData.get("firstName"),
    email: formData.get("email"),
    platform: formData.get("platform"),
    runningLevel: formData.get("runningLevel"),
    runsPerWeek: Number(formData.get("runsPerWeek")),
    favoriteDistance: formData.get("favoriteDistance"),
    usesStrava: getBooleanRadioValue("usesStrava"),
    acceptsFeedback: getBooleanRadioValue("acceptsFeedback"),
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

    statusElement.textContent = result.message;
    statusElement.className = "form-status success";

    form.reset();
  } catch (error) {
    statusElement.textContent = error.message;
    statusElement.className = "form-status error";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Envoyer ma candidature";
  }
});
