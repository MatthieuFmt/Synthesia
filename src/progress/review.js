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

// Volet « les moins vues récemment » (F3 étape D, fait le 27/07/2026) : une
// cible déjà rencontrée mais absente des dernières tentatives reçoit un léger
// surpoids, même si elle n'a jamais été ratée — sinon une note apprise tôt
// disparaît des séances. Le surpoids reste petit devant celui des erreurs
// (au plus la moitié), pour que le plus raté passe toujours d'abord.
export const STALE_AFTER_ATTEMPTS = 30;
export const MAX_STALE_BOOST = 0.5;

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
  let seen = 0; // tentatives parcourues, toutes cibles confondues

  for (let i = log.length - 1; i >= 0; i--) {
    const event = log[i];
    if (event.type !== "answer") continue;
    if (featureId && event.featureId !== featureId) continue;
    if (!event.target) continue;

    const key = keyOf(event.target);
    let entry = stats.get(key);
    if (!entry) {
      // `age` : combien de tentatives (toutes cibles) séparent la dernière
      // rencontre de cette cible du présent — 0 pour la toute dernière.
      entry = { total: 0, wrong: 0, age: seen };
      stats.set(key, entry);
    }
    seen++;
    if (entry.total >= limit) continue;

    entry.total++;
    // Une note manquée (sortie de l'écran en Fluidité sans avoir été jouée)
    // est un raté au même titre qu'une fausse : elle doit revenir.
    if (event.outcome === "wrong" || event.outcome === "missed") entry.wrong++;
  }

  return stats;
}

// Poids de départ d'une session : 1 pour une cible jamais vue ou toujours
// réussie et récente, jusqu'à MAX_PRIOR_WEIGHT pour une cible toujours ratée —
// plus le léger surpoids des cibles les moins vues récemment (étape D). Les
// cibles absentes du journal n'apparaissent pas dans la Map : le moteur leur
// applique son poids par défaut, elles ne sont donc pas défavorisées.
export function priorWeights(log, options = {}) {
  const weights = new Map();
  const maxWeight = options.maxWeight ?? MAX_PRIOR_WEIGHT;
  const staleAfter = options.staleAfter ?? STALE_AFTER_ATTEMPTS;
  const maxStaleBoost = options.maxStaleBoost ?? MAX_STALE_BOOST;

  for (const [key, { total, wrong, age }] of recentAttempts(log, options)) {
    if (total === 0) continue;
    const mistakeWeight = wrong > 0 ? (maxWeight - 1) * (wrong / total) : 0;
    // Le surpoids d'ancienneté croît avec l'âge de la dernière rencontre et
    // plafonne vite : revenir suffit, pas besoin d'occuper la séance.
    const staleBoost = maxStaleBoost * Math.min(1, age / staleAfter);
    const weight = 1 + mistakeWeight + staleBoost;
    if (weight > 1) weights.set(key, weight);
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
