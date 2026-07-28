// ============================================================================
//  Mode Exercices de pédale — Feature 09
//
//  Apprendre quand lever et réenfoncer la pédale de sustain : l'enfoncer avec
//  l'accord (Pédale directe), puis le geste central — la pédale syncopée :
//  lever AU nouvel accord, réenfoncer juste après (plan/09-pedale.md § 6).
//
//  L'application joue un vrai petit morceau (basse, accord, mélodie), choisi
//  par le niveau de difficulté (plan/09 § 8) ; l'utilisateur ne travaille que
//  la pédale. Deux repères visuels le lui disent **à l'avance**, parce qu'un
//  accord qui sonne ne dit pas quand lever (plan/09 § 9) :
//
//    - la **ligne de pédale** sous les accords — enfoncée / levée, avec une
//      encoche à chaque changement attendu : la notation « Ped. ‾‾‾V‾‾‾ » ;
//    - la **consigne du moment**, en gros : « Prépare-toi », « LÈVE »,
//      « RÉENFONCE », « Tiens ». Elle arrive un temps avant le geste.
//
//  Trois entrées, par ordre de fidélité : pédale physique (CC 64 via F2),
//  barre d'espace, bouton à l'écran — et l'entrée utilisée est annoncée, car
//  une barre d'espace REMPLACE la pédale, elle ne travaille pas le pied
//  (plan/09 § 4).
//
//  Les verdicts (« propre / brouillé / trou / oubliée ») vivent dans
//  `pedal/timing.js`, la grille de pulsation dans `metronome.js` — rien n'est
//  redéfini ici. Ce qui bouge à l'écran est planifié sur le Transport et rendu
//  par `Tone.Draw` : aucun requestAnimationFrame (cf. CLAUDE.md).
//
//  Cycle de vie : `start(container)` construit l'écran ; `stop()` relâche les
//  notes tenues, arrête et nettoie le Transport, libère l'audio, se désabonne
//  du CC 64 et retire les écouteurs. Rien ne doit survivre à `stop()`.
// ============================================================================

import * as Tone from "https://cdn.jsdelivr.net/npm/tone@14.8.49/+esm";
import { createAudio, midiToNote } from "./audio.js";
import { createBeatGrid, scheduleClicks } from "./metronome.js";
import { judge } from "./rhythm/timing.js";
import {
  matchPedalChanges,
  pedalSummary,
  REPRESS_MAX_FRACTION,
  VERDICT_LABEL,
  VERDICT_OUTCOME,
} from "./pedal/timing.js";
import { midiInput } from "./midi-input.js";
import { createProgressStore } from "./progress/store.js";
import { lastSessionContext } from "./progress/review.js";

const FAMILIES = [
  {
    id: "direct",
    label: "Pédale directe",
    description: "Enfoncer la pédale en même temps que l'accord, la lever avec lui.",
  },
  {
    id: "syncopated",
    label: "Pédale syncopée",
    description: "Lever au nouvel accord, réenfoncer juste après : lier sans mélanger.",
  },
];

// ----------------------------------------------------------------------------
//  Les morceaux d'exercice, un par niveau (plan/09 § 8)
//
//  Ce ne sont pas quatre accords posés côte à côte mais de vraies petites
//  pièces en Do : une basse, un accord, une mélodie au-dessus. Convention —
//  **la dernière hauteur de `midis` est la mélodie**, attaquée un peu plus
//  fort : sans cela l'enchaînement sonne comme un bloc, et on n'entend pas ce
//  que la pédale lie.
//
//  La difficulté, c'est l'écart entre deux changements : une mesure entière au
//  début, une demi-mesure à la fin — « changements plus rapprochés, à
//  l'intérieur de la mesure » (plan/09 § 8).
// ----------------------------------------------------------------------------
const LEVELS = [
  {
    id: "beginner",
    label: "Débutant",
    description: "Quatre accords tenus, un changement par mesure, très lent.",
    tempo: 50,
    beatsPerChord: 4,
    piece: "Cadence en Do",
    chords: [
      { name: "Do", midis: [48, 55, 60, 64, 72] },
      { name: "Fa", midis: [41, 53, 57, 60, 69] },
      { name: "Sol", midis: [43, 50, 55, 59, 67] },
      { name: "Do", midis: [48, 55, 60, 64, 72] },
    ],
  },
  {
    id: "intermediate",
    label: "Intermédiaire",
    description: "Six accords enchaînés, un changement par mesure.",
    tempo: 60,
    beatsPerChord: 4,
    piece: "Ronde en Do",
    chords: [
      { name: "Do", midis: [48, 55, 60, 64, 72] },
      { name: "Sol", midis: [43, 50, 55, 59, 74] },
      { name: "Lam", midis: [45, 52, 57, 60, 76] },
      { name: "Fa", midis: [41, 53, 57, 60, 72] },
      { name: "Sol", midis: [43, 50, 55, 59, 71] },
      { name: "Do", midis: [48, 55, 60, 64, 72] },
    ],
  },
  {
    id: "advanced",
    label: "Difficile",
    description: "Huit accords, un changement toutes les demi-mesures.",
    tempo: 72,
    beatsPerChord: 2,
    piece: "Descente en Do",
    chords: [
      { name: "Do", midis: [48, 55, 60, 64, 76] },
      { name: "Lam", midis: [45, 52, 57, 60, 72] },
      { name: "Rém", midis: [38, 53, 57, 62, 74] },
      { name: "Sol", midis: [43, 50, 55, 59, 71] },
      { name: "Do", midis: [48, 55, 60, 64, 72] },
      { name: "Fa", midis: [41, 53, 57, 60, 69] },
      { name: "Sol", midis: [43, 50, 55, 59, 67] },
      { name: "Do", midis: [48, 55, 60, 64, 72] },
    ],
  },
];

