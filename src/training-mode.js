// ============================================================================
//  Mode Programme d'entraînement (feature 04)
//
//  Un seul écran : la séance du jour telle que le professeur
//  (`training-coach.js`) l'a composée, la semaine écoulée, et le seul réglage
//  qui reste — combien de temps par jour. L'utilisateur ne choisit plus quoi
//  travailler : c'est justement le travail du programme (plan/04 § 2).
//
//  Rien ne défile, rien ne sonne : le rendu est en DOM, comme la Lecture de
//  notes, pour des cibles tactiles franches et aucune boucle d'animation
//  (CLAUDE.md, contraintes matérielles).
//
//  Ce mode ne tient **aucun** historique : les séances terminées sont celles du
//  journal de progression (F3), lues par le coach (plan/04 § 6, plan/F3 § 5).
//  Il ne tient pas non plus sa propre liste de fonctionnalités : elle vient du
//  registre de la navigation (plan/04 § 11).
//
//  Démarrer un bloc quitte ce mode pour la fonctionnalité choisie. Le
//  programme n'a aucune présence pendant la séance : il se met à jour à sa
//  réouverture, puisque le journal fait foi (§ 15, décision du 26/07/2026).
// ============================================================================

import { availableFeatures, switchTo } from "./navigation.js";
import { createProgressStore } from "./progress/store.js";
import { completedSessions } from "./progress/views.js";
import { planDay } from "./training-coach.js";
import {
  createTrainingStore,
  DAILY_MINUTES_CHOICES,
  startOfDayOffset,
} from "./training-program.js";

// Ce que le programme ne peut pas planifier : lui-même.
const SELF_ID = "training";

// Précisions propres à une fonctionnalité dont la séance ne va pas de soi.
// Écouter un morceau n'est pas une séance : c'est le travail d'un passage qui
// en est une (plan/06, plan/04 § 10).
const FEATURE_HINTS = {
  song: "Le temps compte quand un passage est travaillé (bouton Travail).",
};

const RECAP_DAYS = 7;

// ----------------------------------------------------------------------------
//  Fiche de la fonctionnalité (registre de la navigation)
// ----------------------------------------------------------------------------
export const trainingFeature = {
  id: SELF_ID,
  title: "Programme",
  description: "Ta séance du jour, composée pour le temps dont tu disposes.",
  status: "available",
  start,
  stop,
};

// ----------------------------------------------------------------------------
//  État du mode
// ----------------------------------------------------------------------------
let container = null;
let state = null;
let listeners = null; // AbortController : retire tous les écouteurs d'un coup

