// ============================================================================
//  Vues calculées du journal — Fondation F3
//
//  Le journal (progress/store.js) ne contient que des évènements bruts : tout
//  le reste se calcule ici. C'est ce qui permet d'ajouter une vue sans aucune
//  migration de données (plan/F3-suivi-progression.md § 3 et § 6).
//
//  Première vue construite : l'historique des séances, parce que le Programme
//  d'entraînement (04) en a réellement besoin — il lit ce journal au lieu d'en
//  tenir un second (plan/F3 § 5).
//
//  Les cinq autres vues du § 6 ont été écrites le 27/07/2026, quand l'écran de
//  progression (F3 étape E) est devenu leur premier consommateur réel : notes
//  souvent confondues, exercices maîtrisés, tempo maximal propre et évolution
//  par main. Toutes se calculent depuis le journal brut, sans migration.
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

// ----------------------------------------------------------------------------
//  Ce qui n'a pas été travaillé depuis le plus longtemps
//
//  Écrite le 30/07/2026, et pas avant : c'est le catalogue de 99 exercices qui
//  l'a rendue nécessaire. Tant qu'une famille en contenait un seul, « lequel
//  proposer » ne se posait pas ; à trois par niveau, une application qui rouvre
//  toujours le dernier en montre **un sur quatre-vingt-dix-neuf**, indéfiniment.
//  C'est exactement le reproche fait à Hanon, retourné contre nous.
//
//  Générique à dessein : `clefDe` dit comment reconnaître un candidat dans le
//  contexte d'une séance. Les exercices s'identifient par `exerciseId`, mais un
//  morceau s'identifierait par son fichier et un stimulus d'oreille par sa
//  famille — le jour où quelqu'un le demandera.
//
//  Un candidat jamais travaillé passe **avant** tous les autres : découvrir ce
//  qu'on n'a jamais fait vaut mieux que revoir ce qu'on a fait il y a longtemps.
// ----------------------------------------------------------------------------
export function leastRecentlyPracticed(
  log,
  { candidates, featureIds = null, clefDe = (contexte) => contexte?.exerciseId ?? null, to = null } = {}
) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const vuLe = new Map();
  for (const session of completedSessions(log, { featureIds, to })) {
    const clef = clefDe(session.context);
    if (clef === null || clef === undefined) continue;
    const quand = session.endedAt ?? session.startedAt;
    if (quand === null) continue;
    // Les séances sont rendues dans l'ordre : la dernière écrite gagne.
    vuLe.set(clef, quand);
  }

  let choisi = null;
  let plusAncien = Infinity;
  for (const candidat of candidates) {
    const quand = vuLe.has(candidat) ? vuLe.get(candidat) : -Infinity;
    if (quand < plusAncien) {
      plusAncien = quand;
      choisi = candidat;
    }
  }
  return choisi;
}

// Quand a-t-on travaillé chaque candidat ? La même lecture que ci-dessus, mais
// rendue en entier — l'écran Progression pourra la montrer sans la recalculer.
export function practicedAt(
  log,
  { featureIds = null, clefDe = (contexte) => contexte?.exerciseId ?? null } = {}
) {
  const vuLe = new Map();
  for (const session of completedSessions(log, { featureIds })) {
    const clef = clefDe(session.context);
    if (clef === null || clef === undefined) continue;
    const quand = session.endedAt ?? session.startedAt;
    if (quand !== null) vuLe.set(clef, quand);
  }
  return vuLe;
}

// ----------------------------------------------------------------------------
//  Notes souvent confondues (plan/F3 § 6, première ligne)
//
//  Pour chaque cible ratée, les réponses données à la place — les plus
//  fréquentes d'abord. Générique : tout `answer` en `wrong` qui porte une
//  cible et un `given` compte, quelle que soit la fonctionnalité. `keyOf`
//  identifie la cible, `givenKeyOf` la réponse donnée.
// ----------------------------------------------------------------------------
export function confusedTargets(
  log,
  {
    featureIds = null,
    keyOf = (target) => JSON.stringify(target),
    givenKeyOf = (given) => JSON.stringify(given),
    limit = 5,
  } = {}
) {
  const wanted = featureIds === null ? null : new Set(featureIds);
  const byTarget = new Map();

  for (const event of log) {
    if (event.type !== "answer" || event.outcome !== "wrong") continue;
    if (wanted && !wanted.has(event.featureId)) continue;
    if (!event.target || event.given === undefined) continue;

    const key = keyOf(event.target);
    let entry = byTarget.get(key);
    if (!entry) {
      entry = {
        key,
        featureId: event.featureId,
        target: event.target,
        wrong: 0,
        given: new Map(),
      };
      byTarget.set(key, entry);
    }
    entry.wrong++;
    entry.target = event.target; // la forme la plus récente fait foi

    const givenKey = givenKeyOf(event.given);
    const given = entry.given.get(givenKey);
    if (given) given.count++;
    else entry.given.set(givenKey, { key: givenKey, given: event.given, count: 1 });
  }

  return [...byTarget.values()]
    .sort((a, b) => b.wrong - a.wrong)
    .slice(0, limit)
    .map((entry) => ({
      key: entry.key,
      featureId: entry.featureId,
      target: entry.target,
      wrong: entry.wrong,
      confusedWith: [...entry.given.values()].sort((a, b) => b.count - a.count),
    }));
}

// ----------------------------------------------------------------------------
//  Exercices maîtrisés et tempo maximal propre (plan/F3 § 6, lignes 2 et 3)
//
//  Une exécution est un `run` en `clean`/`flawed` : 03 en écrit par exercice,
//  06 par passage de morceau. Les deux vues partagent le même regroupement.
//
//  Règle transversale du § 6 : « acquis après plusieurs réussites espacées » —
//  un exercice n'est maîtrisé qu'avec au moins MASTERY_CLEAN_RUNS exécutions
//  propres réparties sur au moins MASTERY_SESSIONS séances distinctes.
// ----------------------------------------------------------------------------
export const MASTERY_CLEAN_RUNS = 3;
export const MASTERY_SESSIONS = 2;

