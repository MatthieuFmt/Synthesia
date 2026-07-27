// ============================================================================
//  Travail intelligent d'un morceau — Feature 06, partie sans interface
//
//  Le mode Morceau (`song-mode.js`) lit un morceau ; ce module lui ajoute de
//  quoi le **travailler** : découper des passages, les retenir d'une séance à
//  l'autre, dire ce qu'est une exécution propre, et à quel tempo repartir
//  ensuite (plan/06-travail-intelligent-morceau.md).
//
//  Rien ici ne connaît le DOM, le Canvas ni Tone.js : ce module se teste dans
//  Node, comme `exercises/generate-exercise.js` ou `rhythm/patterns.js`. Le
//  stockage et l'horloge sont injectables pour la même raison.
//
//  Ce qu'il ne refait pas :
//    - le jugement d'une exécution vient de `exercises/validate-run.js`, écrit
//      pour la validation MIDI des exercices techniques. Un passage de morceau
//      et une série d'exercice se jugent exactement pareil — les bonnes notes
//      au bon moment —, et le § 9 de plan/06 définit « propre » avec les mêmes
//      mots que le § 9 de plan/03. Le dupliquer aurait donné deux définitions à
//      maintenir ;
//    - les seuils avance/retard restent ceux de `rhythm/timing.js`
//      (cf. CLAUDE.md : « ne pas réécrire un second jugement avance/retard »).
// ============================================================================

import { stepsToRework, validateRepetition } from "./exercises/validate-run.js";

// « Les notes à revoir » du bilan d'un passage (plan/06 § 13, étape E) : ce sont
// les pas les plus souvent ratés, exactement la même question que « les
// transitions à retravailler » d'un exercice (plan/03 § 9). Ici, un pas est le
// rang de la note dans le passage.
export { stepsToRework as notesToRework };

export const STORAGE_KEY = "synthesia.practice.v1";
export const STORE_VERSION = 1;

// Identifiant du « passage » qui désigne le morceau entier. Ce n'est pas un
// passage comme les autres — on ne le crée ni ne le supprime —, mais il se
// travaille et se juge de la même façon, ce qui évite un second chemin de code
// pour l'exécution complète exigée par le § 9 (« morceau appris »).
export const WHOLE_SONG_ID = "whole";

export const MIN_SECTION_SECONDS = 1;      // en deçà, un passage n'a plus de sens
export const DEFAULT_SECTION_SECONDS = 8;  // longueur d'un passage créé au vol

// Tempo de travail, en pourcentage du tempo réel du morceau (plan/06 § 8).
// Les bornes sont celles du curseur de vitesse déjà en place (0,25× à 2×), et
// le pas vaut celui de ce curseur : les deux réglages restent la même chose.
export const TEMPO_MIN_PERCENT = 25;
export const TEMPO_MAX_PERCENT = 200;
export const TEMPO_STEP_PERCENT = 5;

// Deux notes appartiennent au même accord si leurs départs tiennent dans cette
// fenêtre. Un fichier MIDI joué à la main ne pose jamais trois notes à la
// milliseconde près, et 30 ms restent inaudibles comme décalage.
export const CHORD_TOLERANCE_SECONDS = 0.03;

// « Une aide doit rester disponible après plusieurs échecs sur la même note »
// (plan/06 § 7). Deux fausses notes sur le même accord suffisent à dire que la
// suivante ne viendra pas toute seule.
export const HELP_AFTER_FAILS = 2;

// « Passage maîtrisé : plusieurs exécutions propres au tempo cible, sur au
// moins deux séances distinctes » (plan/06 § 9). Le jour sert de séance : deux
// réussites le même après-midi ne disent pas qu'un passage est acquis.
export const MASTERY_MIN_CLEAN_RUNS = 2;
export const MASTERY_MIN_DAYS = 2;

