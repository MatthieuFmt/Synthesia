# Feature 03 — Exercices techniques et agilité des doigts

> Statut : planifiée — aucun exercice technique n'est encore implémenté.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir le principe de la fonctionnalité.
- [x] Définir les familles du premier MVP.
- [x] Définir la présentation et les réglages principaux.
- [ ] Ajouter le mode Exercices à la navigation.
- [ ] Créer le catalogue et le générateur d'exercices.
- [ ] Implémenter le décompte, le métronome et les répétitions.
- [ ] Implémenter les trois familles du MVP.
- [ ] Valider la pratique avec et sans clavier MIDI.

## 1. Objectif

Proposer de courtes séances pour développer progressivement :

- l'indépendance et la régularité des doigts ;
- la souplesse des déplacements ;
- la précision des accords ;
- la continuité des arpèges ;
- la coordination entre les deux mains ;
- la stabilité du rythme.

Un exercice doit durer quelques minutes, avoir un but clair et pouvoir être
répété lentement avant d'augmenter le tempo.

## 2. Présentation générale

Les exercices se présentent comme de petits morceaux classiques dans le piano
roll actuel :

1. choisir une famille d'exercices ;
2. choisir le niveau, la main, le tempo et le nombre de répétitions ;
3. lire une courte consigne et voir le doigté ;
4. écouter éventuellement une démonstration ;
5. démarrer après un décompte ;
6. suivre les notes qui arrivent sur le clavier ;
7. répéter automatiquement le motif ;
8. consulter un bilan court.

Le piano roll, le piano, l'audio, la vitesse et les couleurs des deux mains
doivent être partagés avec le mode Morceau. L'exercice doit toutefois être
identifié comme une séance, avec son objectif et son nombre de répétitions,
plutôt que comme un morceau de la bibliothèque.

## 3. Pratique sur un vrai piano

Cliquer le piano à la souris ou au toucher permet de découvrir les notes, mais
ne permet pas de travailler réellement le doigté. Deux fonctionnements sont
donc nécessaires :

### Pratique libre

- l'application montre le motif, le tempo et le doigté ;
- l'utilisateur joue sur son piano acoustique ou numérique ;
- l'application contrôle le décompte, le métronome et les répétitions ;
- aucun score de précision n'est inventé puisque les notes jouées ne sont pas
  détectées.

### Pratique avec clavier MIDI

S'appuie sur la fondation [F2 — Entrée MIDI](F2-entree-midi.md) pour la
détection, la connexion et la réception des notes :

- l'application reçoit les notes d'un piano MIDI compatible ;
- elle peut attendre les bonnes notes en mode guidé ;
- elle mesure la précision des notes et la régularité rythmique ;
- elle met en évidence les passages à retravailler.

La pratique libre suffit pour une première version utile. La validation MIDI
peut être ajoutée ensuite sans changer le catalogue d'exercices.

## 4. Familles d'exercices

| Famille | But | Contenu du MVP | Progression future |
| --- | --- | --- | --- |
| **Déliement** | Indépendance et égalité des doigts | Motifs de cinq notes, ascendants et descendants | Déplacements, rythmes variés et motifs plus complexes |
| **Accords** | Placer plusieurs doigts ensemble avec précision | Accords majeurs simples et enchaînement Do–Fa–Sol–Do | Accords mineurs, renversements et changements de tonalité |
| **Arpèges** | Enchaîner les notes d'un accord sans rupture | Arpège de Do majeur sur une octave | Plusieurs tonalités, renversements et plusieurs octaves |
| **Gammes** | Passage du pouce et régularité | Hors MVP | Majeures, mineures, mouvement parallèle et contraire |
| **Coordination** | Rendre les mains indépendantes | Hors MVP | Rythmes différents, réponses entre les mains et accents |
| **Rythme** | Stabiliser la pulsation | Hors MVP | Notes répétées, syncopes et variantes rythmiques |

Le premier MVP doit proposer au moins un exercice complet dans chacune des
trois premières familles : Déliement, Accords et Arpèges.

## 5. Niveaux de difficulté

Le niveau modifie le motif, l'étendue, les tonalités et le doigté. Le tempo
reste un réglage séparé : jouer plus vite ne doit pas être la seule définition
de la difficulté.

### Débutant

