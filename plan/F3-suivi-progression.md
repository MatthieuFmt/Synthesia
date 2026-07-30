# Fondation F3 — Suivi de progression

> Statut : **étape A faite** (25/07/2026). Le format d'évènement est figé (§ 7),
> le journal est persisté dans `localStorage` et la Lecture de notes est sa
> première productrice de données. Les vues (étapes B à E) restent à construire ;
> seules les révisions adaptées existent, dans leur forme minimale.
>
> Le format a tenu à l'épreuve de deux productrices supplémentaires, le
> 26/07/2026, sans qu'un champ ni un `outcome` ait eu à être ajouté : les
> Exercices techniques écrivent des `repetition` en `outcome: "none"`
> ([03 § 15](03-technique-doigts.md#15-ce-que-la-séance-laisse-dans-le-journal)),
> et l'Entraînement rythmique des `answer` **et** des `beat` — les premiers
> `beat` du journal, avec la mesure brute dans `given: { deviationMs }` comme le
> § 7 le prévoyait
> ([05 § 14](05-entrainement-rythmique.md#14-ce-que-la-séance-laisse-dans-le-journal)).
>
> Le 27/07/2026, le journal a trouvé son **premier consommateur extérieur** : le
> Programme d'entraînement (04) calcule ses séances dues à partir de lui, via la
> première vue de `progress/views.js`. Le pari du § 3 est tenu — brancher une
> fonctionnalité qui *lit* n'a demandé aucun champ nouveau, aucune migration, et
> aucune modification des fonctionnalités qui *écrivent*.
>
> Le même jour, les **étapes B à E** ont été menées : les six vues du § 6
> existent, un écran de progression les affiche (carte « Progression » de
> l'accueil), les révisions tiennent compte du « moins vu récemment », et
> l'utilisateur peut exporter puis effacer ses données. Le pari a tenu une
> seconde fois : tout s'est calculé sur le journal tel qu'il était — aucun
> champ ajouté, aucune migration, aucune fonctionnalité productrice modifiée.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir le principe journal d'évènements + vues calculées.
- [x] Définir qui produit et qui consomme les données.
- [x] Trancher le chevauchement avec l'historique du Programme d'entraînement.
- [x] Définir et figer le format d'un évènement (à faire tôt).
- [x] Implémenter la persistance locale.
- [x] Implémenter les vues de progression.
  (les six vues du § 6 existent dans `progress/views.js` : l'historique des
  séances — écrit d'abord pour 04 —, puis notes confondues, exercices
  maîtrisés, tempo maximal propre et évolution par main, écrites le 27/07/2026
  quand l'écran de progression est devenu leur premier consommateur réel)
- [x] Implémenter les révisions adaptées aux erreurs précédentes.
  (les notes les plus ratées reviennent plus souvent, et le volet « les moins
  vues récemment » est en place depuis l'étape D : léger surpoids d'ancienneté,
  toujours plus petit que celui d'une erreur)

## 1. Pourquoi c'est une fondation et pas une fonctionnalité

L'utilisateur ne « fait » pas du suivi de progression comme il fait un
exercice : chaque fonctionnalité produit des résultats, et cette brique les
conserve, les agrège et les renvoie. Six fonctionnalités sont concernées, et
si chacune inventait son propre stockage, il serait impossible d'afficher une
progression cohérente ou d'adapter les révisions.

Aujourd'hui, rien n'est conservé : fermer l'onglet efface tout. Plusieurs
plans ont déjà laissé cette question ouverte —
[01](01-apprentissage-morceau.md#décisions-à-prendre-avant-la-prochaine-évolution)
(« définir les données de progression à conserver localement »),
[02 étape D](02-lecture-notes.md#étape-d--progression) (« enregistrer
localement les résultats et le dernier niveau ») et
[04](04-programme-entrainement.md#6-modèle-de-données-proposé) (qui note
explicitement que son journal minimal ne remplace pas un suivi détaillé).
C'est ce plan qui y répond, une fois pour toutes.

## 2. Objectif

Conserver localement ce que l'utilisateur a réellement travaillé, en tirer des
vues utiles (ce qui est acquis, ce qui est confondu, où il progresse) et
permettre aux exercices de revenir en priorité sur ses erreurs passées.

## 3. Principe retenu : journal d'évènements + vues calculées

Deux couches nettement séparées :

1. **Le journal** : une liste d'évènements bruts, ajoutés au fil de la
   pratique et jamais modifiés (une réponse à une question, une répétition
   d'exercice, une séance terminée).
2. **Les vues** : tout le reste est **calculé** à partir du journal (notes
   confondues, exercices maîtrisés, tempo maximal propre, évolution par
   main).

C'est ce qui rend le suivi extensible : ajouter une vue ne demande aucune
migration de données, et une fonctionnalité qui produit des évènements
n'a pas à savoir comment ils seront exploités. À l'inverse, stocker
directement des compteurs agrégés obligerait à tout recalculer — ou à tout
perdre — dès qu'une règle change.

Conséquence importante sur l'ordre des travaux : **le format d'évènement doit
être figé tôt**, dès la première fonctionnalité qui produit des résultats
(la Lecture de notes), même si les vues ne sont construites que bien plus
tard. Ajouter le suivi après coup obligerait à repasser dans chaque
fonctionnalité.

## 4. Qui produit, qui consomme

| Fonctionnalité | Produit | Consomme |
| --- | --- | --- |
| [02 — Lecture de notes](02-lecture-notes.md) | Réponses par note, main, clé, niveau ✅ | Notes à revoir en priorité ✅ |
| [03 — Exercices techniques](03-technique-doigts.md) | Répétitions, tempo, main, exercice ✅ | Exercices maîtrisés, tempo atteint |
| [05 — Entraînement rythmique](05-entrainement-rythmique.md) | Jugements de timing par frappe, et réponses de Reconnaissance ✅ | Motifs à revoir, tendance avance/retard |
| [06 — Travail d'un morceau](06-travail-intelligent-morceau.md) | Exécutions propres par passage, tempo | Passages maîtrisés, meilleur tempo propre |
| [07 — Oreille](07-entrainement-oreille.md) | Réponses par note et par intervalle | Intervalles confondus |
| [08 — Lecture de partitions](08-lecture-partitions.md) | Réponses par note, durée, altération | Difficultés de lecture à revoir |
| [09 — Pédale](09-pedale.md) | Verdicts de changement de pédale | Types d'erreur récurrents |
| [04 — Programme d'entraînement](04-programme-entrainement.md) | Rien : c'est le seul consommateur pur | Historique des séances (section 5) ✅ |

## 5. Chevauchement avec le Programme d'entraînement (04)

L'« historique des séances » figure à la fois ici et dans le modèle de 04, qui
définit un tableau `completedSessions`. Décision retenue, pour éviter deux
sources de vérité :

- **F3 possède** le journal des séances terminées ;
- **04 le lit** pour calculer ses séances dues du jour, au lieu de tenir son
  propre journal ;
- le `completedSessions` décrit dans
  [04 § 6](04-programme-entrainement.md#6-modèle-de-données-proposé) devient
  une **vue** de F3, filtrée par fonctionnalité et par période.

Si F3 n'existe pas encore au moment où 04 est construit, 04 peut démarrer avec
son journal minimal, à condition que son format soit celui d'un évènement F3 —
sinon la reprise coûtera une migration.

## 6. Les vues attendues

Reprise directe des besoins exprimés :

| Vue | Calcul | Sert à |
| --- | --- | --- |
| **Notes souvent confondues** | Pour chaque note attendue, les réponses données à la place, les plus fréquentes d'abord | Montrer « tu confonds La et Fa », alimenter les révisions |
| **Exercices maîtrisés** | Exercice réussi proprement plusieurs fois, sur au moins deux séances distinctes | Distinguer l'acquis du réussi une fois |
| **Tempo maximal joué proprement** | Le plus haut tempo avec une exécution propre, par exercice ou par passage | Reprendre au bon tempo, mesurer un progrès réel |
| **Évolution par main** | Précision et tempo dans le temps, séparés main droite / main gauche | Voir la main en retard, souvent la gauche |
| **Historique des séances** | Séances terminées, avec date, fonctionnalité et durée | Constater la régularité, alimenter 04 |
| **Révisions adaptées** | Éléments les plus ratés et les moins vus récemment | Générer les questions des séances suivantes |

Règle transversale, déjà posée ailleurs dans le dossier : **un élément n'est
« acquis » qu'après plusieurs réussites espacées, pas après une seule**
([02 § 5](02-lecture-notes.md#5-règles-pédagogiques-du-mvp)). Et aucune
métrique n'est affichée si l'entrée correspondante n'a pas été mesurée
([03 § 9](03-technique-doigts.md#9-retour-et-bilan)).

### Une septième, écrite le 30/07/2026 : *ce qui n'a pas été travaillé depuis le plus longtemps*

`leastRecentlyPracticed(log, { candidates, featureIds, clefDe })` et son pendant
`practicedAt()`. Elle n'était pas prévue par ce plan, et c'est **volontaire** :
la règle du projet est d'écrire une vue le jour où quelqu'un la demande, pas
d'avance. Ce jour est arrivé quand le catalogue du mode Exercices est passé de
huit à quatre-vingt-dix-neuf entrées — jusque-là, « quel exercice proposer ? »
n'était pas une question.

Ce qu'elle corrige est un vrai défaut, pas un raffinement : le mode Exercices
rouvrait le **dernier** exercice pratiqué, et le Programme choisit une
fonctionnalité et non un exercice. Bout à bout, l'application proposait le même
exercice tous les jours, indéfiniment.

Elle est générique par construction : `clefDe` dit comment reconnaître un
candidat dans le contexte d'une séance. Les exercices s'identifient par
`exerciseId` ; un morceau s'identifierait par son fichier. Un candidat jamais
travaillé passe avant tous les autres — découvrir ce qu'on n'a jamais fait vaut
mieux que revoir ce qu'on a fait il y a longtemps.

## 7. Modèle de données — **figé le 25/07/2026**

Un seul journal, une seule forme d'entrée. Une séance n'est pas une seconde
structure : c'est une paire d'évènements `session-start` / `session-end` dans
ce même journal.

```js
// Une entrée du journal : ce qui s'est passé, jamais recalculée ni modifiée.
const progressEvent = {
  at: 1785000000000,          // ms epoch
  sessionId: 1785000000000,   // le `at` du session-start de la séance
  featureId: "note-reading",
  type: "answer",             // cf. tableau ci-dessous
  target: { midi: 65, clef: "treble", hand: "right" }, // libre selon la feature
  outcome: "wrong",           // vocabulaire fermé, cf. tableau ci-dessous
  given: { midi: 69 },        // ce qui a été donné à la place, si pertinent
};

// Bornes d'une séance : mêmes champs, sans `target` ni `given`.
const start = {
  at: 1785000000000,
  sessionId: 1785000000000,
  featureId: "note-reading",
  type: "session-start",
  context: { difficulty: "intermediate", handMode: "both", questionCount: 10 },
};

const end = {
  at: 1785000660000,
  sessionId: 1785000000000,
  featureId: "note-reading",
  type: "session-end",
  outcome: "done",            // "done" = arrivé au bilan | "abandoned"
  context: { answeredQuestions: 10 },
};
```

### Les cinq `type`

| `type` | Signification | Produit par |
| --- | --- | --- |
| `answer` | **Une tentative** de réponse, juste ou fausse | 02, **05** (Reconnaissance), 07, 08 |
| `beat` | Un jugement de timing sur une frappe ou un changement de pédale | 05, 09 |
| `repetition` | Une répétition d'exercice effectuée | 03 |
| `run` | Une exécution complète d'un exercice ou d'un passage | 03, 06 |
| `session-start` / `session-end` | Bornes d'une séance | toutes |

### Le vocabulaire fermé des `outcome`

| Famille | Valeurs | Utilisée par |
| --- | --- | --- |
| Réponse jugée | `correct`, `wrong` | 02, 07, 08 |
| Timing | `on-time`, `early`, `late`, `missed` | 05, 09 |
| Exécution | `clean`, `flawed` | 03, 06 |
| Pédale | `blurred`, `gap` (+ `missed`) | 09 |
| Séance | `done`, `abandoned` | toutes |
| Non mesuré | `none` | 03 en pratique libre |

`target` reste libre selon la fonctionnalité (une note, un exercice, un
passage, un intervalle, un changement de pédale) : c'est ce qui permet
d'ajouter une fonctionnalité sans changer le format. `outcome`, à l'inverse,
est un vocabulaire fermé : sans lui, les vues ne peuvent plus rien calculer de
commun. Une valeur nouvelle s'ajoute au tableau ci-dessus, jamais à la volée.

### Quatre décisions structurantes

1. **Une tentative = un évènement**, pas une question ni une session. C'est le
   seul niveau qui conserve `given` — ce qui a été joué *à la place* —, sans
   quoi la vue « notes souvent confondues » de la section 6 est impossible.
   Coût réel mesuré : environ 14 évènements par session de Lecture de notes.
2. **Un journal unique.** Le `sessionRecord` séparé des premières versions de
   ce plan est abandonné : deux structures, c'était deux formats à versionner,
   deux compactions et un risque de désynchronisation. L'historique des
   séances redevient une vue comme les autres.
3. **Le constant va dans `session-start`, pas sur chaque évènement.** Niveau,
   réglage de main, tempo choisi : tout ce qui ne varie pas pendant la séance
   n'est écrit qu'une fois. Un `context` répété sur chaque évènement pesait un
   tiers du journal pour rien.
4. **`at` en millisecondes**, pas en ISO : deux fois plus court et directement
   comparable.

### Degrés et seuils : jamais dans l'`outcome`

[05 § 5](05-entrainement-rythmique.md#5-mesurer-la-précision-temporelle)
distingue une avance *légère* d'une avance *nette*. Ce degré n'entre pas dans
le vocabulaire : l'évènement porte la mesure brute
(`given: { deviationMs: -180 }`) et la vue applique les seuils. Un seuil qui
change ne doit jamais invalider un journal déjà écrit.

## 8. Stockage

L'application est entièrement statique (aucun serveur : `index.html` et un
`songs.json` chargé par `fetch`). Le stockage est donc **local au
navigateur** :

- `localStorage` suffit pour le volume attendu, mais sa capacité est limitée
  (quelques mégaoctets) : le journal ne peut pas grossir indéfiniment ;
- prévoir une **compaction** : au-delà d'un certain âge, remplacer les
  évènements détaillés par des totaux par période, en conservant les vues ;
- une seule personne par navigateur : pas de comptes, pas de profils
  multiples dans cette version ;
- les données doivent être **effaçables** par l'utilisateur, et idéalement
  **exportables** (fichier JSON) — c'est la seule sauvegarde possible sans
  serveur, et changer de navigateur ou vider son cache efface tout. Ce
  point doit être dit clairement à l'utilisateur.

Décisions d'implémentation prises avec le format (25/07/2026) :

- **une seule clé**, `synthesia.progress.v1`, contenant `{ v: 1, log: [...] }` ;
  la version est celle du document, pas de chaque évènement ;
- **plafond de 4 000 évènements** en attendant la compaction de l'étape E : les
  plus anciens sont retirés en premier. À ~14 évènements par session de Lecture
  de notes, cela représente plusieurs mois de pratique quotidienne, pour environ
  600 Ko ;
- **écriture groupée** : les évènements s'accumulent en mémoire et le journal
  n'est réécrit qu'au plus une fois par seconde et demie, plus un enregistrement
  forcé à la fin d'une séance et au masquage de la page. Sur la tablette, écrire
  le journal entier à chaque touche pressée coûterait bien plus que l'exercice
  lui-même ;
- **un stockage refusé, plein ou illisible ne casse jamais l'exercice** : la
  séance continue en mémoire, seule la persistance est perdue. Sur un quota
  dépassé, la moitié la plus ancienne du journal est abandonnée et l'écriture
  retentée une fois.

## 9. Découpage technique proposé

```text
src/
  progress/
    store.js        # écriture du journal, lecture, compaction, export/effacement [fait]
    views.js        # les six vues de la section 6                            [fait]
    review.js       # sélection des éléments à revoir en priorité              [fait]
  progress-mode.js  # écran de progression : les vues + export/effacement      [fait]
```

Ces modules ne doivent **jamais** dépendre du Canvas ni du DOM, pour rester
testables sans navigateur — même principe que le moteur d'exercice de
[02 § 6](02-lecture-notes.md#6-découpage-technique-proposé). `store.js` reçoit
d'ailleurs son stockage **et** son horloge en paramètres, ce qui permet de
vérifier hors navigateur le plafond, le quota dépassé et l'écriture groupée.

`views.js` a été créé le 27/07/2026 avec **une seule** vue, l'historique des
séances, parce que le Programme d'entraînement (04) en avait réellement besoin.
Les cinq autres ont été écrites le même jour — mais pas avant d'avoir leur
consommateur : c'est l'écran de progression (`progress-mode.js`, étape E) qui
les a demandées, exactement comme 04 avait demandé la première. La règle
« aucune vue tant que rien ne la consomme » a donc tenu jusqu'au bout, l'écran
de progression étant lui-même la dernière étape prévue du plan.

## 10. Étapes de réalisation

### Étape A — Format et persistance (à faire tôt) — **faite le 25/07/2026**

- [x] Figer le format d'évènement et le vocabulaire des `outcome`.
  (§ 7 ; `EVENT_TYPES` et `OUTCOMES` dans `src/progress/store.js` refusent
  toute valeur hors vocabulaire)
- [x] Écrire et relire le journal depuis `localStorage`.
  (clé unique `synthesia.progress.v1`, écriture groupée, plafond de 4 000
  évènements)
- [x] Brancher la Lecture de notes comme première productrice d'évènements.
  (une tentative = un évènement, plus les bornes de séance ; § 13)
- [x] Gérer un stockage indisponible ou plein sans casser l'exercice en
  cours.
  (stockage refusé, journal illisible, version inconnue et quota dépassé sont
  tous couverts et vérifiés — § 12)

### Étape B — Vues de base — **faite le 27/07/2026**

- [x] Notes souvent confondues.
  (`confusedTargets()` : pour chaque cible ratée, les réponses données à la
  place, les plus fréquentes d'abord — générique, `given` de n'importe quelle
  fonctionnalité)
- [x] Historique des séances. — **faite le 27/07/2026**
  (`progress/views.js` : `sessions()` reconstitue les séances à partir des
  paires `session-start` / `session-end`, filtrables par fonctionnalité et par
  période ; `completedSessions()` ne garde que celles allées jusqu'à leur
  bilan. Un `session-end` orphelin — dont le début est parti avec le plafond du
  journal — reste une séance terminée. Consommée par
  [04](04-programme-entrainement.md#11-découpage-technique--fait-le-27072026))
- [x] Évolution par main.
  (`handEvolution()` séance par séance, et `handSummary()` — le récent contre
  l'ensemble ; aucune précision calculée sur zéro tentative)

### Étape C — Vues liées au tempo — **faite le 27/07/2026**

- [x] Exercices maîtrisés.
  (`runStats()` / `masteredRuns()` : maîtrisé = au moins trois exécutions
  propres sur au moins deux séances distinctes — la règle « plusieurs
  réussites espacées » du § 6. La main fait partie de l'identité : maîtriser
  la droite ne dit rien de la gauche)
- [x] Tempo maximal joué proprement.
  (même regroupement : plus haut `tempo` (03, en bpm) ou `tempoPercent` (06)
  parmi les exécutions propres — les deux unités conservées telles quelles,
  le journal ne connaissant pas le tempo de référence d'un morceau)

### Étape D — Révisions adaptées — **faite le 27/07/2026**

- [x] Sélectionner les éléments les plus ratés et les moins vus récemment.
  (`priorWeights()` combine les deux : poids d'erreur jusqu'à 3, plus un
  surpoids d'ancienneté plafonné à 0,5 pour une cible connue mais absente des
  trente dernières tentatives — le raté pèse toujours plus que l'ancien)
- [x] Alimenter la génération de questions de 02, puis de 07 et 08.
  (les trois passent déjà par `priorWeights` : le volet ancienneté les nourrit
  sans qu'une ligne de 02, 07 ou 08 change)
- [x] Proposer une reprise ciblée en début de séance.
  (c'est la forme retenue : la première session venue fait déjà revenir le
  raté et l'ancien en priorité — pas d'écran « reprise » séparé, qui aurait
  été un second chemin vers le même tirage)

### Étape E — Maîtrise des données — **faite le 27/07/2026**

- [x] Écran de progression lisible, sans surcharge de graphiques.
  (carte « Progression » de l'accueil, `progress-mode.js` : cinq sections en
  listes — séances, confusions, exercices/passages, mains, données. Des
  listes, pas de graphiques : décision du § 13 tranchée pour le mobile)
- [x] Export et effacement des données.
  (export en fichier JSON versionné ; effacement en deux temps, sans dialogue
  bloquant, et l'écran vide constate lui-même la disparition)
- [x] Compaction du journal ancien.
  (`store.compact()`, déclenchée à l'ouverture de l'écran de progression : le
  détail au-delà des 2 500 évènements récents est abandonné, mais **toutes**
  les bornes de séance survivent — l'historique qui nourrit 04 reste complet,
  et les révisions ne lisent de toute façon que le récent)

## 11. Critères d'acceptation

- [x] Les résultats d'une séance survivent à un rechargement de la page.
- [x] Les notes confondues sont visibles et exactes après plusieurs sessions.
  (vue `confusedTargets`, affichée par l'écran de progression — vérifiée sur
  un journal fabriqué et dans le navigateur après une vraie erreur)
- [x] Un exercice n'est « maîtrisé » qu'après plusieurs réussites sur des
  séances distinctes.
  (trois exécutions propres sur au moins deux séances ; une seule réussite ne
  suffit pas, vérifié)
- [x] Le tempo maximal propre est conservé par exercice et par passage.
- [x] La progression est consultable séparément pour chaque main.
- [x] Le Programme d'entraînement (04) calcule ses séances dues à partir du
  journal de F3, sans tenir un second historique.
  (27/07/2026 : `training-log.js` n'a jamais été écrit, et le harnais vérifie
  explicitement qu'aucun second journal n'apparaît dans `localStorage`. Le
  branchement n'a demandé **aucune** modification des fonctionnalités
  productrices — le format figé le 25/07/2026 suffisait)
- [x] Une session de révision propose en priorité les éléments ratés
  précédemment.
  (les notes ratées sortent plus souvent ; le critère « le moins vu récemment »
  reste à l'étape D)
- [x] L'utilisateur peut effacer ses données, et l'application le lui
  indique clairement.
  (bouton en deux temps sur l'écran de progression, qui rappelle aussi que
  l'export est la seule sauvegarde possible sans serveur)
- [x] Un `localStorage` indisponible n'empêche pas de pratiquer.

## 12. Validation prévue

- tests unitaires de chaque vue à partir d'un journal d'évènements fabriqué ;
- tests de la règle « acquis après plusieurs réussites espacées » ;
- tests de la sélection des révisions (le plus raté et le moins vu remonte) ;
- test de la compaction : les vues restent cohérentes après compaction ;
- test d'un stockage plein ou refusé (navigation privée) ;
- test de l'export puis du réimport si le réimport est retenu ;
- vérification que 04 lit bien le journal de F3 et pas un doublon.

### Validation effectuée de l'étape A (25 juillet 2026)

**Journal et révisions, hors navigateur** — 74 vérifications sur 74, dans Node,
stockage et horloge injectés :

- forme exacte des trois évènements (`session-start`, `answer`, `session-end`),
  `sessionId` égal à l'horodatage d'ouverture, et plus rien d'accepté après la
  fermeture d'une séance ;
- vocabulaire fermé : un `type` ou un `outcome` hors tableau du § 7 est refusé
  au lieu d'être écrit, et les deux ensembles contiennent exactement les valeurs
  du plan — ni plus, ni moins ;
- plafond : les plus anciens évènements partent d'abord ;
- relecture au démarrage suivant ; un journal illisible ou écrit dans une
  version inconnue repart de zéro sans exception ;
- stockage absent, puis stockage qui refuse toute écriture : la séance se
  déroule entièrement en mémoire et se signale comme non persistée ;
- quota dépassé en cours de séance : la moitié la plus ancienne est abandonnée,
  l'écriture réussit à la seconde tentative, et la séance continue ;
- écriture groupée : une rafale de tentatives ne provoque aucune réécriture
  supplémentaire, l'intervalle passé en provoque une, et `flush()` force
  l'écriture sans jamais réécrire deux fois la même chose ;
- révisions : comptage des tentatives récentes par cible, fenêtre glissante,
  poids de 1 (jamais ratée) à 3 (toujours ratée), et une même hauteur lue dans
  deux clés reste deux cibles distinctes ;
- moteur : les poids hérités sont bien repris au tirage — sur 4 000 sessions,
  une note toujours ratée sort dans 3/7 des cas, sans que les autres cessent de
  sortir.

**Chaîne complète, dans Chrome sans interface** — 50 vérifications sur 50, trois
exécutions consécutives identiques, en quatre phases séparées par de **vrais
rechargements de page** :

- une session de dix notes en Débutant / Les deux, avec une erreur volontaire
  par question de la main gauche, produit exactement 17 évènements : 1
  `session-start` portant les réglages, 15 tentatives (10 justes, 5 fausses,
  chacune avec la note jouée à la place), 1 `session-end` en `done` ;
- toutes les tentatives portent une cible complète, une clé cohérente avec la
  main, le même `sessionId` et des horodatages croissants ;
- après rechargement, le journal est intact et les réglages de la dernière
  séance sont repris ;
- quitter l'exercice en route enregistre un `session-end` en `abandoned`,
  avec le nombre de questions réellement faites, et conserve les réponses déjà
  données ;
- révisions : avec un historique où Fa4 a été systématiquement raté, cette note
  est tirée 15 à 19 fois sur 40 démarrages de session (contre 8 attendues sans
  pondération), les quatre autres continuant toutes de sortir ;
- stockage neutralisé avant le chargement des modules : la session va jusqu'à
  son bilan et l'utilisateur est prévenu que rien n'est enregistré ;
- non-régression : mode Morceau toujours fonctionnel, contrôles masqués après
  arrêt, aucune erreur de page.

**Non-régression des campagnes précédentes** — les harnais de la Lecture de
notes ont été rejoués tels quels : 154/154 sur le moteur dans Node, 200/200
dans Chrome et 110/110 de mise en page. S'y ajoutent 44/44 sur la mise en page
du nouveau bilan par main, à 360×640, 390×844, 844×390 et 1280×800 : deux
lignes de 27 px, sans débordement ni chevauchement, le bilan tenant dans la
scène sans défilement.

### Validation effectuée des étapes B à E (27 juillet 2026)

**Vues, révisions et compaction, hors navigateur** — harnais Node (89
vérifications passées au total avec 08 et 09, trois exécutions identiques),
dont pour F3, sur un journal fabriqué :

- notes confondues : la cible la plus ratée en tête, avec la réponse donnée la
  plus fréquente et ses comptes exacts ;
- maîtrise : trois exécutions propres sur deux séances = maîtrisé ; une seule
  exécution propre = pas maîtrisé ; le filtre `masteredRuns` ne rend que le
  premier ;
- tempo : meilleur tempo **propre** (l'exécution ratée à 90 ne compte pas), et
  le pourcentage de 06 conservé tel quel à côté des bpm de 03 ;
- par main : compteurs par séance, précision nulle jamais inventée (main sans
  tentative → `null`), agrégats globaux exacts ;
- révisions : âge des cibles compté toutes cibles confondues, surpoids
  d'ancienneté entre 1 et 1,5 pour une cible jamais ratée mais ancienne, rien
  pour une cible récente toujours juste, et une cible ratée pèse toujours plus
  qu'une cible simplement ancienne ;
- compaction : sur 60 séances de 60 tentatives, le détail ancien part, le
  récent garde le sien, **toutes** les fins de séance survivent ; export
  versionné complet ; effacement qui vide journal et stockage.

**Dans Chromium** (doublure de Tone.js, cf. [08 § 16](08-lecture-partitions.md#16-validation-effectuée-27-juillet-2026)) :

- l'écran de progression affiche ses cinq sections ; la séance de Lecture de
  partitions jouée pendant la campagne apparaît dans l'historique, et la note
  ratée pendant cette séance apparaît en « confondue avec » ;
- l'export télécharge bien un fichier `synthesia-progression-AAAA-MM-JJ.json` ;
- l'effacement demande une confirmation (bouton armé), puis vide réellement
  `localStorage` et l'écran le constate ;
- mise en page : aucun débordement horizontal sur 390×844, 844×390 et
  1280×800.

## 13. Décisions ouvertes

Trois sont tranchées avec l'étape E (27/07/2026) :

- ~~Faut-il permettre le **réimport** d'un export ?~~ **Pas pour l'instant :
  l'export est une archive.** Le réimport soulève la question des doublons et
  attendra un besoin réel — la décision est documentée, pas fermée.
- ~~Quelle profondeur d'historique garder en détail avant compaction ?~~
  **Les 2 500 évènements les plus récents** (environ la moitié du plafond) ;
  au-delà, seules les bornes de séance survivent. Les révisions ne lisent que
  les 8 dernières tentatives par cible : elles ne voient pas la différence.
- ~~Graphiques d'évolution, ou simples listes ?~~ **Des listes.** Sur le petit
  écran cible, un graphique lisible aurait coûté plus qu'il ne montre ; la
  comparaison « en tout / sur les dernières séances » dit déjà le sens.

Restent ouvertes :

- Faut-il un objectif de régularité (séries de jours pratiqués), sachant que
  ce type d'indicateur peut devenir culpabilisant — ce que le dossier évite
  déjà pour le score des exercices
  ([02 § 4](02-lecture-notes.md#comportement-dune-réponse)) ?
- Faut-il, plus tard, une synchronisation entre appareils — ce qui
  impliquerait un serveur et sortirait du cadre actuel de l'application ?

## 14. Hors périmètre pour le moment

- Pas de comptes utilisateurs ni de synchronisation entre appareils.
- Pas de profils multiples sur le même navigateur.
- Pas de classements ni de comparaison avec d'autres utilisateurs.
- Pas d'ajustement automatique du programme d'entraînement selon les
  résultats : c'est une décision ouverte de
  [04](04-programme-entrainement.md#3-hors-périmètre-pour-cette-première-version),
  et elle suppose ces vues d'abord.

## 15. Première priorité — faite

Ne pas construire les vues d'abord. La priorité était **l'étape A** : figer le
format d'évènement et le brancher sur la Lecture de notes dès que celle-ci
fonctionne, pour qu'un historique réel commence à s'accumuler. C'est fait
(25/07/2026) : le journal se remplit à chaque tentative, survit au
rechargement, et les notes ratées reviennent plus souvent à la session
suivante.

Reste la promesse de vue de cette section — **voir** les notes les plus
confondues plutôt que seulement les faire revenir. La donnée est là (`given`
porte la note jouée à la place depuis le premier jour) : c'est l'objet de
l'étape B, et ce n'est plus que du calcul sur des données déjà accumulées.
