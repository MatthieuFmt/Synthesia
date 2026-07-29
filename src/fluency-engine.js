// ============================================================================
//  Série de Lecture de notes défilante — sans DOM, Canvas ni audio
//
//  Le rendu et l'horloge vivent dans `fluency-mode.js`. Ce module décide
//  seulement quelles notes arrivent, dans quel ordre et à quelle main, afin
//  que la règle critique du mode deux mains soit vérifiable hors navigateur :
//  une chronologie unique, donc aucune arrivée simultanée entre les deux clés.
// ============================================================================

import { CLEF_BY_HAND, handsForMode, notePool } from "./note-reading-engine.js";
import { pickWeighted } from "./session-engine.js";

export const NOTES_PER_SESSION = 30;

// Distance en DEGRÉS DE PORTÉE (l'index dans le pool, pas des demi-tons MIDI :
// Mi-Fa et Si-Do ne valent qu'un demi-ton quand les autres degrés en valent
// deux, donc marcher sur l'index est ce qui correspond à « la note voisine sur
// la portée »). magnitude 1 = pas (2de), 2 = saut (3ce), au-delà = grand
// intervalle. Progression pédagogique « pas d'abord, sauts ensuite, grands
// intervalles progressivement » — plan/10-fluidite.md § 12.
export const DELTA_TABLES = {
  beginner: [
    { magnitude: 1, weight: 0.75 },
    { magnitude: 2, weight: 0.25 },
  ],
  intermediate: [
    { magnitude: 1, weight: 0.50 },
    { magnitude: 2, weight: 0.25 },
    { magnitude: 3, weight: 0.15 },
    { magnitude: 4, weight: 0.07 },
    { magnitude: 5, weight: 0.03 },
  ],
  advanced: [
    { magnitude: 1, weight: 0.35 },
    { magnitude: 2, weight: 0.25 },
    { magnitude: 3, weight: 0.15 },
    { magnitude: 4, weight: 0.12 },
    { magnitude: 5, weight: 0.08 },
    { magnitude: 6, weight: 0.05 },
  ],
};

// Une note du pool pas encore jouée par la main courante dans la séance vaut
// dix fois son poids normal : sans ce bonus, la marche pas/saut visite trop
// peu les extrémités du pool. Il retombe à 1 dès qu'une note a été vue une
// fois — la marche redevient alors purement pédagogique.
const NOVELTY_BOOST = 10;

// Réflexion aux bornes du pool : une marche qui sortirait de [0, length-1]
// rebondit dessus, comme une main qui ne peut pas dépasser la dernière note
// écrite sur la portée.
function reflectIndex(index, length) {
  if (length <= 1) return 0;
  const period = 2 * (length - 1);
  const folded = ((index % period) + period) % period;
  return folded <= length - 1 ? folded : period - folded;
}

// Tire l'index suivant à partir de l'index courant : parmi les index
// atteignables par un pas, un saut ou un grand intervalle (table du niveau,
// dans les deux sens), pondérés par la table, la nouveauté et les erreurs
// passées. `previousIndex` à `null` (première note de cette main dans la
// séance) retombe sur un tirage pondéré par les seules erreurs passées, sur
// tout le pool — comportement inchangé pour ce cas.
function pickNextIndex(random, pool, previousIndex, deltaTable, seen, weightOf) {
  if (previousIndex === null) {
    return pickWeighted(random, pool.map((_, index) => index), weightOf);
  }

  const candidates = new Map();
  for (const { magnitude, weight } of deltaTable) {
    for (const sign of [1, -1]) {
      const target = reflectIndex(previousIndex + sign * magnitude, pool.length);
      // Près d'un bord, la réflexion peut ramener exactement sur la note
      // précédente : ce candidat est écarté, jamais choisi puis « corrigé ».
      if (target === previousIndex) continue;
      const novelty = seen.has(target) ? 1 : NOVELTY_BOOST;
      candidates.set(target, (candidates.get(target) ?? 0) + weight * novelty * weightOf(target));
    }
  }

  // Filet de sécurité : inatteignable avec les pools actuels (5 notes au
  // minimum), gardé si un pool plus court apparaissait un jour.
  if (candidates.size === 0) {
    for (let index = 0; index < pool.length; index++) {
      if (index !== previousIndex) candidates.set(index, 1);
    }
  }

  const [index] = pickWeighted(random, [...candidates.entries()], ([, w]) => w);
  return index;
}

export function drawSeries({
  difficulty,
  hand,
  priorWeights: prior,
  random = Math.random,
  noteCount = NOTES_PER_SESSION,
}) {
  const hands = handsForMode(hand);
  const pools = Object.fromEntries(
    hands.map((currentHand) => [currentHand, notePool(difficulty, currentHand)])
  );
  const deltaTable = DELTA_TABLES[difficulty];
  const notes = [];
  const previousIndexByHand = new Map();
  const seenByHand = new Map(hands.map((currentHand) => [currentHand, new Set()]));

  // En mode deux mains, les deux portées sont alimentées à parts égales. Une
  // seule chronologie alterne leurs arrivées : deux notes de clés différentes
  // ne peuvent donc jamais atteindre la ligne cible au même instant.
  const firstHand =
    hands.length > 1 && random() < 0.5 ? hands[1] : hands[0];
  const firstHandIndex = hands.indexOf(firstHand);

  for (let i = 0; i < noteCount; i++) {
    const currentHand =
      hands.length > 1 ? hands[(firstHandIndex + i) % hands.length] : hands[0];
    const clef = CLEF_BY_HAND[currentHand];
    const pool = pools[currentHand];
    const previousIndex = previousIndexByHand.get(currentHand) ?? null;
    const seen = seenByHand.get(currentHand);

    const index = pickNextIndex(
      random,
      pool,
      previousIndex,
      deltaTable,
      seen,
      (candidateIndex) => prior?.get(`${clef}:${pool[candidateIndex]}`) ?? 1
    );

    previousIndexByHand.set(currentHand, index);
    seen.add(index);

    notes.push({
      midi: pool[index],
      hand: currentHand,
      clef,
      status: "pending", // "pending" | "correct" | "missed"
      wrongPresses: 0,
      resolvedAt: null,
    });
  }

  return { hands, pools, notes };
}

export function noteArrivalTime(index, interval, lookahead) {
  return lookahead + index * interval;
}

export function layoutStaffs(height, hands) {
  const isGrandStaff = hands.length > 1;
  const LG = isGrandStaff
    ? Math.max(8, Math.min(12, Math.floor((height - 4) / 13)))
    : 14;
  const staffs = {};

  if (isGrandStaff) {
    // Quatre interlignes par portée et trois entre les deux. Deux interlignes
    // extérieurs restent disponibles pour les notes du niveau Difficile.
    const grandHeight = LG * 11;
    const grandTop = Math.round((height - grandHeight) / 2);
    staffs.treble = {
      top: grandTop,
      bottom: grandTop + LG * 4,
    };
    staffs.bass = {
      top: grandTop + LG * 7,
      bottom: grandTop + LG * 11,
    };
  } else {
    const clef = CLEF_BY_HAND[hands[0]];
    const top = Math.round(height / 2 - LG * 2);
    staffs[clef] = { top, bottom: top + LG * 4 };
  }

  const staffEntries = Object.entries(staffs);
  const staffList = staffEntries.map((entry) => entry[1]);
  return {
    LG,
    staffs,
    staffEntries,
    staffList,
    targetTop: Math.min(...staffList.map((staff) => staff.top)) - LG * 1.2,
    targetBottom: Math.max(...staffList.map((staff) => staff.bottom)) + LG * 1.2,
  };
}
