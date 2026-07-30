// ============================================================================
//  Générateur d'exercices techniques — Feature 03, étape B
//
//  Transforme la description d'un exercice (`catalog.js` : des degrés de gamme,
//  des doigtés, un nombre de temps) en notes normalisées **de la même forme que
//  celles du mode Morceau** — `{ midi, time, duration, endTime, velocity, hand }`
//  plus un `finger`. C'est cette compatibilité qui permet de dessiner un
//  exercice avec un piano roll sans maintenir deux moteurs de lecture
//  (plan/03-technique-doigts.md § 11).
//
//  Aucun DOM, aucun Canvas, aucun Tone.js : testable dans Node.
// ============================================================================

import {
  HAND_TONIC_OCTAVE,
  KEYS,
  MAJOR_SCALE,
  supportsHand,
} from "./catalog.js";
import { clampTempo, DEFAULT_BEATS_PER_BAR } from "../metronome.js";

// Fraction du pas réellement tenue. Le petit silence restant sépare deux notes
// consécutives dans le rouleau — sans lui, une même hauteur répétée forme un
// seul long rectangle — et évite d'empiler deux relâchements sur
// l'échantillonneur.
const HELD_FRACTION = 0.92;

const VELOCITY = 0.8;

// Un pas accentué sonne plus fort, sans jamais saturer : l'accent déplacé est
// un exercice d'écoute, pas de force (plan/03 § 5, niveau Intermédiaire).
const ACCENT_VELOCITY = 0.95;

// Les durées de pas ne sont plus toutes entières : un triolet vaut 1/3 de temps
// et un septolet 2/7, qui ne s'écrivent pas exactement en binaire. Toute
// comparaison de temps passe donc par cette tolérance.
const BEAT_EPSILON = 1e-9;

export const MIN_REPETITIONS = 1;
export const MAX_REPETITIONS = 16;

export function clampRepetitions(count) {
  if (!Number.isFinite(count)) return MIN_REPETITIONS;
  return Math.min(MAX_REPETITIONS, Math.max(MIN_REPETITIONS, Math.round(count)));
}

