# Feature 06 — Travail intelligent d'un morceau

> Statut : **les cinq outils fonctionnent** depuis le 26/07/2026 — passages,
> mains séparées, boucle, attente de la bonne note et tempo progressif, avec le
> bilan qui va avec. Évolution directe de
> [01 — Apprentissage d'un morceau](01-apprentissage-morceau.md), dont elle
> tranche les décisions restées ouvertes.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir les cinq outils de travail (passages, mains, boucle, attente, tempo).
- [x] Définir la règle de progression du tempo.
- [x] Définir ce qu'est un passage « maîtrisé ».
- [x] Implémenter le découpage en passages.
- [x] Implémenter le travail d'une main séparément.
- [x] Implémenter la boucle d'un passage.
- [x] Implémenter le mode « attendre la bonne note ».
- [x] Implémenter la montée progressive du tempo.

## 1. Problème utilisateur

Le mode Morceau actuel joue le morceau du début à la fin. Or on n'apprend pas
un morceau en le rejouant entièrement à vitesse normale : on isole les
passages difficiles, on travaille chaque main séparément, on répète lentement,
puis on accélère. Aujourd'hui l'utilisateur ne peut faire aucune de ces
choses : il ne dispose que d'une barre de progression et d'un réglage de
vitesse globaux.

## 2. Objectif

Transformer le lecteur pédagogique actuel en véritable outil de travail :
isoler un passage, le travailler main par main, le boucler, attendre les
bonnes notes, puis remonter le tempo progressivement jusqu'au tempo réel.

## 3. Relation avec la feature 01

Ce plan répond aux décisions listées comme ouvertes dans
[01](01-apprentissage-morceau.md#décisions-à-prendre-avant-la-prochaine-évolution) :

| Décision ouverte dans 01 | Réponse apportée ici |
| --- | --- |
| Le morceau attend-il la bonne note avant de continuer ? | Oui, mais uniquement en mode **Attente** (section 7), qui reste optionnel |
| Comment travailler séparément main droite / main gauche / les deux ? | Section 6 |
| Bilan d'un passage et critère « morceau appris » | Section 9 |
| Piano à l'écran, piano MIDI physique, ou les deux ? | Les deux : le piano à l'écran suffit pour un passage court, [F2](F2-entree-midi.md) est nécessaire pour un travail réel |
| Données de progression à conserver | Déléguées à [F3 — Suivi de progression](F3-suivi-progression.md) |

Les briques déjà en place dans 01 sont réutilisées telles quelles : analyse
des pistes, distinction des deux mains, piano roll, audio, curseur de
position et réglage de vitesse (0,25× à 2×).

## 4. Les cinq outils de travail

| Outil | Ce que fait l'utilisateur | Base existante |
| --- | --- | --- |
| **Passages** | Découpe le morceau en sections courtes et nommées | Curseur de position et durée du morceau déjà connus |
| **Mains** | Joue seulement la main droite, la main gauche, ou les deux | Les deux mains sont déjà distinguées visuellement |
| **Boucle** | Répète un passage en continu | Lecture et repositionnement déjà en place |
| **Attente** | Le défilement s'arrête jusqu'à ce que la bonne note soit jouée | Piano à l'écran déjà jouable ; [F2](F2-entree-midi.md) pour un piano physique |
| **Tempo progressif** | Repart plus vite après une réussite propre | Réglage de vitesse déjà en place |

Ces cinq outils sont combinables : le cas d'usage central est « boucler le
passage 3, main gauche seule, en mode attente, à 60 % du tempo ».

## 5. Découpage en passages

Trois façons de créer un passage, de la plus simple à la plus élaborée :

1. **Manuel** : l'utilisateur place un début et une fin sur la timeline
   existante. Suffisant pour le MVP.
2. **Par mesures** : découpage automatique tous les N mesures, en s'appuyant
   sur le tempo et la signature rythmique du fichier MIDI.
3. **Par phrases** : détection des silences pour proposer des coupures
   musicalement logiques. À évaluer plus tard, car un découpage faux serait
   plus gênant qu'utile.

Un passage retient : un identifiant, un titre libre, un instant de début et
de fin, et le tempo de travail atteint. Les passages d'un morceau doivent
survivre à un rechargement de la page (voir
[F3](F3-suivi-progression.md)).

## 6. Travail d'une main séparément

- **Main droite seule** / **Main gauche seule** / **Les deux**.
- La main non travaillée peut être : masquée, ou affichée en gris et jouée
  par l'application en accompagnement. Le second comportement est le plus
  utile pédagogiquement — il garde le repère musical — et doit être
  proposé comme réglage.
- En mode Attente, seules les notes de la main travaillée sont attendues :
  les notes de la main d'accompagnement ne bloquent jamais le défilement.

## 7. Mode « attendre la bonne note »

- Le défilement s'arrête à l'instant de la prochaine note attendue et
  reprend dès qu'elle est jouée correctement.
- Un accord attend **toutes** ses notes, dans n'importe quel ordre, sans
  contrainte de simultanéité stricte dans cette première version.
- Une note fausse ne fait pas reculer le morceau : elle est signalée
  brièvement, la note attendue reste attendue. Cette règle prolonge celle
  déjà retenue pour la Lecture de notes
  ([02](02-lecture-notes.md#5-règles-pédagogiques-du-mvp) : « ne jamais
  changer de note après une mauvaise réponse »).
- Une aide doit rester disponible après plusieurs échecs sur la même note
  (mise en évidence de la touche attendue), sans passer la note
  automatiquement.
- Le mode Attente est désactivable : sans lui, le morceau défile au tempo
  choisi et l'utilisateur suit comme aujourd'hui.

## 8. Montée progressive du tempo

Le tempo de travail est exprimé en pourcentage du tempo réel du morceau
(par exemple 60 %), ce qui reste compatible avec le réglage de vitesse
existant.

Règle retenue : **le tempo ne monte qu'après une exécution propre du
passage**, jamais automatiquement au bout d'un certain temps. Cette règle est
la même que celle déjà posée pour les Exercices techniques
([03](03-technique-doigts.md#10-sécurité-et-bonnes-habitudes) : « ne pas
augmenter automatiquement le tempo après une série imprécise »).

- après une exécution propre : proposer +5 à +10 % au tour suivant ;
- après une exécution imprécise : rester au même tempo, ou proposer de
  redescendre si plusieurs échecs de suite ;
- l'utilisateur garde toujours la main sur le tempo, la proposition n'est
  jamais imposée ;
- le tempo maximal joué proprement pour un passage est conservé (voir
  [F3](F3-suivi-progression.md)).

Une exécution est « propre » lorsqu'elle atteint le seuil défini en section 9.

## 9. Passage maîtrisé et morceau appris

Sans entrée de notes (pratique libre, sans MIDI et sans clic), aucune
précision ne peut être mesurée : le suivi se limite alors au nombre de
répétitions et au tempo utilisé. Cette règle reprend celle déjà posée dans
[03](03-technique-doigts.md#9-retour-et-bilan) — ne jamais afficher une
précision que l'application n'a pas mesurée.

Avec les notes détectées (piano à l'écran ou [F2](F2-entree-midi.md)) :

- **exécution propre** : le passage est joué sans note manquée ni note
  fausse, en mode non-Attente ;
- **passage maîtrisé** : plusieurs exécutions propres au tempo cible, sur
  au moins deux séances distinctes — pas une seule réussite isolée. Ce
  critère reprend le principe déjà retenu pour les notes en
  [02](02-lecture-notes.md#5-règles-pédagogiques-du-mvp) ;
- **morceau appris** : tous les passages du morceau maîtrisés, plus au
  moins une exécution propre du morceau entier au tempo cible.

## 10. Écran de travail

Ajouts à l'écran du mode Morceau existant :

- la liste des passages, avec l'état de chacun et le tempo atteint ;
- les bornes du passage actif, visibles et déplaçables sur la timeline ;
- le sélecteur de main ;
- les interrupteurs Boucle et Attente ;
- le tempo de travail en pourcentage du tempo réel ;
- le compteur de répétitions du passage en cours ;
- l'accès au bilan du passage.

Ces contrôles ne doivent pas surcharger l'écran de lecture simple : le
travail d'un passage est un sous-mode, pas l'état par défaut du mode
Morceau.

## 11. Modèle de données — figé le 26/07/2026

```js
// Clé `synthesia.practice.v1` : { v: 1, songs: { [songId]: { sections, whole } } }
const practiceSection = {
  id: "s3",
  songId: "paul-de-senneville-mariage-d-amour", // dérivé du titre
  title: "Passage 3 — main gauche difficile",
  startSeconds: 42.5,
  endSeconds: 58.0,
  targetTempoPercent: 100,
  bestCleanTempoPercent: 70,                    // n'importe quelle réussite
  cleanRunsByDate: { "2026-07-24": 2, "2026-07-25": 1 }, // au tempo cible seulement
};

// Réglages, enregistrés avec ceux du mode Morceau (`synthesia.settings`).
const practiceSettings = {
  hand: "left",     // "right" | "left" | "both"
  accompany: true,  // faux = la main non travaillée est masquée
  loop: true,
  wait: true,
  sectionId: "s3",  // null = morceau entier
};
```

Deux précisions, sans lesquelles la section 9 ne serait pas calculable :

- `cleanRunsByDate` ne compte que les exécutions propres **au tempo cible** —
  c'est ce qui définit la maîtrise. `bestCleanTempoPercent` retient au contraire
  n'importe quelle réussite : c'est le repère de progression, celui qu'on voit
  monter. La maîtrise demande **deux exécutions propres réparties sur au moins
  deux jours** ; la journée sert de séance, et deux réussites du même
  après-midi ne suffisent pas ;
- le **morceau entier** est enregistré comme un passage de plus, d'identifiant
  `"whole"`, créé au premier tour joué. Sans lui, « au moins une exécution
  propre du morceau entier » n'aurait nulle part où s'écrire — et cela évite un
  second chemin de code pour le juger.

Le tempo de travail n'est pas stocké séparément : c'est le réglage de vitesse
existant, vu en pourcentage (70 % = 0,7×). Les deux commandes restent d'accord
en permanence.

## 12. Découpage technique — fait le 26/07/2026

```text
src/
  song-practice.js          # règles du travail, sans DOM : passages, accords
                            # attendus, tempo, maîtrise, persistance
  song-mode.js              # mode Morceau : rouleau, clavier, Transport — et
                            # le branchement de ces règles sur l'écran
```

`song-practice.js` s'appuie sur l'état du morceau déjà construit par le mode
Morceau plutôt que de réanalyser le fichier MIDI : il reçoit les notes en
paramètre. La détection des notes jouées passe par la même API que les autres
fonctionnalités ([F2](F2-entree-midi.md)), et non par une écoute MIDI propre à
ce mode.

Le partage s'est fait dans ce sens-là, et pas autrement :

- **le jugement d'une exécution n'a pas été réécrit.**
  `exercises/validate-run.js`, écrit pour la validation MIDI des exercices
  techniques, rend exactement ce dont un passage a besoin — les bonnes notes au
  bon moment, `clean` ou `flawed` —, et le § 9 ci-dessous définit « propre »
  avec les mêmes mots que le [§ 9 de 03](03-technique-doigts.md#9-retour-et-bilan).
  Il sert donc aux deux, sans être déplacé : rien ne justifiait de le sortir de
  `exercises/` tant qu'il n'est pas un troisième consommateur qui l'appelle.
  Ses seuils restent ceux de [`rhythm/timing.js`](05-entrainement-rythmique.md#5-mesure--trop-tôt--trop-tard-) ;
- **les « notes à revoir » sont les « pas à retravailler » de 03**, calculées
  par la même `stepsToRework` — ici, un pas est le rang de la note dans le
  passage ;
- **le rouleau n'a pas bougé.** Le sous-mode ajoute au dessin existant : bornes,
  assombrissement hors passage, main effacée, note attendue cerclée. Aucun
  second rouleau, aucun second clavier ;
- **la boucle est confiée au Transport de Tone** (`setLoopPoints` + `loop`), pas
  à la boucle d'animation : c'est lui qui tient l'horloge audio. Une boucle
  recalée image par image dériverait de quelques millisecondes par tour, ce que
  le § 14 interdit. **Conséquence à retenir : le Transport est partagé par tous
  les modes**, donc `stop()` remet toujours `Tone.Transport.loop` à faux — sans
  quoi le mode suivant hériterait d'une boucle.

### Décisions prises en écrivant

- **En mode Attente, l'application ne joue pas la main travaillée.** Elle
  s'arrête sur l'attaque attendue : si elle la jouait à la reprise, elle
  doublerait la note de l'utilisateur et lui donnerait la réponse. La main
  d'accompagnement, elle, continue de sonner. Hors mode Attente, tout est joué
  comme avant.
- **La touche cherchée ne s'allume pas d'elle-même pendant l'attente.** Le
  clavier allume normalement les notes en cours ; à la porte, cela reviendrait à
  désigner la touche, et l'aide prévue « après plusieurs échecs » (§ 7) n'aurait
  plus d'objet. Elle s'allume dès qu'elle est jouée — ce qui vaut retour
  immédiat —, et l'aide (deux échecs sur le même accord) la montre en vert.
- **Le journal de progression (F3) sépare le travail de l'écoute** : les
  évènements portent `featureId: "song-practice"`, pas `"song"`. Travailler un
  passage et écouter un morceau ne sont pas la même pratique, et le Programme
  d'entraînement (04) doit pouvoir programmer l'un sans l'autre.
- **Un passage se renomme par `prompt()`.** C'est la seule saisie de texte de
  l'application : un champ dédié encombrerait la barre pour un usage rare.
  La suppression, elle, ne demande pas confirmation — un passage se recrée en
  deux clics, et une boîte de dialogue de plus sur une tablette coûte plus
  qu'elle ne protège.
- **Le défilement manuel n'est pas borné au passage** ; seule la lecture l'est.
  Sans cela, il aurait été impossible de placer la borne d'un passage ailleurs
  que dans le passage lui-même. Appuyer sur ▶ hors des bornes ramène au début
  du passage.
- **La barre de travail impose de remesurer le canvas.** Elle ajoute une ligne à
  l'en-tête, donc en retire au rouleau, sans qu'aucun `resize` de fenêtre ne
  soit émis : sans remesure, le tampon du canvas resterait à l'ancienne taille
  et les touches seraient dessinées ailleurs qu'où le doigt les touche.

## 13. Étapes de réalisation

### Étape A — Passages et boucle — **faite le 26/07/2026**

- [x] Créer, renommer et supprimer un passage manuellement.
- [x] Afficher les bornes du passage sur la timeline existante.
      (deux lignes ambrées sur le rouleau, saisissables au doigt, plus deux
      boutons « ⇤ / ⇥ ici » qui posent une borne à la position courante)
- [x] Limiter la lecture au passage actif.
- [x] Boucler le passage sans coupure audio ni dérive de synchronisation.
- [x] Conserver les passages d'un morceau entre deux séances.

### Étape B — Mains — **faite le 26/07/2026**

- [x] Jouer uniquement la main choisie.
- [x] Proposer de masquer ou d'accompagner la main non travaillée.
- [x] Vérifier que l'accompagnement ne bloque jamais le mode Attente.

### Étape C — Attente de la bonne note — **faite le 26/07/2026**

- [x] Arrêter le défilement sur la prochaine note attendue.
- [x] Valider une note seule, puis un accord dans n'importe quel ordre.
- [x] Signaler une note fausse sans reculer ni passer la note.
- [x] Mettre en évidence la touche attendue après plusieurs échecs.
- [x] Faire fonctionner le mode au piano à l'écran, puis via F2.

### Étape D — Tempo progressif — **faite le 26/07/2026**

- [x] Exprimer le tempo de travail en pourcentage du tempo réel.
- [x] Détecter une exécution propre d'un passage.
- [x] Proposer une augmentation seulement après une exécution propre.
- [x] Conserver le meilleur tempo propre par passage.

### Étape E — Bilan — **faite le 26/07/2026, sous une forme compacte**

- [x] Afficher le bilan d'un passage (répétitions, tempo, notes à revoir).
      Il tient sur la ligne de la barre de travail — *« 4 tours · 2 propres ·
      dernier : 8/9 · à revoir : Sol4 · record 70 % »* — plutôt que sur un
      écran séparé : on le lit sans quitter le passage qu'on est en train de
      boucler. Un écran de bilan complet reste possible s'il devient utile.
- [x] Marquer un passage comme maîtrisé selon la section 9.
      (« ✓ » dans la liste des passages et dans le bilan)
- [x] Marquer un morceau comme appris selon la section 9.

## 14. Critères d'acceptation

- [x] L'utilisateur peut découper un morceau en plusieurs passages nommés et
  les retrouver à la séance suivante.
- [x] Un passage peut être bouclé indéfiniment sans dérive audio-visuelle.
  (154 relevés sur quatre tours : aucun hors des bornes, et les bornes de
  boucle du Transport sont exactement celles du passage)
- [x] Le travail main droite seule, main gauche seule et les deux fonctionne.
- [x] En mode Attente, le défilement s'arrête jusqu'à la bonne note et une
  note fausse ne fait pas reculer le morceau.
- [x] Un accord est validé quel que soit l'ordre des notes jouées.
- [x] Le tempo n'augmente jamais automatiquement après une exécution
  imprécise.
- [x] Le meilleur tempo propre par passage est conservé entre les séances.
- [x] Sans détection de notes, aucune précision n'est affichée.
  (le bilan dit « aucune note reçue — pratique libre », et le journal écrit une
  `repetition` en `none` au lieu d'un `run` jugé — même règle qu'en
  [03](03-technique-doigts.md#9-retour-et-bilan))
- [x] Le mode Morceau simple (lecture) reste utilisable sans passer par ces
  outils.

## 15. Validation effectuée (26 juillet 2026)

**Hors navigateur** (`song-practice.js`, 61 vérifications) : bornes d'un passage
(inversées, hors morceau, trop courtes), notes attendues par main, groupement
en accords, jugement d'une exécution (note manquée, note en trop, léger retard,
hors fenêtre, accord dans le désordre), règle de montée du tempo dans ses cinq
cas, maîtrise à deux séances distinctes, morceau appris, persistance relue par
un second magasin, et stockage refusé ou absent — où le travail continue en
mémoire.

**Dans le navigateur** (Chrome headless, 101 vérifications en cinq phases
séparées par de vrais rechargements de page) : le morceau est **reparsé par le
harnais**, si bien que les instants et les hauteurs attendus sont calculés
indépendamment de l'application, puis retrouvés dans ce qu'elle dessine et dans
l'instant où elle s'arrête.

- **Passages** : création à la position courante, second passage, suppression,
  renommage, bornes déplacées au bouton et **au glissement sur le rouleau** ;
  les deux bornes sont retrouvées au pixel près dans le canvas, et le rouleau
  est mesurablement assombri hors du passage.
- **Boucle** : `Tone.Transport.loop` avec les bonnes bornes, lecture qui ne sort
  jamais du passage, tours comptés.
- **Mains** : la main non travaillée s'efface (couleur relevée dans les pixels)
  ou disparaît ; en Attente, le défilement s'arrête sur la première note de la
  main **travaillée**, jamais sur celle de l'accompagnement.
- **Attente** : arrêt à l'attaque attendue (±50 ms), note fausse qui ne fait ni
  avancer ni reculer, aide verte sur la touche après deux échecs, accord de
  quatre notes qui n'ouvre pas la porte tant qu'il est incomplet, reprise au
  clavier physique **et** au clic sur le piano à l'écran.
- **Tempo et bilan** : un passage joué entièrement au clavier est jugé propre,
  la proposition « Monter à 75 % » apparaît et n'est appliquée qu'au clic ; un
  tour raté ne propose rien et ne fait pas bouger le tempo ; le meilleur tempo
  propre et le bilan sont retrouvés après rechargement ; le journal F3 contient
  bien un `run` `clean`, un `run` `flawed`, des `repetition` en `none` et une
  séance close.
- **Non-régression** : le lecteur simple joue toujours le morceau entier, le
  clavier physique allume toujours ses touches sans rien juger, changer de
  morceau change de découpage sans rien casser, et **aucune boucle ne fuit vers
  les autres modes** — Exercices, Lecture de notes et Rythme démarrent avec un
  Transport propre. Les harnais des quatre autres campagnes ont été rejoués
  entièrement (870 vérifications, aucune régression).
- **Mise en page** (360×640, 390×844, 844×390, 1280×800) : aucune commande hors
  de l'écran, aucune cible sous 30 px, aucun débordement horizontal. La barre
  coûte au rouleau 137 px en portrait étroit, 101 px à 390 px de large, 66 px en
  paysage sur la tablette et 81 px sur écran large ; le clavier garde entre 58 et
  116 px de haut, et retrouve toute sa place dès qu'on quitte le sous-mode.

**Reste à faire à la main** : le toucher réel sur la tablette, le rendu à
l'oreille (notamment que la main travaillée se taise bien en mode Attente
pendant que l'accompagnement continue) et l'essai avec un vrai clavier MIDI —
les vérifications passent par une doublure du Web MIDI, comme pour
[F2](F2-entree-midi.md#15-validation-effectuée-26-juillet-2026). La maîtrise
d'un passage exigeant deux journées distinctes, elle n'est vérifiée que hors
navigateur, avec une horloge injectée.

## 16. Décisions ouvertes

- ~~Faut-il une tolérance rythmique en mode non-Attente, et faut-il réutiliser
  les seuils de l'Entraînement rythmique ?~~ **Tranché le 26/07/2026 : oui, les
  mêmes.** Une note est juste si elle est à la bonne hauteur **dans la fenêtre**
  de [05 § 5](05-entrainement-rythmique.md#5-mesure--trop-tôt--trop-tard-), et
  le timing n'entre pas dans le verdict `clean` / `flawed` — exactement la règle
  déjà écrite pour la validation MIDI de 03. La fenêtre étant une fraction de
  temps, travailler à 60 % laisse mécaniquement plus de millisecondes réelles :
  la même exigence musicale à toutes les vitesses.
- Le découpage automatique par mesures est-il assez fiable avec les fichiers
  MIDI de la bibliothèque actuelle, dont les mesures ne sont pas toujours
  propres ? (toujours ouvert : le découpage reste manuel, avec une longueur par
  défaut de 8 secondes)
- Faut-il proposer une réduction du morceau (ne garder que la mélodie) pour
  les morceaux trop denses, ou est-ce hors périmètre ?
- Faut-il gérer le doigté sur un morceau, ou le doigté reste-t-il réservé
  aux [Exercices techniques](03-technique-doigts.md) ?

## 17. Hors périmètre pour le moment

- Pas de détection automatique des passages difficiles à partir des erreurs.
- Pas de génération d'exercices techniques à partir d'un passage du morceau.
- Pas de gestion de la pédale dans le travail d'un passage : voir
  [09 — Exercices de pédale](09-pedale.md).
- Pas de notation affichée sur double portée pendant le travail : voir
  [08 — Lecture de partitions](08-lecture-partitions.md).

## 18. Première priorité — atteinte

Construire une boucle minimale sur un morceau déjà chargé : **définir un
passage à la main → le boucler → choisir la main gauche seule → travailler à
60 % du tempo → constater que le passage et son tempo sont retrouvés à la
séance suivante.** Le mode Attente vient ensuite, et devient réellement
utile une fois [F2](F2-entree-midi.md) disponible.

C'est exactement le parcours vérifié le 26/07/2026 (§ 15), Attente comprise.

## 19. Ce qui n'a pas été fait, et pourquoi

- **Pas de découpage automatique** (par mesures ou par phrases, § 5). Les
  mesures sont déjà calculées et dessinées par le mode Morceau : le jour où le
  découpage manuel montrera ses limites, le repère existe. Un découpage faux
  serait plus gênant qu'utile, et rien ne dit encore lequel serait juste.
- **Pas d'écran de bilan séparé.** Le bilan tient sur la barre (§ 13, étape E) ;
  un écran de plus aurait obligé à quitter le passage pour le lire.
- **Pas de tempo cible autre que 100 %.** Le modèle porte
  `targetTempoPercent` par passage, mais aucune commande ne le change : un
  passage se travaille jusqu'au tempo du morceau. Le champ est là pour le jour
  où un passage devra rester en deçà.
- **Pas de réglage de la longueur par défaut d'un passage** (8 secondes) : deux
  boutons « ⇤ / ⇥ ici » suffisent à la corriger en deux gestes.
