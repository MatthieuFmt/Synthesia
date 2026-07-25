# Feature 01 — Apprentissage d'un morceau

> Statut : version de lecture en place — la partie « apprentissage guidé » reste
> à définir.

[Retour à la checklist générale](README.md)

## Objectif

Permettre à l'utilisateur de choisir un morceau, de comprendre les notes à
jouer et, à terme, de s'entraîner jusqu'à pouvoir le jouer lui-même.

## Ce qui existe

- [x] Bibliothèque alimentée par `songs.json` (17 morceaux fournis avec
  l'application).
- [x] ~~Import d'un fichier `.mid` ou `.midi`.~~ Retiré : tout le répertoire
  est livré dans le dépôt, l'utilisateur n'a rien à charger.
- [x] Analyse des pistes MIDI.
- [x] Distinction main droite / main gauche.
- [x] Piano roll synchronisé avec le morceau.
- [x] Piano affiché sur 88 touches.
- [x] Son de piano et lecture polyphonique.
- [x] Lecture, pause, déplacement et réglage de vitesse.
- [x] Défilement manuel à la molette ou au glisser.
- [x] Notation activable sur les notes.
- [x] Piano à l'écran jouable à la souris ou au toucher.
- [x] Plein écran.

## Limite actuelle

Le mode montre et joue le morceau, mais il ne vérifie pas encore que
l'utilisateur joue les bonnes notes. Il s'agit donc actuellement davantage
d'un lecteur pédagogique que d'un exercice guidé.

## Décisions à prendre avant la prochaine évolution

> Ces décisions sont désormais tranchées dans
> [06 — Travail intelligent d'un morceau](06-travail-intelligent-morceau.md),
> qui détaille le passage du lecteur actuel à un véritable outil de travail
> (passages, mains séparées, boucle, attente de la bonne note, tempo
> progressif). Le tableau de correspondance figure dans
> [sa section 3](06-travail-intelligent-morceau.md#3-relation-avec-la-feature-01).

- [ ] Définir si l'entraînement utilise le piano à l'écran, un piano MIDI
  physique ou les deux (la brique de connexion sera fournie par
  [F2 — Entrée MIDI](F2-entree-midi.md) une fois la décision prise).
- [ ] Définir si le morceau attend la bonne note avant de continuer.
- [ ] Définir comment travailler séparément la main droite, la main gauche ou
  les deux.
- [ ] Définir le bilan d'un passage et le critère « morceau appris ».
- [ ] Définir les données de progression à conserver localement (déléguées à
  [F3 — Suivi de progression](F3-suivi-progression.md)).

Ces décisions seront prises après le MVP Lecture de notes, avec un plan séparé
si l'évolution devient suffisamment importante.

## Critères déjà remplis

- [x] Un morceau de la bibliothèque peut être chargé.
- [x] La visualisation et l'audio restent synchronisés.
- [x] La vitesse peut être modifiée.
- [x] Le piano à l'écran produit un son au clic ou au toucher.

## Validation restante

- [ ] Définir des tests reproductibles pour le mode actuel.
- [ ] Vérifier explicitement les usages mobile et tactile.
  (mise en page vérifiée de 360 px à 1280 px ; le toucher réel reste à faire)
- [x] Vérifier que le futur changement de mode arrête correctement la lecture.
  Le retour à l'accueil arrête le transport, fige la position, libère la
  chaîne audio et annule les boucles d'animation — voir
  [F1 § 9](F1-navigation.md#validation-effectuée-25-juillet-2026).
- [x] Vérifier qu'une future extraction de modules ne modifie pas la
  synchronisation audio-visuelle.
  `music.js`, `audio.js` et `perf.js` ont été sortis de `song-mode.js`
  le 25/07/2026 : la planification des notes (`Tone.Part`) et le curseur de
  lecture sont restés dans le mode, seul l'échantillonneur a déménagé. Vérifié
  après extraction — morceau chargé, notation, vitesse à 1.5×, clic sur une
  touche, lecture réelle dont la position avance, puis arrêt propre au retour à
  l'accueil (voir
  [F1 § 9](F1-navigation.md#deuxième-validation--deux-fonctionnalités-au-registre-25-juillet-2026)).
  `piano.js` n'a pas été extrait : le clavier reste propre au mode.
