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

const TONALITES = {
  do: { nom: "do majeur", tonique: 60, alterations: 0 },
  re: { nom: "ré majeur", tonique: 62, alterations: 2 },
  si: { nom: "si majeur", tonique: 59, alterations: 5 },
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
  return {
    notes,
    poser(tick, duree, hauteur, velocite, main) {
      notes.push({ tick, duree, hauteur, velocite, main });
    },
  };
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

function verifier(notes, duree, niveau) {
  const hauteurs = notes.map((note) => note.hauteur);
  const ambitus = Math.max(...hauteurs) - Math.min(...hauteurs);

  const problemes = [];
  const mesures = {};

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
  if (debitMax > niveau.debitMax) {
    problemes.push(`débit ${debitMax} notes/s > ${niveau.debitMax}`);
  }

  mesures.ambitus = ambitus;
  if (niveau.ambitusMax !== null && ambitus > niveau.ambitusMax) {
    problemes.push(`ambitus ${ambitus} demi-tons > ${niveau.ambitusMax}`);
  }
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
  if (ecartMax > niveau.ecartMax) {
    problemes.push(
      `écart dans une main ${ecartMax} demi-tons > ${niveau.ecartMax} (${situer(ecartOu)})`
    );
  }

  // Saut mélodique : d'une attaque à la suivante dans la même main, en
  // ignorant les notes tenues (qui ne sont pas un déplacement).
  let sautMax = 0;
  let sautOu = 0;
  for (const main of ["droite", "gauche"]) {
    const propres = notes
      .filter((note) => note.main === main && note.duree < MESURE / 2)
      .sort((a, b) => a.tick - b.tick);
    for (let i = 1; i < propres.length; i++) {
      if (propres[i].tick === propres[i - 1].tick) continue; // accord, pas un saut
      const saut = Math.abs(propres[i].hauteur - propres[i - 1].hauteur);
      if (saut > sautMax) {
        sautMax = saut;
        sautOu = propres[i].tick;
      }
    }
  }
  mesures.saut = sautMax;
  if (sautMax > niveau.sautMax) {
    problemes.push(
      `saut mélodique ${sautMax} demi-tons > ${niveau.sautMax} (${situer(sautOu)})`
    );
  }

  mesures.mesures = duree / MESURE;
  mesures.secondes = (duree / TPQ / niveau.tempo) * 60;
  // Court et bouclable : 45 s à 2 min (§ 2, règle 2).
  if (mesures.secondes < 45 || mesures.secondes > 120) {
    problemes.push(`durée ${mesures.secondes.toFixed(0)} s hors de 45–120 s`);
  }

  return { mesures, problemes };
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

function pisteReglages({ nom, objectif, tempo, alterations }) {
  const microsecondes = Math.round(60000000 / tempo);
  return piste([
    { tick: 0, ordre: 0, octets: metaTexte(0x03, nom) },
    { tick: 0, ordre: 1, octets: metaTexte(0x01, objectif) }, // texte libre
    { tick: 0, ordre: 2, octets: [0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08] }, // 4/4
    { tick: 0, ordre: 3, octets: [0xff, 0x59, 0x02, alterations & 0xff, 0x00] },
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

function pisteNotes(nom, canal, notes) {
  const evenements = [
    { tick: 0, ordre: 0, octets: metaTexte(0x03, nom) },
    { tick: 0, ordre: 1, octets: [0xc0 | canal, 0] }, // programme 0 : piano
  ];
  for (const note of notes) {
    evenements.push({ tick: note.tick, ordre: 3, octets: [0x90 | canal, note.hauteur, note.velocite] });
    evenements.push({ tick: note.tick + note.duree, ordre: 2, octets: [0x80 | canal, note.hauteur, 0x40] });
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

  const { notes, duree } = variante.composer({ gamme, niveau, tonalite });
  const { mesures, problemes } = verifier(notes, duree, niveau);

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
    }),
    pisteNotes("Main droite", CANAL_DROITE, notes.filter((note) => note.main === "droite")),
    pisteNotes("Main gauche", CANAL_GAUCHE, notes.filter((note) => note.main === "gauche")),
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
    ...mesures,
    problemes,
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
    }
  }

  if (echecs > 0) {
    console.error(`\n${echecs} exercice(s) refusé(s) : ils ne tiennent pas leur niveau.`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { CATALOGUE, NIVEAUX, TONALITES, produire, verifier, creerGamme };
