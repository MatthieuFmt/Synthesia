# Morceaux d'exercice

Fichiers MIDI téléchargés pour servir de matériel aux fonctionnalités
décrites dans [plan/](../plan/README.md). Ils sont volontairement séparés du
dossier `midi/`, qui contient les morceaux de la bibliothèque.

Tous proviennent du **Mutopia Project** (<https://www.mutopiaproject.org/>),
qui publie des éditions gravées avec LilyPond à partir de partitions du
domaine public, et fournit un rendu MIDI de chaque pièce.

Les treize premiers (Czerny op. 840, Gnossiennes) sont les rendus MIDI
publiés par le site. Les treize ajoutés le 27/07/2026 (Czerny
op. 821, Burgmüller, Clementi) ont été **compilés depuis les sources
LilyPond du dépôt GitHub de Mutopia** (`MutopiaProject/MutopiaProject`,
répertoire `ftp/`), avec LilyPond 2.24 après passage de `convert-ly` — le
site lui-même n'étant pas accessible depuis l'environnement de travail.
Une coquille de la source de Burgmüller op. 100 nº 1 (`f8'` pour `f'8`,
ligne 42) a été corrigée avant compilation.

## Contenu et licences

⚠️ **Les licences ne sont pas les mêmes selon les fichiers.** À vérifier avant
de les intégrer à la bibliothèque de l'application.

| Fichiers | Œuvre | Licence | Obligations |
| --- | --- | --- | --- |
| `czerny-op840-01.mid` … `czerny-op840-10.mid` | C. Czerny, *50 Melodische Übungsstücke*, op. 840, nos 1 à 10 | **Domaine public** | Aucune |
| `czerny-op821-01.mid` … `-04.mid` | C. Czerny, *160 Kurze Übungen*, op. 821, nos 1 à 4 | **Domaine public** | Aucune |
| `burgmuller-op100-01.mid` … `-06.mid` | F. Burgmüller, *25 Études faciles et progressives*, op. 100, nos 1 à 6 | **Domaine public** | Aucune |
| `clementi-op36-1-1.mid` … `-3.mid` | M. Clementi, Sonatine op. 36 nº 1, trois mouvements | **Domaine public** | Aucune |
| `satie-gnossienne-1.mid` … `-3.mid` | E. Satie, *Gnossiennes* nos 1 à 3 | **CC BY-SA 4.0** | Attribution **et** partage à l'identique |

Sources des éditions, telles qu'indiquées par Mutopia :

- Czerny op. 840 : IMSLP ; Mainz, Schott, n.d. [1855], planche 13253.
- Czerny op. 821 : IMSLP ; Leipzig, Edition Peters, n.d. [1888], planches
  6990-6993.
- Burgmüller op. 100 : Collection Litolff, XIXe siècle.
- Clementi op. 36 nº 1 : *Sonatina Album*, G. Schirmer, 1893.
- Satie, Gnossienne nº 1 : Éditions Salabert, 22 rue Chauchat, Paris, 1913.
- Satie, Gnossiennes nos 2 et 3 : Paris, Rouart, Lerolle & Cie., 1913,
  planches R.L. 9884-9886.

### Conséquence pratique de CC BY-SA 4.0

Les trois Gnossiennes ne sont **pas** dans le domaine
public : c'est la *gravure* Mutopia qui est sous licence Creative Commons.
Les diffuser dans l'application impose d'afficher l'attribution (Mutopia
Project, avec un lien) et de conserver la même licence pour ces fichiers.
Les Czerny, Burgmüller et Clementi, eux, n'imposent rien.

Si l'objectif est d'éviter toute contrainte, s'en tenir à ces derniers.

## À quoi sert chaque série

| Série | Fonctionnalités visées | Pourquoi celle-ci |
| --- | --- | --- |
| Czerny op. 821 | [06](../plan/06-travail-intelligent-morceau.md) | Huit mesures chacun : l'exercice entier tient dans un seul passage, la boucle est immédiate |
| Czerny op. 840 | [01](../plan/01-apprentissage-morceau.md), [06](../plan/06-travail-intelligent-morceau.md), [08](../plan/08-lecture-partitions.md) | Études courtes, progressives, deux mains, écriture claire — idéales pour tester le découpage en passages, le travail main par main et la montée de tempo |
| Burgmüller op. 100 | [01](../plan/01-apprentissage-morceau.md), [06](../plan/06-travail-intelligent-morceau.md) | De vraies petites pièces progressives, plus musicales que des études : la récompense après la technique |
| Clementi op. 36 nº 1 | [01](../plan/01-apprentissage-morceau.md), [06](../plan/06-travail-intelligent-morceau.md) | La sonatine d'étude par excellence, en trois mouvements courts — premier « vrai morceau » de répertoire classique |
| Satie, Gnossiennes | [09](../plan/09-pedale.md), [06](../plan/06-travail-intelligent-morceau.md) | Tempo lent, harmonies tenues : le répertoire type où la pédale s'entend. Utiles pour travailler la pédale sur un vrai morceau (mais voir la limite ci-dessous) |

