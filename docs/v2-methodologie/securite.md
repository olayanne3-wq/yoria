# Sécurité — Yoria

> Audit et durcissement sécurité : ce qui est traité, ce qui reste à
> faire. Renvoie vers `inventaire-application.md` pour la vue d'ensemble
> et les principes transverses (dont les règles de sécurité générales,
> déjà listées là-bas — ce fichier ne couvre que l'état détaillé du
> chantier, pas les principes).

## Traité

- **CORS** restreint sur les routes Strava (`*` → `https://yoria.run`),
  cf. `saisie-et-integrations.md`.
- **Rate limiting** sur `beta-admin` (connexion) et `beta` (soumission),
  5 tentatives/15min par IP — détail dans `site-beta-admin.md`.
- **Signature webhook Stripe** vérifiée en temps constant (comparaison
  XOR octet par octet, jamais `===` direct), cf.
  `saisie-et-integrations.md`.
- **Retrait du fragment de code OAuth Strava des logs** (présence
  loggée via `!!code`, jamais la valeur).
- **RLS vérifiée table par table** sur toutes les tables sensibles
  connues (`plans_actif`, `plan_donnees`, `abonnements`, `beta_testers`,
  `decision_events`, `decision_outcomes`, `badges_debloques`) — toutes
  correctement protégées, détail dans `persistance-donnees.md`.
- **Headers de sécurité HTTP globaux** — HSTS (`max-age` 2 ans,
  `includeSubDomains`, `preload`), `X-Content-Type-Options: nosniff`, et
  une Content-Security-Policy bloquante, tous trois posés sur la route
  catch-all (`vercel.json`, `/(.*)`) donc actifs sur l'ensemble du site.
  CSP calibrée via une phase `Report-Only` préalable en conditions
  réelles (connexion, sync Strava, paiement test Stripe) : couvre
  Supabase (REST + WebSocket Realtime), Strava, Sentry (loader +
  `browser.sentry-cdn.com`, chargé dynamiquement et absent du code
  source — repéré uniquement grâce au report-only), Stripe (Checkout +
  frame), jsDelivr, cdnjs, esm.sh, Google Fonts. `'unsafe-inline'` et
  `'unsafe-eval'` nécessaires vu le volume de JS/CSS inline dans
  `index.html` (pas de refonte en nonce/hash envisagée). Import FIT
  (`cdn.jsdelivr.net/fit-file-parser`) couvert par construction dans
  `script-src` mais pas encore vérifié en conditions réelles contre la
  CSP bloquante — à valider à la prochaine occasion d'import `.fit`.

## Reste à faire

- **Validation d'intégrité du contenu `plan_donnees.data`** (JSONB non
  structuré) — RLS protège qui peut écrire la ligne, mais rien ne valide
  le contenu écrit par le client avant insertion. Risque faible (un
  utilisateur ne peut affecter que ses propres données), mais à garder
  en tête si une validation de schéma devient pertinente.
- **2FA sur `beta-admin`** — actuellement mot de passe seul (protégé par
  rate limiting). À évaluer si l'accès reste aussi sensible une fois la
  bêta élargie (suppression de comptes, données de tous les testeurs).

## Méthode de travail sur la CSP

Toute évolution de la Content-Security-Policy (`vercel.json`, route
catch-all `/(.*)`) doit d'abord passer par
`Content-Security-Policy-Report-Only` (même valeur, header différent)
avant de devenir bloquante — permet de découvrir en conditions réelles
(connexion, sync Strava, paiement, import FIT) tous les domaines externes
réellement chargés dynamiquement sans jamais casser la prod pendant la
découverte.
