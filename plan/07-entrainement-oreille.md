# Feature 07 — Entraînement de l'oreille

> Statut : planifiée — aucune partie n'est encore implémentée.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir les quatre familles d'exercices.
- [x] Définir la réutilisation du moteur de session de la Lecture de notes.
- [x] Définir la frontière avec la future théorie musicale.
- [ ] Ajouter l'accès au mode Entraînement de l'oreille.
- [ ] Implémenter la reconnaissance d'une note entendue.
- [ ] Implémenter la reconnaissance des intervalles.
- [ ] Implémenter la distinction majeur / mineur.
- [ ] Implémenter la reproduction d'une courte mélodie.

## 1. Problème utilisateur

L'utilisateur peut apprendre à lire une note sur une portée
([02](02-lecture-notes.md)) et à la jouer, mais rien ne l'entraîne à
reconnaître ce qu'il entend. Sans travail de l'oreille, il reste dépendant de
la partition : il ne peut ni vérifier qu'il joue juste, ni retrouver une
mélodie simple, ni entendre qu'un accord est majeur ou mineur.

## 2. Objectif

Entraîner l'oreille à relier un son entendu à une touche du piano, puis à
reconnaître les rapports entre les sons (intervalles, couleur majeure ou
mineure) et à reproduire une courte mélodie de mémoire.

## 3. Relation avec les autres fonctionnalités

La Lecture de notes (02) et cette fonctionnalité sont **symétriques** : même
réponse (jouer une touche), stimulus différent.

| | Stimulus | Réponse |
| --- | --- | --- |
| [02 — Lecture de notes](02-lecture-notes.md) | Une note **vue** sur la portée | Jouer la touche correspondante |
| **07 — Oreille** | Une note **entendue** | Jouer la touche correspondante |

