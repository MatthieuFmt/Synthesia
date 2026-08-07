// ============================================================================
//  Navigation entre les fonctionnalités (fondation F1)
//
//  Une fonctionnalité est décrite par une fiche :
//      { id, title, description, status, start(container, options?), stop() }
//  Le registre est la simple liste de ces fiches ; cet écran ne connaît rien
//  d'autre d'une fonctionnalité. `switchTo()` garantit qu'une seule
//  fonctionnalité est active à la fois : la précédente est complètement
//  arrêtée avant que la suivante ne démarre.
//
//  Deux chemins mènent à un mode :
//
//  - l'**accueil**, où les fonctionnalités sont rangées par famille plutôt
//    qu'en une seule liste de dix cartes ;
//  - la **navigation de la barre**, présente dans *tous* les modes : passer d'un mode
//    à l'autre ne demande plus de repasser par l'accueil.
//
//  La barre ne court-circuite rien : elle appelle `switchTo()` comme le reste,
//  et le mode en cours est donc arrêté proprement avant le suivant.
// ============================================================================

import { createMidiPanel } from "./midi-controls.js";
import { createTodayPanel } from "./today-panel.js";

const HOME_TITLE = "Accueil";

// ----------------------------------------------------------------------------
//  Familles de fonctionnalités
//
//  Dix cartes à plat ne se lisent plus : on les range par intention — ce qu'on
//  veut faire, pas la fonctionnalité qui le fait. Une fonctionnalité absente de
//  cette table atterrit dans la dernière famille, donc ajouter un mode sans
//  toucher ce fichier reste possible.
// ----------------------------------------------------------------------------
const GROUPS = [
  { id: "program", title: "Ma séance", featureIds: ["training", "progress"] },
  { id: "read", title: "Lire", featureIds: ["fluency"] },
  { id: "play", title: "Jouer", featureIds: ["song", "technique"] },
  { id: "feel", title: "Écouter et sentir", featureIds: ["ear-training"] },
  { id: "other", title: "Autres", featureIds: [] },
];

let registry = [];
let currentFeature = null;
let stage = null;

// Navigation de la barre : montée une fois pour toutes depuis le registre.
let modeNavList = null;
let songBackButton = null;

// Panneaux de l'accueil (« Aujourd'hui » et MIDI). L'accueil est reconstruit à
// chaque retour : les panneaux doivent être libérés, sinon chaque visite
// laisserait un abonné derrière elle — et l'état « fait / à faire » du jour est
// ainsi recalculé après chaque séance.
let midiPanel = null;
let todayPanel = null;
let homeListeners = null;

export function initNavigation(features) {
  registry = features;
  stage = document.getElementById("stage");
  modeNavList = document.getElementById("modeNavList");
  songBackButton = document.getElementById("songBackBtn");

  renderModeNavigation();
  songBackButton.addEventListener("click", () => switchTo(null));

  // Recharger la page ramène toujours à l'accueil (aucun routing par URL
  // n'a été décidé, cf. F1 § Décisions ouvertes).
  switchTo(null);
}

// Le registre, pour qui a besoin de la liste des fonctionnalités réellement
// disponibles — le Programme d'entraînement (04) ne doit pas tenir la sienne
// (plan/04 § 11). Une copie : le registre ne se modifie qu'au démarrage.
export function availableFeatures() {
  return registry.filter((feature) => feature.status === "available");
}

// Point de passage unique : `null` revient à l'écran d'accueil.
//
// `options` est passé tel quel à `start(container, options)` : la navigation
// n'en connaît pas le contenu, c'est un mot que l'appelant adresse au mode
// (le mode Exercices ouvre ainsi le mode Morceau sur un fichier précis).
export function switchTo(featureId, options) {
  const next =
    featureId === null
      ? null
      : registry.find((feature) => feature.id === featureId);

  // Une fonctionnalité inconnue ou marquée « Bientôt » ne démarre jamais.
  if (featureId !== null && next?.status !== "available") return;

  // 1. Arrêt complet de la fonctionnalité en cours (audio, animations,
  //    écouteurs) avant tout démarrage : les deux ne tournent jamais ensemble.
  if (currentFeature) {
    currentFeature.stop();
    currentFeature = null;
  }
  disposeHome();
  stage.replaceChildren();

  // 2. Démarrage de la suivante, ou retour à l'accueil.
  if (!next) {
    showHome();
    return;
  }
  currentFeature = next;
  updateModeNavigation();
  next.start(stage, options);
}

