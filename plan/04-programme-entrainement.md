# Feature 04 — Programme d'entraînement

> Statut : **la boucle complète fonctionne** depuis le 27/07/2026 — créer un
> programme, voir ce qu'il reste à faire aujourd'hui, démarrer une séance
> planifiée, et la retrouver cochée au retour. Le programme ne tient **aucun**
> historique : il lit celui de [F3](F3-suivi-progression.md), dont il est le
> premier consommateur réel.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir le principe du programme (fonctionnalités, fréquence, durée).
- [x] Définir le calcul des séances dues du jour.
- [x] Ajouter l'accès au Programme d'entraînement depuis la navigation.
- [x] Implémenter la configuration du programme.
- [x] Implémenter l'écran Aujourd'hui et le démarrage d'une séance planifiée.
- [x] Enregistrer une séance comme terminée à la fin naturelle de la
  fonctionnalité. (rien n'a été ajouté : c'est le `session-end` en `done` que
  chaque fonctionnalité écrivait déjà — cf. section 11)
- [x] Tester les trois types de fréquence et le passage de semaine/mois.

## 1. Problème utilisateur

L'utilisateur doit aujourd'hui se souvenir seul de ce qu'il devrait
pratiquer, à quelle fréquence, et combien de temps y consacrer. Sans plan, il
risque de toujours refaire la même fonctionnalité, d'oublier certains points
de travail (main gauche, technique, lecture de notes) ou de ne pas savoir
combien de temps donner à chaque séance.

## 2. Objectif

Permettre à l'utilisateur de construire un programme d'entraînement
personnel — quelles fonctionnalités, à quelle fréquence, combien de temps par
séance — puis d'être guidé au quotidien vers la ou les séances à faire.

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

1. L'utilisateur ouvre « Programme » depuis la navigation (F1).
2. S'il n'a pas encore de programme, l'application propose d'en créer un.
3. L'utilisateur choisit une ou plusieurs fonctionnalités disponibles à
   inclure.
4. Pour chaque fonctionnalité choisie, l'utilisateur définit une fréquence
   (tous les jours / X fois par semaine / X fois par mois) et une durée
   indicative par séance.
5. L'application enregistre le programme et affiche l'écran « Aujourd'hui »
   avec les séances prévues du jour.
6. L'utilisateur démarre une séance planifiée directement depuis cet écran
   → l'application lance la fonctionnalité concernée (via F1).
7. À la fin naturelle de la séance (bilan de la fonctionnalité), revenir au
   programme la montre marquée comme faite.

C'est exactement le parcours vérifié le 27/07/2026 (§ 16), fréquences
hebdomadaire et mensuelle comprises.

## 5. Réglages d'un élément de programme

- **Fonctionnalité** : une des fonctionnalités disponibles (Morceau,
  Lecture de notes, Exercices, Rythme).
- **Fréquence** : Tous les jours, ou X fois par semaine, ou X fois par mois.
- **Durée indicative par séance** : en minutes (5 à 60, par pas de 5).

Une même fonctionnalité ne peut apparaître qu'une seule fois dans le
programme, pour ne pas avoir deux fréquences contradictoires sur la même
fonctionnalité.

## 6. Modèle de données — figé le 27/07/2026

```js
// Clé `synthesia.training.v1` : { v: 1, items: [...] }
const trainingProgram = [
  {
    featureId: "note-reading",
    frequency: { type: "daily" },
    sessionDurationMinutes: 10,
  },
  {
    featureId: "technique",
    frequency: { type: "weekly", timesPerWeek: 3 },
    sessionDurationMinutes: 15,
  },
  {
    featureId: "song",
    frequency: { type: "monthly", timesPerMonth: 8 },
    sessionDurationMinutes: 20,
  },
];
```

