// ============================================================================
//  Stimuli de l'Entraînement de l'oreille — Feature 07
//
//  Trois familles d'exercices (note isolée, intervalles, majeur/mineur), trois
//  niveaux chacune. Ce module ne produit que du contenu musical : les hauteurs à
//  jouer, la façon de les jouer et la réponse attendue. Aucun DOM, aucun son —
//  c'est `ear-training-mode.js` qui les fait entendre, et `session-engine.js`
//  qui tient le déroulé (plan/07-entrainement-oreille.md § 11).
//
//  Le format d'une question est celui du § 10 du plan :
//      { family, referenceMidi, midis, playback, expectedAnswer }
//  enrichi du contexte dont l'écran a besoin (racine, écart, renversement).
// ============================================================================

import { diatonicIndex, noteDegreeName, octaveOf, WHITE_PITCH_CLASSES } from "../music.js";
import {
  createSession as createEngineSession,
  DEFAULT_QUESTION_COUNT,
  pickByWeight,
  randomIndex,
} from "../session-engine.js";

// Tonique de référence, fixée à Do dans le MVP (plan/07 § 15, tranché le
// 27/07/2026). Elle est rejouable à volonté et sans pénalité (§ 6).
export const REFERENCE_MIDI = 60;

export const FAMILIES = [
  {
    id: "single-note",
    label: "Note isolée",
    instruction: "Écoute la note, puis retrouve-la sur le piano.",
  },
  {
    id: "interval",
    label: "Intervalles",
    instruction: "Écoute les deux notes, puis nomme l'intervalle qui les sépare.",
  },
  {
    id: "chord-quality",
    label: "Majeur / mineur",
    instruction: "Écoute l'accord, puis dis s'il est majeur ou mineur.",
  },
];

export const DIFFICULTIES = [
  { id: "beginner", label: "Débutant" },
  { id: "intermediate", label: "Intermédiaire" },
  { id: "advanced", label: "Difficile" },
];

// L'aide n'arrive qu'« après plusieurs erreurs » (plan/07 § 8) : avant la
// deuxième, il n'y a de toute façon rien à comparer. Réécouter le stimulus,
// lui, reste libre et gratuit à tout instant (§ 6).
export const HINT_AFTER_ERRORS = 2;

function range(low, high) {
  const notes = [];
  for (let midi = low; midi <= high; midi++) notes.push(midi);
  return notes;
}

// ----------------------------------------------------------------------------
//  Note isolée
//
//  Le niveau ne joue que sur l'étendue et sur la présence d'altérations, jamais
//  sur une limite de temps (plan/07 § 5, comme en 02).
// ----------------------------------------------------------------------------
const SINGLE_NOTE_POOLS = {
  beginner: [60, 62, 64, 65, 67],                   // Do4 → Sol4, cinq blanches
  intermediate: [60, 62, 64, 65, 67, 69, 71, 72],   // Do4 → Do5, l'octave blanche
  advanced: range(48, 72),                          // Do3 → Do5, altérations comprises
};

// ----------------------------------------------------------------------------
//  Intervalles
//
//  Débutant et Intermédiaire nomment le degré seul (« tierce ») : la qualité
//  majeure ou mineure s'entend mal avant que le degré soit acquis, et les
//  confusions utiles à ce stade sont tierce/quarte, pas majeur/mineur. Le
//  niveau Difficile prend « tous les intervalles jusqu'à l'octave » (§ 5), ce
//  qui oblige à les qualifier : sans qualité, les douze écarts ne se
//  distinguent plus.
// ----------------------------------------------------------------------------

// Écart en demi-tons → degré. Le triton (6) n'y figure pas : il n'est le degré
// d'aucun intervalle diatonique, et c'est ce qui écarte la fausse « quinte »
// Si → Fa et la fausse « quarte » Fa → Si.
const GENERIC_BY_SEMITONES = {
  1: "seconde", 2: "seconde",
  3: "tierce", 4: "tierce",
  5: "quarte",
  7: "quinte",
  8: "sixte", 9: "sixte",
  10: "septième", 11: "septième",
  12: "octave",
};

const QUALIFIED_BY_SEMITONES = {
  1: "seconde mineure", 2: "seconde majeure",
  3: "tierce mineure", 4: "tierce majeure",
  5: "quarte juste",
  6: "triton",
  7: "quinte juste",
  8: "sixte mineure", 9: "sixte majeure",
  10: "septième mineure", 11: "septième majeure",
  12: "octave",
};