Conséquence directe : le moteur de session de 02 (groupe de notes par
niveau, choix de la question suivante, gestion des tentatives, série,
pondération des notes difficiles, calcul du bilan) doit être **réutilisé**,
pas réécrit. 02 précise déjà que cette logique doit rester indépendante du
Canvas afin d'être testable sans navigateur
([02 § 6](02-lecture-notes.md#6-découpage-technique-proposé)) : c'est
exactement ce qui la rend réutilisable ici.

Ne sont propres à cette fonctionnalité que le stimulus sonore, les familles
d'exercices de la section 4 et la notion de tonalité de référence.

## 4. Quatre familles d'exercices

| Famille | Ce que l'utilisateur entend | Ce qu'il fait | MVP |
| --- | --- | --- | --- |
| **Note isolée** | Une note, après un Do de référence | Joue la touche entendue | Oui |
| **Intervalles** | Deux notes, successives puis simultanées | Nomme l'intervalle, ou joue la seconde note à partir de la première donnée | Oui, en successif |
| **Majeur / mineur** | Un accord de trois notes | Répond « majeur » ou « mineur » | Oui |
| **Mélodie** | Une courte mélodie de 3 à 5 notes | La rejoue dans l'ordre | Non — après les trois autres |

## 5. Niveaux de difficulté

| Niveau | Note isolée | Intervalles | Majeur / mineur | Mélodie |
| --- | --- | --- | --- | --- |
| **Débutant** | 5 touches blanches autour du Do central, Do de référence rejouable à volonté | Seconde, tierce, quinte, octave — en successif | Accords fondamentaux, en position serrée | 3 notes dans un groupe de 5 |
| **Intermédiaire** | Une octave complète, touches blanches | + quarte, sixte, septième ; successif ou simultané | + accords sur d'autres degrés | 4 notes, une octave |
| **Difficile** | Étendue élargie, altérations incluses | Tous les intervalles jusqu'à l'octave, simultanés | + premiers renversements | 5 notes, sauts plus larges |

Comme pour 02, le niveau modifie l'étendue et le vocabulaire, jamais une
limite de temps.

## 6. Règles pédagogiques

- **Toujours donner un repère.** Une note isolée n'est reconnaissable sans
  oreille absolue que par rapport à une référence : rejouer un Do (ou la
  tonique choisie) doit rester possible à tout moment, sans pénalité.
- **Écoute illimitée.** Rejouer le stimulus autant de fois que voulu ne coûte
  rien. Ce qui est mesuré est la reconnaissance, pas la mémoire immédiate.
- **Réponse jouée, pas seulement nommée.** Sauf pour majeur/mineur et le
  nom d'un intervalle, la réponse se donne sur le piano : c'est ce qui relie
  le son au geste.
- **Une erreur ne change pas la question**, conformément à la règle déjà
  posée en [02](02-lecture-notes.md#5-règles-pédagogiques-du-mvp).
- **Ne pas juger la justesse d'un piano physique.** L'application compare des
  hauteurs MIDI, pas des fréquences : elle ne peut pas et ne doit pas
  prétendre évaluer l'accord d'un instrument acoustique.
- **Notation française** (Do, Ré, Mi…), comme dans le reste de
  l'application.

## 7. Écran d'exercice

- un bouton **Écouter** bien visible, et un bouton **Entendre le repère** ;
- pour Note isolée et Mélodie : le piano, limité à l'étendue utile du niveau,
  comme déjà prévu en [02](02-lecture-notes.md#écran-dexercice) ;
- pour Intervalles et Majeur/mineur : les propositions de réponse ;
- la progression de la session (`4 / 10`) ;
- pour Mélodie : les notes déjà jouées, pour que l'utilisateur suive où il en
  est dans sa reproduction ;
- un moyen clair de quitter.

Aucune portée n'est affichée pendant une question : afficher la note écrite
donnerait la réponse et transformerait l'exercice en lecture.

## 8. Comportement d'une réponse

- **Bonne réponse** : jouer la note, retour vert, série incrémentée,
  question suivante après un court délai.
- **Mauvaise réponse** : jouer la note choisie (le lien geste-son doit
  rester), signaler l'erreur, conserver la question, proposer de réécouter.
- **Après plusieurs erreurs** : jouer la bonne note puis la note proposée
  l'une après l'autre, pour faire entendre la différence — c'est l'aide la
  plus utile en travail d'oreille.
- **Mélodie** : la reproduction est validée note par note dans l'ordre ; une
  erreur signale la position fautive sans effacer tout le début.

## 9. Fin de session

Résumé court, aligné sur celui de 02 :

- notes ou intervalles reconnus du premier coup ;
- précision ;
- meilleure série ;
- deux ou trois éléments à revoir (par exemple « tierce et quarte
  confondues ») ;
- boutons **Recommencer** et **Continuer**.

Les confusions récurrentes remontent à
[F3 — Suivi de progression](F3-suivi-progression.md), qui centralise les
notes et intervalles souvent confondus.

## 10. Modèle de données proposé

```js
const earQuestion = {
  family: "interval", // "single-note" | "interval" | "chord-quality" | "melody"
  referenceMidi: 60, // repère rejouable
  // note isolée : une seule hauteur ; intervalle : deux ; accord : trois ;
  // mélodie : la suite à reproduire
  midis: [60, 64],
  playback: "sequential", // "sequential" | "simultaneous"
  expectedAnswer: { type: "interval-name", value: "tierce majeure" },
};
```

Le champ `expectedAnswer` distingue les familles où l'on joue la réponse
(`type: "keys"`) de celles où l'on choisit une proposition
(`type: "interval-name"` ou `"chord-quality"`).

## 11. Découpage technique proposé

```text
src/
  ear-training-mode.js     # parcours et familles d'exercices
  ear/
    questions.js           # génération des stimuli par famille et niveau
  session-engine.js        # moteur de session partagé, extrait de 02
  audio.js                 # lecture d'une note ou d'un accord (partagé)
```

`session-engine.js` est l'extraction du moteur déjà décrit en 02 : elle doit
être faite au moment où cette fonctionnalité en a réellement besoin, pas en
avance, conformément au principe déjà retenu dans le dossier.

## 12. Étapes de réalisation

### Étape A — Fondations

- [ ] Extraire le moteur de session de 02 en module réutilisable.
- [ ] Définir le format de question (section 10).
- [ ] Vérifier que l'audio permet de jouer un accord simultané proprement.

### Étape B — Note isolée

- [ ] Générer une note du groupe selon le niveau.
- [ ] Jouer le stimulus et le repère à la demande.
- [ ] Valider la touche jouée et produire le bilan.

### Étape C — Intervalles

- [ ] Générer un intervalle du niveau, en successif.
- [ ] Proposer les noms d'intervalles en réponse.
- [ ] Ajouter la variante simultanée.
- [ ] Ajouter l'aide qui fait entendre la différence après plusieurs erreurs.

### Étape D — Majeur / mineur

- [ ] Générer un accord majeur ou mineur.
- [ ] Proposer les deux réponses et valider.

### Étape E — Mélodie

- [ ] Générer une suite de 3 à 5 notes.
- [ ] Valider la reproduction note par note, dans l'ordre.
- [ ] Signaler la position de l'erreur sans effacer le début.

## 13. Critères d'acceptation

- [ ] L'utilisateur peut entendre une note et la retrouver sur le piano, avec
  un repère rejouable à volonté.
- [ ] Réécouter le stimulus est illimité et sans pénalité.
- [ ] Les intervalles du niveau sont proposés et corrigés.
- [ ] Un accord majeur et un accord mineur sont distinguables et corrigés.
- [ ] Une courte mélodie peut être reproduite note par note.
- [ ] Une erreur conserve la question en cours.
- [ ] Aucune portée n'apparaît pendant une question.
- [ ] Le bilan de fin de session est cohérent avec celui de la Lecture de
  notes.
- [ ] La Lecture de notes ne régresse pas après extraction du moteur de
  session.

## 14. Validation prévue

- tests unitaires de la génération des stimuli par famille et par niveau ;
- tests des intervalles produits (nom attendu pour un écart donné) ;
- tests de la validation d'une mélodie, y compris erreur en cours de suite ;
- test de non-régression de 02 après extraction du moteur de session ;
- test manuel à la souris, au toucher et au clavier MIDI si disponible ;
- vérification de l'audio après le premier geste utilisateur ;
- vérification sur petite largeur d'écran.

## 15. Décisions ouvertes

- Faut-il fixer la tonalité de référence à Do dans le MVP, ou permettre de
  travailler dans une autre tonalité dès le début ?
- Les intervalles doivent-ils être nommés (« tierce majeure ») ou joués (la
  seconde note à partir de la première) en priorité dans le MVP ?
- Faut-il des intervalles descendants, ou seulement ascendants au début ?
- Faut-il un mode « chanter puis vérifier » sans détection audio, purement
  déclaratif, ou est-ce hors périmètre d'une application sans micro ?

## 16. Hors périmètre pour le moment

- Pas de détection du chant par microphone.
- Pas de dictée mélodique écrite sur portée.
- Pas d'accords à quatre sons ni de progressions harmoniques complètes.
- La **construction** d'un accord demandé, les degrés et les renversements
  relèvent de la future Théorie musicale appliquée, pas de cette
  fonctionnalité : ici l'accord est **entendu**, pas construit à partir de
  son nom.

## 17. Première priorité

Construire une boucle complète sur la famille la plus fondatrice :
**choisir Oreille → Débutant → entendre le Do de référence → entendre une
note parmi cinq → la jouer sur le piano → recevoir le retour → terminer dix
questions → voir le bilan.** Les intervalles et majeur/mineur réutilisent
ensuite le même moteur sans travail supplémentaire de session.
