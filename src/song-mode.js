// ============================================================================
//  Mode Morceau — Feature 01 « Apprentissage d'un morceau »
//  Chargement / parsing MIDI, grille de repères (mesures + Do/Mi),
//  lecture audio (Tone.js) et curseur de lecture play/pause synchronisé.
//
//  Ce qui est partagé avec les autres fonctionnalités vit ailleurs :
//  `music.js` (noms de notes, positions sur portée), `audio.js`
//  (échantillonneur piano) et `perf.js` (profil de l'appareil). Reste
//  ici tout ce qui n'appartient qu'au mode : le rendu du roll et du clavier,
//  et la planification du morceau sur le Transport.
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
import { PERFORMANCE_PROFILE } from "./perf.js";
import { createAudio, midiToNote } from "./audio.js";
import { midiInput } from "./midi-input.js";
import { createProgressStore } from "./progress/store.js";
import {
  clampBounds,
  clampTempoPercent,
  createSectionStore,
  DEFAULT_SECTION_SECONDS,
  evaluateRun,
  expectedNotes,
  groupChords,
  HELP_AFTER_FAILS,
  isMastered,
  isWorkedHand,
  nextGroupIndex,
  notesToRework,
  songIdFromTitle,
  suggestTempo,
  TEMPO_STEP_PERCENT,
  WHOLE_SONG_ID,
} from "./song-practice.js";
import {
  entriesOfKind,
  indexOfFile,
  kindOf,
  loadSongCatalog,
  songAt,
} from "./song-library.js";
import {
  CLEF_GLYPH,
  isWhite,
  MIDI_HIGH,
  MIDI_LOW,
  noteDegreeName,
  pitchClass,
  SHARP_PCS,
  staffStep,
} from "./music.js";

// ----------------------------------------------------------------------------
//  Constantes de configuration
// ----------------------------------------------------------------------------
const PIXELS_PER_SECOND = 140;  // échelle temporelle verticale
const SPLIT_NOTE = 60;          // Do central : seuil graves/aigus pour le fallback
const KEY_PRESS_MS = 220;       // durée de l'assombrissement après un clic sur une touche
const WRONG_FLASH_MS = 260;     // signalement d'une note fausse en mode Attente
// Le travail d'un passage est une pratique à part entière, distincte de
// l'écoute d'un morceau : le journal de progression (F3) les sépare, et le
// Programme d'entraînement (04) pourra programmer l'un sans l'autre.
const PRACTICE_FEATURE_ID = "song-practice";
const BOUND_GRAB_PX = 14;       // zone de saisie d'une borne de passage (au doigt)
const ACCOMPANY_ALPHA = 0.28;   // opacité de la main non travaillée

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
  bound: "#ffd166",          // bornes du passage travaillé
  outside: "rgba(3, 5, 8, .62)", // hors du passage : assombri, jamais masqué
  expected: "#ffffff",       // note attendue en mode Attente
  wrongKey: "#f87171",       // note fausse : signalée, sans rien changer d'autre
  hintKey: "#7ee2a8",        // aide après plusieurs échecs sur le même accord
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

    // Nature de la bibliothèque affichée dans le <select> : le répertoire
    // (« song ») ou le matériel de travail (« exercice »). Décidée au démarrage
    // par le fichier éventuellement demandé, jamais changée ensuite.
    libraryKind: "song",
    requestedFile: null,

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

    // Audio partagé (audio.js), initialisé paresseusement au premier play.
    // La chaîne appartient à la session : `stop()` la libère entièrement.
    audio: createAudio(),
    playPending: false,
    part: null,

    // Désabonnement du clavier physique (F2). L'entrée, elle, est partagée et
    // survit au changement de mode.
    stopMidi: null,

    // Sous-mode Travail (feature 06). Tant que `enabled` est faux, le mode se
    // comporte exactement comme le lecteur d'avant.
    practice: createPracticeState(),
    progress: createProgressStore(),
    practiceLog: null,   // séance F3 ouverte pendant le travail
  };
}

// L'état du travail est recréé à chaque morceau : les compteurs d'une séance
// n'ont aucun sens reportés sur un autre morceau. Les réglages, eux, sont
// réappliqués par `loadInitialSong` depuis les préférences enregistrées.
function createPracticeState() {
  return {
    enabled: false,
    hand: "both",        // main travaillée
    accompany: true,     // l'autre main est jouée par l'application, ou masquée
    loop: true,
    wait: false,
    songId: null,
    sectionId: null,     // null = morceau entier
    sections: [],

    repetitions: 0,      // tours effectués depuis l'entrée dans le passage
    cleanRuns: 0,
    flawedStreak: 0,
    played: [],          // notes jouées pendant le tour en cours (horloge morceau)
    lastReport: null,    // jugement du dernier tour, ou null si rien n'a été mesuré
    reports: [],         // tours jugés, pour les notes à revoir (les 20 derniers)
    suggestion: null,    // proposition de tempo, jamais appliquée d'office

    groups: [],          // accords attendus, pour le mode Attente
    nextGroup: -1,
    waiting: null,       // { index, remaining: Set, fails }
    hintKeys: new Set(), // touches montrées après plusieurs échecs
    wrongKeys: new Set(),
    lastTransportTime: 0,
  };
}

