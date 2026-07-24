# Feature 02 — Lecture de notes

> Statut : planifiée — aucune partie de l'exercice n'est encore implémentée.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir le principe pédagogique.
- [x] Définir les niveaux et les choix de main.
- [x] Définir le MVP et ses critères d'acceptation.
- [ ] Ajouter la navigation vers le mode Lecture de notes.
- [ ] Implémenter le moteur d'exercice.
- [ ] Implémenter l'interface.
- [ ] Valider les neuf combinaisons de niveau et de main.

## 1. Vision

Faire de l'application un outil simple et progressif pour apprendre le piano,
pas seulement un lecteur de fichiers MIDI.

L'apprentissage doit suivre une boucle courte :

1. comprendre ;
2. essayer ;
3. recevoir un retour immédiat ;
4. recommencer en insistant sur les difficultés ;
5. constater sa progression.

## 2. État actuel

L'application propose aujourd'hui un **mode Morceau** :

- choix ou import d'un fichier MIDI ;
- visualisation des notes qui défilent vers le clavier ;
- lecture audio, pause, déplacement dans le morceau et réglage de la vitesse ;
- distinction main gauche / main droite ;
- affichage facultatif des notes sur une mini-portée ;
- piano à l'écran jouable à la souris ou au toucher.

Ces éléments sont une bonne base : le clavier, le son, la conversion des notes
MIDI et une partie du rendu de portée pourront être partagés avec les futurs
exercices.

## 3. Première nouvelle fonctionnalité : lire les notes

### Recommandation

Commencer par un exercice **sans défilement et sans limite de temps** :

- une note est affichée, seule, sur une vraie portée ;
- l'utilisateur clique sur la touche correspondante du piano ;
- la réponse est corrigée immédiatement ;
- la question suivante apparaît après une bonne réponse.

Ce format isole la compétence à apprendre : reconnaître une note. Faire tomber
les notes dès le début mélange lecture et rapidité. Le défilement reste une très
bonne idée, mais comme second niveau, lorsque les correspondances
portée-clavier sont déjà connues.

### Parcours pédagogique proposé

1. **Découverte**
   - trois à cinq notes proches du Do central ;
   - nom de la note visible ;
   - touche correspondante montrée après une erreur ou sur demande.
2. **Entraînement**
   - note fixe sur la portée ;
   - nom masqué ;
   - aucune pression de temps ;
   - répétition plus fréquente des notes mal reconnues.
3. **Consolidation**
   - davantage de notes ;
   - travail séparé ou mélangé de la clé de sol et de la clé de fa ;
   - lignes supplémentaires et altérations introduites progressivement.
4. **Fluidité**
   - notes qui défilent vers le clavier ;
   - vitesse réglable ;
   - série continue et score de précision.

Seul le format **Entraînement**, précédé d'une aide très courte, est nécessaire
pour le premier MVP.

## 4. MVP — Lecture de notes

### Objectif

Permettre à un débutant de terminer une session de dix notes et de comprendre
immédiatement quelles notes il maîtrise ou doit revoir.

### Écran de départ

Ajouter une entrée claire permettant de choisir :

- **Apprendre un morceau** ;
- **Lire les notes**.

Au lancement du mode Lecture, proposer des réglages simples :

- **niveau** : Débutant, Intermédiaire ou Difficile ;
- **main travaillée** : Droite, Gauche ou Les deux ;
- session de 10 notes.

Pour le premier parcours pédagogique :

| Choix | Portée utilisée | Fonctionnement |
| --- | --- | --- |
| **Main droite** | Clé de sol | Questions prises dans la zone jouée par la main droite |
| **Main gauche** | Clé de fa | Questions prises dans la zone jouée par la main gauche |
| **Les deux** | Clé de sol et clé de fa | Questions mélangées et réparties équitablement entre les deux mains |

Avec **Les deux**, une seule portée et une seule note restent affichées à chaque
question. La main et la clé doivent être annoncées clairement. Les questions
seront mélangées, sans alternance droite-gauche prévisible qui permettrait de
deviner la réponse.

### Niveaux de difficulté

Le niveau modifie principalement l'étendue des notes. Il ne doit pas ajouter
une limite de temps : la rapidité appartiendra plus tard au mode Fluidité.

