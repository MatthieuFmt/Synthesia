# Catalogue d'exercices techniques — un vrai programme de professeur

> Statut : **plan écrit, production à faire** (30/07/2026).
> Ce fichier couvre le **contenu** du mode Exercices ([03](03-technique-doigts.md)),
> pas son interface : l'écran, le rouleau, le décompte, le métronome, le bilan
> et la validation MIDI sont en place depuis le 26/07/2026 et ne changent pas.
> Ce qui manque, c'est ce qu'il y a **dedans** : neuf exercices aujourd'hui,
> quatre-vingt-dix-neuf visés.

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

## 2. Ce qui existe déjà — l'inventaire honnête

`src/exercises/catalog.js` contient **neuf** exercices, et l'écran de réglages
sait déjà les présenter : famille → niveau → exercice, un niveau vide restant
visible mais désactivé. Le manque est du **contenu**, pas du code d'interface.

| Famille | Débutant | Intermédiaire | Difficile | Total |
| --- | --- | --- | --- | --- |
| Déliement | 1 | 1 | 1 | 3 |
| Égalité | 0 | 0 | 0 | **0** |
| Notes répétées | 0 | 0 | 0 | **0** |
| Gammes | 1 | 1 | 1 | 3 |
| Arpèges | 1 | 0 | 0 | 1 |
| Accords | 1 | 0 | 0 | 1 |
| Coordination (déclarée « bientôt ») | 0 | 0 | 0 | **0** |
| Rythme (déclarée « bientôt ») | 0 | 0 | 0 | **0** |

Deux familles sont déclarées `available` **sans contenir un seul exercice** —
`evenness` et `repeated-notes`. `availableFamilies()` les cache donc, et
l'utilisateur ne les voit jamais : elles sont mortes dans le catalogue depuis
qu'elles y ont été écrites. C'est exactement le trou que E2 comble.

## 3. Ce que « un vrai professeur » veut dire

Pas « plus de notes » : un corpus identifié. Chaque exercice de ce catalogue
porte sa source dans un commentaire, comme les neuf actuels le font déjà.

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

| # | Famille | `id` | Ce qui se travaille | État |
| --- | --- | --- | --- | --- |
| 1 | **Déliement** | `finger-independence` | Un doigt tient, les autres jouent | 3/9 |
| 2 | **Égalité** | `evenness` | Même son, même durée ; accents déplacés | 0/9 |
| 3 | **Notes répétées** | `repeated-notes` | Changer de doigt sur une même note, poignet libre | 0/9 |
| 4 | **Gammes** | `scales` | Passage du pouce sans trou ni accent | 3/9 |
| 5 | **Arpèges** | `arpeggios` | Ouvrir la main sur l'accord et la garder ouverte | 1/9 |
| 6 | **Accords** | `chords` | Plusieurs doigts au même instant ; renversements | 1/9 |
| 7 | **Doubles notes** | `double-notes` | Tierces et sixtes : deux voix qui partent et s'arrêtent ensemble | 0/9 |
| 8 | **Octaves** | `octaves` | Le poignet, pas le bras — préparé par la sixte et la septième | 0/9 |
| 9 | **Trilles et ornements** | `trills` | Battements rapides entre deux doigts voisins | 0/9 |
| 10 | **Extension et substitution** | `extension` | Écarter, passer un doigt par-dessus, changer de doigt sur une note tenue | 0/9 |
| 11 | **Coordination des mains** | `coordination` | Deux rythmes, deux articulations, deux accentuations à la fois | 0/9 |

**99 exercices** au total. Il en existe 9 : il en reste **90** à écrire.

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

- [ ] **M1 — Degrés altérés.** `degreeToSemitones()` ne connaît que les sept
      degrés de la gamme majeure : 0 2 4 5 7 9 11. Impossible d'écrire un
      trille chromatique, une tierce chromatique, une octave chromatique
      (dont le doigté 5-4 sur les noires est *tout* le sujet), ni un accord
      mineur. Il faut une forme de degré qui porte une altération —
      `{ degree, alter }`, ou la notation courte `"2b"` / `"4#"` — et
      `MAJOR_SCALE` reste la référence diatonique.
      **Bloque :** Trilles Difficile, Doubles notes Difficile, Octaves
      Difficile, Accords Débutant (majeur/mineur).