- tonalité de Do majeur ;
- motifs courts sur cinq notes ou une octave ;
- doigté toujours visible ;
- une main à la fois recommandée ;
- tempo de départ lent.

### Intermédiaire

- tonalités de Sol et Fa majeur en plus de Do ;
- accords avec premiers renversements ;
- arpèges sur une ou deux octaves ;
- variantes rythmiques simples ;
- exercices possibles avec les deux mains.

### Difficile

- davantage de tonalités ;
- déplacements plus larges et lignes supplémentaires ;
- accords et arpèges avec plusieurs renversements ;
- motifs différents ou décalés entre les deux mains ;
- doigté masquable après la démonstration.

## 6. Choix de main

Chaque exercice indique les modes qu'il prend réellement en charge :

- **Main droite** ;
- **Main gauche** ;
- **Les deux**.

Le mode Les deux peut utiliser plusieurs comportements selon l'exercice :

- mouvement parallèle ;
- mouvement contraire ;
- alternance entre les mains ;
- accords ou rythmes simultanés.

Le comportement doit être annoncé avant le démarrage. Le générateur ne doit
pas proposer automatiquement Les deux si le doigté correspondant n'a pas été
défini et vérifié.

## 7. Réglages d'une séance

Le premier écran d'un exercice propose :

- famille et exercice ;
- difficulté ;
- main droite, main gauche ou les deux ;
- tempo ;
- nombre de répétitions ;
- démonstration activée ou non ;
- métronome activé ou non.

Les valeurs par défaut doivent être adaptées au niveau. Le bouton principal
doit permettre de démarrer sans devoir modifier tous les réglages.

## 8. Écran d'exercice

Afficher :

- le nom et le but de l'exercice ;
- une consigne courte, par exemple « régularité avant vitesse » ;
- le doigté au-dessus ou au-dessous des notes ;
- le piano roll et le clavier ;
- le tempo ;
- le numéro de la répétition, par exemple `3 / 8` ;
- un décompte d'une mesure avant le départ ;
- les contrôles pause, recommencer et quitter.

À la fin d'une répétition, laisser une courte respiration ou repartir sur la
mesure suivante selon l'exercice. Ce comportement appartient à la définition
de l'exercice et ne doit pas varier au hasard.

## 9. Retour et bilan

Les résultats durables (exercices maîtrisés, tempo maximal joué proprement,
évolution par main) sont conservés par
[F3 — Suivi de progression](F3-suivi-progression.md) et non par ce mode.

Sans clavier MIDI, afficher uniquement des mesures réellement connues :

- durée de la séance ;
- tempo utilisé ;
- répétitions terminées ;
- proposition de refaire au même tempo ou légèrement plus vite.

Avec un clavier MIDI, ajouter :

- notes correctes ;
- régularité du rythme ;
- erreurs par main ;
- transitions ou accords à retravailler.

Ne jamais afficher un pourcentage de précision lorsque l'application n'a pas
reçu les notes jouées.

## 10. Sécurité et bonnes habitudes

- Commencer lentement et privilégier un geste détendu.
- Ajouter une courte pause entre les séries.
- Ne pas augmenter automatiquement le tempo après une série imprécise.
- Conseiller d'arrêter en cas de douleur ou de tension inhabituelle.
- Ne pas présenter la vitesse comme l'unique mesure de progression.

L'application guide la pratique mais ne remplace pas les conseils d'un
professeur pour la posture et le geste.

## 11. Modèle de données proposé

Les exercices doivent être décrits par des données puis générés, plutôt que
stockés comme une longue liste de fichiers MIDI presque identiques.

```js
const exercise = {
  id: "five-finger-c-major-01",
  family: "finger-independence",
  title: "Cinq doigts en Do majeur",
  goal: "Régularité des cinq doigts",
  difficulty: "beginner",
  supportedHands: ["right", "left", "both"],
  supportedKeys: ["C"],
  defaultTempo: 60,
  defaultRepetitions: 4,
  pattern: [0, 1, 2, 3, 4, 3, 2, 1],
  fingering: {
    right: [1, 2, 3, 4, 5, 4, 3, 2],
    left: [5, 4, 3, 2, 1, 2, 3, 4],
  },
};
```

Le générateur transforme cette définition en notes normalisées compatibles
avec le rendu du mode Morceau. Cette compatibilité permet de réutiliser le
piano roll et l'audio sans maintenir deux moteurs de lecture.

