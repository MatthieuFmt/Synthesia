# Exercices générés — couvrir tout le travail du pianiste

Ce fichier est la source de vérité du **matériel d'exercice écrit par
l'application** : ce qu'il faut couvrir, à quels niveaux, sous quelle forme,
et dans quel ordre le produire. Il ne décrit aucun mode nouveau — tout est
consommé par des fonctionnalités qui existent déjà (01, 03, 06, 09, 10).

Produit par [`tools/generer-exercice.js`](../tools/generer-exercice.js),
déposé dans [`morceaux-exercice/genere/`](../morceaux-exercice/genere/).

## 1. Pourquoi ce fichier existe

Les cinq exercices de Hanon ont été retirés le 28/07/2026 (
[historique](../morceaux-exercice/README.md#la-décision-hanon-tranchée-en-trois-temps--retrait-le-28072026)).
Le motif du retrait est la vraie règle de ce document :

> **Hanon travaille une seule chose — cinq doigts en position fixe, mains
> parallèles — et la répète en soixante variantes.** Ce n'est pas un
> programme technique, c'est un exercice décliné. Tout ce qui fait vraiment
> échouer un morceau (le pouce qui passe, les sauts, les doubles notes, les
> deux mains qui ne font pas la même chose, la pédale) n'y est pas.

Un exercice généré ne remplace Hanon que s'il travaille **une** difficulté
nommée, et que la liste des difficultés nommées couvre le métier.

## 2. Six règles pour un exercice généré

1. **Un objectif par exercice.** Si on ne peut pas dire en une phrase ce qui
   progresse, l'exercice n'existe pas.
2. **Court et bouclable** : 8 à 24 mesures, 45 s à 2 min. Le sous-mode
   Travail (06) sait boucler et monter le tempo — l'exercice n'a pas à
   contenir ses propres répétitions.
3. **Paramétré, pas écrit à la main.** Tonalité, tempo, octaves, niveau sont
   des arguments. Un exercice qu'on ne peut pas transposer est un exercice
   qu'on apprendra par cœur au lieu de le travailler.
4. **Deux pistes toujours**, main droite puis main gauche, canaux 0 et 1 —
   c'est ce qui permet la séparation des mains et le travail main seule de 06.
5. **Difficulté explicite**, selon les critères du § 4 — pas « au feeling ».
6. **Progression mesurable** : un exercice est réussi quand son critère est
   atteint, et ce critère est celui que 06 utilise déjà — *deux exécutions
   propres au tempo cible, sur deux jours distincts*.

## 3. Deux routes de livraison, et comment choisir

L'application a déjà deux façons de faire pratiquer un exercice. Elles ne
sont pas interchangeables.

| | Route **fichier** | Route **catalogue** |
| --- | --- | --- |
| Forme | `.mid` dans `morceaux-exercice/genere/` | entrée de données dans [`src/exercises/catalog.js`](../src/exercises/catalog.js) |
| Joué par | mode Morceau + Travail (06) | mode Exercices (03) |
| Apporte | passages, boucle, attente de la bonne note, montée de tempo, main seule | **doigté affiché**, métronome, décompte, répétitions, validation MIDI, bilan par pas |
| N'a pas | le doigté — *le format MIDI ne le transporte pas* | la boucle libre, les passages, le rouleau large |
| Coût | régénérer un fichier | quelques lignes de données, aucun rendu à écrire |

**Règle de choix** : si le **doigté** est l'enjeu principal (déliage, gammes,
arpèges, notes répétées, passage du pouce), c'est la route catalogue. Si
l'enjeu est de **tenir un texte musical dans la durée** (indépendance des
mains, polyphonie, sauts, pédale, déchiffrage), c'est la route fichier.
Quelques familles méritent les deux — elles sont marquées « les deux » au § 5,
et la version catalogue vient alors en premier.

