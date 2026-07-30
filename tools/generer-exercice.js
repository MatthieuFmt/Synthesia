#!/usr/bin/env node
// ============================================================================
//  Générateur d'exercices MIDI — plan/exercices-generes.md
//
//  Écrit un Standard MIDI File (format 1) octet par octet : en-tête MThd, puis
//  une piste MTrk par voix, delta-times en varint. Aucune dépendance.
//
//    node tools/generer-exercice.js                       # tout le catalogue
//    node tools/generer-exercice.js a1-deliage            # une famille
//    node tools/generer-exercice.js a1-deliage difficile  # un seul niveau
//
//  Chaque exercice est **paramétré**, pas écrit à la main (§ 2, règle 3) : la
//  tonalité, le tempo, les octaves et le niveau sont des données. Transposer
//  revient à changer une entrée de TONALITES, pas à réécrire la matière.
//
//  Le fichier produit est **vérifié contre les critères du § 4** avant d'être
//  écrit : débit, ambitus, écart dans une main, saut mélodique. Un exercice qui
//  dépasse le plafond de son niveau échoue au lieu d'être livré — c'est ce qui
//  rend la difficulté explicite « pas au feeling » (§ 2, règle 5).
// ============================================================================

const fs = require("fs");
const path = require("path");

// ---- Format (plan § 6) --------------------------------------------------

const TPQ = 480;                 // ticks par noire
const DOUBLE = TPQ / 4;          // 120
const TRIOLET_CROCHE = TPQ / 3;  // 160 — trois par temps
const CROCHE = TPQ / 2;          // 240
const TEMPS = TPQ;
const MESURE = TPQ * 4;          // 4/4 partout dans cette famille

// Ambitus admissible sur le rouleau d'une tablette (plan § 6).
const MIDI_MIN = 28;
const MIDI_MAX = 96;

const VEL_APPUI = 88;            // note sur le temps
const VEL_COURANTE = 72;         // notes intermédiaires
const VEL_TENUE = 80;            // note tenue

const CANAL_DROITE = 0;
const CANAL_GAUCHE = 1;

// ---- Les trois niveaux, en critères vérifiables (plan § 4) --------------
//
//  `debitMax` est en notes par seconde sur la main la plus chargée ; les
//  écarts sont en demi-tons. `ambitusMax` est nul pour le niveau le plus haut,
//  que le § 4 décrit par « 4 octaves et plus » — seules les bornes MIDI le
//  limitent alors.

const NIVEAUX = {
  moyen: {
    libelle: "moyen",
    tempo: 80,
    debitMax: 6,
    ambitusMax: 24,   // 2 octaves
    ecartMax: 7,      // quinte : la position de cinq doigts
    sautMax: 4,       // rien au-delà de la tierce
  },
  difficile: {
    libelle: "difficile",
    tempo: 100,
    debitMax: 9,
    ambitusMax: 36,   // 3 octaves
    ecartMax: 12,     // octave
    sautMax: 12,      // de la sixte à l'octave
  },
  "tres-difficile": {
    libelle: "très difficile",
    tempo: 120,
    debitMax: 12,
    ambitusMax: null, // 4 octaves et plus
    ecartMax: 16,     // dixième
    sautMax: 24,      // plus d'une octave
  },
};

// ---- Tonalités ----------------------------------------------------------
//
//  `tonique` est la hauteur MIDI du premier degré à l'octave de travail de la
//  main droite ; `alterations` est le compte de dièses écrit dans l'armure.

const MAJEUR = [0, 2, 4, 5, 7, 9, 11];

// Les mineures se distinguent par leur sixième et septième degrés. La
// mélodique en a deux formes : elle monte par l'une et redescend par l'autre —
// c'est ce que le § 4 appelle « harmonique **et** mélodique ».
const MODES = {
  majeur: { monte: MAJEUR, descend: MAJEUR },
  "mineur-harmonique": {
    monte: [0, 2, 3, 5, 7, 8, 11],
    descend: [0, 2, 3, 5, 7, 8, 11],
  },
  "mineur-melodique": {
    monte: [0, 2, 3, 5, 7, 9, 11],
    descend: [0, 2, 3, 5, 7, 8, 10], // en descendant, la mineure naturelle
  },
};

const TONALITES = {
  do: { nom: "do majeur", tonique: 60, alterations: 0, mode: "majeur" },
  re: { nom: "ré majeur", tonique: 62, alterations: 2, mode: "majeur" },
  si: { nom: "si majeur", tonique: 59, alterations: 5, mode: "majeur" },
  la: { nom: "la mineur", tonique: 57, alterations: 0, mode: "mineur-harmonique", mineur: true },
};

// Degré diatonique → hauteur MIDI. Les degrés négatifs descendent sous la
// tonique, ce qui donne la main gauche sans table séparée.
function creerGamme(tonique) {
  return (degre) => {
    const octave = Math.floor(degre / 7);
    const rang = ((degre % 7) + 7) % 7;
    return tonique + 12 * octave + MAJEUR[rang];
  };
}

// ============================================================================
//  Famille A1 — Déliage et indépendance
//
//  Ce qu'elle travaille : chaque doigt part et revient ; un doigt tient
//  pendant que les autres jouent (plan § 5, A1).
//
//  Les trois niveaux ne diffèrent pas par la vitesse mais par ce que la main
//  doit tenir ensemble :
//    moyen          — position de cinq doigts fixe, une note tenue ;
//    difficile      — deux notes tenues, motifs isolant 4-5, position glissée ;
//    très difficile — tenues + contraire, 3-4-5 seuls sur touches noires,
//                     et deux pulsations différentes entre les mains.
// ============================================================================

// Chaque doigt part et revient, les paires 2-4 et 3-5 sont sollicitées à
// chaque groupe : doigté 1-3-2-4-3-5-4-2.
const MOTIF_CINQ_DOIGTS = [0, 2, 1, 3, 2, 4, 3, 1];

// Motif isolant les deux doigts faibles : 4-5-4-5-3-5-4-5.
const MOTIF_QUATRE_CINQ = [3, 4, 3, 4, 2, 4, 3, 4];

// Motif sur les seuls 3-4-5, qui tombent sur trois touches noires en si
// majeur : fa♯, sol♯, la♯.
const MOTIF_TROIS_QUATRE_CINQ = [4, 5, 6, 5, 6, 4, 5, 6];

function creerCarnet() {
  const notes = [];
  // Les changements de pédale, dans l'ordre où ils arrivent. Tout-ou-rien : le
  // CC 64 est ramené à un booléen, comme `midi-input.js` le fait à la lecture
  // (plan § 7 — la demi-pédale reste hors de portée).
  const pedales = [];
  return {
    notes,
    pedales,
    poser(tick, duree, hauteur, velocite, main) {
      notes.push({ tick, duree, hauteur, velocite, main });
    },
    pedale(tick, enfoncee) {
      pedales.push({ tick, enfoncee });
    },
  };
}

// Une gamme montée puis redescendue, rendue en hauteurs MIDI — les modes dont
// la descente diffère de la montée (mélodique) ne se disent pas en degrés.
// Le sommet n'est joué qu'une fois : 14n + 1 notes pour n octaves.
//
// `depart` décale la course dans l'échelle : c'est ce qui donne les gammes à
// la tierce (−2) ou à la sixte (−5) entre les mains, sans seconde table.
// `sens: -1` descend d'abord puis remonte — la course en miroir du mouvement
// contraire.
function courseGamme({ tonique, mode = "majeur", octaves = 2, depart = 0, sens = 1 }) {
  const { monte, descend } = MODES[mode];
  const hauteur = (table, d) => tonique + 12 * Math.floor(d / 7) + table[((d % 7) + 7) % 7];
  const sommet = 7 * octaves;
  const hauteurs = [];
  if (sens > 0) {
    for (let d = 0; d <= sommet; d++) hauteurs.push(hauteur(monte, depart + d));
    for (let d = sommet - 1; d >= 0; d--) hauteurs.push(hauteur(descend, depart + d));
  } else {
    for (let d = 0; d <= sommet; d++) hauteurs.push(hauteur(descend, depart - d));
    for (let d = sommet - 1; d >= 0; d--) hauteurs.push(hauteur(monte, depart - d));
  }
  return hauteurs;
}

// ---- Arpèges -------------------------------------------------------------
//
//  Un accord est une liste d'écarts en demi-tons depuis sa fondamentale. Les
//  décrire ainsi plutôt qu'en degrés permet la septième diminuée, qui n'existe
//  dans aucune gamme majeure.

const ACCORDS = {
  majeur: [0, 4, 7],
  mineur: [0, 3, 7],
  "septieme-dominante": [0, 4, 7, 10],
  "septieme-diminuee": [0, 3, 6, 9],
};

// Les hauteurs d'un arpège en montant, de la fondamentale au sommet — le
// sommet étant la fondamentale, `octaves` plus haut.
function arpegeMontant({ tonique, accord, octaves = 2 }) {
  const hauteurs = [];
  for (let k = 0; k < octaves; k++) {
    for (const ecart of accord) hauteurs.push(tonique + 12 * k + ecart);
  }
  hauteurs.push(tonique + 12 * octaves);
  return hauteurs;
}

// Aller-retour, le sommet n'étant joué qu'une fois.
function courseArpege(options) {
  const montant = arpegeMontant(options);
  return [...montant, ...montant.slice(0, -1).reverse()];
}

// Le miroir : part du sommet, descend, remonte. Même longueur que la course
// montante — c'est ce qui permet de les jouer ensemble en mouvement contraire,
// note contre note.
function courseArpegeDescendante({ sommet, accord, octaves = 2 }) {
  const descendant = arpegeMontant({ tonique: sommet - 12 * octaves, accord, octaves })
    .slice()
    .reverse();
  return [...descendant, ...descendant.slice(0, -1).reverse()];
}

// Enchaîne plusieurs allers-retours d'affilée.
function repeter(course, fois) {
  const suite = [];
  for (let i = 0; i < fois; i++) suite.push(...course);
  return suite;
}

// Même course, en demi-tons : la chromatique n'a pas de degrés.
function courseChromatique({ depart, octaves = 4 }) {
  const sommet = 12 * octaves;
  const hauteurs = [];
  for (let d = 0; d <= sommet; d++) hauteurs.push(depart + d);
  for (let d = sommet - 1; d >= 0; d--) hauteurs.push(depart + d);
  return hauteurs;
}

// Pose deux suites de hauteurs de même longueur, une par main, à pas régulier.
// `finTick` étire la dernière note jusqu'à la fin de la section : une gamme ne
// tombe pas juste sur la mesure, et un silence au milieu de l'exercice se
// remarquerait plus que la note tenue qui le comble.
function poserCourse(carnet, { droite, gauche, tick, pas, appuiTous = 4, finTick = null }) {
  const duree = Math.max(40, pas - Math.round(pas * 0.12));
  droite.forEach((hauteur, i) => {
    const dernier = i === droite.length - 1;
    const quand = tick + i * pas;
    const combien = dernier && finTick ? Math.max(duree, finTick - quand - 40) : duree;
    const velocite = i % appuiTous === 0 ? VEL_APPUI : VEL_COURANTE;
    carnet.poser(quand, combien, hauteur, velocite, "droite");
    carnet.poser(quand, combien, gauche[i], velocite, "gauche");
  });
  return finTick ?? tick + droite.length * pas;
}

// Pose une ligne dans **une seule** main, avec son propre pas. `poserCourse`
// ne sait pas le faire : elle avance les deux mains du même pas, ce qui est
// exactement ce que la famille D1 doit cesser de faire — deux pulsations dans
// une seule tête supposent deux pas différents au même instant.
//
// `etirerFin` allonge la dernière note jusqu'à `finTick`, pour fermer une
// phrase. Une ligne à contretemps ne le veut pas : sa dernière note doit garder
// sa durée, sinon elle sonne bien après que l'autre main s'est arrêtée.
function poserLigne(
  carnet,
  {
    course,
    tick,
    pas,
    main = "droite",
    appuiTous = 4,
    finTick = null,
    legato = false,
    etirerFin = true,
  }
) {
  const duree = legato ? pas : Math.max(30, pas - Math.round(pas * 0.12));
  const combien =
    finTick === null
      ? course.length
      : Math.min(course.length, Math.max(1, Math.floor((finTick - tick) / pas)));
  for (let i = 0; i < combien; i++) {
    const quand = tick + i * pas;
    const dernier = i === combien - 1;
    const tenue =
      dernier && finTick && etirerFin ? Math.max(duree, finTick - quand - 40) : duree;
    carnet.poser(quand, tenue, course[i], i % appuiTous === 0 ? VEL_APPUI : VEL_COURANTE, main);
  }
  return finTick ?? tick + combien * pas;
}

// Les mains à l'octave : la suite de la gauche est celle de la droite, plus
// bas. C'est le rapport « parallèles à l'octave » du § 4.
function aLOctave(hauteurs, octaves = -1) {
  return hauteurs.map((hauteur) => hauteur + 12 * octaves);
}

// Charnière : un accord tenu qui laisse le temps de changer de position. Il
// rend aussi le changement de section audible, ce qu'une simple césure ne fait
// pas. Les notes tenues sortent du calcul de saut, à dessein (§ 4).
function poserCharniere(carnet, { tick, tonique, mineur = false, duree = MESURE - 60 }) {
  const tierce = mineur ? 3 : 4;
  for (const ecart of [0, tierce, 7]) {
    carnet.poser(tick, duree, tonique + ecart, VEL_APPUI, "droite");
    carnet.poser(tick, duree, tonique - 12 + ecart, VEL_APPUI, "gauche");
  }
  return tick + MESURE;
}

// ---- Niveau moyen -------------------------------------------------------
//
//  Do majeur, position do-sol aux deux mains, jamais déplacée : c'est
//  précisément ce qui distingue ce niveau du suivant. Dix-sept mesures.

