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
{ id, title, description, status: "available"|"soon", start(container, options?), stop() }
```

- `start(container)` reçoit un élément DOM (`#stage`), y injecte son interface, attache ses écouteurs.
- `options` est facultatif et **opaque pour la navigation** : `switchTo(id, options)` le passe tel
  quel à `start()`. C'est un mot qu'un mode adresse à un autre — le mode Exercices s'en sert pour
  ouvrir le mode Morceau sur un fichier précis (`{ songFile }`). La navigation n'en lit jamais le
  contenu, et un mode doit rester correct quand il ne reçoit rien.
- `stop()` nettoie TOUT : listeners (via `AbortController`), audio, timers, animation frames, DOM dans le container.
- La navigation (`src/navigation.js`) ne garde aucun état des modes : tout est recréé à chaque `start()`.
- `AbortController` est obligatoire pour tous les écouteurs (DOM, events customs). `stop()` appelle `controller.abort()`.

### Fichiers source

```
src/main.js                 # bootstrap : enregistre les features, init viewport + navigation
src/navigation.js           # registre des features, switchTo(), availableFeatures(),
                            # accueil rangé par famille + menu des modes de la barre
src/today-panel.js          # panneau « Ta séance du jour » de l'accueil : blocs et
                            # coches ; lit planDay() de 04, ne calcule aucune règle
src/training-mode.js        # mode Programme (04) : écran unique — séance, semaine, durée (DOM)
src/training-coach.js       # le professeur (sans DOM) : créneaux d'une séance, choix par
                            # ancienneté, répartition d'un budget en minutes
src/training-program.js     # réglages du Programme (sans DOM) : budget quotidien, bornes
                            # de jour, persistance ; l'historique reste celui de F3
src/song-mode.js            # mode Morceau : piano roll, clavier, notation, sous-mode Travail
src/song-practice.js        # règles du Travail (06), sans DOM : passages, accords
                            # attendus, tempo, maîtrise, persistance des passages
src/note-reading-engine.js  # groupes de notes par niveau et par main, clés (sans DOM)
src/fluency-mode.js         # unique mode Lecture de notes : une ou deux portées
                            # défilantes en Canvas, trois vitesses
src/fluency-engine.js       # série alternée et géométrie des portées, sans DOM
src/ear-training-mode.js    # mode Oreille : écoute + clavier ou propositions (DOM)
src/ear/questions.js        # stimuli de 07 par famille et niveau, et sa session (sans DOM)
src/session-engine.js       # PARTAGÉ (10, 07) : déroulé d'une session — tentatives,
                            # série, erreurs par cible, pondération, bilan (sans DOM)
src/piano-dom.js            # PARTAGÉ (10, 07) : clavier de réponse en <button>,
                            # étendue déduite d'un groupe de notes, préfixe CSS injecté
src/song-library.js         # PARTAGÉ (01, 03) : catalogue songs.json chargé une fois,
                            # filtré par nature — morceau ou exercice (sans DOM)
src/exercise-mode.js        # mode Exercices : rouleau Canvas étroit + transport + bilan
                            # + attente des bonnes notes + liste des morceaux
                            # d'étude (ouverts dans 01)
src/exercises/catalog.js    # définition des exercices (degrés de gamme, doigtés)
src/exercises/generate-exercise.js  # motif → notes de la forme du mode Morceau (sans DOM)
src/exercises/validate-run.js  # verdict d'une série jouée au clavier MIDI (sans DOM)
src/rhythm/timing.js        # jugement à l'heure/avance/retard, appariement (sans DOM) —
                            # reste du Rythme retiré ; sert la validation MIDI de 03
src/metronome.js            # grille de pulsation + décompte pour 03, sans DOM
src/midi-input.js           # PARTAGÉ (F2) : Web MIDI + Bluetooth, appareils, notes
                            # normalisées (sans DOM) — un mode ne voit qu'une liste
src/midi-bluetooth.js       # transport BLE-MIDI (Web Bluetooth) : connexion et
                            # décodage des paquets ; seul midi-input.js l'appelle
src/midi-controls.js        # PARTAGÉ (F2) : panneau de connexion, affiché sur l'accueil
src/progress/store.js       # PARTAGÉ (F3) : journal d'évènements dans localStorage,
                            # export, compaction (les bornes de séance survivent)
src/progress/review.js      # PARTAGÉ (F3) : ce qu'il faut faire revenir en priorité —
                            # le plus raté, et le moins vu récemment
src/progress/views.js       # PARTAGÉ (F3) : les six vues calculées (séances, confusions,
                            # maîtrise, tempo propre, évolution par main)
src/progress-mode.js        # écran Progression (F3 étape E) : vues + export/effacement ;
                            # n'écrit jamais de séance au journal
src/music.js                # PARTAGÉ : noms latins, hauteurs MIDI, positions sur portée
src/audio.js                # PARTAGÉ : createAudio() → ensureReady/playNote/dispose
src/perf.js                 # PARTAGÉ : profil de l'appareil (canvas bridé, audio léger)
src/viewport.js             # PARTAGÉ : plein écran + mode paysage forcé (rotation CSS)
style.css                   # thème sombre, responsive <900px, paysage forcé, Canvas
index.html                  # coquille HTML : appbar commune + contrôles mode + scène #stage
songs.json                  # catalogue (titres + chemins + nature : "song" ou "exercice")
```

