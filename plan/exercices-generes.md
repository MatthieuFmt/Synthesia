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
| Ambitus total | 2 octaves | 3 octaves | 4 octaves et plus |
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

- [ ] **A1 Déliage** — moyen, difficile, très difficile.
      (`deliage-01.mid`, produit le 28/07/2026, est le brouillon du niveau
      moyen : à renommer `deliage-moyen-01.mid` et à recalibrer sur le § 4)
- [ ] **B1 Gammes et passage du pouce** — les trois niveaux.
- [ ] **B2 Arpèges et accords brisés** — les trois niveaux.
- [ ] **B3 Sauts et déplacements** — les trois niveaux.

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

## 10. Décisions à trancher avant la vague 1

1. **Combien d'exercices par famille et par niveau ?** Un seul, transposable
   par paramètre, ou plusieurs fichiers figés ? Un seul suffit si la
   tonalité est un argument du générateur — mais un seul fichier dans
   `songs.json` signifie une seule tonalité disponible sans régénérer.
2. **Les exercices vont-ils dans `songs.json` au fil de l'eau** (le sélecteur
   passerait de 26 à 80 entrées) **ou dans un écran à part** ? À 57 fichiers,
   le sélecteur du mode Morceau devient difficile à parcourir sur tablette.
3. **Le générateur reste-t-il un script Node** (régénération à la main) **ou
   devient-il un module du navigateur** ? Un module permettrait de choisir
   tonalité et niveau dans l'application, sans fichier ni `songs.json` — mais
   c'est un mode de plus, donc un plan de plus.

Ces trois points changent la quantité de fichiers à produire : à trancher
avant de lancer la vague 1, pas après.
