// ============================================================================
//  Motifs rythmiques — Feature 05
//
//  Vocabulaire de figures (durées et silences) et motifs par niveau
//  (plan/05-entrainement-rythmique.md § 6 et § 10). Ce vocabulaire est celui que
//  partagera la Lecture de partitions (plan/08 § 4) : c'est ici qu'il vit, pas
//  en double.
//
//  Aucun DOM, aucun Canvas : testable dans Node. Le dessin des figures est
//  l'affaire de `rhythm-mode.js` ; ce fichier n'en donne que la description.
// ============================================================================

// ----------------------------------------------------------------------------
//  Figures
//
//  `beats` est toujours exprimé en **noires**, quelle que soit la mesure : une
//  croche vaut 0,5 noire en 4/4 comme en 6/8. C'est la mesure qui dit ensuite
//  combien de noires vaut un temps (cf. `beatValueOf`), pas la figure.
//
//  `stems`, `flags` et `dotted` décrivent le symbole, pas la durée : c'est ce
//  qui permet de dessiner et de nommer une figure sans la déduire d'un nombre.
// ----------------------------------------------------------------------------
export const FIGURES = {
  whole: { id: "whole", name: "ronde", beats: 4, rest: false, hollow: true, stem: false, flags: 0 },
  half: { id: "half", name: "blanche", beats: 2, rest: false, hollow: true, stem: true, flags: 0 },
  quarter: { id: "quarter", name: "noire", beats: 1, rest: false, hollow: false, stem: true, flags: 0 },
  "dotted-quarter": {
    id: "dotted-quarter",
    name: "noire pointée",
    beats: 1.5,
    rest: false,
    hollow: false,
    stem: true,
    flags: 0,
    dotted: true,
  },
  eighth: { id: "eighth", name: "croche", beats: 0.5, rest: false, hollow: false, stem: true, flags: 1 },
  sixteenth: {
    id: "sixteenth",
    name: "double croche",
    beats: 0.25,
    rest: false,
    hollow: false,
    stem: true,
    flags: 2,
  },

  // Silences. Les noms français : pause = 4 temps, demi-pause = 2, soupir = 1,
  // demi-soupir = 1/2.
  "whole-rest": { id: "whole-rest", name: "pause", beats: 4, rest: true, glyph: "\u{1D13B}" },
  "half-rest": { id: "half-rest", name: "demi-pause", beats: 2, rest: true, glyph: "\u{1D13C}" },
  "quarter-rest": { id: "quarter-rest", name: "soupir", beats: 1, rest: true, glyph: "\u{1D13D}" },
  "eighth-rest": { id: "eighth-rest", name: "demi-soupir", beats: 0.5, rest: true, glyph: "\u{1D13E}" },
};

// Noires par temps, déduites du dénominateur de la mesure : 4/4 et 3/4 battent
// la noire, 6/8 la croche.
export function beatValueOf(timeSignature) {
  return 4 / timeSignature[1];
}

// Durée d'une mesure, en temps (= le numérateur) et en noires.
export function barBeats(timeSignature) {
  return timeSignature[0];
}

export function barQuarters(timeSignature) {
  return timeSignature[0] * beatValueOf(timeSignature);
}

export const DIFFICULTIES = [
  { id: "beginner", label: "Débutant", defaultTempo: 70 },
  { id: "intermediate", label: "Intermédiaire", defaultTempo: 90 },
  { id: "advanced", label: "Difficile", defaultTempo: 110 },
];

export const FAMILIES = [
  {
    id: "metronome",
    label: "Métronome",
    goal: "Intérioriser une pulsation stable",
    status: "available",
  },
  {
    id: "recognition",
    label: "Reconnaissance",
    goal: "Nommer une durée ou un silence",
    status: "available",
  },
  {
    id: "reproduction",
    label: "Reproduction",
    goal: "Rejouer un rythme avec le bon timing",
    status: "available",
  },
];

