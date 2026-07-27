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
import { exerciseFeature } from "./exercise-mode.js";
import { rhythmFeature } from "./rhythm-mode.js";
import { earTrainingFeature } from "./ear-training-mode.js";

// Le Programme d'entraînement ouvre la liste : c'est lui qui dit par quoi
// commencer. Il ne se planifie pas lui-même (plan/04 § 3).
const FEATURES = [
  trainingFeature,
  songFeature,
  noteReadingFeature,
  exerciseFeature,
  rhythmFeature,
  earTrainingFeature,
];

initViewportControls();
initNavigation(FEATURES);