// Nombre de degrés à monter pour chaque nom générique.
const STEPS_BY_GENERIC = {
  seconde: 1, tierce: 2, quarte: 3, quinte: 4, sixte: 5, septième: 6, octave: 7,
};

// Écart de référence d'un degré, quand la construction diatonique ne peut pas
// aboutir (voir `intervalFromRoot`).
const CANONICAL_SEMITONES = {
  seconde: 2, tierce: 4, quarte: 5, quinte: 7, sixte: 9, septième: 11, octave: 12,
};

const INTERVAL_LEVELS = {
  beginner: {
    names: ["seconde", "tierce", "quinte", "octave"],
    roots: [60, 62, 64, 65, 67],       // Do4 → Sol4
    playbacks: ["sequential"],
    qualified: false,
  },
  intermediate: {
    names: ["seconde", "tierce", "quarte", "quinte", "sixte", "septième", "octave"],
    roots: [60, 62, 64, 65, 67, 69, 71], // Do4 → Si4
    playbacks: ["sequential", "simultaneous"],
    qualified: false,
  },
  advanced: {
    names: Object.values(QUALIFIED_BY_SEMITONES),
    roots: range(57, 69),              // La3 → La4, altérations comprises
    playbacks: ["simultaneous"],
    qualified: true,
  },
};

// Hauteur d'une touche blanche depuis son indice diatonique : la réciproque de
// `diatonicIndex()`, dont seule cette fonctionnalité a besoin.
function whiteFromDiatonic(index) {
  return Math.floor(index / 7) * 12 + WHITE_PITCH_CLASSES[((index % 7) + 7) % 7];
}

// Note atteinte depuis `root` en montant du nombre de degrés d'un nom
// générique, si et seulement si l'écart obtenu porte bien ce nom. Rend `null`
// sinon : c'est ce qui exclut Si comme racine de « quinte » (Si → Fa fait six
// demi-tons, un triton, pas une quinte).
function intervalFromRoot(root, name) {
  const steps = STEPS_BY_GENERIC[name];
  if (steps === undefined) return null;
  const target = whiteFromDiatonic(diatonicIndex(root) + steps);
  return GENERIC_BY_SEMITONES[target - root] === name ? target : null;
}

// Même chose, mais on accepte l'écart de référence en dernier recours : l'aide
// « entendre la différence » doit pouvoir faire entendre l'intervalle que
// l'utilisateur a nommé, même s'il est injouable à cet endroit de la gamme.
function heardIntervalFromRoot(root, name) {
  const diatonic = intervalFromRoot(root, name);
  if (diatonic !== null) return diatonic;

  const semitones = semitonesOfName(name);
  return semitones === null ? null : root + semitones;
}

// Écart en demi-tons d'un nom, générique ou qualifié.
function semitonesOfName(name) {
  for (const [semitones, label] of Object.entries(QUALIFIED_BY_SEMITONES)) {
    if (label === name) return Number(semitones);
  }
  return CANONICAL_SEMITONES[name] ?? null;
}

export function intervalName(semitones, { qualified = false } = {}) {
  return qualified
    ? QUALIFIED_BY_SEMITONES[semitones] ?? null
    : GENERIC_BY_SEMITONES[semitones] ?? null;
}

// ----------------------------------------------------------------------------
//  Majeur / mineur
// ----------------------------------------------------------------------------
const CHORD_LEVELS = {
  // Les degrés fondamentaux, en position serrée (plan/07 § 5).
  beginner: { roots: [60, 65, 67], inversions: ["root"] },
  // « + accords sur d'autres degrés » : toute l'octave blanche.
  intermediate: { roots: [60, 62, 64, 65, 67, 69, 71], inversions: ["root"] },
  // « + premiers renversements », et la racine n'est plus forcément blanche.
  advanced: { roots: range(55, 67), inversions: ["root", "first"] },
};

export const CHORD_QUALITIES = [
  { id: "major", label: "Majeur" },
  { id: "minor", label: "Mineur" },
];

function chordMidis(root, quality, inversion) {
  const third = root + (quality === "major" ? 4 : 3);
  const fifth = root + 7;
  // Premier renversement : la tierce passe à la basse, la fondamentale monte à
  // l'octave. L'accord reste le même, sa couleur aussi — c'est bien elle qui
  // est demandée.
  return inversion === "first" ? [third, fifth, root + 12] : [root, third, fifth];
}

// ----------------------------------------------------------------------------
//  Ce qu'une famille propose
// ----------------------------------------------------------------------------
export function isCombinationAvailable(family, difficulty) {
  if (family === "single-note") return Boolean(SINGLE_NOTE_POOLS[difficulty]);
  if (family === "interval") return Boolean(INTERVAL_LEVELS[difficulty]);
  if (family === "chord-quality") return Boolean(CHORD_LEVELS[difficulty]);
  return false;
}

