// ============================================================================
//  Journal de progression — Fondation F3
//
//  Une seule liste d'évènements bruts, ajoutés au fil de la pratique et jamais
//  modifiés. Tout le reste (notes confondues, révisions, historique des
//  séances) se calcule à partir de ce journal : ajouter une vue ne demande donc
//  aucune migration (plan/F3-suivi-progression.md § 3 et § 7).
//
//  Une séance n'est pas une seconde structure : c'est une paire d'évènements
//  `session-start` / `session-end` du même journal.
//
//  Aucun DOM, aucun Canvas : ce module est testable sans navigateur. Le
//  stockage et l'horloge sont injectables pour la même raison.
// ============================================================================

export const STORAGE_KEY = "synthesia.progress.v1";
export const LOG_VERSION = 1;

// Plafond du journal en attendant la compaction (F3 étape E). À ~14 évènements
// par session de Lecture de notes, cela couvre plusieurs mois de pratique
// quotidienne pour environ 600 Ko. Au-delà, les plus anciens partent d'abord.
export const MAX_EVENTS = 4000;

// Le journal entier est réécrit d'un bloc : le faire à chaque touche pressée
// coûterait plus cher que l'exercice lui-même sur la tablette. Les évènements
// s'accumulent donc en mémoire entre deux enregistrements.
const WRITE_INTERVAL_MS = 1500;

// Vocabulaire fermé (plan/F3-suivi-progression.md § 7). Une valeur nouvelle
// s'ajoute au plan puis ici, jamais à la volée : les vues ne calculent quelque
// chose de commun que si ce vocabulaire tient.
export const EVENT_TYPES = new Set([
  "answer",        // une tentative de réponse (02, 07, 08)
  "beat",          // un jugement de timing par frappe (05, 09)
  "repetition",    // une répétition d'exercice effectuée (03)
  "run",           // une exécution complète d'un exercice ou d'un passage (03, 06)
  "session-start",
  "session-end",
]);

export const OUTCOMES = new Set([
  "correct", "wrong",                        // réponse jugée
  "on-time", "early", "late", "missed",      // timing
  "clean", "flawed",                         // exécution
  "blurred", "gap",                          // pédale
  "done", "abandoned",                       // séance
  "none",                                    // mesuré par rien (pratique libre)
]);

// ----------------------------------------------------------------------------
//  Accès au stockage
//
//  Lire `localStorage` peut échouer avant même d'être utilisé (navigation
//  privée, iframe restreinte, stockage désactivé). Rien de tout cela ne doit
//  empêcher de pratiquer : on retombe alors sur un journal purement en mémoire.
// ----------------------------------------------------------------------------
function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readLog(storage) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed?.v !== LOG_VERSION || !Array.isArray(parsed.log)) return [];
    return parsed.log;
  } catch {
    // Journal illisible (corrompu, écrit par une version future) : on repart de
    // zéro plutôt que de bloquer l'application sur une donnée morte.
    return [];
  }
}

export function createProgressStore({
  storage = defaultStorage(),
  now = Date.now,
  maxEvents = MAX_EVENTS,
} = {}) {
  let log = readLog(storage);
  let writable = storage !== null;
  let lastWriteAt = 0;
  let dirty = false;

  // Écrit le journal. En cas de quota dépassé, la moitié la plus ancienne est
  // abandonnée et l'écriture retentée une seule fois ; si elle échoue encore,
  // la persistance s'arrête là et la séance continue en mémoire.
  function write() {
    if (!writable) return false;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify({ v: LOG_VERSION, log }));
        lastWriteAt = now();
        dirty = false;
        return true;
      } catch {
        log = log.slice(Math.ceil(log.length / 2));
      }
    }
    writable = false;
    return false;
  }

  function flush() {
    if (!dirty) return false;
    return write();
  }

  function append(event) {
    if (!EVENT_TYPES.has(event.type)) {
      console.error(`Type d'évènement inconnu : ${event.type}`);
      return null;
    }
    if (event.outcome !== undefined && !OUTCOMES.has(event.outcome)) {
      console.error(`Résultat d'évènement inconnu : ${event.outcome}`);
      return null;
    }

    log.push(event);
    // Le journal peut perdre le `session-start` d'une séance ancienne : les
    // vues doivent tolérer un évènement orphelin plutôt que de le compter à
    // part.
    if (log.length > maxEvents) log.splice(0, log.length - maxEvents);
    dirty = true;

    if (now() - lastWriteAt >= WRITE_INTERVAL_MS) write();
    return event;
  }

  // Ouvre une séance : `context` porte tout ce qui ne varie pas d'une question
  // à l'autre (niveau, main travaillée, tempo). Le répéter sur chaque évènement
  // pèserait un tiers du journal pour rien.
  function openSession(featureId, context = {}) {
    const sessionId = now();
    let closed = false;

    append({ at: sessionId, sessionId, featureId, type: "session-start", context });

    return {
      sessionId,

      // `target`, `outcome` et `given` selon la fonctionnalité
      // (plan/F3-suivi-progression.md § 7).
      record(event) {
        if (closed) return null;
        return append({ at: now(), sessionId, featureId, ...event });
      },

      // `done` = la séance est allée jusqu'à son bilan ; `abandoned` = quittée
      // avant. C'est cette distinction que lira le Programme d'entraînement (04).
      close(outcome = "done", context = {}) {
        if (closed) return;
        closed = true;
        append({ at: now(), sessionId, featureId, type: "session-end", outcome, context });
        flush(); // la fin d'une séance est toujours écrite, sans attendre l'intervalle
      },

      get closed() {
        return closed;
      },
    };
  }

  return {
    openSession,
    flush,

    // Copie : le journal ne se modifie que par `openSession`.
    log() {
      return [...log];
    },

    clear() {
      log = [];
      dirty = false;
      if (!storage) return;
      try {
        storage.removeItem(STORAGE_KEY);
        writable = true;
      } catch {
        writable = false;
      }
    },

    // Faux dès qu'une écriture a définitivement échoué : l'exercice continue,
    // seule la persistance est perdue.
    get persistent() {
      return writable;
    },
  };
}
