# Fondation F2 — Entrée clavier MIDI

> Statut : **fondation en place** (26/07/2026). Détection, permission, choix de
> l'appareil, branchement à chaud et normalisation des notes fonctionnent, avec
> un panneau de connexion sur l'accueil et un affichage des notes reçues (§ 15).
> **Aucune fonctionnalité ne la consomme encore** : c'est l'étape suivante du
> backlog. Et il reste la seule vérification que rien ne remplace : un vrai
> clavier branché.

[Retour à la checklist générale](README.md)

## Checklist résumée

- [x] Définir le principe de la détection et de la connexion d'un clavier.
- [x] Définir le format normalisé d'un évènement de note.
- [x] Détecter le support du Web MIDI API et la connexion d'un appareil.
  (`src/midi-input.js`, sans DOM ; branchement et débranchement à chaud gérés)
- [x] Implémenter la réception et la normalisation des notes jouées.
  (note on/off, vélocité 0..1, horodatage, filtrage des rebonds de touche)
- [x] Ajouter l'indicateur de connexion et le choix de l'appareil.
  (`src/midi-controls.js`, sur l'accueil)
- [x] Vérifier qu'aucune fonctionnalité ne devient dépendante du MIDI.
  (les quatre modes vérifiés sans support, et après un refus de permission)
- [ ] Tester avec un vrai clavier MIDI branché.
  (les vérifications automatiques utilisent une doublure du Web MIDI ; seul un
  appareil réel peut valider la latence et les messages d'un vrai fabricant)

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

## 8. Modèle normalisé — en place

L'évènement transmis aux fonctionnalités est exactement celui prévu :

```js
// midi-input.js
const noteEvent = {
  type: "noteon", // "noteon" | "noteoff"
  midi: 60, // hauteur MIDI standard, réutilisable avec music.js
  velocity: 0.8, // 0 à 1 si disponible, sinon valeur par défaut
  timestamp: 0, // performance.now() au moment de l'évènement
  source: "physical-midi",
};
```

Une fonctionnalité s'abonne par `onMidiNote(callback)` / `offMidiNote(callback)`
et ne voit jamais un octet de statut. `onMidiNote` rend aussi une fonction de
désabonnement, ce qui évite de garder une référence au callback pour le retirer
dans un `stop()`.

Trois points que l'implémentation a dû trancher :

- **une attaque de vélocité 0 est un relâchement.** C'est la convention d'une
  bonne partie des claviers ; l'ignorer laisserait des notes tenues à vie.
- **l'horodatage vient du message**, pas de l'instant où le code s'exécute :
  `MIDIMessageEvent.timeStamp` est sur la même horloge que `performance.now()` et
  il est plus juste. On ne retombe sur l'horloge que s'il est inutilisable — ce
  qui comptera le jour où [05](05-entrainement-rythmique.md) jugera un timing au
  clavier physique.
- **l'état est aussi observable** : `midiState()` rend le statut, les appareils,
  l'appareil actif, les notes tenues, et `listening` — vrai seulement si tout est
  réuni (permission accordée, appareil présent, entrée activée).

## 9. Découpage technique

Découpage réellement en place (26/07/2026) :

```text
src/
  midi-input.js    # détection, permission, appareils, normalisation   [fait]
  midi-controls.js # panneau de connexion sur l'accueil                [fait]
  music.js         # conversion note MIDI <-> nom, déjà partagé
```

`midi-input.js` ne dépend ni du DOM ni du Canvas ni de `@tonejs/midi` (réservé au
parsing des fichiers `.mid`) : `requestAccess` et l'horloge lui sont injectés, ce
qui permet de vérifier hors navigateur l'absence de support, un refus de
permission, le branchement à chaud et la normalisation — 86 vérifications dans
Node (§ 15).

**Une seule instance partagée**, exposée par le module. L'accès MIDI est une
ressource unique du navigateur : le demander par fonctionnalité n'aurait pas de
sens. Contrairement à l'audio, cet état **survit aux changements de mode** — une
permission accordée et un appareil choisi n'ont aucune raison d'être redemandés à
chaque `start()`. La fabrique `createMidiInput()` n'existe que pour les
vérifications.

### Où vit le panneau de connexion

Sur l'**accueil**, sous la grille des fonctionnalités. Le § 5 décrivait la
détection au moment d'ouvrir une fonctionnalité ; mettre le panneau dans chaque
mode l'aurait tripliqué, et l'appbar est déjà pleine sur petit écran. L'accueil
est le seul écran qui n'appartient à aucune fonctionnalité, et c'est là qu'on
branche son clavier avant de choisir un exercice. Les fonctionnalités, elles,
n'auront qu'à s'abonner : elles n'ont pas à porter l'interface de connexion.

## 10. Étapes de réalisation

### Étape A — Fondations — **faite le 26/07/2026**

- [x] Définir le format normalisé d'un évènement de note (section 8).
- [x] Définir l'API d'abonnement partagée (`onMidiNote` / `offMidiNote`).
- [x] Identifier les fonctionnalités déjà prêtes à la consommer (03 en
  premier, voir son étape D).
  (03 étape D, puis la reproduction de [05](05-entrainement-rythmique.md) qui a
  déjà « Clavier MIDI » dans ses modes d'entrée prévus, puis les décisions
  ouvertes de [01](01-apprentissage-morceau.md) — aucune n'est branchée ici,
  c'est l'étape 12 du backlog)

### Étape B — Interface — **faite le 26/07/2026**

- [x] Ajouter un indicateur d'état MIDI (non supporté / non branché /
  connecté à [appareil]).
  (pastille de couleur + phrase, avec `aria-live` : éteinte sans support,
  orange en attente, verte quand ça écoute, rouge sur un refus)
- [x] Ajouter le choix de l'appareil quand plusieurs sont détectés.
  (liste déroulante native, masquée tant qu'il n'y a rien à choisir)
- [x] Ajouter le bouton pour activer/désactiver l'entrée MIDI.
  (plus un bouton « Rafraîchir » pour relire la liste, utile quand le
  navigateur ne signale pas un branchement)

### Étape C — Logique — **faite le 26/07/2026**

- [x] Détecter le support du Web MIDI API sans faire planter les
  navigateurs non compatibles.
- [x] Demander la permission et gérer un refus explicitement.
  (un refus est un **état**, pas une exception : l'appelant n'a pas à écrire un
  `try` pour une réponse prévisible)
- [x] Écouter les messages note on/off et les normaliser en `noteEvent`.
  (canal ignoré, vélocité 0 traitée comme un relâchement, tout ce qui n'est pas
  une note ignoré — y compris le CC 64, qui attend [09](09-pedale.md))
- [x] Gérer le branchement et le débranchement en cours de session.
  (repli sur l'appareil restant, et les notes tenues sont **relâchées** pour ne
  pas laisser une fonctionnalité suspendue à une note qui ne reviendra pas)

### Étape D — Validation — partielle

- [ ] Tester avec un clavier MIDI physique réel, au moins un modèle.
  (**seul point non vérifiable ici** : les vérifications automatiques passent par
  une doublure du Web MIDI)
- [x] Tester le refus de permission et l'absence de support du navigateur.
- [x] Tester le débranchement en cours de fonctionnalité sans plantage.
- [x] Vérifier qu'aucune fonctionnalité ne devient inutilisable sans clavier
  MIDI branché.
  (les quatre modes ouverts et démarrés sans support, puis après un refus)

## 11. Critères d'acceptation

- [x] Un clavier MIDI branché et autorisé est détecté et affiché comme
  connecté.
- [x] Jouer une touche physique déclenche un évènement reçu par la
  fonctionnalité active.
  (reçu et affiché par le panneau de l'accueil — le seul abonné pour l'instant ;
  une fonctionnalité consommatrice viendra à l'étape 12 du backlog)
- [x] Débrancher le clavier ne bloque ni l'application ni la fonctionnalité
  en cours.
- [x] Toute fonctionnalité proposant le MIDI reste utilisable sans clavier
  branché.
- [x] L'absence de support du Web MIDI API est signalée sans erreur
  bloquante.

## 12. Validation prévue

- test manuel avec un clavier MIDI physique réel ;
- test du refus de permission navigateur ;
- test dans un navigateur sans support du Web MIDI API ;
- test de branchement/débranchement en cours de fonctionnalité ;
- vérification qu'aucune fonctionnalité ne devient bloquée sans MIDI.

## 13. Décisions ouvertes — deux tranchées le 26/07/2026

- ~~Quel filtrage prévoir pour le bruit (notes fantômes, rebonds de touche) ?~~
  **Le minimum qui n'invente aucun seuil** : pas de seconde attaque sur une note
  déjà tenue, pas de relâchement d'une note qui ne l'était pas. Cela absorbe les
  rebonds de touche sans fenêtre temporelle arbitraire — un seuil en
  millisecondes se serait trompé sur un trille rapide. Si de vraies notes
  fantômes apparaissent avec un appareil réel, c'est **là** qu'il faudra ajouter
  un filtre, avec la mesure sous les yeux.
- ~~Faut-il un mini-clavier ou une simple liste déroulante pour choisir
  l'appareil actif ?~~ **Liste déroulante native**, et masquée tant qu'il n'y a
  qu'un appareil : c'est la cible tactile la plus sûre, et le nom de l'appareil
  est de toute façon la seule information disponible pour le distinguer. Un
  mini-clavier n'aurait rien montré de plus.
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

## 14. Première priorité — faite

Construire une boucle minimale : **détecter un clavier MIDI branché →
l'activer → jouer une touche → voir la note normalisée dans la console /
un affichage de test.**

C'est fait (26/07/2026), et l'« affichage de test » est devenu une partie
assumée du panneau : les dernières notes reçues s'affichent avec leur nom latin
et la vélocité de la dernière. Ce n'est pas du débogage jetable — c'est ce qui
permet de vérifier qu'un clavier marche *avant* de commencer un exercice, et de
savoir si un silence vient du clavier ou de l'exercice.

La suite est l'étape 12 du backlog : brancher cette fondation dans l'étape D des
[Exercices techniques](03-technique-doigts.md), dans la reproduction de
l'[Entraînement rythmique](05-entrainement-rythmique.md) et dans les décisions
ouvertes du [mode Morceau](01-apprentissage-morceau.md).

## 15. Validation effectuée (26 juillet 2026)

**Détection, permission et normalisation, hors navigateur** — 86 vérifications
sur 86, dans Node, avec `requestAccess` et l'horloge injectés :

- **sans Web MIDI** : état `unsupported`, activer ne lève rien, l'absence de
  support est expliquée, rien n'écoute ;
- **permission** : l'état `requesting` est réellement observable pendant la
  demande ; un `SecurityError` comme un `NotAllowedError` donnent `denied` avec un
  message qui parle de refus et du navigateur ; toute autre erreur donne `error`
  en reprenant la raison ; un accès nul est un échec, pas un succès ;
  réactiver après une désactivation **ne redemande pas** la permission ;
- **appareils** : les deux claviers listés avec nom et fabricant, le premier
  actif, le clavier inactif **non entendu** ; changer d'appareil relâche les notes
  tenues de l'ancien ; un identifiant inconnu est ignoré ;
- **branchement à chaud** : permission accordée sans aucun appareil donne `ready`
  mais `listening` faux ; brancher ensuite rend l'appareil actif et démarre
  l'écoute sans réactivation ; `refresh()` rattrape un branchement non signalé ;
- **débranchement** : l'appareil actif retiré fait basculer sur le suivant et
  **relâche ses notes tenues** ; retirer le dernier laisse `ready` sans appareil,
  sans exception, et un clavier débranché n'est plus entendu ;
- **normalisation** : forme exacte de l'évènement du § 8 comparée champ par
  champ ; vélocité 127 → 1 et 1 → 1/127 ; attaque de vélocité 0 traitée comme un
  relâchement ; canal MIDI ignoré ; control change, program change, horloge et
  pitch bend ignorés ; message tronqué, `null` ou `data` nul sans effet ; note à
  deux octets acceptée avec la vélocité par défaut ; hauteur hors de 0..127
  refusée ; horodatage inutilisable retombant sur l'horloge injectée ;
- **filtrage** : trois attaques d'affilée sur la même note n'en produisent qu'une,
  deux relâchements n'en produisent qu'un, et la note redevient jouable après son
  relâchement ; désactiver **relâche tout ce qui était tenu** ; `dispose()`
  détache l'appareil et coupe tout ;
- **abonnements** : plusieurs abonnés reçoivent la même note, `offNote` et la
  fonction rendue par `onNote` désabonnent, un abonné qui lève une exception
  n'empêche ni les autres de recevoir ni les notes suivantes d'arriver, et jouer
  une note ne déclenche **pas** de notification d'état (ce serait du bruit).

**Chaîne complète, dans Chrome sans interface** — 80 vérifications sur 80, trois
exécutions consécutives identiques, cinq phases enchaînées par de vraies
navigations, chacune dans son mode de permission. Le Web MIDI est remplacé par
une doublure installée **avant** les modules de l'application :

- accueil : un seul panneau, l'entrée MIDI annoncée comme facultative, et
  **aucune permission demandée sans geste de l'utilisateur** ;
- activation sans clavier : l'absence est dite, puis un branchement à chaud est
  détecté sans réactiver et l'application écoute réellement l'appareil ;
- notes reçues : nom latin et vélocité en pourcentage, un accord de trois notes
  arrive entièrement, un **rebond de touche** ne produit pas de doublon, une
  touche noire est nommée avec son dièse, et les messages qui ne sont pas des
  notes ne changent rien ;
- deux claviers : la liste apparaît, le clavier inactif n'est pas écouté, le
  changement met à jour l'état **et** l'appareil réellement branché ;
- débranchements : l'actif retiré fait basculer sur l'autre, le choix disparaît
  quand il n'y a plus de choix, retirer le dernier est dit clairement sans
  erreur de page, et rebrancher fonctionne ;
- désactivation volontaire : mise en veille, plus une note transmise, affichage
  remis à zéro, et la réactivation ne redemande pas la permission ;
- **refus de permission** : expliqué, pastille rouge, aucune erreur de page — et
  la Lecture de notes comme le Rythme s'ouvrent et démarrent normalement ;
- **navigateur sans Web MIDI** : l'API réellement absente, l'absence dite, le
  bouton désactivé, et forcer le clic ne casse rien ; **les quatre modes ouverts
  et démarrés** ;
- l'état survit aux changements de mode : trois allers-retours par des
  fonctionnalités différentes, le clavier reste connecté, la permission n'est
  jamais redemandée, il n'y a **qu'un seul panneau** dans la page et la note
  affichée n'apparaît qu'une fois (aucun abonné empilé) ;
- débrancher **pendant** qu'un exercice est ouvert ne casse rien, et l'accueil le
  reflète au retour.

**Non-régression** — tous les harnais précédents rejoués tels quels : 154/154,
74/74, 245/245 et 217/217 dans Node ; 200/200, 110/110, 50/50, 124/124, 184/184,
139/139 et 300/300 dans Chrome.

**Ce qui n'est pas vérifié, et ne peut pas l'être ici** : un vrai clavier. Une
doublure reproduit le protocole, pas un appareil — ni la latence réelle, ni les
messages que tel fabricant envoie en plus, ni les vraies notes fantômes. C'est
la ligne de l'étape D qui reste ouverte, et c'est celle qui décidera si le
filtrage minimal du § 13 suffit.
