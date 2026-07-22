/**
 * v1-bridge.js
 * Traduit un plan généré par le moteur v2 (public/v2/engine/plan-generator.js)
 * vers la structure PLAN/ALL_SESSIONS attendue par l'interface v1
 * (public/index.html) — chantier de convergence v1/v2, section 5 étape 2
 * (docs/v2-methodologie/convergence-v1-v2.md).
 *
 * Décision d'architecture (actée le 6 juillet 2026) : cette traduction est
 * une couche "pont" séparée, pas une modification du moteur v2 ni de
 * l'interface v1 elle-même. Si la structure interne du moteur évolue, seule
 * cette fonction doit changer — pas les dizaines d'endroits de index.html
 * qui lisent PLAN/ALL_SESSIONS.
 *
 * Le format texte de v2 (contenu fusionné, cf. décision 2.1) est reparsé ici
 * en warmup/session/cooldown/notes séparés (format attendu par v1) plutôt
 * que dupliqué depuis la logique de génération — au prix d'un léger risque
 * de fragilité si le format texte de v2 change, avec un repli explicite
 * (contenu brut affiché tel quel) si le parsing échoue.
 */

const JOUR_NOMS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// Sous-types qualité v2 -> catégorie STYPES v1 (EF/VMA/SEUIL/SPEC/LONGUE/
// TEST/REPOS/RACE). 'allure-course' -> SPEC ("Allure spécifique 10K" dans
// v1, pas SEUIL) ; tout ce qui relève de l'intensité VMA/vitesse -> VMA ;
// le reste (seuil et dérivés, tempo, fartlek) -> SEUIL.
const FAMILLE_VERS_TYPE_V1 = {
  'seuil-court': 'SEUIL', 'seuil': 'SEUIL', 'seuil-negatif': 'SEUIL',
  'tempo-court': 'SEUIL', 'fartlek': 'SEUIL',
  'i-30-30': 'VMA', 'i-3min': 'VMA', 'vitesse': 'VMA', 'pyramidale': 'VMA', 'cotes': 'VMA',
  'allure-course': 'SPEC', 'allure-course-court': 'SPEC',
  'test': 'TEST',
  // Ajouté le 22/07/2026 : le test semi-Cooper (plan course, flux "pas de
  // référence") retombait sur le repli 'SEUIL' faute de ce mapping —
  // affichage trompeur (badge "SEUIL" au lieu de "TEST").
  'test-semi-cooper': 'TEST'
};

function typeV1DepuisSeanceV2(seance) {
  if (seance.estCourse) return 'RACE';
  if (seance.type === 'repos') return 'REPOS';
  if (seance.type === 'marche-course') return 'MARCHE_COURSE';
  if (seance.type === 'longue') return 'LONGUE';
  if (seance.type === 'ef') return 'EF';
  if (seance.type === 'qualite') return FAMILLE_VERS_TYPE_V1[seance.sousType] ?? 'SEUIL';
  return 'EF'; // repli si un type inattendu apparaît, jamais de crash
}

/**
 * Reparse le contenu textuel fusionné d'une séance qualité v2
 * ("Échauffement Xmin @ ... (EF) + [corps] + Retour au calme Ymin @ ... (EF)
 * [notes accumulées]") en warmup/session/cooldown/notes séparés. Repli
 * explicite si le format ne correspond pas à ce qui est attendu : le texte
 * brut est alors placé tel quel dans `session`, warmup/cooldown restent
 * vides plutôt que de risquer un découpage incorrect.
 */
function parserContenuQualite(contenu) {
  const match = contenu.match(/^(Échauffement .+?\(EF\)) \+ (.+?) \+ (Retour au calme .+?\(EF\))(.*)$/);
  if (!match) {
    return { warmup: '', session: contenu, cooldown: '', notes: '' };
  }
  const [, warmup, session, cooldown, resteApresCooldown] = match;
  return {
    warmup: warmup.replace(/^Échauffement /, "").trim(),
    session: session.trim(),
    cooldown: cooldown.replace(/^Retour au calme /, "").trim(),
    notes: resteApresCooldown.trim()
  };
}

