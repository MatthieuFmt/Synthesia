// ============================================================================
//  Mode Lecture de notes — Feature 02 « Lecture de notes »
//
//  Une note s'affiche seule sur une grande portée ; l'utilisateur clique la
//  touche correspondante sur un clavier réduit à la zone travaillée. Pas de
//  défilement, pas de limite de temps : la seule compétence exercée est
//  reconnaître une note (plan/02-lecture-notes.md § 3).
//
//  Le choix des notes et le bilan vivent dans `note-reading-engine.js`, sans
//  DOM ; ce fichier ne fait que du rendu et de l'interaction.
//
//  Cycle de vie (contrat de la navigation, cf. plan/F1-navigation.md) :
//  `start(container)` construit l'écran dans `container` et branche ses
//  écouteurs ; `stop()` libère l'audio, annule les minuteries et retire les
//  écouteurs. Rien de ce mode ne doit survivre à `stop()`.
// ============================================================================

import { createAudio } from "./audio.js";
import {
  CLEF_GLYPH,
  isWhite,
  noteDegreeName,
  octaveOf,
  pitchClass,
  SHARP_PCS,
  staffStep,
} from "./music.js";
import {
  answer,
  createSession,
  hintAvailable,
  isCombinationAvailable,
  questionKey,
  QUESTIONS_PER_SESSION,
  summary,
} from "./note-reading-engine.js";
import { createProgressStore } from "./progress/store.js";
import { lastSessionContext, priorWeights } from "./progress/review.js";

const SVG_NS = "http://www.w3.org/2000/svg";

// Proportions du glyphe Unicode de clé de fa tel que le dessinent les polices
// système, mesurées au pixel dans le navigateur (cf. plan/02 § 9) : les deux
// points sont écartés de 0,216 em et leur milieu se trouve 0,447 em au-dessus de
// la ligne de base. Ce sont ces deux points qui doivent encadrer la ligne de Fa
// (4e ligne) : les caler dessus est le seul placement juste, la boîte du glyphe
// n'ayant aucune raison de coïncider avec la portée.
const BASS_DOT_GAP_EM = 0.2162;
const BASS_F_LINE_EM = 0.4469;

// Délai avant la question suivante : assez long pour voir le retour vert,
// assez court pour ne pas casser le rythme.
const NEXT_QUESTION_MS = 700;
const WRONG_FLASH_MS = 450;

// Largeur minimale d'une touche blanche, gap compris : en dessous, la cible
// devient trop petite pour le doigt (≥ 30 px, cf. CLAUDE.md). Les étendues
// larges des niveaux Intermédiaire et Difficile font défiler le clavier plutôt
// que d'amincir ses touches.
const MIN_KEY_WIDTH = 36;

const DIFFICULTY_CHOICES = [
  { id: "beginner", label: "Débutant" },
  { id: "intermediate", label: "Intermédiaire" },
  { id: "advanced", label: "Difficile" },
];

const HAND_CHOICES = [
  { id: "right", label: "Main droite" },
  { id: "left", label: "Main gauche" },
  { id: "both", label: "Les deux" },
];

// Libellé de la main réellement travaillée, annoncé pendant l'exercice en mode
// Les deux (plan/02-lecture-notes.md § 4).
const HAND_LABEL = {
  right: "Main droite",
  left: "Main gauche",
};

const CLEF_LABEL = {
  treble: "clé de sol",
  bass: "clé de fa",
};

// ----------------------------------------------------------------------------
//  Fiche de la fonctionnalité (registre de la navigation)
// ----------------------------------------------------------------------------
export const noteReadingFeature = {
  id: "note-reading",
  title: "Lecture de notes",
  description: "Reconnaître une note sur la portée et la retrouver au piano.",
  status: "available",
  start,
  stop,
};

// ----------------------------------------------------------------------------
//  État de la session en cours
//
//  Comme pour le mode Morceau, tout l'état vit dans un objet recréé par
//  `start()` : une session arrêtée ne peut plus rien modifier de la suivante.
// ----------------------------------------------------------------------------
let container = null;
let state = null;
let listeners = null; // AbortController : retire tous les écouteurs d'un coup

