// ============================================================================
//  Génération des exercices de Lecture de partitions — Feature 08
//
//  Produit les mesures d'une session (étape par étape, cf. plan/08 § 5) et la
//  suite de questions qui les parcourt. Le déroulé — tentatives, série, erreurs
//  mémorisées, pondération, bilan — vient de `session-engine.js`, exactement
//  comme pour la Lecture de notes (02) dont cette fonctionnalité est la suite.
//
//  Le vocabulaire de durées est celui de `rhythm/patterns.js`, comme le plan
//  l'exige (plan/08 § 4) : les mesures de l'étape « Valeurs et silences » sont
//  même tirées du catalogue de motifs de 05, pas d'une seconde liste.
//
//  Aucun DOM, aucun Canvas, aucun son : testable dans Node. Le hasard est
//  injectable (`random`), les poids hérités des séances passées aussi.
// ============================================================================

import {
  createSession as createEngineSession,
  pickWeighted,
  randomIndex,
  summary as engineSummary,
} from "../session-engine.js";
import { CLEF_BY_HAND } from "../note-reading-engine.js";
import { FIGURES, patternsOf } from "../rhythm/patterns.js";
import { noteDegreeName, octaveOf } from "../music.js";

export { answer, hintAvailable } from "../session-engine.js";

// ----------------------------------------------------------------------------
//  Les cinq étapes (plan/08 § 5) : chacune n'ajoute qu'une seule nouveauté.
// ----------------------------------------------------------------------------
export const STAGES = [
  {
    id: "measures",
    num: 1,
    label: "Petites mesures",
    description: "Lire plusieurs noires à la suite dans une mesure.",
  },
  {
    id: "values",
    num: 2,
    label: "Valeurs et silences",
    description: "Jouer la note, puis nommer sa durée — silences compris.",
  },
  {
    id: "accidentals",
    num: 3,
    label: "Altérations",
    description: "Dièses et bémols, accidentels puis en armure.",
  },
  {
    id: "chords",
    num: 4,
    label: "Notes simultanées",
    description: "Jouer deux ou trois notes empilées, dans n'importe quel ordre.",
  },
  {
    id: "grand-staff",
    num: 5,
    label: "Double portée",
    description: "Clé de sol et clé de fa lues en même temps, une main chacune.",
  },
];

export function stageById(id) {
  return STAGES.find((stage) => stage.id === id) ?? null;
}

// Étendues par main : celles du niveau Intermédiaire de la Lecture de notes —
// toute la portée plus le Do central — pour les étapes à une portée, et les
// groupes resserrés du Débutant pour la double portée, où le clavier doit
// contenir les deux mains à la fois sans devenir illisible.
const SINGLE_STAFF_POOLS = {
  right: [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77], // Do4 → Fa5
  left: [43, 45, 47, 48, 50, 52, 53, 55, 57, 59, 60],  // Sol2 → Do4
};

const GRAND_STAFF_POOLS = {
  right: [60, 62, 64, 65, 67], // Do4 → Sol4
  left: [48, 50, 52, 53, 55],  // Do3 → Sol3
};

// Nombre de mesures par session : assez pour une dizaine de questions, comme
// les autres exercices du dossier.
const MEASURES_PER_SESSION = 3;

// Vocabulaire de l'étape « Valeurs et silences » (plan/08 § 5, étape 2) :
// noire, blanche, ronde, croche et leurs silences. La noire pointée et la
// double croche appartiennent à 05, pas à cette étape.
const VALUE_STAGE_FIGURES = new Set([
  "whole", "half", "quarter", "eighth",
  "whole-rest", "half-rest", "quarter-rest", "eighth-rest",
]);

// Propositions par question de durée, comme la Reconnaissance de 05.
export const DURATION_CHOICES = 4;

// L'aide suit l'étape : immédiate au début, après une erreur ensuite —
// même esprit que les niveaux de 02.
const HINT_AFTER_ERRORS = {
  measures: 0,
  values: 0,
  accidentals: 1,
  chords: 1,
  "grand-staff": 1,
};

// ----------------------------------------------------------------------------
//  Mains et disponibilité
// ----------------------------------------------------------------------------

// La double portée travaille les deux mains par construction ; les autres
// étapes se lisent une clé à la fois, comme 02.
export function handsForStage(stageId, hand) {
  return stageId === "grand-staff" ? ["left", "right"] : [hand];
}

