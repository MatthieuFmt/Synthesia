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
//  Le rouleau est un Canvas comme celui du mode Morceau, et il dessine le même
//  clavier complet de 88 touches : l'élève voit toujours où tombe l'exercice
//  sur son instrument, au lieu d'un fragment recadré qui change à chaque
//  exercice. Les deux rendus se
//  ressemblent sans être le même ; l'extraction d'un `piano-roll.js` commun
//  attend qu'un troisième mode en ait besoin, comme le veut plan/F1 § 6 (rien
//  n'est extrait avant d'être réellement partagé).
//
//  Cycle de vie : `start(container)` construit l'écran et branche ses
//  écouteurs ; `stop()` arrête le transport, libère l'audio et n'en laisse rien.
// ============================================================================

import * as Tone from "https://cdn.jsdelivr.net/npm/tone@14.8.49/+esm";
import { createAudio, midiToNote } from "./audio.js";
import { isWhite, MIDI_HIGH, MIDI_LOW, noteDegreeName, octaveOf, pitchClass } from "./music.js";
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
  FAMILIES,
} from "./exercises/catalog.js";
import { leastRecentlyPracticed } from "./progress/views.js";
import {
  clampRepetitions,
  generateExercise,
  MAX_REPETITIONS,
  MIN_REPETITIONS,
} from "./exercises/generate-exercise.js";
import { summarizeMidiRun, validateRepetition } from "./exercises/validate-run.js";
// Le mode Attente de 06 découpe déjà un flux de notes en accords à jouer d'un
// coup : c'est exactement ce qu'il faut ici, et `song-practice.js` n'a rien de
// propre au mode Morceau dans ces deux fonctions. On l'appelle où il est, comme
// 06 appelle `exercises/validate-run.js` sans le déménager (CLAUDE.md,
// « réutiliser sans déplacer »).
import { groupChords, nextGroupIndex } from "./song-practice.js";
import { midiInput } from "./midi-input.js";
import { createProgressStore } from "./progress/store.js";
import { lastSessionContext } from "./progress/review.js";
import { entriesOfKind, groupByPrefix, loadSongCatalog } from "./song-library.js";
import { switchTo } from "./navigation.js";

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
  wrongKey: "#f87171", // fausse note : signalée, sans rien changer d'autre (même teinte qu'en 06)
  finger: "#0b1220", // chiffre écrit **dans** la note, sur sa couleur claire
  fingerOutside: "#e6edf3", // chiffre écrit à côté, sur le fond du rouleau
  fingerOutsideBg: "rgba(13, 17, 23, .82)", // pastille derrière, pour rester lisible
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
const WRONG_FLASH_MS = 320; // fausse note : assez long pour être vu, assez court pour ne pas gêner
const END_TAIL_S = 0.4; // laisse la dernière note finir de sonner avant le bilan

// Un cran de métronome mécanique. Le bilan le **propose**, il ne l'applique
// jamais tout seul (plan/03 § 10).
const TEMPO_STEP = 4;

// Le tempo proposé à l'ouverture de l'écran de réglages, quel que soit
// l'exercice (09/08/2026). Le catalogue garde son `defaultTempo` par exercice —
// c'est la vitesse à laquelle chacun a été pensé — mais le mode n'en fait plus
// le point de départ : partir toujours du même repère évite de rerégler le
// stepper à chaque changement d'exercice. Le tempo de la dernière séance reste
// prioritaire quand on retrouve le même exercice (cf. `restoreSettings`).
const DEFAULT_TEMPO = 90;

// Le mode ne travaille plus que les deux mains ensemble (09/08/2026) : il n'y a
// plus de main à choisir, donc plus de réglage — et `catalog.js` ne garde plus
// un seul exercice qui ne saurait se jouer ainsi. La valeur reste nommée parce
// que le générateur, le journal et le bilan continuent d'en parler.
const HAND_MODE = "both";

// La main d'une **note**, elle, existe toujours : le rouleau la colore, et le
// bilan compte les fausses notes de chacune — c'est souvent la gauche qui suit
// mal. C'est ce que sert cette table, pas un choix offert à l'utilisateur.
const HAND_LABEL = { right: "Main droite", left: "Main gauche", both: "Les deux mains" };

