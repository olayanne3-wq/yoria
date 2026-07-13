// ============================================================
// Run by Léa — Module d'authentification Supabase
// Source de vérité : public/v2/engine/auth.js
// Copie non-module dérivée : public/engine-classic-scripts/auth.classic.js
// (mêmes conventions que plan-generator.js / v1-bridge.js / gist-sync.js /
// weather.js — cf. inventaire §3. À régénérer manuellement à chaque modif,
// comme les autres modules du moteur.)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = "https://oppwuzbcnhchtokxpzla.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcHd1emJjbmhjaHRva3hwemxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4OTA0OTMsImV4cCI6MjA5OTQ2NjQ5M30.0TWjUiPO3QbxVmhpGiQ4HPsQSgSq1yUUa9fR-XW5pvk";
// Clé "anon", publique par conception — la sécurité vient de RLS côté
// base, pas du secret de cette clé. La clé service_role, elle, ne doit
// JAMAIS apparaître dans du code exécuté côté client.

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ------------------------------------------------------------
// Construit et monte l'écran de connexion/inscription dans le
// conteneur DOM fourni. Résout la promesse retournée avec
// l'utilisateur connecté dès qu'une session est active (existante
// au chargement, ou obtenue via le formulaire).
// ------------------------------------------------------------
export function monterEcranAuth(conteneurId = 'ecran-auth-hote') {
  const hote = document.getElementById(conteneurId);
  if (!hote) throw new Error(`monterEcranAuth: conteneur #${conteneurId} introuvable`);

  hote.innerHTML = `
    <style>
    #ecran-auth {
      position: fixed; inset: 0; z-index: 9999;
      background: #0f1117; color: #f1f5f9;
      display: flex; align-items: center; justify-content: center;
      padding: 20px; box-sizing: border-box;
    }
    #ecran-auth .carte { width: 100%; max-width: 360px; }
    #ecran-auth .bandeau { text-align: center; margin-bottom: 28px; }
    #ecran-auth .bandeau h1 { font-size: 1.3rem; margin: 0; font-weight: 700; }
    #ecran-auth .bandeau .sous-titre {
      color: #f97316; font-size: 0.75rem; letter-spacing: 0.08em;
      text-transform: uppercase; margin-top: 4px;
    }
    #ecran-auth .onglets {
      display: flex; border: 1px solid #2e3347; border-radius: 10px;
      overflow: hidden; margin-bottom: 20px;
    }
    #ecran-auth .onglet {
      flex: 1; padding: 10px; text-align: center; background: #1a1d27;
      color: #f1f5f9; cursor: pointer; font-size: 0.85rem; border: none;
      transition: background 0.15s;
    }
    #ecran-auth .onglet.actif { background: #f97316; color: #0f1117; font-weight: 600; }
    #ecran-auth label { display: block; font-size: 0.8rem; margin-bottom: 4px; color: #9ca3af; }
    #ecran-auth input {
      width: 100%; padding: 11px 12px; margin-bottom: 14px; border-radius: 8px;
      border: 1px solid #2e3347; background: #1a1d27; color: #f1f5f9;
      font-size: 0.95rem; box-sizing: border-box;
    }
    #ecran-auth input:focus { outline: none; border-color: #f97316; }
    #ecran-auth .btn-principal {
      width: 100%; padding: 12px; border-radius: 8px; border: none;
      background: #f97316; color: #0f1117; font-weight: 700;
      font-size: 0.95rem; cursor: pointer; margin-top: 4px;
    }
    #ecran-auth .btn-principal:disabled { opacity: 0.5; cursor: not-allowed; }
    #ecran-auth .message { margin-top: 14px; font-size: 0.82rem; text-align: center; min-height: 1.2em; }
    #ecran-auth .message.erreur { color: #f87171; }
    #ecran-auth .message.succes { color: #22c55e; }
    </style>
    <div id="ecran-auth">
      <div class="carte">
        <div class="bandeau">
          <h1>Run by Léa</h1>
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

    let mode = 'connexion';
    let dejaResolu = false;

    onglets.forEach(btn => {
      btn.addEventListener('click', () => {
        mode = btn.dataset.mode;
        onglets.forEach(b => b.classList.toggle('actif', b === btn));
        submitBtn.textContent = mode === 'connexion' ? 'Se connecter' : 'Créer mon compte';
        passwordInput.autocomplete = mode === 'connexion' ? 'current-password' : 'new-password';
        messageEl.textContent = '';
      });
    });

    function afficherMessage(texte, type) {
      messageEl.textContent = texte;
      messageEl.className = `message ${type}`;
    }

    function debloquer(user) {
      if (dejaResolu) return; // évite une double résolution (ex: getUser() + submit concurrents)
      dejaResolu = true;
      ecranAuth.style.display = 'none';
      resolve(user);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
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
    // saute directement l'écran, sans attendre d'action.
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) debloquer(user);
    });
  });
}

// ------------------------------------------------------------
// Déconnexion — utilisable depuis renderSettings() par exemple.
// ------------------------------------------------------------
export async function deconnecter() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ------------------------------------------------------------
// Récupère l'utilisateur actuellement connecté (ou null), sans
// afficher l'écran d'auth — utile pour des vérifications ponctuelles.
// ------------------------------------------------------------
export async function utilisateurActuel() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
