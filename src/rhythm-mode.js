// ============================================================================
//  Mode Rythme — Feature 05 « Entraînement rythmique »
//
//  Trois familles (plan/05-entrainement-rythmique.md § 4) :
//    - Métronome      : une pulsation réglable, audible et visible. Un outil,
//                       donc sans bilan noté.
//    - Reconnaissance : un motif affiché et joué, une figure à nommer.
//    - Reproduction   : un motif de référence à rejouer en tapant ou sur le
//                       piano à l'écran, avec un jugement par frappe.
//
//  Les instants et les jugements vivent dans `rhythm/patterns.js` et
//  `rhythm/timing.js`, sans DOM ; la pulsation vient de `metronome.js`, partagé
//  avec les Exercices techniques (plan/03) et **non redupliqué**. Ce fichier ne
//  fait que du rendu, de la capture et du transport.
//
//  Aucune boucle d'animation : tout ce qui bouge est planifié à l'avance sur le
//  Transport et rendu par `Tone.Draw`. Sur la vieille tablette, un métronome ne
//  doit pas coûter un `requestAnimationFrame` par image (CLAUDE.md).
//
//  Cycle de vie : `start(container)` construit l'écran ; `stop()` arrête le
//  transport, libère l'audio et n'en laisse rien.
// ============================================================================

import * as Tone from "https://cdn.jsdelivr.net/npm/tone@14.8.49/+esm";
import { createAudio } from "./audio.js";
import { isWhite, noteDegreeName, octaveOf, pitchClass } from "./music.js";
import {
  clampTempo,
  createBeatGrid,
  MAX_BPM,
  MIN_BPM,
  scheduleClicks,
} from "./metronome.js";
import {
  buildRecognitionQuestion,
  DIFFICULTIES,
  difficultyById,
  expandPattern,
  FAMILIES,
  FIGURES,
  patternsOf,
} from "./rhythm/patterns.js";
import { matchTaps, timingSummary } from "./rhythm/timing.js";
import { midiInput } from "./midi-input.js";
import { createProgressStore } from "./progress/store.js";
import { lastSessionContext } from "./progress/review.js";

const SVG_NS = "http://www.w3.org/2000/svg";

// Une octave de Do4 à Do5 pour le mode « Piano à l'écran ». La hauteur n'est
// jamais prise en compte (plan/05 § 3) : n'importe quelle touche est une frappe.
const PIANO_LOW = 60;
const PIANO_HIGH = 72;

const TEMPO_STEP = 4;
const MIN_PATTERNS = 2;
const MAX_PATTERNS = 12;

// Durées proposées pour le métronome (plan/05 § 7 : « durée en minutes »).
const METRONOME_MINUTES = [1, 2, 5, 10];

// Le troisième n'est proposé que si un clavier écoute réellement (plan/05 § 7 :
// « Clavier MIDI si F2 est disponible et connecté »).
const INPUT_MODES = [
  { id: "tap", label: "Taper" },
  { id: "piano", label: "Piano à l'écran" },
  { id: "midi", label: "Clavier MIDI" },
];

const INPUT_HINT = {
  tap: () => "Tape le grand bouton, ou la barre d'espace.",
  piano: () => "Clique n'importe quelle touche : seul le moment compte, pas la note.",
  midi: (midi) =>
    midi.listening
      ? `Joue sur « ${midi.activeDeviceName} » : n'importe quelle touche, seul le moment compte.`
      : "Aucun clavier connecté : branche-le depuis l'accueil pour utiliser cette entrée.",
};

// Ce que chaque jugement dit à l'utilisateur, et sa couleur.
const JUDGMENT_LABEL = {
  "on-time": "À l'heure",
  early: "En avance",
  late: "En retard",
  missed: "Manquée",
};

const TENDENCY_TEXT = {
  steady: "Pulsation régulière : continue comme ça.",
  early: "Tu anticipes presque toujours : laisse la pulsation arriver.",
  late: "Tu arrives presque toujours après : prépare la frappe un peu plus tôt.",
  irregular: "Irrégulier plutôt que décalé : écoute le métronome, pas tes doigts.",
  none: "Aucune frappe reçue : rien n'a pu être mesuré.",
};

// ----------------------------------------------------------------------------
//  Fiche de la fonctionnalité
// ----------------------------------------------------------------------------
export const rhythmFeature = {
  id: "rhythm",
  title: "Rythme",
  description: "Métronome, reconnaissance des durées et reproduction d'un rythme.",
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
    click: null,   // pulsation du métronome
    voice: null,   // rythme de référence : un timbre neutre, pas le piano
    progress: createProgressStore(),
    practice: null,

    settings: {
      family: "metronome",
      difficulty: "beginner",
      tempo: 70,
      patternCount: 4,
      minutes: 2,
      inputMode: "tap",
    },

    running: false,
    startPending: false,
    parts: [],
    timers: new Set(),
    stopMidi: null, // désabonnement du clavier physique, s'il est utilisé

    // Séance de Reconnaissance / Reproduction
    session: null,
    attempt: null,
    ui: null,
  };
}

function isAlive() {
  return state !== null && !state.stopped;
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
//  Utilitaires DOM / SVG
// ----------------------------------------------------------------------------
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function svgEl(tag, attributes = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, String(value));
  }
  return node;
}

function onClick(node, handler) {
  node.addEventListener("click", handler, { signal: listeners.signal });
}

