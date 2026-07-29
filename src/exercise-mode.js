// ============================================================================
//  Mode Exercices — Feature 03 « Exercices techniques et agilité des doigts »
//
//  Un exercice est décrit dans `exercises/catalog.js`, transformé en notes par
//  `exercises/generate-exercise.js`, puis joué sur la grille de pulsation de
//  `metronome.js`. Ce fichier ne fait que du rendu, de l'interaction et du
//  transport : il ne calcule ni hauteur, ni doigté, ni instant.
//
//  Pratique libre uniquement (plan/03-technique-doigts.md § 3) : l'application
//  ne reçoit pas les notes jouées, donc elle n'affiche **aucune précision**.
//  Elle tient le décompte, la pulsation et les répétitions ; c'est tout ce
//  qu'elle sait, et c'est tout ce que dit son bilan (§ 9).
//
//  Le rouleau est un Canvas comme celui du mode Morceau, mais limité à
//  l'étendue de l'exercice : deux octaves au plus, donc des touches larges au
//  doigt là où les 88 touches en font des lamelles. Les deux rendus se
//  ressemblent sans être le même ; l'extraction d'un `piano-roll.js` commun
//  attend qu'un troisième mode en ait besoin, comme le veut plan/F1 § 6 (rien
//  n'est extrait avant d'être réellement partagé).
//
//  Cycle de vie : `start(container)` construit l'écran et branche ses
//  écouteurs ; `stop()` arrête le transport, libère l'audio et n'en laisse rien.
// ============================================================================

import * as Tone from "https://cdn.jsdelivr.net/npm/tone@14.8.49/+esm";
import { createAudio, midiToNote } from "./audio.js";
import { isWhite, noteDegreeName, octaveOf, pitchClass } from "./music.js";
import { PERFORMANCE_PROFILE } from "./perf.js";
import {
  clampTempo,
  createBeatGrid,
  MAX_BPM,
  MIN_BPM,
  scheduleClicks,
} from "./metronome.js";
import {
  availableFamilies,
  DIFFICULTIES,
  difficultiesOfFamily,
  exerciseById,
  exercisesOfFamily,
  familyById,
  supportsHand,
} from "./exercises/catalog.js";
import {
  clampRepetitions,
  generateExercise,
  MAX_REPETITIONS,
  MIN_REPETITIONS,
} from "./exercises/generate-exercise.js";
import { summarizeMidiRun, validateRepetition } from "./exercises/validate-run.js";
import { midiInput } from "./midi-input.js";
import { createProgressStore } from "./progress/store.js";
import { lastSessionContext } from "./progress/review.js";

// Couleurs alignées sur celles du mode Morceau : la main droite en bleu, la
// main gauche en vert. Un exercice et un morceau doivent se lire de la même
// façon (plan/03 § 2).
const COLORS = {
  background: "#0d1117",
  blackColumn: "#0a0d12",
  beatLine: "#1d222c",
  barLine: "#3a4150",
  label: "#6e7681",
  rightHand: "#4ea1ff",
  rightHandDark: "#1a4a8a",
  leftHand: "#2ecc71",
  leftHandDark: "#177a40",
  active: "#ffffff",
  cursor: "#ffae57",
  finger: "#0b1220",
  countIn: "#ffae57",
};

// Deux mesures visibles au-dessus de la ligne de lecture : assez pour préparer
// la main, pas assez pour que les notes deviennent illisibles. La hauteur d'un
// temps s'adapte donc à l'écran, et non au tempo — sinon un exercice lent
// n'afficherait presque rien.
const VISIBLE_BARS = 2;
const MIN_PIXELS_PER_BEAT = 26;
const MAX_PIXELS_PER_BEAT = 120;

const KEY_PRESS_MS = 220;
const END_TAIL_S = 0.4; // laisse la dernière note finir de sonner avant le bilan

// Un cran de métronome mécanique. Le bilan le **propose**, il ne l'applique
// jamais tout seul (plan/03 § 10).
const TEMPO_STEP = 4;

const HAND_CHOICES = [
  { id: "right", label: "Main droite" },
  { id: "left", label: "Main gauche" },
  { id: "both", label: "Les deux" },
];

const HAND_LABEL = { right: "Main droite", left: "Main gauche", both: "Les deux mains" };

// Ce que la régularité rythmique dit de la pratique, quand le clavier MIDI l'a
// mesurée (plan/03 § 9). Mêmes catégories que la Reproduction rythmique : c'est
// le même bilan de `rhythm/timing.js` qui les produit.
const TIMING_TEXT = {
  steady: "Rythme régulier : tes notes tombent avec la pulsation.",
  early: "Tu anticipes presque toujours : laisse la pulsation arriver.",
  late: "Tu arrives presque toujours après : prépare le geste un peu plus tôt.",
  irregular: "Irrégulier plutôt que décalé : ralentis le tempo avant de le remonter.",
  none: "Aucune note reçue : rien n'a pu être mesuré.",
};

// Comportement du mode Les deux, annoncé avant le départ (plan/03 § 6).
const BOTH_MODE_LABEL = {
  parallel: "mouvement parallèle, à l'octave",
  contrary: "mouvement contraire",
  alternating: "mains en alternance",
};

// ----------------------------------------------------------------------------
//  Fiche de la fonctionnalité (registre de la navigation)
// ----------------------------------------------------------------------------
export const exerciseFeature = {
  id: "technique",
  title: "Exercices",
  description: "Déliement, accords et arpèges, avec décompte et métronome.",
  status: "available",
  start,
  stop,
};

// ----------------------------------------------------------------------------
//  État du mode
// ----------------------------------------------------------------------------
let container = null;
let canvas = null;
let ctx = null;
let state = null;
let listeners = null;

