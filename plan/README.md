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
| F1 | Navigation entre les fonctionnalités | Boucle + menu des modes, accueil rangé par famille | [F1-navigation.md](F1-navigation.md) |
| F2 | Entrée clavier MIDI (reconnaissance des touches jouées) | En place, consommée par 01, 03 et 05 | [F2-entree-midi.md](F2-entree-midi.md) |
| F3 | Suivi de progression | Complet : journal, six vues, écran, export/effacement | [F3-suivi-progression.md](F3-suivi-progression.md) |

## Fonctionnalités

| Nº | Fonctionnalité | État actuel | Plan détaillé |
| --- | --- | --- | --- |
| 01 | Apprentissage d'un morceau | Lecteur + clavier MIDI ; travail guidé via 06 | [01-apprentissage-morceau.md](01-apprentissage-morceau.md) |
| 02 | Ancienne lecture de notes | Retirée, historique fusionné dans 10 | [02-lecture-notes.md](02-lecture-notes.md) |
| 03 | Exercices techniques et agilité des doigts | Complet : 99 exercices avec doigté, 11 familles × 3 niveaux | [03-technique-doigts.md](03-technique-doigts.md) |
| 04 | Programme d'entraînement | Séance composée pour un budget quotidien — lit le journal de F3 | [04-programme-entrainement.md](04-programme-entrainement.md) |
| 05 | Entraînement rythmique | Trois familles, trois entrées | [05-entrainement-rythmique.md](05-entrainement-rythmique.md) |
| 06 | Travail intelligent d'un morceau | Cinq outils en place — sous-mode de 01 | [06-travail-intelligent-morceau.md](06-travail-intelligent-morceau.md) |
| 07 | Entraînement de l'oreille | Trois familles sur quatre ; mélodie hors MVP | [07-entrainement-oreille.md](07-entrainement-oreille.md) |
| 08 | Lecture de partitions | Cinq étapes en place — suite de 02 | [08-lecture-partitions.md](08-lecture-partitions.md) |
| 09 | Exercices de pédale | Directe et syncopée, trois niveaux ; Application à venir | [09-pedale.md](09-pedale.md) |
| 10 | Lecture de notes | Une ou deux portées défilantes, trois vitesses | [10-fluidite.md](10-fluidite.md) |

Trois fonctionnalités prolongent une fonctionnalité existante plutôt que d'en
ouvrir une nouvelle : **06** répond aux décisions laissées ouvertes par
**01**, **08** poursuit l'étape D de **02**, et **10** en construit le
niveau 4 (les notes qui défilent). Elles ont leur propre fichier parce
qu'elles sont volumineuses, mais elles réutilisent le moteur de leur
fonctionnalité d'origine au lieu de le dupliquer.

## Matériel d'exercice

Ce n'est pas une fonctionnalité : c'est ce que les fonctionnalités font
pratiquer. Les cinq exercices de Hanon ont été **retirés le 28/07/2026** —
soixante variantes d'une seule difficulté ne font pas un programme
technique — et sont remplacés par des exercices **générés**, un objectif par
exercice, à trois niveaux.

| Sujet | État actuel | Plan détaillé |
| --- | --- | --- |
| Exercices générés (fichiers MIDI, mode Morceau) | Catalogue de 19 familles écrit ; 6 familles produites sur 19 | [exercices-generes.md](exercices-generes.md) |
| Catalogue d'exercices (mode Exercices) | **Complet** : 99 exercices, 11 familles × 3 niveaux × 3 | [exercices-catalogue.md](exercices-catalogue.md) |
| Fichiers MIDI du dépôt | 26 fichiers Mutopia, licences vérifiées | [morceaux-exercice/README.md](../morceaux-exercice/README.md) |

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
- [x] Partager proprement les fonctions musicales, le son et le piano.
  (`music.js`, `audio.js` et `perf.js` extraits le 25/07/2026, quand la
  Lecture de notes en a eu besoin — cf. [F1 § 6](F1-navigation.md). Le piano
  DOM a suivi le 27/07/2026 : `piano-dom.js`, le jour où l'Entraînement de
  l'oreille a eu besoin **du même** clavier que 02. Les trois autres claviers
  de l'application restent propres à leur mode, n'ayant toujours rien en commun)
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
- [x] Implémenter les vues de progression.
  (les six vues de F3 § 6 existent, consommées par l'écran « Progression » de
  l'accueil — qui offre aussi l'export JSON, l'effacement en deux temps et la
  compaction du journal ancien. Fait le 27/07/2026, étapes B à E)
