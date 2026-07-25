// ============================================================================
//  Mode Morceau — Feature 01 « Apprentissage d'un morceau »
//  Chargement / parsing MIDI, grille de repères (mesures + Do/Mi),
//  lecture audio (Tone.js) et curseur de lecture play/pause synchronisé.
//
//  Modèle d'affichage :
//    - Axe X  = hauteur des notes (clavier piano de gauche à droite)
//    - Axe Y  = temps. Le bas du canvas = début du morceau ; on défile
//               vers le HAUT pour avancer dans le morceau.
//
//  Source de vérité : `state.currentTime` (en secondes). Le défilement en
//  est dérivé, si bien que la lecture automatique et le défilement manuel
//  (scrubbing) partagent exactement la même logique.
//
//  Cycle de vie (contrat de la navigation, cf. plan/F1-navigation.md) :
//  `start(container)` crée le canvas dans `container`, affiche les contrôles
//  propres au mode et branche ses écouteurs ; `stop()` coupe le son, annule
//  les boucles requestAnimationFrame et les minuteries, puis retire tous ces
//  écouteurs. Rien de ce mode ne doit survivre à `stop()`.
// ============================================================================

import { Midi } from "https://cdn.jsdelivr.net/npm/@tonejs/midi@2.0.28/+esm";
import * as Tone from "https://cdn.jsdelivr.net/npm/tone@14.8.49/+esm";
import { isForcedLandscape, VIEWPORT_CHANGE_EVENT } from "./viewport.js";

// ----------------------------------------------------------------------------
//  Constantes de configuration
// ----------------------------------------------------------------------------
const MIDI_LOW = 21;            // A0  : note la plus grave d'un piano 88 touches
const MIDI_HIGH = 108;          // C8  : note la plus aiguë
const PIXELS_PER_SECOND = 140;  // échelle temporelle verticale
const SPLIT_NOTE = 60;          // Do central : seuil graves/aigus pour le fallback
const KEY_PRESS_MS = 220;       // durée de l'assombrissement après un clic sur une touche
const FULL_PIANO_SAMPLES = {
  A0: "A0.mp3",
  C1: "C1.mp3",
  "D#1": "Ds1.mp3",
  "F#1": "Fs1.mp3",
  A1: "A1.mp3",
  C2: "C2.mp3",
  "D#2": "Ds2.mp3",
  "F#2": "Fs2.mp3",
  A2: "A2.mp3",
  C3: "C3.mp3",
  "D#3": "Ds3.mp3",
  "F#3": "Fs3.mp3",
  A3: "A3.mp3",
  C4: "C4.mp3",
  "D#4": "Ds4.mp3",
  "F#4": "Fs4.mp3",
  A4: "A4.mp3",
  C5: "C5.mp3",
  "D#5": "Ds5.mp3",
  "F#5": "Fs5.mp3",
  A5: "A5.mp3",
  C6: "C6.mp3",
  "D#6": "Ds6.mp3",
  "F#6": "Fs6.mp3",
  A6: "A6.mp3",
  C7: "C7.mp3",
  "D#7": "Ds7.mp3",
  "F#7": "Fs7.mp3",
  A7: "A7.mp3",
  C8: "C8.mp3",
};
const LIGHT_PIANO_SAMPLES = {
  A0: "A0.mp3",
  C1: "C1.mp3",
  C2: "C2.mp3",
  C3: "C3.mp3",
  C4: "C4.mp3",
  C5: "C5.mp3",
  C6: "C6.mp3",
  C7: "C7.mp3",
  C8: "C8.mp3",
};

function detectPerformanceProfile() {
  const override = new URLSearchParams(window.location.search).get("performance");
  const memory = Number(navigator.deviceMemory) || 0;
  const cores = Number(navigator.hardwareConcurrency) || 0;
  const memoryLimited = memory > 0 && memory <= 4;
  const cpuLimited = cores > 0 && cores <= 4;
  const constrained =
    override === "low" ||
    (override !== "high" && (memoryLimited || cpuLimited));

  return Object.freeze({
    constrained,
    maxCanvasDpr: constrained ? 1.5 : Infinity,
    maxCanvasPixels: constrained ? 1_500_000 : 8_000_000,
    minFrameInterval: constrained ? 30 : 12,
    transportUiInterval: constrained ? 100 : 50,
    lightAudio: constrained,
  });
}

const PERFORMANCE_PROFILE = detectPerformanceProfile();

// Demi-tons appartenant à une touche blanche (Do, Ré, Mi, Fa, Sol, La, Si)
const WHITE_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11];

// --- Notation musicale (mini-portée) ----------------------------------------
const LATIN_NAMES = ["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"];
// Degré diatonique (0..6) de chaque demi-ton ; les noires reprennent le degré
// de la blanche située juste en dessous + une altération dièse.
const PC_TO_DEGREE = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const SHARP_PCS = new Set([1, 3, 6, 8, 10]);

// Référence : ligne du bas de la portée
//   - Clé de sol  -> Mi3 (MIDI 64)  index diatonique 37
//   - Clé de fa   -> Sol1 (MIDI 43) index diatonique 25
const TREBLE_BOTTOM = 37;
const BASS_BOTTOM = 25;

function diatonicIndex(midi) {
  const pc = ((midi % 12) + 12) % 12;
  return Math.floor(midi / 12) * 7 + PC_TO_DEGREE[pc];
}

// Position verticale sur la portée, en demi-interlignes (0 = ligne du bas,
// +1 par degré vers le haut). Les lignes sont aux valeurs paires 0,2,4,6,8.
function staffStep(midi, clef) {
  return diatonicIndex(midi) - (clef === "treble" ? TREBLE_BOTTOM : BASS_BOTTOM);
}

function noteDegreeName(midi) {
  const pc = ((midi % 12) + 12) % 12;
  return LATIN_NAMES[PC_TO_DEGREE[pc]] + (SHARP_PCS.has(pc) ? "♯" : "");
}

const COLORS = {
  background: "#0d1117",
  gridMeasure: "#3a4150",
  gridDoMi: "#262c36",
  blackKey: "#0a0d12",
  rightHand: "#4ea1ff",
  rightHandEdge: "#9ccbff",
  rightHandDark: "#1a4a8a",  // touche noire (dièse/bémol), main droite : bleu foncé
  leftHand: "#2ecc71",
  leftHandEdge: "#86e9b0",
  leftHandDark: "#177a40",   // touche noire (dièse/bémol), main gauche : vert foncé
  active: "#ffffff",
  cursor: "#ffae57",
  pedal: "#d2a8ff",
  label: "#6e7681",
  cardBg: "#f6f1e3", // fond « papier » des mini-portées
  ink: "#1b1b1b",    // encre des portées / notes
};

// ----------------------------------------------------------------------------
//  Fiche de la fonctionnalité (registre de la navigation)
// ----------------------------------------------------------------------------
export const songFeature = {
  id: "song",
  title: "Morceau",
  description:
    "Charger un morceau et suivre les notes qui défilent jusqu'au piano.",
  status: "available",
  start,
  stop,
};

// ----------------------------------------------------------------------------
//  État de la session en cours
//
//  Tout l'état du mode vit dans un objet recréé par `start()` : une session
//  arrêtée ne peut donc plus rien modifier de la suivante. Les rappels
//  asynchrones (chargement d'un morceau, initialisation audio) capturent leur
//  session et abandonnent si elle porte `stopped`.
// ----------------------------------------------------------------------------
let container = null;    // scène fournie par la navigation
let canvas = null;
let ctx = null;
let state = null;
let listeners = null;    // AbortController : retire tous les écouteurs d'un coup

