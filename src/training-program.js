// ============================================================================
//  Programme d'entraînement — modèle, persistance et séances dues (feature 04)
//
//  Ce module ne connaît ni le DOM, ni le registre des fonctionnalités : il
//  reçoit la liste de ce qui est disponible et le journal de progression (F3),
//  et dit ce qui reste à faire aujourd'hui. Stockage et horloge sont
//  injectables, pour les mêmes raisons que progress/store.js : tout se vérifie
//  hors navigateur, y compris un changement de semaine ou de mois.
//
//  Il n'existe **pas** de `training-log.js` : le journal des séances appartient
//  à F3 et le programme le lit (plan/F3 § 5, plan/04 § 6). Tenir un second
//  historique ferait deux sources de vérité pour la même question.
// ============================================================================

import { completedSessions } from "./progress/views.js";

export const STORAGE_KEY = "synthesia.training.v1";
export const STORE_VERSION = 1;

// Durée indicative d'une séance, jamais un chronomètre qui interrompt
// (plan/04 § 10).
export const DEFAULT_DURATION_MINUTES = 10;
export const MIN_DURATION_MINUTES = 5;
export const MAX_DURATION_MINUTES = 60;
export const DURATION_STEP_MINUTES = 5;

export const MAX_TIMES_PER_WEEK = 7;
export const MAX_TIMES_PER_MONTH = 31;

export const FREQUENCY_TYPES = ["daily", "weekly", "monthly"];

// ----------------------------------------------------------------------------
//  Ce qui compte comme une séance d'une fonctionnalité
//
//  Le journal n'enregistre pas toujours une séance sous l'identifiant du
//  registre : écouter un morceau n'est pas une séance, travailler un passage en
//  est une (plan/06). Une entrée du programme sait donc quels `featureId` du
//  journal la satisfont. Les autres fonctionnalités écrivent sous leur propre
//  identifiant et n'ont rien à déclarer ici.
// ----------------------------------------------------------------------------
export const SESSION_FEATURE_IDS = {
  song: ["song-practice"],
};

export function sessionFeatureIds(featureId) {
  return SESSION_FEATURE_IDS[featureId] ?? [featureId];
}

// Réglages proposés à la création plutôt qu'un formulaire vide (plan/04 § 9).
// Une fonctionnalité absente de cette table démarre en quotidien.
const DEFAULT_ITEMS = {
  "note-reading": { frequency: { type: "daily" }, sessionDurationMinutes: 10 },
  technique: { frequency: { type: "weekly", timesPerWeek: 3 }, sessionDurationMinutes: 15 },
  rhythm: { frequency: { type: "weekly", timesPerWeek: 2 }, sessionDurationMinutes: 10 },
  song: { frequency: { type: "daily" }, sessionDurationMinutes: 20 },
  "ear-training": { frequency: { type: "weekly", timesPerWeek: 3 }, sessionDurationMinutes: 10 },
};

export function defaultItem(featureId) {
  const base = DEFAULT_ITEMS[featureId] ?? {
    frequency: { type: "daily" },
    sessionDurationMinutes: DEFAULT_DURATION_MINUTES,
  };
  return {
    featureId,
    frequency: { ...base.frequency },
    sessionDurationMinutes: base.sessionDurationMinutes,
  };
}

