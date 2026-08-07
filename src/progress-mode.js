// ============================================================================
//  Écran de progression — Fondation F3, étape E
//
//  Le seul écran qui LIT le journal sans jamais y écrire de séance : il montre
//  ce que les vues de `progress/views.js` savent calculer — régularité, notes
//  confondues, exercices maîtrisés, tempo maximal propre, évolution par main —
//  et rend à l'utilisateur la maîtrise de ses données : export en fichier
//  JSON et effacement (plan/F3-suivi-progression.md § 8 et étape E).
//
//  Des listes, pas de graphiques : c'est la décision de lisibilité sur mobile
//  laissée ouverte en F3 § 13, tranchée ici. Rien ne bouge, rien ne défile
//  tout seul : aucune boucle d'animation, aucun audio.
//
//  Cycle de vie : `start(container)` calcule les vues et construit l'écran ;
//  `stop()` retire les écouteurs. Aucun état ne survit.
// ============================================================================

import { noteDegreeName, octaveOf } from "./music.js";
import { exerciseById } from "./exercises/catalog.js";
import { createProgressStore } from "./progress/store.js";
import {
  completedSessions,
  confusedTargets,
  handSummary,
  runStats,
  sessionMinutes,
} from "./progress/views.js";

const FEATURE_LABEL = {
  training: "Programme",
  song: "Morceau",
  "song-practice": "Travail d'un morceau",
  "note-reading": "Lecture de notes",
  fluency: "Lecture de notes",
  technique: "Exercices techniques",
  "ear-training": "Oreille",
};

const CLEF_LABEL = { treble: "clé de sol", bass: "clé de fa" };
const HAND_LABEL = { right: "Main droite", left: "Main gauche" };

// Nombre de séances montrées dans l'historique : assez pour voir la
// régularité, pas de quoi noyer l'écran.
const HISTORY_LIMIT = 8;

// ----------------------------------------------------------------------------
//  Fiche de la fonctionnalité (registre de la navigation)
// ----------------------------------------------------------------------------
export const progressFeature = {
  id: "progress",
  title: "Progression",
  description: "Ce qui est acquis, ce qui se confond, et tes données.",
  status: "available",
  start,
  stop,
};

let container = null;
let state = null;
let listeners = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function onClick(node, handler) {
  node.addEventListener("click", handler, { signal: listeners.signal });
}

function noteName(midi) {
  return `${noteDegreeName(midi)}${octaveOf(midi)}`;
}

// ----------------------------------------------------------------------------
//  Écran
// ----------------------------------------------------------------------------
function render() {
  const log = state.progress.log();
  const root = el("div", "pg");

  root.append(
    el("h1", "pg-heading", "Progression"),
    el(
      "p",
      "pg-lede",
      "Tout est calculé depuis ton journal local : rien ne quitte ce navigateur."
    )
  );

  root.appendChild(renderHistory(log));
  root.appendChild(renderConfusions(log));
  root.appendChild(renderRuns(log));
  root.appendChild(renderHands(log));
  root.appendChild(renderData(log));

  container.replaceChildren(root);
}

function section(title) {
  const box = el("section", "pg-section");
  box.appendChild(el("h2", "pg-subheading", title));
  return box;
}

function emptyNote(box, text) {
  box.appendChild(el("p", "pg-empty", text));
  return box;
}

// ---- Régularité : l'historique des séances (la vue qui nourrit déjà 04) ----
function renderHistory(log) {
  const box = section("Dernières séances");
  const done = completedSessions(log);
  if (done.length === 0) {
    return emptyNote(box, "Aucune séance terminée pour l'instant : tout commence ici.");
  }

  const list = el("ul", "pg-list");
  for (const practice of done.slice(-HISTORY_LIMIT).reverse()) {
    const when = new Date(practice.endedAt ?? practice.startedAt);
    const minutes = sessionMinutes(practice);
    const item = el("li", "pg-item");
    item.append(
      el(
        "span",
        "pg-item-label",
        FEATURE_LABEL[practice.featureId] ?? practice.featureId
      ),
      el(
        "span",
        "pg-item-value",
        `${when.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}` +
          (minutes !== null && minutes > 0 ? ` · ${minutes} min` : "")
      )
    );
    list.appendChild(item);
  }
  box.appendChild(list);
  box.appendChild(
    el("p", "pg-note", `${done.length} séance${done.length > 1 ? "s" : ""} terminée${done.length > 1 ? "s" : ""} au total.`)
  );
  return box;
}

