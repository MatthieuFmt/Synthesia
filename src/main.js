// ============================================================================
//  Synthesia Web — Étape 1
//  Chargement / parsing MIDI + initialisation du Canvas avec les repères
//  (lignes de mesure + lignes verticales Do/Mi) et défilement vertical.
//
//  Modèle d'affichage :
//    - Axe X  = hauteur des notes (clavier piano de gauche à droite)
//    - Axe Y  = temps. Le bas du canvas = début du morceau ; on défile
//               vers le HAUT pour avancer dans le morceau.
// ============================================================================

import { Midi } from "https://cdn.jsdelivr.net/npm/@tonejs/midi@2.0.28/+esm";

// ----------------------------------------------------------------------------
//  Constantes de configuration
// ----------------------------------------------------------------------------
const MIDI_LOW = 21;            // A0  : note la plus grave d'un piano 88 touches
const MIDI_HIGH = 108;          // C8  : note la plus aiguë
const PIXELS_PER_SECOND = 140;  // échelle temporelle verticale
const SPLIT_NOTE = 60;          // Do central : seuil graves/aigus pour le fallback

// Demi-tons appartenant à une touche blanche (Do, Ré, Mi, Fa, Sol, La, Si)
const WHITE_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11];

const COLORS = {
  background: "#0d1117",
  gridMeasure: "#3a4150",
  gridDoMi: "#262c36",
  whiteKey: "#11161d",
  blackKey: "#0a0d12",
  rightHand: "#4ea1ff",
  rightHandEdge: "#9ccbff",
  leftHand: "#2ecc71",
  leftHandEdge: "#86e9b0",
  label: "#6e7681",
};

// ----------------------------------------------------------------------------
//  État global
// ----------------------------------------------------------------------------
const canvas = document.getElementById("rollCanvas");
const ctx = canvas.getContext("2d");

const state = {
  song: null,       // morceau parsé (voir buildSong)
  scrollY: 0,       // décalage de défilement, en pixels (0 = bas/début)
  dpr: 1,           // device pixel ratio
};

// ----------------------------------------------------------------------------
//  Disposition du clavier : position horizontale de chaque note MIDI
//  On répartit les touches blanches sur toute la largeur ; les touches
//  noires se placent entre deux blanches.
// ----------------------------------------------------------------------------
function isWhite(midi) {
  return WHITE_PITCH_CLASSES.includes(((midi % 12) + 12) % 12);
}

// Nombre de touches blanches dans l'intervalle [MIDI_LOW, MIDI_HIGH]
function countWhiteKeys() {
  let n = 0;
  for (let m = MIDI_LOW; m <= MIDI_HIGH; m++) if (isWhite(m)) n++;
  return n;
}

const TOTAL_WHITE_KEYS = countWhiteKeys();

// Index de touche blanche (0..TOTAL_WHITE_KEYS-1) pour une note blanche donnée
function whiteIndex(midi) {
  let idx = 0;
  for (let m = MIDI_LOW; m < midi; m++) if (isWhite(m)) idx++;
  return idx;
}

// Largeur d'une touche blanche en pixels (dépend de la largeur du canvas)
function whiteKeyWidth() {
  return canvas.clientWidth / TOTAL_WHITE_KEYS;
}

// Position X (centre) et largeur d'une note quelconque
function noteGeometry(midi) {
  const w = whiteKeyWidth();
  if (isWhite(midi)) {
    const x = whiteIndex(midi) * w;
    return { x, width: w, centerX: x + w / 2, white: true };
  }
  // Touche noire : centrée sur la frontière entre la blanche précédente et suivante
  const prevWhiteX = whiteIndex(midi - 1) * w; // la blanche juste en dessous
  const centerX = prevWhiteX + w;              // frontière des deux blanches
  const blackW = w * 0.62;
  return { x: centerX - blackW / 2, width: blackW, centerX, white: false };
}

// Bord gauche d'une touche blanche (utile pour la ligne « à gauche du Do »)
function whiteLeftEdge(midi) {
  return whiteIndex(midi) * whiteKeyWidth();
}

// ----------------------------------------------------------------------------
//  Conversion temps <-> coordonnée écran (Y)
//  Le bas du canvas correspond à (temps courant - scroll). Le temps croît
//  vers le haut.
// ----------------------------------------------------------------------------
function timeToScreenY(time) {
  return canvas.clientHeight - (time * PIXELS_PER_SECOND - state.scrollY);
}