// Identité d'un exercice ou d'un passage dans le journal. La main en fait
// partie : maîtriser la main droite ne dit rien de la gauche.
export function runKey(target) {
  if (target.exerciseId) return `exercise:${target.exerciseId}:${target.hand ?? "?"}`;
  if (target.songId) return `section:${target.songId}:${target.sectionId ?? "?"}:${target.hand ?? "?"}`;
  return `run:${JSON.stringify(target)}`;
}

export function runStats(log, { featureIds = null } = {}) {
  const wanted = featureIds === null ? null : new Set(featureIds);
  const byRun = new Map();

  for (const event of log) {
    if (event.type !== "run" || !event.target) continue;
    if (wanted && !wanted.has(event.featureId)) continue;

    const key = runKey(event.target);
    let entry = byRun.get(key);
    if (!entry) {
      entry = {
        key,
        featureId: event.featureId,
        target: event.target,
        runs: 0,
        cleanRuns: 0,
        cleanSessions: new Set(),
        // Tempo maximal joué proprement : 03 écrit un tempo absolu (bpm), 06 un
        // pourcentage du tempo du morceau — les deux sont conservés tels quels,
        // jamais convertis (le journal ne connaît pas le tempo de référence).
        bestCleanTempo: null,
        bestCleanTempoPercent: null,
        lastAt: 0,
      };
      byRun.set(key, entry);
    }

    entry.runs++;
    entry.target = event.target;
    entry.lastAt = event.at ?? entry.lastAt;
    if (event.outcome === "clean") {
      entry.cleanRuns++;
      entry.cleanSessions.add(event.sessionId);
      if (Number.isFinite(event.target.tempo)) {
        entry.bestCleanTempo = Math.max(entry.bestCleanTempo ?? 0, event.target.tempo);
      }
      if (Number.isFinite(event.target.tempoPercent)) {
        entry.bestCleanTempoPercent = Math.max(
          entry.bestCleanTempoPercent ?? 0,
          event.target.tempoPercent
        );
      }
    }
  }

  return [...byRun.values()].map((entry) => ({
    key: entry.key,
    featureId: entry.featureId,
    target: entry.target,
    runs: entry.runs,
    cleanRuns: entry.cleanRuns,
    cleanSessionCount: entry.cleanSessions.size,
    bestCleanTempo: entry.bestCleanTempo,
    bestCleanTempoPercent: entry.bestCleanTempoPercent,
    lastAt: entry.lastAt,
    mastered:
      entry.cleanRuns >= MASTERY_CLEAN_RUNS &&
      entry.cleanSessions.size >= MASTERY_SESSIONS,
  }));
}

export function masteredRuns(log, options = {}) {
  return runStats(log, options).filter((entry) => entry.mastered);
}

// ----------------------------------------------------------------------------
//  Évolution par main (plan/F3 § 6, quatrième ligne)
//
//  Précision par main, séance par séance, à partir des `answer` qui portent une
//  main. Le lecteur compare le récent à l'ancien ; la vue ne fait que compter —
//  aucune précision n'est calculée sur zéro tentative.
// ----------------------------------------------------------------------------
export function handEvolution(log, { featureIds = null } = {}) {
  const wanted = featureIds === null ? null : new Set(featureIds);
  const bySession = new Map();
  const ordered = [];

  for (const event of log) {
    if (event.type !== "answer") continue;
    if (wanted && !wanted.has(event.featureId)) continue;
    const hand = event.target?.hand;
    if (hand !== "left" && hand !== "right") continue;

    let session = bySession.get(event.sessionId);
    if (!session) {
      session = {
        sessionId: event.sessionId,
        at: event.at ?? event.sessionId,
        byHand: {
          left: { attempts: 0, correct: 0 },
          right: { attempts: 0, correct: 0 },
        },
      };
      bySession.set(event.sessionId, session);
      ordered.push(session);
    }

    const counts = session.byHand[hand];
    counts.attempts++;
    if (event.outcome === "correct") counts.correct++;
  }

  for (const session of ordered) {
    for (const hand of ["left", "right"]) {
      const counts = session.byHand[hand];
      counts.accuracy = counts.attempts > 0 ? counts.correct / counts.attempts : null;
    }
  }
  return ordered;
}

// Agrégat des dernières séances contre l'ensemble : c'est la comparaison que
// montre l'écran de progression, sans graphique (plan/F3 § 13).
export function handSummary(log, { featureIds = null, recentSessions = 3 } = {}) {
  const sessionsWithHands = handEvolution(log, { featureIds });
  const summary = {};

  for (const hand of ["left", "right"]) {
    const total = { attempts: 0, correct: 0 };
    const recent = { attempts: 0, correct: 0 };
    const withHand = sessionsWithHands.filter(
      (session) => session.byHand[hand].attempts > 0
    );
    withHand.forEach((session, index) => {
      const counts = session.byHand[hand];
      total.attempts += counts.attempts;
      total.correct += counts.correct;
      if (index >= withHand.length - recentSessions) {
        recent.attempts += counts.attempts;
        recent.correct += counts.correct;
      }
    });
    summary[hand] = {
      attempts: total.attempts,
      accuracy: total.attempts > 0 ? total.correct / total.attempts : null,
      recentAttempts: recent.attempts,
      recentAccuracy: recent.attempts > 0 ? recent.correct / recent.attempts : null,
      sessions: withHand.length,
    };
  }
  return summary;
}