// ---- Notes souvent confondues (F3 § 6, première vue) ----
function renderConfusions(log) {
  const box = section("Souvent confondues");
  const entries = confusedTargets(log, {
    featureIds: ["note-reading", "fluency", "ear-training"],
    keyOf: (target) =>
      target.midi !== undefined
        ? `${target.clef ?? "ear"}:${target.midi}`
        : JSON.stringify(target),
  }).filter((entry) => entry.target.midi !== undefined);

  if (entries.length === 0) {
    return emptyNote(box, "Aucune confusion enregistrée : les erreurs apparaîtront ici.");
  }

  const list = el("ul", "pg-list");
  for (const entry of entries) {
    const clef = entry.target.clef ? ` (${CLEF_LABEL[entry.target.clef] ?? entry.target.clef})` : "";
    const worst = entry.confusedWith.find((given) => given.given.midi !== undefined);
    const item = el("li", "pg-item");
    item.append(
      el("span", "pg-item-label", `${noteName(entry.target.midi)}${clef}`),
      el(
        "span",
        "pg-item-value",
        worst
          ? `confondue avec ${noteName(worst.given.midi)} · ${entry.wrong} erreur${entry.wrong > 1 ? "s" : ""}`
          : `${entry.wrong} erreur${entry.wrong > 1 ? "s" : ""}`
      )
    );
    list.appendChild(item);
  }
  box.appendChild(list);
  return box;
}

// ---- Exercices maîtrisés et tempo maximal propre (F3 § 6, vues 2 et 3) ----
function runLabel(entry) {
  if (entry.target.exerciseId) {
    const exercise = exerciseById(entry.target.exerciseId);
    const hand = HAND_LABEL[entry.target.hand];
    return `${exercise?.title ?? entry.target.exerciseId}${hand ? ` — ${hand.toLowerCase()}` : ""}`;
  }
  const sectionId = entry.target.sectionId;
  const passage = sectionId && sectionId !== "whole" ? "passage" : "morceau entier";
  return `${entry.target.songId ?? "?"} — ${passage}`;
}

function renderRuns(log) {
  const box = section("Exercices et passages");
  const entries = runStats(log).sort((a, b) => b.lastAt - a.lastAt);

  if (entries.length === 0) {
    return emptyNote(
      box,
      "Rien d'exécuté au clavier MIDI pour l'instant : les exercices jugés apparaîtront ici."
    );
  }

  const list = el("ul", "pg-list");
  for (const entry of entries.slice(0, 8)) {
    const item = el("li", "pg-item");
    const tempo =
      entry.bestCleanTempo !== null
        ? ` · propre à ${entry.bestCleanTempo} bpm`
        : entry.bestCleanTempoPercent !== null
          ? ` · propre à ${entry.bestCleanTempoPercent} %`
          : "";
    item.append(
      el("span", "pg-item-label", runLabel(entry)),
      el(
        "span",
        "pg-item-value",
        entry.mastered
          ? `maîtrisé${tempo}`
          : `${entry.cleanRuns} exécution${entry.cleanRuns > 1 ? "s" : ""} propre${entry.cleanRuns > 1 ? "s" : ""} sur ${entry.cleanSessionCount} séance${entry.cleanSessionCount > 1 ? "s" : ""}${tempo}`
      )
    );
    if (entry.mastered) item.dataset.state = "mastered";
    list.appendChild(item);
  }
  box.appendChild(list);
  box.appendChild(
    el(
      "p",
      "pg-note",
      "Maîtrisé = plusieurs exécutions propres, sur au moins deux séances distinctes."
    )
  );
  return box;
}

