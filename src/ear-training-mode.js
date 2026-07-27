// ============================================================================
//  Mode Entraînement de l'oreille — Feature 07
//
//  Symétrique de la Lecture de notes (02) : même réponse — retrouver une touche
//  ou nommer ce qu'on a compris —, stimulus sonore au lieu d'une note écrite
//  (plan/07-entrainement-oreille.md § 3). Aucune portée n'est affichée pendant
//  une question : la note écrite donnerait la réponse (§ 7).
//
//  Le déroulé d'une session vient de `session-engine.js`, extrait de 02 pour
//  l'occasion ; le contenu musical vient de `ear/questions.js` ; le clavier de
//  réponse est celui de `piano-dom.js`, partagé avec 02. Il ne reste ici que du
//  rendu, de l'interaction et de l'écoute.
//
//  Cycle de vie (contrat de la navigation, cf. plan/F1-navigation.md) :
//  `start(container)` construit l'écran et branche ses écouteurs ; `stop()`
//  libère l'audio, se désabonne du MIDI, annule les minuteries et retire les
//  écouteurs. Rien de ce mode ne doit survivre à `stop()`.
// ============================================================================

import { createAudio } from "./audio.js";
import { noteDegreeName, octaveOf } from "./music.js";
import { midiInput } from "./midi-input.js";
import { createPianoKeyboard } from "./piano-dom.js";
import { answer, DEFAULT_QUESTION_COUNT, hintAvailable, summary } from "./session-engine.js";
import {
  answerChoices,
  comparisonFor,
  createEarSession,
  describeKey,
  DIFFICULTIES,
  FAMILIES,
  isCombinationAvailable,
  keyboardPool,
  questionKey,
  REFERENCE_MIDI,
  targetOf,
} from "./ear/questions.js";
import { createProgressStore } from "./progress/store.js";
import { lastSessionContext, priorWeights } from "./progress/review.js";

// Délai avant la question suivante : assez long pour entendre le retour, assez
// court pour ne pas casser le rythme.
const NEXT_QUESTION_MS = 900;
const WRONG_FLASH_MS = 450;

// Silence entre la bonne réponse et la réponse proposée, quand l'aide fait
// entendre la différence : sans respiration, les deux se confondent.
const COMPARISON_GAP_S = 0.45;

const FAMILY_LABEL = Object.fromEntries(FAMILIES.map((f) => [f.id, f.label]));