// ----------------------------------------------------------------------------
//  Périodes de référence
//
//  Tout est calculé en heure **locale** : la journée de pratique de
//  l'utilisateur n'est pas celle d'UTC. La semaine commence le lundi et le mois
//  est le mois calendaire (plan/04 § 10).
// ----------------------------------------------------------------------------
export function startOfDay(at) {
  const date = new Date(at);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function startOfWeek(at) {
  const date = new Date(startOfDay(at));
  const dayIndex = (date.getDay() + 6) % 7; // 0 = lundi
  date.setDate(date.getDate() - dayIndex);
  date.setHours(0, 0, 0, 0); // un changement d'heure d'été ne doit pas décaler la borne
  return date.getTime();
}

export function startOfMonth(at) {
  const date = new Date(at);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function periodStart(frequency, at) {
  if (frequency?.type === "weekly") return startOfWeek(at);
  if (frequency?.type === "monthly") return startOfMonth(at);
  return startOfDay(at);
}

// ----------------------------------------------------------------------------
//  Fréquences
// ----------------------------------------------------------------------------
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toCount(value, fallback, max) {
  const rounded = Math.round(Number(value));
  if (!Number.isFinite(rounded)) return fallback;
  return clamp(rounded, 1, max);
}

// Nombre de séances attendues sur la période en cours.
export function quotaOf(frequency) {
  if (frequency?.type === "weekly") {
    return toCount(frequency.timesPerWeek, 1, MAX_TIMES_PER_WEEK);
  }
  if (frequency?.type === "monthly") {
    return toCount(frequency.timesPerMonth, 1, MAX_TIMES_PER_MONTH);
  }
  return 1;
}

export function frequencyLabel(frequency) {
  const quota = quotaOf(frequency);
  if (frequency?.type === "weekly") {
    return quota === 1 ? "Une fois par semaine" : `${quota} fois par semaine`;
  }
  if (frequency?.type === "monthly") {
    return quota === 1 ? "Une fois par mois" : `${quota} fois par mois`;
  }
  return "Tous les jours";
}

export function periodLabel(frequency) {
  if (frequency?.type === "weekly") return "cette semaine";
  if (frequency?.type === "monthly") return "ce mois-ci";
  return "aujourd'hui";
}

// Change le type de fréquence en gardant un nombre de séances plausible :
// passer de « 3 fois par semaine » à « X fois par mois » ne doit pas repartir
// de 1 sans raison.
export function withFrequencyType(frequency, type) {
  if (type === "weekly") {
    return { type, timesPerWeek: quotaOf({ ...frequency, type: "weekly" }) };
  }
  if (type === "monthly") {
    const previous = quotaOf(frequency);
    const times = frequency?.type === "weekly" ? previous * 4 : previous;
    return { type, timesPerMonth: clamp(times, 1, MAX_TIMES_PER_MONTH) };
  }
  return { type: "daily" };
}

export function withQuota(frequency, quota) {
  if (frequency?.type === "weekly") {
    return { type: "weekly", timesPerWeek: toCount(quota, 1, MAX_TIMES_PER_WEEK) };
  }
  if (frequency?.type === "monthly") {
    return { type: "monthly", timesPerMonth: toCount(quota, 1, MAX_TIMES_PER_MONTH) };
  }
  return { type: "daily" }; // le quotidien n'a pas de nombre à régler
}

export function maxQuota(frequency) {
  if (frequency?.type === "weekly") return MAX_TIMES_PER_WEEK;
  if (frequency?.type === "monthly") return MAX_TIMES_PER_MONTH;
  return 1;
}

// ----------------------------------------------------------------------------
//  Normalisation
//
//  Un programme relu du stockage a pu être écrit par une version précédente, ou
//  contenir une fonctionnalité qui n'existe plus. Rien de tout cela ne doit
//  faire échouer l'écran : les entrées inutilisables sont écartées.
// ----------------------------------------------------------------------------
function normalizeFrequency(raw) {
  const type = FREQUENCY_TYPES.includes(raw?.type) ? raw.type : "daily";
  return withQuota({ ...raw, type }, quotaOf({ ...raw, type }));
}

export function normalizeDuration(minutes) {
  const rounded = Math.round(Number(minutes));
  if (!Number.isFinite(rounded)) return DEFAULT_DURATION_MINUTES;
  return clamp(rounded, MIN_DURATION_MINUTES, MAX_DURATION_MINUTES);
}

// `availableFeatureIds` vient du registre F1 : un programme ne peut pas
// planifier une fonctionnalité qui n'existe pas ou qui n'est pas encore
// disponible (plan/04 § 3 et § 10). Une même fonctionnalité ne peut apparaître
// qu'une fois : la première l'emporte.
export function normalizeProgram(items, { availableFeatureIds = null } = {}) {
  if (!Array.isArray(items)) return [];
  const allowed = availableFeatureIds === null ? null : new Set(availableFeatureIds);
  const seen = new Set();
  const normalized = [];

  for (const raw of items) {
    const featureId = raw?.featureId;
    if (typeof featureId !== "string" || featureId === "") continue;
    if (allowed && !allowed.has(featureId)) continue;
    if (seen.has(featureId)) continue;
    seen.add(featureId);
    normalized.push({
      featureId,
      frequency: normalizeFrequency(raw.frequency),
      sessionDurationMinutes: normalizeDuration(raw.sessionDurationMinutes),
    });
  }

  return normalized;
}

// ----------------------------------------------------------------------------
//  Séances dues du jour (plan/04 § 7)
//
//  Une fonctionnalité est due tant que le nombre de séances terminées depuis le
//  début de sa période est strictement inférieur à son quota. Aucune
//  répartition n'est imposée entre les jours : c'est l'utilisateur qui choisit
//  quand faire ses X séances.
// ----------------------------------------------------------------------------
export function dueToday(items, log, { now = Date.now() } = {}) {
  const at = typeof now === "function" ? now() : now;
  const dayStart = startOfDay(at);

  return items.map((item) => {
    const featureIds = sessionFeatureIds(item.featureId);
    const from = periodStart(item.frequency, at);
    const inPeriod = completedSessions(log, { featureIds, from });
    const quota = quotaOf(item.frequency);
    const doneInPeriod = inPeriod.length;
    const doneToday = inPeriod.filter(
      (session) => (session.endedAt ?? 0) >= dayStart
    ).length;

    return {
      ...item,
      quota,
      periodStart: from,
      doneInPeriod,
      doneToday,
      remaining: Math.max(0, quota - doneInPeriod),
      due: doneInPeriod < quota,
      lastSessionAt: doneInPeriod > 0 ? inPeriod[doneInPeriod - 1].endedAt : null,
    };
  });
}

// Vrai quand plus rien n'est dû : l'écran Aujourd'hui doit le dire clairement
// plutôt que d'afficher une liste vide (plan/04 § 8).
export function allDone(status) {
  return status.length > 0 && status.every((entry) => !entry.due);
}

// ----------------------------------------------------------------------------
//  Persistance
//
//  Comme partout ailleurs, un stockage refusé, plein ou illisible ne casse
//  rien : le programme reste utilisable pour la session en cours, seule la
//  mémoire d'une visite à l'autre est perdue.
// ----------------------------------------------------------------------------
function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function createTrainingStore({ storage = defaultStorage() } = {}) {
  let items = read();
  let writable = storage !== null;

  // `null` = aucun programme n'a jamais été enregistré, ce qui n'est pas la
  // même chose qu'un programme enregistré puis vidé : le premier ouvre l'écran
  // de création, le second reste un programme sans rien de prévu.
  function read() {
    if (!storage) return null;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.v !== STORE_VERSION || !Array.isArray(parsed.items)) return null;
      return parsed.items;
    } catch {
      return null; // illisible : on repart d'aucun programme plutôt que de bloquer
    }
  }

  return {
    // Le programme enregistré, filtré par ce que le registre propose
    // aujourd'hui, ou `null` s'il n'y en a jamais eu.
    program(options = {}) {
      if (items === null) return null;
      return normalizeProgram(items, options);
    },

    get configured() {
      return items !== null;
    },

    save(nextItems, options = {}) {
      items = normalizeProgram(nextItems, options);
      if (writable) {
        try {
          storage.setItem(
            STORAGE_KEY,
            JSON.stringify({ v: STORE_VERSION, items })
          );
        } catch {
          writable = false;
        }
      }
      return [...items];
    },

    clear() {
      items = null;
      if (!storage) return;
      try {
        storage.removeItem(STORAGE_KEY);
        writable = true;
      } catch {
        writable = false;
      }
    },

    get persistent() {
      return writable;
    },
  };
}