## 12. Découpage technique proposé

```text
src/
  exercise-mode.js              # parcours et état de la séance
  exercises/
    catalog.js                  # définitions des exercices
    generate-exercise.js        # notes, mains, doigtés et répétitions
  metronome.js                  # décompte et pulsation partagés
```

`metronome.js` est réutilisé et étendu par l'
[Entraînement rythmique](05-entrainement-rythmique.md) (réglage de tempo
visible, exposition de la pulsation pour mesurer l'avance/le retard) : il ne
doit pas être dupliqué entre les deux fonctionnalités.

Ce découpage reste indicatif. Les modules partagés avec les autres modes ne
doivent être extraits que lorsque leurs responsabilités sont claires.

## 13. Étapes de réalisation

### Étape A — Catalogue

- [ ] Définir le format d'un exercice.
- [ ] Créer un exercice de déliement sur cinq notes.
- [ ] Créer un exercice d'accords Do–Fa–Sol–Do.
- [ ] Créer un exercice d'arpège de Do majeur.
- [ ] Vérifier les notes et les doigtés pour chaque main.

### Étape B — Génération

- [ ] Transformer un motif en notes jouables.
- [ ] Générer la bonne octave pour chaque main.
- [ ] Générer le mode Les deux uniquement lorsqu'il est défini.
- [ ] Répéter le motif sans rupture de mesure.
- [ ] Produire un résultat compatible avec le piano roll existant.

### Étape C — Interface

- [ ] Ajouter la carte Exercices à la navigation.
- [ ] Créer le choix de la famille et de l'exercice.
- [ ] Ajouter difficulté, main, tempo et répétitions.
- [ ] Afficher le but, la consigne et le doigté.
- [ ] Ajouter le décompte, le métronome et la progression.
- [ ] Ajouter la démonstration, la pause et le redémarrage.
- [ ] Ajouter le bilan sans métrique inventée.

### Étape D — Validation MIDI

Réutilise la fondation [F2 — Entrée MIDI](F2-entree-midi.md) pour la
détection, la connexion et la réception des notes ; cette étape ne recode
pas cette partie et se concentre sur la validation propre aux exercices.

- [ ] S'abonner aux évènements de F2 pendant une séance d'exercice.
- [ ] Valider les notes seules et les accords attendus par l'exercice.
- [ ] Mesurer le rythme sans rendre l'exercice inutilement punitif.
- [ ] Conserver la pratique libre lorsque MIDI n'est pas disponible.

## 14. Critères d'acceptation du MVP

Le MVP est terminé lorsque :

- l'utilisateur peut ouvrir le mode Exercices sans charger de morceau ;
- les catégories Déliement, Accords et Arpèges contiennent chacune un exercice ;
- l'utilisateur peut choisir difficulté, main, tempo et répétitions ;
- l'exercice affiche son objectif et son doigté avant de commencer ;
- un décompte précède la première note ;
- le motif apparaît dans le piano roll et utilise le clavier existant ;
- le nombre demandé de répétitions est respecté ;
- pause et recommencer fonctionnent sans décaler l'audio ;
- le mode Les deux utilise des notes et des doigtés vérifiés ;
- le bilan sans MIDI n'affiche aucune fausse précision ;
- quitter le mode arrête l'audio et le métronome ;
- les modes Morceau et Lecture de notes ne régressent pas.

## 15. Validation prévue

- tests unitaires du générateur de notes et de répétitions ;
- tests des accords produits, indépendamment de leur ordre interne ;
- tests de l'ordre des notes pour les arpèges ;
- tests des octaves et doigtés de chaque main ;
- test du décompte et de la boucle au changement de tempo ;
- test manuel avec pratique libre ;
- test manuel avec un clavier MIDI compatible lorsqu'elle sera implémentée ;
- vérification sur ordinateur et petite largeur d'écran ;
- vérification du changement de mode pendant une séance.

## 16. Première priorité

Construire une boucle complète avec l'exercice de cinq doigts en Do majeur :

**choisir Exercices → choisir la main et le tempo → lire la consigne → entendre
le décompte → jouer quatre répétitions → voir le bilan.**

Une fois cette boucle stable, le même moteur accueillera les accords et les
arpèges du MVP.
