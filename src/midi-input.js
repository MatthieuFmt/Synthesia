// ============================================================================
//  Entrée clavier MIDI — Fondation F2
//
//  Détecte le Web MIDI API, gère la permission et l'appareil actif, et
//  transforme les messages bruts en évènements normalisés
//  (plan/F2-entree-midi.md § 8). Aucune fonctionnalité ne doit toucher
//  `navigator.requestMIDIAccess` ni un octet de statut : elles s'abonnent, c'est
//  tout.
//
//  Rien ici ne dépend du DOM ni du Canvas — le panneau de connexion est dans
//  `midi-controls.js`. `requestAccess` et l'horloge sont injectables, ce qui
//  permet de vérifier hors navigateur l'absence de support, un refus de
//  permission, le branchement à chaud et la normalisation des messages.
//
//  À ne pas confondre avec l'import de fichiers `.mid` du mode Morceau : ce sont
//  deux entrées différentes vers la même représentation de note (F2 § 1).
// ============================================================================

// Les six états possibles. `ready` ne veut pas dire qu'un appareil est branché :
// la permission peut être accordée sans qu'aucun clavier ne soit présent.
export const MIDI_STATUS = {
  unsupported: "unsupported", // le navigateur n'a pas le Web MIDI API
  idle: "idle",               // supporté, permission pas encore demandée
  requesting: "requesting",   // permission en cours
  denied: "denied",           // permission refusée par l'utilisateur
  error: "error",             // échec autre (API cassée, contexte non sécurisé…)
  ready: "ready",             // accès accordé
};

export const MIDI_SOURCE = "physical-midi";

// Vélocité par défaut quand un appareil n'en envoie pas d'utilisable.
const DEFAULT_VELOCITY = 0.8;

// Messages de note : 0x90 = note on, 0x80 = note off, sur 16 canaux.
const NOTE_ON = 0x90;
const NOTE_OFF = 0x80;

// Le CC 64 (pédale de sustain) a été écouté ici tant qu'ont existé les
// Exercices de pédale (plan/09) ; il est retiré avec eux le 07/08/2026, faute
// d'abonné. Le point d'entrée reste le même le jour où il faudra le remettre :
// un `command === 0xb0` dans `handleMessage`, seuil à mi-course.

function defaultRequestAccess() {
  if (typeof navigator === "undefined" || !navigator.requestMIDIAccess) return null;
  // `sysex: false` : on ne lit que des notes, demander plus élargirait la
  // permission pour rien.
  return navigator.requestMIDIAccess({ sysex: false });
}

function defaultNow() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

