#!/usr/bin/env node
// ============================================================================
//  Vérification du catalogue d'exercices — plan/exercices-catalogue.md § 9
//
//  Huit exercices se relisent à l'œil ; quatre-vingt-dix-neuf, non. Ce script
//  refuse un exercice mal formé, comme `generer-exercice.js` refuse d'écrire un
//  fichier MIDI qui ne tient pas son niveau.
//
//  Il ne dit pas si un exercice est **utile** — c'est la source citée qui en
//  répond — ni si un doigté est **jouable** : un 4 sur une touche noire suivi
//  d'un 5 sur la blanche voisine passe ou ne passe pas selon la main, et seul
//  l'essai au clavier le dit. Il vérifie ce qui se compte.
//
//  Usage :
//      node tools/verifier-catalogue.js            # tout le catalogue
//      node tools/verifier-catalogue.js scales     # une famille
// ============================================================================

import {
  DIFFICULTIES,
  EXERCISES,
  FAMILIES,
  KEYS,
  exercisesOfFamily,
  supportsHand,
} from "../src/exercises/catalog.js";
import {
  canGenerate,
  fingeringFor,
  generateExercise,
  handsAgreeOnLength,
  hasPatternByHand,
  isBarAligned,
  parseDegree,
  patternOf,
  playedBeatsPerRepetition,
  stepsOf,
} from "../src/exercises/generate-exercise.js";

const HANDS = ["right", "left"];

// L'exigence E2 du plan : trois niveaux, trois exercices par niveau.
const EXERCISES_PER_LEVEL = 3;

// Le rouleau dessine son clavier sans défilement latéral : toute l'étendue de
// l'exercice tient à l'écran, les deux mains sur le même clavier. C'est donc
// l'étendue **totale** qu'il faut plafonner, et non celle d'une main — le
// contraire de ce que mesure `generer-exercice.js`, où les fichiers MIDI sont
// joués dans un rouleau de 88 touches qui défile.
//
// Quatre octaves font 29 touches blanches. Sur la tablette visée, en paysage,
// le rouleau fait environ 800 px de large : 27 px par blanche, de quoi écrire un
// chiffre de 12 px. À cinq octaves on tombe à 22 px, et à six à 18 px — c'est là
// que le doigté cesse d'être lisible, donc là que l'exercice cesse d'avoir un
// sens dans ce mode.
//
// Conséquence concrète : une gamme sur trois octaves aux deux mains couvre
// exactement quatre octaves de clavier (do2 à do6), et passe tout juste.
const MAX_AMBITUS = 48;

// En dessous d'un huitième de temps, le rectangle d'une note est plus court que
// son propre chiffre, même écrit à côté.
const MIN_STEP_BEATS = 1 / 8;

