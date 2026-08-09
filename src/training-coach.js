// ============================================================================
//  Le professeur — composition de la séance du jour (feature 04)
//
//  L'utilisateur ne choisit plus *quoi* travailler : il donne un temps par
//  jour, et ce module écrit la séance, comme le ferait un professeur. Une
//  séance a toujours la même forme — échauffement, lecture, morceau, oreille —
//  et c'est le budget qui décide de la longueur de chaque bloc, et du nombre
//  de blocs quand le temps manque (plan/04 § 5 bis).
//
//  Aucun DOM, aucun stockage : on lui donne les fonctionnalités disponibles
//  (registre F1), le journal (F3) et un budget ; il rend la séance. Tout se
//  vérifie donc hors navigateur, horloge comprise.
//
//  Deux règles portent l'essentiel :
//
//  1. **Le choix du jour est figé le matin.** Dans un créneau qui propose
//     plusieurs fonctionnalités, on prend celle qui n'a pas été travaillée
//     depuis le plus longtemps — mais en s'arrêtant à ce matin. Sinon terminer
//     un bloc changerait le bloc lui-même sous les yeux de l'utilisateur, et la
//     séance ne serait jamais la même deux minutes de suite. Depuis le retrait
//     du Rythme et de la Pédale (07/08/2026), chaque créneau n'a plus qu'une
//     fonctionnalité : la règle ne tranche donc rien pour l'instant, mais
//     rouvrir un `pool` à deux entrées reste une ligne.
//  2. **Un bloc trop court n'existe pas.** Sous MIN_BLOCK_MINUTES, on retire
//     le créneau le moins prioritaire et on redistribue : mieux vaut trois
//     vrais blocs que quatre miettes.
//  3. **Un bloc est fait quand il a été joué, pas quand il a été ouvert.** Ce
//     qui le coche est le temps réellement passé aujourd'hui dans la
//     fonctionnalité, comparé à la durée du bloc. Ouvrir un morceau et
//     ressortir aussitôt ne vaut rien ; huit minutes de travail valent le bloc
//     « Morceau » de huit minutes (plan/04 § 7, révisé le 09/08/2026).
// ============================================================================

import { completedSessions, practicedMinutes } from "./progress/views.js";
import {
  DEFAULT_DAILY_MINUTES,
  normalizeDailyMinutes,
  sessionFeatureIds,
  startOfDay,
} from "./training-program.js";

// En dessous, un bloc ne vaut pas la peine d'être commencé : le temps de
// s'installer, il est fini.
export const MIN_BLOCK_MINUTES = 3;

// ----------------------------------------------------------------------------
//  La forme d'une séance
//
//  `share`    : part du temps quand tous les créneaux tiennent ;
//  `priority` : 1 = le dernier qu'on sacrifie quand le temps manque ;
//  `pool`     : les fonctionnalités qui peuvent occuper le créneau, dans
//               l'ordre de préférence à égalité d'ancienneté.
//
//  L'ordre du tableau est l'ordre de la séance : on chauffe avant de jouer, on
//  garde l'oreille pour la fin.
// ----------------------------------------------------------------------------
export const SLOTS = [
  {
    id: "warmup",
    label: "Échauffement",
    share: 0.2,
    priority: 3,
    pool: ["technique"],
    why: "Doigts et gammes en premier, lentement : la main se réveille avant le morceau.",
  },
  {
    id: "reading",
    label: "Lecture",
    share: 0.2,
    priority: 2,
    pool: ["fluency"],
    why: "Un peu de déchiffrage chaque jour vaut mieux qu'une heure le dimanche.",
  },
  {
    id: "piece",
    label: "Morceau",
    share: 0.4,
    priority: 1,
    pool: ["song"],
    why: "Le cœur de la séance : un passage court, travaillé lentement et en boucle.",
  },
  {
    id: "listen",
    label: "Oreille",
    share: 0.2,
    priority: 4,
    pool: ["ear-training"],
    why: "Ce que la partition ne montre pas : reconnaître les sons à l'oreille.",
  },
];

// ----------------------------------------------------------------------------
//  Choix de la fonctionnalité d'un créneau
// ----------------------------------------------------------------------------

// Date de la dernière séance terminée d'une fonctionnalité, strictement avant
// `before`. `0` quand elle n'a jamais été travaillée — c'est donc elle qui
// passe en premier, ce qui est exactement l'effet voulu.
function lastPracticedAt(log, featureId, before) {
  const done = completedSessions(log, {
    featureIds: sessionFeatureIds(featureId),
    to: before,
  });
  return done.length === 0 ? 0 : done[done.length - 1].endedAt ?? 0;
}