// ----------------------------------------------------------------------------
//  Degrés, avec ou sans altération
//
//  Un degré s'écrit `4` (le cinquième son de la gamme) ou `"4#"` / `"4b"` quand
//  il est altéré. Les sept degrés diatoniques ne suffisaient pas : le doigté
//  d'octaves chromatiques — 5 sur les blanches, 4 sur les noires — est *tout*
//  le sujet de cet exercice, et un accord mineur demande une tierce baissée.
//  Écrire une deuxième table de gamme par mode aurait multiplié les tables ;
//  une altération sur le degré dit la même chose et se lit dans le motif.
// ----------------------------------------------------------------------------
export function parseDegree(degree) {
  if (typeof degree === "number") {
    return Number.isInteger(degree) ? { step: degree, alter: 0 } : null;
  }
  const match = /^(-?\d+)([#b]?)$/.exec(String(degree).trim());
  if (!match) return null;
  return {
    step: Number(match[1]),
    alter: match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0,
  };
}

// Degré -> demi-tons au-dessus de la tonique. Au-delà de 6, on monte
// d'octave : le degré 7 est l'octave de la tonique, le 8 sa seconde.
export function degreeToSemitones(degree) {
  const parsed = parseDegree(degree);
  if (parsed === null) return null;
  const octave = Math.floor(parsed.step / 7);
  const step = ((parsed.step % 7) + 7) % 7;
  return octave * 12 + MAJOR_SCALE[step] + parsed.alter;
}

// Miroir d'un degré, pour le mouvement contraire. L'altération change de signe
// avec le degré : le miroir d'une quarte **augmentée** au-dessus de la tonique
// est une quarte **diminuée** en dessous — c'est l'intervalle qui se renverse,
// pas seulement sa direction. Sans cela une octave chromatique en contraire
// sonnerait faux d'un demi-ton à chaque note noire.
export function negateDegree(degree) {
  const parsed = parseDegree(degree);
  if (parsed === null) return degree;
  if (parsed.alter === 0) return -parsed.step;
  return `${-parsed.step}${parsed.alter > 0 ? "b" : "#"}`;
}

// Hauteur de la tonique pour une main : Do4 à droite, Do3 à gauche.
export function tonicMidi(keyId, hand) {
  const key = KEYS[keyId];
  const octave = HAND_TONIC_OCTAVE[hand];
  if (!key || octave === undefined) return null;
  return (octave + 1) * 12 + key.tonicPitchClass;
}

// Un pas est un degré seul ou un accord : on ramène tout à un tableau pour ne
// traiter qu'un seul cas ensuite.
function asChord(step) {
  return Array.isArray(step) ? step : [step];
}

// ----------------------------------------------------------------------------
//  Normalisation d'un pas
//
//  Un pas s'écrit sous deux formes dans le catalogue : la forme courte — un
//  degré, ou un tableau de degrés joués ensemble — et la forme longue, un objet
//  qui ajoute ce que la courte ne sait pas dire :
//
//      { degrees, beats, holdBeats, accent }
//
//  `beats` est la durée **propre** du pas : c'est elle qui avance le curseur, et
//  c'est ainsi qu'un rythme pointé s'écrit (0.75 puis 0.25). `holdBeats` est la
//  durée **sonnante** d'un degré, qui peut déborder sur les pas suivants sans
//  les décaler : c'est la note tenue pendant que les autres doigts jouent, le
//  cœur du déliage réel (Schmitt, Dohnányi). Les deux sont indépendantes.
// ----------------------------------------------------------------------------
export function normalizeStep(step, defaultBeats) {
  const isObject = step !== null && typeof step === "object" && !Array.isArray(step);
  const degrees = asChord(isObject ? step.degrees : step);
  const beats = isObject && Number.isFinite(step.beats) ? step.beats : defaultBeats;

  // `holdBeats` vaut soit une durée pour tout le pas, soit une durée par degré.
  // À défaut, un degré sonne la durée du pas : c'est le comportement d'origine.
  const holds = isObject && step.holdBeats !== undefined ? asChord(step.holdBeats) : [];

  return {
    degrees,
    beats,
    holdBeats: degrees.map((_, index) => {
      const hold = holds.length === 1 ? holds[0] : holds[index];
      return Number.isFinite(hold) ? hold : beats;
    }),
    velocity: isObject && step.accent ? ACCENT_VELOCITY : VELOCITY,
  };
}

// ----------------------------------------------------------------------------
//  Un motif, ou un motif par main
//
//  La plupart des exercices ont **un** motif que les deux mains jouent, en
//  parallèle ou en miroir (`bothMode`) : c'est le cas courant et il ne faut pas
//  l'alourdir. Mais deux contre trois, un canon à un temps, une main legato et
//  l'autre piquée ne s'écrivent pas comme un motif commun. Ces exercices-là
//  déclarent `patternByHand: { right, left }`, chaque main ayant son motif et
//  son doigté de même longueur.
//
//  Contrainte : les deux motifs doivent totaliser le **même nombre de temps**,
//  sinon la deuxième série d'une main partirait avant celle de l'autre. Le
//  harnais du catalogue le vérifie.
// ----------------------------------------------------------------------------
export function patternOf(exercise, hand = "right") {
  if (exercise.patternByHand) {
    return exercise.patternByHand[hand] ?? exercise.patternByHand.right;
  }
  return exercise.pattern;
}

// Les mains qui ont leur propre motif. Un exercice à motif commun n'en a
// aucune : c'est ce qui distingue les deux formes sans avoir à tester le champ
// partout.
export function hasPatternByHand(exercise) {
  return Boolean(exercise.patternByHand);
}

// Les pas d'un exercice, dans l'ordre, avec leur durée résolue.
export function stepsOf(exercise, hand = "right") {
  const defaultBeats = exercise.beatsPerStep;
  return patternOf(exercise, hand).map((step) => normalizeStep(step, defaultBeats));
}

// Temps réellement joués d'une série, respiration exclue. C'est une **somme**
// et non un produit : depuis les rythmes pointés et les groupes irréguliers,
// deux pas d'un même exercice n'ont plus la même durée.
export function playedBeatsPerRepetition(exercise, hand = "right") {
  return stepsOf(exercise, hand).reduce((total, step) => total + step.beats, 0);
}

// Nombre de temps d'une série, respiration comprise.
export function beatsPerRepetition(exercise, hand = "right") {
  return playedBeatsPerRepetition(exercise, hand) + exercise.restBeats;
}

// « Répéter le motif sans rupture de mesure » (plan/03 étape B) : une série doit
// occuper un nombre entier de mesures, sinon la deuxième ne tomberait plus sur
// un premier temps. La comparaison se fait à `BEAT_EPSILON` près : cinq pas de
// 1/5 de temps font un temps en musique, pas tout à fait en binaire.
export function isBarAligned(exercise) {
  const perBar = exercise.beatsPerBar ?? DEFAULT_BEATS_PER_BAR;
  const hands = hasPatternByHand(exercise) ? ["right", "left"] : ["right"];
  return hands.every((hand) => {
    const remainder = beatsPerRepetition(exercise, hand) % perBar;
    return remainder < BEAT_EPSILON || perBar - remainder < BEAT_EPSILON;
  });
}

// Les deux motifs d'un exercice à deux mains doivent totaliser le même nombre
// de temps : sinon la deuxième série d'une main partirait avant celle de
// l'autre, et les deux lignes se décaleraient un peu plus à chaque répétition.
export function handsAgreeOnLength(exercise) {
  if (!hasPatternByHand(exercise)) return true;
  const right = playedBeatsPerRepetition(exercise, "right");
  const left = playedBeatsPerRepetition(exercise, "left");
  return Math.abs(right - left) < BEAT_EPSILON;
}

export function canGenerate(exercise, hand, keyId = "C") {
  if (!exercise) return false;
  if (!exercise.supportedKeys.includes(keyId)) return false;
  return supportsHand(exercise, hand);
}

// Doigté d'une main dans une tonalité. Une gamme ne se doigte pas pareil en Do
// et en Fa — main droite, si♭ se prend avec le 4 —, alors qu'un motif en
// position fixe garde le même doigté partout. `fingeringByKey` ne surcharge donc
// que ce qui change réellement ; le reste est hérité de `fingering`.
export function fingeringFor(exercise, hand, keyId = "C") {
  return exercise.fingeringByKey?.[keyId]?.[hand] ?? exercise.fingering[hand];
}

// ----------------------------------------------------------------------------
//  Génération
//
//  `startTime` décale tout l'exercice sur la timeline commune au décompte et au
//  Transport (cf. `metronome.js` : `t = 0` est la première pulsation du
//  décompte, la première note tombe à `grid.startTime`).
// ----------------------------------------------------------------------------
export function generateExercise(
  exercise,
  { hand, key = "C", tempo, repetitions, startTime = 0 } = {}
) {
  if (!canGenerate(exercise, hand, key)) return null;

  const bpm = clampTempo(tempo ?? exercise.defaultTempo);
  const series = clampRepetitions(repetitions ?? exercise.defaultRepetitions);
  const secondsPerBeat = 60 / bpm;
  const stepBeats = exercise.beatsPerStep;

  // En mouvement parallèle les deux mains jouent le même motif à l'octave ; en
  // mouvement contraire la gauche joue le degré **opposé**, et s'éloigne donc
  // pendant que la droite monte. Une main seule ne produit que sa propre ligne.
  const hands = hand === "both" ? ["left", "right"] : [hand];
  // Le miroir suit la main, pas le mode de jeu : travailler la main gauche
  // seule doit faire travailler **sa** ligne — celle qui descend —, pas celle
  // de la droite. Sinon son doigté écrit ne correspondrait à rien.
  const contrary = exercise.bothMode === "contrary";

  // Ce que chaque main a à jouer, résolu une fois. Avec un motif commun les
  // deux entrées sont identiques ; avec `patternByHand` elles diffèrent, et
  // chacune a ses propres rangs de pas.
  //
  // Le rang d'un pas s'**accumule** : les durées n'étant plus toutes égales, il
  // ne se recalcule pas depuis son index. Les rangs sont exposés plus bas, pour
  // que le bilan puisse dire « mesure 2, temps 3 » plutôt que « pas 11 ».
  const lines = new Map();
  for (const noteHand of hands) {
    const steps = stepsOf(exercise, noteHand);
    const offsets = [];
    let cursor = 0;
    for (const step of steps) {
      offsets.push(cursor);
      cursor += step.beats;
    }
    lines.set(noteHand, {
      steps,
      offsets,
      playedBeats: cursor,
      root: tonicMidi(key, noteHand),
      fingering: fingeringFor(exercise, noteHand, key),
      mirror: contrary && noteHand === "left",
    });
  }

  // La grille des séries est commune aux deux mains : c'est la plus longue des
  // deux lignes qui la fixe, pour qu'une main plus courte n'écourte pas la
  // série de l'autre. Les deux sont censées être égales — le harnais du
  // catalogue le vérifie —, et prendre le maximum est le comportement sûr si
  // elles ne le sont pas.
  const playedPerRepetition = Math.max(...[...lines.values()].map((l) => l.playedBeats));
  const perRepetition = playedPerRepetition + exercise.restBeats;

  const notes = [];
  for (let series_ = 0; series_ < series; series_++) {
    const repetitionStart = startTime + series_ * perRepetition * secondsPerBeat;

    for (const [noteHand, line] of lines) {
      line.steps.forEach((step, stepIndex) => {
        const time = repetitionStart + line.offsets[stepIndex] * secondsPerBeat;
        // Le doigté reste écrit dans l'ordre des degrés du motif, **avant**
        // miroir : en contraire, l'ordre ascendant s'inverserait sinon.
        const fingers = asChord(line.fingering[stepIndex]);

        step.degrees.forEach((degree, degreeIndex) => {
          // La durée sonnante est celle du degré, pas celle du pas : c'est ce
          // qui laisse une note tenue déborder sur les pas suivants.
          const duration = step.holdBeats[degreeIndex] * secondsPerBeat * HELD_FRACTION;

          notes.push({
            midi:
              line.root +
              degreeToSemitones(line.mirror ? negateDegree(degree) : degree),
            time,
            duration,
            endTime: time + duration,
            velocity: step.velocity,
            hand: noteHand,
            finger: fingers[degreeIndex] ?? null,
            repetition: series_ + 1,
            // Rang du pas dans le motif : c'est lui qui permet de dire « c'est
            // le troisième accord qui pose problème » (plan/03 § 9).
            step: stepIndex,
          });
        });
      });
    }
  }

  // Même tri que `buildSong()` du mode Morceau : les recherches par dichotomie
  // du rendu supposent des notes ordonnées par temps de départ.
  notes.sort((a, b) => a.time - b.time || a.midi - b.midi);

  // La respiration de la **dernière** série ne compte pas : le métronome
  // s'arrête sur la dernière note, il ne bat pas dans le vide.
  const playedBeats = series * perRepetition - exercise.restBeats;

  // Position sur la grille, en temps. Une division par `secondsPerBeat` ne
  // retombe pas toujours sur un compte rond — 60/63 n'a pas d'écriture binaire
  // exacte —, et l'écart, minuscule, suffit à faire basculer une comparaison de
  // frontière. On le ramène donc au temps entier le plus proche quand il en est
  // à moins de `BEAT_EPSILON`.
  function beatsAt(seconds) {
    const beats = (seconds - startTime) / secondsPerBeat;
    const rounded = Math.round(beats);
    return Math.abs(beats - rounded) < BEAT_EPSILON ? rounded : beats;
  }
  const endTime = notes.length
    ? notes.reduce((max, note) => Math.max(max, note.endTime), 0)
    : startTime;

  return {
    exerciseId: exercise.id,
    hand,
    key,
    tempo: bpm,
    repetitions: series,
    notes,
    beatsPerBar: exercise.beatsPerBar ?? DEFAULT_BEATS_PER_BAR,
    beatsPerStep: stepBeats,
    beatsPerRepetition: perRepetition,
    // Avec `patternByHand`, les deux mains n'ont pas forcément le même nombre
    // de pas — deux croches contre trois triolets. On annonce le plus grand :
    // c'est le nombre de rangs que le bilan par pas peut rencontrer.
    stepsPerRepetition: Math.max(...[...lines.values()].map((l) => l.steps.length)),
    // Rang de chaque pas en temps depuis le début de la série, et durée du plus
    // court : le rouleau s'en sert pour décider combien de mesures afficher.
    // Les rangs sont ceux de la main droite quand elle joue, sinon de la main
    // seule — un exercice à deux motifs n'a pas *une* grille de pas.
    stepOffsets: (lines.get("right") ?? lines.get(hands[0])).offsets,
    shortestStepBeats: [...lines.values()].reduce(
      (min, line) => line.steps.reduce((m, step) => Math.min(m, step.beats), min),
      Infinity
    ),
    playedBeats,
    startTime,
    endTime,
    duration: endTime - startTime,
    maxNoteDuration: notes.reduce((max, note) => Math.max(max, note.duration), 0),
    lowMidi: notes.reduce((min, note) => Math.min(min, note.midi), Infinity),
    highMidi: notes.reduce((max, note) => Math.max(max, note.midi), -Infinity),

    // Série en cours à cet instant, de 1 à `repetitions` : c'est le « 3 / 8 »
    // de l'écran d'exercice (plan/03 § 8). Avant le départ, on annonce déjà la
    // première.
    repetitionAt(seconds) {
      const beats = beatsAt(seconds);
      if (beats < 0) return 1;
      return Math.min(series, Math.floor(beats / perRepetition) + 1);
    },

    // Vrai pendant la respiration : l'écran peut alors le dire plutôt que de
    // laisser croire à un trou dans l'exercice.
    isResting(seconds) {
      if (exercise.restBeats === 0) return false;
      const beats = beatsAt(seconds);
      if (beats < 0 || beats >= playedBeats) return false;
      let inRepetition = beats % perRepetition;
      // Un instant qui tombe pile sur une frontière de série peut, en binaire,
      // s'écrire juste en dessous : sans cette correction, le premier temps
      // d'une série serait pris pour la fin de la respiration de la précédente.
      // Le cas se voit dès qu'un temps n'est pas rond — à 63 bpm par exemple.
      if (perRepetition - inRepetition < BEAT_EPSILON) inRepetition = 0;
      // `playedPerRepetition` est la somme des durées de pas : la respiration
      // commence là où le motif s'arrête, quelles que soient les durées qui
      // l'ont composé — et, à deux motifs, là où le plus long s'arrête.
      return inRepetition >= playedPerRepetition;
    },
  };
}
