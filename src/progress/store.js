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

// Compaction (F3 étape E) : au-delà de ce nombre d'évènements, le détail des
// tentatives anciennes est abandonné — seules leurs bornes de séance sont
// gardées. L'historique des séances (la vue qui nourrit le Programme) reste
// donc complet, et les vues de détail se recalculent sur le récent, où vivent
// déjà les révisions (RECENT_ATTEMPTS par cible).
export const DETAIL_EVENTS = 2500;

// Vocabulaire fermé (plan/F3-suivi-progression.md § 7). Une valeur nouvelle
// s'ajoute au plan puis ici, jamais à la volée : les vues ne calculent quelque
// chose de commun que si ce vocabulaire tient.
//
// Le vocabulaire n'est fermé qu'à l'**écriture** : un journal déjà stocké se
// relit tel quel. C'est ce qui a permis d'en retirer, le 07/08/2026, ce qui
// appartenait en propre au Rythme (05) et à la Pédale (09) — le type `beat` et
// les résultats `on-time` / `early` / `late` / `blurred` / `gap` — sans rien
// casser des séances déjà enregistrées. `missed` reste : c'est aussi le mot de
// la Lecture de notes pour une note laissée passer.
export const EVENT_TYPES = new Set([
  "answer",        // une tentative de réponse (07, 10)
  "repetition",    // une répétition d'exercice effectuée (03)
  "run",           // une exécution complète d'un exercice ou d'un passage (03, 06)
  "session-start",
  "session-end",
]);

export const OUTCOMES = new Set([
  "correct", "wrong",                        // réponse jugée
  "missed",                                  // cible laissée passer
  "clean", "flawed",                         // exécution
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

// Un fichier choisi par l'utilisateur n'est pas le journal déjà stocké.
// On en recopie les évènements lisibles, y compris d'anciens types (Rythme,
// Pédale) que l'application n'écrit plus. Le reste est ignoré.
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const FEATURE_ID = /^[a-z][a-z0-9-]{0,39}$/;
const TOKEN = /^[a-z][a-z0-9-]{0,31}$/;
const MAX_IMPORT_EVENTS = 8000;
const MAX_PLAIN_NODES = 80;

function finiteStamp(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1e15) return null;
  return number;
}

function copyPlain(value, depth, budget) {
  if (budget.nodes <= 0) return undefined;
  budget.nodes -= 1;
  if (value === null) return null;
  const kind = typeof value;
  if (kind === "boolean") return value;
  if (kind === "number") return Number.isFinite(value) ? value : undefined;
  if (kind === "string") return value.length > 200 ? value.slice(0, 200) : value;
  if (depth >= 4) return undefined;
  if (Array.isArray(value)) {
    const copy = [];
    for (const item of value.slice(0, 32)) {
      const next = copyPlain(item, depth + 1, budget);
      if (next !== undefined) copy.push(next);
    }
    return copy;
  }
  if (kind !== "object") return undefined;
  const copy = {};
  for (const key of Object.keys(value).slice(0, 24)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    const next = copyPlain(value[key], depth + 1, budget);
    if (next !== undefined) copy[key] = next;
  }
  return copy;
}

function sanitizeEvent(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (typeof raw.type !== "string" || !TOKEN.test(raw.type)) return null;
  if (typeof raw.featureId !== "string" || !FEATURE_ID.test(raw.featureId)) return null;
  const at = finiteStamp(raw.at);
  const sessionId = finiteStamp(raw.sessionId);
  if (at === null || sessionId === null) return null;

  const event = { at, sessionId, featureId: raw.featureId, type: raw.type };
  if (raw.outcome !== undefined) {
    if (typeof raw.outcome !== "string" || !TOKEN.test(raw.outcome)) return null;
    event.outcome = raw.outcome;
  }
  const budget = { nodes: MAX_PLAIN_NODES };
  for (const field of ["target", "given", "context"]) {
    if (raw[field] === undefined) continue;
    const value = raw[field];
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    event[field] = copyPlain(value, 1, budget);
  }
  return event;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
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

    // Export (F3 § 8) : le document tel qu'il est stocké — la sauvegarde
    // possible sans serveur. Une copie, comme `log()`.
    exportPayload() {
      return { v: LOG_VERSION, exportedAt: now(), log: [...log] };
    },

    // Réimporte cet export. Ce qui est déjà là reste : un vieux fichier ne
    // doit pas effacer une séance faite depuis, et le même fichier importé
    // deux fois ne double rien. Ensuite le journal redevient chronologique,
    // parce que les vues le lisent comme une suite dans le temps.
    importPayload(payload) {
      if (
        !payload ||
        typeof payload !== "object" ||
        Array.isArray(payload) ||
        payload.v !== LOG_VERSION ||
        !Array.isArray(payload.log)
      ) {
        return { ok: false, reason: "unreadable", added: 0, incoming: 0 };
      }

      const slice =
        payload.log.length > MAX_IMPORT_EVENTS
          ? payload.log.slice(-MAX_IMPORT_EVENTS)
          : payload.log;
      const accepted = [];
      for (const raw of slice) {
        const event = sanitizeEvent(raw);
        if (event) accepted.push(event);
      }

      const known = new Set();
      for (const event of log) {
        const cleaned = sanitizeEvent(event);
        if (cleaned) known.add(stableStringify(cleaned));
      }

      const fresh = [];
      for (const event of accepted) {
        const key = stableStringify(event);
        if (known.has(key)) continue;
        known.add(key);
        fresh.push(key);
        log.push(event);
      }

      if (fresh.length === 0) {
        return { ok: true, added: 0, incoming: accepted.length, capped: false };
      }

      log.sort((a, b) => a.at - b.at);
      if (log.length > maxEvents) log.splice(0, log.length - maxEvents);
      const kept = new Set();
      for (const event of log) {
        const cleaned = sanitizeEvent(event);
        if (cleaned) kept.add(stableStringify(cleaned));
      }
      const added = fresh.filter((key) => kept.has(key)).length;
      dirty = true;
      if (!write()) {
        return { ok: false, reason: "unwritable", added, incoming: accepted.length };
      }
      return { ok: true, added, incoming: accepted.length, capped: fresh.length > added };
    },

    // Compaction (F3 étape E) : garde le détail des `keepDetail` évènements les
    // plus récents ; des plus anciens, seules les bornes de séance survivent.
    // Rend vrai si quelque chose a été retiré.
    compact({ keepDetail = DETAIL_EVENTS } = {}) {
      const cutoff = log.length - keepDetail;
      if (cutoff <= 0) return false;

      const kept = log.filter(
        (event, index) =>
          index >= cutoff ||
          event.type === "session-start" ||
          event.type === "session-end"
      );
      if (kept.length === log.length) return false;

      log = kept;
      dirty = true;
      write();
      return true;
    },

    // Faux dès qu'une écriture a définitivement échoué : l'exercice continue,
    // seule la persistance est perdue.
    get persistent() {
      return writable;
    },
  };
}

// Un seul journal pour la page. Chaque `start()` relisait et reparsait
// localStorage ; les modes se relaient, ils n'écrivent jamais en même temps.
// `createProgressStore` reste disponible pour un stockage injecté (tests).
let sharedStore = null;

export function sharedProgressStore() {
  if (!sharedStore) sharedStore = createProgressStore();
  return sharedStore;
}