function deliageMoyen({ gamme }) {
  const { notes, poser } = creerCarnet();
  let t = 0;

  // A — quatre mesures de doubles-croches, mains parallèles à l'octave.
  for (let mesure = 0; mesure < 4; mesure++) {
    for (let i = 0; i < 16; i++) {
      const degre = MOTIF_CINQ_DOIGTS[i % 8];
      const velocite = i % 4 === 0 ? VEL_APPUI : VEL_COURANTE;
      const tick = t + i * DOUBLE;
      poser(tick, DOUBLE - 15, gamme(degre), velocite, "droite");
      poser(tick, DOUBLE - 15, gamme(degre - 7), velocite, "gauche");
    }
    t += MESURE;
  }

  // B — huit mesures : une note tenue toute la mesure pendant que les autres
  // doigts jouent en croches. Le pouce tient, puis le cinquième.
  // La mesure impaire redescend par le haut de la position : d'une mesure à
  // l'autre, la main ne fait jamais plus d'une seconde — aucun saut à ce
  // niveau ne doit dépasser la tierce (§ 4).
  const TENUES = [
    { tenue: 0, mobiles: [2, 3, 4, 3] }, // 1 tient, 3-4-5 travaillent
    { tenue: 4, mobiles: [2, 1, 0, 1] }, // 5 tient, 1-2-3 travaillent
  ];
  for (let mesure = 0; mesure < 8; mesure++) {
    const { tenue, mobiles } = TENUES[mesure % 2];
    poser(t, MESURE - 60, gamme(tenue), VEL_TENUE, "droite");
    poser(t, MESURE - 60, gamme(tenue - 7), VEL_TENUE, "gauche");
    for (let i = 0; i < 8; i++) {
      const degre = mobiles[i % 4];
      const velocite = i % 2 === 0 ? VEL_APPUI : VEL_COURANTE;
      const tick = t + i * CROCHE;
      poser(tick, CROCHE - 25, gamme(degre), velocite, "droite");
      poser(tick, CROCHE - 25, gamme(degre - 7), velocite, "gauche");
    }
    t += MESURE;
  }

  // C — quatre mesures en mouvement contraire, les deux positions toujours
  // fixes : la droite monte dans do4-sol4, la gauche descend dans sol2-ré3.
  // Elle part exactement où la section B la laisse — à ce niveau, aucun
  // déplacement ne doit dépasser la tierce, pas même entre deux sections.
  for (let mesure = 0; mesure < 4; mesure++) {
    for (let i = 0; i < 16; i++) {
      const degre = MOTIF_CINQ_DOIGTS[i % 8];
      const velocite = i % 4 === 0 ? VEL_APPUI : VEL_COURANTE;
      const tick = t + i * DOUBLE;
      poser(tick, DOUBLE - 15, gamme(degre), velocite, "droite");
      poser(tick, DOUBLE - 15, gamme(-6 - degre), velocite, "gauche");
    }
    t += MESURE;
  }

  // Accord final : la position au repos, les deux mains ensemble.
  for (const degre of [0, 2, 4]) poser(t, MESURE - 40, gamme(degre), VEL_APPUI, "droite");
  for (const degre of [-7, -5, -3]) poser(t, MESURE - 40, gamme(degre), VEL_APPUI, "gauche");
  t += MESURE;

  return { notes, duree: t };
}

// ---- Niveau difficile ---------------------------------------------------
//
//  Ré majeur (deux dièses). Deux notes tenues, motifs isolant 4-5, et la
//  position glisse d'un degré à chaque mesure : la main ne peut plus se caler
//  une fois pour toutes. Vingt et une mesures.

function deliageDifficile({ gamme }) {
  const { notes, poser } = creerCarnet();
  let t = 0;

  // A — six mesures de doubles-croches, mains **décalées d'un temps** : le
  // canon oblige chaque main à tenir sa ligne au lieu de suivre l'autre.
  const finA = t + 6 * MESURE;
  for (let mesure = 0; mesure < 6; mesure++) {
    const depart = mesure; // la position glisse d'un degré par mesure
    for (let i = 0; i < 16; i++) {
      const degre = depart + MOTIF_QUATRE_CINQ[i % 8];
      const velocite = i % 4 === 0 ? VEL_APPUI : VEL_COURANTE;
      const tick = t + mesure * MESURE + i * DOUBLE;
      poser(tick, DOUBLE - 15, gamme(degre), velocite, "droite");
      // La main gauche entre un temps plus tard ; ce qui déborderait de la
      // section est simplement tu — le canon s'arrête, il ne mord pas sur B.
      const tickGauche = tick + TEMPS;
      if (tickGauche < finA) {
        poser(tickGauche, DOUBLE - 15, gamme(degre - 7), velocite, "gauche");
      }
    }
  }
  t = finA;

  // B — huit mesures à **deux notes tenues** : le pouce et le deuxième doigt
  // tiennent la quinte pendant que 3-4-5 jouent. Deux voix réelles par main.
  for (let mesure = 0; mesure < 8; mesure++) {
    const depart = Math.floor(mesure / 2); // glisse toutes les deux mesures
    for (const degre of [depart, depart + 1]) {
      poser(t, MESURE - 60, gamme(degre), VEL_TENUE, "droite");
      poser(t, MESURE - 60, gamme(degre - 7), VEL_TENUE, "gauche");
    }
    for (let i = 0; i < 16; i++) {
      const degre = depart + [2, 3, 4, 3][i % 4];
      const velocite = i % 4 === 0 ? VEL_APPUI : VEL_COURANTE;
      const tick = t + i * DOUBLE;
      poser(tick, DOUBLE - 15, gamme(degre), velocite, "droite");
      poser(tick, DOUBLE - 15, gamme(degre - 7), velocite, "gauche");
    }
    t += MESURE;
  }

  // C — six mesures en mouvement contraire, le pouce tenant la tonique
  // pendant que les doigts jouent une **octave** au-dessus : c'est l'écart
  // maximal du niveau, atteint par une main, pas par l'étendue du clavier.
  for (let mesure = 0; mesure < 6; mesure++) {
    const depart = mesure % 3;
    poser(t, MESURE - 60, gamme(depart), VEL_TENUE, "droite");
    poser(t, MESURE - 60, gamme(depart - 7), VEL_TENUE, "gauche");
    for (let i = 0; i < 16; i++) {
      // Le pouce tient `depart`, les doigts montent jusqu'au degré + 7 : la
      // main couvre donc l'**octave**, écart maximal de ce niveau.
      const degre = depart + 3 + MOTIF_QUATRE_CINQ[i % 8];
      const velocite = i % 4 === 0 ? VEL_APPUI : VEL_COURANTE;
      const tick = t + i * DOUBLE;
      poser(tick, DOUBLE - 15, gamme(degre), velocite, "droite");
      // Contraire : la gauche descend de ce que la droite monte. L'axe du
      // miroir (degré 5) est choisi pour que la gauche reprenne exactement où
      // la section B la laisse, plutôt que de sauter d'une neuvième.
      poser(tick, DOUBLE - 15, gamme(5 - degre), velocite, "gauche");
    }
    t += MESURE;
  }

  for (const degre of [0, 2, 4]) poser(t, MESURE - 40, gamme(degre), VEL_APPUI, "droite");
  for (const degre of [-7, -5, -3]) poser(t, MESURE - 40, gamme(degre), VEL_APPUI, "gauche");
  t += MESURE;

  return { notes, duree: t };
}

// ---- Niveau très difficile ----------------------------------------------
//
//  Si majeur (cinq dièses) : la position de cinq doigts tombe sur ré♯-mi-fa♯-
//  sol♯-la♯, donc **trois touches noires sous 3, 4 et 5**. Tenues plus
//  mouvement contraire, et une section en trois contre deux. Vingt et une
//  mesures.

function deliageTresDifficile({ gamme }) {
  const { notes, poser } = creerCarnet();
  let t = 0;

  // A — sept mesures sur les seuls 3-4-5, main droite en doubles, le pouce
  // tenant la tonique : l'écart de dixième est là, tenu par une seule main.
  for (let mesure = 0; mesure < 7; mesure++) {
    const depart = mesure % 3;
    poser(t, MESURE - 60, gamme(depart), VEL_TENUE, "droite");
    poser(t, MESURE - 60, gamme(depart - 7), VEL_TENUE, "gauche");
    for (let i = 0; i < 16; i++) {
      const degre = depart + MOTIF_TROIS_QUATRE_CINQ[i % 8];
      const velocite = i % 4 === 0 ? VEL_APPUI : VEL_COURANTE;
      const tick = t + i * DOUBLE;
      poser(tick, DOUBLE - 15, gamme(degre), velocite, "droite");
      poser(tick, DOUBLE - 15, gamme(degre - 7), velocite, "gauche");
    }
    t += MESURE;
  }

  // B — huit mesures en **trois contre deux** : la droite joue trois notes par
  // temps, la gauche deux. Deux pulsations dans une seule tête, chacune avec
  // sa note tenue.
  for (let mesure = 0; mesure < 8; mesure++) {
    const depart = mesure % 4;
    poser(t, MESURE - 60, gamme(depart), VEL_TENUE, "droite");
    poser(t, MESURE - 60, gamme(depart - 7), VEL_TENUE, "gauche");

    for (let i = 0; i < 12; i++) { // trois par temps, quatre temps
      const degre = depart + MOTIF_TROIS_QUATRE_CINQ[i % 8];
      const velocite = i % 3 === 0 ? VEL_APPUI : VEL_COURANTE;
      poser(t + i * TRIOLET_CROCHE, TRIOLET_CROCHE - 20, gamme(degre), velocite, "droite");
    }
    for (let i = 0; i < 8; i++) { // deux par temps
      const degre = depart + [4, 6, 5, 4][i % 4] - 7;
      const velocite = i % 2 === 0 ? VEL_APPUI : VEL_COURANTE;
      poser(t + i * CROCHE, CROCHE - 25, gamme(degre), velocite, "gauche");
    }
    t += MESURE;
  }

  // C — sept mesures : tenues **et** mouvement contraire, position glissée à
  // chaque mesure. Tout ce que le niveau demande, ensemble.
  for (let mesure = 0; mesure < 7; mesure++) {
    const depart = mesure % 3;
    poser(t, MESURE - 60, gamme(depart), VEL_TENUE, "droite");
    poser(t, MESURE - 60, gamme(depart - 7), VEL_TENUE, "gauche");
    for (let i = 0; i < 16; i++) {
      const degre = depart + MOTIF_TROIS_QUATRE_CINQ[i % 8];
      const velocite = i % 4 === 0 ? VEL_APPUI : VEL_COURANTE;
      const tick = t + i * DOUBLE;
      poser(tick, DOUBLE - 15, gamme(degre), velocite, "droite");
      poser(tick, DOUBLE - 15, gamme(depart - degre - 3), velocite, "gauche");
    }
    t += MESURE;
  }

  for (const degre of [0, 2, 4]) poser(t, MESURE - 40, gamme(degre), VEL_APPUI, "droite");
  for (const degre of [-7, -5, -3]) poser(t, MESURE - 40, gamme(degre), VEL_APPUI, "gauche");
  t += MESURE;

  return { notes, duree: t };
}

// ============================================================================
//  Famille B1 — Gammes et passage du pouce
//
//  Ce qu'elle travaille : le **trou sonore au passage du pouce**, la seule
//  vraie difficulté de la gamme (plan § 5, B1). Monter et descendre n'est pas
//  l'exercice ; c'est le moment où le pouce passe sous la main — et où le son
//  s'interrompt si le geste est en retard — qui l'est.
//
//  Chaque niveau isole ce moment autrement :
//    moyen          — la gamme lentement, puis le passage seul en boucle,
//                     puis la gamme deux fois plus vite : le trou s'entend ;
//    difficile      — mineures harmonique et mélodique sur trois octaves,
//                     puis mouvement contraire ;
//    très difficile — chromatique en doubles sur quatre octaves, puis les
//                     mains à la tierce et à la sixte.
// ============================================================================

// La cellule du passage : monter jusqu'au degré où le pouce repasse, puis
// revenir. Jouée en boucle, c'est le geste isolé de son contexte.
const CELLULE_POUCE = [0, 1, 2, 3, 4, 3, 2, 1];

function gammesMoyen({ tonalite }) {
  const carnet = creerCarnet();
  const { tonique, mode } = tonalite;
  const gamme = creerGamme(tonique);
  let t = 0;

  // A — la gamme sur deux octaves, en croches : lentement, pour entendre.
  const course = courseGamme({ tonique, mode, octaves: 2 });
  t = poserCourse(carnet, {
    droite: course,
    gauche: aLOctave(course),
    tick: t,
    pas: CROCHE,
    finTick: 4 * MESURE,
  });

  // B — le passage du pouce seul, remonté d'un degré à chaque mesure. La
  // cellule finit sur le degré où la suivante commence : la main ne se
  // repositionne jamais, elle ne fait que passer le pouce.
  for (let mesure = 0; mesure < 6; mesure++) {
    for (let i = 0; i < 8; i++) {
      const degre = mesure + CELLULE_POUCE[i];
      const velocite = i % 4 === 0 ? VEL_APPUI : VEL_COURANTE;
      const tick = t + i * CROCHE;
      carnet.poser(tick, CROCHE - 25, gamme(degre), velocite, "droite");
      carnet.poser(tick, CROCHE - 25, gamme(degre) - 12, velocite, "gauche");
    }
    t += MESURE;
  }

  t = poserCharniere(carnet, { tick: t, tonique });

  // C — la même gamme en doubles : deux fois plus vite, c'est là que le trou
  // du pouce s'entend vraiment. Deux allers-retours.
  const rapide = [...course, ...course];
  t = poserCourse(carnet, {
    droite: rapide,
    gauche: aLOctave(rapide),
    tick: t,
    pas: DOUBLE,
    finTick: t + 4 * MESURE,
  });

  t = poserCharniere(carnet, { tick: t, tonique });
  return { notes: carnet.notes, duree: t };
}

function gammesDifficile({ tonalite }) {
  const carnet = creerCarnet();
  const { tonique } = tonalite; // la3 : les trois octaves tiennent au clavier
  let t = 0;

  // A — mineure harmonique sur trois octaves, mains parallèles à l'octave.
  const harmonique = courseGamme({ tonique, mode: "mineur-harmonique", octaves: 3 });
  t = poserCourse(carnet, {
    droite: harmonique,
    gauche: aLOctave(harmonique),
    tick: t,
    pas: CROCHE,
    finTick: 6 * MESURE,
  });

  t = poserCharniere(carnet, { tick: t, tonique, mineur: true });

  // B — mineure mélodique : elle monte par une échelle et redescend par une
  // autre, ce qui déplace le passage du pouce entre la montée et la descente.
  const melodique = courseGamme({ tonique, mode: "mineur-melodique", octaves: 3 });
  t = poserCourse(carnet, {
    droite: melodique,
    gauche: aLOctave(melodique),
    tick: t,
    pas: CROCHE,
    finTick: t + 6 * MESURE,
  });

  t = poserCharniere(carnet, { tick: t, tonique, mineur: true });

  // C — mouvement contraire sur deux octaves : les deux pouces passent au même
  // instant, chacun dans sa direction. C'est le vrai test de l'égalité.
  const depart = tonique + 12;
  const monte = courseGamme({ tonique: depart, mode: "mineur-harmonique", octaves: 2 });
  const descend = courseGamme({ tonique: depart, mode: "mineur-harmonique", octaves: 2, sens: -1 });
  t = poserCourse(carnet, {
    droite: monte,
    gauche: descend,
    tick: t,
    pas: CROCHE,
    finTick: t + 4 * MESURE,
  });

  t = poserCharniere(carnet, { tick: t, tonique, mineur: true });
  return { notes: carnet.notes, duree: t };
}

