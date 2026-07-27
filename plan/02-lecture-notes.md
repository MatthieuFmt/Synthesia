# Feature 02 — Lecture de notes

> Statut : boucle verticale en place pour les **neuf combinaisons** de niveau
> (**Débutant**, **Intermédiaire**, **Difficile**) et de main (**Main droite**,
> **Main gauche**, **Les deux**) — réglages → note sur la portée → clic sur une
> touche → retour → dix questions → bilan, vérifié dans un navigateur (§ 9).
> L'étape D est faite pour tout ce qui relève de la progression : les résultats
> sont enregistrés, le bilan est séparé par main et les notes ratées reviennent
> plus souvent. Restent les altérations, puis ce qui appartient à 08.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir le principe pédagogique.
- [x] Définir les niveaux et les choix de main.
- [x] Définir le MVP et ses critères d'acceptation.
- [x] Ajouter la navigation vers le mode Lecture de notes.
- [x] Implémenter le moteur d'exercice.
  (tirage, validation, pondération des erreurs, équilibrage des mains, groupes
  de notes des trois niveaux et bilan)
- [x] Implémenter l'interface.
- [x] Valider les neuf combinaisons de niveau et de main.
  (vérifiées dans le navigateur le 25/07/2026 — § 9)
- [x] Enregistrer les résultats et reprendre les notes difficiles.
  (via [F3](F3-suivi-progression.md) étape A, 25/07/2026 — § 9)

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

- choix d'un morceau dans la bibliothèque fournie ;
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

### Groupes de notes retenus

Les six groupes construits le 25/07/2026, tous en touches blanches :

| Niveau | Main droite (clé de sol) | Main gauche (clé de fa) | Notes |
| --- | --- | --- | --- |
| **Débutant** | Do4 → Sol4 | Do3 → Sol3 | 5 |
| **Intermédiaire** | Do4 → Fa5 | Sol2 → Do4 | 11 |
| **Difficile** | La3 → La5 | Mi2 → Mi4 | 15 |

- **Débutant** : les mêmes cinq degrés dans les deux mains, une octave d'écart.
- **Intermédiaire** : toute la portée, plus le **Do central** — sous la portée
  en clé de sol, au-dessus en clé de fa, à chaque fois sur sa ligne
  supplémentaire. C'est le repère qui relie les deux clés, et la seule note
  commune aux deux groupes.
- **Difficile** : deux octaves, la portée débordée de deux lignes
  supplémentaires du côté du Do central et d'une seule de l'autre côté.

Les deux groupes d'un même niveau occupent, dès l'Intermédiaire, exactement les
mêmes positions sur leur portée : ce qui est appris d'une main se relit de
l'autre au même endroit.

### Clavier des grandes étendues

Le clavier ne peut plus se contenter d'une octave dès l'Intermédiaire. Trois
règles, décidées le 25/07/2026 :

1. **Groupe plus étroit qu'une octave** (Débutant) : on affiche l'octave
   Do → Do qui le contient. Les touches inutilisées servent de leurres.
2. **Groupe plus large** (Intermédiaire, Difficile) : on affiche exactement
   l'étendue du groupe — 11 puis 15 blanches. L'arrondir aux Do ajouterait
   quatre à sept touches et les amincirait pour rien ; le groupe compte déjà
   plus de dix candidats, il n'a pas besoin de leurres.
3. **Jamais de touche sous 30 px** : en dessous de 36 px par blanche, le
   clavier **défile latéralement** au lieu de rétrécir. Il démarre au milieu de
   son étendue, la même position à chaque question — elle ne renseigne donc sur
   rien —, et l'indice ramène la touche désignée dans le cadre.

En paysage, la seule orientation réellement utilisée sur la tablette, rien ne
défile : les deux octaves du niveau Difficile tiennent entières (§ 9). Le
défilement ne sert que sur un petit écran en portrait.

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

Découpage réellement en place (les extractions ont été faites au moment où
chaque fonction est devenue partagée, pas avant) :