function createModeState() {
  const firstFamily = availableFamilies()[0];
  // On entre toujours par le Débutant : c'est le seul niveau dont on soit sûr
  // qu'il ne suppose rien d'acquis.
  const firstExercise =
    exercisesOfFamily(firstFamily.id, "beginner")[0] ?? exercisesOfFamily(firstFamily.id)[0];

  return {
    stopped: false,
    audio: createAudio(),
    click: null, // petit synthé de clic, créé avec l'audio
    progress: createProgressStore(),
    practice: null,

    settings: {
      exerciseId: firstExercise.id,
      hand: "right",
      tempo: firstExercise.defaultTempo,
      repetitions: firstExercise.defaultRepetitions,
      metronome: true,
      demo: false, // par défaut, c'est l'utilisateur qui joue
      // Vérifier les notes au clavier MIDI. Sans effet — et sans affichage —
      // tant qu'aucun clavier n'écoute.
      validate: true,
    },

    run: null,         // exercice généré (notes, séries, grille)
    grid: null,

    // Validation MIDI (plan/03 étape D). `null` en pratique libre : rien n'est
    // reçu, donc rien n'est mesuré et rien n'est affiché.
    midi: null,        // { stopNotes, played: [], reports: [] }

    currentTime: 0,    // position sur la timeline commune (0 = 1er temps du décompte)
    isPlaying: false,
    // Mis en pause *par l'utilisateur*. Distinct de `isPlaying`, faux aussi
    // pendant le chargement des échantillons : le bouton ne doit pas annoncer
    // « Reprendre » alors que la séance est en train de démarrer.
    paused: false,
    startPending: false,
    finished: false,
    recordedRepetitions: 0,
    startedAt: 0,      // ms epoch, pour la durée réelle de la séance

    parts: [],
    dpr: 1,
    pendingDraw: null,
    pendingResize: null,
    animationFrame: null,
    lastVisualFrame: -Infinity,
    pressedKeys: new Set(),
    keyPressTimers: new Set(),
    timers: new Set(),
    ui: null,
    layout: null,
  };
}

function isRunning() {
  return state !== null && !state.stopped && ctx !== null;
}

function currentExercise() {
  return exerciseById(state.settings.exerciseId);
}

function later(callback, delay) {
  const session = state;
  const timer = setTimeout(() => {
    session.timers.delete(timer);
    if (session.stopped) return;
    callback();
  }, delay);
  session.timers.add(timer);
  return timer;
}

// ----------------------------------------------------------------------------
//  Utilitaires DOM
// ----------------------------------------------------------------------------
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
//
//  « Le bouton principal doit permettre de démarrer sans devoir modifier tous
//  les réglages » (plan/03 § 7) : tout est déjà rempli par les valeurs par
//  défaut de l'exercice.
// ----------------------------------------------------------------------------
function renderSetup() {
  const exercise = currentExercise();
  const root = el("div", "ex ex--setup");

  root.append(
    el("h1", "ex-heading", "Exercices techniques"),
    el(
      "p",
      "ex-lede",
      "Tu joues sur ton piano ; l'application tient le décompte, la pulsation et les répétitions."
    )
  );

  root.appendChild(renderFamilyChoice());
  root.appendChild(renderDifficultyChoice());
  root.appendChild(renderExerciseChoice());
  root.appendChild(renderHandChoice(exercise));
  root.appendChild(renderNumberChoice(
    "Tempo",
    `${state.settings.tempo} bpm`,
    () => setTempo(state.settings.tempo - TEMPO_STEP),
    () => setTempo(state.settings.tempo + TEMPO_STEP),
    state.settings.tempo <= MIN_BPM,
    state.settings.tempo >= MAX_BPM
  ));
  root.appendChild(renderNumberChoice(
    "Répétitions",
    String(state.settings.repetitions),
    () => setRepetitions(state.settings.repetitions - 1),
    () => setRepetitions(state.settings.repetitions + 1),
    state.settings.repetitions <= MIN_REPETITIONS,
    state.settings.repetitions >= MAX_REPETITIONS
  ));
  root.appendChild(renderToggles());
  root.appendChild(renderMidiChoice());

  root.appendChild(el("p", "ex-goal", `But : ${exercise.goal}`));
  root.appendChild(el("p", "ex-instruction", exercise.instruction));

  const startBtn = el("button", "btn ex-primary", "Commencer");
  startBtn.type = "button";
  onClick(startBtn, beginRun);
  root.appendChild(startBtn);

  // Rappel de bon sens, une seule fois et avant de jouer (plan/03 § 10).
  root.appendChild(
    el(
      "p",
      "ex-note",
      "Commence lentement, garde la main détendue, et arrête-toi en cas de douleur."
    )
  );

  container.replaceChildren(root);
  state.ui = null;
}

function renderFamilyChoice() {
  const group = el("fieldset", "ex-choice");
  group.appendChild(el("legend", "ex-choice-legend", "Famille"));
  const row = el("div", "ex-choice-row");

  const currentFamilyId = currentExercise().family;
  for (const family of availableFamilies()) {
    const button = el("button", "ex-choice-btn", family.label);
    button.type = "button";
    const selected = family.id === currentFamilyId;
    button.setAttribute("aria-pressed", String(selected));
    if (selected) button.classList.add("is-selected");
    button.title = family.goal;
    onClick(button, () => {
      // Changer de famille sélectionne son premier exercice, et reprend ses
      // valeurs par défaut : un tempo d'arpège n'a pas de sens sur un accord.
      // Le niveau courant est gardé s'il existe dans la nouvelle famille —
      // changer de sujet ne doit pas renvoyer l'utilisateur au Débutant.
      const kept = exercisesOfFamily(family.id, currentExercise().difficulty)[0];
      selectExercise((kept ?? exercisesOfFamily(family.id)[0]).id);
    });
    row.appendChild(button);
  }

  // Les familles encore à construire restent visibles, comme les cartes
  // « Bientôt » de l'accueil (plan/F1 § 5).
  for (const family of familiesToCome()) {
    const button = el("button", "ex-choice-btn", family.label);
    button.type = "button";
    button.disabled = true;
    button.title = "Bientôt";
    button.appendChild(el("span", "ex-choice-soon", "Bientôt"));
    row.appendChild(button);
  }

  group.appendChild(row);
  return group;
}

function familiesToCome() {
  const available = new Set(availableFamilies().map((family) => family.id));
  return [familyById("coordination"), familyById("rhythm")].filter(
    (family) => family && !available.has(family.id)
  );
}

// ----------------------------------------------------------------------------
//  Niveau
//
//  La famille dit *quoi* travailler, le niveau *à quel degré*. Un niveau change
//  le geste — une note tenue pendant que les autres jouent, un accent déplacé,
//  un passage de pouce, un mouvement contraire — et non la seule vitesse : le
//  tempo reste un réglage séparé (plan/03 § 5).
//
//  Le niveau courant est **déduit** de l'exercice, comme la famille : deux
//  sources de vérité pour la même information finiraient par diverger.
// ----------------------------------------------------------------------------
function renderDifficultyChoice() {
  const group = el("fieldset", "ex-choice");
  group.appendChild(el("legend", "ex-choice-legend", "Niveau"));
  const row = el("div", "ex-choice-row");

  const familyId = currentExercise().family;
  const filled = difficultiesOfFamily(familyId);

  for (const difficulty of DIFFICULTIES) {
    const button = el("button", "ex-choice-btn", difficulty.label);
    button.type = "button";

    // Un niveau que la famille n'a pas encore reste visible et désactivé, comme
    // les familles à venir : on montre où va la famille sans y envoyer.
    const available = filled.has(difficulty.id);
    button.disabled = !available;
    if (!available) {
      button.title = "Bientôt";
      button.appendChild(el("span", "ex-choice-soon", "Bientôt"));
    }

    const selected = difficulty.id === currentExercise().difficulty;
    button.setAttribute("aria-pressed", String(selected));
    if (selected) button.classList.add("is-selected");

    if (available) {
      onClick(button, () => {
        selectExercise(exercisesOfFamily(familyId, difficulty.id)[0].id);
      });
    }
    row.appendChild(button);
  }

  group.appendChild(row);
  return group;
}