- [x] Implémenter les révisions adaptées aux erreurs précédentes.
  (les notes ratées reviennent plus souvent, et les cibles les moins vues
  récemment reçoivent un léger surpoids — étape D faite le 27/07/2026,
  alimentant 02, 07 et 08 sans qu'une ligne n'y change)

Voir [le plan détaillé du Suivi de progression](F3-suivi-progression.md).

### Feature 01 — Apprentissage d'un morceau

- [x] Charger et visualiser un morceau MIDI.
- [x] Écouter le morceau avec un piano synthétisé.
- [x] Se déplacer librement dans le morceau.
- [x] Cliquer les touches du piano affiché.
- [x] Jouer sur un clavier MIDI branché : les touches s'allument et sonnent.
  (26/07/2026 ; aucun jugement en lecture simple — le travail guidé est le
  sous-mode Travail de [06](06-travail-intelligent-morceau.md))
- [x] Transformer la lecture en véritable exercice guidé.
  (26/07/2026 : bouton « Travail » → passages, mains, boucle, attente, tempo)
- [x] Définir comment une note jouée par l'utilisateur est validée.
  (bonne hauteur **dans la fenêtre** de tolérance de
  [05 § 5](05-entrainement-rythmique.md#5-mesure--trop-tôt--trop-tard-), avec le
  même juge que la validation MIDI de 03 — le timing n'entre pas dans le verdict)
- [x] Définir quand un morceau ou un passage est considéré comme appris.
  (deux exécutions propres au tempo cible sur deux jours distincts ; morceau
  appris = tous les passages maîtrisés plus le morceau entier joué proprement)

Voir [le plan détaillé du mode Morceau](01-apprentissage-morceau.md).

### Feature 02 — Lecture de notes

> Mode retiré le 28/07/2026 : son historique est conservé et le mode 10,
> renommé « Lecture de notes », est désormais l'unique accès.

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
- [x] Introduire les dièses et les bémols.
  (fait le 27/07/2026, là où 02 le prévoyait : dans la
  [Lecture de partitions](08-lecture-partitions.md), étape « Altérations » —
  02 lui-même reste sans altération, comme son MVP le voulait)

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
  rien n'est mesuré. Avec un clavier MIDI : notes justes, séries sans faute,
  par main, pas à retravailler et régularité rythmique)

Voir [le plan détaillé des Exercices techniques](03-technique-doigts.md).

### Feature 04 — Programme d'entraînement

- [x] Définir le principe du programme.
  (**refondu le 27/07/2026 au soir** : l'utilisateur ne compose plus rien, il
  donne un budget — 20 min par défaut — et l'application écrit la séance)
- [x] Définir le calcul de ce qui reste à faire aujourd'hui.
- [x] Ajouter l'accès au Programme d'entraînement depuis la navigation.
  (première carte de l'accueil : c'est lui qui dit par quoi commencer)
- [x] ~~Implémenter la configuration du programme.~~ Supprimée à la refonte :
  c'était exactement le travail que l'utilisateur voulait déléguer. Il ne
  reste que six boutons de durée.
- [x] Implémenter la séance du jour et le démarrage d'un bloc.
  (blocs numérotés, « Commencer » puis « Continuer », « Refaire » une fois
  fait — pratiquer plus que prévu n'est jamais empêché)
- [x] Enregistrer une séance comme terminée à la fin naturelle de la fonctionnalité.
  (rien n'a été ajouté : c'est le `session-end` en `done` que les
  fonctionnalités écrivaient déjà dans le journal de F3)
- [x] Tester tous les budgets, la rotation des créneaux et sa stabilité dans
  la journée. (avec une horloge injectée — voir
  [04 § 16](04-programme-entrainement.md#16-validation-effectuée-27-juillet-2026-refonte-du-soir))

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
- [x] Brancher l'entrée MIDI (F2) pour la reproduction au piano physique.
  (troisième entrée, visible mais désactivée sans clavier connecté)
- [ ] Ajouter les triolets du niveau Difficile.
  (hors MVP : seule figure qui ne divise pas le temps par deux)

Voir [le plan détaillé de l'Entraînement rythmique](05-entrainement-rythmique.md).

### Feature 06 — Travail intelligent d'un morceau

- [x] Définir les cinq outils de travail (passages, mains, boucle, attente, tempo).
- [x] Définir la règle de progression du tempo.
- [x] Définir ce qu'est un passage « maîtrisé ».
- [x] Implémenter le découpage en passages.
  (création à la position de lecture, renommage, suppression, bornes déplacées
  au bouton ou au glissement sur le rouleau, retrouvées à la séance suivante)
- [x] Implémenter le travail d'une main séparément.
  (la main non travaillée est effacée et jouée en accompagnement, ou masquée)
- [x] Implémenter la boucle d'un passage.
  (bornes de boucle confiées au Transport de Tone, pas à la boucle d'animation)
- [x] Implémenter le mode « attendre la bonne note ».
  (accord complet dans n'importe quel ordre, note fausse signalée sans reculer,
  aide sur la touche après deux échecs, au clavier physique comme à l'écran)
- [x] Implémenter la montée progressive du tempo.
  (+5 % proposés après une exécution propre, jamais appliqués d'office ;
  meilleur tempo propre conservé par passage)

Voir [le plan détaillé du Travail intelligent d'un morceau](06-travail-intelligent-morceau.md).

### Feature 07 — Entraînement de l'oreille

- [x] Définir les quatre familles d'exercices.
- [x] Définir la réutilisation du moteur de session de la Lecture de notes.
- [x] Définir la frontière avec la future théorie musicale.
- [x] Ajouter l'accès au mode Entraînement de l'oreille.
  (carte « Oreille » de l'accueil, 27/07/2026)
- [x] Implémenter la reconnaissance d'une note entendue.
  (trois étendues, repère Do rejouable à volonté, réponse au piano ou en MIDI)
- [x] Implémenter la reconnaissance des intervalles.
  (le degré seul en Débutant et Intermédiaire, les douze écarts qualifiés en
  Difficile ; successif puis simultané)
- [x] Implémenter la distinction majeur / mineur.
  (position serrée, autres degrés, puis premiers renversements)
- [ ] Implémenter la reproduction d'une courte mélodie.
  (hors MVP, cf. [07 § 4](07-entrainement-oreille.md) — seule famille dont la
  validation se fait note à note)

Voir [le plan détaillé de l'Entraînement de l'oreille](07-entrainement-oreille.md).

### Feature 08 — Lecture de partitions

- [x] Définir la progression note unique → mesure → double portée.
- [x] Définir l'ordre d'introduction des nouveautés (une seule à la fois).
- [x] Définir la frontière avec la Lecture de notes et l'Entraînement rythmique.
- [x] Étendre le rendu de portée aux petites mesures.
  (`sheet/staff-render.js` : rendu maison, décision de
  [08 § 13](08-lecture-partitions.md#13-décisions-ouvertes--tranchées-le-27072026))
- [x] Ajouter les valeurs rythmiques et les silences.
  (réponse en QCM ; les mesures sont les motifs 4/4 du catalogue de 05)
- [x] Ajouter les altérations.
  (accidentels puis armure ; les enharmonies sont acceptées d'office)
- [x] Ajouter les notes simultanées.
  (empilements validés dans n'importe quel ordre, comme les accords de 06)
- [x] Ajouter la vraie double portée.
  (deux portées reliées, bilan séparé par main —
  [08 § 16](08-lecture-partitions.md#16-validation-effectuée-27-juillet-2026))

Voir [le plan détaillé de la Lecture de partitions](08-lecture-partitions.md).

### Feature 09 — Exercices de pédale

- [x] Définir les quatre familles d'exercices de pédale.
- [x] Définir la pédale syncopée comme technique centrale.
- [x] Définir un MVP utilisable sans pédale physique.
- [x] Détecter une pédale physique (CC 64) via l'entrée MIDI.
  (dans `midi-input.js`, seul endroit qui écoute le MIDI — la décision ouverte
  de F2 § 13 est tranchée et faite)
- [x] Implémenter la pédale de substitution (clavier / écran).
  (barre d'espace et bouton à l'écran, annoncés comme un remplacement)
- [x] Implémenter les exercices de pédale directe et syncopée.
  (l'application joue une petite pièce en Do — basse, accord, mélodie ; ce qui
  sonne tient réellement par la pédale — lever étouffe, oublier s'entend)
- [x] Implémenter la mesure du changement de pédale.
  (quatre verdicts « propre / brouillé / trou / oubliée », fenêtres en
  fraction de temps de `rhythm/timing.js` —
  [09 § 18](09-pedale.md#18-validation-effectuée-27-juillet-2026))
- [x] Implémenter les trois niveaux de difficulté, et dire **quand** agir.
  (la difficulté est l'écart entre deux changements ; la ligne de pédale et la
  consigne annoncent le geste un temps à l'avance — sans elles l'exercice était
  incompréhensible : [09 § 19](09-pedale.md#19-refonte-du-27-juillet-2026-au-soir))
- [x] Retirer la famille Écoute : quatre démonstrations sans exercice derrière.
- [ ] Implémenter la famille Application (un passage réel, avec les indices
  de pédale déjà affichés par le mode Morceau) — après le reste, comme prévu.

Voir [le plan détaillé des Exercices de pédale](09-pedale.md).

### Feature 10 — Lecture de notes

- [x] Remplacer l'ancien mode Lecture de notes à note fixe.
- [x] Faire défiler des notes vers une cible, à vitesse réglable.
  (Canvas bridé par le profil de l'appareil ; la traversée dure toujours cinq
  secondes, la vitesse règle la densité — lire vite, c'est lire plus de notes)
- [x] Juger une note manquée sans punir.
  (`missed` au journal, le mot déjà employé par 05 ; elle revient plus souvent
  ensuite, comme une note ratée)
- [x] Produire un bilan : premier coup, précision, meilleure série, à revoir.
- [x] Ajouter « Les deux mains » avec deux portées défilantes et des arrivées
  alternées, jamais simultanées entre clé de sol et clé de fa.
- [ ] Ajouter les altérations défilantes.

Voir [le plan détaillé de la Lecture de notes](10-fluidite.md).

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
12. ~~Brancher F2 dans la validation MIDI des exercices techniques (03), dans
    la reproduction au piano physique de l'Entraînement rythmique (05), puis
    dans les décisions MIDI encore ouvertes du mode Morceau (01).~~ **Fait**
    (26/07/2026), les trois :
    - **03** valide les notes jouées et son bilan dit lesquelles sont passées,
      par main, avec les pas à retravailler. Une série jugée devient un `run`
      en `clean`/`flawed` là où la pratique libre écrit un `repetition` en
      `none` — sans toucher au format de F3 (
      [03 étape D](03-technique-doigts.md#étape-d--validation-midi--faite-le-26072026)) ;
    - **05** en fait sa troisième entrée de reproduction, en corrigeant
      l'instant avec l'horodatage du message MIDI — le seul endroit où cela
      change une mesure (
      [05 étape E](05-entrainement-rythmique.md#étape-e--entrée-midi-physique--faite-le-26072026)) ;
    - **01** allume et fait sonner ses touches, sans juger quoi que ce soit :
      la décision « piano à l'écran, physique, ou les deux ? » était déjà
      tranchée par 06 (les deux), le reste du travail guidé lui appartient (
      [01](01-apprentissage-morceau.md#le-clavier-physique-dès-maintenant-26072026)).

    Au passage, `rhythm/timing.js` a été **généralisé** plutôt que dupliqué :
    son appariement accepte un critère supplémentaire, ce qui lui permet de
    servir aux notes de 03 (hauteur **et** temps) comme aux frappes de 05
    (temps seul). Les seuils du § 5 de 05 sont donc les mêmes partout, comme ce
    plan le prévoyait.
13. ~~Construire le Travail intelligent d'un morceau
    ([06](06-travail-intelligent-morceau.md)) : passages, mains séparées,
    boucle, attente de la bonne note et montée progressive du tempo.~~ **Fait**
    (26/07/2026) : les cinq outils sont combinables et le cas d'usage central du
    plan fonctionne — boucler un passage, main gauche seule, en attente, à 60 %
    du tempo, et le retrouver à la séance suivante. Voir
    [06 § 15](06-travail-intelligent-morceau.md#15-validation-effectuée-26-juillet-2026).

    Le travail est un **sous-mode** du mode Morceau, pas un mode de plus : sans
    le bouton « Travail », l'écran reste le lecteur d'avant. Ce qui se calcule
    sans écran vit dans `song-practice.js` ; le reste est branché sur le rouleau
    et le clavier déjà en place. Trois choses n'ont **pas** été réécrites : le
    jugement d'une exécution (`exercises/validate-run.js`, qui juge un passage
    exactement comme une série), les seuils de timing
    (`rhythm/timing.js`) et les « notes à revoir » (`stepsToRework`). Un piège
    en revanche est apparu, et il vaut pour la suite : **le Transport de Tone
    est partagé par tous les modes**, donc une boucle activée pour un passage
    doit être relâchée par `stop()`, sinon le mode suivant en hérite.
14. ~~Construire le Programme d'entraînement
    ([04](04-programme-entrainement.md)), qui lit l'historique des séances de
    F3 au lieu d'en tenir un second.~~ **Fait** (27/07/2026) : configurer,
    voir ce qu'il reste à faire aujourd'hui, démarrer une séance et la
    retrouver cochée — les trois fréquences comprises. Voir
    [04 § 16](04-programme-entrainement.md#16-validation-effectuée-27-juillet-2026).

    Le pari de l'étape 8 est tenu : **brancher 04 n'a modifié aucune
    fonctionnalité existante.** Une séance terminée était déjà un `session-end`
    en `done` dans le journal figé le 25/07/2026, si bien qu'aucun champ,
    aucune migration et aucune ligne dans 02, 03, 05 ou 06 n'ont été
    nécessaires. Seule la première des six vues de F3 a été écrite —
    l'historique des séances, `progress/views.js` —, celle dont 04 avait
    réellement besoin.

    Deux choses ont été **corrigées** dans le plan en l'implémentant : le
    `training-log.js` qu'il prévoyait n'existe pas (c'était le second
    historique que F3 § 5 écartait), et un `featureId` du registre n'est pas
    toujours celui du journal — `song` est satisfait par `song-practice`,
    parce qu'écouter un morceau n'est pas une séance de travail.
15. ~~Construire l'Entraînement de l'oreille
    ([07](07-entrainement-oreille.md)), en extrayant au passage le moteur de
    session de la Lecture de notes en module réutilisable.~~ **Fait**
    (27/07/2026) pour les **trois premières familles** × trois niveaux :
    entendre une note et la retrouver au piano, nommer un intervalle, dire si un
    accord est majeur ou mineur. La **Mélodie** reste hors MVP, comme le prévoit
    [07 § 4](07-entrainement-oreille.md). Voir
    [07 § 18](07-entrainement-oreille.md#18-validation-effectuée-27-juillet-2026).

    Le pari de [07 § 3](07-entrainement-oreille.md) est tenu : **une fois la
    première famille en place, les deux autres n'ont demandé aucun travail de
    session.** `session-engine.js` a bien été extrait de 02, et sa surface
    publique n'a pas bougé — `note-reading-engine.js` garde ses mêmes exports,
    si bien que les trois campagnes de 02 se rejouent telles quelles.

    Une **seconde extraction, non prévue** : `piano-dom.js`. Le § 7 de 07
    renvoyait explicitement au clavier de 02, c'était donc un second
    consommateur de la *même* version. Il a été extrait avec un préfixe de
    classes CSS en paramètre, ce qui laisse le DOM de 02 inchangé — et c'est
    précisément ce qui a permis à ses harnais de servir de vraie mesure de
    non-régression plutôt que d'être réécrits pour l'occasion.

    Deux choses ont été **corrigées** dans le plan en l'implémentant : les
    quatre décisions ouvertes du § 15 sont tranchées (Do fixe, intervalles
    nommés, ascendants seulement, pas de « chanter puis vérifier »), et une
    cinquième est apparue — la qualité d'un intervalle n'est demandée qu'au
    niveau Difficile, où « tous les intervalles jusqu'à l'octave » l'impose.
16. ~~Construire la Lecture de partitions ([08](08-lecture-partitions.md)) :
    petites mesures, valeurs et silences, altérations, notes simultanées puis
    double portée.~~ **Fait** (27/07/2026), les cinq étapes — voir
    [08 § 16](08-lecture-partitions.md#16-validation-effectuée-27-juillet-2026).

    Le pari de 08 § 15 est tenu : le moteur de session extrait pour 07 a
    absorbé la suite de notes **sans changer d'une ligne** — `nextQuestion`
    étant injectable, il suffit de lui faire suivre la partition au lieu de
    tirer au sort. Deux décisions tranchées en construisant : la durée se
    répond en QCM (pas de timing — c'est la frontière avec 05), et le rendu
    de portée reste maison jusqu'à la double portée comprise. Le vrai partage
    promis au § 4 va plus loin que prévu : les mesures de l'étape « Valeurs et
    silences » **sont** les motifs 4/4 du catalogue de 05, pas une seconde
    liste.
17. ~~Construire les Exercices de pédale ([09](09-pedale.md)), une fois F2
    capable d'émettre les évènements CC 64.~~ **Fait** (27/07/2026) pour
    Écoute, Pédale directe et Pédale syncopée — l'Application attend, comme
    son plan le prévoyait. Voir
    [09 § 18](09-pedale.md#18-validation-effectuée-27-juillet-2026).

    F2 émet désormais les évènements CC 64 (la dernière décision ouverte de
    son § 13), et les trois entrées — pédale physique, barre d'espace, bouton —
    convergent vers le même point de jugement. Rien n'a été réécrit : les
    fenêtres des verdicts viennent de `rhythm/timing.js`, la pulsation de
    `metronome.js`, l'enchaînement Do–Fa–Sol–Do de 03.
18. ~~Terminer le Suivi de progression ([F3](F3-suivi-progression.md), étapes
    B à E) : vues de progression, révisions adaptées aux erreurs passées,
    export et effacement des données.~~ **Fait** (27/07/2026) : les six vues
    existent, l'écran « Progression » de l'accueil les affiche, les révisions
    ajoutent « le moins vu récemment », et les données s'exportent et
    s'effacent. Voir
    [F3 § 12](F3-suivi-progression.md#validation-effectuée-des-étapes-b-à-e-27-juillet-2026).

    La règle « aucune vue sans consommateur » a tenu jusqu'au bout : les cinq
    vues restantes n'ont été écrites que pour l'écran de progression, dernier
    consommateur prévu. Et brancher le volet ancienneté des révisions n'a
    modifié **aucune** fonctionnalité : 02, 07 et 08 passaient déjà par
    `priorWeights`.
19. ~~Construire la Fluidité ([10](10-fluidite.md)) : le niveau 4 du parcours
    de 02, laissé de côté depuis le premier jour.~~ **Fait** (27/07/2026) :
    des notes défilent vers une ligne d'arrivée, à trois vitesses, et la série
    mesure la régularité. Voir
    [10 § 9](10-fluidite.md#9-validation-effectuée-27-juillet-2026).

    Rien n'a été redéfini : groupes de notes de `note-reading-engine.js`,
    tirage pondéré de `session-engine.js`, clavier de `piano-dom.js`, poids
    hérités de F3. Une seule ligne a changé ailleurs — `progress/review.js`
    compte désormais `missed` comme un raté, une note sortie de l'écran étant
    une note à revoir. C'est aussi le premier écran de lecture en **Canvas** :
    les portées de 02, 05 et 08 restent en SVG parce que rien n'y bouge.
20. ~~Afficher l'ordre du jour dès l'ouverture de l'application.~~ **Fait**
    (27/07/2026) : le panneau de l'accueil (`src/today-panel.js`) montre la
    séance du jour et coche en vert ce qui est fait, sans qu'il faille ouvrir
    le Programme. Il appelle le `planDay()` de 04 — aucune règle n'est
    dupliquée, seul l'affichage lui appartient. Voir
    [04 § 8](04-programme-entrainement.md#8-la-séance-du-jour-sur-laccueil-et-dans-le-mode).
21. ~~Faire écrire le programme par l'application, pas par l'utilisateur.~~
    **Fait** (27/07/2026, soir) : `src/training-coach.js` compose la séance —
    échauffement, lecture, morceau, oreille — pour le temps annoncé, choisit
    dans chaque créneau la fonctionnalité la moins vue récemment, et supprime
    les créneaux les moins prioritaires quand le budget est court. L'ancien
    écran de configuration a disparu. Voir
    [04 § 5](04-programme-entrainement.md#5-la-séance-et-son-seul-réglage).
22. ~~Rendre la navigation praticable à dix modes.~~ **Fait** (27/07/2026,
    soir) : menu des modes dans la barre commune, disponible depuis n'importe
    quel écran, et cartes de l'accueil rangées en quatre familles. Voir
    [F1 § 13](F1-navigation.md#13-le-menu-des-modes-et-laccueil-rangé--27072026).
23. ~~Fusionner Lecture de notes et Fluidité, puis permettre les deux mains.~~
    **Fait** (28/07/2026) : l'ancien écran fixe est retiré, Fluidité devient
    l'unique « Lecture de notes », et deux portées défilent ensemble avec une
    seule chronologie alternée — aucune arrivée simultanée entre les deux clés.
    Voir [10 § 10](10-fluidite.md#10-fusion-et-double-portée-28-juillet-2026).

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
