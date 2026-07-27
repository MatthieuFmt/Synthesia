// ============================================================================
//  Mode Exercices de pédale — Feature 09
//
//  Apprendre quand lever et réenfoncer la pédale de sustain : entendre son
//  effet (Écoute), l'enfoncer avec l'accord (Pédale directe), puis le geste
//  central — la pédale syncopée : lever AU nouvel accord, réenfoncer juste
//  après (plan/09-pedale.md § 6).
//
//  L'application joue les accords ; l'utilisateur ne travaille que la pédale.
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

// L'enchaînement du plan (§ 8) : le Do–Fa–Sol–Do déjà utilisé par les
// Exercices techniques, dans un registre médium où la résonance s'entend bien.
const CHORDS = [
  { name: "Do", midis: [48, 55, 60, 64] },
  { name: "Fa", midis: [53, 57, 60, 65] },
  { name: "Sol", midis: [55, 59, 62, 67] },
  { name: "Do", midis: [48, 55, 60, 64] },
];

const FAMILIES = [
  {
    id: "listening",
    label: "Écoute",
    description: "Entendre ce que change la pédale, avant de la travailler.",
  },
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

// Tempo : lent par nature — le geste s'apprend accord par accord.
const MIN_TEMPO = 40;
const MAX_TEMPO = 90;
const DEFAULT_TEMPO = 60;
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
    settings: { family: "listening", tempo: DEFAULT_TEMPO },
    progress: createProgressStore(),
    practice: null,      // séance ouverte dans le journal (jamais pour l'Écoute)
    click: null,         // synthé du métronome
    parts: [],           // Tone.Part / ids de Transport à libérer
    running: false,
    startPending: false,
    attempt: null,       // exécution en cours : accords, gestes, verdicts
    pedalDown: false,    // état courant, toutes entrées confondues
    sustained: new Set(),// hauteurs qui ne tiennent plus que par la pédale
    currentChord: null,  // hauteurs dont les « doigts » n'ont pas encore lâché
    stopMidiPedal: null, // désabonnement du CC 64 (F2)
    timers: new Set(),
    ui: null,
  };
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

function isAlive() {
  return state !== null && !state.stopped;
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
  leaveRun();

  const root = el("div", "pd pd--setup");
  root.append(
    el("h1", "pd-heading", "Exercices de pédale"),
    el(
      "p",
      "pd-lede",
      "L'application joue les accords, toi la pédale. Lever et réenfoncer au bon moment, c'est tout l'exercice."
    )
  );

  const group = el("fieldset", "pd-choice");
  group.appendChild(el("legend", "pd-choice-legend", "Exercice"));
  const row = el("div", "pd-choice-row");
  for (const family of FAMILIES) {
    const button = el("button", "pd-choice-btn");
    button.type = "button";
    button.append(
      el("span", "pd-choice-label", family.label),
      el("span", "pd-choice-desc", family.description)
    );
    const selected = state.settings.family === family.id;
    button.setAttribute("aria-pressed", String(selected));
    if (selected) button.classList.add("is-selected");
    onClick(button, () => {
      state.settings.family = family.id;
      renderSetup();
    });
    row.appendChild(button);
  }
  group.appendChild(row);
  root.appendChild(group);

  // Le tempo ne concerne que les exercices mesurés.
  if (state.settings.family !== "listening") {
    const tempoGroup = el("fieldset", "pd-choice");
    tempoGroup.appendChild(el("legend", "pd-choice-legend", "Tempo"));
    const stepper = el("div", "pd-stepper");
    const minus = el("button", "btn pd-step-btn", "−");
    minus.type = "button";
    const value = el("span", "pd-step-value", `${state.settings.tempo} bpm`);
    const plus = el("button", "btn pd-step-btn", "+");
    plus.type = "button";
    onClick(minus, () => {
      state.settings.tempo = Math.max(MIN_TEMPO, state.settings.tempo - 5);
      renderSetup();
    });
    onClick(plus, () => {
      state.settings.tempo = Math.min(MAX_TEMPO, state.settings.tempo + 5);
      renderSetup();
    });
    stepper.append(minus, value, plus);
    tempoGroup.appendChild(stepper);
    root.appendChild(tempoGroup);
  }

  // L'entrée utilisée, annoncée clairement (plan/09 § 9).
  root.appendChild(el("p", "pd-note", inputNotice()));

  const startBtn = el(
    "button",
    "btn pd-primary",
    state.settings.family === "listening" ? "Écouter" : "Commencer"
  );
  startBtn.type = "button";
  onClick(startBtn, () => {
    if (state.settings.family === "listening") renderListening();
    else renderExercise();
  });
  root.appendChild(startBtn);

  container.replaceChildren(root);
  state.ui = null;
}