- [ ] **M2 — Un motif par main.** Aujourd'hui les deux mains jouent le *même*
      `pattern`, en parallèle ou en miroir (`bothMode`). Deux contre trois, un
      canon à un temps, une main legato et l'autre piquée : aucun ne s'écrit.
      Il faut `patternByHand: { right, left }` et le `fingering` qui va avec,
      `bothMode` restant pour le cas symétrique — qui est le plus courant et
      qu'il ne faut pas alourdir.
      **Bloque :** les 9 exercices de Coordination, plus deux d'Égalité.
- [ ] **M3 — Le nombre de doigts.** Rien ne vérifie qu'un doigté est cohérent
      avec son motif : même longueur, même nombre de doigts par accord,
      valeurs entre 1 et 5, et — pour la main gauche — le pouce sur la note la
      plus **haute** d'un accord. Neuf exercices se relisent à la main ;
      quatre-vingt-dix-neuf, non. C'est le harnais du § 9.

## 7. Le doigté sur les notes (E3) — ce qu'il faut corriger

Le chiffre **existe** : `drawNotes()` l'écrit au centre du rectangle de la
note, en `600 12px system-ui`. Mais sous une condition :

```js
if (note.finger && height >= 16 && width >= 14) {
```

Sur une gamme en doubles-croches (`beatsPerStep: 0.25`) le rectangle fait
une quinzaine de pixels de haut : **le doigté disparaît exactement là où
l'élève en a le plus besoin.** Trois corrections :

- [ ] **D1 — Écrire le chiffre à côté de la note quand il ne tient pas
      dedans**, plutôt que de ne pas l'écrire. Au-dessus du rectangle pour la
      main droite, en dessous pour la gauche, avec un fond sombre translucide
      pour rester lisible par-dessus une autre note.