```text
src/
  main.js                   # amorçage : contrôles communs + registre          [fait]
  navigation.js             # accueil, switchTo()                              [fait]
  music.js                  # noms, hauteurs MIDI, dièses, positions sur portée [fait]
  audio.js                  # échantillonneur piano, lecture d'une note        [fait]
  perf.js            # profil de l'appareil (audio léger, canvas bridé) [fait]
  song-mode.js              # mode Morceau                                     [fait]
  note-reading-mode.js      # rendu et interactions de cet exercice            [fait]
  note-reading-engine.js    # choix des notes, validation, bilan (sans DOM)    [fait]
  progress/store.js         # journal de progression, partagé (F3)             [fait]
  progress/review.js        # notes à revoir en priorité, partagé (F3)         [fait]
  piano.js                  # clavier partagé                        [pas nécessaire]
```

Deux écarts par rapport au découpage prévu, tous deux assumés :

- `note-reading-engine.js` ne figurait pas dans la liste. Le moteur a été
  séparé du rendu pour tenir la contrainte « testable sans navigateur » : le
  fichier de mode importe Tone.js depuis un CDN, ce qui suffirait à empêcher de
  l'importer dans Node. Les 36 vérifications du moteur tournent aujourd'hui
  hors navigateur.
- `piano.js` n'a pas été extrait. Le clavier de cet exercice est une octave de
  `<button>` du DOM — assez larges pour le doigt, activables au clavier, sans
  géométrie de colonnes ni notes qui tombent. Il n'a rien de commun avec les 88
  touches en Canvas du mode Morceau : les mutualiser aujourd'hui produirait une
  abstraction que personne ne réclame.

### Ce qui a été partagé depuis (27/07/2026)