function inputNotice() {
  if (midiInput.state().listening) {
    return "Pédale physique détectable (CC 64) : branche-la à ton clavier MIDI. La barre d'espace et le bouton à l'écran restent disponibles.";
  }
  return "Sans pédale physique : la barre d'espace ou le bouton à l'écran la remplacent — le timing est travaillé, pas le geste du pied.";
}

// ----------------------------------------------------------------------------
//  Famille Écoute — aucun score : on compare à l'oreille (plan/09 § 5).
// ----------------------------------------------------------------------------
function renderListening() {
  const root = el("div", "pd pd--listening");
  root.append(
    el("h1", "pd-heading", "Écoute : avec ou sans pédale"),
    el(
      "p",
      "pd-lede",
      "Le même accord, puis le même enchaînement — d'abord proprement, puis avec la pédale gardée trop longtemps."
    )
  );

  const demos = el("div", "pd-demos");
  demos.append(
    demoButton("Accord sans pédale", playDryChord),
    demoButton("Accord avec pédale", playSustainedChord),
    demoButton("Enchaînement, pédale changée", playCleanSequence),
    demoButton("Enchaînement, pédale gardée", playBlurredSequence)
  );
  root.appendChild(demos);

  const actions = el("div", "pd-actions");
  const back = el("button", "btn pd-secondary", "Réglages");
  back.type = "button";
  onClick(back, renderSetup);
  actions.appendChild(back);
  root.appendChild(actions);

  container.replaceChildren(root);
  state.ui = null;
}

function demoButton(label, handler) {
  const button = el("button", "btn pd-demo", label);
  button.type = "button";
  onClick(button, () => {
    handler().catch((error) => console.error("Impossible de jouer la démonstration.", error));
  });
  return button;
}

async function playDryChord() {
  await state.audio.playNotes(CHORDS[0].midis, { playback: "simultaneous", duration: 0.5 });
}

async function playSustainedChord() {
  await state.audio.playNotes(CHORDS[0].midis, { playback: "simultaneous", duration: 3.6 });
}

// Enchaînement propre : chaque accord s'éteint quand le suivant arrive.
async function playCleanSequence() {
  await state.audio.ensureReady();
  CHORDS.forEach((chord, index) => {
    later(() => {
      state.audio
        .playNotes(chord.midis, { playback: "simultaneous", duration: 1.1 })
        .catch(() => {});
    }, index * 1200);
  });
}

// Pédale gardée : tout sonne en même temps — la « bouillie » du plan (§ 1).
async function playBlurredSequence() {
  await state.audio.ensureReady();
  CHORDS.forEach((chord, index) => {
    later(() => {
      state.audio
        .playNotes(chord.midis, { playback: "simultaneous", duration: 4.5 })
        .catch(() => {});
    }, index * 1200);
  });
}

