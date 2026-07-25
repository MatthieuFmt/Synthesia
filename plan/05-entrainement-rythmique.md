# Feature 05 — Entraînement rythmique

> Statut : planifiée — aucune partie n'est encore implémentée.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir le principe et les trois familles d'exercices.
- [x] Définir la mesure de précision temporelle (à l'heure / avance / retard).
- [x] Définir un MVP qui ne dépend pas du clavier MIDI physique.
- [ ] Ajouter l'accès au mode Entraînement rythmique.
- [ ] Implémenter le mode Métronome.
- [ ] Implémenter la reconnaissance des durées et des silences.
- [ ] Implémenter la reproduction (tap et piano à l'écran).
- [ ] Brancher l'entrée MIDI (F2) pour la reproduction au piano physique.

## 1. Objectif

Développer trois compétences liées au rythme, absentes de l'application
aujourd'hui : reconnaître une durée ou un silence, reproduire un rythme avec
un timing correct, et jouer avec une pulsation stable.

## 2. Ce que couvre cette fonctionnalité

Reprise des quatre besoins exprimés, organisés en trois familles d'exercices
et une mécanique de mesure transversale :

| Besoin exprimé | Où il est traité |
| --- | --- |
| Reconnaître les durées et les silences | Famille **Reconnaissance** |
| Reproduire un rythme en tapant ou sur le piano | Famille **Reproduction** |
| Travailler avec un métronome | Famille **Métronome** |
| Mesurer les notes jouées trop tôt ou trop tard | Mécanique de mesure utilisée par **Reproduction** |

## 3. Dépendances et position vis-à-vis des autres fonctionnalités

- Ne nécessite **pas** [F2 — Entrée MIDI](F2-entree-midi.md) pour son MVP :
  taper (clavier, souris ou tactile) ou cliquer le piano déjà affiché à
  l'écran fournit un horodatage exploitable sans clavier physique branché.
  F2 vient ensuite comme amélioration, pour reproduire sur un vrai piano.
- Réutilise et étend `metronome.js`, déjà anticipé comme module partagé
  dans le découpage technique des
  [Exercices techniques](03-technique-doigts.md#12-découpage-technique-proposé)
  pour leur décompte. Cette fonctionnalité ne recrée pas de second
  métronome : elle étend celui-là (réglage de tempo visible, exposition de
  la pulsation pour la mesure de précision).
- Reste volontairement indépendante de la hauteur des notes : contrairement
  à la Lecture de notes (02) ou aux Exercices techniques (03), aucune
  réponse n'est jugée fausse à cause de la touche jouée, seulement à cause
  du moment où elle est jouée.
- Travaille l'**exécution** du rythme, là où la
  [Lecture de partitions](08-lecture-partitions.md) travaille sa **lecture**.
  Le vocabulaire de durées et de silences est commun aux deux et doit être
  partagé (voir
  [08 § 4](08-lecture-partitions.md#4-frontière-avec-lentraînement-rythmique-05)).

## 4. Trois familles d'exercices

| Famille | But | Contenu du MVP | Progression future |
| --- | --- | --- | --- |
| **Métronome** | Intérioriser une pulsation stable | Tempo réglable, pulsation audible et visuelle, décompte | Métronome à subdivisions, métronome qui s'arrête pour vérifier que le tempo est gardé seul |
| **Reconnaissance** | Nommer une durée ou un silence | Un motif court joué et affiché, choix parmi quelques notations (QCM) | Motifs plus longs, comparaison de deux rythmes proches, dictée rythmique |
| **Reproduction** | Rejouer un rythme avec le bon timing | Motif de référence sur 4 temps, reproduction en tapant ou au piano à l'écran, retour par frappe | Motifs plus longs et syncopés, reproduction au clavier MIDI physique (via F2), polyrythmie à deux mains |

Le MVP doit proposer au moins un exercice complet dans chacune des trois
familles.

## 5. Mesure « trop tôt / trop tard »

La fenêtre de tolérance est définie en **fraction de la durée d'un temps**
plutôt qu'en millisecondes fixes, pour rester cohérente quel que soit le
tempo choisi :

| Écart par rapport au temps attendu | Jugement |
| --- | --- |
| ≤ 10 % de la durée d'un temps | À l'heure |
| entre 10 % et 25 % | En avance / en retard (léger) |
| entre 25 % et 40 % | En avance / en retard (net) |
| au-delà de 40 %, ou aucune frappe reçue | Manquée |

Exemple concret à 80 BPM (un temps dure 750 ms) : une frappe à ±75 ms est «
à l'heure », une frappe à −180 ms est « en avance (net) ».

Ce même mécanisme est réutilisé ailleurs plutôt que redéfini : par la
validation MIDI des [Exercices techniques](03-technique-doigts.md) si une
mesure de régularité rythmique y est ajoutée, et par les verdicts de
changement de pédale des [Exercices de pédale](09-pedale.md#7-mesurer-un-changement-de-pédale).

## 6. Niveaux de difficulté

| Niveau | Durées et silences utilisés | Mesure | Tempo indicatif |
| --- | --- | --- | --- |
| **Débutant** | Noire, blanche, ronde + soupir, demi-soupir, pause | 4/4 uniquement | 60–80 BPM |
| **Intermédiaire** | + croches isolées et liées, noire pointée | 4/4 et 3/4 | 80–100 BPM |
| **Difficile** | + doubles croches, syncopes, triolets | + mesure 6/8 | 100–120 BPM |

Le tempo reste un réglage modifiable par l'utilisateur : le niveau fixe une
valeur par défaut, pas une limite.

## 7. Réglages d'une séance

- famille (Métronome, Reconnaissance ou Reproduction) ;
- niveau (Débutant, Intermédiaire, Difficile) ;
- tempo, avec une valeur par défaut selon le niveau ;
- mode d'entrée pour Reproduction : Taper, Piano à l'écran, ou Clavier MIDI
  si [F2](F2-entree-midi.md) est disponible et connecté ;
- nombre de motifs pour Reconnaissance/Reproduction, ou durée en minutes
  pour Métronome.

## 8. Écran d'exercice

Pour Reconnaissance et Reproduction :

- le motif de référence (notation et lecture audio) ;
- un décompte avant le départ, réutilisant le métronome partagé ;
- pour Reconnaissance : les propositions de réponse (QCM) ;
- pour Reproduction : une zone de frappe claire (grand bouton tap) ou le
  piano à l'écran, et un retour visuel immédiat par frappe ;
- la progression de la session, par exemple `3 / 8` ;
- un moyen clair de quitter l'exercice.

Pour Métronome : le tempo affiché en grand, une pulsation visuelle (par
exemple un point qui clignote en plus du son), et le réglage du tempo.

## 9. Retour et bilan

- **Reconnaissance** : bonnes réponses sur le total, motifs à revoir.
- **Reproduction** : proportion de frappes à l'heure, tendance générale
  (systématiquement en avance ou en retard plutôt qu'irrégulier), meilleure
  série de frappes à l'heure.
- **Métronome** : outil sans bilan noté dans le MVP — ce n'est pas un test.

Comme pour les autres fonctionnalités, aucune précision n'est affichée pour
une frappe qui n'a pas été détectée.

## 10. Modèle de données proposé

```js
const rhythmPattern = {
  id: "quarter-notes-4-4-beginner-01",
  difficulty: "beginner",
  timeSignature: [4, 4],
  tempoBpm: 70,
  // une entrée par temps de la mesure ; une note ou un silence
  events: [
    { type: "note", beats: 1 },
    { type: "rest", beats: 1 },
    { type: "note", beats: 1 },
    { type: "note", beats: 1 },
  ],
};

const attemptResult = {
  patternId: "quarter-notes-4-4-beginner-01",
  hits: [
    { expectedBeat: 0, actualOffsetMs: 12, judgment: "on-time" },
    { expectedBeat: 2, actualOffsetMs: -180, judgment: "early" },
    { expectedBeat: 3, actualOffsetMs: null, judgment: "missed" },
  ],
};
```

## 11. Découpage technique proposé

```text
src/
  rhythm-mode.js     # parcours et état de la séance, trois familles
  rhythm/
    patterns.js      # motifs de durées/silences par niveau
    timing.js         # comparaison frappe/pulsation, jugement avance/retard
  metronome.js         # pulsation, décompte, tempo — étendu depuis 03, pas recréé
```

## 12. Étapes de réalisation

### Étape A — Fondations

- [ ] Définir le format d'un motif rythmique (section 10).
- [ ] Définir les catégories de jugement et leurs seuils (section 5).
- [ ] Étendre `metronome.js` pour exposer la pulsation à `timing.js`.

### Étape B — Métronome

- [ ] Créer l'écran Métronome avec tempo réglable.
- [ ] Ajouter la pulsation audible et visuelle.
- [ ] Réutiliser le décompte pour les deux autres familles.

### Étape C — Reconnaissance

- [ ] Générer et jouer un motif court par niveau.
- [ ] Proposer un QCM de durées/silences.
- [ ] Produire le bilan de session.

### Étape D — Reproduction (tap et piano à l'écran)

- [ ] Capturer les évènements de tap et de clic piano avec horodatage.
- [ ] Comparer chaque frappe à la grille attendue et lui attribuer un
  jugement.
- [ ] Ajouter le retour visuel immédiat par frappe et le bilan de session.

### Étape E — Entrée MIDI physique

- [ ] Brancher [F2](F2-entree-midi.md) pour reproduire sur un clavier MIDI
  physique.
- [ ] Vérifier l'absence de régression du mode tap / piano à l'écran quand
  MIDI n'est pas branché.

## 13. Critères d'acceptation

- [ ] L'utilisateur peut lancer le mode Métronome et entendre/voir une
  pulsation réglable.
- [ ] L'utilisateur peut lancer un exercice de Reconnaissance et identifier
  des durées et silences de base.
- [ ] L'utilisateur peut reproduire un motif en tapant, avec un retour par
  frappe (à l'heure / en avance / en retard / manquée).
- [ ] La même reproduction fonctionne en cliquant le piano à l'écran, sans
  que la hauteur jouée ne soit prise en compte.
- [ ] Chaque famille propose un bilan de fin de session sans métrique
  inventée.
- [ ] Une fois F2 disponible, la reproduction fonctionne aussi avec un
  clavier MIDI physique, sans régression du mode tap / piano à l'écran.
- [ ] Les trois niveaux de difficulté proposent des motifs et des tempos
  différents et cohérents avec la section 6.

## 14. Validation prévue

- tests unitaires du calcul de l'écart temporel et de sa catégorisation,
  pour plusieurs tempos ;
- tests du générateur de motifs par niveau ;
- test manuel des trois familles au clavier, à la souris et au tactile ;
- test manuel avec un clavier MIDI physique une fois F2 disponible ;
- vérification sur petite largeur d'écran ;
- vérification de l'absence de régression des Exercices techniques (03)
  après extension de `metronome.js`.

## 15. Décisions ouvertes

- Faut-il des sons de percussion neutres (clic, clap) ou le son de piano
  existant pour jouer un rythme de référence ?
- Faut-il resserrer automatiquement la fenêtre de tolérance de la section 5
  selon le niveau (plus stricte en Difficile) ?
- Le bilan doit-il distinguer une tendance systématique (toujours en
  avance) d'une simple irrégularité, pour orienter la pratique ?
- Faut-il, à un niveau avancé, une saisie plus libre en Reconnaissance
  (taper le nombre de temps) plutôt qu'un QCM uniquement ?

## 16. Hors périmètre pour le moment

- Pas de dictée rythmique écrite (transcrire un rythme entendu en
  notation).
- Pas de combinaison avec la hauteur des notes : le rythme reste travaillé
  indépendamment de la mélodie ; une combinaison future resterait du
  ressort du mode Morceau ou d'un futur travail intelligent d'un morceau.
- Pas de polyrythmie à deux mains (rythmes différents simultanés).
- Pas d'accélération automatique du tempo sans validation explicite de
  l'utilisateur.

## 17. Première priorité

Construire une boucle minimale : **mode Métronome fonctionnel (tempo
réglable, pulsation audible et visuelle) → un motif de reproduction simple
en Débutant (noires et blanches sur 4 temps) → tap au clavier ou clic sur
le piano à l'écran → retour à l'heure / en avance / en retard par frappe →
bilan de session.** La Reconnaissance peut être construite en parallèle une
fois le métronome stable ; l'entrée MIDI physique (Étape E) vient en
dernier.
