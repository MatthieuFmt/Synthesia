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
//  Onze familles, dans l'ordre où un professeur les aborde : les doigts d'abord,
//  puis les figures (gammes, arpèges, accords), puis ce qui demande déjà une
//  main formée (doubles notes, octaves, trilles, extensions), et la coordination
//  des deux mains en dernier. Le raisonnement complet est dans
//  [plan/exercices-catalogue.md § 4](../../plan/exercices-catalogue.md).
//
//  `status: "available"` dit qu'une famille est prévue, pas qu'elle est prête :
//  `availableFamilies()` écarte celles qui ne contiennent encore aucun exercice,
//  et l'écran de réglages les affiche « Bientôt ». Une famille vide n'est donc
//  jamais un cul-de-sac.
//
//  Quatre sujets sont volontairement **absents**, chacun traité ailleurs :
//  le rythme (plan/05, qui le juge au lieu de seulement le montrer), les sauts
//  larges (exercices générés B3 — le rouleau de ce mode ne défile pas
//  latéralement), l'articulation (rien ici ne distingue un staccato réussi d'une
//  note écourtée : elle vit dans Accords, Octaves et Coordination) et la pédale
//  (plan/09).
// ----------------------------------------------------------------------------
export const FAMILIES = [
  {
    id: "finger-independence",
    label: "Déliement",
    goal: "Un doigt tient pendant que les autres jouent",
    status: "available",
  },
  {
    id: "evenness",
    label: "Égalité",
    goal: "Même son, même durée : jouer sans bosse ni trou",
    status: "available",
  },
  {
    id: "repeated-notes",
    label: "Notes répétées",
    goal: "Rejouer une note en changeant de doigt, sans raidir le poignet",
    status: "available",
  },
  { id: "scales", label: "Gammes", goal: "Passage du pouce et régularité", status: "available" },
  {
    id: "arpeggios",
    label: "Arpèges",
    goal: "Ouvrir la main sur l'accord et la garder ouverte",
    status: "available",
  },
  {
    id: "chords",
    label: "Accords",
    goal: "Placer plusieurs doigts au même instant, et les renversements",
    status: "available",
  },
  {
    id: "double-notes",
    label: "Doubles notes",
    goal: "Tierces et sixtes : deux voix qui partent et s'arrêtent ensemble",
    status: "available",
  },
  {
    id: "octaves",
    label: "Octaves",
    goal: "Le poignet, pas le bras — préparé par la sixte et la septième",
    status: "available",
  },
  {
    id: "trills",
    label: "Trilles",
    goal: "Battements rapides entre deux doigts voisins",
    status: "available",
  },
  {
    id: "extension",
    label: "Extension",
    // La substitution — changer de doigt sur une touche enfoncée — était prévue
    // ici et n'y est pas : le format ne sait pas l'écrire (une note porte un
    // doigt, pas deux). Le but ne la promet donc plus.
    goal: "Écarter la main, et passer un doigt par-dessus le pouce",
    status: "available",
  },
  {
    id: "coordination",
    label: "Coordination",
    goal: "Deux rythmes, deux articulations, deux accentuations à la fois",
    status: "available",
  },
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
    id: "hold-two-play-three",
    family: "finger-independence",
    title: "Deux doigts tiennent, trois jouent",
    goal: "Garder deux touches au fond pendant que les trois autres bougent",
    instruction:
      "Deux touches restent enfoncées toute la mesure. Les trois doigts libres jouent par-dessus, sans que la main se soulève pour les aider.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"], // position fixe : le doigté ne change pas avec le ton
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 4,
    // D'après Schmitt, « Exercices préparatoires » op. 16, cahier I : deux notes
    // tenues, les autres actives. La deuxième mesure déplace la seconde tenue
    // au quatrième doigt (droite), le plus difficile à immobiliser.
    pattern: [
      { degrees: [0, 1, 2], holdBeats: [4, 4, 1] },
      3,
      4,
      3,
      { degrees: [0, 1, 3], holdBeats: [4, 4, 1] },
      2,
      4,
      2,
    ],
    fingering: {
      right: [[1, 2, 3], 4, 5, 4, [1, 2, 4], 3, 5, 3],
      left: [[5, 4, 3], 2, 1, 2, [5, 4, 2], 3, 1, 3],
    },
  },
  {
    id: "hold-fifth-descend",
    family: "finger-independence",
    title: "Le petit doigt tient, la main redescend",
    goal: "Tenir la note du bout de la main pendant que les autres doigts rentrent",
    instruction:
      "Le doigt du haut ne quitte pas sa touche. C'est la note qu'on doit continuer d'entendre quand les autres descendent.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 4,
    // Le pendant du premier exercice de la famille, à l'autre bout de la main :
    // là le pouce tenait et les doigts montaient, ici c'est l'auriculaire qui
    // tient — et il tient beaucoup moins bien. Schmitt op. 16 fait les deux.
    pattern: [
      { degrees: [3, 4], holdBeats: [1, 4] },
      2,
      1,
      0,
      { degrees: [0, 4], holdBeats: [1, 4] },
      1,
      2,
      3,
    ],
    fingering: {
      right: [[4, 5], 3, 2, 1, [1, 5], 2, 3, 4],
      left: [[2, 1], 3, 4, 5, [5, 1], 4, 3, 2],
    },
  },
  {
    id: "hold-walking-sequence",
    family: "finger-independence",
    title: "Marche de tenues",
    goal: "Le même geste de tenue, une note plus haut à chaque mesure",
    instruction:
      "Le doigté ne change jamais, la position glisse d'un degré par mesure. C'est la main entière qui se déplace, pas les doigts qui s'étirent.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    // Pas de Fa : la quatrième mesure y mettrait le pouce sur si♭.
    supportedKeys: ["C", "G"],
    defaultTempo: 63,
    defaultRepetitions: 3,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 4,
    // Le procédé de séquence de Czerny appliqué à la tenue : quatre fois le même
    // geste, chaque fois un degré plus haut. Ce que ça travaille n'est pas la
    // tenue elle-même — l'exercice Débutant le fait déjà — mais le fait de la
    // reprendre sur une position neuve sans perdre l'appui.
    pattern: [
      { degrees: [0, 1], holdBeats: [4, 1] },
      2,
      3,
      2,
      { degrees: [1, 2], holdBeats: [4, 1] },
      3,
      4,
      3,
      { degrees: [2, 3], holdBeats: [4, 1] },
      4,
      5,
      4,
      { degrees: [3, 4], holdBeats: [4, 1] },
      5,
      6,
      5,
    ],
    fingering: {
      right: [
        [1, 2], 3, 4, 3,
        [1, 2], 3, 4, 3,
        [1, 2], 3, 4, 3,
        [1, 2], 3, 4, 3,
      ],
      left: [
        [5, 4], 3, 2, 3,
        [5, 4], 3, 2, 3,
        [5, 4], 3, 2, 3,
        [5, 4], 3, 2, 3,
      ],
    },
  },
  {
    id: "hold-middle-play-around",
    family: "finger-independence",
    title: "Le majeur tient, les autres l'encadrent",
    goal: "Tenir au milieu de la main pendant que les doigts jouent de part et d'autre",
    instruction:
      "Le doigt du milieu reste au fond. Les deux doigts en dessous et les deux au-dessus jouent autour de lui, sans le faire remonter.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 63,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 4,
    // D'après Pischna, « 60 exercices progressifs » : la tenue au milieu de la
    // main est la plus instable, parce que le doigt tenu n'a pas le bord de la
    // main pour l'appuyer. Les deux mesures inversent le sens du parcours.
    pattern: [
      { degrees: [0, 2], holdBeats: [1, 4] },
      1,
      3,
      4,
      { degrees: [2, 4], holdBeats: [4, 1] },
      3,
      1,
      0,
    ],
    fingering: {
      right: [[1, 3], 2, 4, 5, [3, 5], 4, 2, 1],
      left: [[5, 3], 4, 2, 1, [3, 1], 2, 4, 5],
    },
  },
  {
    id: "hold-two-trill-45",
    family: "finger-independence",
    title: "Deux tenues et battement du 4-5",
    goal: "Faire battre les deux doigts les plus faibles sans lâcher les tenues",
    instruction:
      "Les deux tenues ne bougent pas d'un millimètre pendant que les deux derniers doigts battent en croches. Si une tenue se relève, ralentis.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 58, // le battement doit rester égal, pas rapide
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // D'après Dohnányi, « Essential Finger Exercises » : les tenues plus le
    // battement des doigts faibles, dans le même geste. C'est le seul exercice
    // de la famille où les doigts tenus doivent résister à un mouvement
    // *rapide* — c'est ce qui le sépare des deux autres niveaux.
    pattern: [
      { degrees: [0, 1, 3], holdBeats: [4, 4, 0.5] },
      4,
      3,
      4,
      3,
      4,
      3,
      4,
      { degrees: [0, 1, 4], holdBeats: [4, 4, 0.5] },
      3,
      4,
      3,
      4,
      3,
      4,
      3,
    ],
    fingering: {
      right: [
        [1, 2, 4], 5, 4, 5, 4, 5, 4, 5,
        [1, 2, 5], 4, 5, 4, 5, 4, 5, 4,
      ],
      left: [
        [5, 4, 2], 1, 2, 1, 2, 1, 2, 1,
        [5, 4, 1], 2, 1, 2, 1, 2, 1, 2,
      ],
    },
  },
  {
    id: "hold-black-key-under-four",
    family: "finger-independence",
    title: "Une touche noire sous le 4",
    goal: "Jouer une touche noire avec le doigt qui la trouve le plus mal",
    instruction:
      "La touche noire est là exprès : c'est celle que le quatrième doigt rate. Le doigt descend droit dessus, la main ne se tourne pas.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    // En Fa, le degré 3 est si♭ : le hausser donne un si naturel, une blanche —
    // l'exercice n'aurait plus d'objet. En Do et en Sol c'est bien une noire.
    supportedKeys: ["C", "G"],
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 4,
    // La recommandation de Dohnányi, prise au mot : amener une touche noire sous
    // un doigt faible plutôt que de rester sur les blanches, où le 4 s'en sort
    // par la position. Le degré 4 est haussé — fa♯ en Do, do♯ en Sol.
    pattern: [
      { degrees: [0, 1, 2], holdBeats: [4, 4, 1] },
      "3#",
      4,
      "3#",
      { degrees: [0, 1, 4], holdBeats: [4, 4, 1] },
      "3#",
      2,
      "3#",
    ],
    fingering: {
      right: [[1, 2, 3], 4, 5, 4, [1, 2, 5], 4, 3, 4],
      left: [[5, 4, 3], 2, 1, 2, [5, 4, 1], 2, 3, 2],
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
  {
    id: "chord-repeated-clean-attack",
    family: "chords",
    title: "Accord répété, attaque nette",
    goal: "Les trois notes exactement ensemble, à chaque fois",
    instruction:
      "Pose les trois doigts sur les touches avant de jouer, puis descends d'un seul geste. Entre deux accords, la main quitte le clavier et se replace.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 54, // lent : c'est la simultanéité qu'on écoute, pas le débit
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 4,
    // Le silence entre deux accords fait partie de l'exercice : c'est pendant lui
    // que la main se replace. Sans lui, on n'entend pas si les trois notes sont
    // simultanées — la résonance de la précédente masque le décalage.
    pattern: [
      [0, 2, 4],
      { degrees: [], beats: 1 },
      [0, 2, 4],
      { degrees: [], beats: 1 },
      [0, 2, 4],
      { degrees: [], beats: 1 },
      [0, 2, 4],
      { degrees: [], beats: 1 },
    ],
    fingering: {
      right: [[1, 3, 5], null, [1, 3, 5], null, [1, 3, 5], null, [1, 3, 5], null],
      left: [[5, 3, 1], null, [5, 3, 1], null, [5, 3, 1], null, [5, 3, 1], null],
    },
  },
  {
    id: "chord-major-minor",
    family: "chords",
    title: "Majeur et mineur",
    goal: "Entendre et sentir le doigt du milieu descendre d'un demi-ton",
    instruction:
      "Seul le doigt du milieu bouge, d'un demi-ton. Les deux autres ne changent pas de touche : c'est ce qui rend la différence si nette.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 54,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 2,
    restBeats: 4,
    // Le premier exercice où l'altération sert de matière et non d'ornement : la
    // tierce baissée fait le mineur. En Do le doigt du milieu passe de mi à
    // mi♭ — une blanche vers une noire, ce qui se sent autant que ça s'entend.
    pattern: [
      [0, 2, 4],
      [0, "2b", 4],
      [0, 2, 4],
      [0, "2b", 4],
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
  {
    id: "chord-inversions-c-major",
    family: "chords",
    title: "Renversements de Do majeur",
    goal: "Trois formes de main pour un seul accord",
    instruction:
      "Le même accord, trois positions. À chaque changement, l'écart entre les doigts n'est plus le même — regarde la main, pas les notes.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C"],
    defaultTempo: 58,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 2,
    restBeats: 4,
    // Fondamental, premier renversement, deuxième renversement, fondamental à
    // l'octave. Le doigté change au premier renversement (1-2-5 à droite) et au
    // deuxième à gauche (5-2-1) : c'est le doigté usuel, celui qui garde la main
    // détendue plutôt que celui qui garde les mêmes doigts.
    pattern: [
      [0, 2, 4],
      [2, 4, 7],
      [4, 7, 9],
      [7, 9, 11],
    ],
    fingering: {
      right: [
        [1, 3, 5],
        [1, 2, 5],
        [1, 3, 5],
        [1, 3, 5],
      ],
      left: [
        [5, 3, 1],
        [5, 3, 1],
        [5, 2, 1],
        [5, 3, 1],
      ],
    },
  },
  {
    id: "chord-cadence-with-inversions",
    family: "chords",
    title: "Cadence I – IV – V – I avec renversements",
    goal: "Enchaîner quatre accords sans que la main se déplace",
    instruction:
      "Quatre accords, et la main reste au même endroit du clavier. Ce sont les renversements qui font le travail : cherche la note commune d'un accord au suivant.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C"],
    defaultTempo: 54,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 2,
    restBeats: 4,
    // La cadence pianistique, celle qu'on apprend avant les autres : do-mi-sol,
    // do-fa-la, si-ré-sol, do-mi-sol. Le do reste sous le pouce trois accords sur
    // quatre, et le si de la dominante est *en dessous* de la tonique — c'est
    // pour cela que la main ne bouge pas, et c'est ce qui la distingue de la
    // version à l'état fondamental du niveau Débutant.
    pattern: [
      [0, 2, 4],
      [0, 3, 5],
      [-1, 1, 4],
      [0, 2, 4],
    ],
    fingering: {
      right: [
        [1, 3, 5],
        [1, 3, 5],
        [1, 2, 5],
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
  {
    id: "chord-sevenths",
    family: "chords",
    title: "Accords de septième",
    goal: "Quatre doigts à la fois, sur un écart plus grand",
    instruction:
      "Quatre notes ensemble. Les quatre doigts se posent d'abord sur les touches, puis descendent — sinon l'un des quatre arrivera après les autres.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C"],
    defaultTempo: 52,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 2,
    restBeats: 4,
    // Do septième majeure, sol septième de dominante, puis la résolution sur
    // l'accord de trois sons : le quatrième doigt entre dans l'accord, et l'écart
    // passe de la quinte à la septième. C'est le premier accord du catalogue que
    // la main ne couvre pas au repos.
    pattern: [
      [0, 2, 4, 6],
      [4, 6, 8, 10],
      [0, 2, 4, 6],
      [0, 2, 4],
    ],
    fingering: {
      right: [
        [1, 2, 3, 5],
        [1, 2, 3, 5],
        [1, 2, 3, 5],
        [1, 3, 5],
      ],
      left: [
        [5, 4, 2, 1],
        [5, 4, 2, 1],
        [5, 4, 2, 1],
        [5, 3, 1],
      ],
    },
  },
  {
    id: "chord-staccato-wrist",
    family: "chords",
    title: "Accords piqués",
    goal: "Lâcher l'accord aussitôt joué, par le poignet",
    instruction:
      "L'accord ne dure qu'un quart de temps : c'est le poignet qui rebondit, pas le bras qui appuie. Entre deux accords la main flotte au-dessus des touches.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C"],
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 4,
    // C'est ici que l'articulation vit — elle n'est pas une famille à part, parce
    // que rien dans l'application ne distingue un piqué réussi d'une note
    // écourtée (cf. plan/exercices-catalogue.md § 4). L'écriture, elle, est
    // exacte : la note sonne un quart du temps qu'elle occupe.
    pattern: [
      { degrees: [0, 2, 4], holdBeats: 0.25 },
      { degrees: [0, 3, 5], holdBeats: 0.25 },
      { degrees: [-1, 1, 4], holdBeats: 0.25 },
      { degrees: [0, 2, 4], holdBeats: 0.25 },
      { degrees: [0, 2, 4], holdBeats: 0.25 },
      { degrees: [0, 3, 5], holdBeats: 0.25 },
      { degrees: [-1, 1, 4], holdBeats: 0.25 },
      { degrees: [0, 2, 4], holdBeats: 0.25 },
    ],
    fingering: {
      right: [
        [1, 3, 5], [1, 3, 5], [1, 2, 5], [1, 3, 5],
        [1, 3, 5], [1, 3, 5], [1, 2, 5], [1, 3, 5],
      ],
      left: [
        [5, 3, 1], [5, 3, 1], [5, 3, 1], [5, 3, 1],
        [5, 3, 1], [5, 3, 1], [5, 3, 1], [5, 3, 1],
      ],
    },
  },
  {
    id: "chord-inversions-climbing",
    family: "chords",
    title: "Renversements en montant et en descendant",
    goal: "Changer de position sept fois de suite sans regarder ses mains",
    instruction:
      "Chaque accord est le même que le précédent, déplacé d'un cran. La main prend sa forme avant d'arriver : elle ne cherche pas les touches sur place.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C"],
    defaultTempo: 58,
    defaultRepetitions: 3,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 4,
    // L'accord du sommet est joué deux fois — une fois en arrivant, une fois en
    // repartant. C'est ainsi que la main fait demi-tour sans temps mort, et c'est
    // écrit exprès plutôt que d'inventer un huitième accord dont on n'a pas
    // besoin.
    pattern: [
      [0, 2, 4],
      [2, 4, 7],
      [4, 7, 9],
      [7, 9, 11],
      [7, 9, 11],
      [4, 7, 9],
      [2, 4, 7],
      [0, 2, 4],
    ],
    fingering: {
      right: [
        [1, 3, 5], [1, 2, 5], [1, 3, 5], [1, 3, 5],
        [1, 3, 5], [1, 3, 5], [1, 2, 5], [1, 3, 5],
      ],
      left: [
        [5, 3, 1], [5, 3, 1], [5, 2, 1], [5, 3, 1],
        [5, 3, 1], [5, 2, 1], [5, 3, 1], [5, 3, 1],
      ],
    },
  },
  {
    id: "chord-cadence-four-voices",
    family: "chords",
    title: "Cadence à quatre voix",
    goal: "La basse et l'accord, chacun dans sa main, au même instant",
    instruction:
      "La main gauche joue la basse et sa quinte, la droite l'accord. Les deux doivent tomber ensemble : écoute la basse, c'est elle qui donne le repère.",
    difficulty: "advanced",
    // La main gauche ne joue pas l'accord de la droite : elle joue la basse et sa
    // quinte, et se déplace là où la droite reste sur place. Deux motifs
    // différents, donc `patternByHand`.
    supportedHands: ["right", "left", "both"],
    supportedKeys: ["C"],
    defaultTempo: 52,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 2,
    restBeats: 4,
    // La cadence telle qu'on l'écrit vraiment : quatre voix, la fondamentale à
    // la basse. C'est le seul exercice de la famille où les deux mains n'ont pas
    // le même contenu, et c'est ce qui en fait le niveau le plus difficile — pas
    // le nombre de notes.
    patternByHand: {
      right: [
        [0, 2, 4], // do mi sol
        [0, 3, 5], // do fa la
        [-1, 1, 4], // si ré sol
        [0, 2, 4], // do mi sol
      ],
      left: [
        [0, 4], // do3 sol3
        [-4, 0], // fa2 do3
        [-3, 1], // sol2 ré3
        [0, 4], // do3 sol3
      ],
    },
    fingering: {
      right: [
        [1, 3, 5],
        [1, 3, 5],
        [1, 2, 5],
        [1, 3, 5],
      ],
      left: [
        [5, 1],
        [5, 1],
        [5, 1],
        [5, 1],
      ],
    },
  },
  // ==========================================================================
  //  Notes répétées — rejouer une note sans raidir le poignet
  //
  //  Une même touche, plusieurs doigts : c'est le seul moyen de répéter vite
  //  sans que l'avant-bras se crispe. Les doigts marchent vers le pouce — 3-2-1
  //  puis 4-3-2-1 — parce que le pouce est le plus sûr et qu'on le garde pour la
  //  dernière note du groupe.
  //
  //  Les silences font partie du travail : c'est pendant eux que la main se
  //  détend. Un exercice de notes répétées sans respiration apprend à se
  //  crisper.
  // ==========================================================================
  {
    id: "repeat-three-two-one",
    family: "repeated-notes",
    title: "3-2-1 sur la même note",
    goal: "Trois doigts sur une seule touche, sans que le poignet monte",
    instruction:
      "Trois doigts, une touche. Le poignet reste bas et souple — c'est le doigt qui remonte, pas la main.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Le groupe de trois avec une croche de silence : la main se détend pendant
    // le silence. C'est le doigté standard des notes répétées, dans les deux
    // mains — les doigts marchent vers le pouce, qui prend la dernière.
    pattern: [
      0, 0, 0, { degrees: [], beats: 0.5 },
      0, 0, 0, { degrees: [], beats: 0.5 },
      0, 0, 0, { degrees: [], beats: 0.5 },
      0, 0, 0, { degrees: [], beats: 0.5 },
    ],
    fingering: {
      right: [3, 2, 1, null, 3, 2, 1, null, 3, 2, 1, null, 3, 2, 1, null],
      left: [3, 2, 1, null, 3, 2, 1, null, 3, 2, 1, null, 3, 2, 1, null],
    },
  },
  {
    id: "repeat-four-three-two-one",
    family: "repeated-notes",
    title: "4-3-2-1 sur la même note",
    goal: "Quatre doigts sur une touche, en doubles-croches",
    instruction:
      "Quatre doigts d'affilée, puis un temps entier de repos. Le repos n'est pas une pause : c'est là que la main lâche tout.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 58,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.25,
    restBeats: 4,
    // Quatre doigts au lieu de trois, et un temps plein de silence : le rapport
    // entre le travail et le repos est ce qui fait qu'un exercice de répétition
    // délie au lieu de raidir.
    pattern: [
      0, 0, 0, 0, { degrees: [], beats: 1 },
      0, 0, 0, 0, { degrees: [], beats: 1 },
      0, 0, 0, 0, { degrees: [], beats: 1 },
      0, 0, 0, 0, { degrees: [], beats: 1 },
    ],
    fingering: {
      right: [4, 3, 2, 1, null, 4, 3, 2, 1, null, 4, 3, 2, 1, null, 4, 3, 2, 1, null],
      left: [4, 3, 2, 1, null, 4, 3, 2, 1, null, 4, 3, 2, 1, null, 4, 3, 2, 1, null],
    },
  },
  {
    id: "repeat-changing-note",
    family: "repeated-notes",
    title: "Répéter, puis changer de note",
    goal: "Reprendre le groupe de trois sur une touche voisine",
    instruction:
      "Trois fois la même note, puis la suivante. Les trois doigts repartent du même geste — c'est la main qui se déplace d'une touche, pas le doigté qui change.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 58,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    pattern: [
      0, 0, 0, { degrees: [], beats: 0.5 },
      1, 1, 1, { degrees: [], beats: 0.5 },
      2, 2, 2, { degrees: [], beats: 0.5 },
      1, 1, 1, { degrees: [], beats: 0.5 },
    ],
    fingering: {
      right: [3, 2, 1, null, 3, 2, 1, null, 3, 2, 1, null, 3, 2, 1, null],
      left: [3, 2, 1, null, 3, 2, 1, null, 3, 2, 1, null, 3, 2, 1, null],
    },
  },
  {
    id: "repeat-up-the-scale",
    family: "repeated-notes",
    title: "3-2-1 en montant la gamme",
    goal: "Le groupe de trois sur cinq notes de suite, sans silence entre eux",
    instruction:
      "Plus de respiration entre les groupes : le troisième doigt de la note suivante part aussitôt après le pouce de la précédente. C'est ce relais qu'on travaille.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Cinq groupes de trois croches font quinze croches : la seule croche de
    // silence est la seizième, à la fin. Les groupes de trois ne tombent donc
    // jamais deux fois au même endroit du temps — c'est ce qui rend l'enchaînement
    // difficile, pas la vitesse.
    pattern: [
      0, 0, 0,
      1, 1, 1,
      2, 2, 2,
      3, 3, 3,
      4, 4, 4,
      { degrees: [], beats: 0.5 },
    ],
    fingering: {
      right: [3, 2, 1, 3, 2, 1, 3, 2, 1, 3, 2, 1, 3, 2, 1, null],
      left: [3, 2, 1, 3, 2, 1, 3, 2, 1, 3, 2, 1, 3, 2, 1, null],
    },
  },
  {
    id: "repeat-with-position-jump",
    family: "repeated-notes",
    title: "Répétées et changement de position",
    goal: "Retrouver la touche à la quinte, doigts déjà prêts",
    instruction:
      "Trois notes en bas, trois notes une quinte plus haut. Pendant la croche de silence, la main est déjà partie et le troisième doigt visé.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 58,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    pattern: [
      0, 0, 0, { degrees: [], beats: 0.5 },
      4, 4, 4, { degrees: [], beats: 0.5 },
      0, 0, 0, { degrees: [], beats: 0.5 },
      4, 4, 4, { degrees: [], beats: 0.5 },
    ],
    fingering: {
      right: [3, 2, 1, null, 3, 2, 1, null, 3, 2, 1, null, 3, 2, 1, null],
      left: [3, 2, 1, null, 3, 2, 1, null, 3, 2, 1, null, 3, 2, 1, null],
    },
  },
  {
    id: "repeat-chord",
    family: "repeated-notes",
    title: "Accord répété, même main",
    goal: "Répéter sans pouvoir changer de doigt",
    instruction:
      "Trois notes ensemble, trois fois : les doigts ne peuvent pas se relayer. C'est le poignet seul qui rebondit — la seule solution restante.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 56,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Le contre-exemple utile de la famille : ici le relais de doigts est
    // impossible, et la répétition ne peut venir que du poignet. C'est ce qui
    // montre à quoi servait le relais dans les cinq autres.
    pattern: [
      { degrees: [0, 2, 4], holdBeats: 0.25 },
      { degrees: [0, 2, 4], holdBeats: 0.25 },
      { degrees: [0, 2, 4], holdBeats: 0.25 },
      { degrees: [], beats: 0.5 },
      { degrees: [0, 2, 4], holdBeats: 0.25 },
      { degrees: [0, 2, 4], holdBeats: 0.25 },
      { degrees: [0, 2, 4], holdBeats: 0.25 },
      { degrees: [], beats: 0.5 },
      { degrees: [0, 2, 4], holdBeats: 0.25 },
      { degrees: [0, 2, 4], holdBeats: 0.25 },
      { degrees: [0, 2, 4], holdBeats: 0.25 },
      { degrees: [], beats: 0.5 },
      { degrees: [0, 2, 4], holdBeats: 0.25 },
      { degrees: [0, 2, 4], holdBeats: 0.25 },
      { degrees: [0, 2, 4], holdBeats: 0.25 },
      { degrees: [], beats: 0.5 },
    ],
    fingering: {
      right: [
        [1, 3, 5], [1, 3, 5], [1, 3, 5], null,
        [1, 3, 5], [1, 3, 5], [1, 3, 5], null,
        [1, 3, 5], [1, 3, 5], [1, 3, 5], null,
        [1, 3, 5], [1, 3, 5], [1, 3, 5], null,
      ],
      left: [
        [5, 3, 1], [5, 3, 1], [5, 3, 1], null,
        [5, 3, 1], [5, 3, 1], [5, 3, 1], null,
        [5, 3, 1], [5, 3, 1], [5, 3, 1], null,
        [5, 3, 1], [5, 3, 1], [5, 3, 1], null,
      ],
    },
  },
  {
    id: "repeat-four-continuous",
    family: "repeated-notes",
    title: "4-3-2-1 sans respiration",
    goal: "Trente-deux répétitions d'affilée, sans que rien ne se raidisse",
    instruction:
      "Deux mesures sans un silence. Si l'avant-bras commence à durcir, arrête — cet exercice ne se gagne pas en serrant les dents.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 60,
    defaultRepetitions: 3,
    beatsPerBar: 4,
    beatsPerStep: 0.25,
    restBeats: 4,
    // Le niveau Difficile de cette famille reste sur **une seule touche** : ce
    // n'est pas parce que c'est le niveau le plus dur qu'il faut y ajouter des
    // déplacements qui ne sont pas le sujet (cf. plan § 5).
    pattern: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    fingering: {
      right: [
        4, 3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1,
        4, 3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1,
      ],
      left: [
        4, 3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1,
        4, 3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1,
      ],
    },
  },
  {
    id: "repeat-under-held-melody",
    family: "repeated-notes",
    title: "Répétée sous une note tenue",
    goal: "Répéter avec trois doigts pendant que le cinquième tient",
    instruction:
      "Le petit doigt tient la note du haut toute la mesure. En dessous, trois doigts se relaient sur une seule touche — et la tenue ne doit pas trembler.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 54,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Deux voix dans une main : la tenue et la répétition. C'est le procédé de
    // Brahms (« 51 Übungen ») et ce qui relie cette famille au Déliement — sauf
    // qu'ici les doigts libres retombent tous sur la **même** touche.
    pattern: [
      { degrees: [0, 4], holdBeats: [0.5, 4] },
      0, 0, 0, 0, 0, 0, 0,
      { degrees: [0, 5], holdBeats: [0.5, 4] },
      0, 0, 0, 0, 0, 0, 0,
    ],
    fingering: {
      right: [[3, 5], 2, 1, 3, 2, 1, 3, 2, [3, 5], 2, 1, 3, 2, 1, 3, 2],
      left: [[3, 1], 4, 5, 3, 4, 5, 3, 4, [3, 1], 4, 5, 3, 4, 5, 3, 4],
    },
  },
  {
    id: "repeat-alternating-hands",
    family: "repeated-notes",
    title: "Répétées alternées entre les mains",
    goal: "Passer le relais d'une main à l'autre sans trou ni chevauchement",
    instruction:
      "Chaque main tient deux temps, puis se taise. Le passage doit être invisible : on ne doit pas entendre où l'une s'arrête et l'autre commence.",
    difficulty: "advanced",
    // Chaque main joue quand l'autre se tait : deux motifs complémentaires, donc
    // `patternByHand`. Le silence de l'une est ce qui laisse la place à l'autre.
    supportedHands: ["right", "left", "both"],
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 58,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    patternByHand: {
      right: [
        0, 0, 0, 0,
        { degrees: [], beats: 0.5 }, { degrees: [], beats: 0.5 },
        { degrees: [], beats: 0.5 }, { degrees: [], beats: 0.5 },
        { degrees: [], beats: 0.5 }, { degrees: [], beats: 0.5 },
        { degrees: [], beats: 0.5 }, { degrees: [], beats: 0.5 },
        0, 0, 0, 0,
      ],
      left: [
        { degrees: [], beats: 0.5 }, { degrees: [], beats: 0.5 },
        { degrees: [], beats: 0.5 }, { degrees: [], beats: 0.5 },
        0, 0, 0, 0,
        0, 0, 0, 0,
        { degrees: [], beats: 0.5 }, { degrees: [], beats: 0.5 },
        { degrees: [], beats: 0.5 }, { degrees: [], beats: 0.5 },
      ],
    },
    fingering: {
      right: [
        4, 3, 2, 1,
        null, null, null, null,
        null, null, null, null,
        4, 3, 2, 1,
      ],
      left: [
        null, null, null, null,
        4, 3, 2, 1,
        4, 3, 2, 1,
        null, null, null, null,
      ],
    },
  },
  // ==========================================================================
  //  Égalité — même son, même durée
  //
  //  L'accent déplacé est l'outil principal : il oblige à *décider* où va le
  //  poids, au lieu de le laisser tomber là où la main penche. Les groupes
  //  irréguliers — cinq puis sept notes par temps — retirent le repère binaire
  //  et ne laissent que la régularité pour se tenir.
  //
  //  Rien dans l'application ne **mesure** l'égalité d'un son : la validation
  //  MIDI regarde les hauteurs et les départs, pas les nuances. C'est écrit
  //  dans plan/exercices-catalogue.md § 9 et ça reste vrai — ici, c'est
  //  l'oreille qui juge.
  // ==========================================================================
  {
    id: "even-accent-on-beat",
    family: "evenness",
    title: "Accent sur chaque temps",
    goal: "Décider où va le poids, plutôt que de le laisser tomber",
    instruction:
      "Une croche sur deux est appuyée, celle du temps. Les autres doivent être exactement égales entre elles — c'est ce qui est difficile, pas l'accent.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // L'accent tombe là où la pulsation le met : c'est le cas facile, et il sert
    // de référence aux deux exercices suivants, où il tombe ailleurs.
    pattern: [
      { degrees: 0, accent: true }, 1,
      { degrees: 2, accent: true }, 3,
      { degrees: 4, accent: true }, 3,
      { degrees: 2, accent: true }, 1,
    ],
    fingering: {
      right: [1, 2, 3, 4, 5, 4, 3, 2],
      left: [5, 4, 3, 2, 1, 2, 3, 4],
    },
  },
  {
    id: "even-accent-off-beat",
    family: "evenness",
    title: "Accent sur la deuxième croche",
    goal: "Appuyer là où la pulsation ne le demande pas",
    instruction:
      "L'accent est sur la croche faible. Le pied continue de battre le temps, la main appuie juste après — et le temps, lui, reste léger.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 58,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Les mêmes notes que l'exercice précédent, l'accent déplacé d'une croche.
    // C'est le procédé d'égalité par excellence : si le son ne dépend plus de la
    // place dans la mesure, c'est que la main l'a en main.
    pattern: [
      0, { degrees: 1, accent: true },
      2, { degrees: 3, accent: true },
      4, { degrees: 3, accent: true },
      2, { degrees: 1, accent: true },
    ],
    fingering: {
      right: [1, 2, 3, 4, 5, 4, 3, 2],
      left: [5, 4, 3, 2, 1, 2, 3, 4],
    },
  },
  {
    id: "even-no-accent",
    family: "evenness",
    title: "Aucun accent : l'oreille seule juge",
    goal: "Seize croches dont aucune ne dépasse",
    instruction:
      "Rien n'est appuyé. Écoute le cinquième doigt en montant et le pouce en descendant : ce sont eux qui font la bosse, presque toujours.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Deux mesures sans le moindre repère : c'est le seul exercice du catalogue
    // dont le critère est entièrement à l'oreille de l'élève. L'application ne
    // sait pas le juger, et la consigne dit donc *où* écouter.
    pattern: [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1],
    fingering: {
      right: [1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2],
      left: [5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4],
    },
  },
  {
    id: "even-accent-every-three",
    family: "evenness",
    title: "Accent tous les trois",
    goal: "Un accent qui ne retombe jamais au même endroit de la mesure",
    instruction:
      "Trois croches par groupe, quatre temps par mesure : l'accent se promène. Compte les groupes, pas les temps.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 60,
    defaultRepetitions: 3,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Trois contre quatre, en accentuation seulement : l'accent revient sur le
    // premier temps au bout de trois mesures. C'est le décalage de Brahms
    // (« 51 Übungen ») réduit à ce qu'un rouleau peut montrer.
    pattern: [
      { degrees: 0, accent: true }, 1, 2, { degrees: 3, accent: true }, 4, 3, { degrees: 2, accent: true }, 1,
      0, { degrees: 1, accent: true }, 2, 3, { degrees: 4, accent: true }, 3, 2, { degrees: 1, accent: true },
      0, 1, { degrees: 2, accent: true }, 3, 4, { degrees: 3, accent: true }, 2, 1,
    ],
    fingering: {
      right: [
        1, 2, 3, 4, 5, 4, 3, 2,
        1, 2, 3, 4, 5, 4, 3, 2,
        1, 2, 3, 4, 5, 4, 3, 2,
      ],
      left: [
        5, 4, 3, 2, 1, 2, 3, 4,
        5, 4, 3, 2, 1, 2, 3, 4,
        5, 4, 3, 2, 1, 2, 3, 4,
      ],
    },
  },
  {
    id: "even-five-per-beat",
    family: "evenness",
    title: "Cinq notes dans un temps",
    goal: "Cinq notes égales, sans pouvoir les découper en deux ni en trois",
    instruction:
      "Cinq notes par temps : impossible de s'appuyer sur une subdivision. Seule la régularité tient le groupe ensemble.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 52, // cinq notes par temps : le tempo compte double
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.2, // un cinquième de temps
    restBeats: 4,
    // Le groupe irrégulier est l'épreuve de vérité de l'égalité : dans un groupe
    // de quatre, l'oreille recolle les morceaux toute seule ; dans un groupe de
    // cinq, non. L'accent marque seulement le début de chaque groupe.
    pattern: [
      { degrees: 0, accent: true }, 1, 2, 3, 4,
      { degrees: 3, accent: true }, 2, 1, 0, 1,
      { degrees: 2, accent: true }, 3, 4, 3, 2,
      { degrees: 1, accent: true }, 0, 1, 2, 3,
    ],
    fingering: {
      right: [
        1, 2, 3, 4, 5,
        4, 3, 2, 1, 2,
        3, 4, 5, 4, 3,
        2, 1, 2, 3, 4,
      ],
      left: [
        5, 4, 3, 2, 1,
        2, 3, 4, 5, 4,
        3, 2, 1, 2, 3,
        4, 5, 4, 3, 2,
      ],
    },
  },
  {
    id: "even-rising-sequence",
    family: "evenness",
    title: "Séquence montante, son égal",
    goal: "Le même son quand la main a changé de place",
    instruction:
      "Quatre fois le même dessin, un degré plus haut à chaque mesure. La difficulté n'est pas de jouer les notes, c'est que la quatrième mesure sonne comme la première.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    // Pas de Fa : la dernière mesure y mettrait le pouce sur si♭.
    supportedKeys: ["C", "G"],
    defaultTempo: 63,
    defaultRepetitions: 3,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // La séquence de Czerny, employée pour l'égalité et non pour la vélocité :
    // ce qui se dégrade quand la main se déplace, c'est le son, pas les notes.
    pattern: [
      0, 1, 2, 3, 4, 3, 2, 1,
      1, 2, 3, 4, 5, 4, 3, 2,
      2, 3, 4, 5, 6, 5, 4, 3,
      3, 4, 5, 6, 7, 6, 5, 4,
    ],
    fingering: {
      right: [
        1, 2, 3, 4, 5, 4, 3, 2,
        1, 2, 3, 4, 5, 4, 3, 2,
        1, 2, 3, 4, 5, 4, 3, 2,
        1, 2, 3, 4, 5, 4, 3, 2,
      ],
      left: [
        5, 4, 3, 2, 1, 2, 3, 4,
        5, 4, 3, 2, 1, 2, 3, 4,
        5, 4, 3, 2, 1, 2, 3, 4,
        5, 4, 3, 2, 1, 2, 3, 4,
      ],
    },
  },
  {
    id: "even-accent-every-five",
    family: "evenness",
    title: "Accent tous les cinq",
    goal: "Tenir un groupe de cinq contre une mesure de quatre, cinq mesures durant",
    instruction:
      "L'accent met cinq mesures à revenir sur le premier temps. Ne compte pas : sens le groupe de cinq et laisse la mesure passer dessous.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 63,
    defaultRepetitions: 2, // cinq mesures par série : deux suffisent
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Cinq contre quatre : l'accent ne retombe sur le premier temps qu'au bout de
    // quarante croches. C'est la version difficile de « Accent tous les trois »,
    // et ce qui change n'est pas la vitesse mais la durée pendant laquelle il
    // faut garder deux comptes à la fois.
    pattern: [
      { degrees: 0, accent: true }, 1, 2, 3, 4, { degrees: 3, accent: true }, 2, 1,
      0, 1, { degrees: 2, accent: true }, 3, 4, 3, 2, { degrees: 1, accent: true },
      0, 1, 2, 3, { degrees: 4, accent: true }, 3, 2, 1,
      0, { degrees: 1, accent: true }, 2, 3, 4, 3, { degrees: 2, accent: true }, 1,
      0, 1, 2, { degrees: 3, accent: true }, 4, 3, 2, 1,
    ],
    fingering: {
      right: [
        1, 2, 3, 4, 5, 4, 3, 2,
        1, 2, 3, 4, 5, 4, 3, 2,
        1, 2, 3, 4, 5, 4, 3, 2,
        1, 2, 3, 4, 5, 4, 3, 2,
        1, 2, 3, 4, 5, 4, 3, 2,
      ],
      left: [
        5, 4, 3, 2, 1, 2, 3, 4,
        5, 4, 3, 2, 1, 2, 3, 4,
        5, 4, 3, 2, 1, 2, 3, 4,
        5, 4, 3, 2, 1, 2, 3, 4,
        5, 4, 3, 2, 1, 2, 3, 4,
      ],
    },
  },
  {
    id: "even-seven-per-beat",
    family: "evenness",
    title: "Sept notes dans un temps",
    goal: "Sept notes égales, le groupe le plus difficile à ne pas découper",
    instruction:
      "Sept notes par temps. Ne cherche pas à les grouper : pense au temps entier, et laisse les sept notes le remplir.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 46, // sept notes par temps : plus lent que tout le reste du catalogue
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 1 / 7,
    restBeats: 4,
    // Le septolet est le pas le plus court que ce mode accepte : un septième de
    // temps, juste au-dessus du huitième en dessous duquel le doigté ne serait
    // plus lisible même écrit à côté de la note.
    pattern: [
      { degrees: 0, accent: true }, 1, 2, 3, 4, 3, 2,
      { degrees: 1, accent: true }, 0, 1, 2, 3, 4, 3,
      { degrees: 2, accent: true }, 1, 0, 1, 2, 3, 4,
      { degrees: 3, accent: true }, 2, 1, 0, 1, 2, 3,
    ],
    fingering: {
      right: [
        1, 2, 3, 4, 5, 4, 3,
        2, 1, 2, 3, 4, 5, 4,
        3, 2, 1, 2, 3, 4, 5,
        4, 3, 2, 1, 2, 3, 4,
      ],
      left: [
        5, 4, 3, 2, 1, 2, 3,
        4, 5, 4, 3, 2, 1, 2,
        3, 4, 5, 4, 3, 2, 1,
        2, 3, 4, 5, 4, 3, 2,
      ],
    },
  },
  {
    id: "even-contrary-motion",
    family: "evenness",
    title: "Égalité aux deux mains en sens opposé",
    goal: "Deux mains également régulières, sans pouvoir se copier l'une sur l'autre",
    instruction:
      "Les mains s'écartent. Une main en retard ne se rattrape pas ici : l'écart s'entend tout de suite, et c'est le meilleur contrôle qui existe.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    bothMode: "contrary",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 58,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // En parallèle, une main peu sûre s'appuie sur l'autre sans qu'on l'entende ;
    // en sens opposé, elle n'a plus rien à quoi se raccrocher. C'est pour cela que
    // le mouvement contraire ferme cette famille et non le septolet.
    pattern: [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1],
    fingering: {
      // Mouvement contraire : le doigté s'écrit dans l'ordre des degrés du motif,
      // avant miroir. Les deux mains ont donc le même — c'est le seul cas où la
      // symétrie du clavier joue pour l'élève.
      right: [1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2],
      left: [1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2],
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
    id: "scale-tetrachord",
    family: "scales",
    title: "Tétracorde, sans passage de pouce",
    goal: "Les quatre premiers degrés, un doigt par note, avant d'apprendre à croiser",
    instruction:
      "Quatre notes, quatre doigts, la main ne bouge pas. C'est le son égal qu'on cherche ici — le pouce ne passe pas encore.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // La première étape réelle d'une gamme, avant celle que le catalogue
    // proposait comme « Débutant » : les quatre premiers degrés tiennent sous
    // quatre doigts, sans croisement. En Fa, le si♭ tombe naturellement sous le
    // 4 — c'est le doigté définitif de la gamme, appris d'emblée.
    pattern: [0, 1, 2, 3, 2, 1, { degrees: 0, beats: 1 }],
    fingering: {
      right: [1, 2, 3, 4, 3, 2, 1],
      left: [5, 4, 3, 2, 3, 4, 5],
    },
  },
  {
    id: "scale-thumb-crossing-alone",
    family: "scales",
    title: "Le passage du pouce, seul",
    goal: "Répéter le seul endroit difficile de la gamme, sans le reste",
    instruction:
      "Trois notes en boucle, et le passage au milieu. Pendant que le doigt long tient encore, le pouce est déjà placé sous la main.",
    difficulty: "beginner",
    // Chaque main a **son** passage : à droite entre le 3e et le 4e degré (mi-fa
    // en Do), à gauche entre le 5e et le 6e (sol-la). Les deux ne tombent pas au
    // même endroit de la gamme, donc les deux mains n'ont pas le même motif.
    supportedHands: ["right", "left", "both"],
    supportedKeys: ["C"], // le point de croisement se déplace avec le doigté du ton
    defaultTempo: 54, // lent exprès : c'est la préparation qu'on écoute
    defaultRepetitions: 8,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // La préparation muette du pouce, isolée — tradition Chopin transmise par
    // Mikuli puis Cortot, qui en fait un exercice à part entière : on ne
    // travaille pas la gamme, on travaille les trois notes où elle casse.
    patternByHand: {
      right: [2, 3, 4, 3, 2, 3, 4, 3], // mi fa sol fa : le pouce passe sur fa
      left: [3, 4, 5, 4, 3, 4, 5, 4], // fa sol la sol : le pouce passe sur la
    },
    fingering: {
      right: [3, 1, 2, 1, 3, 1, 2, 1],
      left: [2, 1, 3, 1, 2, 1, 3, 1],
    },
  },
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
    id: "scale-groups-of-four",
    family: "scales",
    title: "Gamme par groupes de quatre, avec arrêt",
    goal: "S'arrêter là où le pouce doit se placer, et l'y placer sans se presser",
    instruction:
      "Quatre notes, puis un arrêt de deux temps. Pendant l'arrêt, le pouce va se poser sous la main — il attend là, prêt, avant le groupe suivant.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 66,
    defaultRepetitions: 3,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 0, // les silences sont dans le motif : pas besoin d'en ajouter
    // D'après Cortot, « Principes rationnels » : la gamme découpée en groupes,
    // avec un arrêt pendant lequel la main se replace. Ce que ça travaille n'est
    // pas la gamme mais l'**arrêt** — savoir que le pouce a le temps.
    pattern: [
      0, 1, 2, 3, { degrees: [], beats: 2 },
      4, 5, 6, 7, { degrees: [], beats: 2 },
      7, 6, 5, 4, { degrees: [], beats: 2 },
      3, 2, 1, 0, { degrees: [], beats: 2 },
    ],
    fingering: {
      right: [
        1, 2, 3, 1, null,
        2, 3, 4, 5, null,
        5, 4, 3, 2, null,
        1, 3, 2, 1, null,
      ],
      left: [
        5, 4, 3, 2, null,
        1, 3, 2, 1, null,
        1, 2, 3, 1, null,
        2, 3, 4, 5, null,
      ],
    },
    // En Fa, si♭ se prend avec le 4 : le premier groupe devient 1-2-3-4 et le
    // pouce ne passe donc pas au même endroit. Seule la main droite change.
    fingeringByKey: {
      F: {
        right: [
          1, 2, 3, 4, null,
          1, 2, 3, 4, null,
          4, 3, 2, 1, null,
          4, 3, 2, 1, null,
        ],
      },
    },
  },
  {
    id: "scale-dotted-rhythm",
    family: "scales",
    title: "Gamme en rythme pointé",
    goal: "Déplacer le poids de la main sans que le pouce accentue",
    instruction:
      "Long, court, long, court. Le rythme change à chaque note quel doigt porte le poids — le pouce, lui, doit rester aussi léger qu'avant.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 63,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5, // valeur par défaut ; chaque pas porte la sienne
    restBeats: 4,
    // La variante rythmique est le procédé de Czerny : le même matériau, une
    // autre répartition du poids. C'est aussi ce qui remplace ici une famille
    // « Rythme » séparée — le rythme sert un geste, il n'est pas le sujet.
    pattern: [
      { degrees: 0, beats: 0.75 }, { degrees: 1, beats: 0.25 },
      { degrees: 2, beats: 0.75 }, { degrees: 3, beats: 0.25 },
      { degrees: 4, beats: 0.75 }, { degrees: 5, beats: 0.25 },
      { degrees: 6, beats: 0.75 }, { degrees: 7, beats: 0.25 },
      { degrees: 6, beats: 0.75 }, { degrees: 5, beats: 0.25 },
      { degrees: 4, beats: 0.75 }, { degrees: 3, beats: 0.25 },
      { degrees: 2, beats: 0.75 }, { degrees: 1, beats: 0.25 },
      { degrees: 0, beats: 1 },
    ],
    fingering: {
      right: [1, 2, 3, 1, 2, 3, 4, 5, 4, 3, 2, 1, 3, 2, 1],
      left: [5, 4, 3, 2, 1, 3, 2, 1, 2, 3, 1, 2, 3, 4, 5],
    },
    fingeringByKey: {
      F: { right: [1, 2, 3, 4, 1, 2, 3, 4, 3, 2, 1, 4, 3, 2, 1] },
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
    id: "scale-three-octaves",
    family: "scales",
    title: "Gamme sur trois octaves",
    goal: "Six passages de pouce d'affilée, sans que la main perde son cap",
    instruction:
      "Six passages en montant, six en descendant, sans reprendre son souffle. Le bras accompagne la main vers l'aigu — ce n'est plus la main seule qui voyage.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 72,
    defaultRepetitions: 2, // longue : deux séries suffisent
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Trois octaves n'est pas « deux octaves plus vite » : au-delà de deux, le
    // déplacement du bras devient la difficulté principale et le pouce n'a plus
    // le repère de la position de départ. C'est l'unité de travail de Czerny
    // op. 299 pour les gammes tenues.
    //
    // Aux deux mains, l'exercice couvre exactement quatre octaves de clavier —
    // do2 à do6 —, la limite de ce que le rouleau peut dessiner en gardant des
    // touches assez larges pour le doigté (cf. `tools/verifier-catalogue.js`).
    pattern: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
      20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
      // Trois temps, pas deux : quarante-deux croches font vingt et un temps, et
      // c'est cette tenue qui ramène la série à six mesures pleines.
      { degrees: 0, beats: 3 },
    ],
    fingering: {
      right: [
        1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 5,
        4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2,
        1,
      ],
      left: [
        5, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2, 1,
        2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4,
        5,
      ],
    },
    fingeringByKey: {
      F: {
        right: [
          1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 4,
          3, 2, 1, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2,
          1,
        ],
      },
    },
  },
  {
    id: "scale-chromatic-one-octave",
    family: "scales",
    title: "Gamme chromatique sur une octave",
    goal: "Un doigté qui n'a plus rien à voir avec celui d'une gamme majeure",
    instruction:
      "Le 3 sur toutes les touches noires, le pouce sur les blanches, et le 2 aux deux endroits où deux blanches se touchent : mi-fa et si-do.",
    difficulty: "advanced",
    // Main droite seulement, et c'est délibéré : le doigté chromatique de la
    // main gauche ne place pas le 2 aux mêmes endroits, et l'écrire sans l'avoir
    // essayé au clavier serait inventer. Il aura son propre exercice le jour où
    // il sera vérifié — cf. plan/exercices-catalogue.md § 9, « ce que le harnais
    // ne saura pas dire ».
    supportedHands: ["right"],
    supportedKeys: ["C"], // le doigté chromatique ne dépend pas du ton, la notation en degrés si
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.25,
    restBeats: 4,
    // Le doigté chromatique standard, celui de tous les conservatoires. Il n'a
    // aucun passage de pouce au sens de la gamme majeure : le pouce ne passe pas
    // sous la main, c'est le 3 qui enjambe. C'est pour cela que la gamme
    // chromatique est un exercice à part et non une gamme de plus.
    //
    // Cet exercice est aussi le premier du catalogue dont les pas durent un quart
    // de temps : c'est lui qui fait apparaître le doigté **à côté** de la note
    // plutôt que dedans (§ 7 du plan).
    pattern: [
      0, "0#", 1, "1#", 2, 3, "3#", 4, "4#", 5, "5#", 6,
      { degrees: 7, beats: 1 },
      6, "5#", 5, "4#", 4, "3#", 3, 2, "1#", 1, "0#",
      { degrees: 0, beats: 1.25 },
    ],
    fingering: {
      right: [
        1, 3, 1, 3, 1, 2, 3, 1, 3, 1, 3, 1,
        2,
        1, 3, 1, 3, 1, 3, 2, 1, 3, 1, 3,
        1,
      ],
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
  {
    id: "broken-chord-in-place",
    family: "arpeggios",
    title: "Accord brisé sur place",
    goal: "Les trois notes de l'accord, sans quitter la position de cinq doigts",
    instruction:
      "Do, mi, sol, mi : la main ne se déplace pas, le pouce ne passe pas. C'est l'égalité des trois doigts qu'on écoute.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 4,
    // La marche avant l'arpège : le même accord, mais sans octave et donc sans
    // passage de pouce. Ce que l'exercice « Arpège de Do majeur » ajoute, c'est
    // exactement le passage — autant l'isoler.
    pattern: [0, 2, 4, 2, 0, 2, 4, 2],
    fingering: {
      right: [1, 3, 5, 3, 1, 3, 5, 3],
      left: [5, 3, 1, 3, 5, 3, 1, 3],
    },
  },
  {
    id: "broken-then-block-chord",
    family: "arpeggios",
    title: "Brisé, puis plaqué",
    goal: "Faire sonner l'arpège comme l'accord qu'on vient d'entendre",
    instruction:
      "Trois notes l'une après l'autre, puis les trois ensemble. L'accord dit la vérité : si l'arpège ne sonnait pas comme lui, c'est qu'un doigt était en retard.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 58,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 4,
    // L'accord plaqué sert de contrôle à l'arpège : c'est le procédé de
    // vérification que tous les traités emploient pour les brisés, et il donne à
    // l'élève un critère qu'il peut entendre seul, sans professeur.
    pattern: [0, 2, 4, [0, 2, 4], 0, 2, 4, [0, 2, 4]],
    fingering: {
      right: [1, 3, 5, [1, 3, 5], 1, 3, 5, [1, 3, 5]],
      left: [5, 3, 1, [5, 3, 1], 5, 3, 1, [5, 3, 1]],
    },
  },
  {
    id: "arpeggio-two-octaves",
    family: "arpeggios",
    title: "Arpège sur deux octaves",
    goal: "Garder la main ouverte en la déplaçant d'une octave",
    instruction:
      "La main garde la même forme d'un bout à l'autre : elle se déplace, elle ne s'étire pas. Le pouce arrive sur sa note déjà placé.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C"], // le doigté d'arpège change avec le ton ; un ton par exercice vérifié
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 1,
    // Le doigté standard de l'arpège de Do majeur sur deux octaves : 1-2-3 par
    // octave à droite, 5-3-2-1 puis 3-2-1 à gauche. C'est celui de tous les
    // recueils de gammes et arpèges, et il diffère d'une tonalité à l'autre —
    // d'où le ton unique déclaré.
    pattern: [0, 2, 4, 7, 9, 11, 14, 11, 9, 7, 4, 2, { degrees: 0, beats: 1 }],
    fingering: {
      right: [1, 2, 3, 1, 2, 3, 5, 3, 2, 1, 3, 2, 1],
      left: [5, 3, 2, 1, 3, 2, 1, 2, 3, 1, 2, 3, 5],
    },
  },
  {
    id: "arpeggio-first-inversion",
    family: "arpeggios",
    title: "Premier renversement",
    goal: "Le même accord, mais la main ne se pose plus au même endroit",
    instruction:
      "Mi, sol, do, mi : c'est toujours l'accord de Do, mais l'écart entre le premier et le deuxième doigt a changé. C'est la main qui doit s'en apercevoir.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C"],
    defaultTempo: 58,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 1,
    // Le renversement est ce qui distingue un arpège travaillé d'un arpège
    // appris : la forme de la main change à chaque position, et c'est elle qu'on
    // mémorise, pas la suite de notes.
    pattern: [2, 4, 7, 9, 7, 4, 2],
    fingering: {
      right: [1, 2, 3, 5, 3, 2, 1],
      left: [5, 3, 2, 1, 2, 3, 5],
    },
  },
  {
    id: "arpeggio-dominant-seventh",
    family: "arpeggios",
    title: "Septième de dominante",
    goal: "Quatre doigts sur quatre notes, sur une septième d'écart",
    instruction:
      "Sol, si, ré, fa : quatre notes qui ne tiennent plus dans la main sans l'ouvrir. Les quatre doigts se posent d'un coup, avant de jouer.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C"],
    defaultTempo: 56,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 1,
    // La septième de dominante est le premier accord de quatre sons qu'on
    // arpège, et le premier dont l'écart dépasse ce qu'une main d'élève couvre
    // au repos. C'est là que l'ouverture cesse d'être un détail.
    pattern: [4, 6, 8, 10, 8, 6, 4],
    fingering: {
      right: [1, 2, 3, 4, 3, 2, 1],
      left: [5, 4, 2, 1, 2, 4, 5],
    },
  },
  {
    id: "arpeggio-three-octaves",
    family: "arpeggios",
    title: "Arpège sur trois octaves",
    goal: "Trois déplacements d'affilée sans que la forme de la main se déforme",
    instruction:
      "Trois octaves d'un souffle. Le coude accompagne la main vers l'aigu ; si le poignet se casse, l'accord suivant sera raté.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C"],
    defaultTempo: 66,
    defaultRepetitions: 3,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 2,
    // Aux deux mains, l'exercice couvre quatre octaves de clavier : la limite de
    // ce que ce rouleau dessine en gardant des touches assez larges pour le
    // doigté. C'est le plus étendu du catalogue, avec la gamme sur trois octaves.
    pattern: [
      0, 2, 4, 7, 9, 11, 14, 16, 18, 21,
      18, 16, 14, 11, 9, 7, 4, 2,
      { degrees: 0, beats: 1 },
    ],
    fingering: {
      right: [
        1, 2, 3, 1, 2, 3, 1, 2, 3, 5,
        3, 2, 1, 3, 2, 1, 3, 2,
        1,
      ],
      left: [
        5, 3, 2, 1, 3, 2, 1, 3, 2, 1,
        2, 3, 1, 2, 3, 1, 2, 3,
        5,
      ],
    },
  },
  {
    id: "arpeggio-inversions-chained",
    family: "arpeggios",
    title: "Les trois renversements enchaînés",
    goal: "Changer de forme de main trois fois de suite, sans trou entre deux",
    instruction:
      "Quatre notes, nouvelle position, quatre notes. À chaque groupe la main prend une forme différente — et le pouce arrive toujours prêt.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C"],
    defaultTempo: 60,
    defaultRepetitions: 3,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 0, // la tenue finale ferme déjà la mesure
    // Fondamental, premier renversement, deuxième renversement, puis l'octave :
    // c'est la marche d'arpèges des recueils classiques. L'accord du sommet est
    // joué deux fois de suite — une fois en montant, une fois en redescendant —
    // et c'est ainsi que la main fait demi-tour, sans temps mort.
    pattern: [
      0, 2, 4, 7,
      2, 4, 7, 9,
      4, 7, 9, 11,
      7, 9, 11, 14,
      11, 9, 7, 4,
      9, 7, 4, 2,
      7, 4, 2, 0,
      { degrees: 0, beats: 2 },
    ],
    fingering: {
      right: [
        1, 2, 3, 5,
        1, 2, 3, 5,
        1, 2, 3, 5,
        1, 2, 3, 5,
        5, 3, 2, 1,
        5, 3, 2, 1,
        5, 3, 2, 1,
        1,
      ],
      left: [
        5, 3, 2, 1,
        5, 3, 2, 1,
        5, 3, 2, 1,
        5, 3, 2, 1,
        1, 2, 3, 5,
        1, 2, 3, 5,
        1, 2, 3, 5,
        5,
      ],
    },
  },
  {
    id: "arpeggio-contrary-motion",
    family: "arpeggios",
    title: "Arpèges en mouvement contraire",
    goal: "Le même accord dans les deux mains, en sens opposé",
    instruction:
      "Les deux mains s'écartent sur le même accord. Les deux pouces partent ensemble : si l'un traîne, l'écart s'entend aussitôt.",
    difficulty: "advanced",
    // Ici `bothMode: "contrary"` ne suffit pas. Le miroir de ce mode est
    // **diatonique** : renverser les degrés 0-2-4-7 donnerait do-la-fa-do, un
    // arpège de Fa, pas de Do. Pour que les deux mains jouent réellement le même
    // accord en sens opposé, il faut écrire les deux lignes — c'est ce à quoi
    // `patternByHand` sert.
    supportedHands: ["right", "left", "both"],
    supportedKeys: ["C"],
    defaultTempo: 58,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 1,
    patternByHand: {
      right: [0, 2, 4, 7, 4, 2, 0], // do4 mi sol do5 sol mi do4
      left: [0, -3, -5, -7, -5, -3, 0], // do3 sol2 mi2 do2 mi sol do3
    },
    fingering: {
      right: [1, 2, 3, 5, 3, 2, 1],
      left: [1, 2, 3, 5, 3, 2, 1],
    },
  },
  // ==========================================================================
  //  Doubles notes — deux voix qui partent et s'arrêtent ensemble
  //
  //  Le sujet n'est pas de jouer deux notes : c'est de les **relâcher** au même
  //  instant. Rien dans l'application ne le mesure — la validation MIDI regarde
  //  les départs, pas les fins —, mais l'écriture est exacte et l'oreille
  //  entend le décalage aussitôt.
  //
  //  Un ton par exercice : le doigté des tierces se refait entièrement d'une
  //  tonalité à l'autre, et proposer Sol et Fa sans les avoir vérifiés serait
  //  inventer.
  // ==========================================================================
  {
    id: "double-thirds-five-notes",
    family: "double-notes",
    title: "Tierces sur cinq notes",
    goal: "Deux notes ensemble, sans que l'une arrive avant l'autre",
    instruction:
      "Les deux notes partent ensemble et s'arrêtent ensemble. Écoute la note du bas : c'est presque toujours elle qui est en retard.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 56,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    pattern: [
      [0, 2], [1, 3], [2, 4], [1, 3],
      [0, 2], [1, 3], [2, 4], [1, 3],
      [0, 2], [1, 3], [2, 4], [1, 3],
      [0, 2], [1, 3], [2, 4], [1, 3],
    ],
    fingering: {
      right: [
        [1, 3], [2, 4], [3, 5], [2, 4],
        [1, 3], [2, 4], [3, 5], [2, 4],
        [1, 3], [2, 4], [3, 5], [2, 4],
        [1, 3], [2, 4], [3, 5], [2, 4],
      ],
      left: [
        [3, 1], [4, 2], [5, 3], [4, 2],
        [3, 1], [4, 2], [5, 3], [4, 2],
        [3, 1], [4, 2], [5, 3], [4, 2],
        [3, 1], [4, 2], [5, 3], [4, 2],
      ],
    },
  },
  {
    id: "double-sixths-five-notes",
    family: "double-notes",
    title: "Sixtes sur cinq notes",
    goal: "L'écart de sixte entre le pouce et le petit doigt, tenu",
    instruction:
      "La main reste ouverte à la sixte du début à la fin. Ce sont les deux doigts des bords qui travaillent — les plus éloignés l'un de l'autre.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 54,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    pattern: [
      [0, 5], [1, 6], [2, 7], [1, 6],
      [0, 5], [1, 6], [2, 7], [1, 6],
      [0, 5], [1, 6], [2, 7], [1, 6],
      [0, 5], [1, 6], [2, 7], [1, 6],
    ],
    fingering: {
      right: [
        [1, 5], [1, 5], [1, 5], [1, 5],
        [1, 5], [1, 5], [1, 5], [1, 5],
        [1, 5], [1, 5], [1, 5], [1, 5],
        [1, 5], [1, 5], [1, 5], [1, 5],
      ],
      left: [
        [5, 1], [5, 1], [5, 1], [5, 1],
        [5, 1], [5, 1], [5, 1], [5, 1],
        [5, 1], [5, 1], [5, 1], [5, 1],
        [5, 1], [5, 1], [5, 1], [5, 1],
      ],
    },
  },
  {
    id: "double-thirds-and-sixths",
    family: "double-notes",
    title: "Tierces et sixtes alternées",
    goal: "Ouvrir et refermer la main sans que le son change",
    instruction:
      "Tierce, sixte, tierce, sixte : la main s'ouvre et se referme à chaque fois. Les deux notes doivent sonner ensemble aussi bien serrées qu'écartées.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 52,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    pattern: [
      [0, 2], [0, 5], [1, 3], [1, 6],
      [2, 4], [2, 7], [1, 3], [1, 6],
      [0, 2], [0, 5], [1, 3], [1, 6],
      [2, 4], [2, 7], [1, 3], [1, 6],
    ],
    fingering: {
      right: [
        [1, 3], [1, 5], [1, 3], [1, 5],
        [1, 3], [1, 5], [1, 3], [1, 5],
        [1, 3], [1, 5], [1, 3], [1, 5],
        [1, 3], [1, 5], [1, 3], [1, 5],
      ],
      left: [
        [3, 1], [5, 1], [3, 1], [5, 1],
        [3, 1], [5, 1], [3, 1], [5, 1],
        [3, 1], [5, 1], [3, 1], [5, 1],
        [3, 1], [5, 1], [3, 1], [5, 1],
      ],
    },
  },
  {
    id: "double-thirds-scale-octave",
    family: "double-notes",
    title: "Gamme en tierces sur une octave",
    goal: "Le doigté 1-3 / 2-4 en alternance, sur toute l'octave",
    instruction:
      "Un pas sur deux emploie 1-3, l'autre 2-4. Ce sont les paires 2-4 qui décrochent : ralentis jusqu'à ce qu'elles sonnent comme les 1-3.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C"],
    defaultTempo: 52,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // L'alternance stricte 1-3 / 2-4 : c'est le doigté qu'on apprend d'abord,
    // avant les substitutions que le répertoire demandera plus tard.
    pattern: [
      [0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 8], [7, 9],
      [6, 8], [5, 7], [4, 6], [3, 5], [2, 4], [1, 3],
      { degrees: [0, 2], beats: 1 },
    ],
    fingering: {
      right: [
        [1, 3], [2, 4], [1, 3], [2, 4], [1, 3], [2, 4], [1, 3], [2, 4],
        [1, 3], [2, 4], [1, 3], [2, 4], [1, 3], [2, 4],
        [1, 3],
      ],
      left: [
        [3, 1], [4, 2], [3, 1], [4, 2], [3, 1], [4, 2], [3, 1], [4, 2],
        [3, 1], [4, 2], [3, 1], [4, 2], [3, 1], [4, 2],
        [3, 1],
      ],
    },
  },
  {
    id: "double-sixths-scale-octave",
    family: "double-notes",
    title: "Gamme en sixtes",
    goal: "La main ouverte à la sixte, déplacée sur une octave entière",
    instruction:
      "Huit sixtes en montant. La main garde son écart et se déplace : elle ne s'étire pas d'une paire à l'autre.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C"],
    defaultTempo: 50,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    pattern: [
      [0, 5], [1, 6], [2, 7], [3, 8], [4, 9], [5, 10], [6, 11], [7, 12],
      [6, 11], [5, 10], [4, 9], [3, 8], [2, 7], [1, 6],
      { degrees: [0, 5], beats: 1 },
    ],
    fingering: {
      right: [
        [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5],
        [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5],
        [1, 5],
      ],
      left: [
        [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1],
        [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1],
        [5, 1],
      ],
    },
  },
  {
    id: "double-thirds-broken",
    family: "double-notes",
    title: "Tierces brisées",
    goal: "Entendre séparément les deux notes qu'on jouera ensemble",
    instruction:
      "La note du bas, celle du haut, puis les deux. Si les deux ensemble ne sonnent pas comme les deux séparées, c'est qu'un doigt appuie plus fort.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 54,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Le brisé sert de contrôle au plaqué, comme l'accord plaqué sert de contrôle
    // à l'arpège : c'est le même procédé de vérification, appliqué à la paire.
    pattern: [
      0, 2, [0, 2], { degrees: [], beats: 0.5 },
      1, 3, [1, 3], { degrees: [], beats: 0.5 },
      2, 4, [2, 4], { degrees: [], beats: 0.5 },
      1, 3, [1, 3], { degrees: [], beats: 0.5 },
    ],
    fingering: {
      right: [
        1, 3, [1, 3], null,
        2, 4, [2, 4], null,
        3, 5, [3, 5], null,
        2, 4, [2, 4], null,
      ],
      left: [
        3, 1, [3, 1], null,
        4, 2, [4, 2], null,
        5, 3, [5, 3], null,
        4, 2, [4, 2], null,
      ],
    },
  },
  {
    id: "double-thirds-two-octaves",
    family: "double-notes",
    title: "Tierces sur deux octaves",
    goal: "Tenir l'alternance 1-3 / 2-4 sur vingt-huit paires d'affilée",
    instruction:
      "Deux octaves sans reprendre son souffle. Ce n'est pas plus difficile qu'une octave — c'est plus long, et c'est là que la main se crispe.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C"],
    defaultTempo: 54,
    defaultRepetitions: 3,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    pattern: [
      [0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 8], [7, 9],
      [8, 10], [9, 11], [10, 12], [11, 13], [12, 14], [13, 15], [14, 16],
      [13, 15], [12, 14], [11, 13], [10, 12], [9, 11], [8, 10], [7, 9],
      [6, 8], [5, 7], [4, 6], [3, 5], [2, 4], [1, 3],
      { degrees: [0, 2], beats: 2 },
    ],
    fingering: {
      right: [
        [1, 3], [2, 4], [1, 3], [2, 4], [1, 3], [2, 4], [1, 3], [2, 4],
        [1, 3], [2, 4], [1, 3], [2, 4], [1, 3], [2, 4], [1, 3],
        [2, 4], [1, 3], [2, 4], [1, 3], [2, 4], [1, 3], [2, 4],
        [1, 3], [2, 4], [1, 3], [2, 4], [1, 3], [2, 4],
        [1, 3],
      ],
      left: [
        [3, 1], [4, 2], [3, 1], [4, 2], [3, 1], [4, 2], [3, 1], [4, 2],
        [3, 1], [4, 2], [3, 1], [4, 2], [3, 1], [4, 2], [3, 1],
        [4, 2], [3, 1], [4, 2], [3, 1], [4, 2], [3, 1], [4, 2],
        [3, 1], [4, 2], [3, 1], [4, 2], [3, 1], [4, 2],
        [3, 1],
      ],
    },
  },
  {
    id: "double-thirds-chromatic",
    family: "double-notes",
    title: "Tierces chromatiques",
    goal: "Le principe du doigté : 1-3 quand la note du bas est blanche, 2-4 quand elle est noire",
    instruction:
      "Regarde la note du bas : blanche, c'est 1-3 ; noire, c'est 2-4. C'est la seule règle, et elle décide de tout le passage.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    // Parallèle et non contraire : un motif chromatique ne se met pas en miroir
    // diatonique (§ 6, M1), et le harnais le refuserait.
    bothMode: "parallel",
    supportedKeys: ["C"],
    defaultTempo: 46,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Tierces mineures chromatiques, montant par demi-tons. Le doigté suit le
    // principe blanc/noir des traités ; il **reste à essayer au clavier**, comme
    // tout doigté de ce catalogue — le harnais vérifie qu'il est cohérent, pas
    // qu'il est jouable (plan § 9).
    pattern: [
      [0, "2b"], ["0#", 2], [1, 3], ["1#", "3#"], [2, 4], [3, "5b"],
      ["3#", 5], [4, "6b"], ["4#", 6], [5, 7], ["5#", "7#"], [6, 8],
      { degrees: [7, "9b"], beats: 2 },
    ],
    // Chaque paire fait exactement trois demi-tons. C'est vérifié, pas supposé :
    // le premier jet écrivait `["5#", "7b"]` — la♯ et si, une seconde mineure —
    // au lieu de `["5#", "7#"]`. Dans un tableau de treize paires d'altérations,
    // une erreur d'un demi-ton ne se voit pas à la relecture.
    interval: 3,
    fingering: {
      right: [
        [1, 3], [2, 4], [1, 3], [2, 4], [1, 3], [1, 3],
        [2, 4], [1, 3], [2, 4], [1, 3], [2, 4], [1, 3],
        [1, 3],
      ],
      left: [
        [3, 1], [4, 2], [3, 1], [4, 2], [3, 1], [3, 1],
        [4, 2], [3, 1], [4, 2], [3, 1], [4, 2], [3, 1],
        [3, 1],
      ],
    },
  },
  {
    id: "double-notes-both-hands-different",
    family: "double-notes",
    title: "Tierces à droite, sixtes à gauche",
    goal: "Quatre doigts qui décident au même instant, deux écarts différents",
    instruction:
      "La droite joue des tierces, la gauche des sixtes. Deux écarts, quatre doigts, un seul instant : c'est le plus exigeant de la famille.",
    difficulty: "advanced",
    // Les deux mains n'ont pas le même écart : deux motifs, donc `patternByHand`.
    supportedHands: ["right", "left", "both"],
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 48,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    patternByHand: {
      right: [
        [0, 2], [1, 3], [2, 4], [1, 3],
        [0, 2], [1, 3], [2, 4], [1, 3],
        [0, 2], [1, 3], [2, 4], [1, 3],
        [0, 2], [1, 3], [2, 4], [1, 3],
      ],
      left: [
        [0, 5], [1, 6], [2, 7], [1, 6],
        [0, 5], [1, 6], [2, 7], [1, 6],
        [0, 5], [1, 6], [2, 7], [1, 6],
        [0, 5], [1, 6], [2, 7], [1, 6],
      ],
    },
    fingering: {
      right: [
        [1, 3], [2, 4], [3, 5], [2, 4],
        [1, 3], [2, 4], [3, 5], [2, 4],
        [1, 3], [2, 4], [3, 5], [2, 4],
        [1, 3], [2, 4], [3, 5], [2, 4],
      ],
      left: [
        [5, 1], [5, 1], [5, 1], [5, 1],
        [5, 1], [5, 1], [5, 1], [5, 1],
        [5, 1], [5, 1], [5, 1], [5, 1],
        [5, 1], [5, 1], [5, 1], [5, 1],
      ],
    },
  },
  // ==========================================================================
  //  Octaves — le poignet, pas le bras
  //
  //  Le niveau Débutant de cette famille ne joue **pas** d'octaves : il joue des
  //  sixtes puis des septièmes. Aucun professeur ne met un débutant à l'octave,
  //  et une main d'enfant n'y arrive pas. Ici, « Débutant » veut dire *première
  //  étape du travail d'octave* — le niveau gradue le sujet de la famille, pas
  //  une difficulté abstraite (plan § 5).
  // ==========================================================================
  {
    id: "octave-sixth-then-seventh",
    family: "octaves",
    title: "Sixte puis septième, poignet souple",
    goal: "Ouvrir la main progressivement, avant l'octave",
    instruction:
      "Sixte, septième, sixte, septième. La main s'ouvre du bout des doigts, pas en tirant sur le poignet — et elle se referme entre chaque.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 50,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 4,
    pattern: [
      [0, 5], [0, 6], [0, 5], [0, 6],
      [0, 5], [0, 6], [0, 5], [0, 6],
    ],
    fingering: {
      right: [[1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5]],
      left: [[5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1]],
    },
  },
  {
    id: "octave-held",
    interval: 12, // toutes les paires font une octave juste — vérifié note par note
    family: "octaves",
    title: "L'octave posée, tenue",
    goal: "Sentir l'octave sans avoir à la répéter vite",
    instruction:
      "Une octave par deux temps, tenue. Cherche la position où la main est ouverte sans être tirée : c'est celle-là qu'il faudra retrouver vite plus tard.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 50,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 2,
    restBeats: 4,
    pattern: [[0, 7], [1, 8], [2, 9], [1, 8]],
    fingering: {
      right: [[1, 5], [1, 5], [1, 5], [1, 5]],
      left: [[5, 1], [5, 1], [5, 1], [5, 1]],
    },
  },
  {
    id: "octave-alternating-hands",
    interval: 12, // toutes les paires font une octave juste — vérifié note par note
    family: "octaves",
    title: "Octaves alternées entre les mains",
    goal: "Travailler l'octave sans fatiguer une seule main",
    instruction:
      "Une main, puis l'autre. Chaque main a un temps de repos entre deux octaves — c'est ce qui permet de travailler longtemps sans se raidir.",
    difficulty: "beginner",
    // Chaque main joue quand l'autre se tait : deux motifs complémentaires.
    supportedHands: ["right", "left", "both"],
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 52,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 4,
    patternByHand: {
      right: [
        [0, 7], { degrees: [], beats: 1 }, [1, 8], { degrees: [], beats: 1 },
        [2, 9], { degrees: [], beats: 1 }, [1, 8], { degrees: [], beats: 1 },
      ],
      left: [
        { degrees: [], beats: 1 }, [0, 7], { degrees: [], beats: 1 }, [1, 8],
        { degrees: [], beats: 1 }, [2, 9], { degrees: [], beats: 1 }, [1, 8],
      ],
    },
    fingering: {
      right: [[1, 5], null, [1, 5], null, [1, 5], null, [1, 5], null],
      left: [null, [5, 1], null, [5, 1], null, [5, 1], null, [5, 1]],
    },
  },
  {
    id: "octave-five-notes",
    interval: 12, // toutes les paires font une octave juste — vérifié note par note
    family: "octaves",
    title: "Octaves sur cinq notes",
    goal: "Déplacer l'octave sans la refermer entre deux",
    instruction:
      "Cinq octaves en montant, cinq en descendant. La main garde son écart : elle se déplace du poignet, elle ne se rouvre pas à chaque note.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 54,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    pattern: [
      [0, 7], [1, 8], [2, 9], [3, 10], [4, 11], [3, 10], [2, 9], [1, 8],
      [0, 7], [1, 8], [2, 9], [3, 10], [4, 11], [3, 10], [2, 9], [1, 8],
    ],
    fingering: {
      right: [
        [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5],
        [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5],
      ],
      left: [
        [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1],
        [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1],
      ],
    },
  },
  {
    id: "octave-staccato",
    interval: 12, // toutes les paires font une octave juste — vérifié note par note
    family: "octaves",
    title: "Octaves piquées",
    goal: "L'octave lâchée aussitôt jouée, par le poignet seul",
    instruction:
      "L'octave ne sonne qu'un huitième de temps. Le poignet rebondit, l'avant-bras ne pousse pas : c'est ce qui permet d'en jouer cent d'affilée.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 56,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Les octaves sur les degrés de l'accord et non de la gamme : le déplacement
    // est plus large, et le rebond du poignet doit donc emmener la main.
    pattern: [
      { degrees: [0, 7], holdBeats: 0.125 }, { degrees: [2, 9], holdBeats: 0.125 },
      { degrees: [4, 11], holdBeats: 0.125 }, { degrees: [2, 9], holdBeats: 0.125 },
      { degrees: [0, 7], holdBeats: 0.125 }, { degrees: [2, 9], holdBeats: 0.125 },
      { degrees: [4, 11], holdBeats: 0.125 }, { degrees: [2, 9], holdBeats: 0.125 },
      { degrees: [0, 7], holdBeats: 0.125 }, { degrees: [2, 9], holdBeats: 0.125 },
      { degrees: [4, 11], holdBeats: 0.125 }, { degrees: [2, 9], holdBeats: 0.125 },
      { degrees: [0, 7], holdBeats: 0.125 }, { degrees: [2, 9], holdBeats: 0.125 },
      { degrees: [4, 11], holdBeats: 0.125 }, { degrees: [2, 9], holdBeats: 0.125 },
    ],
    fingering: {
      right: [
        [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5],
        [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5],
      ],
      left: [
        [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1],
        [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1],
      ],
    },
  },
  {
    id: "octave-and-sixth",
    family: "octaves",
    title: "Octave et sixte alternées",
    goal: "Ouvrir et refermer la main à chaque temps",
    instruction:
      "Octave, sixte, octave, sixte. La main ne reste jamais dans la même ouverture — et les deux notes doivent sonner ensemble dans les deux.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 52,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    pattern: [
      [0, 7], [0, 5], [1, 8], [1, 6], [2, 9], [2, 7], [1, 8], [1, 6],
      [0, 7], [0, 5], [1, 8], [1, 6], [2, 9], [2, 7], [1, 8], [1, 6],
    ],
    fingering: {
      right: [
        [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5],
        [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5], [1, 5],
      ],
      left: [
        [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1],
        [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1], [5, 1],
      ],
    },
  },
  {
    id: "octave-chromatic",
    interval: 12, // toutes les paires font une octave juste — vérifié note par note
    family: "octaves",
    title: "Octaves chromatiques",
    goal: "Le 5 sur les blanches, le 4 sur les noires — tout le sujet des octaves",
    instruction:
      "Sur les touches noires, c'est le quatrième doigt qui prend la note du haut, pas le cinquième. Ce changement est ce qui rend les octaves chromatiques jouables.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    // Parallèle obligatoirement : un motif chromatique ne se met pas en miroir
    // diatonique (§ 6, M1).
    bothMode: "parallel",
    supportedKeys: ["C"],
    defaultTempo: 50,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Le doigté 5-4 sur les noires est *la* raison pour laquelle les degrés
    // altérés ont été ajoutés au générateur (M1) : sans eux, cet exercice — le
    // plus utile de la famille — était impossible à écrire.
    pattern: [
      [0, 7], ["0#", "7#"], [1, 8], ["1#", "8#"], [2, 9], [3, 10],
      ["3#", "10#"], [4, 11], ["4#", "11#"], [5, 12], ["5#", "12#"], [6, 13],
      { degrees: [7, 14], beats: 2 },
    ],
    fingering: {
      right: [
        [1, 5], [1, 4], [1, 5], [1, 4], [1, 5], [1, 5],
        [1, 4], [1, 5], [1, 4], [1, 5], [1, 4], [1, 5],
        [1, 5],
      ],
      left: [
        [5, 1], [4, 1], [5, 1], [4, 1], [5, 1], [5, 1],
        [4, 1], [5, 1], [4, 1], [5, 1], [4, 1], [5, 1],
        [5, 1],
      ],
    },
  },
  {
    id: "octave-broken",
    family: "octaves",
    title: "Octaves brisées",
    goal: "Alterner les deux notes de l'octave, sans refermer la main",
    instruction:
      "La note du bas, celle du haut, l'une après l'autre. La main reste ouverte tout du long : c'est le poignet qui bascule d'un côté puis de l'autre.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 54,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.25,
    restBeats: 4,
    // L'octave brisée est ce qui permet de survivre à un long passage d'octaves :
    // le poignet bascule au lieu de porter tout le poids à chaque fois.
    pattern: [
      0, 7, 0, 7, 1, 8, 1, 8, 2, 9, 2, 9, 1, 8, 1, 8,
      0, 7, 0, 7, 1, 8, 1, 8, 2, 9, 2, 9, 1, 8, 1, 8,
    ],
    fingering: {
      right: [
        1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5,
        1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5,
      ],
      left: [
        5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1,
        5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1,
      ],
    },
  },
  {
    id: "octave-contrary-motion",
    interval: 12, // toutes les paires font une octave juste — vérifié note par note
    family: "octaves",
    title: "Octaves aux deux mains en sens opposé",
    goal: "Deux octaves qui s'écartent, deux poignets à surveiller",
    instruction:
      "La droite monte, la gauche descend, chacune en octaves. Deux mains ouvertes à l'octave qui partent en sens contraire : garde le poignet bas des deux côtés.",
    difficulty: "advanced",
    // Les deux mains jouent des octaves qui s'écartent : la gauche descend sous
    // sa tonique. `bothMode: "contrary"` ne le donnerait pas — il renverserait
    // les deux degrés de l'octave et la détruirait.
    supportedHands: ["right", "left", "both"],
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 50,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    patternByHand: {
      right: [
        [0, 7], [1, 8], [2, 9], [1, 8],
        [0, 7], [1, 8], [2, 9], [1, 8],
        [0, 7], [1, 8], [2, 9], [1, 8],
        [0, 7], [1, 8], [2, 9], [1, 8],
      ],
      left: [
        [-7, 0], [-8, -1], [-9, -2], [-8, -1],
        [-7, 0], [-8, -1], [-9, -2], [-8, -1],
        [-7, 0], [-8, -1], [-9, -2], [-8, -1],
        [-7, 0], [-8, -1], [-9, -2], [-8, -1],
      ],
    },
    fingering: {
      right: [
        [1, 5], [1, 5], [1, 5], [1, 5],
        [1, 5], [1, 5], [1, 5], [1, 5],
        [1, 5], [1, 5], [1, 5], [1, 5],
        [1, 5], [1, 5], [1, 5], [1, 5],
      ],
      left: [
        [5, 1], [5, 1], [5, 1], [5, 1],
        [5, 1], [5, 1], [5, 1], [5, 1],
        [5, 1], [5, 1], [5, 1], [5, 1],
        [5, 1], [5, 1], [5, 1], [5, 1],
      ],
    },
  },
  // ==========================================================================
  //  Trilles — battements entre deux doigts voisins
  //
  //  Les trois niveaux Débutant isolent chacun **une** paire de doigts, dans
  //  l'ordre où elles cèdent : 2-3 d'abord, 3-4 ensuite, 1-2 en dernier — le
  //  pouce bat mal parce qu'il tourne au lieu de descendre.
  // ==========================================================================
  {
    id: "trill-2-3",
    family: "trills",
    title: "Battement 2-3",
    goal: "Deux doigts voisins qui alternent sans que la main bouge",
    instruction:
      "Sept battements, puis une croche de repos. Le poignet ne bouge pas d'un millimètre : ce sont les deux doigts, seuls.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    pattern: [
      1, 2, 1, 2, 1, 2, 1, { degrees: [], beats: 0.5 },
      1, 2, 1, 2, 1, 2, 1, { degrees: [], beats: 0.5 },
    ],
    fingering: {
      right: [2, 3, 2, 3, 2, 3, 2, null, 2, 3, 2, 3, 2, 3, 2, null],
      left: [4, 3, 4, 3, 4, 3, 4, null, 4, 3, 4, 3, 4, 3, 4, null],
    },
  },
  {
    id: "trill-3-4",
    family: "trills",
    title: "Battement 3-4",
    goal: "La paire de doigts qui bat le plus mal",
    instruction:
      "Le quatrième doigt n'a pas de tendon indépendant : il suivra le troisième si tu vas trop vite. Ralentis jusqu'à ce que les deux notes soient égales.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 54,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    pattern: [
      2, 3, 2, 3, 2, 3, 2, { degrees: [], beats: 0.5 },
      2, 3, 2, 3, 2, 3, 2, { degrees: [], beats: 0.5 },
    ],
    fingering: {
      right: [3, 4, 3, 4, 3, 4, 3, null, 3, 4, 3, 4, 3, 4, 3, null],
      left: [3, 2, 3, 2, 3, 2, 3, null, 3, 2, 3, 2, 3, 2, 3, null],
    },
  },
  {
    id: "trill-1-2",
    family: "trills",
    title: "Battement 1-2",
    goal: "Battre avec le pouce, qui descend au lieu de tourner",
    instruction:
      "Le pouce doit descendre droit sur sa touche, pas pivoter de côté. C'est ce pivot qui rend le battement du pouce inégal.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 56,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    pattern: [
      0, 1, 0, 1, 0, 1, 0, { degrees: [], beats: 0.5 },
      0, 1, 0, 1, 0, 1, 0, { degrees: [], beats: 0.5 },
    ],
    fingering: {
      right: [1, 2, 1, 2, 1, 2, 1, null, 1, 2, 1, 2, 1, 2, 1, null],
      left: [5, 4, 5, 4, 5, 4, 5, null, 5, 4, 5, 4, 5, 4, 5, null],
    },
  },
  {
    id: "trill-measured-four",
    family: "trills",
    title: "Trille mesuré en quatre notes",
    goal: "Compter le trille au lieu de l'improviser",
    instruction:
      "Quatre notes par temps, exactement. Un trille se travaille mesuré avant d'être libre — sinon il accélère et se bloque.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 56,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.25,
    restBeats: 4,
    pattern: [
      1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, { degrees: 1, beats: 1 },
      1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, { degrees: 1, beats: 1 },
    ],
    fingering: {
      right: [2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2],
      left: [4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4],
    },
  },
  {
    id: "trill-mordent",
    family: "trills",
    title: "Mordant et note piquée",
    goal: "Deux notes très brèves collées à la note principale",
    instruction:
      "Deux notes rapides, puis la note tenue, puis une note piquée. Le mordant se joue *sur* le temps, pas avant : la note principale ne doit pas arriver en retard.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 56,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Le premier ornement du catalogue qui n'est pas un battement régulier : les
    // deux notes du mordant durent un huitième de temps, le pas le plus court que
    // ce mode accepte.
    pattern: [
      { degrees: 2, beats: 0.125 }, { degrees: 1, beats: 0.125 }, { degrees: 2, beats: 0.75 },
      { degrees: 2, beats: 1, holdBeats: 0.25 },
      { degrees: 3, beats: 0.125 }, { degrees: 2, beats: 0.125 }, { degrees: 3, beats: 0.75 },
      { degrees: 3, beats: 1, holdBeats: 0.25 },
      { degrees: 2, beats: 0.125 }, { degrees: 1, beats: 0.125 }, { degrees: 2, beats: 0.75 },
      { degrees: 2, beats: 1, holdBeats: 0.25 },
      { degrees: 3, beats: 0.125 }, { degrees: 2, beats: 0.125 }, { degrees: 3, beats: 0.75 },
      { degrees: 3, beats: 1, holdBeats: 0.25 },
    ],
    fingering: {
      right: [3, 2, 3, 3, 4, 3, 4, 4, 3, 2, 3, 3, 4, 3, 4, 4],
      left: [3, 4, 3, 3, 2, 3, 2, 2, 3, 4, 3, 3, 2, 3, 2, 2],
    },
  },
  {
    id: "trill-with-held-fifth",
    family: "trills",
    title: "Trille avec le 5 qui tient",
    goal: "Battre pendant qu'un autre doigt de la même main tient",
    instruction:
      "Le doigt du haut tient toute la mesure, les deux doigts du milieu battent. Si la tenue se relève, c'est qu'elle aide le battement — recommence plus lentement.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 52,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.25,
    restBeats: 4,
    // D'après Pischna : le trille sous une tenue. C'est ce qui relie cette famille
    // au Déliement — sauf qu'ici les doigts libres battent au lieu de parcourir.
    pattern: [
      { degrees: [1, 4], holdBeats: [0.25, 4] },
      2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2,
      { degrees: [2, 4], holdBeats: [0.25, 4] },
      3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3,
    ],
    fingering: {
      right: [
        [2, 5], 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3,
        [3, 5], 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4,
      ],
      left: [
        [4, 1], 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3,
        [3, 1], 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2,
      ],
    },
  },
  {
    id: "trill-4-5",
    family: "trills",
    title: "Trille 4-5 en doubles-croches",
    goal: "Les deux doigts les plus faibles, en battement rapide",
    instruction:
      "Le trille le plus dur du clavier. Ne cherche pas la vitesse : cherche deux notes de même force, et la vitesse viendra d'elle-même.",
    difficulty: "advanced",
    // Le 4 et le 5 d'une main ne sont pas sur les mêmes degrés que ceux de
    // l'autre : à droite ils sont en haut de la position, à gauche en bas. Sans
    // deux motifs, une des deux mains travaillerait son pouce et son index.
    supportedHands: ["right", "left", "both"],
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 50,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.25,
    restBeats: 4,
    patternByHand: {
      right: [
        3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4,
        3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4,
      ],
      left: [
        1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0,
        1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0,
      ],
    },
    fingering: {
      right: [
        4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5,
        4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5,
      ],
      left: [
        4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5,
        4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5,
      ],
    },
  },
  {
    id: "trill-chromatic",
    family: "trills",
    title: "Trille chromatique",
    goal: "Battre entre une blanche et une noire, à un demi-ton",
    instruction:
      "Un demi-ton seulement, et l'une des deux touches est en hauteur. Le doigt sur la noire descend plus loin — c'est lui qui va être en retard.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    // Parallèle : un motif altéré ne se met pas en miroir diatonique (§ 6, M1).
    bothMode: "parallel",
    supportedKeys: ["C"],
    defaultTempo: 52,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.25,
    restBeats: 4,
    // Mi contre ré♯, puis la contre sol♯ : dans les deux cas une blanche et une
    // noire à un demi-ton. La différence de hauteur des deux touches est la
    // vraie difficulté, pas l'intervalle.
    pattern: [
      2, "1#", 2, "1#", 2, "1#", 2, "1#", 2, "1#", 2, "1#", 2, "1#", 2, "1#",
      5, "4#", 5, "4#", 5, "4#", 5, "4#", 5, "4#", 5, "4#", 5, "4#", 5, "4#",
    ],
    fingering: {
      right: [
        3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2,
        3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2,
      ],
      left: [
        2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3,
        2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3,
      ],
    },
  },
  {
    id: "trill-gruppetto-chain",
    family: "trills",
    title: "Gruppetto enchaîné",
    goal: "Un groupe de quatre notes sur chaque degré, sans rupture entre eux",
    instruction:
      "Quatre notes par temps, un tour complet autour de chaque note. Le dernier doigt d'un groupe et le premier du suivant ne doivent pas se marcher dessus.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 52,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.25,
    restBeats: 4,
    // Le gruppetto est l'ornement le plus fréquent du répertoire classique après
    // le trille, et il enchaîne : c'est le passage d'un groupe au suivant qu'on
    // travaille ici, pas le groupe lui-même.
    pattern: [
      2, 1, 0, 1, 3, 2, 1, 2, 4, 3, 2, 3, 3, 2, 1, 2,
      2, 1, 0, 1, 3, 2, 1, 2, 4, 3, 2, 3, 3, 2, 1, 2,
    ],
    fingering: {
      right: [
        3, 2, 1, 2, 4, 3, 2, 3, 5, 4, 3, 4, 4, 3, 2, 3,
        3, 2, 1, 2, 4, 3, 2, 3, 5, 4, 3, 4, 4, 3, 2, 3,
      ],
      left: [
        3, 4, 5, 4, 2, 3, 4, 3, 1, 2, 3, 2, 2, 3, 4, 3,
        3, 4, 5, 4, 2, 3, 4, 3, 1, 2, 3, 2, 2, 3, 4, 3,
      ],
    },
  },
  // ==========================================================================
  //  Extension — écarter, et passer un doigt par-dessus
  //
  //  La **substitution** — changer de doigt sur une touche qui reste enfoncée —
  //  était prévue dans cette famille et n'y est pas. Le format ne sait pas
  //  l'écrire : une note porte un doigt, pas deux, et la notater en deux notes
  //  dirait le contraire de ce qu'il faut faire (ne pas relâcher). Plutôt que de
  //  mentir dans le rouleau, elle est laissée de côté — voir
  //  plan/exercices-catalogue.md § 8.
  // ==========================================================================
  {
    id: "extension-sixth",
    family: "extension",
    title: "Écart de sixte, 1 et 5",
    goal: "Atteindre la sixte sans tirer sur le poignet",
    instruction:
      "Le pouce, puis le petit doigt une sixte plus loin. C'est la paume qui s'ouvre, pas le bras qui tire — le poignet reste droit.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 58,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Les deux notes jouées **l'une après l'autre** et non ensemble : ici c'est
    // l'atteinte qu'on travaille, pas la simultanéité — celle-là est le sujet des
    // Doubles notes.
    pattern: [
      0, 5, 0, 5, 0, 5, 0, { degrees: [], beats: 0.5 },
      0, 5, 0, 5, 0, 5, 0, { degrees: [], beats: 0.5 },
    ],
    fingering: {
      right: [1, 5, 1, 5, 1, 5, 1, null, 1, 5, 1, 5, 1, 5, 1, null],
      left: [5, 1, 5, 1, 5, 1, 5, null, 5, 1, 5, 1, 5, 1, 5, null],
    },
  },
  {
    id: "extension-two-over-thumb",
    family: "extension",
    title: "Passer le 2 par-dessus le pouce",
    goal: "L'inverse du passage du pouce : c'est le doigt qui enjambe",
    instruction:
      "Le pouce joue, puis l'index passe par-dessus lui pour aller plus loin. Le pouce reste en place jusqu'au dernier moment.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 54,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    pattern: [
      2, 1, 2, 1, 2, 1, 2, { degrees: [], beats: 0.5 },
      2, 1, 2, 1, 2, 1, 2, { degrees: [], beats: 0.5 },
    ],
    fingering: {
      right: [1, 2, 1, 2, 1, 2, 1, null, 1, 2, 1, 2, 1, 2, 1, null],
      left: [1, 2, 1, 2, 1, 2, 1, null, 1, 2, 1, 2, 1, 2, 1, null],
    },
  },
  {
    id: "extension-five-over-sixth",
    family: "extension",
    title: "Cinq doigts sur une sixte",
    goal: "La même position de cinq doigts, élargie d'un degré",
    instruction:
      "Cinq doigts, mais une sixte au lieu d'une quinte : un degré est sauté. Cherche lequel — c'est là que la main doit s'ouvrir.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 56,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Le troisième degré est sauté : la main couvre une sixte avec les mêmes cinq
    // doigts, et c'est entre le 3 et le 4 que l'écart se fait.
    pattern: [
      0, 1, 2, 4, 5, 4, 2, 1,
      0, 1, 2, 4, 5, 4, 2, 1,
    ],
    fingering: {
      right: [1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2],
      left: [5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4],
    },
  },
  {
    id: "extension-seventh",
    family: "extension",
    title: "Écart de septième",
    goal: "Un degré de plus que la sixte, sans forcer",
    instruction:
      "Si la main tire, arrête-toi à la sixte : une extension travaillée en force ne s'élargit pas, elle se blesse.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 54,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    pattern: [
      0, 6, 0, 6, 0, 6, 0, { degrees: [], beats: 0.5 },
      0, 6, 0, 6, 0, 6, 0, { degrees: [], beats: 0.5 },
    ],
    fingering: {
      right: [1, 5, 1, 5, 1, 5, 1, null, 1, 5, 1, 5, 1, 5, 1, null],
      left: [5, 1, 5, 1, 5, 1, 5, null, 5, 1, 5, 1, 5, 1, 5, null],
    },
  },
  {
    id: "extension-three-over-thumb",
    family: "extension",
    title: "Le 3 par-dessus le pouce",
    goal: "Un enjambement plus large que celui de l'index",
    instruction:
      "Le majeur passe par-dessus le pouce et va chercher une note plus loin que l'index ne l'aurait fait. La main pivote légèrement, le poignet ne monte pas.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 52,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    pattern: [
      3, 1, 3, 1, 3, 1, 3, { degrees: [], beats: 0.5 },
      3, 1, 3, 1, 3, 1, 3, { degrees: [], beats: 0.5 },
    ],
    fingering: {
      right: [1, 3, 1, 3, 1, 3, 1, null, 1, 3, 1, 3, 1, 3, 1, null],
      left: [1, 3, 1, 3, 1, 3, 1, null, 1, 3, 1, 3, 1, 3, 1, null],
    },
  },
  {
    id: "extension-five-over-octave",
    family: "extension",
    title: "Cinq doigts sur une octave",
    goal: "La position la plus ouverte que cinq doigts puissent tenir",
    instruction:
      "Cinq doigts pour une octave : chaque doigt saute un degré ou deux. La paume est ouverte au maximum, et doit le rester du début à la fin.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 52,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Do-mi-sol-la-do : l'accord de sixte ajoutée, qui se trouve être la seule
    // position de cinq doigts couvrant une octave sans écart impossible entre
    // deux doigts voisins.
    pattern: [
      0, 2, 4, 5, 7, 5, 4, 2,
      0, 2, 4, 5, 7, 5, 4, 2,
    ],
    fingering: {
      right: [1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2],
      left: [5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4],
    },
  },
  {
    id: "extension-octave-with-hold",
    family: "extension",
    title: "Écart d'octave, pouce tenu",
    goal: "Garder l'octave ouverte pendant que les doigts du haut jouent",
    instruction:
      "Le pouce tient sa touche toute la mesure, une octave plus bas. Les deux doigts du haut jouent par-dessus, et l'écart ne doit pas se refermer.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 50,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // La tenue transforme l'extension en travail continu : la main ne peut plus
    // se refermer entre deux notes, ce que tous les exercices précédents lui
    // permettaient.
    pattern: [
      { degrees: [0, 7], holdBeats: [4, 0.5] },
      5, 7, 5, 7, 5, 7, 5,
      { degrees: [0, 7], holdBeats: [4, 0.5] },
      5, 7, 5, 7, 5, 7, 5,
    ],
    fingering: {
      right: [[1, 5], 4, 5, 4, 5, 4, 5, 4, [1, 5], 4, 5, 4, 5, 4, 5, 4],
      left: [[5, 1], 2, 1, 2, 1, 2, 1, 2, [5, 1], 2, 1, 2, 1, 2, 1, 2],
    },
  },
  {
    id: "extension-open-and-close",
    family: "extension",
    title: "Ouvrir et refermer",
    goal: "Passer de la quinte à l'octave et revenir, sans à-coup",
    instruction:
      "Quinte, octave, quinte, octave. Ce n'est pas l'écart le plus grand qui compte ici, c'est le passage de l'un à l'autre.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 54,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    pattern: [
      0, 4, 0, 7, 0, 4, 0, 7,
      0, 4, 0, 7, 0, 4, 0, 7,
    ],
    fingering: {
      right: [1, 4, 1, 5, 1, 4, 1, 5, 1, 4, 1, 5, 1, 4, 1, 5],
      left: [5, 2, 5, 1, 5, 2, 5, 1, 5, 2, 5, 1, 5, 2, 5, 1],
    },
  },
  {
    id: "extension-contrary-motion",
    family: "extension",
    title: "Extension en mouvement contraire",
    goal: "Deux mains ouvertes à l'octave, qui s'écartent",
    instruction:
      "Les deux mains, ouvertes au maximum, partent en sens opposé. Surveille celle qui se referme sans que tu t'en aperçoives.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    bothMode: "contrary",
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 50,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    pattern: [
      0, 2, 4, 5, 7, 5, 4, 2,
      0, 2, 4, 5, 7, 5, 4, 2,
    ],
    fingering: {
      // Mouvement contraire : même doigté écrit pour les deux mains, avant miroir.
      right: [1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2],
      left: [1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2],
    },
  },
  // ==========================================================================
  //  Coordination des mains — deux choses à la fois
  //
  //  La seule famille dont **tous** les exercices ont deux motifs distincts. Sans
  //  `patternByHand` (plan § 6, M2) aucun n'aurait pu s'écrire : le deux contre
  //  trois, le canon, une main legato et l'autre piquée ne sont pas des
  //  variantes d'un motif commun.
  //
  //  Elle est en dernier dans l'ordre du catalogue parce qu'elle suppose les
  //  autres : deux mains coordonnées mais inégales ne coordonnent rien.
  // ==========================================================================
  {
    id: "coord-one-holds-one-plays",
    family: "coordination",
    title: "Une main tient, l'autre joue",
    goal: "Ne pas laisser la main occupée entraîner celle qui ne fait rien",
    instruction:
      "Une main tient une seule note pendant toute la mesure, l'autre joue huit croches. La tenue ne doit pas bouger, ni appuyer au rythme de l'autre main.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Le premier degré de la coordination : faire deux choses de durées
    // différentes. La tenue paraît facile — c'est justement pour cela qu'on
    // s'aperçoit qu'elle suit le rythme de l'autre main sans le vouloir.
    patternByHand: {
      right: [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1],
      left: [
        { degrees: 0, beats: 4 },
        { degrees: 4, beats: 4 },
      ],
    },
    fingering: {
      right: [1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2],
      left: [5, 1],
    },
  },
  {
    id: "coord-alternating-bars",
    family: "coordination",
    title: "Alternance mesure par mesure",
    goal: "Entrer et sortir à l'heure, chacune son tour",
    instruction:
      "Une mesure chacune. La main qui attend compte les temps : elle doit partir exactement sur le premier, sans hésiter ni anticiper.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    patternByHand: {
      right: [0, 1, 2, 3, 4, 3, 2, 1, { degrees: [], beats: 4 }],
      left: [{ degrees: [], beats: 4 }, 0, 1, 2, 3, 4, 3, 2, 1],
    },
    fingering: {
      right: [1, 2, 3, 4, 5, 4, 3, 2, null],
      left: [null, 5, 4, 3, 2, 1, 2, 3, 4],
    },
  },
  {
    id: "coord-two-against-one",
    family: "coordination",
    title: "Deux contre un",
    goal: "Une main deux fois plus lente que l'autre",
    instruction:
      "Deux croches à droite pour une noire à gauche. Compte les noires : ce sont elles qui portent la mesure, les croches se posent dessus.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 58,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Le rapport le plus simple entre deux mains, et le seul où l'une des deux
    // tombe toujours avec l'autre. C'est ce qui en fait le niveau Débutant : il
    // n'y a pas encore de note à placer « entre » deux notes de l'autre main.
    patternByHand: {
      right: [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1],
      left: [
        { degrees: 0, beats: 1 }, { degrees: 2, beats: 1 },
        { degrees: 4, beats: 1 }, { degrees: 2, beats: 1 },
        { degrees: 0, beats: 1 }, { degrees: 2, beats: 1 },
        { degrees: 4, beats: 1 }, { degrees: 2, beats: 1 },
      ],
    },
    fingering: {
      right: [1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2],
      left: [5, 3, 1, 3, 5, 3, 1, 3],
    },
  },
  {
    id: "coord-offset-accents",
    family: "coordination",
    title: "Accents décalés entre les mains",
    goal: "Appuyer d'une main pendant que l'autre reste légère",
    instruction:
      "Les deux mains jouent les mêmes croches, mais n'appuient pas aux mêmes. Chaque main doit ignorer l'accent de l'autre — c'est le plus dur de l'exercice.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 58,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Même rythme, même dessin, accents différents : c'est l'exercice qui isole
    // la coordination de la *nuance*, indépendamment de celle du rythme. Rien ne
    // la mesure dans l'application — l'oreille seule, comme pour la famille
    // Égalité.
    patternByHand: {
      right: [
        { degrees: 0, accent: true }, 1, 2, 3, { degrees: 4, accent: true }, 3, 2, 1,
        { degrees: 0, accent: true }, 1, 2, 3, { degrees: 4, accent: true }, 3, 2, 1,
      ],
      left: [
        0, 1, { degrees: 2, accent: true }, 3, 4, 3, { degrees: 2, accent: true }, 1,
        0, 1, { degrees: 2, accent: true }, 3, 4, 3, { degrees: 2, accent: true }, 1,
      ],
    },
    fingering: {
      right: [1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2],
      left: [5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4],
    },
  },
  {
    id: "coord-canon-one-beat",
    family: "coordination",
    title: "Canon à un temps",
    goal: "Jouer le même dessin que l'autre main, un temps plus tard",
    instruction:
      "La main gauche répète ce que la droite vient de jouer, un temps après. Ne l'écoute pas trop : si tu la suis, tu ralentiras avec elle.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 58,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Le canon est le cas où les deux mains font la **même** chose et où c'est
    // pourtant le plus difficile : l'oreille veut les remettre ensemble. La
    // gauche entre un temps après et s'arrête donc un temps avant la fin — c'est
    // ce qui garde les deux motifs à huit temps chacun.
    patternByHand: {
      right: [
        0, 1, 2, 3, 4, 3, 2, 1,
        0, 1, 2, 3, 4, 3, 2, 1,
      ],
      left: [
        { degrees: [], beats: 1 },
        0, 1, 2, 3, 4, 3, 2, 1,
        0, 1, 2, 3, 4, 3,
      ],
    },
    fingering: {
      right: [1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2],
      left: [null, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2, 1, 2],
    },
  },
  {
    id: "coord-three-against-two",
    family: "coordination",
    title: "Trois contre deux",
    goal: "Trois notes d'une main contre deux de l'autre",
    instruction:
      "Trois notes à droite pour deux à gauche. Seules la première de chaque temps tombent ensemble — les autres ne se rencontrent jamais, et c'est normal.",
    difficulty: "intermediate",
    supportedHands: ["right", "left", "both"],
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 54,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Le premier rapport où une note d'une main tombe *entre* deux notes de
    // l'autre. C'est là que compter cesse de marcher et qu'il faut sentir les
    // deux groupes à la fois.
    patternByHand: {
      right: [
        { degrees: 0, beats: 1 / 3 }, { degrees: 1, beats: 1 / 3 }, { degrees: 2, beats: 1 / 3 },
        { degrees: 3, beats: 1 / 3 }, { degrees: 4, beats: 1 / 3 }, { degrees: 3, beats: 1 / 3 },
        { degrees: 2, beats: 1 / 3 }, { degrees: 1, beats: 1 / 3 }, { degrees: 0, beats: 1 / 3 },
        { degrees: 1, beats: 1 / 3 }, { degrees: 2, beats: 1 / 3 }, { degrees: 3, beats: 1 / 3 },
        { degrees: 0, beats: 1 / 3 }, { degrees: 1, beats: 1 / 3 }, { degrees: 2, beats: 1 / 3 },
        { degrees: 3, beats: 1 / 3 }, { degrees: 4, beats: 1 / 3 }, { degrees: 3, beats: 1 / 3 },
        { degrees: 2, beats: 1 / 3 }, { degrees: 1, beats: 1 / 3 }, { degrees: 0, beats: 1 / 3 },
        { degrees: 1, beats: 1 / 3 }, { degrees: 2, beats: 1 / 3 }, { degrees: 3, beats: 1 / 3 },
      ],
      left: [
        0, 1, 2, 3, 4, 3, 2, 1,
        0, 1, 2, 3, 4, 3, 2, 1,
      ],
    },
    fingering: {
      right: [
        1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4,
        1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4,
      ],
      left: [5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4],
    },
  },
  {
    id: "coord-four-against-three",
    family: "coordination",
    title: "Quatre contre trois",
    goal: "Le rapport que le comptage ne résout pas",
    instruction:
      "Quatre doubles-croches à droite contre trois triolets à gauche. Ne compte pas les deux : sens le temps entier, et laisse chaque main le remplir à sa façon.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 50,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.25,
    restBeats: 4,
    // Quatre contre trois n'est pas « trois contre deux en plus rapide » : le plus
    // petit commun multiple est douze, et aucune note ne retombe avec l'autre
    // main à l'intérieur du temps. C'est le rapport où il faut cesser de compter.
    patternByHand: {
      right: [
        0, 1, 2, 3, 4, 3, 2, 1,
        0, 1, 2, 3, 4, 3, 2, 1,
      ],
      left: [
        { degrees: 0, beats: 1 / 3 }, { degrees: 1, beats: 1 / 3 }, { degrees: 2, beats: 1 / 3 },
        { degrees: 3, beats: 1 / 3 }, { degrees: 4, beats: 1 / 3 }, { degrees: 3, beats: 1 / 3 },
        { degrees: 2, beats: 1 / 3 }, { degrees: 1, beats: 1 / 3 }, { degrees: 0, beats: 1 / 3 },
        { degrees: 1, beats: 1 / 3 }, { degrees: 2, beats: 1 / 3 }, { degrees: 3, beats: 1 / 3 },
      ],
    },
    fingering: {
      right: [1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2],
      left: [5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2],
    },
  },
  {
    id: "coord-legato-against-staccato",
    family: "coordination",
    title: "Legato d'une main, piqué de l'autre",
    goal: "Deux touchers différents en même temps",
    instruction:
      "La droite lie, la gauche pique. Chaque main garde son toucher jusqu'au bout : dès que l'attention se porte sur l'une, l'autre l'imite.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 56,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // C'est ici que l'articulation trouve sa place la plus difficile, faute d'être
    // une famille à elle (plan § 4) : deux touchers à la fois. L'écriture est
    // exacte — la gauche sonne un huitième de temps —, mais rien dans
    // l'application ne juge un piqué. L'oreille, encore.
    patternByHand: {
      right: [
        0, 1, 2, 3, 4, 3, 2, 1,
        0, 1, 2, 3, 4, 3, 2, 1,
      ],
      left: [
        { degrees: 0, holdBeats: 0.125 }, { degrees: 1, holdBeats: 0.125 },
        { degrees: 2, holdBeats: 0.125 }, { degrees: 3, holdBeats: 0.125 },
        { degrees: 4, holdBeats: 0.125 }, { degrees: 3, holdBeats: 0.125 },
        { degrees: 2, holdBeats: 0.125 }, { degrees: 1, holdBeats: 0.125 },
        { degrees: 0, holdBeats: 0.125 }, { degrees: 1, holdBeats: 0.125 },
        { degrees: 2, holdBeats: 0.125 }, { degrees: 3, holdBeats: 0.125 },
        { degrees: 4, holdBeats: 0.125 }, { degrees: 3, holdBeats: 0.125 },
        { degrees: 2, holdBeats: 0.125 }, { degrees: 1, holdBeats: 0.125 },
      ],
    },
    fingering: {
      right: [1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2],
      left: [5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4],
    },
  },
  {
    id: "coord-two-rhythms-contrary",
    family: "coordination",
    title: "Deux rythmes en sens opposé",
    goal: "Rythmes différents et directions opposées, en même temps",
    instruction:
      "La droite monte en croches, la gauche descend en noires. Deux vitesses et deux directions : ne regarde qu'une main, l'autre doit tenir seule.",
    difficulty: "advanced",
    supportedHands: ["right", "left", "both"],
    supportedKeys: ["C", "G", "F"],
    defaultTempo: 54,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 0.5,
    restBeats: 4,
    // Le dernier exercice du catalogue, et celui qui cumule le plus : deux
    // rythmes, deux directions, et rien de commun entre les deux mains qu'un
    // premier temps sur quatre. La gauche descend sous sa tonique — degrés
    // négatifs, ce que le générateur sait faire depuis toujours.
    patternByHand: {
      right: [
        0, 1, 2, 3, 4, 3, 2, 1,
        0, 1, 2, 3, 4, 3, 2, 1,
      ],
      left: [
        { degrees: 0, beats: 1 }, { degrees: -1, beats: 1 },
        { degrees: -2, beats: 1 }, { degrees: -1, beats: 1 },
        { degrees: 0, beats: 1 }, { degrees: -1, beats: 1 },
        { degrees: -2, beats: 1 }, { degrees: -1, beats: 1 },
      ],
    },
    fingering: {
      right: [1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2],
      left: [1, 2, 3, 2, 1, 2, 3, 2],
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
    // Deux façons de définir « les deux mains » : un motif commun joué en
    // parallèle ou en miroir (`bothMode`), ou deux motifs distincts
    // (`patternByHand`) — le canon, le deux contre trois. L'une ou l'autre
    // suffit, mais le doigté des deux mains reste obligatoire dans les deux cas.
    const defined = Boolean(exercise.bothMode) || Boolean(exercise.patternByHand);
    return (
      defined &&
      Array.isArray(exercise.fingering.right) &&
      Array.isArray(exercise.fingering.left)
    );
  }
  return Array.isArray(exercise.fingering[hand]);
}
