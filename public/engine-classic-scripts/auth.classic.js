// ============================================================
// Yoria — Module d'authentification Supabase (copie classic)
// DÉRIVÉ DE public/v2/engine/auth.js — pas une source de vérité.
// À régénérer manuellement à chaque modification de auth.js
// (mêmes conventions que plan-generator.classic.js / v1-bridge.classic.js /
// gist-sync.classic.js / weather.classic.js — cf. inventaire §3).
//
// Différence avec la version module : pas d'import ES pour le SDK
// Supabase (chargé en amont via <script src="...supabase-js@2"></script>
// classique, qui expose window.supabase.createClient) ; pas d'export,
// tout est attaché à window.LkAuth.
// ============================================================

(function () {
  // Clés récupérées depuis /api/config (route serverless Vercel), plutôt
  // qu'en dur ici — ajouté le 13 juillet 2026. `supabase` (variable locale
  // à cette IIFE) n'est disponible qu'après résolution de supabaseReady ;
  // toute fonction interne l'utilisant doit d'abord `await supabaseReady`.
  let supabase;
  const supabaseReady = fetch('/api/config')
    .then(function (r) { return r.json(); })
    .then(function (cfg) {
      supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      return supabase;
    });

  async function monterEcranAuth(conteneurId) {
    await supabaseReady;
    conteneurId = conteneurId || 'ecran-auth-hote';
    const hote = document.getElementById(conteneurId);
    if (!hote) throw new Error('monterEcranAuth: conteneur #' + conteneurId + ' introuvable');

    hote.innerHTML =
      '<style>' +
      '#ecran-auth { position: fixed; inset: 0; z-index: 9999; background: var(--bg); color: var(--text); display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; }' +
      '#ecran-auth .carte { width: 100%; max-width: 360px; }' +
      '#ecran-auth .bandeau { text-align: center; margin-bottom: 28px; }' +
      '#ecran-auth .bandeau svg { margin-bottom: 12px; }' +
      '#ecran-auth .bandeau h1 { font-size: 1.3rem; margin: 0; font-weight: 700; }' +
      '#ecran-auth .bandeau .sous-titre { color: var(--accent); font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 4px; }' +
      '#ecran-auth .onglets { display: flex; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-bottom: 20px; }' +
      '#ecran-auth .onglet { flex: 1; padding: 10px; text-align: center; background: var(--bg); color: var(--text); cursor: pointer; font-size: 0.85rem; border: none; transition: background 0.15s; }' +
      '#ecran-auth .onglet.actif { background: var(--accent); color: var(--bg); font-weight: 600; }' +
      '#ecran-auth label { display: block; font-size: 0.8rem; margin-bottom: 4px; color: var(--text-muted); }' +
      '#ecran-auth input { width: 100%; padding: 11px 12px; margin-bottom: 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text); font-size: 0.95rem; box-sizing: border-box; }' +
      '#ecran-auth input:focus { outline: none; border-color: var(--accent); }' +
      '#ecran-auth .btn-principal { width: 100%; padding: 12px; border-radius: 8px; border: none; background: var(--accent); color: var(--bg); font-weight: 700; font-size: 0.95rem; cursor: pointer; margin-top: 4px; }' +
      '#ecran-auth .btn-principal:disabled { opacity: 0.5; cursor: not-allowed; }' +
      '#ecran-auth .message { margin-top: 14px; font-size: 0.82rem; text-align: center; min-height: 1.2em; }' +
      '#ecran-auth .message.erreur { color: var(--warn); }' +
      '#ecran-auth .message.succes { color: var(--accent2); }' +
      '#ecran-auth .lien-secondaire { margin-top: 12px; font-size: 0.82rem; text-align: center; color: var(--text-muted); }' +
      '#ecran-auth .lien-secondaire:hover { color: var(--accent); }' +
      '</style>' +
      '<div id="ecran-auth">' +
      '<div class="carte">' +
      '<div class="bandeau"><svg width="72" height="72" viewBox="0 0 512 512"><defs><linearGradient id="g1" x1="100" y1="80" x2="260" y2="430" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1E4ED8"/><stop offset="1" stop-color="#2E8CF0"/></linearGradient><linearGradient id="g2" x1="420" y1="80" x2="250" y2="430" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#22C7B8"/><stop offset="1" stop-color="#75E4D8"/></linearGradient></defs><path d="M92 92 C184 104, 232 154, 256 230 C270 276, 264 342, 246 420" fill="none" stroke="url(#g1)" stroke-width="42" stroke-linecap="round"/><path d="M420 92 C328 104, 280 154, 256 230 C242 276, 248 342, 266 420" fill="none" stroke="url(#g2)" stroke-width="42" stroke-linecap="round"/></svg><h1>Yoria</h1><div class="sous-titre">Connexion</div></div>' +
      '<div class="onglets">' +
      '<button type="button" class="onglet actif" data-mode="connexion">Se connecter</button>' +
      '<button type="button" class="onglet" data-mode="inscription">Créer un compte</button>' +
      '</div>' +
      '<form id="form-auth">' +
      '<label for="auth-email">Email</label>' +
      '<input type="email" id="auth-email" autocomplete="email" required>' +
      '<label for="auth-password">Mot de passe</label>' +
      '<input type="password" id="auth-password" autocomplete="current-password" required minlength="6">' +
      '<button type="submit" class="btn-principal" id="auth-submit">Se connecter</button>' +
      '<div class="message" id="auth-message"></div>' +
      '</form>' +
      '<div class="lien-secondaire" id="lien-mdp-oublie" style="cursor:pointer; text-decoration:underline;">Mot de passe oublié ?</div>' +
      '<div class="lien-secondaire" id="lien-suppr-compte" style="cursor:pointer; text-decoration:underline; color:var(--warn);">Supprimer mon compte</div>' +
      '</div>' +
      '</div>';

    return new Promise(function (resolve) {
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

      onglets.forEach(function (btn) {
        btn.addEventListener('click', function () {
          mode = btn.dataset.mode;
          onglets.forEach(function (b) { b.classList.toggle('actif', b === btn); });
          submitBtn.textContent = mode === 'connexion' ? 'Se connecter' : 'Créer mon compte';
          passwordInput.autocomplete = mode === 'connexion' ? 'current-password' : 'new-password';
          lienMdpOublie.style.display = mode === 'connexion' ? 'block' : 'none';
          lienSupprCompte.style.display = mode === 'connexion' ? 'block' : 'none';
          messageEl.textContent = '';
        });
      });

      function afficherMessage(texte, type) {
        messageEl.textContent = texte;
        messageEl.className = 'message ' + type;
      }

      lienMdpOublie.addEventListener('click', async function () {
        const email = emailInput.value.trim();
        if (!email) {
          afficherMessage('Entre ton email ci-dessus, puis clique à nouveau sur ce lien.', 'erreur');
          return;
        }
        lienMdpOublie.style.pointerEvents = 'none';
        afficherMessage('Envoi en cours…', 'succes');
        try {
          const res = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
          });
          if (res.error) throw res.error;
          afficherMessage('Email envoyé — vérifie ta boîte mail (et les spams) pour le lien de réinitialisation.', 'succes');
        } catch (err) {
          afficherMessage('Erreur : ' + err.message, 'erreur');
        } finally {
          lienMdpOublie.style.pointerEvents = 'auto';
        }
      });

      lienSupprCompte.addEventListener('click', async function () {
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
          const connexionRes = await supabase.auth.signInWithPassword({ email: email, password: password });
          if (connexionRes.error) throw connexionRes.error;

          const res = await fetch('/api/delete-account', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + connexionRes.data.session.access_token }
          });
          const resultat = await res.json();
          if (!res.ok) throw new Error(resultat.error || 'Échec de la suppression.');

          await supabase.auth.signOut();
          localStorage.clear();
          afficherMessage('Compte supprimé. Rechargement…', 'succes');
          setTimeout(function () { window.location.reload(); }, 1200);
        } catch (err) {
          afficherMessage('Erreur : ' + err.message, 'erreur');
          lienSupprCompte.style.pointerEvents = 'auto';
        }
      });

      function debloquer(user) {
        if (dejaResolu) return;
        dejaResolu = true;
        ecranAuth.style.display = 'none';
        resolve(user);
      }

      let modeRecovery = false;

      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (modeRecovery) return;
        submitBtn.disabled = true;
        messageEl.textContent = '';
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        try {
          if (mode === 'connexion') {
            const res = await supabase.auth.signInWithPassword({ email: email, password: password });
            if (res.error) throw res.error;
            debloquer(res.data.user);
          } else {
            const res = await supabase.auth.signUp({ email: email, password: password });
            if (res.error) throw res.error;
            if (res.data.session) {
              debloquer(res.data.user);
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

      const estRetourRecovery = window.location.hash.indexOf('type=recovery') !== -1;
      if (!estRetourRecovery) {
        supabase.auth.getUser().then(function (res) {
          if (res.data.user) debloquer(res.data.user);
        });
      }

      supabase.auth.onAuthStateChange(function (event, session) {
        if (event !== 'PASSWORD_RECOVERY') return;
        modeRecovery = true;
        form.innerHTML =
          '<label for="auth-nouveau-mdp">Choisis un nouveau mot de passe</label>' +
          '<input type="password" id="auth-nouveau-mdp" autocomplete="new-password" required minlength="6">' +
          '<button type="submit" class="btn-principal">Valider</button>';
        hote.querySelector('#ecran-auth .onglets').style.display = 'none';
        lienMdpOublie.style.display = 'none';
        lienSupprCompte.style.display = 'none';
        hote.querySelector('.sous-titre').textContent = 'Nouveau mot de passe';

        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          const nouveauMdp = hote.querySelector('#auth-nouveau-mdp').value;
          try {
            const res = await supabase.auth.updateUser({ password: nouveauMdp });
            if (res.error) throw res.error;
            debloquer(session.user);
          } catch (err) {
            afficherMessage('Erreur : ' + err.message, 'erreur');
          }
        }, { once: true });
      });
    });
  }

  // ------------------------------------------------------------
  // Écran d'onboarding profil — v2.8 (§17.7). Voir v2/engine/auth.js
  // pour les commentaires détaillés (source de vérité) — copie fidèle,
  // seule différence : pas d'export, function déclarée dans l'IIFE.
  // ------------------------------------------------------------
  function monterEcranOnboarding(conteneurId, profilExistant) {
    profilExistant = profilExistant || {};
    const hote = document.getElementById(conteneurId);
    if (!hote) throw new Error('monterEcranOnboarding: conteneur #' + conteneurId + ' introuvable');

    return new Promise(function (resolve) {
      const NIVEAUX = [
        { val: 'grand-debutant', label: "Je n'ai jamais couru", desc: "Je marche, ou je découvre — pas encore capable de courir en continu" },
        { val: 'debutant', label: 'Débutant', desc: "Moins de 6 mois de course régulière" },
        { val: 'intermediaire', label: 'Intermédiaire', desc: "Je cours depuis un moment, j'ai déjà couru un 10K" },
        { val: 'confirme', label: 'Confirmé', desc: "Plusieurs courses, je connais mes allures" },
      ];
      let niveauChoisi = profilExistant.niveau || null;

      hote.innerHTML = `
        <style>
        #ecran-onboarding {
          position: fixed; inset: 0; z-index: 9999;
          background: var(--bg); color: var(--text);
          display: flex; align-items: center; justify-content: center;
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
            <label>Ton niveau</label>
            <div id="onb-niveaux"></div>
            <button class="btn-principal" id="onb-valider" disabled>Valider</button>
            <button class="lien-secondaire" id="onb-passer">Passer pour l'instant</button>
          </div>
        </div>
      `;

      const niveauxHost = hote.querySelector('#onb-niveaux');
      const validerBtn = hote.querySelector('#onb-valider');

      function rafraichirNiveaux() {
        niveauxHost.innerHTML = '';
        NIVEAUX.forEach(function (n) {
          const opt = document.createElement('div');
          opt.className = 'niveau-opt' + (niveauChoisi === n.val ? ' actif' : '');
          opt.innerHTML = '<div><div class="titre">' + n.label + '</div><div class="desc">' + n.desc + '</div></div>';
          opt.addEventListener('click', function () {
            niveauChoisi = n.val;
            validerBtn.disabled = false;
            rafraichirNiveaux();
          });
          niveauxHost.appendChild(opt);
        });
      }
      rafraichirNiveaux();
      if (niveauChoisi) validerBtn.disabled = false;

      function terminer(avecNiveau) {
        hote.querySelector('#ecran-onboarding').style.display = 'none';
        const annee = parseInt(hote.querySelector('#onb-annee').value) || profilExistant.anneeNaissance || null;
        const fcmax = parseInt(hote.querySelector('#onb-fcmax').value) || profilExistant.fcMax || 181;
        resolve({
          anneeNaissance: annee,
          fcMax: fcmax,
          niveau: avecNiveau ? niveauChoisi : (profilExistant.niveau || null)
        });
      }

      validerBtn.addEventListener('click', function () { terminer(true); });
      hote.querySelector('#onb-passer').addEventListener('click', function () { terminer(false); });
    });
  }

  async function deconnecter() {
    await supabaseReady;
    const res = await supabase.auth.signOut();
    if (res.error) throw res.error;
  }

  async function utilisateurActuel() {
    await supabaseReady;
    const res = await supabase.auth.getUser();
    return res.data.user;
  }

  window.LkAuth = {
    // Getter plutôt que valeur figée : `supabase` (variable locale) vaut
    // undefined tant que supabaseReady n'est pas résolue — un accès direct
    // à window.LkAuth.supabase avant résolution doit refléter cet état
    // réel, pas une capture figée au moment de cette assignation.
    get supabase() { return supabase; },
    supabaseReady: supabaseReady,
    monterEcranAuth: monterEcranAuth,
    monterEcranOnboarding: monterEcranOnboarding,
    deconnecter: deconnecter,
    utilisateurActuel: utilisateurActuel
  };
})();