function createSession() {
  return {
    stopped: false,
    song: null,        // morceau parsé (voir buildSong)
    currentTime: 0,    // position de lecture, en secondes (source de vérité)
    isPlaying: false,
    showNotation: false, // mini-portées sur les notes (désactivées par défaut)
    speed: 1,           // multiplicateur de vitesse de lecture (1 = normal)
    dpr: 1,
    pressedKeys: new Set(), // touches enfoncées au clic (assombrissement temporaire)
    keyPressTimers: new Set(), // minuteries de relâchement visuel des touches
    activeKeys: new Uint8Array(128),
    pendingDraw: null,
    pendingResize: null,
    pendingUiSync: false,
    lastTransportUiUpdate: -Infinity,
    lastVisualFrame: -Infinity,
    animationFrame: null,

    // Audio (Tone.js), initialisé paresseusement au premier play
    audioReady: false,
    audioPromise: null,
    playPending: false,
    synth: null,
    reverb: null,
    part: null,
  };
}

// Vrai tant que la session en cours peut dessiner. Les rappels différés
// (requestAnimationFrame, setTimeout, promesses) passent par ici pour ne
// jamais toucher un canvas déjà retiré du document.
function isRunning() {
  return state !== null && !state.stopped && ctx !== null;
}

// ----------------------------------------------------------------------------
//  Persistance des réglages (localStorage)
//
//  On mémorise les derniers réglages — vitesse, notation, morceau et position
//  de lecture — pour les restaurer au prochain chargement. L'écriture est
//  périodique (une fois par minute, cf. startAutoSave) plutôt qu'à chaque
//  changement.
// ----------------------------------------------------------------------------
const STORAGE_KEY = "synthesia.settings";
const AUTOSAVE_INTERVAL_MS = 60_000; // une sauvegarde par minute

