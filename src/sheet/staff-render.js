// ============================================================================
//  Rendu de portée — Feature 08 « Lecture de partitions »
//
//  Dessine une mesure complète en SVG : portée(s), clé, armure, chiffrage,
//  notes avec hampes et crochets, empilements, silences, lignes supplémentaires
//  et mise en évidence de l'évènement attendu. Rendu maison, comme tranché en
//  plan/08 § 8 : pas de bibliothèque de gravure pour des mesures de cette
//  taille — les figures sont dessinées comme dans le mode Rythme (tête, hampe,
//  crochet), les silences reprennent les glyphes Unicode de leurs figures.
//
//  Rien n'y défile ni ne s'anime : la portée n'est redessinée qu'au changement
//  de question, jamais dans une boucle d'animation (cf. CLAUDE.md, exceptions
//  SVG assumées de 02 et 05).
// ============================================================================

import { CLEF_GLYPH, staffStep } from "../music.js";
import { FIGURES } from "../rhythm/patterns.js";

const SVG_NS = "http://www.w3.org/2000/svg";

// Proportions du glyphe de clé de fa mesurées pour l'ancien mode 02 :
// les deux points du glyphe doivent encadrer la 4e ligne, la boîte du glyphe
// n'ayant aucune raison de coïncider avec la portée.
const BASS_DOT_GAP_EM = 0.2162;
const BASS_F_LINE_EM = 0.4469;

// Géométrie commune : interligne et marges. La largeur de dessin est fixe, la
// portée s'adapte en CSS (viewBox).
const LG = 14;
const STAFF_H = LG * 4;
const WIDTH = 520;
const LEFT = 14;
const RIGHT = 508;
const CONTENT_LEFT = 118; // après clé, armure et chiffrage
const STEM_LEN = LG * 2.8;
const HEAD_RX = LG * 0.62;
const HEAD_RY = LG * 0.5;

// Position verticale (en degrés d'armure) du signe : le Fa de l'armure de Sol,
// le Si de celle de Fa, sur chaque clé.
const KEY_SIGNATURE_SIGNS = {
  G: { glyph: "♯", steps: { treble: 8, bass: 6 } }, // Fa ligne du haut / 4e ligne
  F: { glyph: "♭", steps: { treble: 4, bass: 2 } }, // Si ligne du milieu / 2e ligne
};

const ACCIDENTAL_GLYPH = { sharp: "♯", flat: "♭" };

function svgEl(tag, attributes = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, String(value));
  }
  return node;
}

