# Feature 04 — Programme d'entraînement

> Statut : planifiée — aucune partie n'est encore implémentée.
> Dépend de [F1 — Navigation](F1-navigation.md). Prend tout son sens une fois
> plusieurs fonctionnalités pratiques réellement disponibles (02, 03 et 05).

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir le principe du programme (fonctionnalités, fréquence, durée).
- [x] Définir le calcul des séances dues du jour.
- [ ] Ajouter l'accès au Programme d'entraînement depuis la navigation.
- [ ] Implémenter la configuration du programme.
- [ ] Implémenter l'écran Aujourd'hui et le démarrage d'une séance planifiée.
- [ ] Enregistrer une séance comme terminée à la fin naturelle de la
  fonctionnalité.
- [ ] Tester les trois types de fréquence et le passage de semaine/mois.

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

1. L'utilisateur ouvre « Programme d'entraînement » depuis la navigation
   (F1).
2. S'il n'a pas encore de programme, l'application propose d'en créer un.
3. L'utilisateur choisit une ou plusieurs fonctionnalités disponibles à
   inclure.
4. Pour chaque fonctionnalité choisie, l'utilisateur définit une fréquence
   (tous les jours / X fois par semaine / X fois par mois) et une durée
   indicative par séance.
5. L'application enregistre le programme et affiche l'écran « Aujourd'hui »
   avec les séances prévues du jour.
6. L'utilisateur démarre une séance planifiée directement depuis cet écran
   → l'application lance la fonctionnalité concernée (via F1), avec la
   durée cible affichée.
7. À la fin naturelle de la séance (bilan de la fonctionnalité), l'
   application revient au programme et marque la séance du jour comme
   faite.

## 5. Réglages d'un élément de programme

- **Fonctionnalité** : une des fonctionnalités disponibles (Morceau,
  Lecture de notes, Exercices techniques…).
- **Fréquence** : Tous les jours, ou X fois par semaine, ou X fois par mois.
- **Durée indicative par séance** : en minutes.

Une même fonctionnalité ne peut apparaître qu'une seule fois dans le
programme, pour ne pas avoir deux fréquences contradictoires sur la même
fonctionnalité.

## 6. Modèle de données proposé

```js
const trainingProgram = {
  id: "default",
  items: [
    {
      featureId: "note-reading",
      frequency: { type: "daily" },
      sessionDurationMinutes: 10,
    },
    {
      featureId: "finger-technique",
      frequency: { type: "weekly", timesPerWeek: 2 },
      sessionDurationMinutes: 15,
    },
    {
      featureId: "song-learning",
      frequency: { type: "monthly", timesPerMonth: 8 },
      sessionDurationMinutes: 20,
    },
  ],
};

// journal minimal, séparé des données de progression détaillées de chaque
// fonctionnalité (cf. décision ouverte similaire dans 01 et 02)
const completedSessions = [
  { featureId: "note-reading", completedAt: "2026-07-24T18:32:00.000Z" },
];
```

`completedSessions` sert uniquement à calculer ce qui est dû aujourd'hui. Il
ne remplace pas le suivi détaillé (notes confondues, tempo maximal…), qui est
désormais traité par [F3 — Suivi de progression](F3-suivi-progression.md).