function saveSettings() {
  // Le morceau n'est restaurable que s'il provient de la bibliothèque : un
  // fichier importé par l'utilisateur n'est pas re-téléchargeable. On retient
  // l'indice ET le titre pour rester robuste à un réordonnancement de songs.json.
  const idx = parseInt(document.getElementById("songSelect").value, 10);
  const fromLibrary = !isNaN(idx) && songLibrary[idx];
  const data = {
    speed: state.speed,
    showNotation: state.showNotation,
    currentTime: state.currentTime,
    songIndex: fromLibrary ? idx : null,
    songTitle: fromLibrary ? songLibrary[idx].title : null,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota dépassé ou storage indisponible (navigation privée) : on ignore */
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let autoSaveTimer = null;
function startAutoSave() {
  if (autoSaveTimer !== null) return;
  autoSaveTimer = setInterval(saveSettings, AUTOSAVE_INTERVAL_MS);
}

function stopAutoSave() {
  if (autoSaveTimer === null) return;
  clearInterval(autoSaveTimer);
  autoSaveTimer = null;
}

// ----------------------------------------------------------------------------
//  Disposition du clavier : position horizontale de chaque note MIDI
// ----------------------------------------------------------------------------
function isWhite(midi) {
  return WHITE_PITCH_CLASSES.includes(((midi % 12) + 12) % 12);
}

const WHITE_INDEX_BY_MIDI = new Int16Array(128);
const TOTAL_WHITE_KEYS = (() => {
  let index = 0;
  let total = 0;
  for (let midi = 0; midi < 128; midi++) {
    if (midi < MIDI_LOW) {
      WHITE_INDEX_BY_MIDI[midi] = 0;
      continue;
    }
    WHITE_INDEX_BY_MIDI[midi] = index;
    if (isWhite(midi)) index++;
    if (midi === MIDI_HIGH) total = index;
  }
  return total;
})();
const ACTIVE_NONE = 0;
const ACTIVE_LEFT = 1;
const ACTIVE_RIGHT = 2;
const layout = {
  width: 0,
  height: 0,
  keyboardHeight: 0,
  keyboardTop: 0,
  whiteKeyWidth: 0,
  noteGeometries: new Array(128),
  whiteGradients: null,
  blackGradients: null,
};

function whiteIndex(midi) {
  return WHITE_INDEX_BY_MIDI[midi];
}

function whiteKeyWidth() {
  return layout.whiteKeyWidth;
}

function noteGeometry(midi) {
  return layout.noteGeometries[midi];
}

function makeGradient(top, bottom, topColor, bottomColor) {
  const gradient = ctx.createLinearGradient(0, top, 0, bottom);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  return gradient;
}

function rebuildLayout(w, h) {
  layout.width = w;
  layout.height = h;
  layout.keyboardHeight = calculateKeyboardHeight(w, h);
  layout.keyboardTop = h - layout.keyboardHeight;
  layout.whiteKeyWidth = w / TOTAL_WHITE_KEYS;

  for (let midi = 0; midi < 128; midi++) {
    const keyWidth = layout.whiteKeyWidth;
    if (isWhite(midi)) {
      const x = whiteIndex(midi) * keyWidth;
      layout.noteGeometries[midi] = {
        x,
        width: keyWidth,
        centerX: x + keyWidth / 2,
        white: true,
      };
      continue;
    }

    const centerX = whiteIndex(midi - 1) * keyWidth + keyWidth;
    const blackWidth = keyWidth * 0.62;
    layout.noteGeometries[midi] = {
      x: centerX - blackWidth / 2,
      width: blackWidth,
      centerX,
      white: false,
    };
  }

  const whiteTop = layout.keyboardTop + 3;
  const whiteHeight = layout.keyboardHeight - 3;
  const blackHeight = whiteHeight * 0.62;
  layout.whiteGradients = [
    makeGradient(whiteTop, whiteTop + whiteHeight, "#ffffff", "#d7d0c2"),
    makeGradient(whiteTop, whiteTop + whiteHeight, COLORS.leftHandEdge, COLORS.leftHand),
    makeGradient(whiteTop, whiteTop + whiteHeight, COLORS.rightHandEdge, COLORS.rightHand),
  ];
  layout.blackGradients = [
    makeGradient(whiteTop, whiteTop + blackHeight, "#2b313b", "#080a0e"),
    makeGradient(whiteTop, whiteTop + blackHeight, COLORS.leftHand, COLORS.leftHandDark),
    makeGradient(whiteTop, whiteTop + blackHeight, COLORS.rightHand, COLORS.rightHandDark),
  ];
}

function whiteLeftEdge(midi) {
  return whiteIndex(midi) * layout.whiteKeyWidth;
}

// ----------------------------------------------------------------------------
//  Clavier en bas de l'écran : hauteur et bord supérieur.
//  Les notes « tombent » et atterrissent sur les touches ; le bord supérieur
//  du clavier sert de ligne de lecture (playhead).
// ----------------------------------------------------------------------------
function calculateKeyboardHeight(w, h) {
  // Mobile en paysage : on réduit le clavier pour laisser plus de place aux notes.
  if (w > h && h <= 500) {
    return Math.round(Math.min(96, Math.max(60, h * 0.14)));
  }

  // Mobile en portrait : clavier plus court pour libérer de la hauteur à la
  // chute des notes (l'en-tête occupe déjà une bonne part de l'écran).
  if (w <= 899) {
    return Math.round(Math.min(112, Math.max(76, h * 0.15)));
  }

  return Math.round(Math.min(150, Math.max(96, h * 0.18)));
}

function keyboardTop() {
  return layout.keyboardTop;
}

// ----------------------------------------------------------------------------
//  Temps <-> coordonnée écran (Y)
//
//  La ligne de lecture (playhead) est fixe à `playheadY` (= haut du clavier).
//  La note dont le temps vaut `currentTime` s'y trouve toujours. On en déduit :
//      screenY(time) = playheadY - (time - currentTime) * PIXELS_PER_SECOND
//  Le temps croît vers le haut (delta positif => plus haut).
// ----------------------------------------------------------------------------
function playheadY() {
  return keyboardTop();
}

function timeToScreenY(time) {
  return playheadY() - (time - state.currentTime) * PIXELS_PER_SECOND;
}

// Inverse : à quel temps correspond une position écran (pour le clic-seek)
function screenYToTime(y) {
  return state.currentTime + (playheadY() - y) / PIXELS_PER_SECOND;
}

// ----------------------------------------------------------------------------
//  Construction d'un « song » normalisé à partir d'un objet Midi (Tone.js)
// ----------------------------------------------------------------------------
function buildSong(midi) {
  const ppq = midi.header.ppq;

  // --- Séparation des mains -------------------------------------------------
  const tracksWithNotes = midi.tracks.filter((t) => t.notes.length > 0);

  const handForTrack = new Map();
  if (tracksWithNotes.length >= 2) {
    const avg = (t) => t.notes.reduce((s, n) => s + n.midi, 0) / t.notes.length;
    const sorted = [...tracksWithNotes].sort((a, b) => avg(a) - avg(b));
    sorted.forEach((t, i) => handForTrack.set(t, i === 0 ? "left" : "right"));
  }

  const notes = [];
  for (const track of tracksWithNotes) {
    const trackHand = handForTrack.get(track);
    for (const n of track.notes) {
      const endTime = n.time + n.duration;
      const hand =
        trackHand !== undefined
          ? trackHand
          : n.midi < SPLIT_NOTE
          ? "left"
          : "right";
      notes.push({
        midi: n.midi,
        time: n.time,
        duration: n.duration,
        endTime,
        velocity: n.velocity ?? 0.8,
        hand,
      });
    }
  }
  notes.sort((a, b) => a.time - b.time);
  const maxNoteDuration = notes.reduce(
    (max, note) => Math.max(max, note.duration),
    0
  );

  const duration = Math.max(
    midi.duration,
    notes.reduce((max, note) => Math.max(max, note.endTime), 0)
  );

  const pedalIntervals = extractPedalIntervals(midi, duration);
  const maxPedalDuration = pedalIntervals.reduce(
    (max, interval) => Math.max(max, interval.end - interval.start),
    0
  );
  const measures = computeMeasures(midi, ppq, duration);

  const tempo = midi.header.tempos[0];
  const sig = midi.header.timeSignatures[0];
  const meta = {
    name: midi.name || "Sans titre",
    bpm: tempo ? Math.round(tempo.bpm) : 120,
    timeSignature: sig ? sig.timeSignature : [4, 4],
  };

  return {
    notes,
    pedalIntervals,
    measures,
    duration,
    maxNoteDuration,
    maxPedalDuration,
    meta,
  };
}

// Transforme les changements de contrôle MIDI CC64 en périodes pendant
// lesquelles la pédale de sustain est maintenue. Aucun intervalle n'est créé si
// le fichier ne fournit pas lui-même ces événements.
function extractPedalIntervals(midi, duration) {
  const events = [];

  midi.tracks.forEach((track, trackIndex) => {
    const byNumber = track.controlChanges?.[64];
    const byName = track.controlChanges?.sustain;
    const sustainEvents = byNumber?.length ? byNumber : byName || [];

    for (const event of sustainEvents) {
      if (!Number.isFinite(event.time) || !Number.isFinite(event.value)) continue;
      events.push({
        time: Math.max(0, Math.min(duration, event.time)),
        value: event.value,
        trackIndex,
      });
    }
  });

  if (events.length === 0) return [];

  events.sort(
    (a, b) => a.time - b.time || a.trackIndex - b.trackIndex
  );

  const downTracks = new Set();
  const intervals = [];
  let intervalStart = null;
  let index = 0;

  // Les événements ayant exactement le même temps sont regroupés afin qu'un
  // relâchement et un nouvel appui simultanés ne créent pas de coupure visuelle.
  while (index < events.length) {
    const time = events[index].time;
    const wasDown = downTracks.size > 0;

    while (index < events.length && events[index].time === time) {
      const event = events[index];
      if (event.value >= 0.5) {
        downTracks.add(event.trackIndex);
      } else {
        downTracks.delete(event.trackIndex);
      }
      index++;
    }

    const isDown = downTracks.size > 0;
    if (!wasDown && isDown) {
      intervalStart = time;
    } else if (wasDown && !isDown && intervalStart !== null) {
      if (time > intervalStart) {
        intervals.push({ start: intervalStart, end: time });
      }
      intervalStart = null;
    }
  }

  if (downTracks.size > 0 && intervalStart !== null && duration > intervalStart) {
    intervals.push({ start: intervalStart, end: duration });
  }

  return intervals;
}

// ----------------------------------------------------------------------------
//  Débuts de mesure à partir du tempo et de la signature rythmique.
// ----------------------------------------------------------------------------
function computeMeasures(midi, ppq, duration) {
  const measures = [];
  const sigs =
    midi.header.timeSignatures.length > 0
      ? midi.header.timeSignatures
      : [{ ticks: 0, timeSignature: [4, 4] }];

  const endTicks = midi.header.secondsToTicks
    ? midi.header.secondsToTicks(duration)
    : ppq * 4 * 200;

  for (let i = 0; i < sigs.length; i++) {
    const sig = sigs[i];
    const [num, den] = sig.timeSignature;
    const ticksPerMeasure = (ppq * num * 4) / den;
    const startTicks = sig.ticks;
    const nextTicks = i + 1 < sigs.length ? sigs[i + 1].ticks : endTicks;

    for (let t = startTicks; t < nextTicks; t += ticksPerMeasure) {
      measures.push(midi.header.ticksToSeconds(t));
    }
  }
  if (measures.length === 0) measures.push(0);
  return measures;
}

function lowerBound(items, target, valueOf) {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (valueOf(items[middle]) < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function upperBound(items, target, valueOf) {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (valueOf(items[middle]) <= target) low = middle + 1;
    else high = middle;
  }
  return low;
}

const noteStart = (note) => note.time;
const measureTime = (time) => time;
const pedalStart = (interval) => interval.start;

// ----------------------------------------------------------------------------
//  Rendu
// ----------------------------------------------------------------------------
function draw() {
  const w = layout.width;
  const h = layout.height;

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, w, h);

  drawKeyboardColumns(w, h);
  drawDoMiLines(w, h);

  if (state.song) {
    // Le « rouleau » de notes est limité à la zone au-dessus du clavier : une
    // note qui franchit la ligne de lecture est « consommée » par les touches.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, keyboardTop());
    ctx.clip();
    const earliestVisibleEnd =
      screenYToTime(h + 50) - state.song.maxNoteDuration;
    const latestVisibleStart = screenYToTime(-50);
    const firstVisibleNote = lowerBound(
      state.song.notes,
      earliestVisibleEnd,
      noteStart
    );
    const afterLastVisibleNote = upperBound(
      state.song.notes,
      latestVisibleStart,
      noteStart
    );
    drawMeasureLines(w, h);
    drawNotes(firstVisibleNote, afterLastVisibleNote);
    if (state.showNotation) {
      drawNotationCards(firstVisibleNote, afterLastVisibleNote);
    }
    drawPedalCues(w);
    ctx.restore();
  }

  drawKeyboard(w, h);
  drawPlayhead(w, h);
}

function drawKeyboardColumns(w, h) {
  for (let m = MIDI_LOW; m <= MIDI_HIGH; m++) {
    if (isWhite(m)) continue;
    const g = noteGeometry(m);
    ctx.fillStyle = COLORS.blackKey;
    ctx.fillRect(g.x, 0, g.width, h);
  }
}

// Repères verticaux : à GAUCHE de chaque Do, à DROITE de chaque Mi
function drawDoMiLines(w, h) {
  ctx.strokeStyle = COLORS.gridDoMi;
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let m = MIDI_LOW; m <= MIDI_HIGH; m++) {
    const pc = ((m % 12) + 12) % 12;
    if (pc === 0) {
      const x = crisp(whiteLeftEdge(m));
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    } else if (pc === 4) {
      const x = crisp(whiteLeftEdge(m) + whiteKeyWidth());
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
  }
  ctx.stroke();

  ctx.fillStyle = COLORS.label;
  ctx.font = "10px system-ui, sans-serif";
  const labelY = keyboardTop() - 4;
  for (let m = MIDI_LOW; m <= MIDI_HIGH; m++) {
    if (((m % 12) + 12) % 12 === 0) {
      const octave = Math.floor(m / 12) - 1;
      ctx.fillText(`C${octave}`, whiteLeftEdge(m) + 2, labelY);
    }
  }
}

// Repères horizontaux : débuts de mesure
function drawMeasureLines(w, h) {
  ctx.strokeStyle = COLORS.gridMeasure;
  ctx.lineWidth = 1;
  ctx.fillStyle = COLORS.label;
  ctx.font = "10px system-ui, sans-serif";

  const first = lowerBound(
    state.song.measures,
    screenYToTime(h + 20),
    measureTime
  );
  const afterLast = upperBound(
    state.song.measures,
    screenYToTime(-20),
    measureTime
  );

  ctx.beginPath();
  for (let i = first; i < afterLast; i++) {
    const y = crisp(timeToScreenY(state.song.measures[i]));
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  for (let i = first; i < afterLast; i++) {
    const y = timeToScreenY(state.song.measures[i]);
    ctx.fillText(`${i + 1}`, 4, y - 3);
  }
}

// Notes : rectangles arrondis colorés par main, surbrillance si en cours
function drawNotes(first, afterLast) {
  const h = layout.height;
  const now = state.currentTime;

  for (let index = first; index < afterLast; index++) {
    const n = state.song.notes[index];
    const yBottom = timeToScreenY(n.time);
    const yTop = timeToScreenY(n.endTime);
    if (yBottom < -50 || yTop > h + 50) continue;

    const g = noteGeometry(n.midi);
    const isRight = n.hand === "right";
    const isActive = now >= n.time && now <= n.endTime;
    const isBlackKey = !g.white; // dièse/bémol -> teinte plus foncée

    ctx.fillStyle = isRight
      ? isBlackKey
        ? COLORS.rightHandDark
        : COLORS.rightHand
      : isBlackKey
      ? COLORS.leftHandDark
      : COLORS.leftHand;
    const pad = 1;
    roundRect(
      g.x + pad,
      yTop,
      Math.max(2, g.width - pad * 2),
      Math.max(3, yBottom - yTop),
      4
    );
    ctx.fill();

    if (isActive) {
      ctx.strokeStyle = COLORS.active;
      ctx.lineWidth = 1.25;
      ctx.stroke();
    }
  }
}

// Repères de pédale : une ligne violette matérialise la durée de l'appui.
// L'icône de pédale descend jusqu'à la ligne de lecture, puis reste allumée
// pendant l'appui ; le chevron indique le moment du relâchement.
function drawPedalCues(w) {
  const intervals = state.song?.pedalIntervals;
  if (!intervals?.length) return;

  const bottom = keyboardTop();
  const x = Math.max(14, w - 18);
  let pedalIsDown = false;
  const first = lowerBound(
    intervals,
    screenYToTime(bottom + 7) - state.song.maxPedalDuration,
    pedalStart
  );
  const afterLast = upperBound(
    intervals,
    screenYToTime(-7),
    pedalStart
  );

  ctx.save();
  ctx.strokeStyle = COLORS.pedal;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";

  for (let index = first; index < afterLast; index++) {
    const interval = intervals[index];
    const pressY = timeToScreenY(interval.start);
    const releaseY = timeToScreenY(interval.end);

    if (pressY >= 0 && releaseY <= bottom) {
      const visibleTop = Math.max(0, releaseY);
      const visibleBottom = Math.min(bottom, pressY);
      if (visibleBottom >= visibleTop) {
        line(x, visibleTop, x, visibleBottom);
      }
    }

    if (pressY >= 7 && pressY <= bottom - 7) {
      drawPedalPressCue(x, pressY);
    }
    if (releaseY >= 7 && releaseY <= bottom - 7) {
      drawPedalReleaseCue(x, releaseY);
    }

    if (
      state.currentTime >= interval.start &&
      state.currentTime < interval.end
    ) {
      pedalIsDown = true;
    }
  }

  if (pedalIsDown) {
    drawPedalPressCue(x, bottom - 13, true);
  }

  ctx.restore();
}

function drawPedalPressCue(x, y, active = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = COLORS.pedal;
  if (active && !PERFORMANCE_PROFILE.constrained) {
    ctx.shadowColor = COLORS.pedal;
    ctx.shadowBlur = 10;
  }
  ctx.beginPath();
  ctx.moveTo(-8, 4);
  ctx.lineTo(-5, -4);
  ctx.quadraticCurveTo(0, -6, 6, -4);
  ctx.lineTo(9, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPedalReleaseCue(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = COLORS.pedal;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-6, 3);
  ctx.lineTo(0, -3);
  ctx.lineTo(6, 3);
  ctx.stroke();
  ctx.restore();
}

// Mini-portées : sur chaque note visible, une petite « carte » de partition
// (5 lignes + clé + tête de note placée + lignes supplémentaires + hampe + nom)
// pour apprendre à lire la note en même temps qu'on la joue.
function drawNotationCards(first, afterLast) {
  const h = layout.height;
  for (let index = first; index < afterLast; index++) {
    const n = state.song.notes[index];
    const yBottom = timeToScreenY(n.time);
    const yTop = timeToScreenY(n.endTime);
    if (yBottom < -40 || yTop > h + 40) continue;
    const g = noteGeometry(n.midi);
    drawNotationCard(g.centerX, yTop, yBottom, n.midi, n.hand);
  }
}

function drawNotationCard(cx, noteTop, noteBottom, midi, hand) {
  const clef = hand === "right" ? "treble" : "bass";

  const LG = 4;             // espacement des interlignes (px)
  const staffH = LG * 4;    // hauteur des 5 lignes
  const clefW = 10;         // largeur réservée à la clé
  const cardW = 30;
  const topPad = 12;        // marge haute (hampes / lignes supplémentaires)
  const captionH = 10;      // bandeau du nom de note
  const cardH = topPad + staffH + captionH;

  const cardX = Math.round(cx - cardW / 2);
  const cardY = Math.round(noteTop); // ancrée au bord supérieur de la note

  // Clip : la carte ne dépasse pas en-dehors du rectangle de la note
  ctx.save();
  ctx.beginPath();
  ctx.rect(cardX - 1, noteTop, cardW + 2, Math.max(0, noteBottom - noteTop));
  ctx.clip();

  // Carte « papier » bordée de la couleur de la main
  ctx.fillStyle = COLORS.cardBg;
  ctx.strokeStyle = hand === "right" ? COLORS.rightHand : COLORS.leftHand;
  ctx.lineWidth = 1.5;
  roundRect(cardX, cardY, cardW, cardH, 3);
  ctx.fill();
  ctx.stroke();

  const staffLeft = cardX + clefW;
  const staffRight = cardX + cardW - 3;
  const staffTopY = cardY + topPad;
  const bottomLineY = staffTopY + staffH;

  // 5 lignes de portée
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = crisp(staffTopY + i * LG);
    line(staffLeft, y, staffRight, y);
  }

  // Clé (symboles musicaux Unicode)
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  if (clef === "treble") {
    ctx.font = `${Math.round(staffH * 1.7)}px serif`;
    ctx.fillText("\u{1D11E}", cardX + 1, bottomLineY + LG * 0.6); // 𝄞 clé de sol
  } else {
    ctx.font = `${Math.round(staffH * 1.1)}px serif`;
    ctx.fillText("\u{1D122}", cardX + 1, staffTopY + LG * 2.7); // 𝄢 clé de fa
  }

  // Tête de note
  const step = staffStep(midi, clef);
  const headY = bottomLineY - step * (LG / 2);
  const headX = staffLeft + (staffRight - staffLeft) * 0.62;
  const headRx = LG * 0.72;
  const headRy = LG * 0.6;

  // Lignes supplémentaires (au-dessus / en dessous de la portée)
  ctx.strokeStyle = COLORS.ink;
  const ledgerHalf = headRx + 2;
  if (step < 0) {
    for (let k = -2; k >= step; k -= 2) {
      const y = crisp(bottomLineY - k * (LG / 2));
      line(headX - ledgerHalf, y, headX + ledgerHalf, y);
    }
  } else if (step > 8) {
    for (let k = 10; k <= step; k += 2) {
      const y = crisp(bottomLineY - k * (LG / 2));
      line(headX - ledgerHalf, y, headX + ledgerHalf, y);
    }
  }

  // Hampe (le « trait vertical ») : vers le haut sous la 3e ligne, sinon bas
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (step < 4) {
    ctx.moveTo(headX + headRx, headY);
    ctx.lineTo(headX + headRx, headY - LG * 2.6);
  } else {
    ctx.moveTo(headX - headRx, headY);
    ctx.lineTo(headX - headRx, headY + LG * 2.6);
  }
  ctx.stroke();

  // Tête de note (ovale plein, légèrement incliné)
  ctx.fillStyle = COLORS.ink;
  ctx.beginPath();
  ctx.ellipse(headX, headY, headRx, headRy, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Altération dièse éventuelle
  const pc = ((midi % 12) + 12) % 12;
  if (SHARP_PCS.has(pc)) {
    ctx.font = `${Math.round(LG * 2.6)}px serif`;
    ctx.fillText("♯", headX - headRx - 6, headY + LG * 0.9);
  }

  // Nom de la note (notation latine)
  ctx.font = "bold 8px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(noteDegreeName(midi), cardX + cardW / 2, cardY + cardH - 2);
  ctx.textAlign = "left";

  ctx.restore(); // fin du clipping
}

// ----------------------------------------------------------------------------
//  Clavier de piano en bas de l'écran
//
//  - Chaque touche est alignée horizontalement avec sa colonne de notes.
//  - Une touche s'illumine (vert / bleu) tant qu'une note de la main
//    correspondante est « en cours » à la position de lecture.
//  - Un clic joue le son et assombrit brièvement la touche (state.pressedKeys).
// ----------------------------------------------------------------------------

// Code numérique par note MIDI : touches actuellement traversées par une note.
function computeActiveKeys() {
  const active = state.activeKeys;
  active.fill(ACTIVE_NONE);
  if (!state.song) return active;

  const now = state.currentTime;
  const first = lowerBound(
    state.song.notes,
    now - state.song.maxNoteDuration,
    noteStart
  );
  const afterLast = upperBound(state.song.notes, now, noteStart);
  for (let index = first; index < afterLast; index++) {
    const note = state.song.notes[index];
    if (now <= note.endTime) {
      active[note.midi] =
        note.hand === "right" ? ACTIVE_RIGHT : ACTIVE_LEFT;
    }
  }
  return active;
}

function drawKeyboard(w, h) {
  const top = keyboardTop();
  const kbH = h - top;
  const active = computeActiveKeys();
  const wkW = whiteKeyWidth();

  // Feutrine + ombre sous la ligne de lecture
  ctx.fillStyle = "#05070a";
  ctx.fillRect(0, top, w, kbH);
  ctx.fillStyle = "#b23a2e"; // bandeau « feutrine » rouge, signature Synthesia
  ctx.fillRect(0, top, w, 3);

  // Touches blanches (en premier : les noires se dessinent par-dessus)
  for (let m = MIDI_LOW; m <= MIDI_HIGH; m++) {
    if (isWhite(m)) {
      drawWhiteKey(whiteIndex(m) * wkW, top + 3, wkW, kbH - 3, m, active);
    }
  }

  // Repères d'octave (Do) sur les touches blanches correspondantes
  ctx.fillStyle = "#9b927f";
  ctx.font = "9px system-ui, sans-serif";
  ctx.textAlign = "center";
  for (let m = MIDI_LOW; m <= MIDI_HIGH; m++) {
    if (((m % 12) + 12) % 12 === 0) {
      const oct = Math.floor(m / 12) - 1;
      ctx.fillText(`C${oct}`, whiteIndex(m) * wkW + wkW / 2, h - 5);
    }
  }
  ctx.textAlign = "left";

  // Touches noires par-dessus
  const bkH = (kbH - 3) * 0.62;
  for (let m = MIDI_LOW; m <= MIDI_HIGH; m++) {
    if (!isWhite(m)) {
      const g = noteGeometry(m);
      drawBlackKey(g.x, top + 3, g.width, bkH, m, active);
    }
  }
}

function drawWhiteKey(x, top, w, kbH, midi, active) {
  ctx.fillStyle = layout.whiteGradients[active[midi]];
  roundRectBottom(x + 0.5, top, w - 1, kbH, 4);
  ctx.fill();

  if (state.pressedKeys.has(midi)) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
    roundRectBottom(x + 0.5, top, w - 1, kbH, 4);
    ctx.fill();
  }
}

function drawBlackKey(x, top, w, bkH, midi, active) {
  ctx.fillStyle = layout.blackGradients[active[midi]];
  roundRectBottom(x, top, w, bkH, 3);
  ctx.fill();

  if (state.pressedKeys.has(midi)) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    roundRectBottom(x, top, w, bkH, 3);
    ctx.fill();
  }
}

// Rectangle aux coins inférieurs arrondis (le haut reste droit, accolé au roll)
function roundRectBottom(x, y, w, hgt, r) {
  const rr = Math.min(r, w / 2, hgt / 2);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + hgt - rr);
  ctx.arcTo(x + w, y + hgt, x + w - rr, y + hgt, rr);
  ctx.lineTo(x + rr, y + hgt);
  ctx.arcTo(x, y + hgt, x, y + hgt - rr, rr);
  ctx.closePath();
}

// Touche MIDI sous le point (x, y) du clavier, ou null hors zone clavier.
// On teste d'abord les touches noires (au-dessus), puis les blanches.
function keyAtPosition(x, y) {
  const top = keyboardTop();
  if (y < top) return null;

  const bkH = (layout.height - top - 3) * 0.62;
  if (y <= top + 3 + bkH) {
    for (let m = MIDI_LOW; m <= MIDI_HIGH; m++) {
      if (isWhite(m)) continue;
      const g = noteGeometry(m);
      if (x >= g.x && x <= g.x + g.width) return m;
    }
  }

  let idx = Math.floor(x / whiteKeyWidth());
  let i = 0;
  for (let m = MIDI_LOW; m <= MIDI_HIGH; m++) {
    if (!isWhite(m)) continue;
    if (i === idx) return m;
    i++;
  }
  return null;
}

// Joue la note cliquée et l'assombrit le temps d'une pression.
async function pressKey(midi) {
  const session = state;
  session.pressedKeys.add(midi);
  scheduleDraw();
  const timer = setTimeout(() => {
    session.keyPressTimers.delete(timer);
    if (session.stopped) return;
    session.pressedKeys.delete(midi);
    scheduleDraw();
  }, KEY_PRESS_MS);
  session.keyPressTimers.add(timer);

  try {
    await ensureAudio();
    // Quitter le mode pendant le chargement des échantillons ne doit pas
    // faire sonner la note après coup.
    if (session.stopped) return;
    session.synth.triggerAttackRelease(
      Tone.Frequency(midi, "midi").toNote(),
      0.6
    );
  } catch (error) {
    console.error("Impossible de jouer la note.", error);
  }
}

// Ligne de lecture (curseur) fixe + petits repères triangulaires
function drawPlayhead(w, h) {
  const y = playheadY();

  ctx.save();
  ctx.strokeStyle = COLORS.cursor;
  ctx.lineWidth = 2;
  if (!PERFORMANCE_PROFILE.constrained) {
    ctx.shadowColor = COLORS.cursor;
    ctx.shadowBlur = 8;
  }
  line(0, crisp(y), w, crisp(y));
  ctx.restore();

  // Triangles aux extrémités
  ctx.fillStyle = COLORS.cursor;
  triangle(0, y, 9, 1);
  triangle(w, y, 9, -1);
}

// --- Utilitaires de dessin --------------------------------------------------
function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function triangle(x, y, size, dir) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * dir, y);
  ctx.lineTo(x, y + size);
  ctx.closePath();
  ctx.fill();
}