function gammesTresDifficile({ tonalite }) {
  const carnet = creerCarnet();
  const { tonique, mode } = tonalite;
  let t = 0;

  // A — chromatique sur quatre octaves, en doubles. Le pouce y passe toutes
  // les trois ou quatre notes : c'est le passage le plus dense qui soit.
  const chromatique = courseChromatique({ depart: tonique - 12, octaves: 4 });
  t = poserCourse(carnet, {
    droite: chromatique,
    gauche: aLOctave(chromatique),
    tick: t,
    pas: DOUBLE,
    appuiTous: 6,
    finTick: 7 * MESURE,
  });

  t = poserCharniere(carnet, { tick: t, tonique });

  // B — les mains **à la tierce** : elles ne passent plus le pouce ensemble,
  // puisqu'elles ne sont pas au même endroit de l'échelle.
  const droiteTierce = courseGamme({ tonique, mode, octaves: 3 });
  const gaucheTierce = courseGamme({ tonique, mode, octaves: 3, depart: -2 });
  t = poserCourse(carnet, {
    droite: droiteTierce,
    gauche: gaucheTierce,
    tick: t,
    pas: CROCHE,
    finTick: t + 6 * MESURE,
  });

  t = poserCharniere(carnet, { tick: t, tonique });

  // C — les mains **à la sixte**, l'écart le plus inconfortable des deux.
  const gaucheSixte = courseGamme({ tonique, mode, octaves: 3, depart: -5 });
  t = poserCourse(carnet, {
    droite: droiteTierce,
    gauche: gaucheSixte,
    tick: t,
    pas: CROCHE,
    finTick: t + 6 * MESURE,
  });

  // Deux mesures de résolution : à ce tempo, une seule passerait inaperçue.
  t = poserCharniere(carnet, { tick: t, tonique, duree: 2 * MESURE - 60 });
  return { notes: carnet.notes, duree: t + MESURE };
}

// ============================================================================
//  Famille B2 — Arpèges et accords brisés
//
//  Ce qu'elle travaille : **la main qui s'ouvre et se déplace en même temps**
//  (plan § 5, B2). Une gamme demande à la main de traverser ; un arpège lui
//  demande de traverser *en restant ouverte* sur la forme de l'accord.
//
//    moyen          — triades à l'état fondamental sur deux octaves, puis les
//                     trois positions travaillées sur place ;
//    difficile      — renversements, septième de dominante, trois octaves,
//                     puis mouvement contraire ;
//    très difficile — septième diminuée sur quatre octaves, et des brisés qui
//                     dépassent l'octave.
// ============================================================================

function arpegesMoyen({ tonalite }) {
  const carnet = creerCarnet();
  const { tonique } = tonalite;
  const accord = ACCORDS.majeur;
  let t = 0;

  // A — l'arpège sur deux octaves, en croches, mains à l'octave. Deux
  // allers-retours : le second n'est plus une découverte, c'est déjà du
  // travail.
  const course = courseArpege({ tonique, accord, octaves: 2 });
  t = poserCourse(carnet, {
    droite: repeter(course, 2),
    gauche: aLOctave(repeter(course, 2)),
    tick: t,
    pas: CROCHE,
    finTick: 4 * MESURE,
  });

  t = poserCharniere(carnet, { tick: t, tonique });

  // B — les trois positions de la triade, **sur place** : c'est l'ouverture de
  // la main seule, sans déplacement. Chaque mesure part là où la précédente
  // s'arrête, la main ne saute donc jamais entre deux positions.
  const positions = [
    [0, 1, 2, 1], // fondamentale
    [1, 2, 3, 2], // premier renversement
    [2, 3, 4, 3], // second renversement
    [3, 4, 5, 4], // l'octave, une position plus haut
  ];
  const echelle = arpegeMontant({ tonique, accord, octaves: 2 });
  for (const position of positions) {
    for (let i = 0; i < 8; i++) {
      const hauteur = echelle[position[i % 4]];
      const velocite = i % 4 === 0 ? VEL_APPUI : VEL_COURANTE;
      const tick = t + i * CROCHE;
      carnet.poser(tick, CROCHE - 25, hauteur, velocite, "droite");
      carnet.poser(tick, CROCHE - 25, hauteur - 12, velocite, "gauche");
    }
    t += MESURE;
  }

  t = poserCharniere(carnet, { tick: t, tonique });

  // C — le même arpège en doubles. La forme est acquise ; il s'agit
  // maintenant de la garder en se déplaçant deux fois plus vite.
  t = poserCourse(carnet, {
    droite: repeter(course, 4),
    gauche: aLOctave(repeter(course, 4)),
    tick: t,
    pas: DOUBLE,
    finTick: t + 4 * MESURE,
  });

  t = poserCharniere(carnet, { tick: t, tonique, duree: 2 * MESURE - 60 });
  return { notes: carnet.notes, duree: t + MESURE };
}

function arpegesDifficile({ tonalite }) {
  const carnet = creerCarnet();
  const { tonique } = tonalite; // ré4
  const grave = tonique - 12;   // ré3 : les trois octaves tiennent au clavier
  let t = 0;

  // A — la triade sur **trois octaves**. La main doit se replacer deux fois
  // de plus qu'au niveau précédent, sans que la forme se referme.
  const triade = courseArpege({ tonique: grave, accord: ACCORDS.majeur, octaves: 3 });
  t = poserCourse(carnet, {
    droite: repeter(triade, 2),
    gauche: aLOctave(repeter(triade, 2)),
    tick: t,
    pas: CROCHE,
    finTick: 5 * MESURE,
  });

  t = poserCharniere(carnet, { tick: t, tonique });

  // B — la **septième de dominante** : quatre sons au lieu de trois, donc des
  // écarts plus serrés mais un doigt de plus à placer avant de se déplacer.
  const septieme = courseArpege({
    tonique: tonique - 5, // la3, la dominante de ré
    accord: ACCORDS["septieme-dominante"],
    octaves: 2,
  });
  t = poserCourse(carnet, {
    droite: repeter(septieme, 2),
    gauche: aLOctave(repeter(septieme, 2)),
    tick: t,
    pas: CROCHE,
    finTick: t + 5 * MESURE,
  });

  t = poserCharniere(carnet, { tick: t, tonique });

  // C — mouvement **contraire** sur deux octaves : les deux mains s'ouvrent en
  // sens opposé, et aucune ne peut se régler sur l'autre.
  const monte = courseArpege({ tonique, accord: ACCORDS.majeur, octaves: 2 });
  const descend = courseArpegeDescendante({
    sommet: tonique,
    accord: ACCORDS.majeur,
    octaves: 2,
  });
  t = poserCourse(carnet, {
    droite: repeter(monte, 3),
    gauche: repeter(descend, 3),
    tick: t,
    pas: CROCHE,
    finTick: t + 6 * MESURE,
  });

  t = poserCharniere(carnet, { tick: t, tonique });
  return { notes: carnet.notes, duree: t };
}

function arpegesTresDifficile({ tonalite }) {
  const carnet = creerCarnet();
  const { tonique } = tonalite; // do4
  // La septième diminuée sur la sensible : si-ré-fa-la♭, qui résout sur do.
  // Quatre intervalles égaux de tierce mineure — la main garde une seule
  // forme sur quatre octaves.
  const sensible = tonique - 13; // si2
  let t = 0;

  const diminuee = courseArpege({
    tonique: sensible,
    accord: ACCORDS["septieme-diminuee"],
    octaves: 4,
  });
  t = poserCourse(carnet, {
    droite: repeter(diminuee, 3),
    gauche: aLOctave(repeter(diminuee, 3)),
    tick: t,
    pas: DOUBLE,
    appuiTous: 4,
    finTick: 7 * MESURE,
  });

  t = poserCharniere(carnet, { tick: t, tonique });

  // B — arpèges **brisés dépassant l'octave** : fondamentale, dixième,
  // quinte, octave. La main ne se contente plus de s'ouvrir, elle lance le
  // bras — c'est le geste de la main gauche d'accompagnement romantique.
  const BRISE = [0, 16, 7, 12];
  for (const racine of [tonique, tonique + 5, tonique + 7]) {
    for (let mesure = 0; mesure < 2; mesure++) {
      for (let i = 0; i < 8; i++) {
        const hauteur = racine + BRISE[i % 4];
        const velocite = i % 4 === 0 ? VEL_APPUI : VEL_COURANTE;
        const tick = t + i * CROCHE;
        carnet.poser(tick, CROCHE - 25, hauteur, velocite, "droite");
        carnet.poser(tick, CROCHE - 25, hauteur - 12, velocite, "gauche");
      }
      t += MESURE;
    }
  }

  t = poserCharniere(carnet, { tick: t, tonique });

  // C — la diminuée en **contraire** sur deux octaves, en doubles.
  const monte = courseArpege({
    tonique: sensible + 12,
    accord: ACCORDS["septieme-diminuee"],
    octaves: 2,
  });
  const descend = courseArpegeDescendante({
    sommet: sensible + 12,
    accord: ACCORDS["septieme-diminuee"],
    octaves: 2,
  });
  t = poserCourse(carnet, {
    droite: repeter(monte, 5),
    gauche: repeter(descend, 5),
    tick: t,
    pas: DOUBLE,
    finTick: t + 6 * MESURE,
  });

  t = poserCharniere(carnet, { tick: t, tonique, duree: 2 * MESURE - 60 });
  return { notes: carnet.notes, duree: t + MESURE };
}

// ---- Doubles notes -------------------------------------------------------
//
//  Deux voix parallèles dans la même main, séparées d'un écart constant
//  **en degrés** : deux degrés font une tierce, cinq une sixte. Les compter
//  ainsi et non en demi-tons donne les tierces et sixtes de la gamme, majeures
//  ou mineures selon le degré — ce que joue réellement un pianiste.

function courseDoubles({ tonique, mode = "majeur", octaves = 1, ecartDegres = 2, depart = 0 }) {
  const bas = courseGamme({ tonique, mode, octaves, depart });
  const haut = courseGamme({ tonique, mode, octaves, depart: depart + ecartDegres });
  return bas.map((hauteur, i) => [hauteur, haut[i]]);
}

// Les mêmes doubles notes en chromatique : l'écart est alors constant en
// demi-tons, puisqu'aucune gamme ne les porte.
function courseDoublesChromatiques({ depart, demiTons = 12, ecart = 4 }) {
  const paires = [];
  for (let d = 0; d <= demiTons; d++) paires.push([depart + d, depart + d + ecart]);
  for (let d = demiTons - 1; d >= 0; d--) paires.push([depart + d, depart + d + ecart]);
  return paires;
}

// Pose une suite de doubles notes dans une seule main. `legato` fait durer
// chaque paire jusqu'à la suivante : les deux voix se relâchent alors
// exactement ensemble, ce que la famille C1 demande d'écrire même si rien ne
// le juge (§ 7).
//
// `finTick` **coupe** la suite : les paires qui commenceraient après la fin de
// la section ne sont pas posées. Sans cette coupe, une course répétée un peu
// trop de fois débordait sur la section suivante et sonnait par-dessus la note
// tenue de la même main — ce que la vérification a vu comme un écart de
// quatorze demi-tons.
function poserDoubles(carnet, { paires, tick, pas, main = "droite", finTick = null, legato = false }) {
  const duree = legato ? pas : Math.max(40, pas - Math.round(pas * 0.12));
  const combien = finTick === null
    ? paires.length
    : Math.min(paires.length, Math.max(1, Math.floor((finTick - tick) / pas)));
  for (let i = 0; i < combien; i++) {
    const quand = tick + i * pas;
    const dernier = i === combien - 1;
    const tenue = dernier && finTick ? Math.max(duree, finTick - quand - 40) : duree;
    const velocite = i % 4 === 0 ? VEL_APPUI : VEL_COURANTE;
    for (const hauteur of paires[i]) {
      carnet.poser(quand, tenue, hauteur, velocite, main);
    }
  }
  return finTick ?? tick + combien * pas;
}

// ---- Octaves et accords plaqués (C2) -----------------------------------
//
//  Une octave est une paire dont l'écart ne varie jamais : c'est ce qui la rend
//  différente d'une tierce ou d'une sixte, dont l'écart change avec le degré.
//  `courseDoubles` ne convient donc pas — elle raisonne en degrés —, et une
//  fonction à part est plus juste qu'un paramètre de plus.
function courseOctaves(course) {
  return course.map((hauteur) => [hauteur, hauteur + 12]);
}

// La gamme chromatique en octaves : le doigté 5-4 sur les touches noires est le
// sujet du niveau difficile, et l'écriture ne peut pas le dire — le fichier MIDI
// ne porte pas de doigté. Elle le rend **audible** en revanche : quatre notes
// noires d'affilée s'entendent.
function courseOctavesChromatiques({ depart, demiTons = 12 }) {
  const course = [];
  for (let d = 0; d <= demiTons; d++) course.push(depart + d);
  for (let d = demiTons - 1; d >= 0; d--) course.push(depart + d);
  return courseOctaves(course);
}

// Trémolo d'octaves : les deux notes alternent au lieu de sonner ensemble.
// C'est ce qui permet de tenir un long passage — le poignet bascule d'un côté
// puis de l'autre au lieu de porter tout le poids à chaque fois.
function courseTremolo({ hauteurs, battements = 4 }) {
  const suite = [];
  for (const hauteur of hauteurs) {
    for (let i = 0; i < battements; i++) suite.push(i % 2 === 0 ? hauteur : hauteur + 12);
  }
  return suite;
}

// ============================================================================
//  Famille C1 — Doubles notes
//
//  Ce qu'elle travaille : **deux voix dans une main, attaquées ensemble et
//  relâchées ensemble** (plan § 5, C1). La difficulté n'est pas de trouver les
//  deux notes, c'est de les faire partir et s'arrêter au même instant — deux
//  doigts de force inégale sur une seule intention.
//
//    moyen          — sixtes conjointes en croches, une main à la fois ;
//    difficile      — la gamme en tierces legato, doigtés 1-3 / 2-4 ;
//    très difficile — tierces sur deux octaves, tierces chromatiques, et les
//                     doubles notes aux **deux** mains ensemble.
//
//  L'écart entre les deux voix est la matière de la famille : le niveau moyen
//  desserre donc ce seul axe, la sixte dépassant la quinte du § 4.
// ============================================================================

