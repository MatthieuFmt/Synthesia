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
  // Le Bluetooth passe devant : c'est le seul état où l'utilisateur attend une
  // réponse d'une manipulation qu'il vient de faire.
  if (state.bluetooth.connecting) return "Recherche d'un clavier Bluetooth…";
  if (state.listening) {
    const via = state.activeTransport === "bluetooth" ? " (Bluetooth)" : "";
    return `Connecté : ${state.activeDeviceName}${via}`;
  }
  if (state.bluetooth.error) return state.bluetooth.error;
  // Un clavier Bluetooth reste connecté même quand le Web MIDI manque : c'est
  // l'état des appareils qui compte, pas celui de la permission.
  if (state.devices.length > 0 && !state.enabled) return "Clavier MIDI en veille.";

  switch (state.status) {
    case MIDI_STATUS.unsupported:
      return state.environment.secure
        ? "Ce navigateur ne gère pas les claviers MIDI branchés."
        : "Page en http:// : le navigateur y interdit le MIDI.";
    case MIDI_STATUS.requesting:
      return "Autorisation en cours…";
    case MIDI_STATUS.denied:
    case MIDI_STATUS.error:
      return state.error ?? "Le clavier MIDI n'a pas pu être ouvert.";
    case MIDI_STATUS.ready:
      if (state.devices.length === 0) {
        return "Aucun clavier détecté. Branche le câble USB puis rafraîchis, ou connecte-le en Bluetooth.";
      }
      if (!state.enabled) return "Clavier MIDI en veille.";
      return `Connecté : ${state.activeDeviceName}`;
    default:
      return "Clavier MIDI non activé.";
  }
}

// Pourquoi ça ne marche pas, quand ça ne marche pas. Une tablette n'a pas de
// console : si la raison n'est pas écrite ici, elle n'est écrite nulle part.
function diagnosticText(state) {
  if (state.listening || state.bluetooth.connecting) return "";
  const lines = [];

  if (!state.environment.secure) {
    lines.push(
      "Cette page est servie en http:// : les navigateurs y masquent le MIDI " +
        "comme le Bluetooth. Ouvre-la en https:// (ou en http://localhost sur " +
        "la machine elle-même)."
    );
  } else if (!state.environment.webMidi) {
    lines.push(
      "Le Web MIDI est absent de ce navigateur : sur Android il faut Chrome " +
        "ou Samsung Internet, Firefox ne le gère pas."
    );
  } else if (state.status === MIDI_STATUS.ready && state.devices.length === 0) {
    lines.push(
      "Câble USB : la tablette doit gérer l'USB OTG, l'adaptateur être branché " +
        "côté tablette, et le clavier allumé — allume-le avant de brancher, puis " +
        "« Rafraîchir »."
    );
  }

  if (state.environment.secure && !state.environment.webBluetooth) {
    lines.push("Le Bluetooth web n'est pas disponible dans ce navigateur.");
  }

  return lines.join(" ");
}

// Pastille de couleur : vert quand ça écoute, orange quand il reste un geste à
// faire, rouge sur un refus, gris quand il n'y a rien à faire.
//
// Le fait d'écouter passe avant tout le reste : un clavier Bluetooth branché sur
// un navigateur sans Web MIDI marche parfaitement, et le statut reste pourtant
// `unsupported`. C'est le cas d'Android, donc le cas courant ici.
function statusTone(state) {
  if (state.listening) return "on";
  if (state.status === MIDI_STATUS.denied || state.status === MIDI_STATUS.error) return "error";
  // Sans Web MIDI *ni* Bluetooth, il n'y a rien à tenter : gris, pas orange.
  if (
    state.status === MIDI_STATUS.unsupported &&
    !state.bluetooth.supported &&
    !state.bluetooth.connected
  ) {
    return "off";
  }
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

  // Android ne montre pas les claviers Bluetooth au Web MIDI : ce bouton ouvre
  // le sélecteur du navigateur, qui parle directement au clavier (F2 § 16).
  // Appel direct dans l'écouteur, sans `await` avant : le sélecteur exige un
  // geste de l'utilisateur.
  const bluetooth = el("button", "btn midi-btn", "Bluetooth");
  bluetooth.type = "button";
  bluetooth.addEventListener(
    "click",
    () => {
      if (midiInput.state().bluetooth.connected) midiInput.disconnectBluetooth();
      else midiInput.connectBluetooth();
    },
    { signal }
  );

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

  controls.append(toggle, select, refresh, bluetooth);

  const monitor = el("p", "midi-monitor", "");
  monitor.setAttribute("aria-live", "polite");

  const diagnostic = el("p", "midi-diagnostic", "");

  const hint = el(
    "p",
    "midi-hint",
    "Facultatif : toutes les fonctionnalités restent jouables à la souris et au toucher."
  );

  root.append(header, controls, monitor, diagnostic, hint);

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
    // Sans Web MIDI, activer n'a de sens que s'il reste un clavier Bluetooth à
    // écouter.
    toggle.disabled =
      state.status === MIDI_STATUS.requesting ||
      (state.status === MIDI_STATUS.unsupported && !state.bluetooth.connected);
    refresh.hidden = state.status !== MIDI_STATUS.ready;

    bluetooth.hidden = !state.bluetooth.supported && !state.bluetooth.connected;
    bluetooth.disabled = state.bluetooth.connecting;
    bluetooth.textContent = state.bluetooth.connected ? "Bluetooth ✕" : "Bluetooth";
    bluetooth.title = state.bluetooth.connected
      ? "Déconnecter le clavier Bluetooth"
      : "Connecter un clavier Bluetooth";

    const details = diagnosticText(state);
    diagnostic.textContent = details;
    diagnostic.hidden = details === "";

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
