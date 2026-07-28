#!/usr/bin/env node
// ---- Générateur d'exercice MIDI ----
// Écrit un Standard MIDI File (format 1) octet par octet : en-tête MThd, puis
// une piste MTrk par voix, delta-times en varint. Aucune dépendance.
//
//   node tools/generer-exercice.js [fichier de sortie]
//
// Contenu produit : « Déliage des doigts nº 1 », do majeur, trois sections.
//   A (8 mes.) — motif de doubles-croches 1-3-2-4-3-5-4-3, mains à l'octave,
//                montée puis descente : changements de direction dans la main.
//   B (8 mes.) — indépendance : un doigt tient une note toute la mesure
//                pendant que les autres jouent en croches (pouce, puis 5).
//   C (8 mes.) — le motif de A en mouvement contraire, pouces sur do central.

const fs = require("fs");
const path = require("path");

// ---- Réglages ----

const TPQ = 480;                 // ticks par noire
const TEMPO_BPM = 80;            // doubles-croches à 80 = 5,3 notes/seconde
const DOUBLE = TPQ / 4;          // 120
const CROCHE = TPQ / 2;          // 240
const MESURE = TPQ * 4;          // 4/4

const VEL_APPUI = 88;            // note sur le temps
const VEL_COURANTE = 72;         // notes intermédiaires
const VEL_TENUE = 78;            // note tenue de la section B

const CANAL_DROITE = 0;
const CANAL_GAUCHE = 1;

// ---- Hauteurs : degrés de la gamme de do majeur, 0 = do central ----

const GAMME = [0, 2, 4, 5, 7, 9, 11];

function hauteur(degre) {
  const octave = Math.floor(degre / 7);
  const rang = ((degre % 7) + 7) % 7;
  return 60 + 12 * octave + GAMME[rang];
}

// ---- Matière musicale ----

// Doigté 1-3-2-4-3-5-4-3 : chaque doigt part et revient, les paires 2-4 et
// 3-5 sont sollicitées à chaque groupe. C'est ce qui fait le déliage.
const MOTIF_MONTANT = [0, 2, 1, 3, 2, 4, 3, 2];
const MOTIF_DESCENDANT = MOTIF_MONTANT.map((d) => -d);

// La course complète de la section A : huit groupes qui montent degré par
// degré (do4 → do5), puis huit qui redescendent (sol5 → do4).
function courseAllerRetour() {
  const degres = [];
  for (let depart = 0; depart <= 7; depart++) {
    for (const ecart of MOTIF_MONTANT) degres.push(depart + ecart);
  }
  for (let depart = 11; depart >= 4; depart--) {
    for (const ecart of MOTIF_DESCENDANT) degres.push(depart + ecart);
  }
  return degres; // 128 doubles-croches = 8 mesures
}

function composer() {
  const notes = []; // { tick, duree, hauteur, velocite, main }
  let t = 0;

  const poser = (tick, duree, degre, velocite, main) => {
    notes.push({ tick, duree, hauteur: hauteur(degre), velocite, main });
  };

  // ---- Section A : motif à l'octave, mains parallèles ----
  courseAllerRetour().forEach((degre, i) => {
    const velocite = i % 4 === 0 ? VEL_APPUI : VEL_COURANTE;
    const tick = t + i * DOUBLE;
    poser(tick, DOUBLE - 15, degre, velocite, "droite");
    poser(tick, DOUBLE - 15, degre - 7, velocite, "gauche");
  });
  t += 128 * DOUBLE;

  // ---- Section B : indépendance, une note tenue par mesure ----
  // Position de cinq doigts glissée de degré en degré. Mesure paire : le
  // pouce tient pendant que 3-4-5 travaillent. Mesure impaire : le 5 tient
  // pendant que 1-2-3 travaillent.
  for (const position of [0, 1, 2, 3]) {
    const paires = [
      { tenue: position, mobiles: [2, 3, 4, 3] },
      { tenue: position + 4, mobiles: [0, 1, 2, 1] },
    ];
    for (const { tenue, mobiles } of paires) {
      poser(t, MESURE - 60, tenue, VEL_TENUE, "droite");
      poser(t, MESURE - 60, tenue - 7, VEL_TENUE, "gauche");
      for (let i = 0; i < 8; i++) {
        const degre = position + mobiles[i % 4];
        const velocite = i % 2 === 0 ? VEL_APPUI : VEL_COURANTE;
        const tick = t + i * CROCHE;
        poser(tick, CROCHE - 25, degre, velocite, "droite");
        poser(tick, CROCHE - 25, degre - 7, velocite, "gauche");
      }
      t += MESURE;
    }
  }

  // ---- Section C : mouvement contraire, les deux pouces sur do central ----
  courseAllerRetour().forEach((degre, i) => {
    const velocite = i % 4 === 0 ? VEL_APPUI : VEL_COURANTE;
    const tick = t + i * DOUBLE;
    poser(tick, DOUBLE - 15, degre, velocite, "droite");
    poser(tick, DOUBLE - 15, -degre, velocite, "gauche");
  });
  t += 128 * DOUBLE;

  // ---- Accord final ----
  for (const degre of [0, 2, 4]) poser(t, MESURE - 40, degre, VEL_APPUI, "droite");
  for (const degre of [-7, -3]) poser(t, MESURE - 40, degre, VEL_APPUI, "gauche");
  t += MESURE;

  return { notes, duree: t };
}

