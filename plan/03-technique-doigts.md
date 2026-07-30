# Feature 03 — Exercices techniques et agilité des doigts

> Statut : **MVP complet, en pratique libre et au clavier MIDI** (26/07/2026).
> Boucle complète pour les trois familles du MVP — famille → réglages → consigne
> → décompte d'une mesure → répétitions dans un rouleau avec doigtés → bilan —
> et, si un clavier est branché, un bilan qui dit quelles notes sont passées
> (§ 17). Le sélecteur de niveau est en place depuis le 29/07/2026.
> Le catalogue est complet depuis le 30/07/2026 : **onze familles, trois
> niveaux, trois exercices chacun — 99 exercices**, tous avec doigté et source
> citée ([exercices-catalogue.md](exercices-catalogue.md)). Ce qui reste : le
> test avec un vrai clavier, et l'essai des doigtés sous les doigts.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir le principe de la fonctionnalité.
- [x] Définir les familles du premier MVP.
- [x] Définir la présentation et les réglages principaux.
- [x] Ajouter le mode Exercices à la navigation.
- [x] Créer le catalogue et le générateur d'exercices.
  (`exercises/catalog.js` et `exercises/generate-exercise.js`, sans DOM)
- [x] Implémenter le décompte, le métronome et les répétitions.
  (grille de pulsation partagée dans `metronome.js`, réutilisable par
  [05](05-entrainement-rythmique.md))
- [x] Implémenter les trois familles du MVP.
  (Déliement, Accords et Arpèges, un exercice chacune)
- [x] Valider la pratique avec et sans clavier MIDI.
  (les deux vérifiées le 26/07/2026 — la validation MIDI par une doublure du
  Web MIDI ; reste le test avec un vrai clavier, ligne de [F2](F2-entree-midi.md))
- [x] Ajouter le choix de difficulté.
  (sélecteur famille → niveau → exercice en place, les niveaux vides restant
  visibles et désactivés ; le catalogue a trois niveaux peuplés en Déliement et
  en Gammes depuis le 29/07/2026)
- [x] Remplir le catalogue : 11 familles × 3 niveaux × 3 exercices.
  (**99 exercices le 30/07/2026**, aucune famille vide, vérifiés par
  `tools/verifier-catalogue.js` — détail dans
  [exercices-catalogue.md](exercices-catalogue.md))

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

Onze familles, chacune à trois niveaux et trois exercices par niveau. Le détail
— sources citées, exercice par exercice, et les quatre sujets écartés avec leur
raison — est dans
[exercices-catalogue.md](exercices-catalogue.md).

| Famille | But | État |
| --- | --- | --- |
| **Déliement** | Un doigt tient pendant que les autres jouent | 9/9 |
| **Égalité** | Même son, même durée ; accents déplacés | 9/9 |
| **Notes répétées** | Rejouer une note en changeant de doigt | 9/9 |
| **Gammes** | Passage du pouce sans trou ni accent | 9/9 |
| **Arpèges** | Ouvrir la main sur l'accord et la garder ouverte | 9/9 |
| **Accords** | Plusieurs doigts au même instant ; renversements | 9/9 |
| **Doubles notes** | Tierces et sixtes : deux voix qui s'arrêtent ensemble | 9/9 |
| **Octaves** | Le poignet, pas le bras | 9/9 |
| **Trilles** | Battements entre deux doigts voisins | 9/9 |
| **Extension** | Écarter, passer un doigt par-dessus le pouce | 9/9 |
| **Coordination** | Deux rythmes, deux touchers, deux accentuations | 9/9 |

Le MVP du 26/07/2026 n'en proposait que trois — Déliement, Accords et Arpèges,
un exercice chacune. La famille **Rythme**, un temps déclarée « hors MVP », a
été **retirée** le 30/07/2026 : [05](05-entrainement-rythmique.md) fait le même
travail avec ce que ce mode n'a pas — un jugement à l'heure / en avance / en
retard. Ce qui restait utile ici (rythme pointé, groupes irréguliers) vit
maintenant comme variante d'un geste dans les autres familles.

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

Format réellement en place (26/07/2026), très proche de celui prévu :