// ----------------------------------------------------------------------------
//  Construction d'un « song » normalisé à partir d'un objet Midi (Tone.js)
//
//  Sortie :
//  {
//    notes:    [{ midi, time, duration, hand }],   hand: "left" | "right"
//    measures: [time0, time1, ...],                débuts de mesure (s)
//    duration: number (s),
//    meta:     { name, bpm, timeSignature }
//  }
// ----------------------------------------------------------------------------
function buildSong(midi) {
  const ppq = midi.header.ppq;

  // --- Séparation des mains -------------------------------------------------
  // Stratégie : si le fichier a au moins 2 pistes contenant des notes, on
  // considère la piste la plus aiguë comme la main droite et la plus grave
  // comme la main gauche. Sinon, on répartit note par note autour du Do central.
  const tracksWithNotes = midi.tracks.filter((t) => t.notes.length > 0);

  let handForTrack = new Map();
  if (tracksWithNotes.length >= 2) {
    // Moyenne des hauteurs par piste -> la plus grave = main gauche
    const avg = (t) =>
      t.notes.reduce((s, n) => s + n.midi, 0) / t.notes.length;
    const sorted = [...tracksWithNotes].sort((a, b) => avg(a) - avg(b));
    sorted.forEach((t, i) => {
      handForTrack.set(t, i === 0 ? "left" : "right");
    });
  }

  const notes = [];
  for (const track of tracksWithNotes) {
    const trackHand = handForTrack.get(track);
    for (const n of track.notes) {
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
        hand,
      });
    }
  }
  notes.sort((a, b) => a.time - b.time);

  // --- Durée totale ---------------------------------------------------------
  const duration = Math.max(
    midi.duration,
    notes.reduce((m, n) => Math.max(m, n.time + n.duration), 0)
  );

  // --- Lignes de mesure -----------------------------------------------------
  const measures = computeMeasures(midi, ppq, duration);

  // --- Métadonnées ----------------------------------------------------------
  const tempo = midi.header.tempos[0];
  const sig = midi.header.timeSignatures[0];
  const meta = {
    name: midi.name || "Sans titre",
    bpm: tempo ? Math.round(tempo.bpm) : 120,
    timeSignature: sig ? sig.timeSignature : [4, 4],
  };

  return { notes, measures, duration, meta };
}

// ----------------------------------------------------------------------------
//  Calcul des débuts de mesure à partir du tempo et de la signature rythmique.
//
//  On raisonne en « ticks » : une mesure dure
//      ticksParMesure = ppq * numerateur * 4 / denominateur
//  puis on convertit chaque frontière de mesure en secondes via Tone.js
//  (header.ticksToSeconds), ce qui gère correctement les changements de tempo.
// ----------------------------------------------------------------------------
function computeMeasures(midi, ppq, duration) {
  const measures = [];
  const sigs =
    midi.header.timeSignatures.length > 0
      ? midi.header.timeSignatures
      : [{ ticks: 0, timeSignature: [4, 4] }];

  // Tick final approximatif (pour borner la boucle)
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
  // Sécurité : au moins la mesure 0
  if (measures.length === 0) measures.push(0);
  return measures;
}

// ----------------------------------------------------------------------------
//  Rendu
// ----------------------------------------------------------------------------
function draw() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, w, h);

  drawKeyboardColumns(w, h);
  drawDoMiLines(w, h);

  if (state.song) {
    drawMeasureLines(w, h);
    drawNotes();
  }
}

// Colonnes de fond : alterne légèrement blanches / noires pour la lisibilité
function drawKeyboardColumns(w, h) {
  for (let m = MIDI_LOW; m <= MIDI_HIGH; m++) {
    if (isWhite(m)) continue; // on ne peint que les colonnes noires
    const g = noteGeometry(m);
    ctx.fillStyle = COLORS.blackKey;
    ctx.fillRect(g.x, 0, g.width, h);
  }
}

// Repères verticaux : une ligne à GAUCHE de chaque Do, une à DROITE de chaque Mi
function drawDoMiLines(w, h) {
  ctx.strokeStyle = COLORS.gridDoMi;
  ctx.lineWidth = 1;

  for (let m = MIDI_LOW; m <= MIDI_HIGH; m++) {
    const pc = ((m % 12) + 12) % 12;

    if (pc === 0) {
      // Do : ligne juste à gauche de la touche
      line(crisp(whiteLeftEdge(m)), 0, crisp(whiteLeftEdge(m)), h);
    } else if (pc === 4) {
      // Mi : ligne juste à droite de la touche
      const right = whiteLeftEdge(m) + whiteKeyWidth();
      line(crisp(right), 0, crisp(right), h);
    }
  }

  // Étiquettes d'octave (C1, C2, ...) sur chaque Do
  ctx.fillStyle = COLORS.label;
  ctx.font = "10px system-ui, sans-serif";
  for (let m = MIDI_LOW; m <= MIDI_HIGH; m++) {
    if (((m % 12) + 12) % 12 === 0) {
      const octave = Math.floor(m / 12) - 1;
      ctx.fillText(`C${octave}`, whiteLeftEdge(m) + 2, h - 4);
    }
  }
}

// Repères horizontaux : une ligne par début de mesure
function drawMeasureLines(w, h) {
  ctx.strokeStyle = COLORS.gridMeasure;
  ctx.lineWidth = 1;
  ctx.fillStyle = COLORS.label;
  ctx.font = "10px system-ui, sans-serif";

  state.song.measures.forEach((t, i) => {
    const y = timeToScreenY(t);
    if (y < -20 || y > h + 20) return; // hors écran : on saute
    line(0, crisp(y), w, crisp(y));
    ctx.fillText(`${i + 1}`, 4, y - 3);
  });
}

