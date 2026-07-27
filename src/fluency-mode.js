// ============================================================================
//  Mode Fluidité — le niveau 4 de la Lecture de notes (plan/02 § 3)
//
//  Des notes défilent sur une portée vers une zone cible : jouer chacune avant
//  qu'elle ne sorte. La Lecture de notes (02) apprend la correspondance
//  portée-clavier sans pression de temps ; ce mode la rend fluide — vitesse
//  réglable, série continue, score de précision, exactement le « second
//  niveau » que 02 réservait pour plus tard.
//
//  C'est un écran qui défile : donc un Canvas, pas de DOM (CLAUDE.md), avec la
//  boucle bridée par le profil de l'appareil. Le temps n'avance que lorsque les
//  images sont produites : un onglet masqué met l'exercice en pause de
//  lui-même, sans minuterie à rattraper.
//
//  Les groupes de notes par niveau et par main sont ceux de 02
//  (`note-reading-engine`), la pondération des séances passées celle de F3 :
//  rien n'est redéfini. Une note manquée s'écrit `missed` au journal — le même
//  mot que les frappes manquées du rythme.
//
//  Cycle de vie : `start(container)` construit l'écran ; `stop()` annule la
//  boucle, libère l'audio, se désabonne du MIDI et retire les écouteurs.
// ============================================================================

import { createAudio } from "./audio.js";
import { PERFORMANCE_PROFILE } from "./perf.js";
import { CLEF_GLYPH, noteDegreeName, octaveOf, pitchClass, SHARP_PCS, staffStep } from "./music.js";
import { CLEF_BY_HAND, notePool } from "./note-reading-engine.js";
import { pickWeighted } from "./session-engine.js";
import { createPianoKeyboard } from "./piano-dom.js";
import { midiInput } from "./midi-input.js";
import { createProgressStore } from "./progress/store.js";
import { lastSessionContext, priorWeights } from "./progress/review.js";

// Une session : une série continue de notes, puis le bilan.
export const NOTES_PER_SESSION = 30;

// Temps de lecture : une note met ce temps à traverser l'écran jusqu'à la
// cible. La vitesse (notes par minute) règle la densité, pas ce temps : lire
// vite, c'est lire plus de notes, pas les voir passer plus floues.
const LOOKAHEAD_S = 5;

// Après la ligne cible, une demi-croche de grâce : au-delà, la note est
// manquée. En fraction de l'intervalle entre deux notes.
const GRACE_FRACTION = 0.5;

const DIFFICULTY_CHOICES = [
  { id: "beginner", label: "Débutant" },
  { id: "intermediate", label: "Intermédiaire" },
  { id: "advanced", label: "Difficile" },
];

const HAND_CHOICES = [
  { id: "right", label: "Main droite" },
  { id: "left", label: "Main gauche" },
];

const SPEED_CHOICES = [
  { id: "calm", label: "Tranquille", notesPerMinute: 20 },
  { id: "steady", label: "Soutenu", notesPerMinute: 30 },
  { id: "fast", label: "Rapide", notesPerMinute: 45 },
];

const CLEF_LABEL = { treble: "clé de sol", bass: "clé de fa" };

// ----------------------------------------------------------------------------
//  Fiche de la fonctionnalité (registre de la navigation)
// ----------------------------------------------------------------------------
export const fluencyFeature = {
  id: "fluency",
  title: "Fluidité",
  description: "Lire des notes qui défilent : jouer chacune avant qu'elle ne sorte.",
  status: "available",
  start,
  stop,
};

// ----------------------------------------------------------------------------
//  État du mode
// ----------------------------------------------------------------------------
let container = null;
let state = null;
let listeners = null;