// Le choix de l'exercice n'apparaît que si la paire famille + niveau en
// contient plusieurs : une liste d'un seul élément n'est pas un choix.
function renderExerciseChoice() {
  const exercise = currentExercise();
  const exercises = exercisesOfFamily(exercise.family, exercise.difficulty);
  const group = el("fieldset", "ex-choice");
  group.appendChild(el("legend", "ex-choice-legend", "Exercice"));

  if (exercises.length === 1) {
    group.appendChild(el("p", "ex-single", exercises[0].title));
    return group;
  }

  const row = el("div", "ex-choice-row");
  for (const exercise of exercises) {
    const button = el("button", "ex-choice-btn", exercise.title);
    button.type = "button";
    const selected = exercise.id === state.settings.exerciseId;
    button.setAttribute("aria-pressed", String(selected));
    if (selected) button.classList.add("is-selected");
    onClick(button, () => selectExercise(exercise.id));
    row.appendChild(button);
  }
  group.appendChild(row);
  return group;
}

function renderHandChoice(exercise) {
  const group = el("fieldset", "ex-choice");
  group.appendChild(el("legend", "ex-choice-legend", "Main travaillée"));
  const row = el("div", "ex-choice-row");

  for (const choice of HAND_CHOICES) {
    const button = el("button", "ex-choice-btn", choice.label);
    button.type = "button";

    // Une main n'est proposée que si son doigté est défini (plan/03 § 6).
    const available = supportsHand(exercise, choice.id);
    button.disabled = !available;
    if (!available) {
      button.title = "Doigté non défini pour cet exercice";
      button.appendChild(el("span", "ex-choice-soon", "Bientôt"));
    } else if (choice.id === "both" && exercise.bothMode) {
      button.title = BOTH_MODE_LABEL[exercise.bothMode] ?? "";
    }

    const selected = state.settings.hand === choice.id;
    button.setAttribute("aria-pressed", String(selected));
    if (selected) button.classList.add("is-selected");

    if (available) {
      onClick(button, () => {
        state.settings.hand = choice.id;
        renderSetup();
      });
    }
    row.appendChild(button);
  }

  group.appendChild(row);

  // Le comportement des deux mains est annoncé **avant** le départ.
  if (state.settings.hand === "both" && exercise.bothMode) {
    group.appendChild(
      el("p", "ex-hint", `Les deux mains : ${BOTH_MODE_LABEL[exercise.bothMode]}.`)
    );
  }
  return group;
}

// Réglage numérique en − / valeur / + : deux cibles de 34 px, plus sûres au
// doigt qu'un curseur (CLAUDE.md : toutes les cibles tactiles ≥ 30×30 px).
function renderNumberChoice(legendText, value, onMinus, onPlus, minReached, maxReached) {
  const group = el("fieldset", "ex-choice");
  group.appendChild(el("legend", "ex-choice-legend", legendText));

  const row = el("div", "ex-stepper");
  const minus = el("button", "ex-step-btn", "−");
  minus.type = "button";
  minus.disabled = minReached;
  minus.setAttribute("aria-label", `${legendText} : diminuer`);
  onClick(minus, onMinus);

  const plus = el("button", "ex-step-btn", "+");
  plus.type = "button";
  plus.disabled = maxReached;
  plus.setAttribute("aria-label", `${legendText} : augmenter`);
  onClick(plus, onPlus);

  row.append(minus, el("span", "ex-step-value", value), plus);
  group.appendChild(row);
  return group;
}

function renderToggles() {
  const group = el("fieldset", "ex-choice");
  group.appendChild(el("legend", "ex-choice-legend", "Pendant l'exercice"));
  const row = el("div", "ex-choice-row");

  row.appendChild(
    toggleButton("Métronome", state.settings.metronome, () => {
      state.settings.metronome = !state.settings.metronome;
      renderSetup();
    })
  );
  row.appendChild(
    toggleButton("Démonstration", state.settings.demo, () => {
      state.settings.demo = !state.settings.demo;
      renderSetup();
    })
  );

  group.appendChild(row);
  group.appendChild(
    el(
      "p",
      "ex-hint",
      state.settings.demo
        ? "Démonstration : l'application joue les notes, tu écoutes ou tu suis."
        : "Démonstration coupée : à toi de jouer, l'application ne sonne pas les notes."
    )
  );
  return group;
}

// ----------------------------------------------------------------------------
//  Validation MIDI (plan/03 étape D)
//
//  Elle n'est proposée que si un clavier écoute réellement. Sans lui, la
//  pratique libre reste le fonctionnement normal — pas un mode dégradé
//  (plan/03 § 3 ; plan/F2 § 7 : le MIDI est toujours une amélioration
//  optionnelle).
// ----------------------------------------------------------------------------
function renderMidiChoice() {
  const group = el("fieldset", "ex-choice");
  group.appendChild(el("legend", "ex-choice-legend", "Clavier MIDI"));
  const midi = midiInput.state();

  if (!midi.listening) {
    group.appendChild(
      el(
        "p",
        "ex-hint",
        midi.supported
          ? "Aucun clavier connecté : la séance se fera en pratique libre. Branche-le depuis l'accueil pour que tes notes soient vérifiées."
          : "Ce navigateur ne gère pas les claviers MIDI : la séance se fera en pratique libre."
      )
    );
    return group;
  }

  const row = el("div", "ex-choice-row");
  row.appendChild(
    toggleButton("Vérifier mes notes", state.settings.validate, () => {
      state.settings.validate = !state.settings.validate;
      renderSetup();
    })
  );
  group.appendChild(row);
  group.appendChild(
    el(
      "p",
      "ex-hint",
      state.settings.validate
        ? `Notes lues sur « ${midi.activeDeviceName} » : le bilan dira lesquelles sont passées.`
        : "Vérification coupée : le bilan ne dira rien de tes notes, comme en pratique libre."
    )
  );
  return group;
}