function doublesMoyen({ tonalite, gamme }) {
  const carnet = creerCarnet();
  const { tonique, mode } = tonalite;
  let t = 0;

  // A — sixtes conjointes à la **main droite**, la gauche tenant la basse.
  const sixtesDroite = courseDoubles({ tonique, mode, octaves: 1, ecartDegres: 5 });
  const finA = 7 * MESURE;
  poserDoubles(carnet, {
    paires: repeter(sixtesDroite, 4),
    tick: t,
    pas: CROCHE,
    main: "droite",
    finTick: finA,
  });
  for (let mesure = 0; mesure < 7; mesure++) {
    carnet.poser(t + mesure * MESURE, MESURE - 60, gamme(mesure % 4) - 12, VEL_TENUE, "gauche");
  }
  t = finA;

  // B — les mêmes sixtes à la **main gauche** : les deux mains y passent, une
  // seule à la fois. C'est le quatrième et le cinquième doigt de la gauche qui
  // décident, et ce sont les plus faibles.
  const sixtesGauche = courseDoubles({ tonique: tonique - 12, mode, octaves: 1, ecartDegres: 5 });
  const finB = t + 7 * MESURE;
  poserDoubles(carnet, {
    paires: repeter(sixtesGauche, 4),
    tick: t,
    pas: CROCHE,
    main: "gauche",
    finTick: finB,
  });
  for (let mesure = 0; mesure < 7; mesure++) {
    carnet.poser(t + mesure * MESURE, MESURE - 60, gamme(mesure % 4 + 7), VEL_TENUE, "droite");
  }
  t = finB;

  t = poserCharniere(carnet, { tick: t, tonique, duree: 2 * MESURE - 60 });
  return { notes: carnet.notes, duree: t + MESURE };
}

function doublesDifficile({ tonalite, gamme }) {
  const carnet = creerCarnet();
  const { tonique, mode } = tonalite;
  let t = 0;

  // A — la gamme en **tierces legato** à la droite : chaque paire dure jusqu'à
  // la suivante, les deux voix se relâchant ensemble. Doigtés 1-3 puis 2-4.
  const tiercesDroite = courseDoubles({ tonique, mode, octaves: 1, ecartDegres: 2 });
  const finA = 6 * MESURE;
  poserDoubles(carnet, {
    paires: repeter(tiercesDroite, 3),
    tick: t,
    pas: CROCHE,
    main: "droite",
    legato: true,
    finTick: finA,
  });
  for (let mesure = 0; mesure < 6; mesure++) {
    carnet.poser(t + mesure * MESURE, MESURE - 60, gamme(mesure % 4) - 12, VEL_TENUE, "gauche");
  }
  t = finA;

  // B — les mêmes tierces à la gauche.
  const tiercesGauche = courseDoubles({ tonique: tonique - 12, mode, octaves: 1, ecartDegres: 2 });
  const finB = t + 6 * MESURE;
  poserDoubles(carnet, {
    paires: repeter(tiercesGauche, 3),
    tick: t,
    pas: CROCHE,
    main: "gauche",
    legato: true,
    finTick: finB,
  });
  for (let mesure = 0; mesure < 6; mesure++) {
    carnet.poser(t + mesure * MESURE, MESURE - 60, gamme(mesure % 4 + 7), VEL_TENUE, "droite");
  }
  t = finB;

  // C — les mêmes tierces en doubles : deux fois plus vite, la simultanéité
  // devient audible dès qu'elle manque.
  const finC = t + 6 * MESURE;
  poserDoubles(carnet, {
    paires: repeter(tiercesDroite, 6),
    tick: t,
    pas: DOUBLE,
    main: "droite",
    legato: true,
    finTick: finC,
  });
  for (let mesure = 0; mesure < 6; mesure++) {
    carnet.poser(t + mesure * MESURE, MESURE - 60, gamme(mesure % 4) - 12, VEL_TENUE, "gauche");
  }
  t = finC;

  t = poserCharniere(carnet, { tick: t, tonique });
  return { notes: carnet.notes, duree: t };
}

function doublesTresDifficile({ tonalite, gamme }) {
  const carnet = creerCarnet();
  const { tonique, mode } = tonalite;
  let t = 0;

  // A — tierces sur **deux octaves**, à la droite. La main doit garder l'écart
  // constant en traversant, passage du pouce compris.
  const tierces2Oct = courseDoubles({ tonique, mode, octaves: 2, ecartDegres: 2 });
  const finA = 7 * MESURE;
  poserDoubles(carnet, {
    paires: repeter(tierces2Oct, 3),
    tick: t,
    pas: CROCHE,
    main: "droite",
    legato: true,
    finTick: finA,
  });
  for (let mesure = 0; mesure < 7; mesure++) {
    carnet.poser(t + mesure * MESURE, MESURE - 60, gamme(mesure % 4) - 24, VEL_TENUE, "gauche");
  }
  t = finA;

  t = poserCharniere(carnet, { tick: t, tonique });

  // B — **tierces chromatiques** : l'écart reste de quatre demi-tons, mais
  // aucune touche blanche ne guide plus la main.
  const chromatiques = courseDoublesChromatiques({ depart: tonique, demiTons: 12, ecart: 4 });
  const finB = t + 6 * MESURE;
  poserDoubles(carnet, {
    paires: repeter(chromatiques, 3),
    tick: t,
    pas: DOUBLE,
    main: "droite",
    legato: true,
    finTick: finB,
  });
  for (let mesure = 0; mesure < 6; mesure++) {
    carnet.poser(t + mesure * MESURE, MESURE - 60, gamme(mesure % 4) - 24, VEL_TENUE, "gauche");
  }
  t = finB;

  t = poserCharniere(carnet, { tick: t, tonique });

  // C — doubles notes **aux deux mains** : quatre doigts décident au même
  // instant, deux par main, et rien ne les rattrape.
  const tiercesGauche = courseDoubles({ tonique: tonique - 12, mode, octaves: 1, ecartDegres: 2 });
  const tiercesDroite = courseDoubles({ tonique, mode, octaves: 1, ecartDegres: 2 });
  const finC = t + 7 * MESURE;
  poserDoubles(carnet, {
    paires: repeter(tiercesDroite, 4),
    tick: t,
    pas: CROCHE,
    main: "droite",
    legato: true,
    finTick: finC,
  });
  poserDoubles(carnet, {
    paires: repeter(tiercesGauche, 4),
    tick: t,
    pas: CROCHE,
    main: "gauche",
    legato: true,
    finTick: finC,
  });
  t = finC;

  t = poserCharniere(carnet, { tick: t, tonique, duree: 2 * MESURE - 60 });
  return { notes: carnet.notes, duree: t + MESURE };
}

// ============================================================================
//  Famille C2 — Octaves et accords plaqués
//
//  Ce qu'elle travaille : **le poignet souple et l'avant-bras qui porte**
//  (plan § 5, C2). L'octave n'est pas difficile à trouver, elle est difficile à
//  répéter : c'est la fatigue qui fait échouer un passage d'octaves, pas la
//  justesse.
//
//    moyen          — octaves détachées en croches, une octave d'ambitus ;
//    difficile      — octaves legato et gamme d'octaves chromatique, où le
//                     doigté 5-4 sur les noires devient nécessaire ;
//    très difficile — trémolo d'octaves, puis accords de quatre sons répétés.
//
//  L'écart de l'octave est la matière de la famille : le niveau moyen desserre
//  ce seul axe, l'octave dépassant la quinte du § 4. Le difficile n'a besoin
//  d'aucune tolérance — son plafond est déjà l'octave.
// ============================================================================

function octavesMoyen({ tonalite, gamme }) {
  const carnet = creerCarnet();
  const { tonique, mode } = tonalite;
  let t = 0;

  // A — octaves **détachées** à la droite, sur une octave d'ambitus. Détachées
  // et non liées : c'est le relâchement entre deux octaves qui fait qu'on peut
  // en jouer beaucoup, et il s'entend dans le silence entre les deux.
  const octavesDroite = courseOctaves(courseGamme({ tonique, mode, octaves: 1 }));
  const finA = 7 * MESURE;
  poserDoubles(carnet, {
    paires: repeter(octavesDroite, 4),
    tick: t,
    pas: CROCHE,
    main: "droite",
    finTick: finA,
  });
  for (let mesure = 0; mesure < 7; mesure++) {
    carnet.poser(t + mesure * MESURE, MESURE - 60, gamme(mesure % 4) - 12, VEL_TENUE, "gauche");
  }
  t = finA;

  // B — les mêmes octaves à la gauche. C'est la main qui les rencontre le plus
  // dans le répertoire, et celle qui se raidit le plus vite.
  const octavesGauche = courseOctaves(
    courseGamme({ tonique: tonique - 24, mode, octaves: 1 })
  );
  const finB = t + 7 * MESURE;
  poserDoubles(carnet, {
    paires: repeter(octavesGauche, 4),
    tick: t,
    pas: CROCHE,
    main: "gauche",
    finTick: finB,
  });
  for (let mesure = 0; mesure < 7; mesure++) {
    carnet.poser(t + mesure * MESURE, MESURE - 60, gamme(mesure % 4 + 7), VEL_TENUE, "droite");
  }
  t = finB;

  t = poserCharniere(carnet, { tick: t, tonique, duree: 2 * MESURE - 60 });
  return { notes: carnet.notes, duree: t + MESURE };
}

function octavesDifficile({ tonalite, gamme }) {
  const carnet = creerCarnet();
  const { tonique, mode } = tonalite;
  let t = 0;

  // A — gamme d'octaves **liée**, à la droite : les deux notes se relâchent
  // ensemble et l'octave suivante enchaîne sans trou.
  const gammeOctaves = courseOctaves(courseGamme({ tonique, mode, octaves: 2 }));
  const finA = 6 * MESURE;
  poserDoubles(carnet, {
    paires: repeter(gammeOctaves, 3),
    tick: t,
    pas: CROCHE,
    main: "droite",
    legato: true,
    finTick: finA,
  });
  for (let mesure = 0; mesure < 6; mesure++) {
    carnet.poser(t + mesure * MESURE, MESURE - 60, gamme(mesure % 4) - 24, VEL_TENUE, "gauche");
  }
  t = finA;

  // B — octaves **chromatiques** : c'est ici que le 5-4 sur les noires devient
  // obligatoire. Le fichier MIDI ne porte pas de doigté, mais il rend la
  // contrainte audible — cinq noires d'affilée, aucun repère de touche blanche.
  const chromatiques = courseOctavesChromatiques({ depart: tonique, demiTons: 12 });
  const finB = t + 6 * MESURE;
  poserDoubles(carnet, {
    paires: repeter(chromatiques, 3),
    tick: t,
    pas: CROCHE,
    main: "droite",
    legato: true,
    finTick: finB,
  });
  for (let mesure = 0; mesure < 6; mesure++) {
    carnet.poser(t + mesure * MESURE, MESURE - 60, gamme(mesure % 4) - 24, VEL_TENUE, "gauche");
  }
  t = finB;

  // C — les mêmes octaves à la gauche, pour que le poignet faible y passe aussi.
  const chromatiquesGauche = courseOctavesChromatiques({
    depart: tonique - 24,
    demiTons: 12,
  });
  const finC = t + 6 * MESURE;
  poserDoubles(carnet, {
    paires: repeter(chromatiquesGauche, 3),
    tick: t,
    pas: CROCHE,
    main: "gauche",
    legato: true,
    finTick: finC,
  });
  for (let mesure = 0; mesure < 6; mesure++) {
    carnet.poser(t + mesure * MESURE, MESURE - 60, gamme(mesure % 4 + 7), VEL_TENUE, "droite");
  }
  t = finC;

  t = poserCharniere(carnet, { tick: t, tonique });
  return { notes: carnet.notes, duree: t };
}

function octavesTresDifficile({ tonalite, gamme }) {
  const carnet = creerCarnet();
  const { tonique } = tonalite;
  let t = 0;

  // A — **trémolo d'octaves** à la droite, en doubles-croches : les deux notes
  // alternent au lieu de sonner ensemble. C'est le geste qui permet de tenir un
  // long passage, et il n'a plus rien à voir avec l'octave plaquée.
  const socles = [0, 2, 4, 5, 7, 5, 4, 2].map((degre) => gamme(degre));
  const tremolo = courseTremolo({ hauteurs: socles, battements: 8 });
  const finA = 7 * MESURE;
  for (let i = 0; i < (finA - t) / DOUBLE; i++) {
    const hauteur = tremolo[i % tremolo.length];
    carnet.poser(
      t + i * DOUBLE,
      DOUBLE - 20,
      hauteur,
      i % 8 === 0 ? VEL_APPUI : VEL_COURANTE,
      "droite"
    );
  }
  for (let mesure = 0; mesure < 7; mesure++) {
    carnet.poser(t + mesure * MESURE, MESURE - 60, gamme(mesure % 4) - 24, VEL_TENUE, "gauche");
  }
  t = finA;

  t = poserCharniere(carnet, { tick: t, tonique });

  // B — **accords de quatre sons répétés vite**, aux deux mains. Ici aucun
  // relais de doigts n'est possible : la répétition ne peut venir que du
  // poignet, et c'est l'épreuve de fatigue de la famille.
  const finB = t + 7 * MESURE;
  const quatreSons = [0, 2, 4, 7].map((degre) => gamme(degre));
  for (let i = 0; i < (finB - t) / CROCHE; i++) {
    const quand = t + i * CROCHE;
    // Une croche sur quatre est silencieuse : la main s'y replace. Sans ce
    // souffle, l'exercice n'apprendrait qu'à se crisper.
    if (i % 4 === 3) continue;
    for (const hauteur of quatreSons) {
      carnet.poser(quand, CROCHE - 60, hauteur, i % 4 === 0 ? VEL_APPUI : VEL_COURANTE, "droite");
      carnet.poser(quand, CROCHE - 60, hauteur - 24, i % 4 === 0 ? VEL_APPUI : VEL_COURANTE, "gauche");
    }
  }
  t = finB;

  // C — trémolo aux **deux** mains en sens opposé : la droite monte pendant que
  // la gauche descend, chacune en trémolo d'octaves.
  const finC = t + 7 * MESURE;
  // Les socles montent jusqu'à la quinte **puis redescendent** : sans ce
  // retour, la suite se rebouclait du sommet à la tonique et le générateur y
  // voyait — à raison — un saut de trente et un demi-tons qu'aucun poignet ne
  // fait en une double-croche. La gauche reste à une octave sous sa tonique
  // habituelle et non deux : deux l'emmenaient sous la borne lisible.
  const monte = [0, 2, 4, 5, 7, 5, 4, 2].map((degre) => gamme(degre));
  const descend = [0, -2, -4, -5, -7, -5, -4, -2].map((degre) => gamme(degre) - 12);
  const tremoloDroite = courseTremolo({ hauteurs: monte, battements: 8 });
  const tremoloGauche = courseTremolo({ hauteurs: descend, battements: 8 });
  for (let i = 0; i < (finC - t) / DOUBLE; i++) {
    const quand = t + i * DOUBLE;
    const appui = i % 8 === 0 ? VEL_APPUI : VEL_COURANTE;
    carnet.poser(quand, DOUBLE - 20, tremoloDroite[i % tremoloDroite.length], appui, "droite");
    carnet.poser(quand, DOUBLE - 20, tremoloGauche[i % tremoloGauche.length], appui, "gauche");
  }
  t = finC;

  t = poserCharniere(carnet, { tick: t, tonique, duree: 2 * MESURE - 60 });
  return { notes: carnet.notes, duree: t + MESURE };
}

