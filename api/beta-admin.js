import crypto from "node:crypto";
import { traduirePlanVersFormatV1, construireAllSessions } from "../public/v2/engine/v1-bridge.js";
import { sendBrevoInvitation } from "../lib/beta-invitation-email.js";
import { extraireIp, verifierEtIncrementerTentative, reinitialiserTentatives } from "../lib/rate-limit.js";

const COOKIE = "yoria_beta_admin";
const TTL = 28_800;

const TABLE_RATE_LIMIT_ADMIN = "tentatives_connexion_admin";
const FENETRE_RATE_LIMIT_MS = 15 * 60 * 1000;
const MAX_TENTATIVES_RATE_LIMIT = 5;

// Statuts simplifiés (retrait de "selected" et "active", demande
// explicite de Laurent) — "selected" faisait doublon avec "invited" sans
// rôle distinct dans le code (aucun effet différent : ni email, ni action
// automatique), et "active" n'avait aucun déclencheur automatique (jamais
// mis à jour tout seul, un statut manuel que personne ne pensait à
// cliquer). Les candidatures déjà en base avec l'un de ces deux anciens
// statuts ont été migrées vers "invited" par une requête SQL ponctuelle
// (pas de code de migration ici — action ponctuelle, pas un besoin
// récurrent). PATCH avec status="selected"/"active" est désormais rejeté
// (400, cf. STATUSES.has(status) plus bas) — ancien code client qui
// enverrait encore ces valeurs échouerait proprement plutôt que de créer
// un état incohérent.
const STATUSES = new Set([
  "pending",
  "invited",
  "rejected",
]);

const SIGNALEMENT_STATUSES = new Set([
  "nouveau",
  "en_cours",
  "resolu",
]);

const ALLOWED_PLATFORMS = new Set(["android", "iphone"]);

const json = (response, status, payload) =>
  response.status(status).json(payload);

const safe = (firstValue, secondValue) => {
  const first = Buffer.from(String(firstValue));
  const second = Buffer.from(String(secondValue));

  return (
    first.length === second.length &&
    crypto.timingSafeEqual(first, second)
  );
};

const sign = (value, key) =>
  crypto
    .createHmac("sha256", key)
    .update(value)
    .digest("base64url");

const createToken = (key) => {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + TTL,
      scope: "beta-admin",
    }),
  ).toString("base64url");

  return `${payload}.${sign(payload, key)}`;
};

const parseCookies = (header) =>
  (header || "").split(";").reduce((cookies, part) => {
    const separator = part.indexOf("=");

    if (separator > 0) {
      const name = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();

      cookies[name] = decodeURIComponent(value);
    }

    return cookies;
  }, {});

const isValidToken = (token, key) => {
  if (!token) {
    return false;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return false;
  }

  if (!safe(signature, sign(payload, key))) {
    return false;
  }

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    );

    return (
      data.scope === "beta-admin" &&
      data.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function supabaseRequest(config, path, options = {}) {
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/${path}`,
    {
      ...options,
      headers: {
        apikey: config.supabaseKey,
        Authorization: `Bearer ${config.supabaseKey}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    },
  );

  const text = await response.text();

  let data = text;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // La réponse reste du texte.
  }

  if (!response.ok) {
    console.error(
      "Erreur Supabase beta-admin :",
      response.status,
      data,
    );

    throw new Error("Erreur Supabase");
  }

  return data;
}

const TABLES_USER_ID_DIRECT = [
  "decision_events",
  "plans_original",
  "plans_actif",
  "badges_debloques",
  "integrations",
];

