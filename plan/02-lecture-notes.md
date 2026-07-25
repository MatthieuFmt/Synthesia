# Feature 02 — Lecture de notes

> Statut : boucle verticale en place en **Débutant**, pour les trois choix de
> main (**Main droite**, **Main gauche**, **Les deux**) — réglages → note sur la
> portée → clic sur une touche → retour → dix questions → bilan, vérifié dans un
> navigateur (§ 9). Restent les niveaux Intermédiaire et Difficile (étape 6 de
> l'ordre de réalisation).

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir le principe pédagogique.
- [x] Définir les niveaux et les choix de main.
- [x] Définir le MVP et ses critères d'acceptation.
- [x] Ajouter la navigation vers le mode Lecture de notes.
- [x] Implémenter le moteur d'exercice.
  (tirage, validation, pondération des erreurs, équilibrage des mains et bilan ;
  il ne manque que les groupes de notes des niveaux Intermédiaire et Difficile)
- [x] Implémenter l'interface.
- [ ] Valider les neuf combinaisons de niveau et de main.
  (trois existent — Débutant × Main droite / Main gauche / Les deux —, toutes
  vérifiées)

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

- [ ] Définir un groupe de notes par niveau et par main.
  (Débutant est complet : Do4 → Sol4 à droite, Do3 → Sol3 à gauche — les mêmes
  degrés une octave plus bas, tous à l'intérieur de la clé de fa. Intermédiaire
  et Difficile restent à définir.)
- [x] Construire le groupe actif à partir des deux réglages.
- [x] Équilibrer les deux mains sur une session en mode Les deux.
- [x] Générer une question sans répétition immédiate inutile.
- [x] Valider la touche choisie.
- [x] Gérer les tentatives, la série et les erreurs par note.
- [x] Donner davantage de poids aux notes difficiles.
- [x] Produire le bilan d'une session.

### Étape C — Interface du MVP

- [ ] Ajouter le choix Débutant / Intermédiaire / Difficile.
  (les trois boutons existent ; Intermédiaire et Difficile sont affichés
  « Bientôt » et désactivés tant que leur groupe de notes n'existe pas)
- [x] Ajouter le choix Main droite / Main gauche / Les deux.
- [x] Dessiner une grande portée et une note unique.
- [x] Afficher la bonne clé et, si nécessaire, la main courante.
  (clé de sol ou clé de fa selon la question ; en mode Les deux, la main
  travaillée est annoncée à côté de la progression et change avec elle)
- [x] Afficher un clavier centré sur la zone travaillée sans révéler la réponse.
  (une octave alignée sur les Do ; en mode Les deux, le clavier suit la main de
  la question — Do3 → Do4 à gauche, Do4 → Do5 à droite)
- [x] Ajouter les retours visuels correct / incorrect.
- [x] Ajouter l'indice, la progression et la sortie.
- [x] Ajouter l'écran de fin de session.
- [ ] Vérifier l'utilisation à la souris, au clavier et au toucher.
  (souris vérifiée ; les touches sont des `<button>` focalisables, donc
  activables au clavier ; le toucher réel reste à faire sur appareil)

### Étape D — Progression

- [ ] Enregistrer localement les résultats et le dernier niveau (via
  [F3 — Suivi de progression](F3-suivi-progression.md)).
- [ ] Afficher un bilan séparé par main lorsque Les deux est sélectionné.
- [ ] Reprendre une session avec les notes qui posent le plus de difficultés
  (vue « révisions adaptées » de [F3](F3-suivi-progression.md)).
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
- [ ] l'utilisateur peut sélectionner l'un des trois niveaux ;
- [x] l'utilisateur peut sélectionner Main droite, Main gauche ou Les deux ;
- [ ] chaque combinaison de niveau et de main produit le bon groupe de notes ;
      (vrai pour les trois combinaisons existantes)
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

**Interface, dans Chrome sans interface** — 82 vérifications sur 82, trois
exécutions consécutives identiques (tirages différents à chaque fois) :

- réglages : Main gauche et Les deux sont désormais sélectionnables et sans
  mention « Bientôt » ; Intermédiaire et Difficile restent désactivés ;
- clé de fa réellement dessinée : elle dépasse de 0,86 interligne au-dessus de
  la ligne de Fa et descend de 3,06 en dessous, soit exactement la portée —
  proportions conformes au glyphe de référence (0,89 / 3,06) ;
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

**Mise en page** — 52 vérifications sur 52, en Main gauche et en Les deux, à
360×640, 390×844, 844×390 et 1280×800 : aucun débordement horizontal, barre de
statut (progression + main + série + indice) tenant sur une ligne de largeur,
clavier entièrement visible et touches blanches de 40 à 68 px.

## 10. Première priorité — faite en Débutant, pour les trois mains

Construire une petite boucle verticale complète :

**choisir “Lire les notes” → sélectionner le niveau et la main → voir une note
→ cliquer une touche → recevoir le retour → terminer dix questions → voir le
bilan.**

Cette boucle existe et fonctionne en Débutant pour les trois choix de main :
cinq notes en clé de sol, cinq en clé de fa, et le mélange équilibré des deux.
Le MVP n'est pas terminé pour autant : il le sera lorsque les trois niveaux
fonctionneront (étape 6 de
l'[ordre de réalisation](README.md#ordre-de-réalisation-recommandé)).
Le défilement vient ensuite.

Ce qu'il reste à faire tient dans peu de code : ajouter à `NOTE_POOLS` la ligne
`right` et la ligne `left` des niveaux Intermédiaire et Difficile. Le reste du
moteur, de l'interface et du bilan est déjà indépendant du niveau et de la
main — l'étendue du clavier, la clé affichée et l'annonce de la main se
déduisent du groupe de notes.

## 11. Hors périmètre pour le moment

Les autres fonctionnalités d'apprentissage seront discutées après validation
de ce premier mode. Elles ne doivent pas ralentir le MVP Lecture de notes.
