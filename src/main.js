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
const KEY_PRESS_MS = 220;       // durée de l'assombrissement après un clic sur une touche

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
  showNotation: false, // mini-portées sur les notes (désactivées par défaut)
  speed: 1,           // multiplicateur de vitesse de lecture (1 = normal)
  dpr: 1,
  pressedKeys: new Set(), // touches enfoncées au clic (assombrissement temporaire)

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
//  Clavier en bas de l'écran : hauteur et bord supérieur.
//  Les notes « tombent » et atterrissent sur les touches ; le bord supérieur
//  du clavier sert de ligne de lecture (playhead).
// ----------------------------------------------------------------------------
// Mobile en paysage : viewport large mais bas. On réduit alors la hauteur du
// clavier pour laisser plus de place à la chute des notes.
function isMobileLandscape() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  return w > h && h <= 500;
}

// Écran étroit (téléphone) : on réduit aussi la part du clavier en portrait.
function isNarrow() {
  return canvas.clientWidth <= 700;
}

function keyboardHeight() {
  const h = canvas.clientHeight;
  if (isMobileLandscape()) {
    return Math.round(Math.min(96, Math.max(60, h * 0.14)));
  }
  // Mobile en portrait : clavier plus court pour libérer de la hauteur à la
  // chute des notes (l'en-tête occupe déjà une bonne part de l'écran).
  if (isNarrow()) {
    return Math.round(Math.min(112, Math.max(76, h * 0.15)));
  }
  return Math.round(Math.min(150, Math.max(96, h * 0.18)));
}

function keyboardTop() {
  return canvas.clientHeight - keyboardHeight();
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
    // Le « rouleau » de notes est limité à la zone au-dessus du clavier : une
    // note qui franchit la ligne de lecture est « consommée » par les touches.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, keyboardTop());
    ctx.clip();
    drawMeasureLines(w, h);
    drawNotes();
    if (state.showNotation) drawNotationCards();
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
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
}

