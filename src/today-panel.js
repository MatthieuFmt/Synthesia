// ============================================================================
//  Panneau « Aujourd'hui » de l'accueil
//
//  Dès l'ouverture de l'application, ce qu'il reste à faire aujourd'hui — et ce
//  qui est déjà fait, coché en vert. Les règles sont celles du Programme
//  d'entraînement (04) : ce panneau LIT `training-program.js` et le journal de
//  F3, il ne calcule rien de son côté et n'écrit jamais rien. L'écran
//  Programme reste l'endroit où l'on configure ; ici on ne fait que voir et
//  démarrer.
//
//  Tant qu'aucun programme n'est enregistré, le panneau propose le programme
//  par défaut de 04 (jamais un écran vide) et invite à le personnaliser.
//
//  Même contrat que le panneau MIDI de l'accueil : créé à chaque retour,
//  `dispose()` à chaque départ — l'accueil étant reconstruit après chaque
//  séance, l'état « fait / à faire » est toujours recalculé à jour.
// ============================================================================

import { allDone, createTrainingStore, defaultItem, dueToday } from "./training-program.js";
import { createProgressStore } from "./progress/store.js";

// L'ordre du jour ne concerne que ce qui se pratique : l'écran Progression ne
// se planifie pas. Le Programme lui-même se planifie encore moins.
const UNPLANNABLE = new Set(["training", "progress"]);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createTodayPanel({ features, onOpen, signal }) {
  const trainable = features.filter((feature) => !UNPLANNABLE.has(feature.id));
  const titles = new Map(trainable.map((feature) => [feature.id, feature.title]));

  const store = createTrainingStore();
  const progress = createProgressStore();

  const availableFeatureIds = trainable.map((feature) => feature.id);
  const configured = store.configured;
  const program = configured
    ? store.program({ availableFeatureIds })
    : availableFeatureIds.map((featureId) => defaultItem(featureId));

  const element = el("section", "today");
  element.setAttribute("aria-label", "À faire aujourd'hui");

  const head = el("div", "today-head");
  const title = el("h2", "today-title", "Aujourd'hui");
  const date = el(
    "span",
    "today-date",
    new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
  );
  head.append(title, date);
  element.appendChild(head);

  const status = dueToday(program, progress.log());
  const planned = status.filter((entry) => titles.has(entry.featureId));

  if (planned.length === 0) {
    element.appendChild(
      el("p", "today-empty", "Aucune séance prévue : configure ton programme.")
    );
  } else {
    // D'abord ce qu'il reste à faire, puis ce qui est fait — coché.
    const list = el("ul", "today-list");
    const ordered = [...planned].sort(
      (a, b) => Number(b.due) - Number(a.due)
    );
    for (const entry of ordered) {
      list.appendChild(renderItem(entry, titles, onOpen, signal));
    }
    element.appendChild(list);

    const doneCount = planned.filter((entry) => !entry.due).length;
    if (allDone(status)) {
      const banner = el("p", "today-alldone", "Tout est fait pour aujourd'hui. Bravo !");
      element.appendChild(banner);
    } else {
      element.appendChild(
        el(
          "p",
          "today-count",
          `${doneCount} séance${doneCount > 1 ? "s" : ""} faite${doneCount > 1 ? "s" : ""} sur ${planned.length}`
        )
      );
    }
  }

  if (!configured) {
    element.appendChild(
      el("p", "today-note", "Programme par défaut — personnalise-le dans « Programme ».")
    );
  }

  return {
    element,
    dispose() {
      progress.flush();
    },
  };
}

function renderItem(entry, titles, onOpen, signal) {
  const item = el("li", "today-item");
  // Trois états lisibles d'un coup d'œil : à faire, fait aujourd'hui, quota de
  // la période déjà atteint un autre jour (mêmes règles que l'écran de 04).
  const done = !entry.due;
  item.dataset.state = done ? "done" : "todo";

  const button = el("button", "today-item-btn");
  button.type = "button";
  button.addEventListener("click", () => onOpen(entry.featureId), { signal });

  const mark = el("span", "today-mark");
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = done ? "✓" : "";

  const label = el("span", "today-item-title", titles.get(entry.featureId));

  const meta = el(
    "span",
    "today-item-meta",
    done
      ? entry.doneToday > 0 ? "Fait" : "Quota atteint"
      : entry.quota > 1
        ? `${entry.doneInPeriod} / ${entry.quota} · ${entry.sessionDurationMinutes} min`
        : `${entry.sessionDurationMinutes} min`
  );

  button.append(mark, label, meta);
  item.appendChild(button);
  return item;
}