// Tempo : lent par nature — le geste s'apprend accord par accord. Chaque
// niveau propose le sien, le pas de 5 bpm reste là pour ajuster.
const MIN_TEMPO = 40;
const MAX_TEMPO = 90;
const BEATS_PER_BAR = 4;

// Les doigts « lâchent » l'accord peu après l'attaque : ce qui sonne encore ne
// tient plus que par la pédale — c'est ce qui rend le geste audible.
const FINGER_RELEASE_S = 0.4;

const JUDGMENT_LABEL = {
  "on-time": "À l'heure",
  early: "En avance",
  late: "En retard",
  missed: "Manquée",
};

// Consigne au repos, avant le décompte.
const IDLE_CUE = { state: "idle", word: "Prêt ?", sub: "La consigne s'affichera ici, un temps avant chaque geste." };

// ----------------------------------------------------------------------------
//  Fiche de la fonctionnalité (registre de la navigation)
// ----------------------------------------------------------------------------
export const pedalFeature = {
  id: "pedal",
  title: "Pédale",
  description: "Changer la pédale au bon moment : directe, puis syncopée.",
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
    settings: { family: "direct", level: "beginner", tempo: LEVELS[0].tempo },
    progress: createProgressStore(),
    practice: null,      // séance ouverte dans le journal
    click: null,         // synthé du métronome
    parts: [],           // Tone.Part / ids de Transport à libérer
    running: false,
    startPending: false,
    attempt: null,       // exécution en cours : accords, gestes, verdicts
    pedalDown: false,    // état courant, toutes entrées confondues
    sustained: new Set(),// hauteurs qui ne tiennent plus que par la pédale
    stopMidiPedal: null, // désabonnement du CC 64 (F2)
    ui: null,
  };
}

function isAlive() {
  return state !== null && !state.stopped;
}

function currentLevel() {
  return LEVELS.find((level) => level.id === state.settings.level) ?? LEVELS[0];
}