// ----------------------------------------------------------------------------
//  Vérifications d'un exercice
// ----------------------------------------------------------------------------
function verifierExercice(exercise) {
  const problemes = [];
  const dire = (texte) => problemes.push(texte);

  // ---- Structure ----
  if (!hasPatternByHand(exercise) && !Array.isArray(exercise.pattern)) {
    dire("ni `pattern` ni `patternByHand`");
    return problemes;
  }
  if (hasPatternByHand(exercise) && exercise.pattern) {
    dire("`pattern` et `patternByHand` ensemble : une seule des deux formes");
  }
  if (hasPatternByHand(exercise) && exercise.bothMode) {
    dire("`bothMode` avec `patternByHand` : les deux mains ont déjà leur motif");
  }

  // ---- Doigtés : un par pas, un par degré d'accord, entre 1 et 5 ----
  for (const hand of HANDS) {
    if (!exercise.supportedHands.includes(hand) && !exercise.supportedHands.includes("both")) {
      continue;
    }
    const pattern = patternOf(exercise, hand);
    const steps = stepsOf(exercise, hand);

    for (const keyId of exercise.supportedKeys) {
      const fingering = fingeringFor(exercise, hand, keyId);
      if (!Array.isArray(fingering)) {
        dire(`doigté ${hand} manquant en ${keyId}`);
        continue;
      }
      if (fingering.length !== pattern.length) {
        dire(
          `doigté ${hand}/${keyId} : ${fingering.length} entrées pour ${pattern.length} pas`
        );
        continue;
      }

      steps.forEach((step, index) => {
        const doigts = Array.isArray(fingering[index]) ? fingering[index] : [fingering[index]];
        // Un silence — `{ degrees: [] }` — n'a pas de doigt : `null` y est la
        // bonne écriture, et rien d'autre.
        if (step.degrees.length === 0) {
          if (doigts.some((d) => d !== null && d !== undefined)) {
            dire(`doigté ${hand}/${keyId} pas ${index + 1} : un silence ne prend pas de doigt`);
          }
          return;
        }
        if (doigts.length !== step.degrees.length) {
          dire(
            `doigté ${hand}/${keyId} pas ${index + 1} : ${doigts.length} doigts pour ${step.degrees.length} note(s)`
          );
          return;
        }
        for (const doigt of doigts) {
          if (!Number.isInteger(doigt) || doigt < 1 || doigt > 5) {
            dire(`doigté ${hand}/${keyId} pas ${index + 1} : ${doigt} n'est pas un doigt (1 à 5)`);
          }
        }

        // Le pouce est en bas à droite, en haut à gauche. Dans un accord, les
        // doigts doivent donc se suivre dans l'ordre inverse selon la main —
        // c'est la vérification qui attrape un accord recopié d'une main à
        // l'autre sans être retourné.
        //
        // Une exception, et elle est logique : en mouvement contraire, le
        // doigté de la main gauche est écrit dans l'ordre des degrés du motif,
        // **avant** miroir. Les hauteurs réelles descendent quand les degrés
        // écrits montent, donc l'ordre attendu s'inverse aussi — le pouce reste
        // bien sur la note la plus haute, qui est le premier degré écrit.
        if (step.degrees.length > 1 && doigts.every(Number.isInteger)) {
          const rangs = step.degrees.map((d) => {
            const parsed = parseDegree(d);
            return parsed === null ? NaN : parsed.step * 100 + parsed.alter;
          });
          const trie = rangs.every((v, i) => i === 0 || v > rangs[i - 1]);
          if (trie) {
            const croissant = doigts.every((v, i) => i === 0 || v > doigts[i - 1]);
            const decroissant = doigts.every((v, i) => i === 0 || v < doigts[i - 1]);
            const miroir = hand === "left" && exercise.bothMode === "contrary";
            const attenduCroissant = hand === "right" || miroir;
            if (attenduCroissant && !croissant) {
              dire(
                `doigté ${hand}/${keyId} pas ${index + 1} : [${doigts}] doit croître avec les degrés` +
                  (miroir ? " (miroir : le premier degré écrit est la note la plus haute)" : " (pouce en bas)")
              );
            }
            if (!attenduCroissant && !decroissant) {
              dire(
                `doigté gauche/${keyId} pas ${index + 1} : [${doigts}] doit décroître avec les degrés (pouce en haut)`
              );
            }
          }
        }
      });
    }
  }

  // ---- Degrés lisibles ----
  for (const hand of HANDS) {
    for (const step of stepsOf(exercise, hand)) {
      for (const degree of step.degrees) {
        if (parseDegree(degree) === null) {
          dire(`degré illisible : ${JSON.stringify(degree)}`);
        }
      }
      if (step.beats < MIN_STEP_BEATS - 1e-9) {
        dire(`pas de ${step.beats} temps : sous le huitième de temps, le doigté n'est plus lisible`);
      }
    }
    if (!hasPatternByHand(exercise)) break; // motif commun : une seule lecture suffit
  }

  // Un motif chromatique ne se met pas en miroir : le miroir est **diatonique**
  // — la gauche joue le même degré vers le bas, pas le même demi-ton —, et une
  // suite chromatique renversée ainsi n'est plus chromatique. Il faut alors
  // écrire les deux mains, avec `patternByHand`.
  if (exercise.bothMode === "contrary") {
    const altere = stepsOf(exercise, "right").some((step) =>
      step.degrees.some((d) => (parseDegree(d)?.alter ?? 0) !== 0)
    );
    if (altere) {
      dire("degrés altérés en mouvement contraire : le miroir est diatonique, écrire `patternByHand`");
    }
  }

  // ---- Grille ----
  if (!isBarAligned(exercise)) {
    const total = playedBeatsPerRepetition(exercise) + exercise.restBeats;
    dire(
      `série de ${total} temps non alignée sur une mesure de ${exercise.beatsPerBar} : la deuxième ne tomberait plus sur un premier temps`
    );
  }
  if (!handsAgreeOnLength(exercise)) {
    dire(
      `les deux motifs ne durent pas autant (droite ${playedBeatsPerRepetition(exercise, "right")}, gauche ${playedBeatsPerRepetition(exercise, "left")} temps)`
    );
  }

  // ---- Tonalités ----
  if (!Array.isArray(exercise.supportedKeys) || exercise.supportedKeys.length === 0) {
    dire("aucune tonalité déclarée");
  } else {
    for (const keyId of exercise.supportedKeys) {
      if (!KEYS[keyId]) dire(`tonalité inconnue : ${keyId}`);
    }
  }
  for (const keyId of Object.keys(exercise.fingeringByKey ?? {})) {
    if (!exercise.supportedKeys.includes(keyId)) {
      dire(`\`fingeringByKey\` cite ${keyId}, absent de \`supportedKeys\``);
    }
  }

  // ---- Mains ----
  for (const hand of exercise.supportedHands) {
    if (!supportsHand(exercise, hand)) {
      dire(`main « ${hand} » annoncée mais pas définie (doigté ou mode manquant)`);
    }
  }

  // ---- Ce qui se mesure sur les notes réellement produites ----
  for (const keyId of exercise.supportedKeys) {
    for (const hand of exercise.supportedHands) {
      if (!canGenerate(exercise, hand, keyId)) continue;
      const run = generateExercise(exercise, { hand, key: keyId, repetitions: 2 });
      if (!run || run.notes.length === 0) {
        dire(`${hand}/${keyId} ne produit aucune note`);
        continue;
      }
      const ambitus = run.highMidi - run.lowMidi;
      if (ambitus > MAX_AMBITUS) {
        dire(
          `${hand}/${keyId} : ambitus ${ambitus} demi-tons > ${MAX_AMBITUS} — les touches deviendraient trop étroites pour le doigté`
        );
      }
      if (run.lowMidi < 21 || run.highMidi > 108) {
        dire(`${hand}/${keyId} : hors du clavier (${run.lowMidi}–${run.highMidi})`);
      }
      const sansDoigt = run.notes.filter((note) => note.finger === null).length;
      if (sansDoigt > 0) {
        dire(`${hand}/${keyId} : ${sansDoigt} note(s) sans doigté`);
      }
    }
  }

  // ---- Champs de présentation ----
  for (const champ of ["id", "family", "title", "goal", "instruction", "difficulty"]) {
    if (!exercise[champ]) dire(`champ \`${champ}\` manquant`);
  }
  if (!DIFFICULTIES.some((d) => d.id === exercise.difficulty)) {
    dire(`niveau inconnu : ${exercise.difficulty}`);
  }
  if (!FAMILIES.some((f) => f.id === exercise.family)) {
    dire(`famille inconnue : ${exercise.family}`);
  }

  return problemes;
}

