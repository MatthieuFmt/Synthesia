// ============================================================================
//  Mode Lecture de partitions — Feature 08
//
//  Suite directe de la Lecture de notes (02) : une mesure complète remplace la
//  note isolée, et cinq étapes n'ajoutent qu'une difficulté à la fois — la
//  suite de notes, les durées et silences, les altérations, les empilements,
//  puis la double portée (plan/08-lecture-partitions.md § 5).
//
//  La génération des mesures et le déroulé de session vivent dans
//  `sheet/exercises.js` (sans DOM) ; le dessin de la portée dans
//  `sheet/staff-render.js` ; le clavier de réponse est celui de `piano-dom.js`,
//  partagé avec 02 et 07. Ce fichier ne fait que du rendu et de l'interaction.
//
//  Cycle de vie (contrat de la navigation, cf. plan/F1-navigation.md) :
//  `start(container)` construit l'écran et branche ses écouteurs ; `stop()`
//  libère l'audio, se désabonne du MIDI, annule les minuteries et retire les
//  écouteurs. Rien de ce mode ne doit survivre à `stop()`.
// ============================================================================

import { createAudio } from "./audio.js";
import { noteDegreeName } from "./music.js";
import { midiInput } from "./midi-input.js";
import { createPianoKeyboard } from "./piano-dom.js";
import { createStaffView } from "./sheet/staff-render.js";
import {
  answer,
  createSheetSession,
  describeKey,
  hintAvailable,
  isCombinationAvailable,
  keyboardPool,
  questionKey,
  STAGES,
  stageById,
  summary,
} from "./sheet/exercises.js";
import { FIGURES } from "./rhythm/patterns.js";
import { createProgressStore } from "./progress/store.js";
import { lastSessionContext, priorWeights } from "./progress/review.js";

// Délai avant la question suivante : assez long pour voir le retour vert,
// assez court pour ne pas casser le rythme de lecture.
const NEXT_QUESTION_MS = 700;
const WRONG_FLASH_MS = 450;

const HAND_CHOICES = [
  { id: "right", label: "Main droite" },
  { id: "left", label: "Main gauche" },
  { id: "both", label: "Les deux" },
];

const HAND_LABEL = {
  right: "Main droite",
  left: "Main gauche",
};

// ----------------------------------------------------------------------------
//  Fiche de la fonctionnalité (registre de la navigation)
// ----------------------------------------------------------------------------
export const sheetReadingFeature = {
  id: "sheet-reading",
  title: "Lecture de partitions",
  description: "Lire une vraie mesure : suites de notes, durées, altérations, deux portées.",
  status: "available",
  start,
  stop,
};

// ----------------------------------------------------------------------------
//  État de la session en cours
// ----------------------------------------------------------------------------
let container = null;
let state = null;
let listeners = null; // AbortController : retire tous les écouteurs d'un coup

function createModeState() {
  return {
    stopped: false,
    audio: createAudio(),
    settings: { stage: "measures", hand: "right" },
    progress: createProgressStore(), // journal partagé (plan/F3 § 7)
    practice: null,     // séance ouverte dans le journal
    session: null,      // session d'exercice (sheet/exercises)
    locked: false,      // vrai pendant la transition vers la question suivante
    hintShown: false,
    pressed: new Set(), // notes déjà justes de l'empilement en cours
    timers: new Set(),
    piano: null,        // clavier partagé (piano-dom.js)
    choices: new Map(), // id de figure -> bouton (questions de durée)
    stopMidi: null,     // désabonnement de l'entrée MIDI (F2)
    ui: null,
  };
}

// Minuterie annulable en bloc par `stop()`.
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
//  Petits utilitaires de construction du DOM
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
//  Écran de réglages : l'étape d'abord, la main ensuite
// ----------------------------------------------------------------------------
function renderSetup() {
  const root = el("div", "sr sr--setup");
  root.append(
    el("h1", "sr-heading", "Lecture de partitions"),
    el(
      "p",
      "sr-lede",
      "Une mesure s'affiche : joue ses notes dans l'ordre. Chaque étape ajoute une seule nouveauté."
    ),
    renderStageGroup(),
    renderHandGroup()
  );

  const startBtn = el("button", "btn sr-primary", "Commencer");
  startBtn.type = "button";
  onClick(startBtn, beginSession);
  root.appendChild(startBtn);

  container.replaceChildren(root);
}

