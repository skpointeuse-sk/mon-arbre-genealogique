import { useEffect, type ReactNode } from "react";
import { Mark } from "./icons";

/* Informations de l'éditeur : les mêmes que sur skdigital.fr (mentions légales publiées). */
const EDITOR = {
  name: "SK Digital, entreprise individuelle de Steven Rodrigues",
  siret: "939 387 510 00018",
  ape: "6201Z, programmation informatique",
  address: "Sannois (95110), France",
  email: "contact@skdigital.fr",
  director: "Steven Rodrigues",
};
const UPDATED = "24 octobre 2026";

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title}, Mon Arbre Généalogique`;
    return () => {
      document.title = "Mon Arbre Généalogique";
    };
  }, [title]);
  return (
    <div className="legal">
      <header className="legal-bar">
        <a className="legal-home" href="/">
          <Mark size={26} />
          <span>Mon Arbre Généalogique</span>
        </a>
      </header>
      <main className="legal-main">
        <h1>{title}</h1>
        <p className="muted">Mise à jour le {UPDATED}.</p>
        {children}
        <p className="legal-links">
          <a href="/mentions-legales">Mentions légales</a>
          <a href="/confidentialite">Confidentialité</a>
          <a href="/">Retour à l'accueil</a>
        </p>
      </main>
    </div>
  );
}

const mail = <a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a>;

export function LegalPage() {
  return (
    <LegalLayout title="Mentions légales">
      <h2>Éditeur</h2>
      <p>
        {EDITOR.name}
        <br />
        SIRET : {EDITOR.siret}
        <br />
        Code APE : {EDITOR.ape}
        <br />
        Adresse : {EDITOR.address}
        <br />
        Contact : {mail}
        <br />
        Directeur de la publication : {EDITOR.director}
      </p>
      <h2>Hébergement</h2>
      <p>
        Application : Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis.
        <br />
        Base de données et fichiers : Supabase Inc., serveurs situés à Paris (région eu-west-3).
      </p>
      <h2>Contenu des arbres</h2>
      <p>
        Les fiches, photos, notes et souvenirs sont saisis par les familles elles-mêmes, qui en restent responsables. Pour signaler un
        contenu ou demander une correction, écrivez à {mail}.
      </p>
      <h2>Crédits</h2>
      <p>
        Polices Source Serif 4 et Atkinson Hyperlegible Next, sous licence SIL Open Font License, hébergées sur ce site. Paysages dessinés
        pour l'application. Photographies de l'accueil : Pexels (licence Pexels) et archives du domaine public de Wikimedia Commons.
        L'exemple d'arbre montre une famille fictive.
      </p>
      <h2>Droit applicable</h2>
      <p>Ces mentions sont régies par le droit français.</p>
    </LegalLayout>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Confidentialité">
      <p>
        Mon Arbre Généalogique sert à construire l'arbre de votre famille et à le partager avec qui vous voulez. Cette page dit quelles
        données nous gardons, pourquoi, et comment les retirer.
      </p>
      <h2>Qui est responsable</h2>
      <p>
        {EDITOR.name}, joignable à {mail}.
      </p>
      <h2>Ce que nous gardons</h2>
      <p>
        Pour votre compte : votre adresse email, un nom d'affichage tiré de votre email, et votre mot de passe sous forme chiffrée (nous ne
        le voyons jamais). Pour vos arbres : ce que vous y saisissez, c'est-à-dire noms, dates, lieux, métiers, origines, notes, photos et
        souvenirs vocaux, ainsi que les liens de famille. Pour le travail à plusieurs : la liste des membres de chaque arbre avec leurs
        droits, les invitations envoyées, et un historique des modifications (qui a changé quoi, et quand).
      </p>
      <p>
        Quand plusieurs membres ont l'arbre ouvert en même temps, leurs initiales s'affichent pour les autres membres. Cette présence n'est
        pas enregistrée.
      </p>
      <h2>Pourquoi</h2>
      <p>
        Uniquement pour faire fonctionner le service que vous utilisez : vous connecter, afficher et partager votre arbre. Base légale :
        l'exécution du service que vous demandez en créant un compte. Rien n'est vendu, rien ne sert à de la publicité.
      </p>
      <h2>Les personnes de votre famille</h2>
      <p>
        Un arbre parle d'autres personnes que vous, parfois vivantes. Partagez-le avec soin et parlez-en aux personnes concernées. Toute
        personne qui figure dans un arbre peut nous écrire à {mail} pour demander qu'une information la concernant soit corrigée ou retirée.
      </p>
      <h2>Qui peut voir un arbre</h2>
      <p>
        Par défaut, seules les personnes que vous invitez. Si vous activez l'accès par lien, toute personne qui a le lien peut voir l'arbre
        (ou le modifier, si vous l'avez choisi). Les photos sont stockées dans un espace privé et ne s'affichent qu'aux personnes qui ont
        accès à l'arbre.
      </p>
      <h2>Où sont les données</h2>
      <p>
        Base de données et fichiers chez Supabase, sur des serveurs à Paris. L'application elle-même est servie par Vercel, qui peut traiter
        votre adresse IP le temps d'afficher les pages.
      </p>
      <h2>Cookies et stockage du navigateur</h2>
      <p>
        Aucun cookie publicitaire, aucune mesure d'audience. Votre navigateur garde seulement votre session de connexion et l'ambiance que
        vous avez choisie. Les deux sont nécessaires au fonctionnement : aucun consentement n'est demandé pour cela.
      </p>
      <h2>Combien de temps</h2>
      <p>
        Votre compte et vos arbres sont gardés tant que vous les utilisez. Un arbre supprimé par son propriétaire disparaît avec ses fiches
        et son historique. Pour fermer votre compte, écrivez à {mail} : il est supprimé sous 30 jours.
      </p>
      <h2>Vos droits</h2>
      <p>
        Vous pouvez accéder à vos données, les corriger, les faire effacer, vous opposer à leur traitement ou les récupérer. Pour récupérer
        un arbre, utilisez « Fichier », puis « Fichier GEDCOM » : le fichier s'ouvre dans les autres logiciels de généalogie. Pour le reste,
        écrivez à {mail}. Si la réponse ne vous convient pas, vous pouvez saisir la CNIL (cnil.fr).
      </p>
    </LegalLayout>
  );
}
