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

export { sendBrevoInvitation, createInvitationHtml };