function toggleButton(label, active, handler) {
  const button = el("button", "ex-choice-btn", label);
  button.type = "button";
  button.setAttribute("aria-pressed", String(active));
  if (active) button.classList.add("is-selected");
  button.appendChild(el("span", "ex-toggle-state", active ? "activé" : "coupé"));
  onClick(button, handler);
  return button;
}

function selectExercise(id) {
  const exercise = exerciseById(id);
  if (!exercise) return;
  state.settings.exerciseId = id;
  state.settings.tempo = exercise.defaultTempo;
  state.settings.repetitions = exercise.defaultRepetitions;
  // La main courante peut ne pas exister sur le nouvel exercice.
  if (!supportsHand(exercise, state.settings.hand)) {
    state.settings.hand =
      HAND_CHOICES.map((choice) => choice.id).find((hand) =>
        supportsHand(exercise, hand)
      ) ?? "right";
  }
  renderSetup();
}

function setTempo(bpm) {
  state.settings.tempo = clampTempo(bpm);
  renderSetup();
}

function setRepetitions(count) {
  state.settings.repetitions = clampRepetitions(count);
  renderSetup();
}

// ----------------------------------------------------------------------------
//  Écran d'exercice
// ----------------------------------------------------------------------------
function beginRun() {
  closePractice("abandoned"); // filet : une séance ouverte ne le reste jamais

  const exercise = currentExercise();
  const grid = createBeatGrid({ bpm: state.settings.tempo, beatsPerBar: exercise.beatsPerBar });
  const run = generateExercise(exercise, {
    hand: state.settings.hand,
    tempo: state.settings.tempo,
    repetitions: state.settings.repetitions,
    startTime: grid.startTime,
  });
  if (!run) {
    // Réglage impossible : on revient aux réglages plutôt que d'ouvrir un
    // exercice vide.
    renderSetup();
    return;
  }

  state.grid = grid;
  state.run = run;
  state.currentTime = 0;
  state.isPlaying = false;
  state.paused = false;
  state.finished = false;
  state.recordedRepetitions = 0;
  state.startedAt = Date.now();

  startMidiCapture();

  state.practice = state.progress.openSession(exerciseFeature.id, {
    exerciseId: exercise.id,
    family: exercise.family,
    handMode: state.settings.hand,
    key: run.key,
    tempo: run.tempo,
    repetitions: run.repetitions,
    metronome: state.settings.metronome,
    demo: state.settings.demo,
    // Ce qui a réellement servi à juger, pas ce qui était demandé : une séance
    // relue plus tard doit savoir si ses notes ont été vues.
    validated: state.midi !== null,
  });

  renderExercise();
  play();
}

function renderExercise() {
  const exercise = currentExercise();
  const root = el("div", "ex ex--run");

  // --- En-tête : ce qu'on travaille et où on en est -------------------------
  const header = el("div", "ex-runbar");
  const title = el("div", "ex-run-title");
  title.append(
    el("span", "ex-run-name", exercise.title),
    el("span", "ex-run-goal", exercise.instruction)
  );

  const counters = el("div", "ex-run-counters");
  const repetition = el("span", "ex-run-rep");
  const tempoLabel = el("span", "ex-run-tempo", `${state.run.tempo} bpm`);
  const handLabel = el("span", "ex-run-hand", HAND_LABEL[state.settings.hand]);
  counters.append(repetition, tempoLabel, handLabel);

  const actions = el("div", "ex-run-actions");
  const playBtn = el("button", "btn ex-run-btn", "Pause");
  playBtn.type = "button";
  onClick(playBtn, togglePlay);

  const restartBtn = el("button", "btn ex-run-btn", "Recommencer");
  restartBtn.type = "button";
  onClick(restartBtn, beginRun);

  const quitBtn = el("button", "btn ex-run-btn", "Réglages");
  quitBtn.type = "button";
  onClick(quitBtn, leaveRun);

  actions.append(playBtn, restartBtn, quitBtn);
  header.append(title, counters, actions);

  // --- Rouleau ---------------------------------------------------------------
  const wrap = el("div", "ex-canvas-wrap");
  canvas = el("canvas", "ex-canvas");
  wrap.appendChild(canvas);

  root.append(header, wrap);
  container.replaceChildren(root);

  ctx = canvas.getContext("2d", { alpha: false });
  state.ui = { repetition, playBtn, tempoLabel, handLabel };

  attachCanvasListeners();
  resizeCanvas();
  syncRunUI();
}

function attachCanvasListeners() {
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      const rect = canvas.getBoundingClientRect();
      const midi = keyAtPosition(event.clientX - rect.left, event.clientY - rect.top);
      if (midi !== null) pressKey(midi);
    },
    { signal: listeners.signal }
  );

  window.addEventListener("resize", scheduleCanvasResize, { signal: listeners.signal });
  window.addEventListener("orientationchange", scheduleCanvasResize, {
    signal: listeners.signal,
  });
}

function syncRunUI() {
  if (!state.ui) return;
  const { run } = state;
  const rep = run.repetitionAt(state.currentTime);
  const counting = state.currentTime < state.grid.startTime;
  state.ui.repetition.textContent = counting
    ? `Départ dans ${state.grid.countInBeats - state.grid.beatAt(state.currentTime)}`
    : `Série ${rep} / ${run.repetitions}`;
  state.ui.playBtn.textContent = state.paused ? "Reprendre" : "Pause";
}

function leaveRun() {
  pause({ byUser: false });
  disposeParts();
  closePractice("abandoned");
  stopMidiCapture();
  renderSetup();
}

// ----------------------------------------------------------------------------
//  Géométrie du rouleau
//
//  L'étendue dessinée est celle de l'exercice, élargie jusqu'à une touche
//  blanche de chaque côté : les touches restent larges et rien ne défile
//  latéralement (au plus deux octaves, contre 88 touches dans le mode Morceau).
// ----------------------------------------------------------------------------
function keyboardRange() {
  let low = state.run.lowMidi;
  let high = state.run.highMidi;
  while (low > 0 && !isWhite(low)) low--;
  while (high < 127 && !isWhite(high)) high++;
  return { low, high };
}

function calculateKeyboardHeight(w, h) {
  if (w > h && h <= 500) return Math.round(Math.min(96, Math.max(60, h * 0.16)));
  if (w <= 899) return Math.round(Math.min(112, Math.max(76, h * 0.17)));
  return Math.round(Math.min(150, Math.max(96, h * 0.2)));
}

