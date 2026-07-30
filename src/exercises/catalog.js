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
    goal: "Écarter, passer un doigt par-dessus, changer de doigt sur une tenue",
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
