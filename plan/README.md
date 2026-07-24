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

## Fonctionnalités

| Nº | Fonctionnalité | État actuel | Plan détaillé |
| --- | --- | --- | --- |
| 01 | Apprentissage d'un morceau | Version de lecture déjà en place | [01-apprentissage-morceau.md](01-apprentissage-morceau.md) |
| 02 | Lecture de notes | Planifiée | [02-lecture-notes.md](02-lecture-notes.md) |
| 03 | Exercices techniques et agilité des doigts | Planifiée | [03-technique-doigts.md](03-technique-doigts.md) |

## Checklist générale

### Base déjà disponible

- [x] Charger les morceaux de la bibliothèque.
- [x] Importer un fichier MIDI.
- [x] Analyser et afficher les notes d'un morceau.
- [x] Distinguer visuellement la main droite et la main gauche.
- [x] Lire, mettre en pause et déplacer la lecture.
- [x] Régler la vitesse.
- [x] Afficher la notation sur les notes.
- [x] Jouer le piano à l'écran à la souris ou au toucher.
- [x] Passer l'application en plein écran.

### Structure nécessaire pour plusieurs fonctionnalités

- [ ] Ajouter un écran ou un sélecteur de fonctionnalité.
- [ ] Séparer le mode Morceau du démarrage général de l'application.
- [ ] Partager proprement les fonctions musicales, le son et le piano.
- [ ] Arrêter proprement une fonctionnalité lors d'un changement de mode.
- [ ] Conserver une navigation claire sur ordinateur et mobile.

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
- [ ] Ajouter l'accès au mode Lecture de notes.
- [ ] Implémenter les réglages de départ.
- [ ] Implémenter la génération des questions.
- [ ] Implémenter la validation des touches.
- [ ] Implémenter les indices et les retours correct / incorrect.
- [ ] Implémenter le bilan de session.
- [ ] Tester les neuf combinaisons de niveau et de main.

Voir [le plan détaillé de la Lecture de notes](02-lecture-notes.md).

### Feature 03 — Exercices techniques et agilité des doigts

- [x] Définir les premières familles d'exercices.
- [x] Définir une présentation proche des morceaux actuels.
- [x] Distinguer la pratique libre de la validation par clavier MIDI.
- [ ] Ajouter l'accès au mode Exercices.
- [ ] Créer le catalogue d'exercices.
- [ ] Générer les notes, les doigtés et les répétitions.
- [ ] Ajouter les choix de difficulté, de main et de tempo.
- [ ] Ajouter le décompte, le métronome et la boucle.
- [ ] Implémenter les exercices de déliement, d'accords et d'arpèges du MVP.
- [ ] Ajouter le bilan adapté au type d'entrée utilisé.

Voir [le plan détaillé des Exercices techniques](03-technique-doigts.md).

## Ordre de réalisation recommandé

1. Ajouter le choix entre Morceau, Lecture de notes et Exercices.
2. Isoler uniquement les briques réellement partagées par les trois modes.
3. Construire la boucle Lecture de notes en Débutant / Main droite.
4. Ajouter Main gauche puis Les deux.
5. Ajouter les niveaux Intermédiaire et Difficile.
6. Ajouter le bilan, l'adaptation aux erreurs et la validation complète.
7. Construire le catalogue et le générateur d'exercices techniques.
8. Réutiliser le piano roll pour le décompte, les répétitions et le métronome.
9. Ajouter ensuite la validation avec un clavier MIDI.

L'ordre entre les features 02 et 03 pourra être modifié. La navigation et les
briques partagées restent les premières fondations dans les deux cas.

## Ajouter une future fonctionnalité

Pour chaque nouvelle fonctionnalité :

1. copier [MODELE-feature.md](MODELE-feature.md) ;
2. nommer le fichier `NN-nom-de-la-feature.md` ;
3. l'ajouter au tableau **Fonctionnalités** ;
4. ajouter sa checklist résumée dans ce fichier ;
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
