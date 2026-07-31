// ============================================================
// Yoria — Module d'authentification Supabase
// Fix 19/07/2026 : #ecran-onboarding démarrait scrollé au milieu du
// contenu (align-items: center sur un contenu plus haut que l'écran,
// selon navigateur) plutôt qu'en haut — Laurent voyait "FC max" en
// premier au lieu de "Année de naissance". Passé à align-items:
// flex-start pour garantir un affichage démarrant toujours en haut.
// Source de vérité : public/v2/engine/auth.js
// Copie non-module dérivée : public/engine-classic-scripts/auth.classic.js
// (mêmes conventions que plan-generator.js / v1-bridge.js / gist-sync.js /
// weather.js — cf. inventaire §3. À régénérer manuellement à chaque modif,
// comme les autres modules du moteur.)
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
// forme. Collecte les données qui ne sont plus jamais demandées dans
// le wizard (année de naissance, FC max, niveau — cf. NIVEAU_MAP dans
// v2/index.html) puisqu'elles vivent désormais uniquement dans le
// profil coureur (Réglages), pas dans les paramètres d'un plan précis.
//
// Ne touche PAS directement à localStorage/Supabase : l'appelant
// (index.html / v2/index.html) est responsable de fusionner le retour
// dans profilCoureur et d'appeler sauvegarderProfilCoureur() — cf.
// pattern déjà utilisé par monterEcranAuth (resolve(user), pas de
// persistance interne au module).
//
// profilExistant : objet profilCoureur actuel (peut être partiellement
// rempli si migré depuis l'ancien format, cf. migrerVersProfilCoureur).
// Résout avec { anneeNaissance, fcMax, niveau } — à fusionner par
// l'appelant, pas un profil complet (poids/taille/records restent
// gérés ailleurs dans Réglages, pas dans cet onboarding minimal).
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
    // calcul direct de scrollTop (jamais scrollIntoView, peu fiable sur un
    // conteneur display:none — l'écran onboarding lui-même est affiché en
    // position:fixed dès sa construction ici, mais le principe reste geré
    // par sécurité, le composant étant recopié tel quel pour cohérence
    // entre les 3 portages). Hauteurs identiques à la version Réglages
    // (picker 120px/item 36px/pad 42px) — cohérence visuelle entre les
    // deux écrans qui partagent le même thème (var(--bg)/var(--text)...).
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
      // CORRECTIF (31/07/2026) — même bug/cause que public/v2/index.html et
      // Réglages (cf. leurs en-têtes pour le détail complet) : rootMargin
      // restreint la zone d'intersection à la fenêtre de sélection (36px
      // centrés) au lieu de tout le conteneur (120px).
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
      api.definirValeur(valeurInitiale, false);
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
    // (31/07/2026) — nécessaire pour le bouton "Effacer" (cf. plus bas),
    // même principe que Réglages (index.html).
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
      #ecran-onboarding .bandeau { text-align: center; margin-bottom: 24px; }
      #ecran-onboarding .bandeau h1 { font-size: 1.25rem; margin: 0 0 6px; font-weight: 700; }
      #ecran-onboarding .bandeau .sous-titre { color: var(--text-muted); font-size: 0.85rem; }
      #ecran-onboarding label { display: block; font-size: 0.8rem; margin-bottom: 4px; color: var(--text-muted); }
      #ecran-onboarding input {
        width: 100%; padding: 11px 12px; margin-bottom: 16px; border-radius: 8px;
        border: 1px solid var(--border); background: var(--bg); color: var(--text);
        font-size: 0.95rem; box-sizing: border-box;
      }
      #ecran-onboarding input:focus { outline: none; border-color: var(--accent); }
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
        display: flex; align-items: center; gap: 8px; padding: 10px 0; flex-wrap: nowrap;
      }
      #ecran-onboarding .record-row + .record-row { border-top: 1px solid var(--border); }
      #ecran-onboarding .record-row .dist-label { width: 56px; flex-shrink: 0; font-size: 0.85rem; color: var(--text-muted); }
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
      #ecran-onboarding .lien-secondaire {
        margin-top: 12px; font-size: 0.82rem; text-align: center; color: var(--text-muted);
        cursor: pointer; background: none; border: none; width: 100%;
      }
      #ecran-onboarding .lien-secondaire:hover { color: var(--accent); }
      /* ── Roulette de saisie de temps (31/07/2026) — mêmes dimensions que
         Réglages (index.html), portée séparément ici (cf. commentaire sur
         creerColonneRouletteOnboarding plus haut). ──────────────────────── */
      #ecran-onboarding .roulette-temps{
        display:flex; align-items:center; justify-content:center; gap:2px;
        background:var(--border-soft, rgba(0,0,0,0.04)); border:1px solid var(--border);
        border-radius:12px; padding:0 6px; position:relative; height:120px;
        flex-shrink:0; width:130px;
      }
      #ecran-onboarding .roulette-fenetre{
        position:absolute; left:6px; right:6px; top:50%; transform:translateY(-50%);
        height:36px; border-top:1px solid var(--border); border-bottom:1px solid var(--border);
        background:var(--bg); border-radius:8px; pointer-events:none;
      }
      #ecran-onboarding .roulette-colonne{
        flex:1; max-width:40px; height:100%; overflow-y:scroll;
        scroll-snap-type:y mandatory; scrollbar-width:none; -ms-overflow-style:none;
        font-variant-numeric:tabular-nums;
      }
      #ecran-onboarding .roulette-colonne::-webkit-scrollbar{ display:none; }
      #ecran-onboarding .roulette-colonne .roulette-pad{ height:42px; scroll-snap-align:none; }
      #ecran-onboarding .roulette-item{
        height:36px; display:flex; align-items:center; justify-content:center;
        font-size:18px; font-weight:600; line-height:1; color:var(--text-muted);
        scroll-snap-align:center; transition:color 0.15s, font-size 0.15s;
        position:relative; z-index:1;
      }
      #ecran-onboarding .roulette-item.actif{ color:var(--text); font-size:22px; line-height:1; }
      #ecran-onboarding .roulette-sep{ font-size:18px; color:var(--text-muted); align-self:center; }
      </style>
      <div id="ecran-onboarding">
        <div class="carte">
          <div class="bandeau">
            <h1>Ton profil</h1>
            <div class="sous-titre">Ces infos servent à personnaliser tes plans — modifiables plus tard dans Réglages</div>
          </div>
          <label for="onb-annee">Année de naissance</label>
          <input type="number" id="onb-annee" placeholder="1985" min="1920" max="2020" value="${profilExistant.anneeNaissance || ''}">
          <label for="onb-fcmax">FC max (bpm)</label>
          <input type="number" id="onb-fcmax" placeholder="185" value="${profilExistant.fcMax && profilExistant.fcMax !== 181 ? profilExistant.fcMax : ''}">
          <label for="onb-fcrepos">FC repos (bpm) — optionnel</label>
          <input type="number" id="onb-fcrepos" placeholder="55" value="${profilExistant.fcRepos || ''}">
          <label>Sexe — optionnel, affine le calcul de charge</label>
          <div id="onb-sexes" class="sexe-opts"></div>
          <label>Records personnels — optionnel, laisse vide si tu ne sais pas</label>
          <div id="onb-records" class="records-wrap"></div>
          <label>Ton niveau</label>
            <div id="onb-niveaux"></div>
            <button class="btn-principal" id="onb-valider" disabled>Valider</button>
          </div>
        </div>
      `;
    const niveauxHost = hote.querySelector('#onb-niveaux');
    const sexesHost = hote.querySelector('#onb-sexes');
    const recordsHost = hote.querySelector('#onb-records');
    const validerBtn = hote.querySelector('#onb-valider');

    // Rendu des 4 lignes de record (5K/10K/Semi/Marathon) — roulette h/m/s
    // (31/07/2026) au lieu de 3 <input type="number"> — champ optionnel, ne
    // touche jamais à validerBtn.disabled (même principe que sexe : seul
    // niveauChoisi contrôle la validation). Construction de la roulette
    // différée (setTimeout 0) : le DOM de chaque ligne doit être attaché
    // (recordsHost.appendChild ci-dessous) avant que
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
          `<div class="roulette-colonne" id="onb-rec-${dist}-rouletteH"></div>` +
          `<span class="roulette-sep">:</span>` +
          `<div class="roulette-colonne" id="onb-rec-${dist}-rouletteM"></div>` +
          `<span class="roulette-sep">:</span>` +
          `<div class="roulette-colonne" id="onb-rec-${dist}-rouletteS"></div>` +
        `</div>` +
        `<input type="hidden" id="onb-rec-${dist}-h" value="${hms.h ?? ''}">` +
        `<input type="hidden" id="onb-rec-${dist}-m" value="${hms.m ?? ''}">` +
        `<input type="hidden" id="onb-rec-${dist}-s" value="${hms.s ?? ''}">` +
        `<button type="button" class="btn-effacer-record" id="onb-rec-${dist}-effacer" title="Effacer ce record">✕</button>`;
      recordsHost.appendChild(row);
      setTimeout(() => initRouletteHMSOnboarding(dist, hms.h ?? 0, hms.m ?? 0, hms.s ?? 0), 0);

      // Bouton "Effacer" (31/07/2026, demande de Laurent) — même principe
      // que Réglages (index.html), cf. son commentaire pour le détail
      // complet : sans ce bouton, remettre la roulette à 0:00 aurait été
      // interprété comme un vrai temps saisi (bloqué à tort par le
      // garde-fou record du monde). Attaché après row.innerHTML plutôt que
      // via un attribut onclick inline — innerHTML ne permet pas
      // d'attacher un vrai handler JS directement dans la chaîne HTML.
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
    recordsNote.textContent = "Une seule distance suffit pour démarrer — le moteur estime les autres.";
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
    if (niveauChoisi) validerBtn.disabled = false;

    // Le choix du niveau est obligatoire (v2.9, 15/07/2026) — un profil
      // avec niveau:null redéclenchait cet écran à l'infini à chaque
      // connexion, le bouton "Passer pour l'instant" permettait justement
      // d'arriver à cet état. Retiré : le bouton Valider reste désactivé
      // tant qu'aucune option de niveau n'est cliquée (cf.
      // rafraichirNiveaux plus haut), donc terminer() n'est plus jamais
      // appelée sans un niveauChoisi valide.
      function terminer() {
        // Garde-fou record du monde (31/07/2026, demande de Laurent) —
        // vérifié AVANT de masquer l'écran/résoudre la promesse, pour
        // laisser la personne corriger sans quitter l'onboarding. Un seul
        // message groupé si plusieurs distances sont concernées à la fois
        // (même logique que Réglages, cf. son commentaire).
        let recordIrrealisteDetecte = null;
        const tempsParDistance = {};
        DISTANCES_RECORD.forEach((dist) => {
          const row = hote.querySelector(`#onb-rec-${dist}-row`);
          const estEfface = row?.dataset.recordEfface === 'true';
          if (estEfface) {
            tempsParDistance[dist] = null;
            return;
          }
          const hInp = hote.querySelector(`#onb-rec-${dist}-h`);
          const mInp = hote.querySelector(`#onb-rec-${dist}-m`);
          const sInp = hote.querySelector(`#onb-rec-${dist}-s`);
          const tempsFormate = formaterHMSEnTempsRecordOnboarding(hInp.value, mInp.value, sInp.value);
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
        const annee = parseInt(hote.querySelector('#onb-annee').value) || profilExistant.anneeNaissance || null;
        const fcmax = parseInt(hote.querySelector('#onb-fcmax').value) || profilExistant.fcMax || 181;
        const fcrepos = parseInt(hote.querySelector('#onb-fcrepos').value) || profilExistant.fcRepos || null;
        const records = { ...(profilExistant.records || {}) };
        DISTANCES_RECORD.forEach((dist) => {
          const rowDist = hote.querySelector(`#onb-rec-${dist}-row`);
          const estEfface = rowDist?.dataset.recordEfface === 'true';
          const tempsFormate = tempsParDistance[dist];
          if (tempsFormate) {
            const dateExistante = (records[dist] && records[dist].date) || null;
            records[dist] = { temps: tempsFormate, date: dateExistante };
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
          anneeNaissance: annee,
          fcMax: fcmax,
          fcRepos: fcrepos,
          sexe: sexeChoisi,
          niveau: niveauChoisi,
          records
        });
      }

      validerBtn.addEventListener('click', terminer);
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
