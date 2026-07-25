// ============================================================================
//  Profil de performance de l'appareil
//
//  Détecté une seule fois au chargement de la page. Le mode Morceau s'en sert
//  pour brider le canvas (résolution, cadence) ; l'audio partagé pour choisir
//  le jeu d'échantillons. `?performance=low` ou `?performance=high` force le
//  profil, ce qui permet de tester le rendu bridé sur un poste puissant.
// ============================================================================

function detectPerformanceProfile() {
  const override = new URLSearchParams(window.location.search).get("performance");
  const memory = Number(navigator.deviceMemory) || 0;
  const cores = Number(navigator.hardwareConcurrency) || 0;
  const memoryLimited = memory > 0 && memory <= 4;
  const cpuLimited = cores > 0 && cores <= 4;
  const constrained =
    override === "low" ||
    (override !== "high" && (memoryLimited || cpuLimited));

  return Object.freeze({
    constrained,
    maxCanvasDpr: constrained ? 1.5 : Infinity,
    maxCanvasPixels: constrained ? 1_500_000 : 8_000_000,
    minFrameInterval: constrained ? 30 : 12,
    transportUiInterval: constrained ? 100 : 50,
    lightAudio: constrained,
  });
}

export const PERFORMANCE_PROFILE = detectPerformanceProfile();