// ---- Pédale (E4) ---------------------------------------------------------
//
//  Deux gestes, et ils sont opposés. La pédale **directe** descend *avec*
//  l'accord ; la **syncopée** se lève *sur* l'accord suivant et se réenfonce
//  juste après. C'est la seule différence, et c'est tout le sujet de 09.

//  L'appui tombe **un tick après** le début, et ce détail d'un millième de temps
//  a une conséquence visible. Aux jointures de section, le levé de la précédente
//  et l'appui de la suivante tombaient au même instant ; `extractPedalIntervals()`
//  du mode Morceau regroupe les évènements de même temps, si bien qu'il ne
//  fermait pas l'intervalle et en dessinait **un de moins** que la partition n'en
//  écrit. Un tick de décalage suffit à ce que ce qui est lu soit ce qui est écrit.
const AVANCE_PEDALE = 1;

function poserPedaleDirecte(carnet, { tick, mesures, pas = MESURE, souffle = 60 }) {
  for (let m = 0; m < mesures; m++) {
    const debut = tick + m * pas;
    carnet.pedale(debut + AVANCE_PEDALE, true);
    carnet.pedale(debut + pas - souffle, false);
  }
  return tick + mesures * pas;
}

// `changements` compte les levés, donc les changements d'harmonie. Le dernier ne
// réenfonce pas : une section se termine pédale levée, sinon la suivante
// commencerait sur le brouillard de la précédente.
function poserPedaleSyncopee(carnet, { tick, changements, pas = TEMPS, retard = 60 }) {
  carnet.pedale(tick + AVANCE_PEDALE, true);
  for (let i = 1; i <= changements; i++) {
    const quand = tick + i * pas;
    carnet.pedale(quand, false);
    if (i < changements) carnet.pedale(quand + retard, true);
  }
  return tick + changements * pas;
}

// Une harmonie où la basse et l'accord sont **successifs** : la basse au premier
// temps, l'accord au second, tous deux courts. Ce n'est pas un choix d'écriture
// mais la conséquence d'un refus du générateur — basse et accord au même instant
// écartaient la main gauche de dix-neuf demi-tons, injouable. Et c'est mieux
// ainsi : la pédale doit tenir la basse **après** que la main l'a quittée, ce qui
// est exactement sa raison d'être.
function poserHarmonieLarge(carnet, { tick, gamme, degre, accord, melodie, pas = TEMPS }) {
  const bref = Math.round(pas / 2);
  carnet.poser(tick, bref, gamme(degre) - 24, VEL_APPUI, "gauche");
  for (const d of accord) {
    carnet.poser(tick + pas, bref, gamme(d) - 12, VEL_COURANTE, "gauche");
  }
  melodie.forEach((d, i) => {
    carnet.poser(tick + i * pas, pas - 40, gamme(d), i === 0 ? VEL_APPUI : VEL_COURANTE, "droite");
  });
  return tick + melodie.length * pas;
}

// À une harmonie par temps, il n'y a plus de place pour deux gestes successifs :
// la basse va à la gauche, l'accord à la droite. Chaque main garde alors un écart
// de quinte, et la pédale tient toujours la basse après que le doigt l'a lâchée.
function poserHarmonieBreve(carnet, { tick, basse, accord, duree, ecarts = [0, 2, 4] }) {
  carnet.poser(tick, duree, basse - 12, VEL_APPUI, "gauche");
  accord.forEach((hauteur, i) => {
    carnet.poser(tick, duree, hauteur, i === 0 ? VEL_APPUI : VEL_COURANTE, "droite");
  });
  void ecarts;
}

// ============================================================================
//  Famille E4 — Pédale (CC 64)
//
//  Ce qu'elle travaille : **le pied qui suit l'harmonie, pas les doigts**
//  (plan § 5, E4). Ce sont les premiers fichiers pédalés du projet — aucun des
//  26 fichiers Mutopia ne contient de CC 64 —, et c'est ce qui débloque la
//  famille Application de plan/09.
//
//    moyen          — pédale directe, un changement par mesure ;
//    difficile      — pédale syncopée, un changement par temps ;
//    très difficile — harmonie chromatique, et des tenues longues à nettoyer.
//
//  Dans chaque niveau, les accords sont **courts** : les doigts lâchent, et seule
//  la pédale lie. C'est le seul moyen d'entendre si le pied a fait son travail —
//  sinon les doigts le font à sa place sans qu'on le sache.
// ============================================================================

// I – IV – V – I. Les trois accords sont à l'**état fondamental** : leurs trois
// notes tiennent alors dans une quinte, le plafond d'écart du niveau moyen. Les
// deux premiers renversements l'auraient dépassé — do-fa-la fait une sixte —, et
// desserrer cet axe aurait été malhonnête : cette famille travaille le pied, pas
// l'ouverture de la main.
//
// IV et V sont posés **sous** la tonique plutôt qu'au-dessus. Ce n'est pas une
// coquetterie : au-dessus, l'accord de dominante montait à ré4 et la main gauche
// couvrait vingt-six demi-tons avec sa basse, deux de trop.
const CADENCE_E4 = [
  { degre: 0, accord: [0, 2, 4], melodie: [4, 2, 4, 5] },      // do mi sol
  { degre: 3, accord: [-4, -2, 0], melodie: [5, 5, 3, 2] },    // fa la do
  { degre: 4, accord: [-3, -1, 1], melodie: [4, 6, 4, 2] },    // sol si ré
  { degre: 0, accord: [0, 2, 4], melodie: [4, 2, 4, 0] },      // do mi sol
];

function pedaleMoyen({ gamme, tonalite }) {
  const carnet = creerCarnet();
  const { tonique } = tonalite;
  let t = 0;

  // A — pédale directe : le pied descend avec la basse et se lève juste avant la
  // mesure suivante. Un changement par mesure, le geste le plus simple.
  for (let m = 0; m < 8; m++) {
    const h = CADENCE_E4[m % 4];
    poserHarmonieLarge(carnet, {
      tick: t + m * MESURE,
      gamme,
      degre: h.degre,
      accord: h.accord,
      melodie: h.melodie,
    });
  }
  poserPedaleDirecte(carnet, { tick: t, mesures: 8 });
  t += 8 * MESURE;

  // B — la même cadence, mais la mélodie tient la note pendant toute la mesure :
  // on entend alors si la pédale a coupé la basse trop tôt.
  for (let m = 0; m < 6; m++) {
    const h = CADENCE_E4[m % 4];
    poserHarmonieLarge(carnet, {
      tick: t + m * MESURE,
      gamme,
      degre: h.degre,
      accord: h.accord,
      melodie: [h.melodie[0], h.melodie[1], h.melodie[2], h.melodie[3]],
    });
  }
  poserPedaleDirecte(carnet, { tick: t, mesures: 6 });
  t += 6 * MESURE;

  const charniere = t;
  t = poserCharniere(carnet, { tick: charniere, tonique, duree: 2 * MESURE - 60 });
  carnet.pedale(charniere + AVANCE_PEDALE, true);
  carnet.pedale(charniere + 2 * MESURE - 90, false);
  return { notes: carnet.notes, pedales: carnet.pedales, duree: charniere + 2 * MESURE };
}

function pedaleDifficile({ gamme, tonalite }) {
  const carnet = creerCarnet();
  const { tonique } = tonalite;
  let t = 0;

  // Une harmonie par **temps** : quatre changements de pédale par mesure. C'est
  // là que le geste syncopé devient un réflexe ou ne l'est pas.
  const PAR_TEMPS = [0, 5, 3, 4]; // I – vi – IV – V

  // A — pédale syncopée, un accord par temps, tout court.
  const mesuresA = 6;
  for (let temps = 0; temps < mesuresA * 4; temps++) {
    const d = PAR_TEMPS[temps % 4];
    poserHarmonieBreve(carnet, {
      tick: t + temps * TEMPS,
      basse: gamme(d),
      accord: [gamme(d), gamme(d + 2), gamme(d + 4)],
      duree: Math.round(TEMPS / 2),
    });
  }
  poserPedaleSyncopee(carnet, { tick: t, changements: mesuresA * 4 });
  t += mesuresA * MESURE;

  // B — une note de mélodie s'ajoute à contretemps. Le pied ne doit pas la
  // suivre : il suit l'harmonie, qui ne change qu'au temps.
  const mesuresB = 6;
  for (let temps = 0; temps < mesuresB * 4; temps++) {
    const d = PAR_TEMPS[temps % 4];
    poserHarmonieBreve(carnet, {
      tick: t + temps * TEMPS,
      basse: gamme(d),
      accord: [gamme(d), gamme(d + 2), gamme(d + 4)],
      duree: Math.round(TEMPS / 2),
    });
    // La note de contretemps appartient à l'accord en cours : sans cela, le saut
    // vers l'accord suivant dépassait l'octave que le niveau autorise.
    carnet.poser(t + temps * TEMPS + CROCHE, CROCHE - 30, gamme(d + 2), VEL_COURANTE, "droite");
  }
  poserPedaleSyncopee(carnet, { tick: t, changements: mesuresB * 4 });
  t += mesuresB * MESURE;

  // C — un changement par **demi-mesure** : le pied tient plus longtemps sans
  // que l'harmonie se brouille. Plus long ne veut pas dire plus facile.
  const mesuresC = 5;
  for (let demi = 0; demi < mesuresC * 2; demi++) {
    const h = CADENCE_E4[demi % 4];
    poserHarmonieBreve(carnet, {
      tick: t + demi * 2 * TEMPS,
      basse: gamme(h.degre),
      accord: h.accord.map((d) => gamme(d)),
      duree: TEMPS,
    });
  }
  poserPedaleSyncopee(carnet, { tick: t, changements: mesuresC * 2, pas: 2 * TEMPS });
  t += mesuresC * MESURE;

  const charniere = t;
  t = poserCharniere(carnet, { tick: charniere, tonique, duree: 2 * MESURE - 60 });
  carnet.pedale(charniere + AVANCE_PEDALE, true);
  carnet.pedale(charniere + 2 * MESURE - 90, false);
  return { notes: carnet.notes, pedales: carnet.pedales, duree: charniere + 2 * MESURE };
}

function pedaleTresDifficile({ gamme, tonalite }) {
  const carnet = creerCarnet();
  const { tonique } = tonalite;
  let t = 0;

  // Harmonie **chromatique** : la basse descend par demi-tons. Aucun degré de
  // gamme ne la décrit, d'où les écarts en demi-tons bruts — et c'est le cas où
  // le pied ne peut plus se fier à l'habitude : deux harmonies voisines n'ont
  // aucune note commune, donc rien ne rattrape une pédale mal levée.
  const CHROMATIQUE = [0, -1, -2, -3, -4, -5, -6, -7];

  // A — syncopée sur harmonie chromatique, un changement par temps.
  const mesuresA = 7;
  for (let temps = 0; temps < mesuresA * 4; temps++) {
    const bas = tonique + CHROMATIQUE[temps % CHROMATIQUE.length];
    poserHarmonieBreve(carnet, {
      tick: t + temps * TEMPS,
      basse: bas,
      accord: [bas, bas + 4, bas + 7],
      duree: Math.round(TEMPS / 2),
    });
  }
  poserPedaleSyncopee(carnet, { tick: t, changements: mesuresA * 4 });
  t += mesuresA * MESURE;

  // B — **tenues longues à nettoyer** : deux mesures par pédale. Le levé doit
  // tomber exactement au changement d'harmonie. Une demi-pédale ferait mieux,
  // mais le CC 64 est tout-ou-rien (plan § 7) — l'exercice s'écrit donc avec le
  // geste que l'application sait lire.
  const paires = 4;
  for (let paire = 0; paire < paires; paire++) {
    const h = CADENCE_E4[paire % 4];
    for (let m = 0; m < 2; m++) {
      poserHarmonieLarge(carnet, {
        tick: t + (paire * 2 + m) * MESURE,
        gamme,
        degre: h.degre,
        accord: h.accord,
        melodie: h.melodie,
      });
    }
  }
  poserPedaleDirecte(carnet, { tick: t, mesures: paires, pas: 2 * MESURE, souffle: 90 });
  t += paires * 2 * MESURE;

  // C — chromatique **et** syncopée à la croche : le geste doit être deux fois
  // plus rapide que la section A pour la même harmonie. C'est le plus dur que
  // cette famille produise.
  const mesuresC = 6;
  for (let croche = 0; croche < mesuresC * 8; croche++) {
    const bas = tonique + CHROMATIQUE[croche % CHROMATIQUE.length];
    poserHarmonieBreve(carnet, {
      tick: t + croche * CROCHE,
      basse: bas,
      accord: [bas, bas + 7],
      duree: CROCHE - 40,
    });
  }
  poserPedaleSyncopee(carnet, { tick: t, changements: mesuresC * 8, pas: CROCHE, retard: 40 });
  t += mesuresC * MESURE;

  const charniere = t;
  t = poserCharniere(carnet, { tick: charniere, tonique, duree: 2 * MESURE - 60 });
  carnet.pedale(charniere + AVANCE_PEDALE, true);
  carnet.pedale(charniere + 2 * MESURE - 90, false);
  return { notes: carnet.notes, pedales: carnet.pedales, duree: charniere + 2 * MESURE };
}

// ============================================================================
//  Famille D1 — Indépendance rythmique
//
//  Ce qu'elle travaille : **deux pulsations dans une seule tête** (plan § 5,
//  D1). Les notes n'y sont qu'un support — ce sont des gammes qui se referment
//  sur elles-mêmes —, et c'est le rapport des deux mains qui fait la
//  difficulté.
//
//    moyen          — croches contre noires, puis contretemps ;
//    difficile      — trois contre deux, dans les deux sens, puis en contraire ;
//    très difficile — quatre contre trois, puis triolets contre doubles.
//
//  Le § 4 classe « rythmes différents (3:2, 4:3) » en très difficile. C'est le
//  rapport que cette famille **travaille**, pas un axe qu'elle subit : sa propre
//  ligne du § 5 le gradue, comme les sauts graduent B3. Aucune tolérance n'est
//  nécessaire pour autant — le vérificateur ne mesure que le débit, l'ambitus,
//  l'écart et le saut, et le rapport des mains est un choix d'écriture.
//
//  Chaque section se termine par une charnière, et ce n'est pas décoratif : sans
//  elle, la reprise de la course au début de la section suivante formait un saut
//  de septième que le niveau moyen interdit. La charnière contient la tonique,
//  donc la distance à la note précédente y est nulle.
// ============================================================================