function currentFamily() {
  return FAMILIES.find((family) => family.id === state.settings.family) ?? FAMILIES[0];
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

// Une rangée de boutons de choix : même forme pour l'exercice et le niveau.
function choiceGroup(legend, options, selectedId, onSelect) {
  const group = el("fieldset", "pd-choice");
  group.appendChild(el("legend", "pd-choice-legend", legend));
  const row = el("div", "pd-choice-row");
  for (const option of options) {
    const button = el("button", "pd-choice-btn");
    button.type = "button";
    button.append(
      el("span", "pd-choice-label", option.label),
      el("span", "pd-choice-desc", option.description)
    );
    const selected = option.id === selectedId;
    button.setAttribute("aria-pressed", String(selected));
    if (selected) button.classList.add("is-selected");
    onClick(button, () => onSelect(option));
    row.appendChild(button);
  }
  group.appendChild(row);
  return group;
}

// ----------------------------------------------------------------------------
//  Écran de réglages
// ----------------------------------------------------------------------------
function renderSetup() {
  leaveRun();

  const level = currentLevel();
  const root = el("div", "pd pd--setup");
  root.append(
    el("h1", "pd-heading", "Exercices de pédale"),
    el(
      "p",
      "pd-lede",
      "L'application joue le morceau, toi la pédale. Lever et réenfoncer au bon moment, c'est tout l'exercice."
    )
  );

  root.appendChild(
    choiceGroup("Exercice", FAMILIES, state.settings.family, (option) => {
      state.settings.family = option.id;
      renderSetup();
    })
  );

  // Changer de niveau reprend son tempo : « Difficile » à 40 bpm n'aurait pas
  // de sens, et le pas de 5 bpm reste disponible juste en dessous.
  root.appendChild(
    choiceGroup("Niveau", LEVELS, state.settings.level, (option) => {
      state.settings.level = option.id;
      state.settings.tempo = clampTempo(option.tempo);
      renderSetup();
    })
  );

  const tempoGroup = el("fieldset", "pd-choice");
  tempoGroup.appendChild(el("legend", "pd-choice-legend", "Tempo"));
  const stepper = el("div", "pd-stepper");
  const minus = el("button", "btn pd-step-btn", "−");
  minus.type = "button";
  const value = el("span", "pd-step-value", `${state.settings.tempo} bpm`);
  const plus = el("button", "btn pd-step-btn", "+");
  plus.type = "button";
  onClick(minus, () => {
    state.settings.tempo = clampTempo(state.settings.tempo - 5);
    renderSetup();
  });
  onClick(plus, () => {
    state.settings.tempo = clampTempo(state.settings.tempo + 5);
    renderSetup();
  });
  stepper.append(minus, value, plus);
  tempoGroup.appendChild(stepper);
  root.appendChild(tempoGroup);

  root.appendChild(
    el("p", "pd-note", `Morceau joué : ${level.piece} — ${level.chords.map((c) => c.name).join(" · ")}.`)
  );

  // L'entrée utilisée, annoncée clairement (plan/09 § 9).
  root.appendChild(el("p", "pd-note", inputNotice()));

  const startBtn = el("button", "btn pd-primary", "Commencer");
  startBtn.type = "button";
  onClick(startBtn, renderExercise);
  root.appendChild(startBtn);

  container.replaceChildren(root);
  state.ui = null;
}

function clampTempo(bpm) {
  return Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, Math.round(bpm)));
}

function inputNotice() {
  if (midiInput.state().listening) {
    return "Pédale physique détectable (CC 64) : branche-la à ton clavier MIDI. La barre d'espace et le bouton à l'écran restent disponibles.";
  }
  return "Sans pédale physique : la barre d'espace ou le bouton à l'écran la remplacent — le timing est travaillé, pas le geste du pied.";
}

// ----------------------------------------------------------------------------
//  Écran d'exercice
// ----------------------------------------------------------------------------
function renderExercise() {
  leaveRun();

  const family = currentFamily();
  const level = currentLevel();
  const root = el("div", "pd pd--exercise");

  const status = el("div", "pd-status");
  const phase = el("span", "pd-phase", "Prêt ?");
  phase.setAttribute("role", "status");
  status.append(
    el("span", "pd-family", family.label),
    el("span", "pd-meta", level.piece),
    phase,
    el("span", "pd-meta", `${state.settings.tempo} bpm`)
  );

  const instruction = el(
    "p",
    "pd-instruction",
    state.settings.family === "direct"
      ? "Enfonce la pédale en même temps que chaque accord, lève-la avec lui."
      : "Enfonce la pédale sur le premier accord. À chaque accord suivant : lève, puis réenfonce juste après."
  );

  // La ligne de pédale : le morceau à plat, un segment par accord, avec la
  // barre « pédale enfoncée » dessous et l'encoche du changement attendu.
  const { timeline, segments } = renderTimeline(level, state.settings.family);
  const legend = el(
    "p",
    "pd-legend",
    state.settings.family === "direct"
      ? "Ligne de pédale : la barre dit quand elle est enfoncée, ↓ marque l'enfoncement."
      : "Ligne de pédale : la barre dit quand elle est enfoncée, ↑↓ marque le lever-réenfoncer."
  );

  // La consigne du moment, en gros — le repère qui manquait le plus.
  const cue = el("div", "pd-cue");
  cue.setAttribute("role", "status");
  cue.setAttribute("aria-live", "assertive");
  const cueWord = el("strong", "pd-cue-word");
  const cueSub = el("span", "pd-cue-sub");
  cue.append(cueWord, cueSub);

  // Témoin d'état de la pédale, visible en permanence (plan/09 § 9).
  const indicator = el("div", "pd-indicator");
  const dot = el("span", "pd-indicator-dot");
  const indicatorText = el("span", "pd-indicator-text", "Pédale levée");
  indicator.append(dot, indicatorText);

  const feedback = el("p", "pd-feedback");
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");

  // La pédale de substitution à l'écran : on l'enfonce au doigt ou à la souris,
  // elle se relâche quand on la lâche — comme la vraie.
  const pedalBtn = el("button", "pd-pedal", "Pédale");
  pedalBtn.type = "button";
  pedalBtn.setAttribute("aria-pressed", "false");
  pedalBtn.addEventListener(
    "pointerdown",
    (event) => {
      event.preventDefault();
      pedalBtn.setPointerCapture?.(event.pointerId);
      pedalInput(true);
    },
    { signal: listeners.signal }
  );
  for (const type of ["pointerup", "pointercancel"]) {
    pedalBtn.addEventListener(
      type,
      (event) => {
        event.preventDefault();
        pedalInput(false);
      },
      { signal: listeners.signal }
    );
  }

  const hint = el("p", "pd-note", "Barre d'espace = pédale. " + inputNotice());

  const actions = el("div", "pd-actions");
  const startBtn = el("button", "btn pd-primary", "Démarrer");
  startBtn.type = "button";
  onClick(startBtn, runExercise);
  const back = el("button", "btn pd-secondary", "Quitter");
  back.type = "button";
  onClick(back, renderSetup);
  actions.append(startBtn, back);

  root.append(status, instruction, timeline, legend, cue, indicator, feedback, pedalBtn, hint, actions);
  container.replaceChildren(root);

  state.ui = { phase, segments, cue, cueWord, cueSub, dot, indicatorText, feedback, pedalBtn, startBtn };
  setCue(IDLE_CUE);
  attachPedalInputs();
}