function rebuildLayout(w, h) {
  const { low, high } = keyboardRange();

  // Index de chaque blanche dans l'étendue, pour placer les colonnes.
  const whiteIndex = new Int16Array(128);
  let whites = 0;
  for (let midi = low; midi <= high; midi++) {
    whiteIndex[midi] = whites;
    if (isWhite(midi)) whites++;
  }

  const keyboardHeight = calculateKeyboardHeight(w, h);
  const keyboardTop = h - keyboardHeight;
  const whiteKeyWidth = w / Math.max(1, whites);

  const geometries = new Array(128).fill(null);
  for (let midi = low; midi <= high; midi++) {
    if (isWhite(midi)) {
      const x = whiteIndex[midi] * whiteKeyWidth;
      geometries[midi] = { x, width: whiteKeyWidth, centerX: x + whiteKeyWidth / 2, white: true };
      continue;
    }
    const centerX = whiteIndex[midi - 1] * whiteKeyWidth + whiteKeyWidth;
    const blackWidth = whiteKeyWidth * 0.62;
    geometries[midi] = {
      x: centerX - blackWidth / 2,
      width: blackWidth,
      centerX,
      white: false,
    };
  }

  // Un temps occupe la place qu'il faut pour que deux mesures tiennent
  // au-dessus de la ligne de lecture.
  const rollHeight = Math.max(1, keyboardTop);
  const pixelsPerBeat = Math.min(
    MAX_PIXELS_PER_BEAT,
    Math.max(MIN_PIXELS_PER_BEAT, rollHeight / (state.run.beatsPerBar * VISIBLE_BARS))
  );

  state.layout = {
    width: w,
    height: h,
    low,
    high,
    whites,
    whiteIndex,
    whiteKeyWidth,
    keyboardHeight,
    keyboardTop,
    geometries,
    pixelsPerBeat,
    pixelsPerSecond: pixelsPerBeat / state.grid.secondsPerBeat,
  };
}

// Le temps croît vers le haut ; la ligne de lecture est le haut du clavier.
function timeToY(time) {
  const { keyboardTop, pixelsPerSecond } = state.layout;
  return keyboardTop - (time - state.currentTime) * pixelsPerSecond;
}

function keyAtPosition(x, y) {
  const layout = state.layout;
  if (!layout || y < layout.keyboardTop) return null;

  const blackHeight = (layout.keyboardHeight - 3) * 0.62;
  if (y <= layout.keyboardTop + 3 + blackHeight) {
    for (let midi = layout.low; midi <= layout.high; midi++) {
      if (isWhite(midi)) continue;
      const g = layout.geometries[midi];
      if (x >= g.x && x <= g.x + g.width) return midi;
    }
  }

  const index = Math.floor(x / layout.whiteKeyWidth);
  let seen = 0;
  for (let midi = layout.low; midi <= layout.high; midi++) {
    if (!isWhite(midi)) continue;
    if (seen === index) return midi;
    seen++;
  }
  return null;
}

// ----------------------------------------------------------------------------
//  Rendu
// ----------------------------------------------------------------------------
function crisp(value) {
  return Math.round(value) + 0.5;
}

function roundRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function draw() {
  const layout = state.layout;
  if (!layout) return;
  const { width: w, height: h, keyboardTop } = layout;

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, w, h);

  drawBlackColumns(h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, keyboardTop);
  ctx.clip();
  drawBeatLines(w, h);
  drawNotes(h);
  ctx.restore();

  drawKeyboard(w, h);
  drawPlayhead(w);
  drawCountIn(w, keyboardTop);
}

function drawBlackColumns(h) {
  const layout = state.layout;
  ctx.fillStyle = COLORS.blackColumn;
  for (let midi = layout.low; midi <= layout.high; midi++) {
    if (isWhite(midi)) continue;
    const g = layout.geometries[midi];
    ctx.fillRect(g.x, 0, g.width, h);
  }
}

// Une ligne par temps, plus marquée sur les premiers temps. Le repère utile ici
// est la pulsation et le début de chaque série, pas le numéro de mesure.
function drawBeatLines(w, h) {
  const { grid, run, layout } = state;
  const firstBeat = Math.max(0, grid.beatAt(state.currentTime - 1));
  const lastBeat = grid.countInBeats + run.playedBeats;
  const topBeat = Math.ceil(
    (state.currentTime + (layout.keyboardTop + 40) / layout.pixelsPerSecond) /
      grid.secondsPerBeat
  );

  ctx.lineWidth = 1;
  for (let beat = firstBeat; beat <= Math.min(lastBeat, topBeat); beat++) {
    const y = crisp(timeToY(grid.timeOf(beat)));
    if (y < -20 || y > h + 20) continue;
    const isBar = grid.beatInBar(beat) === 0;
    ctx.strokeStyle = isBar ? COLORS.barLine : COLORS.beatLine;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Début de chaque série : le seul repère que l'utilisateur compte vraiment.
  ctx.fillStyle = COLORS.label;
  ctx.font = "10px system-ui, sans-serif";
  for (let series = 0; series < run.repetitions; series++) {
    const beat = grid.countInBeats + series * run.beatsPerRepetition;
    const y = timeToY(grid.timeOf(beat));
    if (y < -20 || y > h + 20) continue;
    ctx.fillText(`Série ${series + 1}`, 4, y - 4);
  }
}

function drawNotes(h) {
  const layout = state.layout;
  const now = state.currentTime;

  for (const note of state.run.notes) {
    const yBottom = timeToY(note.time);
    const yTop = timeToY(note.endTime);
    if (yBottom < -40 || yTop > h + 40) continue;

    const g = layout.geometries[note.midi];
    if (!g) continue;

    const isRight = note.hand === "right";
    const dark = !g.white;
    ctx.fillStyle = isRight
      ? dark
        ? COLORS.rightHandDark
        : COLORS.rightHand
      : dark
      ? COLORS.leftHandDark
      : COLORS.leftHand;

    const pad = 1;
    const width = Math.max(2, g.width - pad * 2);
    const height = Math.max(3, yBottom - yTop);
    roundRect(g.x + pad, yTop, width, height, 4);
    ctx.fill();

    if (now >= note.time && now <= note.endTime) {
      ctx.strokeStyle = COLORS.active;
      ctx.lineWidth = 1.25;
      ctx.stroke();
    }

    // Doigté sur la note (plan/03 § 8), tant qu'il reste lisible.
    if (note.finger && height >= 16 && width >= 14) {
      ctx.fillStyle = COLORS.finger;
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(note.finger), g.centerX, yTop + height / 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }
  }
}

// Touches traversées par une note à la position de lecture.
function activeHandOf(midi) {
  for (const note of state.run.notes) {
    if (note.time > state.currentTime) break;
    if (note.midi === midi && state.currentTime <= note.endTime) return note.hand;
  }
  return null;
}

function drawKeyboard(w, h) {
  const layout = state.layout;
  const top = layout.keyboardTop;
  const keyboardHeight = h - top;

  ctx.fillStyle = "#05070a";
  ctx.fillRect(0, top, w, keyboardHeight);
  ctx.fillStyle = "#b23a2e"; // bandeau « feutrine », comme le mode Morceau
  ctx.fillRect(0, top, w, 3);

  const whiteTop = top + 3;
  const whiteHeight = keyboardHeight - 3;

  for (let midi = layout.low; midi <= layout.high; midi++) {
    if (!isWhite(midi)) continue;
    const g = layout.geometries[midi];
    const hand = activeHandOf(midi);
    ctx.fillStyle = hand === "right" ? COLORS.rightHand : hand === "left" ? COLORS.leftHand : "#f2ede1";
    roundRectBottom(g.x + 0.5, whiteTop, g.width - 1, whiteHeight, 4);
    ctx.fill();
    if (state.pressedKeys.has(midi)) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
      roundRectBottom(g.x + 0.5, whiteTop, g.width - 1, whiteHeight, 4);
      ctx.fill();
    }
  }

  // Nom de chaque blanche : l'étendue est courte, autant la nommer entièrement
  // plutôt que de ne marquer que les Do comme sur 88 touches.
  ctx.fillStyle = "#6b6355";
  ctx.font = "10px system-ui, sans-serif";
  ctx.textAlign = "center";
  for (let midi = layout.low; midi <= layout.high; midi++) {
    if (!isWhite(midi)) continue;
    const g = layout.geometries[midi];
    const label = pitchClass(midi) === 0 ? `Do${octaveOf(midi)}` : noteDegreeName(midi);
    ctx.fillText(label, g.centerX, h - 6);
  }
  ctx.textAlign = "left";

  const blackHeight = whiteHeight * 0.62;
  for (let midi = layout.low; midi <= layout.high; midi++) {
    if (isWhite(midi)) continue;
    const g = layout.geometries[midi];
    const hand = activeHandOf(midi);
    ctx.fillStyle =
      hand === "right" ? COLORS.rightHandDark : hand === "left" ? COLORS.leftHandDark : "#14181f";
    roundRectBottom(g.x, whiteTop, g.width, blackHeight, 3);
    ctx.fill();
    if (state.pressedKeys.has(midi)) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      roundRectBottom(g.x, whiteTop, g.width, blackHeight, 3);
      ctx.fill();
    }
  }
}

