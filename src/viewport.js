// ============================================================================
//  Contrôles communs d'affichage : plein écran et mode paysage.
//
//  Ces réglages appartiennent à la coquille de l'application (la barre commune
//  de index.html) et non à une fonctionnalité précise : ils survivent donc au
//  changement de mode. Une fonctionnalité qui doit se redimensionner écoute
//  l'évènement `viewportchange` émis ici, plutôt que de connaître le détail du
//  plein écran ou de la rotation CSS.
// ============================================================================

export const VIEWPORT_CHANGE_EVENT = "viewportchange";

function notifyViewportChange() {
  window.dispatchEvent(new Event(VIEWPORT_CHANGE_EVENT));
}

// ----------------------------------------------------------------------------
//  Plein écran
// ----------------------------------------------------------------------------
function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function fullscreenIsSupported() {
  return Boolean(
    document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.documentElement.requestFullscreen ||
      document.documentElement.webkitRequestFullscreen
  );
}

function updateFullscreenButton() {
  const button = document.getElementById("fullscreenBtn");
  if (!button) return;
  const isFullscreen = Boolean(fullscreenElement());
  const iconPath = button.querySelector(".fullscreen-icon path");
  const label = isFullscreen
    ? "Quitter le plein écran"
    : "Passer en plein écran";

  button.setAttribute("aria-label", label);
  button.title = label;
  iconPath.setAttribute(
    "d",
    isFullscreen
      ? "M3 8h5V3M21 8h-5V3M16 21v-5h5M8 21v-5H3"
      : "M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"
  );
}

async function toggleFullscreen() {
  try {
    if (fullscreenElement()) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else {
        document.webkitExitFullscreen();
      }
    } else if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    } else {
      document.documentElement.webkitRequestFullscreen();
    }
  } catch (err) {
    console.error("Impossible de changer le mode plein écran.", err);
  }
}

// ----------------------------------------------------------------------------
//  Mode paysage : plein écran + verrouillage de l'orientation
//
//  Le verrouillage d'orientation n'est autorisé qu'en plein écran sur la
//  plupart des navigateurs mobiles : on passe donc d'abord la page en plein
//  écran, puis on demande le verrouillage. Les deux peuvent échouer (desktop,
//  iOS Safari…) sans casser l'expérience : on échoue silencieusement et on
//  pivote l'interface en CSS.
// ----------------------------------------------------------------------------
export function isForcedLandscape() {
  return document.body.classList.contains("force-landscape");
}

function enableForcedLandscape() {
  document.body.classList.add("force-landscape");
  updateLandscapeButton();
  notifyViewportChange(); // le canvas doit adopter les dimensions pivotées
}

function disableForcedLandscape() {
  document.body.classList.remove("force-landscape");
  updateLandscapeButton();
  notifyViewportChange();
}

async function requestFullscreenSafely() {
  const el = document.documentElement;
  const request =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.mozRequestFullScreen;
  if (request && !document.fullscreenElement) {
    try {
      await request.call(el);
    } catch {
      /* plein écran refusé : on continue (verrouillage / rotation CSS) */
    }
  }
}

async function exitFullscreenSafely() {
  const exit =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.mozCancelFullScreen;
  if (exit && document.fullscreenElement) {
    try {
      await exit.call(document);
    } catch {
      /* sans effet */
    }
  }
}

// Active le mode paysage, en cascade :
//   1. plein écran (immersion, requis pour le verrouillage sur Android) ;
//   2. verrouillage natif de l'orientation (Android Chrome) ;
//   3. à défaut, rotation CSS de l'interface (iOS Safari, etc.).
async function enterLandscape() {
  await requestFullscreenSafely();

  let locked = false;
  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock("landscape");
      locked = true;
    }
  } catch {
    locked = false; // verrouillage non supporté
  }

  // Si on n'a pas pu verrouiller et qu'on est encore en portrait, on pivote
  // l'interface nous-mêmes.
  if (!locked && window.matchMedia("(orientation: portrait)").matches) {
    enableForcedLandscape();
  } else {
    updateLandscapeButton();
  }
}

// Quitte le mode paysage : rotation CSS, verrouillage puis plein écran.
async function exitLandscape() {
  if (isForcedLandscape()) disableForcedLandscape();
  try {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  } catch {
    /* sans effet */
  }
  await exitFullscreenSafely();
  updateLandscapeButton();
}

function inLandscapeMode() {
  return isForcedLandscape() || !!document.fullscreenElement;
}

async function toggleLandscape() {
  if (inLandscapeMode()) {
    await exitLandscape();
  } else {
    await enterLandscape();
  }
}

function updateLandscapeButton() {
  const btn = document.getElementById("landscapeBtn");
  if (!btn) return;
  btn.textContent = inLandscapeMode() ? "↩ Quitter" : "🔄";
}

// ----------------------------------------------------------------------------
//  Câblage de la barre commune
// ----------------------------------------------------------------------------
// Sortie de plein écran via le système : on nettoie la rotation CSS et on
// remet les libellés des boutons à jour.
function handleFullscreenChange() {
  if (!fullscreenElement() && isForcedLandscape()) {
    document.body.classList.remove("force-landscape");
  }
  updateFullscreenButton();
  updateLandscapeButton();
  notifyViewportChange();
}

export function initViewportControls() {
  const landscapeBtn = document.getElementById("landscapeBtn");
  if (landscapeBtn) landscapeBtn.addEventListener("click", toggleLandscape);

  const fullscreenBtn = document.getElementById("fullscreenBtn");
  if (fullscreenBtn) {
    if (fullscreenIsSupported()) {
      fullscreenBtn.addEventListener("click", toggleFullscreen);
      updateFullscreenButton();
    } else {
      fullscreenBtn.hidden = true;
    }
  }

  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

  // Si l'appareil passe réellement en paysage, on retire la rotation CSS de
  // secours pour éviter un double pivot.
  window.addEventListener("resize", () => {
    if (
      isForcedLandscape() &&
      window.matchMedia("(orientation: landscape)").matches
    ) {
      disableForcedLandscape();
    }
  });

  updateLandscapeButton();
}
