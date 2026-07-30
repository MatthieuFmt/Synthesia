# Catalogue d'exercices techniques — un vrai programme de professeur

> Statut : **complet — 99 exercices, 11 familles, 3 niveaux, 3 exercices** (30/07/2026).
> Ce fichier couvre le **contenu** du mode Exercices ([03](03-technique-doigts.md)),
> pas son interface : l'écran, le rouleau, le décompte, le métronome, le bilan
> et la validation MIDI sont en place depuis le 26/07/2026 et ne changent pas.
> Ce qui manquait, c'est ce qu'il y a **dedans** : huit exercices au départ,
> quatre-vingt-dix-neuf aujourd'hui. Les onze familles ont leurs trois niveaux
> et leurs trois exercices, plus aucune n'est annoncée « Bientôt », et
> `tools/verifier-catalogue.js` les vérifie toutes à chaque exécution.

[Retour à la checklist générale](README.md) ·
[Feature 03](03-technique-doigts.md) ·
[Exercices générés en MIDI](exercices-generes.md)

## 1. La demande

> « Dans la partie *Exercices*, crée de vrais exercices avec des niveaux de
> difficulté. Ces exercices doivent être vraiment utiles pour apprendre le
> piano — un vrai professeur les donnerait à ses élèves. Pour chaque catégorie
> d'exercice il faut trois niveaux de difficulté et trois exercices par niveau.
> Il faut afficher sur les notes un numéro pour le bon doigt : 1 pour le pouce,
> 2 pour l'index, etc. Il faut qu'il y ait autant de types d'exercice qu'il est
> important de travailler. »

Quatre exigences, qui se suivent dans tout ce document :

| | Exigence | Conséquence |
| --- | --- | --- |
| **E1** | De vrais exercices, ceux qu'un professeur donne | Chaque exercice cite sa source (§ 3) et dit ce qu'il fait travailler |
| **E2** | 3 niveaux × 3 exercices par catégorie | 9 exercices par famille, sans trou : un niveau vide est un cul-de-sac |
| **E3** | Le doigté chiffré sur les notes | Il existe déjà, mais il disparaît sur les notes courtes (§ 7) |
| **E4** | Autant de catégories qu'il est important d'en travailler | 11 familles retenues, 4 écartées avec leur raison (§ 4) |

## 2. Le point de départ — l'inventaire honnête

Au 30/07/2026 au matin, `src/exercises/catalog.js` contenait **huit**
exercices. L'écran de réglages, lui, savait déjà les présenter : famille →
niveau → exercice, un niveau vide restant visible mais désactivé. Le manque
était du **contenu**, pas du code d'interface — et c'est resté vrai jusqu'au
bout : aucun écran n'a été refait pour passer de huit à quatre-vingt-dix-neuf.

| Famille | Débutant | Intermédiaire | Difficile | Au départ | Aujourd'hui |
| --- | --- | --- | --- | --- | --- |
| Déliement | 1 | 1 | 1 | 3 | **9** |
| Égalité | 0 | 0 | 0 | **0** | **9** |
| Notes répétées | 0 | 0 | 0 | **0** | **9** |
| Gammes | 1 | 1 | 1 | 3 | **9** |
| Arpèges | 1 | 0 | 0 | 1 | **9** |
| Accords | 1 | 0 | 0 | 1 | **9** |
| Doubles notes | — | — | — | — | **9** |
| Octaves | — | — | — | — | **9** |
| Trilles | — | — | — | — | **9** |
| Extension | — | — | — | — | **9** |
| Coordination | 0 | 0 | 0 | **0** | **9** |

Deux familles étaient déclarées `available` **sans contenir un seul
exercice** — `evenness` et `repeated-notes`. `availableFamilies()` les cachait
donc, et l'utilisateur ne les voyait jamais : elles étaient mortes dans le
catalogue depuis le jour où elles y avaient été écrites. C'est exactement le
trou que E2 a comblé.

## 3. Ce que « un vrai professeur » veut dire

Pas « plus de notes » : un corpus identifié. Chaque exercice de ce catalogue
porte sa source dans un commentaire, comme les huit actuels le font déjà.

| Source | Ce qu'on lui emprunte |
| --- | --- |
| **Schmitt**, *Exercices préparatoires* op. 16 | Le doigt qui tient pendant que les autres jouent — le vrai déliage |
| **Dohnányi**, *Essential Finger Exercises* | Amener une touche noire sous un doigt faible ; les tenues à trois doigts |
| **Pischna**, *60 exercices progressifs* | Doigts tenus, doigts faibles seuls actifs ; trilles avec tenue |
| **Czerny**, op. 299 / op. 821 | La séquence : le même geste monté d'un degré à chaque mesure |
| **Cortot**, *Principes rationnels* | La préparation muette du pouce ; la gamme par groupes avec arrêt |
| **Brahms**, *51 Übungen* | Doubles notes, substitutions, deux voix dans une main |
| **Philipp**, *Exercices de tenues* | Extensions et écarts progressifs |
| **Moszkowski**, op. 91 | Doubles notes et octaves — pour le niveau Difficile seulement |

