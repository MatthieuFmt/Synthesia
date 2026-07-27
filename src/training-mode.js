// ============================================================================
//  Mode Programme d'entraînement (feature 04)
//
//  Deux écrans : « Aujourd'hui », qui dit ce qu'il reste à travailler, et la
//  configuration du programme. Rien ne défile, rien ne sonne : le rendu est en
//  DOM, comme la Lecture de notes, pour des cibles tactiles franches et aucune
//  boucle d'animation (CLAUDE.md, contraintes matérielles).
//
//  Ce mode ne tient **aucun** historique : les séances terminées sont celles du
//  journal de progression (F3), lues par `dueToday` (plan/04 § 6, plan/F3 § 5).
//  Il ne tient pas non plus sa propre liste de fonctionnalités : elle vient du
//  registre de la navigation (plan/04 § 11).
//
//  Démarrer une séance quitte ce mode pour la fonctionnalité choisie. Le
//  programme n'a aucune présence pendant la séance : il se met à jour à sa
//  réouverture, puisque le journal fait foi (§ 15, décision du 26/07/2026).
// ============================================================================

import { availableFeatures, switchTo } from "./navigation.js";
import { createProgressStore } from "./progress/store.js";
import {
  allDone,
  createTrainingStore,
  defaultItem,
  dueToday,
  DURATION_STEP_MINUTES,
  frequencyLabel,
  MAX_DURATION_MINUTES,
  maxQuota,
  MIN_DURATION_MINUTES,
  normalizeDuration,
  periodLabel,
  quotaOf,
  withFrequencyType,
  withQuota,
} from "./training-program.js";

const FREQUENCY_CHOICES = [
  { type: "daily", label: "Chaque jour" },
  { type: "weekly", label: "Par semaine" },
  { type: "monthly", label: "Par mois" },
];

// Ce que le programme ne peut pas planifier : lui-même.
const SELF_ID = "training";

// Précisions propres à une fonctionnalité dont la séance ne va pas de soi.
// Écouter un morceau n'est pas une séance : c'est le travail d'un passage qui
// en est une (plan/06, plan/04 § 10).
const FEATURE_HINTS = {
  song: "Compte quand un passage est travaillé (bouton Travail).",
};

// ----------------------------------------------------------------------------
//  Fiche de la fonctionnalité (registre de la navigation)
// ----------------------------------------------------------------------------
export const trainingFeature = {
  id: SELF_ID,
  title: "Programme",
  description: "Ce qu'il reste à travailler aujourd'hui, et à quelle fréquence.",
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
    draft: null,                     // brouillon de l'écran de configuration
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
  return availableFeatures().filter((feature) => feature.id !== SELF_ID);
}

function featureIds() {
  return state.features.map((feature) => feature.id);
}

// Le programme du stockage, débarrassé de ce que le registre ne propose plus.
function currentProgram() {
  return state.store.program({ availableFeatureIds: featureIds() });
}

// ----------------------------------------------------------------------------
//  Écran d'accueil du mode : aucun programme encore créé
// ----------------------------------------------------------------------------
function renderIntro() {
  const root = el("div", "tp tp--intro");
  root.append(
    el("h1", "tp-heading", "Programme d'entraînement"),
    el(
      "p",
      "tp-lede",
      "Choisis ce que tu veux travailler, à quelle fréquence et combien de " +
        "temps par séance. L'écran Aujourd'hui te dira ensuite ce qu'il reste " +
        "à faire."
    )
  );

  const create = button("btn tp-primary", "Créer un programme");
  onClick(create, () => openSetup());
  root.appendChild(create);

  container.replaceChildren(root);
}