// ----------------------------------------------------------------------------
//  Ligne de pédale — la notation « Ped. ‾‾‾V‾‾‾ », à plat
//
//  Un segment par accord, large en proportion de sa durée. La barre du bas dit
//  quand la pédale doit être enfoncée : continue avec une encoche au
//  changement en syncopé, coupée avant l'accord suivant en direct. C'est la
//  « ligne enfoncée / levée » de plan/09 § 9, laissée de côté au MVP.
// ----------------------------------------------------------------------------
function renderTimeline(level, family) {
  const timeline = el("div", "pd-timeline");
  timeline.dataset.family = family;
  timeline.setAttribute("aria-hidden", "true"); // lu par la consigne, pas ici

  const segments = level.chords.map((chord, index) => {
    const seg = el("div", "pd-seg");
    seg.style.flexGrow = String(level.beatsPerChord);
    const lane = el("span", "pd-seg-lane");
    lane.appendChild(el("span", "pd-seg-bar"));
    seg.append(
      el("span", "pd-seg-name", chord.name),
      el("span", "pd-seg-mark", family === "syncopated" && index > 0 ? "↑↓" : "↓"),
      lane
    );
    timeline.appendChild(seg);
    return seg;
  });

  return { timeline, segments };
}

function setCue({ state: cueState, word, sub }) {
  const ui = state?.ui;
  if (!ui) return;
  ui.cue.dataset.state = cueState;
  ui.cueWord.textContent = word;
  ui.cueSub.textContent = sub;
}

// ----------------------------------------------------------------------------
//  Les consignes d'une exécution, calculées d'avance
//
//  Chaque consigne arrive à son instant : « Prépare-toi » un temps avant le
//  geste, puis le geste lui-même. Les instants sont choisis pour ne jamais se
//  chevaucher, même au niveau Difficile où un accord ne dure que deux temps.
// ----------------------------------------------------------------------------
function buildCues(family, chordTimes, chordDuration, spb) {
  const cues = [];
  const last = chordTimes.length - 1;

  chordTimes.forEach((time, index) => {
    if (family === "direct") {
      if (index === 0) {
        cues.push({ time: Math.max(0, time - spb), state: "ready", word: "Prépare-toi", sub: "enfonce sur le premier accord" });
      }
      cues.push({ time, state: "press", word: "ENFONCE", sub: "en même temps que l'accord" });
      const holdAt = time + Math.min(0.8 * spb, chordDuration - 0.6 * spb);
      if (holdAt > time) cues.push({ time: holdAt, state: "hold", word: "Tiens", sub: "la pédale fait sonner l'accord" });
      cues.push({
        time: time + chordDuration - 0.5 * spb,
        state: "lift",
        word: "LÈVE",
        sub: index === last ? "l'accord s'éteint avec la pédale" : "l'accord s'arrête, le suivant arrive",
      });
      return;
    }

    // Syncopé : le premier accord se prend simplement, les suivants demandent
    // le geste central — lever AU nouvel accord, réenfoncer juste après.
    if (index === 0) {
      cues.push({ time: Math.max(0, time - spb), state: "ready", word: "Prépare-toi", sub: "enfonce sur le premier accord" });
      cues.push({ time, state: "press", word: "ENFONCE", sub: "sur le premier accord" });
    } else {
      cues.push({ time: time - spb, state: "ready", word: "Prépare-toi", sub: "lève sur le prochain accord" });
      cues.push({ time, state: "lift", word: "LÈVE", sub: "en même temps que l'accord" });
      cues.push({ time: time + 0.25 * spb, state: "press", word: "RÉENFONCE", sub: "juste après, sans attendre" });
    }

    // « Tiens » n'a de sens que s'il reste du temps entre le réenfoncement et
    // la préparation du changement suivant : au niveau Difficile (deux temps
    // par accord) il clignoterait, on le laisse tomber.
    const nextCueAt = time + chordDuration - (index === last ? 0.5 : 1) * spb;
    const holdAt = time + Math.min(1.1 * spb, chordDuration - 1.05 * spb);
    if (holdAt > time + 0.3 * spb && nextCueAt - holdAt >= 0.35 * spb) {
      cues.push({ time: holdAt, state: "hold", word: "Tiens", sub: "l'accord se prolonge, sans traîner le précédent" });
    }

    if (index === last) {
      cues.push({ time: time + chordDuration - 0.5 * spb, state: "lift", word: "LÈVE", sub: "le morceau s'éteint" });
    }
  });

  return cues.sort((a, b) => a.time - b.time);
}

