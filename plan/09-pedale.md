# Feature 09 — Exercices de pédale

> Statut : planifiée — aucun exercice n'est encore implémenté.
> L'application sait déjà **afficher** la pédale d'un fichier MIDI, mais pas
> encore la **détecter** ni l'enseigner.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir les quatre familles d'exercices de pédale.
- [x] Définir la pédale syncopée comme technique centrale.
- [x] Définir un MVP utilisable sans pédale physique.
- [ ] Détecter une pédale physique (CC 64) via l'entrée MIDI.
- [ ] Implémenter la pédale de substitution (clavier / écran).
- [ ] Implémenter les exercices de pédale directe et syncopée.
- [ ] Implémenter la mesure du changement de pédale.

## 1. Problème utilisateur

La pédale de sustain change complètement le son du piano, et un débutant en
fait presque toujours le même usage : il l'enfonce et l'oublie, ce qui
transforme tout en bouillie sonore. Personne ne lui a montré **quand** la
lever et la réenfoncer. L'application ne propose aujourd'hui aucun exercice
là-dessus.

## 2. Ce qui existe déjà dans le code

Point de départ réel, à ne pas reconstruire : `src/main.js` extrait déjà les
intervalles de pédale d'un fichier MIDI importé
(`extractPedalIntervals`, qui lit les `controlChanges` de sustain — CC 64) et
les dessine dans le piano roll (`drawPedalCues`, avec une couleur dédiée).

Ce qui manque :

- la **détection en temps réel** d'une pédale physique branchée — c'est
  exactement la question laissée ouverte dans
  [F2 § 13](F2-entree-midi.md#13-décisions-ouvertes) ; cette fonctionnalité
  la tranche : oui, F2 doit aussi capter CC 64 ;
- des **exercices** dédiés, et une mesure de la justesse du geste.

## 3. Objectif

Apprendre à utiliser la pédale de sustain au bon moment : entendre ce qu'elle
fait, l'enfoncer avec une note, puis maîtriser la pédale syncopée — lever et
réenfoncer juste après le nouvel accord — pour lier les sons sans les
mélanger.

## 4. Fonctionner sans pédale physique

Une pédale physique n'est pas indispensable pour comprendre le geste et son
effet sonore. Trois entrées possibles, par ordre de fidélité :

| Entrée | Fidélité | Disponibilité |
| --- | --- | --- |
| Pédale physique (CC 64 via [F2](F2-entree-midi.md)) | Réelle | Nécessite un piano numérique avec pédale |
| Touche du clavier d'ordinateur (barre d'espace) | Le geste et le timing sont travaillés, pas le pied | Toujours |
| Bouton à l'écran | Effet sonore compris, timing peu précis | Toujours |

Le MVP doit fonctionner avec la barre d'espace : cela suit le principe déjà
retenu pour l'[Entraînement rythmique](05-entrainement-rythmique.md), dont la
reproduction se construit au tap avant d'attendre le matériel. L'application
doit dire clairement que la barre d'espace **remplace** la pédale, pour ne pas
laisser croire que le geste du pied est travaillé.

## 5. Quatre familles d'exercices

| Famille | Ce qu'on apprend | MVP |
| --- | --- | --- |
| **Écoute** | Entendre la différence : même accord avec et sans pédale, puis pédale gardée trop longtemps | Oui |
| **Pédale directe** | Enfoncer la pédale en même temps que la note, la lever avec elle | Oui |
| **Pédale syncopée** | Lever la pédale **au** nouvel accord et la réenfoncer **juste après** | Oui — c'est le cœur de la fonctionnalité |
| **Application** | Utiliser la pédale sur un vrai passage, en s'appuyant sur les indices de pédale déjà affichés | Non — après le reste |

## 6. La pédale syncopée, geste central

C'est la technique qui distingue un son propre d'un son brouillé, et
l'exercice principal à construire :

1. jouer le nouvel accord ;
2. **au même instant**, lever la pédale — l'accord précédent s'arrête ;
3. **juste après** que le nouvel accord sonne, réenfoncer la pédale ;
4. l'accord se prolonge, sans traîner celui d'avant.