function rythmeMoyen({ tonalite }) {
  const carnet = creerCarnet();
  const { tonique, mode } = tonalite;
  let t = 0;

  const courseD = courseGamme({ tonique, mode, octaves: 1 });
  const courseG = courseGamme({ tonique: tonique - 12, mode, octaves: 1 });

  // A — deux notes contre une : croches à la droite, noires à la gauche. Le
  // rapport le plus simple, et le seul où chaque note de la gauche tombe
  // **avec** une note de la droite.
  const finA = 6 * MESURE;
  poserLigne(carnet, {
    course: repeter(courseD, 4),
    tick: t,
    pas: CROCHE,
    main: "droite",
    finTick: finA,
  });
  poserLigne(carnet, {
    course: repeter(courseG, 2),
    tick: t,
    pas: TEMPS,
    main: "gauche",
    finTick: finA,
  });
  t = finA;
  t = poserCharniere(carnet, { tick: t, tonique });

  // B — contretemps : la gauche joue **entre** les temps. Plus aucune note ne
  // tombe avec l'autre main, et c'est là que le pied doit continuer de battre.
  const finB = t + 6 * MESURE;
  poserLigne(carnet, {
    course: repeter(courseD, 2),
    tick: t,
    pas: TEMPS,
    main: "droite",
    finTick: finB,
  });
  poserLigne(carnet, {
    course: repeter(courseG, 2),
    tick: t + CROCHE,
    pas: TEMPS,
    main: "gauche",
    finTick: finB,
    etirerFin: false, // une note à contretemps ne se prolonge pas jusqu'à la fin
  });
  t = finB;

  t = poserCharniere(carnet, { tick: t, tonique, duree: 2 * MESURE - 60 });
  return { notes: carnet.notes, duree: t + MESURE };
}

function rythmeDifficile({ tonalite }) {
  const carnet = creerCarnet();
  const { tonique, mode } = tonalite;
  let t = 0;

  const courseD = courseGamme({ tonique, mode, octaves: 1 });
  const courseG = courseGamme({ tonique: tonique - 12, mode, octaves: 1 });

  // A — trois contre deux : triolets de croches à la droite, croches à la
  // gauche. Seule la première note de chaque temps tombe avec l'autre main.
  const finA = 5 * MESURE;
  poserLigne(carnet, {
    course: repeter(courseD, 5),
    tick: t,
    pas: TRIOLET_CROCHE,
    main: "droite",
    appuiTous: 3,
    finTick: finA,
  });
  poserLigne(carnet, {
    course: repeter(courseG, 3),
    tick: t,
    pas: CROCHE,
    main: "gauche",
    finTick: finA,
  });
  t = finA;
  t = poserCharniere(carnet, { tick: t, tonique });

  // B — l'inverse. Une main sait rarement faire les deux : c'est le même
  // rapport, et il faut le réapprendre dans l'autre sens.
  const finB = t + 5 * MESURE;
  poserLigne(carnet, {
    course: repeter(courseD, 3),
    tick: t,
    pas: CROCHE,
    main: "droite",
    finTick: finB,
  });
  poserLigne(carnet, {
    course: repeter(courseG, 5),
    tick: t,
    pas: TRIOLET_CROCHE,
    main: "gauche",
    appuiTous: 3,
    finTick: finB,
  });
  t = finB;
  t = poserCharniere(carnet, { tick: t, tonique });

  // C — trois contre deux en **sens opposé** : la gauche descend pendant que la
  // droite monte. Deux rythmes et deux directions ; plus aucun repère commun.
  const descendG = courseGamme({ tonique: tonique - 12, mode, octaves: 1, sens: -1 });
  const finC = t + 5 * MESURE;
  poserLigne(carnet, {
    course: repeter(courseD, 5),
    tick: t,
    pas: TRIOLET_CROCHE,
    main: "droite",
    appuiTous: 3,
    finTick: finC,
  });
  poserLigne(carnet, {
    course: repeter(descendG, 3),
    tick: t,
    pas: CROCHE,
    main: "gauche",
    finTick: finC,
  });
  t = finC;

  // Charnière de deux mesures : dix-huit mesures ne faisaient que 43 s à 100 à
  // la noire, sous le plancher de 45 s du § 2.
  t = poserCharniere(carnet, { tick: t, tonique, duree: 2 * MESURE - 60 });
  return { notes: carnet.notes, duree: t + MESURE };
}

function rythmeTresDifficile({ tonalite }) {
  const carnet = creerCarnet();
  const { tonique, mode } = tonalite;
  let t = 0;

  const courseD = courseGamme({ tonique, mode, octaves: 1 });
  const courseG = courseGamme({ tonique: tonique - 12, mode, octaves: 1 });

  // A — quatre contre trois : doubles-croches à la droite, triolets à la
  // gauche. Le plus petit commun multiple est douze : à l'intérieur du temps,
  // aucune note ne retombe avec l'autre main. C'est le rapport où compter ne
  // sert plus à rien.
  const finA = 6 * MESURE;
  poserLigne(carnet, {
    course: repeter(courseD, 7),
    tick: t,
    pas: DOUBLE,
    main: "droite",
    finTick: finA,
  });
  poserLigne(carnet, {
    course: repeter(courseG, 5),
    tick: t,
    pas: TRIOLET_CROCHE,
    main: "gauche",
    appuiTous: 3,
    finTick: finA,
  });
  t = finA;
  t = poserCharniere(carnet, { tick: t, tonique });

  // B — l'inverse : triolets à la droite, doubles à la gauche.
  const finB = t + 6 * MESURE;
  poserLigne(carnet, {
    course: repeter(courseD, 5),
    tick: t,
    pas: TRIOLET_CROCHE,
    main: "droite",
    appuiTous: 3,
    finTick: finB,
  });
  poserLigne(carnet, {
    course: repeter(courseG, 7),
    tick: t,
    pas: DOUBLE,
    main: "gauche",
    finTick: finB,
  });
  t = finB;
  t = poserCharniere(carnet, { tick: t, tonique });

  // C — quatre contre trois en sens opposé, ce que la famille cumule de plus
  // dur : deux subdivisions incommensurables et deux directions.
  const descendG = courseGamme({ tonique: tonique - 12, mode, octaves: 1, sens: -1 });
  // Sept mesures et non six : vingt-deux mesures ne faisaient que 44 s à 120.
  const finC = t + 7 * MESURE;
  poserLigne(carnet, {
    course: repeter(courseD, 8),
    tick: t,
    pas: DOUBLE,
    main: "droite",
    finTick: finC,
  });
  poserLigne(carnet, {
    course: repeter(descendG, 6),
    tick: t,
    pas: TRIOLET_CROCHE,
    main: "gauche",
    appuiTous: 3,
    finTick: finC,
  });
  t = finC;

  t = poserCharniere(carnet, { tick: t, tonique, duree: 2 * MESURE - 60 });
  return { notes: carnet.notes, duree: t + MESURE };
}

// ============================================================================
//  Famille B3 — Sauts et déplacements
//
//  Ce qu'elle travaille : **viser sans regarder**, et le geste qui part avant
//  le temps (plan § 5, B3). Une note lointaine ne se joue pas au moment où on
//  la joue : la main doit être partie pendant que la précédente sonne encore.
//
//  C'est la famille dont **l'axe des sauts du § 4 est le sujet, pas la
//  contrainte** : les plafonds génériques y sont remplacés par ceux de sa
//  propre ligne — une octave, deux, puis trois avec croisement de mains. Les
//  tolérances qui le disent sont déclarées au catalogue, comme partout.
//
//  Les sauts sont écrits en **croches** et non en noires : au-delà d'un temps,
//  le vérificateur cesse à juste titre de compter un déplacement comme un saut
//  (« la main a eu le temps de viser »), et l'exercice ne mesurerait plus rien.
//  C'est aussi vrai musicalement — c'est la brièveté qui oblige à anticiper.
// ============================================================================

// Une mélodie diatonique simple pour la main qui n'exerce pas le saut : elle
// doit occuper l'oreille sans ajouter de difficulté. Degrés d'une gamme.
const MELODIE_SIMPLE = [0, 2, 4, 2, 3, 1, 0, 1];

// Pose une basse et son accord en alternance de croches. `surLeTemps` dit
// lequel des deux tombe sur le temps : la basse (oom-pah ordinaire) ou
// l'accord (contretemps, où c'est la basse qui syncope).
function poserBasseAccord(carnet, { tick, basse, accord, mesures = 1, surLeTemps = "basse", souffle = true }) {
  for (let mesure = 0; mesure < mesures; mesure++) {
    const derniere = mesure === mesures - 1;
    for (let i = 0; i < 8; i++) {
      // Une croche tue avant le changement d'harmonie : la main a le temps de
      // se replacer, et l'oreille entend la respiration.
      if (souffle && derniere && i === 7) continue;
      const surTemps = i % 2 === 0;
      const cestLaBasse = surTemps === (surLeTemps === "basse");
      const quand = tick + mesure * MESURE + i * CROCHE;
      const velocite = cestLaBasse ? VEL_APPUI : VEL_COURANTE;
      if (cestLaBasse) {
        carnet.poser(quand, CROCHE - 25, basse, velocite, "gauche");
      } else {
        for (const hauteur of accord) {
          carnet.poser(quand, CROCHE - 25, hauteur, velocite, "gauche");
        }
      }
    }
  }
  return tick + mesures * MESURE;
}

function poserMelodie(carnet, { tick, gamme, mesures = 1, depart = 0, pas = TEMPS }) {
  const parMesure = MESURE / pas;
  for (let mesure = 0; mesure < mesures; mesure++) {
    for (let i = 0; i < parMesure; i++) {
      const degre = depart + MELODIE_SIMPLE[(mesure * parMesure + i) % MELODIE_SIMPLE.length];
      const velocite = i === 0 ? VEL_APPUI : VEL_COURANTE;
      carnet.poser(
        tick + mesure * MESURE + i * pas,
        pas - 30,
        gamme(degre),
        velocite,
        "droite"
      );
    }
  }
  return tick + mesures * MESURE;
}

function sautsMoyen({ tonalite, gamme }) {
  const carnet = creerCarnet();
  const { tonique } = tonalite;
  let t = 0;

  // A — la basse-accord classique sur I-IV-V-I. La basse est toujours une
  // **octave** sous le bas de son accord : c'est le saut de la ligne B3.
  const harmonie = [
    { basse: tonique - 24, accord: [tonique - 12, tonique - 8] },      // do2 → do3-mi3
    { basse: tonique - 19, accord: [tonique - 7, tonique - 3] },       // fa2 → fa3-la3
    { basse: tonique - 17, accord: [tonique - 5, tonique - 1] },       // sol2 → sol3-si3
    { basse: tonique - 24, accord: [tonique - 12, tonique - 8] },      // do2 → do3-mi3
  ];
  for (const { basse, accord } of harmonie) {
    poserBasseAccord(carnet, { tick: t, basse, accord, mesures: 2 });
    poserMelodie(carnet, { tick: t, gamme, mesures: 2 });
    t += 2 * MESURE;
  }

  // B — la cible bouge : la basse monte degré par degré, et l'accord la suit
  // une octave plus haut. On ne peut plus viser de mémoire.
  const CIBLES = [0, 1, 2, 3, 4, 0];
  for (const degre of CIBLES) {
    const basse = gamme(degre) - 24;
    poserBasseAccord(carnet, {
      tick: t,
      basse,
      accord: [basse + 12, basse + 16],
      mesures: 1,
    });
    // La droite tient : c'est la gauche qu'on regarde, pas elle.
    carnet.poser(t, MESURE - 60, gamme(degre + 7), VEL_TENUE, "droite");
    t += MESURE;
  }

  t = poserCharniere(carnet, { tick: t, tonique, duree: 2 * MESURE - 60 });
  return { notes: carnet.notes, duree: t + MESURE };
}

function sautsDifficile({ tonalite, gamme }) {
  const carnet = creerCarnet();
  const { tonique } = tonalite;
  let t = 0;

  // A — **deux octaves**, et la basse **à contretemps** : c'est l'accord qui
  // tombe sur le temps, la basse arrive après. Le geste doit partir pendant
  // que l'accord sonne encore.
  const harmonie = [
    { basse: tonique - 24, accord: [tonique, tonique + 4, tonique + 7] },
    { basse: tonique - 19, accord: [tonique + 5, tonique + 9, tonique + 12] },
    { basse: tonique - 17, accord: [tonique + 2, tonique + 7, tonique + 11] },
    { basse: tonique - 24, accord: [tonique, tonique + 4, tonique + 7] },
  ];
  for (const { basse, accord } of harmonie) {
    poserBasseAccord(carnet, { tick: t, basse, accord, mesures: 2, surLeTemps: "accord" });
    poserMelodie(carnet, { tick: t, gamme, mesures: 2, depart: 7, pas: CROCHE });
    t += 2 * MESURE;
  }

  // B — cible mobile, toujours à deux octaves.
  for (let mesure = 0; mesure < 8; mesure++) {
    const degre = mesure % 5;
    const basse = gamme(degre) - 24;
    poserBasseAccord(carnet, {
      tick: t,
      basse,
      accord: [basse + 24, basse + 28],
      mesures: 1,
      surLeTemps: "accord",
    });
    carnet.poser(t, MESURE - 60, gamme(degre + 7), VEL_TENUE, "droite");
    t += MESURE;
  }

  t = poserCharniere(carnet, { tick: t, tonique });
  t = poserCharniere(carnet, { tick: t, tonique, duree: 2 * MESURE - 60 });
  return { notes: carnet.notes, duree: t + MESURE };
}