// ---- Écriture du Standard MIDI File ----

function varint(valeur) {
  const octets = [valeur & 0x7f];
  let reste = valeur >>> 7;
  while (reste > 0) {
    octets.unshift((reste & 0x7f) | 0x80);
    reste >>>= 7;
  }
  return Buffer.from(octets);
}

function metaTexte(type, texte) {
  const contenu = Buffer.from(texte, "latin1");
  return Buffer.concat([Buffer.from([0xff, type]), varint(contenu.length), contenu]);
}

function piste(evenements) {
  // evenements : { tick, ordre, octets }. Tri stable par instant, note-off
  // avant note-on au même tick.
  const tries = evenements.slice().sort((a, b) => a.tick - b.tick || a.ordre - b.ordre);
  const morceaux = [];
  let precedent = 0;
  for (const ev of tries) {
    morceaux.push(varint(ev.tick - precedent), Buffer.from(ev.octets));
    precedent = ev.tick;
  }
  morceaux.push(Buffer.from([0x00, 0xff, 0x2f, 0x00])); // fin de piste
  const corps = Buffer.concat(morceaux);
  const entete = Buffer.alloc(8);
  entete.write("MTrk", 0, "ascii");
  entete.writeUInt32BE(corps.length, 4);
  return Buffer.concat([entete, corps]);
}

function pisteReglages(nom) {
  const microsecondes = Math.round(60000000 / TEMPO_BPM);
  const tempo = [0xff, 0x51, 0x03, (microsecondes >> 16) & 0xff, (microsecondes >> 8) & 0xff, microsecondes & 0xff];
  return piste([
    { tick: 0, ordre: 0, octets: metaTexte(0x03, nom) },
    { tick: 0, ordre: 1, octets: [0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08] }, // 4/4
    { tick: 0, ordre: 2, octets: [0xff, 0x59, 0x02, 0x00, 0x00] },             // do majeur
    { tick: 0, ordre: 3, octets: tempo },
  ]);
}

function pisteNotes(nom, canal, notes) {
  const evenements = [
    { tick: 0, ordre: 0, octets: metaTexte(0x03, nom) },
    { tick: 0, ordre: 1, octets: [0xc0 | canal, 0] }, // programme 0 : piano
  ];
  for (const note of notes) {
    evenements.push({ tick: note.tick, ordre: 3, octets: [0x90 | canal, note.hauteur, note.velocite] });
    evenements.push({ tick: note.tick + note.duree, ordre: 2, octets: [0x80 | canal, note.hauteur, 0x40] });
  }
  return piste(evenements);
}

function ecrire(chemin) {
  const { notes, duree } = composer();
  const entete = Buffer.alloc(14);
  entete.write("MThd", 0, "ascii");
  entete.writeUInt32BE(6, 4);
  entete.writeUInt16BE(1, 8);   // format 1
  entete.writeUInt16BE(3, 10);  // trois pistes
  entete.writeUInt16BE(TPQ, 12);

  const fichier = Buffer.concat([
    entete,
    pisteReglages("Deliage des doigts no 1"),
    pisteNotes("Main droite", CANAL_DROITE, notes.filter((n) => n.main === "droite")),
    pisteNotes("Main gauche", CANAL_GAUCHE, notes.filter((n) => n.main === "gauche")),
  ]);

  fs.mkdirSync(path.dirname(chemin), { recursive: true });
  fs.writeFileSync(chemin, fichier);

  const hauteurs = notes.map((n) => n.hauteur);
  console.log(`${chemin} — ${fichier.length} octets`);
  console.log(`  ${notes.length} notes, ${duree / MESURE} mesures, ${(duree / TPQ / TEMPO_BPM * 60).toFixed(1)} s a ${TEMPO_BPM} BPM`);
  console.log(`  ambitus MIDI ${Math.min(...hauteurs)} a ${Math.max(...hauteurs)}`);
}

ecrire(process.argv[2] || path.join(__dirname, "..", "morceaux-exercice", "genere", "deliage-01.mid"));