function createModeState() {
  return {
    store: createTrainingStore(),
    progress: createProgressStore(), // lu seulement : ce mode n'écrit rien dedans
    features: [],                    // fonctionnalités programmables (registre F1)
  };
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

function button(className, label) {
  const node = el("button", className, label);
  node.type = "button";
  return node;
}

function onClick(node, handler) {
  node.addEventListener("click", handler, { signal: listeners.signal });
}

function featureTitle(featureId) {
  return state.features.find((feature) => feature.id === featureId)?.title ?? featureId;
}

function programmableFeatures() {
  // L'écran Progression se consulte, il ne se pratique pas : le planifier
  // créerait un bloc impossible à « faire » (il n'écrit rien au journal).
  return availableFeatures().filter(
    (feature) => feature.id !== SELF_ID && feature.id !== "progress"
  );
}

// ----------------------------------------------------------------------------
//  Écran unique
// ----------------------------------------------------------------------------
function render() {
  const log = state.progress.log();
  const plan = planDay(
    state.features.map((feature) => feature.id),
    log,
    { dailyMinutes: state.store.dailyMinutes }
  );

  const root = el("div", "tp");
  root.append(el("h1", "tp-heading", "Ta séance du jour"), el("p", "tp-date", todayLabel()));

  if (!state.store.configured) {
    root.appendChild(
      el(
        "p",
        "tp-lede",
        "Tu n'as rien à composer : dis seulement combien de temps tu as, et " +
          "la séance est écrite pour toi — échauffement, lecture, morceau, " +
          "oreille. Elle change chaque jour pour que rien ne soit oublié."
      )
    );
  }

  if (plan.blocks.length === 0) {
    root.appendChild(el("p", "tp-lede", "Aucune fonctionnalité disponible pour composer une séance."));
  } else {
    if (plan.complete) {
      root.appendChild(el("p", "tp-all-done", "Séance terminée pour aujourd'hui."));
    } else {
      root.appendChild(
        el(
          "p",
          "tp-progress",
          `${plan.doneCount} bloc${plan.doneCount > 1 ? "s" : ""} sur ${plan.blocks.length}` +
            ` · ${plan.remainingMinutes} min restantes sur ${plan.dailyMinutes}`
        )
      );
    }
    root.appendChild(renderBlocks(plan));
  }

  root.appendChild(renderWeek(log));
  root.appendChild(renderDuration());

  if (!state.store.persistent) {
    root.appendChild(
      el(
        "p",
        "tp-note",
        "Réglage non enregistré : le stockage de ce navigateur est indisponible."
      )
    );
  }

  container.replaceChildren(root);
}

function todayLabel() {
  const formatted = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function renderBlocks(plan) {
  const list = el("ol", "tp-list");
  plan.blocks.forEach((block, index) => {
    list.appendChild(renderBlockItem(block, index + 1));
  });
  return list;
}

function renderBlockItem(block, position) {
  const item = el("li", "tp-item");
  item.dataset.state = block.done ? "done" : block.started ? "started" : "todo";

  const main = el("div", "tp-item-main");
  const head = el("div", "tp-item-head");
  head.append(
    el("span", "tp-item-step", block.done ? "✓" : String(position)),
    el("span", "tp-item-title", featureTitle(block.featureId)),
    // Un bloc entamé montre le chemin parcouru : il ne se coche qu'une fois sa
    // durée réellement pratiquée (plan/04 § 7).
    el(
      "span",
      "tp-item-minutes",
      block.started
        ? `${block.practicedMinutes} / ${block.minutes} min`
        : `${block.minutes} min`
    )
  );
  main.appendChild(head);
  main.appendChild(el("span", "tp-item-meta", `${block.label} — ${block.why}`));

  const hint = FEATURE_HINTS[block.featureId];
  if (hint) main.appendChild(el("span", "tp-item-hint", hint));

  const side = el("div", "tp-item-side");
  side.appendChild(
    el("span", "tp-item-state", block.done ? "Fait" : block.started ? "En cours" : "À faire")
  );

  // Le bouton reste proposé même quand le bloc est fait : pratiquer plus que
  // prévu ne doit jamais être empêché (plan/04 § 10).
  const start = button(
    "btn tp-start",
    block.done ? "Refaire" : block.started ? "Continuer" : "Démarrer"
  );
  onClick(start, () => switchTo(block.featureId));
  side.appendChild(start);

  item.append(main, side);
  return item;
}

// ----------------------------------------------------------------------------
//  La semaine écoulée
//
//  Sept points, un par jour : pratiqué ou non. Pas une vue de progression —
//  celle-ci vit dans l'écran Progression (F3) — mais le seul repère qu'un
//  professeur donnerait ici : la régularité.
// ----------------------------------------------------------------------------
function renderWeek(log) {
  const section = el("section", "tp-week");
  section.append(el("h2", "tp-section-title", "Ces sept derniers jours"));

  const days = el("div", "tp-week-days");
  let practiced = 0;

  for (let offset = RECAP_DAYS - 1; offset >= 0; offset--) {
    const from = startOfDayOffset(Date.now(), -offset);
    const to = startOfDayOffset(Date.now(), -offset + 1);
    const count = completedSessions(log, { from, to }).length;
    if (count > 0) practiced++;

    const day = el("div", "tp-week-day");
    day.dataset.state = count > 0 ? "done" : "empty";
    if (offset === 0) day.dataset.today = "true";
    const date = new Date(from);
    day.append(
      el("span", "tp-week-mark", count > 0 ? "●" : "○"),
      el("span", "tp-week-label", date.toLocaleDateString("fr-FR", { weekday: "narrow" }))
    );
    day.title = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    days.appendChild(day);
  }

  section.append(
    days,
    el(
      "p",
      "tp-note",
      practiced === 0
        ? "Aucune séance cette semaine — la première est la plus dure."
        : `${practiced} jour${practiced > 1 ? "s" : ""} pratiqué${practiced > 1 ? "s" : ""} sur ${RECAP_DAYS}.`
    )
  );
  return section;
}

// ----------------------------------------------------------------------------
//  Le seul réglage
// ----------------------------------------------------------------------------
function renderDuration() {
  const section = el("section", "tp-duration");
  section.append(el("h2", "tp-section-title", "Combien de temps par jour ?"));

  const choices = el("div", "tp-choices");
  choices.setAttribute("role", "group");
  choices.setAttribute("aria-label", "Durée de la séance quotidienne");

  const current = state.store.dailyMinutes;
  for (const minutes of DAILY_MINUTES_CHOICES) {
    const selected = minutes === current;
    const node = button("tp-choice-btn", `${minutes} min`);
    node.setAttribute("aria-pressed", String(selected));
    if (selected) node.classList.add("is-selected");
    onClick(node, () => {
      state.store.save(minutes);
      render(); // la séance se recompose aussitôt : les blocs changent de longueur
    });
    choices.appendChild(node);
  }
  section.appendChild(choices);

  section.appendChild(
    el(
      "p",
      "tp-note",
      "Rien ne s'arrête tout seul : un bloc se coche une fois sa durée " +
        "réellement pratiquée, et tu peux toujours continuer au-delà. En " +
        "dessous de quinze minutes, la séance se réduit aux blocs les plus " +
        "importants."
    )
  );
  return section;
}

// ----------------------------------------------------------------------------
//  Cycle de vie de la fonctionnalité
// ----------------------------------------------------------------------------
function start(host) {
  container = host;
  state = createModeState();
  listeners = new AbortController();
  state.features = programmableFeatures();

  render();
}

function stop() {
  if (!state) return;

  // Aucun audio, aucune minuterie, aucune boucle d'animation : il n'y a que des
  // écouteurs et du DOM à rendre.
  listeners.abort();
  listeners = null;

  container?.replaceChildren();
  container = null;
  state = null;
}