// ----------------------------------------------------------------------------
//  Écran « Aujourd'hui » (plan/04 § 8)
// ----------------------------------------------------------------------------
function renderToday() {
  const program = currentProgram();
  const status = dueToday(program, state.progress.log());

  const root = el("div", "tp tp--today");
  root.append(el("h1", "tp-heading", "Aujourd'hui"), el("p", "tp-date", todayLabel()));

  if (status.length === 0) {
    root.appendChild(
      el("p", "tp-lede", "Aucune fonctionnalité au programme pour le moment.")
    );
  } else {
    // Un état visible quand il ne reste rien : une liste toute cochée ne le dit
    // pas assez clairement (plan/04 § 8).
    if (allDone(status)) {
      root.appendChild(el("p", "tp-all-done", "Tout est fait pour aujourd'hui."));
    }
    root.appendChild(renderStatusList(status));
  }

  const actions = el("div", "tp-actions");
  const edit = button("btn tp-secondary", "Modifier le programme");
  onClick(edit, () => openSetup());
  actions.appendChild(edit);
  root.appendChild(actions);

  if (!state.store.persistent) {
    root.appendChild(
      el(
        "p",
        "tp-note",
        "Programme non enregistré : le stockage de ce navigateur est indisponible."
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

function renderStatusList(status) {
  const list = el("ul", "tp-list");
  for (const entry of status) {
    list.appendChild(renderStatusItem(entry));
  }
  return list;
}

function renderStatusItem(entry) {
  const item = el("li", "tp-item");
  item.dataset.state = entry.due ? "todo" : "done";

  const main = el("div", "tp-item-main");
  main.appendChild(el("span", "tp-item-title", featureTitle(entry.featureId)));

  const meta = [frequencyLabel(entry.frequency), `${entry.sessionDurationMinutes} min`];
  // Le compteur de période n'a de sens qu'au-delà d'une séance attendue : en
  // quotidien, « 1 / 1 aujourd'hui » n'apprend rien que l'étiquette ne dise.
  if (entry.quota > 1) {
    meta.push(`${entry.doneInPeriod} / ${entry.quota} ${periodLabel(entry.frequency)}`);
  }
  main.appendChild(el("span", "tp-item-meta", meta.join(" · ")));

  const hint = FEATURE_HINTS[entry.featureId];
  if (hint) main.appendChild(el("span", "tp-item-hint", hint));

  const side = el("div", "tp-item-side");
  side.appendChild(
    el("span", "tp-item-state", entry.due ? "À faire" : entry.doneToday > 0 ? "Fait" : "Quota atteint")
  );

  // Le bouton reste proposé même quand la séance est faite : pratiquer plus que
  // prévu ne doit jamais être empêché (plan/04 § 10).
  const start = button("btn tp-start", entry.due ? "Démarrer" : "Refaire");
  onClick(start, () => switchTo(entry.featureId));
  side.appendChild(start);

  item.append(main, side);
  return item;
}

// ----------------------------------------------------------------------------
//  Écran de configuration (plan/04 § 9)
//
//  Le brouillon garde un réglage pour **toutes** les fonctionnalités, même
//  décochées : décocher puis recocher ne doit pas effacer ce qui venait d'être
//  choisi. Seules les cochées sont enregistrées.
// ----------------------------------------------------------------------------
function openSetup() {
  const program = currentProgram() ?? [];
  const items = new Map();
  const included = new Set();

  for (const feature of state.features) {
    const existing = program.find((entry) => entry.featureId === feature.id);
    items.set(feature.id, existing ? { ...existing } : defaultItem(feature.id));
    // À la première création, tout est proposé coché : un formulaire vide
    // obligerait à tout construire avant de voir le moindre écran utile.
    if (existing || !state.store.configured) included.add(feature.id);
  }

  state.draft = { items, included };
  renderSetup();
}

function renderSetup() {
  const root = el("div", "tp tp--setup");
  root.append(
    el("h1", "tp-heading", "Programme d'entraînement"),
    el(
      "p",
      "tp-lede",
      "Coche ce que tu veux travailler, puis règle la fréquence et la durée " +
        "de chaque séance. La durée reste indicative : rien ne s'arrête tout seul."
    )
  );

  const list = el("ul", "tp-config");
  for (const feature of state.features) {
    list.appendChild(renderConfigItem(feature));
  }
  root.appendChild(list);

  const actions = el("div", "tp-actions");
  const save = button("btn tp-primary", "Enregistrer");
  onClick(save, saveDraft);
  const cancel = button("btn tp-secondary", "Annuler");
  onClick(cancel, cancelDraft);
  actions.append(save, cancel);
  root.appendChild(actions);

  container.replaceChildren(root);
}

function renderConfigItem(feature) {
  const { items, included } = state.draft;
  const item = items.get(feature.id);
  const isIncluded = included.has(feature.id);

  const row = el("li", "tp-config-item");
  row.dataset.included = String(isIncluded);

  const toggle = button("tp-toggle", null);
  toggle.setAttribute("aria-pressed", String(isIncluded));
  toggle.append(
    el("span", "tp-check", isIncluded ? "✓" : ""),
    el("span", "tp-config-title", feature.title)
  );
  onClick(toggle, () => {
    if (included.has(feature.id)) included.delete(feature.id);
    else included.add(feature.id);
    renderSetup();
  });
  row.appendChild(toggle);

  if (!isIncluded) return row;

  const settings = el("div", "tp-config-row");

  const frequency = el("div", "tp-freq");
  frequency.setAttribute("role", "group");
  frequency.setAttribute("aria-label", `Fréquence — ${feature.title}`);
  for (const choice of FREQUENCY_CHOICES) {
    const selected = item.frequency.type === choice.type;
    const node = button("tp-choice-btn", choice.label);
    node.setAttribute("aria-pressed", String(selected));
    if (selected) node.classList.add("is-selected");
    onClick(node, () => {
      item.frequency = withFrequencyType(item.frequency, choice.type);
      renderSetup();
    });
    frequency.appendChild(node);
  }
  settings.appendChild(frequency);

  // Le quotidien n'a rien à régler : une séance par jour, et c'est tout.
  if (item.frequency.type !== "daily") {
    const quota = quotaOf(item.frequency);
    settings.appendChild(
      renderStepper({
        label: `${quota} fois ${periodLabel(item.frequency)}`,
        ariaLabel: `Séances ${periodLabel(item.frequency)} — ${feature.title}`,
        canDecrease: quota > 1,
        canIncrease: quota < maxQuota(item.frequency),
        onChange: (delta) => {
          item.frequency = withQuota(item.frequency, quota + delta);
          renderSetup();
        },
      })
    );
  }

  settings.appendChild(
    renderStepper({
      label: `${item.sessionDurationMinutes} min`,
      ariaLabel: `Durée d'une séance — ${feature.title}`,
      canDecrease: item.sessionDurationMinutes > MIN_DURATION_MINUTES,
      canIncrease: item.sessionDurationMinutes < MAX_DURATION_MINUTES,
      onChange: (delta) => {
        item.sessionDurationMinutes = normalizeDuration(
          item.sessionDurationMinutes + delta * DURATION_STEP_MINUTES
        );
        renderSetup();
      },
    })
  );

  row.appendChild(settings);

  const hint = FEATURE_HINTS[feature.id];
  if (hint) row.appendChild(el("p", "tp-item-hint", hint));

  return row;
}

function renderStepper({ label, ariaLabel, canDecrease, canIncrease, onChange }) {
  const stepper = el("div", "tp-stepper");
  stepper.setAttribute("role", "group");
  stepper.setAttribute("aria-label", ariaLabel);

  const less = button("btn icon-btn", "−");
  less.setAttribute("aria-label", `${ariaLabel} : diminuer`);
  less.disabled = !canDecrease;
  onClick(less, () => onChange(-1));

  const more = button("btn icon-btn", "+");
  more.setAttribute("aria-label", `${ariaLabel} : augmenter`);
  more.disabled = !canIncrease;
  onClick(more, () => onChange(1));

  stepper.append(less, el("span", "tp-stepper-value", label), more);
  return stepper;
}

function saveDraft() {
  const { items, included } = state.draft;
  const next = state.features
    .filter((feature) => included.has(feature.id))
    .map((feature) => items.get(feature.id));

  state.store.save(next, { availableFeatureIds: featureIds() });
  state.draft = null;
  renderToday();
}

function cancelDraft() {
  state.draft = null;
  // Annuler la toute première création ne doit pas laisser un écran vide.
  if (state.store.configured) renderToday();
  else renderIntro();
}

// ----------------------------------------------------------------------------
//  Cycle de vie de la fonctionnalité
// ----------------------------------------------------------------------------
function start(host) {
  container = host;
  state = createModeState();
  listeners = new AbortController();
  state.features = programmableFeatures();

  if (state.store.configured) renderToday();
  else renderIntro();
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
