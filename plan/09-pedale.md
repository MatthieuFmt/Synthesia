# Feature 09 — Exercices de pédale

> Statut : **MVP implémenté** (27/07/2026) — Écoute, Pédale directe et Pédale
> syncopée fonctionnent avec les trois entrées ; la famille Application (étape
> E) reste à faire, comme prévu. Voir la
> [validation](#18-validation-effectuée-27-juillet-2026).

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir les quatre familles d'exercices de pédale.
- [x] Définir la pédale syncopée comme technique centrale.
- [x] Définir un MVP utilisable sans pédale physique.
- [x] Détecter une pédale physique (CC 64) via l'entrée MIDI.
  (`midi-input.js` émet les évènements de pédale — la décision ouverte de
  [F2 § 13](F2-entree-midi.md#13-décisions-ouvertes) est tranchée)
- [x] Implémenter la pédale de substitution (clavier / écran).
  (barre d'espace tenue/relâchée, et bouton à l'écran au doigt ou à la souris)
- [x] Implémenter les exercices de pédale directe et syncopée.
  (l'application joue le Do–Fa–Sol–Do de 03, l'utilisateur ne travaille que la
  pédale — et ce qui sonne tient réellement par elle : lever étouffe)
- [x] Implémenter la mesure du changement de pédale.
  (`pedal/timing.js` : propre / brouillé / trou / oubliée, fenêtres en
  fraction de temps héritées de `rhythm/timing.js`)
- [ ] Implémenter la famille Application (passage réel) — après le reste,
  comme prévu en section 5.

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

### Étape A — Entrée pédale — **faite le 27/07/2026**

- [x] Étendre [F2](F2-entree-midi.md) pour émettre les évènements CC 64.
  (dans `midi-input.js`, seul endroit qui écoute le MIDI : évènements
  normalisés `{ type: "pedal", down, timestamp, source }`, seuil binaire à
  mi-course, seuls les changements sont émis, et une pédale restée enfoncée
  est relâchée au débranchement comme les notes tenues)
- [x] Implémenter la pédale de substitution (barre d'espace, bouton écran).
  (la barre d'espace est capturée pendant l'exercice et ne déclenche rien
  d'autre ; le bouton s'enfonce au doigt ou à la souris et se relâche au lâcher)
- [x] Afficher l'état de la pédale et l'entrée utilisée.
  (témoin enfoncée/levée permanent ; l'écran dit que la barre d'espace
  **remplace** la pédale — le pied n'est pas travaillé)

### Étape B — Écoute — **faite le 27/07/2026**

- [x] Jouer un même accord avec et sans pédale.
- [x] Faire entendre une pédale gardée trop longtemps sur un enchaînement.
  (et, en regard, le même enchaînement changé proprement — le contraste est
  la leçon ; aucune séance n'est écrite au journal : l'Écoute est un outil,
  comme le Métronome de 05)

### Étape C — Pédale directe — **faite le 27/07/2026**

- [x] Générer des accords tenus et espacés.
  (le Do–Fa–Sol–Do de 03, un accord par mesure, tempo lent réglable)
- [x] Valider l'enfoncement et le lever avec la note.
  (l'enfoncement est jugé par le `judge` de `rhythm/timing.js` — à l'heure /
  en avance / en retard / manquée —, pas un second jugement)

### Étape D — Pédale syncopée — **faite le 27/07/2026**

- [x] Générer un enchaînement d'accords avec changement attendu.
- [x] Implémenter les quatre verdicts de la section 7.
- [x] Afficher le retour immédiat par changement, puis le bilan.
  (chaque changement est jugé juste après sa fenêtre, planifié sur le
  Transport et rendu par `Tone.Draw` ; le bilan réutilise ces mêmes résultats)

### Étape E — Application

- [ ] Réutiliser les intervalles de pédale d'un morceau importé
  (`extractPedalIntervals`) comme exercice guidé.
- [ ] Comparer la pédale jouée à celle du fichier sans imposer une seule
  interprétation valable.

## 13. Critères d'acceptation

- [x] L'utilisateur entend clairement la différence avec et sans pédale.
- [x] L'exercice fonctionne sans pédale physique, avec une substitution
  annoncée comme telle.
- [x] Une pédale physique branchée est détectée et son état affiché en temps
  réel.
  (via la doublure Web MIDI ; reste le test avec une vraie pédale, comme F2)
- [x] La pédale directe est validée sur des accords tenus.
- [x] Un changement syncopé reçoit l'un des quatre verdicts de la section 7,
  immédiatement après le geste.
- [x] Aucune mesure n'est affichée lorsqu'aucune entrée pédale n'est
  détectée.
  (un geste absent est « oubliée » / « manquée » — jamais un pourcentage)
- [x] L'affichage de pédale existant du mode Morceau ne régresse pas.
  (le mode Morceau n'a pas été touché ; vérifié au démarrage dans le
  navigateur)

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

Deux sont tranchées avec le MVP (27/07/2026) :

- **Demi-pédale : non** — tout-ou-rien, seuil MIDI binaire à mi-course
  (CC 64 ≥ 64 = enfoncée), et seuls les changements d'état sont émis. C'est ce
  qu'envoient la plupart des pédales numériques, et les verdicts de la
  section 7 ne parlent que d'états.
- **Représentation : ni *Ped.* ni ligne** dans les exercices du MVP — les
  accords affichés et le témoin d'état suffisent, il n'y a pas de partition à
  annoter. La question redeviendra réelle à l'étape E, sur un passage.

Restent ouvertes :

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

## 17. Première priorité — faite

Construire la boucle qui apprend le geste essentiel, sans matériel :
**choisir Pédale → entendre un accord avec puis sans pédale → passer à
l'enchaînement Do–Fa–Sol–Do à 60 BPM → changer la pédale à la barre d'espace
sur chaque accord → recevoir « propre / brouillé / trou / oubliée » à chaque
changement.** Une fois cette boucle juste, brancher CC 64 via
[F2](F2-entree-midi.md) ne change que la source des évènements.

C'est exactement ce qui s'est passé : les trois entrées convergent vers le
même point (`pedalInput`), et la pédale physique n'y ajoute que la correction
d'horloge par l'horodatage du message — comme la Reproduction rythmique.

Un détail d'implémentation compte pour la suite : l'effet sonore est réel.
Les « doigts » de l'application lâchent l'accord peu après l'attaque, et ce
qui sonne encore ne tient que par la pédale — oublier de lever s'entend
(bouillie), lever sans réenfoncer s'entend (silence). Le retour des verdicts
confirme ce que l'oreille vient de constater, il ne le remplace pas.

## 18. Validation effectuée (27 juillet 2026)

**Verdicts, hors navigateur** — harnais Node sur `pedal/timing.js` (parmi les
89 vérifications passées avec 08 et F3, trois exécutions identiques) :

- les quatre verdicts sur tous les cas de la section 7 : propre ; levée trop
  tard → brouillé ; réenfoncée avant l'accord ou avant d'être levée →
  brouillé ; jamais réenfoncée, réenfoncée bien après, ou levée bien trop tôt
  → trou ; jamais levée → oubliée ;
- fenêtres en fraction de temps : les mêmes gestes jugés identiquement à un
  tempo deux fois plus lent ;
- appariement sur un enchaînement complet (un geste ne sert jamais à deux
  accords) et bilan par verdict sans taux inventé ;
- chaque verdict s'écrit dans le vocabulaire fermé du journal
  (`on-time` / `blurred` / `gap` / `missed`), comme F3 § 7 le prévoyait.

**Dans Chromium** (doublure de Tone.js, cf. [08 § 16](08-lecture-partitions.md#16-validation-effectuée-27-juillet-2026)) :

- réglages : trois familles, tempo visible pour les exercices mesurés ;
- Écoute : les quatre démonstrations présentes ;
- exercice syncopé : les quatre accords affichés, témoin « levée » au départ ;
- barre d'espace : enfoncée au `keydown`, relâchée au `keyup` ; bouton à
  l'écran : enfoncé au `pointerdown`, relâché au `pointerup` — le témoin suit
  dans les deux cas ;
- mise en page : aucun débordement sur 390×844, 844×390 et 1280×800, pédale
  d'au moins 64 px de haut partout.

Restent à vérifier sur le matériel réel : une vraie pédale CC 64 branchée à un
piano numérique, et le rendu sonore de la résonance (la doublure ne joue rien).