// ---- Évolution par main (F3 § 6, quatrième vue) ----
function renderHands(log) {
  const box = section("Par main");
  const summary = handSummary(log, {
    featureIds: ["note-reading", "fluency"],
  });

  const hasData = ["left", "right"].some((hand) => summary[hand].attempts > 0);
  if (!hasData) {
    return emptyNote(box, "Les réponses par main de la lecture apparaîtront ici.");
  }

  const list = el("ul", "pg-list");
  for (const hand of ["right", "left"]) {
    const counts = summary[hand];
    if (counts.attempts === 0) continue; // rien mesuré : rien d'affiché
    const overall = Math.round(counts.accuracy * 100);
    const recent =
      counts.recentAccuracy !== null ? Math.round(counts.recentAccuracy * 100) : null;
    const item = el("li", "pg-item");
    item.append(
      el("span", "pg-item-label", HAND_LABEL[hand]),
      el(
        "span",
        "pg-item-value",
        recent !== null && counts.sessions > 1
          ? `${overall} % en tout · ${recent} % sur les dernières séances`
          : `${overall} % de précision`
      )
    );
    list.appendChild(item);
  }
  box.appendChild(list);
  return box;
}

// ---- Maîtrise des données : export, effacement (F3 § 8) ----
function renderData(log) {
  const box = section("Tes données");

  box.appendChild(
    el(
      "p",
      "pg-note",
      `${log.length} évènement${log.length > 1 ? "s" : ""} dans le journal local. ` +
        "Changer de navigateur ou vider son cache efface tout : l'export est la seule sauvegarde."
    )
  );

  if (!state.progress.persistent) {
    box.appendChild(
      el(
        "p",
        "pg-warning",
        "Le stockage de ce navigateur est indisponible : rien n'est conservé entre les visites."
      )
    );
  }

  const actions = el("div", "pg-actions");

  const exportBtn = el("button", "btn pg-secondary", "Exporter (JSON)");
  exportBtn.type = "button";
  onClick(exportBtn, exportJournal);

  const clearBtn = el("button", "btn pg-danger", "Effacer mes données");
  clearBtn.type = "button";
  onClick(clearBtn, () => confirmClear(clearBtn));

  actions.append(exportBtn, clearBtn);
  box.appendChild(actions);
  return box;
}

// Export : un fichier téléchargé, sans serveur — le lien est révoqué après le
// clic pour ne pas laisser fuir l'URL d'objet.
function exportJournal() {
  const payload = state.progress.exportPayload();
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const day = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `synthesia-progression-${day}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Effacement en deux temps : le premier clic arme, le second dans les cinq
// secondes efface vraiment. Pas de dialogue bloquant.
function confirmClear(button) {
  if (!state.clearArmed) {
    state.clearArmed = true;
    button.textContent = "Sûr ? Tout sera perdu";
    button.classList.add("is-armed");
    state.disarmTimer = setTimeout(() => {
      if (!state || !container) return;
      state.clearArmed = false;
      button.textContent = "Effacer mes données";
      button.classList.remove("is-armed");
    }, 5000);
    return;
  }

  clearTimeout(state.disarmTimer);
  state.clearArmed = false;
  state.progress.clear();
  render(); // l'écran vide dit lui-même que tout est parti
}

// ----------------------------------------------------------------------------
//  Cycle de vie
// ----------------------------------------------------------------------------
function start(host) {
  container = host;
  listeners = new AbortController();
  state = {
    progress: createProgressStore(),
    clearArmed: false,
    disarmTimer: null,
  };

  // La compaction se fait ici, chez le seul consommateur global du journal :
  // le détail ancien laisse la place, les bornes de séance restent.
  state.progress.compact();

  render();
}

function stop() {
  if (!state) return;
  clearTimeout(state.disarmTimer);
  listeners.abort();
  listeners = null;
  container?.replaceChildren();
  container = null;
  state = null;
}