// Le journal des passages survit à la session : il est relu au démarrage du
// mode et réécrit à chaque modification (plan/06 § 5).
const sectionStore = createSectionStore();

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
  // Tous les morceaux viennent du catalogue ; on retient l'indice ET le titre
  // pour rester robuste à un réordonnancement de songs.json. La valeur vide
  // correspond à l'option d'invite du <select> : rien à retenir.
  //
  // Le dernier morceau est mémorisé **par nature** : ouvrir un exercice ne doit
  // pas faire perdre la place où on en était dans son morceau, et inversement.
  const idx = parseInt(document.getElementById("songSelect").value, 10);
  const fromLibrary = !isNaN(idx) ? songAt(idx) : null;
  const library = { ...(loadSettings()?.library ?? {}) };
  if (fromLibrary) {
    library[state.libraryKind] = {
      index: idx,
      title: fromLibrary.title,
      currentTime: state.currentTime,
    };
  }

  const practice = state.practice;
  const data = {
    speed: state.speed,
    showNotation: state.showNotation,
    library,
    // Réglages du sous-mode Travail. Le passage actif est retenu avec eux :
    // reprendre le travail là où on l'a laissé fait partie du § 18 de plan/06.
    practice: {
      enabled: practice.enabled,
      hand: practice.hand,
      accompany: practice.accompany,
      loop: practice.loop,
      wait: practice.wait,
      sectionId: practice.sectionId,
    },
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
    if (!raw) return null;
    const saved = JSON.parse(raw);
    // Réglages écrits avant la séparation morceaux / exercices : le morceau
    // retenu était unique et vivait à la racine. Il devient celui des morceaux.
    if (!saved.library && Number.isInteger(saved.songIndex)) {
      saved.library = {
        song: {
          index: saved.songIndex,
          title: saved.songTitle,
          currentTime: saved.currentTime ?? 0,
        },
      };
    }
    return saved;
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
    drawPracticeSection(w, h);
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
    const pc = pitchClass(m);
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
    if (pitchClass(m) === 0) {
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

// Notes : rectangles arrondis colorés par main, surbrillance si en cours.
// En sous-mode Travail, la main non travaillée s'efface (accompagnement) ou
// disparaît (plan/06 § 6), et la note attendue est cerclée de blanc.
function drawNotes(first, afterLast) {
  const h = layout.height;
  const now = state.currentTime;
  const practice = state.practice;
  const separateHands = practice.enabled && practice.hand !== "both";
  const waiting = practice.enabled && practice.waiting;

  for (let index = first; index < afterLast; index++) {
    const n = state.song.notes[index];
    const yBottom = timeToScreenY(n.time);
    const yTop = timeToScreenY(n.endTime);
    if (yBottom < -50 || yTop > h + 50) continue;

    const worked = !separateHands || n.hand === practice.hand;
    if (!worked && !practice.accompany) continue;

    const g = noteGeometry(n.midi);
    const isRight = n.hand === "right";
    const isActive = now >= n.time && now <= n.endTime;
    const isBlackKey = !g.white; // dièse/bémol -> teinte plus foncée
    const isExpected =
      waiting &&
      practice.waiting.remaining.has(n.midi) &&
      Math.abs(n.time - now) < 0.05;

    if (!worked) ctx.globalAlpha = ACCOMPANY_ALPHA;
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

    if (isExpected) {
      ctx.strokeStyle = COLORS.expected;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else if (isActive) {
      ctx.strokeStyle = COLORS.active;
      ctx.lineWidth = 1.25;
      ctx.stroke();
    }
    if (!worked) ctx.globalAlpha = 1;
  }
}

// Bornes du passage travaillé : ce qui est hors du passage est assombri (et
// non masqué — on doit voir ce qui précède et ce qui suit), les deux bornes
// portent une poignée saisissable au doigt.
function drawPracticeSection(w, h) {
  const section = activeSection();
  if (!section) return;

  const yEnd = timeToScreenY(section.endSeconds);
  const yStart = timeToScreenY(section.startSeconds);

  ctx.fillStyle = COLORS.outside;
  if (yEnd > 0) ctx.fillRect(0, 0, w, Math.min(h, yEnd));
  if (yStart < h) ctx.fillRect(0, Math.max(0, yStart), w, h - Math.max(0, yStart));

  ctx.strokeStyle = COLORS.bound;
  ctx.lineWidth = 2;
  line(0, crisp(yStart), w, crisp(yStart));
  line(0, crisp(yEnd), w, crisp(yEnd));

  drawBoundHandle(4, yStart, "début");
  drawBoundHandle(4, yEnd, section.title);
}

function drawBoundHandle(x, y, label) {
  ctx.font = "11px system-ui, sans-serif";
  const width = Math.min(layout.width - 8, ctx.measureText(label).width + 14);
  ctx.fillStyle = COLORS.bound;
  roundRect(x, y - 8, width, 16, 4);
  ctx.fill();
  ctx.fillStyle = "#1b1b1b";
  ctx.fillText(label, x + 7, y + 4);
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
    ctx.fillText(CLEF_GLYPH.treble, cardX + 1, bottomLineY + LG * 0.6);
  } else {
    ctx.font = `${Math.round(staffH * 1.1)}px serif`;
    ctx.fillText(CLEF_GLYPH.bass, cardX + 1, staffTopY + LG * 2.7);
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
  if (SHARP_PCS.has(pitchClass(midi))) {
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
  const practice = state.practice;
  const separateHands = practice.enabled && practice.hand !== "both";
  for (let index = first; index < afterLast; index++) {
    const note = state.song.notes[index];
    if (now > note.endTime) continue;
    // Main masquée : sa touche ne s'allume pas non plus.
    if (separateHands && note.hand !== practice.hand && !practice.accompany) {
      continue;
    }
    // En mode Attente, la touche cherchée ne s'allume pas d'elle-même : ce
    // serait donner la réponse, et l'aide du § 7 n'aurait plus lieu d'être.
    // Elle s'allume dès qu'elle est jouée, ce qui vaut retour immédiat.
    if (practice.waiting?.remaining.has(note.midi)) continue;
    active[note.midi] = note.hand === "right" ? ACTIVE_RIGHT : ACTIVE_LEFT;
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
    if (pitchClass(m) === 0) {
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

  drawPracticeKeyCues();
}

// Aide et fausses notes du mode Attente. L'aide n'apparaît qu'après plusieurs
// échecs sur le même accord (plan/06 § 7) ; la note fausse est signalée
// brièvement, sans faire reculer le morceau ni passer la note.
function drawPracticeKeyCues() {
  const practice = state.practice;
  if (!practice.enabled) return;
  for (const midi of practice.hintKeys) paintKey(midi, COLORS.hintKey, 0.75);
  for (const midi of practice.wrongKeys) paintKey(midi, COLORS.wrongKey, 0.8);
}

function paintKey(midi, color, alpha) {
  if (midi < MIDI_LOW || midi > MIDI_HIGH) return;
  const top = keyboardTop();
  const kbH = layout.height - top;
  const g = noteGeometry(midi);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  if (g.white) roundRectBottom(g.x + 0.5, top + 3, g.width - 1, kbH - 3, 4);
  else roundRectBottom(g.x, top + 3, g.width, (kbH - 3) * 0.62, 3);
  ctx.fill();
  ctx.restore();
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
  notePlayed(midi);
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
    // Quitter le mode pendant le chargement des échantillons ne doit pas faire
    // sonner la note après coup : `playNote` abandonne si la chaîne est libérée.
    await session.audio.playNote(midi);
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
  // Le dessin immédiat annule l'image programmée : il doit reprendre à son
  // compte le rafraîchissement d'interface qu'elle portait, sinon il est perdu.
  // C'est ce qui laissait le curseur de position et l'horloge sur l'ancienne
  // position après un saut à l'arrêt (choix d'un passage, passage créé plus
  // loin), alors que le rouleau, lui, avait bien sauté.
  if (state.pendingUiSync) {
    state.pendingUiSync = false;
    syncTransportUI(true);
  }
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
//
//  L'échantillonneur lui-même vit dans `audio.js`, partagé avec les autres
//  fonctionnalités. Reste ici ce qui est propre au mode : la planification du
//  morceau sur le Transport (Tone.Part).
// ----------------------------------------------------------------------------

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
  // Le Transport est partagé par tous les modes : une boucle laissée active
  // ferait rejouer sans fin le premier exercice du mode suivant.
  Tone.Transport.loop = false;
  Tone.Transport.stop();
  state.audio.dispose();
}

function buildPart() {
  const session = state;
  disposePart();
  if (!session.song || !session.audio.ready) return;

  // Les évènements sont planifiés sur l'échelle de temps (dilatée) du Transport :
  // un morceau plus lent étire chaque note sur davantage de secondes réelles.
  const events = session.song.notes
    .filter((n) => isAudibleNote(n, session))
    .map((n) => ({
      time: n.time / session.speed,
      note: midiToNote(n.midi),
      duration: n.duration / session.speed,
      velocity: n.velocity,
    }));

  if (events.length === 0) return;

  session.part = new Tone.Part((time, value) => {
    session.audio.sampler?.triggerAttackRelease(
      value.note,
      value.duration,
      time,
      value.velocity
    );
  }, events);
  session.part.start(0); // les évènements suivent le temps du Transport
}

async function play() {
  const session = state;
  if (!session.song || session.isPlaying || session.playPending) return;
  session.playPending = true;
  try {
    await session.audio.ensureReady();
    // L'utilisateur a pu revenir à l'accueil pendant le chargement audio.
    if (session.stopped) return;
    if (!state.part) buildPart();

    // Reprise depuis le début si on est à la fin
    if (state.currentTime >= songDuration() - 1e-3) setTime(0);

    // En sous-mode Travail, la lecture est limitée au passage actif : jouer
    // depuis une position hors bornes ramène au début du passage.
    const bounds = sectionBounds();
    if (
      state.practice.enabled &&
      (state.currentTime < bounds.startSeconds ||
        state.currentTime >= bounds.endSeconds - 1e-3)
    ) {
      setTime(bounds.startSeconds);
    }
    beginPracticeRun();

    Tone.Transport.seconds = state.currentTime / state.speed;
    applyLoopPoints();
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
  // Une attente en cours a déjà figé la position exacte : relire le Transport
  // la décalerait de la fraction de frame écoulée avant le gel.
  if (state.isPlaying && !state.practice.waiting) {
    state.currentTime = Math.max(
      0,
      Math.min(songDuration(), Tone.Transport.seconds * state.speed)
    );
  }
  leaveWait({ resume: false });
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
  updateSpeedLabel();
  if (state.audio.ready) {
    buildPart();
    Tone.Transport.seconds = state.currentTime / state.speed;
  }
  // Les bornes de boucle sont exprimées en secondes de Transport : elles
  // suivent le tempo de travail.
  applyLoopPoints();
}

// Vitesse de lecture et tempo de travail (06) sont le même réglage : une seule
// commande dans la barre, donc un seul affichage, en pourcentage.
function updateSpeedLabel() {
  const el = document.getElementById("speedValue");
  if (el) el.textContent = `${tempoPercent()} %`;
}

function updatePlayButton() {
  document.getElementById("playBtn").textContent = state.isPlaying ? "⏸" : "▶";
}

// Boucle d'animation pendant la lecture : suit le transport audio
function tick(frameTime) {
  if (!isRunning()) return;
  state.animationFrame = null;
  if (!state.isPlaying || state.practice.waiting) return;

  const transportTime = Math.max(
    0,
    Math.min(songDuration(), Tone.Transport.seconds * state.speed)
  );
  const practice = state.practice;
  const bounds = sectionBounds();

  // --- Sous-mode Travail : bouclage, fin de passage, attente ----------------
  if (practice.enabled) {
    // Le Transport reboucle lui-même (loopStart/loopEnd) : on ne fait que
    // constater le retour en arrière pour compter le tour et le juger.
    if (transportTime < practice.lastTransportTime - 0.05) {
      completeRun();
      beginPracticeRun(bounds.startSeconds);
      state.lastVisualFrame = -Infinity;
    } else if (!practice.loop && transportTime >= bounds.endSeconds - 1e-3) {
      setTime(bounds.endSeconds, { fromTransport: true });
      completeRun();
      pause({ refresh: false });
      syncTransportUI(true);
      return;
    }
    practice.lastTransportTime = transportTime;

    if (practice.wait && enterWaitIfDue(transportTime)) return;
  }

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
    if (practice.enabled) completeRun();
    pause({ refresh: false });
    syncTransportUI(true);
    return;
  }
  state.animationFrame = requestAnimationFrame(tick);
}

// ============================================================================
//  Sous-mode Travail — Feature 06
//
//  Cinq outils combinables (plan/06 § 4) posés sur le lecteur existant :
//  passages, main travaillée, boucle, attente de la bonne note et tempo de
//  travail. Ce qui se calcule sans écran vit dans `song-practice.js` ; ce qui
//  suit relie ces règles au Transport, au rouleau et à la barre de commandes.
// ============================================================================

function activeSection() {
  const practice = state.practice;
  if (!practice.enabled || !practice.sectionId) return null;
  return practice.sections.find((s) => s.id === practice.sectionId) ?? null;
}

// Bornes réellement travaillées : celles du passage actif, ou le morceau entier.
function sectionBounds() {
  const section = activeSection();
  const duration = songDuration();
  if (!section) return { startSeconds: 0, endSeconds: duration };
  return {
    startSeconds: Math.min(section.startSeconds, duration),
    endSeconds: Math.min(section.endSeconds, duration),
  };
}

// Le tempo de travail et le curseur de vitesse sont la même chose vue de deux
// façons (plan/06 § 8) : 70 % = 0,7×.
function tempoPercent() {
  return Math.round(state.speed * 100);
}

function targetTempoPercent() {
  return activeSection()?.targetTempoPercent ?? 100;
}

// Durée d'un temps, sur l'horloge du morceau (non dilatée par le tempo de
// travail) : la fenêtre de tolérance reste une fraction de temps, donc la même
// exigence musicale à 60 % qu'à 100 %.
function secondsPerBeat() {
  const bpm = state.song?.meta.bpm || 120;
  return 60 / bpm;
}

// Une note est jouée par l'application si elle n'est pas à la charge de
// l'utilisateur : la main d'accompagnement toujours, la main travaillée
// seulement hors mode Attente.
function isAudibleNote(note, session) {
  const practice = session.practice;
  if (!practice.enabled) return true;
  if (!isWorkedHand(note, practice.hand)) return practice.accompany;
  return !practice.wait;
}

// La boucle n'existe que pour un passage : sur « Morceau entier », il n'y a pas
// de fin à laquelle revenir. Le réglage reste mémorisé — il se rallume dès
// qu'un passage est choisi — mais il ne s'applique pas, et c'est ce que disent
// le bouton grisé et le bilan muet.
function isLooping() {
  const practice = state.practice;
  return practice.enabled && practice.loop && activeSection() !== null;
}

function applyLoopPoints() {
  if (!isLooping()) {
    Tone.Transport.loop = false;
    return;
  }
  const bounds = sectionBounds();
  if (bounds.endSeconds <= bounds.startSeconds) {
    Tone.Transport.loop = false;
    return;
  }
  // Le bouclage est confié au Transport plutôt qu'à la boucle d'animation :
  // c'est lui qui tient l'horloge audio, et une boucle recalée image par image
  // dériverait de quelques millisecondes à chaque tour (plan/06 § 14).
  Tone.Transport.setLoopPoints(
    bounds.startSeconds / state.speed,
    bounds.endSeconds / state.speed
  );
  Tone.Transport.loop = true;
}

// ----------------------------------------------------------------------------
//  Un tour de passage
// ----------------------------------------------------------------------------
function beginPracticeRun(from = state.currentTime) {
  const practice = state.practice;
  practice.played = [];
  practice.lastTransportTime = from;
  practice.nextGroup = practice.wait ? firstGateFrom(from) : -1;
}

// Accords attendus du passage, pour la main travaillée uniquement : « les notes
// de la main d'accompagnement ne bloquent jamais le défilement » (plan/06 § 6).
function rebuildGates() {
  const practice = state.practice;
  if (!state.song || !practice.enabled || !practice.wait) {
    practice.groups = [];
    practice.nextGroup = -1;
    return;
  }
  practice.groups = groupChords(
    expectedNotes(state.song.notes, sectionBounds(), practice.hand)
  );
  practice.nextGroup = firstGateFrom(state.currentTime);
}

// L'accord exactement à `time` compte encore comme à venir : on s'arrête
// dessus au lieu de le sauter.
function firstGateFrom(time) {
  return nextGroupIndex(state.practice.groups, time, -1e-3);
}

function enterWaitIfDue(transportTime) {
  const practice = state.practice;
  const index = practice.nextGroup;
  if (index < 0 || index >= practice.groups.length) return false;
  const group = practice.groups[index];
  if (transportTime < group.time) return false;

  // Le gel est exact : on ramène le Transport sur l'attaque de l'accord plutôt
  // que de rester à la fraction d'image de dépassement.
  state.currentTime = group.time;
  Tone.Transport.pause();
  Tone.Transport.seconds = group.time / state.speed;
  practice.waiting = { index, remaining: new Set(group.midis), fails: 0 };
  practice.hintKeys.clear();
  if (state.animationFrame !== null) {
    cancelAnimationFrame(state.animationFrame);
    state.animationFrame = null;
  }
  syncTransportUI(true);
  renderPracticeStatus();
  drawImmediately();
  return true;
}

// Reprend le défilement là où il s'était arrêté. `resume: false` sert à
// l'annulation (pause, changement de réglage) : l'attente disparaît sans
// relancer quoi que ce soit.
function leaveWait({ resume = true } = {}) {
  const practice = state.practice;
  if (!practice.waiting) return;
  practice.nextGroup = practice.waiting.index + 1;
  practice.waiting = null;
  practice.hintKeys.clear();
  renderPracticeStatus();
  if (!resume || !state.isPlaying) return;

  Tone.Transport.seconds = state.currentTime / state.speed;
  Tone.Transport.start();
  state.lastVisualFrame = -Infinity;
  practice.lastTransportTime = state.currentTime;
  if (state.animationFrame !== null) cancelAnimationFrame(state.animationFrame);
  state.animationFrame = requestAnimationFrame(tick);
}

// ----------------------------------------------------------------------------
//  Une note jouée par l'utilisateur (piano à l'écran ou clavier physique)
//
//  `lateness` est le retard, en secondes réelles, entre l'instant du message et
//  celui où il est traité — nul pour un clic. Converti en temps morceau, il
//  vaut ce retard multiplié par le tempo de travail.
// ----------------------------------------------------------------------------
function notePlayed(midi, lateness = 0) {
  const practice = state.practice;
  if (!practice.enabled) return;

  if (state.isPlaying && !practice.waiting) {
    practice.played.push({
      midi,
      time: Math.max(0, (Tone.Transport.seconds - lateness) * state.speed),
    });
  }

  if (!practice.waiting) return;

  // Mode Attente : la bonne note ouvre la porte, une fausse est signalée sans
  // faire reculer le morceau ni passer la note (plan/06 § 7).
  if (practice.waiting.remaining.delete(midi)) {
    if (practice.waiting.remaining.size === 0) leaveWait();
    else scheduleDraw();
    return;
  }

  practice.waiting.fails++;
  if (practice.waiting.fails >= HELP_AFTER_FAILS) {
    for (const expected of practice.waiting.remaining) {
      practice.hintKeys.add(expected);
    }
  }
  flashWrongKey(midi);
}

function flashWrongKey(midi) {
  const session = state;
  session.practice.wrongKeys.add(midi);
  scheduleDraw();
  const timer = setTimeout(() => {
    session.keyPressTimers.delete(timer);
    if (session.stopped) return;
    session.practice.wrongKeys.delete(midi);
    scheduleDraw();
  }, WRONG_FLASH_MS);
  session.keyPressTimers.add(timer);
}

// ----------------------------------------------------------------------------
//  Fin d'un tour : ce qui a été joué, et à quel tempo repartir
// ----------------------------------------------------------------------------
function completeRun() {
  const practice = state.practice;
  if (!practice.enabled || !state.song) return;
  practice.repetitions++;

  const expected = expectedNotes(
    state.song.notes,
    sectionBounds(),
    practice.hand
  );

  // Sans note reçue, rien n'a été mesuré : le tour est une répétition, pas une
  // exécution jugée — et aucune précision ne sera affichée (plan/06 § 9).
  // En mode Attente non plus : on ne peut pas s'y tromper, la porte attend.
  const measured =
    !practice.wait && expected.length > 0 && practice.played.length > 0;

  let report = null;
  if (measured) {
    report = evaluateRun(expected, practice.played, secondsPerBeat());
    practice.lastReport = report;
    // Les notes à revoir se lisent sur plusieurs tours : une note ratée une
    // fois n'est pas une difficulté, ratée cinq fois si. On garde une fenêtre
    // glissante plutôt que toute la séance — sur la tablette, une boucle peut
    // tourner longtemps.
    practice.reports.push(report);
    if (practice.reports.length > 20) practice.reports.shift();
    if (report.outcome === "clean") {
      practice.cleanRuns++;
      practice.flawedStreak = 0;
    } else {
      practice.flawedStreak++;
    }
    practice.suggestion = suggestTempo({
      tempoPercent: tempoPercent(),
      outcome: report.outcome,
      targetPercent: targetTempoPercent(),
      flawedStreak: practice.flawedStreak,
    });
    sectionStore.recordRun(practice.songId, practice.sectionId ?? WHOLE_SONG_ID, {
      outcome: report.outcome,
      tempoPercent: tempoPercent(),
      whole: { endSeconds: songDuration(), targetTempoPercent: 100 },
    });
    practice.sections = sectionStore.list(practice.songId);
  }

  recordRunEvent(report);
  renderPracticeStatus();
}

// Journal de progression (F3). Une exécution jugée est un `run` en
// `clean`/`flawed` ; un tour dont rien n'a été mesuré reste une `repetition`
// en `none`. C'est exactement la distinction déjà faite par les exercices
// techniques (plan/03 étape D), avec le même vocabulaire.
function recordRunEvent(report) {
  const practice = state.practice;
  const target = {
    songId: practice.songId,
    sectionId: practice.sectionId ?? WHOLE_SONG_ID,
    hand: practice.hand,
    tempoPercent: tempoPercent(),
    repetition: practice.repetitions,
  };

  if (!report) {
    state.practiceLog?.record({ type: "repetition", target, outcome: "none" });
    return;
  }

  state.practiceLog?.record({
    type: "run",
    target,
    outcome: report.outcome,
    given: {
      correct: report.correct,
      total: report.total,
      extras: report.extras.length,
      // L'écart moyen brut, en fraction de temps : les seuils restent à la vue
      // (plan/F3 § 7).
      meanFraction:
        report.timing.meanFraction === null
          ? null
          : Math.round(report.timing.meanFraction * 1000) / 1000,
    },
  });
}

function openPracticeLog() {
  if (state.practiceLog && !state.practiceLog.closed) return;
  const practice = state.practice;
  state.practiceLog = state.progress.openSession(PRACTICE_FEATURE_ID, {
    songId: practice.songId,
    sectionId: practice.sectionId ?? WHOLE_SONG_ID,
    hand: practice.hand,
    tempoPercent: tempoPercent(),
    loop: practice.loop,
    wait: practice.wait,
  });
}

function flushProgress() {
  state?.progress.flush();
}

function onVisibilityChange() {
  if (document.visibilityState === "hidden") flushProgress();
}

function closePracticeLog() {
  const log = state?.practiceLog;
  if (!log || log.closed) return;
  const practice = state.practice;
  // « Terminée » quand au moins un tour a été fait : sans cela, entrer dans le
  // sous-mode puis en ressortir laisserait une séance fantôme au Programme
  // d'entraînement (04).
  log.close(practice.repetitions > 0 ? "done" : "abandoned", {
    repetitions: practice.repetitions,
    cleanRuns: practice.cleanRuns,
    tempoPercent: tempoPercent(),
  });
  state.practiceLog = null;
}

// ----------------------------------------------------------------------------
//  Barre de commandes du sous-mode (plan/06 § 10)
//
//  Elle n'apparaît qu'une fois le bouton Travail enfoncé : l'écran de lecture
//  simple ne doit pas porter ces réglages.
// ----------------------------------------------------------------------------
function byId(id) {
  return document.getElementById(id);
}

function setPracticeEnabled(enabled) {
  const practice = state.practice;
  if (practice.enabled === enabled) return;
  practice.enabled = enabled;

  if (enabled) {
    resetPracticeCounters();
    openPracticeLog();
  } else {
    closePracticeLog();
    leaveWait({ resume: false });
    practice.hintKeys.clear();
    practice.wrongKeys.clear();
  }

  applyLoopPoints();
  rebuildGates();
  beginPracticeRun();
  if (state.audio.ready) buildPart(); // la main muette change avec le sous-mode
  renderPracticeBar(); // remesure le canvas : la barre change la hauteur utile
  drawImmediately();
}

// Rejoue le morceau à partir des réglages : appelée après tout changement qui
// modifie ce que l'application joue ou attend.
function refreshPracticeAudio({ rebuildGate = true } = {}) {
  if (rebuildGate) rebuildGates();
  if (state.audio.ready) {
    buildPart();
    if (state.isPlaying) Tone.Transport.seconds = state.currentTime / state.speed;
  }
  applyLoopPoints();
  beginPracticeRun();
}

function setPracticeHand(hand) {
  const practice = state.practice;
  if (practice.hand === hand) return;
  practice.hand = hand;
  leaveWait({ resume: false });
  refreshPracticeAudio();
  renderPracticeBar();
  scheduleDraw();
}

function setPracticeAccompany(accompany) {
  state.practice.accompany = accompany;
  refreshPracticeAudio({ rebuildGate: false });
  renderPracticeBar();
  scheduleDraw();
}

function setPracticeLoop(loop) {
  state.practice.loop = loop;
  // Le bilan ne compte que des tours de boucle : il repart de zéro quand la
  // boucle démarre, sinon « N tours » désignerait deux choses à la fois.
  if (loop) resetPracticeCounters();
  applyLoopPoints();
  renderPracticeBar();
}

// Retour immédiat au début du passage travaillé — au début du morceau si aucun
// passage n'est choisi. Ce n'est **pas** un tour de boucle : ce qui vient d'être
// joué est abandonné sans être jugé, sinon un demi-passage compterait comme une
// exécution ratée. `beginPracticeRun` remet `lastTransportTime` en même temps
// que les notes reçues : sans cela, `tick()` verrait le saut en arrière comme un
// bouclage et compterait le tour qu'on vient justement d'annuler.
function restartSection() {
  if (!state.song) return;
  const practice = state.practice;
  const start = sectionBounds().startSeconds;
  // Le gel de l'attente avait mis le Transport en pause : il faut le relancer
  // nous-mêmes, `leaveWait()` reprendrait là où il gelait.
  const wasFrozen = practice.waiting !== null && state.isPlaying;
  practice.waiting = null;
  practice.hintKeys.clear();

  setTime(start); // repositionne aussi le Transport pendant la lecture
  beginPracticeRun(start);

  if (state.isPlaying) {
    if (wasFrozen) Tone.Transport.start();
    state.lastVisualFrame = -Infinity;
    if (state.animationFrame !== null) cancelAnimationFrame(state.animationFrame);
    state.animationFrame = requestAnimationFrame(tick);
  }
  // Le curseur de position et l'horloge suivent : `setTime` l'a demandé,
  // `drawImmediately` l'honore.
  renderPracticeStatus();
  drawImmediately();
}

function setPracticeWait(wait) {
  state.practice.wait = wait;
  leaveWait({ resume: false });
  refreshPracticeAudio();
  renderPracticeBar();
  scheduleDraw();
}

// Tout ce que le bilan a accumulé sur le passage précédent. Remis à zéro dès
// que « N tours » cesserait de compter la même chose : autre passage, autre
// morceau, ou boucle relancée.
function resetPracticeCounters() {
  const practice = state.practice;
  practice.repetitions = 0;
  practice.cleanRuns = 0;
  practice.flawedStreak = 0;
  practice.lastReport = null;
  practice.reports = [];
  practice.suggestion = null;
}

function setActiveSection(sectionId) {
  const practice = state.practice;
  practice.sectionId = sectionId || null;
  resetPracticeCounters();
  leaveWait({ resume: false });

  const bounds = sectionBounds();
  if (state.currentTime < bounds.startSeconds || state.currentTime > bounds.endSeconds) {
    setTime(bounds.startSeconds);
  }
  refreshPracticeAudio();
  renderPracticeBar();
  drawImmediately();
}

// Où commence un nouveau passage : à la suite du précédent, parce qu'on découpe
// un morceau en passages qui s'enchaînent, pas en passages qui se chevauchent.
// « Le précédent », c'est celui qu'on travaille — on vient de le border, la
// suite commence là où il finit —, sinon le dernier découpé du morceau. Sans
// aucun passage, il ne reste que la position de lecture.
function nextSectionStart() {
  const previous = activeSection();
  if (previous) return previous.endSeconds;
  const sections = state.practice.sections;
  if (!sections.length) return state.currentTime;
  return sections.reduce((last, s) => Math.max(last, s.endSeconds), 0);
}

// Nouveau passage, dans le prolongement du précédent. Ses bornes restent
// déplaçables aussitôt (glissement sur le rouleau, « Début ici », « Fin ici ») :
// c'est un point de départ, pas un découpage imposé. Sa longueur par défaut est
// fixe — le découpage par mesures ou par phrases (plan/06 § 5) reste à évaluer.
function createSectionHere() {
  const practice = state.practice;
  if (!state.song || !practice.songId) return;
  const from = nextSectionStart();
  const bounds = clampBounds(
    from,
    from + DEFAULT_SECTION_SECONDS,
    songDuration()
  );
  const section = sectionStore.create(practice.songId, bounds);
  practice.sections = sectionStore.list(practice.songId);
  setActiveSection(section.id);
}

function renameActiveSection() {
  const section = activeSection();
  if (!section) return;
  // `prompt` est laid, mais c'est la seule saisie de texte de l'application :
  // un champ dédié encombrerait la barre pour un usage rare.
  const title = window.prompt("Nom du passage", section.title);
  if (!title) return;
  sectionStore.update(state.practice.songId, section.id, { title: title.trim() });
  state.practice.sections = sectionStore.list(state.practice.songId);
  renderPracticeBar();
  scheduleDraw();
}

function deleteActiveSection() {
  const section = activeSection();
  if (!section) return;
  sectionStore.remove(state.practice.songId, section.id);
  state.practice.sections = sectionStore.list(state.practice.songId);
  setActiveSection(null);
}

// Déplace une borne du passage actif, en secondes du morceau. Pendant un
// glissement, on ne persiste qu'au relâchement.
function moveSectionBound(which, time, { persist = true } = {}) {
  const section = activeSection();
  if (!section) return;
  const bounds = clampBounds(
    which === "start" ? time : section.startSeconds,
    which === "end" ? time : section.endSeconds,
    songDuration()
  );
  sectionStore.update(state.practice.songId, section.id, bounds, { persist });
  state.practice.sections = sectionStore.list(state.practice.songId);
  applyLoopPoints();
  rebuildGates();
}

// Borne saisissable sous le pointeur, ou null. Testée avant le défilement du
// rouleau : à moins de 14 px d'une borne, le geste la déplace.
function boundAtY(y) {
  const section = activeSection();
  if (!section) return null;
  const distanceToStart = Math.abs(y - timeToScreenY(section.startSeconds));
  const distanceToEnd = Math.abs(y - timeToScreenY(section.endSeconds));
  if (distanceToStart <= BOUND_GRAB_PX && distanceToStart <= distanceToEnd) {
    return "start";
  }
  if (distanceToEnd <= BOUND_GRAB_PX) return "end";
  return null;
}

function setTempoPercent(percent) {
  setSpeed(clampTempoPercent(percent) / 100);
}

function renderPracticeBar() {
  const practice = state.practice;
  const toggle = byId("practiceToggle");
  const bar = byId("practiceBar");
  if (!toggle || !bar) return;

  toggle.setAttribute("aria-pressed", String(practice.enabled));
  bar.hidden = !practice.enabled;
  // L'en-tête doit pouvoir se replier tant que la barre est là (cf. style.css).
  document
    .querySelector(".topbar")
    ?.classList.toggle("practice-open", practice.enabled);
  if (!practice.enabled) {
    syncCanvasSize();
    return;
  }

  const select = byId("practiceSection");
  if (select) {
    select.length = 1; // on garde « Morceau entier »
    for (const section of practice.sections) {
      const label = isMastered(section) ? `${section.title} ✓` : section.title;
      select.appendChild(new Option(label, section.id));
    }
    select.value = practice.sectionId ?? "";
  }

  const hasSection = activeSection() !== null;
  for (const button of document.querySelectorAll(".practice-hand")) {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.hand === practice.hand)
    );
  }
  setPressed("practiceAccompany", practice.accompany);
  // Allumé seulement quand ça boucle vraiment, pas quand c'est seulement voulu.
  setPressed("practiceLoop", isLooping());
  setPressed("practiceWait", practice.wait);

  // Sans main séparée, accompagner ou masquer ne veut rien dire.
  const accompany = byId("practiceAccompany");
  if (accompany) accompany.disabled = practice.hand === "both";

  const loop = byId("practiceLoop");
  if (loop) {
    loop.disabled = !hasSection;
    loop.title = hasSection
      ? "Répéter le passage en boucle"
      : "Choisis un passage pour le répéter en boucle";
  }

  // Le retour au début reste actif sans passage : il ramène alors au début du
  // morceau, ce qui a toujours un sens — inutile de le griser.
  const restart = byId("practiceRestart");
  if (restart) {
    const label = hasSection
      ? "Revenir au début du passage"
      : "Revenir au début du morceau";
    restart.title = label;
    restart.setAttribute("aria-label", label);
  }

  // Le « + » n'ouvre pas un passage au même endroit selon qu'il y en a déjà :
  // le bouton doit le dire avant qu'on clique.
  const add = byId("practiceAdd");
  if (add) {
    const label = practice.sections.length
      ? "Nouveau passage à la suite du précédent"
      : "Nouveau passage à la position actuelle";
    add.title = label;
    add.setAttribute("aria-label", label);
  }
  for (const id of ["practiceRename", "practiceDelete", "practiceMarkStart", "practiceMarkEnd"]) {
    const button = byId(id);
    if (button) button.disabled = !hasSection;
  }

  renderPracticeStatus();
  syncCanvasSize();
}

function setPressed(id, pressed) {
  byId(id)?.setAttribute("aria-pressed", String(pressed));
}

// Bilan compact du passage : uniquement ce qui a été mesuré (plan/06 § 9).
//
// Il ne s'affiche que sous boucle : ce qu'il compte, ce sont des tours du même
// passage. Hors boucle il n'y a pas de tours, donc rien à dire — sauf
// l'attente, qui est la seule explication d'un rouleau figé.
function renderPracticeStatus() {
  const text = byId("practiceStatusText");
  const apply = byId("practiceApplyTempo");
  if (!text) return;

  const practice = state.practice;
  if (!isLooping()) {
    text.textContent = practice.waiting ? "en attente de la note…" : "";
    if (apply) apply.hidden = true;
    syncCanvasSize();
    return;
  }

  const entry = sectionStore.get(
    practice.songId,
    practice.sectionId ?? WHOLE_SONG_ID
  );
  const parts = [];

  parts.push(
    practice.repetitions === 1 ? "1 tour" : `${practice.repetitions} tours`
  );
  if (practice.lastReport) {
    parts.push(`${practice.cleanRuns} propre${practice.cleanRuns > 1 ? "s" : ""}`);
    const report = practice.lastReport;
    parts.push(`dernier : ${report.correct}/${report.total}`);
    const rework = notesToRework(practice.reports, 1)[0];
    if (rework) parts.push(`à revoir : ${rework.label}`);
  } else if (practice.repetitions > 0) {
    // Aucune note reçue : on ne montre aucun pourcentage inventé.
    parts.push("aucune note reçue — pratique libre");
  }
  if (entry?.bestCleanTempoPercent) {
    parts.push(`record ${entry.bestCleanTempoPercent} %`);
  }
  if (isMastered(entry)) parts.push("passage maîtrisé ✓");
  if (sectionStore.learned(practice.songId)) parts.push("morceau appris ✓");
  if (practice.waiting) parts.push("en attente de la note…");

  text.textContent = parts.join(" · ");

  if (apply) {
    const suggestion = practice.suggestion;
    apply.hidden = !suggestion;
    if (suggestion) {
      apply.textContent =
        suggestion.direction === "up"
          ? `Monter à ${suggestion.percent} %`
          : `Redescendre à ${suggestion.percent} %`;
    }
  }

  // Le bilan peut passer à la ligne en petite largeur : l'en-tête grandit, le
  // canvas rétrécit.
  syncCanvasSize();
}

// Recharge les passages enregistrés pour le morceau courant.
function loadSectionsForSong(title) {
  const practice = state.practice;
  practice.songId = songIdFromTitle(title);
  practice.sections = sectionStore.list(practice.songId);
  practice.sectionId =
    practice.sections.find((s) => s.id === practice.sectionId)?.id ?? null;
  resetPracticeCounters();
  practice.waiting = null;
  rebuildGates();
  beginPracticeRun(0);
  renderPracticeBar();
}

function attachPracticeControls(signal) {
  const on = (id, event, handler) =>
    byId(id)?.addEventListener(event, handler, { signal });

  on("practiceToggle", "click", () =>
    setPracticeEnabled(!state.practice.enabled)
  );
  on("practiceSection", "change", (e) => setActiveSection(e.target.value));
  on("practiceAdd", "click", createSectionHere);
  on("practiceRename", "click", renameActiveSection);
  on("practiceDelete", "click", deleteActiveSection);
  on("practiceMarkStart", "click", () => {
    moveSectionBound("start", state.currentTime);
    renderPracticeBar();
    drawImmediately();
  });
  on("practiceMarkEnd", "click", () => {
    moveSectionBound("end", state.currentTime);
    renderPracticeBar();
    drawImmediately();
  });

  for (const button of document.querySelectorAll(".practice-hand")) {
    button.addEventListener(
      "click",
      () => setPracticeHand(button.dataset.hand),
      { signal }
    );
  }

  on("practiceAccompany", "click", () =>
    setPracticeAccompany(!state.practice.accompany)
  );
  on("practiceLoop", "click", () => setPracticeLoop(!state.practice.loop));
  on("practiceRestart", "click", restartSection);
  on("practiceWait", "click", () => setPracticeWait(!state.practice.wait));
  on("practiceApplyTempo", "click", () => {
    const suggestion = state.practice.suggestion;
    if (!suggestion) return;
    state.practice.suggestion = null;
    setTempoPercent(suggestion.percent);
    renderPracticeStatus();
  });
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

// Afficher ou masquer la barre de travail change la hauteur de l'en-tête, donc
// celle du canvas — sans qu'aucun `resize` de fenêtre ne soit émis. Sans cela,
// le tampon du canvas resterait à l'ancienne taille : rouleau étiré, et surtout
// touches dessinées ailleurs qu'où le doigt les touche.
function syncCanvasSize() {
  if (!isRunning()) return;
  if (
    canvas.clientWidth === layout.width &&
    canvas.clientHeight === layout.height
  ) {
    return;
  }
  // Immédiat, et non différé : le dessin qui suit doit déjà être aux bonnes
  // mesures. Ce chemin ne part que d'un geste de l'utilisateur, jamais de la
  // boucle d'animation.
  if (state.pendingResize !== null) {
    cancelAnimationFrame(state.pendingResize);
    state.pendingResize = null;
  }
  resizeCanvas();
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
//  Chargement d'un morceau de la bibliothèque / démo
// ----------------------------------------------------------------------------
function resetForNewSong(label) {
  pause({ refresh: false });
  disposePart();
  state.currentTime = 0;
  document.getElementById("seek").max = String(songDuration());
  updateSongInfo(label);
  // Les passages appartiennent au morceau : changer de morceau change de
  // découpage, et le travail en cours n'a plus lieu d'être reporté.
  closePracticeLog();
  loadSectionsForSong(label);
  if (state.practice.enabled) openPracticeLog();
  applyLoopPoints();
  syncTransportUI(true);
  drawImmediately();
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

// Ce que dit l'option d'invite du <select>, selon la nature de la bibliothèque
// affichée. Le mode est le même lecteur dans les deux cas ; seul son catalogue
// change (cf. `song-library.js`).
const LIBRARY_PROMPT = {
  song: "Bibliothèque de morceaux…",
  exercice: "Bibliothèque d'exercices…",
};

// Entrées visibles dans le <select> : celles de la nature en cours, avec leur
// indice dans le catalogue complet.
let visibleEntries = [];

// Remplit le <select> avec les entrées de nature `kind`. Renvoie true si au
// moins une a été trouvée. Le <select> appartient à index.html et survit au
// changement de mode : on repart de la seule option d'invite pour ne pas
// empiler les morceaux à chaque démarrage du mode.
async function loadSongLibrary(kind) {
  const select = document.getElementById("songSelect");
  await loadSongCatalog();
  visibleEntries = entriesOfKind(kind);

  select.length = 1;
  select.options[0].textContent = LIBRARY_PROMPT[kind] ?? LIBRARY_PROMPT.song;
  for (const { index, song } of visibleEntries) {
    select.appendChild(new Option(song.title, String(index)));
  }
  return visibleEntries.length > 0;
}

// Charge le morceau d'indice `idx` du catalogue et synchronise le <select>.
async function selectSong(idx) {
  const song = songAt(idx);
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
  let draggingBound = null; // "start" | "end" en sous-mode Travail
  canvas.addEventListener("pointerdown", (e) => {
    const p = pointerPos(e.clientX, e.clientY);
    // Clic dans la zone clavier : on joue la touche, sans défiler.
    if (p.y >= keyboardTop()) {
      const midi = keyAtPosition(p.x, p.y);
      if (midi != null) pressKey(midi);
      return;
    }
    // Bornes du passage : elles se saisissent avant le défilement, sinon on
    // ne pourrait jamais les attraper.
    draggingBound = boundAtY(p.y);
    if (draggingBound) {
      canvas.style.cursor = "ns-resize";
      canvas.setPointerCapture(e.pointerId);
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
    if (draggingBound) {
      moveSectionBound(draggingBound, screenYToTime(p.y), { persist: false });
      drawImmediately();
      return;
    }
    if (!dragging) {
      // Curseur « main » au survol du clavier, « grab » sur le rouleau, et
      // « redimensionner » sur une borne de passage.
      canvas.style.cursor =
        p.y >= keyboardTop() ? "pointer" : boundAtY(p.y) ? "ns-resize" : "grab";
      return;
    }
    if (Math.abs(p.y - downY) > 3) moved = true;
    setTime(state.currentTime + (p.y - lastY) / PIXELS_PER_SECOND);
    lastY = p.y;
  }, { signal });
  const endDrag = (e) => {
    if (draggingBound) {
      draggingBound = null;
      canvas.style.cursor = "grab";
      sectionStore.flush();
      renderPracticeBar();
      return;
    }
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
    () => {
      dragging = false;
      draggingBound = null;
    },
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

  // Vitesse de lecture, par pas de 5 % : un clic = une reconstruction du Part
  // de Tone, là où le curseur d'avant devait attendre le relâché pour ne pas en
  // faire trente pendant un glissé.
  document.getElementById("speedDown").addEventListener(
    "click",
    () => setTempoPercent(tempoPercent() - TEMPO_STEP_PERCENT),
    { signal }
  );
  document.getElementById("speedUp").addEventListener(
    "click",
    () => setTempoPercent(tempoPercent() + TEMPO_STEP_PERCENT),
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
// `options.songFile` — chemin d'un fichier du catalogue à ouvrir d'emblée. Le
// mode Exercices s'en sert pour ouvrir un morceau d'étude dans ce lecteur : la
// nature de la bibliothèque affichée suit celle du fichier demandé, si bien que
// le <select> propose ensuite les autres exercices, pas les morceaux.
function start(host, options) {
  container = host;
  state = createSession();
  state.requestedFile = options?.songFile ?? null;
  listeners = new AbortController();

  // Les contrôles propres au mode vivent dans index.html, séparés de la barre
  // commune ; le canvas, lui, appartient à la scène de la fonctionnalité.
  const controls = document.getElementById("songControls");
  if (controls) controls.hidden = false;

  canvas = document.createElement("canvas");
  canvas.id = "rollCanvas";
  container.appendChild(canvas);
  ctx = canvas.getContext("2d", { alpha: false });

  // Le journal de progression n'est réécrit que par intervalles : on force
  // l'enregistrement au masquage de la page, comme les autres modes (plan/F3 § 8).
  window.addEventListener("pagehide", flushProgress, { signal: listeners.signal });
  document.addEventListener("visibilitychange", onVisibilityChange, {
    signal: listeners.signal,
  });

  attachInteractions(listeners.signal);
  attachPracticeControls(listeners.signal);
  attachMidiKeyboard();
  renderPracticeBar();
  resizeCanvas();
  loadInitialSong();
}

// ----------------------------------------------------------------------------
//  Clavier physique (fondation F2)
//
//  Une note jouée sur le clavier branché doit produire le **même** retour que
//  la même touche cliquée à l'écran : elle s'allume et elle sonne
//  (plan/F2 § 7) — sauf en mode Attente, où le piano de l'utilisateur sonne
//  déjà (voir `echoesPlayedNotes`). C'est tout ce que le mode Morceau fait du
//  MIDI pour l'instant — savoir si la note était la bonne appartient au travail
//  guidé de plan/06, et n'est pas décidé ici.
//
//  Différence avec le clic : la touche reste allumée tant que la note est
//  tenue, au lieu de se rallumer pendant 220 ms. Un vrai clavier dit quand on
//  relâche, une souris ne le dit pas.
// ----------------------------------------------------------------------------
function attachMidiKeyboard() {
  const session = state;
  session.stopMidi = midiInput.onNote((event) => {
    if (!isRunning() || session.stopped) return;
    if (event.type !== "noteon") {
      releaseKey(event.midi);
      return;
    }
    // L'horodatage du message est plus juste que l'instant où ce rappel
    // s'exécute : c'est l'ordre de grandeur que mesure la fenêtre de tolérance
    // du travail guidé (CLAUDE.md, entrée MIDI).
    const lateness = Math.max(0, performance.now() - event.timestamp) / 1000;
    holdKey(event.midi, lateness);
  });
}

function holdKey(midi, lateness = 0) {
  const session = state;
  notePlayed(midi, lateness);
  if (session.pressedKeys.has(midi)) return;
  session.pressedKeys.add(midi);
  scheduleDraw();
  if (!echoesPlayedNotes(session)) return;
  session.audio.playNote(midi).catch((error) => {
    console.error("Impossible de jouer la note reçue du clavier MIDI.", error);
  });
}

// En mode Attente, la note vient d'un vrai piano : elle a déjà sonné sous les
// doigts. La rejouer ferait entendre la même note deux fois à quelques
// millisecondes d'écart — le doublon est d'autant plus gênant que c'est
// justement le mode où l'application se tait sur la main travaillée
// (`isAudibleNote`). Ne concerne que le clavier physique : une touche cliquée à
// l'écran n'a pas d'autre source de son que l'application.
function echoesPlayedNotes(session) {
  const practice = session.practice;
  return !(practice.enabled && practice.wait);
}

function releaseKey(midi) {
  const session = state;
  if (!session.pressedKeys.delete(midi)) return;
  scheduleDraw();
}

function stop() {
  if (!state) return;
  const session = state;

  // 1. Figer la position lue sur le Transport, puis la mémoriser : revenir
  //    dans le mode reprend là où l'utilisateur s'était arrêté. La séance de
  //    travail éventuellement ouverte est refermée ici, jamais laissée en l'air.
  pause({ refresh: false });
  closePracticeLog();
  session.progress.flush();
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

  // 4. Retirer les écouteurs (canvas, contrôles, window, document), et se
  //    désabonner du clavier physique — qui reste connecté, étant partagé.
  session.stopMidi?.();
  session.stopMidi = null;
  listeners.abort();
  listeners = null;

  // 5. Rendre la scène et masquer les contrôles du mode, sous-mode compris.
  const controls = document.getElementById("songControls");
  if (controls) controls.hidden = true;
  const practiceBar = document.getElementById("practiceBar");
  if (practiceBar) practiceBar.hidden = true;
  document.querySelector(".topbar")?.classList.remove("practice-open");
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

  // La nature de la bibliothèque est décidée avant tout le reste : elle dit
  // quelles entrées peuplent le <select>, et donc lesquelles peuvent être
  // restaurées. Sans demande explicite, c'est le répertoire.
  await loadSongCatalog();
  if (session.stopped) return;
  const requestedIndex = session.requestedFile ? indexOfFile(session.requestedFile) : -1;
  session.libraryKind =
    requestedIndex >= 0 ? kindOf(songAt(requestedIndex)) : "song";

  const hasLibrary = await loadSongLibrary(session.libraryKind);
  if (session.stopped) return;

  // Réglages indépendants du morceau : applicables immédiatement.
  if (saved) {
    if (typeof saved.speed === "number") {
      setSpeed(clampTempoPercent(saved.speed * 100) / 100);
    }
    if (typeof saved.showNotation === "boolean") {
      session.showNotation = saved.showNotation;
      document.getElementById("notationToggle").checked = saved.showNotation;
    }
  }

  // Choix du morceau à charger : celui qu'on demande, sinon le dernier ouvert
  // dans cette bibliothèque, sinon sa première entrée.
  const remembered = saved?.library?.[session.libraryKind];
  const rememberedIndex =
    remembered &&
    Number.isInteger(remembered.index) &&
    songAt(remembered.index)?.title === remembered.title &&
    kindOf(songAt(remembered.index)) === session.libraryKind
      ? remembered.index
      : -1;

  let loadedIndex = -1;
  if (requestedIndex >= 0) {
    loadedIndex = requestedIndex;
  } else if (rememberedIndex >= 0) {
    loadedIndex = rememberedIndex;
  } else if (hasLibrary) {
    loadedIndex = visibleEntries[0].index;
  }

  if (loadedIndex >= 0) {
    await selectSong(loadedIndex);
    if (session.stopped) return;
  } else {
    loadDemo();
  }

  // La position de lecture est restaurée après coup — le chargement du morceau
  // (resetForNewSong) remet currentTime à 0 —, et seulement si c'est bien le
  // morceau qu'on avait quitté : la position d'un autre n'a aucun sens ici.
  if (loadedIndex === rememberedIndex && remembered.currentTime > 0) {
    setTime(remembered.currentTime);
  }

  // Le sous-mode Travail est restauré en dernier : ses passages n'existent
  // qu'une fois le morceau chargé (resetForNewSong les a relus).
  restorePracticeSettings(saved?.practice);

  startAutoSave();
}

function restorePracticeSettings(saved) {
  if (!saved) return;
  const practice = state.practice;
  if (saved.hand === "left" || saved.hand === "right" || saved.hand === "both") {
    practice.hand = saved.hand;
  }
  if (typeof saved.accompany === "boolean") practice.accompany = saved.accompany;
  if (typeof saved.loop === "boolean") practice.loop = saved.loop;
  if (typeof saved.wait === "boolean") practice.wait = saved.wait;
  if (practice.sections.some((section) => section.id === saved.sectionId)) {
    practice.sectionId = saved.sectionId;
  }
  if (saved.enabled) setPracticeEnabled(true);
  else renderPracticeBar();
}
