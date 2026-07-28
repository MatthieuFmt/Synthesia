// ============================================================================
//  Programme d'entraînement — réglages et repères de temps (feature 04)
//
//  Depuis le 27/07/2026, l'utilisateur ne compose plus son programme : il dit
//  seulement **combien de temps il a par jour**, et le professeur
//  (`training-coach.js`) construit la séance. Ce module ne garde donc que ce
//  qui reste vraiment un réglage — le budget quotidien —, les bornes de temps
//  et la table qui dit quels identifiants du journal valent une séance.
//
//  Ce module ne connaît ni le DOM, ni le registre des fonctionnalités.
//  Stockage et horloge sont injectables, pour les mêmes raisons que
//  progress/store.js : tout se vérifie hors navigateur, y compris un
//  changement de journée ou de semaine.
//
//  Il n'existe **pas** de `training-log.js` : le journal des séances appartient
//  à F3 et le programme le lit (plan/F3 § 5, plan/04 § 6). Tenir un second
//  historique ferait deux sources de vérité pour la même question.
// ============================================================================

export const STORAGE_KEY = "synthesia.training.v2";
export const STORE_VERSION = 2;

// ----------------------------------------------------------------------------
//  Le seul réglage : le temps dont on dispose chaque jour
//
//  Vingt minutes par défaut, parce que c'est la durée qu'on tient réellement
//  tous les jours — et qu'un programme qu'on ne tient pas ne sert à rien
//  (plan/04 § 5). Ce n'est jamais un chronomètre : rien ne s'arrête tout seul.
// ----------------------------------------------------------------------------
export const DEFAULT_DAILY_MINUTES = 20;
export const DAILY_MINUTES_CHOICES = [10, 15, 20, 30, 45, 60];
export const MIN_DAILY_MINUTES = DAILY_MINUTES_CHOICES[0];
export const MAX_DAILY_MINUTES = DAILY_MINUTES_CHOICES[DAILY_MINUTES_CHOICES.length - 1];

export function normalizeDailyMinutes(minutes) {
  const rounded = Math.round(Number(minutes));
  if (!Number.isFinite(rounded)) return DEFAULT_DAILY_MINUTES;
  // On se ramène au choix proposé le plus proche : une valeur venue d'un
  // stockage ancien ou bricolé ne doit pas produire une séance impossible à
  // répartir.
  return DAILY_MINUTES_CHOICES.reduce((best, choice) =>
    Math.abs(choice - rounded) < Math.abs(best - rounded) ? choice : best
  );
}

// ----------------------------------------------------------------------------
//  Ce qui compte comme une séance d'une fonctionnalité
//
//  Le journal n'enregistre pas toujours une séance sous l'identifiant du
//  registre : écouter un morceau n'est pas une séance, travailler un passage en
//  est une (plan/06). Le professeur sait donc quels `featureId` du journal
//  satisfont un bloc de la séance. Les autres fonctionnalités écrivent sous
//  leur propre identifiant et n'ont rien à déclarer ici.
// ----------------------------------------------------------------------------
export const SESSION_FEATURE_IDS = {
  song: ["song-practice"],
  // Le mode défilant a remplacé l'ancien exercice fixe : les deux identifiants
  // historiques satisfont désormais le même bloc « Lecture de notes ».
  fluency: ["fluency", "note-reading"],
};

export function sessionFeatureIds(featureId) {
  return SESSION_FEATURE_IDS[featureId] ?? [featureId];
}

// ----------------------------------------------------------------------------
//  Périodes de référence
//
//  Tout est calculé en heure **locale** : la journée de pratique de
//  l'utilisateur n'est pas celle d'UTC. La semaine commence le lundi
//  (plan/04 § 10).
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

// Début du jour situé `offset` jours avant (ou après) celui de `at`. Passer par
// `setDate` plutôt que par 24 h × n : les jours de changement d'heure ne durent
// pas 24 heures.
export function startOfDayOffset(at, offset) {
  const date = new Date(startOfDay(at));
  date.setDate(date.getDate() + offset);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// ----------------------------------------------------------------------------
//  Persistance
//
//  Comme partout ailleurs, un stockage refusé, plein ou illisible ne casse
//  rien : le réglage reste utilisable pour la session en cours, seule la
//  mémoire d'une visite à l'autre est perdue.
//
//  La clé `synthesia.training.v1` — la liste de fonctionnalités, fréquences et
//  durées de l'ancienne version — n'est **pas** migrée : il n'y a plus rien à
//  y reprendre, la séance étant désormais composée à partir du seul budget.
// ----------------------------------------------------------------------------
function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function createTrainingStore({ storage = defaultStorage() } = {}) {
  let dailyMinutes = read();
  let writable = storage !== null;

  // `null` = aucun réglage n'a jamais été enregistré. L'application marche
  // quand même : elle propose alors le budget par défaut.
  function read() {
    if (!storage) return null;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.v !== STORE_VERSION) return null;
      if (!Number.isFinite(Number(parsed.dailyMinutes))) return null;
      return normalizeDailyMinutes(parsed.dailyMinutes);
    } catch {
      return null; // illisible : on repart du réglage par défaut plutôt que de bloquer
    }
  }

  return {
    get dailyMinutes() {
      return dailyMinutes ?? DEFAULT_DAILY_MINUTES;
    },

    // Vrai seulement si l'utilisateur a réellement choisi sa durée : l'écran
    // peut alors se passer de l'explication de bienvenue.
    get configured() {
      return dailyMinutes !== null;
    },

    save(minutes) {
      dailyMinutes = normalizeDailyMinutes(minutes);
      if (writable) {
        try {
          storage.setItem(
            STORAGE_KEY,
            JSON.stringify({ v: STORE_VERSION, dailyMinutes })
          );
        } catch {
          writable = false;
        }
      }
      return dailyMinutes;
    },

    clear() {
      dailyMinutes = null;
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