function crisp(v) {
  return Math.round(v) + 0.5;
}

function roundRect(x, y, w, hgt, r) {
  const rr = Math.min(r, w / 2, hgt / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + hgt, rr);
  ctx.arcTo(x + w, y + hgt, x, y + hgt, rr);
  ctx.arcTo(x, y + hgt, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawImmediately() {
  if (!isRunning()) return;
  if (state.pendingDraw !== null) {
    cancelAnimationFrame(state.pendingDraw);
    state.pendingDraw = null;
  }
  state.pendingUiSync = false;
  draw();
}

function scheduleDraw(syncUi = false) {
  if (!isRunning()) return;
  if (syncUi) state.pendingUiSync = true;
  if (state.pendingDraw !== null) return;

  state.pendingDraw = requestAnimationFrame(() => {
    if (!isRunning()) return;
    state.pendingDraw = null;
    const shouldSyncUi = state.pendingUiSync;
    state.pendingUiSync = false;
    if (shouldSyncUi) syncTransportUI(true);
    draw();
  });
}

// ----------------------------------------------------------------------------
//  Position de lecture (source de vérité) + synchronisation UI
// ----------------------------------------------------------------------------
function songDuration() {
  return state.song ? state.song.duration : 0;
}

// Définit la position courante (clamp [0, durée]) et redessine.
function setTime(t, { fromTransport = false } = {}) {
  state.currentTime = Math.max(0, Math.min(songDuration(), t));

  // Si on déplace manuellement le curseur pendant la lecture, on repositionne
  // le transport audio pour rester synchronisé.
  if (!fromTransport && state.isPlaying) {
    Tone.Transport.seconds = state.currentTime / state.speed;
  }

  if (fromTransport) {
    syncTransportUI();
    drawImmediately();
  } else {
    scheduleDraw(true);
  }
}

function syncTransportUI(force = false) {
  const seek = document.getElementById("seek");
  const label = document.getElementById("timeLabel");
  const now = performance.now();
  if (
    force ||
    now - state.lastTransportUiUpdate >=
      PERFORMANCE_PROFILE.transportUiInterval
  ) {
    seek.value = String(state.currentTime);
    state.lastTransportUiUpdate = now;
  }

  const text = `${fmt(state.currentTime)} / ${fmt(songDuration())}`;
  if (label.textContent !== text) label.textContent = text;
}

function fmt(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

// ----------------------------------------------------------------------------
//  Audio (Tone.js)
// ----------------------------------------------------------------------------
async function ensureAudio() {
  const session = state;
  if (session.audioReady) return;
  if (!session.audioPromise) {
    session.audioPromise = (async () => {
      await Tone.start(); // doit être déclenché par un geste utilisateur

      // Le profil léger conserve le même piano avec un échantillon par octave.
      const sampler = new Tone.Sampler({
        urls: PERFORMANCE_PROFILE.lightAudio
          ? LIGHT_PIANO_SAMPLES
          : FULL_PIANO_SAMPLES,
        release: 1,
        baseUrl: "https://tonejs.github.io/audio/salamander/",
      });

      let reverb = null;
      if (PERFORMANCE_PROFILE.lightAudio) {
        sampler.toDestination();
      } else {
        reverb = new Tone.Reverb({
          decay: 1.6,
          wet: 0.18,
        }).toDestination();
        sampler.connect(reverb);
      }
      sampler.volume.value = -6;

      // Quitter le mode pendant l'initialisation ne doit pas laisser un
      // échantillonneur branché sur la sortie audio.
      if (session.stopped) {
        sampler.dispose();
        reverb?.dispose();
        return;
      }

      session.synth = sampler;
      session.reverb = reverb;
      await Tone.loaded(); // attendre le téléchargement des échantillons
      if (session.stopped) return; // stop() a déjà libéré les nœuds
      session.audioReady = true;
    })();
  }

  try {
    await session.audioPromise;
  } catch (error) {
    session.synth?.dispose();
    session.reverb?.dispose();
    session.synth = null;
    session.reverb = null;
    throw error;
  } finally {
    if (!session.audioReady) session.audioPromise = null;
  }
}

// (Re)construit le « Part » Tone qui planifie toutes les notes du morceau.
function disposePart() {
  if (state.part) {
    state.part.dispose();
    state.part = null;
  }
  Tone.Transport.cancel();
}

// Coupe le son et libère la chaîne audio de la session : appelée par `stop()`,
// elle garantit qu'aucune note ne continue après un changement de mode.
function disposeAudio() {
  disposePart(); // annule aussi les évènements planifiés sur le Transport
  Tone.Transport.stop();
  state.synth?.releaseAll?.();
  state.synth?.dispose();
  state.reverb?.dispose();
  state.synth = null;
  state.reverb = null;
  state.audioReady = false;
  state.audioPromise = null;
}

function buildPart() {
  disposePart();
  if (!state.song || !state.audioReady || !state.synth) return;

  // Les évènements sont planifiés sur l'échelle de temps (dilatée) du Transport :
  // un morceau plus lent étire chaque note sur davantage de secondes réelles.
  const events = state.song.notes.map((n) => ({
    time: n.time / state.speed,
    note: Tone.Frequency(n.midi, "midi").toNote(),
    duration: n.duration / state.speed,
    velocity: n.velocity,
  }));

  state.part = new Tone.Part((time, value) => {
    state.synth.triggerAttackRelease(
      value.note,
      value.duration,
      time,
      value.velocity
    );
  }, events);
  state.part.start(0); // les évènements suivent le temps du Transport
}

async function play() {
  const session = state;
  if (!session.song || session.isPlaying || session.playPending) return;
  session.playPending = true;
  try {
    await ensureAudio();
    // L'utilisateur a pu revenir à l'accueil pendant le chargement audio.
    if (session.stopped) return;
    if (!state.part) buildPart();

    // Reprise depuis le début si on est à la fin
    if (state.currentTime >= songDuration() - 1e-3) setTime(0);

    Tone.Transport.seconds = state.currentTime / state.speed;
    Tone.Transport.start();
    state.isPlaying = true;
    state.lastVisualFrame = -Infinity;
    updatePlayButton();
    if (state.animationFrame !== null) {
      cancelAnimationFrame(state.animationFrame);
    }
    state.animationFrame = requestAnimationFrame(tick);
  } catch (error) {
    console.error("Impossible d'initialiser l'audio.", error);
  } finally {
    session.playPending = false;
  }
}

function pause({ refresh = true } = {}) {
  if (state.isPlaying) {
    state.currentTime = Math.max(
      0,
      Math.min(songDuration(), Tone.Transport.seconds * state.speed)
    );
  }
  Tone.Transport.pause();
  state.isPlaying = false;
  if (state.animationFrame !== null) {
    cancelAnimationFrame(state.animationFrame);
    state.animationFrame = null;
  }
  updatePlayButton();
  if (refresh) {
    syncTransportUI(true);
    drawImmediately();
  }
}

function togglePlay() {
  state.isPlaying ? pause() : play();
}

// Change la vitesse de lecture sans perdre la position courante (en temps
// morceau). On replanifie les évènements à la nouvelle échelle et on réaligne
// le Transport.
function setSpeed(speed) {
  state.speed = speed;
  updateSpeedLabel(speed);
  if (state.audioReady) {
    buildPart();
    Tone.Transport.seconds = state.currentTime / state.speed;
  }
}

function updateSpeedLabel(speed) {
  const el = document.getElementById("speedValue");
  if (el) el.textContent = `${speed % 1 === 0 ? speed : speed.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}×`;
}

function updatePlayButton() {
  document.getElementById("playBtn").textContent = state.isPlaying ? "⏸" : "▶";
}

// Boucle d'animation pendant la lecture : suit le transport audio
function tick(frameTime) {
  if (!isRunning()) return;
  state.animationFrame = null;
  if (!state.isPlaying) return;

  const transportTime = Math.max(
    0,
    Math.min(songDuration(), Tone.Transport.seconds * state.speed)
  );
  const reachedEnd = transportTime >= songDuration() - 1e-3;

  if (
    reachedEnd ||
    frameTime - state.lastVisualFrame >=
      PERFORMANCE_PROFILE.minFrameInterval
  ) {
    state.lastVisualFrame = frameTime;
    setTime(transportTime, { fromTransport: true });
  } else {
    state.currentTime = transportTime;
  }

  if (reachedEnd) {
    pause({ refresh: false });
    syncTransportUI(true);
    return;
  }
  state.animationFrame = requestAnimationFrame(tick);
}

// ----------------------------------------------------------------------------
//  Redimensionnement / canvas haute densité
// ----------------------------------------------------------------------------
function resizeCanvas() {
  if (!isRunning()) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const nativeDpr = Math.max(1, window.devicePixelRatio || 1);
  const pixelBudgetDpr = Math.sqrt(
    PERFORMANCE_PROFILE.maxCanvasPixels / Math.max(1, w * h)
  );
  const dpr = Math.max(
    1,
    Math.min(
      nativeDpr,
      PERFORMANCE_PROFILE.maxCanvasDpr,
      pixelBudgetDpr
    )
  );

  state.dpr = dpr;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  rebuildLayout(w, h);
  drawImmediately();
}

function scheduleCanvasResize() {
  if (!isRunning() || state.pendingResize !== null) return;
  state.pendingResize = requestAnimationFrame(() => {
    if (!isRunning()) return;
    state.pendingResize = null;
    resizeCanvas();
  });
}

// ----------------------------------------------------------------------------
//  Chargement d'un fichier MIDI / démo
// ----------------------------------------------------------------------------
function resetForNewSong(label) {
  pause({ refresh: false });
  disposePart();
  state.currentTime = 0;
  document.getElementById("seek").max = String(songDuration());
  updateSongInfo(label);
  syncTransportUI(true);
  drawImmediately();
}

async function loadMidiFile(file) {
  const session = state;
  try {
    const buffer = await file.arrayBuffer();
    if (session.stopped) return;
    const midi = new Midi(buffer);
    session.song = buildSong(midi);
    resetForNewSong(file.name);
  } catch (err) {
    console.error(err);
    updateSongInfo(null, `Erreur de lecture : ${err.message}`);
  }
}

async function loadMidiFromUrl(url, displayName) {
  const session = state;
  try {
    updateSongInfo(null, `Chargement de « ${displayName} »…`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    if (session.stopped) return;
    const midi = new Midi(buffer);
    session.song = buildSong(midi);
    resetForNewSong(displayName);
  } catch (err) {
    console.error(err);
    updateSongInfo(null, `Erreur : ${err.message}`);
  }
}

// Catalogue des morceaux (chargé une seule fois depuis songs.json)
let songLibrary = [];
let songLibraryFetched = false;

// Remplit le <select> à partir de songs.json. Renvoie true si au moins un
// morceau a été trouvé. Le <select> appartient à index.html et survit au
// changement de mode : on repart de la seule option d'invite pour ne pas
// empiler les morceaux à chaque démarrage du mode.
async function loadSongLibrary() {
  const select = document.getElementById("songSelect");
  if (!songLibraryFetched) {
    try {
      const res = await fetch("songs.json");
      if (!res.ok) return false;
      songLibrary = await res.json();
      songLibraryFetched = true;
    } catch {
      return false; // pas de songs.json — on retombera sur la démo
    }
  }

  select.length = 1;
  songLibrary.forEach((song, i) => {
    select.appendChild(new Option(song.title, String(i)));
  });
  return songLibrary.length > 0;
}

// Charge le morceau d'indice `idx` de la bibliothèque et synchronise le <select>.
async function selectSong(idx) {
  const song = songLibrary[idx];
  if (!song) return;
  document.getElementById("songSelect").value = String(idx);
  if (song.builtin === "demo") {
    loadDemo();
  } else if (song.file) {
    await loadMidiFromUrl(song.file, song.title);
  }
}

function updateSongInfo(fileName, error) {
  const el = document.getElementById("songInfo");
  // Les métadonnées détaillées ne sont plus affichées dans l'en-tête compact.
  // On conserve cette fonction pour les variantes de page qui possèdent encore
  // la zone correspondante, sans interrompre le chargement lorsqu'elle est absente.
  if (!el) return;

  if (error) {
    el.textContent = error;
    return;
  }
  if (!state.song) {
    el.textContent = "Aucun morceau chargé.";
    return;
  }
  const m = state.song.meta;
  const title =
    fileName || (m.name && m.name !== "Sans titre" ? m.name : "Morceau sans titre");
  el.textContent =
    `${title} · ${m.bpm} BPM · mesure ${m.timeSignature[0]}/${m.timeSignature[1]} · ` +
    `${state.song.notes.length} notes · ${state.song.duration.toFixed(1)} s`;
}

// ----------------------------------------------------------------------------
//  Morceau de DÉMO (données MIDI fictives)
// ----------------------------------------------------------------------------
function buildDemoSong() {
  const midi = new Midi();
  midi.name = "Démo — Gamme & accords";
  midi.header.setTempo(96);
  midi.header.update();

  const right = midi.addTrack();
  const left = midi.addTrack();

  const scale = [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60];
  let t = 0;
  const beat = 60 / 96;
  for (const midiNote of scale) {
    right.addNote({ midi: midiNote, time: t, duration: beat * 0.9 });
    t += beat;
  }

  const chords = [
    [48, 52, 55], // Do
    [53, 57, 60], // Fa
    [55, 59, 62], // Sol
    [48, 52, 55], // Do
  ];
  let tc = 0;
  const half = beat * 2;
  for (const chord of chords) {
    for (const note of chord) {
      left.addNote({ midi: note, time: tc, duration: half * 0.95 });
    }
    tc += half * 2;
  }

  return buildSong(midi);
}

function loadDemo() {
  state.song = buildDemoSong();
  resetForNewSong(state.song.meta.name);
}

// ----------------------------------------------------------------------------
//  Interactions : molette, glisser, clic-seek, transport, clavier
// ----------------------------------------------------------------------------
// Convertit les coordonnées d'un évènement pointeur (repère écran) vers le
// repère interne du canvas. En « paysage forcé » le canvas est pivoté de 90°
// (sens horaire) par CSS : on inverse alors la rotation. Pour une rotation de
// 90°, les coins de la bounding-box correspondent exactement aux coins du
// canvas, d'où le mapping direct ci-dessous.
function pointerPos(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (isForcedLandscape()) {
    return { x: clientY - rect.top, y: rect.right - clientX };
  }
  return { x: clientX - rect.left, y: clientY - rect.top };
}

// Tous les écouteurs du mode reçoivent le `signal` de la session : `stop()`
// n'a plus qu'à interrompre l'AbortController pour les retirer d'un bloc,
// y compris ceux posés sur window et document.
function attachInteractions(signal) {
  // Molette : vers le haut = avancer
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      setTime(state.currentTime - e.deltaY / PIXELS_PER_SECOND);
    },
    { passive: false, signal }
  );

  // Glisser : vers le bas = reculer, vers le haut = avancer.
  // lastY / downY sont exprimés dans le repère interne du canvas (via
  // pointerPos) pour rester corrects même en paysage forcé (rotation CSS).
  let dragging = false;
  let moved = false;
  let lastY = 0;
  let downY = 0;
  canvas.addEventListener("pointerdown", (e) => {
    const p = pointerPos(e.clientX, e.clientY);
    // Clic dans la zone clavier : on joue la touche, sans défiler.
    if (p.y >= keyboardTop()) {
      const midi = keyAtPosition(p.x, p.y);
      if (midi != null) pressKey(midi);
      return;
    }
    dragging = true;
    moved = false;
    lastY = downY = p.y;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture(e.pointerId);
  }, { signal });
  canvas.addEventListener("pointermove", (e) => {
    const p = pointerPos(e.clientX, e.clientY);
    if (!dragging) {
      // Curseur « main » au survol du clavier, « grab » sur le rouleau.
      canvas.style.cursor = p.y >= keyboardTop() ? "pointer" : "grab";
      return;
    }
    if (Math.abs(p.y - downY) > 3) moved = true;
    setTime(state.currentTime + (p.y - lastY) / PIXELS_PER_SECOND);
    lastY = p.y;
  }, { signal });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    canvas.style.cursor = "grab";
    // Clic simple (sans glisser) = placer le curseur à l'endroit cliqué
    if (!moved) {
      const p = pointerPos(e.clientX, e.clientY);
      setTime(screenYToTime(p.y));
    }
  };
  canvas.addEventListener("pointerup", endDrag, { signal });
  canvas.addEventListener(
    "pointercancel",
    () => (dragging = false),
    { signal }
  );

  // Barre de progression (seek)
  document.getElementById("seek").addEventListener(
    "input",
    (e) => setTime(parseFloat(e.target.value)),
    { signal }
  );

  // Bouton play/pause
  document
    .getElementById("playBtn")
    .addEventListener("click", togglePlay, { signal });

  // Import d'un fichier MIDI local
  document.getElementById("midiInput").addEventListener(
    "change",
    (e) => {
      const file = e.target.files[0];
      if (file) {
        document.getElementById("songSelect").value = ""; // hors bibliothèque
        loadMidiFile(file);
      }
    },
    { signal }
  );

  // Bibliothèque de morceaux
  document.getElementById("songSelect").addEventListener(
    "change",
    (e) => {
      const idx = parseInt(e.target.value, 10);
      if (!isNaN(idx)) selectSong(idx);
    },
    { signal }
  );

  // Affichage de la notation (mini-portées)
  document.getElementById("notationToggle").addEventListener(
    "change",
    (e) => {
      state.showNotation = e.target.checked;
      scheduleDraw();
    },
    { signal }
  );

  // Curseur de vitesse de lecture : étiquette en direct, application au relâché
  // (reconstruire le Part de Tone à chaque micro-pas pendant le glissé serait
  //  inutilement coûteux pendant la lecture).
  const speedRange = document.getElementById("speedRange");
  speedRange.addEventListener(
    "input",
    (e) => updateSpeedLabel(parseFloat(e.target.value)),
    { signal }
  );
  speedRange.addEventListener(
    "change",
    (e) => setSpeed(parseFloat(e.target.value)),
    { signal }
  );

  // Raccourci clavier : Espace = play/pause
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.code === "Space" && e.target.tagName !== "INPUT") {
        e.preventDefault();
        togglePlay();
      }
    },
    { signal }
  );

  // Redimensionnement de la fenêtre, et changements de plein écran / paysage
  // signalés par la barre commune (cf. viewport.js).
  window.addEventListener("resize", scheduleCanvasResize, { signal });
  window.addEventListener(VIEWPORT_CHANGE_EVENT, scheduleCanvasResize, {
    signal,
  });
}

