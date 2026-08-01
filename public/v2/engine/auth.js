// ============================================================
// Yoria — Module d'authentification Supabase
// Fix 19/07/2026 : #ecran-onboarding démarrait scrollé au milieu du
// contenu (align-items: center sur un contenu plus haut que l'écran,
// selon navigateur) plutôt qu'en haut — Laurent voyait "FC max" en
// premier au lieu de "Année de naissance". Passé à align-items:
// flex-start pour garantir un affichage démarrant toujours en haut.
// Source de vérité unique : public/v2/engine/auth.js, chargé dynamiquement
// via import() par index.html et v2/index.html (pas de copie classic —
// auth.classic.js/sync-storage.classic.js ont été retirés le 19/07/2026,
// cf. inventaire §3, même étape de conversion que plan-generator.js).
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Clés récupérées depuis /api/config (route serverless Vercel lisant de
// vraies variables d'environnement), plutôt qu'en dur dans ce fichier —
// ajouté le 13 juillet 2026. La clé "anon" reste publique par conception
// (sécurité via RLS côté base) ; ceci n'est qu'une question de
// maintenabilité (changer la clé sans retoucher le code).
//
// `supabase` n'est plus disponible immédiatement au chargement du module
// (fetch réseau nécessaire) — export d'une promesse `supabaseReady` que
// tout appelant doit attendre avant le premier usage. Les fonctions de ce
// fichier (monterEcranAuth, etc.) l'attendent en interne, donc ce n'est
// visible que pour du code externe qui importerait `supabase` directement.
export let supabase;
export const supabaseReady = fetch('/api/config')
  .then(r => r.json())
  .then(({ supabaseUrl, supabaseAnonKey }) => {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    return supabase;
  });

// ------------------------------------------------------------
// Construit et monte l'écran de connexion/inscription dans le
// conteneur DOM fourni. Résout la promesse retournée avec
// l'utilisateur connecté dès qu'une session est active (existante
// au chargement, ou obtenue via le formulaire).
// ------------------------------------------------------------
export async function monterEcranAuth(conteneurId = 'ecran-auth-hote') {
  await supabaseReady; // garantit que `supabase` est bien créé avant usage
  const hote = document.getElementById(conteneurId);
  if (!hote) throw new Error(`monterEcranAuth: conteneur #${conteneurId} introuvable`);

  hote.innerHTML = `
    <style>
    #ecran-auth {
      position: fixed; inset: 0; z-index: 9999;
      background: var(--bg); color: var(--text);
      display: flex; align-items: center; justify-content: center;
      padding: 20px; box-sizing: border-box;
    }
    #ecran-auth .carte { width: 100%; max-width: 360px; }
    #ecran-auth .bandeau { text-align: center; margin-bottom: 28px; }
    #ecran-auth .bandeau svg { margin-bottom: 12px; }
    #ecran-auth .bandeau h1 { font-size: 1.3rem; margin: 0; font-weight: 700; }
    #ecran-auth .bandeau .sous-titre {
      color: var(--accent); font-size: 0.75rem; letter-spacing: 0.08em;
      text-transform: uppercase; margin-top: 4px;
    }
    #ecran-auth .onglets {
      display: flex; border: 1px solid var(--border); border-radius: 10px;
      overflow: hidden; margin-bottom: 20px;
    }
    #ecran-auth .onglet {
      flex: 1; padding: 10px; text-align: center; background: var(--bg);
      color: var(--text); cursor: pointer; font-size: 0.85rem; border: none;
      transition: background 0.15s;
    }
    #ecran-auth .onglet.actif { background: var(--accent); color: var(--bg); font-weight: 600; }
    #ecran-auth label { display: block; font-size: 0.8rem; margin-bottom: 4px; color: var(--text-muted); }
    #ecran-auth input {
      width: 100%; padding: 11px 12px; margin-bottom: 14px; border-radius: 8px;
      border: 1px solid var(--border); background: var(--bg); color: var(--text);
      font-size: 0.95rem; box-sizing: border-box;
    }
    #ecran-auth input:focus { outline: none; border-color: var(--accent); }
    #ecran-auth .btn-principal {
      width: 100%; padding: 12px; border-radius: 8px; border: none;
      background: var(--accent); color: var(--bg); font-weight: 700;
      font-size: 0.95rem; cursor: pointer; margin-top: 4px;
    }
    #ecran-auth .btn-principal:disabled { opacity: 0.5; cursor: not-allowed; }
    #ecran-auth .message { margin-top: 14px; font-size: 0.82rem; text-align: center; min-height: 1.2em; }
    #ecran-auth .message.erreur { color: var(--warn); }
    #ecran-auth .message.succes { color: var(--accent2); }
    #ecran-auth .lien-secondaire { margin-top: 12px; font-size: 0.82rem; text-align: center; color: var(--text-muted); }
    #ecran-auth .lien-secondaire:hover { color: var(--accent); }
    </style>
    <div id="ecran-auth">
      <div class="carte">
        <div class="bandeau">
          <svg width="72" height="72" viewBox="0 0 512 512">
            <defs>
              <linearGradient id="g1" x1="100" y1="80" x2="260" y2="430" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#1E4ED8"/>
                <stop offset="1" stop-color="#2E8CF0"/>
              </linearGradient>
              <linearGradient id="g2" x1="420" y1="80" x2="250" y2="430" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#22C7B8"/>
                <stop offset="1" stop-color="#75E4D8"/>
              </linearGradient>
            </defs>
            <path d="M92 92 C184 104, 232 154, 256 230 C270 276, 264 342, 246 420" fill="none" stroke="url(#g1)" stroke-width="42" stroke-linecap="round"/>
            <path d="M420 92 C328 104, 280 154, 256 230 C242 276, 248 342, 266 420" fill="none" stroke="url(#g2)" stroke-width="42" stroke-linecap="round"/>
          </svg>
          <h1>Yoria</h1>
          <div class="sous-titre">Connexion</div>
        </div>
        <div class="onglets">
          <button type="button" class="onglet actif" data-mode="connexion">Se connecter</button>
          <button type="button" class="onglet" data-mode="inscription">Créer un compte</button>
        </div>

        <form id="form-auth">
          <label for="auth-email">Email</label>
          <input type="email" id="auth-email" autocomplete="email" required>
          <label for="auth-password">Mot de passe</label>
          <input type="password" id="auth-password" autocomplete="current-password" required minlength="6">
          <button type="submit" class="btn-principal" id="auth-submit">Se connecter</button>
          <div class="message" id="auth-message"></div>
        </form>
        <div class="lien-secondaire" id="lien-mdp-oublie" style="cursor:pointer; text-decoration:underline;">Mot de passe oublié ?</div>
        <div class="lien-secondaire" id="lien-suppr-compte" style="cursor:pointer; text-decoration:underline; color:var(--warn);">Supprimer mon compte</div>
      </div>
    </div>
  `;

  return new Promise((resolve) => {
    const ecranAuth = hote.querySelector('#ecran-auth');
    const form = hote.querySelector('#form-auth');
    const emailInput = hote.querySelector('#auth-email');
    const passwordInput = hote.querySelector('#auth-password');
    const submitBtn = hote.querySelector('#auth-submit');
    const messageEl = hote.querySelector('#auth-message');
    const onglets = hote.querySelectorAll('#ecran-auth .onglet');
    const lienMdpOublie = hote.querySelector('#lien-mdp-oublie');
    const lienSupprCompte = hote.querySelector('#lien-suppr-compte');

    let mode = 'connexion';
    let dejaResolu = false;

    onglets.forEach(btn => {
      btn.addEventListener('click', () => {
        mode = btn.dataset.mode;
        onglets.forEach(b => b.classList.toggle('actif', b === btn));
        submitBtn.textContent = mode === 'connexion' ? 'Se connecter' : 'Créer mon compte';
        passwordInput.autocomplete = mode === 'connexion' ? 'current-password' : 'new-password';
        lienMdpOublie.style.display = mode === 'connexion' ? 'block' : 'none';
        lienSupprCompte.style.display = mode === 'connexion' ? 'block' : 'none';
        messageEl.textContent = '';
      });
    });

    function afficherMessage(texte, type) {
      messageEl.textContent = texte;
      messageEl.className = `message ${type}`;
    }

    // "Mot de passe oublié ?" — envoie un email Supabase avec un lien de
    // réinitialisation. Ajouté le 13 juillet 2026 (jusque-là, seule
    // option : réinitialisation manuelle via SQL Editor, peu pratique
    // pour un usage courant).
    lienMdpOublie.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      if (!email) {
        afficherMessage('Entre ton email ci-dessus, puis clique à nouveau sur ce lien.', 'erreur');
        return;
      }
      lienMdpOublie.style.pointerEvents = 'none';
      afficherMessage('Envoi en cours…', 'succes');
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        afficherMessage('Email envoyé — vérifie ta boîte mail (et les spams) pour le lien de réinitialisation.', 'succes');
      } catch (err) {
        afficherMessage('Erreur : ' + err.message, 'erreur');
      } finally {
        lienMdpOublie.style.pointerEvents = 'auto';
      }
    });

    // "Supprimer mon compte" — ajouté le 14/07/2026, pour retester le flow
    // d'inscription/onboarding sans accumuler de comptes de test. Exige
    // d'être connecté (nécessite le vrai access_token pour l'API serveur,
    // cf. api/delete-account.js) : on demande donc email + mot de passe
    // AVANT de supprimer, via une vraie connexion, pas juste une saisie
    // libre — ça sert aussi de double confirmation implicite (il faut
    // connaître le mot de passe pour supprimer le compte).
    lienSupprCompte.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      if (!email || !password) {
        afficherMessage('Entre ton email et ton mot de passe ci-dessus, puis clique à nouveau sur ce lien.', 'erreur');
        return;
      }
      if (!confirm('Supprimer définitivement ton compte Yoria et toutes tes données (plans, profil, historique) ? Cette action est irréversible.')) {
        return;
      }

      lienSupprCompte.style.pointerEvents = 'none';
      afficherMessage('Suppression en cours…', 'succes');
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const res = await fetch('/api/delete-account', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${data.session.access_token}` }
        });
        const resultat = await res.json();
        if (!res.ok) throw new Error(resultat.error || 'Échec de la suppression.');

        await supabase.auth.signOut();
        localStorage.clear();
        afficherMessage('Compte supprimé. Rechargement…', 'succes');
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        afficherMessage('Erreur : ' + err.message, 'erreur');
        lienSupprCompte.style.pointerEvents = 'auto';
      }
    });

    // CORRECTIF SÉCURITÉ (15/07/2026) — deuxième barrière en plus du nettoyage
    // fait par deconnecter() : celle-ci ne couvre que le cas où l'utilisateur
    // clique explicitement sur "Se déconnecter". Si une session expire toute
    // seule, ou qu'un autre compte se connecte directement sans passer par ce
    // bouton (ex. session Supabase jamais fermée proprement), localStorage
    // pouvait encore contenir les données du dernier utilisateur. Ici, on
    // compare l'id de l'utilisateur qui se connecte à celui mémorisé lors de
    // la dernière connexion sur CET appareil (lk_dernier_user_id, pas une
    // donnée sensible en soi, juste une empreinte de comparaison) — si ça ne
    // correspond pas, on purge avant de débloquer l'app, empêchant tout accès
    // aux données de l'utilisateur précédent le temps d'un seul rendu.
    function debloquer(user) {
      if (dejaResolu) return; // évite une double résolution (ex: getUser() + submit concurrents)
      dejaResolu = true;
      const dernierUserId = localStorage.getItem('lk_dernier_user_id');
      if (dernierUserId && dernierUserId !== user.id) {
        const theme = localStorage.getItem('lk_theme');
        localStorage.clear();
        if (theme) localStorage.setItem('lk_theme', theme);
      }
      localStorage.setItem('lk_dernier_user_id', user.id);
      ecranAuth.style.display = 'none';
      resolve(user);
    }

    let modeRecovery = false; // devient true une fois le formulaire remplacé pour le reset

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (modeRecovery) return; // le formulaire a été remplacé, ce listener est obsolète
      submitBtn.disabled = true;
      messageEl.textContent = '';
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      try {
        if (mode === 'connexion') {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          debloquer(data.user);
        } else {
          const { data, error } = await supabase.auth.signUp({ email, password });
          if (error) throw error;
          if (data.session) {
            debloquer(data.user);
          } else {
            afficherMessage('Compte créé. Vérifie ta boîte mail pour confirmer avant de te connecter.', 'succes');
          }
        }
      } catch (err) {
        const messages = {
          'Invalid login credentials': 'Email ou mot de passe incorrect.',
          'User already registered': 'Un compte existe déjà avec cet email.',
        };
        afficherMessage(messages[err.message] || err.message, 'erreur');
      } finally {
        submitBtn.disabled = false;
      }
    });

    // Session déjà active au chargement (retour utilisateur) : on
    // saute directement l'écran, sans attendre d'action. SAUF si l'URL
    // contient un token de recovery (#access_token=...&type=recovery) —
    // dans ce cas, on laisse le listener PASSWORD_RECOVERY ci-dessous
    // gérer l'affichage du formulaire de nouveau mot de passe, plutôt
    // que de débloquer directement sur une session déjà active (bug
    // découvert en PWA installée le 13 juillet 2026 : getUser() se
    // résolvait plus vite que le SDK ne traite le fragment d'URL,
    // débloquant sur le dashboard sans jamais montrer le formulaire).
    const estRetourRecovery = window.location.hash.includes('type=recovery');
    if (!estRetourRecovery) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) debloquer(user);
      });
    }

    // Retour depuis le lien "mot de passe oublié" — Supabase déclenche
    // PASSWORD_RECOVERY plutôt qu'une session normale. Ajouté le 13
    // juillet 2026 : sans ce cas, resetPasswordForEmail() connectait bien
    // l'utilisateur au clic sur le lien email, mais ne proposait jamais
    // de saisir le nouveau mot de passe — impasse. On remplace le
    // formulaire de connexion par un formulaire dédié le temps de ce
    // changement, puis on débloque normalement.
    supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'PASSWORD_RECOVERY') return;
      modeRecovery = true; // désactive le vieux listener de connexion, cf. plus haut
      form.innerHTML = `
        <label for="auth-nouveau-mdp">Choisis un nouveau mot de passe</label>
        <input type="password" id="auth-nouveau-mdp" autocomplete="new-password" required minlength="6">
        <button type="submit" class="btn-principal">Valider</button>
      `;
      hote.querySelector('#ecran-auth .onglets').style.display = 'none';
      lienMdpOublie.style.display = 'none';
      lienSupprCompte.style.display = 'none';
      hote.querySelector('.sous-titre').textContent = 'Nouveau mot de passe';

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nouveauMdp = hote.querySelector('#auth-nouveau-mdp').value;
        try {
          const { error } = await supabase.auth.updateUser({ password: nouveauMdp });
          if (error) throw error;
          debloquer(session.user);
        } catch (err) {
          afficherMessage('Erreur : ' + err.message, 'erreur');
        }
      }, { once: true });
    });
  });
}

// ------------------------------------------------------------
// Déconnexion — utilisable depuis renderSettings() par exemple.
//
// CORRECTIF SÉCURITÉ CRITIQUE (15/07/2026, signalé par Laurent — après
// déconnexion/reconnexion sur le même appareil, un compte pouvait voir et
// SUPPRIMER les plans d'un autre utilisateur). Cause racine : deconnecter()
// ne faisait que supabase.auth.signOut(), sans jamais vider localStorage.
// Toutes les données restaient donc en place après déconnexion — en
// particulier lk_github_token/v2_gist_id, qui pointent vers UN Gist GitHub
// précis, complètement indépendant de la session Supabase. Un compte B qui
// se connecte ensuite sur ce même appareil, sans ses propres intégrations
// GitHub configurées, hérite silencieusement du token/Gist du compte A
// laissé en place — afficherPlansSauvegardes() (v2/index.html) bascule
// automatiquement sur ce Gist dès que chargerPlansSupabase() renvoie une
// liste vide pour le compte B, sans aucune vérification d'appartenance
// (chargerPlans()/gist-sync.js lit purement localStorage, ignorant tout
// scoping par utilisateur).
//
// Correctif : on vide tout localStorage à la déconnexion, à l'exception de
// la préférence d'affichage (thème clair/sombre) qui n'est pas une donnée
// personnelle et n'a aucune raison de forcer une re-sélection à chaque
// connexion. C'est délibérément une purge large plutôt qu'une liste de clés
// à retirer une par une : l'historique de ce projet montre plusieurs bugs
// venant justement d'une clé oubliée dans ce genre de liste (cf. v2_gist_id
// absent de CLES_INTEGRATIONS, §14 de l'inventaire) — un risque de sécurité
// ne doit pas dépendre de l'exhaustivité d'une énumération manuelle.
// ------------------------------------------------------------
export async function deconnecter() {
  await supabaseReady;
  const { error } = await supabase.auth.signOut();
  const theme = localStorage.getItem('lk_theme');
  localStorage.clear();
  if (theme) localStorage.setItem('lk_theme', theme);
  if (error) throw error;
}

// ------------------------------------------------------------
// Écran d'onboarding profil — v2.8 (§17.7), affiché une seule fois
// juste après la création de compte, avant le premier wizard course/
// forme. Refonte du 01/08/2026 (demande de Laurent) : collecte
// désormais l'intégralité du profil coureur (pas seulement niveau/FC/
// année comme avant), réparti en 4 pages successives navigables (swipe +
// boutons Précédent/Suivant, même principe que ECRANS_WIZARD dans
// v2/index.html) pour éviter un formulaire trop long en une seule vue :
// 1) Toi (prénom*, nom, date de naissance*)
// 2) Ta forme (poids, taille, FC max/repos, sexe, PPS)
// 3) Records personnels
// 4) Ton niveau*
// (* = obligatoire, bloque le passage à la page suivante / la validation
// finale — seuls prénom, date de naissance et niveau le sont).
//
// Ne touche PAS directement à localStorage/Supabase : l'appelant
// (index.html / v2/index.html) est responsable de fusionner le retour
// dans profilCoureur et d'appeler sauvegarderProfilCoureur() — cf.
// pattern déjà utilisé par monterEcranAuth (resolve(user), pas de
// persistance interne au module).
//
// profilExistant : objet profilCoureur actuel (peut être partiellement
// rempli si migré depuis l'ancien format, cf. migrerVersProfilCoureur).
// Résout avec { prenom, nom, dateNaissance, poids, taille, pps, fcMax,
// fcRepos, sexe, niveau, records } — profil complet à fusionner par
// l'appelant (plus un sous-ensemble minimal comme avant le 01/08/2026).
// ------------------------------------------------------------
export function monterEcranOnboarding(conteneurId, profilExistant = {}) {
  const hote = document.getElementById(conteneurId);
  if (!hote) throw new Error(`monterEcranOnboarding: conteneur #${conteneurId} introuvable`);

  return new Promise((resolve) => {
    const NIVEAUX = [
      { val: 'grand-debutant', label: "Je n'ai jamais couru", desc: "Je marche, ou je découvre — pas encore capable de courir en continu" },
      { val: 'debutant', label: 'Débutant', desc: "Moins de 6 mois de course régulière" },
      { val: 'intermediaire', label: 'Intermédiaire', desc: "Je cours depuis un moment, j'ai déjà couru un 10K" },
      { val: 'confirme', label: 'Confirmé', desc: "Plusieurs courses, je connais mes allures" },
    ];
    let niveauChoisi = profilExistant.niveau || null;
    let sexeChoisi = profilExistant.sexe || null;

    const SEXES = [
      { val: 'homme', label: 'Homme' },
      { val: 'femme', label: 'Femme' },
      { val: 'autre', label: 'Autre' },
    ];

    // Records personnels (v2.14, 18/07/2026) — même format de stockage que
    // Réglages (profilCoureur.records[dist].temps, compatible parseTimeToSeconds
    // du moteur). Saisie par roulette depuis le 31/07/2026 (demande de
    // Laurent, même composant que public/v2/index.html et Réglages —
    // cf. creerColonneRouletteOnboarding ci-dessous) : PORTÉ SÉPARÉMENT
    // ici, pas importé depuis index.html — contrainte déjà actée avant ce
    // chantier (commentaire d'origine : "pas d'accès à
    // window.creerChampsTempsHMS d'index.html, chargé après ce module"),
    // toujours valable pour la roulette elle-même (auth.js ne doit jamais
    // dépendre de l'ordre de chargement d'index.html).
    const DISTANCES_RECORD = ["5K", "10K", "Semi", "Marathon"];
    function parserTempsRecordEnHMSOnboarding(str) {
      if (!str) return { h: null, m: null, s: null };
      const parts = str.split(':').map(Number);
      if (parts.length === 2) return { h: null, m: parts[0] || null, s: parts[1] ?? null };
      if (parts.length === 3) return { h: parts[0] || null, m: parts[1] ?? null, s: parts[2] ?? null };
      return { h: null, m: null, s: null };
    }
    function formaterHMSEnTempsRecordOnboarding(h, m, s) {
      const hNum = parseInt(h) || 0, mNum = parseInt(m) || 0, sNum = parseInt(s) || 0;
      if (!h && !m && !s) return null;
      const mm = String(mNum).padStart(2, '0'), ss = String(sNum).padStart(2, '0');
      return hNum > 0 ? `${hNum}:${mm}:${ss}` : `${mNum}:${ss}`;
    }

    // Conversion "h:mm:ss" ou "mm:ss" -> secondes totales, dupliquée ici
    // en local (31/07/2026) pour le garde-fou record du monde — même
    // raison que HEURES_MAX_PAR_DISTANCE plus bas : ce module ne doit
    // jamais dépendre de plan-generator.js/index.html (contrainte déjà
    // actée, cf. commentaire ci-dessus sur creerColonneRouletteOnboarding).
    function parserTempsEnSecondesOnboarding(str) {
      if (!str) return 0;
      const parts = str.split(':').map(Number);
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      return 0;
    }

    // Records du monde (route, hommes) par distance, en secondes — plancher
    // ABSOLU de temps saisissable ici (31/07/2026, demande de Laurent :
    // "empêcher de mettre des objectifs irréalistes... des temps records
    // du monde"). Table dupliquée depuis plan-generator.js
    // (RECORDS_MONDE_SECONDES) plutôt qu'importée — même contrainte
    // d'indépendance que HEURES_MAX_PAR_DISTANCE ci-dessous. À garder
    // synchronisée si la table source change (sources/méthode identiques,
    // cf. son commentaire dans plan-generator.js).
    const RECORDS_MONDE_SECONDES_ONBOARDING = {
      '5K': 12 * 60 + 49,
      '10K': 26 * 60 + 31,
      'Semi': 57 * 60 + 20,
      'Marathon': 1 * 3600 + 59 * 60 + 30,
    };

    // ── Composant roulette (wheel picker), porté ici indépendamment —
    // mêmes principes que public/v2/index.html et Réglages (index.html) :
    // calcul direct de scrollTop (jamais scrollIntoView), boutons +/-
    // au-dessus/en-dessous de chaque colonne dans un viewport réduit
    // (seul le chiffre actif reste visible), et positionnement initial
    // vérifié par condition réelle (offsetParent non null) plutôt que par
    // délai arbitraire — déployé depuis Réglages le 31/07/2026, où
    // plusieurs itérations de délai (setTimeout(0), requestAnimationFrame,
    // délai fixe) ont été nécessaires avant de trouver ce qui fonctionne
    // réellement de façon fiable.
    function creerColonneRouletteOnboarding(conteneurId, valeurs, valeurInitiale, onSelect){
      const conteneur = hote.querySelector('#' + conteneurId);
      if (!conteneur) return null;
      conteneur.innerHTML = '';
      const padHaut = document.createElement('div'); padHaut.className = 'roulette-pad';
      conteneur.appendChild(padHaut);
      const items = valeurs.map(v => {
        const item = document.createElement('div');
        item.className = 'roulette-item';
        item.textContent = String(v).padStart(2,'0');
        item.dataset.valeur = v;
        conteneur.appendChild(item);
        return item;
      });
      const padBas = document.createElement('div'); padBas.className = 'roulette-pad';
      conteneur.appendChild(padBas);

      let valeurActuelle = valeurInitiale;
      let timerScrollFin = null;
      const HAUTEUR_ITEM = 36, HAUTEUR_PAD = 42, HAUTEUR_PICKER = 120; // cf. CSS .roulette-* de cet écran
      const margeVerticale = (HAUTEUR_PICKER - HAUTEUR_ITEM) / 2;
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entree => {
          if (entree.isIntersecting && entree.intersectionRatio > 0.5) {
            items.forEach(it => it.classList.remove('actif'));
            entree.target.classList.add('actif');
          }
        });
      }, { root: conteneur, rootMargin: `-${margeVerticale}px 0px -${margeVerticale}px 0px`, threshold: [0, 0.5, 1] });
      items.forEach(it => observer.observe(it));

      conteneur.addEventListener('scroll', () => {
        clearTimeout(timerScrollFin);
        timerScrollFin = setTimeout(() => {
          const itemActif = conteneur.querySelector('.roulette-item.actif');
          if (!itemActif) return;
          const nouvelleValeur = parseInt(itemActif.dataset.valeur, 10);
          if (nouvelleValeur !== valeurActuelle) {
            valeurActuelle = nouvelleValeur;
            onSelect(nouvelleValeur);
          }
        }, 120);
      }, { passive: true });

      const api = {
        definirValeur(v, animer){
          const index = items.findIndex(it => parseInt(it.dataset.valeur,10) === v);
          if (index === -1) return;
          valeurActuelle = v;
          const cible = HAUTEUR_PAD + index * HAUTEUR_ITEM - (HAUTEUR_PICKER - HAUTEUR_ITEM) / 2;
          if (animer === false) conteneur.scrollTop = cible;
          else conteneur.scrollTo({ top: cible, behavior: 'smooth' });
          items.forEach(it => it.classList.remove('actif'));
          items[index].classList.add('actif');
        },
        valeur(){ return valeurActuelle; },
      };
      // Positionnement initial vérifié par condition réelle (31/07/2026) —
      // cf. le commentaire au-dessus de creerColonneRouletteOnboarding
      // pour le détail de pourquoi un simple délai ne suffisait pas.
      (function attendreEtPositionner(tentative) {
        if (conteneur.offsetParent !== null) {
          api.definirValeur(valeurInitiale, false);
          return;
        }
        if ((tentative ?? 0) > 120) return;
        setTimeout(() => attendreEtPositionner((tentative ?? 0) + 1), 16);
      })(0);
      return api;
    }

    // Instancie les 3 colonnes h/min/sec pour une distance donnée et les
    // synchronise vers les inputs cachés onb-rec-{dist}-h/-m/-s — mêmes
    // ids que la version précédente (input type=number), donc terminer()
    // plus bas n'a besoin d'AUCUNE modification pour lire ces valeurs.
    //
    // HEURES_MAX_PAR_DISTANCE (31/07/2026, demande de Laurent : 24h
    // identique pour les 4 distances jugé abusé) — même table que
    // index.html (Réglages), cf. son commentaire pour le détail du
    // raisonnement par distance.
    const HEURES_MAX_PAR_DISTANCE = { "5K": 1, "10K": 2, "Semi": 4, "Marathon": 9 };
    // Registre des instances de roulette actives, indexé par distance
    // (31/07/2026) — nécessaire pour le bouton "Effacer" et les boutons
    // +/-, même principe que Réglages (index.html).
    const roulettesActivesOnboarding = {};
    function initRouletteHMSOnboarding(dist, hInit, mInit, sInit){
      const inputH = hote.querySelector(`#onb-rec-${dist}-h`);
      const inputM = hote.querySelector(`#onb-rec-${dist}-m`);
      const inputS = hote.querySelector(`#onb-rec-${dist}-s`);
      if (!inputH || !inputM || !inputS) return;
      const heuresMax = HEURES_MAX_PAR_DISTANCE[dist] ?? 9;
      const declencherInput = (input, valeur) => { input.value = String(valeur); };
      const colH = creerColonneRouletteOnboarding(`onb-rec-${dist}-rouletteH`, Array.from({length:heuresMax+1},(_,i)=>i), hInit ?? 0, v => declencherInput(inputH, v));
      const colM = creerColonneRouletteOnboarding(`onb-rec-${dist}-rouletteM`, Array.from({length:60},(_,i)=>i), mInit ?? 0, v => declencherInput(inputM, v));
      const colS = creerColonneRouletteOnboarding(`onb-rec-${dist}-rouletteS`, Array.from({length:60},(_,i)=>i), sInit ?? 0, v => declencherInput(inputS, v));
      roulettesActivesOnboarding[dist] = { h: colH, m: colM, s: colS };

      // Boutons +/- (31/07/2026, déployés depuis Réglages) — même pattern :
      // bouclage aux bornes, scroll instantané (animer=false, évite le
      // conflit entre behavior:'smooth' et scroll-snap-type:y mandatory).
      function cablerBoutonPlus(idBouton, colApi, inputCible, maxValeur) {
        const btn = hote.querySelector('#' + idBouton);
        if (!btn || !colApi) return;
        btn.addEventListener('click', () => {
          const nouvelle = (colApi.valeur() + 1) % (maxValeur + 1);
          colApi.definirValeur(nouvelle, false);
          declencherInput(inputCible, nouvelle);
        });
      }
      function cablerBoutonMoins(idBouton, colApi, inputCible, maxValeur) {
        const btn = hote.querySelector('#' + idBouton);
        if (!btn || !colApi) return;
        btn.addEventListener('click', () => {
          const nouvelle = (colApi.valeur() - 1 + maxValeur + 1) % (maxValeur + 1);
          colApi.definirValeur(nouvelle, false);
          declencherInput(inputCible, nouvelle);
        });
      }
      cablerBoutonPlus(`onb-rec-${dist}-plusH`, colH, inputH, heuresMax);
      cablerBoutonMoins(`onb-rec-${dist}-moinsH`, colH, inputH, heuresMax);
      cablerBoutonPlus(`onb-rec-${dist}-plusM`, colM, inputM, 59);
      cablerBoutonMoins(`onb-rec-${dist}-moinsM`, colM, inputM, 59);
      cablerBoutonPlus(`onb-rec-${dist}-plusS`, colS, inputS, 59);
      cablerBoutonMoins(`onb-rec-${dist}-moinsS`, colS, inputS, 59);
    }

    hote.innerHTML = `
      <style>
      #ecran-onboarding {
        position: fixed; inset: 0; z-index: 9999;
        background: var(--bg); color: var(--text);
        display: flex; align-items: flex-start; justify-content: center;
        padding: 20px; box-sizing: border-box; overflow-y: auto;
      }
      #ecran-onboarding .carte { width: 100%; max-width: 400px; }
      #ecran-onboarding .bandeau { text-align: center; margin-bottom: 20px; }
      #ecran-onboarding .bandeau h1 { font-size: 1.25rem; margin: 0 0 6px; font-weight: 700; }
      #ecran-onboarding .bandeau .sous-titre { color: var(--text-muted); font-size: 0.85rem; }
      #ecran-onboarding label { display: block; font-size: 0.8rem; margin-bottom: 4px; color: var(--text-muted); }
      #ecran-onboarding label .obligatoire { color: var(--warn); margin-left: 3px; }
      #ecran-onboarding input {
        width: 100%; padding: 11px 12px; margin-bottom: 16px; border-radius: 8px;
        border: 1px solid var(--border); background: var(--bg); color: var(--text);
        font-size: 0.95rem; box-sizing: border-box;
      }
      #ecran-onboarding input:focus { outline: none; border-color: var(--accent); }
      #ecran-onboarding input.champ-manquant { border-color: var(--warn); }
      #ecran-onboarding .niveau-opt {
        display: flex; align-items: center; gap: 10px; padding: 12px 14px;
        border: 1px solid var(--border); border-radius: 10px; margin-bottom: 8px;
        cursor: pointer; transition: border-color 0.15s, background 0.15s;
      }
      #ecran-onboarding .niveau-opt.actif { border-color: var(--accent); background: rgba(var(--accent-rgb),0.08); }
      #ecran-onboarding .niveau-opt .titre { font-weight: 700; font-size: 0.9rem; }
      #ecran-onboarding .niveau-opt .desc { font-size: 0.78rem; color: var(--text-muted); }
      #ecran-onboarding .sexe-opts { display: flex; gap: 8px; margin-bottom: 16px; }
      #ecran-onboarding .sexe-opt {
        flex: 1; text-align: center; padding: 8px 6px;
        border: 1px solid var(--border); border-radius: 8px; cursor: pointer;
        font-size: 0.82rem; font-weight: 600; transition: border-color 0.15s, background 0.15s;
      }
      #ecran-onboarding .sexe-opt.actif { border-color: var(--accent); background: rgba(var(--accent-rgb),0.08); color: var(--accent); }
      #ecran-onboarding .records-wrap {
        background: var(--bg); border: 1px solid var(--border); border-radius: 10px;
        padding: 12px 14px; margin-bottom: 16px;
      }
      #ecran-onboarding .record-row {
        display: flex; align-items: center; gap: 8px; padding: 10px 0; flex-wrap: wrap;
      }
      #ecran-onboarding .record-row + .record-row { border-top: 1px solid var(--border); }
      #ecran-onboarding .record-row .dist-label { width: 56px; flex-shrink: 0; font-size: 0.85rem; color: var(--text-muted); }
      #ecran-onboarding .record-row .rec-date {
        flex: 1 1 100%; margin: 6px 0 0; padding: 5px 8px; font-size: 0.78rem;
        background: var(--border-soft, rgba(0,0,0,0.04)); border: 1px solid var(--border);
        border-radius: 6px; color: var(--text-muted); box-sizing: border-box;
      }
      #ecran-onboarding .records-note { font-size: 0.75rem; color: var(--text-muted); margin: 8px 0 0; }
      #ecran-onboarding .btn-effacer-record {
        flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%;
        border: 1px solid var(--border); background: var(--bg); color: var(--text-muted);
        font-size: 11px; cursor: pointer; display: flex; align-items: center;
        justify-content: center; padding: 0;
      }
      #ecran-onboarding .btn-principal {
        width: 100%; padding: 12px; border-radius: 8px; border: none;
        background: var(--accent); color: var(--bg); font-weight: 700;
        font-size: 0.95rem; cursor: pointer; margin-top: 10px;
      }
      #ecran-onboarding .btn-principal:disabled { opacity: 0.5; cursor: not-allowed; }
      #ecran-onboarding .btn-secondaire {
        width: 100%; padding: 12px; border-radius: 8px;
        border: 1px solid var(--border); background: var(--bg); color: var(--text);
        font-weight: 600; font-size: 0.95rem; cursor: pointer; margin-top: 10px;
      }
      #ecran-onboarding .lien-secondaire {
        margin-top: 12px; font-size: 0.82rem; text-align: center; color: var(--text-muted);
        cursor: pointer; background: none; border: none; width: 100%;
      }
      #ecran-onboarding .lien-secondaire:hover { color: var(--accent); }
      /* ── Navigation entre pages (01/08/2026, refonte demandée par
         Laurent : onboarding découpé en 4 pages successives plutôt qu'un
         long formulaire unique — même principe que ECRANS_WIZARD/
         afficherEcranWizard dans v2/index.html). ──── */
      #ecran-onboarding .onb-page { display: none; }
      #ecran-onboarding .onb-page.actif { display: block; }
      #ecran-onboarding .onb-progression {
        display: flex; justify-content: center; gap: 6px; margin-bottom: 18px;
      }
      #ecran-onboarding .onb-point {
        width: 8px; height: 8px; border-radius: 50%; background: var(--border);
        transition: background 0.15s;
      }
      #ecran-onboarding .onb-point.actif { background: var(--accent); }
      #ecran-onboarding .onb-point.franchi { background: var(--accent2, var(--accent)); opacity: 0.5; }
      #ecran-onboarding .onb-nav { display: flex; gap: 10px; margin-top: 4px; }
      #ecran-onboarding .onb-nav .btn-secondaire,
      #ecran-onboarding .onb-nav .btn-principal { margin-top: 0; }
      #ecran-onboarding .onb-erreur {
        color: var(--warn); font-size: 0.78rem; margin: -10px 0 14px; min-height: 1.1em;
      }
      /* ── Roulette de saisie de temps (31/07/2026) — mêmes dimensions que
         Réglages (index.html), portée séparément ici (cf. commentaire sur
         creerColonneRouletteOnboarding plus haut). Chiffres non-actifs
         masqués (opacity:0), boutons +/- au-dessus/en-dessous de chaque
         colonne, viewport réduit qui ne montre que la bande centrale —
         déployé depuis Réglages où ce composant a été mis au point. ──── */
      #ecran-onboarding .roulette-temps{
        display:flex; align-items:flex-start; justify-content:center; gap:2px;
        background:var(--border-soft, rgba(0,0,0,0.04)); border:1px solid var(--border);
        border-radius:12px; padding:4px 6px; position:relative; height:98px;
        flex-shrink:0; width:130px; box-sizing:border-box;
      }
      /* top calculé : padding-top (4px) + bouton+gap (18px+2px=20px) +
         moitié viewport (25px) - moitié fenêtre (18px) = 31px. */
      #ecran-onboarding .roulette-fenetre{
        position:absolute; left:6px; right:6px; top:31px;
        height:36px; border-top:1px solid var(--border); border-bottom:1px solid var(--border);
        background:var(--bg); border-radius:8px; pointer-events:none;
      }
      #ecran-onboarding .roulette-colonne{
        width:40px; height:120px; overflow-y:scroll;
        scroll-snap-type:y mandatory; scrollbar-width:none; -ms-overflow-style:none;
        font-variant-numeric:tabular-nums;
        /* Décalage négatif : centre la colonne (120px) dans le viewport
           réduit (50px) — -35px = moitié colonne (60) - moitié viewport (25). */
        margin-top:-35px;
      }
      #ecran-onboarding .roulette-colonne::-webkit-scrollbar{ display:none; }
      #ecran-onboarding .roulette-colonne .roulette-pad{ height:42px; scroll-snap-align:none; }
      #ecran-onboarding .roulette-item{
        height:36px; display:flex; align-items:center; justify-content:center;
        font-size:18px; font-weight:600; line-height:1; color:var(--text-muted);
        scroll-snap-align:center; transition:opacity 0.1s;
        position:relative; z-index:1;
        opacity:0;
      }
      #ecran-onboarding .roulette-item.actif{ color:var(--text); opacity:1; }
      #ecran-onboarding .roulette-sep{ font-size:16px; color:var(--text-muted); align-self:center; margin-top:20px; }
      #ecran-onboarding .roulette-viewport{ width:40px; height:50px; overflow:hidden; position:relative; }
      #ecran-onboarding .roulette-btn-stepper{
        width:28px; height:18px; border-radius:5px; border:1px solid var(--border);
        background:var(--bg); color:var(--text-muted); font-size:13px; font-weight:700;
        cursor:pointer; padding:0; line-height:1; flex-shrink:0;
        display:flex; align-items:center; justify-content:center;
      }
      #ecran-onboarding .roulette-mini-colonne{
        display:flex; flex-direction:column; align-items:center; gap:2px; flex:1;
      }
      /* ── Module PPS (02/08/2026) — même principe visuel que la modale de
         index.html (bouton import, aperçu, suppression), porté ici en
         version compacte car intégré dans une page de formulaire plutôt
         qu'en plein écran séparé. ──── */
      #ecran-onboarding .pps-apercu {
        max-width: 100%; max-height: 160px; border-radius: 8px; display: block;
        margin: 8px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }
      #ecran-onboarding .pps-statut {
        font-size: 0.78rem; color: var(--text-muted); min-height: 1.1em; margin-top: 4px;
      }
      #ecran-onboarding .pps-btn-secondaire-petit {
        padding: 8px; border-radius: 8px; border: 1px solid var(--border);
        background: transparent; color: var(--text-muted); font-size: 0.78rem;
        cursor: pointer; margin-top: 6px; width: 100%;
      }
      </style>
      <div id="ecran-onboarding">
        <div class="carte">
          <div class="bandeau">
            <h1>Ton profil</h1>
            <div class="sous-titre">Ces infos servent à personnaliser tes plans — modifiables plus tard dans Réglages</div>
          </div>
          <div class="onb-progression">
            <span class="onb-point" data-page="0"></span>
            <span class="onb-point" data-page="1"></span>
            <span class="onb-point" data-page="2"></span>
            <span class="onb-point" data-page="3"></span>
          </div>

          <div class="onb-page" id="onb-page-0" data-page="0">
            <label for="onb-prenom">Prénom<span class="obligatoire">*</span> — utilisé par ton coach</label>
            <input type="text" id="onb-prenom" placeholder="Alex" value="${profilExistant.prenom || ''}">
            <label for="onb-nom">Nom — optionnel</label>
            <input type="text" id="onb-nom" placeholder="Dupont" value="${profilExistant.nom || ''}">
            <label for="onb-date-naissance">Date de naissance<span class="obligatoire">*</span></label>
            <input type="date" id="onb-date-naissance" value="${profilExistant.dateNaissance || ''}">
            <div class="onb-erreur" id="onb-erreur-0"></div>
          </div>

          <div class="onb-page" id="onb-page-1" data-page="1">
            <label for="onb-poids">Poids (kg) — optionnel</label>
            <input type="number" id="onb-poids" placeholder="70" value="${profilExistant.poids || ''}">
            <label for="onb-taille">Taille (cm) — optionnel</label>
            <input type="number" id="onb-taille" placeholder="175" value="${profilExistant.taille || ''}">
            <label for="onb-fcmax">FC max (bpm) — optionnel</label>
            <input type="number" id="onb-fcmax" placeholder="185" value="${profilExistant.fcMax && profilExistant.fcMax !== 181 ? profilExistant.fcMax : ''}">
            <label for="onb-fcrepos">FC repos (bpm) — optionnel</label>
            <input type="number" id="onb-fcrepos" placeholder="55" value="${profilExistant.fcRepos || ''}">
            <label>Sexe — optionnel, affine le calcul de charge</label>
            <div id="onb-sexes" class="sexe-opts"></div>
            <label>🩺 Pass Prévention Santé (PPS) — optionnel</label>
            <div id="onb-pps-zone"></div>
          </div>

          <div class="onb-page" id="onb-page-2" data-page="2">
            <label>Records personnels — optionnel, laisse vide si tu ne sais pas</label>
            <div id="onb-records" class="records-wrap"></div>
          </div>

          <div class="onb-page" id="onb-page-3" data-page="3">
            <label>Ton niveau<span class="obligatoire">*</span></label>
            <div id="onb-niveaux"></div>
            <div class="onb-erreur" id="onb-erreur-3"></div>
          </div>

          <div class="onb-nav">
            <button class="btn-secondaire" id="onb-precedent" style="display:none;">← Précédent</button>
            <button class="btn-principal" id="onb-suivant">Suivant</button>
            <button class="btn-principal" id="onb-valider" style="display:none;" disabled>Valider</button>
          </div>
        </div>
      </div>
      `;
    const niveauxHost = hote.querySelector('#onb-niveaux');
    const sexesHost = hote.querySelector('#onb-sexes');
    const recordsHost = hote.querySelector('#onb-records');
    const validerBtn = hote.querySelector('#onb-valider');
    const suivantBtn = hote.querySelector('#onb-suivant');
    const precedentBtn = hote.querySelector('#onb-precedent');
    const NB_PAGES = 4;
    let pageActuelle = 0;

    // ── Module PPS (02/08/2026, remplace l'ancien champ texte "PPS /
    // Licence FFA") — porte une version compacte de la modale PPS de
    // index.html (import, conversion PDF→image, aperçu, suppression),
    // dans ce module indépendant qui ne doit jamais dépendre du chargement
    // d'index.html (même contrainte que le reste de ce fichier — cf.
    // commentaire en tête sur creerColonneRouletteOnboarding). Optionnel :
    // ne bloque jamais la validation de l'onboarding, comme l'ancien champ
    // texte qu'il remplace. État tenu en closure (ppsDocumentState),
    // transmis à terminer() plus bas comme les autres champs.
    let ppsDocumentState = (profilExistant.ppsDocument && profilExistant.ppsDocument.data)
      ? profilExistant.ppsDocument
      : null;
    let _pdfJsModuleOnboarding = null;
    async function chargerPdfJsOnboarding() {
      if (_pdfJsModuleOnboarding) return _pdfJsModuleOnboarding;
      const mod = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs");
      mod.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";
      _pdfJsModuleOnboarding = mod;
      return _pdfJsModuleOnboarding;
    }
    // Conversion PDF → image (même logique que convertirPdfPpsEnImage
    // dans index.html, cf. son commentaire pour le détail du raisonnement :
    // le rendu PDF inline n'est pas fiable sur mobile/TWA, donc conversion
    // systématique en image dès l'import plutôt qu'un stockage du PDF brut).
    async function convertirPdfEnImageOnboarding(dataUrl) {
      const pdfjs = await chargerPdfJsOnboarding();
      const base64 = dataUrl.split(",")[1];
      const binaire = atob(base64);
      const octets = new Uint8Array(binaire.length);
      for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
      const doc = await pdfjs.getDocument({ data: octets }).promise;
      const page = await doc.getPage(1);
      const viewportBase = page.getViewport({ scale: 1 });
      const echelle = Math.min(2, 1600 / Math.max(viewportBase.width, viewportBase.height));
      const viewport = page.getViewport({ scale: echelle });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
      return canvas.toDataURL("image/jpeg", 0.85);
    }
    function rafraichirZonePps() {
      const zone = hote.querySelector('#onb-pps-zone');
      if (!zone) return;
      zone.innerHTML = '';
      if (ppsDocumentState?.data) {
        const img = document.createElement('img');
        img.className = 'pps-apercu';
        img.src = ppsDocumentState.data;
        zone.appendChild(img);
        const btnSupprimer = document.createElement('button');
        btnSupprimer.type = 'button';
        btnSupprimer.className = 'pps-btn-secondaire-petit';
        btnSupprimer.textContent = '🗑️ Supprimer';
        btnSupprimer.addEventListener('click', () => {
          ppsDocumentState = null;
          rafraichirZonePps();
        });
        zone.appendChild(btnSupprimer);
      } else {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*,application/pdf';
        fileInput.id = 'onb-pps-file-input';
        fileInput.style.fontSize = '0.85rem';
        zone.appendChild(fileInput);
        const statutEl = document.createElement('div');
        statutEl.className = 'pps-statut';
        zone.appendChild(statutEl);
        fileInput.addEventListener('change', async () => {
          const fichier = fileInput.files?.[0];
          if (!fichier) return;
          if (fichier.size > 15 * 1024 * 1024) {
            statutEl.textContent = 'Fichier trop volumineux (max 15 Mo).';
            return;
          }
          statutEl.textContent = '⏳ Import en cours...';
          try {
            if (fichier.type === 'application/pdf') {
              const dataUrlBrut = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Lecture du fichier échouée'));
                reader.readAsDataURL(fichier);
              });
              const imageJpeg = await convertirPdfEnImageOnboarding(dataUrlBrut);
              ppsDocumentState = { data: imageJpeg, type: 'image/jpeg', nomFichier: fichier.name };
            } else {
              const data = await new Promise((resolve, reject) => {
                const img = new Image();
                const readerUrl = URL.createObjectURL(fichier);
                img.onload = () => {
                  const maxDim = 1600;
                  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
                  const canvas = document.createElement('canvas');
                  canvas.width = Math.round(img.width * scale);
                  canvas.height = Math.round(img.height * scale);
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  URL.revokeObjectURL(readerUrl);
                  resolve(canvas.toDataURL('image/jpeg', 0.82));
                };
                img.onerror = () => { URL.revokeObjectURL(readerUrl); reject(new Error('Image illisible')); };
                img.src = readerUrl;
              });
              ppsDocumentState = { data, type: 'image/jpeg', nomFichier: fichier.name };
            }
            rafraichirZonePps();
          } catch (err) {
            console.error('Erreur import PPS onboarding:', err);
            statutEl.textContent = "Échec de l'import : " + (err.message || 'erreur inconnue');
          }
        });
      }
    }
    rafraichirZonePps();

    // Rendu des 4 lignes de record (5K/10K/Semi/Marathon) — roulette h/m/s
    // avec boutons +/- (31/07/2026, déployé depuis Réglages) + champ date
    // (01/08/2026, ajouté pour parité complète avec Réglages, cf.
    // discussion de conception : la date manquait, empêchant tout
    // départage de cohérence entre records — cf. verifierCoherenceRecord
    // dans v2/index.html, qui utilise cette date pour trancher). Champs
    // optionnels, ne touchent jamais à validerBtn.disabled (même principe
    // que sexe : seul niveauChoisi contrôle la validation). Construction
    // de la roulette différée (setTimeout 0) : le DOM de chaque ligne doit
    // être attaché (recordsHost.appendChild ci-dessous) avant que
    // initRouletteHMSOnboarding() puisse positionner le scroll initial —
    // même contrainte que la version Réglages (index.html).
    DISTANCES_RECORD.forEach((dist) => {
      const recExistant = (profilExistant.records && profilExistant.records[dist]) || null;
      const hms = parserTempsRecordEnHMSOnboarding(recExistant ? recExistant.temps : null);
      const row = document.createElement('div');
      row.className = 'record-row';
      row.id = `onb-rec-${dist}-row`;
      row.innerHTML =
        `<span class="dist-label">${dist}</span>` +
        `<div class="roulette-temps">` +
          `<div class="roulette-fenetre"></div>` +
          `<div class="roulette-mini-colonne">` +
            `<button type="button" class="roulette-btn-stepper" id="onb-rec-${dist}-plusH">+</button>` +
            `<div class="roulette-viewport"><div class="roulette-colonne" id="onb-rec-${dist}-rouletteH"></div></div>` +
            `<button type="button" class="roulette-btn-stepper" id="onb-rec-${dist}-moinsH">−</button>` +
          `</div>` +
          `<span class="roulette-sep">:</span>` +
          `<div class="roulette-mini-colonne">` +
            `<button type="button" class="roulette-btn-stepper" id="onb-rec-${dist}-plusM">+</button>` +
            `<div class="roulette-viewport"><div class="roulette-colonne" id="onb-rec-${dist}-rouletteM"></div></div>` +
            `<button type="button" class="roulette-btn-stepper" id="onb-rec-${dist}-moinsM">−</button>` +
          `</div>` +
          `<span class="roulette-sep">:</span>` +
          `<div class="roulette-mini-colonne">` +
            `<button type="button" class="roulette-btn-stepper" id="onb-rec-${dist}-plusS">+</button>` +
            `<div class="roulette-viewport"><div class="roulette-colonne" id="onb-rec-${dist}-rouletteS"></div></div>` +
            `<button type="button" class="roulette-btn-stepper" id="onb-rec-${dist}-moinsS">−</button>` +
          `</div>` +
        `</div>` +
        `<input type="hidden" id="onb-rec-${dist}-h" value="${hms.h ?? ''}">` +
        `<input type="hidden" id="onb-rec-${dist}-m" value="${hms.m ?? ''}">` +
        `<input type="hidden" id="onb-rec-${dist}-s" value="${hms.s ?? ''}">` +
        `<button type="button" class="btn-effacer-record" id="onb-rec-${dist}-effacer" title="Effacer ce record">✕</button>` +
        `<input type="date" class="rec-date" id="onb-rec-${dist}-date" value="${recExistant?.date || ''}">`;
      recordsHost.appendChild(row);
      setTimeout(() => initRouletteHMSOnboarding(dist, hms.h ?? 0, hms.m ?? 0, hms.s ?? 0), 0);

      // Bouton "Effacer" (31/07/2026, demande de Laurent) — même principe
      // que Réglages (index.html), cf. son commentaire pour le détail
      // complet : sans ce bouton, remettre la roulette à 0:00 aurait été
      // interprété comme un vrai temps saisi (bloqué à tort par le
      // garde-fou record du monde).
      const btnEffacer = row.querySelector(`#onb-rec-${dist}-effacer`);
      btnEffacer.addEventListener('click', () => {
        const rouletteRef = roulettesActivesOnboarding[dist];
        if (rouletteRef) {
          rouletteRef.h?.definirValeur(0, false);
          rouletteRef.m?.definirValeur(0, false);
          rouletteRef.s?.definirValeur(0, false);
        }
        row.querySelector(`#onb-rec-${dist}-h`).value = '0';
        row.querySelector(`#onb-rec-${dist}-m`).value = '0';
        row.querySelector(`#onb-rec-${dist}-s`).value = '0';
        row.dataset.recordEfface = 'true';
      });
    });
    const recordsNote = document.createElement('p');
    recordsNote.className = 'records-note';
    recordsNote.textContent = "Une seule distance suffit pour démarrer — le moteur estime les autres. Le garde-fou record du monde s'applique à la validation finale.";
    recordsHost.parentNode.insertBefore(recordsNote, recordsHost.nextSibling);

    // Rendu des options sexe — champ optionnel, ne touche JAMAIS à
    // validerBtn.disabled (seul niveauChoisi contrôle la validation, même
    // principe que la version classic).
    function rafraichirSexes() {
      sexesHost.innerHTML = '';
      SEXES.forEach((s) => {
        const opt = document.createElement('div');
        opt.className = 'sexe-opt' + (sexeChoisi === s.val ? ' actif' : '');
        opt.textContent = s.label;
        opt.addEventListener('click', () => {
          sexeChoisi = sexeChoisi === s.val ? null : s.val; // re-clic désélectionne, champ optionnel
          rafraichirSexes();
        });
        sexesHost.appendChild(opt);
      });
    }
    rafraichirSexes();

    // ── Navigation entre les 4 pages (01/08/2026) — même principe que
    // ECRANS_WIZARD/afficherEcranWizard/attacherSwipeEtapes dans
    // v2/index.html, porté ici indépendamment (même contrainte d'absence
    // de dépendance sur index.html/v2/index.html que le reste de ce
    // fichier). Chaque page peut définir sa propre validation avant de
    // laisser passer à la suivante — retourne un message d'erreur (string)
    // si bloqué, ou null si la page est valide.
    function validerPage0() {
      const prenom = hote.querySelector('#onb-prenom').value.trim();
      const dateNaissance = hote.querySelector('#onb-date-naissance').value;
      const inputPrenom = hote.querySelector('#onb-prenom');
      const inputDate = hote.querySelector('#onb-date-naissance');
      inputPrenom.classList.toggle('champ-manquant', !prenom);
      inputDate.classList.toggle('champ-manquant', !dateNaissance);
      if (!prenom && !dateNaissance) return 'Prénom et date de naissance obligatoires.';
      if (!prenom) return 'Prénom obligatoire.';
      if (!dateNaissance) return 'Date de naissance obligatoire.';
      return null;
    }
    function validerPage3() {
      if (!niveauChoisi) return 'Choisis ton niveau pour continuer.';
      return null;
    }
    const VALIDATEURS_PAGE = { 0: validerPage0, 3: validerPage3 };

    function afficherPage(index) {
      pageActuelle = index;
      for (let i = 0; i < NB_PAGES; i++) {
        hote.querySelector(`#onb-page-${i}`).classList.toggle('actif', i === index);
        const point = hote.querySelector(`.onb-point[data-page="${i}"]`);
        point.classList.toggle('actif', i === index);
        point.classList.toggle('franchi', i < index);
      }
      precedentBtn.style.display = index === 0 ? 'none' : 'block';
      suivantBtn.style.display = index === NB_PAGES - 1 ? 'none' : 'block';
      validerBtn.style.display = index === NB_PAGES - 1 ? 'block' : 'none';
      const erreurEl = hote.querySelector(`#onb-erreur-${index}`);
      if (erreurEl) erreurEl.textContent = '';
    }

    function allerPageSuivante() {
      const validateur = VALIDATEURS_PAGE[pageActuelle];
      if (validateur) {
        const erreur = validateur();
        if (erreur) {
          const erreurEl = hote.querySelector(`#onb-erreur-${pageActuelle}`);
          if (erreurEl) erreurEl.textContent = erreur;
          return;
        }
      }
      if (pageActuelle < NB_PAGES - 1) afficherPage(pageActuelle + 1);
    }
    function allerPagePrecedente() {
      if (pageActuelle > 0) afficherPage(pageActuelle - 1);
    }

    suivantBtn.addEventListener('click', allerPageSuivante);
    precedentBtn.addEventListener('click', allerPagePrecedente);

    // Swipe horizontal entre pages (01/08/2026, intégré dès cette version
    // — demande explicite de Laurent) — même pattern que attacherSwipeEtapes
    // dans v2/index.html (seuil 50px, distinction horizontal/vertical dès
    // 10px de mouvement pour ne jamais intercepter un scroll vertical de
    // page). Porté ici indépendamment, comme le reste de ce fichier.
    // Swipe gauche = page suivante (avec la même validation que le bouton
    // Suivant — ne saute jamais une page obligatoire non remplie), swipe
    // droite = page précédente (jamais bloqué, revenir en arrière est
    // toujours permis).
    function attacherSwipePages(conteneurSelector) {
      const conteneur = hote.querySelector(conteneurSelector);
      if (!conteneur) return;
      let swipeStartX = null, swipeStartY = null, swipeDecided = null;
      conteneur.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
        swipeDecided = null;
      }, { passive: true });
      conteneur.addEventListener('touchmove', (e) => {
        if (swipeStartX === null || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - swipeStartX;
        const dy = e.touches[0].clientY - swipeStartY;
        if (swipeDecided === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
          swipeDecided = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
        }
      }, { passive: true });
      conteneur.addEventListener('touchend', (e) => {
        if (swipeStartX === null || swipeDecided !== 'horizontal') { swipeStartX = null; return; }
        const dx = (e.changedTouches[0]?.clientX ?? swipeStartX) - swipeStartX;
        swipeStartX = null;
        if (Math.abs(dx) < 50) return;
        if (dx < 0) allerPageSuivante(); else allerPagePrecedente();
      }, { passive: true });
    }
    attacherSwipePages('#ecran-onboarding .carte');

    afficherPage(0);

    function rafraichirNiveaux() {
      niveauxHost.innerHTML = '';
      NIVEAUX.forEach(n => {
        const opt = document.createElement('div');
        opt.className = 'niveau-opt' + (niveauChoisi === n.val ? ' actif' : '');
        opt.innerHTML = `<div><div class="titre">${n.label}</div><div class="desc">${n.desc}</div></div>`;
        opt.addEventListener('click', () => {
          niveauChoisi = n.val;
          validerBtn.disabled = false;
          rafraichirNiveaux();
        });
        niveauxHost.appendChild(opt);
      });
    }
    rafraichirNiveaux();

    // Le choix du niveau est obligatoire (v2.9, 15/07/2026) — un profil
    // avec niveau:null redéclenchait cet écran à l'infini à chaque
    // connexion. Depuis le 01/08/2026, appliqué via validerPage3() (la
    // page niveau étant désormais la dernière) plutôt qu'un
    // validerBtn.disabled global — terminer() n'est appelée qu'après avoir
    // franchi cette validation, jamais avec niveauChoisi vide.
      function terminer() {
        // Garde-fou record du monde (31/07/2026, demande de Laurent) —
        // vérifié AVANT de masquer l'écran/résoudre la promesse, pour
        // laisser la personne corriger sans quitter l'onboarding. Un seul
        // message groupé si plusieurs distances sont concernées à la fois
        // (même logique que Réglages, cf. son commentaire).
        //
        // CORRECTIF (01/08/2026, bug signalé par Laurent : un record
        // saisi par scroll de roulette n'était pas enregistré) — cause :
        // les inputs cachés onb-rec-{dist}-h/-m/-s ne sont mis à jour que
        // via le callback onSelect de la roulette, lui-même déclenché sur
        // l'événement 'scroll' avec un debounce de 120ms (cf.
        // creerColonneRouletteOnboarding). Cliquer sur CE bouton Valider
        // global juste après avoir arrêté de faire défiler la DERNIÈRE
        // colonne touchée pouvait donc lire un input encore non
        // synchronisé. Lit désormais directement colApi.valeur() de
        // chaque roulette active (valeur en mémoire, jamais sujette au
        // debounce) plutôt que hInp.value/mInp.value/sInp.value —
        // élimine le risque de timing, peu importe la rapidité entre le
        // dernier geste de scroll et ce clic. Repli sur les inputs cachés
        // si une roulette n'a jamais été instanciée (cas normalement
        // impossible en pratique, chaque ligne étant construite au
        // rendu de l'écran, mais gardé par prudence plutôt que de
        // supposer roulettesActivesOnboarding[dist] toujours défini).
        let recordIrrealisteDetecte = null;
        const tempsParDistance = {};
        DISTANCES_RECORD.forEach((dist) => {
          const row = hote.querySelector(`#onb-rec-${dist}-row`);
          const estEfface = row?.dataset.recordEfface === 'true';
          if (estEfface) {
            tempsParDistance[dist] = null;
            return;
          }
          const rouletteRef = roulettesActivesOnboarding[dist];
          const hInp = hote.querySelector(`#onb-rec-${dist}-h`);
          const mInp = hote.querySelector(`#onb-rec-${dist}-m`);
          const sInp = hote.querySelector(`#onb-rec-${dist}-s`);
          const hVal = rouletteRef?.h ? rouletteRef.h.valeur() : hInp.value;
          const mVal = rouletteRef?.m ? rouletteRef.m.valeur() : mInp.value;
          const sVal = rouletteRef?.s ? rouletteRef.s.valeur() : sInp.value;
          const tempsFormate = formaterHMSEnTempsRecordOnboarding(hVal, mVal, sVal);
          tempsParDistance[dist] = tempsFormate;
          if (tempsFormate) {
            const secondesSaisies = parserTempsEnSecondesOnboarding(tempsFormate);
            const recordMonde = RECORDS_MONDE_SECONDES_ONBOARDING[dist];
            if (recordMonde && secondesSaisies > 0 && secondesSaisies < recordMonde) {
              recordIrrealisteDetecte = recordIrrealisteDetecte
                ? `${recordIrrealisteDetecte}, ${dist}`
                : dist;
            }
          }
        });
        if (recordIrrealisteDetecte) {
          alert(`Temps plus rapide que le record du monde actuel sur : ${recordIrrealisteDetecte} — corrige avant de continuer.`);
          return; // ne ferme pas l'écran, laisse corriger
        }

        hote.querySelector('#ecran-onboarding').style.display = 'none';
        const prenom = hote.querySelector('#onb-prenom').value.trim();
        const nom = hote.querySelector('#onb-nom').value.trim();
        const dateNaissance = hote.querySelector('#onb-date-naissance').value || profilExistant.dateNaissance || null;
        const poids = parseInt(hote.querySelector('#onb-poids').value) || profilExistant.poids || null;
        const taille = parseInt(hote.querySelector('#onb-taille').value) || profilExistant.taille || null;
        const fcmax = parseInt(hote.querySelector('#onb-fcmax').value) || profilExistant.fcMax || 181;
        const fcrepos = parseInt(hote.querySelector('#onb-fcrepos').value) || profilExistant.fcRepos || null;
        const records = { ...(profilExistant.records || {}) };
        DISTANCES_RECORD.forEach((dist) => {
          const rowDist = hote.querySelector(`#onb-rec-${dist}-row`);
          const estEfface = rowDist?.dataset.recordEfface === 'true';
          const tempsFormate = tempsParDistance[dist];
          const dateInp = hote.querySelector(`#onb-rec-${dist}-date`);
          if (tempsFormate) {
            records[dist] = { temps: tempsFormate, date: dateInp?.value || null };
          } else if (estEfface || !(profilExistant.records && profilExistant.records[dist])) {
            // estEfface : effacement explicite, doit toujours écraser un
            // éventuel record préexistant (31/07/2026, bug corrigé en même
            // temps que l'ajout du bouton Effacer — sans ce cas, effacer un
            // record déjà présent dans profilExistant n'avait aucun effet,
            // le spread initial de records le préservait silencieusement).
            records[dist] = null;
          }
        });
        resolve({
          prenom,
          nom,
          dateNaissance,
          poids,
          taille,
          fcMax: fcmax,
          fcRepos: fcrepos,
          sexe: sexeChoisi,
          niveau: niveauChoisi,
          records,
          ppsDocument: ppsDocumentState,
        });
      }

      validerBtn.addEventListener('click', () => {
        const erreur = validerPage3();
        if (erreur) {
          const erreurEl = hote.querySelector('#onb-erreur-3');
          if (erreurEl) erreurEl.textContent = erreur;
          return;
        }
        terminer();
      });
  });
}

// ------------------------------------------------------------
// Récupère l'utilisateur actuellement connecté (ou null), sans
// afficher l'écran d'auth — utile pour des vérifications ponctuelles.
// ------------------------------------------------------------
export async function utilisateurActuel() {
  await supabaseReady;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
