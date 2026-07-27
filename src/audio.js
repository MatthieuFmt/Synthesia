// ============================================================================
//  Audio partagé (Tone.js)
//
//  Chaque fonctionnalité crée sa propre chaîne audio avec `createAudio()` et la
//  libère dans son `stop()`. Rien n'est mis en cache entre deux visites : c'est
//  le prix de la garantie « rien ne survit à stop() » décrite dans
//  plan/F1-navigation.md § 12. Si le re-décodage des échantillons devient
//  gênant, c'est ici — et nulle part ailleurs — qu'un cache devra être ajouté.
//
//  Une chaîne libérée est définitivement morte : `ensureReady()` et
//  `playNote()` n'ont plus aucun effet, ce qui protège des rappels asynchrones
//  encore en vol au moment du changement de mode.
// ============================================================================

import * as Tone from "https://cdn.jsdelivr.net/npm/tone@14.8.49/+esm";
import { PERFORMANCE_PROFILE } from "./perf.js";

const SAMPLE_BASE_URL = "https://tonejs.github.io/audio/salamander/";

const FULL_PIANO_SAMPLES = {
  A0: "A0.mp3",
  C1: "C1.mp3",
  "D#1": "Ds1.mp3",
  "F#1": "Fs1.mp3",
  A1: "A1.mp3",
  C2: "C2.mp3",
  "D#2": "Ds2.mp3",
  "F#2": "Fs2.mp3",
  A2: "A2.mp3",
  C3: "C3.mp3",
  "D#3": "Ds3.mp3",
  "F#3": "Fs3.mp3",
  A3: "A3.mp3",
  C4: "C4.mp3",
  "D#4": "Ds4.mp3",
  "F#4": "Fs4.mp3",
  A4: "A4.mp3",
  C5: "C5.mp3",
  "D#5": "Ds5.mp3",
  "F#5": "Fs5.mp3",
  A5: "A5.mp3",
  C6: "C6.mp3",
  "D#6": "Ds6.mp3",
  "F#6": "Fs6.mp3",
  A6: "A6.mp3",
  C7: "C7.mp3",
  "D#7": "Ds7.mp3",
  "F#7": "Fs7.mp3",
  A7: "A7.mp3",
  C8: "C8.mp3",
};

// Profil bridé : le même piano, avec un échantillon par octave.
const LIGHT_PIANO_SAMPLES = {
  A0: "A0.mp3",
  C1: "C1.mp3",
  C2: "C2.mp3",
  C3: "C3.mp3",
  C4: "C4.mp3",
  C5: "C5.mp3",
  C6: "C6.mp3",
  C7: "C7.mp3",
  C8: "C8.mp3",
};

export function midiToNote(midi) {
  return Tone.Frequency(midi, "midi").toNote();
}

export function createAudio() {
  const audio = {
    ready: false,      // échantillons téléchargés : on peut jouer
    disposed: false,   // chaîne libérée : plus rien ne doit sonner
    sampler: null,     // exposé pour les usages avancés (Tone.Part du mode Morceau)
    reverb: null,
    pending: null,     // initialisation en cours, partagée entre les appelants

    // Doit être déclenché par un geste utilisateur (règle des navigateurs).
    async ensureReady() {
      if (audio.ready || audio.disposed) return;
      if (!audio.pending) {
        audio.pending = (async () => {
          await Tone.start();

          const sampler = new Tone.Sampler({
            urls: PERFORMANCE_PROFILE.lightAudio
              ? LIGHT_PIANO_SAMPLES
              : FULL_PIANO_SAMPLES,
            release: 1,
            baseUrl: SAMPLE_BASE_URL,
          });

          let reverb = null;
          if (PERFORMANCE_PROFILE.lightAudio) {
            sampler.toDestination();
          } else {
            reverb = new Tone.Reverb({ decay: 1.6, wet: 0.18 }).toDestination();
            sampler.connect(reverb);
          }
          sampler.volume.value = -6;

          // Quitter la fonctionnalité pendant l'initialisation ne doit pas
          // laisser un échantillonneur branché sur la sortie audio.
          if (audio.disposed) {
            sampler.dispose();
            reverb?.dispose();
            return;
          }

          audio.sampler = sampler;
          audio.reverb = reverb;
          await Tone.loaded(); // attendre le téléchargement des échantillons
          if (audio.disposed) return; // dispose() a déjà libéré les nœuds
          audio.ready = true;
        })();
      }

      try {
        await audio.pending;
      } catch (error) {
        audio.sampler?.dispose();
        audio.reverb?.dispose();
        audio.sampler = null;
        audio.reverb = null;
        throw error;
      } finally {
        // Un échec doit pouvoir être retenté au geste suivant.
        if (!audio.ready) audio.pending = null;
      }
    },

    // Joue une note isolée. Sans effet si la chaîne a été libérée entre-temps.
    async playNote(midi, duration = 0.6, velocity = 0.8) {
      await audio.ensureReady();
      if (audio.disposed || !audio.ready) return;
      audio.sampler.triggerAttackRelease(
        midiToNote(midi),
        duration,
        undefined,
        velocity
      );
    },

    // Joue plusieurs hauteurs, ensemble (accord) ou l'une après l'autre. Les
    // attaques sont datées explicitement depuis `Tone.now()` : laisser le temps
    // indéfini ferait partir les notes d'un accord au fil des appels, donc
    // légèrement arpégées (plan/07-entrainement-oreille.md étape A).
    //
    // Rend la durée totale, dont l'appelant a besoin pour savoir quand le
    // stimulus est fini.
    async playNotes(midis, { playback = "sequential", duration = 0.9, gap = 0.6, velocity = 0.8 } = {}) {
      await audio.ensureReady();
      if (audio.disposed || !audio.ready) return 0;

      const start = Tone.now();
      const step = playback === "simultaneous" ? 0 : gap;
      midis.forEach((midi, index) => {
        audio.sampler.triggerAttackRelease(
          midiToNote(midi),
          duration,
          start + index * step,
          velocity
        );
      });
      return midis.length === 0 ? 0 : (midis.length - 1) * step + duration;
    },

    dispose() {
      audio.disposed = true;
      audio.sampler?.releaseAll?.();
      audio.sampler?.dispose();
      audio.reverb?.dispose();
      audio.sampler = null;
      audio.reverb = null;
      audio.ready = false;
      audio.pending = null;
    },
  };

  return audio;
}
