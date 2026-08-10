export const config = {
  api: {
    bodyParser: false,
  },
};

function sendJson(response, status, data) {
  return response.status(status).json(data);
}

async function readRawBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

async function hmacSha256Hex(secret, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    messageData,
  );

  return Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function parseStripeSignatureHeader(header) {
  const parts = header.split(",");
  const result = {};

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") {
      result.timestamp = value;
    }
    if (key === "v1") {
      result.signature = value;
    }
  }

  return result;
}

// Comparaison en temps constant (ajout, correctif sécurité, cohérent avec
// la fonction safe() déjà utilisée dans api/beta-admin.js) — une
// comparaison classique (===) sur deux chaînes peut, en théorie, retourner
// légèrement plus vite dès le premier caractère différent, ce qui permet
// à un attaquant patient de reconstruire la signature attendue octet par
// octet en mesurant le temps de réponse. Utilise Web Crypto (crypto.subtle
// est déjà l'API utilisée par ce fichier pour le HMAC lui-même, donc
// aucune nouvelle dépendance) via une conversion hex vers Uint8Array et
// crypto.subtle.timingSafeEqual — indisponible nativement en Web Crypto
// standard, donc implémenté manuellement en comparant XOR de chaque octet
// sans court-circuit conditionnel goto un premier octet différent.
function comparerEnTempsConstant(a, b) {
  if (a.length !== b.length) {
    // Comparaison de longueur : ne fuit aucune information utile (la
    // longueur d'une signature hex SHA-256 est toujours fixe, 64
    // caractères), donc pas besoin de la faire elle-même en temps
    // constant.
    return false;
  }

  let resultat = 0;
  for (let i = 0; i < a.length; i++) {
    resultat |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return resultat === 0;
}

async function verifyStripeSignature(rawBody, signatureHeader, webhookSecret) {
  if (!signatureHeader) {
    return false;
  }

  const { timestamp, signature } = parseStripeSignatureHeader(signatureHeader);

  if (!timestamp || !signature) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody.toString("utf8")}`;
  const expectedSignature = await hmacSha256Hex(webhookSecret, signedPayload);

  return comparerEnTempsConstant(expectedSignature, signature);
}

async function updateAbonnementBySubscriptionId(
  supabaseUrl,
  serviceRoleKey,
  stripeSubscriptionId,
  payload,
) {
  const url = `${supabaseUrl}/rest/v1/abonnements?stripe_subscription_id=eq.${stripeSubscriptionId}`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur mise à jour abonnement: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function updateAbonnementByCustomerId(
  supabaseUrl,
  serviceRoleKey,
  stripeCustomerId,
  payload,
) {
  const url = `${supabaseUrl}/rest/v1/abonnements?stripe_customer_id=eq.${stripeCustomerId}`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur mise à jour abonnement: ${response.status} ${errorText}`);
  }

  return response.json();
}

function mapStripeStatusToInternal(stripeStatus) {
  const mapping = {
    active: "active",
    trialing: "active",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "past_due",
    incomplete: "none",
    incomplete_expired: "none",
    paused: "canceled",
  };

  return mapping[stripeStatus] || "none";
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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
    console.error("Variables d'environnement webhook manquantes.");

    return sendJson(response, 500, {
      success: false,
      message: "Le service est temporairement indisponible.",
    });
  }

  let rawBody;

  try {
    rawBody = await readRawBody(request);
  } catch (error) {
    console.error("Erreur lecture body brut :", error);

    return sendJson(response, 400, {
      success: false,
      message: "Requête invalide.",
    });
  }

  const signatureHeader = request.headers["stripe-signature"];

  let isValid;

  try {
    isValid = await verifyStripeSignature(rawBody, signatureHeader, webhookSecret);
  } catch (error) {
    console.error("Erreur vérification signature :", error);
    isValid = false;
  }

  if (!isValid) {
    console.error("Signature webhook Stripe invalide.");

    return sendJson(response, 400, {
      success: false,
      message: "Signature invalide.",
    });
  }

  let event;

  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch (error) {
    console.error("Erreur parsing JSON webhook :", error);

    return sendJson(response, 400, {
      success: false,
      message: "Corps de requête invalide.",
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const stripeCustomerId = session.customer;
        const stripeSubscriptionId = session.subscription;
        const userId = session.metadata && session.metadata.user_id;

        if (stripeCustomerId) {
          await updateAbonnementByCustomerId(
            supabaseUrl,
            serviceRoleKey,
            stripeCustomerId,
            {
              stripe_subscription_id: stripeSubscriptionId || null,
              subscription_status: "active",
              updated_at: new Date().toISOString(),
            },
          );
        }

        console.log(
          `checkout.session.completed traité pour user_id=${userId || "inconnu"}`,
        );
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object;
        const stripeCustomerId = subscription.customer;
        const stripeSubscriptionId = subscription.id;
        const status = mapStripeStatusToInternal(subscription.status);
        const priceId =
          subscription.items &&
          subscription.items.data &&
          subscription.items.data[0] &&
          subscription.items.data[0].price &&
          subscription.items.data[0].price.id;

        await updateAbonnementByCustomerId(
          supabaseUrl,
          serviceRoleKey,
          stripeCustomerId,
          {
            stripe_subscription_id: stripeSubscriptionId,
            subscription_status: status,
            price_id: priceId || undefined,
            updated_at: new Date().toISOString(),
          },
        );

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const stripeSubscriptionId = subscription.id;

        await updateAbonnementBySubscriptionId(
          supabaseUrl,
          serviceRoleKey,
          stripeSubscriptionId,
          {
            subscription_status: "canceled",
            updated_at: new Date().toISOString(),
          },
        );

        break;
      }

      default: {
        // Événement non géré, on accuse simplement réception.
        break;
      }
    }

    return sendJson(response, 200, { received: true });
  } catch (error) {
    console.error("Erreur traitement webhook Stripe :", error);

    return sendJson(response, 500, {
      success: false,
      message: "Erreur lors du traitement du webhook.",
    });
  }
}