- [ ] **D2 — Ne jamais masquer un chiffre pour cause de largeur.** Une touche
      étroite (trois octaves à l'écran) laisse 25 px : de quoi écrire un
      chiffre de 10 px. C'est le seuil de 14 px qui est trop prudent.
- [ ] **D3 — Le doigté d'un accord.** Trois notes empilées portent trois
      chiffres, chacun sur sa note : c'est déjà le cas, mais jamais vérifié
      en capture d'écran. À contrôler dans le harnais visuel.

Ce qui **ne** change **pas** : le chiffre reste sur la note, pas dans une
légende à côté. C'est ce que demande la demande, et c'est ce que fait une
partition.

## 8. Plan de production

Trois vagues. Une famille n'est cochée que lorsque ses **neuf** exercices sont
écrits, vérifiés par le harnais du § 9, et joués dans le mode Exercices.

### Vague 0 — les fondations du format (avant tout contenu)

Aucune de ces trois n'est un exercice, et les trois bloquent des exercices.

- [ ] **M1** — degrés altérés dans `generate-exercise.js` + `catalog.js`.
- [ ] **M2** — `patternByHand` pour les motifs différents entre les mains.
- [ ] **M3 + D1 + D2 + D3** — harnais de cohérence des doigtés, et doigté
      toujours lisible dans le rouleau.

### Vague 1 — compléter ce qui est commencé (23 exercices)

Les cinq familles qui contiennent déjà quelque chose. On finit ce qui est
ouvert avant d'ouvrir autre chose.

- [ ] **1. Déliement** — 3/9 → 9/9 (6 à écrire)
  - [ ] Débutant : ~~Un doigt tient, les autres jouent~~ (fait) ·
        Deux doigts tiennent · Le 5 tient, la main descend
  - [ ] Intermédiaire : ~~Trois doigts tiennent, 4 et 5 travaillent~~ (fait) ·
        Marche de tenues (séquence par degré) · Le 3 tient, 1-2 et 4-5 alternent
  - [ ] Difficile : ~~Tenues et mouvement contraire~~ (fait) ·
        Deux tenues et battement du 4-5 · Une touche noire sous le 4
- [ ] **4. Gammes** — 3/9 → 9/9 (6 à écrire)
  - [ ] Débutant : Tétracorde sans passage (1-2-3-4) · Le passage du pouce seul,
        en boucle · ~~Gamme sur une octave~~ (fait)
  - [ ] Intermédiaire : ~~Gamme sur deux octaves~~ (fait) ·
        Gamme par groupes de quatre avec arrêt (Cortot) · Gamme en rythme pointé
  - [ ] Difficile : ~~Gamme en mouvement contraire~~ (fait) ·
        Gamme sur trois octaves · Gamme en doubles-croches par quatre
- [ ] **5. Arpèges** — 1/9 → 9/9 (8 à écrire)
  - [ ] Débutant : Accord brisé sur place (Do-Mi-Sol-Mi) ·
        ~~Arpège de Do majeur~~ (fait) · Arpège de Fa et de Sol
  - [ ] Intermédiaire : Arpège sur deux octaves · Premier renversement ·
        Septième de dominante
  - [ ] Difficile : Arpège sur trois octaves · Les trois renversements
        enchaînés · Arpèges en mouvement contraire
- [ ] **6. Accords** — 1/9 → 9/9 (8 à écrire) — *dépend de M1*
  - [ ] Débutant : Accord répété, attaque nette · Majeur et mineur (M1) ·
        ~~Do – Fa – Sol – Do~~ (fait)
  - [ ] Intermédiaire : Renversements de Do majeur · Cadence I–IV–V–I avec
        renversements (le vrai doigté pianistique) · Accords de septième
  - [ ] Difficile : La cadence dans trois tonalités · Accords piqués, poignet ·
        Brisé puis plaqué
- [ ] **2. Égalité** — 0/9 → 9/9 (9 à écrire) — *deux dépendent de M2*
  - [ ] Débutant : Cinq doigts, accent sur le premier temps · Accent sur le
        deuxième · Quatre notes sans accent (l'oreille seule juge)
  - [ ] Intermédiaire : Accent tous les trois (le décalage sur une mesure à 4) ·
        Cinq notes dans un temps · Séquence montante, son égal
  - [ ] Difficile : Accent tous les cinq · Sept notes dans un temps ·
        Égalité aux deux mains en contraire (M2)

### Vague 2 — les familles vides mais déclarées (18 exercices)

- [ ] **3. Notes répétées** — 0/9
  - [ ] Débutant : 3-2-1 sur la même note · 4-3-2-1 sur la même note ·
        Deux notes alternées, doigts fixes
  - [ ] Intermédiaire : 3-2-1 en montant la gamme · Répétées et changement de
        position · Accord répété, même main
  - [ ] Difficile : 4-3-2-1 en doubles-croches · Répétée sous une mélodie
        tenue · Répétées alternées entre les mains
- [ ] **11. Coordination des mains** — 0/9 — *les neuf dépendent de M2*
  - [ ] Débutant : Une main tient, l'autre joue · Alternance mesure par mesure ·
        Mains en miroir exact
  - [ ] Intermédiaire : Deux contre un (croches contre noires) · Accents
        décalés entre les mains · Canon à un temps
  - [ ] Difficile : Trois contre deux · Legato d'une main, staccato de
        l'autre · Deux rythmes en mouvement contraire

### Vague 3 — les quatre familles nouvelles (36 exercices)

- [ ] **7. Doubles notes** — 0/9 — *le niveau Difficile dépend de M1*
  - [ ] Débutant : Tierces sur cinq notes · Sixtes sur cinq notes ·
        Tierces et sixtes alternées
  - [ ] Intermédiaire : Gamme en tierces sur une octave · Gamme en sixtes ·
        Tierces legato 1-3 / 2-4
  - [ ] Difficile : Tierces sur deux octaves · Tierces chromatiques (M1) ·
        Doubles notes aux deux mains
- [ ] **8. Octaves** — 0/9 — *le niveau Difficile dépend de M1*
  - [ ] Débutant : Sixte puis septième, poignet souple · L'octave posée, tenue ·
        Octaves alternées entre les mains
  - [ ] Intermédiaire : Octaves sur cinq notes · Octaves piquées ·
        Octave et sixte alternées
  - [ ] Difficile : Octaves chromatiques, doigté 5-4 sur les noires (M1) ·
        Octaves brisées · Octaves aux deux mains en contraire
- [ ] **9. Trilles et ornements** — 0/9 — *le niveau Difficile dépend de M1*
  - [ ] Débutant : Battement 2-3 · Battement 3-4 · Battement 1-2
  - [ ] Intermédiaire : Trille mesuré en quatre notes · Mordant et note
        piquée · Trille avec le 5 qui tient
  - [ ] Difficile : Trille 4-5 en doubles-croches · Trille chromatique (M1) ·
        Gruppetto enchaîné dans une gamme
- [ ] **10. Extension et substitution** — 0/9
  - [ ] Débutant : Écart de sixte 1-5 · Passer le 2 par-dessus le 1 ·
        Ouvrir 1-2-3-4-5 sur une sixte
  - [ ] Intermédiaire : Substitution 5 → 4 sur une note tenue ·
        Écart de septième · Le 3 par-dessus le pouce
  - [ ] Difficile : Écart d'octave 1-5 avec tenues · Substitution en chaîne
        5-4-3 · Extension en mouvement contraire

### Après les trois vagues

- [ ] Cocher **« Ajouter le choix de difficulté »** dans la checklist de
      [03](03-technique-doigts.md#checklist-résumée) : le sélecteur existe
      déjà, mais son commentaire dit encore *« le catalogue ne contient que des
      exercices Débutant »*, ce qui n'est plus vrai depuis le 29/07/2026 et le
      sera encore moins ici.
- [ ] Mettre à jour le tableau des familles du [§ 4 de 03](03-technique-doigts.md#4-familles-dexercices),
      qui annonce encore six familles dont trois hors MVP.
- [ ] Vérifier que le [Programme d'entraînement](04-programme-entrainement.md)
      fait bien tourner les familles : son créneau technique choisit
      « le moins vu récemment », et il aura onze familles à faire tourner au
      lieu de quatre.

## 9. Vérification — ce qu'un harnais doit refuser

Quatre-vingt-dix-neuf exercices ne se relisent pas à l'œil. Comme
`tools/generer-exercice.js` refuse d'écrire un fichier MIDI qui ne tient pas
son niveau, un harnais doit refuser un exercice mal formé. Ce qui se **compte**
dans une définition, donc ce qui se vérifie :

- [ ] `fingering[main]` a exactement autant d'entrées que `pattern` a de pas ;
- [ ] un pas-accord a autant de doigts que de degrés ;
- [ ] tous les doigts sont des entiers de 1 à 5 ;
- [ ] main gauche : dans un accord, le doigt le plus petit est sur le degré le
      plus **haut** (son pouce est en haut) ; main droite, l'inverse ;
- [ ] `isBarAligned()` est vrai — sinon la deuxième série ne tombe plus sur un
      premier temps ;
- [ ] l'ambitus de l'exercice tient dans **trois octaves** (36 demi-tons), au
      delà de quoi les touches deviennent trop étroites pour le doigté (§ 4,
      Sauts écartés) ;
- [ ] aucun pas ne dure moins de **1/8 de temps** — en dessous, le rectangle
      est plus court que son chiffre même avec D1 ;
- [ ] `supportedKeys` non vide, et `fingeringByKey` ne référence que des
      tonalités qui y figurent ;
- [ ] chaque `main` de `supportedHands` a son doigté (`supportsHand()` le dit
      déjà, mais rien ne l'exécute sur tout le catalogue) ;
- [ ] chaque famille `available` a **9** exercices, 3 par niveau — l'exigence
      E2, vérifiée mécaniquement ;
- [ ] les `id` sont uniques, et les `title` uniques **au sein d'une famille**.

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

## 10. Décisions à trancher

1. **Les tonalités.** `KEYS` déclare Do, Sol et Fa. Chaque exercice dit dans
   lesquelles son doigté a été vérifié (`supportedKeys`), et une gamme ne se
   doigte pas pareil en Fa (si♭ sous le 4) — d'où `fingeringByKey`. Question
   ouverte : les 90 nouveaux exercices s'écrivent-ils d'emblée dans les trois
   tons, ou en Do seulement, quitte à ouvrir Sol et Fa ensuite ?
   **Proposition :** en **Do seulement**, sauf pour les familles où le ton
   *est* le sujet (Gammes, Accords niveau Difficile). Écrire 90 exercices × 3
   tons, c'est 270 doigtés à vérifier un par un, et c'est le reproche fait à
   Hanon au § 3.
2. **Les mains.** Faut-il que les 99 exercices proposent les trois modes
   (droite, gauche, les deux) ? **Proposition : non.** `supportedHands` existe
   pour cela, et un exercice de coordination n'a aucun sens à une main.
3. **La famille `rhythm`.** Retirée au § 4. Si le retrait est refusé, il
   faudra lui écrire ses 9 exercices — et accepter qu'ils ne soient jamais
   jugés, contrairement à ceux de 05.
4. **Le nombre de répétitions par défaut.** Les neuf exercices actuels sont
   tous à 4. Une famille comme Trilles gagnerait à en avoir plus (le trille se
   travaille par séries longues), Accords moins. À décider exercice par
   exercice plutôt que par une règle générale.