| Niveau | Notes proposées | Aide |
| --- | --- | --- |
| **Débutant** | 5 touches blanches proches du Do central pour chaque main | Indice disponible immédiatement |
| **Intermédiaire** | Toutes les touches blanches de la portée, avec le Do central comme repère | Indice proposé après une première erreur |
| **Difficile** | Étendue élargie avec lignes supplémentaires, toujours sans altération dans le MVP | Indice proposé après deux erreurs |

Les dièses et les bémols seront introduits ensuite comme une progression
distincte. Cela évite de mélanger difficulté de lecture, théorie des
altérations et précision sur les touches noires.

Le premier écran doit présenter ces choix comme de gros boutons simples, pas
comme un formulaire de configuration.

### Écran d'exercice

Afficher :

- une portée centrale, assez grande pour être lisible ;
- la clé utilisée ;
- la main actuellement travaillée lorsque le réglage **Les deux** est actif ;
- une seule note à reconnaître ;
- un piano limité à la zone utile pour la main et le niveau courants,
  idéalement une à deux octaves plutôt que les 88 touches très étroites ;
- la progression de la session, par exemple `4 / 10` ;
- le niveau et le choix de main, modifiables avant de recommencer une session ;
- un bouton **Indice** ;
- un moyen clair de quitter l'exercice.

### Comportement d'une réponse

En cas de bonne réponse :

- jouer la note ;
- colorer brièvement la note et la touche en vert ;
- augmenter la série de bonnes réponses ;
- afficher la question suivante après un court délai.

En cas de mauvaise réponse :

- jouer la touche choisie pour conserver le lien geste-son ;
- signaler brièvement l'erreur sans bloquer ni punir ;
- conserver la même question ;
- proposer l'indice selon la règle du niveau sélectionné ;
- remettre cette note plus tard dans la même session.

Le score doit favoriser l'apprentissage, pas la peur de se tromper. Une erreur
ne retire donc pas de « vie ».

### Fin de session

Afficher un résumé court :

- nombre de notes reconnues du premier coup ;
- précision ;
- meilleure série ;
- deux ou trois notes à revoir, si nécessaire ;
- boutons **Recommencer** et **Continuer**.

## 5. Règles pédagogiques du MVP

- Commencer avec les touches blanches uniquement.
- Utiliser la notation française : Do, Ré, Mi, Fa, Sol, La, Si.
- Associer la main droite à la clé de sol et la main gauche à la clé de fa dans
  ce parcours de lecture.
- En mode Les deux, équilibrer les questions des deux mains sur l'ensemble de
  la session sans utiliser un ordre prévisible.
- Ne pas afficher le nom pendant une question normale.
- Ne jamais changer de note après une mauvaise réponse.
- Éviter de poser immédiatement deux fois la même question, sauf en mode aide.
- Faire revenir plus souvent les notes mal reconnues.
- Ne considérer une note comme acquise qu'après plusieurs bonnes réponses
  espacées, pas après une seule réussite.
- Introduire les notes par petits groupes plutôt que toute la portée à la fois.

## 6. Découpage technique proposé

Le fichier `src/main.js` contient actuellement l'ensemble du mode Morceau. Avant
d'ajouter plusieurs outils d'apprentissage, isoler progressivement les parties
partageables :

```text
src/
  main.js                 # démarrage et choix du mode
  music.js                # noms, hauteurs MIDI, dièses et positions sur portée
  audio.js                # initialisation et lecture d'une note
  piano.js                # géométrie, rendu et interactions du clavier
  song-mode.js            # fonctionnalité actuelle
  note-reading-mode.js    # nouvel exercice
```

Ce découpage est une direction, pas une obligation de tout réécrire avant le
MVP. Les extractions doivent être faites au moment où une fonction devient
réellement partagée.

### Modèle minimal de l'exercice

```js
const settings = {
  difficulty: "beginner", // "beginner" | "intermediate" | "advanced"
  handMode: "right", // "right" | "left" | "both"
  questionCount: 10,
};

const session = {
  currentQuestion: {
    midi: 60,
    hand: "right",
    clef: "treble",
  },
  answeredQuestions: 0,
  attemptsForCurrentNote: 0,
  firstTryCorrect: 0,
  streak: 0,
  bestStreak: 0,
  mistakesByQuestion: new Map(),
};
```

Le groupe de notes doit être calculé à partir de `difficulty` et `handMode`.
Une erreur doit être mémorisée avec la clé en plus de la hauteur MIDI, car une
même touche peut être lue dans des contextes différents.

