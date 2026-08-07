# Feature 04 — Programme d'entraînement

> Statut : **refondu le 27/07/2026 (soir)**. La première version demandait à
> l'utilisateur de composer son programme — cocher des fonctionnalités, régler
> des fréquences et des durées. À l'usage, deux reproches, tous deux fondés :
> *« le programme dure beaucoup trop longtemps alors que je veux pratiquer
> 20 minutes par jour »* et *« ce n'est pas à moi de choisir ce que je
> travaille, c'est à toi de me faire un programme comme un professeur pro »*.
> Le modèle est donc inversé : l'utilisateur donne **un budget de temps**, et
> l'application **écrit la séance**. Le programme ne tient toujours **aucun**
> historique : il lit celui de [F3](F3-suivi-progression.md), dont il est le
> premier consommateur réel.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir le principe du programme (~~fonctionnalités, fréquence, durée~~
  → budget quotidien + séance composée, § 5).
- [x] Définir le calcul de ce qui reste à faire aujourd'hui.
- [x] Ajouter l'accès au Programme d'entraînement depuis la navigation.
- [x] ~~Implémenter la configuration du programme.~~ Remplacée par un seul
  réglage : la durée quotidienne.
- [x] Implémenter l'écran Aujourd'hui et le démarrage d'une séance planifiée.
- [x] Enregistrer une séance comme terminée à la fin naturelle de la
  fonctionnalité. (rien n'a été ajouté : c'est le `session-end` en `done` que
  chaque fonctionnalité écrivait déjà — cf. section 11)
- [x] Tester ~~les trois types de fréquence et le passage de semaine/mois~~
  tous les budgets, la rotation des créneaux et le passage de journée.

## 1. Problème utilisateur

L'utilisateur doit aujourd'hui se souvenir seul de ce qu'il devrait
pratiquer, à quelle fréquence, et combien de temps y consacrer. Sans plan, il
risque de toujours refaire la même fonctionnalité, d'oublier certains points
de travail (main gauche, technique, lecture de notes) ou de ne pas savoir
combien de temps donner à chaque séance.

**Ce que la première version n'a pas résolu** (constaté le 27/07/2026) : lui
demander de composer son programme lui rendait exactement le problème qu'il
voulait déléguer — « que dois-je travailler ? » — et la somme des durées
proposées par défaut (10 + 15 + 10 + 20 + 10 = 65 min) n'avait aucun rapport
avec le temps dont il dispose réellement. Un programme qu'on ne tient pas ne
sert à rien.

## 2. Objectif

Donner chaque jour à l'utilisateur **une séance déjà écrite**, tenant dans le
temps qu'il a annoncé, et couvrant sur la semaine tout ce qu'un professeur
ferait couvrir. Sa seule décision : combien de temps par jour.

## 3. Hors périmètre pour cette première version

- Pas de notifications ou de rappels (navigateur ou push) : à envisager
  seulement si le besoin se confirme à l'usage.
- Pas d'ajustement automatique du programme selon les résultats (par
  exemple augmenter tout seul la fréquence sur les points faibles) : cela
  suppose un suivi de progression détaillé, non traité ici.
- Pas de plusieurs programmes actifs en parallèle : un seul programme actif
  à la fois.
- Un programme ne peut planifier que des fonctionnalités réellement
  disponibles dans le registre de [F1](F1-navigation.md) ; il ne peut pas
  planifier une fonctionnalité qui n'existe pas encore.
- Pas de jours précis de la semaine choisis à l'avance (« lundi et jeudi »)
  dans cette première version : voir Décisions ouvertes.

## 4. Parcours principal

1. L'utilisateur ouvre l'application → l'accueil affiche **sa séance du
   jour**, déjà composée, sans qu'il ait rien réglé.
2. Il appuie sur **Commencer** → la première fonctionnalité de la séance
   démarre (via F1).