// Ce que la régularité rythmique dit de la pratique, quand le clavier MIDI l'a
// mesurée (plan/03 § 9). Les catégories viennent du bilan de
// `rhythm/timing.js`, seul jugement avance/retard du projet.
const TIMING_TEXT = {
  steady: "Rythme régulier : tes notes tombent avec la pulsation.",
  early: "Tu anticipes presque toujours : laisse la pulsation arriver.",
  late: "Tu arrives presque toujours après : prépare le geste un peu plus tôt.",
  irregular: "Irrégulier plutôt que décalé : ralentis le tempo avant de le remonter.",
  none: "Aucune note reçue : rien n'a pu être mesuré.",
};

// Comment les deux mains se répartissent le motif, annoncé avant le départ
// (plan/03 § 6). Depuis que la main ne se choisit plus, c'est ce libellé — et
// non « Les deux mains », devenu constant — qui apprend quelque chose sur
// l'exercice qu'on s'apprête à jouer.
const BOTH_MODE_LABEL = {
  parallel: "mouvement parallèle, à l'octave",
  contrary: "mouvement contraire",
  alternating: "mains en alternance",
};

// Sans `bothMode`, l'exercice donne son propre motif à chaque main
// (`patternByHand` : la cadence à quatre voix, le deux contre trois).
function bothModeLabel(exercise) {
  return BOTH_MODE_LABEL[exercise.bothMode] ?? "mains indépendantes";
}

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
      tempo: DEFAULT_TEMPO,
      repetitions: firstExercise.defaultRepetitions,
      metronome: true,
      demo: false, // par défaut, c'est l'utilisateur qui joue
      // Vérifier les notes au clavier MIDI. Sans effet — et sans affichage —
      // tant qu'aucun clavier n'écoute.
      validate: true,
    },

    run: null,         // exercice généré (notes, séries, grille)
    grid: null,

    // Morceaux d'étude : les fichiers MIDI de `songs.json` marqués « exercice ».
    // Chargés une fois pour la session ; vides tant que le catalogue n'a pas
    // répondu, et l'écran de réglages s'en passe alors sans rien annoncer.
    studyPieces: [],
    studyFile: null,   // fichier choisi dans la liste, retenu entre deux rendus

    // Validation MIDI (plan/03 étape D). `null` en pratique libre : rien n'est
    // reçu, donc rien n'est mesuré et rien n'est affiché.
    midi: null,        // { stopNotes, played: [], reports: [] }

    // Mode Attente (plan/03 § 20, 08/08/2026). Toujours actif dès que les notes
    // sont reçues : le rouleau se fige sur chaque note ou accord attendu et ne
    // repart que sur les bonnes touches.
    wait: createWaitState(),

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