// ----------------------------------------------------------------------------
//  Identifiant d'un morceau
//
//  `songs.json` ne porte pas d'identifiant (et ne doit pas être modifié) : on
//  en dérive un depuis le titre, lisible tel quel dans le stockage.
// ----------------------------------------------------------------------------
export function songIdFromTitle(title) {
  const slug = String(title ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents séparés par NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "morceau";
}

// Clé de journée locale : c'est la séance de l'utilisateur, pas celle d'UTC.
export function dayKey(timestamp) {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// ----------------------------------------------------------------------------
//  Bornes d'un passage
// ----------------------------------------------------------------------------
export function clampBounds(start, end, duration) {
  const max = Math.max(0, duration);
  let from = Math.min(Math.max(0, start), max);
  let to = Math.min(Math.max(0, end), max);
  if (to < from) [from, to] = [to, from];

  // Un passage trop court est repoussé vers la droite, sauf s'il touche déjà la
  // fin du morceau : on le décale alors vers la gauche.
  if (to - from < MIN_SECTION_SECONDS) {
    to = Math.min(max, from + MIN_SECTION_SECONDS);
    if (to - from < MIN_SECTION_SECONDS) from = Math.max(0, to - MIN_SECTION_SECONDS);
  }
  return { startSeconds: from, endSeconds: to };
}

// ----------------------------------------------------------------------------
//  Notes attendues d'un passage
//
//  Une note compte pour le passage si elle y **commence** : une note tenue qui
//  déborde de la fin appartient encore au passage qu'on travaille, et une note
//  qui sonne encore au début n'a pas à être rejouée.
// ----------------------------------------------------------------------------
export function isWorkedHand(note, hand) {
  return hand === "both" || note.hand === hand;
}

export function expectedNotes(notes, { startSeconds, endSeconds }, hand) {
  const expected = [];
  for (const note of notes) {
    if (note.time < startSeconds || note.time >= endSeconds) continue;
    if (!isWorkedHand(note, hand)) continue;
    // `step` = rang de la note dans le passage. `stepsToRework` s'en sert pour
    // dire *où* ça coince, comme le pas d'un motif d'exercice.
    expected.push({ ...note, step: expected.length });
  }
  return expected;
}

// ----------------------------------------------------------------------------
//  Accords : ce que le mode Attente attend d'un coup
//
//  « Un accord attend toutes ses notes, dans n'importe quel ordre, sans
//  contrainte de simultanéité stricte » (plan/06 § 7).
// ----------------------------------------------------------------------------
export function groupChords(notes, tolerance = CHORD_TOLERANCE_SECONDS) {
  const groups = [];
  for (const note of notes) {
    const last = groups[groups.length - 1];
    if (last && note.time - last.time <= tolerance) {
      last.midis.push(note.midi);
      last.notes.push(note);
      continue;
    }
    groups.push({ time: note.time, midis: [note.midi], notes: [note] });
  }
  return groups;
}

// Premier accord à attendre après `time`. `epsilon` évite de re-attendre celui
// qu'on vient tout juste de valider.
export function nextGroupIndex(groups, time, epsilon = 1e-3) {
  let low = 0;
  let high = groups.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (groups[middle].time <= time + epsilon) low = middle + 1;
    else high = middle;
  }
  return low < groups.length ? low : -1;
}

// ----------------------------------------------------------------------------
//  Jugement d'une exécution
//
//  `expected` : les notes du passage pour la main travaillée.
//  `played`   : ce qui a été joué (clavier physique ou piano à l'écran), déjà
//               ramené sur l'horloge du morceau, non dilatée par le tempo de
//               travail. La fenêtre de tolérance étant une fraction de temps,
//               travailler à 60 % laisse mécaniquement plus de millisecondes
//               réelles — la même exigence musicale à toutes les vitesses.
// ----------------------------------------------------------------------------
export function evaluateRun(expected, played, secondsPerBeat) {
  return validateRepetition(expected, played, secondsPerBeat);
}

// ----------------------------------------------------------------------------
//  Montée du tempo (plan/06 § 8)
//
//  Le tempo ne monte **jamais** tout seul : cette fonction ne rend qu'une
//  proposition, que l'écran affiche et que l'utilisateur accepte ou ignore.
//  Même règle qu'au § 10 de plan/03 — pas d'accélération après une série
//  imprécise.
// ----------------------------------------------------------------------------
export function suggestTempo({
  tempoPercent,
  outcome,
  targetPercent = 100,
  flawedStreak = 0,
}) {
  if (outcome === "clean") {
    if (tempoPercent >= targetPercent) return null; // déjà au tempo visé
    const next = Math.min(
      targetPercent,
      TEMPO_MAX_PERCENT,
      tempoPercent + TEMPO_STEP_PERCENT
    );
    return next > tempoPercent ? { percent: next, direction: "up" } : null;
  }

  // Une seule exécution imprécise ne fait pas redescendre : on reste au même
  // tempo. C'est la répétition de l'échec qui indique qu'il était trop haut.
  if (outcome === "flawed" && flawedStreak >= 2) {
    const next = Math.max(TEMPO_MIN_PERCENT, tempoPercent - TEMPO_STEP_PERCENT);
    return next < tempoPercent ? { percent: next, direction: "down" } : null;
  }
  return null;
}

export function clampTempoPercent(percent) {
  const rounded = Math.round(percent / TEMPO_STEP_PERCENT) * TEMPO_STEP_PERCENT;
  return Math.min(TEMPO_MAX_PERCENT, Math.max(TEMPO_MIN_PERCENT, rounded));
}

// ----------------------------------------------------------------------------
//  Maîtrise (plan/06 § 9)
// ----------------------------------------------------------------------------
export function cleanRunCount(entry) {
  return Object.values(entry?.cleanRunsByDate ?? {}).reduce(
    (sum, count) => sum + count,
    0
  );
}

export function isMastered(entry) {
  if (!entry) return false;
  const days = Object.keys(entry.cleanRunsByDate ?? {}).length;
  return (
    days >= MASTERY_MIN_DAYS && cleanRunCount(entry) >= MASTERY_MIN_CLEAN_RUNS
  );
}

// « Morceau appris : tous les passages du morceau maîtrisés, plus au moins une
// exécution propre du morceau entier au tempo cible. » Sans aucun passage
// défini, il n'y a pas de travail à valider : le morceau entier ne suffit pas.
export function isSongLearned({ sections, whole }) {
  if (!sections?.length) return false;
  if (!sections.every(isMastered)) return false;
  return cleanRunCount(whole) >= 1;
}

// ----------------------------------------------------------------------------
//  Journal des passages (localStorage)
//
//  Les passages doivent survivre à un rechargement (plan/06 § 5). Comme pour le
//  journal de progression, un stockage refusé ou illisible ne casse rien : le
//  travail continue, seule la mémoire d'une séance à l'autre est perdue.
// ----------------------------------------------------------------------------
function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function emptyEntry(id, title, startSeconds, endSeconds, targetTempoPercent) {
  return {
    id,
    title,
    startSeconds,
    endSeconds,
    targetTempoPercent,
    bestCleanTempoPercent: null,
    cleanRunsByDate: {},
  };
}

export function createSectionStore({
  storage = defaultStorage(),
  now = Date.now,
} = {}) {
  let songs = read();
  let writable = storage !== null;

  function read() {
    if (!storage) return {};
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed?.v !== STORE_VERSION || typeof parsed.songs !== "object") {
        return {};
      }
      return parsed.songs ?? {};
    } catch {
      return {}; // illisible : on repart à vide plutôt que de bloquer le mode
    }
  }

  function save() {
    if (!writable) return false;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({ v: STORE_VERSION, songs }));
      return true;
    } catch {
      writable = false;
      return false;
    }
  }

  function bucket(songId) {
    if (!songs[songId]) songs[songId] = { sections: [], whole: null };
    if (!Array.isArray(songs[songId].sections)) songs[songId].sections = [];
    return songs[songId];
  }

  function nextId(songId) {
    const used = bucket(songId).sections.map((section) =>
      parseInt(String(section.id).slice(1), 10)
    );
    const max = used.reduce((best, n) => (Number.isFinite(n) ? Math.max(best, n) : best), 0);
    return `s${max + 1}`;
  }

  return {
    // Les passages d'un morceau, dans l'ordre du morceau.
    list(songId) {
      return [...bucket(songId).sections].sort(
        (a, b) => a.startSeconds - b.startSeconds
      );
    },

    get(songId, sectionId) {
      if (sectionId === WHOLE_SONG_ID) return bucket(songId).whole;
      return bucket(songId).sections.find((s) => s.id === sectionId) ?? null;
    },

    create(songId, { startSeconds, endSeconds, title, targetTempoPercent = 100 }) {
      const store = bucket(songId);
      const id = nextId(songId);
      const section = emptyEntry(
        id,
        title || `Passage ${store.sections.length + 1}`,
        startSeconds,
        endSeconds,
        targetTempoPercent
      );
      section.songId = songId;
      store.sections.push(section);
      save();
      return section;
    },

    // `persist: false` modifie sans écrire : le glissement d'une borne appelle
    // cette fonction à chaque image, et réécrire le stockage à ce rythme
    // coûterait bien plus que le déplacement lui-même sur la tablette.
    update(songId, sectionId, patch, { persist = true } = {}) {
      const section = this.get(songId, sectionId);
      if (!section) return null;
      Object.assign(section, patch);
      if (persist) save();
      return section;
    },

    // Force l'écriture après une série de modifications non persistées.
    flush() {
      return save();
    },

    remove(songId, sectionId) {
      const store = bucket(songId);
      const index = store.sections.findIndex((s) => s.id === sectionId);
      if (index === -1) return false;
      store.sections.splice(index, 1);
      save();
      return true;
    },

    // Enregistre une exécution jugée. Seules les exécutions propres **au tempo
    // cible** comptent pour la maîtrise (§ 9) ; le meilleur tempo propre, lui,
    // retient n'importe quelle réussite — c'est le repère de progression.
    recordRun(songId, sectionId, { outcome, tempoPercent, at = now(), whole = null }) {
      const store = bucket(songId);
      let entry = this.get(songId, sectionId);
      if (!entry && sectionId === WHOLE_SONG_ID) {
        entry = emptyEntry(
          WHOLE_SONG_ID,
          "Morceau entier",
          0,
          whole?.endSeconds ?? 0,
          whole?.targetTempoPercent ?? 100
        );
        entry.songId = songId;
        store.whole = entry;
      }
      if (!entry) return null;
      if (sectionId === WHOLE_SONG_ID && whole?.endSeconds) {
        entry.endSeconds = whole.endSeconds;
      }
      if (outcome !== "clean") return entry;

      if (
        entry.bestCleanTempoPercent === null ||
        tempoPercent > entry.bestCleanTempoPercent
      ) {
        entry.bestCleanTempoPercent = tempoPercent;
      }
      if (tempoPercent >= entry.targetTempoPercent) {
        const key = dayKey(at);
        entry.cleanRunsByDate[key] = (entry.cleanRunsByDate[key] ?? 0) + 1;
      }
      save();
      return entry;
    },

    learned(songId) {
      const store = bucket(songId);
      return isSongLearned({ sections: store.sections, whole: store.whole });
    },

    // Faux dès qu'une écriture a définitivement échoué : le travail continue,
    // seule la persistance est perdue.
    get persistent() {
      return writable;
    },

    clear(songId) {
      if (songId) delete songs[songId];
      else songs = {};
      save();
    },
  };
}