function roundRectBottom(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.closePath();
}

function drawPlayhead(w) {
  const y = crisp(state.layout.keyboardTop);
  ctx.save();
  ctx.strokeStyle = COLORS.cursor;
  ctx.lineWidth = 2;
  if (!PERFORMANCE_PROFILE.constrained) {
    ctx.shadowColor = COLORS.cursor;
    ctx.shadowBlur = 8;
  }
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(w, y);
  ctx.stroke();
  ctx.restore();
}

// Décompte d'une mesure avant la première note (plan/03 § 8) : « 1 », « 2»…
function drawCountIn(w, keyboardTop) {
  const { grid } = state;
  if (state.currentTime >= grid.startTime) return;

  const beat = grid.beatAt(state.currentTime);
  ctx.fillStyle = COLORS.countIn;
  ctx.font = "700 64px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(grid.countLabel(beat)), w / 2, keyboardTop / 2);
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillText("Prépare ta main", w / 2, keyboardTop / 2 + 52);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawImmediately() {
  if (!isRunning() || !state.layout) return;
  if (state.pendingDraw !== null) {
    cancelAnimationFrame(state.pendingDraw);
    state.pendingDraw = null;
  }
  draw();
}

function scheduleDraw() {
  if (!isRunning() || state.pendingDraw !== null) return;
  state.pendingDraw = requestAnimationFrame(() => {
    if (!isRunning()) return;
    state.pendingDraw = null;
    draw();
  });
}

function resizeCanvas() {
  if (!isRunning() || !canvas) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0) return;

  const nativeDpr = Math.max(1, window.devicePixelRatio || 1);
  const budgetDpr = Math.sqrt(PERFORMANCE_PROFILE.maxCanvasPixels / Math.max(1, w * h));
  const dpr = Math.max(1, Math.min(nativeDpr, PERFORMANCE_PROFILE.maxCanvasDpr, budgetDpr));

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
//  Transport : décompte, notes et clics sur la même timeline
// ----------------------------------------------------------------------------
function disposeParts() {
  for (const part of state.parts) part.dispose();
  state.parts = [];
  Tone.Transport.cancel();
}

function buildParts() {
  disposeParts();
  if (!state.audio.ready) return;

  // Démonstration : l'application joue les notes. Coupée, elle reste muette et
  // c'est l'utilisateur qui joue (pratique libre, plan/03 § 3).
  if (state.settings.demo) {
    const events = state.run.notes.map((note) => ({
      time: note.time,
      note: midiToNote(note.midi),
      duration: note.duration,
      velocity: note.velocity,
    }));
    const notePart = new Tone.Part((time, value) => {
      state.audio.sampler?.triggerAttackRelease(
        value.note,
        value.duration,
        time,
        value.velocity
      );
    }, events);
    notePart.start(0);
    state.parts.push(notePart);
  }

  if (state.settings.metronome && state.click) {
    const clicks = [];
    scheduleClicks(state.grid, state.grid.countInBeats + state.run.playedBeats, {
      schedule: (info) => clicks.push({ time: info.time, accent: info.accent }),
    });
    const clickPart = new Tone.Part((time, value) => {
      state.click?.triggerAttackRelease(
        value.accent ? "C6" : "G5",
        0.03,
        time,
        value.accent ? 0.5 : 0.3
      );
    }, clicks);
    clickPart.start(0);
    state.parts.push(clickPart);
  }
}

async function play() {
  const session = state;
  if (session.isPlaying || session.startPending || session.finished) return;
  session.startPending = true;
  try {
    await session.audio.ensureReady();
    if (session.stopped) return;

    // Petit synthé de clic : le métronome n'a pas besoin d'un échantillon.
    if (!session.click) {
      session.click = new Tone.Synth({
        oscillator: { type: "square" },
        envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.02 },
      }).toDestination();
      session.click.volume.value = -18;
    }

    buildParts();
    Tone.Transport.seconds = session.currentTime;
    Tone.Transport.start();
    session.isPlaying = true;
    session.paused = false;
    session.lastVisualFrame = -Infinity;
    if (session.animationFrame !== null) cancelAnimationFrame(session.animationFrame);
    session.animationFrame = requestAnimationFrame(tick);
    syncRunUI();
  } catch (error) {
    console.error("Impossible d'initialiser l'audio de l'exercice.", error);
  } finally {
    session.startPending = false;
  }
}