function createModeState() {
  return {
    stopped: false,
    audio: createAudio(),
    settings: { difficulty: "beginner", hand: "right", speed: "calm" },
    progress: createProgressStore(),
    practice: null,   // séance ouverte dans le journal
    run: null,        // exécution en cours : notes, horloge, compteurs
    piano: null,
    stopMidi: null,
    rafId: null,
    ui: null,
  };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function onClick(node, handler) {
  node.addEventListener("click", handler, { signal: listeners.signal });
}

// ----------------------------------------------------------------------------
//  Écran de réglages
// ----------------------------------------------------------------------------
function renderSetup() {
  cancelLoop();
  closePractice("abandoned");
  state.run = null;

  const root = el("div", "fl fl--setup");
  root.append(
    el("h1", "fl-heading", "Fluidité"),
    el(
      "p",
      "fl-lede",
      `${NOTES_PER_SESSION} notes défilent vers la ligne bleue : joue chacune avant qu'elle ne la dépasse. À travailler après la Lecture de notes.`
    ),
    renderChoiceGroup("Niveau", DIFFICULTY_CHOICES, "difficulty"),
    renderChoiceGroup("Main travaillée", HAND_CHOICES, "hand"),
    renderChoiceGroup("Vitesse", SPEED_CHOICES.map((choice) => ({
      id: choice.id,
      label: `${choice.label} — ${choice.notesPerMinute} notes/min`,
    })), "speed")
  );

  const startBtn = el("button", "btn fl-primary", "Commencer");
  startBtn.type = "button";
  onClick(startBtn, beginRun);
  root.appendChild(startBtn);

  container.replaceChildren(root);
  state.ui = null;
}

function renderChoiceGroup(legendText, choices, settingKey) {
  const group = el("fieldset", "fl-choice");
  group.appendChild(el("legend", "fl-choice-legend", legendText));

  const row = el("div", "fl-choice-row");
  for (const choice of choices) {
    const buttonEl = el("button", "fl-choice-btn", choice.label);
    buttonEl.type = "button";
    const selected = state.settings[settingKey] === choice.id;
    buttonEl.setAttribute("aria-pressed", String(selected));
    if (selected) buttonEl.classList.add("is-selected");
    onClick(buttonEl, () => {
      state.settings[settingKey] = choice.id;
      renderSetup();
    });
    row.appendChild(buttonEl);
  }

  group.appendChild(row);
  return group;
}

// ----------------------------------------------------------------------------
//  Tirage de la série
//
//  Les mêmes groupes de notes que 02, la même pondération héritée du journal :
//  ce qui a été raté — ou manqué ici même — revient plus souvent.
// ----------------------------------------------------------------------------
function drawSeries({ difficulty, hand, priorWeights: prior, random = Math.random }) {
  const clef = CLEF_BY_HAND[hand];
  const pool = notePool(difficulty, hand);
  const notes = [];
  let previous = null;

  for (let i = 0; i < NOTES_PER_SESSION; i++) {
    const others = previous !== null ? pool.filter((midi) => midi !== previous) : pool;
    const midi = pickWeighted(
      random,
      others.length > 0 ? others : pool,
      (candidate) => prior?.get(`${clef}:${candidate}`) ?? 1
    );
    previous = midi;
    notes.push({
      midi,
      status: "pending", // "pending" | "correct" | "missed"
      wrongPresses: 0,
      resolvedAt: null,
    });
  }
  return { clef, pool, notes };
}

// ----------------------------------------------------------------------------
//  Démarrage d'une exécution
// ----------------------------------------------------------------------------
function beginRun() {
  closePractice("abandoned"); // filet : jamais deux séances ouvertes

  const { difficulty, hand, speed } = state.settings;
  const speedChoice = SPEED_CHOICES.find((choice) => choice.id === speed) ?? SPEED_CHOICES[0];
  const interval = 60 / speedChoice.notesPerMinute;

  const journal = state.progress.log();
  const series = drawSeries({
    difficulty,
    hand,
    priorWeights: priorWeights(journal, { featureId: fluencyFeature.id }),
  });

  state.run = {
    ...series,
    interval,
    notesPerMinute: speedChoice.notesPerMinute,
    // La première note atteint la cible après le temps de traversée : c'est
    // l'élan, aucun décompte séparé n'est nécessaire.
    timeOf: (index) => LOOKAHEAD_S + index * interval,
    elapsed: 0,
    lastFrameAt: null,
    lastDrawAt: 0,
    finished: false,
    correct: 0,
    firstTry: 0,
    missed: 0,
    wrongPresses: 0,
    streak: 0,
    bestStreak: 0,
  };

  state.practice = state.progress.openSession(fluencyFeature.id, {
    difficulty,
    hand,
    notesPerMinute: speedChoice.notesPerMinute,
    questionCount: NOTES_PER_SESSION,
  });

  state.audio.ensureReady().catch(() => {});
  renderRun();
}

function closePractice(outcome) {
  const practice = state?.practice;
  if (!practice || practice.closed) return;
  const run = state.run;
  practice.close(outcome, {
    answeredQuestions: run ? run.correct + run.missed : 0,
  });
  state.practice = null;
}

// ----------------------------------------------------------------------------
//  Écran d'exécution : Canvas + clavier
// ----------------------------------------------------------------------------
function renderRun() {
  const root = el("div", "fl fl--run");

  const status = el("div", "fl-status");
  const progress = el("span", "fl-progress");
  const streak = el("span", "fl-streak");
  const meta = el(
    "span",
    "fl-meta",
    `${CLEF_LABEL[state.run.clef]} · ${state.run.notesPerMinute} notes/min`
  );
  status.append(progress, streak, meta);

  const canvas = el("canvas", "fl-canvas");
  canvas.setAttribute("aria-label", "Notes qui défilent sur la portée");

  // Consigne du départ : la ligne bleue ne s'explique pas d'elle-même. Elle
  // s'efface à la première note résolue — après, elle n'apprendrait plus rien
  // et prendrait la place du retour.
  const instruction = el(
    "p",
    "fl-instruction",
    "Joue chaque note quand elle atteint la ligne bleue."
  );

  const feedback = el("p", "fl-feedback");
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");

  state.piano = createPianoKeyboard({
    prefix: "fl",
    signal: listeners.signal,
    onPress: pressKey,
  });
  state.piano.setPool(state.run.pool);

  const actions = el("div", "fl-actions");
  const quit = el("button", "btn fl-secondary", "Réglages");
  quit.type = "button";
  onClick(quit, renderSetup);
  actions.appendChild(quit);

  root.append(status, canvas, instruction, feedback, state.piano.element, actions);
  container.replaceChildren(root);

  state.ui = {
    progress,
    streak,
    instruction,
    feedback,
    canvas,
    ctx: canvas.getContext("2d"),
    geometry: null,
  };
  startMidiCapture();
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas, { signal: listeners.signal });

  refreshStatus();
  state.run.lastFrameAt = null;
  state.rafId = requestAnimationFrame(frame);
}