## Vérifications faites sur les fichiers

Analyse des 31 fichiers **alors présents** (13 téléchargés en juillet, 18
compilés le 27/07/2026 ; les 5 Hanon ont été retirés depuis — voir plus bas) :

- tous sont des MIDI **format 1**, 384 ticks par noire, avec **exactement
  deux pistes contenant des notes** ;
- c'est le cas favorable pour l'application : la séparation des mains compare
  la hauteur moyenne de chaque piste, ce qui ne fonctionne qu'à partir de deux
  pistes. La main gauche et la main droite seront donc correctement
  distinguées, sans passer par la coupure de repli sur le Do central ;
- les 18 nouveaux ont de plus été **parsés avec `@tonejs/midi`** — la
  bibliothèque exacte de l'application — : pistes, comptes de notes et durées
  cohérents pour chacun ;
- **aucun fichier ne contient d'évènement de pédale (CC 64) : zéro sur les
  trente et un.**

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

## La décision Hanon, tranchée en trois temps — retrait le 28/07/2026

1. **Refus** (25/07/2026). Le matériel des
   [Exercices techniques (03)](../plan/03-technique-doigts.md#11-modèle-de-données-proposé)
   est **généré** à partir de données, et une liste de fichiers MIDI presque
   identiques aurait fait double emploi.
2. **Ajout** (27/07/2026), à la demande de l'utilisateur : joués dans le mode
   Morceau avec la boucle, l'attente et la montée de tempo du sous-mode
   Travail (06), ils pouvaient servir autrement que dans 03.
3. **Retrait** (28/07/2026), à la demande de l'utilisateur : à l'usage, les
   cinq exercices se ressemblent trop et n'apportent rien. Les fichiers
   `hanon-01.mid` … `-05.mid` et leurs cinq lignes de `songs.json` ont été
   supprimés.

Le refus initial avait donc raison, mais pas tout à fait pour la bonne raison :
le problème n'est pas que Hanon fasse double emploi avec 03, c'est qu'un
exercice qui ne travaille qu'**une** chose — cinq doigts en position fixe —
répétée en soixante variantes ne couvre pas le travail réel. Le remplacement
est décrit dans
[plan/exercices-generes.md](../plan/exercices-generes.md) : des exercices
**générés**, un objectif par exercice, trois niveaux, produits dans
`genere/` par `tools/generer-exercice.js`.

Reste inchangé :

- **Morceaux sous droits** : rien n'a été récupéré ailleurs que sur Mutopia,
  pour que la licence de chaque fichier soit connue et vérifiable.

## Intégration à la bibliothèque — faite

Les vingt-six fichiers restants sont référencés dans `songs.json` (les treize
premiers depuis le 25/07/2026, les treize autres depuis le 27/07/2026) et
apparaissent dans le sélecteur de morceaux, groupés par compositeur. Le
bouton d'import de fichier a été retiré de l'application : tout le répertoire
est livré avec le dépôt. Les exercices générés de `genere/` s'y ajoutent au
fur et à mesure de leur production : quinze depuis le 28/07/2026 — la vague 1
complète (A1 Déliage, B1 Gammes, B2 Arpèges, B3 Sauts) et la première famille
de la vague 2 (C1 Doubles notes), chacune à ses trois niveaux.

L'attribution des fichiers CC BY-SA (Gnossiennes) n'est **pas**
affichée dans l'application : celle-ci est un usage personnel, sur le dépôt
de son auteur, et n'est pas destinée au public. Si elle devait être publiée
(GitHub Pages ouvert, partage), la clause BY-SA imposerait alors d'afficher
l'attribution Mutopia Project et de conserver la même licence pour ces trois
fichiers. Les exercices de `genere/` ne posent pas cette question : ils sont
écrits par l'application elle-même, à partir de rien.