// ----------------------------------------------------------------------------
//  Motifs
//
//  Un motif est une suite d'identifiants de figures, qui doit remplir exactement
//  une mesure — c'est vérifié (`patternIssues`), pas supposé.
// ----------------------------------------------------------------------------
export const PATTERNS = [
  // --- Débutant : noire, blanche, ronde, soupir, demi-pause, pause ----------
  { id: "b-4-noires", difficulty: "beginner", timeSignature: [4, 4],
    figures: ["quarter", "quarter", "quarter", "quarter"] },
  { id: "b-blanche-2-noires", difficulty: "beginner", timeSignature: [4, 4],
    figures: ["half", "quarter", "quarter"] },
  { id: "b-noire-soupir", difficulty: "beginner", timeSignature: [4, 4],
    figures: ["quarter", "quarter-rest", "quarter", "quarter"] },
  { id: "b-2-blanches", difficulty: "beginner", timeSignature: [4, 4],
    figures: ["half", "half"] },
  { id: "b-ronde", difficulty: "beginner", timeSignature: [4, 4],
    figures: ["whole"] },
  { id: "b-2-noires-blanche", difficulty: "beginner", timeSignature: [4, 4],
    figures: ["quarter", "quarter", "half"] },
  { id: "b-demi-pause", difficulty: "beginner", timeSignature: [4, 4],
    figures: ["half-rest", "quarter", "quarter"] },
  { id: "b-pause", difficulty: "beginner", timeSignature: [4, 4],
    figures: ["whole-rest"] },

  // --- Intermédiaire : + croches, noire pointée, demi-soupir, 3/4 -----------
  { id: "i-croches-noires", difficulty: "intermediate", timeSignature: [4, 4],
    figures: ["quarter", "eighth", "eighth", "quarter", "quarter"] },
  { id: "i-noire-pointee", difficulty: "intermediate", timeSignature: [4, 4],
    figures: ["dotted-quarter", "eighth", "quarter", "quarter"] },
  { id: "i-croches-blanche", difficulty: "intermediate", timeSignature: [4, 4],
    figures: ["eighth", "eighth", "quarter", "half"] },
  { id: "i-demi-soupir", difficulty: "intermediate", timeSignature: [4, 4],
    figures: ["quarter", "eighth-rest", "eighth", "quarter", "quarter"] },
  { id: "i-3-4-noires", difficulty: "intermediate", timeSignature: [3, 4],
    figures: ["quarter", "quarter", "quarter"] },
  { id: "i-3-4-pointee", difficulty: "intermediate", timeSignature: [3, 4],
    figures: ["dotted-quarter", "eighth", "quarter"] },
  { id: "i-3-4-blanche", difficulty: "intermediate", timeSignature: [3, 4],
    figures: ["half", "quarter"] },

  // --- Difficile : + doubles croches, syncopes, 6/8 -------------------------
  { id: "a-doubles", difficulty: "advanced", timeSignature: [4, 4],
    figures: ["sixteenth", "sixteenth", "sixteenth", "sixteenth", "quarter", "half"] },
  // Syncope : la note du deuxième temps est attaquée une croche trop tôt et
  // tenue par-dessus le temps.
  { id: "a-syncope", difficulty: "advanced", timeSignature: [4, 4],
    figures: ["eighth", "quarter", "quarter", "quarter", "eighth"] },
  { id: "a-doubles-croches", difficulty: "advanced", timeSignature: [4, 4],
    figures: ["eighth", "eighth-rest", "sixteenth", "sixteenth", "eighth", "quarter", "quarter"] },
  { id: "a-soupir-croches", difficulty: "advanced", timeSignature: [4, 4],
    figures: ["quarter", "quarter-rest", "eighth", "eighth", "quarter"] },
  { id: "a-3-4-syncope", difficulty: "advanced", timeSignature: [3, 4],
    figures: ["eighth", "quarter", "quarter", "eighth"] },
  { id: "a-6-8-croches", difficulty: "advanced", timeSignature: [6, 8],
    figures: ["eighth", "eighth", "eighth", "eighth", "eighth", "eighth"] },
  { id: "a-6-8-pointee", difficulty: "advanced", timeSignature: [6, 8],
    figures: ["dotted-quarter", "dotted-quarter"] },
  { id: "a-6-8-mixte", difficulty: "advanced", timeSignature: [6, 8],
    figures: ["quarter", "eighth", "quarter", "eighth"] },
];

export function figureOf(id) {
  return FIGURES[id] ?? null;
}

export function patternsOf(difficulty) {
  return PATTERNS.filter((pattern) => pattern.difficulty === difficulty);
}

export function patternById(id) {
  return PATTERNS.find((pattern) => pattern.id === id) ?? null;
}

export function difficultyById(id) {
  return DIFFICULTIES.find((difficulty) => difficulty.id === id) ?? null;
}