// ----------------------------------------------------------------------------
//  Vue de portée
//
//  `render(measure, { cursorIndex })` redessine la mesure ; `setStatus` colore
//  l'évènement courant (retour vert/rouge) sans redessiner.
// ----------------------------------------------------------------------------
export function createStaffView({ prefix = "sr" } = {}) {
  const svg = svgEl("svg", { class: `${prefix}-staff`, role: "img" });
  const title = svgEl("title");
  svg.appendChild(title);
  const content = svgEl("g");
  svg.appendChild(content);

  // Un système par clé : `top` est la ligne du haut de sa portée.
  function systems(measure) {
    if (measure.clefs.length === 1) {
      return [{ clef: measure.clefs[0], top: 58 }];
    }
    return [
      { clef: "treble", top: 36 },
      { clef: "bass", top: 36 + STAFF_H + LG * 3.4 },
    ];
  }

  function heightFor(measure) {
    return measure.clefs.length === 1 ? 176 : 230;
  }

  function render(measure, { cursorIndex = 0 } = {}) {
    svg.setAttribute("viewBox", `0 0 ${WIDTH} ${heightFor(measure)}`);
    content.replaceChildren();

    const staves = systems(measure);
    const byClef = new Map(staves.map((system) => [system.clef, system]));

    for (const system of staves) {
      drawStaff(content, system, measure, prefix);
    }

    // Barres de mesure aux deux bouts — elles relient les deux portées d'une
    // double portée (« deux portées reliées », plan/08 § 11 étape E).
    const topY = staves[0].top;
    const bottomY = staves[staves.length - 1].top + STAFF_H;
    for (const x of [LEFT, RIGHT]) {
      content.appendChild(
        svgEl("line", { class: `${prefix}-barline`, x1: x, y1: topY, x2: x, y2: bottomY })
      );
    }
    // Accolade minimale de la double portée : un trait épais à gauche.
    if (staves.length > 1) {
      content.appendChild(
        svgEl("line", {
          class: `${prefix}-brace`,
          x1: LEFT - 6,
          y1: topY,
          x2: LEFT - 6,
          y2: bottomY,
        })
      );
    }

    // Un créneau égal par évènement : à cette taille de mesure, la lisibilité
    // prime sur l'espacement proportionnel des durées.
    const slot = (RIGHT - CONTENT_LEFT) / measure.events.length;

    measure.events.forEach((event, index) => {
      const x = CONTENT_LEFT + slot * (index + 0.5);
      const state = index < cursorIndex ? "done" : index === cursorIndex ? "current" : "";
      const group = svgEl("g", { class: `${prefix}-event`, "data-state": state });

      // Halo derrière l'évènement attendu : c'est lui, le « curseur » du plan.
      if (state === "current") {
        group.appendChild(
          svgEl("rect", {
            class: `${prefix}-cursor`,
            x: x - slot * 0.42,
            y: topY - LG * 2.2,
            width: slot * 0.84,
            height: bottomY - topY + LG * 4.4,
            rx: 10,
          })
        );
      }

      if (event.type === "rest") {
        drawRest(group, event, x, byClef.get(clefOf(event, measure)), prefix);
      } else {
        drawNotes(group, event, x, measure, byClef, prefix);
      }

      content.appendChild(group);
    });

    title.textContent =
      measure.clefs.length === 1
        ? `Mesure à lire en ${measure.clefs[0] === "treble" ? "clé de sol" : "clé de fa"}`
        : "Mesure à lire sur double portée";
  }

  function setStatus(status) {
    svg.dataset.status = status ?? "";
  }

  return { element: svg, render, setStatus };
}

function clefOf(event, measure) {
  if (measure.clefs.length === 1) return measure.clefs[0];
  return event.hand === "left" ? "bass" : "treble";
}

// ----------------------------------------------------------------------------
//  Portée, clé, armure, chiffrage
// ----------------------------------------------------------------------------
function drawStaff(parent, system, measure, prefix) {
  const { clef, top } = system;

  for (let i = 0; i < 5; i++) {
    const y = top + i * LG;
    parent.appendChild(
      svgEl("line", { class: `${prefix}-staff-line`, x1: LEFT, y1: y, x2: RIGHT, y2: y })
    );
  }

  const bottom = top + STAFF_H;
  const clefText = svgEl("text", { class: `${prefix}-clef`, x: LEFT + 6 });
  clefText.textContent = CLEF_GLYPH[clef];
  if (clef === "treble") {
    clefText.setAttribute("font-size", Math.round(STAFF_H * 1.7));
    clefText.setAttribute("y", bottom + LG * 0.6);
  } else {
    const size = Math.round(LG / BASS_DOT_GAP_EM);
    clefText.setAttribute("font-size", size);
    clefText.setAttribute("y", Math.round(top + LG + size * BASS_F_LINE_EM));
  }
  parent.appendChild(clefText);

  // Armure : un seul signe dans cette étape (Sol majeur ou Fa majeur).
  const signature = KEY_SIGNATURE_SIGNS[measure.keySignature];
  if (signature) {
    const y = bottom - signature.steps[clef] * (LG / 2);
    const sign = svgEl("text", {
      class: `${prefix}-signature`,
      x: 62,
      y: y + LG * 0.42,
    });
    sign.textContent = signature.glyph;
    parent.appendChild(sign);
  }

  // Chiffrage de mesure, dessiné dès qu'il est introduit (plan/08 § 7).
  const [beats, unit] = measure.timeSignature;
  const timeX = 92;
  const upper = svgEl("text", { class: `${prefix}-time`, x: timeX, y: top + LG * 1.72 });
  upper.textContent = String(beats);
  const lower = svgEl("text", { class: `${prefix}-time`, x: timeX, y: top + LG * 3.72 });
  lower.textContent = String(unit);
  parent.append(upper, lower);
}