function createModeState() {
  return {
    stopped: false,
    audio: createAudio(),
    settings: { difficulty: "beginner", hand: "right" },
    progress: createProgressStore(), // journal partagé (plan/F3 § 7)
    practice: null,    // séance ouverte dans le journal
    session: null,     // session d'exercice (note-reading-engine)
    locked: false,     // vrai pendant la transition vers la question suivante
    hintShown: false,
    timers: new Set(),
    keys: new Map(),   // midi -> bouton du clavier
    keyboardRange: null, // étendue actuellement dessinée (suit la main jouée)
    ui: null,          // références du DOM de l'écran d'exercice
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
//  Écran de réglages
//
//  Les combinaisons non encore construites restent visibles mais désactivées,
//  comme les cartes « Bientôt » de l'accueil : rien ne peut être lancé par
//  erreur (cf. plan/F1-navigation.md § 5).
// ----------------------------------------------------------------------------
function renderSetup() {
  const root = el("div", "nr nr--setup");
  const heading = el("h1", "nr-heading", "Lecture de notes");
  const lede = el(
    "p",
    "nr-lede",
    `Une note s'affiche sur la portée : retrouve-la sur le piano. ${QUESTIONS_PER_SESSION} notes par session, sans limite de temps.`
  );

  root.append(
    heading,
    lede,
    renderChoiceGroup("Niveau", DIFFICULTY_CHOICES, "difficulty"),
    renderChoiceGroup("Main travaillée", HAND_CHOICES, "hand")
  );

  const startBtn = el("button", "btn nr-primary", "Commencer");
  startBtn.type = "button";
  onClick(startBtn, beginSession);
  root.appendChild(startBtn);

  container.replaceChildren(root);
}

function renderChoiceGroup(legendText, choices, settingKey) {
  const group = el("fieldset", "nr-choice");
  group.appendChild(el("legend", "nr-choice-legend", legendText));

  const row = el("div", "nr-choice-row");
  for (const choice of choices) {
    const button = el("button", "nr-choice-btn", choice.label);
    button.type = "button";

    // Une combinaison est proposée seulement si le moteur sait la construire.
    const candidate = { ...state.settings, [settingKey]: choice.id };
    const available = isCombinationAvailable(candidate.difficulty, candidate.hand);
    button.disabled = !available;
    if (!available) {
      button.title = "Bientôt";
      button.appendChild(el("span", "nr-choice-soon", "Bientôt"));
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
//  Écran d'exercice
// ----------------------------------------------------------------------------
function beginSession() {
  closePractice("abandoned"); // filet : une séance non terminée ne reste jamais ouverte

  // Les notes ratées lors des séances précédentes reviennent plus souvent : le
  // journal est relu à chaque départ, jamais mis en cache (plan/02 étape D).
  const journal = state.progress.log();
  state.session = createSession({
    ...state.settings,
    priorWeights: priorWeights(journal, {
      featureId: noteReadingFeature.id,
      keyOf: (target) => questionKey(target),
    }),
  });
  state.practice = state.progress.openSession(noteReadingFeature.id, {
    difficulty: state.settings.difficulty,
    handMode: state.settings.hand,
    questionCount: state.session.questionCount,
  });
  state.locked = false;
  state.hintShown = false;
  state.keyboardRange = null;

  // Le clic sur « Commencer » est un vrai geste utilisateur : on en profite
  // pour lancer le téléchargement des échantillons avant la première réponse.
  state.audio.ensureReady().catch(() => {});

  renderExercise();
}

// Ferme la séance ouverte dans le journal : `done` si le bilan a été atteint,
// `abandoned` si l'exercice a été quitté en route. C'est cette distinction que
// lira le Programme d'entraînement (plan/04 § 6).
function closePractice(outcome) {
  const practice = state?.practice;
  if (!practice || practice.closed) return;
  practice.close(outcome, {
    answeredQuestions: state.session?.answeredQuestions ?? 0,
  });
}

// Une tentative = un évènement (plan/F3 § 7). C'est le seul niveau qui conserve
// la note jouée *à la place* de la bonne, dont vivra la vue « notes souvent
// confondues ».
function recordAttempt(result, played) {
  if (result.status !== "correct" && result.status !== "wrong") return;
  const { midi, clef, hand } = result.question;
  state.practice?.record({
    type: "answer",
    target: { midi, clef, hand },
    outcome: result.status,
    ...(result.status === "wrong" ? { given: { midi: played } } : {}),
  });
}

function renderExercise() {
  const root = el("div", "nr nr--exercise");

  const status = el("div", "nr-status");
  const progress = el("span", "nr-progress");
  const streak = el("span", "nr-streak");
  const hintBtn = el("button", "btn nr-hint", "Indice");
  hintBtn.type = "button";
  onClick(hintBtn, showHint);
  status.append(progress, streak, hintBtn);

  // La main travaillée n'est annoncée qu'en mode Les deux : ailleurs, elle est
  // fixée par les réglages et n'apprend rien (plan/02-lecture-notes.md § 4).
  let hand = null;
  if (state.session.handMode === "both") {
    hand = el("span", "nr-hand");
    hand.setAttribute("role", "status");
    hand.setAttribute("aria-live", "polite");
    status.insertBefore(hand, streak);
  }

  const staff = renderStaff();

  const feedback = el("p", "nr-feedback");
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");

  const { keyboard, inner } = renderKeyboard();

  root.append(status, staff.svg, feedback, keyboard);
  container.replaceChildren(root);

  state.ui = {
    progress,
    streak,
    hand,
    hintBtn,
    staff,
    feedback,
    keyboard,
    keyboardInner: inner,
  };
  refreshExercise();
}

// Portée « papier » : 5 lignes, la clé, une seule note, et les lignes
// supplémentaires quand la note sort de la portée (le Do central, par exemple).
function renderStaff() {
  const LG = 16;                       // interligne
  const staffH = LG * 4;
  const topLineY = 62;
  const bottomLineY = topLineY + staffH;
  const fLineY = topLineY + LG;        // 4e ligne : la ligne de Fa
  const staffLeft = 18;
  const staffRight = 302;
  const headX = 210;
  const headRx = LG * 0.72;
  const headRy = LG * 0.6;

  const svg = svgEl("svg", {
    class: "nr-staff",
    viewBox: "0 0 320 200",
    role: "img",
  });
  const title = svgEl("title");
  svg.appendChild(title);

  for (let i = 0; i < 5; i++) {
    const y = topLineY + i * LG;
    svg.appendChild(
      svgEl("line", {
        class: "nr-staff-line",
        x1: staffLeft,
        y1: y,
        x2: staffRight,
        y2: y,
      })
    );
  }

  const clef = svgEl("text", { class: "nr-clef", x: 24, y: 0 });
  const ledgers = svgEl("g", { class: "nr-ledgers" });
  const stem = svgEl("line", { class: "nr-stem" });
  const head = svgEl("ellipse", {
    class: "nr-head",
    rx: headRx,
    ry: headRy,
  });
  const accidental = svgEl("text", { class: "nr-accidental" });
  const name = svgEl("text", { class: "nr-note-name", x: 160, y: 190 });

  svg.append(clef, ledgers, stem, head, accidental, name);

  // Met la portée à jour pour une question donnée ; `reveal` affiche le nom de
  // la note (uniquement dans le retour d'une réponse, jamais pendant la
  // question — cf. plan/02-lecture-notes.md § 5).
  function update(question, { reveal = false, status = "" } = {}) {
    const { midi, clef: clefId } = question;
    const step = staffStep(midi, clefId);
    const headY = bottomLineY - step * (LG / 2);

    // Chaque glyphe a son propre point d'ancrage sur la portée : la spirale de
    // la clé de sol enroule la 2e ligne (l'œil de la spirale tombe à moins d'un
    // pixel de la ligne de Sol avec ces valeurs), la clé de fa encadre la 4e
    // ligne de ses deux points.
    clef.textContent = CLEF_GLYPH[clefId];
    if (clefId === "treble") {
      clef.setAttribute("font-size", Math.round(staffH * 1.7));
      clef.setAttribute("y", bottomLineY + LG * 0.6);
    } else {
      // Points écartés d'exactement un interligne, milieu sur la ligne de Fa.
      const size = Math.round(LG / BASS_DOT_GAP_EM);
      clef.setAttribute("font-size", size);
      clef.setAttribute("y", Math.round(fLineY + size * BASS_F_LINE_EM));
    }

    // Lignes supplémentaires au-dessus / en dessous de la portée.
    ledgers.replaceChildren();
    const half = headRx + 6;
    const addLedger = (k) => {
      const y = bottomLineY - k * (LG / 2);
      ledgers.appendChild(
        svgEl("line", {
          class: "nr-staff-line",
          x1: headX - half,
          y1: y,
          x2: headX + half,
          y2: y,
        })
      );
    };
    if (step < 0) for (let k = -2; k >= step; k -= 2) addLedger(k);
    else if (step > 8) for (let k = 10; k <= step; k += 2) addLedger(k);

    // Hampe : vers le haut sous la 3e ligne, vers le bas au-dessus.
    if (step < 4) {
      stem.setAttribute("x1", headX + headRx);
      stem.setAttribute("y1", headY);
      stem.setAttribute("x2", headX + headRx);
      stem.setAttribute("y2", headY - LG * 2.8);
    } else {
      stem.setAttribute("x1", headX - headRx);
      stem.setAttribute("y1", headY);
      stem.setAttribute("x2", headX - headRx);
      stem.setAttribute("y2", headY + LG * 2.8);
    }

    head.setAttribute("cx", headX);
    head.setAttribute("cy", headY);
    head.setAttribute("transform", `rotate(-17 ${headX} ${headY})`);
    svg.dataset.status = status; // colore la note et sa hampe (retour vert)

    if (SHARP_PCS.has(pitchClass(midi))) {
      accidental.textContent = "♯";
      accidental.setAttribute("x", headX - headRx - 22);
      accidental.setAttribute("y", headY + LG * 0.55);
    } else {
      accidental.textContent = "";
    }

    name.textContent = reveal ? noteDegreeName(midi) : "";
    title.textContent = reveal
      ? `Note affichée en ${CLEF_LABEL[clefId]} : ${noteDegreeName(midi)}`
      : `Note à reconnaître sur la portée en ${CLEF_LABEL[clefId]}`;
  }

  return { svg, update };
}

// Clavier réduit à la zone travaillée (plan/02-lecture-notes.md § 4).
//
//  - groupe plus étroit qu'une octave (Débutant) : on affiche l'octave Do → Do
//    qui le contient, ses touches inutilisées servant de leurres ;
//  - groupe plus large (Intermédiaire, Difficile) : l'étendue exacte du groupe
//    suffit — il compte déjà plus de dix candidats, et l'arrondir aux Do
//    ajouterait quatre à sept touches, donc des touches trop fines.
function keyboardRange(pool) {
  const lowest = Math.min(...pool);
  const highest = Math.max(...pool);
  if (highest - lowest < 12) {
    const start = lowest - pitchClass(lowest);
    return { start, end: start + 12 };
  }
  return { start: lowest, end: highest };
}

// Le clavier est vide au départ : ses touches sont (re)dessinées par
// `updateKeyboard()` à chaque question. Un seul écouteur suffit pour toutes les
// touches, y compris celles qui n'existent pas encore.
function renderKeyboard() {
  const keyboard = el("div", "nr-keyboard");
  const inner = el("div", "nr-keyboard-inner");
  keyboard.appendChild(inner);
  keyboard.addEventListener(
    "click",
    (event) => {
      const key = event.target.closest?.(".nr-key");
      if (key) pressKey(Number(key.dataset.midi));
    },
    { signal: listeners.signal }
  );
  return { keyboard, inner };
}

// En mode Les deux, la zone utile change de main en main : on ne redessine que
// lorsque l'étendue change réellement, jamais entre deux questions d'une même
// main.
function updateKeyboard(hand) {
  const { start, end } = keyboardRange(state.session.pools[hand]);
  const current = state.keyboardRange;
  if (current && current.start === start && current.end === end) return;

  state.keyboardRange = { start, end };
  const whites = [];
  for (let midi = start; midi <= end; midi++) {
    if (isWhite(midi)) whites.push(midi);
  }
  const whiteWidth = 100 / whites.length;
  const blackWidth = whiteWidth * 0.62;

  const whiteRow = el("div", "nr-whites");
  const blackRow = el("div", "nr-blacks");
  state.keys.clear();

  // Largeur minimale du clavier : au-delà, il défile horizontalement plutôt que
  // de rétrécir ses touches sous la taille du doigt. Sur la tablette en paysage
  // les deux octaves du niveau Difficile tiennent sans défilement.
  state.ui.keyboardInner.style.minWidth = `${whites.length * MIN_KEY_WIDTH}px`;

  for (const midi of whites) {
    const key = makeKey(midi, "nr-key nr-key--white");
    // Repère d'octave : le Do reste le point d'ancrage du parcours.
    if (pitchClass(midi) === 0) {
      key.appendChild(el("span", "nr-key-label", "Do"));
    }
    whiteRow.appendChild(key);
  }

  for (let midi = start; midi <= end; midi++) {
    if (isWhite(midi)) continue;
    const leftWhiteIndex = whites.indexOf(midi - 1);
    if (leftWhiteIndex < 0) continue;
    const key = makeKey(midi, "nr-key nr-key--black");
    key.style.left = `${(leftWhiteIndex + 1) * whiteWidth - blackWidth / 2}%`;
    key.style.width = `${blackWidth}%`;
    blackRow.appendChild(key);
  }

  state.ui.keyboardInner.replaceChildren(whiteRow, blackRow);

  // Quand le clavier défile, on part du milieu de l'étendue : les deux
  // extrémités sont alors à la même distance. La position ne bouge plus ensuite
  // (elle est la même à chaque question), donc elle ne renseigne sur rien.
  const keyboard = state.ui.keyboard;
  keyboard.scrollLeft = (keyboard.scrollWidth - keyboard.clientWidth) / 2;
}

function makeKey(midi, className) {
  const key = el("button", className);
  key.type = "button";
  key.dataset.midi = String(midi);
  key.setAttribute("aria-label", `${noteDegreeName(midi)}${octaveOf(midi)}`);
  state.keys.set(midi, key);
  return key;
}

// ----------------------------------------------------------------------------
//  Boucle de l'exercice
// ----------------------------------------------------------------------------
function refreshExercise() {
  const session = state.session;
  const ui = state.ui;
  if (!ui || !session.currentQuestion) return;

  const question = session.currentQuestion;
  ui.progress.textContent = `${session.answeredQuestions + 1} / ${session.questionCount}`;
  ui.streak.textContent = `Série : ${session.streak}`;
  ui.hintBtn.disabled = !hintAvailable(session) || state.hintShown;
  if (ui.hand) ui.hand.textContent = HAND_LABEL[question.hand];
  updateKeyboard(question.hand);
  ui.staff.update(question);
}

function clearKeyStates() {
  for (const key of state.keys.values()) {
    key.classList.remove("is-correct", "is-wrong", "is-hinted");
  }
}

function showHint() {
  const session = state.session;
  if (!session?.currentQuestion || !hintAvailable(session)) return;
  state.hintShown = true;
  state.ui.hintBtn.disabled = true;
  const key = state.keys.get(session.currentQuestion.midi);
  key?.classList.add("is-hinted");
  // Sur un clavier qui défile, la touche désignée peut être hors du cadre :
  // l'indice ne sert à rien s'il faut le chercher.
  key?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function pressKey(midi) {
  if (state.locked || !state.session?.currentQuestion) return;

  // La touche choisie sonne toujours, juste ou fausse : c'est ce qui entretient
  // le lien geste-son (plan/02-lecture-notes.md § 4).
  state.audio.playNote(midi).catch((error) => {
    console.error("Impossible de jouer la note.", error);
  });

  const key = state.keys.get(midi);
  const result = answer(state.session, midi);
  recordAttempt(result, midi);

  if (result.status === "wrong") {
    key?.classList.add("is-wrong");
    later(() => key?.classList.remove("is-wrong"), WRONG_FLASH_MS);
    state.ui.feedback.textContent = `Ce n'est pas ${noteDegreeName(midi)}. Réessaie.`;
    state.ui.feedback.dataset.status = "wrong";
    state.ui.hintBtn.disabled = !hintAvailable(state.session) || state.hintShown;
    state.ui.streak.textContent = `Série : ${state.session.streak}`;
    return;
  }

  if (result.status !== "correct") return;

  // Bonne réponse : on fige l'écran le temps du retour vert.
  state.locked = true;
  key?.classList.add("is-correct");
  state.ui.staff.update(result.question, { reveal: true, status: "correct" });
  state.ui.feedback.textContent = `Bravo, c'était ${noteDegreeName(result.question.midi)}.`;
  state.ui.feedback.dataset.status = "correct";
  state.ui.hintBtn.disabled = true;

  later(() => {
    clearKeyStates();
    state.locked = false;
    state.hintShown = false;
    state.ui.feedback.textContent = "";
    state.ui.feedback.dataset.status = "";
    if (state.session.finished) renderSummary();
    else refreshExercise();
  }, NEXT_QUESTION_MS);
}

// ----------------------------------------------------------------------------
//  Bilan de fin de session
// ----------------------------------------------------------------------------
function renderSummary() {
  closePractice("done");

  const report = summary(state.session);
  const root = el("div", "nr nr--summary");

  root.appendChild(el("h1", "nr-heading", "Session terminée"));

  const stats = el("ul", "nr-stats");
  stats.append(
    statItem(`${report.firstTryCorrect} / ${report.questionCount}`, "reconnues du premier coup"),
    statItem(`${Math.round(report.accuracy * 100)} %`, "de précision"),
    statItem(String(report.bestStreak), "meilleure série")
  );
  root.appendChild(stats);

  // Un bilan global masquerait la main en retard : en mode Les deux, chaque
  // main a le sien (plan/02-lecture-notes.md étape D).
  if (state.session.handMode === "both") {
    const list = el("ul", "nr-hands");
    for (const hand of ["right", "left"]) {
      const counts = report.byHand[hand];
      // Aucune précision affichée pour une main qui n'a rien répondu.
      if (!counts || counts.answered === 0) continue;
      const item = el("li", "nr-hand-stat");
      item.append(
        el("span", "nr-hand-stat-label", HAND_LABEL[hand]),
        el(
          "span",
          "nr-hand-stat-value",
          `${counts.firstTryCorrect} / ${counts.answered} du premier coup · ${Math.round(counts.accuracy * 100)} %`
        )
      );
      list.appendChild(item);
    }
    if (list.childElementCount > 0) {
      root.append(el("h2", "nr-subheading", "Par main"), list);
    }
  }

  if (report.toReview.length > 0) {
    root.appendChild(el("h2", "nr-subheading", "À revoir"));
    const list = el("ul", "nr-review");
    for (const entry of report.toReview) {
      const errors = entry.mistakes > 1 ? "erreurs" : "erreur";
      // En mode Les deux, la main lève l'ambiguïté sur la clé de lecture.
      const hand =
        state.session.handMode === "both" ? `${HAND_LABEL[entry.hand]} · ` : "";
      list.appendChild(
        el(
          "li",
          "nr-review-item",
          `${hand}${noteDegreeName(entry.midi)}${octaveOf(entry.midi)} — ${entry.mistakes} ${errors}`
        )
      );
    }
    root.appendChild(list);
  } else {
    root.appendChild(
      el("p", "nr-lede", "Aucune note à revoir : toutes reconnues du premier coup.")
    );
  }

  // Le seul cas où l'utilisateur doit être prévenu : rien ne sera retrouvé à la
  // prochaine ouverture (navigation privée, stockage refusé ou plein).
  if (!state.progress.persistent) {
    root.appendChild(
      el(
        "p",
        "nr-note",
        "Résultats non enregistrés : le stockage de ce navigateur est indisponible."
      )
    );
  }

  const actions = el("div", "nr-actions");
  const again = el("button", "btn nr-primary", "Recommencer");
  again.type = "button";
  onClick(again, beginSession);

  const settings = el("button", "btn nr-secondary", "Changer de réglages");
  settings.type = "button";
  onClick(settings, renderSetup);

  actions.append(again, settings);
  root.appendChild(actions);

  container.replaceChildren(root);
  state.ui = null;
}

function statItem(value, label) {
  const item = el("li", "nr-stat");
  item.append(el("span", "nr-stat-value", value), el("span", "nr-stat-label", label));
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

// Reprend le niveau et la main de la dernière séance (plan/02 étape D). Un
// réglage devenu invalide est ignoré : les réglages par défaut restent bons.
function restoreSettings() {
  const last = lastSessionContext(state.progress.log(), noteReadingFeature.id);
  if (!last) return;
  const difficulty = last.difficulty ?? state.settings.difficulty;
  const hand = last.handMode ?? state.settings.hand;
  if (isCombinationAvailable(difficulty, hand)) {
    state.settings = { difficulty, hand };
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

  // 2. Clore la séance de progression : quitter en route s'enregistre comme un
  //    abandon, pas comme une séance terminée. `close()` écrit le journal.
  closePractice("abandoned");
  state.progress.flush();

  // 3. Couper le son et libérer la chaîne audio.
  state.audio.dispose();

  // 4. Retirer les écouteurs (boutons de réglage, touches du clavier).
  listeners.abort();
  listeners = null;

  // 5. Rendre la scène.
  container?.replaceChildren();
  container = null;
  state = null;
}