export function isCombinationAvailable(stageId, hand) {
  if (!stageById(stageId)) return false;
  if (stageId === "grand-staff") return hand === "both";
  return hand === "right" || hand === "left";
}

// ----------------------------------------------------------------------------
//  Identité d'une question — pour la pondération, les erreurs et le journal
// ----------------------------------------------------------------------------
export function questionKey(question) {
  if (question.kind === "duration") return `figure:${question.figure}`;
  if (question.midis.length > 1) {
    return `chord:${question.clef}:${[...question.midis].sort((a, b) => a - b).join("+")}`;
  }
  return `${question.clef}:${question.midis[0]}`;
}

// Traduction d'une clé du moteur pour le bilan (« à revoir »).
export function describeKey(key) {
  if (key.startsWith("figure:")) {
    const figure = FIGURES[key.slice("figure:".length)];
    return figure ? capitalize(figure.name) : key;
  }
  if (key.startsWith("chord:")) {
    const [, clef, midis] = key.split(":");
    const names = midis.split("+").map((midi) => noteName(Number(midi)));
    return clef === "grand"
      ? `${names.join(" + ")} (deux mains)`
      : `Accord ${names.join(" – ")}`;
  }
  const [clef, midi] = key.split(":");
  return `${noteName(Number(midi))} en ${clef === "treble" ? "clé de sol" : "clé de fa"}`;
}

