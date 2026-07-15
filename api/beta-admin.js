import crypto from "node:crypto";

const COOKIE = "yoria_beta_admin";
const TTL = 28_800;

const STATUSES = new Set([
  "pending",
  "selected",
  "invited",
  "active",
  "rejected",
]);

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createInvitationHtml(candidate, appUrl) {
  const firstName = escapeHtml(candidate.first_name);
  const safeAppUrl = escapeHtml(appUrl);

  return `
    <!DOCTYPE html>
    <html lang="fr">
      <body style="
        margin:0;
        padding:0;
        background:#f5f3fa;
        font-family:Arial,Helvetica,sans-serif;
        color:#19172b;
      ">
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          style="background:#f5f3fa;padding:32px 16px;"
        >
          <tr>
            <td align="center">
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                style="
                  max-width:620px;
                  background:#ffffff;
                  border-radius:24px;
                  overflow:hidden;
                  box-shadow:0 18px 45px rgba(50,42,80,.10);
                "
              >
                <tr>
                  <td style="
                    padding:34px;
                    background:linear-gradient(135deg,#7042db,#54d7ae);
                    color:#ffffff;
                  ">
                    <div style="
                      font-size:28px;
                      font-weight:800;
                      letter-spacing:-1px;
                    ">
                      Yoria
                    </div>

                    <div style="
                      margin-top:8px;
                      font-size:16px;
                      opacity:.92;
                    ">
                      Invitation à la bêta privée
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:36px 34px;">
                    <h1 style="
                      margin:0 0 20px;
                      font-size:26px;
                      line-height:1.25;
                    ">
                      Bonjour ${firstName},
                    </h1>

                    <p style="
                      margin:0 0 18px;
                      color:#615d70;
                      font-size:16px;
                      line-height:1.65;
                    ">
                      Votre candidature a été retenue pour participer
                      à la bêta privée de Yoria.
                    </p>

                    <p style="
                      margin:0 0 26px;
                      color:#615d70;
                      font-size:16px;
                      line-height:1.65;
                    ">
                      Vous allez pouvoir découvrir l’application,
                      tester ses fonctionnalités et nous aider à
                      améliorer l’expérience des futurs utilisateurs.
                    </p>

                    <table
                      role="presentation"
                      cellspacing="0"
                      cellpadding="0"
                    >
                      <tr>
                        <td style="
                          border-radius:999px;
                          background:#7042db;
                        ">
                          <a
                            href="${safeAppUrl}"
                            style="
                              display:inline-block;
                              padding:15px 25px;
                              color:#ffffff;
                              text-decoration:none;
                              font-size:16px;
                              font-weight:700;
                            "
                          >
                            Accéder à Yoria
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="
                      margin:28px 0 0;
                      color:#8a8696;
                      font-size:13px;
                      line-height:1.6;
                    ">
                      Si le bouton ne fonctionne pas, copiez cette
                      adresse dans votre navigateur :
                      <br>
                      ${safeAppUrl}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="
                    padding:22px 34px;
                    background:#f8f7fb;
                    color:#777283;
                    font-size:13px;
                  ">
                    Merci de participer à l’aventure Yoria.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

async function sendBrevoInvitation(config, candidate) {
  const response = await fetch(
    "https://api.brevo.com/v3/smtp/email",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": config.brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: config.fromName,
          email: config.fromEmail,
        },
        to: [
          {
            email: candidate.email,
            name: candidate.first_name,
          },
        ],
        subject: "Votre invitation à la bêta privée Yoria",
        htmlContent: createInvitationHtml(
          candidate,
          config.appUrl,
        ),
        tags: ["yoria-beta-invitation"],
      }),
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
      "Erreur Brevo :",
      response.status,
      data,
    );

    throw new Error(
      data?.message ||
        "L’e-mail d’invitation n’a pas pu être envoyé.",
    );
  }

  return data;
}

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
      if (!safe(body.password || "", config.password)) {
        return json(response, 401, {
          message: "Mot de passe incorrect.",
        });
      }

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
      const candidates =
        await supabaseRequest(
          config,
          "beta_testers?select=*&order=created_at.desc",
          {
            method: "GET",
          },
        );

      return json(response, 200, {
        candidates,
      });
    } catch {
      return json(response, 500, {
        message:
          "Impossible de charger les candidatures.",
      });
    }
  }

  if (request.method === "PATCH") {
    const body = request.body || {};

    const id = String(body.id || "");
    const action = String(body.action || "");
    const status = String(body.status || "");

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return json(response, 400, {
        message:
          "Identifiant de candidature invalide.",
      });
    }

    /*
     * Action spéciale : envoyer l’invitation Brevo.
     */
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
              "L’e-mail a été envoyé, mais le statut n’a pas pu être mis à jour.",
          });
        }

        return json(response, 200, {
          success: true,
          message:
            "L’invitation a bien été envoyée.",
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
            "L’invitation n’a pas pu être envoyée.",
        });
      }
    }

    /*
     * Changement classique de statut.
     */
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
          "Le statut n’a pas pu être modifié.",
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