// ----------------------------------------------------------------------------
//  Cycle de vie de la fonctionnalité
// ----------------------------------------------------------------------------
function start(host) {
  container = host;
  state = createSession();
  listeners = new AbortController();

  // Les contrôles propres au mode vivent dans index.html, séparés de la barre
  // commune ; le canvas, lui, appartient à la scène de la fonctionnalité.
  const controls = document.getElementById("songControls");
  if (controls) controls.hidden = false;

  canvas = document.createElement("canvas");
  canvas.id = "rollCanvas";
  container.appendChild(canvas);
  ctx = canvas.getContext("2d", { alpha: false });

  attachInteractions(listeners.signal);
  resizeCanvas();
  loadInitialSong();
}

function stop() {
  if (!state) return;
  const session = state;

  // 1. Figer la position lue sur le Transport, puis la mémoriser : revenir
  //    dans le mode reprend là où l'utilisateur s'était arrêté.
  pause({ refresh: false });
  saveSettings();
  stopAutoSave();

  // 2. Couper le son (Transport, Part et échantillonneur).
  disposeAudio();

  // 3. Marquer la session morte avant d'annuler ses rappels : les promesses
  //    encore en vol s'arrêteront d'elles-mêmes.
  session.stopped = true;
  cancelPendingFrames(session);
  for (const timer of session.keyPressTimers) clearTimeout(timer);
  session.keyPressTimers.clear();

  // 4. Retirer les écouteurs (canvas, contrôles, window, document).
  listeners.abort();
  listeners = null;

  // 5. Rendre la scène et masquer les contrôles du mode.
  const controls = document.getElementById("songControls");
  if (controls) controls.hidden = true;
  container?.replaceChildren();

  container = null;
  canvas = null;
  ctx = null;
  state = null;
}

