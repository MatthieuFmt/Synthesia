// ============================================================================
//  Synthesia Web — Étapes 1 & 2
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
// ============================================================================

import { Midi } from "https://cdn.jsdelivr.net/npm/@tonejs/midi@2.0.28/+esm";
import * as Tone from "https://cdn.jsdelivr.net/npm/tone@14.8.49/+esm";

// ----------------------------------------------------------------------------
//  Constantes de configuration
// ----------------------------------------------------------------------------
const MIDI_LOW = 21;            // A0  : note la plus grave d'un piano 88 touches
const MIDI_HIGH = 108;          // C8  : note la plus aiguë
const PIXELS_PER_SECOND = 140;  // échelle temporelle verticale
const SPLIT_NOTE = 60;          // Do central : seuil graves/aigus pour le fallback
const PLAYHEAD_RATIO = 0.18;    // position de la ligne de lecture (fraction du bas)

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
  leftHand: "#2ecc71",
  leftHandEdge: "#86e9b0",
  active: "#ffffff",
  cursor: "#ffae57",
  label: "#6e7681",
  cardBg: "#f6f1e3", // fond « papier » des mini-portées
  ink: "#1b1b1b",    // encre des portées / notes
};

// ----------------------------------------------------------------------------
//  État global
// ----------------------------------------------------------------------------
const canvas = document.getElementById("rollCanvas");
const ctx = canvas.getContext("2d");

const state = {
  song: null,        // morceau parsé (voir buildSong)
  currentTime: 0,    // position de lecture, en secondes (source de vérité)
  isPlaying: false,
  showNotation: true, // mini-portées sur les notes
  dpr: 1,

  // Audio (Tone.js), initialisé paresseusement au premier play
  audioReady: false,
  synth: null,
  part: null,
};

// ----------------------------------------------------------------------------
//  Disposition du clavier : position horizontale de chaque note MIDI
// ----------------------------------------------------------------------------
function isWhite(midi) {
  return WHITE_PITCH_CLASSES.includes(((midi % 12) + 12) % 12);
}

function countWhiteKeys() {
  let n = 0;
  for (let m = MIDI_LOW; m <= MIDI_HIGH; m++) if (isWhite(m)) n++;
  return n;
}

const TOTAL_WHITE_KEYS = countWhiteKeys();

function whiteIndex(midi) {
  let idx = 0;
  for (let m = MIDI_LOW; m < midi; m++) if (isWhite(m)) idx++;
  return idx;
}

function whiteKeyWidth() {
  return canvas.clientWidth / TOTAL_WHITE_KEYS;
}

function noteGeometry(midi) {
  const w = whiteKeyWidth();
  if (isWhite(midi)) {
    const x = whiteIndex(midi) * w;
    return { x, width: w, centerX: x + w / 2, white: true };
  }
  const prevWhiteX = whiteIndex(midi - 1) * w;
  const centerX = prevWhiteX + w;
  const blackW = w * 0.62;
  return { x: centerX - blackW / 2, width: blackW, centerX, white: false };
}

function whiteLeftEdge(midi) {
  return whiteIndex(midi) * whiteKeyWidth();
}

// ----------------------------------------------------------------------------
//  Temps <-> coordonnée écran (Y)
//
//  La ligne de lecture (playhead) est fixe à `playheadY`. La note dont le temps
//  vaut `currentTime` s'y trouve toujours. On en déduit :
//      screenY(time) = playheadY - (time - currentTime) * PIXELS_PER_SECOND
//  Le temps croît vers le haut (delta positif => plus haut).
// ----------------------------------------------------------------------------
function playheadY() {
  return canvas.clientHeight * (1 - PLAYHEAD_RATIO);
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
        velocity: n.velocity ?? 0.8,
        hand,
      });
    }
  }
  notes.sort((a, b) => a.time - b.time);

  const duration = Math.max(
    midi.duration,
    notes.reduce((m, n) => Math.max(m, n.time + n.duration), 0)
  );

  const measures = computeMeasures(midi, ppq, duration);

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
    if (state.showNotation) drawNotationCards();
  }

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

  for (let m = MIDI_LOW; m <= MIDI_HIGH; m++) {
    const pc = ((m % 12) + 12) % 12;
    if (pc === 0) {
      line(crisp(whiteLeftEdge(m)), 0, crisp(whiteLeftEdge(m)), h);
    } else if (pc === 4) {
      const right = whiteLeftEdge(m) + whiteKeyWidth();
      line(crisp(right), 0, crisp(right), h);
    }
  }

  ctx.fillStyle = COLORS.label;
  ctx.font = "10px system-ui, sans-serif";
  for (let m = MIDI_LOW; m <= MIDI_HIGH; m++) {
    if (((m % 12) + 12) % 12 === 0) {
      const octave = Math.floor(m / 12) - 1;
      ctx.fillText(`C${octave}`, whiteLeftEdge(m) + 2, h - 4);
    }
  }
}

