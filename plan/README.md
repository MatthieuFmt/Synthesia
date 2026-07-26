# Plan de l'application

Ce dossier est la source de vérité pour suivre les fonctionnalités de
l'application. Une tâche de planification peut être cochée lorsque sa décision
est écrite. Une tâche décrivant un comportement de l'application est cochée
seulement lorsque ce comportement a été constaté dans le code.

## Légende

- [x] Fait dans l'application.
- [ ] À faire ou à valider.

La rédaction d'un plan et son implémentation sont suivies séparément : une
fonctionnalité documentée n'est pas considérée comme développée.

## Fondations transverses

Ces éléments ne sont pas des fonctionnalités pratiquées pour elles-mêmes :
ce sont des briques partagées dont plusieurs fonctionnalités ont besoin. Une
fondation est construite dès qu'au moins une fonctionnalité réelle en dépend
pour avancer, pas avant.

| Nº | Fondation | État actuel | Plan détaillé |
| --- | --- | --- | --- |
| F1 | Navigation entre les fonctionnalités | Première boucle en place | [F1-navigation.md](F1-navigation.md) |
| F2 | Entrée clavier MIDI (reconnaissance des touches jouées) | En place, pas encore consommée | [F2-entree-midi.md](F2-entree-midi.md) |
| F3 | Suivi de progression | Journal en place, vues à construire | [F3-suivi-progression.md](F3-suivi-progression.md) |

## Fonctionnalités

| Nº | Fonctionnalité | État actuel | Plan détaillé |
| --- | --- | --- | --- |
| 01 | Apprentissage d'un morceau | Version de lecture déjà en place | [01-apprentissage-morceau.md](01-apprentissage-morceau.md) |
| 02 | Lecture de notes | MVP complet + progression enregistrée | [02-lecture-notes.md](02-lecture-notes.md) |
| 03 | Exercices techniques et agilité des doigts | MVP en pratique libre | [03-technique-doigts.md](03-technique-doigts.md) |
| 04 | Programme d'entraînement | Planifiée | [04-programme-entrainement.md](04-programme-entrainement.md) |
| 05 | Entraînement rythmique | MVP des trois familles | [05-entrainement-rythmique.md](05-entrainement-rythmique.md) |
| 06 | Travail intelligent d'un morceau | Planifiée — suite de 01 | [06-travail-intelligent-morceau.md](06-travail-intelligent-morceau.md) |
| 07 | Entraînement de l'oreille | Planifiée | [07-entrainement-oreille.md](07-entrainement-oreille.md) |
| 08 | Lecture de partitions | Planifiée — suite de 02 | [08-lecture-partitions.md](08-lecture-partitions.md) |
| 09 | Exercices de pédale | Planifiée | [09-pedale.md](09-pedale.md) |

Deux fonctionnalités prolongent une fonctionnalité existante plutôt que d'en
ouvrir une nouvelle : **06** répond aux décisions laissées ouvertes par
**01**, et **08** poursuit l'étape D de **02**. Elles ont leur propre fichier
parce qu'elles sont volumineuses, mais elles réutilisent le moteur de leur
fonctionnalité d'origine au lieu de le dupliquer.

## Checklist générale

### Base déjà disponible

- [x] Charger les morceaux de la bibliothèque (17 morceaux : 4 de `midi/`,
  10 études Czerny et 3 Gnossiennes de `morceaux-exercice/`).
- [x] ~~Importer un fichier MIDI.~~ Retiré le 25/07/2026 : les morceaux sont
  fournis avec l'application, il n'y a plus rien à charger depuis l'appareil.
- [x] Analyser et afficher les notes d'un morceau.
- [x] Distinguer visuellement la main droite et la main gauche.
- [x] Lire, mettre en pause et déplacer la lecture.
- [x] Régler la vitesse.
- [x] Afficher la notation sur les notes.
- [x] Jouer le piano à l'écran à la souris ou au toucher.
- [x] Passer l'application en plein écran.

### Fondation F1 — Navigation entre les fonctionnalités