function pause({ byUser = true } = {}) {
  if (!state.isPlaying) return;
  state.currentTime = Math.max(0, Tone.Transport.seconds);
  Tone.Transport.pause();
  state.isPlaying = false;
  if (byUser) state.paused = true;
  if (state.animationFrame !== null) {
    cancelAnimationFrame(state.animationFrame);
    state.animationFrame = null;
  }
  syncRunUI();
  drawImmediately();
}

function togglePlay() {
  if (state.isPlaying) pause();
  else play();
}

function tick(frameTime) {
  if (!isRunning()) return;
  state.animationFrame = null;
  if (!state.isPlaying) return;

  state.currentTime = Math.max(0, Tone.Transport.seconds);
  recordCompletedRepetitions();

  const reachedEnd = state.currentTime >= state.run.endTime + END_TAIL_S;
  if (reachedEnd) {
    finishRun();
    return;
  }

  if (frameTime - state.lastVisualFrame >= PERFORMANCE_PROFILE.minFrameInterval) {
    state.lastVisualFrame = frameTime;
    draw();
    syncRunUI();
  }
  state.animationFrame = requestAnimationFrame(tick);
}

// Une série terminée = un évènement `repetition` dans le journal. `none` parce
// que rien n'est mesuré en pratique libre : l'application ne reçoit pas les
// notes jouées, elle ne peut donc pas juger l'exécution (plan/F3 § 7).
function recordCompletedRepetitions() {
  const done = state.run.repetitionAt(state.currentTime) - 1;
  while (state.recordedRepetitions < done) {
    state.recordedRepetitions++;
    recordRepetition(state.recordedRepetitions);
  }
}

