// ============================================================================
//  Catalogue des exercices techniques — Feature 03
//
//  Les exercices sont **décrits**, pas stockés comme des fichiers MIDI presque
//  identiques (plan/03-technique-doigts.md § 11). Un exercice ne contient donc
//  aucune hauteur MIDI : seulement des degrés de la gamme, que
//  `generate-exercise.js` transforme en notes selon la main et la tonalité.
//
//  Aucun DOM, aucun Canvas : ce fichier est de la donnée.
// ============================================================================

// Demi-tons des sept degrés d'une gamme majeure. Un degré au-delà de 6 monte
// d'une octave : le degré 7 est l'octave de la tonique, le 9 sa tierce.
export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

// Tonalités déclarées. Do reste la tonalité de départ ; Sol et Fa majeur
// (plan/03 § 5, Intermédiaire) ne sont ouvertes que sur les exercices dont le
// doigté a été vérifié dans ces tons — c'est `supportedKeys` qui le dit, pas
// cette table. Une gamme ne se doigte pas pareil en Do et en Fa : voir
// `fingeringByKey`.
export const KEYS = {
  C: { id: "C", label: "Do majeur", tonicPitchClass: 0 },
  G: { id: "G", label: "Sol majeur", tonicPitchClass: 7 },
  F: { id: "F", label: "Fa majeur", tonicPitchClass: 5 },
};

// Octave de la tonique pour chaque main : Do4 à droite, Do3 à gauche — une
// octave d'écart, comme les groupes de la Lecture de notes (plan/02 § 4).
export const HAND_TONIC_OCTAVE = { right: 4, left: 3 };

// ----------------------------------------------------------------------------
//  Familles
//
//  Les trois familles du MVP et les trois qui attendent leur tour (plan/03 § 4).
//  Les secondes restent visibles et désactivées, comme les cartes « Bientôt » de
//  l'accueil : l'utilisateur voit où va la fonctionnalité sans pouvoir lancer un
//  exercice qui n'existe pas.
// ----------------------------------------------------------------------------
export const FAMILIES = [
  {
    id: "finger-independence",
    label: "Déliement",
    goal: "Indépendance et égalité des doigts",
    status: "available",
  },
  {
    id: "evenness",
    label: "Égalité",
    goal: "Jouer sans bosse ni trou",
    status: "available",
  },
  {
    id: "repeated-notes",
    label: "Notes répétées",
    goal: "Rejouer une note sans raidir le poignet",
    status: "available",
  },
  { id: "scales", label: "Gammes", goal: "Passage du pouce et régularité", status: "available" },
  {
    id: "arpeggios",
    label: "Arpèges",
    goal: "Enchaîner les notes d'un accord sans rupture",
    status: "available",
  },
  {
    id: "chords",
    label: "Accords",
    goal: "Placer plusieurs doigts ensemble avec précision",
    status: "available",
  },
  {
    id: "coordination",
    label: "Coordination",
    goal: "Rendre les mains indépendantes",
    status: "soon",
  },
  { id: "rhythm", label: "Rythme", goal: "Stabiliser la pulsation", status: "soon" },
];

// ----------------------------------------------------------------------------
//  Niveaux
//
//  Mêmes identifiants que la Lecture de notes et l'Entraînement de l'oreille :
//  on n'invente pas une troisième convention pour dire la même chose.
//
//  Attention, ce ne sont PAS les trois niveaux de `plan/exercices-generes.md`
//  § 4 (moyen / difficile / très difficile). Ceux-là plafonnent des axes
//  mesurables sur un fichier MIDI complet, joué dans le mode Morceau ; ceux-ci
//  graduent le **geste** à ambitus contenu, parce que le rouleau de ce mode
//  dessine son clavier sans défilement latéral. Le « très difficile » du § 4
//  n'a donc pas d'équivalent ici, par construction.
// ----------------------------------------------------------------------------
export const DIFFICULTIES = [
  { id: "beginner", label: "Débutant" },
  { id: "intermediate", label: "Intermédiaire" },
  { id: "advanced", label: "Difficile" },
];