// Géométrie recalculée hors de la boucle : jamais dans le rendu.
function resizeCanvas() {
  const ui = state?.ui;
  if (!ui) return;
  const cssWidth = ui.canvas.clientWidth || 560;
  const cssHeight = ui.canvas.clientHeight || 170;
  const dpr = Math.min(window.devicePixelRatio || 1, PERFORMANCE_PROFILE.maxCanvasDpr);
  ui.canvas.width = Math.round(cssWidth * dpr);
  ui.canvas.height = Math.round(cssHeight * dpr);

  const LG = 14;
  const top = Math.round(cssHeight / 2 - LG * 2);
  ui.geometry = {
    dpr,
    width: cssWidth,
    height: cssHeight,
    LG,
    top,
    bottom: top + LG * 4,
    targetX: 118,                       // après la clé : la « ligne d'arrivée »
    pxPerSecond: (cssWidth - 118) / LOOKAHEAD_S,
  };
}

// ----------------------------------------------------------------------------
//  Boucle : le temps n'avance que d'image en image, bridé par le profil
// ----------------------------------------------------------------------------
function frame(now) {
  const session = state;
  if (!session || session.stopped || !session.run || session.run.finished) return;
  session.rafId = requestAnimationFrame(frame);

  const run = session.run;
  if (run.lastFrameAt !== null) {
    // Un onglet resté masqué produit un grand écart : il ne compte pas comme
    // du temps de jeu, l'exercice reprend où il en était.
    run.elapsed += Math.min((now - run.lastFrameAt) / 1000, 0.1);
  }
  run.lastFrameAt = now;

  // Notes sorties sans avoir été jouées.
  const grace = run.interval * GRACE_FRACTION;
  for (let i = 0; i < run.notes.length; i++) {
    const note = run.notes[i];
    if (note.status !== "pending") continue;
    if (run.elapsed > run.timeOf(i) + grace) resolveNote(i, "missed");
    else break; // les suivantes sont encore plus loin
  }
  if (run.finished) return;

  // Cadence bridée : sur le profil bas, pas plus d'une image toutes les 30 ms.
  if (now - run.lastDrawAt < PERFORMANCE_PROFILE.minFrameInterval) return;
  run.lastDrawAt = now;
  draw();
}

