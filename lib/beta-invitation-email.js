// Module partagé — envoi de l'email d'invitation bêta via Brevo.
// Factorisé hors de beta-admin.js (où il vivait à l'origine, déclenché par
// le clic "Envoyer l'invitation") pour être réutilisable aussi par beta.js
// (auto-validation des candidatures à la soumission, cf. inventaire §16).
// Un seul chemin de génération du contenu email, jamais dupliqué entre les
// deux points d'appel — évite toute divergence future entre l'email envoyé
// manuellement et celui envoyé automatiquement.
//
// Placé dans lib/, PAS dans api/ — Vercel (plan Hobby) compile chaque
// fichier .js du dossier api/ comme une fonction serverless distincte,
// avec un plafond strict de 12 fonctions par déploiement. Ce module
// n'est jamais appelé directement en HTTP (uniquement importé par
// api/beta.js et api/beta-admin.js) ; le placer dans api/ l'a fait
// compter comme une 13e fonction et a cassé le déploiement
// (errorCode: exceeded_serverless_functions_per_deployment). lib/ suit le
// même principe déjà établi par public/v2/engine/ (modules partagés,
// jamais des endpoints).

// URL de la fiche Play Store — un lien PWA classique (BETA_APP_URL,
// https://yoria.run) ouvert depuis une app tierce (Gmail, WhatsApp...)
// s'ouvre dans la WebView intégrée de cette app, où beforeinstallprompt
// ne se déclenche JAMAIS (limitation universelle des WebViews embarquées,
// pas un bug Yoria — confirmé en testant en conditions réelles depuis
// l'app Gmail). Le Play Store, lui, gère sa propre installation nativement
// et fonctionne de façon fiable peu importe le navigateur/WebView d'où
// vient le clic — c'est pourquoi un candidat Android reçoit ce lien
// plutôt que l'URL web classique. Codé en dur plutôt qu'en variable
// d'environnement : ce n'est pas un secret, et contrairement à
// BETA_APP_URL (qui peut légitimement changer de domaine), l'id de
// package Android est stable une fois publié.
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=app.vercel.plan_10k_alpha.twa";

// QR code de la fiche Play Store (14/08/2026, demande explicite de
// Laurent) — généré à la volée via api.qrserver.com (service externe
// gratuit, pas de clé API) à partir de PLAY_STORE_URL ci-dessus, jamais
// une image statique à maintenir séparément. Même service et même URL
// cible que sur public/beta/index.html (section Inscription) — à garder
// synchronisés si le package Android venait à changer.
const QR_CODE_PLAY_STORE_URL =
  "https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=" +
  encodeURIComponent(PLAY_STORE_URL);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Instructions d'installation Android — le lien pointe directement vers le