Les briques marquées PARTAGÉ ont été extraites de `song-mode.js` seulement au
moment où une deuxième fonctionnalité en a eu besoin. Même règle pour la suite :
pas d'extraction préventive. `src/progress/` fait exception au sens où rien n'en
a été extrait : c'est une fondation (F3) écrite directement, mais au même
moment — quand la première fonctionnalité a réellement eu des résultats à
conserver. Son format d'évènement est figé et sert aussi aux modes à venir.

`piano.js` — le clavier universel — n'existe toujours pas : les claviers de
l'application (88 touches Canvas, étendue d'un exercice en Canvas, une octave de
`<button>` où la hauteur est ignorée) n'ont rien en commun. En revanche
`piano-dom.js` **a** été extrait le 27/07/2026, parce que 02 et 07 affichent
littéralement *le même* clavier : une à deux octaves de `<button>` dont
l'étendue se déduit d'un groupe de notes. Le préfixe de classes CSS y est un
paramètre (`fl-`, `ear-`), donc chaque mode garde sa famille de styles.
L'ancien préfixe `nr-` appartenait au mode fixe retiré le 28/07/2026, et `sr-`
à la Lecture de partitions retirée le 07/08/2026. Même histoire pour
`session-engine.js`, extrait de `note-reading-engine.js` le même jour, sans que
la surface publique de ce dernier change.

