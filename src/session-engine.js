// ============================================================================
//  Moteur de session partagé — extrait de la Lecture de notes (02)
//
//  Une session est une suite de questions posées jusqu'à un compte donné, avec
//  des tentatives, une série, des erreurs mémorisées par question et un bilan.
//  Ce qui change d'une fonctionnalité à l'autre — comment une question est
//  tirée, ce qui identifie une question, ce qui vaut bonne réponse — est
//  injecté ; le reste est ici.
//
//  Extrait le 27/07/2026, au moment où l'Entraînement de l'oreille (07) en a eu
//  besoin de la *même* version : même compte de dix questions, même règle « une
//  erreur ne change pas la question », même pondération des cibles ratées, même
//  bilan (plan/07-entrainement-oreille.md § 3 et § 11). Avant cela il n'avait
//  qu'un seul consommateur et vivait dans `note-reading-engine.js`.
//
//  Aucun DOM, aucun Canvas, aucun son : ce module est testable sans navigateur.
//  Le hasard est injectable (`random`) afin de rendre les tests déterministes.
// ============================================================================

export const DEFAULT_QUESTION_COUNT = 10;

// Poids ajouté à une cible à chaque erreur : elle revient plus souvent dans la
// suite de la session sans pour autant écraser les autres.
export const MISTAKE_WEIGHT = 2;

// Nombre de cibles au plus dans les « à revoir » du bilan.
const REVIEW_LIMIT = 3;

// ----------------------------------------------------------------------------
//  Tirage pondéré
//
//  Partagé parce que les deux fonctionnalités tirent de la même façon : plus une
//  cible a été ratée, plus elle a de chances de revenir.
// ----------------------------------------------------------------------------
export function pickWeighted(random, choices, weightOf) {
  let total = 0;
  for (const choice of choices) total += weightOf(choice);

  let ticket = random() * total;
  for (const choice of choices) {
    ticket -= weightOf(choice);
    if (ticket < 0) return choice;
  }
  return choices[choices.length - 1]; // filet de sécurité (arrondis flottants)
}

export function randomIndex(random, length) {
  return Math.min(Math.floor(random() * length), length - 1);
}

// Tire parmi des candidats en suivant les poids de la session. `keyFor` dit
// sous quelle clé un candidat est pondéré : une cible absente garde le poids
// par défaut, elle n'est donc jamais défavorisée.
export function pickByWeight(session, choices, keyFor) {
  return pickWeighted(
    session.random,
    choices,
    (choice) => session.weights.get(keyFor(choice)) ?? 1
  );
}

// ----------------------------------------------------------------------------
//  Création d'une session
// ----------------------------------------------------------------------------
export function createSession({
  questionCount = DEFAULT_QUESTION_COUNT,
  random = Math.random,

  // Toutes les clés pondérables connues d'avance. Elles partent à 1, ou au
  // poids hérité des séances précédentes (plan/F3 § 6, « Révisions adaptées »).
  keys = [],
  priorWeights = null,

  // Ce qui identifie une question pour la pondération et les erreurs.
  keyOf,

  // Tirage de la question suivante : reçoit la session et la question qui vient
  // d'être répondue (`null` pour la première).
  nextQuestion,

  // Bilan par groupe (main travaillée en 02). `groups` pré-remplit les groupes
  // attendus : un groupe sans réponse doit apparaître à zéro plutôt que
  // disparaître du bilan.
  groupOf = null,
  groups = [],

  // Verdict d'une réponse. Par défaut la réponse est une hauteur MIDI.
  isCorrect = (question, given) => given === question.midi,

  // Nombre d'erreurs sur la question en cours avant que l'aide soit proposée.
  hintAfterErrors = 0,

  mistakeWeight = MISTAKE_WEIGHT,

  // État propre à la fonctionnalité (groupes de notes, calendrier des mains…),
  // posé sur la session avant le tirage de la première question.
  extra = null,
} = {}) {
  if (typeof keyOf !== "function") {
    throw new Error("createSession : `keyOf` est obligatoire.");
  }
  if (typeof nextQuestion !== "function") {
    throw new Error("createSession : `nextQuestion` est obligatoire.");
  }

  const weights = new Map();
  for (const key of keys) weights.set(key, priorWeights?.get(key) ?? 1);

  const session = {
    questionCount,
    random,
    weights,
    rules: { keyOf, nextQuestion, groupOf, isCorrect, hintAfterErrors, mistakeWeight },
    currentQuestion: null,
    answeredQuestions: 0,
    attemptsForCurrentNote: 0,
    totalAttempts: 0,
    firstTryCorrect: 0,
    streak: 0,
    bestStreak: 0,
    mistakesByQuestion: new Map(),
    byGroup: new Map(
      groups.map((id) => [id, { answered: 0, firstTryCorrect: 0, attempts: 0 }])
    ),
    finished: false,
  };
  if (extra) Object.assign(session, extra);

  session.currentQuestion = nextQuestion(session, null);
  return session;
}

