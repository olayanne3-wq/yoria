const ALLOWED_PLATFORMS = new Set([
  "android",
  "iphone",
]);

const ALLOWED_LEVELS = new Set([
  "debutant",
  "intermediaire",
  "confirme",
  "competiteur",
]);

const ALLOWED_DISTANCES = new Set([
  "5-km",
  "10-km",
  "semi-marathon",
  "marathon",
  "trail",
  "debutant",
]);

function normalizeText(value, maximumLength = 250) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maximumLength);
}

function normalizeEmail(value) {
  return normalizeText(value, 254).toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sendJson(response, status, payload) {
  response.status(status).json(payload);
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");

    return sendJson(response, 405, {
      success: false,
      message: "Méthode non autorisée.",
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Configuration Supabase serveur absente.",
    );

    return sendJson(response, 500, {
      success: false,
      message:
        "Le service est temporairement indisponible.",
    });
  }

  const body = request.body ?? {};

  // Champ invisible destiné aux robots.
  if (normalizeText(body.website, 200)) {
    return sendJson(response, 200, {
      success: true,
      message: "Candidature enregistrée.",
    });
  }

  const firstName = normalizeText(
    body.firstName,
    80,
  );

  const email = normalizeEmail(body.email);

  const platform = normalizeText(
    body.platform,
    20,
  );

  const runningLevel = normalizeText(
    body.runningLevel,
    30,
  );

  const favoriteDistance = normalizeText(
    body.favoriteDistance,
    40,
  );

  const message = normalizeText(
    body.message,
    1500,
  );

  const runsPerWeek = Number(
    body.runsPerWeek,
  );

  const usesStrava =
    body.usesStrava === true;

  const acceptsFeedback =
    body.acceptsFeedback === true;

  const consent =
    body.consent === true;

  if (!firstName || firstName.length < 2) {
    return sendJson(response, 400, {
      success: false,
      message:
        "Le prénom est obligatoire.",
    });
  }

  if (!isValidEmail(email)) {
    return sendJson(response, 400, {
      success: false,
      message:
        "L’adresse e-mail n’est pas valide.",
    });
  }

  if (!ALLOWED_PLATFORMS.has(platform)) {
    return sendJson(response, 400, {
      success: false,
      message:
        "La plateforme sélectionnée n’est pas valide.",
    });
  }

  if (!ALLOWED_LEVELS.has(runningLevel)) {
    return sendJson(response, 400, {
      success: false,
      message:
        "Le niveau sélectionné n’est pas valide.",
    });
  }

  if (
    !Number.isInteger(runsPerWeek) ||
    runsPerWeek < 1 ||
    runsPerWeek > 7
  ) {
    return sendJson(response, 400, {
      success: false,
      message:
        "Le nombre de sorties n’est pas valide.",
    });
  }

  if (
    !ALLOWED_DISTANCES.has(
      favoriteDistance,
    )
  ) {
    return sendJson(response, 400, {
      success: false,
      message:
        "La distance sélectionnée n’est pas valide.",
    });
  }

  if (!consent) {
    return sendJson(response, 400, {
      success: false,
      message:
        "Le consentement est obligatoire.",
    });
  }

  const candidate = {
    first_name: firstName,
    email,
    platform,
    running_level: runningLevel,
    runs_per_week: runsPerWeek,
    favorite_distance: favoriteDistance,
    uses_strava: usesStrava,
    accepts_feedback: acceptsFeedback,
    message: message || null,
    status: "pending",
    consented_at:
      new Date().toISOString(),
  };

  try {
    const insertResponse = await fetch(
      `${supabaseUrl}/rest/v1/beta_testers`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization:
            `Bearer ${serviceRoleKey}`,
          "Content-Type":
            "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(candidate),
      },
    );

    if (insertResponse.ok) {
      return sendJson(response, 201, {
        success: true,
        message:
          "Merci ! Votre candidature a bien été enregistrée.",
      });
    }

    const errorText =
      await insertResponse.text();

    if (
      insertResponse.status === 409 ||
      errorText.includes(
        "beta_testers_email_unique",
      ) ||
      errorText.includes("duplicate key")
    ) {
      return sendJson(response, 409, {
        success: false,
        code:
          "EMAIL_ALREADY_REGISTERED",
        message:
          "Cette adresse e-mail est déjà inscrite à la bêta.",
      });
    }

    console.error(
      "Erreur Supabase beta_testers :",
      insertResponse.status,
      errorText,
    );

    return sendJson(response, 500, {
      success: false,
      message:
        "La candidature n’a pas pu être enregistrée.",
    });
  } catch (error) {
    console.error(
      "Erreur API beta :",
      error,
    );

    return sendJson(response, 500, {
      success: false,
      message:
        "Une erreur technique est survenue.",
    });
  }
}