// ----------------------------------------------------------------------------
//  Notation rythmique
//
//  Une portée d'une seule ligne : ce qui est travaillé ici est la durée, pas la
//  hauteur (plan/05 § 3). Les figures sont dessinées — tête, hampe, crochets,
//  point — plutôt que prises dans une police, sauf les silences dont le glyphe
//  Unicode est plus lisible que tout ce qu'un tracé simple donnerait.
// ----------------------------------------------------------------------------
const STAFF = {
  height: 96,
  line: 62,      // ordonnée de la ligne
  headRx: 8,
  headRy: 6,
  stemTop: 22,
  beatWidth: 46, // largeur d'un temps
  leftPad: 52,   // place du chiffrage de mesure
  rightPad: 24,
};

function renderRhythmStaff(run, { highlightIndex = null, states = null } = {}) {
  const width = STAFF.leftPad + run.totalBeats * STAFF.beatWidth + STAFF.rightPad;
  const svg = svgEl("svg", {
    class: "rh-staff",
    viewBox: `0 0 ${width} ${STAFF.height}`,
    preserveAspectRatio: "xMidYMid meet",
    role: "img",
  });

  const title = svgEl("title");
  title.textContent = `Motif rythmique en ${run.timeSignature.join("/")} : ${run.events
    .map((event) => event.name)
    .join(", ")}`;
  svg.appendChild(title);

  svg.appendChild(
    svgEl("line", {
      class: "rh-staff-line",
      x1: 8,
      y1: STAFF.line,
      x2: width - 8,
      y2: STAFF.line,
    })
  );

  // Chiffrage de mesure, empilé comme sur une partition.
  const [numerator, denominator] = run.timeSignature;
  const top = svgEl("text", { class: "rh-meter", x: 22, y: STAFF.line - 8 });
  top.textContent = String(numerator);
  const bottom = svgEl("text", { class: "rh-meter", x: 22, y: STAFF.line + 22 });
  bottom.textContent = String(denominator);
  svg.append(top, bottom);

  // Barres de mesure.
  for (let bar = 1; bar <= run.bars; bar++) {
    const x = STAFF.leftPad + bar * run.barBeats * STAFF.beatWidth - 6;
    svg.appendChild(
      svgEl("line", { class: "rh-barline", x1: x, y1: STAFF.line - 26, x2: x, y2: STAFF.line + 26 })
    );
  }

  run.events.forEach((event, index) => {
    const x = STAFF.leftPad + event.beat * STAFF.beatWidth;
    const group = svgEl("g", { class: "rh-figure" });
    if (index === highlightIndex) group.setAttribute("data-highlight", "true");
    const status = states?.[index];
    if (status) group.setAttribute("data-status", status);

    if (event.type === "rest") {
      const glyph = svgEl("text", { class: "rh-rest", x, y: STAFF.line + 6 });
      glyph.textContent = FIGURES[event.figure].glyph;
      group.appendChild(glyph);
    } else {
      drawNote(group, FIGURES[event.figure], x);
    }

    svg.appendChild(group);
  });

  return svg;
}

function drawNote(group, figure, x) {
  const head = svgEl("ellipse", {
    class: figure.hollow ? "rh-head rh-head--hollow" : "rh-head",
    cx: x,
    cy: STAFF.line,
    rx: STAFF.headRx,
    ry: STAFF.headRy,
    transform: `rotate(-17 ${x} ${STAFF.line})`,
  });
  group.appendChild(head);

  if (figure.stem) {
    const stemX = x + STAFF.headRx - 1;
    group.appendChild(
      svgEl("line", {
        class: "rh-stem",
        x1: stemX,
        y1: STAFF.line - 2,
        x2: stemX,
        y2: STAFF.stemTop,
      })
    );

    // Crochets : un pour la croche, deux pour la double.
    for (let flag = 0; flag < figure.flags; flag++) {
      const y = STAFF.stemTop + flag * 9;
      group.appendChild(
        svgEl("path", {
          class: "rh-flag",
          d: `M ${stemX} ${y} c 9 3 12 9 10 17 c -1 -8 -5 -11 -10 -12 z`,
        })
      );
    }
  }

  if (figure.dotted) {
    group.appendChild(
      svgEl("circle", { class: "rh-dot", cx: x + STAFF.headRx + 8, cy: STAFF.line - 4, r: 2.6 })
    );
  }
}

// ----------------------------------------------------------------------------
//  Écran de réglages
// ----------------------------------------------------------------------------
function renderSetup() {
  stopTransport();
  const root = el("div", "rh rh--setup");
  const family = currentFamily();

  root.append(
    el("h1", "rh-heading", "Entraînement rythmique"),
    el("p", "rh-lede", "Le rythme se travaille seul : ici, la hauteur des notes ne compte pas.")
  );

  root.appendChild(renderChoiceGroup("Famille", FAMILIES, "family"));
  root.appendChild(el("p", "rh-goal", `But : ${family.goal}`));

  // Le métronome n'a pas de niveau : il n'y a pas de motif à choisir.
  if (family.id !== "metronome") {
    root.appendChild(renderChoiceGroup("Niveau", DIFFICULTIES, "difficulty"));
  }

  root.appendChild(
    renderStepper(
      "Tempo",
      `${state.settings.tempo} bpm`,
      () => setTempo(state.settings.tempo - TEMPO_STEP),
      () => setTempo(state.settings.tempo + TEMPO_STEP),
      state.settings.tempo <= MIN_BPM,
      state.settings.tempo >= MAX_BPM
    )
  );

  if (family.id === "metronome") {
    root.appendChild(
      renderChoiceGroup(
        "Durée",
        METRONOME_MINUTES.map((minutes) => ({
          id: minutes,
          label: `${minutes} min`,
          status: "available",
        })),
        "minutes"
      )
    );
  } else {
    root.appendChild(
      renderStepper(
        "Motifs",
        String(state.settings.patternCount),
        () => setPatternCount(state.settings.patternCount - 1),
        () => setPatternCount(state.settings.patternCount + 1),
        state.settings.patternCount <= MIN_PATTERNS,
        state.settings.patternCount >= MAX_PATTERNS
      )
    );
  }

  if (family.id === "reproduction") {
    const midi = midiInput.state();
    root.appendChild(
      renderChoiceGroup(
        "Comment frapper",
        INPUT_MODES.map((mode) => ({
          ...mode,
          // Le clavier physique reste visible mais désactivé quand il n'écoute
          // pas : l'utilisateur voit que l'option existe, sans pouvoir lancer une
          // séance qui n'enregistrerait rien.
          status: mode.id !== "midi" || midi.listening ? "available" : "soon",
        })),
        "inputMode"
      )
    );
    root.appendChild(el("p", "rh-hint", INPUT_HINT[state.settings.inputMode](midi)));
  }

  const startBtn = el("button", "btn rh-primary", family.id === "metronome" ? "Démarrer" : "Commencer");
  startBtn.type = "button";
  onClick(startBtn, beginSession);
  root.appendChild(startBtn);

  container.replaceChildren(root);
  state.ui = null;
}