**Le piano roll, lui, n'est toujours pas mutualisé** : le mode Morceau
et le mode Exercices gardent chacun le leur, pour la raison écrite dans
[plan/03 § 12](plan/03-technique-doigts.md#le-rouleau-na-pas-été-mutualisé-avec-le-mode-morceau).
Il ne reste d'ailleurs qu'un seul rouleau et une seule portée depuis les
retraits du 07/08/2026 : la question ne se pose plus.

`metronome.js` et `rhythm/timing.js` ont été partagés dès le premier jour,
parce qu'un second consommateur en avait besoin de la **même** version, pas
d'une variante : la grille de pulsation de 03 et 05, le jugement
avance/retard de 05 et de la validation MIDI de 03.

Troisième cas, apparu avec le Travail d'un morceau (06) : **réutiliser sans
déplacer**. `exercises/validate-run.js` juge un passage de morceau exactement
comme une série d'exercice — les bonnes notes au bon moment, `clean` ou
`flawed` —, et `song-practice.js` l'appelle tel quel, `stepsToRework` comprise,
sans qu'il quitte `exercises/`. Un fichier ne déménage que le jour où sa place
actuelle devient trompeuse, pas au premier emprunt. L'emprunt joue **dans les
deux sens** depuis le 08/08/2026 : le mode Exercices attend désormais les
bonnes notes (plan/03 § 20) et appelle pour cela `groupChords()` et
`nextGroupIndex()` de `song-practice.js`, là où elles sont écrites. Deux modes
qui se rendent service ne justifient toujours pas un troisième fichier.

Quatrième cas, avec le Programme d'entraînement (04) : **écrire une vue quand
quelqu'un la demande**. `progress/views.js` ne contient qu'**une** des six vues
prévues par F3 — l'historique des séances —, parce que c'est la seule dont 04
avait besoin. Les données des cinq autres dorment déjà dans le journal ; les
calculer d'avance serait la même erreur que `nearestBeat()`. À retenir aussi :
04 n'a modifié **aucune** fonctionnalité existante, le format d'évènement figé
tôt suffisait — et un `featureId` du registre n'est pas toujours celui du
journal (`song` est satisfait par `song-practice`, cf. `SESSION_FEATURE_IDS`).
La refonte du 27/07/2026 au soir — le programme est désormais **écrit par
l'application** pour un budget quotidien, plus composé par l'utilisateur — n'a
pas davantage demandé de vue nouvelle : la rotation « la moins vue récemment »
se lit avec `completedSessions(log, { featureIds, to })`, qui existait déjà.

Cinquième cas, avec l'Entraînement de l'oreille (07) : **extraire sans changer
la surface**. `session-engine.js` et `piano-dom.js` sont sortis de 02 le jour où
07 en a eu besoin, mais `note-reading-engine.js` a gardé ses exports jusqu'au
retrait du mode fixe. C'est ce qui a permis de rejouer
les harnais d'une fonctionnalité **tels quels** après l'avoir remaniée : si un
harnais doit être réécrit pour passer, il ne mesure plus la non-régression.
Quand un mode a besoin de sa propre variante d'un module partagé, on lui donne
un paramètre (ici le préfixe de classes CSS) plutôt qu'une copie.

Sixième cas, avec les retraits du 07/08/2026 (08 — Lecture de partitions,
05 — Rythme, 09 — Pédale) : **ce qu'un mode supprimé laisse derrière lui**. La
règle est symétrique de l'extraction — on ne garde pas plus par précaution
qu'on n'extrait par anticipation :

- un module partagé **survit** au mode qui l'a fait naître s'il lui reste un
  consommateur. `metronome.js` et `rhythm/timing.js` restent parce que les
  exercices techniques (03) s'en servent toujours, `session-engine.js` et
  `piano-dom.js` parce que 07 et 10 s'en servent. `rhythm/timing.js` reste
  aussi *à sa place* : un fichier ne déménage pas parce que son dossier a
  changé de sens, seulement quand cette place devient trompeuse ;
- un module à **un seul** consommateur part avec lui : `rhythm/patterns.js`,
  `pedal/timing.js`, `sheet/*` ;
- ce qui n'avait **aucun** consommateur part aussi, et c'est là que le retrait
  révèle ce qu'une extraction préventive avait coûté. `nearestBeat()`, écrite
  d'avance *pour* 05, n'a jamais servi à 05 : elle disparaît sans que rien ne
  s'en aperçoive (cf. [plan/05 § 11](plan/05-entrainement-rythmique.md#metronomejs-na-eu-besoin-daucune-extension)).
  Même sort pour le CC 64 de `midi-input.js`, dont 09 était l'unique abonné ;
- le **vocabulaire du journal** (F3) se rétrécit aussi, mais avec précaution :
  il n'est fermé qu'à l'écriture, donc retirer `beat`, `blurred` ou `gap` de
  `progress/store.js` ne rend pas illisibles les séances déjà enregistrées.

Septième cas, avec la séparation morceaux / exercices du 07/08/2026 :
**une distinction qui existait déjà dans la tête finit par exister dans la
donnée**. Les fichiers de `midi/` et ceux de `morceaux-exercice/` n'ont jamais
eu la même vocation — le README du second le disait dès le premier jour — mais
un seul `<select>` les mélangeait, et quatre morceaux s'y noyaient dans
quarante et un exercices. Trois conséquences qui valent pour la suite :

- la nature est écrite dans `songs.json` (`kind`), pas déduite du chemin du
  fichier. Deviner le sens d'une donnée à partir de l'endroit où elle est
  rangée marche jusqu'au jour où on veut la ranger ailleurs ;
- `song-library.js` est sorti de `song-mode.js` au moment habituel : quand un
  **deuxième** consommateur (03) a eu besoin du même catalogue. Rien n'y a été
  ajouté pour l'avenir ;
- un mode peut désormais en ouvrir un autre sur quelque chose de précis
  (`switchTo("song", { songFile })`). La navigation ne comprend pas ce message,
  elle le transmet : elle ne connaît toujours rien des modes.

### Ajouter une fonctionnalité

1. Créer un fichier `src/mon-mode.js` qui exporte `{ id, title, description, status, start, stop }`.
2. L'ajouter au tableau `FEATURES` dans `src/main.js`.
3. Copier `plan/MODELE-feature.md` dans `plan/XX-ma-feature.md` et remplir.

### Planification

Tous les plans sont dans `plan/`. Le backlog maître est `plan/README.md`.

| # | Statut |
|---|---|
| F1 — Navigation | ✅ Implémenté + menu des modes (barre) et accueil par famille |
| F2 — Entrée MIDI clavier | ✅ Fondation + notes (01, 03, 07, 10) |
| F3 — Suivi progression | ✅ Complet : journal, 6 vues, écran Progression, export/effacement, compaction |
| 01 — Apprentissage morceau | ✅ Lecteur + clavier MIDI ; travail guidé via 06 |
| 02 — Ancienne lecture fixe | Retirée le 28/07/2026 ; historique conservé |
| 03 — Technique doigts | ✅ MVP + validation MIDI |
| 04 — Programme entraînement | ✅ Séance composée pour un budget quotidien (20 min par défaut) ; lit le journal F3 |
| 05 — Rythme | Retirée le 07/08/2026 ; historique conservé |
| 06 — Travail intelligent morceau | ✅ 5 outils : passages, mains, boucle, attente, tempo |
| 07 — Oreille | ✅ 3 familles × 3 niveaux ; mélodie hors MVP |
| 08 — Lecture partitions | Retirée le 07/08/2026 ; historique conservé |
| 09 — Pédale | Retirée le 07/08/2026 ; historique conservé |
| 10 — Lecture de notes | ✅ 1 ou 2 portées défilantes (Canvas), 3 vitesses ; altérations → plus tard |

## Contraintes matérielles (CRITIQUE)

L'app tourne sur une **vieille tablette Android** avec un petit écran et peu de puissance.

### Performance

- **Profil automatique** : si ≤4 Go RAM ou ≤4 cœurs CPU → profil basse conso (DPR réduit, 30 FPS cible, 9 samples piano au lieu de 28). Forçable via `?performance=low` ou `?performance=high` dans l'URL.
- **Pas de framework lourd**. Pas de React, Vue, Svelte, etc. Vanilla JS uniquement.
- **Pas de build step**. Pas de webpack, vite, etc. Modules ES natifs chargés directement par le navigateur.
- **Pas de bibliothèque externe superflue**. Actuellement les seules dépendances sont Tone.js et @tonejs/midi (CDN), strictement nécessaires à l'audio et au parsing MIDI.
- **Canvas, pas de DOM pour le rendu principal**. Le piano roll et le clavier sont dessinés sur un seul `<canvas>` — c'est le cas du mode Morceau, du mode Exercices et de la **Lecture de notes** (les portées qui défilent vers la ligne d'arrivée). Ne pas introduire de rendu DOM pour la partie temps réel *qui défile*. Depuis le retrait du Rythme (07/08/2026), plus aucun mode n'y déroge : ce qui reste en DOM (Oreille, Programme, Progression) ne défile pas.
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
- **`Tone.Transport` est partagé par tous les modes** : ce qu'un mode y règle, le suivant en hérite. Le mode Morceau y active `loop` pour boucler un passage (06) ; il le remet donc à faux dans `stop()`. Même vigilance pour `bpm`, `loopStart`/`loopEnd` et `swing` si un mode s'en sert un jour.
- **Pas de cache audio entre les visites d'un mode**. Chaque `start()` réinitialise, chaque `stop()` dispose tout.
- **Un seul `AudioContext`** partagé via Tone.js.