// ----------------------------------------------------------------------------
//  Répartition du registre en familles
// ----------------------------------------------------------------------------
function groupedFeatures() {
  const placed = new Set();
  const groups = [];

  for (const group of GROUPS) {
    const features = group.featureIds
      .map((id) => registry.find((feature) => feature.id === id))
      .filter(Boolean);
    features.forEach((feature) => placed.add(feature.id));
    if (features.length > 0) groups.push({ ...group, features });
  }

  // Un mode ajouté à `main.js` sans être rangé ici reste accessible.
  const rest = registry.filter((feature) => !placed.has(feature.id));
  if (rest.length > 0) {
    const other = groups.find((group) => group.id === "other");
    if (other) other.features.push(...rest);
    else groups.push({ id: "other", title: "Autres", features: rest });
  }

  return groups;
}

// ----------------------------------------------------------------------------
//  Navigation de la barre
// ----------------------------------------------------------------------------
function renderModeNavigation() {
  modeNavList.replaceChildren();

  const homeItem = document.createElement("li");
  const homeNode = document.createElement("button");
  homeNode.type = "button";
  homeNode.className = "mode-nav-item";
  homeNode.textContent = HOME_TITLE;
  homeNode.dataset.featureId = "";
  homeNode.addEventListener("click", () => switchTo(null));
  homeItem.appendChild(homeNode);
  modeNavList.appendChild(homeItem);

  const homeSeparator = document.createElement("li");
  homeSeparator.className = "mode-nav-separator";
  homeSeparator.setAttribute("aria-hidden", "true");
  modeNavList.appendChild(homeSeparator);

  groupedFeatures().forEach((group, groupIndex) => {
    if (groupIndex > 0) {
      const separator = document.createElement("li");
      separator.className = "mode-nav-separator";
      separator.setAttribute("aria-hidden", "true");
      modeNavList.appendChild(separator);
    }

    for (const feature of group.features) {
      const item = document.createElement("li");
      const node = document.createElement("button");
      node.type = "button";
      node.className = "mode-nav-item";
      node.textContent = feature.title;
      node.dataset.featureId = feature.id;
      node.disabled = feature.status !== "available";
      if (!node.disabled) {
        node.addEventListener("click", () => switchTo(feature.id));
      }
      item.appendChild(node);
      modeNavList.appendChild(item);
    }
  });

  updateModeNavigation();
}

function updateModeNavigation() {
  const songIsCurrent = currentFeature?.id === "song";
  document.querySelector(".topbar")?.classList.toggle("song-open", songIsCurrent);
  songBackButton.hidden = !songIsCurrent;

  for (const node of modeNavList.querySelectorAll(".mode-nav-item")) {
    const isCurrent = currentFeature
      ? node.dataset.featureId === currentFeature.id
      : node.dataset.featureId === "";
    if (isCurrent) node.setAttribute("aria-current", "page");
    else node.removeAttribute("aria-current");
  }
}

// ----------------------------------------------------------------------------
//  Écran d'accueil
// ----------------------------------------------------------------------------
function showHome() {
  updateModeNavigation();

  const home = document.createElement("div");
  home.className = "home";

  const heading = document.createElement("h1");
  heading.className = "visually-hidden";
  heading.textContent = HOME_TITLE;

  homeListeners = new AbortController();

  // La séance du jour en tête : c'est la première question qu'on se pose en
  // ouvrant l'application (plan/04, étendu à l'accueil).
  todayPanel = createTodayPanel({
    features: availableFeatures().filter(
      (feature) => feature.id !== "training" && feature.id !== "progress"
    ),
    onOpen: (featureId) => switchTo(featureId),
    onSettings: () => switchTo("training"),
    signal: homeListeners.signal,
  });

  home.append(heading, todayPanel.element);

  // Le clavier physique se branche ici, avant de choisir un exercice.
  midiPanel = createMidiPanel({ signal: homeListeners.signal });
  home.appendChild(midiPanel.element);

  stage.appendChild(home);
}

function disposeHome() {
  midiPanel?.dispose();
  midiPanel = null;
  todayPanel?.dispose();
  todayPanel = null;
  homeListeners?.abort();
  homeListeners = null;
}