3. À la fin naturelle de la séance (bilan de la fonctionnalité), revenir à
   l'accueil montre le bloc coché et propose **Continuer** sur le suivant.
4. S'il veut plus ou moins de travail, il ouvre « Programme » et change la
   seule chose réglable : **combien de temps par jour**. La séance se
   recompose aussitôt.

C'est exactement le parcours vérifié le 27/07/2026 au soir (§ 16).

## 5. La séance, et son seul réglage

**Le réglage :** la durée quotidienne — 10, 15, 20, 30, 45 ou 60 minutes,
**20 par défaut**. Rien d'autre. Elle reste indicative : aucun chronomètre
n'interrompt quoi que ce soit (§ 15).

**La séance** a toujours la forme d'un cours, dans cet ordre :

| Créneau | Part | Priorité | Fonctionnalités possibles |
|---|---|---|---|
| Échauffement | 20 % | 3 | Exercices |
| Lecture | 20 % | 2 | Lecture de notes |
| Morceau | 40 % | 1 | Morceau (travail d'un passage) |
| Oreille | 20 % | 4 | Oreille |

Deux règles font le reste :

- **le temps se répartit au prorata**, à la minute près, et le total tombe
  toujours juste : 20 min donnent 4 / 4 / 8 / 4 ;
- **un bloc de moins de 3 minutes n'existe pas.** Quand le budget ne suffit
  plus, le créneau le **moins prioritaire** disparaît et le temps est
  redistribué : 10 minutes donnent donc 3 / 3 / 4 sur échauffement, lecture et
  morceau — l'oreille attend un jour plus long. C'est ce qu'un professeur
  ferait, plutôt que quatre miettes.

**Le choix dans un créneau** revient à la fonctionnalité **la moins vue
récemment**, d'après le journal de F3 — jamais pratiquée passant en premier.
C'est ce qui fait tourner la lecture entre 02, 08 et 10 sans calendrier écrit
d'avance, et qui garantit qu'un domaine délaissé revient tout seul.

**Le choix du jour est figé au matin** : l'ancienneté est calculée en
s'arrêtant au début de la journée. Sans cela, terminer un bloc changerait
aussitôt le bloc lui-même (celui qu'on vient de faire devenant le plus
récent), et la séance ne serait jamais la même deux minutes de suite.

## 6. Modèle de données — refondu le 27/07/2026

```js
// Clé `synthesia.training.v2` : { v: 2, dailyMinutes: 20 }
```

C'est **tout** ce qui est stocké. Le programme lui-même n'est pas une donnée :
il se recalcule à chaque affichage à partir du budget, du registre F1 et du
journal F3. Il n'y a donc rien à migrer quand un mode s'ajoute — la Fluidité
et la Pédale sont entrées dans la rotation sans qu'une ligne de stockage
bouge. Ni quand un mode **part** : le retrait du Rythme et de la Pédale
(07/08/2026) a vidé le créneau « Oreille et rythme » de deux de ses trois
fonctionnalités sans qu'aucune séance stockée n'ait à être touchée — le
créneau a simplement été renommé « Oreille ». Chaque créneau n'a plus qu'une
fonctionnalité : la règle du « moins vu récemment » ne tranche donc plus rien
pour l'instant, mais elle ne coûte rien non plus.

La clé `synthesia.training.v1` (fonctionnalités cochées, fréquences, durées)
n'est **pas** migrée : il n'y a rien à en reprendre. Une clé inconnue ou
illisible ramène simplement au budget par défaut.

Il n'y a **pas** de `completedSessions` : le tableau prévu par les premières
versions de ce plan n'a jamais été écrit. F3 possède le journal des séances
terminées, et ce programme le **lit** (voir
[F3 § 5](F3-suivi-progression.md#5-chevauchement-avec-le-programme-dentraînement-04)) :
`completedSessions` est devenu une **vue**, `progress/views.js`, filtrée par
fonctionnalité et par période. Tenir un second historique aurait fait deux
sources de vérité pour la même question.

Deux précisions apparues en écrivant, toujours valables :

- **`featureId` du registre ≠ `featureId` du journal.** Écouter un morceau
  n'est pas une séance de travail : c'est le passage travaillé qui en est une, et
  il s'écrit sous `song-practice` ([06](06-travail-intelligent-morceau.md#12-découpage-technique--fait-le-26072026)).
  Une table `SESSION_FEATURE_IDS` dit donc quels identifiants du journal
  satisfont une entrée du programme — `song` → `["song-practice"]`. Les autres
  fonctionnalités écrivent sous leur propre identifiant et n'ont rien à y
  déclarer ;
- **aucun réglage ≠ réglage par défaut.** Tant que l'utilisateur n'a pas
  choisi sa durée, l'écran l'explique (« tu n'as rien à composer… ») et
  l'accueil annonce « Séance de 20 min par jour — changer ». Une fois réglée,
  l'explication disparaît : elle n'a plus rien à apprendre.

## 7. Ce qui reste à faire aujourd'hui

Un bloc est **fait** dès qu'il existe une séance terminée aujourd'hui pour sa
fonctionnalité — un `session-end` en `done`, journée calendaire locale. C'est
tout : il n'y a plus ni quota, ni période hebdomadaire ou mensuelle, ni état
« quota atteint ». La régularité n'est plus imposée par des fréquences, elle
naît de la rotation (§ 5), qui ramène d'elle-même ce qui a été délaissé.

Un bloc fait reste **démarrable** (« Refaire ») : pratiquer plus que prévu
n'est jamais empêché.

## 8. La séance du jour, sur l'accueil et dans le mode

Ouvrir l'application et devoir cliquer « Programme » pour savoir quoi faire
était un pas de trop : le panneau **« Ta séance du jour »** de l'accueil
(`src/today-panel.js`) est en tête de l'écran d'accueil, au-dessus des modes.

Il ne duplique aucune règle : il appelle `planDay()` de `training-coach.js`
avec le journal de F3, exactement comme l'écran du mode. Ce qui lui est propre
est uniquement de l'affichage :

- le **budget du jour** en pastille, parce que c'est lui qui explique la
  longueur des blocs ;
- une pastille par bloc : **son numéro** tant qu'il reste à faire, une **coche
  verte** une fois fait — l'ordre et l'état se lisent sans lire ;
- l'ordre du cours est conservé, y compris pour les blocs faits : c'est une
  séance, pas une liste de courses (à la différence de la version précédente,
  qui reléguait les lignes faites en bas) ;
- un seul bouton d'action, **Commencer · <créneau>** puis **Continuer ·
  <créneau>**, qui ouvre le premier bloc non fait ;
- le bandeau vert « Séance terminée » remplace le compteur quand tout est
  fait ;
- un lien discret vers le seul réglage.

L'écran du mode Programme garde ce que le panneau n'a pas : **pourquoi** chaque
créneau est là (une phrase par bloc), les sept derniers jours, et le réglage de
la durée. Il se recalcule à chaque ouverture, comme le panneau se recalcule à
chaque retour à l'accueil — une séance terminée s'y voit donc cochée
immédiatement.

## 9. ~~Écran de configuration du programme~~ — supprimé

Il n'y a plus rien à configurer. L'écran de cases à cocher, de fréquences et
de `+ / −` a disparu avec le modèle qu'il servait : c'était précisément le
travail que l'utilisateur voulait déléguer. Ce qu'il en reste tient en six
boutons — 10, 15, 20, 30, 45, 60 minutes — sur l'écran du mode.

## 10. Règles de comportement

- La séance ne contient que des fonctionnalités réellement disponibles dans le
  registre F1 ; un mode retiré disparaît de la rotation sans migration.
- **Le Programme ne se planifie pas lui-même**, et l'écran Progression non
  plus : il se consulte, il ne se pratique pas (il n'écrit rien au journal).
- Une fonctionnalité n'occupe qu'un créneau par séance.
- La journée de référence est la journée **locale** : celle de l'utilisateur
  n'est pas celle d'UTC.
- Une séance est comptée comme faite uniquement quand la fonctionnalité
  associée est allée jusqu'à sa fin naturelle — un `session-end` en `done`.
  Ouvrir puis quitter aussitôt laisse un `abandoned`, qui ne compte pour rien.
- La durée d'un bloc reste **indicative** : rien ne s'arrête tout seul, et les
  deux écrans le disent.
- Utiliser une fonctionnalité en dehors de la séance reste toujours possible
  depuis l'accueil ou le menu (F1) et ne doit jamais être bloqué ni faussé par
  le programme.

## 11. Découpage technique — refondu le 27/07/2026

```text
src/
  training-coach.js         # la séance : créneaux, choix, répartition — sans DOM
  training-program.js       # le budget, les bornes de jour, la persistance — sans DOM
  training-mode.js          # l'écran unique du mode (séance, semaine, durée), en DOM
  today-panel.js            # la séance du jour sur l'accueil, en DOM
  progress/views.js         # vue « historique des séances » du journal F3 (sans DOM)
```

Pourquoi **deux** modules sans DOM plutôt qu'un : `training-program.js` répond
à « qu'est-ce que l'utilisateur a réglé, et quand commence la journée ? »,
`training-coach.js` à « que faut-il travailler aujourd'hui ? ». Le second lit
le premier, jamais l'inverse. C'est aussi ce qui rend le professeur vérifiable
seul, horloge et journal injectés, sans stockage (§ 16).

**`training-log.js` n'existe pas**, contrairement à ce que ce plan proposait :
c'était le second historique que [F3 § 5](F3-suivi-progression.md#5-chevauchement-avec-le-programme-dentraînement-04)
avait justement écarté. Le programme lit `progress/views.js`, qui reconstitue
les séances à partir des paires `session-start` / `session-end` du journal.

Ce qui n'a **pas** été écrit pour l'occasion, et c'est le point important :

- **aucune fonctionnalité n'a été modifiée**, ni à la première version ni à la
  refonte. Le journal contenait déjà tout ce qu'il fallait — une séance
  terminée est un `session-end` en `done`, format figé le 25/07/2026. C'est
  précisément ce que le découpage de F3 en deux temps cherchait à obtenir ;
- **aucune vue nouvelle.** La rotation (« la moins vue récemment ») se lit avec
  `completedSessions(log, { featureIds, to })`, qui existait déjà. Les sept
  derniers jours du mode se comptent avec la même vue, sept fois — écrire une
  vue « jours pratiqués » pour trois lignes aurait été l'erreur de
  `nearestBeat()` ;
- **le registre n'est pas dupliqué.** `navigation.js` expose
  `availableFeatures()`, et le mode s'en sert pour la liste comme pour les
  titres ;
- **le rendu est en DOM**, comme l'Oreille et la Progression : rien ne
  défile, rien ne sonne, donc aucune boucle d'animation et des cibles tactiles
  franches (CLAUDE.md, contraintes matérielles).

### Décisions prises en écrivant

- **Le Programme n'a aucune présence pendant une séance.** Démarrer quitte le
  mode par `switchTo()` ; il n'observe rien, ne pose aucun rappel, et se met à
  jour à sa réouverture. Le journal fait foi : une séance faite depuis l'accueil
  compte exactement autant qu'une séance lancée depuis la séance du jour.
  L'alternative — garder le programme actif en fond pour « ramener » à la fin de
  la séance — aurait fait vivre deux modes à la fois, ce que le contrat
  `start` / `stop` de [F1](F1-navigation.md) interdit. C'est aussi pourquoi il
  n'y a pas d'enchaînement automatique d'un bloc au suivant : on revient à
  l'accueil, où le bouton dit « Continuer ».
- **La forme de la séance est écrite dans le code, pas réglable.** Les parts
  (20/20/40/20), l'ordre et les priorités sont ce que le professeur apporte ;
  les exposer en réglages rendrait à l'utilisateur le problème qu'il déléguait.
- **Le choix d'un créneau est figé au matin** (§ 5) : sans cela, la séance se
  réécrirait sous les yeux de l'utilisateur à chaque bloc terminé.
- **Un bloc trop court est supprimé, pas rétréci.** Trois minutes est le
  plancher ; en dessous, le créneau le moins prioritaire disparaît.
- **Le bouton reste proposé quand tout est fait**, sous le libellé « Refaire ».
  Un programme qui empêche de pratiquer davantage serait absurde.
- **Le Morceau porte une mention explicite** — « Compte quand un passage est
  travaillé (bouton Travail) ». C'est la seule fonctionnalité dont la séance ne
  va pas de soi, et le § 6 explique pourquoi.

## 12. Étapes de réalisation

### Étape A — Fondations — **faite le 27/07/2026**

- [x] Définir le modèle de données du programme (section 6, refondu le soir).
- [x] ~~Définir le format du journal minimal des séances terminées.~~ Sans
  objet : le journal est celui de F3, et la vue `completedSessions` le lit.
- [x] Définir la règle de calcul de ce qui reste à faire (section 7).

### Étape B — Interface — **faite le 27/07/2026**

- [x] ~~Créer l'écran de configuration du programme.~~ Supprimé à la refonte
  (§ 9) : il ne reste que le choix de la durée.
- [x] Créer l'écran « Ta séance du jour » (mode et accueil).
- [x] Ajouter l'accès au Programme d'entraînement depuis la navigation (F1).
- [x] Permettre de démarrer un bloc directement depuis la séance du jour.

### Étape C — Logique — **faite le 27/07/2026**

- [x] Composer la séance à partir du budget (répartition, blocs supprimés).
- [x] Choisir la fonctionnalité d'un créneau par ancienneté, figée au matin.
- [x] Enregistrer une séance comme terminée à la fin naturelle de la
  fonctionnalité. (rien à ajouter : les fonctionnalités le faisaient déjà)
- [x] Empêcher la planification d'une fonctionnalité non disponible.

### Étape D — Validation — **faite le 27/07/2026**

- [x] Tester tous les budgets (10 à 60 min) : total exact, aucun bloc sous le
  plancher, créneaux supprimés dans le bon ordre.
- [x] Tester la rotation et sa stabilité dans la journée.
- [x] Tester le passage à une nouvelle journée.
- [x] Vérifier qu'une utilisation hors programme n'endommage pas le suivi.
- [x] Vérifier la lisibilité sur petite largeur d'écran.

## 13. Critères d'acceptation

- [x] L'utilisateur obtient une séance **sans rien configurer**, dès la
  première ouverture.
- [x] La somme des blocs est exactement le temps annoncé, pour tous les
  budgets proposés.
- [x] Un budget trop court supprime des créneaux au lieu de produire des blocs
  minuscules, en commençant par les moins prioritaires.
- [x] Terminer une séance planifiée la marque comme faite pour la journée.
  (vérifié le matin en jouant réellement dix questions de Lecture de notes
  jusqu'au bilan, pas en fabriquant l'évènement)
- [x] La séance du jour ne change pas de composition pendant qu'on la fait.
- [x] Changer la durée recompose la séance immédiatement, et le réglage
  survit au changement d'écran.
- [x] Utiliser une fonctionnalité hors de la séance reste possible et sans
  erreur.

## 14. Ce que le mode laisse — et ne laisse pas — dans le journal

**Rien.** Le Programme est le premier mode purement consommateur : il lit le
journal de F3 et n'y écrit aucun évènement. Ouvrir le Programme n'est pas une
séance de pratique, et le compter comme telle fausserait ses propres calculs.
C'est vérifié explicitement (« le Programme n'écrit rien dans le journal »).

Son propre état — le budget quotidien — vit sous une clé distincte,
`synthesia.training.v2` : c'est un réglage, pas de l'historique.

## 15. Décisions ouvertes

- ~~Faut-il un chronomètre strict qui arrête automatiquement une séance après
  la durée cible ?~~ **Tranché le 27/07/2026 : non.** La durée reste indicative
  et affichée ; rien ne s'arrête tout seul, et l'écran de configuration le dit.
  Un chronomètre qui coupe au milieu d'un passage travaillé nuirait plus qu'il
  n'aiderait.
- Faut-il permettre de marquer manuellement une séance comme faite (par
  exemple une pratique réalisée hors application, sur le piano seul) ?
  (toujours ouvert : rien ne l'écrit aujourd'hui, seule une vraie séance compte)
- Faut-il permettre de mettre le programme en pause sans le supprimer
  (vacances, blessure…) ? (toujours ouvert ; en attendant, ne rien faire ne
  casse rien — il n'y a plus ni quota ni retard à rattraper)
- ~~Faut-il choisir des jours précis pour « X fois par semaine » ?~~ **Sans
  objet depuis la refonte** : il n'y a plus de fréquences par fonctionnalité,
  la rotation s'en charge (§ 5).
- Faut-il un jour de repos hebdomadaire annoncé, plutôt qu'une séance tous les
  jours ? (ouvert depuis la refonte ; en attendant, sauter un jour n'a aucune
  conséquence)
- Faut-il que la forme de la séance change avec le niveau (plus de technique
  au début, plus de morceau ensuite) ? (ouvert : les parts sont fixes
  aujourd'hui)
- Faut-il des rappels ou notifications, et selon quel mécanisme pour une
  application web sans backend ? (toujours ouvert)

## 16. Validation effectuée (27 juillet 2026, refonte du soir)

**Hors navigateur** (`training-coach.js`, `training-program.js` et
`progress/views.js`, **60 vérifications**, stockage et horloge injectés) :
forme de la séance à 20 min (4 / 4 / 8 / 4, ordre du cours, total exact) ;
**tous les budgets** de 10 à 60 min — total toujours égal au budget, jamais de
bloc sous trois minutes ; suppression des créneaux les moins prioritaires à
10 min (l'oreille part, le morceau reste) ; registre réduit à un seul mode, et
registre vide ; rotation par ancienneté dans les trois cas (jamais pratiqué en
tête, la plus ancienne ensuite, bascule quand l'ordre change) ; **stabilité du
choix dans la journée** — terminer le bloc de lecture ne change pas la
fonctionnalité choisie, seulement sa coche ; `song` ne coche pas le Morceau
mais `song-practice` oui ; séance abandonnée et séance d'hier ne cochent rien ;
séance complète ; normalisation du budget (valeur farfelue, hors bornes,
texte) ; persistance, clé v1 ignorée, stockage illisible, refusé ou absent —
le réglage reste utilisable pour la visite en cours ; bornes de journée, dont
le passage d'un mois à l'autre.

**Dans le navigateur** (Chrome headless, **56 vérifications** en six phases) :
l'accueil affiche la séance du jour (titre, budget en pastille, quatre blocs
numérotés dont les durées font 20, les quatre créneaux nommés, bouton
« Commencer · Échauffement », compteur, lien de réglage) ; **l'espace sous le
carré de la séance est mesuré** (≥ 16 px avant les modes, ≥ 16 px avant le
panneau MIDI) ; les dix modes sont rangés en quatre familles et plus aucune
carte ne porte l'étiquette « Disponible » ; le menu s'ouvre, liste les dix
modes plus l'accueil, marque l'écran courant, se ferme par Échap ; démarrer un
bloc ouvre bien le mode ; **depuis un mode, le menu bascule vers un autre mode
sans repasser par l'accueil**, la scène ne contenant jamais qu'une chose ;
l'écran Programme montre les quatre blocs avec leur raison d'être, les sept
derniers jours, les six durées ; **passer à 10 min recompose la séance en
trois blocs de 10 min au total**, réglage retrouvé sur l'accueil au retour ;
enfin une séance terminée écrite au journal coche le bloc, remplace le numéro
par une coche et fait passer le bouton à « Continuer ».

**Tous les modes** (44 vérifications) : les dix fonctionnalités s'ouvrent
depuis le menu l'une après l'autre, chacune affiche quelque chose, la scène ne
contient jamais qu'un seul écran, le menu se referme à chaque fois ; au retour
à l'accueil les contrôles du mode Morceau sont masqués et **aucune erreur JS**
n'a été levée de tout le parcours.

**Mise en page** (360×640, 390×844, 844×390, 1280×800 ; **56 vérifications**) :
aucun débordement horizontal — y compris menu ouvert et sur l'écran
Programme —, aucune page qui défile, la séance du jour visible sans défiler,
l'espace sous le carré présent à toutes les tailles, le tiroir du menu tenant
dans la largeur (min(300 px, 82 vw)), et **aucune cible sous 30 px** : blocs,
bouton principal, cartes, entrées de menu et boutons de durée.

**Reste à faire à la main** : le toucher réel sur la tablette, et l'observation
de la séance sur plusieurs jours réels — la bascule de journée et la rotation
sur une semaine ne sont vérifiées qu'avec une horloge injectée.

### Validation de la première version (27 juillet 2026, matin)

Conservée pour mémoire : 99 vérifications hors navigateur et 76 dans Chrome
sur le modèle « fonctionnalités cochées, fréquences, quotas », plus 52 de mise
en page. Ces harnais **ne sont plus rejouables tels quels** — c'est l'exception
prévue par la règle « un harnais qu'il faut réécrire ne mesure plus rien » :
ils mesuraient un modèle que l'utilisateur a explicitement rejeté, pas une
implémentation.

## 17. Première priorité — atteinte, puis dépassée

Première version : **configurer une fonctionnalité en « Tous les jours » →
écran Aujourd'hui → démarrer → terminer → la retrouver cochée.** Atteinte le
27/07/2026 au matin.

Après refonte, la boucle est plus courte d'un cran, et c'est tout l'objet :
**ouvrir l'application → sa séance est déjà écrite → Commencer → terminer →
revenir et trouver le bloc coché, avec « Continuer » sur le suivant.** Plus
aucune configuration n'y figure.

## 18. Ce qui n'a pas été fait, et pourquoi

- **Aucune vue de progression n'est affichée.** Le Programme dit ce qu'il reste
  à faire, pas comment on progresse : les cinq autres vues de
  [F3 § 6](F3-suivi-progression.md#6-les-six-vues-attendues) restent à l'étape B.
  Seule celle dont 04 avait réellement besoin — l'historique des séances — a été
  écrite, conformément à la règle du dossier : pas d'extraction préventive.
- **Aucune durée réellement passée n'est affichée**, bien que
  `sessionMinutes()` sache la calculer. La comparer à la durée indicative
  reviendrait à noter la séance, ce que le § 10 refuse pour l'instant.
- **Pas de séance marquée manuellement, pas de mise en pause** : ce sont des
  décisions encore ouvertes (§ 15), pas des oublis.
- **La forme de la séance ne s'adapte pas encore au niveau ni aux résultats.**
  Les parts sont fixes et la rotation ne regarde que l'ancienneté, pas la
  réussite. `progress/review.js` sait déjà dire ce qui est le plus raté : c'est
  le prochain candidat naturel, le jour où l'usage montrera que l'ancienneté
  seule ne suffit pas. Le § 3 l'écartait explicitement de cette version.