## Entrée MIDI (F2)

- **Une seule instance partagée**, dans `midi-input.js`. L'accès MIDI est une ressource unique du navigateur : aucun mode ne doit appeler `navigator.requestMIDIAccess` lui-même.
- **Deux transports, une seule liste d'appareils** : le Web MIDI (USB) et le Bluetooth (`midi-bluetooth.js`, Web Bluetooth). Android ne montre **pas** les claviers BLE au Web MIDI : c'est pour ça que le second existe. Un clavier Bluetooth entre dans `midi-input.js` sous la forme d'une entrée Web MIDI (un objet qui porte `onmidimessage`) — aucun mode ne sait, ni n'a à savoir, par où arrive une note.
- **Contexte sécurisé obligatoire** : servie en `http://` sur une adresse locale, la page n'a **ni** `navigator.requestMIDIAccess` **ni** `navigator.bluetooth` — les API ont disparu, ce qui est indiscernable d'un vieux navigateur. Le panneau le dit explicitement (`state.environment`) ; ne pas retirer ce diagnostic, c'est la panne la plus fréquente sur tablette.
- **Contrairement à l'audio, l'état MIDI survit à `stop()`** : une permission accordée et un appareil choisi n'ont aucune raison d'être redemandés à chaque changement de mode. C'est l'exception assumée à la règle « rien ne survit à stop() ».
- **Un mode s'abonne, il ne configure rien** : `onMidiNote(cb)` rend sa fonction de désabonnement, à appeler dans `stop()`. Le panneau de connexion vit sur l'accueil, pas dans les modes.
- **Le MIDI est toujours optionnel.** Aucun mode ne doit devenir inutilisable sans clavier branché, sans permission, ou dans un navigateur sans Web MIDI.
- **Le CC 64 (pédale) n'est plus écouté** : il l'a été pour les Exercices de pédale (09), retirés le 07/08/2026 avec leur unique abonnement. `midi-input.js` ne traite plus que les notes, et reste le seul endroit qui écoute le MIDI.
- **Utiliser `event.timestamp`, pas « maintenant »**, dès qu'un jugement de timing est en jeu : quelques millisecondes séparent l'arrivée d'un message de son traitement, et c'est l'ordre de grandeur que la fenêtre de tolérance mesure. Conversion vers l'horloge du Transport : `Tone.Transport.seconds − (performance.now() − event.timestamp) / 1000`.
- **Les seuils de timing vivent dans `rhythm/timing.js`**, écrits pour 05 et restés après son retrait : c'est la validation MIDI de 03 qui les utilise, via `exercises/validate-run.js`. Son `matchByTime` accepte un critère d'appariement supplémentaire — la validation MIDI y met l'égalité des hauteurs. Ne pas réécrire un second jugement avance/retard.