/**
 * Reparse le contenu d'une séance EF ou longue v2
 * ("20min à allure EF (6:10/km) — 3.2km [notes]") : pas de warmup/cooldown
 * distincts dans v2 pour ces types (décision 2.1 assumée), donc warmup et
 * cooldown restent vides — seul `session` reçoit le texte technique, les
 * notes accumulées (2.2 à 2.6) sont séparées dans `notes`.
 *
 * Deux formats gérés : le format standard ("...— X.Xkm [notes]") et le
 * format du garde-fou J-2/veille (2.7 : "Footing très léger, aucune
 * intensité à N jour(s) de la course.[ notes]"), qui n'a pas de distance
 * explicite et aurait sinon fini entièrement dans `session` sans notes
 * séparées (repli du pattern principal, pas un vrai motif spécifique codé
 * en dur pour ce cas précis — le point de coupure est juste la première
 * phrase se terminant par un point).
 */
function parserContenuEfOuLongue(contenu) {
  // Format standard : le texte technique se termine par "kmXX"
  const matchStandard = contenu.match(/^(.+?—\s*[\d.]+km)(.*)$/);
  if (matchStandard) {
    const [, session, notes] = matchStandard;
    return { session: session.trim(), notes: notes.trim() };
  }
  // Repli : coupe à la première phrase terminée par un point (couvre le
  // format du garde-fou J-2/veille, qui n'a pas de distance chiffrée)
  const matchPremierePhrase = contenu.match(/^([^.]+\.)(.*)$/);
  if (matchPremierePhrase) {
    const [, session, notes] = matchPremierePhrase;
    return { session: session.trim(), notes: notes.trim() };
  }
  return { session: contenu, notes: '' };
}

/**
 * Traduit un plan généré par generatePlan() (plan-generator.js) vers la
 * structure PLAN attendue par index.html. Chaque semaine devient
 * { week, phase, sessions: [...] }, chaque séance devient
 * { day, date, type, warmup, session, cooldown, notes } — structure
 * identique à celle codée en dur dans le PLAN actuel de v1.
 *
 * dateDebut doit être fournie (ex: plan.dateDebut) pour reconstruire la
 * date calendaire de chaque jour — le plan v2 n'a que semaineNum/jourIndex,
 * pas de date explicite par séance (contrairement au PLAN v1 statique).
 */