function cancelLoop() {
  if (state?.rafId) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
}

// ----------------------------------------------------------------------------
//  Rendu Canvas : portée, clé, zone cible, notes
// ----------------------------------------------------------------------------
const INK = "#1b1b1b";
const PAPER = "#f6f1e3";
const DONE = "#9a917e";
const GOOD = "#1f9d55";
const BAD = "#c0392b";
const TARGET = "rgba(58, 130, 246, .45)";

function draw() {
  const { ctx, geometry } = state.ui;
  const run = state.run;
  const { dpr, width, height, LG, top, bottom, targetX, pxPerSecond } = geometry;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);

  // Lignes de la portée.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const y = top + i * LG + 0.5;
    ctx.moveTo(8, y);
    ctx.lineTo(width - 8, y);
  }
  ctx.stroke();

  // Ligne d'arrivée : jouer la note quand elle la touche.
  ctx.strokeStyle = TARGET;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(targetX, top - LG * 1.8);
  ctx.lineTo(targetX, bottom + LG * 1.8);
  ctx.stroke();

  // Clé, posée comme en Lecture de notes (mêmes proportions de glyphe).
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  if (run.clef === "treble") {
    ctx.font = `${Math.round(LG * 4 * 1.7)}px serif`;
    ctx.fillText(CLEF_GLYPH.treble, 12, bottom + LG * 0.6);
  } else {
    const size = Math.round(LG / 0.2162);
    ctx.font = `${size}px serif`;
    ctx.fillText(CLEF_GLYPH.bass, 12, Math.round(top + LG + size * 0.4469));
  }

  // Les notes. Tout est pré-calculé : la boucle ne fait que dessiner.
  const headRx = LG * 0.62;
  const headRy = LG * 0.5;
  for (let i = 0; i < run.notes.length; i++) {
    const note = run.notes[i];
    const x = targetX + (run.timeOf(i) - run.elapsed) * pxPerSecond;
    if (x < -headRx * 2) continue;
    if (x > width + headRx * 2) break;

    const step = staffStep(note.midi, run.clef);
    const y = bottom - step * (LG / 2);
    const color = note.status === "correct" ? GOOD : note.status === "missed" ? BAD : INK;

    // Lignes supplémentaires.
    ctx.strokeStyle = note.status === "pending" ? INK : color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const half = headRx + 6;
    if (step < 0) {
      for (let k = -2; k >= step; k -= 2) {
        const ly = bottom - k * (LG / 2) + 0.5;
        ctx.moveTo(x - half, ly);
        ctx.lineTo(x + half, ly);
      }
    } else if (step > 8) {
      for (let k = 10; k <= step; k += 2) {
        const ly = bottom - k * (LG / 2) + 0.5;
        ctx.moveTo(x - half, ly);
        ctx.lineTo(x + half, ly);
      }
    }
    ctx.stroke();

    // Altération (niveaux à venir : les groupes de 02 sont tout en blanches,
    // mais le dessin est prêt).
    if (SHARP_PCS.has(pitchClass(note.midi))) {
      ctx.font = `${Math.round(LG * 2)}px serif`;
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.fillText("♯", x - headRx - 12, y + LG * 0.45);
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, headRx, headRy, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ----------------------------------------------------------------------------
//  Réponses
// ----------------------------------------------------------------------------
function expectedIndex() {
  return state.run.notes.findIndex((note) => note.status === "pending");
}

function pressKey(midi) {
  const run = state?.run;
  if (!run || run.finished) return;

  // La touche sonne toujours, juste ou fausse (règle de 02, reprise partout).
  state.audio.playNote(midi, 0.4).catch(() => {});

  const index = expectedIndex();
  if (index < 0) return;
  const note = run.notes[index];

  if (midi === note.midi) {
    resolveNote(index, "correct");
    return;
  }

  // Fausse note : signalée sans arrêter le défilement — la note attendue reste.
  note.wrongPresses++;
  run.wrongPresses++;
  run.streak = 0;
  const key = state.piano.key(midi);
  key?.classList.add("is-wrong");
  setTimeout(() => key?.classList.remove("is-wrong"), 300);
  state.ui.feedback.textContent = `Ce n'est pas ${noteDegreeName(midi)}.`;
  state.ui.feedback.dataset.status = "wrong";
  refreshStatus();

  state.practice?.record({
    type: "answer",
    target: { midi: note.midi, clef: run.clef, hand: state.settings.hand },
    outcome: "wrong",
    given: { midi },
  });
}

function resolveNote(index, status) {
  const run = state.run;
  const note = run.notes[index];
  note.status = status;
  note.resolvedAt = run.elapsed;

  // La consigne a fait son travail dès la première note tranchée.
  if (state.ui?.instruction) state.ui.instruction.remove();

  if (status === "correct") {
    run.correct++;
    if (note.wrongPresses === 0) run.firstTry++;
    run.streak++;
    run.bestStreak = Math.max(run.bestStreak, run.streak);
    state.ui.feedback.textContent = "";
    state.ui.feedback.dataset.status = "";
  } else {
    run.missed++;
    run.streak = 0;
    state.ui.feedback.textContent = `Manquée : c'était ${noteDegreeName(note.midi)}.`;
    state.ui.feedback.dataset.status = "wrong";
  }

  state.practice?.record({
    type: "answer",
    target: { midi: note.midi, clef: run.clef, hand: state.settings.hand },
    outcome: status === "correct" ? "correct" : "missed",
  });

  refreshStatus();

  if (run.correct + run.missed >= run.notes.length) {
    run.finished = true;
    cancelLoop();
    // Laisser voir la dernière note résolue avant le bilan.
    draw();
    setTimeout(() => {
      if (state && !state.stopped && state.run === run) renderSummary();
    }, 650);
  }
}

function refreshStatus() {
  const run = state.run;
  const ui = state.ui;
  if (!ui) return;
  ui.progress.textContent = `${run.correct + run.missed} / ${run.notes.length}`;
  ui.streak.textContent = `Série : ${run.streak}`;
}

// ----------------------------------------------------------------------------
//  Entrée MIDI (F2) — optionnelle, comme partout
// ----------------------------------------------------------------------------
function startMidiCapture() {
  stopMidiCapture();
  if (!midiInput.state().listening) return;
  state.stopMidi = midiInput.onNote((event) => {
    if (event.type !== "noteon") return;
    if (!state || state.stopped) return;
    pressKey(event.midi);
  });
}

function stopMidiCapture() {
  state?.stopMidi?.();
  if (state) state.stopMidi = null;
}

// ----------------------------------------------------------------------------
//  Bilan
// ----------------------------------------------------------------------------
function renderSummary() {
  closePractice("done");
  stopMidiCapture();

  const run = state.run;
  const attempts = run.correct + run.missed + run.wrongPresses;
  const accuracy = attempts > 0 ? run.correct / attempts : 0;

  const root = el("div", "fl fl--summary");
  root.appendChild(el("h1", "fl-heading", "Série terminée"));
  root.appendChild(
    el("p", "fl-lede", `${CLEF_LABEL[run.clef]} · ${run.notesPerMinute} notes/min`)
  );

  const stats = el("ul", "fl-stats");
  stats.append(
    statItem(`${run.firstTry} / ${run.notes.length}`, "lues du premier coup"),
    statItem(`${Math.round(accuracy * 100)} %`, "de précision"),
    statItem(String(run.bestStreak), "meilleure série"),
    statItem(String(run.missed), run.missed > 1 ? "notes sorties" : "note sortie")
  );
  root.appendChild(stats);

  // À revoir : les notes manquées ou fausses, les pires d'abord.
  const troubled = run.notes
    .map((note) => ({ note, faults: note.wrongPresses + (note.status === "missed" ? 1 : 0) }))
    .filter((entry) => entry.faults > 0);
  const byMidi = new Map();
  for (const { note, faults } of troubled) {
    byMidi.set(note.midi, (byMidi.get(note.midi) ?? 0) + faults);
  }
  const toReview = [...byMidi.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  if (toReview.length > 0) {
    root.appendChild(el("h2", "fl-subheading", "À revoir"));
    const list = el("ul", "fl-review");
    for (const [midi, faults] of toReview) {
      list.appendChild(
        el("li", "fl-review-item",
          `${noteDegreeName(midi)}${octaveOf(midi)} — ${faults} ${faults > 1 ? "fautes" : "faute"}`)
      );
    }
    root.appendChild(list);
  } else {
    root.appendChild(el("p", "fl-lede", "Sans faute : monte la vitesse d'un cran."));
  }

  if (!state.progress.persistent) {
    root.appendChild(
      el("p", "fl-note", "Résultats non enregistrés : le stockage de ce navigateur est indisponible.")
    );
  }

  const actions = el("div", "fl-actions");
  const again = el("button", "btn fl-primary", "Recommencer");
  again.type = "button";
  onClick(again, beginRun);
  const settings = el("button", "btn fl-secondary", "Changer de réglages");
  settings.type = "button";
  onClick(settings, renderSetup);
  actions.append(again, settings);
  root.appendChild(actions);

  container.replaceChildren(root);
  state.ui = null;
  state.piano = null;
  state.run = null;
}

function statItem(value, label) {
  const item = el("li", "fl-stat");
  item.append(el("span", "fl-stat-value", value), el("span", "fl-stat-label", label));
  return item;
}

// ----------------------------------------------------------------------------
//  Cycle de vie de la fonctionnalité
// ----------------------------------------------------------------------------
function start(host) {
  container = host;
  state = createModeState();
  listeners = new AbortController();

  restoreSettings();

  window.addEventListener("pagehide", flushProgress, { signal: listeners.signal });
  document.addEventListener("visibilitychange", onVisibilityChange, {
    signal: listeners.signal,
  });

  renderSetup();
}

function restoreSettings() {
  const last = lastSessionContext(state.progress.log(), fluencyFeature.id);
  if (!last) return;
  if (DIFFICULTY_CHOICES.some((choice) => choice.id === last.difficulty)) {
    state.settings.difficulty = last.difficulty;
  }
  if (HAND_CHOICES.some((choice) => choice.id === last.hand)) {
    state.settings.hand = last.hand;
  }
  const speed = SPEED_CHOICES.find((choice) => choice.notesPerMinute === last.notesPerMinute);
  if (speed) state.settings.speed = speed.id;
}

function flushProgress() {
  state?.progress.flush();
}

function onVisibilityChange() {
  if (document.visibilityState === "hidden") flushProgress();
}

function stop() {
  if (!state) return;

  // 1. Arrêter la boucle d'animation avant tout.
  state.stopped = true;
  cancelLoop();

  // 2. Se désabonner du clavier physique (l'entrée MIDI, elle, survit — F2).
  stopMidiCapture();

  // 3. Clore la séance : quitter en route est un abandon.
  closePractice("abandoned");
  state.progress.flush();

  // 4. Libérer l'audio.
  state.audio.dispose();

  // 5. Retirer les écouteurs (boutons, clavier, redimensionnement).
  listeners.abort();
  listeners = null;

  // 6. Rendre la scène.
  container?.replaceChildren();
  container = null;
  state = null;
}
