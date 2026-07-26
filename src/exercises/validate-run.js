// ============================================================================
//  Validation d'une série jouée au clavier MIDI — Feature 03, étape D
//
//  Compare ce que l'exercice attendait à ce qui a réellement été joué, et n'en
//  tire que des mesures réelles (plan/03-technique-doigts.md § 9). Sans clavier
//  MIDI, ce module ne sert pas : la pratique libre n'affiche aucune précision,
//  parce qu'elle n'en a aucune.
//
//  L'appariement et le jugement de timing viennent de `rhythm/timing.js`, écrit
//  pour l'Entraînement rythmique : les seuils « à l'heure / avance / retard »
//  sont les mêmes partout, comme le prévoyait
//  plan/05 § 5. Ici s'ajoute seulement la hauteur — une note juste au bon moment
//  n'est pas la même chose qu'une note juste tout court.
//
//  Aucun DOM, aucun Canvas : testable dans Node.
// ============================================================================

import { noteDegreeName, octaveOf } from "../music.js";
import { matchByTime, timingSummary } from "../rhythm/timing.js";

// Deux notes s'apparient si elles ont la même hauteur. Le doigté n'est pas
// vérifiable au MIDI — un clavier n'envoie pas quel doigt a appuyé.
const samePitch = (expected, played) => expected.midi === played.midi;

// ----------------------------------------------------------------------------
//  Une série
//
//  `expected` : les notes générées de cette série ({ midi, time, hand, step }).
//  `played`   : les notes reçues du clavier ({ midi, time }), déjà ramenées sur
//               la même horloge que l'exercice.
// ----------------------------------------------------------------------------
export function validateRepetition(expected, played, secondsPerBeat) {
  const { hits, extras } = matchByTime(expected, played, secondsPerBeat, samePitch);

  const verdicts = hits.map((hit) => ({
    note: hit.expected,
    played: hit.played,
    // « Jouée » veut dire : la bonne hauteur, dans la fenêtre de tolérance. Une
    // note hors fenêtre est manquée, pas simplement en retard.
    correct: hit.played !== null,
    judgment: hit.judgment,
    degree: hit.degree,
    deviationMs: hit.deviationMs,
    // L'écart en fraction de temps est porté par le verdict : le bilan de séance
    // agrège des séries jouées à des tempos différents.
    fraction: hit.fraction,
  }));

  const correct = verdicts.filter((verdict) => verdict.correct).length;

  // Une série est « propre » si toutes ses notes ont été jouées et qu'aucune note
  // en trop ne s'est glissée. Le **timing n'entre pas** dans ce verdict : à un
  // tempo de travail lent, disqualifier une série pour quelques millisecondes
  // irait contre la règle « ne pas augmenter le tempo après une série imprécise »
  // du § 10 — la régularité est rapportée à part, elle ne condamne pas.
  const outcome = correct === expected.length && extras.length === 0 ? "clean" : "flawed";

  return {
    verdicts,
    extras,
    total: expected.length,
    correct,
    missed: expected.length - correct,
    outcome,
    byHand: countByHand(verdicts),
    timing: timingSummary(verdicts),
  };
}

function countByHand(verdicts) {
  const byHand = {};
  for (const verdict of verdicts) {
    const hand = verdict.note.hand;
    if (!byHand[hand]) byHand[hand] = { expected: 0, correct: 0, missed: 0 };
    byHand[hand].expected++;
    if (verdict.correct) byHand[hand].correct++;
    else byHand[hand].missed++;
  }
  for (const counts of Object.values(byHand)) {
    counts.accuracy = counts.expected > 0 ? counts.correct / counts.expected : null;
  }
  return byHand;
}

// ----------------------------------------------------------------------------
//  Bilan d'une séance entière
//
//  Ne rapporte que ce qui a été mesuré. Une séance sans une seule note reçue ne
//  rend pas des zéros trompeurs : elle rend `null`.
// ----------------------------------------------------------------------------
export function summarizeMidiRun(reports) {
  const total = reports.reduce((sum, report) => sum + report.total, 0);
  const correct = reports.reduce((sum, report) => sum + report.correct, 0);
  const extras = reports.reduce((sum, report) => sum + report.extras.length, 0);
  const clean = reports.filter((report) => report.outcome === "clean").length;

  // Régularité rythmique sur toute la séance, calculée par le même bilan que la
  // Reproduction rythmique. Les verdicts portent déjà leur écart en fraction de
  // temps, ce qui rend l'agrégation juste même si le tempo a changé entre deux
  // séries.
  const timing = timingSummary(reports.flatMap((report) => report.verdicts));

  return {
    repetitions: reports.length,
    clean,
    total,
    correct,
    extras,
    accuracy: total > 0 ? correct / total : null,
    byHand: mergeHands(reports),
    timing,
    toRework: stepsToRework(reports),
  };
}

function mergeHands(reports) {
  const merged = {};
  for (const report of reports) {
    for (const [hand, counts] of Object.entries(report.byHand)) {
      if (!merged[hand]) merged[hand] = { expected: 0, correct: 0, missed: 0 };
      merged[hand].expected += counts.expected;
      merged[hand].correct += counts.correct;
      merged[hand].missed += counts.missed;
    }
  }
  for (const counts of Object.values(merged)) {
    counts.accuracy = counts.expected > 0 ? counts.correct / counts.expected : null;
  }
  return merged;
}

// « Transitions ou accords à retravailler » (plan/03 § 9) : les pas du motif qui
// ont été ratés le plus souvent, les pires d'abord. Un pas jamais raté n'apparaît
// pas — il n'y a rien à y retravailler.
export function stepsToRework(reports, limit = 2) {
  const errorsByStep = new Map();

  for (const report of reports) {
    for (const verdict of report.verdicts) {
      if (verdict.correct) continue;
      const step = verdict.note.step ?? 0;
      if (!errorsByStep.has(step)) {
        errorsByStep.set(step, { step, errors: 0, pitches: new Set() });
      }
      const entry = errorsByStep.get(step);
      entry.errors++;
      entry.pitches.add(verdict.note.midi);
    }
  }

  return [...errorsByStep.values()]
    .sort((a, b) => b.errors - a.errors || a.step - b.step)
    .slice(0, limit)
    .map((entry) => ({
      step: entry.step,
      errors: entry.errors,
      label: [...entry.pitches]
        .sort((a, b) => a - b)
        .map((midi) => `${noteDegreeName(midi)}${octaveOf(midi)}`)
        .join(" + "),
    }));
}