// ----------------------------------------------------------------------------
//  Entrées pédale : physique (CC 64), barre d'espace, bouton à l'écran.
//  Toutes convergent ici, avec un instant sur l'horloge du Transport.
// ----------------------------------------------------------------------------
function attachPedalInputs() {
  // La barre d'espace ne doit rien déclencher d'autre pendant l'exercice
  // (plan/09 § 14) : elle est capturée au niveau de la fenêtre.
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.code !== "Space" || event.repeat) return;
      event.preventDefault();
      pedalInput(true);
    },
    { signal: listeners.signal }
  );
  window.addEventListener(
    "keyup",
    (event) => {
      if (event.code !== "Space") return;
      event.preventDefault();
      pedalInput(false);
    },
    { signal: listeners.signal }
  );

  // Pédale physique : l'horodatage du message corrige l'instant, comme pour
  // les notes de la Reproduction rythmique (CLAUDE.md, Entrée MIDI).
  state.stopMidiPedal?.();
  state.stopMidiPedal = midiInput.onPedal((event) => {
    if (!isAlive()) return;
    const lateness = Math.max(0, performance.now() - event.timestamp) / 1000;
    pedalInput(event.down, Math.max(0, Tone.Transport.seconds - lateness));
  });
}

function pedalInput(down, at = null) {
  if (!isAlive() || !state.ui) return;
  if (down === state.pedalDown) return; // rebonds et répétitions ignorés
  state.pedalDown = down;

  // Témoin immédiat, quelle que soit la phase.
  state.ui.dot.classList.toggle("is-down", down);
  state.ui.indicatorText.textContent = down ? "Pédale enfoncée" : "Pédale levée";
  state.ui.pedalBtn.setAttribute("aria-pressed", String(down));

  // Effet sonore réel : lever la pédale étouffe ce qui ne tenait que par elle.
  if (!down && state.sustained.size > 0) {
    const notes = [...state.sustained].map(midiToNote);
    state.sustained.clear();
    state.audio.sampler?.triggerRelease(notes, Tone.now());
  }

  // Pendant une exécution, le geste est enregistré pour les verdicts.
  const attempt = state.attempt;
  if (attempt && state.running) {
    attempt.pedalEvents.push({ down, time: at ?? Tone.Transport.seconds });
  }
}