Effet de bord utile : produire des entrées de catalogue à trois niveaux
débloque la case encore ouverte de 03 dans
[plan/README](README.md#feature-03--exercices-techniques-et-agilité-des-doigts)
— « la difficulté attend un premier exercice Intermédiaire ».

## 4. Les trois niveaux, en critères vérifiables

Un exercice n'est pas « difficile » parce qu'il est rapide. Sept axes, tous
lisibles dans le fichier produit :

| Axe | Moyen | Difficile | Très difficile |
| --- | --- | --- | --- |
| Débit (notes/seconde, main la plus chargée) | ≤ 6 | ≤ 9 | ≤ 12 |
| Ambitus **d'une main** | 2 octaves | 3 octaves | 4 octaves et plus |
| Écart maximal dans une main | quinte (position fixe) | octave | dixième, ou déplacement à l'aveugle |
| Tonalités | 0 à 1 altération | jusqu'à 4 altérations, mineures comprises | les 12, harmonique **et** mélodique |
| Rapport des mains | parallèles à l'octave | contraires, ou décalées | rythmes différents (3:2, 4:3) |
| Voix par main | 1, plus une note tenue | 2 voix réelles | 3 voix, avec une voix à faire ressortir |
| Sauts | aucun au-delà de la tierce | sixte à l'octave | plus d'une octave, sans regarder |

Un exercice porte le niveau de l'axe **le plus haut** qu'il sollicite : un
motif lent en 3 contre 4 est « très difficile », même à 60 à la noire.

Tempo cible par niveau, à titre de repère (le fichier est écrit **au tempo
cible** ; c'est 06 qui ralentit) : moyen 80, difficile 100, très difficile 120
à la noire.

## 5. Le catalogue des familles

Dix-neuf familles en six catégories. C'est la liste qui prétend « couvrir
tout type de travail » — si un défaut de jeu n'entre dans aucune ligne, c'est
la liste qu'il faut corriger.

### A. Mécanique de la main

| Famille | Ce qu'elle travaille | Moyen | Difficile | Très difficile | Route |
| --- | --- | --- | --- | --- | --- |
| **A1 Déliage et indépendance** | chaque doigt part et revient ; un doigt tient pendant que les autres jouent | position fixe de 5 doigts, une note tenue par mesure, mouvement contraire simple | deux notes tenues, motifs isolant 4-5, position glissée à chaque mesure | tenues + contraire, 3-4-5 seuls, touches noires sous les doigts faibles | les deux |
| **A2 Égalité et régularité** | jouer sans bosse ni trou — c'est la régularité, pas la vitesse | motif répété en croches, une octave | doubles sur deux octaves, accent déplacé sur la 2ᵉ puis la 3ᵉ note | groupes de 5 et 7 notes contre une pulsation binaire | catalogue |
| **A3 Notes répétées, changement de doigt** | rejouer une note sans raidir le poignet : 3-2-1 | croches 3-2-1 sur une note, puis sur un accord brisé | doubles 4-3-2-1, les deux mains alternées | tempo rapide sur accord plaqué, mains croisées sur la même note | catalogue |
| **A4 Trilles et ornements** | vitesse locale de deux doigts voisins, y compris les faibles | trille mesuré en doubles, doigts 2-3, deux temps | 3-4 puis 4-5, quatre temps, l'autre main joue une mélodie | trille **et** note tenue dans la même main ; trille sur touches noires | fichier |

### B. Géographie du clavier

| Famille | Ce qu'elle travaille | Moyen | Difficile | Très difficile | Route |
| --- | --- | --- | --- | --- | --- |
| **B1 Gammes et passage du pouce** | le trou sonore au passage du pouce, la seule vraie difficulté de la gamme | do, sol, fa majeur, 2 octaves, parallèle | jusqu'à 4 altérations, mineures harmonique et mélodique, 3 octaves, mouvement contraire | 4 octaves, les 12 tonalités, gammes à la tierce et à la sixte entre les mains, chromatique en doubles | les deux |
| **B2 Arpèges et accords brisés** | la main qui s'ouvre et se déplace en même temps | triades à l'état fondamental, 2 octaves | renversements, septième de dominante, 3 octaves, contraire | septième diminuée, 4 octaves, arpèges brisés dépassant l'octave | les deux |
| **B3 Sauts et déplacements** | viser sans regarder ; le geste part **avant** le temps | basse-accord main gauche, saut d'une octave | saut de deux octaves, à contretemps, mélodie à la main droite | trois octaves dans les deux mains, croisement de mains | fichier |
| **B4 Extensions et écarts** | tenir large sans crisper | sixtes en position ouverte, septièmes brisées | octave tenue pendant que les doigts intérieurs jouent | dixièmes brisées, accords de quatre sons très espacés | fichier |

### C. Doubles notes et accords

| Famille | Ce qu'elle travaille | Moyen | Difficile | Très difficile | Route |
| --- | --- | --- | --- | --- | --- |
| **C1 Doubles notes** | deux voix dans une main, attaquées ensemble et *relâchées* ensemble | sixtes conjointes en croches, une main | gamme en tierces legato sur une octave (1-3 / 2-4) | tierces sur deux octaves, tierces chromatiques, doubles notes aux deux mains | fichier |
| **C2 Octaves et accords plaqués** | poignet souple, avant-bras qui porte | octaves détachées en croches, une octave d'ambitus | octaves legato (5-4 sur les touches noires), gamme d'octaves | trémolo d'octaves, accords de quatre sons répétés vite | fichier |

### D. Les deux mains ensemble

| Famille | Ce qu'elle travaille | Moyen | Difficile | Très difficile | Route |
| --- | --- | --- | --- | --- | --- |
| **D1 Indépendance rythmique** | deux pulsations dans une seule tête | croches contre noires, contretemps simples | 3 contre 2 | 4 contre 3, puis triolets d'une main contre doubles de l'autre | fichier |
| **D2 Indépendance d'articulation et de nuance** | une main legato *piano*, l'autre staccato *forte*, puis l'inverse | legato / staccato, même nuance | nuances opposées, échangées en cours d'exercice | crescendo d'une main pendant que l'autre décroît, accents décalés | fichier |
| **D3 Canon et imitation** | entendre deux lignes, pas un bloc | même motif décalé d'une mesure | décalé d'un temps | imitation en mouvement contraire, décalée d'un temps | fichier |

### E. La musique dans l'exercice

| Famille | Ce qu'elle travaille | Moyen | Difficile | Très difficile | Route |
| --- | --- | --- | --- | --- | --- |
| **E1 Rythme et syncopes** | ce que 05 fait battre, joué sur le clavier | pointé-double, syncope simple | triolets contre binaire, liaisons par-dessus la barre | 6/8 et 7/8, changements de mesure en cours | fichier |
| **E2 Polyphonie dans une main** | tenir une voix pendant qu'une autre bouge | mélodie + note pédale tenue dans la même main | deux voix réelles par main, façon petite invention | trois voix, une voix à faire ressortir | fichier |
| **E3 Nuances et toucher** | écrit en vélocité — l'exercice *sonne* au lieu d'être plat | crescendo et decrescendo sur quatre mesures | accents déplacés, contrastes en terrasse | mélodie *forte* et accompagnement *piano* dans la **même** main | fichier |
| **E4 Pédale (CC 64)** | le pied qui suit l'harmonie, pas les doigts | pédale directe, un changement par mesure | pédale syncopée, un changement par temps | changements sur harmonie chromatique, tenues longues à nettoyer | fichier |

### F. Lecture et endurance

| Famille | Ce qu'elle travaille | Moyen | Difficile | Très difficile | Route |
| --- | --- | --- | --- | --- | --- |
| **F1 Déchiffrage** | jouer juste **du premier coup** un texte jamais vu | do majeur, deux mains, valeurs simples, une octave par main | deux altérations, changements de position, doubles | quatre altérations, changements de clé, empilements | fichier |
| **F2 Endurance** | tenir la qualité sur la durée, là où tout se dégrade | 3 min à débit constant | 5 min, avec un passage difficile au milieu | 5 min sans repos de main, nuances tenues jusqu'au bout | fichier |

## 6. Conventions de production

**Nommage** : `<famille>-<niveau>-<nn>.mid`, niveau parmi `moyen`,
`difficile`, `tres-difficile`. Exemples : `gammes-difficile-01.mid`,
`polyrythmie-tres-difficile-02.mid`. Pas d'espace, pas d'accent — le chemin
finit dans `songs.json`, où les espaces doivent être encodés.

**Titre dans `songs.json`** : `Exercice — <famille lisible> (<niveau>)`, pour
que les exercices se groupent dans le sélecteur.

**Format** : SMF format 1, 480 ticks/noire, trois pistes (réglages, main
droite canal 0, main gauche canal 1), tempo et chiffrage écrits dans la piste
de réglages. Ambitus contenu entre MIDI 28 et 96 — au-delà, c'est illisible
sur le rouleau d'une tablette.

**Pas de marqueurs de section** tant que 06 ne sait pas les lire. C'est la
leçon de `nearestBeat()` ([05 § 11](05-entrainement-rythmique.md#metronomejs-na-eu-besoin-daucune-extension)) :
une donnée écrite d'avance « au cas où » n'est jamais celle dont le
consommateur a besoin.

**Fiche obligatoire** de chaque exercice, tenue dans ce fichier au § 9 :
identifiant, famille, niveau, tonalité, tempo cible, nombre de mesures,
objectif en une phrase, critère de réussite.

## 7. Ce que l'application sait juger — et ce qu'elle ne sait pas

Utile avant d'écrire une famille : inutile de soigner ce que rien ne mesure.

| Écrit dans le fichier | Entendu à la lecture | Jugé quand l'utilisateur joue |
| --- | --- | --- |
| Hauteurs et instants | oui | **oui** — c'est le cœur de 06 et 03 |
| Durées (legato / staccato) | oui | **non** : le verdict porte sur les attaques, pas sur les relâchements |
| Vélocité (nuances) | oui | **non** : F2 normalise bien la vélocité reçue, aucun mode ne s'en sert pour juger |
| CC 64 (pédale) | oui | **oui**, via 09 — tout-ou-rien, seuil à mi-course |
| Doigté | **non** — le format MIDI ne le porte pas | seulement par la route catalogue (03) |

Trois choses restent hors de portée quel que soit le fichier : le poids du
bras et la hauteur du poignet, la demi-pédale (le CC 64 est ramené à
tout-ou-rien dans `midi-input.js`), et la qualité réelle du legato. Les
familles C1, C2, D2 et E3 s'écrivent donc *pour l'oreille et pour le modèle
joué par l'application*, pas pour un score. C'est une raison de plus de les
livrer en fichier : le mode Morceau les fait entendre, ce qui suffit à les
travailler.

## 8. Ce que ça débloque ailleurs

- **09 — famille Application** : aucun des 26 fichiers du dépôt ne contient
  de CC 64 ([constat](../morceaux-exercice/README.md#limite-importante-pour-la-feature-09-pédale)).
  La famille **E4** produit les premiers fichiers pédalés du projet, ce qui
  lève le blocage sans rien changer au code de 09.
- **03 — choix de difficulté** : les entrées de catalogue à trois niveaux
  donnent enfin plus d'une valeur au sélecteur.
- **04 — Programme d'entraînement** : le créneau échauffement a de quoi
  tourner sans répéter le même exercice trois jours de suite, ce qui est
  exactement ce que la rotation « le moins vu récemment » cherche à faire.
- **10 et 08 — lecture** : la famille **F1** fournit du texte jamais vu, seule
  matière qui manque au déchiffrage.

## 9. Plan de production

Trois vagues, du plus utile au plus spécialisé. Rien n'est coché avant
d'avoir été produit **et** joué dans l'application.

### Vague 1 — le socle (12 fichiers, 4 familles × 3 niveaux)

- [x] **A1 Déliage** — moyen, difficile, très difficile. **Fait le
      28/07/2026** : trois fichiers écrits, vérifiés contre le § 4 par le
      générateur lui-même, et chargés dans le mode Morceau. Fiches ci-dessous.
      Le brouillon `deliage-01.mid` a été supprimé : il glissait sa position
      dès la première mesure, ce qui est le niveau *difficile*, pas *moyen*.
- [x] **B1 Gammes et passage du pouce** — les trois niveaux. **Fait le
      28/07/2026** : trois fichiers, vérifiés et chargés dans le mode Morceau.
      Fiches ci-dessous. Reste sa version catalogue, avec le doigté — c'est
      elle que le § 3 réclame en premier pour une famille « les deux ».
- [x] **B2 Arpèges et accords brisés** — les trois niveaux. **Fait le
      28/07/2026** : trois fichiers, vérifiés et chargés dans le mode Morceau.
      Fiches ci-dessous. Reste sa version catalogue, comme pour B1.
- [x] **B3 Sauts et déplacements** — les trois niveaux. **Fait le 28/07/2026** :
      trois fichiers, vérifiés et chargés dans le mode Morceau. Fiches
      ci-dessous. Route fichier seulement, comme sa ligne l'indique.

**La vague 1 est complète** : quatre familles, douze fichiers, tous produits
par `tools/generer-exercice.js` et refusés d'office s'ils ne tiennent pas
leur niveau.

### Vague 2 — ce qui manque le plus à un autodidacte (12 fichiers)

- [ ] **C1 Doubles notes** — les trois niveaux.
- [ ] **C2 Octaves et accords plaqués** — les trois niveaux.
- [ ] **D1 Indépendance rythmique** — les trois niveaux.
- [ ] **E4 Pédale (CC 64)** — les trois niveaux ; débloque la famille
      Application de 09.

### Vague 3 — le reste du catalogue (33 fichiers)

- [ ] A2, A3, A4 · B4 · D2, D3 · E1, E2, E3 · F1, F2 — trois niveaux chacune.

### Route catalogue (03), en parallèle

- [ ] A1, A2, A3 et B1, B2 en entrées de `exercises/catalog.js`, avec doigté
      et niveau — puis activer le sélecteur de difficulté de 03.

### Fiches des exercices produits

Fiche obligatoire du § 6. Les quatre mesures citées sont celles que le
générateur imprime à chaque production ; elles se relisent avec
`node tools/generer-exercice.js a1-deliage`.

#### `deliage-moyen-01.mid`

| | |
| --- | --- |
| Famille · niveau | A1 Déliage et indépendance · **moyen** |
| Tonalité · tempo | do majeur · 80 à la noire |
| Forme | 17 mesures, 51 s, 406 notes |
| Objectif | Chaque doigt part et revient dans une position de cinq doigts qui ne bouge jamais, une note tenue par mesure. |
| Structure | A (4 mes.) motif 1-3-2-4-3-5-4-2 en doubles, mains parallèles à l'octave · B (8 mes.) une note tenue par mesure, le pouce puis le cinquième · C (4 mes.) mouvement contraire, positions toujours fixes |
| Mesuré | débit 6/s · ambitus d'une main 12 · écart 7 · saut 4 |
| Critère | Deux exécutions propres au tempo cible, sur deux jours distincts. |

Il touche trois de ses quatre plafonds exactement — débit, écart et saut :
c'est le plus haut niveau *moyen* possible sur ces axes, pas un exercice
tiède. Son ambitus reste petit, la position ne bougeant jamais.

#### `deliage-difficile-01.mid`

| | |
| --- | --- |
| Famille · niveau | A1 Déliage et indépendance · **difficile** |
| Tonalité · tempo | ré majeur (2 dièses) · 100 à la noire |
| Forme | 21 mesures, 50 s, 686 notes |
| Objectif | Deux notes tenues et des motifs isolant 4-5, sur une position qui glisse d'un degré à chaque mesure. |
| Structure | A (6 mes.) motif 4-5-4-5-3-5-4-5, mains **décalées d'un temps** · B (8 mes.) **deux** notes tenues, deux voix réelles par main · C (6 mes.) contraire, le pouce tenant pendant que les doigts jouent à l'**octave** |
| Mesuré | débit 7/s · ambitus d'une main 16 · écart 12 · saut 12 |
| Critère | Deux exécutions propres au tempo cible, sur deux jours distincts. |

#### `deliage-tres-difficile-01.mid`

| | |
| --- | --- |
| Famille · niveau | A1 Déliage et indépendance · **très difficile** |
| Tonalité · tempo | si majeur (5 dièses) · 120 à la noire |
| Forme | 23 mesures, 46 s, 658 notes |
| Objectif | Les seuls 3-4-5 sur touches noires, avec tenues, mouvement contraire et une section en trois contre deux. |
| Structure | A (7 mes.) 3-4-5 seuls sur fa♯-sol♯-la♯, pouce tenu · B (8 mes.) **trois contre deux** — la droite trois notes par temps, la gauche deux, chacune avec sa tenue · C (7 mes.) tenues **et** contraire, position glissée |
| Mesuré | débit 8/s · ambitus d'une main 19 · écart 11 · saut 12 |
| Critère | Deux exécutions propres au tempo cible, sur deux jours distincts. |

Une précision honnête sur son niveau : il ne touche aucun plafond du § 4, et
son écart maximal reste une septième, pas la dixième annoncée. Il est très
difficile par les axes que **la ligne A1 du § 5 nomme** — 3-4-5 seuls, touches
noires sous les doigts faibles, tenues plus contraire — et par le rapport des
mains, où le trois-contre-deux relève du niveau le plus haut. C'est
exactement la règle du § 4 : « un exercice porte le niveau de l'axe le plus
haut qu'il sollicite ». Les plafonds sont des plafonds, pas des objectifs.

#### `gammes-moyen-01.mid`

| | |
| --- | --- |
| Famille · niveau | B1 Gammes et passage du pouce · **moyen** |
| Tonalité · tempo | do majeur · 80 à la noire |
| Forme | 16 mesures, 48 s, 282 notes |
| Objectif | Entendre le trou du passage du pouce : la gamme lentement, le passage seul en boucle, puis la gamme deux fois plus vite. |
| Structure | A (4 mes.) gamme deux octaves en croches, mains à l'octave · B (6 mes.) la cellule du passage seule, remontée d'un degré par mesure · C (4 mes.) la même gamme en **doubles**, deux allers-retours |
| Mesuré | débit 6/s · ambitus d'une main 24 · écart 7 · saut 2 |
| Critère | Deux exécutions propres au tempo cible, sur deux jours distincts. |

Les deux octaves de la ligne B1 sont là, par main, et le débit touche son
plafond dans la section rapide — c'est elle qui rend le trou audible.

#### `gammes-difficile-01.mid`

| | |
| --- | --- |
| Famille · niveau | B1 Gammes et passage du pouce · **difficile** |
| Tonalité · tempo | la mineur · 100 à la noire |
| Forme | 19 mesures, 46 s, 248 notes |
| Objectif | Mineures harmonique et mélodique sur trois octaves, puis mouvement contraire où les deux pouces passent ensemble. |
| Structure | A (6 mes.) mineure **harmonique** trois octaves, mains à l'octave · B (6 mes.) mineure **mélodique** — fa♯ sol♯ en montant, sol fa naturels en descendant · C (4 mes.) mouvement **contraire** sur deux octaves |
| Mesuré | débit 4/s · ambitus d'une main 36 · écart 7 · saut 3 |
| Critère | Deux exécutions propres au tempo cible, sur deux jours distincts. |

Son débit est loin du plafond, et c'est voulu : ce niveau se joue sur les
trois octaves, les deux formes de la mineure et le contraire, pas sur la
vitesse — « un exercice n'est pas difficile parce qu'il est rapide » (§ 4).

#### `gammes-tres-difficile-01.mid`

| | |
| --- | --- |
| Famille · niveau | B1 Gammes et passage du pouce · **très difficile** |
| Tonalité · tempo | do majeur · 120 à la noire |
| Forme | 23 mesures, 46 s, 384 notes |
| Objectif | Chromatique en doubles sur quatre octaves, puis les deux mains à la tierce et à la sixte. |
| Structure | A (7 mes.) **chromatique** quatre octaves en doubles · B (6 mes.) gamme trois octaves, mains **à la tierce** · C (6 mes.) mains **à la sixte** |
| Mesuré | débit 8/s · ambitus d'une main 57 · écart 7 · saut 2 |
| Critère | Deux exécutions propres au tempo cible, sur deux jours distincts. |

L'ambitus de 57 demi-tons n'est pas une course de 57 demi-tons : c'est la
réunion de la chromatique (48, les quatre octaves demandées) et des gammes en
tierces, qui vivent plus haut. Aucune section ne dépasse ce que la ligne B1
annonce.

#### `arpeges-moyen-01.mid`

| | |
| --- | --- |
| Famille · niveau | B2 Arpèges et accords brisés · **moyen** |
| Tonalité · tempo | do majeur · 80 à la noire |
| Forme | 16 mesures, 48 s, 238 notes |
| Objectif | Ouvrir la main sur la forme de l'accord et la garder ouverte en se déplaçant : triade sur deux octaves, puis ses trois positions sur place. |
| Structure | A (4 mes.) arpège deux octaves en croches, deux allers-retours, mains à l'octave · B (4 mes.) les trois positions **sur place**, chaque mesure partant où la précédente s'arrête · C (4 mes.) le même arpège en **doubles** |
| Mesuré | débit 6/s · ambitus d'une main 24 · écart 7 · saut 5 |
| Tolérance | saut porté de 4 à 5 — *la quarte quinte-octave est intrinsèque à l'arpège de triade* |
| Critère | Deux exécutions propres au tempo cible, sur deux jours distincts. |

#### `arpeges-difficile-01.mid`

| | |
| --- | --- |
| Famille · niveau | B2 Arpèges et accords brisés · **difficile** |
| Tonalité · tempo | ré majeur · 100 à la noire |
| Forme | 19 mesures, 46 s, 240 notes |
| Objectif | Trois octaves, septième de dominante et mouvement contraire : la main s'ouvre en sens opposé de l'autre. |
| Structure | A (5 mes.) triade sur **trois octaves** · B (5 mes.) **septième de dominante** — quatre sons, écarts plus serrés, un doigt de plus à placer · C (6 mes.) **contraire**, les deux mains partant de ré4 et divergeant |
| Mesuré | débit 4/s · ambitus d'une main 36 · écart 7 · saut 5 |
| Critère | Deux exécutions propres au tempo cible, sur deux jours distincts. |

La quarte de l'arpège n'a besoin d'aucune tolérance ici : le plafond de saut
du niveau difficile est l'octave.

#### `arpeges-tres-difficile-01.mid`

| | |
| --- | --- |
| Famille · niveau | B2 Arpèges et accords brisés · **très difficile** |
| Tonalité · tempo | do majeur · 120 à la noire |
| Forme | 23 mesures, 46 s, 482 notes |
| Objectif | Septième diminuée sur quatre octaves, puis des brisés qui dépassent l'octave — la main ne s'ouvre plus, le bras se lance. |
| Structure | A (7 mes.) **septième diminuée** si-ré-fa-sol♯ sur quatre octaves en doubles — quatre tierces mineures égales, une seule forme de main · B (6 mes.) **brisés dépassant l'octave** : fondamentale, dixième, quinte, octave · C (6 mes.) la diminuée en **contraire** |
| Mesuré | débit 8/s · ambitus d'une main 48 · écart 7 · saut 16 |
| Critère | Deux exécutions propres au tempo cible, sur deux jours distincts. |

C'est le premier exercice du dossier à atteindre exactement les quatre
octaves de la ligne B2, et son saut de 16 demi-tons est la dixième que le
§ 5 réclame — « arpèges brisés dépassant l'octave ».

#### `sauts-moyen-01.mid`

| | |
| --- | --- |
| Famille · niveau | B3 Sauts et déplacements · **moyen** |
| Tonalité · tempo | do majeur · 80 à la noire |
| Forme | 16 mesures, 48 s, 192 notes |
| Objectif | Viser une octave plus bas sans regarder : basse-accord à la main gauche, d'abord sur une harmonie connue puis sur une cible qui bouge. |
| Structure | A (8 mes.) basse-accord sur I-IV-V-I, la basse toujours une **octave** sous le bas de son accord · B (6 mes.) la **cible bouge** : la basse monte degré par degré, l'accord la suit — on ne peut plus viser de mémoire |
| Mesuré | débit 3/s · ambitus d'une main 23 · écart 7 · saut 12 |
| Tolérance | saut porté de 4 à 12 — *le saut d'une octave est l'objet même de la famille* |
| Critère | Deux exécutions propres au tempo cible, sur deux jours distincts. |

#### `sauts-difficile-01.mid`

| | |
| --- | --- |
| Famille · niveau | B3 Sauts et déplacements · **difficile** |
| Tonalité · tempo | do majeur · 100 à la noire |
| Forme | 19 mesures, 46 s, 296 notes |
| Objectif | Deux octaves, et la basse à contretemps : le geste doit partir pendant que l'accord sonne encore. |
| Structure | A (8 mes.) basse-accord à **deux octaves**, l'accord sur le temps et la basse **à contretemps**, mélodie à la main droite · B (8 mes.) cible mobile, toujours à deux octaves |
| Mesuré | débit 4/s · ambitus d'une main 36 · écart 9 · saut 24 |
| Tolérance | saut porté de 12 à 28 — *le saut de deux octaves est l'objet même de la famille* |
| Critère | Deux exécutions propres au tempo cible, sur deux jours distincts. |

Inverser l'ordre habituel — l'accord sur le temps, la basse après — est ce qui
force l'anticipation : le bras doit être en route pendant que l'accord sonne.

#### `sauts-tres-difficile-01.mid`

| | |
| --- | --- |
| Famille · niveau | B3 Sauts et déplacements · **très difficile** |
| Tonalité · tempo | do majeur · 120 à la noire |
| Forme | 23 mesures, 46 s, 212 notes |
| Objectif | Trois octaves aux deux mains en sens opposé, puis croisement : la gauche passe au-dessus de la droite. |
| Structure | A (10 mes.) **trois octaves aux deux mains**, en sens opposé — la gauche do2↔do5, la droite do6↔do3 · B (10 mes.) **croisement** : la droite tient un accord au médium, la gauche passe par-dessus jouer trois octaves au-dessus de sa basse |
| Mesuré | débit 4/s · ambitus d'une main 53 · écart 7 · saut 36 |
| Tolérance | saut porté de 24 à 36 — *les trois octaves et le croisement sont l'objet même de la famille* |
| Critère | Deux exécutions propres au tempo cible, sur deux jours distincts. |

Le croisement est vérifié, pas seulement écrit : dix notes de la main gauche
sonnent réellement **au-dessus** de l'accord que la droite tient. Il reste
assez bref pour que la gauche garde la hauteur moyenne la plus basse — sans
quoi la séparation des mains du mode Morceau les intervertirait.

## 10. Décisions tranchées avant la vague 1 — 28/07/2026

1. ~~**Combien d'exercices par famille et par niveau ?**~~ **Un seul**,
   `<famille>-<niveau>-01.mid`, la tonalité étant une donnée du générateur
   (`TONALITES`). Le suffixe `-01` reste dans le nom pour qu'un second fichier
   ne demande aucun renommage le jour où une deuxième tonalité sera utile.
   Produire d'emblée trois tonalités par niveau ferait 171 fichiers pour une
   difficulté identique — c'est exactement le reproche fait à Hanon au § 1.
2. ~~**`songs.json` au fil de l'eau ou écran à part ?**~~ **Au fil de l'eau**,
   avec le titre `Exercice — <famille> (<niveau>)` du § 6 : le préfixe commun
   les regroupe dans le sélecteur, qui reste trié. À revoir **à l'ouverture de
   la vague 3**, où le catalogue dépasserait la soixantaine d'entrées : c'est
   là que le sélecteur devient pénible sur tablette, pas à 33.
3. ~~**Script Node ou module du navigateur ?**~~ **Script Node.** Un module
   embarqué serait un mode de plus — donc un plan de plus, et une boucle de
   génération dans l'application qui ne sert qu'une fois par exercice. La
   régénération à la main est le bon coût pour une donnée qui ne change
   jamais après sa validation.

### Une quatrième décision, apparue en produisant

**Le générateur refuse d'écrire un fichier qui ne tient pas son niveau.**
`verifier()` mesure les quatre axes du § 4 qui se comptent — débit, ambitus,
écart dans une main, saut mélodique — et compare aux plafonds du niveau
déclaré ; il vérifie aussi la durée du § 2 et les bornes MIDI du § 6. Un
dépassement affiche la mesure fautive et **rien n'est écrit**.

C'est ce qui rend applicable la règle 5 du § 2 (« difficulté explicite, pas au
feeling »). Les trois exercices de A1 ont d'ailleurs tous été refusés au
premier jet, pour des raisons qu'aucune relecture n'aurait attrapées : une
main gauche qui sautait de cinq demi-tons au changement de section, des doigts
montant à la neuvième là où l'octave était le plafond, une durée de 42 s sous
le minimum de 45.

Le débit compte les **attaques**, pas les notes : un accord de trois sons est
un seul geste et ne fait pas jouer la main trois fois plus vite. La première
version comptait les notes et refusait un exercice à cause de son accord
final.

### Deux corrections du § 4, imposées par les gammes (28/07/2026)

La famille B1 a mis au jour deux endroits où le § 4, écrit en pensant à des
exercices de position, ne survivait pas au contact d'une gamme.

**L'ambitus se mesure par main, pas sur le clavier.** Le § 4 dit « ambitus
total », mais deux mains parallèles à l'octave doublent mécaniquement ce total
sans rien ajouter à la difficulté : une gamme de deux octaves aux deux mains
couvre trois octaves de clavier. Prise au mot, la règle refusait au niveau
moyen exactement ce que la ligne B1 y demande — « 2 octaves, parallèle ». Ce
que **la main** doit parcourir est la bonne mesure ; le total reste affiché,
et les bornes MIDI du § 6 le surveillent. Conséquence : les chiffres d'ambitus
des trois fiches A1 ont été recalculés, la matière de ces exercices n'ayant
pas changé d'une note.

**Un déplacement n'est un saut que si la main n'a pas le temps de viser.**
Deux attaques séparées d'au moins un temps ne comptent plus : c'est un
changement de position, l'affaire de la famille B3, pas un axe de difficulté
ailleurs. Sans cette règle, toute charnière entre deux sections était refusée,
et il aurait fallu écrire des exercices d'un seul tenant — ou tricher en
allongeant une note pour la faire sortir du calcul.

Ces deux corrections ne relâchent rien : les six exercices produits restent
mesurés sur quatre axes, et A1 moyen touche toujours trois de ses plafonds.

### Les tolérances déclarées, imposées par les arpèges (28/07/2026)

Troisième rencontre du même genre, et cette fois la réponse n'est pas de
corriger la mesure mais de permettre une exception nommée.

Un arpège de triade contient la quarte quinte→octave — sol-do — **par
construction**. Le niveau moyen plafonne les sauts à la tierce. Aucune
écriture ne fait disparaître cette quarte : elle est la matière même de la
famille, pas un relâchement.

Une famille peut donc déclarer une **tolérance** sur un axe : le plafond est
desserré à la valeur déclarée, et la raison est écrite dans le catalogue du
générateur. Trois garde-fous la rendent honnête plutôt que commode :

- elle est **nommée dans le code**, à côté de l'exercice qu'elle concerne ;
- elle **s'affiche à chaque production**, précédée d'un ⚠ et suivie de sa
  raison — jamais silencieuse ;
- elle est **recopiée dans la fiche** du § 9, ligne « Tolérance ».

La première fut `arpeges-moyen-01`, saut porté de 4 à 5.

### Un axe peut être le sujet d'une famille, pas sa contrainte (28/07/2026)

B3 a poussé le mécanisme plus loin, et il vaut mieux le dire que le laisser
passer : **ses trois niveaux desserrent tous le même axe**, celui des sauts,
et de beaucoup — jusqu'à trois octaves.

Ce n'est pas le signe d'un niveau mal choisi. C'est que pour cette famille,
l'axe des sauts n'est pas une difficulté annexe à contenir : **c'est ce
qu'elle enseigne**. Sa ligne du § 5 le gradue elle-même — une octave, deux,
puis trois avec croisement de mains — et ce sont ces valeurs-là qui font
autorité, pas la colonne générique du § 4.

La règle générale se formule donc ainsi : *le tableau du § 4 plafonne les
axes qu'une famille subit ; l'axe qu'une famille travaille est gradué par sa
propre ligne du § 5.* Une famille n'a le droit de desserrer que l'axe nommé
dans sa colonne « ce qu'elle travaille » — B3 ne pourrait pas desserrer son
débit, et A1 ne pourrait pas desserrer ses sauts.

Deux autres familles à venir tomberont dans le même cas : **B4 Extensions et
écarts** desserrera l'écart dans une main, et **A2 Égalité** le débit.

### Une troisième correction de mesure : l'accord est une position

Toujours avec B3. Le calcul du saut comparait la note **la plus haute** d'un
accord à la cible suivante, alors que la main quitte l'accord par celle de
ses notes qui est la plus proche. Une basse-accord se voyait donc créditer un
saut d'un tiers plus large que le geste réel.

Le vérificateur groupe désormais les attaques par instant et mesure la
distance **minimale** entre deux groupes successifs. Les onze exercices déjà
produits repassent sans changer d'une note : aucun d'eux n'enchaîne un accord
et un saut à moins d'un temps.
