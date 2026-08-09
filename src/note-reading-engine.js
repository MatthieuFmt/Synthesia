// ============================================================================
//  Groupes de notes partagés par la Lecture de notes défilante
//
//  Ce qui reste ici est ce qui n'appartient qu'à la lecture d'une note écrite :
//  les groupes de notes par niveau et par main, la clé associée à chaque main,
//  le calendrier des mains d'une session en mode « Les deux », et le tirage
//  d'une note dans le groupe de la main du moment.
//
//  Le déroulé lui-même — tentatives, série, erreurs mémorisées, pondération des
//  cibles ratées, bilan — vit dans `session-engine.js` depuis le 27/07/2026,
//  quand l'Entraînement de l'oreille (07) en a eu besoin de la même version
//  (plan/07-entrainement-oreille.md § 3). La surface publique de ce fichier n'a
//  pas bougé pour autant. Le mode défilant en réutilise les groupes et les clés.
//
//  Aucun DOM, aucun Canvas, aucun son : ce module est testable sans navigateur
//  (plan/02-lecture-notes.md § 6). Le hasard est injectable (`random`).
// ============================================================================

import {
  createSession as createEngineSession,
  DEFAULT_QUESTION_COUNT,
  pickByWeight,
  pickWeighted,
  randomIndex,
  summary as engineSummary,
} from "./session-engine.js";

export { answer, hintAvailable, mistakesForCurrentQuestion } from "./session-engine.js";

export const QUESTIONS_PER_SESSION = DEFAULT_QUESTION_COUNT;

// Clé de portée associée à chaque main dans ce parcours de lecture
// (plan/02-lecture-notes.md § 5).
export const CLEF_BY_HAND = {
  right: "treble",
  left: "bass",
};

export const HAND_BY_CLEF = {
  treble: "right",
  bass: "left",
};

// Notes **ajoutées** par chaque niveau, par main (plan/02-lecture-notes.md § 4).
// Le niveau ne joue que sur cette étendue : aucune limite de temps, aucune
// altération. Le Do central appartient aux deux mains dès l'Intermédiaire : il
// est le repère commun des deux clés, sous la portée en clé de sol et au-dessus
// en clé de fa. Les deux groupes d'un même niveau occupent alors les mêmes
// positions sur leur portée respective, en miroir.
const NEW_NOTES = {
  beginner: {
    right: [60, 62, 64, 65, 67], // Do4 → Sol4, autour du Do central
    left: [48, 50, 52, 53, 55],  // Do3 → Sol3, mêmes degrés une octave plus bas
  },
  intermediate: {
    // Le haut de la portée, jusqu'au Fa de la 5e ligne.
    right: [69, 71, 72, 74, 76, 77], // La4 → Fa5
    // Son miroir en clé de fa : le bas de la portée, et le haut jusqu'au Do
    // central posé au-dessus, sur sa ligne supplémentaire. Le groupe est en
    // deux morceaux parce que le Débutant occupe déjà son milieu.
    left: [43, 45, 47, 57, 59, 60], // Sol2 → Si2, puis La3 → Do4
  },
  advanced: {
    // Ce qui déborde encore : deux lignes supplémentaires du côté du Do
    // central, une seule de l'autre côté.
    right: [57, 59, 79, 81], // La3, Si3, puis Sol5, La5
    left: [40, 41, 62, 64],  // Mi2, Fa2, puis Ré4, Mi4
  },
};

// Étendue réellement tirée à chaque niveau. L'Intermédiaire ne propose **que**
// ses notes neuves (08/08/2026) : réviser le Débutant se fait en choisissant le
// Débutant, pas en passant la moitié d'une séance d'Intermédiaire sur des
// repères déjà installés. Le Difficile, lui, rassemble tout ce qui a été vu —
// c'est le niveau où l'on lit la portée entière, sans exclure quoi que ce soit.
const NOTE_POOLS = {
  beginner: NEW_NOTES.beginner,
  intermediate: NEW_NOTES.intermediate,
  advanced: mergePools(NEW_NOTES.beginner, NEW_NOTES.intermediate, NEW_NOTES.advanced),
};