function renderChoiceGroup(legend, choices, settingKey) {
  const group = el("fieldset", "rh-choice");
  group.appendChild(el("legend", "rh-choice-legend", legend));
  const row = el("div", "rh-choice-row");

  for (const choice of choices) {
    const button = el("button", "rh-choice-btn", choice.label);
    button.type = "button";
    const available = (choice.status ?? "available") === "available";
    button.disabled = !available;
    if (!available) {
      button.title = "Bientôt";
      button.appendChild(el("span", "rh-choice-soon", "Bientôt"));
    }

    const selected = state.settings[settingKey] === choice.id;
    button.setAttribute("aria-pressed", String(selected));
    if (selected) button.classList.add("is-selected");

    if (available) {
      onClick(button, () => {
        const previous = state.settings[settingKey];
        state.settings[settingKey] = choice.id;

        // Changer de niveau reprend son tempo indicatif (plan/05 § 6) : c'est une
        // valeur par défaut, pas une limite — elle reste modifiable ensuite.
        if (settingKey === "difficulty") {
          state.settings.tempo = difficultyById(choice.id).defaultTempo;
        }

        // Changer de famille aussi : un tempo réglé au métronome n'a aucune
        // raison de devenir celui d'un exercice de lecture. Le métronome, lui,
        // garde le tempo courant — c'est justement l'outil pour le chercher.
        if (settingKey === "family" && previous !== choice.id && choice.id !== "metronome") {
          state.settings.tempo = difficultyById(state.settings.difficulty).defaultTempo;
        }

        renderSetup();
      });
    }
    row.appendChild(button);
  }

  group.appendChild(row);
  return group;
}

function renderStepper(legend, value, onMinus, onPlus, minReached, maxReached) {
  const group = el("fieldset", "rh-choice");
  group.appendChild(el("legend", "rh-choice-legend", legend));

  const row = el("div", "rh-stepper");
  const minus = el("button", "rh-step-btn", "−");
  minus.type = "button";
  minus.disabled = minReached;
  minus.setAttribute("aria-label", `${legend} : diminuer`);
  onClick(minus, onMinus);

  const plus = el("button", "rh-step-btn", "+");
  plus.type = "button";
  plus.disabled = maxReached;
  plus.setAttribute("aria-label", `${legend} : augmenter`);
  onClick(plus, onPlus);

  row.append(minus, el("span", "rh-step-value", value), plus);
  group.appendChild(row);
  return group;
}

function currentFamily() {
  return FAMILIES.find((family) => family.id === state.settings.family) ?? FAMILIES[0];
}

function setTempo(bpm) {
  state.settings.tempo = clampTempo(bpm);
  renderSetup();
}

function setPatternCount(count) {
  state.settings.patternCount = Math.min(
    MAX_PATTERNS,
    Math.max(MIN_PATTERNS, Math.round(count))
  );
  renderSetup();
}

// ----------------------------------------------------------------------------
//  Ouverture d'une séance
// ----------------------------------------------------------------------------
function beginSession() {
  closePractice("abandoned");

  // Filet : un clavier débranché entre le réglage et le départ ne doit pas
  // ouvrir une séance muette. On retombe sur le tap.
  if (state.settings.inputMode === "midi" && !midiInput.state().listening) {
    state.settings.inputMode = "tap";
  }

  const family = currentFamily();
  state.practice = state.progress.openSession(rhythmFeature.id, {
    family: family.id,
    difficulty: family.id === "metronome" ? null : state.settings.difficulty,
    tempo: state.settings.tempo,
    patternCount: family.id === "metronome" ? null : state.settings.patternCount,
    minutes: family.id === "metronome" ? state.settings.minutes : null,
    inputMode: family.id === "reproduction" ? state.settings.inputMode : null,
  });

  if (family.id === "metronome") {
    startMetronome();
    return;
  }

  // Tirage des motifs : on ne repose pas deux fois le même d'affilée tant que le
  // niveau en a plusieurs.
  const pool = patternsOf(state.settings.difficulty);
  const order = [];
  let previous = null;
  for (let i = 0; i < state.settings.patternCount; i++) {
    const candidates = pool.length > 1 ? pool.filter((p) => p.id !== previous) : pool;
    const pattern = candidates[Math.floor(Math.random() * candidates.length)];
    order.push(pattern);
    previous = pattern.id;
  }

  state.session = {
    family: family.id,
    order,
    index: 0,
    results: [],   // Reconnaissance : booléens ; Reproduction : bilans de timing
    hits: [],      // Reproduction : toutes les frappes jugées de la séance
  };

  if (family.id === "recognition") renderRecognition();
  else renderReproduction();
}

