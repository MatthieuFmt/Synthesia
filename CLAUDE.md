# Synthesia Web — Règles pour l'IA

## Projet

Application web type *Synthesia* pour l'apprentissage du piano. Lit des fichiers MIDI, affiche les notes sur un piano roll à défilement vertical (morceau démarre en bas, monte vers le haut), avec piano clavier interactif en bas de l'écran.

- **Stack** : HTML5 Canvas + JavaScript modules ES, pas de framework, pas de build step.
- **Audio** : [`Tone.js`](https://tonejs.github.io/) (synthèse + sampler piano)
- **MIDI parsing** : [`@tonejs/midi`](https://github.com/Tonejs/Midi) depuis CDN
- **Déploiement** : GitHub Pages, tout côté client, aucun serveur.
- **Langue** : tout le code, les commentaires et la doc sont en **français**.

## Architecture

### Navigation : contrat `start(container)` / `stop()`

Chaque fonctionnalité (mode) est un objet avec cette signature :

```js
{ id, title, description, status: "available"|"soon", start(container, options?), stop() }
```

- `start(container)` reçoit un élément DOM (`#stage`), y injecte son interface, attache ses écouteurs.
- `options` est facultatif et **opaque pour la navigation** : `switchTo(id, options)` le passe tel
  quel à `start()`. C'est un message qu'un mode adresse à un autre — le mode Exercices s'en sert
  pour ouvrir le mode Morceau sur un fichier précis (`{ songFile }`). La navigation n'en lit jamais
  le contenu, et un mode doit rester correct quand il ne reçoit rien.
- `stop()` nettoie TOUT : listeners (via `AbortController`), audio, timers, animation frames, DOM dans le container.
- La navigation (`src/navigation.js`) ne garde aucun état des modes : tout est recréé à chaque `start()`.
- `AbortController` est obligatoire pour tous les écouteurs (DOM, events customs). `stop()` appelle `controller.abort()`.

### Fichiers source

```
src/main.js                 # bootstrap : enregistre les features, init viewport + navigation
src/navigation.js           # registre des features, switchTo(), availableFeatures(),
                            # accueil rangé par famille + menu des modes de la barre
src/today-panel.js          # panneau « Ta séance du jour » de l'accueil : blocs et
                            # coches ; lit planDay() du Programme, ne calcule aucune règle
src/training-mode.js        # mode Programme : écran unique — séance, semaine, durée (DOM)
src/training-coach.js       # le professeur (sans DOM) : créneaux d'une séance, choix par
                            # ancienneté, répartition d'un budget en minutes
src/training-program.js     # réglages du Programme (sans DOM) : budget quotidien, bornes
                            # de jour, persistance
src/song-mode.js            # mode Morceau : piano roll, clavier, notation, sous-mode Travail
src/song-practice.js        # règles du Travail, sans DOM : passages, accords attendus,
                            # tempo, maîtrise, persistance des passages
src/note-reading-engine.js  # groupes de notes par niveau et par main, clés (sans DOM)
src/fluency-mode.js         # mode Lecture de notes : une ou deux portées défilantes
                            # en Canvas, trois vitesses
src/fluency-engine.js       # série alternée et géométrie des portées, sans DOM
src/ear-training-mode.js    # mode Oreille : écoute + clavier ou propositions (DOM)
src/ear/questions.js        # stimuli par famille et niveau, et sa session (sans DOM)
src/session-engine.js       # PARTAGÉ : déroulé d'une session — tentatives, série,
                            # erreurs par cible, pondération, bilan (sans DOM)
src/piano-dom.js            # PARTAGÉ : clavier de réponse en <button>, étendue déduite
                            # d'un groupe de notes, préfixe CSS injecté (`fl-`, `ear-`)
src/song-library.js         # PARTAGÉ : catalogue songs.json chargé une fois, filtré
                            # par nature — morceau ou exercice (sans DOM)
src/exercise-mode.js        # mode Exercices : rouleau Canvas étroit + transport + bilan
                            # + attente des bonnes notes + liste des morceaux d'étude
src/exercises/catalog.js    # définition des exercices (degrés de gamme, doigtés)
src/exercises/generate-exercise.js  # motif → notes de la forme du mode Morceau (sans DOM)
src/exercises/validate-run.js  # verdict d'une série jouée au clavier MIDI (sans DOM)
src/rhythm/timing.js        # jugement à l'heure/avance/retard, appariement (sans DOM)
src/metronome.js            # grille de pulsation + décompte, sans DOM
src/midi-input.js           # PARTAGÉ : Web MIDI + Bluetooth, appareils, notes
                            # normalisées (sans DOM) — un mode ne voit qu'une liste
src/midi-bluetooth.js       # transport BLE-MIDI (Web Bluetooth) : connexion et
                            # décodage des paquets ; seul midi-input.js l'appelle
src/midi-controls.js        # PARTAGÉ : panneau de connexion, affiché sur l'accueil
src/progress/store.js       # PARTAGÉ : journal d'évènements dans localStorage,
                            # export, compaction (les bornes de séance survivent)
src/progress/review.js      # PARTAGÉ : ce qu'il faut faire revenir en priorité —
                            # le plus raté, et le moins vu récemment
src/progress/views.js       # PARTAGÉ : les vues calculées (séances, temps réellement
                            # pratiqué…)
src/progress-mode.js        # écran Progression : vues + export/effacement ;
                            # n'écrit jamais de séance au journal
src/music.js                # PARTAGÉ : noms latins, hauteurs MIDI, positions sur portée
src/audio.js                # PARTAGÉ : createAudio() → ensureReady/playNote/dispose
src/perf.js                 # PARTAGÉ : profil de l'appareil (canvas bridé, audio léger)
src/viewport.js             # PARTAGÉ : plein écran + mode paysage forcé (rotation CSS)
tools/                      # scripts Node hors application (génération et vérification
                            # du catalogue d'exercices)
style.css                   # thème sombre, responsive <900px, paysage forcé, Canvas
index.html                  # coquille HTML : appbar commune + contrôles mode + scène #stage
songs.json                  # catalogue (titres + chemins + nature : "song" ou "exercice")
```

### Règles de partage entre modules

- **Pas d'extraction préventive.** Un module devient PARTAGÉ le jour où un
  **deuxième** consommateur a besoin de la **même** version, pas d'une variante.
  Écrire un helper « pour plus tard » finit en code mort.
- **Réutiliser sans déplacer.** Un fichier ne déménage que le jour où sa place
  actuelle devient trompeuse, pas au premier emprunt : `song-practice.js`
  appelle `exercises/validate-run.js` là où il est, et le mode Exercices
  appelle `groupChords()` / `nextGroupIndex()` de `song-practice.js`.
- **Un paramètre plutôt qu'une copie.** Quand un mode a besoin de sa propre
  variante d'un module partagé, on lui donne un paramètre (le préfixe de
  classes CSS de `piano-dom.js`) au lieu de dupliquer.
- **Une extraction ne change pas la surface publique** du module d'origine :
  c'est ce qui permet de rejouer les harnais existants tels quels.
- **Écrire une vue quand quelqu'un la demande.** `progress/views.js` ne calcule
  que ce dont un mode a réellement besoin ; les autres données dorment dans le
  journal. Une bonne vue s'écrit tard ; un bon format d'évènement se fige tôt.
- **Le piano roll n'est pas mutualisé** : le mode Morceau et le mode Exercices
  gardent chacun le leur (contraintes d'affichage différentes).
- **Un module à un seul consommateur part avec lui** si ce consommateur est
  supprimé. Le vocabulaire du journal (`progress/store.js`) n'est fermé qu'à
  l'écriture : y retirer un terme ne rend pas illisibles les séances déjà
  enregistrées.

### Ajouter une fonctionnalité

1. Créer un fichier `src/mon-mode.js` qui exporte `{ id, title, description, status, start, stop }`.
2. L'ajouter au tableau `FEATURES` dans `src/main.js`.

Attention : un `featureId` du registre n'est pas toujours celui du journal
(`song` est satisfait par `song-practice`, cf. `SESSION_FEATURE_IDS`).

## Contraintes matérielles (CRITIQUE)

L'app tourne sur une **vieille tablette Android** avec un petit écran et peu de puissance.

### Performance

- **Profil automatique** : si ≤4 Go RAM ou ≤4 cœurs CPU → profil basse conso (DPR réduit, 30 FPS cible, 9 samples piano au lieu de 28). Forçable via `?performance=low` ou `?performance=high` dans l'URL.
- **Pas de framework lourd**. Pas de React, Vue, Svelte, etc. Vanilla JS uniquement.
- **Pas de build step**. Pas de webpack, vite, etc. Modules ES natifs chargés directement par le navigateur.
- **Pas de bibliothèque externe superflue**. Les seules dépendances sont Tone.js et @tonejs/midi (CDN), strictement nécessaires à l'audio et au parsing MIDI.
- **Canvas, pas de DOM pour le rendu principal**. Tout ce qui défile en temps réel (piano roll du mode Morceau, rouleau des Exercices, portées de la Lecture de notes) est dessiné sur un seul `<canvas>`. Ce qui reste en DOM (Oreille, Programme, Progression) ne défile pas.
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
- **Le clavier piano en bas doit toujours rester utilisable au doigt**. Hauteur du clavier : 14-18% de la hauteur selon device.
- **Toutes les cibles tactiles ≥ 30×30px**.
- **Overflow: hidden** sur `.stage` — c'est le mode qui gère son propre scroll si besoin.
- **Pas de hover-only UI**. Tout ce qui est interactif doit fonctionner au toucher. Les `:hover` sont du bonus visuel uniquement.

### Usage personnel

Pas de licence, pas d'authentification, pas de compte utilisateur, pas de télémétrie. Les fichiers MIDI de `midi/` et `morceaux-exercice/` sont personnels. Les samples de piano viennent de Tone.js (libres).

## Conventions de code

- **Modules ES natifs** (pas de CommonJS). `import`/`export` uniquement.
- **Indentation 2 espaces**.
- **Commentaires en français**, style `// ---- Section ----` pour les gros blocs, `//` pour les explications.
- **`const` par défaut**, `let` si réassignation. Jamais `var`.
- **Fonctions fléchées** pour les callbacks courts, `function` pour les fonctions nommées exportées.
- **Pas de classes**. Fonctions + closures + objets littéraux.
- **`AbortController` obligatoire** pour tous les écouteurs dans `start()`. `stop()` fait `controller.abort()`.
- **Point-virgules** : tout le code existant en met. On suit le code.
- **`PERFORMANCE_PROFILE` partagé** : détecté une seule fois dans `src/perf.js`, importé par `song-mode.js` (canvas) et `audio.js` (jeu d'échantillons). Ne pas redupliquer la détection.

## Audio

- **Tone.js doit être initialisé après un gesture utilisateur** (politique navigateur). Le premier clic sur ▶ déclenche `Tone.start()` + chargement des samples.
- **`stop()` doit TOUJOURS disposer l'audio** : `dispose()` sur le Part, `stop()` sur Transport, `releaseAll()` ou `dispose()` sur le synth/sampler, `dispose()` sur la reverb.
- **`Tone.Transport` est partagé par tous les modes** : ce qu'un mode y règle, le suivant en hérite. Le mode Morceau y active `loop` pour boucler un passage ; il le remet donc à faux dans `stop()`. Même vigilance pour `bpm`, `loopStart`/`loopEnd` et `swing`.
- **Pas de cache audio entre les visites d'un mode**. Chaque `start()` réinitialise, chaque `stop()` dispose tout.
- **Un seul `AudioContext`** partagé via Tone.js.

## Entrée MIDI

- **Une seule instance partagée**, dans `midi-input.js`. L'accès MIDI est une ressource unique du navigateur : aucun mode ne doit appeler `navigator.requestMIDIAccess` lui-même.
- **Deux transports, une seule liste d'appareils** : le Web MIDI (USB) et le Bluetooth (`midi-bluetooth.js`, Web Bluetooth). Android ne montre **pas** les claviers BLE au Web MIDI : c'est pour ça que le second existe. Un clavier Bluetooth entre dans `midi-input.js` sous la forme d'une entrée Web MIDI (un objet qui porte `onmidimessage`) — aucun mode ne sait, ni n'a à savoir, par où arrive une note.
- **Contexte sécurisé obligatoire** : servie en `http://` sur une adresse locale, la page n'a **ni** `navigator.requestMIDIAccess` **ni** `navigator.bluetooth`. Le panneau le dit explicitement (`state.environment`) ; ne pas retirer ce diagnostic, c'est la panne la plus fréquente sur tablette.
- **Contrairement à l'audio, l'état MIDI survit à `stop()`** : une permission accordée et un appareil choisi n'ont aucune raison d'être redemandés à chaque changement de mode. C'est l'exception assumée à la règle « rien ne survit à stop() ».
- **Un mode s'abonne, il ne configure rien** : `onMidiNote(cb)` rend sa fonction de désabonnement, à appeler dans `stop()`. Le panneau de connexion vit sur l'accueil, pas dans les modes.
- **Le MIDI est toujours optionnel.** Aucun mode ne doit devenir inutilisable sans clavier branché, sans permission, ou dans un navigateur sans Web MIDI.
- **Seules les notes sont traitées** (pas de CC). `midi-input.js` reste le seul endroit qui écoute le MIDI.
- **Utiliser `event.timestamp`, pas « maintenant »**, dès qu'un jugement de timing est en jeu : quelques millisecondes séparent l'arrivée d'un message de son traitement, et c'est l'ordre de grandeur que la fenêtre de tolérance mesure. Conversion vers l'horloge du Transport : `Tone.Transport.seconds − (performance.now() − event.timestamp) / 1000`.
- **Les seuils de timing vivent dans `rhythm/timing.js`**, utilisés via `exercises/validate-run.js`. Son `matchByTime` accepte un critère d'appariement supplémentaire — la validation MIDI y met l'égalité des hauteurs. Ne pas réécrire un second jugement avance/retard.

## Servir en local

```bash
python3 -m http.server 8000
# ou
npx serve .
```

Puis <http://localhost:8000>. Ne pas ouvrir `index.html` en `file://` (modules ES bloqués).

## Règles diverses

- **Ne jamais modifier `songs.json` sans demander**. Les chemins contiennent des URL-encoded spaces (`%20`).
- **La nature d'un fichier est dans la donnée, pas dans son dossier** : `kind: "song"` (mode Morceau) ou `kind: "exercice"` (liste « Morceaux d'étude » du mode Exercices). Une entrée sans `kind` est un morceau. `src/song-library.js` tranche, et lui seul lit `songs.json`.
- **Le dossier `midi/` contient les vrais morceaux** (fichiers binaires). Ne pas les modifier.
- **La démo intégrée** (`buildin: "demo"`) est générée en code, pas depuis un fichier.
- **Séparation des mains** : si ≥2 pistes avec notes → tri par pitch moyen, la plus grave = main gauche. Sinon, split au Do central (MIDI 60).
- **Coordonnées Canvas** : le temps augmente vers le haut. `currentTime` = source de vérité unique pour la position de lecture ET le défilement.
- **Le canvas est `touch-action: none`** — tout le scroll/pan est géré manuellement.