// ----------------------------------------------------------------------------
//  Exercices
//
//  Un `pattern` est une suite de **pas**. Un pas est soit un degré (une note),
//  soit un tableau de degrés joués ensemble (un accord). `fingering` suit la
//  même forme, pas par pas et degré par degré, dans l'ordre ascendant : la main
//  droite numérote du pouce (1) vers l'auriculaire (5) en montant, la main
//  gauche l'inverse — son pouce est sur la note la plus haute.
//
//  `restBeats` est la respiration entre deux répétitions. Elle appartient à la
//  définition de l'exercice et ne varie jamais au hasard (plan/03 § 8).
// ----------------------------------------------------------------------------
export const EXERCISES = [
  // ==========================================================================
  //  A1 — Déliage et indépendance
  //
  //  Un doigt tient pendant que les autres jouent. C'est le vrai sujet du
  //  déliage, et c'est ce que le motif de cinq doigts en position fixe — qui
  //  occupait seul cette famille jusqu'au 29/07/2026 — ne travaillait pas :
  //  monter et descendre 1-2-3-4-5 n'oblige aucun doigt à rester indépendant
  //  d'un autre.
  // ==========================================================================
  {
    id: "hold-thumb-then-fifth",
    family: "finger-independence",
    title: "Un doigt tient, les autres jouent",
    goal: "Garder une touche enfoncée sans que les autres doigts se raidissent",
    instruction:
      "Le doigt qui tient reste posé, souple, sans pousser : c'est lui qu'on écoute, pas les autres.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel", // les deux mains jouent le même motif, à l'octave
    supportedKeys: ["C", "G", "F"], // position fixe : le doigté ne change pas avec le ton
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 4, // une mesure de respiration entre deux séries
    // Mesure 1 : le pouce tient la tonique quatre temps, 2-3-4-5 jouent
    // au-dessus. Mesure 2 : le 5 tient la quinte, 4-3-2-1 redescendent.
    // D'après Schmitt, « Exercices préparatoires » op. 16.
    pattern: [
      { degrees: [0, 1], holdBeats: [4, 1] },
      2,
      3,
      4,
      { degrees: [3, 4], holdBeats: [1, 4] },
      2,
      1,
      0,
    ],
    fingering: {
      right: [[1, 2], 3, 4, 5, [4, 5], 3, 2, 1],
      left: [[5, 4], 3, 2, 1, [2, 1], 3, 4, 5],
    },
  },
  {
    id: "hold-three-play-45",
    family: "finger-independence",
    title: "Trois doigts tiennent, 4 et 5 travaillent",
    goal: "Isoler le 4 et le 5 pendant que 1-2-3 restent enfoncés",
    instruction:
      "Trois touches restent au fond toute la mesure. Seuls le 4 et le 5 bougent — le poignet ne monte pas pour les aider.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    // Pas de Fa : la quatrième mesure y mettrait le pouce sur si♭.
    supportedKeys: ["C", "G"],
    defaultTempo: 63,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 4,
    // Quatre mesures de même geste, montées d'un degré à chaque fois : la
    // position glisse, le doigté ne change pas. D'après Dohnányi, « Essential
    // Finger Exercises » n° 1 ; la marche par degré est le procédé de séquence
    // de Czerny.
    pattern: [
      { degrees: [0, 1, 2, 3], holdBeats: [4, 4, 4, 1] },
      4,
      3,
      4,
      { degrees: [1, 2, 3, 4], holdBeats: [4, 4, 4, 1] },
      5,
      4,
      5,
      { degrees: [2, 3, 4, 5], holdBeats: [4, 4, 4, 1] },
      6,
      5,
      6,
      { degrees: [3, 4, 5, 6], holdBeats: [4, 4, 4, 1] },
      7,
      6,
      7,
    ],
    fingering: {
      right: [
        [1, 2, 3, 4], 5, 4, 5,
        [1, 2, 3, 4], 5, 4, 5,
        [1, 2, 3, 4], 5, 4, 5,
        [1, 2, 3, 4], 5, 4, 5,
      ],
      left: [
        [5, 4, 3, 2], 1, 2, 1,
        [5, 4, 3, 2], 1, 2, 1,
        [5, 4, 3, 2], 1, 2, 1,
        [5, 4, 3, 2], 1, 2, 1,
      ],
    },
  },
  {
    id: "hold-thumb-contrary",
    family: "finger-independence",
    title: "Tenues et mouvement contraire",
    goal: "Tenir 1 et 2 pendant que 3-4-5 jouent, les deux mains en sens opposé",
    instruction:
      "Les deux mains s'écartent puis se rapprochent. Le pouce et l'index restent au fond du début à la fin de la mesure.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    // La main gauche joue le degré opposé : elle descend quand la droite monte.
    bothMode: "contrary",
    supportedKeys: ["C", "G", "F"], // en Fa, si♭ tombe sous un doigt faible — c'est l'objet
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 4,
    // D'après Pischna, « 60 exercices progressifs » n° 1-6 (doigts tenus, doigts
    // faibles seuls actifs), transposé pour amener une touche noire sous un
    // doigt faible comme le demande Dohnányi. Le mouvement contraire symétrique
    // est ajouté ici et n'est emprunté à personne.
    pattern: [
      { degrees: [0, 1, 2], holdBeats: [4, 4, 1] },
      3,
      4,
      3,
      { degrees: [0, 1, 4], holdBeats: [4, 4, 1] },
      3,
      2,
      3,
    ],
    fingering: {
      // En mouvement contraire, les deux mains ont le même doigté : c'est le
      // seul cas où la symétrie du clavier joue pour l'élève. Le doigté reste
      // écrit dans l'ordre des degrés du motif, avant miroir.
      right: [[1, 2, 3], 4, 5, 4, [1, 2, 5], 4, 3, 4],
      left: [[1, 2, 3], 4, 5, 4, [1, 2, 5], 4, 3, 4],
    },
  },
  {
    id: "chords-i-iv-v-i-c-major",
    family: "chords",
    title: "Accords Do – Fa – Sol – Do",
    goal: "Poser trois doigts en même temps, sans décalage",
    instruction: "Les trois notes doivent sonner ensemble : pose la main avant de jouer.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C"],
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 2, // un accord tenu deux temps
    restBeats: 4,
    // Do (I), Fa (IV), Sol (V), Do (I), tous à l'état fondamental.
    pattern: [
      [0, 2, 4],
      [3, 5, 7],
      [4, 6, 8],
      [0, 2, 4],
    ],
    fingering: {
      right: [
        [1, 3, 5],
        [1, 3, 5],
        [1, 3, 5],
        [1, 3, 5],
      ],
      left: [
        [5, 3, 1],
        [5, 3, 1],
        [5, 3, 1],
        [5, 3, 1],
      ],
    },
  },
  // ==========================================================================
  //  B1 — Gammes et passage du pouce
  //
  //  La seule vraie difficulté d'une gamme est le passage du pouce : le trou
  //  sonore et l'accent involontaire qu'il laisse. C'est lui qu'on travaille,
  //  pas la vélocité.
  // ==========================================================================
  {
    id: "scale-one-octave",
    family: "scales",
    title: "Gamme sur une octave",
    goal: "Passer le pouce sans trou et sans accent",
    instruction:
      "Pendant que le 3 tient encore sa note, le pouce se place sous la main. Il ne doit pas sauter au dernier moment.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Montée, descente, et la tonique finale tenue une noire pour fermer la
    // mesure. D'après la préparation muette du pouce (tradition Chopin,
    // transmise par Mikuli puis Cortot) : le pouce est en place avant de jouer.
    pattern: [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, { degrees: 0, beats: 1 }],
    fingering: {
      right: [1, 2, 3, 1, 2, 3, 4, 5, 4, 3, 2, 1, 3, 2, 1],
      left: [5, 4, 3, 2, 1, 3, 2, 1, 2, 3, 1, 2, 3, 4, 5],
    },
    // En Fa, si♭ se prend avec le 4 : seule la main droite change. La main
    // gauche de Fa se doigte comme celle de Do, et Sol comme Do aux deux mains.
    fingeringByKey: {
      F: { right: [1, 2, 3, 4, 1, 2, 3, 4, 3, 2, 1, 4, 3, 2, 1] },
    },
  },
  {
    id: "scale-two-octaves",
    family: "scales",
    title: "Gamme sur deux octaves",
    goal: "Quatre passages de pouce par main et par direction, sans bosse",
    instruction:
      "Le pouce passe quatre fois en montant. Aucune de ces quatre notes ne doit s'entendre plus fort que ses voisines.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 66,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // D'après Czerny, « École de la vélocité » op. 299 : la gamme sur deux
    // octaves comme unité de travail, dans plusieurs tonalités.
    pattern: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
      13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
      { degrees: 0, beats: 2 },
    ],
    fingering: {
      right: [
        1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 5,
        4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2,
        1,
      ],
      left: [
        5, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2, 1,
        2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4,
        5,
      ],
    },
    fingeringByKey: {
      F: {
        right: [
          1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 4,
          3, 2, 1, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2,
          1,
        ],
      },
    },
  },
  {
    id: "scale-contrary-one-octave",
    family: "scales",
    title: "Gamme en mouvement contraire",
    goal: "Les deux pouces passent au même instant, en sens opposé",
    instruction:
      "Les mains s'écartent. Les deux pouces passent ensemble : si l'un est en retard, l'écart s'entend tout de suite.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    bothMode: "contrary",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 63,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // D'après Cortot, « Principes rationnels » : le passage du pouce travaillé
    // pour lui-même. Le mouvement contraire est la forme classique où les deux
    // pouces passent au même instant.
    pattern: [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, { degrees: 0, beats: 1 }],
    fingering: {
      // En Do et en Sol, les deux mains ont exactement le même doigté : la main
      // gauche qui descend depuis sa tonique emploie les mêmes doigts que la
      // droite qui monte. C'est ce qui rend le contraire facile à lire — et
      // c'est la béquille que la tonalité de Fa retire.
      right: [1, 2, 3, 1, 2, 3, 4, 5, 4, 3, 2, 1, 3, 2, 1],
      left: [1, 2, 3, 1, 2, 3, 4, 5, 4, 3, 2, 1, 3, 2, 1],
    },
    fingeringByKey: {
      // En Fa la symétrie tombe : la droite prend si♭ avec le 4, la gauche
      // garde le doigté de Do. Deux doigtés différents au même instant.
      F: { right: [1, 2, 3, 4, 1, 2, 3, 4, 3, 2, 1, 4, 3, 2, 1] },
    },
  },
  {
    id: "arpeggio-c-major-one-octave",
    family: "arpeggios",
    title: "Arpège de Do majeur",
    goal: "Enchaîner Do – Mi – Sol – Do sans rupture",
    instruction: "Sans trou entre les notes : le poignet suit la main, il ne saute pas.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C"],
    defaultTempo: 54, // plus lent : le passage du pouce demande du temps
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 1, // pas de respiration : on repart sur la mesure suivante
    // Do, Mi, Sol, Do (octave), puis retour. Sept pas + un temps de silence
    // font deux mesures pleines : chaque série repart sur un premier temps.
    pattern: [0, 2, 4, 7, 4, 2, 0],
    fingering: {
      right: [1, 2, 3, 5, 3, 2, 1],
      left: [5, 3, 2, 1, 2, 3, 5],
    },
  },
];