function closePractice(outcome) {
  const practice = state?.practice;
  if (!practice || practice.closed) return;
  practice.close(outcome, {
    family: state.session?.family ?? state.settings.family,
    completed: state.session?.results.length ?? 0,
    planned: state.session?.order.length ?? 0,
    tempo: state.settings.tempo,
  });
}

// ----------------------------------------------------------------------------
//  Audio : deux voix distinctes
//
//  Le métronome et le rythme de référence ne doivent pas se confondre à
//  l'oreille, sinon on n'entend plus lequel on suit. Aucune des deux n'est le
//  piano : un timbre neutre évite de suggérer une hauteur, que cet exercice
//  ignore justement (plan/05 § 3 et § 15).
// ----------------------------------------------------------------------------
async function ensureVoices() {
  await Tone.start();
  if (state.stopped) return;
  if (!state.click) {
    state.click = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.02 },
    }).toDestination();
    state.click.volume.value = -20;
  }
  if (!state.voice) {
    state.voice = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.002, decay: 0.09, sustain: 0, release: 0.05 },
    }).toDestination();
    state.voice.volume.value = -8;
  }
}

function disposeParts() {
  for (const part of state.parts) part.dispose();
  state.parts = [];
  Tone.Transport.cancel();
  Tone.Draw.cancel();
}

function stopTransport() {
  if (!state) return;
  disposeParts();
  Tone.Transport.stop();
  state.running = false;
}

// Planifie la pulsation : un clic par temps, accentué sur le premier, et un
// rappel visuel synchronisé par `Tone.Draw` — pas de boucle d'animation.
function schedulePulse(grid, totalBeats, onBeat) {
  const clicks = [];
  scheduleClicks(grid, totalBeats, {
    schedule: (info) => clicks.push(info),
  });

  const part = new Tone.Part((time, info) => {
    state.click?.triggerAttackRelease(
      info.accent ? "C6" : "G5",
      0.03,
      time,
      info.accent ? 0.6 : 0.35
    );
    if (onBeat) {
      Tone.Draw.schedule(() => {
        if (isAlive()) onBeat(info);
      }, time);
    }
  }, clicks.map((info) => [info.time, info]));
  part.start(0);
  state.parts.push(part);
  return clicks;
}

// ----------------------------------------------------------------------------
//  Famille Métronome
//
//  Un outil, pas un test : ni score, ni bilan (plan/05 § 9).
// ----------------------------------------------------------------------------
function renderMetronome() {
  const root = el("div", "rh rh--metronome");

  const tempo = el("div", "rh-bigtempo");
  const value = el("span", "rh-bigtempo-value", String(state.settings.tempo));
  tempo.append(value, el("span", "rh-bigtempo-unit", "bpm"));

  // Pulsation visuelle : un point par temps de la mesure, celui du temps en
  // cours s'allume. Plus lisible qu'un seul point qui clignote.
  const dots = el("div", "rh-pulse");
  const dotNodes = [];
  for (let beat = 0; beat < 4; beat++) {
    const dot = el("span", "rh-pulse-dot");
    if (beat === 0) dot.classList.add("rh-pulse-dot--accent");
    dots.appendChild(dot);
    dotNodes.push(dot);
  }

  const controls = el("div", "rh-actions");
  const minus = el("button", "btn rh-step-btn", "−");
  minus.type = "button";
  minus.setAttribute("aria-label", "Tempo : diminuer");
  onClick(minus, () => changeRunningTempo(-TEMPO_STEP));
  const plus = el("button", "btn rh-step-btn", "+");
  plus.type = "button";
  plus.setAttribute("aria-label", "Tempo : augmenter");
  onClick(plus, () => changeRunningTempo(TEMPO_STEP));

  const toggle = el("button", "btn rh-primary", "Arrêter");
  toggle.type = "button";
  onClick(toggle, toggleMetronome);

  const quit = el("button", "btn rh-secondary", "Réglages");
  quit.type = "button";
  onClick(quit, leaveSession);

  controls.append(minus, plus, toggle, quit);

  const remaining = el("p", "rh-hint", "");

  root.append(
    el("h1", "rh-heading", "Métronome"),
    tempo,
    dots,
    remaining,
    controls,
    el("p", "rh-note", "Aucun score ici : c'est un outil, pas un exercice noté.")
  );

  container.replaceChildren(root);
  state.ui = { tempoValue: value, dots: dotNodes, toggle, remaining };
}

async function startMetronome() {
  renderMetronome();
  await runMetronome();
}

async function runMetronome() {
  const session = state;
  if (session.startPending) return;
  session.startPending = true;
  try {
    await ensureVoices();
    if (session.stopped) return;

    const grid = createBeatGrid({ bpm: session.settings.tempo, countInBars: 0 });
    const totalBeats = Math.ceil((session.settings.minutes * 60) / grid.secondsPerBeat);

    disposeParts();
    schedulePulse(grid, totalBeats, (info) => showPulse(info.beat % 4));

    // Fin de la durée demandée : le métronome s'arrête de lui-même.
    const endPart = new Tone.Part((time) => {
      Tone.Draw.schedule(() => {
        if (isAlive()) finishMetronome();
      }, time);
    }, [[grid.timeOf(totalBeats), "end"]]);
    endPart.start(0);
    session.parts.push(endPart);

    Tone.Transport.seconds = 0;
    Tone.Transport.start();
    session.running = true;
    if (session.ui) {
      session.ui.toggle.textContent = "Arrêter";
      session.ui.remaining.textContent = `${session.settings.minutes} min de pulsation`;
    }
  } catch (error) {
    console.error("Impossible de démarrer le métronome.", error);
  } finally {
    session.startPending = false;
  }
}