L'ordre compte : réenfoncer trop tôt (avant ou pendant le lever) garde la
résonance précédente, réenfoncer trop tard laisse un trou dans le son. C'est
donc une compétence de **timing**, mesurable.

## 7. Mesurer un changement de pédale

Le mécanisme de mesure de l'[Entraînement rythmique](05-entrainement-rythmique.md#5-mesure--trop-tôt--trop-tard-)
s'applique directement, avec la même logique de tolérance exprimée en
fraction de temps plutôt qu'en millisecondes fixes.

Pour un changement syncopé attendu sur un accord joué à l'instant `t` :

| Geste observé | Jugement |
| --- | --- |
| Pédale levée autour de `t`, réenfoncée peu après, dans la fenêtre | Propre |
| Pédale réenfoncée avant d'avoir été levée, ou levée trop tard | Son brouillé (les deux accords se mélangent) |
| Pédale réenfoncée bien après la fenêtre | Trou dans le son |
| Pédale jamais levée sur le changement | Pédale oubliée |

Ces quatre verdicts sont plus parlants qu'un pourcentage : ils nomment
l'erreur telle que l'utilisateur l'entend. Comme ailleurs dans le projet,
aucune mesure n'est affichée si l'entrée n'a pas été détectée
([03 § 9](03-technique-doigts.md#9-retour-et-bilan)).

## 8. Niveaux de difficulté

| Niveau | Contenu |
| --- | --- |
| **Débutant** | Écoute comparée, puis pédale directe sur des accords tenus et espacés (tempo lent) |
| **Intermédiaire** | Pédale syncopée sur un enchaînement d'accords simple, par exemple le Do–Fa–Sol–Do déjà utilisé en [03](03-technique-doigts.md#4-familles-dexercices) |
| **Difficile** | Changements plus rapprochés, changements de pédale à l'intérieur d'une mesure, application sur un passage réel |

Réutiliser l'enchaînement d'accords déjà prévu dans les Exercices techniques
évite d'inventer un matériel séparé pour un geste qui doit justement
s'ajouter à un jeu déjà connu.

## 9. Écran d'exercice

- l'indication de pédale affichée **sous** le piano roll, dans la continuité
  de l'affichage `drawPedalCues` déjà existant : ligne enfoncée / levée
  plutôt qu'un simple symbole ;
- un témoin d'état de la pédale, visible en permanence (enfoncée / levée) ;
- le retour immédiat après chaque changement, avec le verdict de la
  section 7 ;
- le décompte et le métronome partagés
  ([05](05-entrainement-rythmique.md), `metronome.js`) ;
- l'entrée utilisée, annoncée clairement (pédale physique, barre d'espace ou
  bouton).

## 10. Modèle de données proposé

```js
const pedalExercise = {
  id: "syncopated-c-f-g-c",
  family: "syncopated", // "listening" | "direct" | "syncopated" | "applied"
  difficulty: "intermediate",
  tempoBpm: 60,
  // accords à jouer, et changement de pédale attendu sur chacun
  chords: [
    { midis: [60, 64, 67], beat: 0, pedalChange: true },
    { midis: [59, 65, 69], beat: 4, pedalChange: true },
  ],
};

const pedalEvent = {
  type: "pedal", // vient de CC 64, ou de la touche/bouton de substitution
  down: true,
  timestamp: 0,
  source: "physical-pedal", // "physical-pedal" | "keyboard" | "screen"
};
```

`pedalEvent` doit être fourni par la même brique que les notes
([F2](F2-entree-midi.md)) lorsqu'il vient d'un CC 64, afin qu'aucune
fonctionnalité n'écoute le MIDI de son côté.

## 11. Découpage technique proposé

```text
src/
  pedal-mode.js        # parcours et familles d'exercices de pédale
  pedal/
    timing.js          # verdicts de la section 7 — réutilise rhythm/timing.js
  midi-input.js        # étendu pour émettre les évènements CC 64 (F2)
```

## 12. Étapes de réalisation

### Étape A — Entrée pédale

- [ ] Étendre [F2](F2-entree-midi.md) pour émettre les évènements CC 64.
- [ ] Implémenter la pédale de substitution (barre d'espace, bouton écran).
- [ ] Afficher l'état de la pédale et l'entrée utilisée.

### Étape B — Écoute

- [ ] Jouer un même accord avec et sans pédale.
- [ ] Faire entendre une pédale gardée trop longtemps sur un enchaînement.

### Étape C — Pédale directe

- [ ] Générer des accords tenus et espacés.
- [ ] Valider l'enfoncement et le lever avec la note.

### Étape D — Pédale syncopée

- [ ] Générer un enchaînement d'accords avec changement attendu.
- [ ] Implémenter les quatre verdicts de la section 7.
- [ ] Afficher le retour immédiat par changement, puis le bilan.

### Étape E — Application

- [ ] Réutiliser les intervalles de pédale d'un morceau importé
  (`extractPedalIntervals`) comme exercice guidé.
- [ ] Comparer la pédale jouée à celle du fichier sans imposer une seule
  interprétation valable.

## 13. Critères d'acceptation

- [ ] L'utilisateur entend clairement la différence avec et sans pédale.
- [ ] L'exercice fonctionne sans pédale physique, avec une substitution
  annoncée comme telle.
- [ ] Une pédale physique branchée est détectée et son état affiché en temps
  réel.
- [ ] La pédale directe est validée sur des accords tenus.
- [ ] Un changement syncopé reçoit l'un des quatre verdicts de la section 7,
  immédiatement après le geste.
- [ ] Aucune mesure n'est affichée lorsqu'aucune entrée pédale n'est
  détectée.
- [ ] L'affichage de pédale existant du mode Morceau ne régresse pas.

## 14. Validation prévue

- tests unitaires des quatre verdicts, à plusieurs tempos ;
- test de l'ordre lever/réenfoncer (réenfoncement avant le lever détecté
  comme son brouillé) ;
- test manuel avec une pédale physique branchée à un piano numérique ;
- test manuel avec la barre d'espace, sans matériel ;
- vérification que la barre d'espace ne déclenche pas d'autre action de
  l'application pendant l'exercice ;
- vérification de l'affichage de pédale existant du mode Morceau.

## 15. Décisions ouvertes

- Faut-il représenter la pédale par la notation traditionnelle (*Ped.* et
  astérisque) ou par la ligne continue déjà dessinée par `drawPedalCues` ?
- Faut-il gérer la demi-pédale, ou rester en tout-ou-rien ? Beaucoup de
  pédales numériques n'envoient d'ailleurs qu'une valeur binaire.
- Faut-il traiter les autres pédales (una corda, sostenuto), ou s'en tenir
  définitivement à la pédale de sustain ?
- La pédale doit-elle apparaître dans le travail d'un passage
  ([06](06-travail-intelligent-morceau.md)), et si oui doit-elle être
  attendue en mode Attente ou seulement suggérée ?

## 16. Hors périmètre pour le moment

- Pas de détection de la profondeur d'enfoncement (demi-pédale).
- Pas de pédale una corda ni sostenuto.
- Pas d'évaluation esthétique du choix de pédale sur un morceau : plusieurs
  pédalisations sont musicalement défendables.
- Pas de correction de la posture du pied, qui relève d'un professeur —
  comme déjà indiqué en [03 § 10](03-technique-doigts.md#10-sécurité-et-bonnes-habitudes).

## 17. Première priorité

Construire la boucle qui apprend le geste essentiel, sans matériel :
**choisir Pédale → entendre un accord avec puis sans pédale → passer à
l'enchaînement Do–Fa–Sol–Do à 60 BPM → changer la pédale à la barre d'espace
sur chaque accord → recevoir « propre / brouillé / trou / oubliée » à chaque
changement.** Une fois cette boucle juste, brancher CC 64 via
[F2](F2-entree-midi.md) ne change que la source des évènements.
