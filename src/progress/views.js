// ============================================================================
//  Vues calculées du journal — Fondation F3
//
//  Le journal (progress/store.js) ne contient que des évènements bruts : tout
//  le reste se calcule ici. C'est ce qui permet d'ajouter une vue sans aucune
//  migration de données (plan/F3-suivi-progression.md § 3 et § 6).
//
//  Première vue construite : l'historique des séances, parce que le Programme
//  d'entraînement (04) en a réellement besoin — il lit ce journal au lieu d'en
//  tenir un second (plan/F3 § 5). Les autres vues du § 6 viendront quand une
//  fonctionnalité les demandera.
//
//  Aucun DOM, aucun Canvas.
// ============================================================================

// Une séance est une paire `session-start` / `session-end` du même journal
// (plan/F3 § 7), et non une seconde structure. On la reconstitue ici.
//
//   featureIds : ne garder que ces fonctionnalités (tableau ou Set)
//   from / to  : fenêtre [from, to[ sur la date de la séance, en ms
//   done       : seulement les séances allées jusqu'à leur bilan
//
// Le résultat est trié par date croissante.
export function sessions(
  log,
  { featureIds = null, from = null, to = null, done = false } = {}
) {
  const wanted = featureIds === null ? null : new Set(featureIds);
  const byKey = new Map();
  const ordered = [];

  for (const event of log) {
    if (event.type !== "session-start" && event.type !== "session-end") continue;
    if (wanted && !wanted.has(event.featureId)) continue;

    const key = `${event.featureId}:${event.sessionId}`;
    let session = byKey.get(key);
    if (!session) {
      // Le plafond du journal peut avoir emporté le `session-start` d'une
      // séance ancienne : un `session-end` orphelin reste une séance terminée,
      // il lui manque seulement ses réglages d'ouverture.
      session = {
        featureId: event.featureId,
        sessionId: event.sessionId,
        startedAt: null,
        endedAt: null,
        outcome: null,
        context: null, // réglages d'ouverture (niveau, main, tempo…)
        result: null,  // ce que la fonctionnalité a laissé en se fermant
      };
      byKey.set(key, session);
      ordered.push(session);
    }

    if (event.type === "session-start") {
      session.startedAt = event.at;
      session.context = event.context ?? null;
    } else {
      session.endedAt = event.at;
      session.outcome = event.outcome ?? null;
      session.result = event.context ?? null;
    }
  }

  return ordered.filter((session) => {
    if (done && session.outcome !== "done") return false;
    const when = sessionDate(session);
    if (from !== null && when < from) return false;
    if (to !== null && when >= to) return false;
    return true;
  }).sort((a, b) => sessionDate(a) - sessionDate(b));
}

// Une séance est datée de sa **fin** : c'est l'instant où elle compte comme
// faite. Une séance encore ouverte n'a que son début.
export function sessionDate(session) {
  return session.endedAt ?? session.startedAt ?? 0;
}

// Les séances réellement menées jusqu'à leur bilan. C'est la seule définition
// d'une séance « faite » : ouvrir une fonctionnalité puis la quitter aussitôt
// laisse un `abandoned`, qui ne compte pour rien (plan/04 § 10).
export function completedSessions(log, options = {}) {
  return sessions(log, { ...options, done: true });
}

// Durée d'une séance en minutes, ou `null` si elle n'a pas ses deux bornes.
// Le Programme s'en sert pour montrer le temps réellement passé, à côté de la
// durée qui n'était qu'indicative (plan/04 § 10).
export function sessionMinutes(session) {
  if (session.startedAt === null || session.endedAt === null) return null;
  return Math.max(0, Math.round((session.endedAt - session.startedAt) / 60000));
}