// ----------------------------------------------------------------------------
//  Écran d'exercice (directe et syncopée)
// ----------------------------------------------------------------------------
function renderExercise() {
  leaveRun();

  const family = FAMILIES.find((f) => f.id === state.settings.family);
  const root = el("div", "pd pd--exercise");

  const status = el("div", "pd-status");
  const phase = el("span", "pd-phase", "Prêt ?");
  phase.setAttribute("role", "status");
  status.append(
    el("span", "pd-family", family.label),
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

  // L'enchaînement affiché, l'accord en cours mis en évidence.
  const chordRow = el("div", "pd-chords");
  const chips = CHORDS.map((chord) => {
    const chip = el("span", "pd-chord", chord.name);
    chordRow.appendChild(chip);
    return chip;
  });

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
  const back = el("button", "btn pd-secondary", "Réglages");
  back.type = "button";
  onClick(back, renderSetup);
  actions.append(startBtn, back);

  root.append(status, instruction, chordRow, indicator, feedback, pedalBtn, hint, actions);
  container.replaceChildren(root);

  state.ui = { phase, chips, dot, indicatorText, feedback, pedalBtn, startBtn };
  attachPedalInputs();
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
//  Exécution : décompte, accords joués par l'application, verdicts en direct
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
    const grid = createBeatGrid({ bpm: session.settings.tempo, beatsPerBar: BEATS_PER_BAR });
    const chordTimes = CHORDS.map((chord, index) => grid.startTime + index * BEATS_PER_BAR * grid.secondsPerBeat);
    const endTime = chordTimes[chordTimes.length - 1] + BEATS_PER_BAR * grid.secondsPerBeat;

    session.attempt = {
      grid,
      chordTimes,
      pedalEvents: [],
      results: [], // un verdict par changement attendu
      expected: family === "direct" ? chordTimes.length : chordTimes.length - 1,
    };
    session.sustained.clear();

    session.practice = session.progress.openSession(pedalFeature.id, {
      family,
      tempo: grid.bpm,
      chords: CHORDS.map((chord) => chord.name).join("–"),
    });

    // Pulsation : un clic par temps, décompte compris.
    const totalBeats = grid.countInBeats + CHORDS.length * BEATS_PER_BAR + BEATS_PER_BAR;
    const clicks = [];
    scheduleClicks(grid, totalBeats, { schedule: (info) => clicks.push(info) });
    const pulse = new Tone.Part((time, info) => {
      session.click?.triggerAttackRelease(
        info.accent ? "C6" : "G5",
        0.03,
        time,
        info.accent ? 0.5 : 0.3
      );
      if (info.countIn) {
        Tone.Draw.schedule(() => {
          if (isAlive() && session.ui) {
            session.ui.phase.textContent = `Décompte… ${grid.countLabel(info.beat)}`;
          }
        }, time);
      }
    }, clicks.map((info) => [info.time, info]));
    pulse.start(0);
    session.parts.push(pulse);

    // Les accords, joués par l'application. Les doigts lâchent peu après
    // l'attaque : ce qui sonne encore ne tient que par la pédale.
    const chordPart = new Tone.Part((time, index) => {
      const chord = CHORDS[index];
      const notes = chord.midis.map(midiToNote);
      session.audio.sampler?.triggerAttack(notes, time, 0.75);

      Tone.Draw.schedule(() => {
        if (!isAlive() || !session.ui) return;
        session.ui.phase.textContent = `Accord ${index + 1} / ${CHORDS.length}`;
        session.ui.chips.forEach((chip, i) => {
          chip.dataset.state = i === index ? "current" : i < index ? "done" : "";
        });
      }, time);
    }, chordTimes.map((time, index) => [time, index]));
    chordPart.start(0);
    session.parts.push(chordPart);

    // Relâchement des « doigts », planifié sur le Transport lui aussi.
    const fingerPart = new Tone.Part((time, index) => {
      const chord = CHORDS[index];
      if (state?.pedalDown) {
        for (const midi of chord.midis) session.sustained.add(midi);
      } else {
        session.audio.sampler?.triggerRelease(chord.midis.map(midiToNote), time);
      }
    }, chordTimes.map((time, index) => [time + FINGER_RELEASE_S, index]));
    fingerPart.start(0);
    session.parts.push(fingerPart);

    // Verdict de chaque changement, rendu juste après sa fenêtre : le retour
    // est immédiat sans jamais juger un geste encore possible.
    const judged = family === "direct" ? chordTimes : chordTimes.slice(1);
    const verdictPart = new Tone.Part((time, chordTime) => {
      Tone.Draw.schedule(() => {
        if (isAlive()) judgeChange(chordTime);
      }, time);
    }, judged.map((chordTime) => [
      chordTime + REPRESS_MAX_FRACTION * grid.secondsPerBeat * 1.6,
      chordTime,
    ]));
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

    Tone.Transport.seconds = 0;
    Tone.Transport.start();
    session.running = true;
  } catch (error) {
    console.error("Impossible de démarrer l'exercice de pédale.", error);
  } finally {
    session.startPending = false;
  }
}

// Un changement à la fois : les fenêtres ne se recouvrent pas (un accord par
// mesure), chaque verdict peut donc être rendu indépendamment — le bilan
// réutilise ces mêmes résultats, il n'existe pas de second jugement.
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
  const index = state.attempt?.chordTimes.indexOf(chordTime) ?? -1;
  return index >= 0 ? `${CHORDS[index].name} (${index + 1})` : "?";
}

// ----------------------------------------------------------------------------
//  Fin d'exécution et bilan
// ----------------------------------------------------------------------------
function finishRun() {
  const session = state;
  const attempt = session.attempt;
  if (!attempt) return;

  stopTransport();
  closePractice("done");

  const family = session.settings.family;
  const root = el("div", "pd pd--summary");
  root.appendChild(el("h1", "pd-heading", "Exercice terminé"));
  root.appendChild(
    el(
      "p",
      "pd-lede",
      `${FAMILIES.find((f) => f.id === family)?.label} · ${session.settings.tempo} bpm · ${CHORDS.map((c) => c.name).join("–")}`
    )
  );

  const list = el("ul", "pd-results");
  const judgedChords = family === "direct" ? CHORDS : CHORDS.slice(1);
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
  const back = el("button", "btn pd-secondary", "Réglages");
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
  Tone.Transport.stop();
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
  if (Number.isFinite(last.tempo)) {
    state.settings.tempo = Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, last.tempo));
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

  // 1. Marquer la session morte, annuler minuteries et planifications.
  state.stopped = true;
  for (const timer of state.timers) clearTimeout(timer);
  state.timers.clear();

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
