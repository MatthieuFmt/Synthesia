# Synthesia Web — Règles pour l'IA

## Projet

Application web type *Synthesia* pour l'apprentissage du piano. Lit des fichiers MIDI, affiche les notes sur un piano roll à défilement vertical (morceau démarre en bas, monte vers le haut), avec piano clavier interactif en bas de l'écran.

- **Stack** : HTML5 Canvas + JavaScript modules ES, pas de framework, pas de build step.
- **Audio** : [`Tone.js`](https://tonejs.github.io/) (synthèse + sampler piano)
- **MIDI parsing** : [`@tonejs/midi`](https://github.com/Tonejs/Midi) depuis CDN
- **Déploiement** : GitHub Pages, tout côté client, aucun serveur.
- **URL de référence** : `https://chromatisme.github.io/synthesia/`
- **Langue** : tout le code, les commentaires et la doc sont en **français**.

## Architecture

### Navigation : contrat `start(container)` / `stop()`

Chaque fonctionnalité (mode) est un objet avec cette signature :

```js
{ id, title, description, status: "available"|"soon", start(container), stop() }
```

- `start(container)` reçoit un élément DOM (`#stage`), y injecte son interface, attache ses écouteurs.
- `stop()` nettoie TOUT : listeners (via `AbortController`), audio, timers, animation frames, DOM dans le container.
- La navigation (`src/navigation.js`) ne garde aucun état des modes : tout est recréé à chaque `start()`.
- `AbortController` est obligatoire pour tous les écouteurs (DOM, events customs). `stop()` appelle `controller.abort()`.

### Fichiers source

```
src/main.js                 # bootstrap : enregistre les features, init viewport + navigation
src/navigation.js           # registre des features, switchTo(), rendu de l'écran d'accueil
src/song-mode.js            # mode Morceau (~1770 lignes) : piano roll, clavier, notation
src/note-reading-mode.js    # mode Lecture de notes : portée SVG + clavier DOM (1 à 2 octaves)
src/note-reading-engine.js  # moteur de l'exercice : tirage, validation, bilan (sans DOM)
src/exercise-mode.js        # mode Exercices : rouleau Canvas étroit + transport + bilan
src/exercises/catalog.js    # définition des exercices (degrés de gamme, doigtés)
src/exercises/generate-exercise.js  # motif → notes de la forme du mode Morceau (sans DOM)
src/rhythm-mode.js          # mode Rythme : métronome, reconnaissance, reproduction
src/rhythm/patterns.js      # figures (durées/silences), motifs par niveau (sans DOM)
src/rhythm/timing.js        # jugement à l'heure/avance/retard, appariement (sans DOM)
src/metronome.js            # PARTAGÉ (03, 05) : grille de pulsation + décompte, sans DOM
src/midi-input.js           # PARTAGÉ (F2) : Web MIDI, appareils, notes normalisées (sans DOM)
src/midi-controls.js        # PARTAGÉ (F2) : panneau de connexion, affiché sur l'accueil
src/progress/store.js       # PARTAGÉ (F3) : journal d'évènements dans localStorage
src/progress/review.js      # PARTAGÉ (F3) : ce qu'il faut faire revenir en priorité
src/music.js                # PARTAGÉ : noms latins, hauteurs MIDI, positions sur portée
src/audio.js                # PARTAGÉ : createAudio() → ensureReady/playNote/dispose
src/perf.js                 # PARTAGÉ : profil de l'appareil (canvas bridé, audio léger)
src/viewport.js             # PARTAGÉ : plein écran + mode paysage forcé (rotation CSS)
style.css                   # thème sombre, responsive <900px, paysage forcé, Canvas
index.html                  # coquille HTML : appbar commune + contrôles mode + scène #stage
songs.json                  # catalogue des morceaux (titres + chemins)
```

Les briques marquées PARTAGÉ ont été extraites de `song-mode.js` seulement au
moment où une deuxième fonctionnalité en a eu besoin. Même règle pour la suite :
pas d'extraction préventive. `src/progress/` fait exception au sens où rien n'en
a été extrait : c'est une fondation (F3) écrite directement, mais au même
moment — quand la première fonctionnalité a réellement eu des résultats à
conserver. Son format d'évènement est figé et sert aussi aux modes à venir. `piano.js` n'existe donc pas — les quatre claviers de
l'application (88 touches Canvas, une à deux octaves de `<button>`, étendue d'un
exercice en Canvas, une octave de `<button>` où la hauteur est ignorée) n'ont
rien en commun. **Le piano roll non plus n'est pas mutualisé** : le mode Morceau
et le mode Exercices gardent chacun le leur, pour la raison écrite dans
[plan/03 § 12](plan/03-technique-doigts.md#le-rouleau-na-pas-été-mutualisé-avec-le-mode-morceau) ;
même chose pour les deux portées (cinq lignes en 02, une seule en 05), qui ne
partagent aucune coordonnée.

Deux briques *sont* partagées dès le premier jour, parce qu'un second
consommateur en avait besoin de la **même** version, pas d'une variante :
`metronome.js` (la grille de pulsation de 03 et 05) et le vocabulaire de figures
de `rhythm/patterns.js`, que reprendra la Lecture de partitions (08). Contre-exemple
instructif : `nearestBeat()`, écrite d'avance *pour* 05, n'est pas ce dont 05 a eu
besoin — cf. [plan/05 § 11](plan/05-entrainement-rythmique.md#metronomejs-na-eu-besoin-daucune-extension).

### Ajouter une fonctionnalité

1. Créer un fichier `src/mon-mode.js` qui exporte `{ id, title, description, status, start, stop }`.
2. L'ajouter au tableau `FEATURES` dans `src/main.js`.
3. Copier `plan/MODELE-feature.md` dans `plan/XX-ma-feature.md` et remplir.

### Planification

Tous les plans sont dans `plan/`. Le backlog maître est `plan/README.md`.

| # | Statut |
|---|---|
| F1 — Navigation | ✅ Implémenté |
| F2 — Entrée MIDI clavier | ✅ Fondation ; aucune feature ne la consomme encore |
| F3 — Suivi progression | ✅ Étape A (journal) ; vues → étapes B-E |
| 01 — Apprentissage morceau | ✅ Lecteur ; guidé → 06 |
| 02 — Lecture de notes | ✅ MVP + progression ; altérations → 08 |
| 03 — Technique doigts | ✅ MVP pratique libre ; validation MIDI → F2 |
| 04 — Programme entraînement | 📋 Planifié |
| 05 — Rythme | ✅ MVP 3 familles ; MIDI physique → F2 |
| 06 — Travail intelligent morceau | 📋 Planifié (suite 01) |
| 07 — Oreille | 📋 Planifié |
| 08 — Lecture partitions | 📋 Planifié (suite 02) |
| 09 — Pédale | 📋 Planifié |

## Contraintes matérielles (CRITIQUE)

L'app tourne sur une **vieille tablette Android** avec un petit écran et peu de puissance.

### Performance

- **Profil automatique** : si ≤4 Go RAM ou ≤4 cœurs CPU → profil basse conso (DPR réduit, 30 FPS cible, 9 samples piano au lieu de 28). Forçable via `?performance=low` ou `?performance=high` dans l'URL.
- **Pas de framework lourd**. Pas de React, Vue, Svelte, etc. Vanilla JS uniquement.
- **Pas de build step**. Pas de webpack, vite, etc. Modules ES natifs chargés directement par le navigateur.
- **Pas de bibliothèque externe superflue**. Actuellement les seules dépendances sont Tone.js et @tonejs/midi (CDN), strictement nécessaires à l'audio et au parsing MIDI.
- **Canvas, pas de DOM pour le rendu principal**. Le piano roll et le clavier sont dessinés sur un seul `<canvas>` — c'est le cas du mode Morceau et du mode Exercices. Ne pas introduire de rendu DOM pour la partie temps réel *qui défile*. Deux exceptions assumées, parce que rien n'y défile : la **Lecture de notes** (une note fixe, un clic) et le **Rythme** (une portée fixe, une pulsation) utilisent une portée SVG statique et des `<button>` — cibles tactiles plus grandes, et zéro boucle d'animation. Le Rythme va plus loin : ce qui bouge (le point de pulsation, les changements de phase) est **planifié à l'avance sur le Transport et rendu par `Tone.Draw`**, donc aucun `requestAnimationFrame` du tout. À privilégier quand les changements visuels sont peu nombreux et connus d'avance.
- **`requestAnimationFrame` avec throttling**. Ne pas dépasser 30 FPS sur profil bas. Toujours annuler les rAF dans `stop()`.
- **Éviter les allocations dans la boucle de rendu**. Pré-calculer les géométries, réutiliser les tableaux typés (`Int16Array` pour WHITE_INDEX_BY_MIDI).
- **Pas d'animations CSS lourdes**. Les transitions sont limitées à `background .15s ease`.
- **Pas de polices web**. `font-family: system-ui` uniquement.
- **`localStorage` uniquement** pour la persistance (pas d'IndexedDB, pas de Service Worker sauf si explicitement demandé).

### Petit écran

- **Breakpoint unique à 900px** (mobile portrait). Pas de breakpoints multiples.
- **Mobile portrait (<900px)** : tout est compact — padding 6px/8px, boutons hauteur 30px, icônes 15px, texte 12px, le titre du mode et le label "Accueil" disparaissent, le select de morceau devient une icône 30×30 sans texte.
- **Paysage réel (orientation: landscape + max-height: 520px)** : la hauteur est rare, priorité au Canvas. En-tête sur une ligne, titres cachés.
- **Paysage forcé** : rotation CSS de 90° (fallback quand l'API Screen Orientation n'est pas dispo). Le bouton orange en haut active ce mode.
- **Le clavier piano en bas doit toujours rester utilisable au doigt** (taille minimale des touches). Hauteur du clavier : 14-18% de la hauteur selon device.
- **Toutes les cibles tactiles ≥ 30×30px** (minimum pour les doigts).
- **Overflow: hidden** sur `.stage` — c'est le mode qui gère son propre scroll si besoin.
- **Pas de hover-only UI**. Tout ce qui est interactif doit fonctionner au toucher. Les `:hover` sont du bonus visuel uniquement.

### Usage personnel

- Pas de licence, pas d'authentification, pas de compte utilisateur, pas de télémétrie.
- 17 morceaux MIDI dans `midi/` et `morceaux-exercice/`. Ce sont des fichiers personnels, pas de problème de copyright pour cet usage.
- Les samples de piano viennent de Tone.js (libres).

## Conventions de code

- **Modules ES natifs** (pas de CommonJS). `import`/`export` uniquement.
- **`"use strict"` implicite** via les modules.
- **Pas de point-virgule** en fin de ligne.
- **Indentation 2 espaces**.
- **Commentaires en français**, style `// ---- Section ----` pour les gros blocs, `//` pour les explications.
- **`const` par défaut**, `let` si réassignation. Jamais `var`.
- **Fonctions fléchées** pour les callbacks courts, `function` pour les fonctions nommées exportées.
- **Pas de classes**. Fonctions + closures + objets littéraux.
- **`AbortController` obligatoire** pour tous les écouteurs dans `start()`. `stop()` fait `controller.abort()`.
- **Point-virgules** : la règle d'origine disait de s'en passer, mais tout le code existant en met. On suit le code, pas la règle.
- **`PERFORMANCE_PROFILE` partagé** : détecté une seule fois dans `src/perf.js`, importé par `song-mode.js` (canvas) et `audio.js` (jeu d'échantillons). Ne pas redupliquer la détection.

## Audio

- **Tone.js doit être initialisé après un gesture utilisateur** (politique navigateur). Le premier clic sur ▶ déclenche `Tone.start()` + chargement des samples.
- **`stop()` doit TOUJOURS disposer l'audio** : `dispose()` sur le Part, `stop()` sur Transport, `releaseAll()` ou `dispose()` sur le synth/sampler, `dispose()` sur la reverb.
- **Pas de cache audio entre les visites d'un mode**. Chaque `start()` réinitialise, chaque `stop()` dispose tout.
- **Un seul `AudioContext`** partagé via Tone.js.

## Entrée MIDI (F2)

- **Une seule instance partagée**, dans `midi-input.js`. L'accès MIDI est une ressource unique du navigateur : aucun mode ne doit appeler `navigator.requestMIDIAccess` lui-même.
- **Contrairement à l'audio, l'état MIDI survit à `stop()`** : une permission accordée et un appareil choisi n'ont aucune raison d'être redemandés à chaque changement de mode. C'est l'exception assumée à la règle « rien ne survit à stop() ».
- **Un mode s'abonne, il ne configure rien** : `onMidiNote(cb)` rend sa fonction de désabonnement, à appeler dans `stop()`. Le panneau de connexion vit sur l'accueil, pas dans les modes.
- **Le MIDI est toujours optionnel.** Aucun mode ne doit devenir inutilisable sans clavier branché, sans permission, ou dans un navigateur sans Web MIDI.
- **Le CC 64 (pédale) n'est pas encore écouté** : décidé pour plus tard, au moment de [plan/09](plan/09-pedale.md). `midi-input.js` reste le seul endroit qui écoutera le MIDI.

## Servir en local

```bash
python3 -m http.server 8000
# ou
npx serve .
```

Puis <http://localhost:8000>. Ne pas ouvrir `index.html` en `file://` (modules ES bloqués).

## Règles diverses

- **Ne jamais modifier `songs.json` sans demander**. Les chemins contiennent des URL-encoded spaces (`%20`).
- **Le dossier `midi/` contient les vrais morceaux** (fichiers binaires). Ne pas les modifier.
- **La démo intégrée** (`buildin: "demo"`) est générée en code, pas depuis un fichier.
- **Séparation des mains** : si ≥2 pistes avec notes → tri par pitch moyen, la plus grave = main gauche. Sinon, split au Do central (MIDI 60).
- **Coordonnées Canvas** : le temps augmente vers le haut. `currentTime` = source de vérité unique pour la position de lecture ET le défilement.
- **Le canvas est `touch-action: none`** — tout le scroll/pan est géré manuellement.
