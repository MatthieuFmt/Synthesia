// ============================================================================
//  Panneau de connexion MIDI — Fondation F2, étape B
//
//  L'interface de `midi-input.js` : où en est le clavier physique, lequel écouter,
//  et un affichage des notes reçues qui permet de vérifier que la chaîne marche
//  avant qu'une fonctionnalité s'en serve (plan/F2-entree-midi.md § 14).
//
//  Un seul panneau à la fois, sur l'écran d'accueil : c'est là qu'on branche son
//  clavier avant de choisir un exercice, et l'accueil n'appartient à aucune
//  fonctionnalité. L'état, lui, survit au changement de mode — une permission
//  accordée et un appareil choisi n'ont aucune raison d'être redemandés
//  (cf. l'instance partagée de `midi-input.js`).
// ============================================================================

import { midiInput } from "./midi-input.js";
import { MIDI_STATUS } from "./midi-input.js";
import { noteDegreeName, octaveOf } from "./music.js";

// Combien de notes reçues rester affichées. Assez pour voir un accord, pas assez
// pour transformer le panneau en journal.
const RECENT_NOTES = 8;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Ce que l'utilisateur lit, pour chaque état. Un refus ou une absence de support
// doit être dit clairement, jamais échouer en silence (plan/F2 § 7).
function statusText(state) {
  switch (state.status) {
    case MIDI_STATUS.unsupported:
      return "Ce navigateur ne gère pas les claviers MIDI.";
    case MIDI_STATUS.requesting:
      return "Autorisation en cours…";
    case MIDI_STATUS.denied:
    case MIDI_STATUS.error:
      return state.error ?? "Le clavier MIDI n'a pas pu être ouvert.";
    case MIDI_STATUS.ready:
      if (state.devices.length === 0) return "Aucun clavier détecté. Branche-le puis rafraîchis.";
      if (!state.enabled) return "Clavier MIDI en veille.";
      return `Connecté : ${state.activeDeviceName}`;
    default:
      return "Clavier MIDI non activé.";
  }
}

// Pastille de couleur : vert quand ça écoute, orange quand il reste un geste à
// faire, rouge sur un refus, gris quand il n'y a rien à faire.
function statusTone(state) {
  if (state.status === MIDI_STATUS.unsupported) return "off";
  if (state.status === MIDI_STATUS.denied || state.status === MIDI_STATUS.error) return "error";
  if (state.listening) return "on";
  return "pending";
}

export function createMidiPanel({ signal }) {
  const root = el("section", "midi");
  root.setAttribute("aria-label", "Clavier MIDI");

  const header = el("div", "midi-header");
  const dot = el("span", "midi-dot");
  const label = el("span", "midi-status");
  label.setAttribute("aria-live", "polite");
  header.append(dot, label);

  const controls = el("div", "midi-controls");

  const toggle = el("button", "btn midi-btn", "Activer");
  toggle.type = "button";
  toggle.addEventListener(
    "click",
    () => {
      const state = midiInput.state();
      if (state.enabled) midiInput.disable();
      else midiInput.enable();
    },
    { signal }
  );

  const refresh = el("button", "btn midi-btn", "Rafraîchir");
  refresh.type = "button";
  refresh.title = "Relire la liste des claviers branchés";
  refresh.addEventListener("click", () => midiInput.refresh(), { signal });

  // Liste déroulante plutôt qu'un mini-clavier (décision ouverte de F2 § 13) :
  // un `<select>` natif est la cible tactile la plus sûre, et le nom de
  // l'appareil est la seule information dont on dispose pour le distinguer.
  const select = el("select", "midi-device");
  select.setAttribute("aria-label", "Clavier MIDI à écouter");
  select.addEventListener(
    "change",
    () => midiInput.selectDevice(select.value || null),
    { signal }
  );

  controls.append(toggle, select, refresh);

  const monitor = el("p", "midi-monitor", "");
  monitor.setAttribute("aria-live", "polite");

  const hint = el(
    "p",
    "midi-hint",
    "Facultatif : toutes les fonctionnalités restent jouables à la souris et au toucher."
  );

  root.append(header, controls, monitor, hint);

  // --- Notes reçues ---------------------------------------------------------
  const recent = [];

  function renderMonitor(event) {
    if (event) {
      if (event.type === "noteon") {
        recent.push(event);
        if (recent.length > RECENT_NOTES) recent.shift();
      }
    }
    if (recent.length === 0) {
      monitor.textContent = midiInput.state().listening
        ? "Joue une touche pour vérifier."
        : "";
      return;
    }
    const last = recent[recent.length - 1];
    const names = recent.map((note) => `${noteDegreeName(note.midi)}${octaveOf(note.midi)}`);
    monitor.textContent = `${names.join(" · ")} — dernière à ${Math.round(
      last.velocity * 100
    )} % de vélocité`;
  }

  // --- État ------------------------------------------------------------------
  function render(state) {
    label.textContent = statusText(state);
    dot.dataset.tone = statusTone(state);

    toggle.textContent = state.enabled ? "Désactiver" : "Activer";
    toggle.disabled =
      state.status === MIDI_STATUS.unsupported || state.status === MIDI_STATUS.requesting;
    refresh.hidden = state.status !== MIDI_STATUS.ready;

    // Le choix n'apparaît que s'il y a réellement un choix à faire.
    const several = state.devices.length > 1;
    select.hidden = !several;
    if (several) {
      const wanted = state.devices.map((device) => device.id).join("|");
      if (select.dataset.devices !== wanted) {
        select.dataset.devices = wanted;
        select.replaceChildren(
          ...state.devices.map((device) => {
            const option = document.createElement("option");
            option.value = device.id;
            option.textContent = device.name;
            return option;
          })
        );
      }
      select.value = state.activeDeviceId ?? "";
    }

    if (!state.listening) {
      recent.length = 0;
    }
    renderMonitor(null);
  }

  const stopState = midiInput.onStateChange(render);
  const stopNotes = midiInput.onNote(renderMonitor);
  render(midiInput.state());

  return {
    element: root,
    // L'accueil est reconstruit à chaque retour : le panneau doit se retirer de
    // la liste des abonnés, sinon chaque visite en ajouterait un.
    dispose() {
      stopState();
      stopNotes();
    },
  };
}