- [x] Définir le principe de l'écran d'accueil et du registre de fonctionnalités.
- [x] Définir le contrat commun de démarrage/arrêt d'une fonctionnalité.
- [x] Ajouter un écran ou un sélecteur de fonctionnalité.
- [x] Séparer le mode Morceau du démarrage général de l'application.
- [ ] Partager proprement les fonctions musicales, le son et le piano.
  (`music.js`, `audio.js` et `perf.js` extraits le 25/07/2026, quand la
  Lecture de notes en a eu besoin ; le piano reste propre à chaque mode, les
  deux claviers n'ayant encore rien en commun — cf. [F1 § 6](F1-navigation.md))
- [x] Arrêter proprement une fonctionnalité lors d'un changement de mode.
- [x] Conserver une navigation claire sur ordinateur et mobile.

Voir [le plan détaillé de la Navigation](F1-navigation.md).

### Fondation F2 — Entrée clavier MIDI

- [x] Définir le principe de la détection et de la connexion d'un clavier.
- [x] Définir le format normalisé d'un évènement de note.
- [x] Détecter le support du Web MIDI API et la connexion d'un appareil.
  (`midi-input.js`, sans DOM ; branchement et débranchement à chaud gérés)
- [x] Implémenter la réception et la normalisation des notes jouées.
  (note on/off, vélocité 0..1, horodatage du message, rebonds filtrés)
- [x] Ajouter l'indicateur de connexion et le choix de l'appareil.
  (panneau sur l'accueil, avec les dernières notes reçues)
- [x] Vérifier qu'aucune fonctionnalité ne devient dépendante du MIDI.
  (les quatre modes vérifiés sans support et après un refus de permission)
- [ ] Tester avec un vrai clavier branché.
  (les vérifications passent par une doublure du Web MIDI — voir
  [F2 § 15](F2-entree-midi.md#15-validation-effectuée-26-juillet-2026))

Voir [le plan détaillé de l'Entrée MIDI](F2-entree-midi.md).

### Fondation F3 — Suivi de progression

- [x] Définir le principe journal d'évènements + vues calculées.
- [x] Définir qui produit et qui consomme les données.
- [x] Trancher le chevauchement avec l'historique du Programme d'entraînement.
- [x] Définir et figer le format d'un évènement (à faire tôt).
  (figé le 25/07/2026 : une tentative = un évènement, journal unique où la
  séance est une paire d'évènements — cf. [F3 § 7](F3-suivi-progression.md#7-modèle-de-données--figé-le-25072026))
- [x] Implémenter la persistance locale.
  (`localStorage`, écriture groupée, plafond de 4 000 évènements, stockage
  refusé ou plein sans conséquence sur l'exercice)
- [ ] Implémenter les vues de progression.
- [x] Implémenter les révisions adaptées aux erreurs précédentes.
  (les notes ratées reviennent plus souvent ; « les moins vues récemment »
  attend l'étape D de F3)

Voir [le plan détaillé du Suivi de progression](F3-suivi-progression.md).

### Feature 01 — Apprentissage d'un morceau

- [x] Charger et visualiser un morceau MIDI.
- [x] Écouter le morceau avec un piano synthétisé.
- [x] Se déplacer librement dans le morceau.
- [x] Cliquer les touches du piano affiché.
- [ ] Transformer la lecture en véritable exercice guidé.
- [ ] Définir comment une note jouée par l'utilisateur est validée.
- [ ] Définir quand un morceau ou un passage est considéré comme appris.

Voir [le plan détaillé du mode Morceau](01-apprentissage-morceau.md).

### Feature 02 — Lecture de notes

- [x] Définir le principe de l'exercice.
- [x] Définir les difficultés Débutant, Intermédiaire et Difficile.
- [x] Définir les choix Main droite, Main gauche et Les deux.
- [x] Définir la session de dix notes et son bilan.
- [x] Ajouter l'accès au mode Lecture de notes.
- [x] Implémenter les réglages de départ.
  (les trois niveaux et les trois choix de main sont sélectionnables ; plus
  aucune combinaison désactivée)
- [x] Implémenter la génération des questions.
- [x] Implémenter la validation des touches.
- [x] Implémenter les indices et les retours correct / incorrect.
- [x] Implémenter le bilan de session.
- [x] Tester les neuf combinaisons de niveau et de main.
  (vérifiées dans le navigateur le 25/07/2026 —
  [02 § 9](02-lecture-notes.md#validation-des-niveaux-intermédiaire-et-difficile-25-juillet-2026))
- [x] Enregistrer les résultats, séparer le bilan par main et faire revenir les
  notes ratées. (25/07/2026 —
  [02 § 9](02-lecture-notes.md#validation-de-létape-d--progression-25-juillet-2026))
- [ ] Introduire les dièses et les bémols.

Voir [le plan détaillé de la Lecture de notes](02-lecture-notes.md).

### Feature 03 — Exercices techniques et agilité des doigts

- [x] Définir les premières familles d'exercices.
- [x] Définir une présentation proche des morceaux actuels.
- [x] Distinguer la pratique libre de la validation par clavier MIDI.
- [x] Ajouter l'accès au mode Exercices.
- [x] Créer le catalogue d'exercices.
  (trois exercices décrits en degrés de gamme, pas en fichiers MIDI)
- [x] Générer les notes, les doigtés et les répétitions.
  (notes de la même forme que celles du mode Morceau, plus le doigté)
- [ ] Ajouter les choix de difficulté, de main et de tempo.
  (main, tempo et répétitions faits ; la difficulté attend un premier exercice
  Intermédiaire — un sélecteur à une seule valeur serait un faux choix)
- [x] Ajouter le décompte, le métronome et la boucle.
  (`metronome.js` : grille de pulsation pure + lecture à ordonnanceur injecté,
  réutilisable par [05](05-entrainement-rythmique.md))
- [x] Implémenter les exercices de déliement, d'accords et d'arpèges du MVP.
- [x] Ajouter le bilan adapté au type d'entrée utilisé.
  (pratique libre : répétitions, tempo, durée — et aucun pourcentage, puisque
  rien n'est mesuré)

Voir [le plan détaillé des Exercices techniques](03-technique-doigts.md).

### Feature 04 — Programme d'entraînement

- [x] Définir le principe du programme (fonctionnalités, fréquence, durée).
- [x] Définir le calcul des séances dues du jour.
- [ ] Ajouter l'accès au Programme d'entraînement depuis la navigation.
- [ ] Implémenter la configuration du programme.
- [ ] Implémenter l'écran Aujourd'hui et le démarrage d'une séance planifiée.
- [ ] Enregistrer une séance comme terminée à la fin naturelle de la fonctionnalité.
- [ ] Tester les trois types de fréquence et le passage de semaine/mois.

Voir [le plan détaillé du Programme d'entraînement](04-programme-entrainement.md).

### Feature 05 — Entraînement rythmique

- [x] Définir le principe et les trois familles d'exercices.
- [x] Définir la mesure de précision temporelle (à l'heure / avance / retard).
- [x] Définir un MVP qui ne dépend pas du clavier MIDI physique.
- [x] Ajouter l'accès au mode Entraînement rythmique.
- [x] Implémenter le mode Métronome.
  (tempo modifiable en marche, pulsation audible et visible, arrêt automatique
  au bout de la durée choisie ; aucun score — c'est un outil)
- [x] Implémenter la reconnaissance des durées et des silences.
  (motif dessiné et joué, une figure encadrée à nommer parmi quatre)
- [x] Implémenter la reproduction (tap et piano à l'écran).
  (écoute puis reproduction sans couper la pulsation ; jugement par frappe et
  tendance avance/retard/irrégulier au bilan)
- [ ] Brancher l'entrée MIDI (F2) pour la reproduction au piano physique.
- [ ] Ajouter les triolets du niveau Difficile.
  (hors MVP : seule figure qui ne divise pas le temps par deux)

Voir [le plan détaillé de l'Entraînement rythmique](05-entrainement-rythmique.md).

### Feature 06 — Travail intelligent d'un morceau

- [x] Définir les cinq outils de travail (passages, mains, boucle, attente, tempo).
- [x] Définir la règle de progression du tempo.
- [x] Définir ce qu'est un passage « maîtrisé ».
- [ ] Implémenter le découpage en passages.
- [ ] Implémenter le travail d'une main séparément.
- [ ] Implémenter la boucle d'un passage.
- [ ] Implémenter le mode « attendre la bonne note ».
- [ ] Implémenter la montée progressive du tempo.

Voir [le plan détaillé du Travail intelligent d'un morceau](06-travail-intelligent-morceau.md).

### Feature 07 — Entraînement de l'oreille

- [x] Définir les quatre familles d'exercices.
- [x] Définir la réutilisation du moteur de session de la Lecture de notes.
- [x] Définir la frontière avec la future théorie musicale.
- [ ] Ajouter l'accès au mode Entraînement de l'oreille.
- [ ] Implémenter la reconnaissance d'une note entendue.
- [ ] Implémenter la reconnaissance des intervalles.
- [ ] Implémenter la distinction majeur / mineur.
- [ ] Implémenter la reproduction d'une courte mélodie.

Voir [le plan détaillé de l'Entraînement de l'oreille](07-entrainement-oreille.md).

### Feature 08 — Lecture de partitions

- [x] Définir la progression note unique → mesure → double portée.
- [x] Définir l'ordre d'introduction des nouveautés (une seule à la fois).
- [x] Définir la frontière avec la Lecture de notes et l'Entraînement rythmique.
- [ ] Étendre le rendu de portée aux petites mesures.
- [ ] Ajouter les valeurs rythmiques et les silences.
- [ ] Ajouter les altérations.
- [ ] Ajouter les notes simultanées.
- [ ] Ajouter la vraie double portée.

Voir [le plan détaillé de la Lecture de partitions](08-lecture-partitions.md).

### Feature 09 — Exercices de pédale

- [x] Définir les quatre familles d'exercices de pédale.
- [x] Définir la pédale syncopée comme technique centrale.
- [x] Définir un MVP utilisable sans pédale physique.
- [ ] Détecter une pédale physique (CC 64) via l'entrée MIDI.
- [ ] Implémenter la pédale de substitution (clavier / écran).
- [ ] Implémenter les exercices de pédale directe et syncopée.
- [ ] Implémenter la mesure du changement de pédale.

Voir [le plan détaillé des Exercices de pédale](09-pedale.md).

## Ordre de réalisation recommandé

1. ~~Construire la fondation Navigation ([F1](F1-navigation.md)) : écran
   d'accueil, registre des fonctionnalités, arrêt propre d'une fonctionnalité
   au changement de mode.~~ **Fait** (première boucle, 25/07/2026).
2. ~~Migrer le mode Morceau existant vers cette navigation, sans
   régression.~~ **Fait** — voir la validation en
   [F1 § 9](F1-navigation.md#validation-effectuée-25-juillet-2026).
3. ~~Isoler uniquement les briques réellement partagées par les modes (son,
   piano, fonctions musicales).~~ **Fait pour ce qui est réellement partagé**
   (25/07/2026) : `music.js`, `audio.js` et `perf.js`. Le piano n'a pas
   été mutualisé, les deux claviers n'ayant rien en commun — voir
   [F1 § 6](F1-navigation.md#6-découpage-technique-proposé).
4. ~~Construire la boucle Lecture de notes en Débutant / Main droite.~~
   **Fait** — voir [02 § 9](02-lecture-notes.md#validation-effectuée-25-juillet-2026).
5. ~~Ajouter Main gauche puis Les deux.~~ **Fait** (25/07/2026) : groupe grave
   Do3 → Sol3 en clé de fa, main tirée par question et équilibrée sur la
   session en mode Les deux — voir
   [02 § 9](02-lecture-notes.md#validation-de-la-main-gauche-et-du-mode-les-deux-25-juillet-2026).
6. ~~Ajouter les niveaux Intermédiaire et Difficile.~~ **Fait** (25/07/2026) :
   toute la portée plus le Do central en Intermédiaire, deux octaves avec
   lignes supplémentaires en Difficile, et un clavier qui défile plutôt que de
   descendre sous 30 px par touche — voir
   [02 § 4](02-lecture-notes.md#groupes-de-notes-retenus) et
   [02 § 9](02-lecture-notes.md#validation-des-niveaux-intermédiaire-et-difficile-25-juillet-2026).
7. ~~Ajouter le bilan, l'adaptation aux erreurs et la validation complète de la
   Lecture de notes.~~ **Fait** (25/07/2026) : bilan séparé par main en mode
   Les deux, notes ratées qui reviennent plus souvent à la session suivante —
   voir [02 § 9](02-lecture-notes.md#validation-de-létape-d--progression-25-juillet-2026).
   Restent à vérifier à la main le toucher sur l'appareil et le rendu sonore.
8. ~~Figer le format d'évènement du Suivi de progression
   ([F3](F3-suivi-progression.md), étape A **seulement**) et brancher la
   Lecture de notes comme première productrice de données.~~ **Fait**
   (25/07/2026) : une tentative = un évènement, journal unique dans
   `localStorage` où une séance est une paire d'évènements — voir
   [F3 § 7](F3-suivi-progression.md#7-modèle-de-données--figé-le-25072026).
9. ~~Construire le catalogue et le générateur d'exercices techniques (pratique
   libre, sans MIDI), avec un premier `metronome.js` partagé pour le
   décompte et les répétitions.~~ **Fait** (26/07/2026) : trois exercices
   (déliement, accords, arpèges) décrits en degrés de gamme, un générateur qui
   produit des notes de la forme de celles du mode Morceau, et une grille de
   pulsation partagée dont l'Entraînement rythmique réutilisera l'écart
   avance/retard. La boucle complète est en place, du décompte au bilan — voir
   [03 § 17](03-technique-doigts.md#17-validation-effectuée-26-juillet-2026).
   Le rouleau **n'a pas** été mutualisé avec le mode Morceau : les deux modes
   gardent le leur, et la raison est écrite en
   [03 § 12](03-technique-doigts.md#le-rouleau-na-pas-été-mutualisé-avec-le-mode-morceau).
10. ~~Construire l'Entraînement rythmique
    ([05](05-entrainement-rythmique.md)) : Métronome, Reconnaissance et
    Reproduction en tapant ou au piano à l'écran — toujours sans MIDI, en
    étendant le `metronome.js` de l'étape 9.~~ **Fait** (26/07/2026) : les trois
    familles fonctionnent de bout en bout, avec un jugement par frappe et une
    tendance avance/retard/irrégulier — voir
    [05 § 18](05-entrainement-rythmique.md#18-validation-effectuée-26-juillet-2026).
    `metronome.js` n'a eu besoin d'**aucune extension** : écrit à l'étape 9 en
    pensant à 05, il prenait déjà le nombre de temps par mesure et son
    ordonnanceur en paramètres. Une nuance honnête tout de même en
    [05 § 11](05-entrainement-rythmique.md#metronomejs-na-eu-besoin-daucune-extension) :
    `nearestBeat()`, écrite d'avance *pour* 05, n'est pas ce dont 05 a eu besoin —
    une frappe se compare aux attaques du motif, pas aux temps du métronome.
11. ~~Construire la fondation Entrée MIDI ([F2](F2-entree-midi.md)) :
    détection, connexion et réception normalisée des notes jouées.~~ **Fait**
    (26/07/2026) : détection, permission, choix de l'appareil, branchement à
    chaud et notes normalisées, avec un panneau de connexion sur l'accueil —
    voir [F2 § 15](F2-entree-midi.md#15-validation-effectuée-26-juillet-2026).
    Une seule instance partagée, dont l'état **survit aux changements de mode**.
    Reste la vérification qu'aucune doublure ne remplace : un vrai clavier
    branché.
12. Brancher F2 dans la validation MIDI des exercices techniques (03), dans
    la reproduction au piano physique de l'Entraînement rythmique (05), puis
    dans les décisions MIDI encore ouvertes du mode Morceau (01).
13. Construire le Travail intelligent d'un morceau
    ([06](06-travail-intelligent-morceau.md)) : passages, mains séparées,
    boucle, attente de la bonne note et montée progressive du tempo.
14. Construire le Programme d'entraînement
    ([04](04-programme-entrainement.md)), qui lit l'historique des séances de
    F3 au lieu d'en tenir un second.
15. Construire l'Entraînement de l'oreille
    ([07](07-entrainement-oreille.md)), en extrayant au passage le moteur de
    session de la Lecture de notes en module réutilisable.
16. Construire la Lecture de partitions ([08](08-lecture-partitions.md)) :
    petites mesures, valeurs et silences, altérations, notes simultanées puis
    double portée.
17. Construire les Exercices de pédale ([09](09-pedale.md)), une fois F2
    capable d'émettre les évènements CC 64.
18. Terminer le Suivi de progression ([F3](F3-suivi-progression.md), étapes
    B à E) : vues de progression, révisions adaptées aux erreurs passées,
    export et effacement des données.

### Pourquoi cet ordre

- **F1 d'abord**, toujours : tout le reste s'y branche.
- **Le rythme (10) avant le MIDI (11)** : son MVP se construit entièrement au
  tap et au piano à l'écran, sans attendre un clavier physique.
- **F3 est volontairement coupé en deux** (étapes 8 et 18). Le format
  d'évènement doit être figé tôt, dès la première fonctionnalité qui produit
  des résultats, sinon il faudra repasser dans chaque fonctionnalité pour
  l'ajouter après coup. Les vues, elles, ne sont que du calcul sur des
  données déjà accumulées : elles peuvent attendre.
- **06 après F2 (13)** : son mode « attendre la bonne note » fonctionne au
  piano à l'écran, mais ne devient réellement utile qu'avec un vrai clavier.
- **04 après 06 (14)** : un programme d'entraînement n'a de sens qu'avec
  plusieurs fonctionnalités réelles à programmer.
- **08 après 07 (16)** : c'est la fonctionnalité la plus coûteuse en rendu
  (gravure musicale, double portée), et la seule dont le MVP n'apporte rien
  qui ne soit déjà couvert par 02.
- **09 en fin de parcours (17)** : la pédale s'ajoute à un jeu déjà en place,
  et dépend de CC 64 dans F2.

L'ordre entre le bloc Lecture de notes (étapes 4 à 7) et le bloc Exercices
techniques (étape 9) pourra être inversé selon ce qui semble le plus utile à
tester en premier. De même, 07, 08 et 09 sont indépendantes entre elles :
leur ordre relatif peut changer sans rien casser.

## Ajouter une future fonctionnalité

Pour chaque nouvelle fonctionnalité :

1. copier [MODELE-feature.md](MODELE-feature.md) ;
2. nommer le fichier `NN-nom-de-la-feature.md` pour une fonctionnalité
   pratiquée par l'utilisateur, ou `FN-nom-de-la-fondation.md` pour une
   brique transverse dont plusieurs fonctionnalités ont besoin (navigation,
   entrée MIDI…) ;
3. l'ajouter au tableau **Fonctionnalités** ou **Fondations transverses** ;
4. ajouter sa checklist résumée dans ce fichier, au bon endroit dans l'ordre
   de réalisation ;
5. ne cocher les tâches d'implémentation qu'après vérification dans le code.

Seules les fonctionnalités déjà discutées sont listées. Les nouvelles idées
seront ajoutées au moment de leur discussion afin de ne pas transformer des
suggestions en engagements.

## Définition de « terminé »

Une fonctionnalité peut être marquée comme terminée lorsque :

- son parcours principal fonctionne de bout en bout ;
- ses critères d'acceptation sont remplis ;
- elle fonctionne à la souris et au toucher ;
- elle reste lisible sur une petite largeur d'écran ;
- son audio respecte le premier geste demandé par le navigateur ;
- elle ne provoque pas de régression dans les autres modes ;
- son fichier de plan et cette checklist ont été mis à jour.

### Cas particulier des fondations transverses

Une fondation (F1, F2…) n'a pas de parcours pédagogique propre : elle est
considérée comme terminée lorsque :

- son comportement partagé fonctionne indépendamment de toute fonctionnalité
  précise ;
- au moins une fonctionnalité réelle l'utilise effectivement, pas seulement
  en théorie ;
- elle ne bloque jamais une fonctionnalité qui n'en a pas besoin (par
  exemple, une fonctionnalité doit rester utilisable sans clavier MIDI
  branché).
