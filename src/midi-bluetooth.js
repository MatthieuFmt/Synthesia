// ============================================================================
//  Clavier MIDI Bluetooth (BLE-MIDI) — Fondation F2
//
//  Le Web MIDI API d'Android ne voit **que** les appareils branchés en USB : un
//  clavier Bluetooth appairé dans les réglages du système n'apparaît pas dans
//  `requestMIDIAccess()`. Le seul chemin depuis une page web est le Web
//  Bluetooth (`navigator.bluetooth`), qui parle directement au service BLE-MIDI
//  du clavier.
//
//  Ce module ne fait que le transport : ouvrir la connexion, décoder les paquets
//  BLE en messages MIDI bruts, et se faire passer pour une entrée du Web MIDI
//  (un objet qui porte `onmidimessage`). Tout le reste — permission, appareil
//  actif, normalisation des notes, filtrage des rebonds — reste dans
//  `midi-input.js`, qui demeure le seul endroit qui *comprend* le MIDI.
//
//  Sans DOM, et `requestDevice` est injectable : le décodage se vérifie hors
//  navigateur.
// ============================================================================

// UUID du service et de la caractéristique définis par la spécification
// « MIDI over Bluetooth Low Energy » (MMA M1-2015-1). Ils sont universels : tout
// clavier BLE-MIDI les expose.
export const BLE_MIDI_SERVICE = "03b80e5a-ede8-4b33-a751-6ce34ec4c700";
export const BLE_MIDI_CHARACTERISTIC = "7772e5db-3868-4112-a1a9-f2669d106bf3";

// L'horodatage BLE-MIDI est un compteur de millisecondes sur 13 bits, coupé en
// deux : 6 bits de poids fort dans l'en-tête du paquet, 7 bits de poids faible
// devant chaque message. Quand les 7 bits faibles repassent à zéro pendant un
// paquet, c'est le champ de poids fort qui avance d'un cran — donc 128 ms de
// plus, pas un tour complet du compteur.
const TIMESTAMP_LOW_PERIOD = 128;

export function bluetoothSupported() {
  return typeof navigator !== "undefined" && Boolean(navigator.bluetooth);
}

function defaultRequestDevice() {
  // Filtrer sur le service MIDI : la spécification impose aux claviers de
  // l'annoncer, et un sélecteur qui montre toutes les enceintes du quartier
  // n'aide personne.
  return navigator.bluetooth.requestDevice({
    filters: [{ services: [BLE_MIDI_SERVICE] }],
    optionalServices: [BLE_MIDI_SERVICE],
  });
}

function defaultNow() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

// Combien d'octets de données suivent un octet de statut.
function dataBytesFor(status) {
  const kind = status & 0xf0;
  if (kind === 0xc0 || kind === 0xd0) return 1; // program change, aftertouch canal
  if (kind !== 0xf0) return 2; // note on/off, control change, pitch bend…
  if (status === 0xf1 || status === 0xf3) return 1;
  if (status === 0xf2) return 2;
  return 0; // temps réel et le reste
}

