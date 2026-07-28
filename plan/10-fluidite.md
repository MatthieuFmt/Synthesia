# Feature 10 — Lecture de notes

> Statut : **implémentée**, puis devenue l'unique mode Lecture de notes le
> 28/07/2026. L'ancien exercice à note fixe de 02 a été retiré.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Remplacer l'ancien exercice de Lecture de notes à note fixe.
- [x] Faire défiler des notes vers une cible, à vitesse réglable.
- [x] Juger une note manquée sans punir.
- [x] Produire un bilan : premier coup, précision, meilleure série, à revoir.
- [x] Ajouter le choix Les deux mains et la double portée défilante.
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
| Niveau | Débutant, Intermédiaire, Difficile | Les groupes de notes de [02 § 4](02-lecture-notes.md#groupes-de-notes-retenus), tels quels |
| Main | Droite (clé de sol), Gauche (clé de fa), Les deux | Idem 02 |
| Vitesse | Tranquille 20, Soutenu 30, Rapide 45 notes/min | Propre à ce mode |

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

## 11. Suites possibles

- Altérations défilantes (le dessin du dièse est déjà en place).
- Vitesse qui s'adapte au score, plutôt que choisie — à condition qu'elle ne
  descende jamais sans le dire, sous peine de fausser la mesure de progrès.
