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
//  Deux transports, une seule liste d'appareils : le Web MIDI (USB, et les
//  claviers du système sur ordinateur) et le Bluetooth (`midi-bluetooth.js`),
//  parce qu'Android ne montre **pas** les claviers BLE au Web MIDI. Un clavier
//  Bluetooth arrive ici sous la même forme qu'un clavier USB — un objet qui
//  porte `onmidimessage` — et rien en aval ne sait lequel est lequel.
//
//  À ne pas confondre avec l'import de fichiers `.mid` du mode Morceau : ce sont
//  deux entrées différentes vers la même représentation de note (F2 § 1).
// ============================================================================

import {
  bluetoothSupported,
  connectBluetoothMidi,
} from "./midi-bluetooth.js";

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

// Le Web MIDI comme le Web Bluetooth sont réservés aux contextes sécurisés :
// `https://` ou `localhost`. Servie en `http://` sur une adresse locale
// (`http://192.168.x.x:8000`, le cas d'une tablette qui lit le serveur d'un
// PC), la page ne voit **ni** `requestMIDIAccess` **ni** `bluetooth` — l'API a
// simplement disparu de `navigator`. C'est indiscernable d'un vieux navigateur
// si on ne le dit pas, d'où ce test.
function secureContext() {
  if (typeof window === "undefined") return true;
  return window.isSecureContext !== false;
}