async function supprimerCompteYoriaParEmail(config, email) {
  const usersResponse = await fetch(
    `${config.supabaseUrl}/auth/v1/admin/users`,
    {
      headers: {
        apikey: config.supabaseKey,
        Authorization: `Bearer ${config.supabaseKey}`,
      },
    },
  );

  if (!usersResponse.ok) {
    throw new Error("Erreur lors de la recherche du compte à supprimer.");
  }

  const usersData = await usersResponse.json();
  const users = Array.isArray(usersData) ? usersData : usersData.users || [];
  const user = users.find(
    (u) => (u.email || "").toLowerCase() === email.toLowerCase(),
  );

  if (!user) {
    return { supprime: false };
  }

  let planIds = [];
  try {
    const plansResponse = await fetch(
      `${config.supabaseUrl}/rest/v1/plans_actif?user_id=eq.${user.id}&select=id`,
      {
        headers: {
          apikey: config.supabaseKey,
          Authorization: `Bearer ${config.supabaseKey}`,
        },
      },
    );
    if (plansResponse.ok) {
      const plans = await plansResponse.json();
      planIds = Array.isArray(plans) ? plans.map((p) => p.id) : [];
    }
  } catch (erreurLecturePlans) {
    console.warn("Lecture des plans avant suppression échouée :", erreurLecturePlans.message);
  }

  if (planIds.length > 0) {
    const filtreIds = planIds.map((id) => encodeURIComponent(id)).join(",");
    const cleanPlanDonneesRes = await fetch(
      `${config.supabaseUrl}/rest/v1/plan_donnees?plan_id=in.(${filtreIds})`,
      {
        method: "DELETE",
        headers: {
          apikey: config.supabaseKey,
          Authorization: `Bearer ${config.supabaseKey}`,
          Prefer: "return=minimal",
        },
      },
    );
    if (!cleanPlanDonneesRes.ok) {
      const errText = await cleanPlanDonneesRes.text();
      console.error("Échec nettoyage plan_donnees avant suppression compte :", cleanPlanDonneesRes.status, errText);
      throw new Error("Échec de la préparation à la suppression (table plan_donnees).");
    }
  }

  for (const table of TABLES_USER_ID_DIRECT) {
    const cleanRes = await fetch(
      `${config.supabaseUrl}/rest/v1/${table}?user_id=eq.${user.id}`,
      {
        method: "DELETE",
        headers: {
          apikey: config.supabaseKey,
          Authorization: `Bearer ${config.supabaseKey}`,
          Prefer: "return=minimal",
        },
      },
    );

    if (!cleanRes.ok) {
      const errText = await cleanRes.text();
      console.warn(`Nettoyage table ${table} non concluant (ignoré) :`, cleanRes.status, errText);
    }
  }

  const cleanAbonnementsRes = await fetch(
    `${config.supabaseUrl}/rest/v1/abonnements?email=eq.${encodeURIComponent(email)}`,
    {
      method: "DELETE",
      headers: {
        apikey: config.supabaseKey,
        Authorization: `Bearer ${config.supabaseKey}`,
        Prefer: "return=minimal",
      },
    },
  );
  if (!cleanAbonnementsRes.ok) {
    const errText = await cleanAbonnementsRes.text();
    console.warn("Nettoyage table abonnements non concluant (ignoré) :", cleanAbonnementsRes.status, errText);
  }

  const deleteRes = await fetch(
    `${config.supabaseUrl}/auth/v1/admin/users/${user.id}`,
    {
      method: "DELETE",
      headers: {
        apikey: config.supabaseKey,
        Authorization: `Bearer ${config.supabaseKey}`,
      },
    },
  );

  if (!deleteRes.ok) {
    const errText = await deleteRes.text();
    console.error("Échec suppression compte Supabase :", deleteRes.status, errText);
    throw new Error("Échec de la suppression du compte côté Supabase.");
  }

  return { supprime: true, userId: user.id };
}

