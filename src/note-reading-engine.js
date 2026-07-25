// ============================================================================
//  Moteur de la Lecture de notes — Feature 02
//
//  Choix de la note à poser, validation d'une réponse, pondération des notes
//  mal reconnues et bilan de session. Aucun DOM, aucun Canvas, aucun son : ce
//  module est volontairement pur pour être testable sans navigateur
//  (plan/02-lecture-notes.md § 6).
//
//  Le hasard est injectable (`random`) afin de rendre les tests déterministes.
// ============================================================================

export const QUESTIONS_PER_SESSION = 10;

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

// Étendue des notes par niveau puis par main (plan/02-lecture-notes.md § 4).
// Les niveaux Intermédiaire et Difficile arrivent à l'étape 6 de l'ordre de
// réalisation ; il suffira d'ajouter une ligne par main.
const NOTE_POOLS = {
  beginner: {
    right: [60, 62, 64, 65, 67], // Do4 → Sol4, autour du Do central
    left: [48, 50, 52, 53, 55],  // Do3 → Sol3, mêmes degrés une octave plus bas
  },
};

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

// Poids ajouté à une note à chaque erreur : elle revient plus souvent dans la
// suite de la session sans pour autant écraser les autres.
const MISTAKE_WEIGHT = 2;

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
} = {}) {
  if (!isCombinationAvailable(difficulty, hand)) {
    throw new Error(`Aucun groupe de notes pour ${difficulty} / ${hand}.`);
  }

  const hands = handsForMode(hand);
  const pools = {};
  const weights = new Map();
  for (const h of hands) {
    pools[h] = [...notePool(difficulty, h)];
    // Le poids suit la clé de lecture, pas seulement la hauteur : la même
    // touche peut être posée dans deux contextes différents.
    for (const midi of pools[h]) {
      weights.set(questionKey({ clef: CLEF_BY_HAND[h], midi }), 1);
    }
  }

  const session = {
    difficulty,
    handMode: hand,
    hands,
    questionCount,
    random,
    pools,
    handSchedule: buildHandSchedule(hands, questionCount, random),
    weights,
    currentQuestion: null,
    answeredQuestions: 0,
    attemptsForCurrentNote: 0,
    totalAttempts: 0,
    firstTryCorrect: 0,
    streak: 0,
    bestStreak: 0,
    mistakesByQuestion: new Map(),
    finished: false,
  };

  session.currentQuestion = pickQuestion(session, null);
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

function randomIndex(random, length) {
  return Math.min(Math.floor(random() * length), length - 1);
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

  const midi = pickWeighted(
    session.random,
    choices,
    (candidate) => session.weights.get(questionKey({ clef, midi: candidate })) ?? 1
  );
  return { midi, hand, clef };
}

function pickWeighted(random, choices, weightOf) {
  let total = 0;
  for (const choice of choices) total += weightOf(choice);

  let ticket = random() * total;
  for (const choice of choices) {
    ticket -= weightOf(choice);
    if (ticket < 0) return choice;
  }
  return choices[choices.length - 1]; // filet de sécurité (arrondis flottants)
}

// L'indice suit la règle du niveau : immédiat en Débutant, après une ou deux
// erreurs ensuite.
export function hintAvailable(session) {
  if (session.finished) return false;
  return session.attemptsForCurrentNote >= (HINT_AFTER_ERRORS[session.difficulty] ?? 0);
}

export function mistakesForCurrentQuestion(session) {
  if (!session.currentQuestion) return 0;
  return session.mistakesByQuestion.get(questionKey(session.currentQuestion)) ?? 0;
}

// Valide la touche jouée. Une erreur ne change jamais la question en cours
// (plan/02-lecture-notes.md § 5) : elle est seulement mémorisée.
export function answer(session, midi) {
  const question = session.currentQuestion;
  if (session.finished || !question) return { status: "ignored" };

  session.attemptsForCurrentNote++;
  session.totalAttempts++;

  if (midi !== question.midi) {
    const key = questionKey(question);
    session.mistakesByQuestion.set(key, (session.mistakesByQuestion.get(key) ?? 0) + 1);
    session.weights.set(key, (session.weights.get(key) ?? 1) + MISTAKE_WEIGHT);
    session.streak = 0;
    return {
      status: "wrong",
      question,
      played: midi,
      attempts: session.attemptsForCurrentNote,
    };
  }

  if (session.attemptsForCurrentNote === 1) session.firstTryCorrect++;
  session.answeredQuestions++;
  session.streak++;
  session.bestStreak = Math.max(session.bestStreak, session.streak);
  session.attemptsForCurrentNote = 0;

  if (session.answeredQuestions >= session.questionCount) {
    session.finished = true;
    session.currentQuestion = null;
  } else {
    session.currentQuestion = pickQuestion(session, question);
  }

  return { status: "correct", question, finished: session.finished };
}

export function summary(session) {
  const toReview = [...session.mistakesByQuestion.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, mistakes]) => {
      const [clef, midi] = key.split(":");
      return { clef, hand: HAND_BY_CLEF[clef], midi: Number(midi), mistakes };
    });

  return {
    questionCount: session.questionCount,
    answeredQuestions: session.answeredQuestions,
    firstTryCorrect: session.firstTryCorrect,
    // Précision = une réponse juste par question, sans tentative superflue.
    accuracy:
      session.totalAttempts > 0
        ? session.answeredQuestions / session.totalAttempts
        : 0,
    bestStreak: session.bestStreak,
    toReview,
  };
}