// ----------------------------------------------------------------------------
//  Exécution : décompte, morceau joué par l'application, verdicts en direct
// ----------------------------------------------------------------------------
async function runExercise() {
  const session = state;
  if (session.startPending || session.running) return;
  session.startPending = true;

  try {
    await session.audio.ensureReady();
    await Tone.start();
    if (session.stopped) return;

    if (!session.click) {
      session.click = new Tone.Synth({
        oscillator: { type: "square" },
        envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.02 },
      }).toDestination();
      session.click.volume.value = -20;
    }

    disposeParts();
    closePractice("abandoned"); // filet : jamais deux séances ouvertes

    const family = session.settings.family;
    const level = currentLevel();
    const chords = level.chords;
    const grid = createBeatGrid({ bpm: session.settings.tempo, beatsPerBar: BEATS_PER_BAR });
    const chordDuration = level.beatsPerChord * grid.secondsPerBeat;
    const chordTimes = chords.map((chord, index) => grid.startTime + index * chordDuration);
    const endTime = chordTimes[chordTimes.length - 1] + chordDuration;

    session.attempt = {
      grid,
      level,
      chords,
      chordTimes,
      pedalEvents: [],
      results: [], // un verdict par changement attendu
      expected: family === "direct" ? chordTimes.length : chordTimes.length - 1,
    };
    session.sustained.clear();

    session.practice = session.progress.openSession(pedalFeature.id, {
      family,
      level: level.id,
      piece: level.piece,
      tempo: grid.bpm,
      chords: chords.map((chord) => chord.name).join("–"),
    });

    // Pulsation : un clic par temps, décompte compris. C'est aussi elle qui
    // annonce l'accord en cours et le nombre de temps avant le changement —
    // une écriture de texte par temps, rien de plus.
    const totalBeats = grid.countInBeats + chords.length * level.beatsPerChord;
    const clicks = [];
    scheduleClicks(grid, totalBeats, { schedule: (info) => clicks.push(info) });
    // Un clic ne sonne qu'une fois, et seulement s'il est encore à venir : sur
    // une machine qui bloque, le Transport rejoue parfois la même pulsation, et
    // les clics en retard sont tous ramenés à l'instant courant. Dans les deux
    // cas le synthé — monophonique — est réattaqué au même instant et lève une
    // erreur. Une pulsation, de toute façon, c'est maintenant ou jamais.
    //
    // L'écart minimal est celui du clic lui-même (30 ms plus sa retombée), pas
    // zéro : une pulsation rejouée revient à quelques femtosecondes près, ce qui
    // suffirait à passer une comparaison stricte.
    const CLICK_MIN_GAP_S = 0.05;
    let lastClickTime = -Infinity;
    const pulse = new Tone.Part((time, info) => {
      if (time > lastClickTime + CLICK_MIN_GAP_S && time > Tone.context.currentTime) {
        lastClickTime = time;
        session.click?.triggerAttackRelease(
          info.accent ? "C6" : "G5",
          0.03,
          time,
          info.accent ? 0.5 : 0.3
        );
      }
      Tone.Draw.schedule(() => {
        if (!isAlive() || !session.ui) return;
        session.ui.phase.textContent = info.countIn
          ? `Décompte… ${grid.countLabel(info.beat)}`
          : phaseLabel(info.beat - grid.countInBeats, level, chords.length);
      }, time);
    }, clicks.map((info) => [info.time, info]));
    pulse.start(0);
    session.parts.push(pulse);

    // Le morceau, joué par l'application. La mélodie — dernière hauteur de
    // l'accord — sort un peu au-dessus du reste. Les doigts lâchent peu après
    // l'attaque : ce qui sonne encore ne tient que par la pédale.
    const chordPart = new Tone.Part((time, index) => {
      const midis = chords[index].midis;
      const accompaniment = midis.slice(0, -1).map(midiToNote);
      session.audio.sampler?.triggerAttack(accompaniment, time, 0.55);
      session.audio.sampler?.triggerAttack(midiToNote(midis[midis.length - 1]), time, 0.9);

      Tone.Draw.schedule(() => {
        if (!isAlive() || !session.ui) return;
        session.ui.segments.forEach((seg, i) => {
          seg.dataset.state = i === index ? "current" : i < index ? "done" : "";
        });
      }, time);
    }, chordTimes.map((time, index) => [time, index]));
    chordPart.start(0);
    session.parts.push(chordPart);

    // Relâchement des « doigts », planifié sur le Transport lui aussi.
    const fingerPart = new Tone.Part((time, index) => {
      const midis = chords[index].midis;
      if (state?.pedalDown) {
        for (const midi of midis) session.sustained.add(midi);
      } else {
        session.audio.sampler?.triggerRelease(midis.map(midiToNote), time);
      }
    }, chordTimes.map((time, index) => [time + FINGER_RELEASE_S, index]));
    fingerPart.start(0);
    session.parts.push(fingerPart);

    // Les consignes : ce qu'il faut faire, un temps avant de le faire.
    const cues = buildCues(family, chordTimes, chordDuration, grid.secondsPerBeat);
    const cuePart = new Tone.Part((time, cue) => {
      Tone.Draw.schedule(() => {
        if (isAlive()) setCue(cue);
      }, time);
    }, cues.map((cue) => [cue.time, cue]));
    cuePart.start(0);
    session.parts.push(cuePart);

    // Verdict de chaque changement, rendu juste après sa fenêtre : le retour
    // est immédiat sans jamais juger un geste encore possible.
    const judged = family === "direct" ? chordTimes : chordTimes.slice(1);
    const verdictDelay = Math.min(
      REPRESS_MAX_FRACTION * grid.secondsPerBeat * 1.6,
      chordDuration - 0.1
    );
    const verdictPart = new Tone.Part((time, chordTime) => {
      Tone.Draw.schedule(() => {
        if (isAlive()) judgeChange(chordTime);
      }, time);
    }, judged.map((chordTime) => [chordTime + verdictDelay, chordTime]));
    verdictPart.start(0);
    session.parts.push(verdictPart);

    // Fin d'exécution → bilan.
    const endPart = new Tone.Part((time) => {
      Tone.Draw.schedule(() => {
        if (isAlive()) finishRun();
      }, time);
    }, [[endTime, "end"]]);
    endPart.start(0);
    session.parts.push(endPart);

    session.ui.startBtn.disabled = true;
    session.ui.feedback.textContent = "";
    session.ui.feedback.dataset.status = "";
    setCue({ state: "count", word: "Décompte…", sub: "la première consigne arrive avec le premier accord" });

    Tone.Transport.seconds = 0;
    Tone.Transport.start();
    session.running = true;
  } catch (error) {
    console.error("Impossible de démarrer l'exercice de pédale.", error);
  } finally {
    session.startPending = false;
  }
}

