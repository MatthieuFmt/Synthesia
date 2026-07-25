# Fondation F1 — Navigation entre les fonctionnalités

> Statut : première boucle en place — accueil → mode Morceau → retour
> fonctionne, le mode Morceau est migré vers `start(container)`/`stop()`. Les
> décisions ouvertes (§ 10) restent à trancher.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir le principe de l'écran d'accueil et du registre de fonctionnalités.
- [x] Définir le contrat commun de démarrage/arrêt d'une fonctionnalité.
- [x] Créer l'écran d'accueil et le bouton retour.
- [x] Migrer le mode Morceau actuel vers ce contrat, sans régression.
- [x] Vérifier l'arrêt propre de l'audio et des animations au changement de mode.

## 1. Problème d'origine

`index.html` démarre directement dans le mode Morceau : l'en-tête (import
MIDI, sélection de morceau, notation, vitesse) et la barre de transport sont
aujourd'hui **entièrement dédiés à ce mode**, et `src/main.js` ne connaît
qu'un seul déroulé possible. Rien ne permet de savoir qu'une autre façon de
s'entraîner existe, ni d'y accéder, ni de revenir à un point de départ
commun. Chaque nouvelle fonctionnalité (Lecture de notes, Exercices
techniques, Programme d'entraînement…) aggrave le problème si elle est
ajoutée sans point d'entrée partagé.

Ce point de départ commun existe désormais (voir § 11 et § 12) : `index.html`
ouvre sur l'écran d'accueil et le mode Morceau n'est plus qu'une
fonctionnalité parmi d'autres.

## 2. Objectif

Donner à l'utilisateur un point de départ unique depuis lequel choisir une
fonctionnalité, y entrer, puis en ressortir proprement pour en choisir une
autre — sur ordinateur comme sur mobile — et donner aux développements futurs
un contrat simple pour s'y brancher sans dupliquer la logique de démarrage.

## 3. Principe retenu

### Registre de fonctionnalités

Une fonctionnalité est décrite par une petite fiche :

```js
const feature = {
  id: "note-reading",
  title: "Lecture de notes",
  description: "Reconnaître une note sur la portée.",
  status: "available", // "available" | "soon"
  start(container) {
    /* démarre la fonctionnalité dans container */
  },
  stop() {
    /* arrête tout ce que start() a déclenché */
  },
};
```

Le registre est une simple liste de ces fiches. L'écran d'accueil se
contente de l'afficher ; il n'a pas besoin de connaître le détail de chaque
fonctionnalité.

### Écran d'accueil

- une carte par fonctionnalité du registre : titre, description courte,
  état (« Disponible » ou « Bientôt ») ;
- les fonctionnalités marquées « Bientôt » sont visibles mais non
  cliquables, pour ne jamais planter au clic ;
- disposition en grille sur grand écran, empilée sur petit écran.

### Changement de fonctionnalité

Une seule fonction traverse toute l'application :

```js
function switchTo(featureId) {
  currentFeature?.stop();
  currentFeature = registry.find((f) => f.id === featureId);
  currentFeature.start(stageContainer);
}
```

`stop()` est responsable d'arrêter le son en cours, d'annuler les boucles
`requestAnimationFrame`, de retirer les écouteurs propres à la fonctionnalité
et de relâcher l'entrée MIDI si elle était utilisée (voir
[F2 — Entrée MIDI](F2-entree-midi.md)). Tant que `stop()` n'est pas terminé,
`start()` de la fonctionnalité suivante ne doit pas être appelé.

### Retour à l'accueil

Un bouton retour/menu reste visible en permanence depuis n'importe quelle
fonctionnalité active et appelle `switchTo(null)` pour revenir à l'écran
d'accueil.

## 4. Parcours principal

1. L'utilisateur ouvre l'application → l'écran d'accueil liste les
   fonctionnalités disponibles.
