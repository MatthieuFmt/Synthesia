# Fondation F1 — Navigation entre les fonctionnalités

> Statut : planifiée — l'application ne propose aujourd'hui aucun autre point
> d'entrée que le mode Morceau.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir le principe de l'écran d'accueil et du registre de fonctionnalités.
- [x] Définir le contrat commun de démarrage/arrêt d'une fonctionnalité.
- [ ] Créer l'écran d'accueil et le bouton retour.
- [ ] Migrer le mode Morceau actuel vers ce contrat, sans régression.
- [ ] Vérifier l'arrêt propre de l'audio et des animations au changement de mode.

## 1. Problème actuel

`index.html` démarre directement dans le mode Morceau : l'en-tête (import
MIDI, sélection de morceau, notation, vitesse) et la barre de transport sont
aujourd'hui **entièrement dédiés à ce mode**, et `src/main.js` ne connaît
qu'un seul déroulé possible. Rien ne permet de savoir qu'une autre façon de
s'entraîner existe, ni d'y accéder, ni de revenir à un point de départ
commun. Chaque nouvelle fonctionnalité (Lecture de notes, Exercices
techniques, Programme d'entraînement…) aggrave le problème si elle est
ajoutée sans point d'entrée partagé.

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

`src/main.js` (1956 lignes) contient aujourd'hui tout le mode Morceau, et
l'en-tête de `index.html` mélange les contrôles communs (plein écran) et les
contrôles propres au mode Morceau (import MIDI, sélection de morceau,
notation, vitesse, transport). Avant d'ajouter d'autres fonctionnalités :

```text
src/
  main.js              # bootstrap : charge le registre, affiche l'accueil
  navigation.js        # registre des fonctionnalités, switchTo(), écran d'accueil
  song-mode.js         # mode Morceau actuel, migré vers le contrat start()/stop()
  music.js             # noms, hauteurs MIDI, positions sur portée (partagé)
  audio.js             # initialisation et lecture d'une note (partagé)
  piano.js             # géométrie, rendu et interactions du clavier (partagé)
```

`index.html` devra séparer une barre commune (retour à l'accueil, plein
écran) des contrôles propres à chaque fonctionnalité, aujourd'hui tous
regroupés dans le même en-tête. Ce découpage est une direction, pas une
obligation de tout réécrire avant la première version : les extractions se
font au moment où une fonction devient réellement partagée, comme déjà
précisé dans le plan de la [Lecture de notes](02-lecture-notes.md#6-découpage-technique-proposé).

## 7. Étapes de réalisation

### Étape A — Fondations

- [ ] Définir le registre des fonctionnalités et sa fiche minimale (id,
  titre, description, statut, start/stop).
- [ ] Définir le contrat start(container)/stop() commun.

### Étape B — Interface

- [ ] Créer l'écran d'accueil avec une carte par fonctionnalité disponible.
- [ ] Ajouter le bouton retour/menu visible depuis toute fonctionnalité
  active.
- [ ] Adapter l'en-tête actuel pour séparer les contrôles communs des
  contrôles propres au mode Morceau.
- [ ] Vérifier la mise en page sur petite largeur d'écran.

### Étape C — Logique

- [ ] Implémenter `switchTo(featureId)` avec arrêt propre puis démarrage.
- [ ] Migrer le mode Morceau actuel vers le contrat start()/stop().
- [ ] Empêcher qu'une fonctionnalité marquée « Bientôt » ne soit lancée.

### Étape D — Validation

- [ ] Vérifier qu'aucun son ni boucle d'animation ne continue après un
  changement de mode.
- [ ] Vérifier la navigation à la souris, au clavier et au toucher.
- [ ] Vérifier qu'un changement de mode répété rapidement ne crée pas de
  fuite (écouteurs, timers non annulés).
- [ ] Vérifier l'absence de régression du mode Morceau existant.

## 8. Critères d'acceptation

- [ ] L'utilisateur voit un écran d'accueil listant les fonctionnalités
  disponibles avant d'entrer dans une fonctionnalité précise.
- [ ] Depuis n'importe quelle fonctionnalité active, un bouton permet de
  revenir à l'écran d'accueil.
- [ ] Changer de fonctionnalité arrête totalement l'audio et les animations
  de la précédente.
- [ ] Le mode Morceau actuel fonctionne à l'identique une fois migré vers la
  navigation.
- [ ] L'écran d'accueil et le retour au menu restent utilisables sur petite
  largeur d'écran.

## 9. Validation prévue

- test manuel de l'aller-retour entre l'accueil et chaque fonctionnalité ;
- test de changements de mode répétés pour détecter une fuite de son ou
  d'écouteurs ;
- test des interactions souris, clavier et tactiles ;
- vérification sur une petite largeur d'écran ;
- vérification que le mode Morceau existant ne régresse pas après migration.

## 10. Décisions ouvertes

- Faut-il un routing par URL (par exemple `#lecture-notes`) pour permettre
  le rafraîchissement de page et le partage d'un lien direct, ou l'état en
  mémoire suffit-il pour cette première version ?
- Faut-il mémoriser localement la dernière fonctionnalité utilisée pour
  proposer un raccourci « Reprendre » à l'ouverture ?
- Faut-il un espace « Bientôt disponible » sur l'écran d'accueil pour des
  fonctionnalités déjà envisagées mais pas encore détaillées, ou l'écran ne
  doit-il lister que ce qui est réellement construit ?

## 11. Première priorité

Construire une boucle minimale : **écran d'accueil avec une seule carte
(Morceau) → clic → mode Morceau migré démarre → bouton retour → accueil.**
Cette boucle doit être stable avant d'ajouter la carte Lecture de notes,
pour vérifier que le contrat start()/stop() fonctionne réellement avec la
seule fonctionnalité déjà riche de l'application.