// ----------------------------------------------------------------------------
//  Notes (isolées ou empilées) et silences
// ----------------------------------------------------------------------------
function drawNotes(parent, event, x, measure, byClef, prefix) {
  const figure = FIGURES[event.figure];

  // Les notes d'un évènement, regroupées par portée : un empilement d'une main
  // partage sa hampe, un temps à deux mains dessine une note sur chaque portée.
  const bySystem = new Map();
  for (const note of event.notes) {
    const clef = measure.clefs.length === 1
      ? measure.clefs[0]
      : (note.hand ?? event.hand) === "left" ? "bass" : "treble";
    if (!bySystem.has(clef)) bySystem.set(clef, []);
    bySystem.get(clef).push(note);
  }

  for (const [clef, notes] of bySystem) {
    const system = byClef.get(clef);
    const bottom = system.top + STAFF_H;

    const steps = notes.map((note) => staffStep(note.written ?? note.midi, clef));
    const ys = steps.map((step) => bottom - step * (LG / 2));

    // Lignes supplémentaires, pour chaque tête hors de la portée.
    for (const step of steps) {
      const half = HEAD_RX + 6;
      const addLedger = (k) => {
        const y = bottom - k * (LG / 2);
        parent.appendChild(
          svgEl("line", {
            class: `${prefix}-staff-line`,
            x1: x - half,
            y1: y,
            x2: x + half,
            y2: y,
          })
        );
      };
      if (step < 0) for (let k = -2; k >= step; k -= 2) addLedger(k);
      else if (step > 8) for (let k = 10; k <= step; k += 2) addLedger(k);
    }

    // Hampe commune de l'empilement : vers le haut sous la 3e ligne (moyenne),
    // vers le bas au-dessus. La ronde n'en a pas.
    if (figure.stem) {
      const mean = steps.reduce((sum, step) => sum + step, 0) / steps.length;
      const up = mean < 4;
      const stemX = up ? x + HEAD_RX - 1 : x - HEAD_RX + 1;
      const from = up ? Math.max(...ys) : Math.min(...ys);
      const tip = (up ? Math.min(...ys) : Math.max(...ys)) + (up ? -STEM_LEN : STEM_LEN);
      parent.appendChild(
        svgEl("line", { class: `${prefix}-stem`, x1: stemX, y1: from, x2: stemX, y2: tip })
      );

      // Crochets de croche, orientés selon la hampe (cf. mode Rythme).
      for (let flag = 0; flag < figure.flags; flag++) {
        const y = tip + flag * 9 * (up ? 1 : -1);
        const d = up
          ? `M ${stemX} ${y} c 9 3 12 9 10 17 c -1 -8 -5 -11 -10 -12 z`
          : `M ${stemX} ${y} c 9 -3 12 -9 10 -17 c -1 8 -5 11 -10 12 z`;
        parent.appendChild(svgEl("path", { class: `${prefix}-flag`, d }));
      }
    }

    notes.forEach((note, index) => {
      const y = ys[index];
      const head = svgEl("ellipse", {
        class: `${prefix}-head${figure.hollow ? ` ${prefix}-head--hollow` : ""}`,
        cx: x,
        cy: y,
        rx: HEAD_RX,
        ry: HEAD_RY,
        transform: `rotate(-17 ${x} ${y})`,
      });
      parent.appendChild(head);

      // Altération accidentelle, à gauche de la tête (plan/08 § 11 étape C).
      const glyph = ACCIDENTAL_GLYPH[note.accidental];
      if (glyph) {
        const accidental = svgEl("text", {
          class: `${prefix}-accidental`,
          x: x - HEAD_RX - 16,
          y: y + LG * 0.45,
        });
        accidental.textContent = glyph;
        parent.appendChild(accidental);
      }
    });
  }
}

function drawRest(parent, event, x, system, prefix) {
  const figure = FIGURES[event.figure];
  const rest = svgEl("text", {
    class: `${prefix}-rest`,
    x,
    // Les glyphes de silence s'ancrent sur la ligne du milieu ; la pause pend
    // de la 4e ligne et la demi-pause s'assoit sur la 3e — le glyphe Unicode
    // porte déjà ce décalage.
    y: system.top + LG * 2 + LG * 0.5,
  });
  rest.setAttribute("font-size", Math.round(STAFF_H * 0.92));
  rest.textContent = figure.glyph;
  parent.appendChild(rest);
}