// Réunit plusieurs groupes main par main, triés par hauteur croissante : les
// pools sont lus dans l'ordre ailleurs (marche par degré de portée du mode
// défilant, étendue du clavier de réponse).
function mergePools(...groups) {
  const merged = {};
  for (const group of groups) {
    for (const [hand, notes] of Object.entries(group)) {
      merged[hand] = [...(merged[hand] ?? []), ...notes];
    }
  }
  for (const notes of Object.values(merged)) notes.sort((a, b) => a - b);
  return merged;
}

// Mains réellement travaillées derrière un réglage de main. « Les deux » est le
// seul réglage qui en couvre plusieurs : la main est alors tirée par question
// (plan/02-lecture-notes.md § 5).
export function handsForMode(handMode) {
  return handMode === "both" ? ["left", "right"] : [handMode];
}

// Nombre maximal de questions consécutives sur la même main en mode Les deux.
const MAX_SAME_HAND_RUN = 2;

// Nombre d'erreurs sur la question en cours avant que l'indice soit proposé.
const HINT_AFTER_ERRORS = {
  beginner: 0, // aide disponible immédiatement
  intermediate: 1,
  advanced: 2,
};

export function notePool(difficulty, hand) {
  return NOTE_POOLS[difficulty]?.[hand] ?? null;
}

// Une combinaison n'est proposée que si toutes ses mains ont un groupe de
// notes : « Les deux » exige donc la main droite ET la main gauche.
export function isCombinationAvailable(difficulty, handMode) {
  const hands = handsForMode(handMode);
  return hands.every((hand) => notePool(difficulty, hand) !== null);
}

// Identifie une question par sa clé ET sa hauteur : une même touche peut être
// lue dans deux contextes différents (plan/02-lecture-notes.md § 6).
export function questionKey(question) {
  return `${question.clef}:${question.midi}`;
}

export function createSession({
  difficulty = "beginner",
  hand = "right",
  questionCount = QUESTIONS_PER_SESSION,
  random = Math.random,
  // Poids hérités des séances précédentes, par `clé:hauteur` : ce qui a été
  // raté auparavant revient plus souvent (plan/02-lecture-notes.md étape D).
  // Les notes absentes gardent le poids par défaut, elles ne sont donc jamais
  // défavorisées.
  priorWeights = null,
} = {}) {
  if (!isCombinationAvailable(difficulty, hand)) {
    throw new Error(`Aucun groupe de notes pour ${difficulty} / ${hand}.`);
  }

  const hands = handsForMode(hand);
  const pools = {};
  const keys = [];
  for (const h of hands) {
    pools[h] = [...notePool(difficulty, h)];
    // Le poids suit la clé de lecture, pas seulement la hauteur : la même
    // touche peut être posée dans deux contextes différents.
    for (const midi of pools[h]) {
      keys.push(questionKey({ clef: CLEF_BY_HAND[h], midi }));
    }
  }

  // Le calendrier des mains est tiré avant la première question : il consomme
  // le hasard avant elle, comme lorsque tout vivait dans ce fichier.
  const handSchedule = buildHandSchedule(hands, questionCount, random);

  const session = createEngineSession({
    questionCount,
    random,
    keys,
    priorWeights,
    keyOf: questionKey,
    nextQuestion: pickQuestion,
    // Mêmes compteurs, tenus main par main : en mode Les deux, une précision
    // globale masquerait la main en retard (plan/F3 § 6, « Évolution par main »).
    groupOf: (question) => question.hand,
    groups: hands,
    hintAfterErrors: HINT_AFTER_ERRORS[difficulty] ?? 0,
    extra: { difficulty, handMode: hand, hands, pools, handSchedule },
  });

  // Le bilan de cette fonctionnalité parle de mains, pas de groupes.
  session.byHand = session.byGroup;
  return session;
}

