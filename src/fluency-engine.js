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
  const notes = [];
  const previousByHand = new Map();

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
    const previous = previousByHand.get(currentHand) ?? null;
    const others = previous !== null ? pool.filter((midi) => midi !== previous) : pool;
    const midi = pickWeighted(
      random,
      others.length > 0 ? others : pool,
      (candidate) => prior?.get(`${clef}:${candidate}`) ?? 1
    );
    previousByHand.set(currentHand, midi);
    notes.push({
      midi,
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