function renderStageGroup() {
  const group = el("fieldset", "sr-choice");
  group.appendChild(el("legend", "sr-choice-legend", "Étape"));

  const row = el("div", "sr-choice-row sr-choice-row--stages");
  for (const stage of STAGES) {
    const button = el("button", "sr-choice-btn sr-stage-btn");
    button.type = "button";
    button.append(
      el("span", "sr-stage-num", String(stage.num)),
      el("span", "sr-stage-label", stage.label),
      el("span", "sr-stage-desc", stage.description)
    );

    const selected = state.settings.stage === stage.id;
    button.setAttribute("aria-pressed", String(selected));
    if (selected) button.classList.add("is-selected");

    onClick(button, () => {
      state.settings.stage = stage.id;
      // La double portée impose les deux mains ; en la quittant, on retombe
      // sur la main droite plutôt que sur un réglage devenu invalide.
      if (!isCombinationAvailable(stage.id, state.settings.hand)) {
        state.settings.hand = stage.id === "grand-staff" ? "both" : "right";
      }
      renderSetup();
    });

    row.appendChild(button);
  }

  group.appendChild(row);
  return group;
}

function renderHandGroup() {
  const group = el("fieldset", "sr-choice");
  group.appendChild(el("legend", "sr-choice-legend", "Main travaillée"));

  const row = el("div", "sr-choice-row");
  for (const choice of HAND_CHOICES) {
    const button = el("button", "sr-choice-btn", choice.label);
    button.type = "button";

    const available = isCombinationAvailable(state.settings.stage, choice.id);
    button.disabled = !available;
    if (!available) {
      button.title =
        state.settings.stage === "grand-staff"
          ? "La double portée se lit à deux mains"
          : "Cette étape se lit une clé à la fois";
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
  return group;
}

// ----------------------------------------------------------------------------
//  Démarrage d'une session
// ----------------------------------------------------------------------------
function beginSession() {
  closePractice("abandoned"); // filet : une séance non terminée ne reste jamais ouverte

  const { stage, hand } = state.settings;

  // Ce qui a été raté lors des séances précédentes revient plus souvent : le
  // journal est relu à chaque départ, jamais mis en cache (plan/F3 § 6).
  const journal = state.progress.log();
  state.session = createSheetSession({
    stage,
    hand,
    priorWeights: priorWeights(journal, {
      featureId: sheetReadingFeature.id,
      keyOf: (target) => targetToKey(target),
    }),
  });

  state.practice = state.progress.openSession(sheetReadingFeature.id, {
    stage,
    handMode: hand,
    questionCount: state.session.questionCount,
  });
  state.locked = false;
  state.hintShown = false;
  state.pressed = new Set();
  state.piano = null;

  // Le clic sur « Commencer » est un vrai geste utilisateur : on en profite
  // pour lancer le téléchargement des échantillons avant la première réponse.
  state.audio.ensureReady().catch(() => {});

  renderExercise();
}

// La cible du journal, ramenée à la clé de pondération du moteur : c'est ce qui
// fait revenir plus souvent les difficultés des séances passées.
function targetToKey(target) {
  if (target.figure && target.midis === undefined && target.midi === undefined) {
    return `figure:${target.figure}`;
  }
  if (target.midis) {
    return `chord:${target.clef}:${[...target.midis].sort((a, b) => a - b).join("+")}`;
  }
  return `${target.clef}:${target.midi}`;
}

// Ferme la séance ouverte dans le journal : `done` si le bilan a été atteint,
// `abandoned` si l'exercice a été quitté en route (plan/04 § 6).
function closePractice(outcome) {
  const practice = state?.practice;
  if (!practice || practice.closed) return;
  practice.close(outcome, {
    answeredQuestions: state.session?.answeredQuestions ?? 0,
  });
}

// Une tentative = un évènement (plan/F3 § 7). La réponse donnée est conservée
// telle quelle : c'est d'elle que vit la vue « souvent confondus ».
function recordAttempt(result, given) {
  if (result.status !== "correct" && result.status !== "wrong") return;
  const question = result.question;

  let target;
  if (question.kind === "duration") {
    target = { figure: question.figure };
  } else if (question.midis.length > 1) {
    target = { midis: question.midis, clef: question.clef, hand: question.hand };
  } else {
    target = { midi: question.midis[0], clef: question.clef, hand: question.hand };
  }

  state.practice?.record({
    type: "answer",
    target,
    outcome: result.status,
    ...(result.status === "wrong"
      ? { given: question.kind === "duration" ? { figure: given } : { midi: given } }
      : {}),
  });
}

// ----------------------------------------------------------------------------
//  Écran d'exercice
// ----------------------------------------------------------------------------
function renderExercise() {
  const root = el("div", "sr sr--exercise");

  const status = el("div", "sr-status");
  const progress = el("span", "sr-progress");
  const measureLabel = el("span", "sr-measure");
  const streak = el("span", "sr-streak");
  const hintBtn = el("button", "btn sr-hint", "Indice");
  hintBtn.type = "button";
  onClick(hintBtn, showHint);
  status.append(progress, measureLabel, streak, hintBtn);

  // La main attendue n'est annoncée que sur la double portée, où elle change
  // d'un temps à l'autre — même règle que le mode Les deux de 02.
  let hand = null;
  if (state.session.stage === "grand-staff") {
    hand = el("span", "sr-hand");
    hand.setAttribute("role", "status");
    hand.setAttribute("aria-live", "polite");
    status.insertBefore(hand, streak);
  }

  const staff = createStaffView({ prefix: "sr" });

  const instruction = el("p", "sr-instruction");

  const feedback = el("p", "sr-feedback");
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");

  // Les deux façons de répondre : les durées en propositions (plan/08 § 13,
  // réponse « QCM »), tout le reste au clavier partagé de piano-dom.
  const durations = el("div", "sr-durations");
  durations.hidden = true;

  state.piano = createPianoKeyboard({
    prefix: "sr",
    signal: listeners.signal,
    onPress: pressKey,
  });
  state.piano.setPool(keyboardPool(state.session.stage, state.settings.hand));

  root.append(status, staff.element, instruction, feedback, durations, state.piano.element);
  container.replaceChildren(root);

  state.ui = { progress, measureLabel, streak, hand, hintBtn, staff, instruction, feedback, durations };
  startMidiCapture();
  refreshExercise();
}

// Redessine l'écran pour la question en cours : portée sur la bonne mesure,
// curseur sur l'évènement attendu, et la bonne surface de réponse.
function refreshExercise() {
  const session = state.session;
  const ui = state.ui;
  if (!ui || !session.currentQuestion) return;

  const question = session.currentQuestion;
  const measure = session.measures[question.measureIndex];

  ui.progress.textContent = `${session.answeredQuestions + 1} / ${session.questionCount}`;
  ui.measureLabel.textContent = `Mesure ${question.measureIndex + 1} / ${session.measures.length}`;
  ui.streak.textContent = `Série : ${session.streak}`;
  ui.hintBtn.disabled = !hintAvailable(session) || state.hintShown;
  ui.staff.setStatus("");
  ui.staff.render(measure, { cursorIndex: question.eventIndex });

  if (ui.hand) {
    ui.hand.textContent =
      question.hand === null ? "Deux mains ensemble" : HAND_LABEL[question.hand];
  }

  if (question.kind === "duration") {
    ui.instruction.textContent =
      FIGURES[question.figure].rest
        ? "Quelle est la durée du silence encadré ?"
        : "Quelle est la durée de la note encadrée ?";
    renderDurationChoices(question);
    ui.durations.hidden = false;
    state.piano.element.hidden = true;
  } else {
    ui.instruction.textContent =
      question.midis.length > 1
        ? question.hand === null
          ? "Joue les deux notes encadrées, une par main."
          : "Joue les notes empilées, dans n'importe quel ordre."
        : "Joue la note encadrée sur le piano.";
    ui.durations.hidden = true;
    state.piano.element.hidden = false;
  }
}

function renderDurationChoices(question) {
  const box = state.ui.durations;
  box.replaceChildren();
  state.choices.clear();
  for (const id of question.choices) {
    const figure = FIGURES[id];
    const button = el("button", "sr-answer", figure.name);
    button.type = "button";
    button.dataset.answer = id;
    onClick(button, () => respondDuration(id));
    state.choices.set(id, button);
    box.appendChild(button);
  }
}

// ----------------------------------------------------------------------------
//  Réponses
// ----------------------------------------------------------------------------
function pressKey(midi) {
  const session = state.session;
  const question = session?.currentQuestion;
  if (state.locked || !question || question.kind !== "pitch") return;

  // La touche choisie sonne toujours, juste ou fausse : c'est ce qui entretient
  // le lien geste-son (plan/02 § 4, règle reprise par 08).
  state.audio.playNote(midi).catch((error) => {
    console.error("Impossible de jouer la note.", error);
  });

  const key = state.piano.key(midi);

  // Empilement : chaque note juste reste allumée, une note fausse est signalée
  // sans faire reculer les autres (plan/08 § 6, même règle que 06).
  if (question.midis.includes(midi)) {
    if (state.pressed.has(midi)) return;
    state.pressed.add(midi);
    key?.classList.add("is-correct");

    if (state.pressed.size < question.midis.length) {
      const left = question.midis.length - state.pressed.size;
      state.ui.feedback.textContent =
        left > 1 ? `Bien. Encore ${left} notes.` : "Bien. Encore une note.";
      state.ui.feedback.dataset.status = "correct";
      return;
    }

    const result = answer(session, midi);
    recordAttempt(result, midi);
    if (result.status === "correct") acceptAnswer(result);
    return;
  }

  const result = answer(session, midi);
  recordAttempt(result, midi);
  if (result.status !== "wrong") return;

  key?.classList.add("is-wrong");
  later(() => key?.classList.remove("is-wrong"), WRONG_FLASH_MS);
  state.ui.staff.setStatus("wrong");
  later(() => state.ui?.staff.setStatus(""), WRONG_FLASH_MS);
  state.ui.feedback.textContent = `Ce n'est pas ${noteDegreeName(midi)}. Réessaie.`;
  state.ui.feedback.dataset.status = "wrong";
  state.ui.hintBtn.disabled = !hintAvailable(session) || state.hintShown;
  state.ui.streak.textContent = `Série : ${session.streak}`;
}

function respondDuration(figureId) {
  const session = state.session;
  const question = session?.currentQuestion;
  if (state.locked || !question || question.kind !== "duration") return;

  const result = answer(session, figureId);
  recordAttempt(result, figureId);

  if (result.status === "wrong") {
    const button = state.choices.get(figureId);
    button?.classList.add("is-wrong");
    later(() => button?.classList.remove("is-wrong"), WRONG_FLASH_MS);
    state.ui.feedback.textContent = `Ce n'est pas une ${FIGURES[figureId].name}. Réessaie.`;
    state.ui.feedback.dataset.status = "wrong";
    state.ui.hintBtn.disabled = !hintAvailable(session) || state.hintShown;
    state.ui.streak.textContent = `Série : ${session.streak}`;
    return;
  }

  if (result.status !== "correct") return;
  state.choices.get(figureId)?.classList.add("is-correct");
  acceptAnswer(result);
}

// Bonne réponse : l'écran se fige le temps du retour vert, puis passe à la
// question suivante — ou au bilan.
function acceptAnswer(result) {
  state.locked = true;
  state.ui.staff.setStatus("correct");
  state.ui.feedback.textContent =
    result.question.kind === "duration"
      ? `Bravo, c'était une ${FIGURES[result.question.figure].name}.`
      : result.question.midis.length > 1
        ? "Bravo, l'empilement est complet."
        : `Bravo, c'était ${noteDegreeName(result.question.midis[0])}.`;
  state.ui.feedback.dataset.status = "correct";
  state.ui.hintBtn.disabled = true;

  later(() => {
    state.piano.clearStates();
    for (const button of state.choices.values()) {
      button.classList.remove("is-correct", "is-wrong", "is-hinted");
    }
    state.pressed = new Set();
    state.locked = false;
    state.hintShown = false;
    state.ui.feedback.textContent = "";
    state.ui.feedback.dataset.status = "";
    if (state.session.finished) renderSummary();
    else refreshExercise();
  }, NEXT_QUESTION_MS);
}

// L'indice montre où répondre sans répondre : les touches attendues sur le
// clavier, ou la bonne proposition pour une durée.
function showHint() {
  const session = state.session;
  const question = session?.currentQuestion;
  if (!question || !hintAvailable(session) || state.hintShown) return;

  state.hintShown = true;
  state.ui.hintBtn.disabled = true;

  if (question.kind === "duration") {
    state.choices.get(question.figure)?.classList.add("is-hinted");
    return;
  }
  for (const midi of question.midis) {
    if (!state.pressed.has(midi)) state.piano.highlight(midi);
  }
}

// ----------------------------------------------------------------------------
//  Entrée MIDI (F2) — toujours optionnelle : sans clavier branché, tout se
//  joue au piano à l'écran (plan/08 § 12).
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
//  Bilan de fin de session
// ----------------------------------------------------------------------------
function renderSummary() {
  closePractice("done");

  const report = summary(state.session);
  const root = el("div", "sr sr--summary");

  root.appendChild(el("h1", "sr-heading", "Session terminée"));
  root.appendChild(
    el("p", "sr-lede", `Étape ${stageById(state.session.stage)?.num} — ${stageById(state.session.stage)?.label}`)
  );

  const stats = el("ul", "sr-stats");
  stats.append(
    statItem(`${report.firstTryCorrect} / ${report.questionCount}`, "réussies du premier coup"),
    statItem(`${Math.round(report.accuracy * 100)} %`, "de précision"),
    statItem(String(report.bestStreak), "meilleure série")
  );
  root.appendChild(stats);

  // Sur la double portée, chaque main a son bilan : un chiffre global
  // masquerait la main en retard (plan/08 § 11 étape E).
  if (state.session.stage === "grand-staff") {
    const list = el("ul", "sr-hands");
    for (const hand of ["right", "left"]) {
      const counts = report.byHand[hand];
      if (!counts || counts.answered === 0) continue;
      const item = el("li", "sr-hand-stat");
      item.append(
        el("span", "sr-hand-stat-label", HAND_LABEL[hand]),
        el(
          "span",
          "sr-hand-stat-value",
          `${counts.firstTryCorrect} / ${counts.answered} du premier coup · ${Math.round(counts.accuracy * 100)} %`
        )
      );
      list.appendChild(item);
    }
    if (list.childElementCount > 0) {
      root.append(el("h2", "sr-subheading", "Par main"), list);
    }
  }

  if (report.toReview.length > 0) {
    root.appendChild(el("h2", "sr-subheading", "À revoir"));
    const list = el("ul", "sr-review");
    for (const entry of report.toReview) {
      const errors = entry.mistakes > 1 ? "erreurs" : "erreur";
      list.appendChild(el("li", "sr-review-item", `${entry.label} — ${entry.mistakes} ${errors}`));
    }
    root.appendChild(list);
  } else {
    root.appendChild(el("p", "sr-lede", "Rien à revoir : tout lu du premier coup."));
  }

  // Le seul cas où l'utilisateur doit être prévenu : rien ne sera retrouvé à la
  // prochaine ouverture (navigation privée, stockage refusé ou plein).
  if (!state.progress.persistent) {
    root.appendChild(
      el("p", "sr-note", "Résultats non enregistrés : le stockage de ce navigateur est indisponible.")
    );
  }

  const actions = el("div", "sr-actions");
  const again = el("button", "btn sr-primary", "Recommencer");
  again.type = "button";
  onClick(again, beginSession);

  const settings = el("button", "btn sr-secondary", "Changer d'étape");
  settings.type = "button";
  onClick(settings, renderSetup);

  actions.append(again, settings);
  root.appendChild(actions);

  container.replaceChildren(root);
  stopMidiCapture();
  state.ui = null;
  state.piano = null;
  state.choices.clear();
}

function statItem(value, label) {
  const item = el("li", "sr-stat");
  item.append(el("span", "sr-stat-value", value), el("span", "sr-stat-label", label));
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

  // Une page masquée peut ne jamais être réactivée : c'est la dernière occasion
  // d'écrire ce qui n'a pas encore été enregistré.
  window.addEventListener("pagehide", flushProgress, { signal: listeners.signal });
  document.addEventListener("visibilitychange", onVisibilityChange, {
    signal: listeners.signal,
  });

  renderSetup();
}

// Reprend l'étape et la main de la dernière séance. Un réglage devenu invalide
// est ignoré : les réglages par défaut restent bons.
function restoreSettings() {
  const last = lastSessionContext(state.progress.log(), sheetReadingFeature.id);
  if (!last) return;
  const stage = last.stage ?? state.settings.stage;
  const hand = last.handMode ?? state.settings.hand;
  if (isCombinationAvailable(stage, hand)) {
    state.settings = { stage, hand };
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

  // 1. Marquer la session morte avant d'annuler ses rappels : les promesses
  //    encore en vol s'arrêteront d'elles-mêmes.
  state.stopped = true;
  for (const timer of state.timers) clearTimeout(timer);
  state.timers.clear();

  // 2. Se désabonner du clavier physique. L'entrée MIDI, elle, reste en place :
  //    c'est l'exception assumée de F2 (une permission ne se redemande pas).
  stopMidiCapture();

  // 3. Clore la séance de progression : quitter en route s'enregistre comme un
  //    abandon, pas comme une séance terminée. `close()` écrit le journal.
  closePractice("abandoned");
  state.progress.flush();

  // 4. Couper le son et libérer la chaîne audio.
  state.audio.dispose();

  // 5. Retirer les écouteurs (réglages, propositions, touches du clavier).
  listeners.abort();
  listeners = null;

  // 6. Rendre la scène.
  container?.replaceChildren();
  container = null;
  state = null;
}

// Exporte la clé de pondération pour les vues de progression à venir : la même
// convention que le tirage, jamais une seconde.
export { questionKey, describeKey };
