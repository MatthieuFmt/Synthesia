# Fondation F2 — Entrée clavier MIDI

> Statut : planifiée — aucune entrée MIDI live n'est encore gérée.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir le principe de la détection et de la connexion d'un clavier.
- [x] Définir le format normalisé d'un évènement de note.
- [ ] Détecter le support du Web MIDI API et la connexion d'un appareil.
- [ ] Implémenter la réception et la normalisation des notes jouées.
- [ ] Ajouter l'indicateur de connexion et le choix de l'appareil.
- [ ] Vérifier qu'aucune fonctionnalité ne devient dépendante du MIDI.

## 1. À ne pas confondre avec l'import de fichier existant

L'application sait déjà importer un fichier `.mid`/`.midi` : ce fichier est
analysé une fois avec `@tonejs/midi` pour être rejoué dans le mode Morceau.
C'est une lecture de **données statiques**.

Cette fondation concerne un sujet différent : recevoir en **temps réel** les
notes jouées sur un vrai clavier MIDI (USB ou Bluetooth) branché à
l'ordinateur ou au téléphone, via le **Web MIDI API**
(`navigator.requestMIDIAccess`), qui n'est utilisé nulle part aujourd'hui
dans le code. Les deux systèmes pourront partager la conversion note ↔ nom
(`music.js`), mais pas le code de lecture.

## 2. Problème utilisateur

L'utilisateur possède un piano ou un clavier MIDI et veut jouer dessus
directement plutôt que de cliquer sur le piano affiché à l'écran. Sans
reconnaissance des touches jouées, la Lecture de notes, les Exercices
techniques et le futur apprentissage guidé d'un morceau ne peuvent valider
ses réponses qu'à la souris ou au toucher, ce qui limite l'intérêt de
l'application pour quelqu'un qui possède déjà un instrument.

## 3. Objectif

Détecter qu'un clavier MIDI est branché, permettre à l'utilisateur de
l'activer, et transformer chaque note jouée ou relâchée en un évènement
exploitable par n'importe quelle fonctionnalité — sans que chaque
fonctionnalité ait à réimplémenter la connexion ni à connaître le format brut
des messages MIDI.

## 4. Hors périmètre

- Pas de sortie MIDI : l'application écoute un clavier, elle n'en pilote
  aucun.
- Pas de calibration avancée de la vélocité dans cette première version :
  elle est transmise si disponible, mais aucune fonctionnalité n'est encore
  tenue de s'en servir.
- Pas de plusieurs claviers actifs simultanément : un seul appareil actif à
  la fois.
- Ne remplace pas l'import de fichier `.mid` existant (voir section 1).

## 5. Parcours principal

1. L'utilisateur branche son clavier MIDI puis ouvre une fonctionnalité qui
   peut l'utiliser.
2. L'application détecte que le navigateur supporte le Web MIDI API et
   qu'au moins un appareil est disponible, puis propose de l'activer.
3. L'utilisateur autorise l'accès MIDI (permission navigateur) et choisit
   son appareil si plusieurs sont branchés.
4. L'application confirme la connexion et indique clairement que le clavier
   physique est actif.
5. L'utilisateur joue une touche → la fonctionnalité en cours reçoit la note
   en temps réel et réagit (validation, affichage…).
6. L'utilisateur débranche le clavier ou en choisit un autre → l'application
   le détecte et revient proprement à la pratique sans MIDI (souris/toucher),
   sans bloquer la fonctionnalité en cours.

## 6. Réglages

- Choix de l'appareil MIDI d'entrée si plusieurs sont détectés.
- Activer/désactiver l'entrée MIDI pour revenir volontairement au
  clic/toucher.

## 7. Règles de comportement

- L'entrée MIDI est toujours une amélioration optionnelle : toute
  fonctionnalité qui la propose doit rester utilisable à la souris/au
  toucher si aucun clavier n'est branché ou si le navigateur ne supporte pas
  le Web MIDI API.
- Une note jouée sur le clavier physique doit produire le même retour
  visuel (et sonore si nécessaire) qu'une note cliquée à l'écran, pour
  rester cohérente.
- La connexion ou la déconnexion d'un appareil en cours de session ne doit
  jamais faire planter la fonctionnalité active : elle met seulement à jour
  l'état « clavier connecté ».
- Un évènement transmis aux fonctionnalités reste indépendant du détail du
  Web MIDI API (status byte, data bytes) : aucune fonctionnalité ne doit
  manipuler l'API brute.
- Un refus de permission navigateur doit être expliqué clairement, jamais
  échouer silencieusement.

