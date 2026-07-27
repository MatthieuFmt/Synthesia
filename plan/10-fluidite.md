# Feature 10 — Fluidité

> Statut : **implémentée** (27/07/2026). C'est le niveau 4 du parcours
> pédagogique décrit par [02 § 3](02-lecture-notes.md#parcours-pédagogique-proposé),
> laissé de côté depuis le premier jour et construit à la demande.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir la frontière avec la Lecture de notes et la Lecture de partitions.
- [x] Faire défiler des notes vers une cible, à vitesse réglable.
- [x] Juger une note manquée sans punir.
- [x] Produire un bilan : premier coup, précision, meilleure série, à revoir.
- [ ] Ajouter les altérations et la double portée défilantes.

## 1. Problème utilisateur

La Lecture de notes (02) enseigne la correspondance portée-clavier **sans
aucune pression de temps** — c'était une décision explicite de son § 3 :
« faire tomber les notes dès le début mélange lecture et rapidité ».

Conséquence : on peut réussir toutes ses sessions de 02 en réfléchissant trois
secondes par note, et rester incapable de lire une partition à tempo. La
compétence manquante n'est pas la reconnaissance, c'est sa **vitesse**.

## 2. Objectif

Rendre automatique ce que 02 a rendu possible : reconnaître une note sans y
penser, assez vite pour suivre un flux continu.

## 3. Frontière avec 02 et 08

| | Ce qui est travaillé | Ce qui est mesuré |
| --- | --- | --- |
| [02 — Lecture de notes](02-lecture-notes.md) | Reconnaître **une** note écrite | Juste ou faux, sans limite de temps |
| **10 — Fluidité** | Reconnaître **vite**, en flux continu | Note jouée avant de sortir, série, précision |
| [08 — Lecture de partitions](08-lecture-partitions.md) | Lire une **vraie** mesure (durées, altérations, deux portées) | Juste ou faux, sans limite de temps |

Les trois sont complémentaires et se partagent le même matériel : les groupes
de notes par niveau et par main de `note-reading-engine.js`. **Rien n'a été
redéfini** pour ce mode.

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
| Main | Droite (clé de sol), Gauche (clé de fa) | Idem 02 |
| Vitesse | Tranquille 20, Soutenu 30, Rapide 45 notes/min | Propre à ce mode |

Le mode « Les deux » de 02 n'est **pas** repris : deux clés qui défilent en
même temps, c'est la double portée — elle appartient à 08, et à une évolution
future de ce mode.

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
- Le clavier de réponse est celui de `piano-dom.js`, partagé avec 02, 07 et 08.

## 7. Ce que la séance laisse dans le journal

Une tentative = un évènement, comme partout (plan/F3 § 7) :

- `answer` / `correct` — note jouée à temps ;
- `answer` / `wrong` + `given: { midi }` — fausse note, la cible reste ;
- `answer` / `missed` — note sortie de l'écran.

Aucun champ nouveau, aucun `outcome` nouveau : le format figé le 25/07/2026 a
suffi une fois de plus.

## 8. Critères d'acceptation

- [x] Les notes défilent et la ligne d'arrivée est visible.
- [x] Trois vitesses, trois niveaux, deux mains.
- [x] Une note manquée est annoncée et n'arrête pas la série.
- [x] Une fausse note ne change pas la note attendue.
- [x] Le bilan donne premier coup, précision, meilleure série et notes sorties.
- [x] Les notes en difficulté reviennent plus souvent à la session suivante.
- [x] Jouable au clic, au toucher et au clavier MIDI si disponible.
- [x] La Lecture de notes (02) ne régresse pas.

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

## 10. Suites possibles

- Altérations défilantes (le dessin du dièse est déjà en place).
- Double portée défilante, une fois 08 acquise.
- Vitesse qui s'adapte au score, plutôt que choisie — à condition qu'elle ne
  descende jamais sans le dire, sous peine de fausser la mesure de progrès.