async function findOrCreateStripeCustomer(config, email, firstName) {
  const searchParams = new URLSearchParams();
  searchParams.append("query", `email:"${email}"`);

  const searchResponse = await fetch(
    `https://api.stripe.com/v1/customers/search?${searchParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${config.stripeSecretKey}`,
      },
    },
  );

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    throw new Error(`Erreur recherche client Stripe : ${errorText}`);
  }

  const searchData = await searchResponse.json();

  if (searchData.data && searchData.data.length > 0) {
    return searchData.data[0];
  }

  const createParams = new URLSearchParams();
  createParams.append("email", email);
  if (firstName) {
    createParams.append("name", firstName);
  }

  const createResponse = await fetch(
    "https://api.stripe.com/v1/customers",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: createParams.toString(),
    },
  );

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Erreur création client Stripe : ${errorText}`);
  }

  return createResponse.json();
}

async function createFreeStripeSubscription(config, customerId) {
  const params = new URLSearchParams();
  params.append("customer", customerId);
  params.append("items[0][price]", config.stripePriceId);
  params.append("discounts[0][coupon]", config.stripeFreeCouponId);

  const response = await fetch(
    "https://api.stripe.com/v1/subscriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur création abonnement Stripe : ${errorText}`);
  }

  return response.json();
}

async function upsertAbonnementGratuit(config, email, stripeCustomerId, stripeSubscriptionId, priceId) {
  const existingRows = await supabaseRequest(
    config,
    `abonnements?email=eq.${encodeURIComponent(email)}&select=*&limit=1`,
    { method: "GET" },
  );

  const existing = Array.isArray(existingRows) ? existingRows[0] : null;

  const payload = {
    email,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    subscription_status: "active",
    price_id: priceId,
    updated_at: new Date().toISOString(),
  };

  const path = existing
    ? `abonnements?id=eq.${existing.id}`
    : "abonnements";

  const method = existing ? "PATCH" : "POST";

  const rows = await supabaseRequest(config, path, {
    method,
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });

  return Array.isArray(rows) ? rows[0] : null;
}