function showPulse(index) {
  const dots = state.ui?.dots;
  if (!dots) return;
  for (const dot of dots) dot.classList.remove("is-on");
  dots[index]?.classList.add("is-on");
}

function toggleMetronome() {
  if (state.running) {
    stopTransport();
    if (state.ui) {
      state.ui.toggle.textContent = "Reprendre";
      for (const dot of state.ui.dots) dot.classList.remove("is-on");
    }
    return;
  }
  runMetronome();
}

function changeRunningTempo(delta) {
  state.settings.tempo = clampTempo(state.settings.tempo + delta);
  if (state.ui) state.ui.tempoValue.textContent = String(state.settings.tempo);
  // Le tempo se change en marche : on replanifie sur la nouvelle grille plutôt
  // que d'étirer la précédente.
  if (state.running) runMetronome();
}

function finishMetronome() {
  stopTransport();
  if (!state.ui) return;
  state.ui.toggle.textContent = "Reprendre";
  state.ui.remaining.textContent = "Durée écoulée.";
  for (const dot of state.ui.dots) dot.classList.remove("is-on");
}

// ----------------------------------------------------------------------------
//  Famille Reconnaissance
//
//  Le motif est affiché **et** joué ; une de ses figures est encadrée, et il
//  s'agit de la nommer (plan/05 § 4 : « Nommer une durée ou un silence »).
// ----------------------------------------------------------------------------
function renderRecognition() {
  const pattern = state.session.order[state.session.index];
  const run = expandPattern(pattern, { tempo: state.settings.tempo });
  const question = buildRecognitionQuestion(pattern, state.settings.difficulty);
  state.attempt = { run, question, answered: false };

  const root = el("div", "rh rh--exercise");

  const status = el("div", "rh-status");
  status.append(
    el("span", "rh-progress", `${state.session.index + 1} / ${state.session.order.length}`),
    el("span", "rh-meta", `${run.timeSignature.join("/")} · ${state.settings.tempo} bpm`)
  );
  const listen = el("button", "btn rh-listen", "Écouter");
  listen.type = "button";
  onClick(listen, () => playReference(run));
  status.appendChild(listen);

  const staffWrap = el("div", "rh-staff-wrap");
  staffWrap.appendChild(renderRhythmStaff(run, { highlightIndex: question.askedIndex }));

  root.append(
    status,
    el("p", "rh-question", "Comment s'appelle la figure encadrée ?"),
    staffWrap
  );

  const choices = el("div", "rh-choice-row rh-answers");
  for (const figure of question.choices) {
    const button = el("button", "rh-choice-btn rh-answer", figure.name);
    button.type = "button";
    button.dataset.figure = figure.id;
    onClick(button, () => answerRecognition(figure));
    choices.appendChild(button);
  }

  const feedback = el("p", "rh-feedback", "");

  const actions = el("div", "rh-actions");
  const quit = el("button", "btn rh-secondary", "Réglages");
  quit.type = "button";
  onClick(quit, leaveSession);
  actions.appendChild(quit);

  root.append(choices, feedback, actions);
  container.replaceChildren(root);
  state.ui = { feedback, choices };

  playReference(run);
}

async function playReference(run) {
  try {
    await ensureVoices();
    if (state.stopped) return;
    stopTransport();

    const events = run.noteEvents.map((event) => [
      event.time,
      Math.min(0.22, Math.max(0.05, event.duration * 0.6)),
    ]);
    const part = new Tone.Part((time, duration) => {
      state.voice?.triggerAttackRelease("A5", duration, time);
    }, events);
    part.start(0);
    state.parts.push(part);

    Tone.Transport.seconds = 0;
    Tone.Transport.start();
    state.running = true;
  } catch (error) {
    console.error("Impossible de jouer le motif.", error);
  }
}

function answerRecognition(figure) {
  const attempt = state.attempt;
  if (!attempt || attempt.answered) return;
  attempt.answered = true;

  const correct = figure.id === attempt.question.answer.id;
  state.session.results.push(correct);

  state.practice?.record({
    type: "answer",
    target: {
      patternId: attempt.run.patternId,
      figure: attempt.question.answer.id,
      difficulty: state.settings.difficulty,
    },
    outcome: correct ? "correct" : "wrong",
    ...(correct ? {} : { given: { figure: figure.id } }),
  });

  for (const button of state.ui.choices.children) {
    const isAnswer = button.dataset.figure === attempt.question.answer.id;
    if (isAnswer) button.dataset.status = "correct";
    else if (button.dataset.figure === figure.id) button.dataset.status = "wrong";
    button.disabled = true;
  }

  state.ui.feedback.textContent = correct
    ? `Oui : ${attempt.question.answer.name}.`
    : `Non, c'était une ${attempt.question.answer.name}.`;
  state.ui.feedback.dataset.status = correct ? "correct" : "wrong";

  later(nextQuestion, 1100);
}

function nextQuestion() {
  state.session.index++;
  if (state.session.index >= state.session.order.length) {
    renderSummary();
    return;
  }
  if (state.session.family === "recognition") renderRecognition();
  else renderReproduction();
}