function sautsTresDifficile({ tonalite, gamme }) {
  const carnet = creerCarnet();
  const { tonique } = tonalite;
  let t = 0;

  // A — **trois octaves aux deux mains**, en sens opposé : la gauche part du
  // grave vers le médium-aigu, la droite de l'aigu vers le médium. Les deux
  // visent en même temps, et aucune ne peut se guider sur l'autre.
  //
  // La dernière croche de chaque mesure est tue : la main a un temps pour se
  // replacer avant la cible suivante, sans quoi le changement de mesure
  // deviendrait un saut plus large que l'exercice lui-même.
  for (let mesure = 0; mesure < 10; mesure++) {
    const degre = mesure % 4;
    const basse = gamme(degre) - 24;         // do2 et voisins
    const haut = basse + 36;                 // trois octaves plus haut
    const hautDroite = gamme(degre + 7) + 12; // et le trajet inverse à droite
    const basDroite = hautDroite - 36;
    for (let i = 0; i < 7; i++) {
      const quand = t + i * CROCHE;
      const surTemps = i % 2 === 0;
      const velocite = surTemps ? VEL_APPUI : VEL_COURANTE;
      carnet.poser(quand, CROCHE - 25, surTemps ? basse : haut, velocite, "gauche");
      carnet.poser(quand, CROCHE - 25, surTemps ? hautDroite : basDroite, velocite, "droite");
    }
    t += MESURE;
  }

  t = poserCharniere(carnet, { tick: t, tonique });

  // B — **croisement de mains** : la droite tient un accord au médium, la
  // gauche passe par-dessus pour jouer trois octaves au-dessus de sa basse —
  // donc au-dessus de la droite. Elle revient au grave un temps sur deux, ce
  // qui garde le croisement réel sans que la gauche cesse d'être la basse.
  for (let mesure = 0; mesure < 10; mesure++) {
    const degre = mesure % 4;
    const basse = gamme(degre) - 12;   // do3
    const parDessus = basse + 36;      // do6, bien au-dessus de la droite
    for (let i = 0; i < 3; i++) {
      const quand = t + i * CROCHE * 2;
      const surTemps = i % 2 === 0;
      carnet.poser(quand, CROCHE * 2 - 40, surTemps ? basse : parDessus,
        surTemps ? VEL_APPUI : VEL_COURANTE, "gauche");
    }
    for (const ecart of [0, 4, 7]) {
      carnet.poser(t, MESURE - 60, gamme(degre) + ecart, VEL_TENUE, "droite");
    }
    t += MESURE;
  }

  t = poserCharniere(carnet, { tick: t, tonique, duree: 2 * MESURE - 60 });
  return { notes: carnet.notes, duree: t + MESURE };
}

// ---- Le catalogue de production ----------------------------------------
//
//  Une entrée par famille et par niveau. `objectif` et `critere` alimentent la
//  fiche obligatoire du § 9 du plan ; ils sont écrits dans le fichier MIDI
//  comme texte de piste, pour qu'un fichier retrouvé seul reste identifiable.

const CATALOGUE = [
  {
    famille: "a1-deliage",
    fichier: "deliage",
    titre: "Déliage et indépendance",
    niveaux: {
      moyen: {
        tonalite: "do",
        composer: deliageMoyen,
        objectif:
          "Chaque doigt part et revient dans une position de cinq doigts qui ne bouge jamais, une note tenue par mesure.",
      },
      difficile: {
        tonalite: "re",
        composer: deliageDifficile,
        objectif:
          "Deux notes tenues et des motifs isolant 4-5, sur une position qui glisse d'un degré à chaque mesure.",
      },
      "tres-difficile": {
        tonalite: "si",
        composer: deliageTresDifficile,
        objectif:
          "Les seuls 3-4-5 sur touches noires, avec tenues, mouvement contraire et une section en trois contre deux.",
      },
    },
  },
  {
    famille: "b1-gammes",
    fichier: "gammes",
    titre: "Gammes et passage du pouce",
    niveaux: {
      moyen: {
        tonalite: "do",
        composer: gammesMoyen,
        objectif:
          "Entendre le trou du passage du pouce : la gamme lentement, le passage seul en boucle, puis la gamme deux fois plus vite.",
      },
      difficile: {
        tonalite: "la",
        composer: gammesDifficile,
        objectif:
          "Mineures harmonique et mélodique sur trois octaves, puis mouvement contraire où les deux pouces passent ensemble.",
      },
      "tres-difficile": {
        tonalite: "do",
        composer: gammesTresDifficile,
        objectif:
          "Chromatique en doubles sur quatre octaves, puis les deux mains à la tierce et à la sixte.",
      },
    },
  },
  {
    famille: "b2-arpeges",
    fichier: "arpeges",
    titre: "Arpèges et accords brisés",
    niveaux: {
      moyen: {
        tonalite: "do",
        composer: arpegesMoyen,
        objectif:
          "Ouvrir la main sur la forme de l'accord et la garder ouverte en se déplaçant : triade sur deux octaves, puis ses trois positions sur place.",
        // Un arpège de triade contient la quarte quinte→octave par
        // construction. C'est sa matière, pas un relâchement du niveau.
        tolerances: {
          sautMax: 5,
          pourquoi: "la quarte quinte-octave est intrinsèque à l'arpège de triade",
        },
      },
      difficile: {
        tonalite: "re",
        composer: arpegesDifficile,
        objectif:
          "Trois octaves, septième de dominante et mouvement contraire : la main s'ouvre en sens opposé de l'autre.",
      },
      "tres-difficile": {
        tonalite: "do",
        composer: arpegesTresDifficile,
        objectif:
          "Septième diminuée sur quatre octaves, puis des brisés qui dépassent l'octave — la main ne s'ouvre plus, le bras se lance.",
      },
    },
  },
  {
    famille: "b3-sauts",
    fichier: "sauts",
    titre: "Sauts et déplacements",
    niveaux: {
      // Les trois niveaux desserrent le même axe, et c'est assumé : le saut
      // n'est pas la difficulté annexe de cette famille, il en est l'objet.
      // Les valeurs viennent de la ligne B3 du § 5, pas du tableau du § 4.
      moyen: {
        tonalite: "do",
        composer: sautsMoyen,
        objectif:
          "Viser une octave plus bas sans regarder : basse-accord à la main gauche, d'abord sur une harmonie connue puis sur une cible qui bouge.",
        tolerances: {
          sautMax: 12,
          pourquoi: "le saut d'une octave est l'objet même de la famille (§ 5, B3)",
        },
      },
      difficile: {
        tonalite: "do",
        composer: sautsDifficile,
        objectif:
          "Deux octaves, et la basse à contretemps : le geste doit partir pendant que l'accord sonne encore.",
        tolerances: {
          sautMax: 28,
          pourquoi: "le saut de deux octaves est l'objet même de la famille (§ 5, B3)",
        },
      },
      "tres-difficile": {
        tonalite: "do",
        composer: sautsTresDifficile,
        objectif:
          "Trois octaves aux deux mains en sens opposé, puis croisement : la gauche passe au-dessus de la droite.",
        tolerances: {
          sautMax: 36,
          pourquoi: "les trois octaves et le croisement sont l'objet même de la famille (§ 5, B3)",
        },
      },
    },
  },
  {
    famille: "e4-pedale",
    fichier: "pedale",
    titre: "Pédale",
    niveaux: {
      moyen: {
        tonalite: "do",
        composer: pedaleMoyen,
        objectif:
          "Pédale directe, un changement par mesure : le pied descend avec l'accord. La seconde section joue les accords courts, pour que la pédale seule les lie.",
      },
      difficile: {
        tonalite: "do",
        composer: pedaleDifficile,
        objectif:
          "Pédale syncopée, un changement par temps : le pied se lève sur l'accord suivant et se réenfonce juste après.",
      },
      "tres-difficile": {
        tonalite: "do",
        composer: pedaleTresDifficile,
        objectif:
          "Harmonie chromatique, où deux accords voisins n'ont aucune note commune, et des tenues de deux mesures à nettoyer.",
      },
    },
  },
  {
    famille: "d1-rythme",
    fichier: "rythme",
    titre: "Indépendance rythmique",
    niveaux: {
      moyen: {
        tonalite: "do",
        composer: rythmeMoyen,
        objectif:
          "Deux notes contre une, puis la main gauche à contretemps : le pied continue de battre le temps.",
      },
      difficile: {
        tonalite: "do",
        composer: rythmeDifficile,
        objectif:
          "Trois contre deux, dans les deux sens puis en mouvement contraire — seule la première note du temps tombe ensemble.",
      },
      "tres-difficile": {
        tonalite: "do",
        composer: rythmeTresDifficile,
        objectif:
          "Quatre contre trois : à l'intérieur du temps, aucune note ne retombe avec l'autre main. C'est là que compter ne sert plus.",
      },
    },
  },
  {
    famille: "c2-octaves",
    fichier: "octaves",
    titre: "Octaves et accords plaqués",
    niveaux: {
      moyen: {
        tonalite: "do",
        composer: octavesMoyen,
        objectif:
          "Octaves détachées en croches, une main à la fois : le relâchement entre deux octaves est ce qui permet d'en jouer beaucoup.",
        // L'octave fait douze demi-tons par définition. C'est la matière de la
        // famille, pas un relâchement du niveau.
        tolerances: {
          ecartMax: 12,
          pourquoi: "l'octave est la matière même de la famille (§ 5, C2)",
        },
      },
      difficile: {
        tonalite: "do",
        composer: octavesDifficile,
        objectif:
          "Gamme d'octaves liée, puis octaves chromatiques aux deux mains — là où le 5-4 sur les touches noires devient obligatoire.",
      },
      "tres-difficile": {
        tonalite: "do",
        composer: octavesTresDifficile,
        objectif:
          "Trémolo d'octaves, accords de quatre sons répétés, puis trémolo aux deux mains en sens opposé.",
      },
    },
  },
  {
    famille: "c1-doubles",
    fichier: "doubles",
    titre: "Doubles notes",
    niveaux: {
      moyen: {
        tonalite: "do",
        composer: doublesMoyen,
        objectif:
          "Deux notes qui partent et s'arrêtent ensemble : sixtes conjointes en croches, une main à la fois, l'autre tenant une note.",
        // L'écart entre les deux voix est la matière de la famille : une sixte
        // fait huit ou neuf demi-tons, la quinte du § 4 l'interdirait.
        tolerances: {
          ecartMax: 9,
          pourquoi: "la sixte entre les deux voix est la matière même de la famille (§ 5, C1)",
        },
      },
      difficile: {
        tonalite: "do",
        composer: doublesDifficile,
        objectif:
          "La gamme en tierces legato, doigtés 1-3 puis 2-4, à chaque main, puis en doubles : le relâchement commun devient audible.",
      },
      "tres-difficile": {
        tonalite: "do",
        composer: doublesTresDifficile,
        objectif:
          "Tierces sur deux octaves, tierces chromatiques en doubles, puis les doubles notes aux deux mains ensemble.",
      },
    },
  },
];

// Critère de réussite : celui que le sous-mode Travail applique déjà, repris
// tel quel pour tous les exercices générés (plan § 2, règle 6).
const CRITERE_COMMUN =
  "Deux exécutions propres au tempo cible, sur deux jours distincts.";

// ============================================================================
//  Vérification des critères du § 4
//
//  Quatre des sept axes se mesurent dans le fichier produit ; les trois autres
//  (tonalité, rapport des mains, voix par main) sont des choix d'écriture,
//  décrits dans la fiche. On ne vérifie que ce qui se compte.
// ============================================================================

//  `tolerances` permet à une famille de dépasser **un** plafond nommé, quand
//  c'est sa matière même qui l'impose et non un relâchement : un arpège
//  contient une quarte par construction, que le niveau moyen plafonne à la
//  tierce. Chaque tolérance porte sa raison, s'affiche dans le rapport et est
//  recopiée dans la fiche du § 9 — elle n'est jamais silencieuse.
//  La pédale se vérifie séparément des quatre axes du § 4 : elle n'est pas une
//  difficulté qu'on plafonne, c'est une donnée qui doit être **cohérente**. Un
//  fichier pédalé dont les évènements ne s'alternent pas produit une pédale
//  restée baissée jusqu'à la fin du morceau — et le mode Morceau dessinerait un
//  seul intervalle long au lieu de la pédalisation écrite.
function verifierPedale(pedales, duree) {
  if (pedales.length === 0) return [];
  const problemes = [];
  const tries = pedales.slice().sort((a, b) => a.tick - b.tick);

  if (!tries[0].enfoncee) problemes.push("pédale : le premier évènement est un levé");
  if (tries[tries.length - 1].enfoncee) {
    problemes.push("pédale : le dernier évènement est un enfoncé — elle resterait baissée");
  }

  for (let i = 1; i < tries.length; i++) {
    if (tries[i].enfoncee === tries[i - 1].enfoncee) {
      const quoi = tries[i].enfoncee ? "enfoncés" : "levés";
      problemes.push(
        `pédale : deux ${quoi} de suite (mesure ${Math.floor(tries[i].tick / MESURE) + 1})`
      );
      break; // un suffit à dire que la suite est fausse
    }
  }

  const dernier = tries[tries.length - 1].tick;
  if (dernier > duree) {
    problemes.push(`pédale : un évènement après la fin (${dernier} > ${duree})`);
  }

  // Une pédale tenue plus de quatre mesures ne nettoie plus rien : ce n'est plus
  // une pédalisation, c'est un oubli. Le niveau très difficile demande des
  // « tenues longues à nettoyer » (§ 5, E4), pas des tenues infinies.
  for (let i = 0; i + 1 < tries.length; i += 2) {
    const tenue = tries[i + 1].tick - tries[i].tick;
    if (tenue > 4 * MESURE) {
      problemes.push(
        `pédale : tenue de ${(tenue / MESURE).toFixed(1)} mesures (mesure ${Math.floor(tries[i].tick / MESURE) + 1})`
      );
      break;
    }
  }

  return problemes;
}

