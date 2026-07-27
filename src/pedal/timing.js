// ============================================================================
//  Verdicts de changement de pédale — Feature 09
//
//  Juge un changement de pédale syncopée par rapport à l'accord attendu
//  (plan/09-pedale.md § 7) : « propre », « son brouillé », « trou dans le
//  son » ou « pédale oubliée ». Quatre verdicts qui nomment l'erreur telle que
//  l'utilisateur l'entend, jamais un pourcentage.
//
//  La fenêtre de tolérance réutilise celle de `rhythm/timing.js` — en fraction
//  de la durée d'un temps, jamais en millisecondes fixes —, comme le plan
//  l'impose : ne pas réécrire un second jugement avance/retard.
//
//  Aucun DOM, aucun Canvas, aucun Tone.js : testable dans Node.
// ============================================================================

import { CLEAR_FRACTION } from "../rhythm/timing.js";

// Le lever doit encadrer l'accord : même fenêtre que les frappes du rythme.
export const LIFT_WINDOW_FRACTION = CLEAR_FRACTION;

// Le réenfoncement doit suivre « juste après » : au-delà d'un temps entier, le
// silence s'entend — c'est le trou dans le son.
export const REPRESS_MAX_FRACTION = 1;

// Vocabulaire des verdicts. `clean` s'écrit `on-time` dans le journal de F3 :
// la famille Pédale du vocabulaire fermé est « blurred / gap (+ missed) », un
// changement propre étant un jugement de timing comme un autre (plan/F3 § 7).
export const VERDICTS = ["clean", "blurred", "gap", "missed"];

export const VERDICT_OUTCOME = {
  clean: "on-time",
  blurred: "blurred",
  gap: "gap",
  missed: "missed",
};

export const VERDICT_LABEL = {
  clean: "Propre",
  blurred: "Son brouillé",
  gap: "Trou dans le son",
  missed: "Pédale oubliée",
};

// ----------------------------------------------------------------------------
//  Jugement d'un changement syncopé
//
//  Pour un accord joué à l'instant `chordTime` : la pédale doit être levée
//  autour de l'accord, puis réenfoncée juste après (plan/09 § 6). `lift` et
//  `press` sont les instants observés (en secondes, même horloge que l'accord),
//  ou `null` si le geste n'a pas eu lieu.
//
//  L'ordre compte : réenfoncer avant l'accord garde la résonance précédente
//  (les étouffoirs se relèvent avant que l'ancien accord soit éteint), donc
//  « son brouillé » ; réenfoncer bien après laisse un silence, donc « trou ».
// ----------------------------------------------------------------------------
export function judgeSyncopatedChange({ chordTime, lift, press, secondsPerBeat }) {
  const liftWindow = LIFT_WINDOW_FRACTION * secondsPerBeat;
  const repressMax = REPRESS_MAX_FRACTION * secondsPerBeat;

  const measures = {
    liftDeviationMs: lift === null ? null : Math.round((lift - chordTime) * 1000),
    pressDelayMs: press === null ? null : Math.round((press - chordTime) * 1000),
  };

  // Réenfoncée sans avoir été levée sur le changement : la résonance
  // précédente est reprise telle quelle (plan/09 § 7, deuxième ligne).
  if (lift === null && press !== null) {
    return { verdict: "blurred", ...measures };
  }

  // Jamais levée sur le changement : les deux accords se mélangent forcément,
  // mais l'erreur à nommer est l'oubli du geste.
  if (lift === null) {
    return { verdict: "missed", ...measures };
  }

  // Levée trop tard : l'ancien accord a sonné sous le nouveau.
  if (lift - chordTime > liftWindow) {
    return { verdict: "blurred", ...measures };
  }

  // Levée bien trop tôt : le son est coupé avant le changement.
  if (chordTime - lift > liftWindow) {
    return { verdict: "gap", ...measures };
  }

  // Jamais réenfoncée, ou réenfoncée bien après la fenêtre : trou dans le son.
  if (press === null || press - chordTime > repressMax) {
    return { verdict: "gap", ...measures };
  }

  // Réenfoncée avant d'avoir été levée, ou avant que le nouvel accord sonne :
  // la résonance précédente est reprise avec lui.
  if (press < lift || press < chordTime) {
    return { verdict: "blurred", ...measures };
  }

  return { verdict: "clean", ...measures };
}

// ----------------------------------------------------------------------------
//  Appariement gestes ↔ accords
//
//  `pedalEvents` : [{ down, time }] triés par temps (le mode les accumule dans
//  l'ordre où ils arrivent). Pour chaque accord, le lever retenu est le premier
//  dans sa fenêtre élargie, et le réenfoncement le premier qui suit ce lever.
//  Un même geste ne sert jamais à deux accords.
// ----------------------------------------------------------------------------
export function matchPedalChanges(chordTimes, pedalEvents, secondsPerBeat) {
  const liftWindow = LIFT_WINDOW_FRACTION * secondsPerBeat;
  const repressMax = REPRESS_MAX_FRACTION * secondsPerBeat;
  const used = new Set();

  return chordTimes.map((chordTime) => {
    let lift = null;
    let press = null;

    for (let i = 0; i < pedalEvents.length; i++) {
      if (used.has(i)) continue;
      const event = pedalEvents[i];
      if (event.down) continue;
      // Fenêtre du lever : de « bien trop tôt » (jugé « trou ») jusqu'à la fin
      // de la fenêtre de réenfoncement — un lever encore plus tard n'est plus
      // un geste sur cet accord.
      if (event.time < chordTime - repressMax) continue;
      if (event.time > chordTime + repressMax) break;
      lift = event.time;
      used.add(i);

      for (let j = i + 1; j < pedalEvents.length; j++) {
        if (used.has(j)) continue;
        const next = pedalEvents[j];
        if (!next.down) break; // deux levers de suite : pas de réenfoncement ici
        if (next.time > chordTime + repressMax * 1.5) break;
        press = next.time;
        used.add(j);
        break;
      }
      break;
    }

    // Un réenfoncement sans lever apparié (pédale rejouée avant l'accord)
    // compte comme geste : il sera jugé « brouillé » par l'ordre des instants.
    if (lift === null) {
      for (let i = 0; i < pedalEvents.length; i++) {
        if (used.has(i)) continue;
        const event = pedalEvents[i];
        if (!event.down) continue;
        if (Math.abs(event.time - chordTime) <= liftWindow) {
          press = event.time;
          used.add(i);
          break;
        }
      }
    }

    return {
      chordTime,
      lift,
      press,
      ...judgeSyncopatedChange({ chordTime, lift, press, secondsPerBeat }),
    };
  });
}

// ----------------------------------------------------------------------------
//  Bilan d'une série de changements
//
//  Des comptes par verdict, rien d'inventé : aucun taux n'est calculé sur zéro
//  changement attendu (plan/03 § 9, règle reprise partout).
// ----------------------------------------------------------------------------
export function pedalSummary(changes) {
  const counts = { clean: 0, blurred: 0, gap: 0, missed: 0 };
  for (const change of changes) counts[change.verdict]++;

  return {
    total: changes.length,
    counts,
    clean: counts.clean,
    accuracy: changes.length > 0 ? counts.clean / changes.length : null,
  };
}