// Sans clavier, une série faite reste une série faite : `outcome: "none"`, car
// rien n'a été mesuré. Avec le clavier, la même série devient une **exécution**
// jugée — un `run` en `clean` ou `flawed`, exactement ce que le vocabulaire de
// plan/F3 § 7 réservait à 03. C'est le seul endroit où le type d'évènement change
// selon ce que l'application a réellement vu.
function recordRepetition(index) {
  const target = {
    exerciseId: state.run.exerciseId,
    hand: state.settings.hand,
    key: state.run.key,
    tempo: state.run.tempo,
    repetition: index,
  };

  const report = validateSeries(index);
  if (!report) {
    state.practice?.record({ type: "repetition", target, outcome: "none" });
    return;
  }

  state.practice?.record({
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

function finishRun() {
  pause({ byUser: false });
  disposeParts();
  state.finished = true;
  // La dernière série n'est comptée qu'ici : `repetitionAt` plafonne au dernier
  // numéro, elle ne peut donc pas signaler son achèvement.
  while (state.recordedRepetitions < state.run.repetitions) {
    state.recordedRepetitions++;
    recordRepetition(state.recordedRepetitions);
  }
  renderSummary();
}

// ----------------------------------------------------------------------------
//  Capture des notes du clavier physique
//
//  Les notes reçues sont ramenées sur l'horloge de l'exercice. L'horodatage du
//  message MIDI est plus juste que l'instant où ce rappel s'exécute : quelques
//  millisecondes séparent l'arrivée d'un message de son traitement, et c'est
//  précisément l'ordre de grandeur que la fenêtre de tolérance mesure.
// ----------------------------------------------------------------------------
function startMidiCapture() {
  stopMidiCapture();
  if (!state.settings.validate || !midiInput.state().listening) return;

  const capture = { played: [], reports: [], stopNotes: null };
  capture.stopNotes = midiInput.onNote((event) => {
    if (event.type !== "noteon") return;
    if (!state || state.stopped || !state.isPlaying) return;
    const lateness = Math.max(0, performance.now() - event.timestamp) / 1000;
    capture.played.push({
      midi: event.midi,
      time: Math.max(0, Tone.Transport.seconds - lateness),
      velocity: event.velocity,
    });
  });
  state.midi = capture;
}

function stopMidiCapture() {
  state.midi?.stopNotes?.();
  state.midi = null;
}

// Juge une série terminée : ses notes attendues contre ce qui a été joué.
function validateSeries(index) {
  const capture = state.midi;
  if (!capture) return null;

  const expected = state.run.notes.filter((note) => note.repetition === index);
  if (expected.length === 0) return null;

  // On ne retient que les notes tombées dans la fenêtre de cette série, élargie
  // d'un temps de chaque côté : une note très en avance appartient encore à
  // celle qui commence.
  const margin = state.grid.secondsPerBeat;
  const from = expected[0].time - margin;
  const to = expected[expected.length - 1].endTime + margin;
  const played = capture.played.filter((note) => note.time >= from && note.time <= to);

  const report = validateRepetition(expected, played, state.grid.secondsPerBeat);
  capture.reports.push(report);
  return report;
}

function closePractice(outcome) {
  const practice = state?.practice;
  if (!practice || practice.closed) return;
  practice.close(outcome, {
    completedRepetitions: state.recordedRepetitions,
    plannedRepetitions: state.run?.repetitions ?? 0,
    tempo: state.run?.tempo ?? state.settings.tempo,
    seconds: Math.round((Date.now() - state.startedAt) / 1000),
  });
}

// ----------------------------------------------------------------------------
//  Bilan
//
//  Sans clavier MIDI, l'application n'affiche que ce qu'elle sait réellement :
//  durée, tempo, séries terminées. **Aucun pourcentage de précision** — elle
//  n'a pas reçu une seule note jouée (plan/03 § 9).
// ----------------------------------------------------------------------------
function renderSummary() {
  const seconds = Math.round((Date.now() - state.startedAt) / 1000);
  closePractice("done");

  const exercise = currentExercise();
  const root = el("div", "ex ex--summary");
  root.append(
    el("h1", "ex-heading", "Série terminée"),
    el("p", "ex-lede", `${exercise.title} — ${HAND_LABEL[state.settings.hand]}`)
  );

  const stats = el("ul", "ex-stats");
  stats.append(
    statItem(String(state.recordedRepetitions), state.recordedRepetitions > 1 ? "répétitions" : "répétition"),
    statItem(`${state.run.tempo} bpm`, "tempo utilisé"),
    statItem(formatDuration(seconds), "de pratique")
  );
  root.appendChild(stats);

  // Avec un clavier MIDI, on ajoute ce qui a réellement été mesuré (plan/03 § 9).
  // Sans lui, on dit pourquoi il n'y a rien à ajouter.
  const midiReport =
    state.midi && state.midi.reports.length > 0
      ? summarizeMidiRun(state.midi.reports)
      : null;

  if (midiReport) {
    root.appendChild(el("h2", "ex-subheading", "Tes notes"));

    const played = el("ul", "ex-stats");
    played.append(
      statItem(`${midiReport.correct} / ${midiReport.total}`, "notes justes"),
      statItem(`${Math.round(midiReport.accuracy * 100)} %`, "de notes passées"),
      statItem(`${midiReport.clean} / ${midiReport.repetitions}`, "séries sans faute")
    );
    root.appendChild(played);

    root.appendChild(el("p", "ex-tendency", TIMING_TEXT[midiReport.timing.tendency]));

    if (midiReport.extras > 0) {
      root.appendChild(
        el(
          "p",
          "ex-note",
          `${midiReport.extras} note${midiReport.extras > 1 ? "s" : ""} en trop : sans conséquence sur le verdict, mais bon à savoir.`
        )
      );
    }

    // Par main : c'est là qu'on voit celle qui suit mal, souvent la gauche.
    const hands = Object.entries(midiReport.byHand).filter(
      ([, counts]) => counts.expected > 0
    );
    if (hands.length > 1) {
      root.append(el("h2", "ex-subheading", "Par main"), renderHandList(hands));
    }

    if (midiReport.toRework.length > 0) {
      root.appendChild(el("h2", "ex-subheading", "À retravailler"));
      const list = el("ul", "ex-review");
      for (const entry of midiReport.toRework) {
        const times = entry.errors > 1 ? "fois" : "fois";
        list.appendChild(
          el(
            "li",
            "ex-review-item",
            `Pas ${entry.step + 1} — ${entry.label} : raté ${entry.errors} ${times}`
          )
        );
      }
      root.appendChild(list);
    }
  } else {
    root.appendChild(
      el(
        "p",
        "ex-note",
        "L'application ne reçoit pas les notes que tu joues : elle ne peut donc pas juger ta précision."
      )
    );
  }

  const nextTempo = clampTempo(state.run.tempo + TEMPO_STEP);
  const actions = el("div", "ex-actions");

  const again = el("button", "btn ex-primary", "Refaire au même tempo");
  again.type = "button";
  onClick(again, beginRun);
  actions.appendChild(again);

  // Proposé, jamais appliqué d'office (plan/03 § 10).
  if (nextTempo > state.run.tempo) {
    const faster = el("button", "btn ex-secondary", `Un peu plus vite (${nextTempo} bpm)`);
    faster.type = "button";
    onClick(faster, () => {
      state.settings.tempo = nextTempo;
      beginRun();
    });
    actions.appendChild(faster);
  }

  const settings = el("button", "btn ex-secondary", "Changer de réglages");
  settings.type = "button";
  onClick(settings, renderSetup);
  actions.appendChild(settings);

  root.appendChild(actions);

  if (!state.progress.persistent) {
    root.appendChild(
      el(
        "p",
        "ex-note",
        "Séance non enregistrée : le stockage de ce navigateur est indisponible."
      )
    );
  }

  container.replaceChildren(root);
  canvas = null;
  ctx = null;
  state.ui = null;
  state.layout = null;
}

function statItem(value, label) {
  const item = el("li", "ex-stat");
  item.append(el("span", "ex-stat-value", value), el("span", "ex-stat-label", label));
  return item;
}

function renderHandList(hands) {
  const list = el("ul", "ex-hands");
  for (const [hand, counts] of hands) {
    const item = el("li", "ex-hand-stat");
    item.append(
      el("span", "ex-hand-stat-label", HAND_LABEL[hand] ?? hand),
      el(
        "span",
        "ex-hand-stat-value",
        `${counts.correct} / ${counts.expected} — ${Math.round(counts.accuracy * 100)} %`
      )
    );
    list.appendChild(item);
  }
  return list;
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest} s`;
  return `${minutes} min ${String(rest).padStart(2, "0")}`;
}

// ----------------------------------------------------------------------------
//  Clavier cliquable
// ----------------------------------------------------------------------------
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
    await session.audio.playNote(midi);
  } catch (error) {
    console.error("Impossible de jouer la note.", error);
  }
}

// ----------------------------------------------------------------------------
//  Cycle de vie
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

// Reprend les réglages de la dernière séance, comme la Lecture de notes
// (plan/02 étape D). Un réglage devenu invalide est ignoré plutôt que corrigé.
function restoreSettings() {
  const last = lastSessionContext(state.progress.log(), exerciseFeature.id);
  if (!last) return;

  const exercise = exerciseById(last.exerciseId);
  if (!exercise) return;
  state.settings.exerciseId = exercise.id;
  state.settings.tempo = clampTempo(last.tempo ?? exercise.defaultTempo);
  state.settings.repetitions = clampRepetitions(
    last.repetitions ?? exercise.defaultRepetitions
  );
  if (supportsHand(exercise, last.handMode)) state.settings.hand = last.handMode;
  if (typeof last.metronome === "boolean") state.settings.metronome = last.metronome;
  if (typeof last.demo === "boolean") state.settings.demo = last.demo;
  // `validated` dit si les notes ont été **vues**, pas si l'utilisateur le
  // voulait : on ne restaure donc ce réglage que quand il était effectif.
  if (last.validated === true) state.settings.validate = true;
}

function flushProgress() {
  state?.progress.flush();
}

function onVisibilityChange() {
  if (document.visibilityState === "hidden") flushProgress();
}

function stop() {
  if (!state) return;

  // 1. Marquer le mode mort : les rappels encore en vol s'arrêteront d'eux-mêmes.
  state.stopped = true;
  if (state.animationFrame !== null) cancelAnimationFrame(state.animationFrame);
  if (state.pendingDraw !== null) cancelAnimationFrame(state.pendingDraw);
  if (state.pendingResize !== null) cancelAnimationFrame(state.pendingResize);
  for (const timer of state.timers) clearTimeout(timer);
  for (const timer of state.keyPressTimers) clearTimeout(timer);
  state.timers.clear();
  state.keyPressTimers.clear();

  // 2. Arrêter le transport et libérer tout ce qui sonne.
  disposeParts();
  Tone.Transport.stop();
  state.click?.dispose();
  state.click = null;
  state.audio.dispose();

  // 3. Clore la séance : quitter en route est un abandon, pas une fin.
  closePractice("abandoned");
  state.progress.flush();

  // 4. Se désabonner du clavier MIDI. L'entrée elle-même reste connectée : elle
  //    est partagée et survit au changement de mode (plan/F2 § 9).
  stopMidiCapture();

  // 5. Écouteurs, puis scène.
  listeners.abort();
  listeners = null;
  container?.replaceChildren();
  container = null;
  canvas = null;
  ctx = null;
  state = null;
}