function cancelPendingFrames(session) {
  for (const frame of [
    session.pendingDraw,
    session.pendingResize,
    session.animationFrame,
  ]) {
    if (frame !== null) cancelAnimationFrame(frame);
  }
  session.pendingDraw = null;
  session.pendingResize = null;
  session.animationFrame = null;
}

// Au démarrage du mode : on charge la bibliothèque puis le morceau retenu ; si
// elle est vide ou introuvable, on retombe sur la démo générée en interne.
async function loadInitialSong() {
  const session = state;
  const saved = loadSettings();
  const hasLibrary = await loadSongLibrary();
  if (session.stopped) return;

  // Réglages indépendants du morceau : applicables immédiatement.
  if (saved) {
    if (typeof saved.speed === "number") {
      document.getElementById("speedRange").value = String(saved.speed);
      setSpeed(saved.speed);
    }
    if (typeof saved.showNotation === "boolean") {
      session.showNotation = saved.showNotation;
      document.getElementById("notationToggle").checked = saved.showNotation;
    }
  }

  // Choix du morceau à charger.
  if (hasLibrary) {
    let idx = 0;
    if (
      saved &&
      Number.isInteger(saved.songIndex) &&
      songLibrary[saved.songIndex] &&
      songLibrary[saved.songIndex].title === saved.songTitle
    ) {
      idx = saved.songIndex;
    }
    await selectSong(idx);
    if (session.stopped) return;
  } else {
    loadDemo();
  }

  // La position de lecture est restaurée après coup : le chargement du morceau
  // (resetForNewSong) remet currentTime à 0.
  if (saved && saved.currentTime > 0) {
    setTime(saved.currentTime);
  }

  startAutoSave();
}
