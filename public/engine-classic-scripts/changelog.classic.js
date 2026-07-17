/**
 * changelog.classic.js
 * Historique des versions affiché dans Paramètres (Yoria)
 *
 * Extrait de index.html le 13 juillet 2026 (était un tableau const VERSIONS
 * en dur au milieu de renderSettings()) — séparé pour alléger index.html
 * (~250 lignes de contenu texte pur, sans rapport avec la logique de
 * rendu environnante) et pour éditer une entrée de changelog sans risquer
 * de casser du JS ailleurs dans ce même fichier massif.
 *
 * Script classique (pas de module ES) — même pattern que les autres
 * engine-classic-scripts/*.classic.js : charge et attache VERSIONS
 * directement en portée globale. Doit être chargé AVANT le script
 * principal d'index.html (qui lit VERSIONS dans renderSettings()).
 *
 * Format de chaque entrée :
 *   { ver: "vX.Y", title: "Résumé court", current: bool, notes: ["..."] }
 * Un seul élément current:true à la fois (la version affichée en tête,
 * mise en avant visuellement) — mettre à jour l'ancienne entrée current
 * en false au moment d'ajouter une nouvelle version.
 */

const VERSIONS = [
      { ver:"v2.11", title:"Module 2 du moteur (analyse de séance) & garde-fous anti-régénération", current:true, notes:[
        "🧠 Nouveau module du moteur de décision : chaque séance de qualité (VMA/Seuil/Spec/Test) réalisée est comparée à ce qui était prévu (allure, FC, répétitions dans la cible), visible dans un bloc de test dédié en bas de Stats",
        "🎯 Catalogue de règles du moteur étoffé : ACWR élevé, tendance de fatigue en hausse sur plusieurs jours, séances planifiées ratées coup sur coup — le moteur se déclenche désormais sur des situations qu'il ne détectait pas avant",
        "🛡️ Garde-fou important : aucune régénération ou adaptation de plan ne peut plus modifier rétroactivement une séance déjà passée, quel que soit le mécanisme déclencheur",
        "🐛 Le calcul de charge d'entraînement sur les séances en durée (type 30-30) est corrigé — il ignorait silencieusement ce format et faussait l'analyse de volume",
      ]},
      { ver:"v2.10", title:"Moteur de décision — unification ACWR, coach connecté, garde-fous", current:false, notes:[
        "🧠 Le coach IA du dashboard lit maintenant l'état réel du moteur de décision (fatigue, risque, dernière proposition) au lieu d'un calcul de charge séparé — le message ne peut plus contredire la carte de proposition affichée au même moment",
        "📊 Le graphique de charge d'entraînement (ACWR) utilise désormais le même calcul que le moteur de décision — plus de risque d'affichage incohérent entre le graphique et une proposition d'ajustement",
        "🛡️ Deux garde-fous ajoutés au moteur : une réduction de charge individuelle ne peut jamais dépasser -30%, et le cumul de réductions sur 14 jours glissants est plafonné à 25% — le moteur refuse d'appliquer une décision qui dépasserait ces limites",
        "⚕️ Nouveaux champs de profil (Réglages et onboarding) : FC repos et sexe, tous deux optionnels — affinent le calcul de charge d'entraînement sans jamais bloquer la création d'un compte",
        "🐛 Le message du coach ne reste plus figé sur la séance du matin après avoir validé sa séance du jour plus tard dans la journée",
      ]},
      { ver:"v2.9", title:"Navigation du wizard, sécurité des comptes & Strava réparé", current:false, notes:[
        "🧭 Navigation par flèches en haut du wizard (course et Mode Forme), à la place du bouton \"Continuer\" en bas",
        "🎯 Prochain palier marche-course affiché en permanence sur le dashboard, avec bouton pour passer au palier suivant dès qu'il est débloqué",
        "🏃 Paliers marche-course revus en durée de course continue (5 à 30 min), validation manuelle par le coureur",
        "⛔ Impossible de valider une séance dont la date n'est pas encore arrivée, tous modes confondus",
        "🔐 Correctif de sécurité important : déconnexion nettoyant désormais toutes les données locales, pour éviter qu'un compte n'hérite des plans d'un précédent utilisateur sur le même appareil",
        "🗓️ Écran \"Aucun plan en cours\" clair quand un compte n'a plus de plan, plutôt qu'un plan de démonstration trompeur",
        "🐛 Dates de séances corrigées — un plan pouvait démarrer n'importe quel jour de la semaine sans que les dates affichées suivent correctement",
        "🐛 Connexion Strava réparée sur le wizard (bouton, validation du retour, et sauvegarde du plan qui en dépendait) — cassée depuis un moment suite à un fichier manquant",
        "🐛 Un grand débutant n'est plus redirigé vers le mauvais parcours de création de plan (accent VMA/Endurance/Polyvalent, non pertinent pour ce profil)",
      ]},
      { ver:"v2.8", title:"Grand débutant, plans multiples & fiabilité Supabase", current:false, notes:[
        "🚶 Nouveau niveau \"Je n'ai jamais couru\" : séances marche-course progressives, rattachées au Mode Forme",
        "👤 Niveau et profil déplacés dans Réglages — plus jamais redemandés à chaque nouveau plan",
        "✨ Écran d'accueil du wizard : consulter un plan existant ou en créer un nouveau, clairement séparés",
        "🎉 Progression de palier marche-course avec validation manuelle, puis transition vers un plan débutant classique",
        "🏷️ Nom automatique des plans Mode Forme (avec dates), toujours synchronisé — plus de renommage manuel pour ce type",
        "🔐 Option de suppression de compte, depuis l'écran de connexion",
        "🐛 Sauvegarde des plans reposant désormais sur Supabase plutôt que sur un token GitHub — la création de plan ne dépendait plus de rien de fonctionnel après la suppression volontaire du token",
        "🐛 Garde-fou anti-chevauchement (un seul plan actif à la fois) réactivé, silencieusement contourné depuis le passage à Supabase",
        "🐛 Adaptation dynamique (bannière de séances ratées) réparée — cassée depuis un moment sans jamais se déclencher",
        "🐛 Synchro Strava corrigée après le changement de domaine lié au rebranding",
      ]},
      { ver:"v2.7", title:"Yoria — nouvelle identité et thème clair/sombre", current:false, notes:[
        "🎨 Nouveau nom et nouvelle identité visuelle : Yoria devient Yoria",
        "☀️🌙 Choix du thème clair ou sombre, dans Paramètres",
        "🏷️ Badges de séance recolorés par intensité (VMA/Test/Course, Seuil/Allure course, EF/Longue)",
        "🐛 Correctifs d'affichage et de navigation liés au changement de thème",
      ]},
      { ver:"v2.6", title:"Mode Forme, clôture de plan & fiabilité du coach", current:false, notes:[
        "💓 Mode Forme : plan d'entraînement sans date de course, pour le maintien en forme (fartlek, pyramidale, variations d'allure)",
        "🔒 Clôture définitive d'un plan Forme, pour pouvoir planifier un objectif course à sa suite en toute sécurité",
        "🚦 Un seul plan actif à la fois (course ou forme) — garde-fou anti-chevauchement généralisé aux deux types",
        "🤖 Coach ne confond plus son propre prénom avec le tien, et n'invente plus d'heure de séance (matin/soir)",
        "🌡️ Météo du coach basée sur ta position réelle (dernière activité Strava GPS), plus une position fixe",
        "🐛 Corrections de fiabilité sur le message quotidien du coach (absent certains jours, variables manquantes)",
      ]},
      { ver:"v2.5", title:"Authentification Supabase, multi-appareils & synchro temps réel", current:false, notes:[
        "🔐 Connexion par compte (email + mot de passe), préparation Play Store",
        "☁️ Données synchronisées sur Supabase en plus du Gist (statuts, notes, profil, plans)",
        "⚡ Synchronisation temps réel entre appareils sur les séances/notes",
        "🧹 Retirée : sauvegarde cloud manuelle et QR code (remplacées par la synchro auto au login)",
        "🐛 Corrections de fiabilité (chargement du plan, dates d'intégration Strava)",
        "📱 Setup Play Store",
      ]},
      { ver:"v2.3", title:"Profil coureur global & personnalisation par niveau", current:false, notes:[
        "👤 Profil coureur mémorisé une fois pour toutes (records par distance, plus besoin de les ressaisir)",
        "🎯 Progression des séances qualité adaptée à ton niveau (débutant/intermédiaire/confirmé)",
        "🔒 Modification d'objectif préserve désormais les séances déjà réalisées",
        "🐛 Corrections de fiabilité diverses",
      ]},
      { ver:"v2.2", title:"Progression VMA, synchro unifiée & stratégie de course", current:false, notes:[
        "📈 Progression douce des séances VMA (plus de saut brutal de volume)",
        "🔗 Synchronisation entre appareils unifiée, un seul lien pour tout",
        "🧹 Nettoyage technique du système de sauvegarde historique",
        "🏁 Stratégie de course recalculée pour correspondre exactement à ton objectif",
        "🤖 Conseil de Léa sur la course désormais généré, pas figé",
        "🐛 Nombreuses corrections de fiabilité (statuts, coach, mise à jour de l'app)",
      ]},
      { ver:"v2.1", title:"Adaptation dynamique & fiabilité des données", current:false, notes:[
        "🔄 Adaptation automatique du plan après des séances difficiles (avec ta confirmation)",
        "⚖️ Référence de temps pondérée progressivement dans le temps, plus juste",
        "✅ Calcul de réussite, allures et cadence des fractionnés basés sur la vraie structure programmée",
        "🎨 Wizard harmonisé visuellement avec l'app (couleurs, police, logo)",
        "🐛 Nombreuses corrections de fiabilité sur le suivi Strava",
      ]},
      { ver:"v2.0", title:"Moteur générique multi-distances", current:false, notes:[
        "🎯 Nouveau moteur : plans générés pour 5K/10K/Semi/Marathon (plus seulement 10K)",
        "📱 Sélecteur de plan multi-appareils (synchronisation par QR code)",
        "🏁 Wizard de configuration dédié, séparé de l'app principale",
        "🌡️ Notes météo dynamiques pour la séance de demain",
        "📋 Structure d'intervalles affichée pour programmer fidèlement ta montre",
        "📊 Comparatif entre la structure prévue et tes vraies séances Strava",
      ]},
      { ver:"v1.9.3", title:"Banniere post-course, PDF & gestion seances", current:false, notes:["🏅 Banniere post-course","📄 Export PDF (3 types)","🔀 Deplacement de seance (appui long)","🗑️ Suppression et restauration (appui long)"]},
      { ver:"v1.9.2", title:"Dashboard condense & Course enrichie", current:false, notes:[
        "🎨 Dashboard condensé — Coach intégré dans la carte séance",
        "📊 Objectif + Estimation fusionnés, fourchette compacte",
        "🌡️ Météo historique sur les séances validées",
        "🔁 Détail séance repliable après le Coach",
        "📋 Onglet Course enrichi — résumé préparation + conseil Léa",
        "📐 Champ PPS élargi",
      ]},
      { ver:"v1.9.1", title:"Bilan de phase & améliorations", current:false, notes:[
        "🏁 Bilan de phase cliquable dans le dashboard",
        "📉 Courbes FC intervalles par type de séance dans Stats",
        "🔁 Dérive FC affichée sur les répétitions",
        "💬 Raison du verdict sur chaque répétition",
        "🎨 Dashboard réorganisé (objectif+estimation fusionnés, météo intégrée)",
        "🎯 Date de la dernière séance à la ligne dans le prédicteur",
        "🗣️ Coach moins coupé (max_tokens augmenté)",
        "📊 Projection masquée avant 21 jours avec date de disponibilité",
        "📐 Alignement parfait des champs dans Paramètres",
      ]},
      { ver:"v1.9", title:"Refactoring & robustesse", current:false, notes:[
        "🔧 Fusion du code dupliqué (répétitions, cartes, calcul km)",
        "🗑️ Suppression du code mort",
        "🛡️ Gestion d\'erreurs réseau renforcée (Coach, météo, Gist)",
        "❓ Guide d\'utilisation dans l\'onglet Course",
        "✅ Séances terminées mieux identifiées (opacité + badge, repliables)",
        "🎯 Allure/FC affichées sur l\'effort seul (hors échauffement) pour les séances intensives",
        "🤖 Coach mentionne l\'IE et la cadence après une séance intensive",
        "💾 Correction sauvegarde horaires course et URL parcours",
        "❓ Page Aide accessible via bouton dans le header (guide complet + FAQ)",
      ]},
      { ver:"v1.8.16", title:"Nouveau design & Inter", current:false, notes:[
        "🔤 Police Inter",
        "🃏 Bordure top colorée + ombres par type de séance",
        "🔄 Transition douce entre onglets",
        "📐 Labels en majuscules + chiffres tabulaires",
        "📊 Barres de progression avec gradient",
      ]},
      { ver:"v1.8.15", title:"Yoria & courbes IE", current:false, notes:[
        "🏷️ Renommage en Yoria",
        "🎨 Nouvelle icône runner",
        "📊 Courbes IE + Cadence dans Stats",
        "⚙️ Paramètres simplifiés",
      ]},
      { ver:"v1.8.14", title:"Économie, cadence & repos", current:false, notes:[
        "💾 Sauvegarde Gist étendue",
        "🛋️ Carte Repos enrichie avec bilan semaine",
        "🦶 Cadence + IE par répétition",
      ]},
      { ver:"v1.8.13", title:"Coach lundi, progression & course", current:false, notes:[
        "📅 Message Coach spécial lundi matin (bilan + aperçu semaine)",
        "🎯 Prédiction de progression dans Stats",
        "🌡️ Météo prévue le 6 septembre dans l\'onglet Course",
        "🏃 Allures de passage aux km clés (1, 3, 5, 7, 10)",
      ]},
      { ver:"v1.8.12", title:"Course, profil & dashboard", current:false, notes:[
        "🗑️ Suppression du header sur le dashboard",
        "🏁 Nom de la course cliquable (Gem\'Aubagne)",
        "📊 Barres de progression km + temps",
        "🤖 Coach enrichi (estimation, séance, météo)",
        "🏁 Nouvel onglet Course (infos, horaires, checklist, stratégie)",
        "👤 Profil coureur dans Paramètres",
        "🎯 Objectif de temps modifiable",
        "🪪 Champ PPS dans Paramètres",
        "🔧 Vérification des fonctions critiques",
      ]},
      { ver:"v1.8.11", title:"Séance terminée & Gist", current:false, notes:[
        "✅ Carte Aujourd\'hui enrichie quand séance terminée",
        "📊 Données Strava + répétitions sur le dashboard",
        "📅 Prochaine séance affichée en bas de carte",
        "ⓘ Icône à la place de \'tap ↓\'",
        "🔧 Fonctions Gist réinjectées (sauvegarde/restauration)",
      ]},
      { ver:"v1.8.10", title:"Répétitions & robustesse", current:false, notes:[
        "🔁 Affichage détaillé des répétitions (barre + allure + FC + 🟢🟡🔴)",
        "📊 Résumé X/Y répétitions dans la cible",
        "🔄 Graphique/dashboard synchronisés",
        "⏳ Indicateur Recalcul... sur le graphique",
        "🛡️ Conservation activités Strava si synchro échoue",
        "🔓 Boutons vider cache & forcer recalcul",
        "🎯 Rappel séance clé demain dans carte repos",
        "📅 Séances restantes dans la phase",
        "📊 Sources du prédicteur avec dates",
      ]},
      { ver:"v1.8.9", title:"Prédicteur honnête & UX", current:false, notes:[
        "🎯 Fourchette d\'estimation (ex. 48\'10\"–49\'20\")",
        "🔍 Détail des sources en tap sur l\'estimation",
        "📊 Pondération Lavandou conservative (< 5 séances)",
        "📈 Tendance allure EF + FC moy. dans le bilan semaine",
        "🌤️ Météo minimaliste sous le header",
        "📋 Changelog condensé",
      ]},
      { ver:"v1.8.8", title:"Validation & prédicteur affinés", current:false, notes:[
        "📋 Source de vérité unique SESSION_TARGETS",
        "💬 Raison du statut ❌ ou ⚠️ dans le détail de séance",
        "📊 Exclusion des séances ❌ du prédicteur 10K",
        "🎯 Seuil ✅ SPEC resserré à ≤ 4:58/km",
      ]},
      { ver:"v1.8.7", title:"Coach, séance clé & détails", current:false, notes:[
        "🤖 Message Coach quotidien via Claude API",
        "🎯 Prochaine séance clé sur le dashboard",
        "🔗 Lien direct vers l\'activité Strava",
        "🌅 Heure de départ + FC max dans le détail",
      ]},
      { ver:"v1.8.6", title:"Strava auto & graphique", current:false, notes:[
        "Synchro Strava automatique au chargement",
        "Labels semaines sur le graphique",
        "Distance et durée réelles vs prévues",
      ]},
      { ver:"v1.8.5", title:"Dashboard épuré & onglet Stats", current:false, notes:[
        "Fusion objectif + estimation en une carte",
        "Barre de progression rouge→vert",
        "Nouvel onglet Stats",
      ]},
      { ver:"v1.8", title:"FC, météo, notes & projections", current:false, notes:[
        "FC cible par séance",
        "Température historique pendant la séance",
        "Projections Riegel",
      ]},
      { ver:"v1.7", title:"Bilan & Fatigue", current:false, notes:["Bilan hebdomadaire automatique","Alerte de fatigue"]},
      { ver:"v1.6", title:"Météo, graphique & séance du jour", current:false, notes:["Météo temps réel Toulon","Graphique évolution estimation"]},
      { ver:"v1.5", title:"Auto-validation & UX", current:false, notes:["Auto-validation via laps Strava"]},
      { ver:"v1.4", title:"Lisibilité & cohérence", current:false, notes:["Amélioration des couleurs et tailles"]},
      { ver:"v1.3", title:"Plan révisé", current:false, notes:["Séances en temps, EF réduites"]},
      { ver:"v1.2", title:"Prédicteur v2", current:false, notes:["Riegel sur laps SPEC/VMA"]},
      { ver:"v1.1", title:"Strava & Cloud", current:false, notes:["Strava OAuth, sync activités, GitHub Gist"]},
      { ver:"v1.0", title:"Lancement", current:false, notes:["Plan 11 semaines, suivi des séances"]},
    ];