// Compteurs du groupe d'une question, créés à la volée si le groupe n'était pas
// annoncé. `null` quand la fonctionnalité ne découpe pas son bilan.
function groupCounters(session, question) {
  const groupOf = session.rules.groupOf;
  if (!groupOf) return null;

  const id = groupOf(question);
  if (id === null || id === undefined) return null;

  let counters = session.byGroup.get(id);
  if (!counters) {
    counters = { answered: 0, firstTryCorrect: 0, attempts: 0 };
    session.byGroup.set(id, counters);
  }
  return counters;
}

// ----------------------------------------------------------------------------
//  Déroulé
// ----------------------------------------------------------------------------

// L'aide suit la règle donnée à la création : immédiate, ou après une ou deux
// erreurs sur la question en cours.
export function hintAvailable(session) {
  if (session.finished) return false;
  return session.attemptsForCurrentNote >= (session.rules.hintAfterErrors ?? 0);
}

export function mistakesForCurrentQuestion(session) {
  if (!session.currentQuestion) return 0;
  const key = session.rules.keyOf(session.currentQuestion);
  return session.mistakesByQuestion.get(key) ?? 0;
}

// Valide une réponse. Une erreur ne change jamais la question en cours
// (plan/02-lecture-notes.md § 5, repris par plan/07 § 6) : elle est seulement
// mémorisée, et la cible ratée revient plus souvent ensuite.
export function answer(session, given) {
  const question = session.currentQuestion;
  if (session.finished || !question) return { status: "ignored" };

  const { keyOf, isCorrect, mistakeWeight, nextQuestion } = session.rules;

  session.attemptsForCurrentNote++;
  session.totalAttempts++;
  const counters = groupCounters(session, question);
  if (counters) counters.attempts++;

  if (!isCorrect(question, given)) {
    const key = keyOf(question);
    session.mistakesByQuestion.set(key, (session.mistakesByQuestion.get(key) ?? 0) + 1);
    session.weights.set(key, (session.weights.get(key) ?? 1) + mistakeWeight);
    session.streak = 0;
    return {
      status: "wrong",
      question,
      given,
      attempts: session.attemptsForCurrentNote,
    };
  }

  if (session.attemptsForCurrentNote === 1) {
    session.firstTryCorrect++;
    if (counters) counters.firstTryCorrect++;
  }
  if (counters) counters.answered++;
  session.answeredQuestions++;
  session.streak++;
  session.bestStreak = Math.max(session.bestStreak, session.streak);
  session.attemptsForCurrentNote = 0;

  if (session.answeredQuestions >= session.questionCount) {
    session.finished = true;
    session.currentQuestion = null;
  } else {
    session.currentQuestion = nextQuestion(session, question);
  }

  return { status: "correct", question, given, finished: session.finished };
}

// ----------------------------------------------------------------------------
//  Bilan
//
//  Les clés des « à revoir » ne sont pas traduites ici : c'est la fonctionnalité
//  qui sait ce que veut dire `treble:60` ou `interval:tierce`.
// ----------------------------------------------------------------------------
export function summary(session, { reviewLimit = REVIEW_LIMIT } = {}) {
  const toReview = [...session.mistakesByQuestion.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, reviewLimit)
    .map(([key, mistakes]) => ({ key, mistakes }));

  // Un groupe sans aucune réponse garde des compteurs à zéro : c'est à
  // l'affichage de ne rien en dire plutôt que d'inventer une précision
  // (plan/03 § 9, repris par plan/F3 § 6).
  const byGroup = {};
  for (const [id, counts] of session.byGroup) {
    byGroup[id] = {
      answered: counts.answered,
      firstTryCorrect: counts.firstTryCorrect,
      accuracy: counts.attempts > 0 ? counts.answered / counts.attempts : 0,
    };
  }

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
    byGroup,
  };
}