// « Accord 3 / 6 · changement dans 2 » : savoir où l'on est ET quand vient le
// prochain geste, sans rien animer.
function phaseLabel(pieceBeat, level, chordCount) {
  const index = Math.min(chordCount - 1, Math.floor(pieceBeat / level.beatsPerChord));
  const toNext = level.beatsPerChord - (pieceBeat % level.beatsPerChord);
  const position = `Accord ${index + 1} / ${chordCount}`;
  return index + 1 < chordCount ? `${position} · changement dans ${toNext}` : position;
}

// Un changement à la fois : les fenêtres ne se recouvrent pas, chaque verdict
// peut donc être rendu indépendamment — le bilan réutilise ces mêmes
// résultats, il n'existe pas de second jugement.
function judgeChange(chordTime) {
  const attempt = state.attempt;
  if (!attempt || !state.ui) return;

  const spb = attempt.grid.secondsPerBeat;
  const family = state.settings.family;

  let outcome;
  let label;
  let status;
  let target;

  if (family === "direct") {
    // Pédale directe : l'enfoncement se juge comme une frappe (plan/09 § 5),
    // avec le juge de rhythm/timing — pas un second jugement avance/retard.
    const window = REPRESS_MAX_FRACTION * spb;
    const press = attempt.pedalEvents.find(
      (event) => event.down && Math.abs(event.time - chordTime) <= window
    );
    const result = judge(press ? (press.time - chordTime) * 1000 : null, spb);
    outcome = result.judgment;
    label = JUDGMENT_LABEL[result.judgment];
    status = result.judgment === "on-time" ? "correct" : "wrong";
    target = { chord: chordName(chordTime), gesture: "press" };
    attempt.results.push({ chordTime, verdict: result.judgment });

    state.practice?.record({
      type: "beat",
      target,
      outcome,
      ...(result.deviationMs !== null ? { given: { deviationMs: Math.round(result.deviationMs) } } : {}),
    });
  } else {
    const [change] = matchPedalChanges([chordTime], attempt.pedalEvents, spb);
    outcome = VERDICT_OUTCOME[change.verdict];
    label = VERDICT_LABEL[change.verdict];
    status = change.verdict === "clean" ? "correct" : "wrong";
    attempt.results.push(change);

    state.practice?.record({
      type: "beat",
      target: { chord: chordName(chordTime), gesture: "change" },
      outcome,
      given: {
        ...(change.liftDeviationMs !== null ? { liftDeviationMs: change.liftDeviationMs } : {}),
        ...(change.pressDelayMs !== null ? { pressDelayMs: change.pressDelayMs } : {}),
      },
    });
  }

  state.ui.feedback.textContent = label;
  state.ui.feedback.dataset.status = status;
}

function chordName(chordTime) {
  const attempt = state.attempt;
  const index = attempt?.chordTimes.indexOf(chordTime) ?? -1;
  return index >= 0 ? `${attempt.chords[index].name} (${index + 1})` : "?";
}

