const ALLOWED_PLANS = new Set(["monthly", "annual"]);

function sendJson(response, status, data) {
  return response.status(status).json(data);
}

async function getAuthenticatedUser(supabaseUrl, anonKeyOrToken, accessToken) {
  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKeyOrToken,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!authResponse.ok) {
    return null;
  }

  return authResponse.json();
}

async function findAbonnementByUserId(supabaseUrl, serviceRoleKey, userId) {
  const url = `${supabaseUrl}/rest/v1/abonnements?user_id=eq.${userId}&select=*&limit=1`;

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Erreur lecture abonnements: ${response.status}`);
  }

  const rows = await response.json();
  return rows[0] || null;
}

async function findAbonnementByEmail(supabaseUrl, serviceRoleKey, email) {
  const url = `${supabaseUrl}/rest/v1/abonnements?email=eq.${encodeURIComponent(email)}&select=*&limit=1`;

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Erreur lecture abonnements: ${response.status}`);
  }

  const rows = await response.json();
  return rows[0] || null;
}

async function upsertAbonnement(supabaseUrl, serviceRoleKey, payload, existingId) {
  const url = existingId
    ? `${supabaseUrl}/rest/v1/abonnements?id=eq.${existingId}`
    : `${supabaseUrl}/rest/v1/abonnements`;

  const method = existingId ? "PATCH" : "POST";

  const response = await fetch(url, {
    method,
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
    throw new Error(`Erreur écriture abonnements: ${response.status} ${errorText}`);
  }

  const rows = await response.json();
  return rows[0];
}

async function createStripeCustomer(stripeSecretKey, email, userId) {
  const params = new URLSearchParams();
  params.append("email", email);
  params.append("metadata[user_id]", userId);

  const response = await fetch("https://api.stripe.com/v1/customers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur création client Stripe: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function createCheckoutSession(stripeSecretKey, { customerId, priceId, userId, successUrl, cancelUrl }) {
  const params = new URLSearchParams();
  params.append("mode", "subscription");
  params.append("customer", customerId);
  params.append("line_items[0][price]", priceId);
  params.append("line_items[0][quantity]", "1");
  params.append("success_url", successUrl);
  params.append("cancel_url", cancelUrl);
  params.append("metadata[user_id]", userId);
  params.append("subscription_data[metadata][user_id]", userId);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur création session Checkout: ${response.status} ${errorText}`);
  }

  return response.json();
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
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const priceIdMonthly = process.env.STRIPE_PRICE_ID;
  const priceIdAnnual = process.env.STRIPE_PRICE_ID_ANNUAL;

  const missingVars = [];
  if (!supabaseUrl) missingVars.push("SUPABASE_URL");
  if (!supabaseAnonKey) missingVars.push("SUPABASE_ANON_KEY");
  if (!serviceRoleKey) missingVars.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!stripeSecretKey) missingVars.push("STRIPE_SECRET_KEY");
  if (!priceIdMonthly) missingVars.push("STRIPE_PRICE_ID");
  if (!priceIdAnnual) missingVars.push("STRIPE_PRICE_ID_ANNUAL");

  if (missingVars.length > 0) {
    console.error("Variables d'environnement manquantes : " + missingVars.join(", "));

    return sendJson(response, 500, {
      success: false,
      message: "Le service est temporairement indisponible.",
      debug: missingVars,
    });
  }

  const authHeader = request.headers.authorization || "";
  const accessToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!accessToken) {
    return sendJson(response, 401, {
      success: false,
      message: "Authentification requise.",
    });
  }

  let user;

  try {
    user = await getAuthenticatedUser(supabaseUrl, supabaseAnonKey, accessToken);
  } catch (error) {
    console.error("Erreur vérification token :", error);

    return sendJson(response, 500, {
      success: false,
      message: "Une erreur technique est survenue.",
    });
  }

  if (!user || !user.id || !user.email) {
    return sendJson(response, 401, {
      success: false,
      message: "Session invalide, merci de vous reconnecter.",
    });
  }

  const body = request.body || {};
  const plan = body.plan === "annual" ? "annual" : "monthly";

  if (!ALLOWED_PLANS.has(plan)) {
    return sendJson(response, 400, {
      success: false,
      message: "Le plan sélectionné n'est pas valide.",
    });
  }

  const priceId = plan === "annual" ? priceIdAnnual : priceIdMonthly;

  try {
    let abonnement = await findAbonnementByUserId(
      supabaseUrl,
      serviceRoleKey,
      user.id,
    );

    if (!abonnement) {
      abonnement = await findAbonnementByEmail(
        supabaseUrl,
        serviceRoleKey,
        user.email,
      );
    }

    let stripeCustomerId = abonnement && abonnement.stripe_customer_id;

    if (!stripeCustomerId) {
      const stripeCustomer = await createStripeCustomer(
        stripeSecretKey,
        user.email,
        user.id,
      );
      stripeCustomerId = stripeCustomer.id;
    }

    const upsertPayload = {
      user_id: user.id,
      email: user.email,
      stripe_customer_id: stripeCustomerId,
      price_id: priceId,
      updated_at: new Date().toISOString(),
    };

    if (!abonnement) {
      upsertPayload.subscription_status = "none";
    }

    abonnement = await upsertAbonnement(
      supabaseUrl,
      serviceRoleKey,
      upsertPayload,
      abonnement ? abonnement.id : null,
    );

    const origin = "https://yoria.run";
    const successUrl = `${origin}/?stripe=succes`;
    const cancelUrl = `${origin}/?stripe=annule`;

    const session = await createCheckoutSession(stripeSecretKey, {
      customerId: stripeCustomerId,
      priceId,
      userId: user.id,
      successUrl,
      cancelUrl,
    });

    return sendJson(response, 200, {
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error("Erreur création session Checkout :", error);

    return sendJson(response, 500, {
      success: false,
      message: "La session de paiement n'a pas pu être créée.",
    });
  }
}