Ce qu'on **n'emprunte pas**, et pourquoi : Hanon. Le raisonnement est déjà
écrit dans [morceaux-exercice/README.md](../morceaux-exercice/README.md#la-décision-hanon-tranchée-en-trois-temps--retrait-le-28072026)
— soixante variantes d'une seule difficulté ne font pas un programme. Le même
piège guette ce catalogue : **99 exercices ne valent rien s'ils travaillent
tous la même chose.** C'est pourquoi chaque exercice ci-dessous porte un
objectif que ses huit voisins de famille ne portent pas.

## 4. Les familles retenues — et les quatre écartées

### Onze familles

L'ordre est celui d'un cours : les doigts d'abord, puis les figures, puis ce
qui demande une main déjà formée, la coordination des deux mains en dernier.

| # | Famille | `id` | Ce qui se travaille | État |
| --- | --- | --- | --- | --- |
| 1 | **Déliement** | `finger-independence` | Un doigt tient, les autres jouent | 9/9 |
| 2 | **Égalité** | `evenness` | Même son, même durée ; accents déplacés | 9/9 |
| 3 | **Notes répétées** | `repeated-notes` | Changer de doigt sur une même note, poignet libre | 9/9 |
| 4 | **Gammes** | `scales` | Passage du pouce sans trou ni accent | 9/9 |
| 5 | **Arpèges** | `arpeggios` | Ouvrir la main sur l'accord et la garder ouverte | 9/9 |
| 6 | **Accords** | `chords` | Plusieurs doigts au même instant ; renversements | 9/9 |
| 7 | **Doubles notes** | `double-notes` | Tierces et sixtes : deux voix qui partent et s'arrêtent ensemble | 9/9 |
| 8 | **Octaves** | `octaves` | Le poignet, pas le bras — préparé par la sixte et la septième | 9/9 |
| 9 | **Trilles** | `trills` | Battements rapides entre deux doigts voisins | 9/9 |
| 10 | **Extension** | `extension` | Écarter la main, passer un doigt par-dessus le pouce | 9/9 |
| 11 | **Coordination des mains** | `coordination` | Deux rythmes, deux articulations, deux accentuations à la fois | 9/9 |

**99 exercices**, tous écrits et tous vérifiés.

### Les quatre écartées, et la raison

Écarter n'est pas oublier. Chacune de ces quatre est un vrai sujet de travail —
et chacune est déjà traitée ailleurs, mieux qu'un rouleau de deux octaves ne
saurait le faire.

- [x] **Rythme** — la famille `rhythm` déclarée « bientôt » est **retirée**.
  [05 — Entraînement rythmique](05-entrainement-rythmique.md) fait le même
  travail avec ce que ce mode n'a pas : un jugement à l'heure / en avance / en
  retard (`rhythm/timing.js`), trois entrées (tap, piano, MIDI) et un
  métronome au premier plan. Un exercice de rythme dans le mode Exercices
  n'aurait qu'un rouleau qui défile — l'élève verrait le rythme sans qu'on lui
  dise jamais s'il l'a joué juste. Ce qui reste utile ici — un motif pointé,
  un contretemps — vit dans les autres familles comme **variante rythmique**
  d'un geste, ce qui est sa place chez Czerny aussi.
- [x] **Sauts et déplacements** — traité par la famille **B3** des
  [exercices générés](exercices-generes.md), en fichiers MIDI joués dans le
  mode Morceau. Raison technique, pas pédagogique : le rouleau de ce mode
  dessine son clavier **sans défilement latéral**, et un saut de trois octaves
  y réduirait les touches à quelques pixels — le doigté chiffré (E3) ne
  tiendrait plus dedans. Les déplacements courts, eux, restent : ils sont dans
  Accords (renversements) et Octaves.
- [x] **Articulation** (legato / staccato / portato) — **pas une famille**,
  un paramètre. Le catalogue sait déjà écrire un staccato : `holdBeats` plus
  court que `beats` (une note qui sonne un quart de temps sur un pas d'un
  temps). Mais rien dans l'application ne **juge** une articulation : un
  staccato réussi et une note écourtée se ressemblent au millième de seconde
  près, et la validation MIDI ne regarde que les départs. En faire une famille
  promettrait un travail qu'on ne sait pas mesurer. On la met donc là où elle
  se voit : Accords niveau Difficile (accords piqués), Octaves niveau
  Intermédiaire, Coordination niveau Difficile (legato d'une main, staccato de
  l'autre).
- [x] **Pédale** — [09](09-pedale.md), qui a son propre mode, son témoin
  d'état et ses verdicts (propre / brouillé / trou / oubliée).

## 5. Les trois niveaux — le niveau est relatif à sa famille

`DIFFICULTIES` existe déjà : `beginner` / `intermediate` / `advanced`, les
mêmes identifiants que la Lecture de notes et l'Oreille. Le [§ 5 de
03](03-technique-doigts.md#5-niveaux-de-difficulté) en donne les critères
généraux (tonalités, étendue, doigté visible, mains).

**Un critère de plus, qui manque à 03 et qui a déjà servi ailleurs :** le
niveau gradue *le sujet de la famille*, pas une difficulté abstraite. C'est
la règle écrite pour les exercices générés — *le § 4 plafonne les axes qu'une
famille subit ; l'axe qu'elle travaille est gradué par sa propre ligne* — et
elle vaut ici mot pour mot. Deux conséquences concrètes :

- le **Débutant** de la famille Octaves ne joue **pas** d'octaves : il joue
  des sixtes puis des septièmes, poignet souple, parce qu'aucun professeur ne
  met un débutant à l'octave — et parce qu'une main d'enfant n'y arrive pas.
  Le mot « Débutant » y veut dire *première étape du travail d'octave* ;
- le **Difficile** de la famille Notes répétées reste sur une seule touche :
  ce n'est pas parce que c'est le niveau le plus dur qu'il faut y ajouter des
  déplacements qui ne sont pas le sujet.

Ce que le niveau **ne** fait **pas** : monter le tempo. Le tempo est un
réglage séparé, et chaque exercice porte son `defaultTempo`.

## 6. Format d'un exercice — ce qui manque au catalogue

Le format actuel (`pattern` de pas, `fingering` par main, `holdBeats`,
`accent`, `beats`) couvre déjà beaucoup :

- [x] les accords — un pas est un tableau de degrés ;
- [x] les notes tenues — `holdBeats` déborde sur les pas suivants sans les
  décaler ;
- [x] les rythmes pointés et les groupes irréguliers — `beats` par pas ;
- [x] les accents — `accent: true` ;
- [x] **les silences** — `{ degrees: [], beats: 1 }` fonctionne déjà, vérifié
  le 30/07/2026 : le curseur avance, aucune note n'est posée, et un `null`
  dans `fingering` au même rang ne gêne pas. Rien à écrire pour cela.

Trois manques réels, chacun bloquant des exercices précis :

- [x] **M1 — Degrés altérés.** **Fait le 30/07/2026.** Un degré s'écrit `4`
      ou `"4#"` / `"4b"` ; `parseDegree()` lit les deux, `degreeToSemitones()`
      ajoute l'altération à la table diatonique, et `negateDegree()` renverse
      l'altération avec le degré pour le mouvement contraire.
      **Une limite découverte en le faisant :** un motif chromatique **ne se met
      pas en miroir**. Le miroir de ce mode est *diatonique* — la gauche joue le
      même degré vers le bas, pas le même demi-ton —, si bien qu'une suite
      chromatique renversée ainsi n'est plus chromatique : deux notes voisines
      y retombent sur la même hauteur. Le harnais **refuse** donc les degrés
      altérés combinés à `bothMode: "contrary"` ; ces exercices-là s'écrivent
      avec `patternByHand`, les deux mains explicitement.
- [x] **M2 — Un motif par main.** **Fait le 30/07/2026.**
      `patternByHand: { right, left }` ; `bothMode` reste pour le cas
      symétrique, qui est le plus courant. La génération résout une **ligne par
      main** — pas, rangs, doigté, tonique, miroir — au lieu d'un seul jeu de
      pas partagé, et `handsAgreeOnLength()` vérifie que les deux motifs
      totalisent le même nombre de temps : sinon les deux mains se décaleraient
      un peu plus à chaque répétition. Vérifié sur un deux-contre-trois.
- [x] **M3 — Le nombre de doigts.** **Fait le 30/07/2026** :
      `tools/verifier-catalogue.js`, qui applique tout le § 9 et refuse un
      exercice mal formé. Il a attrapé son premier cas dès sa première
      exécution — voir § 9.

## 7. Le doigté sur les notes (E3) — ce qu'il faut corriger

Le chiffre **existe** : `drawNotes()` l'écrit au centre du rectangle de la
note, en `600 12px system-ui`. Mais sous une condition :

```js
if (note.finger && height >= 16 && width >= 14) {
```

Sur une gamme en doubles-croches (`beatsPerStep: 0.25`) le rectangle fait
une quinzaine de pixels de haut : **le doigté disparaît exactement là où
l'élève en a le plus besoin.** Trois corrections :

- [x] **D1 — Écrire le chiffre à côté de la note quand il ne tient pas
      dedans.** **Fait le 30/07/2026** : `drawFinger()` écrit le chiffre dans
      la note au-dessus de 15 px de haut, et sinon dans une pastille sombre
      juste au-dessus du rectangle pour la main droite, juste en dessous pour la
      gauche — chaque main garde son côté, les deux chiffres ne se superposent
      pas.
- [x] **D2 — Ne jamais masquer un chiffre pour cause de largeur.** **Fait** :
      12 px au-dessus de 18 px de large, 10 px au-dessus de 11 px, et rien en
      dessous — mais à cette largeur rien d'autre n'est lisible non plus.
- [x] **D3 — Le doigté d'un accord.** **Vérifié en capture d'écran** le
      30/07/2026, sur la gamme en croches : les huit chiffres 1-2-3-1-2-3-4-5
      sont écrits, un par note. La pastille du cas « à côté » reste **non
      vérifiée à l'image** : aucun exercice du catalogue n'a encore de pas
      assez court pour la déclencher — ce sera la gamme en doubles-croches de
      la vague 1.

Ce qui **ne** change **pas** : le chiffre reste sur la note, pas dans une
légende à côté. C'est ce que demande la demande, et c'est ce que fait une
partition.

## 8. Plan de production

Trois vagues. Une famille n'est cochée que lorsque ses **neuf** exercices sont
écrits, vérifiés par le harnais du § 9, et joués dans le mode Exercices.

### Vague 0 — les fondations du format — **faite le 30/07/2026**

Aucune de ces trois n'est un exercice, et les trois bloquaient des exercices.

- [x] **M1** — degrés altérés dans `generate-exercise.js`.
- [x] **M2** — `patternByHand` pour les motifs différents entre les mains.
- [x] **M3 + D1 + D2 + D3** — `tools/verifier-catalogue.js`, et doigté
      toujours lisible dans le rouleau.
- [x] **Les onze familles déclarées**, `rhythm` retirée (décision du § 10.3).
      `familiesToCome()` du mode ne les cite plus en dur : la liste des
      familles « Bientôt » se déduit de celles qui n'ont pas encore
      d'exercice — sans quoi les cinq nouvelles n'auraient apparu nulle part,
      ni jouables ni annoncées.

### Vague 1 — compléter ce qui est commencé — **faite le 30/07/2026**

Les cinq familles qui contenaient déjà quelque chose. On a fini ce qui était
ouvert avant d'ouvrir autre chose : **45 exercices, 5 familles complètes sur
11**, tous vérifiés par `tools/verifier-catalogue.js`.

- [x] **1. Déliement** — **9/9, fait le 30/07/2026**
  - [x] Débutant : Un doigt tient, les autres jouent · Deux doigts tiennent,
        trois jouent · Le petit doigt tient, la main redescend
  - [x] Intermédiaire : Trois doigts tiennent, 4 et 5 travaillent ·
        Marche de tenues · Le majeur tient, les autres l'encadrent
  - [x] Difficile : Tenues et mouvement contraire · Deux tenues et battement
        du 4-5 · Une touche noire sous le 4 (fa♯ en Do, do♯ en Sol — le premier
        usage des degrés altérés de M1)
- [x] **4. Gammes** — **9/9, fait le 30/07/2026**
  - [x] Débutant : Tétracorde sans passage de pouce · Le passage du pouce, seul ·
        Gamme sur une octave
  - [x] Intermédiaire : Gamme sur deux octaves · Gamme par groupes de quatre
        avec arrêt (Cortot) · Gamme en rythme pointé
  - [x] Difficile : Gamme en mouvement contraire · Gamme sur trois octaves ·
        Gamme chromatique sur une octave

  Trois choses apprises en écrivant cette famille :

  1. **Le passage du pouce n'est pas au même endroit dans les deux mains** — à
     droite entre le 3ᵉ et le 4ᵉ degré (mi-fa en Do), à gauche entre le 5ᵉ et le
     6ᵉ (sol-la). L'exercice qui l'isole est donc le **premier usage de M2** :
     deux motifs distincts, un par main. Sans `patternByHand` il aurait fallu
     mentir sur l'une des deux.
  2. **Trois octaves aux deux mains couvrent quatre octaves de clavier** (do2 à
     do6). Le plafond d'ambitus du harnais, écrit à 36 demi-tons « par prudence »,
     l'aurait refusé — à tort : 29 touches blanches sur 800 px font 27 px
     chacune, largement de quoi porter un chiffre. Le plafond est passé à 48, avec
     le calcul écrit dans le harnais. Contrairement au plan des exercices générés,
     l'ambitus se mesure ici **en total et non par main** : ce rouleau dessine les
     deux mains sur un seul clavier qui ne défile pas.
  3. **La gamme chromatique est main droite seulement**, et c'est délibéré : son
     doigté de main gauche ne place pas le 2 aux mêmes endroits, et l'écrire sans
     l'avoir essayé au clavier serait inventer. C'est aussi le premier exercice à
     pas d'un quart de temps, donc celui qui a fait apparaître le doigté **à
     côté** de la note (§ 7, D1) — vérifié en capture d'écran à la taille de la
     tablette, où le rectangle tombe à 11 px et où l'ancien code n'écrivait plus
     rien du tout.
- [x] **5. Arpèges** — **9/9**
  - [x] Débutant : Arpège de Do majeur · Accord brisé sur place · Brisé,
        puis plaqué
  - [x] Intermédiaire : Arpège sur deux octaves · Premier renversement ·
        Septième de dominante
  - [x] Difficile : Arpège sur trois octaves · Les trois renversements
        enchaînés · Arpèges en mouvement contraire

  « Arpège de Fa et de Sol » a été abandonné : ce n'aurait pas été un exercice
  mais le même joué dans un autre ton, ce que `supportedKeys` fait déjà. Il est
  remplacé par **Brisé, puis plaqué** — l'accord plaqué sert de contrôle à
  l'arpège, et donne à l'élève un critère qu'il peut entendre sans professeur.

  **Le mouvement contraire a demandé `patternByHand`**, et c'est la deuxième
  fois que la limite du miroir diatonique se manifeste : renverser 0-2-4-7
  donne do-la-fa-do, un arpège de **Fa**. Pour que les deux mains jouent
  réellement le même accord en sens opposé, il faut écrire les deux lignes.
- [x] **6. Accords** — **9/9**
  - [x] Débutant : Do – Fa – Sol – Do · Accord répété, attaque nette ·
        Majeur et mineur (la tierce baissée, deuxième usage de M1)
  - [x] Intermédiaire : Renversements de Do majeur · Cadence I–IV–V–I avec
        renversements · Accords de septième
  - [x] Difficile : Accords piqués · Renversements en montant et en
        descendant · Cadence à quatre voix

  « La cadence dans trois tonalités » a été abandonnée : la tonalité est un
  réglage, pas un exercice — trois tonalités du même exercice ne font pas trois
  exercices. Elle est remplacée par la **cadence à quatre voix**, où la main
  gauche joue la basse et sa quinte tandis que la droite tient l'accord : c'est
  le seul exercice de la famille où les deux mains n'ont pas le même contenu, et
  c'est cela qui en fait le niveau le plus difficile — pas le nombre de notes.
- [x] **2. Égalité** — **9/9**
  - [x] Débutant : Accent sur chaque temps · Accent sur la deuxième croche ·
        Aucun accent : l'oreille seule juge
  - [x] Intermédiaire : Accent tous les trois · Cinq notes dans un temps ·
        Séquence montante, son égal
  - [x] Difficile : Accent tous les cinq · Sept notes dans un temps ·
        Égalité aux deux mains en sens opposé

  Aucun des neuf n'a eu besoin de M2 : le mouvement contraire suffit, parce que
  les deux mains y jouent bien le même dessin diatonique — contrairement à
  l'arpège, dont le miroir change d'accord. La prévision « deux dépendent de
  M2 » était donc fausse, et il valait mieux le constater que forcer.

  **Deux placements d'accents ont été vérifiés dans les notes produites** et
  non seulement écrits : rangs 0-3-6-9-12-15-18-21 sur vingt-quatre croches pour
  « tous les trois », et 0-5-10-15-20-25-30-35 sur quarante pour « tous les
  cinq ». Un accent mal placé dans un tableau de quarante entrées ne se voit
  pas à la relecture.

  Ce que ces neuf exercices **ne** font **pas** : mesurer l'égalité. Rien dans
  l'application ne juge une nuance — la validation MIDI regarde les hauteurs et
  les départs. C'est pour cela que la consigne de « Aucun accent » dit *où*
  écouter (le 5ᵉ doigt en montant, le pouce en descendant) : à défaut de
  mesure, on donne un critère.

### Vague 2 — les familles vides mais déclarées — **faite le 30/07/2026**

- [x] **3. Notes répétées** — **9/9**
  - [x] Débutant : 3-2-1 sur la même note · 4-3-2-1 sur la même note ·
        Répéter, puis changer de note
  - [x] Intermédiaire : 3-2-1 en montant la gamme · Répétées et changement de
        position · Accord répété, même main
  - [x] Difficile : 4-3-2-1 sans respiration · Répétée sous une note tenue ·
        Répétées alternées entre les mains

  « Deux notes alternées, doigts fixes » a été abandonné : c'est un trille, et
  la famille Trilles l'attend. Remplacé par **Répéter, puis changer de note**,
  qui reste dans le sujet — le même groupe de trois, repris sur la touche
  voisine.

  Deux choses valent d'être notées. **Le silence fait partie de l'exercice** aux
  deux premiers niveaux : c'est pendant lui que la main se détend, et un exercice
  de notes répétées sans respiration apprend à se crisper. Et **« Accord
  répété » est le contre-exemple utile de la famille** : le relais de doigts y
  est impossible, la répétition ne peut venir que du poignet — c'est ce qui
  montre à quoi servait le relais dans les cinq autres.

  Le niveau Difficile reste sur **une seule touche** : ce n'est pas parce que
  c'est le niveau le plus dur qu'il faut y ajouter des déplacements qui ne sont
  pas le sujet (§ 5).
- [x] **11. Coordination des mains** — **9/9**, et les neuf dépendaient bien de M2
  - [x] Débutant : Une main tient, l'autre joue · Alternance mesure par mesure ·
        Deux contre un
  - [x] Intermédiaire : Accents décalés entre les mains · Canon à un temps ·
        Trois contre deux
  - [x] Difficile : Quatre contre trois · Legato d'une main, piqué de l'autre ·
        Deux rythmes en sens opposé

  « Mains en miroir exact » a été abandonné : c'est exactement
  `even-contrary-motion` de la famille Égalité, et deux exercices identiques dans
  deux familles sont précisément le reproche fait à Hanon. Les trois rapports de
  rythme ont donc été redistribués — deux contre un au Débutant, trois contre
  deux à l'Intermédiaire, quatre contre trois au Difficile —, ce qui est de toute
  façon la vraie progression : le Débutant est le seul rapport où chaque note
  d'une main tombe **avec** une note de l'autre.

  **Les rapports sont vérifiés dans les temps de départ produits**, pas seulement
  écrits : trois contre deux donne 0 · 0,333 · 0,667 à droite contre
  0 · 0,5 · 1 à gauche ; quatre contre trois donne 0 · 0,25 · 0,5 · 0,75 contre
  0 · 0,333 · 0,667. Un dénominateur mal placé dans un tableau de vingt-quatre
  entrées ne se voit pas à la relecture.

  Le relais de « Répétées alternées entre les mains » a été vérifié de la même
  façon : la droite finit sa note à 1,96 temps, la gauche entre à 2,00 — le
  passage est réellement sans trou ni chevauchement, ce que la consigne promet.

### Vague 3 — les quatre familles nouvelles — **faite le 30/07/2026**

- [x] **7. Doubles notes** — **9/9**
  - [x] Débutant : Tierces sur cinq notes · Sixtes sur cinq notes ·
        Tierces et sixtes alternées
  - [x] Intermédiaire : Gamme en tierces sur une octave (1-3 / 2-4 en
        alternance) · Gamme en sixtes · Tierces brisées
  - [x] Difficile : Tierces sur deux octaves · Tierces chromatiques (M1) ·
        Tierces à droite, sixtes à gauche (M2)

  « Tierces legato 1-3 / 2-4 » a été fondu dans « Gamme en tierces sur une
  octave », dont c'est déjà le doigté : en faire un exercice de plus n'aurait
  changé que l'articulation. Remplacé par **Tierces brisées** — la note du bas,
  celle du haut, puis les deux : le brisé sert de contrôle au plaqué, comme
  l'accord plaqué sert de contrôle à l'arpège.
- [x] **8. Octaves** — **9/9**
  - [x] Débutant : Sixte puis septième, poignet souple · L'octave posée, tenue ·
        Octaves alternées entre les mains
  - [x] Intermédiaire : Octaves sur cinq notes · Octaves piquées ·
        Octave et sixte alternées
  - [x] Difficile : Octaves chromatiques, doigté 5-4 sur les noires (M1) ·
        Octaves brisées · Octaves aux deux mains en sens opposé (M2)

  Le niveau Débutant ne joue **pas** d'octaves, comme le § 5 l'annonçait : il
  joue des sixtes puis des septièmes. C'est la seule famille où le mot
  « Débutant » désigne la préparation du geste et non le geste lui-même.

  Les octaves chromatiques sont **la** raison pour laquelle M1 a été écrit : le
  doigté 5 sur les blanches, 4 sur les noires est tout le sujet de l'exercice,
  et sans degrés altérés il était impossible à noter.
- [x] **9. Trilles et ornements** — **9/9**
  - [x] Débutant : Battement 2-3 · Battement 3-4 · Battement 1-2 — dans l'ordre
        où les paires cèdent, le pouce en dernier parce qu'il tourne au lieu de
        descendre
  - [x] Intermédiaire : Trille mesuré en quatre notes · Mordant et note
        piquée · Trille avec le 5 qui tient (Pischna)
  - [x] Difficile : Trille 4-5 en doubles-croches (M2) · Trille chromatique
        (M1) · Gruppetto enchaîné

  **Le trille 4-5 a demandé M2**, et pour une raison qui ne s'était pas encore
  présentée : le 4 et le 5 ne sont pas sur les mêmes degrés dans les deux mains
  — en haut de la position à droite, en bas à gauche. Avec un motif commun, une
  des deux mains aurait travaillé son pouce et son index.
- [x] **10. Extension** — **9/9**, et la substitution a été abandonnée
  - [x] Débutant : Écart de sixte 1 et 5 · Passer le 2 par-dessus le pouce ·
        Cinq doigts sur une sixte
  - [x] Intermédiaire : Écart de septième · Le 3 par-dessus le pouce ·
        Cinq doigts sur une octave
  - [x] Difficile : Écart d'octave, pouce tenu · Ouvrir et refermer ·
        Extension en mouvement contraire

  **La substitution — changer de doigt sur une touche qui reste enfoncée — n'est
  pas dans le catalogue, et ne peut pas y être.** Le format ne sait pas
  l'écrire : une note porte *un* doigt, pas deux. La noter en deux notes dirait
  exactement le contraire de ce qu'il faut faire — ne pas relâcher —, et le
  rouleau montrerait deux attaques là où il n'y en a qu'une. Plutôt que de
  mentir dans l'affichage, elle est laissée de côté ; le nom de la famille et
  son but ont été corrigés en conséquence (« Extension » et non « Extension et
  substitution »).

  C'est la seule chose que la demande d'origine impliquait et que ce catalogue
  ne fournit pas. La rendre possible demanderait un doigté par *segment* de
  note, ce qui touche le rouleau, le générateur et la validation MIDI — un
  chantier à part, pas une ligne de données.

### Après les trois vagues

- [ ] Cocher **« Ajouter le choix de difficulté »** dans la checklist de
      [03](03-technique-doigts.md#checklist-résumée) : le sélecteur existe
      déjà, mais son commentaire dit encore *« le catalogue ne contient que des
      exercices Débutant »*, ce qui n'est plus vrai depuis le 29/07/2026 et le
      sera encore moins ici.
- [ ] Mettre à jour le tableau des familles du [§ 4 de 03](03-technique-doigts.md#4-familles-dexercices),
      qui annonce encore six familles dont trois hors MVP.
- [x] **Vérifier que le matériel est atteignable.** Fait le 30/07/2026, et
      c'était **le vrai risque de ce chantier** — celui que la vague 3 aurait
      aggravé au lieu de le corriger.

      Le Programme (04) choisit une *fonctionnalité* — « Exercices, 5 min » —,
      jamais un exercice. Et le mode Exercices rouvrait le **dernier** exercice
      pratiqué. Bout à bout : l'application proposait, jour après jour,
      indéfiniment, **un exercice sur quatre-vingt-dix-neuf**. C'est très
      exactement le reproche fait à Hanon au § 3, retourné contre nous par le
      seul fait d'avoir grossi le catalogue.

      Correction : `leastRecentlyPracticed()` dans `progress/views.js` — la
      septième vue de F3, écrite le jour où quelqu'un l'a demandée, comme le
      veut la règle du projet. Le mode garde la **famille et le niveau** de la
      dernière séance (on ne change pas de sujet sans le vouloir) et propose,
      dedans, l'exercice le moins récemment travaillé. Celui qu'on n'a jamais
      fait passe en premier.

      Vérifié dans le navigateur sur quatre séances simulées : trois exercices
      différents en trois jours, puis la rotation reboucle.

      Ce qui **ne** change **pas** : le tempo, la main, le métronome et la
      démonstration viennent toujours de la dernière séance — ce sont des
      préférences, pas un contenu à faire tourner. Et le mode Morceau continue
      de rouvrir le dernier morceau : on *répète* une pièce pendant des
      semaines, on *fait tourner* des exercices. La distinction est le cœur de
      la correction.

## 9. Vérification — ce qu'un harnais doit refuser

Quatre-vingt-dix-neuf exercices ne se relisent pas à l'œil. Comme
`tools/generer-exercice.js` refuse d'écrire un fichier MIDI qui ne tient pas
son niveau, **`tools/verifier-catalogue.js`** refuse un exercice mal formé.
Écrit le 30/07/2026, il vérifie :

- [x] `fingering[main]` a exactement autant d'entrées que le motif a de pas —
      pour chaque tonalité déclarée, `fingeringByKey` compris ;
- [x] un pas-accord a autant de doigts que de degrés, et un silence n'a pas de
      doigt du tout (`null`, et rien d'autre) ;
- [x] tous les doigts sont des entiers de 1 à 5 ;
- [x] dans un accord, les doigts se suivent dans le bon sens : croissant à
      droite (pouce en bas), décroissant à gauche (pouce en haut) ;
- [x] `isBarAligned()` est vrai — sinon la deuxième série ne tomberait plus sur
      un premier temps — et les deux motifs d'un exercice à deux mains durent
      autant l'un que l'autre ;
- [x] l'ambitus tient dans **trois octaves** (36 demi-tons), au-delà de quoi les
      touches deviennent trop étroites pour le doigté ;
- [x] aucun pas ne dure moins de **1/8 de temps** ;
- [x] les degrés se lisent (`parseDegree`), et les degrés altérés ne sont pas
      combinés à un mouvement contraire (§ 6, M1) ;
- [x] `supportedKeys` non vide, tonalités connues, `fingeringByKey` ne cite que
      des tonalités déclarées ;
- [x] chaque main annoncée a son doigté et son mode ;
- [x] la génération produit réellement des notes, dans le clavier, toutes
      pourvues d'un doigt ;
- [x] les `id` sont uniques, et les `title` uniques au sein d'une famille ;
- [x] l'état de chaque famille est **compté** et affiché — 3 par niveau ou non,
      et `∅` pour une famille déclarée mais vide, donc invisible dans
      l'application.

### Le premier cas qu'il a attrapé

Dès sa première exécution, le harnais a refusé `hold-thumb-contrary` : son
doigté de main gauche, `[1, 2, 3]`, « ne décroît pas comme il devrait, le pouce
gauche va sur la note la plus haute ». Le harnais avait tort, et c'est
instructif — **en mouvement contraire le doigté de la main gauche est écrit
dans l'ordre des degrés du motif, avant miroir.** Les hauteurs réelles
descendent quand les degrés écrits montent : le premier degré écrit *est* la
note la plus haute, et le pouce y est bien. La règle s'inverse donc pour ce
seul cas, et le harnais le sait maintenant.

Un contrôle qui se trompe sur du code correct est un contrôle qu'il faut
corriger, pas contourner : sans cette exception, les neuf exercices de
mouvement contraire à venir auraient tous été refusés — ou, pire, réécrits
avec un doigté faux pour faire passer le test.

Ce que le harnais ne saura **pas** dire, et qu'il faut écrire dans ce plan
plutôt que prétendre l'avoir vérifié :

- si un doigté est **jouable** — un 4 sur une touche noire suivi d'un 5 sur
  une blanche voisine passe ou ne passe pas selon la main ; seul l'essai au
  clavier le dit ;
- si un exercice est **utile** — c'est ce que la source (§ 3) garantit, pas un
  test ;
- si le son est **égal** — le sujet même de la famille Égalité n'est mesurable
  par rien dans l'application, la validation MIDI ne regardant que les
  hauteurs et les départs.

## 9 bis. Ce qui reste vrai après les 99 exercices

Trois choses que ce catalogue **ne** fait **pas**, et qu'il valait mieux écrire
que laisser croire :

1. **Aucun doigté n'a été essayé au clavier.** Le harnais vérifie qu'un doigté
   est *cohérent* — bonne longueur, doigts de 1 à 5, bon sens dans un accord —,
   pas qu'il est *jouable*. Un 4 sur une touche noire suivi d'un 5 sur la
   blanche voisine passe ou ne passe pas selon la main. Les doigtés dont je
   n'étais pas sûr ont été restreints plutôt qu'inventés : la gamme chromatique
   est main droite seulement, et les tierces chromatiques portent un
   commentaire disant que leur doigté suit le principe blanc/noir des traités et
   reste à essayer.
2. **L'égalité, l'articulation et le relâchement commun ne sont pas mesurés.**
   La validation MIDI regarde les hauteurs et les départs. Un piqué réussi et
   une note écourtée se ressemblent ; deux voix qui se relâchent ensemble et
   deux voix qui se relâchent à un cheveu près, aussi. C'est pour cela que les
   consignes de ces exercices disent *où écouter* : à défaut de mesure, on donne
   un critère.
3. **La substitution manque, et manquera jusqu'à un chantier à part.** Voir la
   famille Extension au § 8.

En revanche, ce que le harnais **a** attrapé mérite d'être noté, parce qu'aucune
relecture ne l'aurait vu :

- une paire de tierces chromatiques écrite `["5#", "7b"]` au lieu de
  `["5#", "7#"]` — la♯ et si, une seconde mineure au milieu de douze tierces
  correctes. C'est ce qui a fait ajouter le champ `interval`, qui compare
  l'écart de **chaque** paire produite à celui que l'exercice déclare ; le
  contrôle a été testé en réintroduisant la faute exprès ;
- une série de gamme sur trois octaves qui ne retombait pas sur un premier
  temps — quarante-deux croches font vingt et un temps, et la tenue finale
  devait durer trois temps, pas deux ;
- son propre plafond d'ambitus, trop prudent de douze demi-tons ;
- et sa propre règle de doigté d'accord, fausse en mouvement contraire.

Deux fois sur quatre, c'est le harnais qui avait tort. Un contrôle qui se trompe
sur du code correct se corrige — il ne se contourne pas.

## 10. Décisions tranchées

1. ~~**Les tonalités.**~~ **Tranché : au cas par cas, et non par une règle.**
   Un exercice déclare les tons dans lesquels son doigté a réellement été
   vérifié. En pratique : les positions fixes prennent les trois tons (le
   doigté n'y dépend pas du ton), les gammes et arpèges à doigté propre n'en
   prennent qu'un, et les motifs altérés se limitent aux tons où l'altération
   tombe bien sur une touche noire — « Une touche noire sous le 4 » exclut Fa
   parce que le degré haussé y donnerait un si naturel, une blanche, et
   l'exercice n'aurait plus d'objet. `fingeringByKey` ne surcharge que ce qui
   change vraiment : en Fa, seule la main droite des gammes.
2. **Les mains.** Faut-il que les 99 exercices proposent les trois modes
   (droite, gauche, les deux) ? **Proposition : non.** `supportedHands` existe
   pour cela, et un exercice de coordination n'a aucun sens à une main.
3. ~~**La famille `rhythm`.**~~ **Retirée** (§ 4). Ce qui restait utile — le
   rythme pointé, le contretemps, les groupes irréguliers — vit dans les autres
   familles comme variante d'un geste : la gamme en rythme pointé, les cinq et
   sept notes par temps de l'Égalité, les trois rapports de la Coordination.
4. ~~**Le nombre de répétitions par défaut.**~~ **Tranché exercice par
   exercice**, comme prévu : 4 par défaut, 3 ou 2 pour les longs (gamme et
   arpège sur trois octaves, accent tous les cinq qui fait cinq mesures par
   série), 8 pour le passage du pouce isolé — trois notes en boucle demandent
   des séries nombreuses, pas longues.