// ----------------------------------------------------------------------------
//  Fin d'exécution et bilan
// ----------------------------------------------------------------------------
function finishRun() {
  const session = state;
  const attempt = session.attempt;
  if (!attempt) return;

  const { chords, level } = attempt;
  stopTransport();
  closePractice("done");

  const family = session.settings.family;
  const root = el("div", "pd pd--summary");
  root.appendChild(el("h1", "pd-heading", "Exercice terminé"));
  root.appendChild(
    el(
      "p",
      "pd-lede",
      `${currentFamily().label} · ${level.label} · ${level.piece} · ${session.settings.tempo} bpm`
    )
  );

  const list = el("ul", "pd-results");
  const judgedChords = family === "direct" ? chords : chords.slice(1);
  attempt.results.forEach((result, index) => {
    const chord = judgedChords[index];
    const verdict = result.verdict;
    const item = el("li", "pd-result");
    item.dataset.status = verdict === "clean" || verdict === "on-time" ? "correct" : "wrong";
    item.append(
      el("span", "pd-result-chord", `${chord?.name ?? "?"}`),
      el(
        "span",
        "pd-result-verdict",
        family === "direct" ? JUDGMENT_LABEL[verdict] ?? verdict : VERDICT_LABEL[verdict] ?? verdict
      )
    );
    list.appendChild(item);
  });
  root.appendChild(list);

  if (family === "syncopated") {
    const report = pedalSummary(attempt.results);
    root.appendChild(
      el(
        "p",
        "pd-lede",
        report.clean === report.total
          ? "Tous les changements sont propres : le son est lié sans se mélanger."
          : `${report.clean} / ${report.total} changements propres.`
      )
    );
  }

  if (!session.progress.persistent) {
    root.appendChild(
      el("p", "pd-note", "Résultats non enregistrés : le stockage de ce navigateur est indisponible.")
    );
  }

  const actions = el("div", "pd-actions");
  const again = el("button", "btn pd-primary", "Recommencer");
  again.type = "button";
  onClick(again, renderExercise);
  const back = el("button", "btn pd-secondary", "Quitter");
  back.type = "button";
  onClick(back, renderSetup);
  actions.append(again, back);
  root.appendChild(actions);

  container.replaceChildren(root);
  session.ui = null;
  session.attempt = null;
}

// ----------------------------------------------------------------------------
//  Arrêts propres
// ----------------------------------------------------------------------------
function disposeParts() {
  for (const part of state.parts) part.dispose();
  state.parts = [];
  Tone.Transport.cancel();
  Tone.Draw.cancel();
}

function stopTransport() {
  if (!state) return;
  disposeParts();
  // Deux arrêts au même instant d'horloge — ce qui arrive tant que le contexte
  // audio n'a jamais démarré — font lever une erreur à Tone.
  if (Tone.Transport.state !== "stopped") Tone.Transport.stop();
  state.running = false;
  releaseSounding();
}

// Relâche tout ce qui sonne encore — pédale ou pas : quitter un exercice ne
// laisse jamais un accord tenu derrière soi.
function releaseSounding() {
  if (state.sustained.size > 0) {
    state.audio.sampler?.triggerRelease([...state.sustained].map(midiToNote), Tone.now());
    state.sustained.clear();
  }
  state.audio.sampler?.releaseAll?.();
}

function leaveRun() {
  stopTransport();
  closePractice("abandoned");
  state.attempt = null;
}

function closePractice(outcome) {
  const practice = state?.practice;
  if (!practice || practice.closed) return;
  practice.close(outcome, {
    judgedChanges: state.attempt?.results.length ?? 0,
  });
  state.practice = null;
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
  const last = lastSessionContext(state.progress.log(), pedalFeature.id);
  if (!last) return;
  if (FAMILIES.some((family) => family.id === last.family)) {
    state.settings.family = last.family;
  }
  if (LEVELS.some((level) => level.id === last.level)) {
    state.settings.level = last.level;
    state.settings.tempo = clampTempo(currentLevel().tempo);
  }
  if (Number.isFinite(last.tempo)) {
    state.settings.tempo = clampTempo(last.tempo);
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

  // 1. Marquer la session morte : les rappels encore en vol n'ont plus d'effet.
  state.stopped = true;

  // 2. Arrêter et nettoyer le Transport (partagé par tous les modes), relâcher
  //    les notes tenues par la pédale.
  stopTransport();

  // 3. Se désabonner du CC 64. L'entrée MIDI elle-même reste en place (F2).
  state.stopMidiPedal?.();
  state.stopMidiPedal = null;

  // 4. Clore la séance : quitter en route est un abandon.
  closePractice("abandoned");
  state.progress.flush();

  // 5. Libérer l'audio : le synthé du métronome, puis la chaîne du piano.
  state.click?.dispose();
  state.click = null;
  state.audio.dispose();

  // 6. Retirer les écouteurs (boutons, barre d'espace, pointeurs).
  listeners.abort();
  listeners = null;

  // 7. Rendre la scène.
  container?.replaceChildren();
  container = null;
  state = null;
}