Il n'y a **pas** de `completedSessions` : le tableau prévu par les premières
versions de ce plan n'a jamais été écrit. F3 possède le journal des séances
terminées, et ce programme le **lit** (voir
[F3 § 5](F3-suivi-progression.md#5-chevauchement-avec-le-programme-dentraînement-04)) :
`completedSessions` est devenu une **vue**, `progress/views.js`, filtrée par
fonctionnalité et par période. Tenir un second historique aurait fait deux
sources de vérité pour la même question.

Deux précisions apparues en écrivant :

- **`featureId` du registre ≠ `featureId` du journal.** Écouter un morceau
  n'est pas une séance de travail : c'est le passage travaillé qui en est une, et
  il s'écrit sous `song-practice` ([06](06-travail-intelligent-morceau.md#12-découpage-technique--fait-le-26072026)).
  Une table `SESSION_FEATURE_IDS` dit donc quels identifiants du journal
  satisfont une entrée du programme — `song` → `["song-practice"]`. Les autres
  fonctionnalités écrivent sous leur propre identifiant et n'ont rien à y
  déclarer ;
- **aucun programme ≠ programme vide.** Le premier ouvre l'écran de création,
  le second est un programme enregistré dont on a tout retiré, et qui reste
  modifiable. Sans cette distinction, vider son programme rouvrirait l'écran
  de bienvenue à chaque visite.

## 7. Calcul des séances dues du jour

- **Tous les jours** : toujours dû aujourd'hui, sauf s'il existe déjà une
  séance complétée pour ce jour calendaire.
- **X fois par semaine** : dû aujourd'hui si le nombre de séances complétées
  depuis le début de la semaine (lundi à dimanche) est strictement inférieur
  à X. Aucune répartition imposée entre les jours de la semaine : l'
  utilisateur choisit librement quand faire les X séances.
- **X fois par mois** : même principe sur le mois calendaire en cours.

Une fonctionnalité disparaît de la liste « à faire aujourd'hui » dès que son
quota de la période est atteint, mais le programme reste consultable et
modifiable même un jour où tout est déjà fait.

## 8. Écran « Aujourd'hui »

Affiché :

- la liste des séances prévues, avec la fréquence, la durée indicative et,
  au-delà d'une séance attendue par période, le compteur `2 / 3 cette semaine` ;
- trois états : **À faire**, **Fait** (une séance aujourd'hui) et **Quota
  atteint** (le compte de la période est plein, mais rien n'a été fait
  aujourd'hui) ;
- un bouton par ligne : **Démarrer**, ou **Refaire** quand il ne reste rien à
  faire — pratiquer plus que prévu n'est jamais empêché ;
- une phrase « Tout est fait pour aujourd'hui » quand plus rien n'est dû : une
  liste entièrement cochée ne le dit pas assez ;
- l'accès à la configuration du programme.

### Le même ordre du jour sur l'accueil — 27/07/2026

Ouvrir l'application et devoir cliquer « Programme » pour savoir quoi faire
était un pas de trop : le panneau **« Aujourd'hui »** de l'accueil
(`src/today-panel.js`) affiche désormais le même ordre du jour, en tête de
l'écran d'accueil, au-dessus des cartes.

Il ne duplique aucune règle : il appelle `dueToday()` de
`training-program.js` avec le journal de F3, exactement comme cet écran-ci.
Ce qui lui est propre est uniquement de l'affichage :

- une **coche verte** par séance faite, la ligne passant en gris — l'état se
  lit sans lire ;
- les séances faites sont **reléguées en bas de liste**, celles à faire
  restant en haut ;
- le bandeau vert « Tout est fait pour aujourd'hui » remplace le compteur
  quand plus rien n'est dû ;
- une séance faite reste **cliquable** : pratiquer plus que prévu n'est jamais
  empêché, ici comme sur l'écran de 04 ;
- **avant toute configuration**, le panneau propose le programme par défaut de
  `defaultItem()` plutôt qu'un vide, en indiquant qu'il est personnalisable.

L'écran Programme garde ce que le panneau n'a pas : la configuration, les
fréquences détaillées et les libellés « Quota atteint ». Le panneau se
recalcule à chaque retour à l'accueil, puisque l'accueil est reconstruit à
chaque fois (F1) — une séance terminée s'y voit donc cochée immédiatement.

## 9. Écran de configuration du programme

- liste des fonctionnalités disponibles (issues du registre F1), chacune avec
  un bouton d'inclusion ;
- pour chaque fonctionnalité incluse : fréquence (trois boutons), nombre de
  séances par période (sauf en quotidien) et durée, réglés par des `+ / −` ;
- retrait d'une fonctionnalité à tout moment ;
- **Enregistrer** / **Annuler**, et des valeurs par défaut plutôt qu'un
  formulaire vide : Lecture de notes tous les jours (10 min), Exercices 3 fois
  par semaine (15 min), Rythme 2 fois par semaine (10 min), Morceau tous les
  jours (20 min).

À la toute première création, **tout est proposé coché** : construire un
programme depuis un écran vide demanderait de tout régler avant de voir quoi
que ce soit d'utile. Ensuite, seul ce qui est enregistré revient coché.

## 10. Règles de comportement

- Un programme ne peut inclure que des fonctionnalités réellement
  disponibles dans le registre F1.
- **Le Programme ne se planifie pas lui-même** : il n'apparaît pas dans sa
  propre liste.
- Une fonctionnalité ne peut être présente qu'une fois dans le programme.
- La semaine de référence commence le lundi ; le mois de référence est le
  mois calendaire en cours. Tout est calculé en **heure locale** : la journée
  de pratique de l'utilisateur n'est pas celle d'UTC.
- Une séance est comptée comme faite uniquement quand la fonctionnalité
  associée est allée jusqu'à sa fin naturelle — un `session-end` en `done`.
  Ouvrir puis quitter aussitôt laisse un `abandoned`, qui ne compte pour rien.
- La durée indicative reste une durée cible affichée à l'utilisateur, pas un
  chronomètre qui interrompt automatiquement la séance.
- Utiliser une fonctionnalité en dehors du programme reste toujours possible
  depuis l'écran d'accueil (F1) et ne doit jamais être bloqué ni faussé par
  le programme.

## 11. Découpage technique — fait le 27/07/2026

```text
src/
  training-program.js       # modèle, fréquences, séances dues, persistance — sans DOM
  training-mode.js          # les deux écrans (Aujourd'hui, configuration), en DOM
  progress/views.js         # vue « historique des séances » du journal F3 (sans DOM)
```

**`training-log.js` n'existe pas**, contrairement à ce que ce plan proposait :
c'était le second historique que [F3 § 5](F3-suivi-progression.md#5-chevauchement-avec-le-programme-dentraînement-04)
avait justement écarté. Le programme lit `progress/views.js`, qui reconstitue
les séances à partir des paires `session-start` / `session-end` du journal.

Ce qui n'a **pas** été écrit pour l'occasion, et c'est le point important :

- **aucune fonctionnalité n'a été modifiée.** Le journal contenait déjà tout ce
  qu'il fallait — une séance terminée est un `session-end` en `done`, format figé
  le 25/07/2026. Brancher 04 n'a demandé aucun champ nouveau, aucune migration,
  et aucune ligne dans 02, 03, 05 ou 06. C'est précisément ce que le découpage
  de F3 en deux temps cherchait à obtenir ;
- **le registre n'est pas dupliqué.** `navigation.js` expose `availableFeatures()`,
  et le mode s'en sert pour la liste comme pour les titres. Une fonctionnalité
  retirée du registre disparaît du programme à la lecture, sans migration ;
- **le rendu est en DOM**, comme la Lecture de notes et le Rythme : rien ne
  défile, rien ne sonne, donc aucune boucle d'animation et des cibles tactiles
  franches (CLAUDE.md, contraintes matérielles).

### Décisions prises en écrivant

- **Le Programme n'a aucune présence pendant une séance.** Démarrer quitte le
  mode par `switchTo()` ; il n'observe rien, ne pose aucun rappel, et se met à
  jour à sa réouverture. Le journal fait foi : une séance faite depuis l'accueil
  compte exactement autant qu'une séance lancée depuis l'écran Aujourd'hui.
  L'alternative — garder le programme actif en fond pour « ramener » à la fin de
  la séance — aurait fait vivre deux modes à la fois, ce que le contrat
  `start` / `stop` de [F1](F1-navigation.md) interdit.
- **Le Programme ouvre la liste des fonctionnalités** dans `main.js` : c'est lui
  qui dit par quoi commencer, il a donc la première carte.
- **Le brouillon de configuration garde les réglages des lignes décochées.**
  Décocher puis recocher ne doit pas effacer ce qu'on venait de régler. Seules
  les lignes cochées sont enregistrées.
- **Le bouton reste proposé quand tout est fait**, sous le libellé « Refaire ».
  Un programme qui empêche de pratiquer davantage serait absurde.
- **Le Morceau porte une mention explicite** — « Compte quand un passage est
  travaillé (bouton Travail) » — sur les deux écrans. C'est la seule
  fonctionnalité dont la séance ne va pas de soi, et le § 6 explique pourquoi.
- **Changer de type de fréquence garde un nombre plausible** : passer de « 3 fois
  par semaine » à « X fois par mois » propose 12, pas 1.

## 12. Étapes de réalisation

### Étape A — Fondations — **faite le 27/07/2026**

- [x] Définir le modèle de données du programme (section 6).
- [x] ~~Définir le format du journal minimal des séances terminées.~~ Sans
  objet : le journal est celui de F3, et la vue `completedSessions` le lit.
- [x] Définir la règle de calcul des séances dues (section 7).

### Étape B — Interface — **faite le 27/07/2026**

- [x] Créer l'écran de configuration du programme.
- [x] Créer l'écran « Aujourd'hui ».
- [x] Ajouter l'accès au Programme d'entraînement depuis la navigation (F1).
- [x] Permettre de démarrer une séance planifiée directement depuis
  l'écran Aujourd'hui.

### Étape C — Logique — **faite le 27/07/2026**

- [x] Calculer les séances dues aujourd'hui pour chaque type de fréquence.
- [x] Enregistrer une séance comme terminée à la fin naturelle de la
  fonctionnalité. (rien à ajouter : les fonctionnalités le faisaient déjà)
- [x] Gérer l'ajout et le retrait d'une fonctionnalité du programme.
- [x] Empêcher la planification d'une fonctionnalité non disponible.

### Étape D — Validation — **faite le 27/07/2026**

- [x] Tester les trois types de fréquence (quotidien, hebdomadaire,
  mensuel).
- [x] Tester le passage à une nouvelle semaine et à un nouveau mois (remise
  à zéro des compteurs).
- [x] Tester un programme sans rien de prévu aujourd'hui.
      (l'état « tout est fait » est vérifié dans le navigateur ; le programme
      *vide*, lui, ne l'est que hors navigateur — voir § 16)
- [x] Vérifier qu'une utilisation hors programme n'endommage pas le suivi.
- [x] Vérifier la lisibilité sur petite largeur d'écran.

## 13. Critères d'acceptation

- [x] L'utilisateur peut créer un programme avec au moins une
  fonctionnalité, une fréquence et une durée.
- [x] L'écran Aujourd'hui reflète correctement la fréquence choisie pour
  chaque fonctionnalité.
- [x] Terminer une séance planifiée la marque comme faite pour la journée.
  (vérifié en jouant réellement dix questions de Lecture de notes jusqu'au
  bilan, pas en fabriquant l'évènement)
- [x] Une fonctionnalité en « X fois par semaine » n'apparaît plus comme due
  une fois le quota atteint pour la semaine en cours.
- [x] Le programme peut être modifié (ajout, retrait, changement de
  fréquence ou de durée) à tout moment.
- [x] Utiliser une fonctionnalité hors du programme reste possible et sans
  erreur.

## 14. Ce que le mode laisse — et ne laisse pas — dans le journal

**Rien.** Le Programme est le premier mode purement consommateur : il lit le
journal de F3 et n'y écrit aucun évènement. Ouvrir le Programme n'est pas une
séance de pratique, et le compter comme telle fausserait ses propres calculs.
C'est vérifié explicitement (« le Programme n'écrit rien dans le journal »).

Son propre état — le programme — vit sous une clé distincte,
`synthesia.training.v1` : ce sont des réglages, pas de l'historique.

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
  (vacances, blessure…) ? (toujours ouvert ; en attendant, décocher toutes les
  lignes laisse un programme vide, qui n'est pas un programme perdu — § 6)
- Faut-il, plus tard, choisir des jours précis pour « X fois par semaine »,
  plutôt qu'un nombre réparti librement dans la semaine ? (toujours ouvert)
- Faut-il des rappels ou notifications, et selon quel mécanisme pour une
  application web sans backend ? (toujours ouvert)

## 16. Validation effectuée (27 juillet 2026)

**Hors navigateur** (`training-program.js` et `progress/views.js`, 99
vérifications, stockage et horloge injectés) : reconstitution des séances à
partir du journal (paire d'évènements, `session-end` orphelin après passage du
plafond, filtrage par fonctionnalité et par période, tri, durée réelle), bornes
de jour, de semaine et de mois en heure locale, quotas et libellés, changement
de type de fréquence, normalisation d'un programme relu (version inconnue,
contenu illisible, doublons, fonctionnalité disparue du registre), les trois
fréquences dans tous leurs cas — séance d'hier, séance abandonnée, quota
atteint, passage à la semaine et au mois suivants, pratique d'une autre
fonctionnalité — et persistance, y compris programme vidé, stockage refusé et
stockage absent, où le programme reste utilisable pour la visite en cours.

**Dans le navigateur** (Chrome headless, 76 vérifications en cinq phases
séparées par de vrais rechargements de page) :

- **Création** : l'accueil propose bien cinq cartes, Programme en tête ; la
  configuration liste les quatre autres fonctionnalités et jamais elle-même,
  tout coché, réglages par défaut en place ; le quotidien n'affiche aucun nombre
  de séances à régler, l'hebdomadaire si ; bornes de durée (5 min) respectées.
- **Séance réelle** : démarrer depuis l'écran Aujourd'hui ouvre bien la Lecture
  de notes et libère la scène ; **dix questions sont réellement jouées jusqu'au
  bilan**, et c'est le `session-end` en `done` du journal — pas un compteur du
  programme — qui fait passer la ligne à « Fait ».
- **Fréquences** : ouvrir puis quitter aussitôt les Exercices les laisse « À
  faire » et le compteur de semaine à zéro ; deux séances terminées cette
  semaine les font passer à « Quota atteint · 2 / 2 » sans les rendre
  indémarrables ; une séance écrite sous `song` ne coche pas le Morceau, une
  séance `song-practice` oui — et l'écran affiche alors « Tout est fait ».
- **Modification** : annuler ne change rien ; le Rythme entre en mensuel, le
  Morceau sort, et le programme enregistré suit.
- **Stockage refusé** : l'écran de création s'ouvre, le programme se règle et
  s'utilise pour la visite en cours, l'utilisateur est prévenu que rien n'est
  enregistré, et une séance se lance quand même.
- **Non-régression et arrêt propre** : les quatre autres modes s'ouvrent
  toujours, les contrôles du mode Morceau sont masqués après arrêt, la scène ne
  contient plus rien après retour à l'accueil et rien ne se restaure après coup ;
  le Transport est resté stoppé et sa boucle à faux.

**Mise en page** (360×640, 390×844, 844×390, 1280×800 ; 52 vérifications, avec
un programme chargé de quatre fonctionnalités dont une déjà faite) : aucun
débordement horizontal, aucune page qui défile, chaque ligne de séance tient
dans sa largeur, les réglages se replient au lieu de déborder, aucune valeur
tronquée, et **aucune cible sous 30 px** — 36 px pour les boutons Démarrer,
30 px minimum dans la configuration.

**Non-régression des campagnes précédentes** — tous les harnais rejoués tels
quels : 753 vérifications hors navigateur et 1 007 dans Chrome (Exercices,
Rythme, MIDI, Morceau et les trois harnais de mise en page), aucune régression.
Une seule interruption, non reproductible au tour suivant : la phase 3 du
Rythme, qui frappe un motif en temps réel contre une pulsation vivante et
dépend donc de la charge de la machine.

**Reste à faire à la main** : le toucher réel sur la tablette, et l'observation
du programme sur plusieurs jours réels — la bascule de journée, de semaine et de
mois n'est vérifiée qu'avec une horloge injectée.

## 17. Première priorité — atteinte

Construire une boucle complète avec une seule fréquence : **configurer une
fonctionnalité en « Tous les jours » avec une durée → voir l'écran
Aujourd'hui → démarrer la séance → la terminer → revenir au programme et
constater qu'elle est marquée comme faite.** C'est le parcours de la phase 2 du
harnais, et les fréquences hebdomadaire et mensuelle ont suivi dans la foulée.

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