function noteName(midi) {
  return `${noteDegreeName(midi)}${octaveOf(midi)}`;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ----------------------------------------------------------------------------
//  Tirage pondéré d'une hauteur
//
//  Même principe que 02 : ce qui a été raté revient plus souvent, et jamais
//  deux fois la même note à la suite quand le groupe permet d'éviter.
// ----------------------------------------------------------------------------
function pickMidi(random, pool, clef, priorWeights, previous) {
  const others = previous !== null ? pool.filter((midi) => midi !== previous) : pool;
  const choices = others.length > 0 ? others : pool;
  return pickWeighted(
    random,
    choices,
    (midi) => priorWeights?.get(`${clef}:${midi}`) ?? 1
  );
}

// ----------------------------------------------------------------------------
//  Génération des mesures, étape par étape
//
//  Une mesure : { clefs, keySignature, timeSignature, events }. Un évènement :
//  { type: "note"|"rest", figure, beat, hand, notes: [{ midi, accidental }] } —
//  la forme du modèle de plan/08 § 9, enrichie de ce que le rendu et la
//  validation demandent réellement.
// ----------------------------------------------------------------------------

function quarterMeasure(clef, hand, notes) {
  return {
    clefs: [clef],
    keySignature: "C",
    timeSignature: [4, 4],
    events: notes.map((note, index) => ({
      type: "note",
      figure: "quarter",
      beat: index,
      hand,
      notes: [note],
    })),
  };
}

// Étape 1 — des noires sur une portée : la seule nouveauté est la suite.
function buildMeasuresStage1({ hand, random, priorWeights }) {
  const clef = CLEF_BY_HAND[hand];
  const pool = SINGLE_STAFF_POOLS[hand];
  const measures = [];
  let previous = null;

  for (let m = 0; m < MEASURES_PER_SESSION; m++) {
    const notes = [];
    for (let i = 0; i < 4; i++) {
      const midi = pickMidi(random, pool, clef, priorWeights, previous);
      previous = midi;
      notes.push({ midi, accidental: null });
    }
    measures.push(quarterMeasure(clef, hand, notes));
  }
  return measures;
}

// Étape 2 — les mesures viennent du catalogue de motifs de l'Entraînement
// rythmique : mêmes définitions de durées et de silences, comme le plan
// l'impose (plan/08 § 4). Seuls les motifs 4/4 du vocabulaire de l'étape sont
// retenus (pas de noire pointée ni de double croche ici).
export function valuePatterns() {
  return [...patternsOf("beginner"), ...patternsOf("intermediate")].filter(
    (pattern) =>
      pattern.timeSignature[0] === 4 &&
      pattern.timeSignature[1] === 4 &&
      pattern.figures.every((id) => VALUE_STAGE_FIGURES.has(id))
  );
}

function buildMeasuresStage2({ hand, random, priorWeights }) {
  const clef = CLEF_BY_HAND[hand];
  const pool = SINGLE_STAFF_POOLS[hand];
  const patterns = valuePatterns();
  const measures = [];
  let previous = null;
  let previousPattern = null;

  for (let m = 0; m < MEASURES_PER_SESSION; m++) {
    const candidates = patterns.filter((pattern) => pattern !== previousPattern);
    const pattern = candidates[randomIndex(random, candidates.length)];
    previousPattern = pattern;

    let beat = 0;
    const events = [];
    for (const id of pattern.figures) {
      const figure = FIGURES[id];
      const event = { type: figure.rest ? "rest" : "note", figure: id, beat, hand, notes: [] };
      if (!figure.rest) {
        const midi = pickMidi(random, pool, clef, priorWeights, previous);
        previous = midi;
        event.notes.push({ midi, accidental: null });
      }
      events.push(event);
      beat += figure.beats; // en 4/4, une noire vaut un temps
    }
    measures.push({ clefs: [clef], keySignature: "C", timeSignature: [4, 4], events });
  }
  return measures;
}

// Étape 3 — altérations. Trois sortes de mesures, dans cet ordre pédagogique :
// dièses accidentels, bémols accidentels, puis une armure appliquée à toute la
// mesure (Sol majeur : Fa♯ ; Fa majeur : Si♭) — plan/08 § 5 : « d'abord
// accidentels puis en armure ».
//
// Un dièse s'écrit sur la blanche du dessous, un bémol sur celle du dessus :
// `written` est la hauteur portée sur la portée, `midi` la touche attendue.
// Fa♯ et Sol♭ sont donc la même touche, et la validation compare des touches :
// les deux noms sont acceptés d'office (plan/08 § 6).
const KEY_SIGNATURE_ALTERED = {
  C: null,
  G: { degree: 3, direction: +1 }, // tout Fa écrit se joue Fa♯
  F: { degree: 6, direction: -1 }, // tout Si écrit se joue Si♭
};

// Blanches qui acceptent un dièse (pas Mi ni Si) ou un bémol (pas Do ni Fa).
const SHARPABLE = new Set([0, 2, 5, 7, 9]); // Do Ré Fa Sol La
const FLATTABLE = new Set([2, 4, 7, 9, 11]); // Ré Mi Sol La Si

function pitchClassOf(midi) {
  return ((midi % 12) + 12) % 12;
}

function buildMeasuresStage3({ hand, random, priorWeights }) {
  const clef = CLEF_BY_HAND[hand];
  const pool = SINGLE_STAFF_POOLS[hand];
  const kinds = ["sharp", "flat", "signature"];
  const measures = [];
  let previous = null;

  kinds.forEach((kind) => {
    const keySignature = kind === "signature" ? (random() < 0.5 ? "G" : "F") : "C";
    const rule = KEY_SIGNATURE_ALTERED[keySignature];
    const notes = [];
    // Deux notes altérées par mesure, jamais côte à côte.
    const first = randomIndex(random, 2);
    const alteredAt = new Set([first, first + 2]);

    for (let i = 0; i < 4; i++) {
      let written = pickMidi(random, pool, clef, priorWeights, previous);
      let accidental = null;
      let midi = written;

      if (kind !== "signature" && alteredAt.has(i)) {
        const allowed = kind === "sharp" ? SHARPABLE : FLATTABLE;
        if (!allowed.has(pitchClassOf(written))) {
          const fallback = pool.filter((candidate) => allowed.has(pitchClassOf(candidate)));
          written = fallback[randomIndex(random, fallback.length)];
        }
        accidental = kind;
        midi = written + (kind === "sharp" ? 1 : -1);
      } else if (rule) {
        // L'armure joue sur toute la mesure : la note écrite reste sans signe.
        const degree = pitchClassOf(written);
        const target = kind === "signature" && degree === (rule.direction > 0 ? 5 : 11);
        if (target) midi = written + rule.direction;
      }

      previous = written;
      notes.push({ midi, written, accidental });
    }

    // Une mesure en armure doit contenir au moins une note réellement altérée,
    // sinon elle n'enseigne rien : on force le degré de l'armure si besoin.
    if (rule && !notes.some((note) => note.midi !== note.written)) {
      const index = randomIndex(random, notes.length);
      const degreePc = rule.direction > 0 ? 5 : 11;
      const candidates = pool.filter((candidate) => pitchClassOf(candidate) === degreePc);
      const written = candidates[randomIndex(random, candidates.length)];
      notes[index] = { midi: written + rule.direction, written, accidental: null };
    }

    measures.push({
      clefs: [clef],
      keySignature,
      timeSignature: [4, 4],
      events: notes.map((note, index) => ({
        type: "note",
        figure: "quarter",
        beat: index,
        hand,
        notes: [note],
      })),
    });
  });
  return measures;
}

// Étape 4 — notes simultanées : deux évènements empilés par mesure, le reste en
// notes seules. Les empilements sont des tierces ou des accords parfaits pris
// dans le groupe de blanches — validés dans n'importe quel ordre (plan/08 § 6).
function buildMeasuresStage4({ hand, random, priorWeights }) {
  const clef = CLEF_BY_HAND[hand];
  const pool = SINGLE_STAFF_POOLS[hand];
  const measures = [];
  let previous = null;

  for (let m = 0; m < MEASURES_PER_SESSION; m++) {
    const stackedAt = new Set([randomIndex(random, 2), 2 + randomIndex(random, 2)]);
    const events = [];
    for (let i = 0; i < 4; i++) {
      if (stackedAt.has(i)) {
        // Fondamentale choisie pour que l'empilement reste dans le groupe.
        const size = 2 + randomIndex(random, 2); // 2 ou 3 notes
        const span = (size - 1) * 2; // en degrés du groupe (tierces empilées)
        const roots = pool.slice(0, pool.length - span);
        const rootIndex = pool.indexOf(
          pickMidi(random, roots, clef, priorWeights, previous)
        );
        const midis = [];
        for (let n = 0; n < size; n++) midis.push(pool[rootIndex + n * 2]);
        previous = midis[0];
        events.push({
          type: "note",
          figure: "quarter",
          beat: i,
          hand,
          notes: midis.map((midi) => ({ midi, accidental: null })),
        });
      } else {
        const midi = pickMidi(random, pool, clef, priorWeights, previous);
        previous = midi;
        events.push({
          type: "note",
          figure: "quarter",
          beat: i,
          hand,
          notes: [{ midi, accidental: null }],
        });
      }
    }
    measures.push({ clefs: [clef], keySignature: "C", timeSignature: [4, 4], events });
  }
  return measures;
}

// Étape 5 — double portée : chaque temps porte une note à une main, ou une note
// à chaque main à jouer ensemble (plan/08 § 6). La main droite lit la portée du
// haut, la main gauche celle du bas.
function buildMeasuresStage5({ random, priorWeights }) {
  const measures = [];
  const previousBy = { right: null, left: null };

  for (let m = 0; m < MEASURES_PER_SESSION; m++) {
    const pairAt = new Set([randomIndex(random, 4)]);
    // La moitié des mesures demande un deuxième temps à deux mains.
    if (random() < 0.5) pairAt.add((([...pairAt][0] + 2) % 4));

    const events = [];
    let lastHand = null;
    let handRun = 0;
    for (let i = 0; i < 4; i++) {
      if (pairAt.has(i)) {
        const notes = ["right", "left"].map((hand) => {
          const midi = pickMidi(
            random,
            GRAND_STAFF_POOLS[hand],
            CLEF_BY_HAND[hand],
            priorWeights,
            previousBy[hand]
          );
          previousBy[hand] = midi;
          return { midi, accidental: null, hand };
        });
        events.push({ type: "note", figure: "quarter", beat: i, hand: null, notes });
        lastHand = null;
        handRun = 0;
      } else {
        // Alternance non stricte, mais jamais trois fois de suite la même main.
        const hand =
          lastHand === null
            ? ["right", "left"][randomIndex(random, 2)]
            : handRun >= 2 || random() < 0.5
              ? lastHand === "right" ? "left" : "right"
              : lastHand;
        handRun = hand === lastHand ? handRun + 1 : 1;
        const midi = pickMidi(
          random,
          GRAND_STAFF_POOLS[hand],
          CLEF_BY_HAND[hand],
          priorWeights,
          previousBy[hand]
        );
        previousBy[hand] = midi;
        events.push({
          type: "note",
          figure: "quarter",
          beat: i,
          hand,
          notes: [{ midi, accidental: null, hand }],
        });
        lastHand = hand;
      }
    }
    measures.push({
      clefs: ["treble", "bass"],
      keySignature: "C",
      timeSignature: [4, 4],
      events,
    });
  }
  return measures;
}

const BUILDERS = {
  measures: buildMeasuresStage1,
  values: buildMeasuresStage2,
  accidentals: buildMeasuresStage3,
  chords: buildMeasuresStage4,
  "grand-staff": buildMeasuresStage5,
};

// ----------------------------------------------------------------------------
//  Des mesures aux questions
//
//  Une question par chose à faire : jouer les notes d'un évènement (`pitch`),
//  ou nommer la durée d'une figure (`duration`, étape 2 seulement — c'est la
//  réponse « QCM » retenue en plan/08 § 13). L'ordre suit la partition :
//  la mesure n'avance pas tant que la note attendue n'est pas jouée.
// ----------------------------------------------------------------------------
function clefOfEvent(event, measure) {
  if (event.hand === null) return "grand";
  return measure.clefs.length === 1 ? measure.clefs[0] : CLEF_BY_HAND[event.hand];
}

function buildDurationChoices(figureId, random) {
  const answer = FIGURES[figureId];
  const sameKind = Object.values(FIGURES).filter(
    (figure) =>
      figure.rest === answer.rest &&
      figure.id !== answer.id &&
      VALUE_STAGE_FIGURES.has(figure.id)
  );

  const decoys = [];
  const bag = [...sameKind];
  while (decoys.length < DURATION_CHOICES - 1 && bag.length > 0) {
    decoys.push(bag.splice(randomIndex(random, bag.length), 1)[0].id);
  }

  const choices = [figureId, ...decoys];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = randomIndex(random, i + 1);
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}

export function buildPhases(measures, stageId, random) {
  const phases = [];
  measures.forEach((measure, measureIndex) => {
    measure.events.forEach((event, eventIndex) => {
      const clef = clefOfEvent(event, measure);
      if (event.type === "note") {
        phases.push({
          kind: "pitch",
          measureIndex,
          eventIndex,
          clef,
          hand: event.hand,
          figure: event.figure,
          midis: event.notes.map((note) => note.midi),
        });
      }
      if (stageId === "values") {
        phases.push({
          kind: "duration",
          measureIndex,
          eventIndex,
          clef,
          hand: event.hand,
          figure: event.figure,
          choices: buildDurationChoices(event.figure, random),
        });
      }
    });
  });
  return phases;
}

// ----------------------------------------------------------------------------
//  Session
// ----------------------------------------------------------------------------
export function createSheetSession({
  stage = "measures",
  hand = "right",
  random = Math.random,
  priorWeights = null,
} = {}) {
  if (!isCombinationAvailable(stage, hand)) {
    throw new Error(`Aucun exercice pour ${stage} / ${hand}.`);
  }

  const hands = handsForStage(stage, hand);
  const measures = BUILDERS[stage]({ hand, random, priorWeights });
  const phases = buildPhases(measures, stage, random);

  const keys = [...new Set(phases.map((phase) => questionKey(phase)))];

  const session = createEngineSession({
    questionCount: phases.length,
    random,
    keys,
    priorWeights,
    keyOf: questionKey,
    // Les questions suivent la partition : l'aléatoire a déjà joué à la
    // génération des mesures, pondération des séances passées comprise.
    nextQuestion: (current) => current.phases[current.answeredQuestions] ?? null,
    groupOf: (question) => question.hand,
    groups: hands,
    isCorrect: (question, given) =>
      question.kind === "duration"
        ? given === question.figure
        : question.midis.includes(given),
    hintAfterErrors: HINT_AFTER_ERRORS[stage] ?? 1,
    extra: { stage, handMode: hand, hands, measures, phases },
  });

  session.byHand = session.byGroup;
  return session;
}

// Groupe de notes pour le clavier de réponse : l'étendue de l'étape entière,
// jamais celle de la mesure en cours — un clavier réduit à la question
// révèlerait la réponse (plan/08 § 7).
export function keyboardPool(stage, hand) {
  if (stage === "grand-staff") {
    return [...GRAND_STAFF_POOLS.left, ...GRAND_STAFF_POOLS.right];
  }
  return SINGLE_STAFF_POOLS[hand];
}

// Bilan traduit : les clés du moteur redeviennent des libellés, et les
// compteurs sont rendus main par main (utile à la double portée).
export function summary(session) {
  const { byGroup, toReview, ...rest } = engineSummary(session);
  return {
    ...rest,
    toReview: toReview.map(({ key, mistakes }) => ({
      key,
      label: describeKey(key),
      mistakes,
    })),
    byHand: byGroup,
  };
}
