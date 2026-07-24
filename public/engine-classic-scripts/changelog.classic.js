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
      { ver:"v2.25", title:"Choix d'activité si ambiguë, navigation plus fluide, aide sur chaque écran", current:true, notes:[
        "❓ Si Strava a enregistré plusieurs courses le même jour, l'app ne devine plus laquelle associer à ta séance — un menu te permet de choisir toi-même",
        "🌦️ La météo affichée sur une séance passée reflète maintenant l'heure réelle à laquelle tu as couru, plus une heure fixe (18h)",
        "🚫 Le moteur refuse désormais de créer un plan si le volume de départ est trop faible pour le nombre de jours choisis — il te propose de réduire les jours ou d'augmenter le volume, plutôt que de générer des séances sans substance",
        "👆 Navigation par glissement (swipe) entre les principaux onglets de l'app",
        "❓ Le bouton d'aide est désormais accessible depuis chaque écran, pas seulement le dashboard — et son contenu a été entièrement réorganisé pour être plus clair",
        "💬 Le bouton de signalement change d'icône (bulle plutôt que chenille), pour mieux refléter qu'il sert aussi aux suggestions",
        "✨ Boutons de statut et de ressenti agrandis pour être plus faciles à toucher",
        "🐛 Correction d'un scintillement de la barre de navigation du bas à chaque changement d'écran",
      ]},
      { ver:"v2.24", title:"Ajustement après séances ratées, fuseau horaire corrigé", current:false, notes:[
        "🎯 Si tu rates deux séances de qualité prévues d'affilée, Yoria peut désormais te proposer d'alléger la prochaine plutôt que de simplement te le signaler",
        "🐛 L'app pouvait afficher la séance de la veille comme \"Aujourd'hui\" entre minuit et 2h du matin — corrigé",
        "🔋 Le sélecteur de ressenti est plus clair (question précisée, réponse par défaut, disparaît une fois la séance validée)",
      ]},
      { ver:"v2.23", title:"Adaptation plus fine des séances de qualité, ressenti du jour", current:false, notes:[
        "🎯 Quand ton plan doit être allégé, Yoria peut désormais réduire le nombre de répétitions d'une séance de qualité (VMA, seuil...) plutôt que de se limiter aux séances faciles — l'allure et la récupération ne changent jamais",
        "🔋 Un nouveau sélecteur te permet d'indiquer comment tu te sens avant une séance de qualité — s'il existe déjà une proposition d'allègement, ton ressenti peut la renforcer",
      ]},
      { ver:"v2.22", title:"Correction du calcul de progression de l'estimation", current:false, notes:[
        "🐛 L'estimation pouvait rester bloquée sur ta référence de départ pendant plusieurs semaines malgré des séances de qualité validées — un calcul interne ne prenait pas correctement en compte l'historique au fil du temps",
      ]},
      { ver:"v2.21", title:"Estimation plus fidèle (VDOT), allures qui suivent ta progression, sync 100% Supabase", current:false, notes:[
        "🎯 L'allure de seuil compte maintenant pour ce qu'elle est vraiment — l'ancienne méthode (Riegel) traitait une séance de seuil comme un effort maximal et sous-estimait ta vitesse réelle de plusieurs minutes sur 10K",
        "📈 Tes allures d'entraînement (endurance, seuil, VMA) se resserrent maintenant automatiquement au fil du plan à mesure que ta forme progresse, au lieu de rester figées sur ta référence de départ",
        "☁️ La sauvegarde et la synchronisation entre appareils passent maintenant à 100% par ton compte — plus besoin de token GitHub, un vestige de l'ancien système a été retiré",
        "🐛 Correction d'un cas où l'estimation restait bloquée sur ta référence de départ malgré des séances de seuil et VMA validées",
        "🎨 Correction des contrastes de couleur sur certains éléments (statuts, alertes) pour une meilleure lisibilité en extérieur",
      ]},
      { ver:"v2.20", title:"Estimation 10K progressive, bandes de tolérance, lisibilité des statuts", current:false, notes:[
        "🎯 L'estimation 10K ne recule plus après une séance de qualité réussie — elle progresse désormais par petits pas vers ta forme mesurée au lieu de sauter directement dessus, et ralentit si tu rates plusieurs séances récemment",
        "📊 Le graphique d'évolution de l'estimation affiche maintenant une bande de tolérance autour de la courbe",
        "😴 Le nombre de séances sautées apparaît maintenant dans le bilan de la semaine sur le dashboard",
        "🎨 Les boutons de statut (✅/❌/⚠️/😴) et de ressenti (RPE) sont plus visibles une fois sélectionnés",
        "🐛 La trajectoire projetée vers la date de course utilisait une durée de plan fixe (11 semaines) au lieu de la vraie durée de ton plan",
      ]},
      { ver:"v2.19", title:"Test semi-Cooper pour plan course, échange de séances, statut repos automatique", current:false, notes:[
        "🎯 Le flux \"Je n'ai pas de référence\" (test de 6 minutes) est maintenant aussi disponible pour un plan course, pas seulement en Mode Forme — la durée du plan s'ajuste automatiquement à ta date de course",
        "📅 Le champ de saisie manuelle du volume hebdo est accessible directement, sans devoir d'abord tenter (et échouer) une synchro Strava",
        "⭐ Nouveau sélecteur du jour de sortie longue dans le wizard — reclique sur un jour sélectionné pour en faire ta sortie longue",
        "🔄 Possibilité d'échanger deux séances déjà présentes dans la semaine (pas seulement déplacer vers un jour de repos)",
        "😴 Une séance passée sans statut saisi est désormais marquée automatiquement comme repos/sautée, visible sur toutes les cartes et dans le résumé du dashboard",
        "🚫 Une séance ne peut plus être supprimée du plan — seul un statut (✅/❌/⚠️/😴) la caractérise",
        "🐛 Correctif important : un déplacement manuel de séance n'était pas toujours pris en compte par le reste de l'app (prédicteur, statistiques, alertes) — corrigé à la source",
        "🐛 Plusieurs correctifs sur les allures calculées après un test semi-Cooper (méthode de calcul VMA→10K revue avec la littérature scientifique, allures EF/seuil incohérentes corrigées)",
      ]},
      { ver:"v2.18", title:"Mode Forme sans référence de temps, fiabilité du chargement de plan", current:false, notes:[
        "🏃 En Mode Forme, plus besoin d'avoir un temps de course récent — \"Je n'ai pas de référence\" propose un test de 6 minutes en première semaine, tes allures sont calculées automatiquement une fois le test fait",
        "🔁 Nouveau bouton pour enchaîner sur un nouveau bloc de 4 semaines quand le précédent est terminé, en Mode Forme",
        "📏 Ajout d'un sélecteur de distance (5K/10K/Semi/Marathon) à côté du temps de référence en Mode Forme, pour que tes allures soient calculées sur la bonne base",
        "🐛 Correctif important de fiabilité : un plan tout juste créé pouvait parfois ne pas s'afficher immédiatement au retour sur l'app, obligeant à recharger la page",
        "🐛 La suppression d'un plan depuis le wizard échouait silencieusement dans certains cas — corrigé",
      ]},
      { ver:"v2.17", title:"Abonnement Yoria Premium", current:false, notes:[
        "💳 Nouvel abonnement Yoria Premium (7€/mois ou tarif annuel), depuis Réglages",
        "🔒 Paiement sécurisé via Stripe, dans ton navigateur habituel",
        "✅ Statut de l'abonnement visible directement dans Réglages",
      ]},
      { ver:"v2.16", title:"Fiabilité du profil et de la charge d'entraînement, premiers outils de suivi qualité", current:false, notes:[
        "🐛 Bug important corrigé : dans certains cas, le profil (nom, prénom, poids, taille) pouvait s'effacer en partie après avoir changé le niveau ou le sexe juste avant d'enregistrer les réglages — l'enregistrement se fait maintenant toujours en une seule fois, sans perte possible",
        "🐛 L'écran de bienvenue pouvait se redéclencher à tort sur un compte déjà configuré si la connexion au serveur était temporairement instable — corrigé, le profil existant n'est plus jamais écrasé dans ce cas",
        "🐛 Le calcul de fatigue et de charge d'entraînement pouvait donner une valeur aberrante si la fréquence cardiaque de repos n'était pas renseignée dans le profil — corrigé avec une valeur de repli cohérente",
        "🌦️ La météo (actuelle et passée sur tes séances) passe maintenant par le même circuit technique que la météo prévisionnelle, plus fiable et plus simple à faire évoluer",
        "🐛 Signalement d'un problème : un nouveau bouton (icône 🐛) est disponible en haut de chaque écran pour décrire directement un souci rencontré dans l'app",
      ]},
      { ver:"v2.15", title:"Stratégie de course par km ronds, wizard simplifié & correctifs Strava/estimation", current:false, notes:[
        "🏁 Stratégie de jour de course en repères kilométriques ronds pour Semi et Marathon (tous les 5km, avec un palier supplémentaire à 35km sur marathon) — plus simple à suivre en course que les pourcentages calculés précédents",
        "📝 L'étape \"Niveau\" a disparu du parcours de création de plan — c'est un réglage de ton profil, plus besoin de le repréciser à chaque nouveau plan",
        "🔗 Nouveau correctif sur la reconnexion Strava : un jeton de renouvellement expiré est maintenant détecté immédiatement, avec le bon message et le bouton de reconnexion, au lieu d'un échec silencieux",
        "🐛 La distance choisie (ex. Marathon) pouvait se réinitialiser en 10K si une reconnexion Strava survenait en cours de création de plan — corrigé",
        "🐛 L'écart affiché entre ton objectif et l'estimation du moteur pouvait montrer une valeur absurde (plusieurs heures d'écart) sur les plans Semi/Marathon — corrigé",
        "🐛 Une sortie longue ou une séance de qualité pouvait encore apparaître le lendemain d'un jour de course en fin de plan, selon le jour de la semaine où tombait la course — corrigé, ce jour passe maintenant en repos",
        "🐛 Petit défaut d'affichage (nombre à rallonge) sur les bornes kilométriques de la stratégie de course, corrigé",
      ]},
      { ver:"v2.14", title:"Connexion Strava plus stable, écran de bienvenue corrigé", current:false, notes:[
        "🔗 Correctif d'une cause probable de déconnexions Strava répétées — à confirmer dans les prochains jours",
        "🎬 L'écran de bienvenue (à la création d'un compte) s'affichait parfois en partant du milieu du formulaire plutôt que du début — corrigé",
      ]},
      { ver:"v2.13", title:"Stratégie de course cohérente, catégorie d'âge FFA & explications du ressenti", current:false, notes:[
        "🏁 La stratégie de jour de course (segments et allures) est désormais identique partout dans l'app — vue Semaine, onglet Course et conseil du coach racontaient parfois des histoires différentes pour la même course, corrigé",
        "🎂 Nouveau champ date de naissance complète (à la place de l'année seule) dans Réglages — affiche ta catégorie d'âge officielle FFA de la saison en cours, et te souhaite ton anniversaire le jour J",
        "😓 Le ressenti (RPE) affiche maintenant clairement son niveau au moment où tu le sélectionnes (ex. \"Difficile\"), avec la référence scientifique associée — plus lisible sur mobile, où l'ancienne info-bulle ne s'affichait jamais",
        "❓ Nouvelle entrée dans l'aide expliquant à quoi sert le ressenti et comment lire l'échelle",
      ]},
      { ver:"v2.12", title:"Historique de plan figé, Modules 3 & 4 du moteur, RPE unifié", current:false, notes:[
        "🗂️ Chaque plan créé garde désormais une copie figée de sa version d'origine, séparée de la version que le moteur ajuste au fil du temps — utile pour comparer où on en est par rapport au plan initial",
        "🧠 Deux nouveaux modules du moteur de décision : bilan hebdomadaire complet (volume, séances réussies/manquées, charge, récupération estimée) et détection de tendances sur plusieurs semaines — tous deux consultables dans un bloc de test en bas de Stats",
        "😓 Le ressenti (RPE) se note maintenant directement sur chaque séance validée, pas seulement en cas de correction manuelle — 5 niveaux simples (🙂 à 🥵) qui alimentent vraiment le calcul de fatigue et de charge, ce qui n'était pas le cas avant malgré la saisie existante",
        "📊 Le bilan hebdomadaire de la semaine (faites/partielles/manquées, minutes réelles vs prévues) réapparaît sur le dashboard — il existait dans le code mais ne s'affichait jamais",
        "🐛 Une course prévue un jour donné pouvait se retrouver placée jusqu'à une semaine plus tôt dans le calendrier généré, selon la date de départ du plan — corrigé",
        "🏷️ Le statut de séance \"Adaptée\" (⚠️) est renommé \"Partiel\", pour ne pas se confondre avec les futurs ajustements automatiques du moteur",
        "🐛 Le total de minutes planifiées du bilan de semaine ignorait les séances de fractionné (formats en secondes) et sous-comptait fortement certaines semaines",
      ]},
      { ver:"v2.11", title:"Module 2 du moteur (analyse de séance) & garde-fous anti-régénération", current:false, notes:[
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
      { ver:"v1.0-v1.9.3", title:"Fondations de l'app (lancement à mi-2026)", current:false, notes:[
        "🚀 Lancement du plan 11 semaines et du suivi de séances",
        "🔗 Connexion Strava et sauvegarde cloud",
        "🎯 Prédicteur 10K basé sur les séances validées",
        "🌡️ Météo, fréquence cardiaque et bilans hebdomadaires",
        "🤖 Message quotidien du coach",
        "📄 Export PDF et gestion des séances (déplacement, suppression)",
        "🎨 Nouveau design (renommage en Yoria)",
      ]},
    ];
