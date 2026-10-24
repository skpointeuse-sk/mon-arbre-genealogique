# Décisions techniques

## 2026-10-24 : TanStack Router en SPA, pas de migration vers TanStack Start

La mission proposait TanStack Start (rendu serveur). Décision : rester sur Vite en application monopage, avec TanStack Router pour les adresses `/`, `/creer`, `/arbre` et `/partage/$treeId`.

Raisons :

- Le site est volontairement caché des moteurs (`noindex`, en-tête `X-Robots-Tag`) : il contient des données de famille. Le rendu serveur pour le référencement n'apporte donc rien.
- Les aperçus de partage (Open Graph) d'un arbre exposeraient des noms de famille à quiconque voit le lien passer dans une messagerie. L'aperçu reste générique, défini une fois dans `index.html`.
- TanStack Start ajoute un serveur à faire tourner sur Vercel (fonctions, temps de démarrage, coûts potentiels au-delà du plan Hobby) et une migration risquée pour un gain nul ici.
- Si une page publique de présentation devient nécessaire (marketing, référencement), elle sera faite à part, en statique.

Les anciens liens `/?arbre=<id>` restent valables : ils redirigent vers `/partage/<id>`.

## 2026-10-24 : messages et confirmations maison plutôt que sonner

`src/ui.tsx` fournit déjà des messages (`aria-live`) et une fenêtre de confirmation accessible au clavier. Ajouter sonner doublerait l'existant sans gain.

## 2026-10-24 : base de travail

La branche `main` ne compilait pas (`scenes.tsx` envoyé dans un sous-dossier). La version locale, découpée en composants et compilée, sert de base. Les 5 paysages animés de la v5 n'y sont plus : ils reviennent en Phase 1 (design).