function createWaitState() {
  return {
    active: false,
    gates: [],          // accords attendus, dans l'ordre : { time, midis, notes }
    next: -1,           // index du prochain accord à attendre, -1 = plus aucun
    current: null,      // { index, repetition, fails } pendant le gel
    remaining: null,    // notes de l'accord encore à jouer
    wrongKeys: new Set(),
    firstTry: 0,        // accords passés sans une seule fausse note
    passed: 0,
    wrongByRepetition: new Map(), // fausses notes, série par série
    errorsByStep: new Map(),      // où ça a coincé : { step, errors, pitches }
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
  // Ce que font les deux mains est annoncé **avant** le départ (plan/03 § 6).
  // C'était le rôle du bloc « Main travaillée » ; il a disparu, pas la question.
  root.appendChild(el("p", "ex-hint", `Les deux mains : ${bothModeLabel(exercise)}.`));

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

  // La bibliothèque d'études ferme l'écran : c'est l'autre façon de travailler
  // sa technique, pas le chemin principal — et elle emmène dans un autre mode.
  const study = renderStudyLibrary();
  if (study) root.appendChild(study);

  // Le panneau défile lui-même (`.ex { overflow-y: auto }`) et le moindre
  // réglage le redessine en entier : sans cette reprise, toucher « + » ou un
  // interrupteur renvoyait en haut de l'écran à chaque fois, alors qu'on est en
  // bas en train de régler. On ne reprend le défilement que d'un écran de
  // réglages — revenir d'un exercice ou d'un bilan ouvre bien le panneau en haut.
  const previous = container.firstElementChild;
  const scroll = previous?.classList.contains("ex--setup") ? previous.scrollTop : 0;

  container.replaceChildren(root);
  if (scroll > 0) root.scrollTop = scroll;
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

// Toute famille déclarée qui ne contient pas encore d'exercice. La liste était
// écrite en dur — coordination et rythme — et ne suivait donc pas le catalogue :
// les familles ajoutées ensuite n'apparaissaient nulle part, ni jouables ni
// annoncées. Elle se déduit maintenant de ce qui est réellement rempli.
function familiesToCome() {
  const available = new Set(availableFamilies().map((family) => family.id));
  return FAMILIES.filter((family) => !available.has(family.id));
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
        ? "Démonstration : l'application joue les notes, tu écoutes ou tu suis — elle ne t'attend pas."
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
  group.appendChild(el("p", "ex-hint", midiHintText(midi)));
  return group;
}

// Ce que le clavier change réellement, dit avant de commencer : c'est la même
// case qui fait vérifier les notes **et** attendre le rouleau (plan/03 § 20).
function midiHintText(midi) {
  if (!state.settings.validate) {
    return "Vérification coupée : le rouleau défile seul et le bilan ne dira rien de tes notes, comme en pratique libre.";
  }
  if (state.settings.demo) {
    return `Notes lues sur « ${midi.activeDeviceName} ». En démonstration, le rouleau ne t'attend pas : c'est l'application qui joue.`;
  }
  return `Notes lues sur « ${midi.activeDeviceName} » : le rouleau s'arrête sur chaque note et ne repart que quand tu l'as jouée juste.`;
}

// ----------------------------------------------------------------------------
//  Morceaux d'étude
//
//  Les exercices ci-dessus sont **générés** à partir de degrés de gamme, et se
//  jouent sur le rouleau étroit de ce mode. Les fichiers MIDI marqués
//  « exercice » dans `songs.json` — Czerny, Burgmüller, Clementi, Satie, et les
//  exercices produits par `tools/generer-exercice.js` — sont d'une autre nature :
//  ce sont des pièces entières, écrites pour être jouées sur les 88 touches avec
//  la boucle, l'attente et la montée de tempo du sous-mode Travail (plan/06).
//  Ils appartiennent donc au travail technique, mais pas à cet écran : on les
//  ouvre dans le mode Morceau, qui est le lecteur de fichiers de l'application.
//
//  C'est la seule raison pour laquelle ils quittaient auparavant la bibliothèque
//  du mode Morceau : ils y noyaient les quatre morceaux du répertoire.
// ----------------------------------------------------------------------------
function renderStudyLibrary() {
  if (state.studyPieces.length === 0) return null;

  const group = el("fieldset", "ex-choice ex-study");
  group.appendChild(el("legend", "ex-choice-legend", "Morceaux d'étude"));
  group.appendChild(
    el(
      "p",
      "ex-hint",
      "Des études et pièces courtes en MIDI, à travailler sur le rouleau complet du mode Morceau."
    )
  );

  const row = el("div", "ex-study-row");

  const select = el("select", "ex-study-select");
  select.setAttribute("aria-label", "Morceau d'étude");
  for (const { label, entries } of groupByPrefix(state.studyPieces)) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = label;
    for (const { song } of entries) {
      optgroup.appendChild(new Option(song.title, song.file));
    }
    select.appendChild(optgroup);
  }
  select.value = state.studyFile ?? state.studyPieces[0].song.file;
  state.studyFile = select.value;
  select.addEventListener(
    "change",
    () => {
      state.studyFile = select.value;
    },
    { signal: listeners.signal }
  );

  const open = el("button", "btn ex-study-open", "Ouvrir");
  open.type = "button";
  // `switchTo` arrête ce mode avant de démarrer le suivant : rien de ce qui
  // tourne ici ne survit au changement, comme pour n'importe quel autre.
  onClick(open, () => switchTo("song", { songFile: state.studyFile }));

  row.append(select, open);
  group.appendChild(row);
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
  state.settings.tempo = DEFAULT_TEMPO;
  state.settings.repetitions = exercise.defaultRepetitions;
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
    hand: HAND_MODE,
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
  // Les portes de l'attente se construisent après la capture : c'est elle qui
  // dit si des notes seront reçues, donc si l'attente s'applique.
  buildGates();

  state.practice = state.progress.openSession(exerciseFeature.id, {
    exerciseId: exercise.id,
    family: exercise.family,
    handMode: HAND_MODE,
    key: run.key,
    tempo: run.tempo,
    repetitions: run.repetitions,
    metronome: state.settings.metronome,
    demo: state.settings.demo,
    // Ce qui a réellement servi à juger, pas ce qui était demandé : une séance
    // relue plus tard doit savoir si ses notes ont été vues, et si le rouleau
    // l'a attendue — une série jouée en attente n'a pas la même valeur qu'une
    // série jouée au fil du métronome.
    validated: state.midi !== null,
    wait: state.wait.active,
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
  const handLabel = el("span", "ex-run-hand", bothModeLabel(exercise));
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
//  Le clavier est toujours dessiné en entier — les 88 touches, comme dans le
//  mode Morceau — même quand l'exercice n'en emploie que cinq. Recadrer sur
//  l'étendue de l'exercice donnait des touches plus larges, mais déplaçait les
//  notes d'un exercice à l'autre : le même Do ne tombait jamais au même endroit,
//  et rien ne disait où l'on se trouvait sur l'instrument réel.
// ----------------------------------------------------------------------------
function keyboardRange() {
  return { low: MIDI_LOW, high: MIDI_HIGH };
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
  drawWaitBanner(w, keyboardTop);
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

    if (note.finger) drawFinger(note, g, yTop, height, width);
  }
}

// ----------------------------------------------------------------------------
//  Le doigté chiffré — 1 le pouce, 5 l'auriculaire
//
//  Il s'écrit **dans** la note quand elle est assez grande, et juste **à côté**
//  quand elle ne l'est pas. L'ancienne version renonçait en dessous de 16 px de
//  haut : c'est-à-dire exactement sur une gamme en doubles-croches, là où
//  l'élève a le plus besoin de savoir quel doigt vient. Un exercice technique
//  sans doigté n'est plus un exercice technique.
//
//  À côté veut dire au-dessus pour la main droite, en dessous pour la gauche :
//  les deux mains se croisent rarement dans un exercice, et chacune garde ainsi
//  son côté sans que les deux chiffres se superposent.
// ----------------------------------------------------------------------------
const FINGER_INSIDE_MIN_HEIGHT = 15;
const FINGER_OUTSIDE_GAP = 2;

function drawFinger(note, g, yTop, height, width) {
  // Sur les 88 touches, une noire tombe sous les dix pixels de large : un
  // chiffre de 9 px y tient encore, et c'est ce qui compte — un exercice
  // technique sans doigté n'est plus un exercice technique. En dessous, rien
  // d'autre ne serait lisible non plus.
  const size = width >= 18 ? 12 : width >= 11 ? 10 : width >= 6 ? 9 : 0;
  if (size === 0) return;

  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const text = String(note.finger);

  if (height >= FINGER_INSIDE_MIN_HEIGHT) {
    ctx.fillStyle = COLORS.finger;
    ctx.fillText(text, g.centerX, yTop + height / 2);
  } else {
    // Pastille derrière le chiffre : sans elle, un 3 posé sur une autre note du
    // rouleau devient illisible dès que deux voix se croisent.
    const radius = size * 0.72;
    const cy =
      note.hand === "right"
        ? yTop - FINGER_OUTSIDE_GAP - radius
        : yTop + height + FINGER_OUTSIDE_GAP + radius;
    ctx.fillStyle = COLORS.fingerOutsideBg;
    ctx.beginPath();
    ctx.arc(g.centerX, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.fingerOutside;
    ctx.fillText(text, g.centerX, cy);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
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
    if (state.wait.wrongKeys.has(midi)) {
      ctx.fillStyle = COLORS.wrongKey;
      roundRectBottom(g.x + 0.5, whiteTop, g.width - 1, whiteHeight, 4);
      ctx.fill();
    }
  }

  // Sur 88 touches, une blanche est trop étroite pour porter son nom : on ne
  // marque que les Do, comme dans le mode Morceau. Sur un écran assez large
  // pour que le nom tienne, on nomme toutes les blanches — c'est plus utile à
  // un débutant, et rien ne se chevauche.
  const namesFit = layout.whiteKeyWidth >= 26;
  ctx.fillStyle = "#6b6355";
  ctx.font = "10px system-ui, sans-serif";
  ctx.textAlign = "center";
  for (let midi = layout.low; midi <= layout.high; midi++) {
    if (!isWhite(midi)) continue;
    const isDo = pitchClass(midi) === 0;
    if (!namesFit && !isDo) continue;
    const g = layout.geometries[midi];
    ctx.fillText(isDo ? `Do${octaveOf(midi)}` : noteDegreeName(midi), g.centerX, h - 6);
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
    if (state.wait.wrongKeys.has(midi)) {
      ctx.fillStyle = COLORS.wrongKey;
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

// Mode Attente : dire pourquoi le rouleau ne bouge plus, et quelles notes il
// réclame encore. Un rouleau figé sans explication passe pour un plantage — et
// les touches attendues sont déjà allumées sur le clavier, puisqu'elles sont à
// la ligne de lecture.
function drawWaitBanner(w, keyboardTop) {
  const wait = state.wait;
  if (!wait.current) return;

  const text = `En attente de ${noteNames(wait.remaining)}`;
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const width = ctx.measureText(text).width + 24;
  const height = 26;
  const y = Math.max(4, keyboardTop / 2 - height / 2);
  ctx.fillStyle = COLORS.fingerOutsideBg;
  roundRect(w / 2 - width / 2, y, width, height, height / 2);
  ctx.fill();
  ctx.fillStyle = COLORS.countIn;
  ctx.fillText(text, w / 2, y + height / 2);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function noteNames(midis) {
  return [...midis]
    .sort((a, b) => a - b)
    .map((midi) => `${noteDegreeName(midi)}${octaveOf(midi)}`)
    .join(" + ");
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

  // Mode Attente : le rouleau se fige sur l'accord dû et rend la main. Il ne
  // repartira que sur les bonnes notes (`leaveWait`), pas à l'image suivante.
  if (enterWaitIfDue(state.currentTime)) return;

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
    hand: HAND_MODE,
    key: state.run.key,
    tempo: state.run.tempo,
    repetition: index,
  };

  // En mode Attente, il n'y a rien à apparier : toutes les notes attendues ont
  // été jouées, sinon la série ne serait pas finie. Ce que la série apprend,
  // c'est le nombre de fausses notes qu'il a fallu pour y arriver — et le
  // timing n'a pas de sens quand c'est l'élève qui donne le départ de chaque
  // note (`meanFraction: null`, comme une séance sans mesure).
  if (state.wait.active) {
    const wrong = state.wait.wrongByRepetition.get(index) ?? 0;
    const total = state.run.notes.filter((note) => note.repetition === index).length;
    state.practice?.record({
      type: "run",
      target,
      outcome: wrong === 0 ? "clean" : "flawed",
      given: { correct: total, total, extras: wrong, meanFraction: null },
    });
    return;
  }

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
//  Mode Attente (plan/03 § 20)
//
//  Le rouleau se fige sur chaque note — ou chaque accord — et ne repart que
//  quand elle est réellement jouée. Ce n'est pas un réglage : dès que
//  l'application reçoit les notes, elle attend. Un exercice technique se joue
//  juste ou ne se joue pas, et défiler sans l'élève n'apprend rien.
//
//  Deux exceptions, pour ne pas rendre le mode inutilisable :
//
//   - **sans clavier qui écoute**, rien ne peut ouvrir la porte : la pratique
//     libre reste le fonctionnement normal (plan/03 § 3, plan/F2 § 7 — le MIDI
//     est toujours une amélioration optionnelle, jamais un prérequis) ;
//   - **en démonstration**, c'est l'application qui joue : attendre l'élève
//     n'aurait aucun sens.
//
//  Le gel se fait sur le Transport, comme dans le mode Morceau : c'est lui qui
//  tient l'horloge, et le métronome comme le rouleau s'arrêtent avec lui.
// ----------------------------------------------------------------------------
function waitApplies() {
  return state.midi !== null && !state.settings.demo;
}

function buildGates() {
  const wait = createWaitState();
  state.wait = wait;
  if (!waitApplies()) return;

  // Les notes sont déjà triées par temps : un accord est un paquet de notes
  // attaquées ensemble, main gauche et main droite comprises.
  wait.active = true;
  wait.gates = groupChords(state.run.notes);
  wait.next = nextGroupIndex(wait.gates, state.currentTime, -1e-3);
}

// Vrai si l'attente tient le rouleau : `tick()` s'arrête alors là.
function enterWaitIfDue(time) {
  const wait = state.wait;
  if (!wait.active) return false;

  // Reprise après une pause de l'utilisateur : l'attente était toujours en
  // cours, et les notes déjà jouées de l'accord le restent. Il faut re-figer le
  // Transport, que `play()` vient de relancer.
  if (wait.current) {
    freeze(wait.gates[wait.current.index].time);
    return true;
  }

  const index = wait.next;
  if (index < 0 || index >= wait.gates.length) return false;
  const gate = wait.gates[index];
  if (time < gate.time) return false;

  wait.current = { index, repetition: gate.notes[0].repetition ?? 1, fails: 0 };
  wait.remaining = new Set(gate.midis);
  freeze(gate.time);
  return true;
}

// Fige le rouleau exactement sur l'attaque de l'accord, plutôt que sur la
// fraction d'image de dépassement. C'est le Transport qui tient l'horloge :
// l'arrêter arrête du même coup le métronome et l'animation.
function freeze(time) {
  state.currentTime = time;
  Tone.Transport.pause();
  Tone.Transport.seconds = time;
  if (state.animationFrame !== null) {
    cancelAnimationFrame(state.animationFrame);
    state.animationFrame = null;
  }
  syncRunUI();
  drawImmediately();
}

// Reprend le défilement là où il s'était arrêté.
function leaveWait() {
  const wait = state.wait;
  if (!wait.current) return;

  wait.passed++;
  if (wait.current.fails === 0) wait.firstTry++;
  wait.next = wait.current.index + 1;
  wait.current = null;
  wait.remaining = null;
  syncRunUI();

  if (!state.isPlaying) {
    drawImmediately();
    return;
  }
  Tone.Transport.seconds = state.currentTime;
  Tone.Transport.start();
  state.lastVisualFrame = -Infinity;
  if (state.animationFrame !== null) cancelAnimationFrame(state.animationFrame);
  state.animationFrame = requestAnimationFrame(tick);
}

// Une note jouée par l'utilisateur, d'où qu'elle vienne : clavier physique ou
// touches du rouleau. Hors attente, elle n'a rien à ouvrir — l'appelant l'a
// déjà fait sonner et allumée sur le clavier.
function notePlayed(midi) {
  const wait = state.wait;
  if (!wait.current) return;

  // La bonne note ouvre la porte ; une fausse est signalée sans faire reculer
  // l'exercice ni passer la note (même règle qu'en 06 § 7).
  if (wait.remaining.delete(midi)) {
    if (wait.remaining.size === 0) leaveWait();
    else scheduleDraw();
    return;
  }

  wait.current.fails++;
  recordWrongPress(midi);
  flashKey(wait.wrongKeys, midi, WRONG_FLASH_MS);
}

// Une fausse note s'inscrit sur la série en cours — pour le verdict de la
// série — et sur le pas du motif — pour le « À retravailler » du bilan. Les
// hauteurs retenues sont celles **attendues**, pas celle jouée : ce qu'on doit
// retravailler est l'accord, pas le doigt qui a glissé.
function recordWrongPress(midi) {
  const wait = state.wait;
  const { repetition, index } = wait.current;
  wait.wrongByRepetition.set(repetition, (wait.wrongByRepetition.get(repetition) ?? 0) + 1);

  const gate = wait.gates[index];
  const step = gate.notes[0].step ?? 0;
  if (!wait.errorsByStep.has(step)) {
    wait.errorsByStep.set(step, { step, errors: 0, pitches: new Set(gate.midis) });
  }
  wait.errorsByStep.get(step).errors++;
}

// Ce que l'attente a réellement mesuré. `null` quand elle n'a pas servi : le
// bilan ne montre alors rien plutôt que des zéros trompeurs.
function waitSummary() {
  const wait = state.wait;
  if (!wait.active || wait.passed === 0) return null;

  const wrong = [...wait.wrongByRepetition.values()].reduce((sum, n) => sum + n, 0);
  const toRework = [...wait.errorsByStep.values()]
    .sort((a, b) => b.errors - a.errors || a.step - b.step)
    .slice(0, 2)
    .map((entry) => ({
      step: entry.step,
      errors: entry.errors,
      label: noteNames(entry.pitches),
    }));

  return { passed: wait.passed, firstTry: wait.firstTry, wrong, toRework };
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

    flashKey(state.pressedKeys, event.midi, KEY_PRESS_MS);

    // En mode Attente, l'exercice ne défile plus tout seul : l'instant d'une
    // note est celui où l'élève ouvre la porte, il ne mesure aucune régularité.
    // On ne collecte donc rien pour le jugement avance/retard — le bilan dit ce
    // que l'attente, elle, a réellement vu.
    if (state.wait.active) {
      notePlayed(event.midi);
      return;
    }

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
    el("p", "ex-lede", `${exercise.title} — ${HAND_LABEL[HAND_MODE]}`)
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
  const waitReport = waitSummary();
  const midiReport =
    !waitReport && state.midi && state.midi.reports.length > 0
      ? summarizeMidiRun(state.midi.reports)
      : null;

  if (waitReport) {
    renderWaitReport(root, waitReport);
  } else if (midiReport) {
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

// ----------------------------------------------------------------------------
//  Bilan d'une séance en mode Attente
//
//  L'attente ne mesure ni précision ni régularité : elle ne laisse pas passer
//  une note fausse, et c'est l'élève qui donne le départ de chacune. Ce qu'elle
//  sait dire, en revanche, aucune autre séance ne le sait : combien d'accords
//  sont sortis **du premier coup**, et lesquels ont résisté.
// ----------------------------------------------------------------------------
function renderWaitReport(root, report) {
  root.appendChild(el("h2", "ex-subheading", "Tes notes"));

  const stats = el("ul", "ex-stats");
  stats.append(
    statItem(`${report.firstTry} / ${report.passed}`, "du premier coup"),
    statItem(
      `${Math.round((report.firstTry / report.passed) * 100)} %`,
      "sans hésitation"
    ),
    statItem(String(report.wrong), report.wrong > 1 ? "fausses notes" : "fausse note")
  );
  root.appendChild(stats);

  root.appendChild(
    el(
      "p",
      "ex-tendency",
      report.wrong === 0
        ? "Aucune fausse note : le rouleau ne t'a jamais attendu pour rien."
        : "Le rouleau t'a attendu à chaque note : la régularité, elle, ne se mesure qu'en jouant au fil du métronome."
    )
  );

  if (report.toRework.length > 0) {
    root.appendChild(el("h2", "ex-subheading", "À retravailler"));
    const list = el("ul", "ex-review");
    for (const entry of report.toRework) {
      list.appendChild(
        el(
          "li",
          "ex-review-item",
          `Pas ${entry.step + 1} — ${entry.label} : ${entry.errors} fausse${entry.errors > 1 ? "s" : ""} note${entry.errors > 1 ? "s" : ""} avant de passer`
        )
      );
    }
    root.appendChild(list);
  }
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
  flashKey(session.pressedKeys, midi, KEY_PRESS_MS);
  // Une touche du rouleau vaut une note jouée : elle ouvre l'attente comme le
  // ferait le clavier physique.
  notePlayed(midi);

  try {
    await session.audio.playNote(midi);
  } catch (error) {
    console.error("Impossible de jouer la note.", error);
  }
}

// Allume une touche un court instant. Le même mécanisme sert à la touche
// pressée et à la fausse note : deux ensembles, deux couleurs, un seul timer.
function flashKey(keys, midi, duration) {
  const session = state;
  keys.add(midi);
  scheduleDraw();
  const timer = setTimeout(() => {
    session.keyPressTimers.delete(timer);
    if (session.stopped) return;
    keys.delete(midi);
    scheduleDraw();
  }, duration);
  session.keyPressTimers.add(timer);
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
  loadStudyPieces();
}

// Le catalogue arrive après le premier rendu : l'écran de réglages ne doit pas
// attendre un `fetch` pour s'afficher. La liste apparaît quand elle est prête,
// et seulement si l'utilisateur est encore sur cet écran — un rendu de réglages
// par-dessus une séance en cours l'effacerait.
async function loadStudyPieces() {
  const session = state;
  await loadSongCatalog();
  if (session.stopped || state !== session) return;
  session.studyPieces = entriesOfKind("exercice");
  if (session.studyPieces.length > 0 && session.run === null) renderSetup();
}

// Reprend les réglages de la dernière séance, comme la Lecture de notes
// (plan/02 étape D). Un réglage devenu invalide est ignoré plutôt que corrigé.
//
// **Sauf l'exercice lui-même**, depuis le 30/07/2026. Rouvrir le dernier était
// juste tant qu'une famille n'en contenait qu'un ; à trois exercices par niveau
// et onze familles, cela revenait à en proposer **un sur quatre-vingt-dix-neuf**,
// tous les jours, indéfiniment. On garde donc la famille et le niveau — on ne
// change pas de sujet sans le vouloir — et on propose, dedans, celui qui n'a pas
// été travaillé depuis le plus longtemps. Celui qu'on n'a jamais fait passe en
// premier.
//
// Le reste des réglages — tempo, métronome, démonstration — vient bien de la
// dernière séance : ce sont des préférences, pas un contenu à faire tourner. La
// main n'en fait plus partie : elle ne se règle plus (`HAND_MODE`). Les séances
// déjà écrites gardent leur `handMode`, on ne le relit simplement plus.
function restoreSettings() {
  const last = lastSessionContext(state.progress.log(), exerciseFeature.id);
  if (!last) return;

  const dernier = exerciseById(last.exerciseId);
  if (!dernier) return;

  const voisins = exercisesOfFamily(dernier.family, dernier.difficulty);
  const propose = leastRecentlyPracticed(state.progress.log(), {
    candidates: voisins.map((candidat) => candidat.id),
    featureIds: [exerciseFeature.id],
  });
  const exercise = exerciseById(propose) ?? dernier;
  state.settings.exerciseId = exercise.id;
  // Le nombre de répétitions de l'exercice **proposé** prime sur celui de la
  // séance passée quand on change d'exercice. Le tempo, lui, repart du repère
  // commun (`DEFAULT_TEMPO`) : il n'est repris de la dernière séance que si
  // c'est le même exercice qu'on retrouve — un trille ne se travaille pas au
  // tempo d'un accord.
  const memeExercice = exercise.id === last.exerciseId;
  state.settings.tempo = clampTempo(
    memeExercice ? last.tempo ?? DEFAULT_TEMPO : DEFAULT_TEMPO
  );
  state.settings.repetitions = clampRepetitions(
    memeExercice ? last.repetitions ?? exercise.defaultRepetitions : exercise.defaultRepetitions
  );
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