// ----------------------------------------------------------------------------
//  Fiche de la fonctionnalité (registre de la navigation)
// ----------------------------------------------------------------------------
export const earTrainingFeature = {
  id: "ear-training",
  title: "Oreille",
  description: "Reconnaître une note, un intervalle ou la couleur d'un accord à l'oreille.",
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
    settings: { family: "single-note", difficulty: "beginner" },
    progress: createProgressStore(), // journal partagé (plan/F3 § 7)
    practice: null,   // séance ouverte dans le journal
    session: null,    // session d'exercice (session-engine)
    locked: false,    // vrai pendant la transition vers la question suivante
    hintUsed: false,
    lastWrong: null,  // dernière réponse fausse : c'est elle que l'aide compare
    timers: new Set(),
    piano: null,      // clavier de réponse (familles jouées)
    choices: new Map(), // id de proposition -> bouton (familles nommées)
    stopMidi: null,   // désabonnement de l'entrée MIDI (F2)
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
//  Écran de réglages
// ----------------------------------------------------------------------------
function renderSetup() {
  const root = el("div", "ear ear--setup");
  root.append(
    el("h1", "ear-heading", "Entraînement de l'oreille"),
    el(
      "p",
      "ear-lede",
      `Écoute, puis reconnais. ${DEFAULT_QUESTION_COUNT} questions par session, sans limite de temps : réécouter est toujours gratuit.`
    ),
    renderChoiceGroup("Exercice", FAMILIES, "family"),
    renderChoiceGroup("Niveau", DIFFICULTIES, "difficulty")
  );

  const startBtn = el("button", "btn ear-primary", "Commencer");
  startBtn.type = "button";
  onClick(startBtn, beginSession);
  root.appendChild(startBtn);

  container.replaceChildren(root);
}

function renderChoiceGroup(legendText, choices, settingKey) {
  const group = el("fieldset", "ear-choice");
  group.appendChild(el("legend", "ear-choice-legend", legendText));

  const row = el("div", "ear-choice-row");
  for (const choice of choices) {
    const button = el("button", "ear-choice-btn", choice.label);
    button.type = "button";

    // Une combinaison est proposée seulement si le générateur sait la produire.
    const candidate = { ...state.settings, [settingKey]: choice.id };
    const available = isCombinationAvailable(candidate.family, candidate.difficulty);
    button.disabled = !available;
    if (!available) {
      button.title = "Bientôt";
      button.appendChild(el("span", "ear-choice-soon", "Bientôt"));
    }

    const selected = state.settings[settingKey] === choice.id;
    button.setAttribute("aria-pressed", String(selected));
    if (selected) button.classList.add("is-selected");

    if (available) {
      onClick(button, () => {
        state.settings[settingKey] = choice.id;
        renderSetup(); // les disponibilités dépendent des deux réglages
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

  const { family, difficulty } = state.settings;

  // Ce qui a été raté lors des séances précédentes revient plus souvent : le
  // journal est relu à chaque départ, jamais mis en cache (plan/F3 § 6).
  const journal = state.progress.log();
  state.session = createEarSession({
    family,
    difficulty,
    priorWeights: priorWeights(journal, {
      featureId: earTrainingFeature.id,
      keyOf: (target) => questionKey(target),
    }),
  });

  state.practice = state.progress.openSession(earTrainingFeature.id, {
    family,
    difficulty,
    questionCount: state.session.questionCount,
  });
  state.locked = false;
  state.hintUsed = false;
  state.lastWrong = null;
  state.piano = null;

  // Le clic sur « Commencer » est un vrai geste utilisateur : c'est le moment
  // d'obtenir le contexte audio et de lancer le téléchargement des
  // échantillons, avant le premier stimulus.
  state.audio.ensureReady().catch(() => {});

  renderExercise();
}

// Ferme la séance ouverte dans le journal : `done` si le bilan a été atteint,
// `abandoned` si l'exercice a été quitté en route. C'est cette distinction que
// lit le Programme d'entraînement (plan/04 § 6).
function closePractice(outcome) {
  const practice = state?.practice;
  if (!practice || practice.closed) return;
  practice.close(outcome, {
    answeredQuestions: state.session?.answeredQuestions ?? 0,
  });
}

// Une tentative = un évènement (plan/F3 § 7). La réponse donnée est conservée
// telle quelle : c'est d'elle que vivra la vue « souvent confondus ».
function recordAttempt(result, given) {
  if (result.status !== "correct" && result.status !== "wrong") return;
  const question = result.question;
  state.practice?.record({
    type: "answer",
    target: targetOf(question),
    outcome: result.status,
    ...(result.status === "wrong"
      ? { given: question.family === "single-note" ? { midi: given } : { value: given } }
      : {}),
  });
}

// ----------------------------------------------------------------------------
//  Écran d'exercice
// ----------------------------------------------------------------------------
function renderExercise() {
  const { family, difficulty } = state.settings;
  const root = el("div", "ear ear--exercise");

  const status = el("div", "ear-status");
  const progress = el("span", "ear-progress");
  const streak = el("span", "ear-streak");
  const hintBtn = el("button", "btn ear-hint", "Entendre la différence");
  hintBtn.type = "button";
  onClick(hintBtn, hearDifference);
  status.append(progress, streak, hintBtn);

  const instruction = el(
    "p",
    "ear-instruction",
    FAMILIES.find((f) => f.id === family)?.instruction ?? ""
  );

  // Écouter et réécouter ne coûtent jamais rien (plan/07 § 6) : les deux
  // boutons restent disponibles pendant toute la question.
  const listen = el("div", "ear-listen");
  const playBtn = el("button", "btn ear-play", "Écouter");
  playBtn.type = "button";
  onClick(playBtn, () => playStimulus());
  const referenceBtn = el("button", "btn ear-reference", "Repère : Do");
  referenceBtn.type = "button";
  onClick(referenceBtn, () => {
    state.audio.playNote(REFERENCE_MIDI).catch(reportAudioError);
  });
  listen.append(playBtn, referenceBtn);

  const feedback = el("p", "ear-feedback");
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");

  root.append(status, instruction, listen, feedback);

  // La réponse se joue au piano, ou se choisit parmi des propositions
  // (plan/07 § 7).
  const pool = keyboardPool(family, difficulty);
  if (pool) {
    state.piano = createPianoKeyboard({
      prefix: "ear",
      signal: listeners.signal,
      onPress: (midi) => respond(midi, { play: true }),
    });
    state.piano.setPool(pool);
    root.appendChild(state.piano.element);
  } else {
    root.appendChild(renderChoices(answerChoices(family, difficulty)));
  }

  container.replaceChildren(root);
  state.ui = { progress, streak, hintBtn, feedback };
  startMidiCapture();
  refreshExercise();
}

function renderChoices(choices) {
  const box = el("div", "ear-choices");
  state.choices.clear();
  for (const choice of choices) {
    const button = el("button", "ear-answer", choice.label);
    button.type = "button";
    button.dataset.answer = choice.id;
    onClick(button, () => respond(choice.id));
    state.choices.set(choice.id, button);
    box.appendChild(button);
  }
  return box;
}

function refreshExercise() {
  const session = state.session;
  const ui = state.ui;
  if (!ui || !session.currentQuestion) return;

  ui.progress.textContent = `${session.answeredQuestions + 1} / ${session.questionCount}`;
  ui.streak.textContent = `Série : ${session.streak}`;
  ui.hintBtn.disabled = true; // rien à comparer tant qu'aucune réponse n'est fausse
  playStimulus();
}

function reportAudioError(error) {
  console.error("Impossible de jouer le stimulus.", error);
}

function playStimulus() {
  const question = state.session?.currentQuestion;
  if (!question) return;
  state.audio
    .playNotes(question.midis, { playback: question.playback })
    .catch(reportAudioError);
}

// ----------------------------------------------------------------------------
//  Réponse
// ----------------------------------------------------------------------------
function respond(given, { play = false } = {}) {
  const session = state.session;
  if (state.locked || !session?.currentQuestion) return;

  // La touche choisie sonne toujours, juste ou fausse : c'est ce qui entretient
  // le lien geste-son (plan/07 § 8).
  if (play) state.audio.playNote(given).catch(reportAudioError);

  const question = session.currentQuestion;
  const result = answer(session, given);
  recordAttempt(result, given);

  if (result.status === "wrong") {
    state.lastWrong = given;
    markAnswer(question, given, "is-wrong");
    state.ui.feedback.textContent = `${wrongLabel(question, given)} Réessaie, ou réécoute.`;
    state.ui.feedback.dataset.status = "wrong";
    // L'aide n'apparaît qu'après plusieurs erreurs (plan/07 § 8).
    state.ui.hintBtn.disabled = !hintAvailable(session);
    state.ui.streak.textContent = `Série : ${session.streak}`;
    return;
  }

  if (result.status !== "correct") return;

  // Bonne réponse : on fige l'écran le temps du retour.
  state.locked = true;
  markAnswer(question, given, "is-correct");
  state.ui.feedback.textContent = `Bravo : ${correctLabel(question)}.`;
  state.ui.feedback.dataset.status = "correct";
  state.ui.hintBtn.disabled = true;

  later(() => {
    clearAnswerStates();
    state.locked = false;
    state.hintUsed = false;
    state.lastWrong = null;
    state.ui.feedback.textContent = "";
    state.ui.feedback.dataset.status = "";
    if (state.session.finished) renderSummary();
    else refreshExercise();
  }, NEXT_QUESTION_MS);
}

function markAnswer(question, given, className) {
  if (question.family === "single-note") {
    const key = state.piano?.key(given);
    key?.classList.add(className);
    if (className === "is-wrong") {
      later(() => key?.classList.remove(className), WRONG_FLASH_MS);
    }
    return;
  }

  const button = state.choices.get(given);
  button?.classList.add(className);
  if (className === "is-wrong") {
    later(() => button?.classList.remove(className), WRONG_FLASH_MS);
  }
}

function clearAnswerStates() {
  state.piano?.clearStates();
  for (const button of state.choices.values()) {
    button.classList.remove("is-correct", "is-wrong");
  }
}

// Libellés du retour. On ne nomme jamais la bonne réponse tant qu'elle n'est
// pas trouvée : dire ce que ce n'est pas suffit.
function wrongLabel(question, given) {
  if (question.family === "single-note") {
    return `Ce n'est pas ${noteDegreeName(given)}${octaveOf(given)}.`;
  }
  return `Ce n'est pas « ${answerLabel(question, given)} ».`;
}

function correctLabel(question) {
  if (question.family === "single-note") {
    const midi = question.midis[0];
    return `${noteDegreeName(midi)}${octaveOf(midi)}`;
  }
  return answerLabel(question, question.expectedAnswer.value);
}

function answerLabel(question, value) {
  return state.choices.get(value)?.textContent ?? String(value);
}

// Aide : faire entendre la bonne réponse puis celle qui a été proposée
// (plan/07 § 8). Nommer l'erreur n'apprend rien à une oreille.
function hearDifference() {
  const session = state.session;
  const question = session?.currentQuestion;
  if (!question || !hintAvailable(session)) return;

  const pair = comparisonFor(question, state.lastWrong);
  if (!pair) return;

  state.hintUsed = true;
  state.ui.feedback.textContent = "La bonne réponse, puis la tienne.";
  state.ui.feedback.dataset.status = "";

  state.audio
    .playNotes(pair[0].midis, { playback: pair[0].playback })
    .then((duration) => {
      if (!duration || state.stopped) return;
      later(() => {
        state.audio
          .playNotes(pair[1].midis, { playback: pair[1].playback })
          .catch(reportAudioError);
      }, (duration + COMPARISON_GAP_S) * 1000);
    })
    .catch(reportAudioError);
}

// ----------------------------------------------------------------------------
//  Entrée MIDI (F2)
//
//  Toujours optionnelle : sans clavier branché, l'exercice se fait entièrement
//  au piano à l'écran. Elle ne sert que là où la réponse est une hauteur.
// ----------------------------------------------------------------------------
function startMidiCapture() {
  stopMidiCapture();
  if (state.settings.family !== "single-note") return;
  if (!midiInput.state().listening) return;

  state.stopMidi = midiInput.onNote((event) => {
    if (event.type !== "noteon") return;
    if (!state || state.stopped) return;
    respond(event.midi, { play: true });
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
  const root = el("div", "ear ear--summary");

  root.appendChild(el("h1", "ear-heading", "Session terminée"));
  root.appendChild(
    el(
      "p",
      "ear-lede",
      `${FAMILY_LABEL[state.settings.family]} · ${
        DIFFICULTIES.find((d) => d.id === state.settings.difficulty)?.label ?? ""
      }`
    )
  );

  const stats = el("ul", "ear-stats");
  stats.append(
    statItem(`${report.firstTryCorrect} / ${report.questionCount}`, "reconnus du premier coup"),
    statItem(`${Math.round(report.accuracy * 100)} %`, "de précision"),
    statItem(String(report.bestStreak), "meilleure série")
  );
  root.appendChild(stats);

  if (report.toReview.length > 0) {
    root.appendChild(el("h2", "ear-subheading", "À revoir"));
    const list = el("ul", "ear-review");
    for (const entry of report.toReview) {
      const errors = entry.mistakes > 1 ? "erreurs" : "erreur";
      list.appendChild(
        el("li", "ear-review-item", `${describeKey(entry.key)} — ${entry.mistakes} ${errors}`)
      );
    }
    root.appendChild(list);
  } else {
    root.appendChild(
      el("p", "ear-lede", "Rien à revoir : tout reconnu du premier coup.")
    );
  }

  // Le seul cas où l'utilisateur doit être prévenu : rien ne sera retrouvé à la
  // prochaine ouverture (navigation privée, stockage refusé ou plein).
  if (!state.progress.persistent) {
    root.appendChild(
      el(
        "p",
        "ear-note",
        "Résultats non enregistrés : le stockage de ce navigateur est indisponible."
      )
    );
  }

  const actions = el("div", "ear-actions");
  const again = el("button", "btn ear-primary", "Recommencer");
  again.type = "button";
  onClick(again, beginSession);

  const settings = el("button", "btn ear-secondary", "Changer de réglages");
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
  const item = el("li", "ear-stat");
  item.append(el("span", "ear-stat-value", value), el("span", "ear-stat-label", label));
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

// Reprend la famille et le niveau de la dernière séance. Un réglage devenu
// invalide est ignoré : les réglages par défaut restent bons.
function restoreSettings() {
  const last = lastSessionContext(state.progress.log(), earTrainingFeature.id);
  if (!last) return;
  const family = last.family ?? state.settings.family;
  const difficulty = last.difficulty ?? state.settings.difficulty;
  if (isCombinationAvailable(family, difficulty)) {
    state.settings = { family, difficulty };
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
