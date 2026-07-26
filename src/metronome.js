// ============================================================================
//  Métronome partagé — décompte et pulsation
//
//  Deux couches nettement séparées, comme ailleurs dans le projet : une grille
//  de pulsation purement arithmétique et un ordonnanceur qui la joue. La grille
//  ne connaît ni le DOM, ni le Canvas, ni Tone.js : elle est testable dans Node
//  et c'est elle que réutilisera l'Entraînement rythmique (plan/05) pour situer
//  une frappe par rapport à la pulsation — `nearestBeat()` existe pour lui, pas
//  pour les exercices techniques.
//
//  Convention de temps : `t = 0` est la **première pulsation du décompte**, pas
//  la première note. L'exercice commence donc à `grid.startTime`. Une seule
//  origine pour la grille, les notes et le Transport évite les décalages d'une
//  mesure au démarrage et à la reprise après pause (plan/03 § 14).
// ============================================================================

export const DEFAULT_BEATS_PER_BAR = 4;

// Une mesure de décompte avant la première note (plan/03 § 8). Deux mesures
// n'apportent rien à ce tempo et font attendre pour rien.
export const DEFAULT_COUNT_IN_BARS = 1;

// Bornes de tempo : en dessous de 30, la pulsation ne se sent plus ; au-delà de
// 208, on sort de ce qu'un métronome mécanique sait faire — et des exercices
// que ce mode propose.
export const MIN_BPM = 30;
export const MAX_BPM = 208;

export function clampTempo(bpm) {
  if (!Number.isFinite(bpm)) return MIN_BPM;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

// ----------------------------------------------------------------------------
//  Grille de pulsation
//
//  Tout se déduit de trois nombres. Aucune méthode ne conserve d'état : la même
//  grille peut être interrogée par le rendu, par l'audio et par les tests sans
//  qu'ils se gênent.
// ----------------------------------------------------------------------------
export function createBeatGrid({
  bpm,
  beatsPerBar = DEFAULT_BEATS_PER_BAR,
  countInBars = DEFAULT_COUNT_IN_BARS,
} = {}) {
  const tempo = clampTempo(bpm);
  const perBar = Math.max(1, Math.round(beatsPerBar));
  const bars = Math.max(0, Math.round(countInBars));
  const secondsPerBeat = 60 / tempo;
  const countInBeats = perBar * bars;

  return {
    bpm: tempo,
    beatsPerBar: perBar,
    countInBars: bars,
    countInBeats,
    secondsPerBeat,

    // Instant de la première note de l'exercice.
    startTime: countInBeats * secondsPerBeat,

    timeOf(beat) {
      return beat * secondsPerBeat;
    },

    // Pulsation en cours à cet instant. Négatif impossible : avant le départ,
    // on est déjà sur la première pulsation du décompte.
    beatAt(seconds) {
      return Math.max(0, Math.floor(seconds / secondsPerBeat));
    },

    isCountIn(beat) {
      return beat < countInBeats;
    },

    // Rang dans la mesure, 0 pour le premier temps. Le décompte et l'exercice
    // partagent le même découpage : la première note tombe donc toujours sur un
    // premier temps.
    beatInBar(beat) {
      return ((beat % perBar) + perBar) % perBar;
    },

    // Ce qu'affiche le décompte : « 1 », « 2 », « 3 », « 4 ».
    countLabel(beat) {
      return this.beatInBar(beat) + 1;
    },
  };
}

// Pulsation la plus proche d'un instant, avec l'écart signé en millisecondes
// (négatif = en avance). Destinée à plan/05 § 5 : les seuils avance légère /
// avance nette appartiennent à la vue, pas à cette mesure (plan/F3 § 7).
export function nearestBeat(grid, seconds) {
  const beat = Math.max(0, Math.round(seconds / grid.secondsPerBeat));
  const time = grid.timeOf(beat);
  return { beat, time, deviationMs: (seconds - time) * 1000 };
}

// ----------------------------------------------------------------------------
//  Lecture de la grille
//
//  `schedule(time, beat)` est fourni par l'appelant : dans le navigateur il
//  planifie un clic sur le Transport de Tone, dans les tests il enregistre
//  l'appel. C'est ce qui garde ce module hors du navigateur tout en évitant que
//  chaque mode réinvente « quels temps cliquent et lequel est accentué ».
// ----------------------------------------------------------------------------
export function scheduleClicks(grid, totalBeats, { schedule }) {
  const beats = [];
  for (let beat = 0; beat < totalBeats; beat++) {
    const info = {
      beat,
      time: grid.timeOf(beat),
      accent: grid.beatInBar(beat) === 0,
      countIn: grid.isCountIn(beat),
    };
    beats.push(info);
    schedule(info);
  }
  return beats;
}