// ----------------------------------------------------------------------------
//  Développement d'un motif
//
//  Rend les évènements du § 10 (`{ type, beats }`), enrichis de la figure et de
//  la position. Les instants sont en **secondes**, sur la timeline commune au
//  décompte et au transport (cf. `metronome.js` : `t = 0` est la première
//  pulsation du décompte).
// ----------------------------------------------------------------------------
export function expandPattern(pattern, { tempo, startTime = 0, bars = 1 } = {}) {
  const beatValue = beatValueOf(pattern.timeSignature);
  const secondsPerBeat = 60 / tempo;
  const barLengthBeats = barBeats(pattern.timeSignature);

  const events = [];
  for (let bar = 0; bar < bars; bar++) {
    let quarters = 0;
    for (const id of pattern.figures) {
      const figure = FIGURES[id];
      const beat = bar * barLengthBeats + quarters / beatValue;
      events.push({
        figure: figure.id,
        name: figure.name,
        type: figure.rest ? "rest" : "note",
        // `beats` du § 10 : la durée de la figure exprimée en temps de la mesure.
        beats: figure.beats / beatValue,
        beat,
        bar,
        time: startTime + beat * secondsPerBeat,
        duration: (figure.beats / beatValue) * secondsPerBeat,
      });
      quarters += figure.beats;
    }
  }

  const totalBeats = bars * barLengthBeats;
  return {
    patternId: pattern.id,
    timeSignature: pattern.timeSignature,
    tempo,
    beatValue,
    secondsPerBeat,
    barBeats: barLengthBeats,
    bars,
    totalBeats,
    startTime,
    endTime: startTime + totalBeats * secondsPerBeat,
    events,
    // Ce qu'il faut frapper : les silences ne s'attaquent pas.
    onsets: events.filter((event) => event.type === "note").map((event) => event.time),
    noteEvents: events.filter((event) => event.type === "note"),
  };
}

// ----------------------------------------------------------------------------
//  Contrôle des motifs
//
//  Un motif qui ne remplit pas sa mesure décalerait tout ce qui suit. La
//  vérification est exportée pour que les tests la passent sur le catalogue
//  entier plutôt que de la refaire à la main.
// ----------------------------------------------------------------------------
export function patternIssues(pattern) {
  const issues = [];
  if (!difficultyById(pattern.difficulty)) issues.push("niveau inconnu");
  if (!Array.isArray(pattern.figures) || pattern.figures.length === 0) {
    issues.push("aucune figure");
    return issues;
  }

  let quarters = 0;
  for (const id of pattern.figures) {
    const figure = FIGURES[id];
    if (!figure) {
      issues.push(`figure inconnue : ${id}`);
      continue;
    }
    quarters += figure.beats;
  }

  const expected = barQuarters(pattern.timeSignature);
  if (Math.abs(quarters - expected) > 1e-9) {
    issues.push(`mesure incomplète : ${quarters} noires au lieu de ${expected}`);
  }
  return issues;
}

// ----------------------------------------------------------------------------
//  Question de Reconnaissance
//
//  Le motif est affiché **et** joué, et l'utilisateur nomme l'une de ses figures
//  (plan/05 § 4 : « Nommer une durée ou un silence »). Les leurres sont pris
//  parmi les figures du même niveau — proposer une double croche à un débutant
//  qui n'en a jamais vu n'apprendrait rien.
// ----------------------------------------------------------------------------
export const CHOICES_PER_QUESTION = 4;

// Figures réellement employées par un niveau : le vocabulaire d'un niveau n'est
// pas déclaré deux fois, il se lit dans ses motifs.
export function vocabularyOf(difficulty) {
  const ids = new Set();
  for (const pattern of patternsOf(difficulty)) {
    for (const id of pattern.figures) ids.add(id);
  }
  return [...ids].map((id) => FIGURES[id]);
}

export function buildRecognitionQuestion(pattern, difficulty, random = Math.random) {
  const pick = (list) => list[Math.floor(random() * list.length)];

  const positions = pattern.figures.map((id, index) => index);
  const askedIndex = pick(positions);
  const answer = FIGURES[pattern.figures[askedIndex]];

  // Leurres : d'autres figures du niveau, en gardant la nature (une figure de
  // silence se choisit parmi des silences) pour que la question porte bien sur
  // la durée et non sur « note ou silence ? ».
  const sameKind = vocabularyOf(difficulty).filter(
    (figure) => figure.rest === answer.rest && figure.id !== answer.id
  );
  const others = vocabularyOf(difficulty).filter(
    (figure) => figure.rest !== answer.rest
  );

  const decoys = [];
  const pool = [...sameKind];
  while (decoys.length < CHOICES_PER_QUESTION - 1 && pool.length > 0) {
    decoys.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  // Pas assez de figures de même nature dans ce niveau : on complète avec
  // l'autre nature plutôt que de rendre un QCM à deux propositions.
  const fallback = [...others];
  while (decoys.length < CHOICES_PER_QUESTION - 1 && fallback.length > 0) {
    decoys.push(fallback.splice(Math.floor(random() * fallback.length), 1)[0]);
  }

  const choices = [answer, ...decoys];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  return { askedIndex, answer, choices };
}
