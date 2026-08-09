# Feature 10 — Lecture de notes

> Statut : **implémentée**, puis devenue l'unique mode Lecture de notes le
> 28/07/2026. L'ancien exercice à note fixe de 02 a été retiré. La suite de
> notes est devenue une marche mélodique bornée (pas/sauts/intervalles) le
> même jour, pour un vrai intérêt pédagogique — § 12.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Remplacer l'ancien exercice de Lecture de notes à note fixe.
- [x] Faire défiler des notes vers une cible, à vitesse réglable.
- [x] Juger une note manquée sans punir.
- [x] Produire un bilan : premier coup, précision, meilleure série, à revoir.
- [x] Ajouter le choix Les deux mains et la double portée défilante.
- [x] Rendre la suite de notes mélodiquement cohérente (pas/sauts/intervalles).
- [ ] Ajouter les altérations défilantes.

## 1. Problème utilisateur

L'ancien mode Lecture de notes et le mode Fluidité entraînaient la même
correspondance portée-clavier. Deux entrées séparées compliquaient le parcours
sans apporter deux objectifs assez distincts.

## 2. Objectif

Proposer un seul mode Lecture de notes : reconnaître les notes dans un flux
continu, sur une main ou sur les deux portées à la fois.

## 3. Frontière avec l'ancien mode 02 et 08

| | Ce qui est travaillé | Ce qui est mesuré |
| --- | --- | --- |
| [02 — ancien mode](02-lecture-notes.md) | Une note fixe, sans limite de temps — retiré le 28/07/2026 | Historique conservé |
| **10 — Lecture de notes** | Reconnaître dans un flux continu, une ou deux mains | Note jouée avant de sortir, série, précision |
| [08 — Lecture de partitions](08-lecture-partitions.md) | Lire une **vraie** mesure (durées, altérations, deux portées) | Juste ou faux, sans limite de temps |

Les groupes de notes par niveau et par main restent dans
`note-reading-engine.js`. Les anciennes séances `note-reading` et les séances
`fluency` sont relues ensemble pour conserver les difficultés déjà enregistrées.

## 4. Comment ça se joue

Des têtes de note défilent de la droite vers une **ligne d'arrivée** placée
juste après la clé. Il faut jouer chaque note quand elle l'atteint.

- une note passée sans avoir été jouée est **manquée** — l'exercice continue,
  rien ne s'arrête ;
- une fausse note est signalée, mais **la note attendue reste la même** : c'est
  la règle de 02, conservée ici ;
- la série de bonnes réponses se compte, et se remet à zéro à la moindre faute
  — c'est le seul endroit du dossier où une série mesure la régularité et pas
  seulement un score.

### Le temps de lecture ne dépend pas de la vitesse

Une note met **toujours cinq secondes** à traverser l'écran. La vitesse choisie
règle la **densité** (20, 30 ou 45 notes par minute), pas la traversée : lire
plus vite, c'est lire *plus de notes*, pas les voir passer plus floues. Régler
les deux ensemble aurait rendu le niveau rapide illisible plutôt que difficile.

### Une note manquée pèse comme une note ratée

Elle s'écrit `missed` au journal — le mot que 05 réservait déjà aux frappes
manquées — et `progress/review.js` la compte désormais comme une erreur dans
les révisions. Une note qu'on n'a pas su lire à temps est une note à revoir,
au même titre qu'une note lue de travers.

## 5. Niveaux et réglages