// La moins vue récemment du créneau. À égalité, l'ordre du `pool` tranche.
function pickFeature(pool, log, before) {
  let chosen = null;
  let chosenAt = Infinity;
  for (const featureId of pool) {
    const at = lastPracticedAt(log, featureId, before);
    if (at < chosenAt) {
      chosen = featureId;
      chosenAt = at;
    }
  }
  return chosen;
}

// ----------------------------------------------------------------------------
//  Répartition du temps
// ----------------------------------------------------------------------------

// Répartit `budget` au prorata des parts, à la minute près. L'écart d'arrondi
// va au plus gros bloc : le total affiché doit être exactement le budget.
function spread(entries, budget) {
  const totalShare = entries.reduce((sum, entry) => sum + entry.slot.share, 0);
  const minutes = entries.map((entry) =>
    Math.max(1, Math.round((budget * entry.slot.share) / totalShare))
  );

  const drift = budget - minutes.reduce((sum, value) => sum + value, 0);
  if (drift !== 0) {
    let biggest = 0;
    for (let index = 1; index < minutes.length; index++) {
      if (minutes[index] > minutes[biggest]) biggest = index;
    }
    minutes[biggest] = Math.max(1, minutes[biggest] + drift);
  }
  return minutes;
}

// Retire les créneaux les moins prioritaires tant qu'un bloc reste trop court.
function allocate(entries, budget) {
  let kept = [...entries];

  while (kept.length > 1) {
    const minutes = spread(kept, budget);
    if (minutes.every((value) => value >= MIN_BLOCK_MINUTES)) {
      return kept.map((entry, index) => ({ ...entry, minutes: minutes[index] }));
    }
    // Le plus grand `priority` est le moins prioritaire.
    const dropped = kept.reduce(
      (worst, entry) => (entry.slot.priority > worst.slot.priority ? entry : worst),
      kept[0]
    );
    kept = kept.filter((entry) => entry !== dropped);
  }

  if (kept.length === 0) return [];
  return [{ ...kept[0], minutes: budget }]; // tout le temps au seul créneau restant
}

// ----------------------------------------------------------------------------
//  La séance du jour
//
//  `availableFeatureIds` vient du registre F1 : le professeur ne programme que
//  ce qui existe réellement (plan/04 § 10). Une fonctionnalité retirée du
//  registre disparaît de la séance sans migration.
// ----------------------------------------------------------------------------
export function planDay(
  availableFeatureIds,
  log,
  { dailyMinutes = DEFAULT_DAILY_MINUTES, now = Date.now() } = {}
) {
  const at = typeof now === "function" ? now() : now;
  const dayStart = startOfDay(at);
  const budget = normalizeDailyMinutes(dailyMinutes);
  const available = new Set(availableFeatureIds);

  const chosen = [];
  const taken = new Set(); // une fonctionnalité ne remplit qu'un créneau
  for (const slot of SLOTS) {
    const pool = slot.pool.filter((id) => available.has(id) && !taken.has(id));
    if (pool.length === 0) continue;
    const featureId = pickFeature(pool, log, dayStart);
    taken.add(featureId);
    chosen.push({ slot, featureId });
  }

  const blocks = allocate(chosen, budget).map((entry) => {
    const featureIds = sessionFeatureIds(entry.featureId);
    // Ce qui coche le bloc : le temps passé aujourd'hui, et lui seul. Une
    // séance terminée reste une information utile (la rotation du § 5 s'en
    // sert), mais elle ne suffit plus à valider un bloc.
    const practiced = practicedMinutes(log, { featureIds, from: dayStart });
    const doneToday = completedSessions(log, { featureIds, from: dayStart });
    const last = doneToday[doneToday.length - 1] ?? null;
    return {
      slotId: entry.slot.id,
      label: entry.slot.label,
      why: entry.slot.why,
      featureId: entry.featureId,
      minutes: entry.minutes,
      practicedMinutes: practiced,
      remainingMinutes: Math.max(0, entry.minutes - practiced),
      done: practiced >= entry.minutes,
      // Commencé mais pas fini : les deux écrans le montrent autrement qu'un
      // bloc auquel on n'a pas touché.
      started: practiced > 0 && practiced < entry.minutes,
      doneCount: doneToday.length,
      doneAt: last ? last.endedAt ?? null : null,
    };
  });

  const remaining = blocks.filter((block) => !block.done);

  return {
    dailyMinutes: budget,
    dayStart,
    blocks,
    doneCount: blocks.length - remaining.length,
    // Le temps qui reste, pas la somme des blocs pas finis : un bloc de huit
    // minutes déjà travaillé cinq minutes n'en réclame plus que trois.
    remainingMinutes: remaining.reduce((sum, block) => sum + block.remainingMinutes, 0),
    // Une séance sans aucun bloc n'est pas une séance terminée : c'est un
    // registre vide. L'écran doit le dire autrement.
    complete: blocks.length > 0 && remaining.length === 0,
    nextBlock: remaining[0] ?? null,
  };
}