// ----------------------------------------------------------------------------
//  Fabrique
//
//  Une seule instance partagée est exposée plus bas : l'accès MIDI est une
//  ressource unique du navigateur, la demander deux fois n'aurait pas de sens.
//  La fabrique existe pour les vérifications.
// ----------------------------------------------------------------------------
export function createMidiInput({
  requestAccess = defaultRequestAccess,
  now = defaultNow,
} = {}) {
  const noteListeners = new Set();
  const stateListeners = new Set();

  let access = null;
  let status = null;      // calculé au premier appel de `state()`
  let error = null;       // message lisible d'un échec, jamais un objet brut
  let devices = [];       // [{ id, name, manufacturer }]
  let activeDeviceId = null;
  let attachedDevice = null; // l'entrée MIDI qui porte notre écouteur
  let enabled = false;
  let disposed = false;

  // Notes actuellement tenues, par hauteur. Sert à filtrer les rebonds de touche
  // et à ne jamais laisser une note « collée » derrière soi.
  const held = new Set();

  function supported() {
    return typeof navigator !== "undefined" && Boolean(navigator.requestMIDIAccess);
  }

  function initialStatus() {
    return supported() ? MIDI_STATUS.idle : MIDI_STATUS.unsupported;
  }

  function currentStatus() {
    if (status === null) status = initialStatus();
    return status;
  }

  function state() {
    return {
      status: currentStatus(),
      supported: currentStatus() !== MIDI_STATUS.unsupported,
      enabled,
      error,
      devices: devices.map((device) => ({ ...device })),
      activeDeviceId,
      activeDeviceName: devices.find((d) => d.id === activeDeviceId)?.name ?? null,
      // Vrai seulement si tout est réuni : permission, appareil, activation.
      listening: enabled && activeDeviceId !== null && currentStatus() === MIDI_STATUS.ready,
      heldNotes: [...held],
    };
  }

  function notifyState() {
    const snapshot = state();
    for (const listener of stateListeners) {
      try {
        listener(snapshot);
      } catch (failure) {
        console.error("Écouteur d'état MIDI en échec.", failure);
      }
    }
  }

  function emitNote(event) {
    for (const listener of noteListeners) {
      try {
        listener(event);
      } catch (failure) {
        // Un abonné qui échoue ne doit pas empêcher les autres de recevoir la
        // note, ni casser la réception des suivantes.
        console.error("Écouteur de note MIDI en échec.", failure);
      }
    }
  }

  // --------------------------------------------------------------------------
  //  Normalisation d'un message
  //
  //  Un `noteon` de vélocité 0 est un `noteoff` : c'est la convention qu'emploie
  //  une bonne partie des claviers, et l'ignorer laisse des notes tenues à vie.
  // --------------------------------------------------------------------------
  function handleMessage(message) {
    if (disposed || !enabled) return;

    const data = message?.data;
    // Un message de note fait trois octets. Le Web MIDI les livre toujours, mais
    // tolérer un message à deux octets coûte une ligne et vaut mieux que perdre
    // silencieusement une note : la vélocité prend alors sa valeur par défaut
    // (plan/F2 § 8, « sinon valeur par défaut »).
    if (!data || data.length < 2) return;

    const command = data[0] & 0xf0;
    const midi = data[1];
    const rawVelocity = data.length >= 3 ? data[2] : null;
    if (!Number.isFinite(midi) || midi < 0 || midi > 127) return;

    let type;
    if (command === NOTE_ON) {
      // Une attaque de vélocité 0 est un relâchement : c'est la convention
      // d'une bonne partie des claviers, et l'ignorer laisserait des notes
      // tenues à vie. Sans octet de vélocité, on ne peut pas le savoir : c'est
      // une attaque.
      type = rawVelocity === null || rawVelocity > 0 ? "noteon" : "noteoff";
    } else if (command === NOTE_OFF) {
      type = "noteoff";
    } else {
      return; // tout le reste est ignoré
    }

    // Filtrage minimal du bruit : pas de nouvelle attaque sur une note déjà
    // tenue, pas de relâchement d'une note qui ne l'était pas. Cela suffit à
    // absorber les rebonds de touche sans inventer de seuil temporel.
    if (type === "noteon") {
      if (held.has(midi)) return;
      held.add(midi);
    } else {
      if (!held.has(midi)) return;
      held.delete(midi);
    }

    emitNote({
      type,
      midi,
      velocity: type === "noteon" ? velocityOf(rawVelocity) : 0,
      // `timeStamp` d'un message MIDI est sur la même horloge que
      // `performance.now()` : on le garde, il est plus juste que l'instant où ce
      // code s'exécute.
      timestamp: Number.isFinite(message.timeStamp) ? message.timeStamp : now(),
      source: MIDI_SOURCE,
    });
  }

  // Vélocité ramenée sur 0..1. Un appareil qui n'en envoie pas reçoit la valeur
  // par défaut : aucune fonctionnalité n'est encore tenue de s'en servir
  // (plan/F2 § 4).
  function velocityOf(raw) {
    if (raw === null || !Number.isFinite(raw) || raw <= 0) return DEFAULT_VELOCITY;
    return Math.min(1, raw / 127);
  }

  // Relâche les notes tenues : sans ça, une fonctionnalité qui attend la fin
  // d'une note resterait suspendue après un débranchement ou une désactivation.
  function releaseHeld() {
    if (held.size === 0) return;
    const stuck = [...held];
    held.clear();
    for (const midi of stuck) {
      emitNote({
        type: "noteoff",
        midi,
        velocity: 0,
        timestamp: now(),
        source: MIDI_SOURCE,
      });
    }
  }

  // --------------------------------------------------------------------------
  //  Appareils
  // --------------------------------------------------------------------------
  function listDevices() {
    if (!access?.inputs) return [];
    const found = [];
    // `inputs` est une Map ; certains navigateurs n'exposent que `forEach`.
    access.inputs.forEach((input) => {
      found.push({
        id: input.id,
        name: input.name || "Clavier MIDI",
        manufacturer: input.manufacturer || "",
      });
    });
    return found;
  }

  function inputById(id) {
    if (!access?.inputs || id === null) return null;
    let match = null;
    access.inputs.forEach((input) => {
      if (input.id === id) match = input;
    });
    return match;
  }

  function detach() {
    if (attachedDevice) {
      attachedDevice.onmidimessage = null;
      attachedDevice = null;
    }
  }

  function attach() {
    detach();
    if (!enabled) return;
    const input = inputById(activeDeviceId);
    if (!input) return;
    input.onmidimessage = handleMessage;
    attachedDevice = input;
  }

  // Recalcule la liste et, si l'appareil actif a disparu, retombe sur le
  // premier disponible. Débrancher son clavier ne doit rien casser : au pire on
  // revient à la pratique sans MIDI (F2 § 7).
  function refreshDevices() {
    if (disposed) return;
    devices = listDevices();

    const stillThere = devices.some((device) => device.id === activeDeviceId);
    if (!stillThere) {
      releaseHeld(); // l'appareil qui tenait ces notes n'est plus là
      activeDeviceId = devices[0]?.id ?? null;
      attach();
    } else if (enabled && !attachedDevice) {
      attach();
    }

    notifyState();
  }

  // --------------------------------------------------------------------------
  //  API publique
  // --------------------------------------------------------------------------
  return {
    state,

    onNote(listener) {
      noteListeners.add(listener);
      return () => noteListeners.delete(listener);
    },
    offNote(listener) {
      noteListeners.delete(listener);
    },

    onStateChange(listener) {
      stateListeners.add(listener);
      return () => stateListeners.delete(listener);
    },
    offStateChange(listener) {
      stateListeners.delete(listener);
    },

    // Demande la permission si nécessaire, puis active l'écoute. Un refus est
    // renvoyé comme un état, jamais comme une exception : l'appelant n'a pas à
    // gérer un `try` pour une réponse prévisible (F2 § 7).
    async enable() {
      if (disposed) return state();

      if (!supported()) {
        status = MIDI_STATUS.unsupported;
        error = "Ce navigateur ne gère pas le Web MIDI API.";
        notifyState();
        return state();
      }

      if (!access) {
        status = MIDI_STATUS.requesting;
        error = null;
        notifyState();
        try {
          access = await requestAccess();
          if (disposed) return state();
          if (!access) throw new Error("accès MIDI indisponible");
          status = MIDI_STATUS.ready;
          error = null;
          // Branchement et débranchement en cours de session.
          access.onstatechange = refreshDevices;
        } catch (failure) {
          access = null;
          const name = failure?.name ?? "";
          status =
            name === "SecurityError" || name === "NotAllowedError"
              ? MIDI_STATUS.denied
              : MIDI_STATUS.error;
          error =
            status === MIDI_STATUS.denied
              ? "Accès au clavier MIDI refusé. Autorise-le dans les réglages du navigateur pour l'utiliser."
              : `Le clavier MIDI n'a pas pu être ouvert (${failure?.message ?? "raison inconnue"}).`;
          notifyState();
          return state();
        }
      }

      enabled = true;
      devices = listDevices();
      if (!devices.some((device) => device.id === activeDeviceId)) {
        activeDeviceId = devices[0]?.id ?? null;
      }
      attach();
      notifyState();
      return state();
    },

    // Retour volontaire au clic/toucher (F2 § 6). L'accès reste ouvert : on ne
     // redemande pas la permission pour réactiver.
    disable() {
      if (!enabled) return state();
      enabled = false;
      detach();
      releaseHeld();
      notifyState();
      return state();
    },

    selectDevice(id) {
      if (id === activeDeviceId) return state();
      if (id !== null && !devices.some((device) => device.id === id)) return state();
      releaseHeld(); // on ne garde pas les notes tenues d'un autre clavier
      activeDeviceId = id;
      attach();
      notifyState();
      return state();
    },

    // Rejoue la détection des appareils : utile après un branchement que le
    // navigateur n'aurait pas signalé.
    refresh() {
      refreshDevices();
      return state();
    },

    dispose() {
      disposed = true;
      detach();
      held.clear();
      if (access) access.onstatechange = null;
      access = null;
      enabled = false;
      noteListeners.clear();
      stateListeners.clear();
    },
  };
}

// ----------------------------------------------------------------------------
//  Instance partagée
//
//  C'est elle que les fonctionnalités utilisent. Elle survit aux changements de
//  mode — contrairement à l'audio, une permission MIDI et un appareil choisi
//  n'ont aucune raison d'être redemandés à chaque `start()`.
// ----------------------------------------------------------------------------
export const midiInput = createMidiInput();

// Noms de l'API d'abonnement décrite dans plan/F2 § 8.
export function onMidiNote(listener) {
  return midiInput.onNote(listener);
}

export function offMidiNote(listener) {
  midiInput.offNote(listener);
}

export function midiState() {
  return midiInput.state();
}