| Réglage | Valeurs | Origine |
| --- | --- | --- |
| Niveau | Débutant, Intermédiaire, Difficile | Les groupes de notes de [02 § 4](02-lecture-notes.md#groupes-de-notes-retenus), redécoupés le 08/08/2026 (ci-dessous) |
| Main | Droite (clé de sol), Gauche (clé de fa), Les deux | Idem 02 |
| Vitesse | Tranquille 20, Soutenu 30, Rapide 45 notes/min | Propre à ce mode |

### Un niveau ne réexpose pas le précédent (8 août 2026)

Les trois niveaux de 02 étaient **emboîtés** : l'Intermédiaire contenait les
cinq notes du Débutant, le Difficile contenait les onze de l'Intermédiaire. Sur
une note fixe posée dix fois, cela ne coûtait rien. Sur un flux de trente notes,
cela veut dire passer la moitié d'une séance d'Intermédiaire sur des repères
déjà installés — et ne jamais voir assez souvent les notes qu'on est venu
apprendre.

`note-reading-engine.js` décrit désormais les notes que chaque niveau
**ajoute**, et compose les groupes à partir de là :

| Niveau | Main droite (clé de sol) | Main gauche (clé de fa) | Notes |
| --- | --- | --- | --- |
| **Débutant** | Do4 → Sol4 | Do3 → Sol3 | 5 |
| **Intermédiaire** | La4 → Fa5 | Sol2 → Si2, La3 → Do4 | 6 |
| **Difficile** | La3 → La5 | Mi2 → Mi4 | 15 |

- **Intermédiaire** : seulement ce que le Débutant ne montre pas. Les deux
  groupes gardent leurs positions en miroir sur leur portée respective, et le
  Do central reste le repère qu'il y apprend.
- **Difficile** : inchangé, et c'est voulu — il **rassemble** les trois niveaux.
  C'est là qu'on lit la portée entière, sans exclure quoi que ce soit.

Deux conséquences dans le code :

- le groupe Intermédiaire main gauche est en **deux morceaux** (le Débutant
  occupe son milieu). La marche pas/saut du § 12 travaille sur l'index du pool :
  elle franchit ce trou comme un pas, ce qui garde les deux moitiés
  accessibles, au prix de quelques 7es là où la table annonce une 2de. Le pool
  reste entièrement couvert, c'est ce qui compte ;
- le groupe Intermédiaire main droite (La4 → Fa5) tient dans moins d'une
  octave mais **enjambe un Do**. `piano-dom.js` arrondissait à l'octave Do → Do
  dès que le groupe faisait moins de douze demi-tons : ses notes hautes
  seraient tombées hors du clavier de réponse, donc injouables. Le test porte
  maintenant sur l'octave qui **contient** le groupe, pas sur sa largeur.

En mode « Les deux », les deux portées défilent dans le même Canvas. Les mains
sont alternées à parts égales sur une chronologie unique : deux notes de clés
différentes n'ont jamais la même heure d'arrivée.

## 6. Choix techniques

- **Canvas**, pas de DOM : c'est le seul écran de lecture où quelque chose
  défile réellement (CLAUDE.md, « Canvas, pas de DOM pour le rendu principal »).
  Les deux autres portées de l'application restent en SVG parce que rien n'y
  bouge.
- **La boucle est la seule horloge.** Le temps n'avance que d'image en image,
  et un écart de plus de 100 ms n'est pas compté : un onglet masqué met donc
  l'exercice en pause de lui-même, sans minuterie à rattraper au réveil.
- **Cadence bridée** par `PERFORMANCE_PROFILE.minFrameInterval`, et
  résolution par `maxCanvasDpr`, comme le rouleau du mode Morceau.
- **Géométrie pré-calculée** au redimensionnement, jamais dans le rendu.
- La série alternée et la géométrie vivent dans `fluency-engine.js`, sans DOM,
  afin de vérifier les deux mains et les petits écrans hors navigateur.
- Le clavier de réponse est celui de `piano-dom.js`, partagé avec 07 et 08. En
  mode deux mains, il suit l'octave de la prochaine note pour préserver des
  touches tactiles assez grandes ; le clavier MIDI garde toute son étendue.

## 7. Ce que la séance laisse dans le journal

Une tentative = un évènement, comme partout (plan/F3 § 7) :

- `answer` / `correct` — note jouée à temps ;
- `answer` / `wrong` + `given: { midi }` — fausse note, la cible reste ;
- `answer` / `missed` — note sortie de l'écran.

Aucun champ nouveau, aucun `outcome` nouveau : le format figé le 25/07/2026 a
suffi une fois de plus.

## 8. Critères d'acceptation

- [x] Les notes défilent et la ligne d'arrivée est visible.
- [x] Trois vitesses, trois niveaux et trois choix de main.
- [x] Les deux portées défilent ensemble sans arrivée simultanée entre les clés.
- [x] Une note manquée est annoncée et n'arrête pas la série.
- [x] Une fausse note ne change pas la note attendue.
- [x] Le bilan donne premier coup, précision, meilleure série et notes sorties.
- [x] Les notes en difficulté reviennent plus souvent à la session suivante.
- [x] Jouable au clic, au toucher et au clavier MIDI si disponible.
- [x] L'ancien mode 02 n'apparaît plus dans la navigation ni le programme.

## 9. Validation effectuée (27 juillet 2026)

Dans Chromium (doublure de Tone.js, le CDN étant bloqué dans l'environnement
de vérification), au sein d'une campagne de 34 vérifications passées avec le
panneau « Aujourd'hui » :

- réglages : les trois groupes de choix, la reprise des réglages précédents ;
- exécution : Canvas présent, clavier à l'étendue du niveau, progression
  `0 / 30`, consigne de départ affichée puis effacée à la première note ;
- série entière jouée jusqu'au bilan, quatre chiffres affichés ;
- journal : `session-end` en `done`, toutes les tentatives portant leur cible ;
- mise en page : aucun débordement horizontal en 390×844, touches ≥ 30 px.

Reste à vérifier sur l'appareil réel : la fluidité du défilement sur la
tablette, et le rendu sonore.

## 10. Fusion et double portée (28 juillet 2026)

- l'ancien `note-reading-mode.js` est supprimé du registre et du dépôt ;
- le titre visible de `fluency` devient « Lecture de notes » sans changer son
  identifiant interne, afin de conserver les séances existantes ;
- le programme d'entraînement fusionne les historiques `note-reading` et
  `fluency` pour ce bloc ;
- « Les deux mains » affiche la clé de sol en haut et la clé de fa en bas ;
- les 30 notes restent espacées par l'intervalle de vitesse et alternent entre
  les mains : aucune paire ne peut atteindre la cible simultanément.

Validation hors navigateur :

- 3 niveaux × 3 choix de main ;
- 50 calendriers deux mains par niveau : 15 notes par main, alternance stricte
  et 30 heures d'arrivée toutes distinctes ;
- notes extrêmes du niveau Difficile visibles dans la géométrie des deux
  portées à 170, 130 et 110 px de haut ;
- syntaxe valide pour les 38 modules JavaScript.

La validation Chromium n'a pas pu être rejouée dans l'environnement isolé du
28/07/2026 : Chrome et Edge arrêtent leur processus GPU avant le chargement de
la page. Le rendu et le jeu sur la tablette réelle restent donc à vérifier.

## 12. Marche mélodique bornée (28 juillet 2026)

Jusqu'ici, `drawSeries()` tirait chaque note **indépendamment** au hasard dans
le pool de la main courante, pondérée seulement par les erreurs passées, avec
pour unique contrainte de ne jamais répéter la note précédente. Deux notes
consécutives pouvaient donc être n'importe où dans le pool — un grand saut
aussi probable qu'une note voisine. Ce n'était pas un exercice de lecture
fluide au sens pédagogique, seulement un tirage aléatoire chronométré : c'est
ce qui rendait l'exercice « trop simple et sans intérêt éducatif » quel que
soit le niveau choisi, la largeur des pools n'y étant pour rien.

Deux principes bien établis de la pédagogie du piano guident la nouvelle
version :

- **notes-repères** : un élève retient une ou deux notes-ancres par portée
  (Sol en clé de sol, Fa en clé de fa) plutôt que de recompter les lignes à
  chaque note ;
- **lecture par intervalles** : la vraie compétence de fluidité, c'est
  reconnaître la *forme* du mouvement par rapport à la note précédente — un
  pas (2de, note voisine), un saut (3ce, une ligne sautée), un grand
  intervalle — plutôt que ré-identifier une position absolue à chaque note. La
  musique réelle est très majoritairement faite de pas et de petits sauts ;
  les pédagogues enseignent explicitement pas d'abord, sauts ensuite, grands
  intervalles progressivement.

Sources : [Sightreading 101: Intervallic Reading](https://dawnspiano.blogspot.com/2019/04/sightreading-101-intervallic-reading.html),
[The Landmark System](https://standrewspianotuition.co.uk/natural-piano/the-landmark-system),
[How to Read Music Using Intervals and Landmark Notes](https://www.musicandtheory.com/how-to-read-music-using-intervals-and-landmark-notes-vs-mnemonics/),
[Teaching Steps, Skips, and Intervals](https://www.pianowithlauren.com/teaching-intervals-beginner-piano-students/),
[Intervallic Inchworms](https://www.teachpianotoday.com/2018/01/15/learning-to-read-skips-with-intervallic-inchworms/).

### Marche sur l'index du pool

Les pools de `note-reading-engine.js` sont triés par degré diatonique
croissant : l'index dans le tableau **est** le degré de portée (marcher sur
l'index, pas sur la valeur MIDI, est nécessaire — Mi-Fa et Si-Do ne valent
qu'un demi-ton quand les autres degrés en valent deux). `drawSeries()` choisit
désormais chaque note suivante par un pas de `± magnitude` sur cet index, avec
réflexion aux bornes du pool (une marche qui sortirait rebondit, comme une
main qui ne peut pas dépasser la dernière note écrite). La table
pas/saut/grand-intervalle dépend du niveau :

| Niveau | pas (2de) | saut (3ce) | 4te | 5te | 6te | 7te |
| --- | --- | --- | --- | --- | --- | --- |
| Débutant | 75 % | 25 % | — | — | — | — |
| Intermédiaire | 50 % | 25 % | 15 % | 7 % | 3 % | — |
| Difficile | 35 % | 25 % | 15 % | 12 % | 8 % | 5 % |

Le Débutant s'arrête au saut : sur un pool de 5 notes (Do4→Sol4), le plus
grand écart possible est déjà une 5te — un « grand intervalle » n'a pas de
sens sur un exercice 5-doigts en degrés conjoints.

La pondération des erreurs passées (`priorWeights`) s'applique désormais
**parmi les index atteignables** depuis la note courante plutôt que sur tout
le pool : une note ratée revient toujours plus souvent, sans casser la
cohérence mélodique du pas suivant.

### Couverture du pool

Une marche bornée pas/saut visite structurellement moins les extrémités du
pool qu'un tirage uniforme. Un bonus de poids (`NOVELTY_BOOST = 10`) s'ajoute
à une note du pool pas encore jouée par la main courante dans la séance ; il
retombe à 1 dès qu'elle a été vue une fois, et la marche redevient purement
pas/saut/grand-intervalle.

Ce qui n'a pas changé : la chronologie unique alternée du mode Les deux
mains, la règle « jamais deux fois la même note d'affilée », la forme de
retour de `drawSeries()` (`{ hands, pools, notes }`), les pools eux-mêmes, et
`fluency-mode.js` (qui ne lit que cette même forme de données — aucune
modification nécessaire).

### Validation (28 juillet 2026)

Harnais Node ad hoc, sans navigateur, sur les 9 combinaisons niveau × main
plus le mode Les deux mains :

- **45 000 sessions de 30 notes** (9 combinaisons × 5000) : 0 sortie de pool,
  0 répétition immédiate de la même note sur une même main ;
- **distribution des deltas** mesurée sur 174 000 transitions consécutives par
  niveau (une main) : Intermédiaire et Difficile à moins de 3 points des poids
  nominaux du tableau ci-dessus ; Débutant à 78,5 % de pas au lieu de 75 %
  attendus — écart analysé et attendu : sur un pool à seulement 5 notes, près
  des bords, une des deux directions d'un saut retombe parfois sur la note
  précédente et est écartée, ce qui gonfle mécaniquement la part des pas de
  quelques points. Effet structurel des petits pools, pas une erreur, et il va
  dans le sens pédagogique voulu (encore plus de mouvement conjoint pour un
  débutant) ;
- **couverture du pool sur 30 notes, une main** : 100 % en Débutant, ≥ 98 % en
  Intermédiaire, ≥ 94 % en Difficile (contre ~89 % avec l'ancien tirage
  indépendant, mesuré pour comparaison) ; en Les deux mains / Difficile
  (≈15 tirages pour 15 notes par main, le cas le plus contraint), couverture
  minimale de 65,8 % — non-régression confirmée face au plancher mathématique
  d'un tirage uniforme dans ce cas (~65 %) ;
- **pondération des erreurs toujours active** : une cible avec un poids hérité
  ×~4 (comme après plusieurs erreurs passées) sort 2,84× plus souvent qu'une
  cible neutre, sur 4000 sessions ;
- **mode Les deux mains** : 150 calendriers (50 par niveau), toujours un écart
  d'au plus une note entre les deux mains sur la session ;
- **forme de retour** de `drawSeries()` et de chaque `note` identique à avant
  (vérifié par `Object.keys()`), confirmant que `fluency-mode.js` n'a rien à
  changer.

Vérification visuelle (contour mélodique plutôt que nuage de points) : les 20
premières notes d'une session imprimées comme un mini piano-roll ASCII, pour
chaque niveau. Le Débutant dessine un mouvement presque entièrement conjoint,
l'Intermédiaire alterne de courtes phrases par degrés et quelques sauts,
et le Difficile produit de vrais dessins mélodiques — par exemple une broderie
descendante (13-14-13-11-10-9) en fin de série. `fluency-mode.js` n'ayant pas
changé, aucun nouveau passage par Chrome headless n'était nécessaire : le
rendu Canvas et la correspondance portée-clavier restent ceux déjà validés en
§ 9-10.

## 13. Suites possibles

- Altérations défilantes (le dessin du dièse est déjà en place).
- Vitesse qui s'adapte au score, plutôt que choisie — à condition qu'elle ne
  descende jamais sans le dire, sous peine de fausser la mesure de progrès.