// Groupe de notes du clavier de réponse. `null` pour les familles où la réponse
// se choisit parmi des propositions : aucun clavier n'y est affiché.
export function keyboardPool(family, difficulty) {
  return family === "single-note" ? SINGLE_NOTE_POOLS[difficulty] ?? null : null;
}

// Propositions de réponse d'une famille nommée : `null` quand la réponse se
// joue au piano.
export function answerChoices(family, difficulty) {
  if (family === "interval") {
    return (INTERVAL_LEVELS[difficulty]?.names ?? []).map((name) => ({
      id: name,
      label: name,
    }));
  }
  if (family === "chord-quality") return CHORD_QUALITIES.map((q) => ({ ...q }));
  return null;
}

// ----------------------------------------------------------------------------
//  Identité d'une cible
//
//  C'est elle qui porte la pondération des révisions (F3) : une tierce ratée
//  revient plus souvent, comme une note ratée en 02. La clé se calcule aussi
//  bien depuis une question que depuis la cible relue dans le journal.
// ----------------------------------------------------------------------------
export function questionKey(target) {
  if (target.family === "single-note") return `single-note:${target.midi}`;
  if (target.family === "interval") return `interval:${target.interval}`;
  if (target.family === "chord-quality") return `chord-quality:${target.quality}`;
  return `${target.family}:${target.value ?? ""}`;
}

// Ce qui est conservé dans le journal de progression (plan/F3 § 7). On garde ce
// qui identifie la cible, pas les hauteurs exactes : deux tierces sur des
// racines différentes sont la même difficulté.
export function targetOf(question) {
  if (question.family === "single-note") {
    return { family: "single-note", midi: question.midis[0] };
  }
  if (question.family === "interval") {
    return { family: "interval", interval: question.expectedAnswer.value };
  }
  return { family: "chord-quality", quality: question.expectedAnswer.value };
}

// Toutes les clés pondérables d'une combinaison, connues d'avance.
export function weightKeys(family, difficulty) {
  if (family === "single-note") {
    return (SINGLE_NOTE_POOLS[difficulty] ?? []).map((midi) => `single-note:${midi}`);
  }
  if (family === "interval") {
    return (INTERVAL_LEVELS[difficulty]?.names ?? []).map((name) => `interval:${name}`);
  }
  if (family === "chord-quality") {
    return CHORD_QUALITIES.map((quality) => `chord-quality:${quality.id}`);
  }
  return [];
}

// Libellé lisible d'une clé, pour les « à revoir » du bilan.
export function describeKey(key) {
  const separator = key.indexOf(":");
  const family = key.slice(0, separator);
  const value = key.slice(separator + 1);

  if (family === "single-note") {
    const midi = Number(value);
    return `${noteDegreeName(midi)}${octaveOf(midi)}`;
  }
  if (family === "chord-quality") {
    return value === "major" ? "majeur" : "mineur";
  }
  return value;
}

// ----------------------------------------------------------------------------
//  Tirage d'une question
//
//  La cible est tirée en suivant les poids de la session (ce qui a été raté
//  revient plus souvent) ; ce qui reste — la racine, le renversement, le mode de
//  jeu — est tiré uniformément.
// ----------------------------------------------------------------------------
export function drawQuestion(session, previous) {
  const { family, difficulty } = session;
  if (family === "single-note") return drawSingleNote(session, previous);
  if (family === "interval") return drawInterval(session, previous);
  return drawChordQuality(session, previous);
}

function drawSingleNote(session, previous) {
  const pool = SINGLE_NOTE_POOLS[session.difficulty];
  // Jamais deux fois la même note d'affilée (plan/02 § 5, même règle ici).
  const others = previous ? pool.filter((midi) => midi !== previous.midis[0]) : pool;
  const choices = others.length > 0 ? others : pool;

  const midi = pickByWeight(session, choices, (candidate) => `single-note:${candidate}`);
  return {
    family: "single-note",
    difficulty: session.difficulty,
    referenceMidi: REFERENCE_MIDI,
    midis: [midi],
    playback: "sequential",
    expectedAnswer: { type: "keys", value: [midi] },
  };
}

