# Site bêta et administration — Yoria

> Site public de candidature bêta, administration bêta, modules
> partagés `lib/` (email d'invitation, rate limiting). Renvoie vers
> `inventaire-application.md` pour la vue d'ensemble et les principes
> transverses.

## Site beta et administration bêta

**Site public (`public/beta/`)** — one-page à ancres (`#accueil`,
`#difference`, `#fonctionnalites`, `#inscription`) : les liens de nav
défilent vers une section de la même page, jamais de vraie navigation
multi-pages. Nav simplifiée à 2 liens (le 3e, doublon avec le bouton CTA
"Rejoindre la bêta", retiré). Screenshots compressés (redimensionnés à
l'échelle d'affichage réelle, ~740px large plutôt que la résolution
native du téléphone) et un le contenant une donnée personnelle (prénom
dans un message de coach) flouté avant publication. Meta Open Graph/
Twitter Card avec image dédiée composée (1200×630, pas un simple
screenshot étiré). Encart contextuel affiché uniquement si "iPhone" est
sélectionné dans le formulaire, expliquant l'installation via Safari
avant même l'envoi.

**Auto-validation des candidatures** (`api/beta.js`) — les 20 premières
candidatures avec statut `invited`/`active` (comptées tous
statuts confondus, main ou automatique) passent automatiquement en
`invited` à la soumission, avec email d'invitation envoyé immédiatement
(best-effort, un échec d'envoi ne bloque jamais l'inscription déjà
enregistrée). Au-delà du seuil, repli sur le circuit `pending` classique
(validation manuelle depuis `beta-admin`). Répartition du lien
d'installation dans l'email selon la plateforme : URL Play Store directe
pour Android (installation native fiable même depuis la WebView d'une
app tierce comme Gmail — cf. principe dans `inventaire-application.md`), URL web + instructions
Safari détaillées pour iPhone (aucun équivalent Play Store côté Apple).

**Page de remerciement dédiée** (`public/beta/merci.html` +
`merci.js`) — remplace l'ancien message texte discret en bas du
formulaire. Contenu déterminé par deux paramètres URL transmis à la
redirection (`?statut=invited|pending&plateforme=android|iphone`), lus
côté client. Repli sûr strict : seul `statut=invited` explicite affiche
le bloc "bienvenue + instructions d'installation" — tout le reste
(paramètre absent, `pending`, valeur inattendue) reste sur le bloc "en
attente", pour ne jamais annoncer par erreur un accès qui n'est pas
réellement actif.

**Suppression de candidature/compte depuis `beta-admin`** — bouton
"🗑️ Supprimer définitivement" dans la modale de détail d'une candidature :
supprime la ligne `beta_testers`, puis tente silencieusement de
supprimer un compte Yoria associé à la même adresse email s'il en existe
un (cas le plus fréquent : aucun, la candidature de test ne va jamais
jusqu'à l'onboarding complet — pas traité comme une erreur). Bouton
séparé "🗑️ Supprimer ce compte" dans les résultats du module Comptes,
pour le cas d'un compte créé sans jamais avoir candidaté à la bêta
(recherche par email, indépendante de `beta_testers`). Les deux
réutilisent la même fonction de nettoyage complet (cf. `persistance-donnees.md`, extension au-
delà de `decision_events` seul).

**Modules partagés (`lib/`, cf. `architecture-generale.md`)** :
- `beta-invitation-email.js` — génération HTML de l'email d'invitation
  (blocs Android/iOS conditionnels) + envoi Brevo. Un seul point de
  génération, utilisé par `api/beta.js` (auto-validation) et
  `api/beta-admin.js` (invitation manuelle) — jamais deux implémentations
  susceptibles de diverger.
- `rate-limit.js` — logique générique de comptage de tentatives par IP
  sur une table Supabase dédiée (fenêtre glissante, seuil configurables
  par appelant). Utilisé par `api/beta-admin.js` (connexion admin, table
  `tentatives_connexion_admin`, 5 tentatives/15min, réinitialisé après
  connexion réussie) et `api/beta.js` (soumission de candidature, table
  `tentatives_soumission_beta`, 5/15min, jamais réinitialisé — le but
  est de limiter le nombre de soumissions par IP, réussies ou non).
  Repli sûr systématique : toute erreur de lecture/écriture Supabase
  autorise la tentative par défaut plutôt que de bloquer un accès
  légitime.