```js
const exercise = {
  id: "five-finger-c-major-01",
  family: "finger-independence",
  title: "Cinq doigts en Do majeur",
  goal: "Régularité des cinq doigts",
  instruction: "Régularité avant vitesse : chaque doigt frappe avec la même force.",
  difficulty: "beginner",
  supportedHands: ["right", "left", "both"],
  bothMode: "parallel",   // annoncé avant le départ (§ 6)
  supportedKeys: ["C"],
  defaultTempo: 60,
  defaultRepetitions: 4,
  beatsPerBar: 4,
  beatsPerStep: 1,
  restBeats: 4,           // la respiration appartient à l'exercice (§ 8)
  pattern: [0, 1, 2, 3, 4, 3, 2, 1],
  fingering: {
    right: [1, 2, 3, 4, 5, 4, 3, 2],
    left: [5, 4, 3, 2, 1, 2, 3, 4],
  },
};
```

Trois ajouts par rapport au format prévu, tous nécessaires dès le MVP :

- **un pas peut être un accord.** `pattern` est une suite de *pas* ; un pas est
  soit un degré, soit un tableau de degrés joués ensemble. `fingering` suit la
  même forme. C'est ce qui permet aux accords d'utiliser le même générateur que
  le déliement, au lieu d'un second format.
- **`beatsPerStep` et `restBeats`.** Un accord se tient deux temps, une note du
  déliement un seul ; la respiration vaut une mesure pour le déliement et les
  accords, un seul temps pour l'arpège (qui « repart sur la mesure suivante »).
  Ces trois valeurs sont contraintes : une série doit occuper un nombre entier
  de mesures, sinon la deuxième ne tomberait plus sur un premier temps.
- **`bothMode`.** Le comportement des deux mains est déclaré, jamais deviné :
  sans lui, « Les deux » n'est pas proposé (§ 6).

Les degrés sont **diatoniques**, pas des demi-tons : 0 = tonique, 2 = tierce,
4 = quinte, 7 = octave. Un degré ne dépend donc pas de la tonalité, et ajouter
Sol ou Fa majeur ne demandera pas de réécrire un motif.

Le générateur produit des notes de la **même forme que celles du mode Morceau**
(`{ midi, time, duration, endTime, velocity, hand }`), plus un `finger` et un
`repetition`. C'est cette compatibilité qui permet de dessiner un exercice avec
un rouleau sans maintenir deux moteurs de lecture.

## 12. Découpage technique

Découpage réellement en place (26/07/2026) :

```text
src/
  exercise-mode.js              # parcours, rouleau, transport, bilan      [fait]
  exercises/
    catalog.js                  # définitions des exercices                [fait]
    generate-exercise.js        # notes, mains, doigtés et répétitions     [fait]
  metronome.js                  # décompte et pulsation partagés           [fait]
```

`catalog.js`, `generate-exercise.js` et `metronome.js` ne dépendent ni du DOM,
ni du Canvas, ni de Tone.js : leurs 245 vérifications tournent dans Node
(§ 17). Seul `exercise-mode.js` connaît le navigateur.

`metronome.js` est coupé en deux pour rester dans cette règle :

- **la grille de pulsation** est de l'arithmétique pure (`createBeatGrid()`) :
  instant d'un temps, rang dans la mesure, temps de décompte, et
  `nearestBeat()` qui rend l'écart signé d'une frappe à sa pulsation ;
- **la lecture de la grille** (`scheduleClicks()`) reçoit son ordonnanceur en
  paramètre : le mode lui passe un `Tone.Part`, les tests un simple tableau.

