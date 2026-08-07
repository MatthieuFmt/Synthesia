// ============================================================================
//  Mesure « trop tôt / trop tard » — écrit pour l'Entraînement rythmique (05)
//
//  Compare des frappes horodatées à la pulsation attendue et rend un jugement
//  (plan/05-entrainement-rythmique.md § 5). La fenêtre de tolérance est exprimée
//  en **fraction de la durée d'un temps**, jamais en millisecondes fixes : la
//  même exigence vaut alors à 60 comme à 120 bpm.
//
//  Aucun DOM, aucun Canvas, aucun Tone.js : testable dans Node.
//
//  05 et 09 ont été retirés le 07/08/2026 ; ce module leur survit parce qu'il
//  n'était déjà plus à eux : c'est lui qui mesure la régularité de la
//  validation MIDI des exercices techniques (plan/03 § 3), via
//  `exercises/validate-run.js`, son unique consommateur aujourd'hui. Il reste
//  ici plutôt que de déménager : sa place ne devient trompeuse que le jour où
//  quelqu'un cherchera « le module de timing » ailleurs que dans `rhythm/`.
// ============================================================================

// Seuils du § 5, en fraction de la durée d'un temps.
export const ON_TIME_FRACTION = 0.1;
export const SLIGHT_FRACTION = 0.25;
export const CLEAR_FRACTION = 0.4;

// ----------------------------------------------------------------------------
//  Jugement d'une frappe
//
//  `deviationMs` est signé : négatif en avance, positif en retard. `null` = rien
//  n'a été frappé.
//
//  Le **degré** (léger / net) est rendu à part, et n'entre jamais dans le
//  `judgment` : c'est lui qui va dans le journal, et un seuil qui change ne doit
//  pas invalider un historique déjà écrit (plan/F3 § 7, « Degrés et seuils »).
// ----------------------------------------------------------------------------
function judge(deviationMs, secondsPerBeat) {
  if (deviationMs === null || deviationMs === undefined || !Number.isFinite(deviationMs)) {
    return { judgment: "missed", degree: null, deviationMs: null, fraction: null };
  }

  const beatMs = secondsPerBeat * 1000;
  const fraction = beatMs > 0 ? deviationMs / beatMs : Infinity;
  const size = Math.abs(fraction);

  if (size > CLEAR_FRACTION) {
    return { judgment: "missed", degree: null, deviationMs, fraction };
  }
  if (size <= ON_TIME_FRACTION) {
    return { judgment: "on-time", degree: null, deviationMs, fraction };
  }
  return {
    judgment: deviationMs < 0 ? "early" : "late",
    degree: size <= SLIGHT_FRACTION ? "slight" : "clear",
    deviationMs,
    fraction,
  };
}

// ----------------------------------------------------------------------------
//  Appariement dans le temps
//
//  Un évènement joué n'arrive pas forcément dans l'ordre des attentes : jouer
//  trop tôt la troisième note peut la placer avant la deuxième. On apparie donc
//  par **écart croissant** — la paire la moins ambiguë d'abord — plutôt qu'en
//  parcourant les évènements dans l'ordre, ce qui attribuerait le premier joué à
//  la première attente même si un autre lui correspondait mieux.
//
//  `expected` et `played` sont des tableaux d'objets portant au moins `time`, en
//  secondes, sur la même horloge. `pairable(expectedItem, playedItem)` restreint
//  les appariements possibles : par défaut tout est appariable — c'est le rythme
//  seul, où la hauteur ne compte pas (plan/05 § 3) —, et la validation MIDI des
//  exercices techniques y ajoute l'égalité des hauteurs (plan/03 étape D).
// ----------------------------------------------------------------------------
export function matchByTime(expected, played, secondsPerBeat, pairable = () => true) {
  const window = CLEAR_FRACTION * secondsPerBeat;

  const candidates = [];
  expected.forEach((target, expectedIndex) => {
    played.forEach((event, playedIndex) => {
      const deviation = event.time - target.time;
      if (Math.abs(deviation) <= window && pairable(target, event)) {
        candidates.push({ expectedIndex, playedIndex, deviation });
      }
    });
  });
  candidates.sort((a, b) => Math.abs(a.deviation) - Math.abs(b.deviation));

  const takenExpected = new Set();
  const takenPlayed = new Set();
  const matchOf = new Map();
  for (const candidate of candidates) {
    if (takenExpected.has(candidate.expectedIndex) || takenPlayed.has(candidate.playedIndex)) {
      continue;
    }
    takenExpected.add(candidate.expectedIndex);
    takenPlayed.add(candidate.playedIndex);
    matchOf.set(candidate.expectedIndex, candidate);
  }

  const hits = expected.map((target, index) => {
    const candidate = matchOf.get(index);
    const deviation = candidate ? candidate.deviation * 1000 : null;
    return {
      index,
      expected: target,
      played: candidate ? played[candidate.playedIndex] : null,
      ...judge(deviation, secondsPerBeat),
    };
  });

  // Évènements qui ne correspondent à aucune attente : ils sont comptés, mais ne
  // dégradent aucun jugement — l'exercice ne punit pas, il informe (plan/02 § 4,
  // règle reprise partout : « le score doit favoriser l'apprentissage »).
  const extras = played.filter((_, index) => !takenPlayed.has(index));

  return { hits, extras };
}

// ----------------------------------------------------------------------------
//  Bilan d'une reproduction
//
//  Rien n'est inventé : une frappe non reçue reste « manquée », et aucune
//  proportion n'est calculée sur zéro frappe attendue (plan/05 § 9).
// ----------------------------------------------------------------------------
export function timingSummary(hits) {
  const counts = { "on-time": 0, early: 0, late: 0, missed: 0 };
  const fractions = [];
  let bestStreak = 0;
  let streak = 0;

  for (const hit of hits) {
    counts[hit.judgment]++;
    if (hit.fraction !== null) fractions.push(hit.fraction);
    if (hit.judgment === "on-time") {
      streak++;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      streak = 0;
    }
  }

  const total = hits.length;
  const measured = fractions.length;
  const mean = measured ? fractions.reduce((sum, f) => sum + f, 0) / measured : null;
  const spread =
    measured > 1
      ? Math.sqrt(
          fractions.reduce((sum, f) => sum + (f - mean) ** 2, 0) / (measured - 1)
        )
      : null;

  return {
    total,
    counts,
    onTime: counts["on-time"],
    // `null` plutôt que 0 quand il n'y a rien à mesurer : pas de fausse note.
    accuracy: total > 0 ? counts["on-time"] / total : null,
    bestStreak,
    meanFraction: mean,
    spreadFraction: spread,
    tendency: tendencyOf(counts, total, mean, spread),
  };
}

// « Systématiquement en avance » n'est pas la même chose qu'« irrégulier », et
// c'est cette distinction qui dit quoi travailler (plan/05 § 9). Un décalage
// régulier se corrige en anticipant moins ; une irrégularité se corrige en
// écoutant la pulsation.
function tendencyOf(counts, total, mean, spread) {
  if (total === 0 || mean === null) return "none";
  if (counts["on-time"] / total >= 0.8) return "steady";

  const biased = Math.abs(mean) > ON_TIME_FRACTION;
  // Un biais n'est « systématique » que si les frappes sont groupées autour de
  // lui : sinon c'est une irrégularité qui penche, pas une habitude.
  const grouped = spread === null || spread <= Math.abs(mean);
  if (biased && grouped) return mean < 0 ? "early" : "late";
  return "irregular";
}
