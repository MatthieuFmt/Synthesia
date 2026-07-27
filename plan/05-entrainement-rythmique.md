# Feature 05 — Entraînement rythmique

> Statut : **les trois familles et les trois entrées en place** (26/07/2026).
> Métronome, Reconnaissance et Reproduction — au tap, au piano à l'écran et au
> clavier MIDI physique — fonctionnent de bout en bout, vérifiés dans un
> navigateur (§ 18). Restent les triolets et la saisie libre en Reconnaissance.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir le principe et les trois familles d'exercices.
- [x] Définir la mesure de précision temporelle (à l'heure / avance / retard).
- [x] Définir un MVP qui ne dépend pas du clavier MIDI physique.
- [x] Ajouter l'accès au mode Entraînement rythmique.
- [x] Implémenter le mode Métronome.
  (tempo réglable en marche, pulsation audible et visible, durée puis arrêt
  automatique ; aucun score — c'est un outil)
- [x] Implémenter la reconnaissance des durées et des silences.
  (motif dessiné et joué, une figure encadrée à nommer parmi quatre)
- [x] Implémenter la reproduction (tap et piano à l'écran).
  (écoute puis reproduction sans couper la pulsation, jugement par frappe,
  couleur sur chaque note du motif)
- [x] Brancher l'entrée MIDI (F2) pour la reproduction au piano physique.
  (troisième mode d'entrée, visible mais désactivé tant qu'aucun clavier
  n'écoute ; la hauteur reste ignorée, comme au piano à l'écran — étape E)
- [ ] Ajouter les triolets du niveau Difficile.
  (hors MVP : ils demandent une subdivision qui ne divise pas le temps par
  deux et une notation à crochet — § 6 et § 18)

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
à l'heure », une frappe à −180 ms (24 %) est « en avance (léger) », et il faut
dépasser −187 ms pour être « en avance (net) » — par exemple −220 ms (29 %).

> Corrigé le 26/07/2026. Cet exemple annonçait « −180 ms = en avance (net) », ce
> que le tableau ci-dessus contredit : 180/750 = 24 %, donc *léger*. C'est le
> tableau qui fait foi, et c'est lui qu'implémente `rhythm/timing.js` — l'écart a
> été trouvé par les vérifications, qui reprenaient l'exemple tel quel.

Ce même mécanisme est réutilisé ailleurs plutôt que redéfini : par la
validation MIDI des [Exercices techniques](03-technique-doigts.md) si une
mesure de régularité rythmique y est ajoutée, et par les verdicts de
changement de pédale des [Exercices de pédale](09-pedale.md#7-mesurer-un-changement-de-pédale).

## 6. Niveaux de difficulté

| Niveau | Durées et silences utilisés | Mesure | Tempo indicatif |
| --- | --- | --- | --- |
| **Débutant** | Noire, blanche, ronde + soupir, demi-pause, pause | 4/4 uniquement | 70 BPM |
| **Intermédiaire** | + croches, noire pointée, demi-soupir | 4/4 et 3/4 | 90 BPM |
| **Difficile** | + doubles croches, syncopes | + mesure 6/8 | 110 BPM |

Le tempo reste un réglage modifiable par l'utilisateur : le niveau fixe une
valeur par défaut, pas une limite. Il est repris à chaque changement de niveau
**et de famille** : un tempo cherché au métronome n'a aucune raison de devenir
celui d'un exercice de lecture.

Deux écarts assumés par rapport à la première version de ce tableau
(26/07/2026) :

- le **demi-soupir** est passé de Débutant à Intermédiaire. Un silence d'un
  demi-temps parmi des figures qui valent toutes un temps entier ou plus n'a
  aucun emploi : il n'existe que face aux croches, donc au niveau où elles
  apparaissent. La **demi-pause** (deux temps) le remplace en Débutant.
- les **triolets** ne sont pas implémentés. Ils divisent le temps par trois là
  où toutes les autres figures le divisent par deux, et demandent une notation à
  crochet ; ils sortent du MVP sans rien lui retirer, la syncope et les doubles
  croches suffisant à charger le niveau Difficile.

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

## 10. Modèle de données

Un motif ne déclare pas des durées, il déclare des **figures** :

```js
const rhythmPattern = {
  id: "b-noire-soupir",
  difficulty: "beginner",
  timeSignature: [4, 4],
  figures: ["quarter", "quarter-rest", "quarter", "quarter"],
};
```

`expandPattern()` en tire les évènements prévus à l'origine, enrichis :

```js
{ figure: "quarter-rest", name: "soupir", type: "rest",
  beats: 1, beat: 1, bar: 0, time: 1.0, duration: 1.0 }
```

**Pourquoi la figure plutôt que `{ type, beats }`** : `{ type: "note", beats: 1 }`
ne dit pas *quel symbole* vaut ce temps — une noire, ou deux croches liées. Or la
Reconnaissance doit précisément faire nommer le symbole, et la portée doit le
dessiner. La figure porte donc son nom, sa durée, et de quoi la dessiner (tête
creuse ou pleine, hampe, crochets, point). La durée reste dérivée, jamais
saisie deux fois.

Corollaire : `beats` d'une figure est exprimé en **noires**, et c'est la mesure
qui dit combien de noires vaut un temps. Une croche vaut 0,5 noire en 4/4 comme
en 6/8 — mais un temps de 6/8 *est* une croche, donc la même croche y vaut un
temps entier. Sans cette séparation, le 6/8 aurait demandé un second jeu de
figures.

Le résultat d'une tentative est celui prévu, à un champ près :

```js
{ index: 1, expectedTime: 2.0, judgment: "early",
  degree: "slight", deviationMs: -180, fraction: -0.24 }
```

`degree` est **hors** du `judgment` : c'est le jugement qui va dans le journal,
et un seuil qui change ne doit pas invalider un historique déjà écrit
([F3 § 7](F3-suivi-progression.md#7-modèle-de-données--figé-le-25072026)).

## 11. Découpage technique

Découpage réellement en place (26/07/2026) :

```text
src/
  rhythm-mode.js     # trois familles, notation SVG, capture, transport   [fait]
  rhythm/
    patterns.js      # figures, motifs par niveau, développement d'un motif [fait]
    timing.js        # jugement, appariement des frappes, bilan            [fait]
  metronome.js       # pulsation et décompte — inchangé, cf. ci-dessous
```

`patterns.js` et `timing.js` ne dépendent ni du DOM ni de Tone.js : leurs 217
vérifications tournent dans Node (§ 18).

### `metronome.js` n'a eu besoin d'aucune extension

L'étape A prévoyait de « l'étendre pour exposer la pulsation à `timing.js` ».
Il ne l'a pas fallu : `createBeatGrid()` prenait déjà le nombre de temps par
mesure en paramètre — donc 3/4 et 6/8 marchent sans y toucher — et
`scheduleClicks()` prenait déjà son ordonnanceur de l'extérieur, donc le mode
Rythme lui passe son propre `Tone.Part`. Le pari de l'étape 9, écrire ce module
en pensant à 05, a tenu.

Avec une nuance honnête : `nearestBeat()`, ajoutée à `metronome.js` *pour* 05,
n'est **pas** ce dont 05 a eu besoin. Une frappe se compare aux attaques du
motif, pas aux temps du métronome — une syncope tombe justement entre deux
temps. `timing.js` fait donc son propre appariement, et `nearestBeat()` ne sert
plus qu'aux vérifications (contrôler que les attaques d'un motif tombent bien
sur la grille) et, plus tard, aux
[exercices de pédale](09-pedale.md#7-mesurer-un-changement-de-pédale). C'est le
rappel utile qu'une API écrite d'avance pour un besoin supposé se trompe une
fois sur deux, même quand le module, lui, était le bon.

### Ni quatrième clavier partagé, ni notation partagée

Le mode « Piano à l'écran » affiche une octave de `<button>` écrite dans
`rhythm-mode.js`. C'est le quatrième clavier de l'application, et il n'a pas été
mutualisé avec celui de la Lecture de notes : celui-là a une étendue variable,
un défilement, des états juste/faux/indice et une carte de touches ; celui-ci
accepte n'importe quelle touche et ignore la hauteur. Mutualiser produirait un
module à cinq réglages dont un seul consommateur en utiliserait deux — l'exacte
abstraction que [F1 § 6](F1-navigation.md#6-découpage-technique-proposé) refuse.

Même raisonnement pour la notation : la portée d'une ligne dessinée ici et la
portée de cinq lignes de la Lecture de notes ne partagent aucune coordonnée. Le
vocabulaire de figures, lui, **est** partagé et vit dans `patterns.js` : c'est
lui que reprendra la [Lecture de partitions](08-lecture-partitions.md#4-frontière-avec-lentraînement-rythmique-05),
pas le dessin.

## 12. Étapes de réalisation

### Étape A — Fondations — **faite le 26/07/2026**

- [x] Définir le format d'un motif rythmique (section 10).
  (figures plutôt que durées, pour que la Reconnaissance puisse nommer le
  symbole et la portée le dessiner)
- [x] Définir les catégories de jugement et leurs seuils (section 5).
  (`rhythm/timing.js` ; le degré léger/net reste hors du jugement)
- [x] Étendre `metronome.js` pour exposer la pulsation à `timing.js`.
  (aucune extension nécessaire : il avait été écrit pour ça à l'étape 9 —
  § 11)

### Étape B — Métronome — **faite le 26/07/2026**

- [x] Créer l'écran Métronome avec tempo réglable.
  (tempo en grand, modifiable **en marche**, arrêt et reprise)
- [x] Ajouter la pulsation audible et visuelle.
  (quatre points dont le premier accentué ; le point du temps en cours
  s'allume, sans boucle d'animation — tout est planifié sur le Transport et
  rendu par `Tone.Draw`)
- [x] Réutiliser le décompte pour les deux autres familles.
  (une mesure de décompte avant la reproduction, la même grille partout)

### Étape C — Reconnaissance — **faite le 26/07/2026**

- [x] Générer et jouer un motif court par niveau.
  (motif tiré du niveau, jamais deux fois le même d'affilée, joué à
  l'ouverture et réécoutable)
- [x] Proposer un QCM de durées/silences.
  (quatre propositions prises dans le vocabulaire du niveau, de préférence de
  même nature que la réponse — la question porte sur la durée, pas sur
  « note ou silence ? »)
- [x] Produire le bilan de session.

### Étape D — Reproduction (tap et piano à l'écran) — **faite le 26/07/2026**

- [x] Capturer les évènements de tap et de clic piano avec horodatage.
  (grand bouton, barre d'espace, ou n'importe quelle touche du piano ;
  l'horodatage est la position du Transport, la même horloge que le motif)
- [x] Comparer chaque frappe à la grille attendue et lui attribuer un
  jugement.
  (appariement par écart croissant, pas par ordre d'arrivée : jouer trop tôt
  la troisième note ne doit pas la faire prendre pour la deuxième)
- [x] Ajouter le retour visuel immédiat par frappe et le bilan de session.
  (écart en millisecondes à chaque frappe, puis chaque note du motif colorée
  selon son jugement ; le bilan dit aussi la **tendance**)

### Étape E — Entrée MIDI physique — **faite le 26/07/2026**

- [x] Brancher [F2](F2-entree-midi.md) pour reproduire sur un clavier MIDI
  physique.
  (troisième mode d'entrée, visible mais désactivé tant qu'aucun clavier
  n'écoute ; la hauteur reste ignorée, comme au piano à l'écran)
- [x] Vérifier l'absence de régression du mode tap / piano à l'écran quand
  MIDI n'est pas branché.
  (les 141 vérifications du mode Rythme rejouées, dont les deux entrées
  d'origine)

**L'horodatage du message MIDI est utilisé, pas l'instant du rappel.** C'est le
seul endroit où cela change quelque chose de mesurable : quelques millisecondes
séparent l'arrivée d'un message de son traitement, et c'est précisément l'ordre
de grandeur que la fenêtre du § 5 juge. On corrige donc l'instant
(`Transport.seconds − (now − timestamp)`) au lieu de lire simplement
« maintenant ». C'est ce que
[F2 § 8](F2-entree-midi.md#8-modèle-normalisé--en-place) avait anticipé en
gardant `timeStamp`.

Deux filets, parce qu'un clavier peut être débranché entre deux écrans :

- un réglage `midi` restauré d'une séance passée n'est repris que si le clavier
  écoute encore ;
- si le clavier disparaît entre le réglage et le départ, la séance retombe sur
  le tap plutôt que de s'ouvrir muette.

## 13. Critères d'acceptation

- [x] L'utilisateur peut lancer le mode Métronome et entendre/voir une
  pulsation réglable.
- [x] L'utilisateur peut lancer un exercice de Reconnaissance et identifier
  des durées et silences de base.
- [x] L'utilisateur peut reproduire un motif en tapant, avec un retour par
  frappe (à l'heure / en avance / en retard / manquée).
- [x] La même reproduction fonctionne en cliquant le piano à l'écran, sans
  que la hauteur jouée ne soit prise en compte.
  (vérifié : aucune hauteur n'apparaît dans le retour ni dans le journal)
- [x] Chaque famille propose un bilan de fin de session sans métrique
  inventée.
  (le Métronome n'en a **aucun** : c'est un outil ; la Reproduction n'affiche
  pas de précision s'il n'y a rien à mesurer)
- [x] Une fois F2 disponible, la reproduction fonctionne aussi avec un
  clavier MIDI physique, sans régression du mode tap / piano à l'écran.
  (26/07/2026 — vérifié avec une doublure du Web MIDI ; le test avec un vrai
  clavier reste la ligne ouverte de [F2](F2-entree-midi.md))
- [ ] Les trois niveaux de difficulté proposent des motifs et des tempos
  différents et cohérents avec la section 6.
  (les trois niveaux, leurs mesures — 4/4, 3/4, 6/8 — et leurs tempos sont en
  place et vérifiés ; il manque les **triolets** du niveau Difficile, § 6)

## 14. Ce que la séance laisse dans le journal

Troisième productrice de [F3](F3-suivi-progression.md), et la première à écrire
des `beat`. Là encore, aucun champ ni `outcome` n'a eu à être ajouté au format
figé le 25/07/2026 :

| Famille | Évènements |
| --- | --- |
| **Métronome** | seulement les bornes de séance — il n'y a rien à noter |
| **Reconnaissance** | un `answer` par question, `correct` / `wrong`, cible `{ patternId, figure, difficulty }`, et `given: { figure }` sur une erreur |
| **Reproduction** | un `beat` par attaque attendue, `outcome` = le jugement, cible `{ patternId, beat, difficulty, inputMode }`, et `given: { deviationMs }` — la mesure brute, jamais le degré |

C'est exactement ce que prévoyait
[F3 § 7](F3-suivi-progression.md#degrés-et-seuils--jamais-dans-loutcome) pour les
seuils : l'évènement porte `deviationMs`, la vue appliquera « léger » ou « net ».
Changer les seuils du § 5 ne périmera donc aucun historique.

## 15. Validation prévue

- tests unitaires du calcul de l'écart temporel et de sa catégorisation,
  pour plusieurs tempos ;
- tests du générateur de motifs par niveau ;
- test manuel des trois familles au clavier, à la souris et au tactile ;
- test manuel avec un clavier MIDI physique une fois F2 disponible ;
- vérification sur petite largeur d'écran ;
- vérification de l'absence de régression des Exercices techniques (03)
  après extension de `metronome.js`.

## 16. Décisions ouvertes — trois tranchées le 26/07/2026

- ~~Faut-il des sons de percussion neutres (clic, clap) ou le son de piano
  existant pour jouer un rythme de référence ?~~ **Neutres**, et *deux* timbres
  distincts : un clic carré pour la pulsation, un son triangle plus doux pour le
  motif de référence. Il faut entendre lequel on suit, et le piano suggérerait
  une hauteur que cet exercice ignore justement (§ 3). Le piano ne sonne que
  quand l'utilisateur frappe une touche, comme retour de son propre geste.
- Faut-il resserrer automatiquement la fenêtre de tolérance de la section 5
  selon le niveau (plus stricte en Difficile) ? **Pas dans le MVP** : la fenêtre
  étant une fraction du temps, elle se resserre déjà toute seule quand le tempo
  monte — 59 ms à 102 bpm, 29 ms à 208. Ajouter un facteur par niveau
  reviendrait à durcir deux fois. À rouvrir seulement si la pratique montre que
  Difficile est trop indulgent.
- ~~Le bilan doit-il distinguer une tendance systématique (toujours en avance)
  d'une simple irrégularité ?~~ **Oui, c'est fait.** Un biais n'est
  « systématique » que si les frappes sont groupées autour de lui (écart-type ≤
  |moyenne|) ; sinon c'est une irrégularité qui penche. Les deux ne se corrigent
  pas de la même façon, et le bilan le dit en une phrase : « laisse la pulsation
  arriver » contre « écoute le métronome, pas tes doigts ».
- Faut-il, à un niveau avancé, une saisie plus libre en Reconnaissance
  (taper le nombre de temps) plutôt qu'un QCM uniquement ? Toujours ouvert —
  hors MVP.

### Lecture retenue pour la Reconnaissance

Le § 4 dit « un motif court joué **et affiché**, choix parmi quelques notations
(QCM) », et « Nommer une durée ou un silence ». Les deux se lisaient de deux
façons : deviner un rythme entendu parmi des notations, ou nommer une figure
qu'on voit. C'est la seconde qui a été retenue (26/07/2026) : le motif est
dessiné et joué, **une de ses figures est encadrée**, et il faut la nommer parmi
quatre.

Deux raisons. C'est la lecture littérale de « nommer une durée », et c'est la
compétence fondatrice : relier le symbole à son nom et à son son. Reconnaître un
rythme entendu parmi plusieurs notations est une compétence d'oreille, plus
proche de [07](07-entrainement-oreille.md) que de la lecture de durées que
[08](08-lecture-partitions.md) reprendra d'ici.

## 17. Hors périmètre pour le moment

- Pas de dictée rythmique écrite (transcrire un rythme entendu en
  notation).
- Pas de combinaison avec la hauteur des notes : le rythme reste travaillé
  indépendamment de la mélodie ; une combinaison future resterait du
  ressort du mode Morceau ou d'un futur travail intelligent d'un morceau.
- Pas de polyrythmie à deux mains (rythmes différents simultanés).
- Pas d'accélération automatique du tempo sans validation explicite de
  l'utilisateur.

## 18. Validation effectuée (26 juillet 2026)

**Jugement, motifs et grille, hors navigateur** — 217 vérifications sur 217,
dans Node, en important directement `timing.js`, `patterns.js` et
`metronome.js` :

- seuils du § 5 aux bornes exactes : 10 % reste « à l'heure », 25 % encore
  « léger », 40 % encore « net », et un pas au-delà de chacun fait basculer ;
- la tolérance suit bien le tempo : 100 ms est à l'heure à 60 bpm et ne l'est
  plus à 200, et une même *fraction* donne le même jugement de 40 à 200 bpm ;
- le degré n'entre jamais dans le jugement, et une frappe non reçue ne porte
  aucun écart ;
- **appariement des frappes** : quatre frappes justes appariées, une attente non
  frappée reste manquée sans voler la suivante, deux frappes pour une attente
  laissent la plus proche gagner, une frappe hors fenêtre est comptée « en
  trop », et — le cas qui justifie l'algorithme — des frappes **dans le
  désordre** (la troisième note jouée avant la deuxième) sont toutes appariées
  correctement, ce qu'un parcours dans l'ordre d'arrivée aurait raté ;
- bilan : tendance « régulière » à 4/4 à l'heure, « en avance » quand toutes les
  frappes penchent du même côté et sont groupées, « irrégulier » quand la
  dispersion dépasse le biais, aucune précision inventée sur zéro frappe, et
  aucune tendance déduite sans une seule mesure ;
- catalogue : **les 23 motifs remplissent exactement leur mesure**, figures
  connues, et un motif incomplet, vide ou à figure inconnue est signalé ;
- mesures : 4/4 et 3/4 battent la noire, 6/8 bat la croche et vaut trois noires ;
  les instants d'un motif de 6/8 tombent bien sur ses six temps, et deux noires
  pointées y font deux fois trois temps ;
- vocabulaire de chaque niveau **relu dans ses motifs** plutôt que déclaré à
  part : Débutant a noire/blanche/ronde et soupir/demi-pause/pause sans double
  croche, Difficile a la double croche et garde des silences ;
- développement : le motif du § 10 donne exactement les quatre évènements
  attendus, le silence ne s'attaque pas, le décalage par le décompte place la
  première note sur une pulsation de la grille, trois mesures s'enchaînent sans
  trou, et doubler le tempo divise tout dans le même rapport ;
- QCM : sur 300 questions par niveau, toujours quatre propositions distinctes,
  toujours dans le vocabulaire du niveau, la bonne réponse toujours proposée et
  toujours celle de la figure interrogée, les leurres de même nature dans plus
  de 60 % des cas, et les figures interrogées varient.

> Ces vérifications ont corrigé le plan, pas le code : l'exemple chiffré du § 5
> annonçait « −180 ms à 80 bpm = en avance (net) » alors que son propre tableau
> en fait une avance *légère* (180/750 = 24 %). Le tableau fait foi ; l'exemple a
> été rectifié.

**Chaîne complète, dans Chrome sans interface** — 139 vérifications sur 139,
trois exécutions consécutives identiques, en six phases enchaînées par de vraies
navigations :

- **Métronome** : tempo en grand (≥ 40 px), quatre points dont le premier
  accentué, pulsation visuelle qui **avance réellement de temps en temps** (au
  moins trois points différents allumés au fil de l'observation), tempo modifié
  en marche sans arrêter la pulsation, arrêt puis reprise, et aucun score nulle
  part ;
- **Reconnaissance** : portée d'une seule ligne, chiffrage 4/4 dessiné, barre de
  mesure, une seule figure encadrée, figures ordonnées dans le temps et aucune
  hors de la mesure, têtes creuses jamais munies de crochet, silences sans tête
  ni hampe ;
- **les glyphes de silence sont réellement dessinés** — pause, demi-pause,
  soupir et demi-soupir rendus dans un canvas et comptés au pixel, parce que
  `getBBox()` renvoie la boîte em de la police et non l'encre : un glyphe absent
  y aurait la même taille ;
- QCM : quatre propositions distinctes, toutes des noms français de figures ; une
  réponse fausse révèle la bonne et fige les boutons ; la question suivante
  arrive ; et la bonne réponse **déduite du seul dessin** (tête creuse + hampe =
  blanche, deux crochets = double croche…) est bien celle que l'application
  attendait ;
- **Reproduction** : décompte, puis « Écoute » où le motif est joué, puis
  « À toi ! » ; frapper avant son tour ne compte pas et le dit ; chaque frappe
  affiche son écart en millisecondes, et **le jugement affiché correspond
  toujours à l'écart affiché** selon le tableau du § 5 ; les têtes de note
  prennent la couleur de leur jugement ; un motif sans aucune frappe donne
  « 0 / n à l'heure » et des têtes rouges ;
- les frappes du harnais sont déclenchées sur l'horloge audio, **aux instants
  relus dans la portée dessinée** (l'abscisse d'une tête de note donne son
  temps) : le dessin et le jugement sont donc vérifiés d'un même geste ;
- bilan de Reproduction : frappes à l'heure sur le total, meilleure série,
  tendance expliquée en une phrase, détail par jugement **sans afficher un
  jugement à zéro** ;
- **Piano à l'écran** : huit blanches et cinq noires, toutes des `<button>`
  annoncés par leur nom, ≥ 30 px ; frapper une blanche **et** une noire compte de
  la même façon, et aucune hauteur n'apparaît dans le retour ni dans le journal ;
- journal : un `answer` par question de Reconnaissance avec la figure donnée à la
  place sur une erreur, un `beat` par attaque attendue en Reproduction, jugements
  tous dans le vocabulaire fermé, degré jamais dans l'`outcome`, écart brut
  conservé sur les frappes mesurées et absent sur les manquées, et le Métronome
  qui ne produit **aucun** évènement noté ;
- réglages repris après un vrai rechargement (famille, entrée, tempo, motifs), et
  un tempo cherché au métronome qui **ne se reporte pas** sur un exercice ;
- stockage neutralisé avant le chargement des modules : la séance va jusqu'à son
  bilan et l'utilisateur y est prévenu ;
- arrêt : quitter par l'accueil en pleine pulsation stoppe le Transport, vide la
  scène, et rien ne se restaure ensuite ;
- aucune erreur de page sur les trois exécutions.

**Mise en page** — 300 vérifications sur 300, trois exécutions identiques, pour
les quatre configurations (Métronome, Reconnaissance/Débutant,
Reproduction/Taper et Reproduction/Piano en Difficile) à 360×640, 390×844,
844×390 et 1280×800 :

- aucun débordement horizontal aux réglages, pendant l'exercice et au bilan ;
- portée entière dans la largeur et jamais coupée, aucune figure hors de sa
  boîte, barre de statut sur une seule ligne ;
- cibles tactiles : boutons − / +, boutons de choix, réponses du QCM et actions
  du bilan tous ≥ 30 px dans les seize cas ;
- **rien ne défile en paysage** — c'est cette vérification qui a montré que
  l'écran de Reconnaissance débordait de 15 px à 844×390 (portée, question,
  quatre réponses, retour et actions) ; ce sont les interlignes qui ont cédé, pas
  les cibles ;
- mesures relevées :

  | Écran | Portée | Zone de frappe | Touche de piano |
  | --- | --- | --- | --- |
  | 360×640 | 316×104 | 96 px | 40,3 px |
  | 390×844 | 346×104 | 96 px | 44 px |
  | 844×390 | 504×76 | 74 px | 58,3 px |
  | 1280×800 | 600×130 | 108 px | 58,3 px |

  Contrairement au clavier des Exercices techniques, celui-ci ne descend jamais
  sous 40 px : il tient toujours une seule octave, quelle que soit la
  configuration.

**Non-régression** — tous les harnais précédents rejoués tels quels : 154/154
(moteur 02), 74/74 (journal F3) et 245/245 (exercices 03) dans Node ; 200/200
(interface 02), 110/110 (mise en page 02), 50/50 (chaîne F3), 124/124
(exercices 03) et 184/184 (mise en page 03) dans Chrome. Le mode Morceau
s'ouvre toujours, ses contrôles apparaissent et se masquent, et aucun contrôle de
Morceau n'apparaît en mode Rythme.

Restent à vérifier à la main : **le toucher réel sur la tablette, et le son des
deux voix à l'oreille** — le clic de pulsation et le timbre du motif de référence
n'ont été jugés qu'à la lecture du code.

## 19. Première priorité — faite

Construire une boucle minimale : **mode Métronome fonctionnel (tempo
réglable, pulsation audible et visuelle) → un motif de reproduction simple
en Débutant (noires et blanches sur 4 temps) → tap au clavier ou clic sur
le piano à l'écran → retour à l'heure / en avance / en retard par frappe →
bilan de session.**

C'est fait (26/07/2026), et la Reconnaissance l'a suivi comme prévu. Les trois
familles partagent la même grille de pulsation, la même notation et le même
journal. Reste l'**étape E** — l'entrée MIDI physique —, qui attend
[F2](F2-entree-midi.md), puis les triolets et la saisie libre en Reconnaissance.
