// ============================================================================
//  Clavier de piano en DOM — partagé par la Lecture de notes et l'Oreille (07)
//
//  Une rangée de touches blanches en `<button>` et une rangée de noires posées
//  par-dessus, limitées à l'étendue utile de l'exercice. Rien n'y défile, donc
//  rien n'y justifie un Canvas : des `<button>` sont plus larges au doigt,
//  focalisables et annoncés par leur nom (cf. CLAUDE.md, « Petit écran »).
//
//  Extrait de l'ancien `note-reading-mode.js` le 27/07/2026, quand l'Entraînement de
//  l'oreille (07) a eu besoin du *même* clavier — même étendue calculée depuis
//  un groupe de notes, même défilement plutôt que des touches sous 30 px, mêmes
//  états correct / faux / désigné (plan/07-entrainement-oreille.md § 7, qui
//  renvoie explicitement à celui de 02).
//
//  Ce n'est donc pas le `piano.js` universel que le dossier a toujours refusé :
//  les 88 touches en Canvas du mode Morceau et le rouleau des Exercices n'ont
//  toujours rien à voir avec celui-ci.
//
//  Le préfixe de classes CSS est un paramètre : chaque mode garde sa famille de
//  styles (`fl-…`, `ear-…`) comme le reste du dossier.
// ============================================================================

import { isWhite, noteDegreeName, octaveOf, pitchClass } from "./music.js";

// Largeur minimale d'une touche blanche, gap compris : en dessous, la cible
// devient trop petite pour le doigt (≥ 30 px, cf. CLAUDE.md). Les étendues
// larges font défiler le clavier plutôt que d'amincir leurs touches.
export const MIN_KEY_WIDTH = 36;

// Étendue à dessiner pour un groupe de notes (plan/02-lecture-notes.md § 4) :
//
//  - groupe qui tient dans une octave Do → Do : on affiche cette octave, ses
//    touches inutilisées servant de leurres ;
//  - groupe plus large : l'étendue exacte du groupe suffit — il compte déjà
//    plus de dix candidats, et l'arrondir aux Do ajouterait quatre à sept
//    touches, donc des touches trop fines.
//
// Le test porte sur l'octave, pas sur la largeur du groupe : un groupe de moins
// de douze demi-tons peut enjamber un Do (La4 → Fa5 depuis le 08/08/2026), et
// l'octave arrondie laisserait alors ses notes hautes hors du clavier — donc
// injouables.
export function keyboardRange(pool) {
  const lowest = Math.min(...pool);
  const highest = Math.max(...pool);
  const start = lowest - pitchClass(lowest);
  if (highest <= start + 12) return { start, end: start + 12 };
  return { start: lowest, end: highest };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Le clavier est vide au départ : ses touches sont dessinées par `setRange()`.
// Un seul écouteur suffit pour toutes les touches, y compris celles qui
// n'existent pas encore.
export function createPianoKeyboard({
  prefix = "nr",
  signal,
  onPress,
  minKeyWidth = MIN_KEY_WIDTH,
} = {}) {
  const element = el("div", `${prefix}-keyboard`);
  const inner = el("div", `${prefix}-keyboard-inner`);
  element.appendChild(inner);

  const keys = new Map(); // midi -> bouton
  let range = null;

  element.addEventListener(
    "click",
    (event) => {
      const key = event.target.closest?.(`.${prefix}-key`);
      if (key) onPress?.(Number(key.dataset.midi));
    },
    { signal }
  );

  function makeKey(midi, className) {
    const key = el("button", className);
    key.type = "button";
    key.dataset.midi = String(midi);
    key.setAttribute("aria-label", `${noteDegreeName(midi)}${octaveOf(midi)}`);
    keys.set(midi, key);
    return key;
  }

  // Redessine le clavier pour une nouvelle étendue. Sans effet — et sans perdre
  // l'état des touches — si l'étendue n'a pas changé : en mode Les deux, elle ne
  // bouge qu'au changement de main, pas entre deux questions.
  function setRange(next) {
    if (range && range.start === next.start && range.end === next.end) return false;
    range = { start: next.start, end: next.end };

    const whites = [];
    for (let midi = range.start; midi <= range.end; midi++) {
      if (isWhite(midi)) whites.push(midi);
    }
    const whiteWidth = 100 / whites.length;
    const blackWidth = whiteWidth * 0.62;

    const whiteRow = el("div", `${prefix}-whites`);
    const blackRow = el("div", `${prefix}-blacks`);
    keys.clear();

    // Largeur minimale du clavier : au-delà, il défile horizontalement plutôt
    // que de rétrécir ses touches sous la taille du doigt. Sur la tablette en
    // paysage, deux octaves tiennent sans défilement.
    inner.style.minWidth = `${whites.length * minKeyWidth}px`;

    for (const midi of whites) {
      const key = makeKey(midi, `${prefix}-key ${prefix}-key--white`);
      // Repère d'octave : le Do reste le point d'ancrage du parcours.
      if (pitchClass(midi) === 0) {
        key.appendChild(el("span", `${prefix}-key-label`, "Do"));
      }
      whiteRow.appendChild(key);
    }

    for (let midi = range.start; midi <= range.end; midi++) {
      if (isWhite(midi)) continue;
      const leftWhiteIndex = whites.indexOf(midi - 1);
      if (leftWhiteIndex < 0) continue;
      const key = makeKey(midi, `${prefix}-key ${prefix}-key--black`);
      key.style.left = `${(leftWhiteIndex + 1) * whiteWidth - blackWidth / 2}%`;
      key.style.width = `${blackWidth}%`;
      blackRow.appendChild(key);
    }

    inner.replaceChildren(whiteRow, blackRow);

    // Quand le clavier défile, on part du milieu de l'étendue : les deux
    // extrémités sont alors à la même distance. La position ne bouge plus
    // ensuite (elle est la même à chaque question), donc elle ne renseigne
    // sur rien.
    element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2;
    return true;
  }

  return {
    element,
    inner,
    keys,

    get range() {
      return range;
    },

    setRange,

    // Étendue déduite d'un groupe de notes, puis dessinée.
    setPool(pool) {
      return setRange(keyboardRange(pool));
    },

    key(midi) {
      return keys.get(midi) ?? null;
    },

    clearStates() {
      for (const key of keys.values()) {
        key.classList.remove("is-correct", "is-wrong", "is-hinted");
      }
    },

    // Désigne une touche. Sur un clavier qui défile, elle peut être hors du
    // cadre : un indice ne sert à rien s'il faut le chercher.
    highlight(midi, className = "is-hinted") {
      const key = keys.get(midi);
      if (!key) return null;
      key.classList.add(className);
      key.scrollIntoView({ block: "nearest", inline: "nearest" });
      return key;
    },
  };
}
