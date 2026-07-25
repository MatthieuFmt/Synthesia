# Feature 08 — Lecture de partitions

> Statut : planifiée — aucune partie n'est encore implémentée.
> Suite directe de [02 — Lecture de notes](02-lecture-notes.md), dont elle
> reprend et poursuit l'étape D.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir la progression note unique → mesure → double portée.
- [x] Définir l'ordre d'introduction des nouveautés (une seule à la fois).
- [x] Définir la frontière avec la Lecture de notes et l'Entraînement rythmique.
- [ ] Étendre le rendu de portée aux petites mesures.
- [ ] Ajouter les valeurs rythmiques et les silences.
- [ ] Ajouter les altérations.
- [ ] Ajouter les notes simultanées.
- [ ] Ajouter la vraie double portée.

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

### Étape A — Petites mesures

- [ ] Afficher plusieurs notes sur une portée, avec la note attendue mise en
  évidence.
- [ ] Valider les notes d'une mesure dans l'ordre.
- [ ] Réutiliser le moteur de session et le bilan de 02.

### Étape B — Valeurs rythmiques et silences

- [ ] Dessiner noires, blanches, rondes et croches.
- [ ] Dessiner les silences correspondants.
- [ ] Trancher et implémenter la façon de répondre à une durée (section 13).
- [ ] Partager le vocabulaire de durées avec 05.

### Étape C — Altérations

- [ ] Dessiner dièses et bémols accidentels.
- [ ] Accepter les enharmonies (Fa♯ et Sol♭ sur la même touche).
- [ ] Introduire l'armure et l'appliquer à toute la mesure.

### Étape D — Notes simultanées

- [ ] Aligner verticalement deux ou trois notes.
- [ ] Valider un empilement dans n'importe quel ordre.

### Étape E — Double portée

- [ ] Dessiner deux portées reliées avec leurs clés.
- [ ] Attendre une note à chaque main, éventuellement simultanément.
- [ ] Produire un bilan séparé par main, comme prévu en
  [02 étape D](02-lecture-notes.md#étape-d--progression).

## 12. Critères d'acceptation

- [ ] L'utilisateur peut lire et jouer une mesure de plusieurs notes.
- [ ] Les valeurs rythmiques et les silences de la section 5 sont affichés
  lisiblement et correctement identifiés.
- [ ] Les dièses et bémols sont gérés, et les deux noms d'une même touche
  noire sont acceptés.
- [ ] Une armure s'applique correctement aux notes de la mesure.
- [ ] Un empilement de notes est validé quel que soit l'ordre de jeu.
- [ ] La double portée affiche les deux clés et attend les deux mains.
- [ ] Chaque étape reste jouable au clic, au toucher et au clavier MIDI si
  disponible.
- [ ] La Lecture de notes (02) ne régresse pas.

## 13. Décisions ouvertes

- **Comment répond-on à une durée ?** En la choisissant (QCM), ou en
  maintenant la touche le bon nombre de temps ? La seconde option est plus
  musicale mais introduit une mesure de timing, donc un recouvrement avec
  [05](05-entrainement-rythmique.md) — et exige alors un métronome.
- **Rendu maison ou bibliothèque de gravure** (section 8) ? À trancher au
  début de l'étape B, pas avant.
- Faut-il générer les mesures aléatoirement, ou proposer de vraies
  mélodies courtes du domaine public, plus musicales à lire ?
- Faut-il pouvoir lire directement une partition issue d'un fichier MIDI de
  la bibliothèque, ou rester sur des exercices générés ?

## 14. Hors périmètre pour le moment

- Pas d'import ni de rendu de fichiers MusicXML.
- Pas de nuances, d'articulations, de liaisons ni d'ornements.
- Pas de doigté écrit sur la partition.
- Pas de défilement chronométré de la partition : cela relève du mode
  Fluidité déjà envisagé en [02](02-lecture-notes.md#parcours-pédagogique-proposé).
- Pas de mesures composées complexes au-delà de ce que 05 introduit.

## 15. Première priorité

Construire l'étape 1 seule : **une mesure de quatre noires sur une portée →
la note attendue est mise en évidence → l'utilisateur joue les quatre notes
dans l'ordre → bilan identique à celui de la Lecture de notes.** Cette étape
ne demande presque aucun rendu nouveau et valide que le moteur de session de
02 supporte bien une suite de notes au lieu d'une note isolée — c'est le
vrai risque à lever avant d'investir dans la gravure musicale.