// Répartit les questions entre les mains avant même la première note : chaque
// main reçoit sa part exacte de la session (plan/02-lecture-notes.md § 5). Le
// reste d'une division impaire va à une main tirée au hasard.
//
// L'ordre reste imprévisible — pas d'alternance droite-gauche qui permettrait
// de deviner la clé —, mais on évite les longues séries sur une même main.
function buildHandSchedule(hands, questionCount, random) {
  if (hands.length < 2) return new Array(questionCount).fill(hands[0]);

  const remaining = new Map(
    hands.map((hand) => [hand, Math.floor(questionCount / hands.length)])
  );
  for (let extra = questionCount % hands.length; extra > 0; extra--) {
    const hand = hands[randomIndex(random, hands.length)];
    remaining.set(hand, remaining.get(hand) + 1);
  }

  const schedule = [];
  let run = 0;
  for (let i = 0; i < questionCount; i++) {
    const previous = schedule[schedule.length - 1];
    const available = hands.filter((hand) => remaining.get(hand) > 0);
    const choices = available.filter((hand) => {
      const nextRun = hand === previous ? run + 1 : 1;
      return nextRun <= MAX_SAME_HAND_RUN && staysFeasible(hands, remaining, hand, nextRun);
    });

    // Tirage dans le sac : plus une main a de questions en réserve, plus elle
    // a de chances de sortir. L'équilibre se fait de lui-même.
    const hand = pickWeighted(
      random,
      choices.length > 0 ? choices : available,
      (h) => remaining.get(h)
    );
    remaining.set(hand, remaining.get(hand) - 1);
    run = hand === previous ? run + 1 : 1;
    schedule.push(hand);
  }
  return schedule;
}

// Un tirage n'est retenu que s'il laisse le reste de la session plaçable sans
// dépasser MAX_SAME_HAND_RUN. Sans cette vérification, la fin de session se
// retrouve parfois coincée avec une seule main en réserve, donc une longue
// série prévisible. (Deux mains au plus : « Les deux » est le seul mode
// multi-mains.)
function staysFeasible(hands, remaining, hand, run) {
  const other = hands.find((h) => h !== hand);
  if (!other) return true;

  const same = remaining.get(hand) - 1;
  const opposite = remaining.get(other);

  // Chaque question de l'autre main ouvre un nouveau bloc ; la série en cours
  // ampute d'autant le bloc courant.
  if (same > MAX_SAME_HAND_RUN - run + opposite * MAX_SAME_HAND_RUN) return false;
  return opposite <= (same + 1) * MAX_SAME_HAND_RUN;
}

// Tire la question suivante : jamais la même que la précédente sur la même
// main (sauf s'il n'y a qu'une note), et d'autant plus souvent que la note a
// été mal reconnue. La main vient du calendrier de la session.
function pickQuestion(session, previous) {
  const hand = session.handSchedule[session.answeredQuestions] ?? session.hands[0];
  const clef = CLEF_BY_HAND[hand];
  const pool = session.pools[hand];
  const others =
    hand === previous?.hand ? pool.filter((midi) => midi !== previous.midi) : pool;
  const choices = others.length > 0 ? others : pool;

  const midi = pickByWeight(session, choices, (candidate) =>
    questionKey({ clef, midi: candidate })
  );
  return { midi, hand, clef };
}

// Bilan de la session, avec les notes à revoir traduites depuis les clés
// `clé:hauteur` du moteur, et les compteurs rendus main par main.
export function summary(session) {
  const { byGroup, toReview, ...rest } = engineSummary(session);

  return {
    ...rest,
    toReview: toReview.map(({ key, mistakes }) => {
      const [clef, midi] = key.split(":");
      return { clef, hand: HAND_BY_CLEF[clef], midi: Number(midi), mistakes };
    }),
    byHand: byGroup,
  };
}
