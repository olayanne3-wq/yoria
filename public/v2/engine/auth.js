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
    // du moteur), saisie h/min/sec séparée — logique dupliquée ici (pas
    // d'accès à window.creerChampsTempsHMS d'index.html, chargé après ce
    // module) plutôt que factorisée, pour ne pas introduire une dépendance
    // d'ordre de chargement entre les deux fichiers.
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
        display: flex; align-items: center; gap: 6px; padding: 7px 0; flex-wrap: wrap;
      }
      #ecran-onboarding .record-row + .record-row { border-top: 1px solid var(--border); }
      #ecran-onboarding .record-row .dist-label { width: 56px; flex-shrink: 0; font-size: 0.85rem; color: var(--text-muted); }
      #ecran-onboarding .record-row input[type=number] {
        width: 42px; padding: 5px 4px; margin-bottom: 0; text-align: center;
        font-variant-numeric: tabular-nums; flex-shrink: 0;
      }
      #ecran-onboarding .record-row .unite { font-size: 0.7rem; color: var(--text-muted); flex-shrink: 0; }
      #ecran-onboarding .records-note { font-size: 0.75rem; color: var(--text-muted); margin: 8px 0 0; }
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

    // Rendu des 4 lignes de record (5K/10K/Semi/Marathon), 3 champs h/min/sec
    // chacune — champ optionnel, ne touche jamais à validerBtn.disabled
    // (même principe que sexe : seul niveauChoisi contrôle la validation).
    DISTANCES_RECORD.forEach((dist) => {
      const recExistant = (profilExistant.records && profilExistant.records[dist]) || null;
      const hms = parserTempsRecordEnHMSOnboarding(recExistant ? recExistant.temps : null);
      const row = document.createElement('div');
      row.className = 'record-row';
      row.innerHTML =
        `<span class="dist-label">${dist}</span>` +
        `<input type="number" id="onb-rec-${dist}-h" min="0" max="23" placeholder="0" value="${hms.h ?? ''}">` +
        `<span class="unite">h</span>` +
        `<input type="number" id="onb-rec-${dist}-m" min="0" max="59" placeholder="00" value="${hms.m ?? ''}">` +
        `<span class="unite">min</span>` +
        `<input type="number" id="onb-rec-${dist}-s" min="0" max="59" placeholder="00" value="${hms.s ?? ''}">` +
        `<span class="unite">s</span>`;
      recordsHost.appendChild(row);
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
        hote.querySelector('#ecran-onboarding').style.display = 'none';
        const annee = parseInt(hote.querySelector('#onb-annee').value) || profilExistant.anneeNaissance || null;
        const fcmax = parseInt(hote.querySelector('#onb-fcmax').value) || profilExistant.fcMax || 181;
        const fcrepos = parseInt(hote.querySelector('#onb-fcrepos').value) || profilExistant.fcRepos || null;
        const records = { ...(profilExistant.records || {}) };
        DISTANCES_RECORD.forEach((dist) => {
          const hInp = hote.querySelector(`#onb-rec-${dist}-h`);
          const mInp = hote.querySelector(`#onb-rec-${dist}-m`);
          const sInp = hote.querySelector(`#onb-rec-${dist}-s`);
          const tempsFormate = formaterHMSEnTempsRecordOnboarding(hInp.value, mInp.value, sInp.value);
          if (tempsFormate) {
            const dateExistante = (records[dist] && records[dist].date) || null;
            records[dist] = { temps: tempsFormate, date: dateExistante };
          } else if (!(profilExistant.records && profilExistant.records[dist])) {
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
