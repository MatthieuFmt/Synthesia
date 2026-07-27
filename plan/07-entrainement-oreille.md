# Feature 07 — Entraînement de l'oreille

> Statut : MVP en place pour les **trois premières familles** (Note isolée,
> Intervalles, Majeur / mineur) × **trois niveaux**, du repère Do au bilan,
> vérifié dans Node et dans un navigateur (§ 18). La **Mélodie** (étape E) reste
> hors MVP, comme le prévoit le § 4.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir les quatre familles d'exercices.
- [x] Définir la réutilisation du moteur de session de la Lecture de notes.
- [x] Définir la frontière avec la future théorie musicale.
- [x] Ajouter l'accès au mode Entraînement de l'oreille.
  (carte « Oreille » de l'accueil ; `ear-training-mode.js`)
- [x] Implémenter la reconnaissance d'une note entendue.
  (trois étendues, réponse au piano à l'écran ou au clavier MIDI)
- [x] Implémenter la reconnaissance des intervalles.
  (degré nommé en Débutant et Intermédiaire, écarts qualifiés en Difficile)
- [x] Implémenter la distinction majeur / mineur.
  (position serrée, puis autres degrés, puis premiers renversements)
- [ ] Implémenter la reproduction d'une courte mélodie.
  (hors MVP, cf. § 4 — la seule famille dont la validation se fait note à note)

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

Découpage réellement en place (27/07/2026) :

```text
src/
  ear-training-mode.js     # rendu, interactions, écoute                 [fait]
  ear/
    questions.js           # stimuli par famille et niveau, session      [fait]
  session-engine.js        # moteur de session partagé, extrait de 02    [fait]
  piano-dom.js             # clavier de réponse, partagé avec 02         [fait]
  audio.js                 # lecture d'une note ou d'un accord (partagé) [étendu]
```

`session-engine.js` est bien l'extraction du moteur décrit en 02, faite ici et
pas avant. Trois écarts par rapport au découpage prévu, tous assumés :

- **`piano-dom.js` ne figurait pas dans la liste.** Le § 7 renvoyait pourtant
  explicitement au clavier de 02 : c'était donc un second consommateur de la
  *même* version, pas d'une variante. Il a été extrait avec un **préfixe de
  classes CSS en paramètre** (`nr-` pour 02, `ear-` ici), ce qui laisse le DOM de
  02 identique au octet près — c'est ce qui a permis de rejouer ses harnais tels
  quels comme vraie mesure de non-régression (§ 18). Ce n'est pas le `piano.js`
  universel que le dossier refuse depuis le début : les 88 touches en Canvas du
  mode Morceau, le rouleau des Exercices et l'octave sans hauteur du Rythme n'ont
  toujours rien à voir avec celui-ci.
- **`audio.js` a reçu `playNotes()`**, qui date les attaques depuis `Tone.now()`.
  Laisser le temps indéfini, comme le fait `playNote()`, suffisait à arpéger
  légèrement un accord censé être simultané — c'est exactement ce que l'étape A
  demandait de vérifier.
- **La construction de la session vit dans `ear/questions.js`**, pas dans le
  fichier de mode (`createEarSession()`). Le fichier de mode importe Tone.js
  depuis un CDN, ce qui suffirait à empêcher de l'importer dans Node ; le câblage
  du moteur est ainsi vérifié hors navigateur, comme le moteur de 02.

## 12. Étapes de réalisation

### Étape A — Fondations — faite le 27/07/2026

- [x] Extraire le moteur de session de 02 en module réutilisable.
  (`session-engine.js` : tentatives, série, erreurs par cible, pondération et
  bilan ; ce qui varie — tirage, identité d'une cible, verdict — est injecté)
- [x] Définir le format de question (section 10).
- [x] Vérifier que l'audio permet de jouer un accord simultané proprement.
  (`playNotes()` date les attaques ; le harnais navigateur mesure que les trois
  notes d'un accord partent au même instant à moins d'une microseconde)

### Étape B — Note isolée — faite le 27/07/2026

- [x] Générer une note du groupe selon le niveau.
  (Do4 → Sol4 ; l'octave blanche Do4 → Do5 ; Do3 → Do5 avec les altérations)
- [x] Jouer le stimulus et le repère à la demande.
  (« Écouter » et « Repère : Do », illimités et sans pénalité)
- [x] Valider la touche jouée et produire le bilan.
  (clavier à l'écran ou clavier MIDI branché, toujours optionnel)

### Étape C — Intervalles — faite le 27/07/2026

- [x] Générer un intervalle du niveau, en successif.
- [x] Proposer les noms d'intervalles en réponse.
  (le degré seul en Débutant et Intermédiaire, les douze écarts qualifiés en
  Difficile)
- [x] Ajouter la variante simultanée.
  (tirée au sort en Intermédiaire, systématique en Difficile)
- [x] Ajouter l'aide qui fait entendre la différence après plusieurs erreurs.

### Étape D — Majeur / mineur — faite le 27/07/2026

- [x] Générer un accord majeur ou mineur.
- [x] Proposer les deux réponses et valider.

### Étape E — Mélodie — hors MVP

- [ ] Générer une suite de 3 à 5 notes.
- [ ] Valider la reproduction note par note, dans l'ordre.
- [ ] Signaler la position de l'erreur sans effacer le début.

## 13. Critères d'acceptation

- [x] L'utilisateur peut entendre une note et la retrouver sur le piano, avec
  un repère rejouable à volonté.
- [x] Réécouter le stimulus est illimité et sans pénalité.
- [x] Les intervalles du niveau sont proposés et corrigés.
- [x] Un accord majeur et un accord mineur sont distinguables et corrigés.
- [ ] Une courte mélodie peut être reproduite note par note. (étape E, hors MVP)
- [x] Une erreur conserve la question en cours.
- [x] Aucune portée n'apparaît pendant une question.
- [x] Le bilan de fin de session est cohérent avec celui de la Lecture de
  notes. (mêmes trois chiffres, mêmes « à revoir », mêmes deux actions)
- [x] La Lecture de notes ne régresse pas après extraction du moteur de
  session. (ses trois campagnes rejouées telles quelles — § 18)

## 14. Validation prévue

- tests unitaires de la génération des stimuli par famille et par niveau ;
- tests des intervalles produits (nom attendu pour un écart donné) ;
- tests de la validation d'une mélodie, y compris erreur en cours de suite ;
- test de non-régression de 02 après extraction du moteur de session ;
- test manuel à la souris, au toucher et au clavier MIDI si disponible ;
- vérification de l'audio après le premier geste utilisateur ;
- vérification sur petite largeur d'écran.

## 15. Décisions ouvertes — tranchées le 27/07/2026

- **Tonalité de référence : Do, fixe.** Le repère est toujours un Do4, rejouable
  à volonté. Un troisième réglage sur l'écran de départ n'apporterait rien tant
  que l'oreille ne reconnaît pas encore en Do ; il reste possible plus tard sans
  rien casser, `REFERENCE_MIDI` étant le seul point d'entrée.
- **Les intervalles se nomment.** Jouer la seconde note à partir de la première
  reviendrait à refaire la famille Note isolée avec un autre repère : c'est
  nommer le rapport entre deux sons qui est la compétence nouvelle. Le § 6 le
  prévoyait déjà en exceptant « le nom d'un intervalle » de la réponse jouée.
- **Intervalles ascendants seulement.** La seconde note monte toujours. Les
  descendants doublent le vocabulaire de réponse sans rien apprendre de neuf
  tant que les ascendants ne sont pas acquis ; ils appartiennent à une reprise
  ultérieure de cette fonctionnalité.
- **Pas de mode « chanter puis vérifier ».** Sans micro, il se réduirait à un
  bouton « je l'ai eu » que rien ne contredit : ce n'est pas un exercice, c'est
  une déclaration. Rejoint le § 16.

Une décision **nouvelle**, apparue en construisant : à partir de quel niveau la
qualité d'un intervalle est-elle demandée ? En Débutant et Intermédiaire, seul
le degré est nommé (« tierce »), parce que les confusions utiles à ce stade sont
tierce/quarte, pas majeur/mineur. Le niveau Difficile prend « tous les
intervalles jusqu'à l'octave » (§ 5), ce qui *oblige* à les qualifier : sans
qualité, les douze écarts ne se distinguent plus, et le triton n'a pas de nom de
degré du tout.

## 16. Hors périmètre pour le moment

- Pas de détection du chant par microphone.
- Pas de dictée mélodique écrite sur portée.
- Pas d'accords à quatre sons ni de progressions harmoniques complètes.
- La **construction** d'un accord demandé, les degrés et les renversements
  relèvent de la future Théorie musicale appliquée, pas de cette
  fonctionnalité : ici l'accord est **entendu**, pas construit à partir de
  son nom.

## 17. Première priorité — faite

Construire une boucle complète sur la famille la plus fondatrice :
**choisir Oreille → Débutant → entendre le Do de référence → entendre une
note parmi cinq → la jouer sur le piano → recevoir le retour → terminer dix
questions → voir le bilan.**

Cette boucle existe, et le pari du § 3 est tenu : **les intervalles et
majeur/mineur n'ont demandé aucun travail supplémentaire de session.** Les deux
familles se branchent sur le même `createEarSession()` en ne changeant que trois
choses — ce qui identifie une cible, ce qui vaut bonne réponse, et ce qui est
affiché pour répondre.

## 18. Validation effectuée (27 juillet 2026)

**Hors navigateur** — 183 vérifications sur 183, dans Node, en important
directement `session-engine.js` et `ear/questions.js` :

- **moteur partagé** : première question tirée d'emblée, poids initiaux à 1 et
  poids hérités repris ; une bonne réponse compte série, meilleure série et
  « du premier coup » ; une mauvaise ne change pas la question, remet la série à
  zéro, mémorise l'erreur et porte le poids de 1 à 3 sans toucher aux autres ;
  la session se ferme au compte voulu et ignore ensuite toute réponse ; l'aide
  suit sa règle (immédiate, après une, après deux erreurs) et redevient
  indisponible à la question suivante ; le bilan limite les « à revoir » à trois,
  triés par nombre d'erreurs, et garde à zéro un groupe qui n'a rien répondu ;
  sur 6 000 tirages, un poids 3 sort 3,0 fois plus qu'un poids 1 ;
- **note isolée** : les trois étendues sont celles du § 5, Débutant et
  Intermédiaire n'ont que des blanches, Difficile a ses altérations et place le
  repère Do4 au milieu de son étendue ;
- **intervalles** : sur 3 000 tirages par niveau, l'écart produit porte
  **toujours** le nom annoncé, tous les noms du niveau sortent, et la
  construction diatonique ne pose que des blanches en Débutant et Intermédiaire.
  Les deux pièges classiques sont vérifiés explicitement : **Si n'est jamais la
  racine d'une « quinte »** et **Fa jamais celle d'une « quarte »** — ces deux
  écarts font six demi-tons, un triton — alors que Si reste racine des autres
  degrés. Débutant est toujours successif, Difficile toujours simultané,
  Intermédiaire produit bien les deux ;
- **majeur / mineur** : sur 2 000 tirages par niveau, les trois notes
  correspondent exactement à la couleur annoncée, renversement compris ;
  Débutant se limite aux degrés fondamentaux (Do, Fa, Sol) en position serrée,
  Difficile produit aussi des premiers renversements ;
- **pas de répétition immédiate** sur 3 000 enchaînements en note isolée et en
  intervalles — mais **la même couleur peut se répéter** en majeur/mineur : avec
  deux réponses possibles, l'écarter produirait une alternance devinable sans
  rien entendre ;
- **révisions** : avec un poids hérité de 3 sur Fa4, cette note sort au moins
  1,4 fois plus que chacune des autres sur 5 000 tirages, et les quatre autres
  continuent toutes de sortir ;
- **aide** : la paire à faire entendre est la bonne réponse puis celle proposée,
  jamais rien si la réponse est juste ou absente ; pour un intervalle elle part
  de la même racine, et un degré injouable à cet endroit de la gamme retombe sur
  son écart de référence plutôt que de ne rien jouer ;
- **une session complète pour chacune des neuf combinaisons** : dix questions
  cohérentes, bilan 10/10 à 100 % ; et une session avec quatre fautes
  volontaires donne 6 du premier coup, 10/14 de précision, au plus trois degrés
  à revoir.

**Dans Chrome sans interface** — 116 vérifications sur 116, cinq phases séparées
par de vrais rechargements de page. Le harnais **n'interroge jamais l'état
interne du mode** : il intercepte les attaques du sampler Tone et **déduit la
bonne réponse du son réellement joué**, comme le ferait une oreille. Un stimulus
faux ou muet fait donc échouer le scénario.

- accueil et réglages : la carte Oreille est disponible, trois familles et trois
  niveaux, aucun « Bientôt », aucun réglage désactivé, changer un réglage ne
  lance rien ;
- **aucune portée n'est dessinée pendant une question** (§ 7), aucun nom de note
  n'apparaît dans le retour d'une erreur ;
- note isolée : le stimulus est une note du groupe ; **réécouter rejoue
  exactement la même** et le repère est bien un Do4, ni l'un ni l'autre ne fait
  avancer la session ; une touche fausse sonne quand même, conserve la question
  et remet la série à zéro ; l'aide est refusée après une erreur, proposée après
  deux, et fait entendre la bonne note **puis** celle proposée, pas ensemble ;
  les dix questions s'enchaînent sans jamais répéter une note d'affilée ;
- bilan cohérent avec l'unique question ratée (9/10 du premier coup, 83 % de
  précision, meilleure série 10, une seule note à revoir avec son octave) ;
- **journal F3** : douze tentatives, dix justes et deux fausses, chaque cible
  portant sa famille et sa hauteur, chaque faute conservant la note jouée à la
  place, le tout formant une paire `session-start`/`session-end` en `done` ;
- intervalles : quatre propositions en Débutant, **douze qualifiées en
  Difficile** ; les deux notes se suivent en Débutant et **sonnent exactement
  ensemble en Difficile** (moins d'une microseconde d'écart mesurée) ; l'aide
  rejoue le bon intervalle puis celui proposé depuis la même racine ;
- majeur / mineur : trois notes émises **au même instant**, en position serrée,
  reconnaissables comme majeures ou mineures par un calcul refait dans le
  harnais ; l'aide rejoue l'accord puis le même dans l'autre couleur ;
- abandon : quitter en pleine session enregistre `abandoned` avec le nombre de
  questions réellement faites, sans perdre les réponses déjà données, et plus
  aucun son ne repart après l'arrêt ;
- stockage refusé : la session va jusqu'à son bilan et l'utilisateur y est
  prévenu que rien n'a été enregistré.

**Mise en page** — 72 vérifications sur 72, à 360×640, 390×844, 844×390 et
1280×800, sur les deux écrans les plus chargés (le clavier chromatique de deux
octaves et la grille des douze intervalles) :

- aucun débordement horizontal de la page ni de la scène ;
- toutes les cibles ≥ 30 px : touches à 34 px en portrait, 35 px en paysage, et
  les douze propositions de 104 à 180 px de large pour 48 à 64 px de haut ;
- **en paysage (844×390), l'orientation réellement utilisée sur la tablette, le
  clavier ne défile pas** : les quinze blanches tiennent entières. Le défilement
  n'apparaît qu'en portrait, et seulement là ;
- la barre d'état tient sur une ligne, aucun nom d'intervalle n'est tronqué.

**Non-régression** — toutes les campagnes précédentes rejouées telles quelles :

| Campagne | Node | Navigateur |
| --- | --- | --- |
| 02 — Lecture de notes | 154 / 154 | 200 / 200 + 110 / 110 (mise en page) + 50 / 50 (étape D) |
| F3 — Progression | 74 / 74 | — |
| 03 — Exercices | 245 / 245 | 125 / 125 + 184 / 184 |
| F2 — MIDI | 86 / 86 | 120 / 120 |
| 05 — Rythme | 217 / 217 | 141 / 141 + 300 / 300 |
| 06 — Travail | 61 / 61 + 70 / 70 | 101 / 101 + 36 / 36 |
| 04 — Programme | 99 / 99 | 76 / 76 + 52 / 52 |
| **07 — Oreille** (nouveau) | **183 / 183** | **116 / 116 + 72 / 72** |
| **Total** | **1189** | **1683** |

Deux harnais ont dû être **corrigés**, sans qu'aucun code applicatif ne soit en
cause : ils affirmaient que l'accueil compte cinq fonctionnalités (il en compte
six), et le harnais de 04 construisait son programme en décochant les
fonctionnalités qu'il connaissait — il fallait lui apprendre la nouvelle. C'est
le prix normal d'un registre qui grandit.

Restent à vérifier à la main : le toucher réel sur la tablette, **le rendu
sonore à l'oreille** — plus décisif ici que partout ailleurs, puisque tout
l'exercice en dépend — et la réponse au clavier MIDI physique.
