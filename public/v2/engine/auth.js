// ============================================================
// Yoria — Module d'authentification Supabase
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
    #ecran-auth .bandeau h1 { font-size: 1.3rem; margin: 0; font-weight: 700; }
    #ecran-auth .bandeau .sous-titre {
      color: var(--accent); font-size: 0.75rem; letter-spacing: 0.08em;
      text-transform: uppercase; margin-top: 4px;
    }
    #ecran-auth .onglets {
      display: flex; border: 1px solid var(--text)22; border-radius: 10px;
      overflow: hidden; margin-bottom: 20px;
    }
    #ecran-auth .onglet {
      flex: 1; padding: 10px; text-align: center; background: var(--bg);
      color: var(--text); cursor: pointer; font-size: 0.85rem; border: none;
      transition: background 0.15s;
    }
    #ecran-auth .onglet.actif { background: var(--accent); color: var(--bg); font-weight: 600; }
    #ecran-auth label { display: block; font-size: 0.8rem; margin-bottom: 4px; color: var(--text)99; }
    #ecran-auth input {
      width: 100%; padding: 11px 12px; margin-bottom: 14px; border-radius: 8px;
      border: 1px solid var(--text)22; background: var(--bg); color: var(--text);
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
    #ecran-auth .lien-secondaire { margin-top: 12px; font-size: 0.82rem; text-align: center; color: var(--text)99; }
    #ecran-auth .lien-secondaire:hover { color: var(--accent); }
    </style>
    <div id="ecran-auth">
      <div class="carte">
        <div class="bandeau">
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

    let mode = 'connexion';
    let dejaResolu = false;

    onglets.forEach(btn => {
      btn.addEventListener('click', () => {
        mode = btn.dataset.mode;
        onglets.forEach(b => b.classList.toggle('actif', b === btn));
        submitBtn.textContent = mode === 'connexion' ? 'Se connecter' : 'Créer mon compte';
        passwordInput.autocomplete = mode === 'connexion' ? 'current-password' : 'new-password';
        lienMdpOublie.style.display = mode === 'connexion' ? 'block' : 'none';
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

    function debloquer(user) {
      if (dejaResolu) return; // évite une double résolution (ex: getUser() + submit concurrents)
      dejaResolu = true;
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
// ------------------------------------------------------------
export async function deconnecter() {
  await supabaseReady;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
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