Deux modules sont sortis de cette fonctionnalité le jour où
[07 — Entraînement de l'oreille](07-entrainement-oreille.md) en a eu besoin de
la **même** version. Aucun des deux n'a changé le comportement de 02 : ses trois
campagnes de vérification se rejouent telles quelles (154 / 154 dans Node,
200 / 200 + 110 / 110 + 50 / 50 dans le navigateur).

- **`session-engine.js`** — le déroulé d'une session : tentatives, série,
  erreurs mémorisées par cible, pondération des cibles ratées, bilan. Ce qui
  reste ici est ce qui n'appartient qu'à la lecture d'une note écrite : les six
  groupes de notes, la clé associée à chaque main, le calendrier des mains, et
  le tirage d'une note dans le groupe du moment. `note-reading-engine.js` garde
  exactement les mêmes exports qu'avant : rien d'autre dans l'application n'a eu
  à bouger.
- **`piano-dom.js`** — le clavier lui-même. Le `piano.js` universel refusé
  ci-dessus n'existe toujours pas ; ce module ne mutualise que ce qui l'était
  réellement, entre deux exercices qui affichent *le même* clavier. Le préfixe
  de classes CSS est un paramètre (`nr-` ici, `ear-` en 07), si bien que le DOM
  produit pour cette fonctionnalité est identique à celui d'avant l'extraction.

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

### Équilibrage des mains en mode Les deux

La main de chaque question est décidée **avant la première note** : la session
tire un calendrier de dix mains, cinq à droite et cinq à gauche (le reste d'une
longueur impaire va à une main au hasard). Trois règles s'y ajoutent :

- jamais plus de **deux questions consécutives** sur la même main ;
- à chaque tirage, la main est prise au hasard proportionnellement à ce qu'il
  lui reste de questions — l'ordre reste imprévisible, sans alternance
  droite-gauche qui permettrait de deviner la clé ;
- un tirage n'est retenu que s'il laisse le reste du calendrier plaçable. Sans
  cette vérification, une main épuisée trop tôt forçait la fin de session à
  s'enchaîner sur l'autre, donc à devenir prévisible.

Le poids d'une note mal reconnue est mémorisé sous `clé:hauteur`, comme les
erreurs : un Do lu en clé de fa et un Do lu en clé de sol sont deux questions
distinctes, y compris pour la pondération.

## 7. Étapes de réalisation

### Étape A — Navigation et fondations

- [x] Ajouter le choix entre les modes Morceau et Lecture de notes.
- [x] Conserver le fonctionnement actuel du mode Morceau.
- [x] Définir une petite API partagée pour jouer une note.
  (`createAudio()` dans `audio.js` : `ensureReady()`, `playNote(midi)`,
  `dispose()` — une chaîne par fonctionnalité, libérée à son `stop()`)
- [x] Extraire les fonctions musicales nécessaires sans réécriture globale.

### Étape B — Moteur d'exercice

- [x] Définir un groupe de notes par niveau et par main.
  (les six groupes sont dans `NOTE_POOLS` — voir le tableau du § 4)
- [x] Construire le groupe actif à partir des deux réglages.
- [x] Équilibrer les deux mains sur une session en mode Les deux.
- [x] Générer une question sans répétition immédiate inutile.
- [x] Valider la touche choisie.
- [x] Gérer les tentatives, la série et les erreurs par note.
- [x] Donner davantage de poids aux notes difficiles.
- [x] Produire le bilan d'une session.

### Étape C — Interface du MVP

- [x] Ajouter le choix Débutant / Intermédiaire / Difficile.
  (les trois niveaux sont sélectionnables, plus aucune mention « Bientôt »)
- [x] Ajouter le choix Main droite / Main gauche / Les deux.
- [x] Dessiner une grande portée et une note unique.
- [x] Afficher la bonne clé et, si nécessaire, la main courante.
  (clé de sol ou clé de fa selon la question ; en mode Les deux, la main
  travaillée est annoncée à côté de la progression et change avec elle)
- [x] Afficher un clavier centré sur la zone travaillée sans révéler la réponse.
  (une octave alignée sur les Do en Débutant, l'étendue exacte du groupe
  au-delà, avec défilement latéral plutôt que des touches sous 30 px — § 4 ; en
  mode Les deux, le clavier suit la main de la question)
- [x] Ajouter les retours visuels correct / incorrect.
- [x] Ajouter l'indice, la progression et la sortie.
- [x] Ajouter l'écran de fin de session.
- [ ] Vérifier l'utilisation à la souris, au clavier et au toucher.
  (souris vérifiée ; les touches sont des `<button>` focalisables, donc
  activables au clavier ; le toucher réel reste à faire sur appareil)

### Étape D — Progression

- [x] Enregistrer localement les résultats et le dernier niveau (via
  [F3 — Suivi de progression](F3-suivi-progression.md)).
  (chaque tentative est journalisée, les réglages de la dernière séance sont
  repris à l'ouverture du mode, et quitter en route s'enregistre comme un
  abandon)
- [x] Afficher un bilan séparé par main lorsque Les deux est sélectionné.
  (« du premier coup » et précision par main ; une main sans réponse
  n'affiche rien plutôt qu'un zéro trompeur)
- [x] Reprendre une session avec les notes qui posent le plus de difficultés
  (vue « révisions adaptées » de [F3](F3-suivi-progression.md)).
  (poids de 1 à 3 selon les tentatives récentes ; les notes jamais vues gardent
  le poids par défaut et ne sont donc pas défavorisées)
- [ ] Introduire les dièses et les bémols.
- [ ] Proposer plus tard une vraie double portée avec deux notes simultanées.
- [ ] Ajouter ensuite le mode chronométré avec notes défilantes.

Les trois dernières lignes sont détaillées dans
[08 — Lecture de partitions](08-lecture-partitions.md), qui poursuit cette
étape : petites mesures, valeurs rythmiques et silences, altérations, notes
simultanées puis vraie double portée. Le moteur de session, les niveaux et
les choix de main définis ici y sont réutilisés, pas redéfinis — de même que
dans [07 — Entraînement de l'oreille](07-entrainement-oreille.md), qui
reprend le même moteur avec un stimulus sonore au lieu d'une note écrite.

## 8. Critères d'acceptation du MVP

Le MVP est terminé lorsque :

- [x] l'utilisateur peut ouvrir le mode Lecture sans charger de morceau ;
- [x] l'utilisateur peut sélectionner l'un des trois niveaux ;
- [x] l'utilisateur peut sélectionner Main droite, Main gauche ou Les deux ;
- [x] chaque combinaison de niveau et de main produit le bon groupe de notes ;
      (les neuf vérifiées dans le navigateur — § 9)
- [x] Main droite affiche la clé de sol et Main gauche la clé de fa ;
- [x] le mode Les deux présente les deux clés au cours de la session avec une
      répartition équilibrée et non prévisible ;
- [x] la portée, la clé et la note sont lisibles sur ordinateur et mobile ;
- [x] seules les touches nécessaires sont assez grandes pour être sélectionnées
      sans ambiguïté ;
- [x] une bonne et une mauvaise réponse produisent des retours distincts et
      immédiats ;
- [x] une erreur conserve la question en cours ;
- [x] une session contient dix notes et se termine par un bilan ;
- [x] les notes difficiles réapparaissent pendant la session ;
- [x] quitter ou recommencer ne perturbe pas le mode Morceau ;
- [x] le mode Morceau existant ne régresse pas.

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

### Validation effectuée (25 juillet 2026)

**Moteur, hors navigateur** — 36 vérifications sur 36, exécutées dans Node en
important directement `note-reading-engine.js` :

- groupe Débutant / Main droite = Do4, Ré4, Mi4, Fa4, Sol4 ; toute autre
  combinaison est signalée comme absente au lieu de produire un exercice vide ;
- clé de sol associée à la main droite, indice disponible d'emblée en Débutant ;
- bonne réponse : compteur, série, meilleure série et « premier coup » corrects,
  et jamais deux fois la même note d'affilée ;
- mauvaise réponse : la question ne change pas, la série retombe à zéro,
  l'erreur est mémorisée sous la clé `treble:<midi>`, et la réponse juste qui
  suit n'est plus comptée comme reconnue du premier coup ;
- poids d'une note mal reconnue porté de 1 à 3, les autres inchangées ;
- session complète : dix questions puis fin, plus aucune réponse acceptée
  ensuite, bilan à 10/10 et 100 % de précision ;
- session avec quatre erreurs : 6 reconnues du premier coup, précision 10/14,
  au plus trois notes à revoir, triées par nombre d'erreurs ;
- sur 4 000 tirages, les cinq notes sortent toutes, aucune ne dépasse ±30 % de
  la part attendue.

**Interface, dans Chrome sans interface** — 101 vérifications sur 101, trois
exécutions consécutives identiques (le détail navigation figure dans
[F1 § 9](F1-navigation.md)) :

- écran de réglages : trois niveaux et trois mains affichés, Débutant et Main
  droite sélectionnés, les quatre autres désactivés et marqués « Bientôt » ;
  cliquer de force un réglage désactivé ne lance rien ;
- exercice : portée de cinq lignes, clé de sol, une seule note, nom de la note
  **non** affiché pendant la question et révélé seulement dans le retour ;
- correspondance portée → clavier vérifiée en relisant la position réellement
  dessinée de la tête de note (et non l'état interne du moteur) : la touche
  attendue est toujours celle que la portée désigne, et le Do central reçoit
  bien sa ligne supplémentaire ;
- clavier : Do4 → Do5, 8 blanches et 5 noires, repère « Do » sur les deux Do,
  touches de 40 à 68 px de large selon l'écran, toutes des `<button>`
  focalisables et annoncées par leur nom (`Do4`, `Do♯4`) ;
- indice : désigne une seule touche, la bonne, et n'est pas redemandable ;
- mauvaise réponse : même question conservée, progression inchangée, touche
  signalée en rouge puis rendue à son état normal, série remise à zéro, nom
  toujours caché ;
- dix questions enchaînées puis bilan : 9/10 du premier coup, 91 % de
  précision, meilleure série 10, une note à revoir — cohérent avec l'unique
  erreur volontaire du scénario ;
- « Changer de réglages » revient à l'écran de départ, « Recommencer » repart
  à 1/10 ;
- audio : le contexte Tone passe à `running` au premier clic sur une touche ;
- arrêt : retour à l'accueil déclenché pendant la transition entre deux
  questions — rien ne se restaure après coup, aucune boucle d'animation, les
  minuteries du mode sont annulées ;
- mise en page mesurée à 360×640, 390×844, 844×390 et 1280×800 : aucun
  débordement horizontal, tout tient dans la scène sans défilement.

Restent à vérifier à la main : le toucher réel sur téléphone et le rendu sonore
à l'oreille.

### Validation de la main gauche et du mode Les deux (25 juillet 2026)

**Moteur, hors navigateur** — 71 vérifications sur 71, dans Node :

- groupes Débutant : Do4 → Sol4 à droite, Do3 → Sol3 à gauche ; Intermédiaire et
  Difficile toujours signalés comme absents, et « Les deux » n'est proposé que
  si les deux mains existent ;
- session Main gauche : dix questions en clé de fa, toutes prises dans le groupe
  grave, indice disponible d'emblée ;
- erreur en clé de fa mémorisée sous `bass:<midi>`, sans toucher au poids de la
  même hauteur en clé de sol ;
- mode Les deux : clé toujours cohérente avec la main, note toujours prise dans
  le groupe de sa main, main conforme au calendrier tiré ;
- sur 2 000 sessions : **5/5 exactement** à chaque session, jamais trois
  questions de suite sur la même main, jamais deux fois la même note d'affilée,
  alternance stricte droite-gauche dans moins de 5 % des sessions et même main
  répétée sur plus de 20 % des enchaînements — l'équilibre n'est donc pas obtenu
  par un ordre prévisible ; les dix notes des deux mains sortent toutes à ±30 %
  de leur part attendue ;
- session de longueur impaire : 5/4 ou 4/5, jamais plus déséquilibré.

**Interface, dans Chrome sans interface** — 84 vérifications sur 84, trois
exécutions consécutives identiques (tirages différents à chaque fois) :

- réglages : Main gauche et Les deux sont désormais sélectionnables et sans
  mention « Bientôt » ; Intermédiaire et Difficile restent désactivés ;
- clé de fa : ses **deux points encadrent la ligne de Fa** — milieu mesuré à
  77,9 px pour une ligne à 78, points écartés de 16,0 px pour un interligne de
  16, et dessin contenu dans la hauteur de la portée (57 → 104 px). La clé de
  sol est vérifiée de la même façon : l'œil de sa spirale tombe à 0,3 px de la
  ligne de Sol ;
- Main gauche : portée de cinq lignes en clé de fa, clavier Do3 → Do4 (8
  blanches, 5 noires, repère « Do » aux deux extrémités), aucune note ne sort de
  la portée, dix questions enchaînées puis bilan 9/10 après une erreur
  volontaire ;
- correspondance portée → clavier revérifiée en clé de fa **à partir du dessin**
  (position de la tête de note relue dans le SVG, hauteur recalculée hors du
  code de l'application) : la touche attendue est toujours celle que la portée
  désigne, et l'indice pointe cette même touche ;
- Les deux : la main travaillée est annoncée et concorde avec la clé dessinée à
  chaque question, 5 questions par main sur la session, jamais trois de suite sur
  la même main, jamais d'alternance stricte, et le clavier change réellement
  d'étendue (Do3 → Do4 / Do4 → Do5) en suivant la main ;
- bilan du mode Les deux : les notes à revoir sont préfixées par leur main ;
- non-régression : Main droite inchangée (clé de sol, clavier Do4 → Do5, Do
  central avec sa ligne supplémentaire), retour à l'accueil pendant une session
  sans rien qui se restaure ensuite, mode Morceau toujours fonctionnel et ses
  contrôles masqués après arrêt ;
- audio : le contexte Tone passe à `running` au premier clic.

Les clés sont des glyphes Unicode rendus par une police système : leur taille et
leur position ne se déduisent pas de `getBBox()`, qui renvoie la boîte em de la
police et non le dessin. Un premier réglage fait à partir de cette boîte plaçait
la clé de fa 0,7 interligne trop bas. Les valeurs actuelles viennent d'une mesure
au pixel du glyphe dans un canvas : écart des deux points = 0,216 em, milieu des
points = 0,447 em au-dessus de la ligne de base. La taille de la clé de fa en
découle — celle qui écarte ses points d'exactement un interligne.

**Mise en page** — 52 vérifications sur 52, en Main gauche et en Les deux, à
360×640, 390×844, 844×390 et 1280×800 : aucun débordement horizontal, barre de
statut (progression + main + série + indice) tenant sur une ligne de largeur,
clavier entièrement visible et touches blanches de 40 à 68 px.

### Validation des niveaux Intermédiaire et Difficile (25 juillet 2026)

**Moteur, hors navigateur** — 154 vérifications sur 154, dans Node :

- les six groupes sont exactement ceux du tableau du § 4, et les neuf
  combinaisons de niveau et de main sont désormais proposées ;
- propriétés vérifiées groupe par groupe : que des touches blanches, aucune
  altération, degrés diatoniques consécutifs, au plus deux lignes
  supplémentaires, étendue croissante avec le niveau, et — dès l'Intermédiaire
  — mêmes positions sur la portée dans les deux mains, en miroir ;
- règle de l'indice : immédiat en Débutant, après une erreur en Intermédiaire,
  après deux en Difficile, compteur remis à zéro à chaque nouvelle question ;
- une session complète pour **chacune des neuf combinaisons** : clé, main et
  groupe cohérents aux dix questions, jamais deux fois la même note d'affilée,
  bilan 10/10 et 100 % de précision ;
- le Do central appartient aux deux mains dès l'Intermédiaire : ses deux poids
  sont bien distincts, une erreur en clé de fa ne touche pas la même hauteur
  lue en clé de sol ;
- sur 400 sessions par niveau (4 000 tirages) : 5/5 à chaque session, jamais
  trois questions de suite sur la même main, jamais deux fois la même note
  d'affilée, les 22 puis 30 notes des deux mains toutes posées à ±30 % de leur
  part attendue.

**Interface, dans Chrome sans interface** — 200 vérifications sur 200, trois
exécutions consécutives identiques (tirages différents à chaque fois) :

- réglages : plus aucun bouton désactivé ni mention « Bientôt », et aucun
  niveau ne se referme selon la main choisie ;
- **les neuf combinaisons** parcourues une à une : clé attendue, étendue du
  clavier, nombre de touches blanches et noires (recalculés dans le harnais,
  pas lus dans l'application), note tirée du bon groupe, main annoncée
  seulement en mode Les deux, touches ≥ 30 px, et la session avance ;
- Intermédiaire / Main droite : clavier Do4 → Fa5, 11 blanches de 49 px et 7
  noires alignées entre leurs voisines, l'indice **refusé avant la première
  erreur** puis proposé après, la seule ligne supplémentaire possible étant
  celle du Do central ;
- Difficile / Main gauche : clavier Mi2 → Mi4, 15 blanches de 35 px et 10
  noires, indice refusé après une erreur et proposé après deux, lignes
  supplémentaires conformes à la position dessinée ;
- correspondance portée → clavier revérifiée **à partir du dessin** (position
  de la tête de note relue dans le SVG, hauteur recalculée hors du code de
  l'application) : sur les trois exécutions, les **15 notes de la clé de fa**
  et leurs 15 positions — des deux lignes supplémentaires du bas à celles du
  haut — ont été dessinées puis retrouvées au clavier, ainsi que 13 des 15
  notes de la clé de sol, dont La3 (deux lignes sous la portée) et La5 (une
  au-dessus) ;
- Difficile / Les deux : clavier changeant réellement d'étendue avec la main
  (Mi2 → Mi4 / La3 → La5), 5 questions par main, jamais trois de suite sur la
  même main, touches ≥ 30 px sur les deux étendues ;
- non-régression : Débutant inchangé (clavier Do4 → Do5 et Do3 → Do4, 8
  blanches de 68 px, indice disponible d'emblée), sortie en pleine session par
  l'accueil sans rien qui se restaure, audio démarré au premier clic, mode
  Morceau toujours fonctionnel et ses contrôles masqués après arrêt ;
- aucune erreur de page sur les trois exécutions.

**Mise en page** — 110 vérifications sur 110, pour Intermédiaire / Les deux,
Difficile / Main gauche et Difficile / Les deux, à 360×640, 390×844, 844×390 et
1280×800 :

- **en paysage (844×390) et sur ordinateur, rien ne défile** : les 15 blanches
  du niveau Difficile tiennent entières, à 35,5 px ; les 11 de l'Intermédiaire
  à 49 px ;
- en portrait (360 et 390 px de large), le clavier défile au lieu de rétrécir :
  touches à 34 px, démarrage au milieu de l'étendue, et l'indice ramène la
  touche désignée dans le cadre **sans faire défiler la page** ;
- le défilement n'apparaît que lorsqu'il est nécessaire, jamais autrement ;
- dans les douze cas : aucun débordement horizontal de la page ni de la scène,
  barre de statut sur une ligne, clavier entier dans la vue et portée lisible
  au-dessus.

Restent à vérifier à la main : le toucher réel sur téléphone et sur la
tablette, et le rendu sonore à l'oreille.

### Validation de l'étape D — progression (25 juillet 2026)

Le détail complet est dans
[F3 § 12](F3-suivi-progression.md#validation-effectuée-de-létape-a-25-juillet-2026).
Ce qui concerne directement cette fonctionnalité :

- une session de dix notes en Débutant / Les deux, avec une erreur volontaire
  par question de la main gauche, produit **exactement 15 tentatives
  journalisées** — 10 justes, 5 fausses, chacune conservant la note jouée à la
  place — encadrées par les bornes de séance ;
- **bilan par main** : main droite 5/5 du premier coup à 100 %, main gauche 0/5
  à 50 %, et les notes à revoir toutes préfixées « Main gauche » ;
- le bilan par main tient sur les quatre tailles d'écran (44 vérifications) :
  deux lignes de 27 px, sans débordement ni chevauchement du libellé et des
  chiffres, l'ensemble du bilan tenant dans la scène sans défilement ;
- **réglages repris** après un vrai rechargement de page : le niveau et la main
  de la dernière séance sont ceux proposés à l'ouverture suivante ;
- **abandon** : quitter par l'accueil en pleine session enregistre la séance
  comme abandonnée, avec le nombre de questions réellement faites, sans perdre
  les réponses déjà données ;
- **notes difficiles reprises** : avec un historique où Fa4 a été
  systématiquement raté, cette note est tirée 15 à 19 fois sur 40 démarrages de
  session, contre 8 attendues sans pondération — les quatre autres notes du
  groupe continuant toutes de sortir ;
- **stockage refusé** (navigation privée simulée en neutralisant `localStorage`
  avant le chargement des modules) : la session va jusqu'à son bilan et
  l'utilisateur y est prévenu que rien n'a été enregistré ;
- non-régression : les harnais des campagnes précédentes rejoués tels quels
  donnent 154/154 sur le moteur, 200/200 dans le navigateur et 110/110 de mise
  en page.

## 10. Première priorité — faite, pour les neuf combinaisons

Construire une petite boucle verticale complète :

**choisir “Lire les notes” → sélectionner le niveau et la main → voir une note
→ cliquer une touche → recevoir le retour → terminer dix questions → voir le
bilan.**

Cette boucle existe et fonctionne pour les trois niveaux et les trois choix de
main. Le MVP du § 8 est atteint : tous ses critères sont remplis (§ 9).

L'**étape D** est faite pour tout son volet progression (25/07/2026) : les
résultats sont enregistrés via [F3](F3-suivi-progression.md), le bilan est
séparé par main et les notes les plus ratées reviennent plus souvent. La suite
propre à cette fonctionnalité est l'introduction des **altérations**. Le
défilement des notes et la vraie double portée appartiennent à
[08 — Lecture de partitions](08-lecture-partitions.md).

## 11. Hors périmètre pour le moment

Les autres fonctionnalités d'apprentissage seront discutées après validation
de ce premier mode. Elles ne doivent pas ralentir le MVP Lecture de notes.
