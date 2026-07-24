# 🎹 Synthesia Web

Application web type *Synthesia* pour apprendre le piano : elle lit un fichier
MIDI et affiche les notes sur une grille à défilement vertical (le morceau
démarre **en bas** et monte vers le **haut**).

## Étape 1 — grille & parsing

- **Stack** : HTML5 Canvas + JavaScript moderne (modules ES). Parsing MIDI via
  [`@tonejs/midi`](https://github.com/Tonejs/Midi) chargé depuis un CDN.
- **Chargement** : import d'un fichier `.mid`/`.midi` **ou** un morceau de
  **démo** intégré (données fictives) pour démarrer sans fichier.
- **Distinction des mains** : main droite (bleu) / main gauche (vert).
  Séparation par piste (la piste la plus grave = main gauche) avec repli
  automatique autour du Do central si une seule piste est présente.
- **Repères verticaux** : une ligne juste **à gauche de chaque Do (C)** et une
  juste **à droite de chaque Mi (E)**, plus l'étiquette d'octave (C1, C2…).
- **Repères horizontaux** : une ligne à **chaque début de mesure**, calculée à
  partir du **tempo** et de la **signature rythmique** du fichier (gère les
  changements de tempo/signature via les ticks).
- **Navigation** : défilement vertical libre à la **molette** ou au **glisser**
  (souris/tactile) pour avancer ou reculer manuellement.

## Étape 2 — lecture audio & curseur

- **Audio** : synthèse polyphonique via [`Tone.js`](https://tonejs.github.io/)
  qui joue les notes MIDI parsées.
- **Curseur de lecture** : une ligne « now line » fixe (orange) que les notes
  traversent ; les notes en cours de jeu sont mises en surbrillance.
- **Transport** : bouton **play/pause**, temps écoulé / total, et barre de
  progression cliquable (**seek**). Raccourci **Espace** pour play/pause.
- **Défilement auto** : pendant la lecture, l'affichage suit le curseur.
  `currentTime` est la source de vérité unique, donc la lecture et le
  scrubbing manuel (molette / glisser / clic) partagent la même logique.

> ℹ️ L'audio démarre au premier clic sur ▶ (politique « user gesture » des
> navigateurs pour l'`AudioContext`).

## Étape 3 — lecture de partition (mini-portées)

Chaque note qui défile porte une **mini-portée** pour apprendre à lire le
solfège en jouant :

- 5 lignes + **clé de sol** (main droite) ou **clé de fa** (main gauche),
- la **tête de note** placée à la bonne hauteur, avec **lignes supplémentaires**
  (ledger) au-delà de la portée,
- la **hampe** (trait vertical) orientée selon la règle classique,
- l'éventuelle **altération** (♯),
- le **nom** de la note en **notation latine** (Do, Ré, Mi…).

Case **Notation** dans la barre d'outils pour activer/désactiver l'affichage.

> Pas de clavier interactif : l'app est pensée pour jouer sur un vrai piano.

## Ajouter des morceaux à la bibliothèque

1. Copie tes fichiers `.mid` dans le dossier **`midi/`**.
2. Édite **`songs.json`** à la racine du projet et ajoute une entrée :

```json
[
  { "title": "Démo — Gamme & accords", "builtin": "demo" },
  { "title": "Frère Jacques",          "file": "midi/frere-jacques.mid" },
  { "title": "Ode à la joie",          "file": "midi/ode-to-joy.mid" }
]
```

Le champ `"builtin": "demo"` est réservé à la démo générée en interne.
Pour tes propres morceaux, utilise `"file"` avec le chemin relatif.

## Mode performance

L'application active automatiquement un profil allégé quand le navigateur
signale au maximum 4 Go de mémoire ou 4 processeurs logiques. Ce profil limite
la résolution interne du Canvas, vise environ 30 images par seconde et charge
9 échantillons de piano au lieu de 30, sans modifier les notes ni leur timing.

Le profil peut aussi être forcé dans l'URL :

- `?performance=low` pour privilégier les appareils anciens ;
- `?performance=high` pour conserver la qualité maximale.

## Déployer sur GitHub Pages

1. **Pousse** le dépôt sur GitHub.
2. Dans les **Settings** du dépôt → **Pages** :
   - Source : **Deploy from a branch**
   - Branch : `main` — dossier `/` (root)
3. GitHub génère l'URL `https://<user>.github.io/<repo>/` en quelques minutes.

L'app tourne entièrement côté client (aucun serveur nécessaire) : les scripts
viennent de CDN et les fichiers MIDI sont servis directement par GitHub Pages.

## Lancer le projet en local

Comme on utilise des modules ES + un CDN, il faut servir les fichiers via HTTP
(l'ouverture directe `file://` est bloquée par le navigateur).

```bash
# Au choix :
python3 -m http.server 8000
# ou
npx serve .
```

Puis ouvrir <http://localhost:8000>.

## Structure

```
index.html     # structure de la page + contrôles
style.css      # mise en forme (thème sombre)
src/main.js    # parsing MIDI, calcul des repères, rendu Canvas, défilement
songs.json     # catalogue des morceaux de la bibliothèque
midi/          # tes fichiers .mid
```

## Prochaines étapes envisagées

- Lecture audio synchronisée + curseur de lecture (play/pause).
- Clavier interactif en bas avec surbrillance des notes jouées.
- Mode entraînement (attente de la bonne note via MIDI input / Web MIDI API).
