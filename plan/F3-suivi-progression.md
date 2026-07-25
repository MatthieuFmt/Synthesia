# Fondation F3 — Suivi de progression

> Statut : planifiée — aucune donnée de progression n'est conservée
> aujourd'hui.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir le principe journal d'évènements + vues calculées.
- [x] Définir qui produit et qui consomme les données.
- [x] Trancher le chevauchement avec l'historique du Programme d'entraînement.
- [ ] Définir et figer le format d'un évènement (à faire tôt).
- [ ] Implémenter la persistance locale.
- [ ] Implémenter les vues de progression.
- [ ] Implémenter les révisions adaptées aux erreurs précédentes.

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
| [02 — Lecture de notes](02-lecture-notes.md) | Réponses par note, main, clé, niveau | Notes à revoir en priorité |
| [03 — Exercices techniques](03-technique-doigts.md) | Répétitions, tempo, main, exercice | Exercices maîtrisés, tempo atteint |
| [05 — Entraînement rythmique](05-entrainement-rythmique.md) | Jugements de timing par frappe | Motifs à revoir, tendance avance/retard |
| [06 — Travail d'un morceau](06-travail-intelligent-morceau.md) | Exécutions propres par passage, tempo | Passages maîtrisés, meilleur tempo propre |
| [07 — Oreille](07-entrainement-oreille.md) | Réponses par note et par intervalle | Intervalles confondus |
| [08 — Lecture de partitions](08-lecture-partitions.md) | Réponses par note, durée, altération | Difficultés de lecture à revoir |
| [09 — Pédale](09-pedale.md) | Verdicts de changement de pédale | Types d'erreur récurrents |
| [04 — Programme d'entraînement](04-programme-entrainement.md) | Séances terminées | Historique des séances (section 5) |

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

## 6. Les six vues attendues

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

## 7. Modèle de données proposé

```js
// Un évènement : ce qui s'est passé, jamais recalculé ni modifié.
const progressEvent = {
  at: "2026-07-25T18:32:11.000Z",
  featureId: "note-reading",
  type: "answer", // "answer" | "repetition" | "clean-run" | "session-end"
  // ce sur quoi portait l'évènement, propre à la fonctionnalité
  target: { midi: 65, clef: "treble", hand: "right" },
  // le résultat, dans un vocabulaire volontairement restreint
  outcome: "wrong", // "correct" | "wrong" | "on-time" | "early" | "late" | ...
  // ce qui a été donné à la place, quand c'est pertinent
  given: { midi: 69 },
  // contexte utile aux vues
  context: { level: "intermediate", tempoBpm: null, tempoPercent: null },
};

// Une séance : bornes de pratique, utilisée par l'historique et par 04.
const sessionRecord = {
  id: "2026-07-25-note-reading-1",
  featureId: "note-reading",
  startedAt: "2026-07-25T18:30:00.000Z",
  endedAt: "2026-07-25T18:41:00.000Z",
  completed: true, // arrivée jusqu'au bilan, cf. règle de 04
};
```

Le champ `target` reste libre selon la fonctionnalité (une note, un exercice,
un passage, un intervalle, un changement de pédale) : c'est ce qui permet
d'ajouter une fonctionnalité sans changer le format. À l'inverse, `outcome`
doit rester un petit vocabulaire fermé, sinon les vues ne peuvent plus rien
calculer de commun.

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

## 9. Découpage technique proposé

```text
src/
  progress/
    store.js        # écriture du journal, lecture, compaction, export/effacement
    views.js        # les six vues calculées de la section 6
    review.js       # sélection des éléments à revoir en priorité
```

Ces modules ne doivent **jamais** dépendre du Canvas ni du DOM, pour rester
testables sans navigateur — même principe que le moteur d'exercice de
[02 § 6](02-lecture-notes.md#6-découpage-technique-proposé).

## 10. Étapes de réalisation

### Étape A — Format et persistance (à faire tôt)

- [ ] Figer le format d'évènement et le vocabulaire des `outcome`.
- [ ] Écrire et relire le journal depuis `localStorage`.
- [ ] Brancher la Lecture de notes comme première productrice d'évènements.
- [ ] Gérer un stockage indisponible ou plein sans casser l'exercice en
  cours.

### Étape B — Vues de base

- [ ] Notes souvent confondues.
- [ ] Historique des séances.
- [ ] Évolution par main.

### Étape C — Vues liées au tempo

- [ ] Exercices maîtrisés.
- [ ] Tempo maximal joué proprement.

### Étape D — Révisions adaptées

- [ ] Sélectionner les éléments les plus ratés et les moins vus récemment.
- [ ] Alimenter la génération de questions de 02, puis de 07 et 08.
- [ ] Proposer une reprise ciblée en début de séance.

### Étape E — Maîtrise des données

- [ ] Écran de progression lisible, sans surcharge de graphiques.
- [ ] Export et effacement des données.
- [ ] Compaction du journal ancien.

## 11. Critères d'acceptation

- [ ] Les résultats d'une séance survivent à un rechargement de la page.
- [ ] Les notes confondues sont visibles et exactes après plusieurs sessions.
- [ ] Un exercice n'est « maîtrisé » qu'après plusieurs réussites sur des
  séances distinctes.
- [ ] Le tempo maximal propre est conservé par exercice et par passage.
- [ ] La progression est consultable séparément pour chaque main.
- [ ] Le Programme d'entraînement (04) calcule ses séances dues à partir du
  journal de F3, sans tenir un second historique.
- [ ] Une session de révision propose en priorité les éléments ratés
  précédemment.
- [ ] L'utilisateur peut effacer ses données, et l'application le lui
  indique clairement.
- [ ] Un `localStorage` indisponible n'empêche pas de pratiquer.

## 12. Validation prévue

- tests unitaires de chaque vue à partir d'un journal d'évènements fabriqué ;
- tests de la règle « acquis après plusieurs réussites espacées » ;
- tests de la sélection des révisions (le plus raté et le moins vu remonte) ;
- test de la compaction : les vues restent cohérentes après compaction ;
- test d'un stockage plein ou refusé (navigation privée) ;
- test de l'export puis du réimport si le réimport est retenu ;
- vérification que 04 lit bien le journal de F3 et pas un doublon.

## 13. Décisions ouvertes

- Faut-il permettre le **réimport** d'un export, ou l'export sert-il
  seulement d'archive ? Le réimport soulève la question des doublons.
- Quelle profondeur d'historique garder en détail avant compaction ?
- L'écran de progression doit-il montrer des graphiques d'évolution, ou de
  simples listes suffisent-elles pour rester lisible sur mobile ?
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

## 15. Première priorité

Ne pas construire les vues d'abord. La priorité est **l'étape A** : figer le
format d'évènement et le brancher sur la Lecture de notes dès que celle-ci
fonctionne, pour qu'un historique réel commence à s'accumuler. Une seule vue
suffit pour valider la chaîne complète : **pratiquer deux sessions de Lecture
de notes → recharger la page → voir les deux ou trois notes les plus
confondues.** Les autres vues ne sont ensuite que du calcul sur des données
déjà là.
