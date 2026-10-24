/* Sous l'accueil : la page se feuillette comme un album de famille. Chaque double page montre
   ce que l'application permet de faire, avec des tirages posés de travers et leurs coins photo.
   Sources et licences des images : CREDITS.md. */

type Print = { src: string; w: number; h: number; alt: string; caption: string };

const IMG = (name: string, w: number, h: number, alt: string, caption: string): Print => ({ src: `/images/${name}`, w, h, alt, caption });

const GOREN = IMG(
  "grand-mere-goren",
  1280,
  923,
  "Photographie ancienne : une grand-mère assise sur une meule de foin avec ses petits-enfants.",
  "Une grand-mère et ses petits-enfants sur l'aire de battage, vers 1940.",
);
const SOUVENIRS = IMG(
  "souvenirs-mains",
  1280,
  853,
  "Des mains feuillettent un album rempli de photos de famille en noir et blanc.",
  "Le dimanche, on ressort les albums.",
);
const MARIAGE = IMG(
  "mariage-swindon",
  1280,
  791,
  "Photographie de mariage des années 1920 : les mariés entourés de leurs témoins et des enfants d'honneur.",
  "Le mariage de Charlie et Edna, Swindon, années 1920.",
);
const BIBLE = IMG(
  "bible-atkins",
  1280,
  1903,
  "Page manuscrite d'une bible familiale où sont notées les naissances de la famille Atkins.",
  "Les naissances de la famille Atkins, notées dans la bible familiale.",
);
const STEARNS = IMG(
  "arbre-stearns",
  1280,
  1353,
  "Arbre généalogique ancien dessiné à la main, avec des noms reliés par des accolades.",
  "L'arbre de Mary Ann Stearns, dessiné à la main.",
);
const DEVOIRS = IMG(
  "grand-pere-devoirs",
  1280,
  720,
  "Un grand-père aide son petit-fils à faire ses devoirs à la table de la cuisine.",
  "Ce qu'on sait, on le transmet.",
);
const POSTER = IMG(
  "poster-famille-martin",
  1280,
  977,
  "Exemple d'arbre exporté par l'application : trois générations de la famille Martin sur un fond de montagnes à l'aube.",
  "Un arbre exporté tel quel, prêt à imprimer. Famille fictive.",
);

function Tirage({ p, tilt, className = "" }: { p: Print; tilt: number; className?: string }) {
  return (
    <figure className={"tirage " + className} style={{ rotate: `${tilt}deg` }}>
      <img
        src={`${p.src}-1280.webp`}
        srcSet={`${p.src}-640.webp 640w, ${p.src}-1280.webp 1280w`}
        sizes="(max-width: 760px) 92vw, 520px"
        width={p.w}
        height={p.h}
        alt={p.alt}
        loading="lazy"
        decoding="async"
      />
      <figcaption>{p.caption}</figcaption>
    </figure>
  );
}

export function Album({ onStart }: { onStart: () => void }) {
  return (
    <section className="album" aria-labelledby="album-titre">
      <h2 id="album-titre" className="album-titre">
        Ce que votre arbre peut contenir
      </h2>

      <article className="planche">
        <div className="planche-texte">
          <h3>Il commence par une conversation</h3>
          <p>
            Vous, vos parents, vos frères et sœurs, vos grands-parents, vos enfants, votre conjoint. Une question à la fois, en langage de
            tous les jours.
          </p>
          <p>Vous ne savez pas ? Passez. On complète plus tard, ou quelqu'un d'autre le fera.</p>
        </div>
        <div className="planche-images">
          <Tirage p={GOREN} tilt={-1.6} />
        </div>
      </article>

      <article className="planche planche-inverse">
        <div className="planche-texte">
          <h3>Chaque fiche garde ses souvenirs</h3>
          <p>
            Une photo, les dates et les lieux, un métier, quelques lignes sur un caractère ou une anecdote. Les unions ont leur propre fiche
            : mariage, pacs, fiançailles, avec la date et l'endroit.
          </p>
        </div>
        <div className="planche-images planche-duo">
          <Tirage p={SOUVENIRS} tilt={1.4} />
          <Tirage p={MARIAGE} tilt={-2.2} className="tirage-pose" />
        </div>
      </article>

      <article className="planche">
        <div className="planche-texte">
          <h3>Les vieux papiers trouvent leur place</h3>
          <p>
            Vous avez déjà commencé ailleurs ? Importez votre fichier GEDCOM depuis Geneanet, Filae, Heredis ou MyHeritage. Les fiches
            s'ajoutent, rien n'est effacé.
          </p>
          <p>
            Le bouton « Vérifier » relit ensuite les dates et signale ce qui mérite un second regard, comme un enfant né après le décès de
            sa mère.
          </p>
        </div>
        <div className="planche-images planche-duo">
          <Tirage p={BIBLE} tilt={-1.2} className="tirage-etroit" />
          <Tirage p={STEARNS} tilt={2} className="tirage-pose tirage-etroit" />
        </div>
      </article>

      <article className="planche planche-inverse">
        <div className="planche-texte">
          <h3>On le remplit à plusieurs</h3>
          <p>
            Invitez vos proches par e-mail et choisissez pour chacun : lire seulement, ou modifier. Quand quelqu'un a l'arbre ouvert en même
            temps que vous, ses initiales s'affichent en haut de l'écran.
          </p>
          <p>L'historique garde la trace de chaque changement : qui a ajouté une date, et quand.</p>
        </div>
        <div className="planche-images">
          <Tirage p={DEVOIRS} tilt={1.2} />
        </div>
      </article>

      <article className="planche">
        <div className="planche-texte">
          <h3>Et finit au mur du salon</h3>
          <p>
            Exportez l'arbre entier, ou seulement les ancêtres, sur trois ou quatre générations. En image, ou en PDF jusqu'au format A1 pour
            l'imprimeur, avec le paysage de votre choix en fond.
          </p>
        </div>
        <div className="planche-images">
          <Tirage p={POSTER} tilt={-0.8} className="tirage-poster" />
        </div>
      </article>

      <div className="album-fin">
        <p>Votre arbre commence par votre prénom.</p>
        <button className="btn btn-primary" onClick={onStart}>
          Créer mon arbre
        </button>
      </div>
    </section>
  );
}