## 8. Modèle minimal proposé

```js
// midi-input.js — évènement transmis aux fonctionnalités
const noteEvent = {
  type: "noteon", // "noteon" | "noteoff"
  midi: 60, // hauteur MIDI standard, réutilisable avec music.js
  velocity: 0.8, // 0 à 1 si disponible, sinon valeur par défaut
  timestamp: 0, // performance.now() au moment de l'évènement
  source: "physical-midi",
};
```

Une fonctionnalité s'abonne via une API partagée, par exemple
`onMidiNote(callback)` / `offMidiNote(callback)`, sans jamais appeler
`navigator.requestMIDIAccess` elle-même.

## 9. Découpage technique proposé

```text
src/
  midi-input.js   # détection Web MIDI, connexion/déconnexion, normalisation
  music.js        # conversion note MIDI <-> nom/position, déjà partagé
```

`midi-input.js` reste indépendant de `@tonejs/midi` (réservé au parsing des
fichiers `.mid` importés) : ce sont deux entrées différentes vers la même
représentation de note.

## 10. Étapes de réalisation

### Étape A — Fondations

- [ ] Définir le format normalisé d'un évènement de note (section 8).
- [ ] Définir l'API d'abonnement partagée (`onMidiNote` / `offMidiNote`).
- [ ] Identifier les fonctionnalités déjà prêtes à la consommer (03 en
  premier, voir son étape D).

### Étape B — Interface

- [ ] Ajouter un indicateur d'état MIDI (non supporté / non branché /
  connecté à [appareil]).
- [ ] Ajouter le choix de l'appareil quand plusieurs sont détectés.
- [ ] Ajouter le bouton pour activer/désactiver l'entrée MIDI.

### Étape C — Logique

- [ ] Détecter le support du Web MIDI API sans faire planter les
  navigateurs non compatibles.
- [ ] Demander la permission et gérer un refus explicitement.
- [ ] Écouter les messages note on/off et les normaliser en `noteEvent`.
- [ ] Gérer le branchement et le débranchement en cours de session.

### Étape D — Validation

- [ ] Tester avec un clavier MIDI physique réel, au moins un modèle.
- [ ] Tester le refus de permission et l'absence de support du navigateur.
- [ ] Tester le débranchement en cours de fonctionnalité sans plantage.
- [ ] Vérifier qu'aucune fonctionnalité ne devient inutilisable sans clavier
  MIDI branché.

## 11. Critères d'acceptation

- [ ] Un clavier MIDI branché et autorisé est détecté et affiché comme
  connecté.
- [ ] Jouer une touche physique déclenche un évènement reçu par la
  fonctionnalité active.
- [ ] Débrancher le clavier ne bloque ni l'application ni la fonctionnalité
  en cours.
- [ ] Toute fonctionnalité proposant le MIDI reste utilisable sans clavier
  branché.
- [ ] L'absence de support du Web MIDI API est signalée sans erreur
  bloquante.

## 12. Validation prévue

- test manuel avec un clavier MIDI physique réel ;
- test du refus de permission navigateur ;
- test dans un navigateur sans support du Web MIDI API ;
- test de branchement/débranchement en cours de fonctionnalité ;
- vérification qu'aucune fonctionnalité ne devient bloquée sans MIDI.

## 13. Décisions ouvertes

- Quel filtrage prévoir pour le bruit (notes fantômes, rebonds de touche) ?
- Faut-il un mini-clavier ou une simple liste déroulante pour choisir
  l'appareil actif ?
- ~~La pédale de sustain physique envoie un message MIDI (control change 64)
  distinct des notes : faut-il que ce canal MIDI capte aussi ce message ?~~
  **Tranché : oui.** Les [Exercices de pédale](09-pedale.md) en ont besoin,
  et cette brique doit rester le seul endroit qui écoute le MIDI. À traiter
  au moment où 09 est construit, pas avant. Les indices de pédale affichés
  aujourd'hui dans le mode Morceau viennent uniquement du fichier importé et
  ne sont pas concernés.
- À partir de quand une fonctionnalité peut-elle exiger le MIDI plutôt que
  le proposer en option (par exemple un futur exercice pensé uniquement pour
  un vrai piano) ?

## 14. Première priorité

Construire une boucle minimale : **détecter un clavier MIDI branché →
l'activer → jouer une touche → voir la note normalisée dans la console /
un affichage de test.** Cette boucle doit être fiable avant de la brancher
dans l'étape D des [Exercices techniques](03-technique-doigts.md), qui sera
la première fonctionnalité réellement consommatrice.