2. L'utilisateur choisit une fonctionnalité → l'application arrête
   proprement toute activité en cours (s'il y en avait une) puis démarre la
   fonctionnalité choisie.
3. L'utilisateur clique sur le bouton retour, visible en permanence →
   l'application arrête proprement la fonctionnalité en cours et revient à
   l'écran d'accueil.
4. L'application indique clairement, à tout moment, quelle fonctionnalité
   est active.

## 5. Règles de comportement

- Une seule fonctionnalité est active à la fois.
- Changer de fonctionnalité arrête toujours complètement la précédente avant
  de démarrer la suivante ; les deux ne tournent jamais en même temps.
- Le bouton retour à l'accueil reste accessible depuis n'importe quel écran
  de fonctionnalité.
- Une fonctionnalité marquée « Bientôt » ne doit jamais pouvoir être lancée
  par erreur.
- Recharger la page ramène à l'écran d'accueil, tant qu'aucun routing par
  URL n'a été décidé (voir Décisions ouvertes).

## 6. Découpage technique proposé

Au départ, `src/main.js` (1956 lignes) contenait tout le mode Morceau et
l'en-tête de `index.html` mélangeait les contrôles communs (plein écran) avec
ceux du seul mode Morceau (sélection de morceau, notation, vitesse,
transport). Découpage visé, et état atteint :

```text
src/
  main.js              # bootstrap : charge le registre, affiche l'accueil     [fait]
  navigation.js        # registre des fonctionnalités, switchTo(), accueil      [fait]
  song-mode.js         # mode Morceau, migré vers le contrat start()/stop()     [fait]
  viewport.js          # plein écran + mode paysage de la barre commune         [fait]
  music.js             # noms, hauteurs MIDI, positions sur portée (partagé)    [fait]
  audio.js             # échantillonneur piano, lecture d'une note (partagé)    [fait]
  perf.js       # profil de l'appareil : canvas bridé, audio léger       [fait]
  piano.js             # géométrie, rendu et interactions du clavier (partagé)  [pas nécessaire]
```

`viewport.js` ne figurait pas dans la liste d'origine : il est apparu en
séparant la barre commune du mode Morceau, puisque le plein écran et le mode
paysage doivent survivre au changement de fonctionnalité. Il prévient les
fonctionnalités actives par un évènement `viewportchange`, ce qui évite au
mode Morceau de connaître le détail du plein écran ou de la rotation CSS.

`music.js` et `audio.js` ont été extraits le 25/07/2026, exactement au moment
prévu : la Lecture de notes a été la première à en avoir besoin.
`perf.js` s'est ajouté au passage, parce que `audio.js` a besoin du
même profil d'appareil que le canvas du mode Morceau pour choisir son jeu
d'échantillons — le dupliquer l'aurait fait dériver.

`piano.js` n'a **pas** été extrait, et n'a pas à l'être pour l'instant : les
deux claviers de l'application n'ont rien en commun. Celui du mode Morceau
occupe 88 touches dessinées en Canvas, alignées sur des colonnes de notes qui
tombent ; celui de la Lecture de notes est une octave de `<button>` du DOM,
assez larges pour le doigt et activables au clavier. Mutualiser les deux
demanderait d'abstraire une géométrie qu'aucune des deux ne partage
réellement. La règle reste la même : on extraira le jour où deux
fonctionnalités auront besoin du **même** clavier.

`index.html` devra séparer une barre commune (retour à l'accueil, plein
écran) des contrôles propres à chaque fonctionnalité, aujourd'hui tous
regroupés dans le même en-tête. Ce découpage est une direction, pas une
obligation de tout réécrire avant la première version : les extractions se
font au moment où une fonction devient réellement partagée, comme déjà
précisé dans le plan de la [Lecture de notes](02-lecture-notes.md#6-découpage-technique-proposé).

## 7. Étapes de réalisation

### Étape A — Fondations

- [x] Définir le registre des fonctionnalités et sa fiche minimale (id,
  titre, description, statut, start/stop).
- [x] Définir le contrat start(container)/stop() commun.

### Étape B — Interface

- [x] Créer l'écran d'accueil avec une carte par fonctionnalité disponible.
- [x] Ajouter le bouton retour/menu visible depuis toute fonctionnalité
  active.
- [x] Adapter l'en-tête actuel pour séparer les contrôles communs des
  contrôles propres au mode Morceau.
- [x] Vérifier la mise en page sur petite largeur d'écran.

### Étape C — Logique

- [x] Implémenter `switchTo(featureId)` avec arrêt propre puis démarrage.
- [x] Migrer le mode Morceau actuel vers le contrat start()/stop().
- [x] Empêcher qu'une fonctionnalité marquée « Bientôt » ne soit lancée.

### Étape D — Validation

- [x] Vérifier qu'aucun son ni boucle d'animation ne continue après un
  changement de mode.
- [ ] Vérifier la navigation à la souris, au clavier et au toucher.
  (souris et clavier vérifiés sur les deux modes ; le toucher réel reste à
  faire sur appareil)
- [x] Vérifier qu'un changement de mode répété rapidement ne crée pas de
  fuite (écouteurs, timers non annulés).
- [x] Vérifier l'absence de régression du mode Morceau existant.

## 8. Critères d'acceptation

- [x] L'utilisateur voit un écran d'accueil listant les fonctionnalités
  disponibles avant d'entrer dans une fonctionnalité précise.
- [x] Depuis n'importe quelle fonctionnalité active, un bouton permet de
  revenir à l'écran d'accueil.
- [x] Changer de fonctionnalité arrête totalement l'audio et les animations
  de la précédente.
- [x] Le mode Morceau actuel fonctionne à l'identique une fois migré vers la
  navigation.
- [x] L'écran d'accueil et le retour au menu restent utilisables sur petite
  largeur d'écran.

## 9. Validation prévue

- test manuel de l'aller-retour entre l'accueil et chaque fonctionnalité ;
- test de changements de mode répétés pour détecter une fuite de son ou
  d'écouteurs ;
- test des interactions souris, clavier et tactiles ;
- vérification sur une petite largeur d'écran ;
- vérification que le mode Morceau existant ne régresse pas après migration.

### Validation effectuée (25 juillet 2026)

Scénario joué dans Chrome sans interface, sur l'application servie en local :
accueil → mode Morceau → retour, puis trois allers-retours rapides, puis
lecture audio réelle interrompue par un retour à l'accueil.

Constaté :

- accueil : une seule carte, contrôles du mode et bouton retour masqués,
  aucun canvas ;
- mode : canvas créé et dimensionné, contrôles affichés, titre « Morceau »,
  morceau de la bibliothèque chargé (durée 1:51) ;
- contrôles du mode : molette, curseur de position, notation (le rendu du
  canvas change), vitesse (1.5×), changement de morceau, clic sur une touche
  du piano — aucun n'a régressé ;
- retour : canvas retiré, contrôles masqués, `Tone.Transport` à l'arrêt,
  position figée, **aucune nouvelle frame `requestAnimationFrame`**,
  minuterie d'autosauvegarde annulée, touche Espace devenue inerte (preuve
  que les écouteurs ont bien été retirés) ;
- allers-retours rapides : un seul canvas, bibliothèque non dupliquée, une
  seule minuterie d'autosauvegarde, aucune boucle résiduelle ;
- lecture audio : contexte démarré, transport démarré, position qui avance,
  puis silence complet au retour à l'accueil, et lecture de nouveau possible
  après un `stop()` complet ;
- aucune erreur console sur l'ensemble du scénario ;
- mise en page mesurée à 360×640, 390×844, 844×390 et 1280×800 : plus aucun
  débordement horizontal (l'ancien en-tête débordait de 77 px en 360 px de
  large) et curseur de position enfin manipulable sur téléphone.

Restent à vérifier à la main, hors de portée d'un navigateur sans interface :
le toucher réel sur appareil, les boutons plein écran et paysage.

### Deuxième validation — deux fonctionnalités au registre (25 juillet 2026)

Même dispositif, scénario rejoué après l'ajout de la carte Lecture de notes et
l'extraction de `music.js` / `audio.js` / `perf.js` : **101 vérifications
sur 101**, trois exécutions consécutives sans écart. Ce qui concerne
directement la navigation :

- accueil : deux cartes, toutes deux lançables ;
- entrée dans la Lecture de notes : titre de la barre à jour, bouton retour
  visible, `#songControls` masqué, aucun canvas dans la scène ;
- retour à l'accueil déclenché **pendant** la transition vers la question
  suivante : la minuterie en vol ne restaure rien, la scène reste l'accueil ;
- aucune boucle `requestAnimationFrame` créée par le mode Lecture de notes,
  et aucune frame supplémentaire après le retour ;
- des minuteries encore vivantes après `stop()` proviennent uniquement de
  `standardized-audio-context` (dépendance interne de Tone.js), aucune du
  mode ;
- quatre allers-retours rapprochés : un seul écran de mode, aucune minuterie
  accumulée ;
- non-régression du mode Morceau après l'extraction : morceau chargé, durée
  lue, bibliothèque remplie, notation qui modifie le rendu du canvas, vitesse
  à 1.5×, clic sur une touche du piano, lecture audio réelle dont la position
  avance, puis transport arrêté et canvas retiré au retour à l'accueil ;
- aucune erreur console sur l'ensemble du scénario.

## 10. Décisions ouvertes

- Faut-il un routing par URL (par exemple `#lecture-notes`) pour permettre
  le rafraîchissement de page et le partage d'un lien direct, ou l'état en
  mémoire suffit-il pour cette première version ?
- Faut-il mémoriser localement la dernière fonctionnalité utilisée pour
  proposer un raccourci « Reprendre » à l'ouverture ?
- Faut-il un espace « Bientôt disponible » sur l'écran d'accueil pour des
  fonctionnalités déjà envisagées mais pas encore détaillées, ou l'écran ne
  doit-il lister que ce qui est réellement construit ?

## 11. Première priorité — faite

Construire une boucle minimale : **écran d'accueil avec une seule carte
(Morceau) → clic → mode Morceau migré démarre → bouton retour → accueil.**
Cette boucle doit être stable avant d'ajouter la carte Lecture de notes,
pour vérifier que le contrat start()/stop() fonctionne réellement avec la
seule fonctionnalité déjà riche de l'application.

Cette boucle est en place et vérifiée (§ 9). La prédiction s'est confirmée le
25/07/2026 : la carte **Lecture de notes** a été ajoutée au registre en une
ligne de `main.js`, **sans toucher à `navigation.js`**. Le contrat
`start(container)` / `stop()` a donc tenu pour une deuxième fonctionnalité,
avec un cycle de vie très différent du premier (pas de canvas, pas de boucle
`requestAnimationFrame`, mais des minuteries de transition entre questions).

## 12. Ce qui existe dans le code

- `src/main.js` (20 lignes) : amorçage seul — contrôles communs puis registre.
  Ajouter une fonctionnalité = ajouter sa fiche à `FEATURES`.
- `src/navigation.js` : registre, `switchTo(featureId)`, écran d'accueil.
  `switchTo(null)` revient à l'accueil ; une fiche « Bientôt » ou inconnue ne
  démarre jamais (carte rendue en `<button disabled>` + garde dans
  `switchTo`).
- `src/song-mode.js` : le mode Morceau, inchangé dans son rendu, exposé par la
  fiche `songFeature` et encadré par `start(container)` / `stop()`.
- `src/note-reading-mode.js` : le mode Lecture de notes (fiche
  `noteReadingFeature`), même contrat de cycle de vie.
- `src/note-reading-engine.js` : le moteur de l'exercice, sans DOM ni son.
- `src/viewport.js` : plein écran et mode paysage de la barre commune.
- `src/music.js`, `src/audio.js`, `src/perf.js` : les briques partagées
  par les deux modes (cf. § 6).
- `index.html` : `.appbar` (retour, nom du mode, paysage, plein écran) et
  `#songControls` (bibliothèque, notation, vitesse, transport) sont deux blocs
  distincts ; `<main id="stage">` est vide et appartient à la fonctionnalité
  active. La Lecture de notes n'a rien ajouté à l'en-tête : ses réglages
  vivent dans la scène, ce qui évite un troisième bloc de contrôles.

Trois choix de mise en œuvre méritent d'être connus avant la suite :

1. **Tout l'état du mode vit dans une session recréée par `start()`.** Les
   rappels asynchrones capturent leur session et abandonnent si elle porte
   `stopped` : quitter le mode pendant le chargement d'un morceau ou des
   échantillons audio ne peut plus faire sonner une note ni dessiner après
   coup.
2. **Les écouteurs sont posés avec un `AbortController`.** `stop()`
   interrompt le contrôleur, ce qui retire d'un seul coup les écouteurs du
   canvas, des contrôles, de `window` et de `document` — y compris ceux
   qu'une future fonctionnalité ajouterait.
3. **`stop()` libère la chaîne audio** (Part, échantillonneur, réverbération)
   au lieu de la garder en mémoire. Les échantillons seront re-décodés au
   premier son de la visite suivante ; c'est le prix d'une garantie simple
   « rien ne survit à `stop()` ». Si ce délai devient gênant, c'est le futur
   `audio.js` partagé qui devra porter le cache, pas le mode.

`stop()` est synchrone, ce qui satisfait la règle « `start()` de la suivante
n'est pas appelé avant la fin de `stop()` ». Si une fonctionnalité future a
besoin d'un arrêt asynchrone, c'est `switchTo()` qu'il faudra rendre
asynchrone, à un seul endroit.
