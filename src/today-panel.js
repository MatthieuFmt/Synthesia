// ============================================================================
//  Panneau « Ta séance du jour » de l'accueil
//
//  Dès l'ouverture de l'application : la séance composée par le professeur
//  (`training-coach.js`) pour le temps dont l'utilisateur dispose, bloc par
//  bloc, avec ce qui est déjà fait coché en vert. Ce panneau ne décide rien —
//  il lit le coach et le journal de F3, et n'écrit jamais. L'écran Programme
//  reste l'endroit où l'on règle la durée ; ici on ne fait que voir et
//  démarrer.
//
//  Même contrat que le panneau MIDI de l'accueil : créé à chaque retour,
//  `dispose()` à chaque départ — l'accueil étant reconstruit après chaque
//  séance, l'état « fait / à faire » est toujours recalculé à jour.
// ============================================================================

import { planDay } from "./training-coach.js";
import { createTrainingStore } from "./training-program.js";
import { createProgressStore } from "./progress/store.js";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createTodayPanel({ features, onOpen, onSettings, signal }) {
  const titles = new Map(features.map((feature) => [feature.id, feature.title]));

  const store = createTrainingStore();
  const progress = createProgressStore();

  const plan = planDay(
    features.map((feature) => feature.id),
    progress.log(),
    { dailyMinutes: store.dailyMinutes }
  );

  const element = el("section", "today");
  element.setAttribute("aria-label", "Ta séance du jour");

  // ---- En-tête : ce qu'on va faire, et en combien de temps ----
  const head = el("div", "today-head");
  const heading = el("div", "today-heading");
  heading.append(
    el("h2", "today-title", "Ta séance du jour"),
    el(
      "span",
      "today-date",
      new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    )
  );
  head.append(heading, el("span", "today-budget", `${plan.dailyMinutes} min`));
  element.appendChild(head);

  if (plan.blocks.length === 0) {
    element.appendChild(
      el("p", "today-empty", "Aucune fonctionnalité disponible pour composer une séance.")
    );
    return { element, dispose: () => progress.flush() };
  }

  // ---- Les blocs, dans l'ordre du cours ----
  const list = el("ol", "today-list");
  plan.blocks.forEach((block, index) => {
    list.appendChild(renderBlock(block, index + 1, titles, onOpen, signal));
  });
  element.appendChild(list);

  // ---- Où on en est ----
  const footer = el("div", "today-footer");
  if (plan.complete) {
    footer.appendChild(
      el("p", "today-alldone", "Séance terminée. Bravo — à demain !")
    );
  } else {
    const next = plan.nextBlock;
    const go = el("button", "btn today-go");
    go.type = "button";
    go.textContent =
      plan.doneCount === 0
        ? `Commencer · ${next.label}`
        : `Continuer · ${next.label}`;
    go.addEventListener("click", () => onOpen(next.featureId), { signal });
    footer.appendChild(go);
    footer.appendChild(
      el(
        "p",
        "today-count",
        `${plan.doneCount} bloc${plan.doneCount > 1 ? "s" : ""} sur ${plan.blocks.length}` +
          ` · ${plan.remainingMinutes} min restantes`
      )
    );
  }
  element.appendChild(footer);

  // ---- Le seul réglage : la durée ----
  const settings = el("button", "today-settings");
  settings.type = "button";
  settings.textContent = store.configured
    ? "Changer la durée de ma séance"
    : `Séance de ${plan.dailyMinutes} min par jour — changer`;
  settings.addEventListener("click", () => onSettings(), { signal });
  element.appendChild(settings);

  return {
    element,
    dispose() {
      progress.flush();
    },
  };
}

function renderBlock(block, position, titles, onOpen, signal) {
  const item = el("li", "today-item");
  item.dataset.state = block.done ? "done" : "todo";

  const button = el("button", "today-item-btn");
  button.type = "button";
  button.addEventListener("click", () => onOpen(block.featureId), { signal });

  const mark = el("span", "today-mark", block.done ? "✓" : String(position));
  mark.setAttribute("aria-hidden", "true");

  const text = el("span", "today-item-text");
  text.append(
    el("span", "today-item-title", titles.get(block.featureId) ?? block.featureId),
    el("span", "today-item-slot", block.label)
  );

  const meta = el("span", "today-item-meta", block.done ? "Fait" : `${block.minutes} min`);

  button.append(mark, text, meta);
  item.appendChild(button);
  return item;
}