// ----------------------------------------------------------------------------
//  Famille Reproduction
//
//  Trois mesures par motif : une de décompte, une où le motif est joué, une où
//  l'utilisateur le rejoue. Écouter puis répondre, sans jamais couper la
//  pulsation — c'est ce qui permet de juger le timing plutôt que la mémoire.
// ----------------------------------------------------------------------------
function renderReproduction() {
  const pattern = state.session.order[state.session.index];
  const grid = createBeatGrid({ bpm: state.settings.tempo, beatsPerBar: pattern.timeSignature[0] });
  const reference = expandPattern(pattern, {
    tempo: state.settings.tempo,
    startTime: grid.startTime,
  });
  const target = expandPattern(pattern, {
    tempo: state.settings.tempo,
    startTime: grid.startTime + reference.barBeats * grid.secondsPerBeat,
  });

  state.attempt = {
    grid,
    reference,
    target,
    taps: [],
    judged: false,
    phase: "count-in",
  };

  const root = el("div", "rh rh--exercise");

  const status = el("div", "rh-status");
  const progress = el(
    "span",
    "rh-progress",
    `${state.session.index + 1} / ${state.session.order.length}`
  );
  const phase = el("span", "rh-phase", "Décompte…");
  status.append(progress, phase, el("span", "rh-meta", `${state.settings.tempo} bpm`));

  const staffWrap = el("div", "rh-staff-wrap");
  staffWrap.appendChild(renderRhythmStaff(reference));

  const feedback = el("p", "rh-feedback", "");

  root.append(status, staffWrap, feedback);

  // Zone de frappe : un grand bouton, le piano à l'écran, ou le clavier physique.
  let input;
  if (state.settings.inputMode === "piano") {
    input = renderPiano();
    // Les échantillons de piano se téléchargent maintenant, pas à la première
    // frappe : le geste doit sonner tout de suite.
    state.audio.ensureReady().catch(() => {});
  } else if (state.settings.inputMode === "midi") {
    // Au clavier physique, il n'y a rien à viser à l'écran : la zone n'est plus
    // qu'un repère de phase, et la barre d'espace reste un secours.
    input = el("div", "rh-tap rh-tap--midi", "Joue sur ton clavier");
    startMidiCapture();
  } else {
    input = el("button", "rh-tap", "Tape ici");
    input.type = "button";
    input.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      registerTap();
    }, { signal: listeners.signal });
  }
  root.appendChild(input);

  const actions = el("div", "rh-actions");
  const quit = el("button", "btn rh-secondary", "Réglages");
  quit.type = "button";
  onClick(quit, leaveSession);
  actions.appendChild(quit);
  root.appendChild(actions);

  container.replaceChildren(root);
  state.ui = { phase, feedback, staffWrap, input, progress };

  runReproduction();
}

// Une octave de touches : la hauteur n'est pas prise en compte, mais le geste
// sur un clavier est celui qu'on veut travailler (plan/05 § 7).
function renderPiano() {
  const piano = el("div", "rh-piano");
  const whites = el("div", "rh-whites");
  const blacks = el("div", "rh-blacks");

  const whiteMidis = [];
  for (let midi = PIANO_LOW; midi <= PIANO_HIGH; midi++) {
    if (isWhite(midi)) whiteMidis.push(midi);
  }
  const whiteWidth = 100 / whiteMidis.length;
  const blackWidth = whiteWidth * 0.62;

  for (const midi of whiteMidis) {
    whites.appendChild(makeKey(midi, "rh-key rh-key--white"));
  }
  for (let midi = PIANO_LOW; midi <= PIANO_HIGH; midi++) {
    if (isWhite(midi)) continue;
    const leftIndex = whiteMidis.indexOf(midi - 1);
    if (leftIndex < 0) continue;
    const key = makeKey(midi, "rh-key rh-key--black");
    key.style.left = `${(leftIndex + 1) * whiteWidth - blackWidth / 2}%`;
    key.style.width = `${blackWidth}%`;
    blacks.appendChild(key);
  }

  piano.append(whites, blacks);
  piano.addEventListener(
    "pointerdown",
    (event) => {
      const key = event.target.closest?.(".rh-key");
      if (!key) return;
      event.preventDefault();
      registerTap(Number(key.dataset.midi));
    },
    { signal: listeners.signal }
  );
  return piano;
}

function makeKey(midi, className) {
  const key = el("button", className);
  key.type = "button";
  key.dataset.midi = String(midi);
  key.setAttribute("aria-label", `${noteDegreeName(midi)}${octaveOf(midi)}`);
  return key;
}

async function runReproduction() {
  const session = state;
  if (session.startPending) return;
  session.startPending = true;
  try {
    await ensureVoices();
    if (session.stopped) return;

    const { grid, reference, target } = session.attempt;
    disposeParts();

    // Pulsation continue sur les trois mesures.
    schedulePulse(grid, grid.countInBeats + reference.barBeats * 2, null);

    // Mesure 2 : le motif de référence.
    const referencePart = new Tone.Part((time, duration) => {
      session.voice?.triggerAttackRelease("A5", duration, time);
    }, reference.noteEvents.map((event) => [
      event.time,
      Math.min(0.22, Math.max(0.05, event.duration * 0.6)),
    ]));
    referencePart.start(0);
    session.parts.push(referencePart);

    // Changements de phase, annoncés à l'avance sur le Transport.
    const marks = new Tone.Part((time, phase) => {
      Tone.Draw.schedule(() => {
        if (isAlive()) setPhase(phase);
      }, time);
    }, [
      [0, "count-in"],
      [reference.startTime, "listen"],
      [target.startTime - grid.secondsPerBeat * 0.5, "play"],
      [target.endTime + grid.secondsPerBeat * 0.5, "done"],
    ]);
    marks.start(0);
    session.parts.push(marks);

    Tone.Transport.seconds = 0;
    Tone.Transport.start();
    session.running = true;
  } catch (error) {
    console.error("Impossible de démarrer la reproduction.", error);
  } finally {
    session.startPending = false;
  }
}

