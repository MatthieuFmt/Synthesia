// ============================================================================
//  Révisions adaptées — Fondation F3
//
//  Relit le journal de progression pour faire revenir plus souvent ce qui a
//  été raté lors des séances précédentes (plan/F3-suivi-progression.md § 6,
//  ligne « Révisions adaptées » ; plan/02-lecture-notes.md étape D).
//
//  Ce module ne connaît aucune fonctionnalité en particulier : il compte des
//  `correct` et des `wrong` sur des cibles, et l'appelant décide de ce qui
//  identifie une cible. Aucun DOM, aucun Canvas.
// ============================================================================

// Nombre de tentatives récentes prises en compte par cible. Au-delà, une note
// ratée il y a longtemps continuerait de peser après avoir été réapprise.
export const RECENT_ATTEMPTS = 8;

// Poids maximal d'une cible ratée. Une note systématiquement manquée sort donc
// au plus trois fois plus souvent qu'une note jamais vue — assez pour être
// travaillée, pas assez pour occuper toute la séance.
export const MAX_PRIOR_WEIGHT = 3;

// Convention par défaut, identique à celle du moteur de la Lecture de notes :
// une même hauteur lue dans deux clés est deux cibles distinctes.
export function targetKey(target) {
  return `${target.clef}:${target.midi}`;
}

// Compte, par cible, les tentatives justes et fausses les plus récentes.
// Le journal est parcouru à rebours : on s'arrête d'accumuler dès qu'une cible
// a ses `RECENT_ATTEMPTS` dernières tentatives.
export function recentAttempts(
  log,
  { featureId, keyOf = targetKey, limit = RECENT_ATTEMPTS } = {}
) {
  const stats = new Map();

  for (let i = log.length - 1; i >= 0; i--) {
    const event = log[i];
    if (event.type !== "answer") continue;
    if (featureId && event.featureId !== featureId) continue;
    if (!event.target) continue;

    const key = keyOf(event.target);
    let entry = stats.get(key);
    if (!entry) {
      entry = { total: 0, wrong: 0 };
      stats.set(key, entry);
    }
    if (entry.total >= limit) continue;

    entry.total++;
    if (event.outcome === "wrong") entry.wrong++;
  }

  return stats;
}

// Poids de départ d'une session : 1 pour une cible jamais vue ou toujours
// réussie, jusqu'à MAX_PRIOR_WEIGHT pour une cible toujours ratée. Les cibles
// absentes du journal n'apparaissent pas dans la Map : le moteur leur applique
// son poids par défaut, elles ne sont donc pas défavorisées.
export function priorWeights(log, options = {}) {
  const weights = new Map();
  const maxWeight = options.maxWeight ?? MAX_PRIOR_WEIGHT;

  for (const [key, { total, wrong }] of recentAttempts(log, options)) {
    if (total === 0 || wrong === 0) continue;
    weights.set(key, 1 + (maxWeight - 1) * (wrong / total));
  }

  return weights;
}

// Réglages de la dernière séance d'une fonctionnalité : ils sont dans le
// `context` de son `session-start` (plan/02-lecture-notes.md étape D,
// « enregistrer le dernier niveau »).
export function lastSessionContext(log, featureId) {
  for (let i = log.length - 1; i >= 0; i--) {
    const event = log[i];
    if (event.type === "session-start" && event.featureId === featureId) {
      return event.context ?? null;
    }
  }
  return null;
}