// ----------------------------------------------------------------------------
//  Décodage d'un paquet BLE-MIDI
//
//  Forme d'un paquet : un octet d'en-tête (`10hhhhhh`, 6 bits de poids fort de
//  l'horodatage), puis une suite de messages précédés chacun d'un octet
//  d'horodatage (`1lllllll`, 7 bits de poids faible). Le *running status* est
//  autorisé : un message peut arriver sans octet de statut, et alors sans octet
//  d'horodatage non plus — c'est le bit 7 qui tranche, comme partout en MIDI.
//
//  Rend des objets de la forme d'un `MIDIMessageEvent` : `{ data, timeStamp }`,
//  pour que `midi-input.js` les traite sans savoir d'où ils viennent.
//
//  L'horodatage rendu est ramené sur l'horloge de `performance.now()` :
//  l'instant d'arrivée du paquet, corrigé du retard *interne* au paquet. C'est
//  exact à l'intérieur d'un paquet ; le trajet radio lui-même (quelques
//  millisecondes, et sa gigue) reste, lui, invisible — voir plan/F2 § 16.
// ----------------------------------------------------------------------------
export function decodeBleMidi(bytes, arrivalMs = 0) {
  const messages = [];
  // Un paquet utile fait au minimum en-tête + horodatage + statut.
  if (!bytes || bytes.length < 3) return messages;

  const header = bytes[0];
  if ((header & 0x80) === 0) return messages; // pas un en-tête BLE-MIDI
  const high = (header & 0x3f) << 7;

  let index = 1;
  let runningStatus = 0;
  let stamp = null; // horodatage du message courant, en ms
  let lastLow = null;
  let wraps = 0;

  while (index < bytes.length) {
    if ((bytes[index] & 0x80) !== 0) {
      const low = bytes[index] & 0x7f;
      // Les horodatages d'un paquet sont croissants : un recul signale que les
      // 7 bits faibles ont fait un tour depuis l'en-tête.
      if (lastLow !== null && low < lastLow) wraps += 1;
      lastLow = low;
      stamp = high + low + wraps * TIMESTAMP_LOW_PERIOD;
      index += 1;
      if (index >= bytes.length) break;
    }

    let status;
    if ((bytes[index] & 0x80) !== 0) {
      status = bytes[index];
      index += 1;
    } else {
      status = runningStatus;
    }
    if (status === 0) break; // des données sans statut : paquet illisible
    // Un SysEx peut s'étaler sur plusieurs paquets et n'intéresse aucune
    // fonctionnalité : on abandonne le paquet plutôt que de mal le découper.
    if (status === 0xf0) break;

    const needed = dataBytesFor(status);
    if (index + needed > bytes.length) break; // paquet tronqué

    const data = new Uint8Array(1 + needed);
    data[0] = status;
    for (let offset = 0; offset < needed; offset += 1) data[1 + offset] = bytes[index + offset];
    index += needed;

    // Le running status ne survit ni à un message System Common, ni au début du
    // paquet suivant (chaque paquet repart de zéro).
    if (status < 0xf0) runningStatus = status;
    else if (status < 0xf8) runningStatus = 0;

    messages.push({ data, stamp });
  }

  if (messages.length === 0) return messages;

  // Le paquet arrive après son dernier message : on cale ce dernier sur
  // l'instant d'arrivée et on remonte le temps pour les précédents.
  const last = messages[messages.length - 1].stamp;
  return messages.map(({ data, stamp: when }) => ({
    data,
    timeStamp: when === null || last === null ? arrivalMs : arrivalMs - (last - when),
  }));
}

// ----------------------------------------------------------------------------
//  Connexion
//
//  Rend un objet qui ressemble à une entrée du Web MIDI : un `id`, un `name`, et
//  un `onmidimessage` qu'on affecte. `midi-input.js` ne fait aucune différence
//  entre les deux transports.
//
//  À appeler **directement** depuis un geste de l'utilisateur : le sélecteur
//  d'appareil du navigateur l'exige, et un `await` glissé avant ferait perdre le
//  geste.
// ----------------------------------------------------------------------------
export async function connectBluetoothMidi({
  requestDevice = defaultRequestDevice,
  now = defaultNow,
  onLost = null,
} = {}) {
  const device = await requestDevice();
  if (!device) throw new Error("aucun appareil choisi");

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(BLE_MIDI_SERVICE);
  const characteristic = await service.getCharacteristic(BLE_MIDI_CHARACTERISTIC);
  await characteristic.startNotifications();

  let closed = false;

  const port = {
    id: `bluetooth:${device.id}`,
    name: device.name || "Clavier Bluetooth",
    manufacturer: "Bluetooth",
    transport: "bluetooth",
    onmidimessage: null,
  };

  function handleValue(event) {
    if (closed || !port.onmidimessage) return;
    const view = event.target?.value;
    if (!view) return;
    const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    // `timeStamp` d'un évènement DOM est sur l'horloge de `performance.now()`,
    // comme celui d'un message Web MIDI : la suite de la chaîne ne voit pas la
    // différence.
    const arrival = Number.isFinite(event.timeStamp) ? event.timeStamp : now();
    for (const message of decodeBleMidi(bytes, arrival)) port.onmidimessage(message);
  }

  function handleLost() {
    if (closed) return;
    closed = true;
    if (onLost) onLost(port);
  }

  characteristic.addEventListener("characteristicvaluechanged", handleValue);
  device.addEventListener("gattserverdisconnected", handleLost);

  port.close = () => {
    if (closed) return;
    closed = true;
    characteristic.removeEventListener("characteristicvaluechanged", handleValue);
    device.removeEventListener("gattserverdisconnected", handleLost);
    // Une déconnexion propre ne doit pas empêcher la fermeture : la tablette
    // peut avoir coupé la liaison avant nous.
    try {
      characteristic.stopNotifications();
    } catch (failure) {
      /* liaison déjà tombée */
    }
    try {
      device.gatt?.disconnect();
    } catch (failure) {
      /* liaison déjà tombée */
    }
  };

  return port;
}