export function familyById(id) {
  return FAMILIES.find((family) => family.id === id) ?? null;
}

export function exerciseById(id) {
  return EXERCISES.find((exercise) => exercise.id === id) ?? null;
}

// Les exercices d'une famille, éventuellement restreints à un niveau. Le
// niveau est un filtre facultatif : sans lui, la famille entière est rendue.
export function exercisesOfFamily(familyId, difficulty = null) {
  return EXERCISES.filter(
    (exercise) =>
      exercise.family === familyId &&
      (difficulty === null || exercise.difficulty === difficulty)
  );
}

// Niveaux réellement peuplés dans une famille. Un niveau vide reste affiché,
// mais désactivé : l'utilisateur voit où va la famille sans tomber sur un
// cul-de-sac (même règle que les familles « Bientôt »).
export function difficultiesOfFamily(familyId) {
  return new Set(exercisesOfFamily(familyId).map((exercise) => exercise.difficulty));
}

// Une famille n'est proposée que si elle contient réellement un exercice : une
// famille « available » vide serait un cul-de-sac.
export function availableFamilies() {
  return FAMILIES.filter(
    (family) => family.status === "available" && exercisesOfFamily(family.id).length > 0
  );
}

// Un exercice ne propose une main que si son doigté est défini pour elle
// (plan/03 § 6 : « Le générateur ne doit pas proposer automatiquement Les deux
// si le doigté correspondant n'a pas été défini et vérifié »).
export function supportsHand(exercise, hand) {
  if (!exercise.supportedHands.includes(hand)) return false;
  if (hand === "both") {
    return (
      Boolean(exercise.bothMode) &&
      Array.isArray(exercise.fingering.right) &&
      Array.isArray(exercise.fingering.left)
    );
  }
  return Array.isArray(exercise.fingering[hand]);
}
