# Notes météo dynamiques — Run by Léa v2.0

Document de référence méthodologique pour le mécanisme de notes météo, implémenté dans `public/v2/engine/weather.js` et `api/weather.js`. Tranché et implémenté le 6 juillet 2026 — section 2.2 du document [`convergence-v1-v2.md`](./convergence-v1-v2.md).

---

## 1. Principe

Seul mécanisme des 6 chantiers de contenu qui a une vraie **dépendance externe** (API météo) et qui ne peut pas être injecté une fois pour toutes à la génération du plan — une prévision météo n'a de sens que proche de la date réelle de la séance (impossible de connaître la météo à J+60 au moment de générer le plan). Nécessite donc un **second passage temporel**, appelé séparément (idéalement la veille de chaque séance), contrairement aux 5 autres mécanismes (jalons, notes pratiques, repères qualitatifs, cohérence semaine test, jour de course) qui s'exécutent tous une seule fois pendant `generatePlan()`.

**Origine** : v1 avait une note météo statique et générique ("Chaleur > 28°C → allure ralentie"), pas une vraie vérification dynamique contre une prévision réelle.

## 2. Choix de l'API météo

**[Open-Meteo](https://open-meteo.com/)**, retenu pour l'absence totale de friction : pas de clé API, pas d'inscription, endpoint HTTP GET simple, réponse JSON. Volume gratuit large (10 000 appels/jour en usage non commercial) — largement suffisant pour l'usage prévu ici (un appel par utilisateur actif la veille de sa séance).

**Limite explicitement actée** : la gratuité d'Open-Meteo est conditionnée à un usage non commercial. Choix assumé de migrer plus tard vers un fournisseur payant (ex. OpenWeatherMap) si besoin, une fois la v2.5 (commercialisation) engagée — plutôt que de sur-anticiper maintenant un fournisseur payant pour un besoin qui n'existe pas encore.

## 3. Architecture en deux couches

### `api/weather.js` (endpoint serverless)

Proxy simple vers Open-Meteo. Reçoit `lat`/`lon`/`date` en paramètres, renvoie la température maximale prévue pour ce jour et un flag `alerteChaleur` (seuil fixe de **28°C**, repris directement de v1). Utilise la fenêtre de prévision à J+7 d'Open-Meteo (`forecast_days: 7`) — au-delà, la prévision n'est plus fiable.

### `public/v2/engine/weather.js` (module client)

Module pur (pas de dépendance DOM directe, storage injectable — cohérent avec `strava.js`/`gist-sync.js`) :
- `recupererPrevisionMeteo()` — appelle l'endpoint, cache le résultat par date dans le storage fourni pour éviter des appels répétés le même jour
- `enrichirSeanceAvecMeteo()` — ajoute la note de chaleur au contenu si la prévision dépasse le seuil
- `verifierMeteoPourSeance()` — point d'entrée principal : récupère la géolocalisation du navigateur, enchaîne les deux fonctions précédentes

## 4. Branchement dans l'interface — le seul mécanisme avec un vrai déclenchement UI

Contrairement aux 5 autres mécanismes de contenu (purement internes au moteur), celui-ci a une contrepartie UI explicite : `verifierMeteoSeanceDemain(plan)` dans `index-v2-preview.html`/`preview/index.html`, appelée à la fin de `renderResults()` (donc à chaque affichage d'un plan). Reconstruit la date de chaque séance à partir de `dateDebut` + `semaineNum` + `jourIndex` (le plan n'a pas de dates explicites par jour, seulement une date de départ globale), détecte si une séance tombe **demain**, et déclenche la vérification météo pour celle-ci uniquement.

## 5. Bugs et incidents réels rencontrés en déploiement (5 incidents)

Ce mécanisme a eu, de loin, le parcours de déploiement le plus mouvementé des 6 — utile de documenter la chronologie complète pour éviter de refaire les mêmes erreurs.

### Incident 1 — 404 sur `/api/weather` (oubli de routing)

`api/weather.js` avait été créé sans ajouter sa règle de routing correspondante dans `vercel.json`, contrairement à `api/coach.js` et `api/strava.js` qui ont chacune la leur. La règle générique catch-all (`/(.*)` → `/public/$1`) traitait donc `/api/weather` comme une route statique inexistante, d'où le 404. Erreur du même type que celle rencontrée en tout début de session sur `plan-generator.js` — déjà notée dans les learnings ("404 sur API presque toujours dû à `vercel.json`, pas à un fichier manquant"), pas appliquée avant de committer la première fois. Diagnostiqué précisément grâce à des logs console ajoutés par Laurent lui-même dans `weather.js`/`index.html` (`GET /api/weather ... 404`, confirmé par une erreur de parsing JSON côté client qui recevait la page HTML 404 de Vercel au lieu du JSON attendu).

### Incident 2 — Géolocalisation bloquée par une politique Windows

Sur le PC personnel de Laurent, la géolocalisation Chrome renvoyait "votre organisation ne l'autorise pas" — signe d'une politique de groupe ou d'un profil de gestion d'appareil actif, indépendant des droits administrateur locaux. Contourné en testant depuis un appareil sans cette restriction (mobile) plutôt qu'en essayant de désactiver la politique système — hors du périmètre de ce qui peut se corriger côté application.

### Incident 3 — Timeout de géolocalisation trop court

Une fois la géolocalisation débloquée, un timeout de 5s (valeur initiale) s'est avéré systématiquement insuffisant en pratique — un GPS qui doit se fixer (intérieur, signal faible) dépasse facilement ce délai. Corrigé à 15s, avec `maximumAge: 10 * 60 * 1000` (accepte une position en cache de moins de 10 minutes, pas besoin d'un fix GPS instantané pour une prévision météo à l'échelle d'une ville) et `enableHighAccuracy: false` (la précision fine GPS est plus lente que la position approximative réseau/wifi, largement suffisante ici).