// Notes : rectangles arrondis, colorés selon la main
function drawNotes() {
  const h = canvas.clientHeight;

  for (const n of state.song.notes) {
    const yBottom = timeToScreenY(n.time);
    const yTop = timeToScreenY(n.time + n.duration);

    // Culling : on ne dessine que ce qui est visible
    if (yBottom < -50 || yTop > h + 50) continue;

    const g = noteGeometry(n.midi);
    const isRight = n.hand === "right";

    ctx.fillStyle = isRight ? COLORS.rightHand : COLORS.leftHand;
    ctx.strokeStyle = isRight ? COLORS.rightHandEdge : COLORS.leftHandEdge;
    ctx.lineWidth = 1.5;

    const pad = 1;
    roundRect(
      g.x + pad,
      yTop,
      Math.max(2, g.width - pad * 2),
      Math.max(3, yBottom - yTop),
      4
    );
    ctx.fill();
    ctx.stroke();
  }
}

// --- Petits utilitaires de dessin ------------------------------------------
function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// Aligne sur la demi-pixel pour des lignes nettes
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

// ----------------------------------------------------------------------------
//  Défilement
// ----------------------------------------------------------------------------
function maxScroll() {
  if (!state.song) return 0;
  const contentHeight = state.song.duration * PIXELS_PER_SECOND;
  return Math.max(0, contentHeight - canvas.clientHeight + 40);
}

function setScroll(value) {
  state.scrollY = Math.max(0, Math.min(maxScroll(), value));
  draw();
}

// ----------------------------------------------------------------------------
//  Gestion du canvas haute densité (Retina) + redimensionnement
// ----------------------------------------------------------------------------
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  state.dpr = dpr;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  setScroll(state.scrollY); // re-clamp + redraw
}

// ----------------------------------------------------------------------------
//  Chargement d'un fichier MIDI
// ----------------------------------------------------------------------------
async function loadMidiFile(file) {
  try {
    const buffer = await file.arrayBuffer();
    const midi = new Midi(buffer);
    state.song = buildSong(midi);
    state.scrollY = 0;
    updateSongInfo(file.name);
    draw();
  } catch (err) {
    console.error(err);
    updateSongInfo(null, `Erreur de lecture : ${err.message}`);
  }
}

function updateSongInfo(fileName, error) {
  const el = document.getElementById("songInfo");
  if (error) {
    el.textContent = error;
    return;
  }
  if (!state.song) {
    el.textContent = "Aucun morceau chargé.";
    return;
  }
  const m = state.song.meta;
  el.textContent =
    `${fileName ? fileName + " — " : ""}${m.name} · ` +
    `${m.bpm} BPM · mesure ${m.timeSignature[0]}/${m.timeSignature[1]} · ` +
    `${state.song.notes.length} notes · ${state.song.duration.toFixed(1)} s`;
}

// ----------------------------------------------------------------------------
//  Génération d'un morceau de DÉMO (données MIDI fictives) pour démarrer
//  sans fichier. On crée un vrai objet Midi puis on le passe dans buildSong,
//  afin d'exercer exactement le même chemin que l'import.
// ----------------------------------------------------------------------------
function buildDemoSong() {
  const midi = new Midi();
  midi.name = "Démo — Gamme & accords";
  midi.header.setTempo(96);
  midi.header.timeSignatures = [];
  midi.header.update();

  const right = midi.addTrack();
  const left = midi.addTrack();

  // Main droite : une gamme de Do majeur qui monte (noires)
  const scale = [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60];
  let t = 0;
  const beat = 60 / 96; // durée d'une noire à 96 BPM
  for (const midiNote of scale) {
    right.addNote({ midi: midiNote, time: t, duration: beat * 0.9 });
    t += beat;
  }

  // Main gauche : accords (Do, Fa, Sol) en blanches
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
    tc += half * 2; // un accord toutes les deux blanches
  }

  return buildSong(midi);
}

function loadDemo() {
  state.song = buildDemoSong();
  state.scrollY = 0;
  updateSongInfo("Démo");
  draw();
}

// ----------------------------------------------------------------------------
//  Interactions : molette + glisser
// ----------------------------------------------------------------------------
function attachInteractions() {
  // Molette : vers le haut = avancer dans le morceau
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      setScroll(state.scrollY - e.deltaY);
    },
    { passive: false }
  );

  // Glisser (souris / tactile via Pointer Events)
  let dragging = false;
  let lastY = 0;
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    // glisser vers le bas = reculer ; vers le haut = avancer
    setScroll(state.scrollY + (e.clientY - lastY));
    lastY = e.clientY;
  });
  const endDrag = () => (dragging = false);
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
}

// ----------------------------------------------------------------------------
//  Initialisation
// ----------------------------------------------------------------------------
function init() {
  document
    .getElementById("midiInput")
    .addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) loadMidiFile(file);
    });

  document.getElementById("demoBtn").addEventListener("click", loadDemo);

  window.addEventListener("resize", resizeCanvas);

  attachInteractions();
  resizeCanvas();
  loadDemo(); // on démarre directement sur la démo
}

init();