**Une seule source de vérité pour l'historique.** F3 possède le journal des
séances terminées ; ce programme le **lit** au lieu d'en tenir un second, et
`completedSessions` devient une simple vue de F3 filtrée par fonctionnalité
et par période (voir
[F3 § 5](F3-suivi-progression.md#5-chevauchement-avec-le-programme-dentraînement-04)).
Si F3 n'est pas encore disponible quand ce programme est construit, son
journal minimal doit déjà utiliser le format d'évènement de F3 — sinon la
reprise coûtera une migration.

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

Afficher :

- la liste des séances prévues aujourd'hui (nom de la fonctionnalité, durée
  indicative, état fait / à faire) ;
- un bouton pour démarrer directement chaque séance ;
- un état visible quand tout est déjà fait pour la journée ;
- un accès à la configuration du programme.

## 9. Écran de configuration du programme

- liste des fonctionnalités disponibles (issues du registre F1) avec
  case à cocher pour les inclure ;
- pour chaque fonctionnalité cochée : choix de la fréquence et de la durée ;
- possibilité de retirer une fonctionnalité du programme à tout moment ;
- bouton d'enregistrement, avec des valeurs par défaut raisonnables plutôt
  qu'un formulaire vide.

## 10. Règles de comportement

- Un programme ne peut inclure que des fonctionnalités réellement
  disponibles dans le registre F1.
- Une fonctionnalité ne peut être présente qu'une fois dans le programme.
- La semaine de référence commence le lundi ; le mois de référence est le
  mois calendaire en cours.
- Une séance est comptée comme faite uniquement quand la fonctionnalité
  associée est allée jusqu'à sa fin naturelle (bilan, fin de répétitions…),
  pas simplement ouverte puis quittée immédiatement.
- La durée indicative reste une durée cible affichée à l'utilisateur, pas un
  chronomètre qui interrompt automatiquement la séance dans cette première
  version (voir Décisions ouvertes).
- Utiliser une fonctionnalité en dehors du programme reste toujours possible
  depuis l'écran d'accueil (F1) et ne doit jamais être bloqué ni faussé par
  le programme.

## 11. Découpage technique proposé

```text
src/
  training-program.js   # modèle du programme, calcul des séances dues
  training-log.js       # journal minimal des séances terminées (localStorage)
```

`training-program.js` lit le registre de fonctionnalités défini par
[F1](F1-navigation.md) pour n'proposer que des fonctionnalités réellement
disponibles ; il ne doit pas maintenir sa propre liste de fonctionnalités.

## 12. Étapes de réalisation

### Étape A — Fondations

- [ ] Définir le modèle de données du programme (section 6).
- [ ] Définir le format du journal minimal des séances terminées.
- [ ] Définir la règle de calcul des séances dues (section 7).

### Étape B — Interface

- [ ] Créer l'écran de configuration du programme.
- [ ] Créer l'écran « Aujourd'hui ».
- [ ] Ajouter l'accès au Programme d'entraînement depuis la navigation (F1).
- [ ] Permettre de démarrer une séance planifiée directement depuis
  l'écran Aujourd'hui.

### Étape C — Logique

- [ ] Calculer les séances dues aujourd'hui pour chaque type de fréquence.
- [ ] Enregistrer une séance comme terminée à la fin naturelle de la
  fonctionnalité.
- [ ] Gérer l'ajout et le retrait d'une fonctionnalité du programme.
- [ ] Empêcher la planification d'une fonctionnalité non disponible.

### Étape D — Validation

- [ ] Tester les trois types de fréquence (quotidien, hebdomadaire,
  mensuel).
- [ ] Tester le passage à une nouvelle semaine et à un nouveau mois (remise
  à zéro des compteurs).
- [ ] Tester un programme sans rien de prévu aujourd'hui.
- [ ] Vérifier qu'une utilisation hors programme n'endommage pas le suivi.
- [ ] Vérifier la lisibilité sur petite largeur d'écran.

## 13. Critères d'acceptation

- [ ] L'utilisateur peut créer un programme avec au moins une
  fonctionnalité, une fréquence et une durée.
- [ ] L'écran Aujourd'hui reflète correctement la fréquence choisie pour
  chaque fonctionnalité.
- [ ] Terminer une séance planifiée la marque comme faite pour la journée.
- [ ] Une fonctionnalité en « X fois par semaine » n'apparaît plus comme due
  une fois le quota atteint pour la semaine en cours.
- [ ] Le programme peut être modifié (ajout, retrait, changement de
  fréquence ou de durée) à tout moment.
- [ ] Utiliser une fonctionnalité hors du programme reste possible et sans
  erreur.

## 14. Validation prévue

- tests unitaires du calcul des séances dues pour les trois fréquences ;
- test du passage de semaine et de mois (compteurs remis à zéro) ;
- test manuel du parcours complet : configuration → Aujourd'hui → démarrage
  → bilan → retour marqué comme fait ;
- test d'une utilisation hors programme en parallèle ;
- vérification sur petite largeur d'écran.

## 15. Décisions ouvertes

- Faut-il un chronomètre strict qui arrête automatiquement une séance après
  la durée cible, ou la durée reste-t-elle indicative pour cette première
  version ?
- Faut-il permettre de marquer manuellement une séance comme faite (par
  exemple une pratique réalisée hors application, sur le piano seul) ?
- Faut-il permettre de mettre le programme en pause sans le supprimer
  (vacances, blessure…) ?
- Faut-il, plus tard, choisir des jours précis pour « X fois par semaine »,
  plutôt qu'un nombre réparti librement dans la semaine ?
- Faut-il des rappels ou notifications, et selon quel mécanisme pour une
  application web sans backend ?

## 16. Première priorité

Construire une boucle complète avec une seule fréquence : **configurer une
fonctionnalité en « Tous les jours » avec une durée → voir l'écran
Aujourd'hui → démarrer la séance → la terminer → revenir au programme et
constater qu'elle est marquée comme faite.** Une fois cette boucle stable,
étendre aux fréquences hebdomadaire et mensuelle, puis à plusieurs
fonctionnalités combinées.