const LIBELLES_STATUT = { "✅": "✅ Réussie", "❌": "❌ Ratée", "⚠️": "⚠️ Partielle", "😴": "😴 Non faite (auto)", "—": "— Pas de statut" };

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Frame-Options", "DENY");

  const config = {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    password:
      process.env.BETA_ADMIN_PASSWORD,

    brevoApiKey:
      process.env.BREVO_API_KEY,
    fromEmail:
      process.env.BETA_INVITATION_FROM_EMAIL,
    fromName:
      process.env.BETA_INVITATION_FROM_NAME,
    appUrl:
      process.env.BETA_APP_URL,

    stripeSecretKey:
      process.env.STRIPE_SECRET_KEY,
    stripePriceId:
      process.env.STRIPE_PRICE_ID,
    stripeFreeCouponId:
      process.env.STRIPE_FREE_COUPON_ID,
  };

  if (
    !config.supabaseUrl ||
    !config.supabaseKey ||
    !config.password
  ) {
    return json(response, 500, {
      message:
        "Configuration administrateur incomplète.",
    });
  }

  if (request.method === "POST") {
    const body = request.body || {};

    if (body.action === "login") {
      const ip = extraireIp(request);

      const { autorise, reessayerDansMs } = await verifierEtIncrementerTentative(
        config,
        TABLE_RATE_LIMIT_ADMIN,
        ip,
        FENETRE_RATE_LIMIT_MS,
        MAX_TENTATIVES_RATE_LIMIT,
      );

      if (!autorise) {
        const minutesRestantes = Math.ceil(reessayerDansMs / 60000);
        return json(response, 429, {
          message: `Trop de tentatives. Réessayez dans ${minutesRestantes} minute${minutesRestantes > 1 ? "s" : ""}.`,
        });
      }

      if (!safe(body.password || "", config.password)) {
        return json(response, 401, {
          message: "Mot de passe incorrect.",
        });
      }

      await reinitialiserTentatives(config, TABLE_RATE_LIMIT_ADMIN, ip);

      response.setHeader(
        "Set-Cookie",
        `${COOKIE}=${encodeURIComponent(
          createToken(config.password),
        )}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL}`,
      );

      return json(response, 200, {
        success: true,
      });
    }

    if (body.action === "logout") {
      response.setHeader(
        "Set-Cookie",
        `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
      );

      return json(response, 200, {
        success: true,
      });
    }

    return json(response, 400, {
      message: "Action inconnue.",
    });
  }

  const cookies = parseCookies(
    request.headers.cookie,
  );

  if (
    !isValidToken(
      cookies[COOKIE],
      config.password,
    )
  ) {
    return json(response, 401, {
      message: "Authentification requise.",
    });
  }

  if (request.method === "GET") {
    try {
      const [candidates, signalements] = await Promise.all([
        supabaseRequest(
          config,
          "beta_testers?select=*&order=created_at.desc",
          { method: "GET" },
        ),
        supabaseRequest(
          config,
          "signalements?select=*&order=created_at.desc",
          { method: "GET" },
        ),
      ]);

      return json(response, 200, {
        candidates,
        signalements,
      });
    } catch {
      return json(response, 500, {
        message:
          "Impossible de charger les données.",
      });
    }
  }

  if (request.method === "PATCH") {
    const body = request.body || {};

    const action = String(body.action || "");

    if (action === "update_signalement_statut") {
      const signalementId = String(body.id || "");
      const statut = String(body.statut || "");

      if (!/^[0-9a-f-]{36}$/i.test(signalementId)) {
        return json(response, 400, {
          message: "Identifiant de signalement invalide.",
        });
      }

      if (!SIGNALEMENT_STATUSES.has(statut)) {
        return json(response, 400, {
          message: "Statut de signalement invalide.",
        });
      }

      try {
        const updated = await supabaseRequest(
          config,
          `signalements?id=eq.${encodeURIComponent(signalementId)}&select=*`,
          {
            method: "PATCH",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify({
              statut,
              updated_at: new Date().toISOString(),
            }),
          },
        );

        if (!Array.isArray(updated) || updated.length !== 1) {
          return json(response, 404, {
            message: "Signalement introuvable.",
          });
        }

        return json(response, 200, {
          signalement: updated[0],
        });
      } catch {
        return json(response, 500, {
          message: "Le statut n'a pas pu être modifié.",
        });
      }
    }

    if (action === "invite_by_email") {
      if (
        !config.brevoApiKey ||
        !config.fromEmail ||
        !config.fromName ||
        !config.appUrl
      ) {
        return json(response, 500, {
          message: "Configuration Brevo incomplète.",
        });
      }

      const email = String(body.email || "").trim().toLowerCase();
      const firstName = String(body.firstName || "").trim().slice(0, 80);
      const platform = String(body.platform || "");

      if (!isValidEmail(email)) {
        return json(response, 400, {
          message: "L'adresse e-mail n'est pas valide.",
        });
      }

      if (firstName.length < 2) {
        return json(response, 400, {
          message: "Le prénom est obligatoire.",
        });
      }

      if (!ALLOWED_PLATFORMS.has(platform)) {
        return json(response, 400, {
          message: "La plateforme sélectionnée n'est pas valide.",
        });
      }

      try {
        const existing = await supabaseRequest(
          config,
          `beta_testers?email=eq.${encodeURIComponent(email)}&select=id`,
          { method: "GET" },
        );

        if (Array.isArray(existing) && existing.length > 0) {
          return json(response, 409, {
            message: "Cette adresse e-mail a déjà une candidature enregistrée.",
          });
        }

        const maintenant = new Date().toISOString();

        const candidate = {
          first_name: firstName,
          email,
          platform,
          running_level: "debutant",
          runs_per_week: 3,
          favorite_distance: "debutant",
          uses_strava: false,
          accepts_feedback: false,
          message: null,
          status: "invited",
          consented_at: maintenant,
          invited_at: maintenant,
          updated_at: maintenant,
        };

        const created = await supabaseRequest(
          config,
          "beta_testers?select=*",
          {
            method: "POST",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify(candidate),
          },
        );

        const nouvelleCandidature = Array.isArray(created) ? created[0] : null;

        if (!nouvelleCandidature) {
          return json(response, 500, {
            message: "La candidature n'a pas pu être créée.",
          });
        }

        try {
          await sendBrevoInvitation(config, nouvelleCandidature);
        } catch (erreurEmail) {
          console.error("Échec envoi invitation directe :", erreurEmail.message);
          return json(response, 200, {
            success: true,
            emailEnvoye: false,
            message: "Candidature créée, mais l'e-mail n'a pas pu être envoyé. Réessaie depuis sa fiche.",
            candidate: nouvelleCandidature,
          });
        }

        return json(response, 200, {
          success: true,
          emailEnvoye: true,
          message: "Invitation envoyée.",
          candidate: nouvelleCandidature,
        });
      } catch (error) {
        console.error("Erreur invitation directe :", error);

        return json(response, 500, {
          message: error.message || "L'invitation n'a pas pu être envoyée.",
        });
      }
    }

    if (action === "search_user_plan") {
      const email = String(body.email || "").trim().toLowerCase();

      if (!email) {
        return json(response, 400, {
          message: "Adresse e-mail manquante.",
        });
      }

      try {
        const usersResponse = await fetch(
          `${config.supabaseUrl}/auth/v1/admin/users`,
          {
            headers: {
              apikey: config.supabaseKey,
              Authorization: `Bearer ${config.supabaseKey}`,
            },
          },
        );

        if (!usersResponse.ok) {
          throw new Error("Erreur lors de la recherche du compte.");
        }

        const usersData = await usersResponse.json();
        const users = Array.isArray(usersData) ? usersData : usersData.users || [];
        const user = users.find(
          (u) => (u.email || "").toLowerCase() === email,
        );

        if (!user) {
          return json(response, 404, {
            message: "Aucun compte trouvé avec cette adresse e-mail.",
          });
        }

        const plans = await supabaseRequest(
          config,
          `plans_actif?user_id=eq.${encodeURIComponent(user.id)}&select=id,nom,plan_brut,created_at&order=created_at.desc`,
          { method: "GET" },
        );

        const plansAvecDonnees = await Promise.all(
          (plans || []).map(async (plan) => {
            const donneesResult = await supabaseRequest(
              config,
              `plan_donnees?plan_id=eq.${encodeURIComponent(plan.id)}&select=data`,
              { method: "GET" },
            );
            const donnees = Array.isArray(donneesResult) && donneesResult[0] ? donneesResult[0].data : {};

            let seancesEnrichies = [];
            try {
              const planTraduit = traduirePlanVersFormatV1(plan.plan_brut);
              const allSessions = construireAllSessions(planTraduit);
              const statuses = donnees.lk_statuses || {};
              const notes = donnees.lk_session_notes || {};
              const rpe = donnees.lk_session_rpe || {};
              seancesEnrichies = allSessions.map((s) => ({
                week: s.week,
                day: s.day,
                date: s.date,
                type: s.type,
                sousType: s.sousType || null,
                warmup: s.warmup,
                session: s.session,
                cooldown: s.cooldown,
                notes: s.notes,
                statut: statuses[s.uid] || "—",
                statutLabel: LIBELLES_STATUT[statuses[s.uid]] || LIBELLES_STATUT["—"],
                noteUtilisateur: notes[s.uid] || null,
                rpe: rpe[s.uid] ?? null,
              }));
            } catch (erreurTraduction) {
              console.warn("Traduction v1-bridge échouée pour un plan :", erreurTraduction.message);
            }

            return {
              id: plan.id,
              nom: plan.nom,
              createdAt: plan.created_at,
              mode: plan.plan_brut?.mode || "course",
              distance: plan.plan_brut?.distance || null,
              objectif: plan.plan_brut?.objectif || null,
              seances: seancesEnrichies,
            };
          }),
        );

        let decisions = [];
        try {
          const events = await supabaseRequest(
            config,
            `decision_events?user_id=eq.${encodeURIComponent(user.id)}&select=*&order=created_at.desc&limit=50`,
            { method: "GET" },
          );
          const eventIds = (events || []).map((e) => e.id);
          let outcomes = [];
          if (eventIds.length > 0) {
            const filtreIds = eventIds.map((id) => encodeURIComponent(id)).join(",");
            outcomes = await supabaseRequest(
              config,
              `decision_outcomes?decision_event_id=in.(${filtreIds})&select=*`,
              { method: "GET" },
            );
          }
          const outcomesParEvent = new Map((outcomes || []).map((o) => [o.decision_event_id, o]));
          decisions = (events || []).map((e) => ({
            id: e.id,
            createdAt: e.created_at,
            regleId: e.regle_id,
            typeDecision: e.type_decision,
            statut: e.statut,
            ampleurDemandee: e.ampleur_demandee,
            ampleurAppliquee: e.ampleur_appliquee,
            justification: e.contexte?.justification || null,
            fatigue: e.contexte?.runnerState?.fatigue ?? null,
            acwr: e.contexte?.runnerState?.charge?.ratio ?? null,
            outcome: outcomesParEvent.get(e.id) ? {
              statutSeance: outcomesParEvent.get(e.id).statut_seance,
              rpe: outcomesParEvent.get(e.id).rpe,
              delaiJours: outcomesParEvent.get(e.id).delai_jours,
            } : null,
          }));
        } catch (erreurDecisions) {
          console.warn("Lecture decision_events échouée :", erreurDecisions.message);
        }

        return json(response, 200, {
          user: { id: user.id, email: user.email },
          plans: plansAvecDonnees,
          decisions,
        });
      } catch (error) {
        console.error("Erreur recherche compte :", error);

        return json(response, 500, {
          message:
            error.message || "La recherche n'a pas pu aboutir.",
        });
      }
    }

    if (action === "delete_account") {
      const email = String(body.email || "").trim().toLowerCase();

      if (!email) {
        return json(response, 400, {
          message: "Adresse e-mail manquante.",
        });
      }

      try {
        const resultat = await supprimerCompteYoriaParEmail(config, email);

        if (!resultat.supprime) {
          return json(response, 404, {
            message: "Aucun compte Yoria trouvé avec cette adresse e-mail.",
          });
        }

        return json(response, 200, {
          success: true,
          message: "Le compte Yoria a bien été supprimé.",
        });
      } catch (error) {
        console.error("Erreur suppression compte :", error);

        return json(response, 500, {
          message: error.message || "La suppression du compte a échoué.",
        });
      }
    }

    const id = String(body.id || "");
    const status = String(body.status || "");

    if (action === "delete_application") {
      if (!/^[0-9a-f-]{36}$/i.test(id)) {
        return json(response, 400, {
          message: "Identifiant de candidature invalide.",
        });
      }

      try {
        const candidates = await supabaseRequest(
          config,
          `beta_testers?id=eq.${encodeURIComponent(id)}&select=email`,
          { method: "GET" },
        );

        if (!Array.isArray(candidates) || candidates.length !== 1) {
          return json(response, 404, {
            message: "Candidature introuvable.",
          });
        }

        const email = candidates[0].email;

        await supabaseRequest(
          config,
          `beta_testers?id=eq.${encodeURIComponent(id)}`,
          { method: "DELETE", headers: { Prefer: "return=minimal" } },
        );

        let compteAussiSupprime = false;
        try {
          const resultatCompte = await supprimerCompteYoriaParEmail(config, email);
          compteAussiSupprime = resultatCompte.supprime;
        } catch (erreurCompte) {
          console.warn("Suppression du compte Yoria associé échouée :", erreurCompte.message);
        }

        return json(response, 200, {
          success: true,
          message: compteAussiSupprime
            ? "Candidature et compte Yoria associé supprimés."
            : "Candidature supprimée.",
        });
      } catch (error) {
        console.error("Erreur suppression candidature :", error);

        return json(response, 500, {
          message: error.message || "La suppression a échoué.",
        });
      }
    }

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return json(response, 400, {
        message:
          "Identifiant de candidature invalide.",
      });
    }

    if (action === "send_invitation") {
      if (
        !config.brevoApiKey ||
        !config.fromEmail ||
        !config.fromName ||
        !config.appUrl
      ) {
        return json(response, 500, {
          message:
            "Configuration Brevo incomplète.",
        });
      }

      try {
        const candidates =
          await supabaseRequest(
            config,
            `beta_testers?id=eq.${encodeURIComponent(
              id,
            )}&select=*`,
            {
              method: "GET",
            },
          );

        if (
          !Array.isArray(candidates) ||
          candidates.length !== 1
        ) {
          return json(response, 404, {
            message:
              "Candidature introuvable.",
          });
        }

        const candidate = candidates[0];

        await sendBrevoInvitation(
          config,
          candidate,
        );

        const invitedAt =
          new Date().toISOString();

        const updatedCandidates =
          await supabaseRequest(
            config,
            `beta_testers?id=eq.${encodeURIComponent(
              id,
            )}&select=*`,
            {
              method: "PATCH",
              headers: {
                Prefer: "return=representation",
              },
              body: JSON.stringify({
                status: "invited",
                invited_at: invitedAt,
                updated_at: invitedAt,
              }),
            },
          );

        if (
          !Array.isArray(updatedCandidates) ||
          updatedCandidates.length !== 1
        ) {
          return json(response, 500, {
            message:
              "L'e-mail a été envoyé, mais le statut n'a pas pu être mis à jour.",
          });
        }

        return json(response, 200, {
          success: true,
          message:
            "L'invitation a bien été envoyée.",
          candidate: updatedCandidates[0],
        });
      } catch (error) {
        console.error(
          "Erreur invitation :",
          error,
        );

        return json(response, 500, {
          message:
            error.message ||
            "L'invitation n'a pas pu être envoyée.",
        });
      }
    }

    if (action === "create_free_subscription") {
      if (
        !config.stripeSecretKey ||
        !config.stripePriceId ||
        !config.stripeFreeCouponId
      ) {
        return json(response, 500, {
          message: "Configuration Stripe incomplète.",
        });
      }

      try {
        const candidates = await supabaseRequest(
          config,
          `beta_testers?id=eq.${encodeURIComponent(id)}&select=*`,
          { method: "GET" },
        );

        if (!Array.isArray(candidates) || candidates.length !== 1) {
          return json(response, 404, {
            message: "Candidature introuvable.",
          });
        }

        const candidate = candidates[0];

        const stripeCustomer = await findOrCreateStripeCustomer(
          config,
          candidate.email,
          candidate.first_name,
        );

        const stripeSubscription = await createFreeStripeSubscription(
          config,
          stripeCustomer.id,
        );

        await upsertAbonnementGratuit(
          config,
          candidate.email,
          stripeCustomer.id,
          stripeSubscription.id,
          config.stripePriceId,
        );

        return json(response, 200, {
          success: true,
          message: "Abonnement gratuit créé.",
        });
      } catch (error) {
        console.error("Erreur abonnement gratuit :", error);

        return json(response, 500, {
          message:
            error.message ||
            "L'abonnement gratuit n'a pas pu être créé.",
        });
      }
    }

    if (!STATUSES.has(status)) {
      return json(response, 400, {
        message: "Statut invalide.",
      });
    }

    try {
      const updatedCandidates =
        await supabaseRequest(
          config,
          `beta_testers?id=eq.${encodeURIComponent(
            id,
          )}&select=*`,
          {
            method: "PATCH",
            headers: {
              Prefer: "return=representation",
            },
            body: JSON.stringify({
              status,
              updated_at:
                new Date().toISOString(),
            }),
          },
        );

      if (
        !Array.isArray(updatedCandidates) ||
        updatedCandidates.length !== 1
      ) {
        return json(response, 404, {
          message:
            "Candidature introuvable.",
        });
      }

      return json(response, 200, {
        candidate: updatedCandidates[0],
      });
    } catch {
      return json(response, 500, {
        message:
          "Le statut n'a pas pu être modifié.",
      });
    }
  }

  response.setHeader(
    "Allow",
    "GET, POST, PATCH",
  );

  return json(response, 405, {
    message: "Méthode non autorisée.",
  });
}