function verifier(notes, duree, niveau, tolerances = null) {
  const hauteurs = notes.map((note) => note.hauteur);
  const ambitus = Math.max(...hauteurs) - Math.min(...hauteurs);

  const problemes = [];
  const mesures = {};
  const tolere = [];

  // Un plafond desserré par une tolérance déclarée, et le fait de l'avoir
  // desserré : les deux sont rendus à l'appelant.
  const plafond = (axe) => {
    const declaree = tolerances?.[axe];
    return declaree === undefined ? niveau[axe] : declaree;
  };
  const signaler = (axe, valeur, texte) => {
    const limite = plafond(axe);
    if (limite !== null && valeur > limite && tolerances?.[axe] !== undefined) {
      problemes.push(`${texte} — et même au-delà de la tolérance de ${limite}`);
      return;
    }
    if (limite === null || valeur <= limite) {
      if (tolerances?.[axe] !== undefined && valeur > niveau[axe]) {
        tolere.push(`${texte} — toléré jusqu'à ${limite} (${tolerances.pourquoi ?? "sans raison écrite"})`);
      }
      return;
    }
    problemes.push(texte);
  };

  // Débit : la main la plus chargée, sur la seconde la plus dense — une
  // moyenne sur tout l'exercice masquerait la section rapide. On compte les
  // **attaques**, pas les notes : un accord de trois sons est un seul geste,
  // il ne fait pas jouer la main trois fois plus vite.
  const secondesParTick = 60 / niveau.tempo / TPQ;
  let debitMax = 0;
  for (const main of ["droite", "gauche"]) {
    const ticks = [
      ...new Set(notes.filter((note) => note.main === main).map((note) => note.tick)),
    ].sort((a, b) => a - b);
    const fenetre = 1 / secondesParTick; // une seconde, en ticks
    for (let i = 0; i < ticks.length; i++) {
      let j = i;
      while (j < ticks.length && ticks[j] < ticks[i] + fenetre) j++;
      debitMax = Math.max(debitMax, j - i);
    }
  }
  mesures.debit = debitMax;
  signaler("debitMax", debitMax, `débit ${debitMax} notes/s > ${niveau.debitMax}`);

  // Ambitus mesuré **par main**, pas sur le clavier entier. Le § 4 dit
  // « ambitus total », mais deux mains parallèles à l'octave doublent
  // mécaniquement ce total sans rien ajouter à la difficulté : une gamme de
  // deux octaves aux deux mains couvre trois octaves de clavier, et serait
  // refusée au niveau moyen alors que c'est exactement ce que la ligne B1 y
  // demande. Ce que la main doit parcourir est la bonne mesure ; le total
  // reste affiché, et les bornes MIDI le surveillent.
  let ambitusMain = 0;
  for (const main of ["droite", "gauche"]) {
    const h = notes.filter((note) => note.main === main).map((note) => note.hauteur);
    if (h.length > 0) ambitusMain = Math.max(ambitusMain, Math.max(...h) - Math.min(...h));
  }
  mesures.ambitus = ambitusMain;
  mesures.ambitusTotal = ambitus;
  signaler(
    "ambitusMax",
    ambitusMain,
    `ambitus d'une main ${ambitusMain} demi-tons > ${niveau.ambitusMax}`
  );
  if (Math.min(...hauteurs) < MIDI_MIN || Math.max(...hauteurs) > MIDI_MAX) {
    problemes.push(
      `ambitus hors des bornes lisibles (${Math.min(...hauteurs)}–${Math.max(...hauteurs)}, attendu ${MIDI_MIN}–${MIDI_MAX})`
    );
  }

  // Où le dépassement se produit : sans la mesure fautive, un refus oblige à
  // relire tout le composeur. Les dix-huit familles à venir en auront besoin.
  const situer = (tick) => `mesure ${Math.floor(tick / MESURE) + 1}`;

  // Écart dans une main : la plus grande étendue de notes qui sonnent
  // ensemble. C'est ce que la main doit réellement couvrir.
  let ecartMax = 0;
  let ecartOu = 0;
  for (const main of ["droite", "gauche"]) {
    const propres = notes.filter((note) => note.main === main);
    for (const note of propres) {
      const simultanees = propres.filter(
        (autre) => autre.tick < note.tick + note.duree && note.tick < autre.tick + autre.duree
      );
      const h = simultanees.map((autre) => autre.hauteur);
      const ecart = Math.max(...h) - Math.min(...h);
      if (ecart > ecartMax) {
        ecartMax = ecart;
        ecartOu = note.tick;
      }
    }
  }
  mesures.ecart = ecartMax;
  signaler(
    "ecartMax",
    ecartMax,
    `écart dans une main ${ecartMax} demi-tons > ${niveau.ecartMax} (${situer(ecartOu)})`
  );

  // Saut mélodique : d'une attaque à la suivante dans la même main, en
  // ignorant les notes tenues (qui ne sont pas un déplacement).
  //
  // Deux attaques séparées d'au moins un temps ne comptent pas : la main a eu
  // le temps de se déplacer, ce n'est plus un saut mais un changement de
  // position — l'affaire de la famille B3, pas un axe de difficulté ici. Sans
  // cette règle, toute charnière entre deux sections serait refusée.
  //
  //  Un accord compte comme **une position**, pas comme sa note la plus
  //  haute : la main qui quitte un accord part de celle de ses notes qui est
  //  la plus proche de la cible. On mesure donc la distance minimale entre
  //  deux groupes d'attaques successifs — sans quoi une basse-accord serait
  //  créditée d'un saut bien plus large que le geste réel.
  let sautMax = 0;
  let sautOu = 0;
  for (const main of ["droite", "gauche"]) {
    const parInstant = new Map();
    for (const note of notes) {
      if (note.main !== main || note.duree >= MESURE / 2) continue;
      if (!parInstant.has(note.tick)) parInstant.set(note.tick, []);
      parInstant.get(note.tick).push(note.hauteur);
    }
    const instants = [...parInstant.keys()].sort((a, b) => a - b);
    for (let i = 1; i < instants.length; i++) {
      if (instants[i] - instants[i - 1] >= TEMPS) continue; // le temps de viser
      let saut = Infinity;
      for (const avant of parInstant.get(instants[i - 1])) {
        for (const apres of parInstant.get(instants[i])) {
          saut = Math.min(saut, Math.abs(apres - avant));
        }
      }
      if (saut > sautMax) {
        sautMax = saut;
        sautOu = instants[i];
      }
    }
  }
  mesures.saut = sautMax;
  signaler(
    "sautMax",
    sautMax,
    `saut mélodique ${sautMax} demi-tons > ${niveau.sautMax} (${situer(sautOu)})`
  );

  mesures.mesures = duree / MESURE;
  mesures.secondes = (duree / TPQ / niveau.tempo) * 60;
  // Court et bouclable : 45 s à 2 min (§ 2, règle 2).
  if (mesures.secondes < 45 || mesures.secondes > 120) {
    problemes.push(`durée ${mesures.secondes.toFixed(0)} s hors de 45–120 s`);
  }

  return { mesures, problemes, tolere };
}

// ============================================================================
//  Écriture du Standard MIDI File
// ============================================================================

function varint(valeur) {
  const octets = [valeur & 0x7f];
  let reste = valeur >>> 7;
  while (reste > 0) {
    octets.unshift((reste & 0x7f) | 0x80);
    reste >>>= 7;
  }
  return Buffer.from(octets);
}

function metaTexte(type, texte) {
  const contenu = Buffer.from(texte, "latin1");
  return Buffer.concat([Buffer.from([0xff, type]), varint(contenu.length), contenu]);
}

function piste(evenements) {
  // Tri stable par instant, note-off avant note-on au même tick.
  const tries = evenements.slice().sort((a, b) => a.tick - b.tick || a.ordre - b.ordre);
  const morceaux = [];
  let precedent = 0;
  for (const ev of tries) {
    morceaux.push(varint(ev.tick - precedent), Buffer.from(ev.octets));
    precedent = ev.tick;
  }
  morceaux.push(Buffer.from([0x00, 0xff, 0x2f, 0x00])); // fin de piste
  const corps = Buffer.concat(morceaux);
  const entete = Buffer.alloc(8);
  entete.write("MTrk", 0, "ascii");
  entete.writeUInt32BE(corps.length, 4);
  return Buffer.concat([entete, corps]);
}

function pisteReglages({ nom, objectif, tempo, alterations, mineur = false }) {
  const microsecondes = Math.round(60000000 / tempo);
  return piste([
    { tick: 0, ordre: 0, octets: metaTexte(0x03, nom) },
    { tick: 0, ordre: 1, octets: metaTexte(0x01, objectif) }, // texte libre
    { tick: 0, ordre: 2, octets: [0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08] }, // 4/4
    { tick: 0, ordre: 3, octets: [0xff, 0x59, 0x02, alterations & 0xff, mineur ? 1 : 0] },
    {
      tick: 0,
      ordre: 4,
      octets: [
        0xff, 0x51, 0x03,
        (microsecondes >> 16) & 0xff,
        (microsecondes >> 8) & 0xff,
        microsecondes & 0xff,
      ],
    },
  ]);
}

//  Les rangs d'ordonnancement, à un même tick. Le levé de pédale passe avant
//  l'enfoncé, et les deux entre les note-off et les note-on : c'est ce qui rend
//  la pédale **directe** correcte — le pied descend avec l'accord, pas après —
//  et la pédale **syncopée** lisible, le levé précédant d'un cheveu l'accord
//  suivant.
const ORDRE_NOM = 0;
const ORDRE_PROGRAMME = 1;
const ORDRE_NOTE_OFF = 2;
const ORDRE_PEDALE_LEVEE = 3;
const ORDRE_PEDALE_ENFONCEE = 4;
const ORDRE_NOTE_ON = 5;

// Valeurs de CC 64. Le seuil de `midi-input.js` est à mi-course : 0 et 127 sont
// les deux valeurs sans ambiguïté possible.
const CC_PEDALE = 64;
const CC_ENFONCEE = 127;
const CC_LEVEE = 0;

function pisteNotes(nom, canal, notes, pedales = []) {
  const evenements = [
    { tick: 0, ordre: ORDRE_NOM, octets: metaTexte(0x03, nom) },
    { tick: 0, ordre: ORDRE_PROGRAMME, octets: [0xc0 | canal, 0] }, // programme 0 : piano
  ];
  for (const note of notes) {
    evenements.push({
      tick: note.tick,
      ordre: ORDRE_NOTE_ON,
      octets: [0x90 | canal, note.hauteur, note.velocite],
    });
    evenements.push({
      tick: note.tick + note.duree,
      ordre: ORDRE_NOTE_OFF,
      octets: [0x80 | canal, note.hauteur, 0x40],
    });
  }
  for (const { tick, enfoncee } of pedales) {
    evenements.push({
      tick,
      ordre: enfoncee ? ORDRE_PEDALE_ENFONCEE : ORDRE_PEDALE_LEVEE,
      octets: [0xb0 | canal, CC_PEDALE, enfoncee ? CC_ENFONCEE : CC_LEVEE],
    });
  }
  return piste(evenements);
}

// ============================================================================
//  Production
// ============================================================================

const DOSSIER = path.join(__dirname, "..", "morceaux-exercice", "genere");

function produire(entree, niveauId, { dossier = DOSSIER } = {}) {
  const niveau = NIVEAUX[niveauId];
  const variante = entree.niveaux[niveauId];
  const tonalite = TONALITES[variante.tonalite];
  const gamme = creerGamme(tonalite.tonique);

  const { notes, duree, pedales = [] } = variante.composer({ gamme, niveau, tonalite });
  const { mesures, problemes, tolere } = verifier(notes, duree, niveau, variante.tolerances);
  problemes.push(...verifierPedale(pedales, duree));

  const nom = `${entree.titre} (${niveau.libelle})`;
  const chemin = path.join(dossier, `${entree.fichier}-${niveauId}-01.mid`);

  const entete = Buffer.alloc(14);
  entete.write("MThd", 0, "ascii");
  entete.writeUInt32BE(6, 4);
  entete.writeUInt16BE(1, 8);   // format 1
  entete.writeUInt16BE(3, 10);  // réglages + deux mains
  entete.writeUInt16BE(TPQ, 12);

  const fichier = Buffer.concat([
    entete,
    pisteReglages({
      // Les métadonnées MIDI se lisent en latin1 : pas d'accent, pas de tiret
      // cadratin, sous peine d'octets illisibles dans un autre logiciel.
      nom: sansAccent(nom),
      objectif: sansAccent(variante.objectif),
      tempo: niveau.tempo,
      alterations: tonalite.alterations,
      mineur: Boolean(tonalite.mineur),
    }),
    pisteNotes("Main droite", CANAL_DROITE, notes.filter((note) => note.main === "droite")),
    // La pédale va sur la piste de la main gauche : c'est elle qui porte
    // l'harmonie que le pied suit. `extractPedalIntervals()` du mode Morceau lit
    // le CC 64 de **n'importe quelle** piste, donc le choix n'a d'effet que sur
    // la lisibilité du fichier dans un autre logiciel.
    pisteNotes(
      "Main gauche",
      CANAL_GAUCHE,
      notes.filter((note) => note.main === "gauche"),
      pedales
    ),
  ]);

  const rapport = {
    id: `${entree.fichier}-${niveauId}-01`,
    chemin,
    titre: `Exercice — ${entree.titre} (${niveau.libelle})`,
    famille: entree.famille,
    niveau: niveauId,
    tonalite: tonalite.nom,
    tempo: niveau.tempo,
    objectif: variante.objectif,
    critere: CRITERE_COMMUN,
    notes: notes.length,
    pedales: pedales.length,
    ...mesures,
    problemes,
    tolere,
  };

  if (problemes.length > 0) return rapport; // rien n'est écrit : le niveau ment

  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(chemin, fichier);
  rapport.octets = fichier.length;
  return rapport;
}

// Les métadonnées d'un SMF n'ont pas d'encodage déclaré : on s'en tient à
// l'ASCII, le reste du dossier restant en français accentué.
function sansAccent(texte) {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[—–]/g, "-")
    .replace(/[«»]/g, '"');
}

function main() {
  const [familleVoulue, niveauVoulu] = process.argv.slice(2);

  const entrees = familleVoulue
    ? CATALOGUE.filter((entree) => entree.famille === familleVoulue)
    : CATALOGUE;
  if (entrees.length === 0) {
    console.error(`Famille inconnue : ${familleVoulue}`);
    console.error(`Familles disponibles : ${CATALOGUE.map((e) => e.famille).join(", ")}`);
    process.exit(1);
  }
  if (niveauVoulu && !NIVEAUX[niveauVoulu]) {
    console.error(`Niveau inconnu : ${niveauVoulu}`);
    console.error(`Niveaux : ${Object.keys(NIVEAUX).join(", ")}`);
    process.exit(1);
  }

  let echecs = 0;
  for (const entree of entrees) {
    for (const niveauId of Object.keys(entree.niveaux)) {
      if (niveauVoulu && niveauId !== niveauVoulu) continue;
      const rapport = produire(entree, niveauId);

      if (rapport.problemes.length > 0) {
        echecs++;
        console.error(`✗ ${rapport.id} — NON ÉCRIT`);
        for (const probleme of rapport.problemes) console.error(`    ${probleme}`);
        continue;
      }

      console.log(`✓ ${rapport.id} — ${rapport.octets} octets`);
      console.log(
        `    ${rapport.tonalite}, ${rapport.tempo} BPM, ${rapport.mesures} mesures, ` +
          `${rapport.secondes.toFixed(0)} s, ${rapport.notes} notes`
      );
      console.log(
        `    débit ${rapport.debit}/s · ambitus ${rapport.ambitus} · ` +
          `écart ${rapport.ecart} · saut ${rapport.saut}`
      );
      for (const mot of rapport.tolere) console.log(`    ⚠ ${mot}`);
    }
  }

  if (echecs > 0) {
    console.error(`\n${echecs} exercice(s) refusé(s) : ils ne tiennent pas leur niveau.`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { CATALOGUE, NIVEAUX, TONALITES, produire, verifier, creerGamme };