const PHASE_TEXT = {
  "count-in": "Décompte…",
  listen: "Écoute",
  play: "À toi !",
  done: "…",
};

function setPhase(phase) {
  if (!state.attempt) return;
  state.attempt.phase = phase;
  if (state.ui?.phase) state.ui.phase.textContent = PHASE_TEXT[phase] ?? "";
  if (state.ui?.input) state.ui.input.dataset.active = String(phase === "play");
  if (phase === "done") judgeReproduction();
}

// ----------------------------------------------------------------------------
//  Clavier physique (plan/05 étape E)
//
//  Une note reçue est une frappe : la hauteur ne compte pas plus qu'au piano à
//  l'écran (§ 3). L'horodatage du message MIDI est en revanche précieux ici —
//  c'est un exercice de *timing*, et quelques millisecondes séparent l'arrivée
//  d'un message de son traitement. On corrige donc l'instant au lieu de lire
//  simplement « maintenant ».
// ----------------------------------------------------------------------------
function startMidiCapture() {
  stopMidiCapture();
  if (!midiInput.state().listening) return;
  state.stopMidi = midiInput.onNote((event) => {
    if (event.type !== "noteon") return;
    if (!state || state.stopped) return;
    const lateness = Math.max(0, performance.now() - event.timestamp) / 1000;
    registerTap(null, Math.max(0, Tone.Transport.seconds - lateness));
  });
}

function stopMidiCapture() {
  state?.stopMidi?.();
  if (state) state.stopMidi = null;
}

// Une frappe : on ne retient que son instant sur la même horloge que le motif.
// La hauteur jouée, s'il y en a une, est ignorée (plan/05 § 3).
function registerTap(midi = null, at = null) {
  const attempt = state.attempt;
  if (!attempt || attempt.judged) return;
  if (attempt.phase !== "play") {
    // Frapper hors de la fenêtre n'est pas une faute, mais ne compte pas.
    flashFeedback("Attends « À toi ! »", "");
    return;
  }

  const time = at ?? Tone.Transport.seconds;
  attempt.taps.push(time);

  if (midi !== null) state.audio.playNote(midi, 0.25).catch(() => {});

  // Retour immédiat : l'écart à l'attente la plus proche. Indicatif — le bilan,
  // lui, apparie toutes les frappes d'un coup et fait foi.
  const nearest = attempt.target.onsets.reduce(
    (best, onset) =>
      Math.abs(time - onset) < Math.abs(time - best) ? onset : best,
    attempt.target.onsets[0]
  );
  const deviation = (time - nearest) * 1000;
  const { judgment } = matchTaps([nearest], [time], attempt.grid.secondsPerBeat).hits[0];
  flashFeedback(
    `${JUDGMENT_LABEL[judgment]} (${deviation > 0 ? "+" : ""}${Math.round(deviation)} ms)`,
    judgment
  );
}

function flashFeedback(text, status) {
  if (!state.ui?.feedback) return;
  state.ui.feedback.textContent = text;
  state.ui.feedback.dataset.status = status;
}

function judgeReproduction() {
  const attempt = state.attempt;
  if (!attempt || attempt.judged) return;
  attempt.judged = true;
  stopTransport();

  const { hits, extraTaps } = matchTaps(
    attempt.target.onsets,
    attempt.taps,
    attempt.grid.secondsPerBeat
  );
  const report = timingSummary(hits);
  state.session.results.push(report);
  state.session.hits.push(...hits);

  // Un évènement par frappe attendue : l'`outcome` est le jugement, la mesure
  // brute va dans `given` — les seuils restent à la vue (plan/F3 § 7).
  hits.forEach((hit, index) => {
    state.practice?.record({
      type: "beat",
      target: {
        patternId: attempt.target.patternId,
        beat: attempt.target.noteEvents[index]?.beat ?? index,
        difficulty: state.settings.difficulty,
        inputMode: state.settings.inputMode,
      },
      outcome: hit.judgment,
      ...(hit.deviationMs === null
        ? {}
        : { given: { deviationMs: Math.round(hit.deviationMs) } }),
    });
  });

  // Retour par frappe sur la portée elle-même : chaque note prend la couleur de
  // son jugement.
  const states = {};
  attempt.reference.events.forEach((event, index) => {
    if (event.type !== "note") return;
    const rank = attempt.reference.noteEvents.indexOf(event);
    states[index] = hits[rank]?.judgment ?? "missed";
  });
  state.ui.staffWrap.replaceChildren(
    renderRhythmStaff(attempt.reference, { states })
  );

  const extra = extraTaps.length
    ? ` · ${extraTaps.length} frappe${extraTaps.length > 1 ? "s" : ""} en trop`
    : "";
  flashFeedback(
    `${report.onTime} / ${report.total} à l'heure${extra}`,
    report.onTime === report.total ? "on-time" : ""
  );

  later(nextQuestion, 1600);
}