// Mini-portées : sur chaque note visible, une petite « carte » de partition
// (5 lignes + clé + tête de note placée + lignes supplémentaires + hampe + nom)
// pour apprendre à lire la note en même temps qu'on la joue.
function drawNotationCards() {
  const h = canvas.clientHeight;
  for (const n of state.song.notes) {
    const yBottom = timeToScreenY(n.time);
    const yTop = timeToScreenY(n.time + n.duration);
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

// Map midi -> "left" | "right" : touches actuellement traversées par une note.
function computeActiveKeys() {
  const map = new Map();
  if (!state.song) return map;
  const now = state.currentTime;
  for (const n of state.song.notes) {
    if (now >= n.time && now <= n.time + n.duration) map.set(n.midi, n.hand);
  }
  return map;
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
    if (isWhite(m)) drawWhiteKey(whiteIndex(m) * wkW, top + 3, wkW, kbH - 3, m, active);
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
  const hand = active.get(midi);
  const grad = ctx.createLinearGradient(0, top, 0, top + kbH);
  if (hand === "right") {
    grad.addColorStop(0, COLORS.rightHandEdge);
    grad.addColorStop(1, COLORS.rightHand);
  } else if (hand === "left") {
    grad.addColorStop(0, COLORS.leftHandEdge);
    grad.addColorStop(1, COLORS.leftHand);
  } else {
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(1, "#d7d0c2");
  }
  ctx.fillStyle = grad;
  roundRectBottom(x + 0.5, top, w - 1, kbH, 4);
  ctx.fill();

  if (state.pressedKeys.has(midi)) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
    roundRectBottom(x + 0.5, top, w - 1, kbH, 4);
    ctx.fill();
  }
}

function drawBlackKey(x, top, w, bkH, midi, active) {
  const hand = active.get(midi);
  const grad = ctx.createLinearGradient(0, top, 0, top + bkH);
  if (hand === "right") {
    grad.addColorStop(0, COLORS.rightHand);
    grad.addColorStop(1, COLORS.rightHandDark);
  } else if (hand === "left") {
    grad.addColorStop(0, COLORS.leftHand);
    grad.addColorStop(1, COLORS.leftHandDark);
  } else {
    grad.addColorStop(0, "#2b313b");
    grad.addColorStop(1, "#080a0e");
  }
  ctx.fillStyle = grad;
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

  const bkH = (canvas.clientHeight - top - 3) * 0.62;
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
  state.pressedKeys.add(midi);
  draw();
  setTimeout(() => {
    state.pressedKeys.delete(midi);
    draw();
  }, KEY_PRESS_MS);

  await ensureAudio();
  state.synth.triggerAttackRelease(
    Tone.Frequency(midi, "midi").toNote(),
    0.6
  );
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
    Tone.Transport.seconds = state.currentTime / state.speed;
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

  // Vrai son de piano : échantillons acoustiques (Salamander Grand Piano),
  // un fichier toutes les tierces mineures ; Tone.Sampler transpose le reste.
  const reverb = new Tone.Reverb({ decay: 1.6, wet: 0.18 }).toDestination();
  state.synth = new Tone.Sampler({
    urls: {
      A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
      A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
      A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
      A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
      A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
      A5: "A5.mp3", C6: "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
      A6: "A6.mp3", C7: "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
      A7: "A7.mp3", C8: "C8.mp3",
    },
    release: 1,
    baseUrl: "https://tonejs.github.io/audio/salamander/",
  }).connect(reverb);
  state.synth.volume.value = -6;

  await Tone.loaded(); // attendre le téléchargement des échantillons
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
  if (!state.song) return;
  await ensureAudio();
  if (!state.part) buildPart();

  // Reprise depuis le début si on est à la fin
  if (state.currentTime >= songDuration() - 1e-3) setTime(0);

  Tone.Transport.seconds = state.currentTime / state.speed;
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
function tick() {
  if (!state.isPlaying) return;

  setTime(Tone.Transport.seconds * state.speed, { fromTransport: true });

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

async function loadMidiFromUrl(url, displayName) {
  try {
    updateSongInfo(null, `Chargement de « ${displayName} »…`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    const midi = new Midi(buffer);
    state.song = buildSong(midi);
    resetForNewSong(displayName);
  } catch (err) {
    console.error(err);
    updateSongInfo(null, `Erreur : ${err.message}`);
  }
}

// Catalogue des morceaux (chargé depuis songs.json)
let songLibrary = [];

// Remplit le <select> à partir de songs.json. Renvoie true si au moins un
// morceau a été trouvé.
async function loadSongLibrary() {
  const select = document.getElementById("songSelect");
  try {
    const res = await fetch("songs.json");
    if (!res.ok) return false;
    songLibrary = await res.json();
    songLibrary.forEach((song, i) => {
      select.appendChild(new Option(song.title, String(i)));
    });
    return songLibrary.length > 0;
  } catch {
    return false; // pas de songs.json — on retombera sur la démo
  }
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
  if (error) {
    el.textContent = error;
    return;
  }
  if (!state.song) {
    el.textContent = "Aucun morceau chargé.";
    return;
  }
  const m = state.song.meta;
  // Titre affiché : celui fourni (bibliothèque / nom de fichier) en priorité,
  // sinon le nom interne du MIDI. On ajoute le nom interne seulement s'il est
  // pertinent et différent, pour éviter un « — Sans titre » disgracieux.
  const hasName = m.name && m.name !== "Sans titre";
  const title =
    fileName && hasName && m.name !== fileName
      ? `${fileName} — ${m.name}`
      : fileName || m.name;
  el.textContent =
    `${title} · ` +
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
//  Mode paysage : plein écran + verrouillage de l'orientation
//
//  Le verrouillage d'orientation n'est autorisé qu'en plein écran sur la
//  plupart des navigateurs mobiles : on passe donc d'abord la page en plein
//  écran, puis on demande le verrouillage. Les deux peuvent échouer (desktop,
//  iOS Safari…) sans casser l'expérience : on échoue silencieusement.
// ----------------------------------------------------------------------------
// État « paysage forcé » : rotation CSS de secours appliquée quand le
// verrouillage natif d'orientation n'existe pas (iOS Safari, desktop…).
function isForcedLandscape() {
  return document.body.classList.contains("force-landscape");
}

function enableForcedLandscape() {
  document.body.classList.add("force-landscape");
  resizeCanvas(); // le canvas adopte les dimensions pivotées
  updateLandscapeButton();
}

function disableForcedLandscape() {
  document.body.classList.remove("force-landscape");
  resizeCanvas();
  updateLandscapeButton();
}

async function requestFullscreenSafely() {
  const el = document.documentElement;
  const request =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.mozRequestFullScreen;
  if (request && !document.fullscreenElement) {
    try {
      await request.call(el);
    } catch {
      /* plein écran refusé : on continue (verrouillage / rotation CSS) */
    }
  }
}

async function exitFullscreenSafely() {
  const exit =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.mozCancelFullScreen;
  if (exit && document.fullscreenElement) {
    try {
      await exit.call(document);
    } catch {
      /* sans effet */
    }
  }
}

// Active le mode paysage, en cascade :
//   1. plein écran (immersion, requis pour le verrouillage sur Android) ;
//   2. verrouillage natif de l'orientation (Android Chrome) ;
//   3. à défaut, rotation CSS de l'interface (iOS Safari, etc.).
async function enterLandscape() {
  await requestFullscreenSafely();

  let locked = false;
  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock("landscape");
      locked = true;
    }
  } catch {
    locked = false; // verrouillage non supporté
  }

  // Si on n'a pas pu verrouiller et qu'on est encore en portrait, on pivote
  // l'interface nous-mêmes.
  if (!locked && window.matchMedia("(orientation: portrait)").matches) {
    enableForcedLandscape();
  } else {
    updateLandscapeButton();
  }
}

// Quitte le mode paysage : rotation CSS, verrouillage puis plein écran.
async function exitLandscape() {
  if (isForcedLandscape()) disableForcedLandscape();
  try {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  } catch {
    /* sans effet */
  }
  await exitFullscreenSafely();
  updateLandscapeButton();
}

function inLandscapeMode() {
  return isForcedLandscape() || !!document.fullscreenElement;
}

async function toggleLandscape() {
  if (inLandscapeMode()) {
    await exitLandscape();
  } else {
    await enterLandscape();
  }
}

function updateLandscapeButton() {
  const btn = document.getElementById("landscapeBtn");
  if (!btn) return;
  btn.textContent = inLandscapeMode() ? "↩ Quitter" : "🔄 Paysage";
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
  });
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
  });
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
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", () => (dragging = false));

  // Barre de progression (seek)
  document.getElementById("seek").addEventListener("input", (e) => {
    setTime(parseFloat(e.target.value));
  });

  // Bouton play/pause
  document.getElementById("playBtn").addEventListener("click", togglePlay);

  // Bouton « mode paysage » : bascule plein écran + verrouillage, avec repli
  // sur une rotation CSS quand le verrouillage natif n'est pas disponible.
  const landscapeBtn = document.getElementById("landscapeBtn");
  if (landscapeBtn) landscapeBtn.addEventListener("click", toggleLandscape);

  // Sortie de plein écran via le système : on nettoie la rotation CSS et on
  // remet le libellé du bouton à jour.
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && isForcedLandscape()) {
      disableForcedLandscape();
    }
    updateLandscapeButton();
  });

  // Affichage de la notation (mini-portées)
  document.getElementById("notationToggle").addEventListener("change", (e) => {
    state.showNotation = e.target.checked;
    draw();
  });

  // Curseur de vitesse de lecture : étiquette en direct, application au relâché
  // (reconstruire le Part de Tone à chaque micro-pas pendant le glissé serait
  //  inutilement coûteux pendant la lecture).
  const speedRange = document.getElementById("speedRange");
  speedRange.addEventListener("input", (e) => {
    updateSpeedLabel(parseFloat(e.target.value));
  });
  speedRange.addEventListener("change", (e) => {
    setSpeed(parseFloat(e.target.value));
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
    if (file) {
      document.getElementById("songSelect").value = ""; // fichier hors bibliothèque
      loadMidiFile(file);
    }
  });

  document.getElementById("songSelect").addEventListener("change", (e) => {
    const idx = parseInt(e.target.value, 10);
    if (!isNaN(idx)) selectSong(idx);
  });

  window.addEventListener("resize", () => {
    // Si l'appareil passe réellement en paysage, on retire la rotation CSS de
    // secours pour éviter un double pivot (disableForcedLandscape redimensionne).
    if (
      isForcedLandscape() &&
      window.matchMedia("(orientation: landscape)").matches
    ) {
      disableForcedLandscape();
      return;
    }
    resizeCanvas();
  });

  attachInteractions();
  updateLandscapeButton();
  resizeCanvas();
  start();
}

// Au démarrage : on charge la bibliothèque puis son premier morceau ; si elle
// est vide ou introuvable, on retombe sur la démo générée en interne.
async function start() {
  const hasLibrary = await loadSongLibrary();
  if (hasLibrary) {
    selectSong(0);
  } else {
    loadDemo();
  }
}

init();