C'est ce que réutilisera l'[Entraînement rythmique](05-entrainement-rythmique.md) :
il a besoin de la pulsation et de l'écart avance/retard, pas du clic. Les
**seuils** (avance légère / avance nette de [05 § 5](05-entrainement-rythmique.md#5-mesurer-la-précision-temporelle))
restent hors du métronome, comme le veut [F3 § 7](F3-suivi-progression.md#7-modèle-de-données--figé-le-25072026) :
l'évènement porte la mesure brute, la vue applique le seuil.

### Le rouleau n'a pas été mutualisé avec le mode Morceau

[§ 2](#2-présentation-générale) prévoyait de partager le piano roll. Le rouleau
de ce mode est écrit dans `exercise-mode.js`, comme celui du mode Morceau est
écrit dans `song-mode.js`. Décision prise le 26/07/2026 :

- **ce ne sont pas les mêmes contraintes.** Le mode Morceau dessine 88 touches
  fixes ; un exercice tient sur cinq à seize blanches, et l'étendue change avec
  l'exercice et la main. C'est justement ce qui donne des touches de 51 à 254 px
  au lieu de 16 px (§ 17).
- **ce n'est pas le même contenu.** Ici : des chiffres de doigté sur chaque
  note, une ligne par temps, le début de chaque série nommé, un décompte en
  gros au centre. Là-bas : repères de pédale, mini-portées de notation, numéros
  de mesure, repères Do/Mi sur 88 colonnes. Ce qui se recouvre vraiment tient en
  une centaine de lignes de primitives Canvas.
- **le coût du contraire.** Extraire le renderer de `song-mode.js` (1 770 lignes,
  le mode le plus vérifié de l'application) dans le même geste qui introduit
  quatre modules et un mode, c'est la façon la plus sûre d'y introduire une
  régression.

C'est la même discipline que pour `piano.js` ([F1 § 6](F1-navigation.md#6-découpage-technique-proposé)) :
rien n'est extrait avant d'être réellement partagé. Le jour où un troisième mode
aura besoin d'un rouleau — le plus probable est
[06](06-travail-intelligent-morceau.md) —, les deux existants diront exactement
quoi extraire, ce qu'aucun des deux ne pouvait dire seul.

## 13. Étapes de réalisation

### Étape A — Catalogue — **faite le 26/07/2026**

- [x] Définir le format d'un exercice. (§ 11 ; six familles déclarées, trois
  disponibles, les trois autres visibles et désactivées)
- [x] Créer un exercice de déliement sur cinq notes.
  (Do → Sol et retour, 8 pas d'un temps)
- [x] Créer un exercice d'accords Do–Fa–Sol–Do.
  (I, IV, V, I à l'état fondamental, deux temps chacun)
- [x] Créer un exercice d'arpège de Do majeur.
  (Do Mi Sol Do et retour sur une octave, 54 bpm par défaut)
- [x] Vérifier les notes et les doigtés pour chaque main.
  (hauteurs relues sur les notes générées, doigtés 1→5 à droite et 5→1 à
  gauche, doigt 1 de la main gauche sur la note la plus haute d'un accord —
  § 17)

### Étape B — Génération — **faite le 26/07/2026**

- [x] Transformer un motif en notes jouables.
- [x] Générer la bonne octave pour chaque main. (Do4 à droite, Do3 à gauche)
- [x] Générer le mode Les deux uniquement lorsqu'il est défini.
  (`bothMode` + doigtés des deux mains obligatoires, sinon la main n'est pas
  proposée)
- [x] Répéter le motif sans rupture de mesure.
  (`beatsPerRepetition` multiple de la mesure pour les trois exercices, vérifié)
- [x] Produire un résultat compatible avec le piano roll existant.
  (même forme de note que `buildSong()`, plus `finger` et `repetition`)

### Étape C — Interface — **faite le 26/07/2026, sauf le choix de difficulté**

- [x] Ajouter la carte Exercices à la navigation.
- [x] Créer le choix de la famille et de l'exercice.
  (le choix d'exercice n'apparaît pas quand la famille n'en contient qu'un :
  une liste d'un seul élément n'est pas un choix)
- [ ] Ajouter difficulté, main, tempo et répétitions.
  (main, tempo et répétitions faits — steppers − / + de 34 px. **La difficulté
  est absente volontairement** : les trois exercices sont Débutant, un
  sélecteur à une seule valeur ferait croire à un choix. Elle apparaîtra avec
  le premier exercice Intermédiaire.)
- [x] Afficher le but, la consigne et le doigté.
  (but et consigne aux réglages, consigne rappelée en en-tête, doigté dessiné
  dans chaque note tant qu'il reste lisible)
- [x] Ajouter le décompte, le métronome et la progression.
  (une mesure de décompte comptée 1-2-3-4 en gros au centre, clic accentué sur
  chaque premier temps, `Série 3 / 8` en en-tête)
- [x] Ajouter la démonstration, la pause et le redémarrage.
  (démonstration = l'application joue les notes ; coupée, elle reste muette et
  c'est l'utilisateur qui joue)
- [x] Ajouter le bilan sans métrique inventée. (§ 9 ; aucun pourcentage)

### Étape D — Validation MIDI — **faite le 26/07/2026**

Réutilise la fondation [F2 — Entrée MIDI](F2-entree-midi.md) pour la
détection, la connexion et la réception des notes ; cette étape ne recode
pas cette partie et se concentre sur la validation propre aux exercices.

- [x] S'abonner aux évènements de F2 pendant une séance d'exercice.
  (l'abonnement dure la séance et se coupe à `stop()` ; l'entrée elle-même
  reste connectée, elle est partagée)
- [x] Valider les notes seules et les accords attendus par l'exercice.
  (`exercises/validate-run.js` ; un accord est validé note par note, sans
  exiger la simultanéité parfaite — voir ci-dessous)
- [x] Mesurer le rythme sans rendre l'exercice inutilement punitif.
  (le timing est **rapporté** mais n'entre pas dans le verdict d'une série —
  voir ci-dessous)
- [x] Conserver la pratique libre lorsque MIDI n'est pas disponible.
  (le réglage n'apparaît même pas sans clavier ; sans lui la séance se déroule
  exactement comme avant, et son bilan n'invente rien)

#### Trois décisions prises en implémentant

1. **Le timing ne condamne pas une série.** Une série est `clean` si toutes ses
   notes ont été jouées, à la bonne hauteur, dans la fenêtre de tolérance, et
   qu'aucune note en trop ne s'est glissée. La régularité rythmique est
   rapportée à côté, avec sa tendance. Disqualifier une série pour quelques
   millisecondes à un tempo de travail lent contredirait le § 10 (« ne pas
   augmenter le tempo après une série imprécise ») : on ne peut pas à la fois
   demander de travailler lentement et sanctionner le moindre décalage.
2. **Un accord n'exige pas la simultanéité parfaite.** Ses trois notes sont
   validées séparément, chacune dans sa fenêtre. Un accord légèrement étalé
   reste donc propre, mais son étalement se voit dans le détail du timing. Un
   verdict binaire sur la simultanéité aurait été plus sévère que ce que dit
   le § 4 (« placer plusieurs doigts ensemble avec précision ») ne demande à ce
   niveau.
3. **Le doigté n'est pas vérifié**, et ne peut pas l'être : un clavier MIDI
   n'envoie pas quel doigt a appuyé. Le doigté reste une consigne affichée. Ce
   n'est pas une limite du MVP, c'est une limite du protocole.

#### Ce que le clavier change, et ce qu'il ne change pas

| | Pratique libre | Avec le clavier MIDI |
| --- | --- | --- |
| Bilan | durée, tempo, répétitions | + notes justes, séries sans faute, par main, pas à retravailler |
| Journal | `repetition` en `outcome: "none"` | `run` en `clean` / `flawed`, avec le détail chiffré |
| Précision affichée | **aucune** | celle qui a été mesurée |
| Doigté | consigne affichée | consigne affichée (non vérifiable) |

## 14. Critères d'acceptation du MVP

Le MVP est terminé lorsque :

- [x] l'utilisateur peut ouvrir le mode Exercices sans charger de morceau ;
- [x] les catégories Déliement, Accords et Arpèges contiennent chacune un
      exercice ;
- [ ] l'utilisateur peut choisir difficulté, main, tempo et répétitions ;
      (main, tempo et répétitions oui ; la difficulté attend un exercice
      Intermédiaire — § 13 étape C)
- [x] l'exercice affiche son objectif et son doigté avant de commencer ;
- [x] un décompte précède la première note ;
- [x] le motif apparaît dans un rouleau et utilise un clavier à l'écran ;
      (rouleau propre à ce mode, limité à l'étendue de l'exercice — § 12)
- [x] le nombre demandé de répétitions est respecté ;
- [x] pause et recommencer fonctionnent sans décaler l'audio ;
      (la pause fige le Transport et la reprise repart de la même seconde)
- [x] le mode Les deux utilise des notes et des doigtés vérifiés ;
- [x] le bilan sans MIDI n'affiche aucune fausse précision ;
- [x] quitter le mode arrête l'audio et le métronome ;
- [x] les modes Morceau et Lecture de notes ne régressent pas.

## 15. Ce que la séance laisse dans le journal

Le mode est la **deuxième productrice** de
[F3 — Suivi de progression](F3-suivi-progression.md), après la Lecture de notes,
et il n'a rien eu à ajouter à son format (§ 7 de F3) :

| Évènement | Contenu |
| --- | --- |
| `session-start` | `{ exerciseId, family, handMode, key, tempo, repetitions, metronome, demo }` — tout ce qui ne varie pas pendant la séance |
| `repetition` | une série terminée, `outcome: "none"`, cible `{ exerciseId, hand, key, tempo, repetition }` |
| `session-end` | `done` si le bilan est atteint, `abandoned` sinon, avec `{ completedRepetitions, plannedRepetitions, tempo, seconds }` |
| `run` (26/07/2026) | une série **jugée au clavier MIDI**, `clean` ou `flawed`, avec `given: { correct, total, extras, meanFraction }` |

`outcome: "none"` est le point important : en pratique libre, **rien n'est
mesuré**. Une série faite n'est pas une série réussie, et aucune vue ne pourra
la compter comme telle.

C'est exactement ce qui a permis d'ajouter la validation MIDI sans toucher au
format ni réinterpréter l'historique : la même série devient un `run` en `clean`
ou `flawed` quand les notes ont été vues, et reste un `repetition` en `none`
quand elles ne l'ont pas été. Le `session-start` porte `validated`, donc une vue
future sait toujours laquelle des deux elle lit. C'est le seul endroit de
l'application où le **type** d'évènement dépend de ce que l'application a
réellement observé.

Deux conséquences immédiates, gratuites :

- les réglages de la dernière séance sont repris à l'ouverture du mode, comme
  pour la Lecture de notes ;
- le `tempo` est sur chaque évènement, donc la vue « tempo maximal joué
  proprement » de [F3 étape C](F3-suivi-progression.md#étape-c--vues-liées-au-tempo)
  aura ses données le jour où elle sera construite — mais elle ne pourra les
  qualifier de « propres » qu'avec F2.

## 16. Validation prévue

- tests unitaires du générateur de notes et de répétitions ;
- tests des accords produits, indépendamment de leur ordre interne ;
- tests de l'ordre des notes pour les arpèges ;
- tests des octaves et doigtés de chaque main ;
- test du décompte et de la boucle au changement de tempo ;
- test manuel avec pratique libre ;
- test manuel avec un clavier MIDI compatible lorsqu'elle sera implémentée ;
- vérification sur ordinateur et petite largeur d'écran ;
- vérification du changement de mode pendant une séance.

## 17. Validation effectuée (26 juillet 2026)

**Catalogue, générateur et métronome, hors navigateur** — 245 vérifications sur
245, dans Node, en important directement les trois modules :

- catalogue : six familles déclarées dont trois disponibles et non vides, un
  exercice par famille du MVP, tous en Do majeur et en niveau Débutant ;
- doigtés, exercice par exercice et main par main : autant de doigts que de
  notes à chaque pas, tous entre 1 et 5, accords écrits en degrés croissants
  avec un doigté **cohérent avec la main** — croissant à droite, décroissant à
  gauche, donc le doigt 1 de la main gauche sur la note la plus haute ;
- « Les deux » refusé dès qu'un doigté manque ou que `bothMode` est absent ;
- hauteurs relues sur les notes **générées**, pas sur la description :
  Déliement Do4 Ré4 Mi4 Fa4 Sol4 Fa4 Mi4 Ré4 à droite et les mêmes degrés une
  octave plus bas à gauche ; Accords Do (60-64-67), Fa (65-69-72), Sol
  (67-71-74), Do ; Arpège Do Mi Sol Do Sol Mi Do ;
- aucune altération dans aucun exercice : que des touches blanches, vérifié
  avec `isWhite()` de `music.js` ;
- générateur : nombre de notes, instant de chaque pas, notes triées, forme
  identique à celle du mode Morceau, `endTime = time + duration`, et un silence
  entre deux pas plutôt qu'une note pleine (sans quoi deux notes voisines de
  même hauteur formeraient un seul rectangle) ;
- tempo : doubler le tempo divise exactement tous les instants et toutes les
  durées par deux, sans changer une seule note ;
- Les deux : deux fois plus de notes, mouvement parallèle à l'octave exacte,
  les deux mains au même instant au milliardième de seconde, doigtés propres à
  chaque main ;
- accords : les trois notes d'un accord partagent le même instant, chaque
  accord dure bien deux temps ;
- séries : `repetitionAt()` juste aux frontières et plafonné à la dernière,
  respiration détectée pendant la respiration et nulle part ailleurs, série
  suivante toujours sur un premier temps ;
- métronome : un temps à 60 puis 120 bpm, décompte de 4 temps affiché 1-2-3-4,
  première note toujours sur un premier temps, décompte désactivable, tempo hors
  bornes ramené dans les bornes ; `nearestBeat()` rend un écart **négatif en
  avance** et positif en retard ; les clics tombent au bon instant, seuls les
  premiers temps sont accentués, et le dernier clic ne dépasse pas la dernière
  note — le métronome ne bat pas dans le vide.

**Chaîne complète, dans Chrome sans interface** — 124 vérifications sur 124,
trois exécutions consécutives identiques, en six phases enchaînées par de
**vraies navigations** (le journal traverse donc réellement des rechargements) :

- accueil : trois fonctionnalités, carte « Exercices » activable ;
- réglages : les six familles listées, les trois du MVP activables, les trois
  autres désactivées et marquées « Bientôt » ; cliquer de force une famille
  désactivée ne lance rien ; tempo et répétitions bornés (30-208 bpm, 1-16), les
  boutons se désactivant aux bornes ;
- exercice : décompte annoncé avant la première note, puis `Série 1 / 2` ;
  transport démarré, contexte audio en marche ;
- **rouleau relu dans ses pixels** : le bandeau du clavier retrouvé dans
  l'image, autant de touches blanches que l'étendue de l'exercice en compte
  (recalculée dans le harnais, pas lue dans l'application), de largeur
  régulière, occupant toute la largeur ; des notes bleues et **aucune verte** en
  main droite ; des chiffres de doigté dessinés dans les notes ; le dessin change
  d'une image à l'autre, donc le rouleau défile ;
- bilan : deux répétitions, le tempo utilisé, la durée de pratique, **aucun
  pourcentage**, l'absence de mesure expliquée, et un cran plus vite proposé
  sans être appliqué (absent au tempo maximal, où il n'y a rien à proposer) ;
- journal : une séance ouverte, deux `repetition` toutes en `outcome: "none"`,
  une séance close en `done`, réglages constants dans le `session-start`, même
  `sessionId` partout, horodatages croissants, séries numérotées dans l'ordre,
  et la Lecture de notes non polluée ;
- Accords / Les deux : clavier élargi aux seize blanches de l'étendue des deux
  mains, **les deux couleurs de main dessinées**, comportement « mouvement
  parallèle » annoncé avant le départ ;
- pause : transport arrêté, plus un pixel ne bouge, le bouton propose de
  reprendre ; reprise : le transport redémarre **sans revenir au début** ;
- abandon : quitter par « Réglages » clôt la séance en `abandoned` avec le
  nombre de séries réellement faites, sans rien perdre ; « Recommencer » ouvre
  une nouvelle séance et repart du décompte ;
- Arpèges : tempo par défaut propre à l'exercice (54 bpm), étendue Do4 → Do5,
  démonstration et métronome enregistrés dans le journal ;
- réglages repris après rechargement : exercice, tempo, famille, démonstration
  et métronome de la dernière séance ;
- stockage neutralisé avant le chargement des modules : la séance va jusqu'à
  son bilan et l'utilisateur y est prévenu que rien n'est enregistré ;
- arrêt : quitter par l'accueil en pleine séance stoppe le transport, vide la
  scène, clôt la séance en `abandoned`, et **rien ne se restaure** ensuite ;
- aucune erreur de page sur les trois exécutions.

**Mise en page** — 184 vérifications sur 184, trois exécutions identiques, pour
le cas le plus étroit (Déliement / Main droite, 5 blanches) et le plus large du
MVP (Accords / Les deux, 16 blanches), à 360×640, 390×844, 844×390 et 1280×800 :

- aucun débordement horizontal de la page ni de la scène, aux réglages, pendant
  l'exercice et au bilan ;
- le rouleau remplit exactement la scène moins son en-tête, et la scène ne
  défile pas : c'est ce qui a révélé qu'en paysage le `padding` de l'écran de
  réglages s'appliquait aussi au rouleau et lui volait 28 px de large et 34 de
  haut ;
- en paysage, l'en-tête tient sur **une seule ligne** (41 px à 844×390) ; en
  portrait il passe à deux lignes, ce qui est acceptable et reste sous 76 px ;
- cibles tactiles : boutons − / + de 34 px et boutons de choix ≥ 30 px de haut
  dans les douze cas ;
- largeur des touches blanches, mesurée dans le dessin :

  | Écran | Déliement / Main droite | Accords / Les deux |
  | --- | --- | --- |
  | 360×640 (portrait) | 70 px | 21 px |
  | 390×844 (portrait) | 76 px | 22 px |
  | 844×390 (paysage) | 167 px | 51 px |
  | 1280×800 | 254 px | 78 px |

  **En paysage — la seule orientation réellement utilisée sur la tablette — même
  le cas le plus large reste à 51 px**, très au-dessus des 30 px de CLAUDE.md.
  En portrait, les seize blanches des accords à deux mains descendent à 21 px.
  C'est assumé et non corrigé : en pratique libre, ce clavier n'est pas l'entrée
  de l'exercice — on joue sur son piano —, seulement un repère visuel. La
  différence avec la Lecture de notes est nette : là-bas, le clavier **est** la
  réponse, et c'est pour ça qu'il défile latéralement plutôt que de rétrécir
  ([02 § 4](02-lecture-notes.md#clavier-des-grandes-étendues)).

### Validation de l'étape D — clavier MIDI (26 juillet 2026)

**Hors navigateur** — 70 vérifications sur 70 (partagées avec l'appariement
généralisé de `rhythm/timing.js`), dans Node :

- série parfaite : verdict `clean`, précision de 100 % par main, rythme régulier,
  rien à retravailler ;
- deux notes oubliées : verdict `flawed`, et les verdicts disent **lesquelles** ;
- fausse note à la place d'une bonne : une manquée **et** une en trop ;
- notes justes mais toutes en retard : la série reste `clean`, et c'est le timing
  qui dit le retard — la décision n° 1 ci-dessus, vérifiée ;
- note hors de la fenêtre : manquée, pas simplement en retard ;
- accord incomplet : le pas fautif est désigné et nommé par la note ratée ;
- accord légèrement étalé : reste propre, mais son étalement se voit dans le
  timing — la décision n° 2, vérifiée ;
- deux mains : la main muette est identifiable par sa précision ;
- rien joué du tout : aucune moyenne inventée, aucune tendance déduite ;
- deux séries à des tempos différents : l'agrégation reste juste, parce que
  l'écart est porté en **fraction de temps** et non en millisecondes ;
- appariement : une note de la bonne hauteur est retenue même si une fausse est
  plus proche dans le temps — ce qu'un simple « le plus proche » aurait raté.

**Dans Chrome sans interface** — 18 vérifications de plus dans le harnais MIDI,
trois exécutions identiques. Un faux Web MIDI joue la première série
entièrement et oublie la première note de la seconde :

- le réglage « Clavier MIDI » n'apparaît **que** parce qu'un clavier écoute, et
  le clavier est nommé ;
- le bilan affiche « Tes notes » : 15 / 16 notes justes, 1 / 2 séries sans
  faute, la proportion, la tendance rythmique commentée, et le pas raté
  signalé ;
- le bilan ne dit **plus** qu'il ne reçoit rien ;
- journal : deux `run` (`clean` puis `flawed`), aucun `repetition` non mesuré
  dans cette séance, le détail chiffré présent, l'écart moyen brut conservé —
  pas un degré —, et `validated: true` sur la séance ;
- sans clavier, la même séance repasse en `repetition`/`none` avec
  `validated: false`, vérifié dans le harnais des exercices.

**Non-régression** — les harnais des campagnes précédentes rejoués tels quels :
154/154 sur le moteur de la Lecture de notes et 74/74 sur le journal dans Node,
200/200 sur son interface, 110/110 sur sa mise en page et 50/50 sur la chaîne de
progression dans Chrome. Le mode Morceau s'ouvre toujours, ses contrôles
apparaissent et se masquent, et ils ne s'affichent pas en mode Exercices.

Restent à vérifier à la main : **le toucher réel sur la tablette, et le rendu
sonore du clic de métronome à l'oreille** — sa hauteur et son volume (−18 dB)
n'ont pas été jugés autrement qu'à la lecture du code.

## 18. Première priorité — faite

Construire une boucle complète avec l'exercice de cinq doigts en Do majeur :

**choisir Exercices → choisir la main et le tempo → lire la consigne → entendre
le décompte → jouer quatre répétitions → voir le bilan.**

Cette boucle existe (26/07/2026), et le même moteur porte déjà les accords et
les arpèges du MVP : les trois exercices partagent le générateur, le rouleau, le
métronome et le bilan. La suite propre à cette fonctionnalité est la
**validation MIDI** (étape D), qui attend [F2](F2-entree-midi.md), puis les
familles Gammes, Coordination et Rythme — et, avec le premier exercice
Intermédiaire, le choix de difficulté et les tonalités de Sol et Fa majeur.