La sélection de la prochaine note, l'équilibrage des mains et le calcul du
bilan doivent rester indépendants du Canvas. Cela permettra de les tester sans
navigateur.

## 7. Étapes de réalisation

### Étape A — Navigation et fondations

- [ ] Ajouter le choix entre les modes Morceau et Lecture de notes.
- [ ] Conserver le fonctionnement actuel du mode Morceau.
- [ ] Définir une petite API partagée pour jouer une note.
- [ ] Extraire les fonctions musicales nécessaires sans réécriture globale.

### Étape B — Moteur d'exercice

- [ ] Définir un groupe de notes par niveau et par main.
- [ ] Construire le groupe actif à partir des deux réglages.
- [ ] Équilibrer les deux mains sur une session en mode Les deux.
- [ ] Générer une question sans répétition immédiate inutile.
- [ ] Valider la touche choisie.
- [ ] Gérer les tentatives, la série et les erreurs par note.
- [ ] Donner davantage de poids aux notes difficiles.
- [ ] Produire le bilan d'une session.

### Étape C — Interface du MVP

- [ ] Ajouter le choix Débutant / Intermédiaire / Difficile.
- [ ] Ajouter le choix Main droite / Main gauche / Les deux.
- [ ] Dessiner une grande portée et une note unique.
- [ ] Afficher la bonne clé et, si nécessaire, la main courante.
- [ ] Afficher un clavier centré sur la zone travaillée sans révéler la réponse.
- [ ] Ajouter les retours visuels correct / incorrect.
- [ ] Ajouter l'indice, la progression et la sortie.
- [ ] Ajouter l'écran de fin de session.
- [ ] Vérifier l'utilisation à la souris, au clavier et au toucher.

### Étape D — Progression

- [ ] Enregistrer localement les résultats et le dernier niveau.
- [ ] Afficher un bilan séparé par main lorsque Les deux est sélectionné.
- [ ] Reprendre une session avec les notes qui posent le plus de difficultés.
- [ ] Introduire les dièses et les bémols.
- [ ] Proposer plus tard une vraie double portée avec deux notes simultanées.
- [ ] Ajouter ensuite le mode chronométré avec notes défilantes.

## 8. Critères d'acceptation du MVP

Le MVP est terminé lorsque :

- l'utilisateur peut ouvrir le mode Lecture sans charger de morceau ;
- l'utilisateur peut sélectionner l'un des trois niveaux ;
- l'utilisateur peut sélectionner Main droite, Main gauche ou Les deux ;
- chaque combinaison de niveau et de main produit le bon groupe de notes ;
- Main droite affiche la clé de sol et Main gauche la clé de fa ;
- le mode Les deux présente les deux clés au cours de la session avec une
  répartition équilibrée et non prévisible ;
- la portée, la clé et la note sont lisibles sur ordinateur et mobile ;
- seules les touches nécessaires sont assez grandes pour être sélectionnées
  sans ambiguïté ;
- une bonne et une mauvaise réponse produisent des retours distincts et
  immédiats ;
- une erreur conserve la question en cours ;
- une session contient dix notes et se termine par un bilan ;
- les notes difficiles réapparaissent pendant la session ;
- quitter ou recommencer ne perturbe pas le mode Morceau ;
- le mode Morceau existant ne régresse pas.

## 9. Validation prévue

- tests unitaires du choix des notes, des réponses et du calcul du bilan ;
- tests des neuf combinaisons entre les trois niveaux et les trois choix de
  main ;
- test de l'équilibrage droite-gauche sans alternance prévisible ;
- test manuel des deux modes dans un navigateur ;
- test des interactions souris et tactiles ;
- vérification sur une petite largeur d'écran ;
- vérification de l'audio après le premier geste utilisateur ;
- vérification qu'un changement de mode arrête proprement la lecture en cours.

## 10. Première priorité

Construire une petite boucle verticale complète :

**choisir “Lire les notes” → sélectionner le niveau et la main → voir une note
→ cliquer une touche → recevoir le retour → terminer dix questions → voir le
bilan.**

La première implémentation peut être développée avec cinq notes en mode
Débutant / Main droite, mais le MVP n'est terminé que lorsque les trois niveaux
et les choix Main droite / Main gauche / Les deux fonctionnent. Le défilement
vient ensuite.

## 11. Hors périmètre pour le moment

Les autres fonctionnalités d'apprentissage seront discutées après validation
de ce premier mode. Elles ne doivent pas ralentir le MVP Lecture de notes.
