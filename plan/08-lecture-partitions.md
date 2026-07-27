# Feature 08 — Lecture de partitions

> Statut : **implémentée** (27/07/2026) — les cinq étapes fonctionnent de bout
> en bout, du réglage au bilan. Voir la [validation](#16-validation-effectuée-27-juillet-2026).
> Suite directe de [02 — Lecture de notes](02-lecture-notes.md), dont elle
> reprend et poursuit l'étape D.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir la progression note unique → mesure → double portée.
- [x] Définir l'ordre d'introduction des nouveautés (une seule à la fois).
- [x] Définir la frontière avec la Lecture de notes et l'Entraînement rythmique.
- [x] Étendre le rendu de portée aux petites mesures.
  (`sheet/staff-render.js` : mesure complète, clé, armure, chiffrage, curseur)
- [x] Ajouter les valeurs rythmiques et les silences.
  (dessinés d'après les figures de `rhythm/patterns.js`, silences en glyphes)
- [x] Ajouter les altérations.
  (accidentels puis armure ; Fa♯ et Sol♭ acceptés — la validation compare des
  touches, pas des noms)
- [x] Ajouter les notes simultanées.
  (empilements de deux ou trois notes, validés dans n'importe quel ordre)
- [x] Ajouter la vraie double portée.
  (deux portées reliées, une main par clé, temps à deux mains, bilan par main)

## 1. Problème utilisateur

La Lecture de notes (02) apprend à reconnaître **une note isolée**. Mais une
partition réelle ne ressemble pas à cela : les notes sont groupées en mesures,
elles ont des durées différentes, il y a des silences, des dièses et des
bémols, plusieurs notes empilées, et deux portées lues en même temps. Un
utilisateur qui maîtrise 02 reste donc incapable de lire une vraie partition.

## 2. Objectif

Conduire l'utilisateur de la note unique déjà maîtrisée jusqu'à la lecture
d'une vraie double portée, en n'ajoutant qu'une seule difficulté nouvelle à
la fois.

## 3. Relation avec la feature 02

Cette fonctionnalité **poursuit** 02 : elle ne remplace ni ne duplique son
moteur. 02 prévoit déjà explicitement, dans son étape D, d'« introduire les
dièses et les bémols » et de « proposer plus tard une vraie double portée avec
deux notes simultanées »
([02 § 7](02-lecture-notes.md#étape-d--progression)). Ces éléments sont
détaillés ici plutôt que dans 02, afin que 02 reste centré sur son MVP.

Sont réutilisés tels quels : le moteur de session, les niveaux, les choix de
main, la règle « une erreur ne change pas la question », le bilan et la
pondération des notes difficiles.

## 4. Frontière avec l'Entraînement rythmique (05)

Les deux fonctionnalités touchent au rythme, mais pas au même endroit :

| | Ce qui est travaillé | Ce qui est mesuré |
| --- | --- | --- |
| **08 — Lecture de partitions** | **Lire** et comprendre une valeur rythmique ou un silence écrit | La note jouée est-elle la bonne, et sa durée écrite est-elle correctement identifiée ? |
| [05 — Entraînement rythmique](05-entrainement-rythmique.md) | **Exécuter** un rythme au bon moment | L'écart temporel : à l'heure, en avance, en retard |

Autrement dit : 08 apprend à savoir qu'une blanche vaut deux temps, 05
apprend à la jouer au bon instant. Les définitions de durées et de silences
sont communes et doivent être partagées avec 05
([05 § 6](05-entrainement-rythmique.md#6-niveaux-de-difficulté)) plutôt que
redéfinies ici.

## 5. Progression en cinq étapes

Chaque étape n'ajoute qu'une seule nouveauté, et suppose la précédente
acquise.

| Étape | Nouveauté introduite | Ce qui reste inchangé |
| --- | --- | --- |
| **1. Petites mesures** | Plusieurs notes à lire à la suite dans une mesure | Toutes les notes sont des noires, une seule portée |
| **2. Valeurs et silences** | Noire, blanche, ronde, croche, et les silences correspondants | Une seule portée, pas d'altération |
| **3. Altérations** | Dièses et bémols, d'abord accidentels puis en armure | Une seule portée |
| **4. Notes simultanées** | Deux ou trois notes empilées à lire ensemble | Une seule portée |
| **5. Double portée** | Clé de sol et clé de fa lues en même temps | Le reste est déjà acquis |

Cette progression respecte le principe déjà posé en 02 : ne pas mélanger
difficulté de lecture, théorie des altérations et précision sur les touches
noires ([02 § 4](02-lecture-notes.md#niveaux-de-difficulté)).

## 6. Comment répond l'utilisateur, étape par étape

- **Petites mesures** : jouer les notes de la mesure dans l'ordre, sans
  contrainte de tempo. La mesure n'avance pas tant que la note attendue n'est
  pas jouée — même règle que 02.
- **Valeurs et silences** : jouer la note, et identifier sa durée. Deux
  variantes possibles, à trancher (section 13) : soit la durée est demandée
  séparément (QCM), soit elle est jouée en maintenant la touche.
- **Altérations** : jouer la touche noire correcte. Une confusion fréquente
  attendue est Fa♯ / Sol♭ : ce sont la même touche, les deux doivent être
  acceptées comme correctes lorsque la touche est la bonne.
- **Notes simultanées** : jouer toutes les notes de l'empilement, dans
  n'importe quel ordre, comme déjà retenu pour les accords en
  [06 § 7](06-travail-intelligent-morceau.md#7-mode--attendre-la-bonne-note-).
- **Double portée** : la main droite lit la portée du haut, la main gauche
  celle du bas ; les deux notes attendues peuvent l'être simultanément.

## 7. Écran d'exercice

Extension de l'écran de 02 :

- une portée assez grande, affichant maintenant une mesure complète et non
  une note isolée ;
- un curseur ou une mise en évidence indiquant la note attendue dans la
  mesure ;
- l'armure et le chiffrage de mesure lorsqu'ils sont introduits ;
- à l'étape 5, les deux portées reliées, avec la main courante identifiable ;
- le piano, dont l'étendue doit s'élargir à mesure que les étapes avancent —
  au risque, sinon, de révéler la réponse en n'affichant que quelques touches ;
- la progression de la session et la sortie, comme en 02.

## 8. Point technique : le rendu de la portée

C'est le vrai coût de cette fonctionnalité. L'application dessine
actuellement une notation minimale sur les notes du piano roll (option
« Afficher la notation »), pas une portée gravée. Or les étapes 2 à 5
demandent un rendu autrement plus complet : hampes, crochets et ligatures,
silences, altérations, armure, chiffrage, accolade et deux portées alignées.

Deux directions, à trancher avant l'étape 2 :

1. **Rendu maison** sur le Canvas déjà utilisé. Contrôle total et aucune
   dépendance ajoutée, mais la gravure musicale correcte (espacement,
   ligatures, alignement vertical d'un accord) est un travail long et facile
   à sous-estimer.
2. **Bibliothèque de gravure** (VexFlow, abcjs, OpenSheetMusicDisplay…).
   Rendu correct immédiatement, au prix d'une dépendance externe et d'une
   intégration à faire avec le Canvas existant. À noter : l'application
   charge déjà `@tonejs/midi` depuis un CDN, donc une dépendance externe
   n'est pas un précédent nouveau.

La recommandation est de rester en rendu maison pour l'étape 1 (des noires
sur une portée, ce que 02 sait déjà presque faire) et d'évaluer une
bibliothèque au moment précis où les ligatures et la double portée
arrivent — plutôt que de choisir maintenant pour un besoin encore
hypothétique.

## 9. Modèle de données proposé

```js
const readingExercise = {
  stage: 2, // 1 à 5, cf. section 5
  clefs: ["treble"], // ["treble", "bass"] à l'étape 5
  keySignature: "C",
  timeSignature: [4, 4],
  measures: [
    {
      events: [
        // une note : hauteur + durée écrite
        { type: "note", midi: 60, duration: "quarter" },
        { type: "rest", duration: "quarter" },
        { type: "note", midi: 64, duration: "half" },
        // étape 4 : plusieurs hauteurs pour un même évènement
        // { type: "note", midis: [60, 64, 67], duration: "quarter" },
      ],
    },
  ],
};
```

Le vocabulaire de durées (`quarter`, `half`, `whole`…) doit être **le même**
que celui de [05](05-entrainement-rythmique.md#10-modèle-de-données-proposé),
pour qu'une définition de rythme puisse servir aux deux fonctionnalités.

## 10. Découpage technique proposé

```text
src/
  sheet-reading-mode.js    # parcours des cinq étapes
  sheet/
    staff-render.js        # rendu de portée : notes, silences, altérations
    exercises.js           # génération des mesures par étape et niveau
  session-engine.js        # moteur de session partagé, extrait de 02
```

`staff-render.js` doit rester utilisable par d'autres fonctionnalités : une
portée correcte servira aussi à la [Lecture de notes](02-lecture-notes.md) et
pourrait, plus tard, s'afficher pendant le travail d'un morceau
([06](06-travail-intelligent-morceau.md)).

## 11. Étapes de réalisation

### Étape A — Petites mesures — **faite le 27/07/2026**

- [x] Afficher plusieurs notes sur une portée, avec la note attendue mise en
  évidence.
  (un halo suit l'évènement attendu, les évènements déjà lus s'estompent)
- [x] Valider les notes d'une mesure dans l'ordre.
  (la mesure n'avance pas tant que la note attendue n'est pas jouée)
- [x] Réutiliser le moteur de session et le bilan de 02.
  (`session-engine.js` tel quel : les questions suivent la partition au lieu
  d'être tirées une à une — l'aléatoire a déjà joué à la génération des
  mesures, pondération des séances passées comprise)

### Étape B — Valeurs rythmiques et silences — **faite le 27/07/2026**

- [x] Dessiner noires, blanches, rondes et croches.
  (têtes pleines ou évidées, hampes orientées, crochets — comme le mode Rythme)
- [x] Dessiner les silences correspondants.
  (les glyphes déjà déclarés par les figures de `rhythm/patterns.js`)
- [x] Trancher et implémenter la façon de répondre à une durée (section 13).
  (tranché : QCM — voir la décision en section 13)
- [x] Partager le vocabulaire de durées avec 05.
  (au-delà du vocabulaire : les mesures de cette étape sont **les motifs 4/4
  du catalogue de 05** filtrés au vocabulaire de l'étape, pas une seconde liste)

### Étape C — Altérations — **faite le 27/07/2026**

- [x] Dessiner dièses et bémols accidentels.
- [x] Accepter les enharmonies (Fa♯ et Sol♭ sur la même touche).
  (automatique : la validation compare des hauteurs MIDI, donc des touches)
- [x] Introduire l'armure et l'appliquer à toute la mesure.
  (Sol majeur — Fa♯ — ou Fa majeur — Si♭ ; la note écrite reste sans signe et
  la mesure en armure contient toujours au moins une note réellement altérée)

### Étape D — Notes simultanées — **faite le 27/07/2026**

- [x] Aligner verticalement deux ou trois notes.
  (tierces empilées partageant une hampe)
- [x] Valider un empilement dans n'importe quel ordre.
  (chaque note juste reste allumée, une fausse est signalée sans faire reculer
  les autres — même règle que [06 § 7](06-travail-intelligent-morceau.md#7-mode--attendre-la-bonne-note-))

### Étape E — Double portée — **faite le 27/07/2026**

- [x] Dessiner deux portées reliées avec leurs clés.
  (barres de mesure communes et accolade à gauche)
- [x] Attendre une note à chaque main, éventuellement simultanément.
  (temps à une main, et temps à deux mains joués comme un empilement)
- [x] Produire un bilan séparé par main, comme prévu en
  [02 étape D](02-lecture-notes.md#étape-d--progression).

## 12. Critères d'acceptation

- [x] L'utilisateur peut lire et jouer une mesure de plusieurs notes.
- [x] Les valeurs rythmiques et les silences de la section 5 sont affichés
  lisiblement et correctement identifiés.
- [x] Les dièses et bémols sont gérés, et les deux noms d'une même touche
  noire sont acceptés.
- [x] Une armure s'applique correctement aux notes de la mesure.
- [x] Un empilement de notes est validé quel que soit l'ordre de jeu.
- [x] La double portée affiche les deux clés et attend les deux mains.
- [x] Chaque étape reste jouable au clic, au toucher et au clavier MIDI si
  disponible.
  (le clavier de réponse est celui de `piano-dom.js` ; l'entrée MIDI de F2
  répond aux questions de hauteur, jamais exigée)
- [x] La Lecture de notes (02) ne régresse pas.
  (vérifié dans le navigateur — la portée de 02 et son moteur n'ont pas changé
  d'une ligne, seule l'armature de pondération partagée a évolué, cf. F3 étape D)

## 13. Décisions ouvertes — tranchées le 27/07/2026

- **Comment répond-on à une durée ?** Tranché : **en la nommant (QCM)**, comme
  la Reconnaissance de 05. Maintenir la touche le bon nombre de temps aurait
  introduit une mesure de timing — le recouvrement avec 05 que la section 4
  écarte — et exigé un métronome dans un exercice qui n'a pas de tempo.
- **Rendu maison ou bibliothèque de gravure ?** Tranché : **rendu maison**
  (SVG), jusqu'à la double portée comprise. À cette taille de mesure —
  pas de ligature, pas de mesure multi-voix — la gravure reste simple ; une
  bibliothèque redeviendra une question si de vraies partitions arrivent.
- **Mesures générées ou vraies mélodies ?** Générées pour ce MVP : c'est ce
  qui permet la pondération des difficultés passées. Les mélodies du domaine
  public restent une piste pour une étape ultérieure.
- **Lire une partition d'un fichier MIDI de la bibliothèque ?** Non pour le
  MVP — exercices générés seulement. La décision est documentée, pas fermée.
- Une décision d'implémentation s'y est ajoutée : **chaque étape n'introduit
  que sa nouveauté** — les étapes 3 à 5 reviennent à des noires, la variété
  des durées restant la compétence de l'étape 2. C'est l'application du
  principe « une seule difficulté nouvelle à la fois » de la section 5.

## 14. Hors périmètre pour le moment

- Pas d'import ni de rendu de fichiers MusicXML.
- Pas de nuances, d'articulations, de liaisons ni d'ornements.
- Pas de doigté écrit sur la partition.
- Pas de défilement chronométré de la partition : cela relève du mode
  Fluidité déjà envisagé en [02](02-lecture-notes.md#parcours-pédagogique-proposé).
- Pas de mesures composées complexes au-delà de ce que 05 introduit.

## 15. Première priorité — faite

Construire l'étape 1 seule : **une mesure de quatre noires sur une portée →
la note attendue est mise en évidence → l'utilisateur joue les quatre notes
dans l'ordre → bilan identique à celui de la Lecture de notes.** Cette étape
ne demande presque aucun rendu nouveau et valide que le moteur de session de
02 supporte bien une suite de notes au lieu d'une note isolée — c'est le
vrai risque à lever avant d'investir dans la gravure musicale.

Le risque est levé sans qu'une ligne du moteur change : `nextQuestion` est
injectable depuis l'extraction de `session-engine.js`, et il suffit de lui
faire suivre la partition (`phases[answeredQuestions]`) au lieu de tirer au
sort. Tout le reste — tentatives, série, « une erreur ne change pas la
question », pondération, bilan — sert tel quel.

## 16. Validation effectuée (27 juillet 2026)

**Génération et moteur, hors navigateur** — harnais Node sur `sheet/exercises.js`
(hasard injecté, trois exécutions identiques), parmi 89 vérifications passées
couvrant aussi 09 et F3 :

- disponibilité des combinaisons : cinq étapes, droite/gauche partout sauf la
  double portée qui impose les deux mains ;
- étape 1 : trois mesures de quatre noires, bonne clé par main, notes dans le
  groupe, jamais deux fois la même note à la suite ; une erreur conserve la
  question ; bilan exact (premier coup, à revoir) ;
- étape 2 : les mesures sont les motifs 4/4 de 05 (tous valides d'après
  `patternIssues`), une question de hauteur par note plus une question de durée
  par évènement, QCM contenant toujours la bonne réponse sans doublon ;
- étape 3 : accidentels puis armure, dièse qui monte et bémol qui descend d'un
  demi-ton, armure sans signe écrit qui altère le bon degré, au moins une note
  réellement altérée par mesure en armure, question altérée attendant bien la
  touche noire ;
- étape 4 : deux empilements par mesure, de deux ou trois notes du groupe, clé
  de pondération indépendante de l'ordre interne des notes ;
- étape 5 : deux clés, temps à deux mains avec une note par main, jamais trois
  temps consécutifs à la même main, bilan par main présent ;
- pondération héritée : sur 300 sessions, une note au poids 3 sort dans ~23 %
  des tirages (contre ~9 % sans poids), les autres continuant de sortir.

**Dans Chromium** (Tone.js remplacé par une doublure locale, le CDN étant bloqué
dans l'environnement de vérification — le harnais teste l'application, pas la
synthèse) — 42 vérifications passées au total avec 09 et F3, dont pour 08 :

- réglages : cinq étapes, « Les deux » désactivé hors double portée et imposé
  par elle ;
- session complète de l'étape 1 jusqu'au bilan, à l'indice : progression
  affichée, erreur signalée sans changer de question, bilan à trois chiffres ;
- journal F3 : `session-end` en `done`, chaque tentative porte sa cible, une
  erreur conserve la note jouée à la place ;
- étape 2 : le QCM de durée apparaît avec quatre propositions et le clavier se
  masque pendant la question de durée ;
- étape 5 : deux clés dessinées et l'accolade présente ;
- non-régression : le mode Morceau démarre et s'arrête proprement, aucune
  erreur de page.

**Mise en page** — 27 vérifications sur trois fenêtres (390×844, 844×390,
1280×800) : aucun débordement horizontal sur les réglages, l'exercice et le
bilan ; portée visible ; touches blanches ≥ 30 px.

Reste à vérifier sur l'appareil réel : le toucher sur la tablette et le rendu
sonore (la doublure de Tone ne joue rien).
