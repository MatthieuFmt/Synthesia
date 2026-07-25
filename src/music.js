// ============================================================================
//  Fonctions musicales partagées
//
//  Hauteurs MIDI, touches blanches et noires, noms latins (Do, Ré, Mi…) et
//  position d'une note sur une portée. Ces fonctions ne dessinent rien et ne
//  connaissent ni le Canvas ni le DOM : elles sont utilisables par n'importe
//  quelle fonctionnalité (mode Morceau, Lecture de notes…) et testables sans
//  navigateur.
//
//  Extraites de `song-mode.js` lorsque la Lecture de notes en a eu besoin,
//  conformément à plan/F1-navigation.md § 6.
// ============================================================================

// Étendue d'un piano 88 touches : La0 → Do8.
export const MIDI_LOW = 21;
export const MIDI_HIGH = 108;

// Demi-tons appartenant à une touche blanche (Do, Ré, Mi, Fa, Sol, La, Si).
export const WHITE_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11];

export const LATIN_NAMES = ["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"];

// Degré diatonique (0..6) de chaque demi-ton ; les noires reprennent le degré
// de la blanche située juste en dessous + une altération dièse.
export const PC_TO_DEGREE = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
export const SHARP_PCS = new Set([1, 3, 6, 8, 10]);

// Symboles musicaux Unicode, rendus par les polices « serif » du système.
export const CLEF_GLYPH = {
  treble: "\u{1D11E}", // 𝄞 clé de sol
  bass: "\u{1D122}",   // 𝄢 clé de fa
};

// Référence : ligne du bas de la portée
//   - Clé de sol  -> Mi3 (MIDI 64)  index diatonique 37
//   - Clé de fa   -> Sol1 (MIDI 43) index diatonique 25
const TREBLE_BOTTOM = 37;
const BASS_BOTTOM = 25;

export function pitchClass(midi) {
  return ((midi % 12) + 12) % 12;
}

export function isWhite(midi) {
  return WHITE_PITCH_CLASSES.includes(pitchClass(midi));
}

export function diatonicIndex(midi) {
  return Math.floor(midi / 12) * 7 + PC_TO_DEGREE[pitchClass(midi)];
}

// Position verticale sur la portée, en demi-interlignes (0 = ligne du bas,
// +1 par degré vers le haut). Les lignes sont aux valeurs paires 0,2,4,6,8.
export function staffStep(midi, clef) {
  return diatonicIndex(midi) - (clef === "treble" ? TREBLE_BOTTOM : BASS_BOTTOM);
}

// Nom latin du degré, avec un dièse pour les touches noires : « Do », « Do♯ ».
export function noteDegreeName(midi) {
  const pc = pitchClass(midi);
  return LATIN_NAMES[PC_TO_DEGREE[pc]] + (SHARP_PCS.has(pc) ? "♯" : "");
}

// Numéro d'octave à l'anglaise (Do central = C4 = MIDI 60), utile pour
// distinguer deux notes de même nom : « Do3 » et « Do4 ».
export function octaveOf(midi) {
  return Math.floor(midi / 12) - 1;
}
