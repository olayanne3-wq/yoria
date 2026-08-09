import { sendBrevoInvitation } from "./_beta-invitation-email.js";

const ALLOWED_PLATFORMS = new Set(["android", "iphone"]);

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

// Seuil d'auto-validation (ajout) — au-delà de ce nombre de candidatures
// déjà invitées/actives, une nouvelle candidature repasse en validation
// manuelle classique ("pending", cf. beta-admin). Compte TOUTES les
// candidatures invited/active, qu'elles aient été invitées à la main ou
// automatiquement par ce mécanisme — la charge de suivi est la même pour
// Laurent quelle que soit l'origine de l'invitation.
const SEUIL_AUTO_VALIDATION = 20;

function cleanText(value, maxLength = 250) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sendJson(response, status, data) {
  return response.status(status).json(data);
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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Variables Supabase manquantes.");

    return sendJson(response, 500, {
      success: false,
      message: "Le service est temporairement indisponible.",
    });
  }

  const body = request.body || {};

  // Champ invisible anti-robot.
  if (cleanText(body.website, 200)) {
    return sendJson(response, 200, {
      success: true,
      message: "Candidature enregistrée.",
    });
  }

  const firstName = cleanText(body.firstName, 80);
  const email = cleanText(body.email, 254).toLowerCase();
  const platform = cleanText(body.platform, 20);
  const runningLevel = cleanText(body.runningLevel, 30);
  const favoriteDistance = cleanText(body.favoriteDistance, 40);
  const message = cleanText(body.message, 1500);

  const runsPerWeek = Number(body.runsPerWeek);
  const usesStrava = body.usesStrava === true;
  const consent = body.consent === true;

  if (firstName.length < 2) {
    return sendJson(response, 400, {
      success: false,
      message: "Le prénom est obligatoire.",
    });
  }

  if (!isValidEmail(email)) {
    return sendJson(response, 400, {
      success: false,
      message: "L’adresse e-mail n’est pas valide.",
    });
  }

  if (!ALLOWED_PLATFORMS.has(platform)) {
    return sendJson(response, 400, {
      success: false,
      message: "Le téléphone sélectionné n’est pas valide.",
    });
  }

  if (!ALLOWED_LEVELS.has(runningLevel)) {
    return sendJson(response, 400, {
      success: false,
      message: "Le niveau sélectionné n’est pas valide.",
    });
  }

  if (
    !Number.isInteger(runsPerWeek) ||
    runsPerWeek < 1 ||
    runsPerWeek > 7
  ) {
    return sendJson(response, 400, {
      success: false,
      message: "Le nombre de sorties n’est pas valide.",
    });
  }

  if (!ALLOWED_DISTANCES.has(favoriteDistance)) {
    return sendJson(response, 400, {
      success: false,
      message: "La distance sélectionnée n’est pas valide.",
    });
  }

  if (!consent) {
    return sendJson(response, 400, {
      success: false,
      message: "Le consentement est obligatoire.",
    });
  }

  // Auto-validation (ajout) — compte les candidatures déjà invited/active
  // AVANT d'insérer la nouvelle, pour décider si elle passe automatiquement
  // ou repasse en validation manuelle classique. Un léger risque de
  // dépassement du seuil existe en cas de deux insertions concurrentes
  // quasi simultanées (lecture du compte non atomique avec l'insertion
  // suivante) — accepté comme limite mineure vu le volume attendu en bêta
  // privée (candidatures espacées, jamais un vrai pic de trafic).
  let autoValidee = false;

  try {
    const countResponse = await fetch(
      `${supabaseUrl}/rest/v1/beta_testers?status=in.(invited,active)&select=id`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Prefer: "count=exact",
        },
      },
    );

    if (countResponse.ok) {
      const contentRange = countResponse.headers.get("content-range") || "";
      const totalActuel = Number(contentRange.split("/")[1]) || 0;
      autoValidee = totalActuel < SEUIL_AUTO_VALIDATION;
    }
    // Si le comptage échoue pour une raison quelconque, autoValidee reste
    // false — repli sûr sur le circuit de validation manuelle existant,
    // jamais un blocage de l'inscription elle-même.
  } catch (erreurComptage) {
    console.warn("Comptage auto-validation échoué :", erreurComptage.message);
  }

  const maintenant = new Date().toISOString();

  const candidate = {
    first_name: firstName,
    email,
    platform,
    running_level: runningLevel,
    runs_per_week: runsPerWeek,
    favorite_distance: favoriteDistance,
    uses_strava: usesStrava,
    message: message || null,
    status: autoValidee ? "invited" : "pending",
    consented_at: maintenant,
    ...(autoValidee ? { invited_at: maintenant, updated_at: maintenant } : {}),
  };

  try {
    const supabaseResponse = await fetch(
      `${supabaseUrl}/rest/v1/beta_testers`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(candidate),
      },
    );

    if (!supabaseResponse.ok) {
      const errorText = await supabaseResponse.text();

      if (
        supabaseResponse.status === 409 ||
        errorText.includes("beta_testers_email_unique") ||
        errorText.includes("duplicate key")
      ) {
        return sendJson(response, 409, {
          success: false,
          code: "EMAIL_ALREADY_REGISTERED",
          message: "Cette adresse e-mail est déjà inscrite à la bêta.",
        });
      }

      console.error(
        "Erreur Supabase :",
        supabaseResponse.status,
        errorText,
      );

      return sendJson(response, 500, {
        success: false,
        message: "La candidature n’a pas pu être enregistrée.",
      });
    }

    // Envoi de l'email d'invitation (ajout, uniquement si auto-validée) —
    // best-effort : un échec d'envoi ne doit jamais faire échouer
    // l'inscription elle-même (déjà enregistrée en base à ce stade). Le
    // candidat reste visible dans beta-admin avec statut "invited" même
    // si l'email a échoué — Laurent peut renvoyer l'invitation à la main
    // depuis l'onglet Invités si besoin (mécanisme déjà existant).
    let emailEnvoye = false;

    if (autoValidee) {
      const brevoConfig = {
        brevoApiKey: process.env.BREVO_API_KEY,
        fromEmail: process.env.BETA_INVITATION_FROM_EMAIL,
        fromName: process.env.BETA_INVITATION_FROM_NAME,
        appUrl: process.env.BETA_APP_URL,
      };

      if (
        brevoConfig.brevoApiKey &&
        brevoConfig.fromEmail &&
        brevoConfig.fromName &&
        brevoConfig.appUrl
      ) {
        try {
          await sendBrevoInvitation(brevoConfig, candidate);
          emailEnvoye = true;
        } catch (erreurEmail) {
          console.error("Échec envoi email auto-validation :", erreurEmail.message);
        }
      } else {
        console.warn("Configuration Brevo incomplète — email d'auto-validation non envoyé.");
      }
    }

    return sendJson(response, 201, {
      success: true,
      message: autoValidee
        ? "Bienvenue dans la bêta ! Un e-mail avec les instructions vous a été envoyé."
        : "Merci ! Votre candidature a bien été enregistrée.",
      autoValidee,
      emailEnvoye,
      platform,
    });
  } catch (error) {
    console.error("Erreur API bêta :", error);

    return sendJson(response, 500, {
      success: false,
      message: "Une erreur technique est survenue.",
    });
  }
}