function drawInterval(session, previous) {
  const level = INTERVAL_LEVELS[session.difficulty];
  const previousName = previous?.expectedAnswer.value;
  const others = level.names.filter((name) => name !== previousName);
  const choices = others.length > 0 ? others : level.names;

  const name = pickByWeight(session, choices, (candidate) => `interval:${candidate}`);
  const playback = level.playbacks[randomIndex(session.random, level.playbacks.length)];

  let root;
  let target;
  if (level.qualified) {
    const semitones = semitonesOfName(name);
    root = level.roots[randomIndex(session.random, level.roots.length)];
    target = root + semitones;
  } else {
    // Seules les racines où le degré demandé garde son nom sont candidates.
    const roots = level.roots.filter((candidate) => intervalFromRoot(candidate, name) !== null);
    root = roots[randomIndex(session.random, roots.length)];
    target = intervalFromRoot(root, name);
  }

  return {
    family: "interval",
    difficulty: session.difficulty,
    referenceMidi: REFERENCE_MIDI,
    midis: [root, target],
    playback,
    root,
    semitones: target - root,
    qualified: level.qualified,
    expectedAnswer: { type: "interval-name", value: name },
  };
}

function drawChordQuality(session, previous) {
  const level = CHORD_LEVELS[session.difficulty];

  // Ici, contrairement aux deux autres familles, on n'écarte **pas** la réponse
  // précédente : avec deux réponses possibles, l'écarter produirait une
  // alternance majeur-mineur parfaitement devinable sans rien entendre.
  const quality = pickByWeight(
    session,
    CHORD_QUALITIES.map((q) => q.id),
    (candidate) => `chord-quality:${candidate}`
  );
  const root = level.roots[randomIndex(session.random, level.roots.length)];
  const inversion = level.inversions[randomIndex(session.random, level.inversions.length)];

  return {
    family: "chord-quality",
    difficulty: session.difficulty,
    referenceMidi: REFERENCE_MIDI,
    midis: chordMidis(root, quality, inversion),
    playback: "simultaneous",
    root,
    inversion,
    expectedAnswer: { type: "chord-quality", value: quality },
    // Sert à l'aide : le même accord dans l'autre couleur.
    otherQualityMidis: chordMidis(root, quality === "major" ? "minor" : "major", inversion),
  };
}

// ----------------------------------------------------------------------------
//  Aide « entendre la différence » (plan/07 § 8)
//
//  Ce qu'il faut faire entendre après plusieurs erreurs : la bonne réponse,
//  puis celle qui a été proposée. C'est l'aide la plus utile en travail
//  d'oreille — dire « ce n'est pas une quarte » n'apprend rien.
// ----------------------------------------------------------------------------
export function comparisonFor(question, given) {
  const correct = { midis: question.midis, playback: question.playback };

  if (question.family === "single-note") {
    if (given === null || given === undefined || given === question.midis[0]) return null;
    return [correct, { midis: [given], playback: "sequential" }];
  }

  if (question.family === "interval") {
    if (!given || given === question.expectedAnswer.value) return null;
    const target = heardIntervalFromRoot(question.root, given);
    if (target === null) return null;
    return [correct, { midis: [question.root, target], playback: question.playback }];
  }

  if (!given || given === question.expectedAnswer.value) return null;
  return [correct, { midis: question.otherQualityMidis, playback: "simultaneous" }];
}

// Verdict d'une réponse, quelle que soit la famille : une hauteur jouée pour la
// note isolée, un identifiant de proposition pour les deux autres.
export function isCorrectAnswer(question, given) {
  const expected = question.expectedAnswer;
  return expected.type === "keys" ? given === expected.value[0] : given === expected.value;
}

// ----------------------------------------------------------------------------
//  Session complète
//
//  Tout le câblage du moteur partagé vit ici plutôt que dans le fichier de
//  mode : c'est ce qui le rend vérifiable sans navigateur, comme le moteur de
//  02 (plan/07 § 14, « tests unitaires de la génération des stimuli »).
// ----------------------------------------------------------------------------
export function createEarSession({
  family = "single-note",
  difficulty = "beginner",
  questionCount = DEFAULT_QUESTION_COUNT,
  random = Math.random,
  priorWeights = null,
} = {}) {
  if (!isCombinationAvailable(family, difficulty)) {
    throw new Error(`Aucun exercice pour ${family} / ${difficulty}.`);
  }

  return createEngineSession({
    questionCount,
    random,
    keys: weightKeys(family, difficulty),
    priorWeights,
    keyOf: (question) => questionKey(targetOf(question)),
    nextQuestion: drawQuestion,
    isCorrect: isCorrectAnswer,
    hintAfterErrors: HINT_AFTER_ERRORS,
    extra: { family, difficulty },
  });
}