### Incident 4 — Décalage de fuseau horaire dans le calcul de "demain"

`verifierMeteoSeanceDemain()` calculait "demain" en mélangeant un `Date` en fuseau **local** (`new Date()` puis `toISOString()`) avec un calcul de date de séance en **UTC pur** (`dateSeance` construite depuis `dateDebut`). Selon l'heure et le fuseau de l'utilisateur, `new Date().toISOString()` peut pointer sur un jour différent de ce que l'utilisateur perçoit comme "demain" en heure locale — créant un décalage qui empêchait tout match avec la date de séance réelle. Symptôme observé par Laurent : aucune requête vers `/api/weather` n'apparaissait du tout, même avec un plan démarrant aujourd'hui et la géolocalisation acceptée.

Corrigé en calculant "demain" en UTC pur également (`Date.UTC` avec les composants année/mois/jour de la date locale +1), cohérent avec le calcul de `dateSeance`.

### Incident 5 — Formulation "aujourd'hui" au lieu de "demain"

La note de chaleur disait initialement *"Chaleur annoncée **aujourd'hui**"*, alors que le mécanisme se déclenche systématiquement la veille de la séance concernée (jamais le jour même) — incohérence de formulation repérée en voyant la note en contexte réel une fois le mécanisme fonctionnel. Corrigée en "Chaleur annoncée **pour demain**".

## 6. Piste non traitée : logs de debug laissés dans le code

Au moment de la rédaction de ce document, `weather.js` contient encore **8 `console.log`** de diagnostic, ajoutés pendant la session pour investiguer les incidents 1 à 4 ci-dessus (traçage de chaque étape : cache, appel réseau, réponse, géolocalisation obtenue/échouée). Le message du commit `cc03fc4` (incident 4) le dit explicitement : *"à retirer une fois confirmé"* — jamais fait. À retirer ou passer derrière un flag de debug explicite dans une prochaine session, pour ne pas polluer la console en usage normal.

## 7. Fichiers concernés

- `api/weather.js` — endpoint serverless (proxy Open-Meteo)
- `public/v2/engine/weather.js` — module client (avec les logs de debug non nettoyés, cf. section 6)
- `public/v2/engine/test-weather.mjs` — tests de non-régression pour les parties testables hors navigateur (enrichissement, cache, gestion d'erreur réseau) — `verifierMeteoPourSeance()` dépend de `navigator.geolocation`, non testable en Node, vérifié manuellement en conditions réelles
- `vercel.json` — route `/api/weather` (cf. incident 1)
- `public/preview/index.html` (et son ancêtre `index-v2-preview.html`, déplacé) — `verifierMeteoSeanceDemain()`, le déclenchement UI

## 8. Statut

**Implémenté et validé en conditions réelles** (commits `725008b`, `e56cf16`, `cc03fc4`, `3527041` pour la chronologie complète incluant les 5 incidents ci-dessus). Fait partie des 6 chantiers de contenu du document de convergence, tous complétés le même jour — le seul des 6 à avoir nécessité un vrai débogage en production après le déploiement initial, tous les autres ayant été validés en amont par les tests unitaires seuls.
