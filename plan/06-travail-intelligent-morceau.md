# Feature 06 — Travail intelligent d'un morceau

> Statut : planifiée — aucune partie n'est encore implémentée.
> Évolution directe de [01 — Apprentissage d'un morceau](01-apprentissage-morceau.md),
> dont elle tranche les décisions restées ouvertes.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir les cinq outils de travail (passages, mains, boucle, attente, tempo).
- [x] Définir la règle de progression du tempo.
- [x] Définir ce qu'est un passage « maîtrisé ».
- [ ] Implémenter le découpage en passages.
- [ ] Implémenter le travail d'une main séparément.
- [ ] Implémenter la boucle d'un passage.
- [ ] Implémenter le mode « attendre la bonne note ».
- [ ] Implémenter la montée progressive du tempo.

## 1. Problème utilisateur

Le mode Morceau actuel joue le morceau du début à la fin. Or on n'apprend pas
un morceau en le rejouant entièrement à vitesse normale : on isole les
passages difficiles, on travaille chaque main séparément, on répète lentement,
puis on accélère. Aujourd'hui l'utilisateur ne peut faire aucune de ces
choses : il ne dispose que d'une barre de progression et d'un réglage de
vitesse globaux.

## 2. Objectif

Transformer le lecteur pédagogique actuel en véritable outil de travail :
isoler un passage, le travailler main par main, le boucler, attendre les
bonnes notes, puis remonter le tempo progressivement jusqu'au tempo réel.

## 3. Relation avec la feature 01

Ce plan répond aux décisions listées comme ouvertes dans
[01](01-apprentissage-morceau.md#décisions-à-prendre-avant-la-prochaine-évolution) :

| Décision ouverte dans 01 | Réponse apportée ici |
| --- | --- |
| Le morceau attend-il la bonne note avant de continuer ? | Oui, mais uniquement en mode **Attente** (section 7), qui reste optionnel |
| Comment travailler séparément main droite / main gauche / les deux ? | Section 6 |
| Bilan d'un passage et critère « morceau appris » | Section 9 |
| Piano à l'écran, piano MIDI physique, ou les deux ? | Les deux : le piano à l'écran suffit pour un passage court, [F2](F2-entree-midi.md) est nécessaire pour un travail réel |
| Données de progression à conserver | Déléguées à [F3 — Suivi de progression](F3-suivi-progression.md) |

Les briques déjà en place dans 01 sont réutilisées telles quelles : analyse
des pistes, distinction des deux mains, piano roll, audio, curseur de
position et réglage de vitesse (0,25× à 2×).

## 4. Les cinq outils de travail

| Outil | Ce que fait l'utilisateur | Base existante |
| --- | --- | --- |
| **Passages** | Découpe le morceau en sections courtes et nommées | Curseur de position et durée du morceau déjà connus |
| **Mains** | Joue seulement la main droite, la main gauche, ou les deux | Les deux mains sont déjà distinguées visuellement |
| **Boucle** | Répète un passage en continu | Lecture et repositionnement déjà en place |
| **Attente** | Le défilement s'arrête jusqu'à ce que la bonne note soit jouée | Piano à l'écran déjà jouable ; [F2](F2-entree-midi.md) pour un piano physique |
| **Tempo progressif** | Repart plus vite après une réussite propre | Réglage de vitesse déjà en place |

Ces cinq outils sont combinables : le cas d'usage central est « boucler le
passage 3, main gauche seule, en mode attente, à 60 % du tempo ».

## 5. Découpage en passages

Trois façons de créer un passage, de la plus simple à la plus élaborée :

1. **Manuel** : l'utilisateur place un début et une fin sur la timeline
   existante. Suffisant pour le MVP.
2. **Par mesures** : découpage automatique tous les N mesures, en s'appuyant
   sur le tempo et la signature rythmique du fichier MIDI.
3. **Par phrases** : détection des silences pour proposer des coupures
   musicalement logiques. À évaluer plus tard, car un découpage faux serait
   plus gênant qu'utile.

Un passage retient : un identifiant, un titre libre, un instant de début et
de fin, et le tempo de travail atteint. Les passages d'un morceau doivent
survivre à un rechargement de la page (voir
[F3](F3-suivi-progression.md)).

## 6. Travail d'une main séparément

- **Main droite seule** / **Main gauche seule** / **Les deux**.
- La main non travaillée peut être : masquée, ou affichée en gris et jouée
  par l'application en accompagnement. Le second comportement est le plus
  utile pédagogiquement — il garde le repère musical — et doit être
  proposé comme réglage.
- En mode Attente, seules les notes de la main travaillée sont attendues :
  les notes de la main d'accompagnement ne bloquent jamais le défilement.

## 7. Mode « attendre la bonne note »

- Le défilement s'arrête à l'instant de la prochaine note attendue et
  reprend dès qu'elle est jouée correctement.
- Un accord attend **toutes** ses notes, dans n'importe quel ordre, sans
  contrainte de simultanéité stricte dans cette première version.
- Une note fausse ne fait pas reculer le morceau : elle est signalée
  brièvement, la note attendue reste attendue. Cette règle prolonge celle
  déjà retenue pour la Lecture de notes
  ([02](02-lecture-notes.md#5-règles-pédagogiques-du-mvp) : « ne jamais
  changer de note après une mauvaise réponse »).
- Une aide doit rester disponible après plusieurs échecs sur la même note
  (mise en évidence de la touche attendue), sans passer la note
  automatiquement.
- Le mode Attente est désactivable : sans lui, le morceau défile au tempo
  choisi et l'utilisateur suit comme aujourd'hui.

## 8. Montée progressive du tempo

Le tempo de travail est exprimé en pourcentage du tempo réel du morceau
(par exemple 60 %), ce qui reste compatible avec le réglage de vitesse
existant.

Règle retenue : **le tempo ne monte qu'après une exécution propre du
passage**, jamais automatiquement au bout d'un certain temps. Cette règle est
la même que celle déjà posée pour les Exercices techniques
([03](03-technique-doigts.md#10-sécurité-et-bonnes-habitudes) : « ne pas
augmenter automatiquement le tempo après une série imprécise »).

- après une exécution propre : proposer +5 à +10 % au tour suivant ;
- après une exécution imprécise : rester au même tempo, ou proposer de
  redescendre si plusieurs échecs de suite ;
- l'utilisateur garde toujours la main sur le tempo, la proposition n'est
  jamais imposée ;
- le tempo maximal joué proprement pour un passage est conservé (voir
  [F3](F3-suivi-progression.md)).

Une exécution est « propre » lorsqu'elle atteint le seuil défini en section 9.

## 9. Passage maîtrisé et morceau appris

Sans entrée de notes (pratique libre, sans MIDI et sans clic), aucune
précision ne peut être mesurée : le suivi se limite alors au nombre de
répétitions et au tempo utilisé. Cette règle reprend celle déjà posée dans
[03](03-technique-doigts.md#9-retour-et-bilan) — ne jamais afficher une
précision que l'application n'a pas mesurée.

Avec les notes détectées (piano à l'écran ou [F2](F2-entree-midi.md)) :

- **exécution propre** : le passage est joué sans note manquée ni note
  fausse, en mode non-Attente ;
- **passage maîtrisé** : plusieurs exécutions propres au tempo cible, sur
  au moins deux séances distinctes — pas une seule réussite isolée. Ce
  critère reprend le principe déjà retenu pour les notes en
  [02](02-lecture-notes.md#5-règles-pédagogiques-du-mvp) ;
- **morceau appris** : tous les passages du morceau maîtrisés, plus au
  moins une exécution propre du morceau entier au tempo cible.

## 10. Écran de travail

Ajouts à l'écran du mode Morceau existant :

- la liste des passages, avec l'état de chacun et le tempo atteint ;
- les bornes du passage actif, visibles et déplaçables sur la timeline ;
- le sélecteur de main ;
- les interrupteurs Boucle et Attente ;
- le tempo de travail en pourcentage du tempo réel ;
- le compteur de répétitions du passage en cours ;
- l'accès au bilan du passage.

Ces contrôles ne doivent pas surcharger l'écran de lecture simple : le
travail d'un passage est un sous-mode, pas l'état par défaut du mode
Morceau.

## 11. Modèle de données proposé

```js
const practiceSection = {
  id: "s3",
  songId: "mariage-d-amour",
  title: "Passage 3 — main gauche difficile",
  startSeconds: 42.5,
  endSeconds: 58.0,
  targetTempoPercent: 100,
  bestCleanTempoPercent: 70,
  cleanRunsByDate: { "2026-07-24": 2, "2026-07-25": 1 },
};

const practiceSettings = {
  hand: "left", // "right" | "left" | "both"
  otherHand: "accompany", // "hide" | "accompany"
  loop: true,
  waitForCorrectNote: true,
  tempoPercent: 70,
};
```

## 12. Découpage technique proposé

```text
src/
  song-practice.js          # sous-mode travail : passages, boucle, attente, tempo
  song-mode.js              # mode Morceau existant (lecture), migré via F1
```

`song-practice.js` doit s'appuyer sur l'état du morceau déjà construit par le
mode Morceau plutôt que de réanalyser le fichier MIDI. La détection des notes
jouées passe par la même API que les autres fonctionnalités
([F2](F2-entree-midi.md)), et non par une écoute MIDI propre à ce mode.

## 13. Étapes de réalisation

### Étape A — Passages et boucle

- [ ] Créer, renommer et supprimer un passage manuellement.
- [ ] Afficher les bornes du passage sur la timeline existante.
- [ ] Limiter la lecture au passage actif.
- [ ] Boucler le passage sans coupure audio ni dérive de synchronisation.
- [ ] Conserver les passages d'un morceau entre deux séances.

### Étape B — Mains

- [ ] Jouer uniquement la main choisie.
- [ ] Proposer de masquer ou d'accompagner la main non travaillée.
- [ ] Vérifier que l'accompagnement ne bloque jamais le mode Attente.

### Étape C — Attente de la bonne note

- [ ] Arrêter le défilement sur la prochaine note attendue.
- [ ] Valider une note seule, puis un accord dans n'importe quel ordre.
- [ ] Signaler une note fausse sans reculer ni passer la note.
- [ ] Mettre en évidence la touche attendue après plusieurs échecs.
- [ ] Faire fonctionner le mode au piano à l'écran, puis via F2.

### Étape D — Tempo progressif

- [ ] Exprimer le tempo de travail en pourcentage du tempo réel.
- [ ] Détecter une exécution propre d'un passage.
- [ ] Proposer une augmentation seulement après une exécution propre.
- [ ] Conserver le meilleur tempo propre par passage.

### Étape E — Bilan

- [ ] Afficher le bilan d'un passage (répétitions, tempo, notes à revoir).
- [ ] Marquer un passage comme maîtrisé selon la section 9.
- [ ] Marquer un morceau comme appris selon la section 9.

## 14. Critères d'acceptation

- [ ] L'utilisateur peut découper un morceau en plusieurs passages nommés et
  les retrouver à la séance suivante.
- [ ] Un passage peut être bouclé indéfiniment sans dérive audio-visuelle.
- [ ] Le travail main droite seule, main gauche seule et les deux fonctionne.
- [ ] En mode Attente, le défilement s'arrête jusqu'à la bonne note et une
  note fausse ne fait pas reculer le morceau.
- [ ] Un accord est validé quel que soit l'ordre des notes jouées.
- [ ] Le tempo n'augmente jamais automatiquement après une exécution
  imprécise.
- [ ] Le meilleur tempo propre par passage est conservé entre les séances.
- [ ] Sans détection de notes, aucune précision n'est affichée.
- [ ] Le mode Morceau simple (lecture) reste utilisable sans passer par ces
  outils.

## 15. Validation prévue

- tests unitaires du découpage en passages et des bornes de boucle ;
- tests de la validation d'accord indépendamment de l'ordre des notes ;
- tests de la règle de montée du tempo (propre / imprécis) ;
- test d'une boucle longue pour vérifier l'absence de dérive audio ;
- test manuel au piano à l'écran, puis avec un clavier MIDI physique ;
- vérification que le mode Morceau existant ne régresse pas ;
- vérification sur petite largeur d'écran.

## 16. Décisions ouvertes

- Faut-il une tolérance rythmique en mode non-Attente (une note un peu en
  retard compte-t-elle comme juste ?), et faut-il réutiliser pour cela les
  seuils de l'[Entraînement rythmique](05-entrainement-rythmique.md#5-mesure--trop-tôt--trop-tard-) ?
- Le découpage automatique par mesures est-il assez fiable avec les fichiers
  MIDI de la bibliothèque actuelle, dont les mesures ne sont pas toujours
  propres ?
- Faut-il proposer une réduction du morceau (ne garder que la mélodie) pour
  les morceaux trop denses, ou est-ce hors périmètre ?
- Faut-il gérer le doigté sur un morceau, ou le doigté reste-t-il réservé
  aux [Exercices techniques](03-technique-doigts.md) ?

## 17. Hors périmètre pour le moment

- Pas de détection automatique des passages difficiles à partir des erreurs.
- Pas de génération d'exercices techniques à partir d'un passage du morceau.
- Pas de gestion de la pédale dans le travail d'un passage : voir
  [09 — Exercices de pédale](09-pedale.md).
- Pas de notation affichée sur double portée pendant le travail : voir
  [08 — Lecture de partitions](08-lecture-partitions.md).

## 18. Première priorité

Construire une boucle minimale sur un morceau déjà chargé : **définir un
passage à la main → le boucler → choisir la main gauche seule → travailler à
60 % du tempo → constater que le passage et son tempo sont retrouvés à la
séance suivante.** Le mode Attente vient ensuite, et devient réellement
utile une fois [F2](F2-entree-midi.md) disponible.