## Servir en local

```bash
python3 -m http.server 8000
# ou
npx serve .
```

Puis <http://localhost:8000>. Ne pas ouvrir `index.html` en `file://` (modules ES bloqués).

## Règles diverses

- **Ne jamais modifier `songs.json` sans demander**. Les chemins contiennent des URL-encoded spaces (`%20`).
- **La nature d'un fichier est dans la donnée, pas dans son dossier** : `kind: "song"` (le
  répertoire, mode Morceau) ou `kind: "exercice"` (le matériel de travail, liste « Morceaux
  d'étude » du mode Exercices). Une entrée sans `kind` est un morceau. Un fichier change de camp
  en changeant ce champ, sans être déplacé — c'est `src/song-library.js` qui tranche, et lui seul
  lit `songs.json`.
- **Le dossier `midi/` contient les vrais morceaux** (fichiers binaires). Ne pas les modifier.
- **La démo intégrée** (`buildin: "demo"`) est générée en code, pas depuis un fichier.
- **Séparation des mains** : si ≥2 pistes avec notes → tri par pitch moyen, la plus grave = main gauche. Sinon, split au Do central (MIDI 60).
- **Coordonnées Canvas** : le temps augmente vers le haut. `currentTime` = source de vérité unique pour la position de lecture ET le défilement.
- **Le canvas est `touch-action: none`** — tout le scroll/pan est géré manuellement.
