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

// Tonalités déclarées. Le MVP n'en propose qu'une (plan/03 § 5, Débutant :
// « tonalité de Do majeur ») ; Sol et Fa majeur appartiennent à
// l'Intermédiaire et attendent leurs doigtés vérifiés.
export const KEYS = {
  C: { id: "C", label: "Do majeur", tonicPitchClass: 0 },
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
    id: "chords",
    label: "Accords",
    goal: "Placer plusieurs doigts ensemble avec précision",
    status: "available",
  },
  {
    id: "arpeggios",
    label: "Arpèges",
    goal: "Enchaîner les notes d'un accord sans rupture",
    status: "available",
  },
  { id: "scales", label: "Gammes", goal: "Passage du pouce et régularité", status: "soon" },
  {
    id: "coordination",
    label: "Coordination",
    goal: "Rendre les mains indépendantes",
    status: "soon",
  },
  { id: "rhythm", label: "Rythme", goal: "Stabiliser la pulsation", status: "soon" },
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
  {
    id: "five-finger-c-major-01",
    family: "finger-independence",
    title: "Cinq doigts en Do majeur",
    goal: "Régularité des cinq doigts",
    instruction: "Régularité avant vitesse : chaque doigt frappe avec la même force.",
    difficulty: "beginner",
    supportedHands: ["right", "left", "both"],
    bothMode: "parallel", // les deux mains jouent le même motif, à l'octave
    supportedKeys: ["C"],
    defaultTempo: 60,
    defaultRepetitions: 4,
    beatsPerBar: 4,
    beatsPerStep: 1,
    restBeats: 4, // une mesure de respiration entre deux séries
    pattern: [0, 1, 2, 3, 4, 3, 2, 1],
    fingering: {
      right: [1, 2, 3, 4, 5, 4, 3, 2],
      left: [5, 4, 3, 2, 1, 2, 3, 4],
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

export function exercisesOfFamily(familyId) {
  return EXERCISES.filter((exercise) => exercise.family === familyId);
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