// Repères horizontaux : débuts de mesure
function drawMeasureLines(w, h) {
  ctx.strokeStyle = COLORS.gridMeasure;
  ctx.lineWidth = 1;
  ctx.fillStyle = COLORS.label;
  ctx.font = "10px system-ui, sans-serif";

  state.song.measures.forEach((t, i) => {
    const y = timeToScreenY(t);
    if (y < -20 || y > h + 20) return;
    line(0, crisp(y), w, crisp(y));
    ctx.fillText(`${i + 1}`, 4, y - 3);
  });
}

// Notes : rectangles arrondis colorés par main, surbrillance si en cours
function drawNotes() {
  const h = canvas.clientHeight;
  const now = state.currentTime;

  for (const n of state.song.notes) {
    const yBottom = timeToScreenY(n.time);
    const yTop = timeToScreenY(n.time + n.duration);
    if (yBottom < -50 || yTop > h + 50) continue;

    const g = noteGeometry(n.midi);
    const isRight = n.hand === "right";
    const isActive = now >= n.time && now <= n.time + n.duration;

    ctx.fillStyle = isRight ? COLORS.rightHand : COLORS.leftHand;
    ctx.strokeStyle = isActive
      ? COLORS.active
      : isRight
      ? COLORS.rightHandEdge
      : COLORS.leftHandEdge;
    ctx.lineWidth = isActive ? 2.5 : 1.5;

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

// Mini-portées : sur chaque note visible, une petite « carte » de partition
// (5 lignes + clé + tête de note placée + lignes supplémentaires + hampe + nom)
// pour apprendre à lire la note en même temps qu'on la joue.
function drawNotationCards() {
  const h = canvas.clientHeight;
  for (const n of state.song.notes) {
    const edgeY = timeToScreenY(n.time); // bord d'attaque (départ de la note)
    if (edgeY < -40 || edgeY > h + 40) continue;
    const g = noteGeometry(n.midi);
    drawNotationCard(g.centerX, edgeY, n.midi, n.hand);
  }
}

function drawNotationCard(cx, edgeY, midi, hand) {
  const clef = hand === "right" ? "treble" : "bass";

  const LG = 4;             // espacement des interlignes (px)
  const staffH = LG * 4;    // hauteur des 5 lignes
  const clefW = 10;         // largeur réservée à la clé
  const cardW = 30;
  const topPad = 12;        // marge haute (hampes / lignes supplémentaires)
  const captionH = 10;      // bandeau du nom de note
  const cardH = topPad + staffH + captionH;

  const cardX = Math.round(cx - cardW / 2);
  const cardY = Math.round(edgeY - cardH / 2);

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
}

// Ligne de lecture (curseur) fixe + petits repères triangulaires
function drawPlayhead(w, h) {
  const y = playheadY();

  ctx.save();
  ctx.strokeStyle = COLORS.cursor;
  ctx.lineWidth = 2;
  ctx.shadowColor = COLORS.cursor;
  ctx.shadowBlur = 8;
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
    Tone.Transport.seconds = state.currentTime;
  }

  syncTransportUI();
  draw();
}

function syncTransportUI() {
  const seek = document.getElementById("seek");
  const label = document.getElementById("timeLabel");
  seek.value = String(state.currentTime);
  label.textContent = `${fmt(state.currentTime)} / ${fmt(songDuration())}`;
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
  if (state.audioReady) return;
  await Tone.start(); // doit être déclenché par un geste utilisateur
  state.synth = new Tone.PolySynth(Tone.Synth).toDestination();
  state.synth.volume.value = -8;
  state.audioReady = true;
}

// (Re)construit le « Part » Tone qui planifie toutes les notes du morceau.
function buildPart() {
  if (state.part) {
    state.part.dispose();
    state.part = null;
  }
  Tone.Transport.cancel();
  if (!state.song) return;

  const events = state.song.notes.map((n) => ({
    time: n.time,
    note: Tone.Frequency(n.midi, "midi").toNote(),
    duration: n.duration,
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
  if (!state.song) return;
  await ensureAudio();
  if (!state.part) buildPart();

  // Reprise depuis le début si on est à la fin
  if (state.currentTime >= songDuration() - 1e-3) setTime(0);

  Tone.Transport.seconds = state.currentTime;
  Tone.Transport.start();
  state.isPlaying = true;
  updatePlayButton();
  requestAnimationFrame(tick);
}

function pause() {
  Tone.Transport.pause();
  state.isPlaying = false;
  updatePlayButton();
}

function togglePlay() {
  state.isPlaying ? pause() : play();
}

function updatePlayButton() {
  document.getElementById("playBtn").textContent = state.isPlaying ? "⏸" : "▶";
}

// Boucle d'animation pendant la lecture : suit le transport audio
function tick() {
  if (!state.isPlaying) return;

  setTime(Tone.Transport.seconds, { fromTransport: true });

  if (state.currentTime >= songDuration() - 1e-3) {
    pause();
    return;
  }
  requestAnimationFrame(tick);
}

// ----------------------------------------------------------------------------
//  Redimensionnement / canvas haute densité
// ----------------------------------------------------------------------------
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  state.dpr = dpr;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

// ----------------------------------------------------------------------------
//  Chargement d'un fichier MIDI / démo
// ----------------------------------------------------------------------------
function resetForNewSong(label) {
  pause();
  buildPart();        // (re)planifie l'audio si l'audio est déjà initialisé
  state.currentTime = 0;
  document.getElementById("seek").max = String(songDuration());
  updateSongInfo(label);
  syncTransportUI();
  draw();
}

async function loadMidiFile(file) {
  try {
    const buffer = await file.arrayBuffer();
    const midi = new Midi(buffer);
    state.song = buildSong(midi);
    resetForNewSong(file.name);
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
  resetForNewSong("Démo");
}

// ----------------------------------------------------------------------------
//  Interactions : molette, glisser, clic-seek, transport, clavier
// ----------------------------------------------------------------------------
function attachInteractions() {
  // Molette : vers le haut = avancer
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      setTime(state.currentTime - e.deltaY / PIXELS_PER_SECOND);
    },
    { passive: false }
  );

  // Glisser : vers le bas = reculer, vers le haut = avancer
  let dragging = false;
  let moved = false;
  let lastY = 0;
  let downY = 0;
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    moved = false;
    lastY = downY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    if (Math.abs(e.clientY - downY) > 3) moved = true;
    setTime(state.currentTime + (e.clientY - lastY) / PIXELS_PER_SECOND);
    lastY = e.clientY;
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    // Clic simple (sans glisser) = placer le curseur à l'endroit cliqué
    if (!moved) {
      const rect = canvas.getBoundingClientRect();
      setTime(screenYToTime(e.clientY - rect.top));
    }
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", () => (dragging = false));

  // Barre de progression (seek)
  document.getElementById("seek").addEventListener("input", (e) => {
    setTime(parseFloat(e.target.value));
  });

  // Bouton play/pause
  document.getElementById("playBtn").addEventListener("click", togglePlay);

  // Affichage de la notation (mini-portées)
  document.getElementById("notationToggle").addEventListener("change", (e) => {
    state.showNotation = e.target.checked;
    draw();
  });

  // Raccourci clavier : Espace = play/pause
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target.tagName !== "INPUT") {
      e.preventDefault();
      togglePlay();
    }
  });
}

// ----------------------------------------------------------------------------
//  Initialisation
// ----------------------------------------------------------------------------
function init() {
  document.getElementById("midiInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) loadMidiFile(file);
  });

  document.getElementById("demoBtn").addEventListener("click", loadDemo);

  window.addEventListener("resize", resizeCanvas);

  attachInteractions();
  resizeCanvas();
  loadDemo();
}

init();
