// Module partagé — envoi de l'email d'invitation bêta via Brevo.
// Factorisé hors de beta-admin.js (où il vivait à l'origine, déclenché par
// le clic "Envoyer l'invitation") pour être réutilisable aussi par beta.js
// (auto-validation des candidatures à la soumission, cf. inventaire §16).
// Un seul chemin de génération du contenu email, jamais dupliqué entre les
// deux points d'appel — évite toute divergence future entre l'email envoyé
// manuellement et celui envoyé automatiquement.

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Instructions d'installation Android (ajout, auto-validation) — pendant du
// bloc iOS déjà existant. La TWA Play Store reste la voie recommandée
// (cf. inventaire §13), mais un candidat auto-validé n'a pas forcément
// encore le lien Play Store en tête — un rappel explicite évite toute
// ambiguïté sur "comment j'installe concrètement".
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
              <div style="
                margin:0 0 12px;
                font-size:15px;
                font-weight:800;
                color:#19172b;
              ">
                🤖 Installer Yoria sur Android
              </div>

              <p style="
                margin:0 0 0;
                color:#615d70;
                font-size:14px;
                line-height:1.6;
              ">
                Ouvrez le lien ci-dessus depuis votre téléphone Android —
                l'installation se lance directement, comme n'importe quelle
                application.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

// Instructions d'installation iOS — inchangées, reprises telles quelles
// depuis beta-admin.js.
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
  const safeAppUrl = escapeHtml(appUrl);
  const estIphone = candidate.platform === "iphone";
  const estAndroid = candidate.platform === "android";

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
