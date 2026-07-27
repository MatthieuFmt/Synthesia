# Feature 01 — Apprentissage d'un morceau

> Statut : version de lecture en place, le **clavier MIDI physique y joue**
> depuis le 26/07/2026 (les touches s'allument et sonnent comme au clic), et
> l'**apprentissage guidé existe** depuis le même jour — passages, mains
> séparées, boucle, attente de la bonne note et tempo progressif vivent dans
> [06](06-travail-intelligent-morceau.md), en sous-mode de cet écran. Le mode
> Morceau reste un lecteur tant qu'on n'appuie pas sur « Travail ».

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

## Limite levée le 26/07/2026

Le mode montrait et jouait le morceau sans jamais vérifier que l'utilisateur
jouait les bonnes notes : un lecteur pédagogique, pas un exercice guidé. C'est
ce que le sous-mode Travail de [06](06-travail-intelligent-morceau.md) apporte,
sans rien retirer au lecteur — les deux cohabitent derrière un bouton.

## Décisions prises avant la prochaine évolution

> Ces décisions sont désormais tranchées dans
> [06 — Travail intelligent d'un morceau](06-travail-intelligent-morceau.md),
> **et implémentées le 26/07/2026** : le lecteur est devenu un véritable outil
> de travail (passages, mains séparées, boucle, attente de la bonne note, tempo
> progressif). Le tableau de correspondance figure dans
> [sa section 3](06-travail-intelligent-morceau.md#3-relation-avec-la-feature-01),
> et ce qui a réellement été vérifié dans
> [sa section 15](06-travail-intelligent-morceau.md#15-validation-effectuée-26-juillet-2026).

- [x] Définir si l'entraînement utilise le piano à l'écran, un piano MIDI
  physique ou les deux (la brique de connexion sera fournie par
  [F2 — Entrée MIDI](F2-entree-midi.md) une fois la décision prise).
  **Les deux** ([06 § 3](06-travail-intelligent-morceau.md#3-relation-avec-la-feature-01)) :
  le piano à l'écran suffit pour un passage court, le clavier physique est
  nécessaire à un travail réel. F2 est en place depuis le 26/07/2026 et le mode
  Morceau en consomme déjà la moitié utile tout de suite — voir ci-dessous.
- [x] Définir si le morceau attend la bonne note avant de continuer.
  **Oui, mais seulement en mode Attente**, qui reste optionnel : le défilement
  s'arrête sur l'attaque attendue et repart dès qu'elle est jouée ; une note
  fausse est signalée sans faire reculer ni passer la note
  ([06 § 7](06-travail-intelligent-morceau.md#7-mode--attendre-la-bonne-note-)).
- [x] Définir comment travailler séparément la main droite, la main gauche ou
  les deux. La main non travaillée est **effacée et jouée en accompagnement**,
  ou masquée ; en Attente, elle ne bloque jamais le défilement
  ([06 § 6](06-travail-intelligent-morceau.md#6-travail-dune-main-séparément)).
- [x] Définir le bilan d'un passage et le critère « morceau appris ».
  Bilan compact sur la barre de travail (tours, exécutions propres, notes à
  revoir, meilleur tempo) ; passage maîtrisé = deux exécutions propres au tempo
  cible sur deux jours distincts ; morceau appris = tous les passages maîtrisés
  plus une exécution propre du morceau entier
  ([06 § 9](06-travail-intelligent-morceau.md#9-passage-maîtrisé-et-morceau-appris)).
- [x] Définir les données de progression à conserver localement (déléguées à
  [F3 — Suivi de progression](F3-suivi-progression.md)). Les passages vivent
  sous leur propre clé (`synthesia.practice.v1`, cf.
  [06 § 11](06-travail-intelligent-morceau.md#11-modèle-de-données--figé-le-26072026)) ;
  les exécutions vont dans le journal F3, sous `featureId: "song-practice"` —
  travailler un morceau et l'écouter ne sont pas la même pratique.

## Le clavier physique, dès maintenant (26/07/2026)

Sans attendre le travail guidé de [06](06-travail-intelligent-morceau.md), le
mode Morceau consomme déjà [F2](F2-entree-midi.md) pour ce qui ne demande aucune
décision pédagogique : **une note jouée sur le clavier branché produit le même
retour que la même touche cliquée à l'écran** — elle s'allume et elle sonne
(règle de [F2 § 7](F2-entree-midi.md#7-règles-de-comportement)).

Une différence avec le clic, et elle est voulue : la touche reste allumée **tant
que la note est tenue**, au lieu de se rallumer au bout de 220 ms. Un vrai
clavier dit quand on relâche, une souris ne le dit pas — et si le clavier est
débranché en tenant une note, F2 synthétise le relâchement, donc rien ne reste
allumé.

Ce qui n'était **pas** décidé ici — savoir si la note jouée était la bonne,
attendre la bonne note, ce qu'est un passage appris — appartient toujours à 06,
et n'apparaît que dans son sous-mode : **en lecture simple, le mode Morceau
n'affiche aucun jugement**, exactement comme le 26/07 au matin.

## Critères déjà remplis

- [x] Un morceau de la bibliothèque peut être chargé.
- [x] La visualisation et l'audio restent synchronisés.
- [x] La vitesse peut être modifiée.
- [x] Le piano à l'écran produit un son au clic ou au toucher.

## Validation restante

- [x] Définir des tests reproductibles pour le mode actuel.
  Faits le 26/07/2026 avec le sous-mode Travail : le harnais navigateur ouvre le
  mode, charge un morceau de la bibliothèque, lit, déplace la position, clique
  le clavier, reçoit des notes MIDI et vérifie l'arrêt propre — voir
  [06 § 15](06-travail-intelligent-morceau.md#15-validation-effectuée-26-juillet-2026).
- [ ] Vérifier explicitement les usages mobile et tactile.
  (mise en page vérifiée de 360 px à 1280 px, sous-mode Travail compris ; le
  toucher réel reste à faire)
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