export function traduirePlanVersFormatV1(plan) {
  // BUG CORRIGÉ (15/07/2026, signalé par Laurent — dates de séances toutes
  // décalées, ex. "mardi 16" affiché pour un 16 qui tombait un vendredi) :
  // le calcul supposait implicitement que plan.dateDebut tombait un LUNDI
  // (jourIndex 0 de JOUR_NOMS ajouté directement à dateDebut, sans vérifier
  // le vrai jour de semaine de dateDebut). Rien ne garantit ça nulle part
  // côté wizard (startDate/dateDebut = la date choisie/le jour de
  // génération, sans contrainte de jour de semaine) — tous les modes
  // étaient affectés (course, forme, grand-débutant), le décalage n'étant
  // simplement remarqué que sur ce dernier.
  //
  // Décision avec Laurent : jourIndex (0-6, clé de semaine.assignment, cf.
  // placerSemaine côté plan-generator.js) représente bien un vrai jour de
  // semaine ISO (0=lundi ... 6=dimanche, cohérent avec la grille "L M M J V
  // S D" du wizard) — PAS un simple décalage depuis dateDebut. Le calendrier
  // est calé sur le LUNDI de la semaine de dateDebut, mais un plan peut
  // démarrer n'importe quel jour : toute séance dont la date calculée tombe
  // AVANT dateDebut est neutralisée en repos (la 1re semaine peut donc être
  // incomplète — ex. généré un mercredi avec Lun/Mer/Ven cochés : la séance
  // du lundi de cette semaine-là n'a pas lieu, le rythme normal reprend dès
  // la semaine 2). Jamais de séance affichée dans le passé par rapport à la
  // date de génération du plan.
  const dateDebut = new Date(plan.dateDebut + 'T00:00:00Z');
  const jourSemaineISO = (dateDebut.getUTCDay() + 6) % 7; // 0=lundi ... 6=dimanche
  const lundiDeLaSemaine = new Date(dateDebut);
  lundiDeLaSemaine.setUTCDate(dateDebut.getUTCDate() - jourSemaineISO);

  return plan.semaines.map(semaine => {
    const sessions = JOUR_NOMS.map((jourNom, jourIndex) => {
      const date = new Date(lundiDeLaSemaine);
      date.setUTCDate(lundiDeLaSemaine.getUTCDate() + (semaine.semaineNum - 1) * 7 + jourIndex);
      const dateStr = date.toISOString().slice(0, 10);
      const avantDebutDuPlan = date < dateDebut;
      const seance = avantDebutDuPlan ? null : semaine.assignment[jourIndex];

      const type = seance ? typeV1DepuisSeanceV2(seance) : 'REPOS';
      // kmEstime réel du moteur, propagé pour que v1 puisse afficher un
      // volume prévu fiable sans avoir à le recalculer depuis le texte
      // (bug trouvé le 7 juillet 2026 : weekStats() dans index.html
      // reparsait le texte de chaque séance avec une regex qui ne gérait
      // pas les formats "N×Xmin" — ex. "3×6min" comptait comme 6min, pas
      // 18min — sous-comptant fortement les séances qualité, 27km affichés
      // au lieu de 40km réels). kmEstime est la source de vérité du
      // moteur, pas un texte à reparser.
      const kmEstime = seance?.kmEstime ?? 0;
      // structureIntervalles : propagée pour l'affichage "à programmer sur
      // ta montre" (2.8, demandé le 8 juillet 2026) — undefined pour
      // REPOS/RACE/EF/LONGUE (seules les séances qualité en ont une)
      const structureIntervalles = seance?.structureIntervalles;

      if (!seance || type === 'REPOS') {
        return { day: jourNom, date: dateStr, type: 'REPOS', warmup: '', session: seance?.contenu || 'Repos', cooldown: '', notes: '', kmEstime: 0 };
      }
      if (type === 'RACE') {
        return { day: jourNom, date: dateStr, type: 'RACE', warmup: '', session: seance.contenu, cooldown: '', notes: '', kmEstime };
      }
      if (seance.type === 'qualite') {
        const { warmup, session, cooldown, notes } = parserContenuQualite(seance.contenu);
        // estTest/sousType propagés le 21/07/2026 — nécessaires à
        // index.html (renderTestSemiCooperRow) pour détecter la séance de
        // test semi-Cooper et afficher son champ de saisie dédié. Oubliés
        // lors de la création initiale du flux test (bug trouvé le même
        // jour : le champ n'apparaissait jamais malgré une séance bien
        // marquée estTest côté plan brut — cette fonction de traduction
        // v1-bridge ne les connaissait simplement pas encore).
        return { day: jourNom, date: dateStr, type, warmup, session, cooldown, notes, kmEstime, structureIntervalles, estTest: seance.estTest, sousType: seance.sousType };
      }
      if (seance.type === 'marche-course') {
        // Contenu déjà rédigé de façon lisible par genererContenuMarcheCourse
        // (échauffement/cycles/retour au calme dans une seule phrase) — pas
        // de découpage warmup/session/cooldown séparé comme pour les
        // séances qualité, ça n'apporterait rien pour ce format. palierLabel
        // propagé pour l'affichage (ex. badge "Palier : 3min course/1min30
        // marche" sur la carte de séance côté v1).
        return { day: jourNom, date: dateStr, type: 'MARCHE_COURSE', warmup: '', session: seance.contenu, cooldown: '', notes: '', kmEstime, palierLabel: seance.palierLabel };
      }
      // ef ou longue
      const { session, notes } = parserContenuEfOuLongue(seance.contenu);
      return { day: jourNom, date: dateStr, type, warmup: '', session, cooldown: '', notes, kmEstime };
    });

    return { week: semaine.semaineNum, phase: semaine.phase.toLowerCase(), sessions, volumeCibleKm: semaine.volumeCibleKm };
  });
}

/**
 * Reconstruit ALL_SESSIONS (liste aplatie avec uid) à partir du PLAN
 * traduit — identique à la ligne `const ALL_SESSIONS = PLAN.flatMap(...)`
 * de index.html, fournie ici pour que le pont expose directement les deux
 * structures dont l'interface a besoin.
 */
export function construireAllSessions(planTraduit) {
  return planTraduit.flatMap(w => w.sessions.map((s, i) => ({ ...s, week: w.week, phase: w.phase, uid: `${w.week}-${i}` })));
}
