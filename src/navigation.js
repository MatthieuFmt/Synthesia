// ============================================================================
//  Navigation entre les fonctionnalités (fondation F1)
//
//  Une fonctionnalité est décrite par une fiche :
//      { id, title, description, status, start(container), stop() }
//  Le registre est la simple liste de ces fiches ; cet écran ne connaît rien
//  d'autre d'une fonctionnalité. `switchTo()` garantit qu'une seule
//  fonctionnalité est active à la fois : la précédente est complètement
//  arrêtée avant que la suivante ne démarre.
// ============================================================================

const HOME_TITLE = "Accueil";
const STATUS_LABELS = {
  available: "Disponible",
  soon: "Bientôt",
};

let registry = [];
let currentFeature = null;
let stage = null;
let homeButton = null;
let titleLabel = null;

export function initNavigation(features) {
  registry = features;
  stage = document.getElementById("stage");
  homeButton = document.getElementById("homeBtn");
  titleLabel = document.getElementById("featureTitle");

  homeButton.addEventListener("click", () => switchTo(null));

  // Recharger la page ramène toujours à l'accueil (aucun routing par URL
  // n'a été décidé, cf. F1 § Décisions ouvertes).
  switchTo(null);
}

// Point de passage unique : `null` revient à l'écran d'accueil.
export function switchTo(featureId) {
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
  stage.replaceChildren();

  // 2. Démarrage de la suivante, ou retour à l'accueil.
  if (!next) {
    showHome();
    return;
  }
  currentFeature = next;
  titleLabel.textContent = next.title;
  homeButton.hidden = false;
  next.start(stage);
}

function showHome() {
  titleLabel.textContent = HOME_TITLE;
  homeButton.hidden = true;

  const home = document.createElement("div");
  home.className = "home";

  const heading = document.createElement("h1");
  heading.className = "home-title";
  heading.textContent = "Que veux-tu travailler ?";

  const grid = document.createElement("ul");
  grid.className = "feature-grid";
  for (const feature of registry) {
    grid.appendChild(renderCard(feature));
  }

  home.append(heading, grid);
  stage.appendChild(home);
}

function renderCard(feature) {
  const item = document.createElement("li");
  item.className = "feature-card";

  // Un <button> désactivé pour « Bientôt » : la carte reste visible et
  // annoncée, mais ne peut pas être lancée au clic ni au clavier.
  const button = document.createElement("button");
  button.type = "button";
  button.className = "feature-card-btn";
  button.disabled = feature.status !== "available";
  if (!button.disabled) {
    button.addEventListener("click", () => switchTo(feature.id));
  }

  const title = document.createElement("span");
  title.className = "feature-card-title";
  title.textContent = feature.title;

  const description = document.createElement("span");
  description.className = "feature-card-desc";
  description.textContent = feature.description;

  const status = document.createElement("span");
  status.className = "feature-card-status";
  status.textContent = STATUS_LABELS[feature.status] ?? feature.status;

  button.append(title, description, status);
  item.appendChild(button);
  return item;
}