function unsupportedMessage() {
  if (!secureContext()) {
    return (
      "Page servie en http:// : les navigateurs réservent le MIDI aux pages " +
      "https:// (ou à http://localhost). Ouvre l'application par son adresse " +
      "https pour utiliser un clavier."
    );
  }
  return "Ce navigateur ne gère pas le Web MIDI API (sur Android : Chrome oui, Firefox non).";
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
  connectBluetooth = connectBluetoothMidi,
  bluetoothAvailable = bluetoothSupported,
} = {}) {
  const noteListeners = new Set();
  const stateListeners = new Set();

  let access = null;
  let status = null;      // calculé au premier appel de `state()`
  let error = null;       // message lisible d'un échec, jamais un objet brut
  let devices = [];       // [{ id, name, manufacturer, transport }]
  let activeDeviceId = null;
  let attachedDevice = null; // l'entrée MIDI qui porte notre écouteur
  let enabled = false;
  let disposed = false;

  // Claviers Bluetooth ouverts par nos soins. Le Web MIDI ne les connaît pas :
  // c'est nous qui tenons la liste.
  let bluetoothPorts = [];
  let bluetoothConnecting = false;
  let bluetoothError = null;

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
    const active = devices.find((device) => device.id === activeDeviceId) ?? null;
    return {
      status: currentStatus(),
      supported: currentStatus() !== MIDI_STATUS.unsupported,
      enabled,
      error,
      devices: devices.map((device) => ({ ...device })),
      activeDeviceId,
      activeDeviceName: active?.name ?? null,
      activeTransport: active?.transport ?? null,
      // Vrai seulement si tout est réuni : un appareil effectivement branché à
      // notre écouteur, et l'entrée activée. Un clavier Bluetooth suffit, même
      // sans Web MIDI dans le navigateur.
      listening: enabled && attachedDevice !== null,
      heldNotes: [...held],
      bluetooth: {
        supported: bluetoothAvailable(),
        connecting: bluetoothConnecting,
        connected: bluetoothPorts.length > 0,
        error: bluetoothError,
      },
      // De quoi expliquer une absence de support sans ouvrir la console — il n'y
      // en a pas sur une tablette.
      environment: {
        secure: secureContext(),
        webMidi: supported(),
        webBluetooth: bluetoothAvailable(),
      },
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
    const found = [];
    if (access?.inputs) {
      // `inputs` est une Map ; certains navigateurs n'exposent que `forEach`.
      access.inputs.forEach((input) => {
        found.push({
          id: input.id,
          name: input.name || "Clavier MIDI",
          manufacturer: input.manufacturer || "",
          transport: "system",
        });
      });
    }
    for (const port of bluetoothPorts) {
      found.push({
        id: port.id,
        name: port.name,
        manufacturer: port.manufacturer,
        transport: "bluetooth",
      });
    }
    return found;
  }

  function inputById(id) {
    if (id === null) return null;
    const port = bluetoothPorts.find((candidate) => candidate.id === id);
    if (port) return port;
    if (!access?.inputs) return null;
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

  // Ce que font en commun l'activation du Web MIDI et la connexion d'un clavier
  // Bluetooth : relire la liste, garder un appareil actif valable, écouter.
  function beginListening() {
    enabled = true;
    devices = listDevices();
    if (!devices.some((device) => device.id === activeDeviceId)) {
      activeDeviceId = devices[0]?.id ?? null;
    }
    attach();
  }

  // --------------------------------------------------------------------------
  //  Bluetooth
  //
  //  Un clavier BLE se perd tout seul : hors de portée, batterie vide, veille de
  //  la tablette. Ce n'est pas une erreur de l'application, seulement un
  //  appareil de moins — exactement comme un câble USB débranché.
  // --------------------------------------------------------------------------
  function forgetBluetooth(port) {
    const before = bluetoothPorts.length;
    bluetoothPorts = bluetoothPorts.filter((candidate) => candidate !== port);
    if (bluetoothPorts.length === before) return;
    port.onmidimessage = null;
    if (attachedDevice === port) detach();
    refreshDevices();
  }

  function handleBluetoothLost(port) {
    if (disposed) return;
    releaseHeld(); // il tenait peut-être des notes en partant
    bluetoothError = `${port.name} s'est déconnecté.`;
    forgetBluetooth(port);
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
        error = unsupportedMessage();
        // Un clavier Bluetooth déjà connecté n'a que faire du Web MIDI : il ne
        // passe pas par lui. Sans support, « Activer » doit quand même l'écouter.
        if (bluetoothPorts.length > 0) beginListening();
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

      beginListening();
      notifyState();
      return state();
    },

    // Ouvre le sélecteur d'appareils Bluetooth du navigateur, puis écoute le
    // clavier choisi. À appeler **depuis un geste de l'utilisateur** : le
    // sélecteur l'exige, et un `await` glissé avant le ferait perdre.
    async connectBluetooth() {
      if (disposed) return state();

      if (!bluetoothAvailable()) {
        bluetoothError = secureContext()
          ? "Ce navigateur ne gère pas le Bluetooth web (sur Android : Chrome, pas Firefox)."
          : "Page servie en http:// : le Bluetooth web exige https:// (ou http://localhost).";
        notifyState();
        return state();
      }

      bluetoothConnecting = true;
      bluetoothError = null;
      notifyState(); // synchrone : le geste de l'utilisateur est encore valide

      let port = null;
      try {
        port = await connectBluetooth({ now, onLost: handleBluetoothLost });
      } catch (failure) {
        const name = failure?.name ?? "";
        bluetoothConnecting = false;
        bluetoothError =
          name === "NotFoundError"
            ? "Aucun clavier Bluetooth choisi. Vérifie qu'il est allumé et en mode " +
              "appairage ; sur Android, la localisation doit être activée pour que " +
              "le navigateur puisse chercher."
            : `Connexion Bluetooth impossible (${failure?.message ?? "raison inconnue"}).`;
        notifyState();
        return state();
      }

      bluetoothConnecting = false;
      if (disposed) {
        port.close();
        return state();
      }

      // Reconnecter le même clavier remplace l'ancienne liaison au lieu de le
      // faire apparaître deux fois dans la liste.
      const previous = bluetoothPorts.find((candidate) => candidate.id === port.id);
      if (previous) {
        previous.onmidimessage = null;
        if (attachedDevice === previous) detach();
        previous.close();
        bluetoothPorts = bluetoothPorts.filter((candidate) => candidate !== previous);
      }

      bluetoothPorts.push(port);
      // Celui qu'on vient de choisir devient l'appareil écouté : c'est le geste
      // que l'utilisateur vient de faire.
      activeDeviceId = port.id;
      beginListening();
      notifyState();
      return state();
    },

    // Referme un clavier Bluetooth (tous, si aucun identifiant n'est donné).
    disconnectBluetooth(id = null) {
      const targets = id === null ? [...bluetoothPorts] : bluetoothPorts.filter((p) => p.id === id);
      if (targets.length === 0) return state();
      releaseHeld();
      bluetoothError = null;
      for (const port of targets) {
        port.close();
        forgetBluetooth(port);
      }
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
      for (const port of bluetoothPorts) port.close();
      bluetoothPorts = [];
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