// ----------------------------------------------------------------------------
//  Vérifications du catalogue entier
// ----------------------------------------------------------------------------
function verifierCatalogue() {
  const problemes = [];

  const vus = new Set();
  for (const exercise of EXERCISES) {
    if (vus.has(exercise.id)) problemes.push(`identifiant en double : ${exercise.id}`);
    vus.add(exercise.id);
  }

  for (const family of FAMILIES) {
    const titres = new Set();
    for (const exercise of exercisesOfFamily(family.id)) {
      if (titres.has(exercise.title)) {
        problemes.push(`${family.id} : deux exercices s'appellent « ${exercise.title} »`);
      }
      titres.add(exercise.title);
    }
  }

  return problemes;
}

// L'exigence E2, comptée : 3 niveaux × 3 exercices par famille disponible.
function etatDesFamilles() {
  return FAMILIES.map((family) => {
    const parNiveau = DIFFICULTIES.map((d) => exercisesOfFamily(family.id, d.id).length);
    const total = parNiveau.reduce((a, b) => a + b, 0);
    const complete = parNiveau.every((n) => n === EXERCISES_PER_LEVEL);
    return { family, parNiveau, total, complete };
  });
}

// ----------------------------------------------------------------------------
//  Rapport
// ----------------------------------------------------------------------------
const filtre = process.argv[2] ?? null;
const aVerifier = filtre
  ? EXERCISES.filter((e) => e.family === filtre || e.id === filtre)
  : EXERCISES;

if (filtre && aVerifier.length === 0) {
  console.error(`Aucun exercice pour « ${filtre} ».`);
  console.error(`Familles : ${FAMILIES.map((f) => f.id).join(", ")}`);
  process.exit(2);
}

let refuses = 0;
for (const exercise of aVerifier) {
  const problemes = verifierExercice(exercise);
  if (problemes.length === 0) {
    const mains = exercise.supportedHands.join("/");
    const tons = exercise.supportedKeys.join("/");
    console.log(`✓ ${exercise.id} — ${exercise.family}/${exercise.difficulty} · ${mains} · ${tons}`);
    continue;
  }
  refuses++;
  console.log(`✗ ${exercise.id} — ${exercise.family}/${exercise.difficulty}`);
  for (const probleme of problemes) console.log(`    ${probleme}`);
}

const globaux = filtre ? [] : verifierCatalogue();
for (const probleme of globaux) console.log(`✗ catalogue — ${probleme}`);

if (!filtre) {
  console.log("\nÉtat des familles (E2 : 3 exercices par niveau)");
  const niveaux = DIFFICULTIES.map((d) => d.label).join(" · ");
  console.log(`  ${"".padEnd(24)}${niveaux}`);
  for (const { family, parNiveau, total, complete } of etatDesFamilles()) {
    const marque = complete ? "✓" : family.status === "available" && total === 0 ? "∅" : "·";
    const chiffres = parNiveau.map((n) => String(n).padStart(9)).join(" ");
    console.log(`  ${marque} ${family.label.padEnd(22)}${chiffres}   ${total}/9`);
  }
  const complets = etatDesFamilles().filter((f) => f.complete).length;
  console.log(
    `\n  ${EXERCISES.length} exercices, ${complets} famille(s) complète(s) sur ${FAMILIES.length}.`
  );
  console.log("  ∅ = famille déclarée mais vide : invisible dans l'application.");
}

const total = refuses + globaux.length;
if (total > 0) {
  console.log(`\n${total} problème(s). Le catalogue n'est pas propre.`);
  process.exit(1);
}
console.log(`\n${aVerifier.length} exercice(s) vérifié(s), aucun problème.`);