// Play Store (cf. PLAY_STORE_URL ci-dessus), donc les instructions se
// limitent à confirmer que le bouton mène bien à l'installation — plus
// besoin d'expliquer un mécanisme PWA/beforeinstallprompt qui ne se
// déclenchait pas de façon fiable depuis les apps email. Le QR code sert
// de raccourci alternatif si le mail est lu sur un autre appareil que le
// téléphone Android cible (ex. lu sur ordinateur, installation prévue sur
// le téléphone) — scanner plutôt que retaper une adresse.
function createInstructionsAndroidHtml() {
  return `
    <tr>
      <td style="padding:0 34px 36px;">
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          style="
            border-radius:16px;
            background:#f5f3fa;
            border:1px solid #e3deeb;
          "
        >
          <tr>
            <td style="padding:22px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                <tr>
                  <td style="vertical-align:top;">
                    <div style="
                      margin:0 0 12px;
                      font-size:15px;
                      font-weight:800;
                      color:#19172b;
                    ">
                      🤖 Installer Yoria sur Android
                    </div>

                    <p style="
                      margin:0;
                      color:#615d70;
                      font-size:14px;
                      line-height:1.6;
                    ">
                      Le bouton ci-dessus vous amène directement sur le
                      Play Store — appuyez sur <strong>Installer</strong>,
                      comme pour n'importe quelle application.
                    </p>

                    <p style="
                      margin:12px 0 0;
                      color:#8a8696;
                      font-size:12.5px;
                      line-height:1.6;
                    ">
                      Vous lisez cet e-mail sur un autre appareil ? Scannez
                      le QR code ci-contre avec votre téléphone Android.
                    </p>
                  </td>
                  <td style="vertical-align:top; width:98px; padding-left:18px;">
                    <img
                      src="${QR_CODE_PLAY_STORE_URL}"
                      alt="QR code vers la fiche Play Store de Yoria"
                      width="98"
                      height="98"
                      style="display:block; border-radius:8px;"
                    >
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

// Instructions d'installation iOS — pas d'équivalent Play Store côté
// Apple (aucun pont officiel PWA-vers-App-Store, cf. inventaire §13), le
// lien pour un candidat iPhone reste donc l'URL web classique et ces
// instructions Safari restent la bonne — et seule — approche.
function createInstructionsIosHtml() {
  return `
    <tr>
      <td style="padding:0 34px 36px;">
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          style="
            border-radius:16px;
            background:#f5f3fa;
            border:1px solid #e3deeb;
          "
        >
          <tr>
            <td style="padding:22px 24px;">
              <div style="
                margin:0 0 12px;
                font-size:15px;
                font-weight:800;
                color:#19172b;
              ">
                📱 Installer Yoria sur iPhone
              </div>

              <p style="
                margin:0 0 14px;
                color:#615d70;
                font-size:14px;
                line-height:1.6;
              ">
                Yoria s'installe via Safari, pas via l'App Store — c'est
                rapide (environ 30 secondes) :
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                <tr>
                  <td style="padding:0 0 10px; vertical-align:top; width:26px;">
                    <div style="
                      width:22px;
                      height:22px;
                      border-radius:50%;
                      background:#7042db;
                      color:#ffffff;
                      font-size:12px;
                      font-weight:800;
                      text-align:center;
                      line-height:22px;
                    ">1</div>
                  </td>
                  <td style="padding:0 0 10px; vertical-align:top;">
                    <span style="color:#19172b; font-size:14px; line-height:1.55;">
                      Ouvrez le lien ci-dessus <strong>dans Safari</strong>
                      (pas Chrome ni un autre navigateur)
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 10px; vertical-align:top; width:26px;">
                    <div style="
                      width:22px;
                      height:22px;
                      border-radius:50%;
                      background:#7042db;
                      color:#ffffff;
                      font-size:12px;
                      font-weight:800;
                      text-align:center;
                      line-height:22px;
                    ">2</div>
                  </td>
                  <td style="padding:0 0 10px; vertical-align:top;">
                    <span style="color:#19172b; font-size:14px; line-height:1.55;">
                      Appuyez sur le bouton <strong>Partager</strong>
                      ⬆️ (en bas de l'écran)
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0; vertical-align:top; width:26px;">
                    <div style="
                      width:22px;
                      height:22px;
                      border-radius:50%;
                      background:#7042db;
                      color:#ffffff;
                      font-size:12px;
                      font-weight:800;
                      text-align:center;
                      line-height:22px;
                    ">3</div>
                  </td>
                  <td style="padding:0; vertical-align:top;">
                    <span style="color:#19172b; font-size:14px; line-height:1.55;">
                      Faites défiler et appuyez sur
                      <strong>« Sur l'écran d'accueil »</strong>
                    </span>
                  </td>
                </tr>
              </table>

              <p style="
                margin:16px 0 0;
                color:#8a8696;
                font-size:12.5px;
                line-height:1.6;
              ">
                Une icône Yoria apparaîtra alors sur votre écran d'accueil,
                comme n'importe quelle application.
              </p>

              <p style="
                margin:14px 0 0;
                color:#8a8696;
                font-size:12.5px;
                line-height:1.6;
              ">
                Une application iPhone native est à l'étude pour une
                prochaine version.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function createInvitationHtml(candidate, appUrl) {
  const firstName = escapeHtml(candidate.first_name);
  const estIphone = candidate.platform === "iphone";
  const estAndroid = candidate.platform === "android";

  // Lien réellement utilisé dans le bouton et le texte de secours — Play
  // Store pour Android (installation native fiable, cf. commentaire
  // PLAY_STORE_URL), URL web classique pour iPhone et tout autre cas
  // (repli sûr si platform est absent/inattendu).
  const lienInstallation = estAndroid ? PLAY_STORE_URL : appUrl;
  const safeLienInstallation = escapeHtml(lienInstallation);

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
                  <td style="padding:36px 34px ${estIphone || estAndroid ? "0" : "36px"};">
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
                      Vous allez pouvoir découvrir l'application,
                      tester ses fonctionnalités et nous aider à
                      améliorer l'expérience des futurs utilisateurs.
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
                            href="${safeLienInstallation}"
                            style="
                              display:inline-block;
                              padding:15px 25px;
                              color:#ffffff;
                              text-decoration:none;
                              font-size:16px;
                              font-weight:700;
                            "
                          >
                            ${estAndroid ? "Installer Yoria" : "Accéder à Yoria"}
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
                      ${safeLienInstallation}
                    </p>
                  </td>
                </tr>

                ${estIphone ? createInstructionsIosHtml() : ""}
                ${estAndroid ? createInstructionsAndroidHtml() : ""}

                <tr>
                  <td style="
                    padding:22px 34px;
                    background:#f8f7fb;
                    color:#777283;
                    font-size:13px;
                  ">
                    Merci de participer à l'aventure Yoria.
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

// ------------------------------------------------------------
// Notification admin — nouvelle candidature en attente (ajout).
// Envoyée UNIQUEMENT pour les candidatures "pending" (celles qui exigent
// une action manuelle de Laurent dans beta-admin) — jamais pour les
// candidatures auto-validées "invited" (déjà traitées automatiquement,
// une notification serait du bruit sans action à faire). Décision
// explicite de Laurent : "seulement les pending".
//
// Destinataire = BETA_INVITATION_FROM_EMAIL (même adresse que l'envoi des
// invitations candidat, décision explicite de Laurent plutôt qu'une
// variable d'environnement séparée à ajouter) — envoyé DEPUIS cette même
// adresse également (Brevo exige un expéditeur vérifié ; se l'envoyer à
// soi-même depuis sa propre adresse fonctionne normalement côté
// délivrabilité).
//
// Best-effort, comme tous les envois email de ce module : un échec ne
// doit jamais faire échouer l'enregistrement de la candidature (déjà en
// base à ce stade) — l'appelant (api/beta.js) doit envelopper cet appel
// dans son propre try/catch et ignorer l'erreur.
// ------------------------------------------------------------
function createAdminNotificationHtml(candidate) {
  const firstName = escapeHtml(candidate.first_name);
  const email = escapeHtml(candidate.email);
  const platform = candidate.platform === "android" ? "Android" : "iPhone";
  const level = escapeHtml(candidate.running_level || "—");
  const runsPerWeek = escapeHtml(String(candidate.runs_per_week ?? "—"));
  const favoriteDistance = escapeHtml(candidate.favorite_distance || "—");
  const usesStrava = candidate.uses_strava ? "Oui" : "Non";
  const message = candidate.message ? escapeHtml(candidate.message) : null;

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
                  max-width:560px;
                  background:#ffffff;
                  border-radius:20px;
                  overflow:hidden;
                  box-shadow:0 18px 45px rgba(50,42,80,.10);
                "
              >
                <tr>
                  <td style="
                    padding:26px 30px;
                    background:linear-gradient(135deg,#7042db,#54d7ae);
                    color:#ffffff;
                  ">
                    <div style="font-size:20px; font-weight:800;">
                      🔔 Nouvelle candidature bêta — à valider
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:28px 30px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px; line-height:1.8;">
                      <tr><td style="color:#8a8696; width:140px;">Prénom</td><td style="color:#19172b; font-weight:700;">${firstName}</td></tr>
                      <tr><td style="color:#8a8696;">E-mail</td><td style="color:#19172b;">${email}</td></tr>
                      <tr><td style="color:#8a8696;">Téléphone</td><td style="color:#19172b;">${platform}</td></tr>
                      <tr><td style="color:#8a8696;">Niveau</td><td style="color:#19172b;">${level}</td></tr>
                      <tr><td style="color:#8a8696;">Sorties / semaine</td><td style="color:#19172b;">${runsPerWeek}</td></tr>
                      <tr><td style="color:#8a8696;">Distance favorite</td><td style="color:#19172b;">${favoriteDistance}</td></tr>
                      <tr><td style="color:#8a8696;">Utilise Strava</td><td style="color:#19172b;">${usesStrava}</td></tr>
                    </table>

                    ${message ? `
                    <div style="margin-top:18px; padding:14px 16px; background:#f5f3fa; border-radius:10px; font-size:13.5px; color:#615d70; line-height:1.6;">
                      « ${message} »
                    </div>
                    ` : ""}

                    <p style="margin:24px 0 0; font-size:13px; color:#8a8696; line-height:1.6;">
                      À valider depuis <strong>beta-admin</strong> — cette candidature
                      est en attente et n'a pas été auto-validée (seuil des 20
                      premières candidatures dépassé).
                    </p>
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
        "L'e-mail d'invitation n'a pas pu être envoyé.",
    );
  }

  return data;
}

// ------------------------------------------------------------
// Envoi de la notification admin (ajout) — cf. commentaire détaillé sur
// createAdminNotificationHtml ci-dessus pour le contexte complet.
// ------------------------------------------------------------
async function sendBrevoAdminNotification(config, candidate) {
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
            email: config.fromEmail,
            name: config.fromName,
          },
        ],
        subject: `Nouvelle candidature bêta — ${candidate.first_name}`,
        htmlContent: createAdminNotificationHtml(candidate),
        tags: ["yoria-beta-admin-notification"],
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
      "Erreur Brevo (notification admin) :",
      response.status,
      data,
    );

    throw new Error(
      data?.message ||
        "La notification admin n'a pas pu être envoyée.",
    );
  }

  return data;
}

export { sendBrevoInvitation, createInvitationHtml, sendBrevoAdminNotification };
