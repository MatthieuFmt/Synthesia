# 🎹 Synthesia Web

Application web type *Synthesia* pour apprendre le piano : elle lit un fichier
MIDI et affiche les notes sur une grille à défilement vertical (le morceau
démarre **en bas** et monte vers le **haut**).

## Étape 1 — ce qui est implémenté

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

## Lancer le projet

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
```

## Prochaines étapes envisagées

- Lecture audio synchronisée + curseur de lecture (play/pause).
- Clavier interactif en bas avec surbrillance des notes jouées.
- Mode entraînement (attente de la bonne note via MIDI input / Web MIDI API).
