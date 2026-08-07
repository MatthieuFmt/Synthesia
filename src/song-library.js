// ============================================================================
//  Catalogue de `songs.json` — PARTAGÉ (mode Morceau, mode Exercices)
//
//  Deux natures de fichiers cohabitent dans le catalogue :
//
//  - `kind: "song"`     — le répertoire, ce qu'on veut *apprendre* (dossier `midi/`) ;
//  - `kind: "exercice"` — le matériel de travail, ce qu'on joue pour progresser
//                         (dossier `morceaux-exercice/`, exercices générés compris).
//
//  Ils n'ont jamais eu la même vocation (cf. `morceaux-exercice/README.md`), mais
//  ils partageaient jusqu'ici le même sélecteur, où quatre morceaux se noyaient
//  dans quarante-quatre exercices. La nature est désormais **écrite dans la
//  donnée**, pas devinée du chemin du fichier : c'est le catalogue qui décide,
//  et un fichier peut donc changer de camp sans être déplacé.
//
//  Ce module n'a ni DOM ni état d'affichage : il charge le catalogue une seule
//  fois pour toute la session et le rend tel quel. Les indices renvoyés sont
//  ceux du catalogue **complet** — le mode Morceau les mémorise dans ses
//  réglages, ils ne doivent pas dépendre du filtre appliqué.
// ============================================================================

// Nature par défaut d'une entrée qui n'en déclare pas : un morceau. Une entrée
// oubliée reste ainsi visible là où on la cherche en premier.
const DEFAULT_KIND = "song";

let catalog = [];
let fetched = false;

// Charge `songs.json` au premier appel, puis rend le tableau déjà en mémoire.
// Rend un tableau vide si le fichier est absent ou illisible : les appelants
// retombent alors sur ce qu'ils savent produire eux-mêmes (la démo, pour le
// mode Morceau).
export async function loadSongCatalog() {
  if (fetched) return catalog;
  try {
    const res = await fetch("songs.json");
    if (!res.ok) return [];
    const data = await res.json();
    catalog = Array.isArray(data) ? data : [];
    fetched = true;
  } catch {
    return [];
  }
  return catalog;
}

export function songAt(index) {
  return catalog[index] ?? null;
}

export function kindOf(song) {
  return song?.kind === "exercice" ? "exercice" : DEFAULT_KIND;
}

// Les entrées d'une nature, avec leur indice dans le catalogue complet.
export function entriesOfKind(kind) {
  return catalog
    .map((song, index) => ({ index, song }))
    .filter(({ song }) => kindOf(song) === kind);
}

export function indexOfFile(file) {
  return catalog.findIndex((song) => song.file === file);
}

// Regroupe des entrées par série — Czerny, Burgmüller, Satie, exercices
// générés… Le titre porte déjà l'information (« Czerny — Op. 840 nº 1 ») : on
// s'en sert plutôt que d'ajouter un champ que personne n'irait tenir à jour.
// Un titre sans tiret cadratin forme sa propre série.
export function groupByPrefix(entries) {
  const groups = [];
  for (const entry of entries) {
    const label = entry.song.title.split(" — ")[0].trim();
    const existing = groups.find((group) => group.label === label);
    if (existing) existing.entries.push(entry);
    else groups.push({ label, entries: [entry] });
  }
  return groups;
}
