# Morceaux d'exercice

Fichiers MIDI téléchargés pour servir de matériel aux fonctionnalités
décrites dans [plan/](../plan/README.md). Ils sont volontairement séparés du
dossier `midi/`, qui contient les morceaux de la bibliothèque.

Tous proviennent du **Mutopia Project** (<https://www.mutopiaproject.org/>),
qui publie des éditions gravées avec LilyPond à partir de partitions du
domaine public, et fournit un rendu MIDI de chaque pièce.

## Contenu et licences

⚠️ **Les licences ne sont pas les mêmes selon les fichiers.** À vérifier avant
de les intégrer à la bibliothèque de l'application.

| Fichiers | Œuvre | Licence | Obligations |
| --- | --- | --- | --- |
| `czerny-op840-01.mid` … `czerny-op840-10.mid` | C. Czerny, *50 Melodische Übungsstücke*, op. 840, nos 1 à 10 | **Domaine public** | Aucune |
| `satie-gnossienne-1.mid` … `-3.mid` | E. Satie, *Gnossiennes* nos 1 à 3 | **CC BY-SA 4.0** | Attribution **et** partage à l'identique |

Sources des éditions, telles qu'indiquées par Mutopia :

- Czerny op. 840 : IMSLP ; Mainz, Schott, n.d. [1855], planche 13253.
- Satie, Gnossienne nº 1 : Éditions Salabert, 22 rue Chauchat, Paris, 1913.
- Satie, Gnossiennes nos 2 et 3 : Paris, Rouart, Lerolle & Cie., 1913,
  planches R.L. 9884-9886.

### Conséquence pratique de CC BY-SA 4.0

Les trois Gnossiennes ne sont **pas** dans le domaine public : c'est la
*gravure* Mutopia qui est sous licence Creative Commons. Les diffuser dans
l'application impose d'afficher l'attribution (Mutopia Project, avec un lien)
et de conserver la même licence pour ces fichiers. Les dix Czerny, eux,
n'imposent rien.

Si l'objectif est d'éviter toute contrainte, s'en tenir aux Czerny.

## À quoi sert chaque série

| Série | Fonctionnalités visées | Pourquoi celle-ci |
| --- | --- | --- |
| Czerny op. 840 | [01](../plan/01-apprentissage-morceau.md), [06](../plan/06-travail-intelligent-morceau.md), [08](../plan/08-lecture-partitions.md) | Études courtes, progressives, deux mains, écriture claire — idéales pour tester le découpage en passages, le travail main par main et la montée de tempo |
| Satie, Gnossiennes | [09](../plan/09-pedale.md), [06](../plan/06-travail-intelligent-morceau.md) | Tempo lent, harmonies tenues : le répertoire type où la pédale s'entend. Utiles pour travailler la pédale sur un vrai morceau (mais voir la limite ci-dessous) |

## Vérifications faites sur les fichiers

Analyse des 13 fichiers téléchargés :

- tous sont des MIDI **format 1**, 384 ticks par noire, avec **exactement
  deux pistes contenant des notes** ;
- c'est le cas favorable pour l'application : `buildSong()` dans
  [src/main.js](../src/main.js) sépare les mains en comparant la hauteur
  moyenne de chaque piste, ce qui ne fonctionne qu'à partir de deux pistes.
  La main gauche et la main droite seront donc correctement distinguées, sans
  passer par la coupure de repli sur `SPLIT_NOTE` ;
- **aucun fichier ne contient d'évènement de pédale (CC 64) : zéro sur les
  treize.**

### Limite importante pour la feature 09 (pédale)

Les Gnossiennes sont musicalement des pièces à pédale, mais leur rendu MIDI
Mutopia ne contient **aucune** donnée de pédale. Deux conséquences :

1. `extractPedalIntervals()` ne trouvera rien et `drawPedalCues()`
   n'affichera aucun repère sur ces fichiers ;
2. la famille **Application** de
   [09 — Exercices de pédale](../plan/09-pedale.md#5-quatre-familles-dexercices),
   qui prévoit de réutiliser les intervalles de pédale d'un morceau importé,
   ne peut donc pas s'appuyer sur ces fichiers en l'état.

Les trois autres familles de 09 (Écoute, Pédale directe, Pédale syncopée)
n'ont pas besoin de fichier : elles génèrent leurs accords. La famille
Application demandera soit un fichier MIDI contenant réellement du CC 64,
soit une pédalisation saisie à la main dans l'application.

## Ce qui n'a délibérément pas été téléchargé

- **Hanon, *Le Pianiste virtuose*** (disponible sur Mutopia en CC BY-SA,
  <https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2037>) : c'est le
  matériel canonique pour les exercices de déliement, mais
  [03 — Exercices techniques](../plan/03-technique-doigts.md#11-modèle-de-données-proposé)
  a justement décidé de **générer** les exercices à partir de données plutôt
  que de stocker « une longue liste de fichiers MIDI presque identiques ».
  Télécharger Hanon irait contre cette décision. Ces fichiers restent utiles
  comme **référence** pour vérifier le générateur, si le besoin apparaît.
- **Morceaux sous droits** : rien n'a été récupéré ailleurs que sur Mutopia,
  pour que la licence de chaque fichier soit connue et vérifiable.

## Intégration à la bibliothèque — faite

Les treize fichiers sont référencés dans `songs.json` depuis le 25/07/2026 et
apparaissent dans le sélecteur de morceaux. Le bouton d'import de fichier a
été retiré de l'application au passage : tout le répertoire est livré avec le
dépôt.

L'attribution des Gnossiennes n'est **pas** affichée dans l'application :
celle-ci est un usage personnel, sur le dépôt de son auteur, et n'est pas
destinée au public. Si elle devait être publiée (GitHub Pages ouvert,
partage), la clause BY-SA imposerait alors d'afficher l'attribution Mutopia
Project et de conserver la même licence pour ces trois fichiers.