// ----------------------------------------------------------------------------
//  Bilan
// ----------------------------------------------------------------------------
function renderSummary() {
  stopTransport();
  closePractice("done");

  const root = el("div", "rh rh--summary");
  const isRecognition = state.session.family === "recognition";
  root.append(
    el("h1", "rh-heading", "Séance terminée"),
    el(
      "p",
      "rh-lede",
      `${isRecognition ? "Reconnaissance" : "Reproduction"} — ${
        difficultyById(state.settings.difficulty).label
      }, ${state.settings.tempo} bpm`
    )
  );

  const stats = el("ul", "rh-stats");
  if (isRecognition) {
    const correct = state.session.results.filter(Boolean).length;
    const total = state.session.results.length;
    stats.append(
      statItem(`${correct} / ${total}`, "figures reconnues"),
      statItem(`${Math.round((correct / total) * 100)} %`, "de bonnes réponses")
    );
    root.appendChild(stats);
  } else {
    const report = timingSummary(state.session.hits);
    stats.append(
      statItem(`${report.onTime} / ${report.total}`, "frappes à l'heure"),
      statItem(
        report.accuracy === null ? "—" : `${Math.round(report.accuracy * 100)} %`,
        "à l'heure"
      ),
      statItem(String(report.bestStreak), "meilleure série")
    );
    root.appendChild(stats);
    root.appendChild(el("p", "rh-tendency", TENDENCY_TEXT[report.tendency]));

    // Détail par jugement, sans rien inventer sur ce qui n'a pas été frappé.
    const counts = el("ul", "rh-counts");
    for (const judgment of ["on-time", "early", "late", "missed"]) {
      const count = report.counts[judgment];
      if (count === 0) continue;
      const item = el("li", "rh-count");
      item.dataset.status = judgment;
      item.append(
        el("span", "rh-count-label", JUDGMENT_LABEL[judgment]),
        el("span", "rh-count-value", String(count))
      );
      counts.appendChild(item);
    }
    root.appendChild(counts);
  }

  if (!state.progress.persistent) {
    root.appendChild(
      el("p", "rh-note", "Séance non enregistrée : le stockage de ce navigateur est indisponible.")
    );
  }

  const actions = el("div", "rh-actions");
  const again = el("button", "btn rh-primary", "Recommencer");
  again.type = "button";
  onClick(again, beginSession);
  const settings = el("button", "btn rh-secondary", "Changer de réglages");
  settings.type = "button";
  onClick(settings, renderSetup);
  actions.append(again, settings);
  root.appendChild(actions);

  container.replaceChildren(root);
  state.ui = null;
  state.attempt = null;
}

function statItem(value, label) {
  const item = el("li", "rh-stat");
  item.append(el("span", "rh-stat-value", value), el("span", "rh-stat-label", label));
  return item;
}

function leaveSession() {
  stopTransport();
  stopMidiCapture();
  closePractice("abandoned");
  state.session = null;
  state.attempt = null;
  renderSetup();
}

// ----------------------------------------------------------------------------
//  Cycle de vie
// ----------------------------------------------------------------------------
function start(host) {
  container = host;
  state = createModeState();
  listeners = new AbortController();

  restoreSettings();

  // Taper à la barre d'espace : plus précis qu'un clic pour beaucoup de monde,
  // et disponible sans viser une cible.
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.repeat) return;
      if (event.code !== "Space" && event.code !== "Enter") return;
      if (!state?.attempt || state.session?.family !== "reproduction") return;
      event.preventDefault();
      registerTap();
    },
    { signal: listeners.signal }
  );

  window.addEventListener("pagehide", flushProgress, { signal: listeners.signal });
  document.addEventListener("visibilitychange", onVisibilityChange, {
    signal: listeners.signal,
  });

  renderSetup();
}

function restoreSettings() {
  const last = lastSessionContext(state.progress.log(), rhythmFeature.id);
  if (!last) return;
  if (FAMILIES.some((family) => family.id === last.family)) {
    state.settings.family = last.family;
  }
  if (difficultyById(last.difficulty)) state.settings.difficulty = last.difficulty;
  state.settings.tempo = clampTempo(last.tempo ?? state.settings.tempo);
  if (Number.isFinite(last.patternCount)) {
    state.settings.patternCount = Math.min(
      MAX_PATTERNS,
      Math.max(MIN_PATTERNS, last.patternCount)
    );
  }
  if (METRONOME_MINUTES.includes(last.minutes)) state.settings.minutes = last.minutes;
  if (INPUT_MODES.some((mode) => mode.id === last.inputMode)) {
    // Le clavier physique n'est repris que s'il écoute encore : reprendre une
    // entrée débranchée ouvrirait une séance où rien ne serait reçu.
    if (last.inputMode !== "midi" || midiInput.state().listening) {
      state.settings.inputMode = last.inputMode;
    }
  }
}

function flushProgress() {
  state?.progress.flush();
}

function onVisibilityChange() {
  if (document.visibilityState === "hidden") flushProgress();
}

function stop() {
  if (!state) return;

  // 1. Marquer le mode mort avant d'annuler ses rappels.
  state.stopped = true;
  for (const timer of state.timers) clearTimeout(timer);
  state.timers.clear();

  // 2. Arrêter le transport et libérer les voix.
  stopTransport();
  state.click?.dispose();
  state.voice?.dispose();
  state.click = null;
  state.voice = null;
  state.audio.dispose();

  // 3. Clore la séance : quitter en route est un abandon.
  closePractice("abandoned");
  state.progress.flush();

  // 4. Se désabonner du clavier MIDI, qui lui reste connecté : il est partagé et
  //    survit au changement de mode (plan/F2 § 9).
  stopMidiCapture();

  // 5. Écouteurs, puis scène.
  listeners.abort();
  listeners = null;
  container?.replaceChildren();
  container = null;
  state = null;
}
