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

export const MIN_REPETITIONS = 1;
export const MAX_REPETITIONS = 16;

export function clampRepetitions(count) {
  if (!Number.isFinite(count)) return MIN_REPETITIONS;
  return Math.min(MAX_REPETITIONS, Math.max(MIN_REPETITIONS, Math.round(count)));
}

// Degré diatonique -> demi-tons au-dessus de la tonique. Au-delà de 6, on monte
// d'octave : le degré 7 est l'octave de la tonique, le 8 sa seconde.
export function degreeToSemitones(degree) {
  const octave = Math.floor(degree / 7);
  const step = ((degree % 7) + 7) % 7;
  return octave * 12 + MAJOR_SCALE[step];
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

// Nombre de temps d'une série, respiration comprise.
export function beatsPerRepetition(exercise) {
  return exercise.pattern.length * exercise.beatsPerStep + exercise.restBeats;
}

// « Répéter le motif sans rupture de mesure » (plan/03 étape B) : une série doit
// occuper un nombre entier de mesures, sinon la deuxième ne tomberait plus sur
// un premier temps.
export function isBarAligned(exercise) {
  const perBar = exercise.beatsPerBar ?? DEFAULT_BEATS_PER_BAR;
  return beatsPerRepetition(exercise) % perBar === 0;
}

export function canGenerate(exercise, hand, keyId = "C") {
  if (!exercise) return false;
  if (!exercise.supportedKeys.includes(keyId)) return false;
  return supportsHand(exercise, hand);
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
  const perRepetition = beatsPerRepetition(exercise);

  // Les deux mains jouent le même motif à l'octave (le seul `bothMode` défini
  // pour l'instant) ; une main seule ne produit que sa propre ligne.
  const hands = hand === "both" ? ["left", "right"] : [hand];

  const notes = [];
  for (let series_ = 0; series_ < series; series_++) {
    const repetitionStart = startTime + series_ * perRepetition * secondsPerBeat;

    exercise.pattern.forEach((step, stepIndex) => {
      const time = repetitionStart + stepIndex * stepBeats * secondsPerBeat;
      const duration = stepBeats * secondsPerBeat * HELD_FRACTION;

      for (const noteHand of hands) {
        const root = tonicMidi(key, noteHand);
        const degrees = asChord(step);
        const fingers = asChord(exercise.fingering[noteHand][stepIndex]);

        degrees.forEach((degree, degreeIndex) => {
          notes.push({
            midi: root + degreeToSemitones(degree),
            time,
            duration,
            endTime: time + duration,
            velocity: VELOCITY,
            hand: noteHand,
            finger: fingers[degreeIndex] ?? null,
            repetition: series_ + 1,
            // Rang du pas dans le motif : c'est lui qui permet de dire « c'est
            // le troisième accord qui pose problème » (plan/03 § 9).
            step: stepIndex,
          });
        });
      }
    });
  }

  // Même tri que `buildSong()` du mode Morceau : les recherches par dichotomie
  // du rendu supposent des notes ordonnées par temps de départ.
  notes.sort((a, b) => a.time - b.time || a.midi - b.midi);

  // La respiration de la **dernière** série ne compte pas : le métronome
  // s'arrête sur la dernière note, il ne bat pas dans le vide.
  const playedBeats = series * perRepetition - exercise.restBeats;
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
    stepsPerRepetition: exercise.pattern.length,
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
      const beats = (seconds - startTime) / secondsPerBeat;
      if (beats < 0) return 1;
      return Math.min(series, Math.floor(beats / perRepetition) + 1);
    },

    // Vrai pendant la respiration : l'écran peut alors le dire plutôt que de
    // laisser croire à un trou dans l'exercice.
    isResting(seconds) {
      if (exercise.restBeats === 0) return false;
      const beats = (seconds - startTime) / secondsPerBeat;
      if (beats < 0 || beats >= playedBeats) return false;
      const inRepetition = beats % perRepetition;
      return inRepetition >= exercise.pattern.length * stepBeats;
    },
  };
}
