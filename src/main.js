// ============================================================================
//  Synthesia Web — amorçage de l'application
//
//  main.js ne connaît que la coquille : les contrôles communs à toutes les
//  fonctionnalités (plein écran, mode paysage) et le registre passé à la
//  navigation. Chaque fonctionnalité gère elle-même son écran via le contrat
//  start(container) / stop() décrit dans plan/F1-navigation.md.
//
//  Ajouter une fonctionnalité = ajouter sa fiche à FEATURES.
// ============================================================================

import { initViewportControls } from "./viewport.js";
import { initNavigation } from "./navigation.js";
import { trainingFeature } from "./training-mode.js";
import { songFeature } from "./song-mode.js";
import { noteReadingFeature } from "./note-reading-mode.js";
import { fluencyFeature } from "./fluency-mode.js";
import { sheetReadingFeature } from "./sheet-reading-mode.js";
import { exerciseFeature } from "./exercise-mode.js";
import { rhythmFeature } from "./rhythm-mode.js";
import { earTrainingFeature } from "./ear-training-mode.js";
import { pedalFeature } from "./pedal-mode.js";
import { progressFeature } from "./progress-mode.js";

// Le Programme d'entraînement ouvre la liste : c'est lui qui dit par quoi
// commencer. Il ne se planifie pas lui-même (plan/04 § 3).
const FEATURES = [
  trainingFeature,
  songFeature,
  noteReadingFeature,
  fluencyFeature,      // niveau 4 de la Lecture de notes (plan/02 § 3)
  sheetReadingFeature, // suite directe de la Lecture de notes (plan/08)
  exerciseFeature,
  rhythmFeature,
  earTrainingFeature,
  pedalFeature,
  progressFeature, // consommateur pur du journal F3 — il ferme la liste
];

initViewportControls();
initNavigation(FEATURES);
