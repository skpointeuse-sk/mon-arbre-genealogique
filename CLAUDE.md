# CLAUDE.md — Mon Arbre Généalogique

> Fichier de contexte permanent. Lis-le en entier avant toute action. Le nom du produit s'écrit toujours exactement **« Mon Arbre Généalogique »**.

## 1. Le produit en une phrase

Application web d'arbre généalogique **collaboratif**, d'une simplicité absolue pour un grand-parent débutant (questions guidées, bouton « Passer » partout) et d'un niveau visuel de **studio de design haut de gamme** (standing 3 000 – 5 000 €). Promesse : « Construire l'histoire de sa famille aussi simplement qu'une conversation de salon, avec le rendu élégant d'un livre d'art. »

## 2. L'utilisateur (Steven)

- Dirige l'agence web SK Digital. **N'est pas développeur.** Réponds-lui en **français**, simplement, étape par étape, avec les **noms exacts des boutons/menus** quand il doit agir lui-même (GitHub, Vercel, Supabase).
- Tout doit rester **gratuit** (Vercel Hobby, Supabase Free, GitHub). Signale tout ce qui deviendrait payant AVANT de le faire.
- Vercel Hobby = usage non commercial. Si le produit devient commercial, il faudra le plan Pro : le rappeler quand pertinent.

## 3. Infrastructure (tout existe déjà et fonctionne)

| Élément                         | Valeur                                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Dépôt GitHub                    | `skpointeuse-sk/mon-arbre-genealogique` (branche `main`)                                                                          |
| Site en ligne                   | https://mon-arbre-genealogique-9v1t.vercel.app (déploiement auto à chaque push sur `main`)                                        |
| Supabase (projet de CE produit) | ref `nyboahgdnqivjliqcrtd` · https://nyboahgdnqivjliqcrtd.supabase.co · région `eu-west-3` (Paris) · organisation « Site web SK » |
| Clé publique (anon)             | `sb_publishable_ik0FkJWg51z39sF41OgWDg_MZoEMvyQ` (publique par conception, déjà en valeur par défaut dans `src/supabase.ts`)      |
| Variables Vercel                | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`                                                                              |

**⚠️ Ne touche JAMAIS** à un autre projet Supabase (Steven en possède d'autres, dont celui de « Pointeuse SK Digital », ref `lfhakelqgkkohryegets`). Ne jamais utiliser ni écrire la clé `service_role` dans le code ou le dépôt.
**Pause Supabase gratuit** : un projet inactif 7 jours est mis en pause → « Failed to fetch » sur le site. Remède : `restore_project` (MCP) ou bouton « Restore project » du dashboard.

## 4. Stack actuelle (état réel du code)

État au 24 octobre 2026, fin de Phase 5 (branche `main`). Phases 1 à 5 livrées : paysages, découpage de TreeView, import GEDCOM, vérificateur, exports, membres, historique, présence, pages légales, accessibilité.

Vite 7 · React 19 · TypeScript strict · CSS maison avec jetons dans `src/styles.css` (pas de Tailwind dans cette version) · `@supabase/supabase-js` · `html-to-image` · **TanStack Router** (routes codées dans `src/router.tsx`) · **TanStack Query** (`src/queries.ts`). Polices auto-hébergées via Fontsource : Source Serif 4 (titres) et Atkinson Hyperlegible Next (interface, lisibilité pour les grands-parents).

Routes : `/` accueil (redirige vers `/arbre` si connecté) · `/creer` assistant · `/arbre` arbre de l'utilisateur · `/partage/$treeId` arbre partagé. Les anciens liens `/?arbre=<id>` redirigent vers `/partage/<id>`. Choix justifiés dans `docs/decisions.md` (pas de TanStack Start).

Fichiers : `App.tsx` (fournisseurs + boundary d'erreur) · `router.tsx` · `session.tsx` · `queries.ts` · `Landing.tsx` · `Wizard.tsx` · `TreeView.tsx` (canevas et actions) · `useTreeData.ts` / `useView.ts` (données, zoom et déplacement) · `Panel.tsx` (fiche) · `dialogs.tsx` (ajout, union, partage, anniversaires, vérification, export) · `members.tsx` (membres et droits) · `history.tsx` (historique) · `usePresence.ts` (présence) · `exporting.ts` (choix des personnes exportées, paysage en canvas/SVG) · `gedcom.ts` (import) · `check.ts` (`checkFamily`) · `Legal.tsx` (`/mentions-legales`, `/confidentialite`) · `card.tsx` · `ui.tsx` · `icons.tsx` · `themes.ts` · `scenes.tsx` · `lib.ts` · tests `lib.test.ts`, `features.test.ts`.

Commandes : `npm run build` (vérifie les types puis compile) · `npm run check` (types, lint, tests, formatage) · `npm run test:e2e` (Playwright, 1440 px et 390 px ; `npm run test:prod` rejoue les mêmes tests sur le site en ligne avec sa CSP ; Supabase simulé dans `e2e/mock.ts`, dont une session de propriétaire avec `mockOwner` ; audit axe-core WCAG 2.2 AA dans `e2e/a11y.spec.ts`). L'intégration continue tourne sur GitHub Actions à chaque push sur `main` (`.github/workflows/ci.yml`).

> Pièges : `main` ne compilait plus avant le 24/10 (`scenes.tsx` envoyé dans un sous-dossier). Les 5 paysages animés de la v5 ne sont pas dans cette version : à réintégrer en Phase 1. Sur Windows, `git` doit garder `core.autocrlf=false` dans ce dépôt.

## 5. Base de données (déjà migrée, RLS activée partout)

Tables `public` : `profiles` (trigger sur `auth.users`), `trees` (title, owner_id, root_id, settings jsonb `{preset: id de paysage}`, link_access `private|view|edit`), `tree_members` (tree_id, user_id, role `owner|co_lead|editor|viewer`), `tree_invites` (email + rôle, réclamées par la RPC `claim_invites()` à la connexion), `people` (colonnes : kind `human|pet`, species, first_name, last_name, nickname, gender `m|f|u`, birth, birth_time, birth_place, death, death_place, burial, job, origins text[], photo_path, audio_path, notes, **parent_ids uuid[]**, **spouse_ids uuid[]**, sibling_ids uuid[] (présent mais non utilisé : les fratries se déduisent des parents)), `unions` (tree_id, person_a < person_b, type, date, place, notes ; PK composite).
Fonctions de droits `SECURITY DEFINER` : `tree_role(t)`, `can_view(t)`, `can_edit(t)`, `can_admin(t)`. Trigger `add_owner_member` (le créateur d'un arbre devient `owner`). Storage : bucket **privé** `tree-media` (10 Mo, images + audio), chemins `{tree_id}/{fichier}`, policies basées sur `can_view`/`can_edit`. Realtime activé sur `people`, `unions`, `trees`, `tree_members`.
Règle RBAC : owner = tout ; co_lead = édite + gère les membres jusqu'à « éditeur » ; editor = édite les fiches ; viewer = lecture. Un lien de partage `?arbre=<id>` ouvre l'arbre sans compte si `link_access` ≠ `private`.
**À partir de maintenant, toute évolution du schéma passe par des fichiers de migration versionnés dans `supabase/migrations/`** (et pas seulement par le dashboard). Après chaque migration : lancer les advisors de sécurité Supabase.
Migrations appliquées : `20261024140000_historique_presence.sql` (table `tree_events` remplie par déclencheurs SECURITY DEFINER sur people/unions/tree_members/trees, `members_select` réservé aux membres, politiques `presence_read`/`presence_write` sur `realtime.messages` pour le canal privé `arbre:<id>`). Le schéma d'avant le 24/10 n'a pas de migration de base : il vit seulement dans Supabase. Sans CLI connectée, les migrations s'appliquent par l'éditeur SQL du dashboard (essai à blanc d'abord dans un bloc qui se termine par une exception). Advisors au 24/10 : 0 erreur, 10 avertissements anciens (fonctions `can_*`/`tree_role`/`claim_invites` appelables par l'API, protection des mots de passe divulgués réservée au plan payant).

## 6. Fonctionnalités déjà livrées (v5)

Landing plein écran avec **5 paysages animés** (prairie, forêt d'automne, montagnes à l'aube, coucher de soleil, nuit étoilée) à essayer en direct · inscription/connexion e-mail · assistant 6 étapes (vous, parents, fratrie, grands-parents, enfants, conjoint) · canevas interactif (pan, zoom molette/boutons, « Centrer sur moi », parallaxe des paysages) · cartes en verre dépoli avec photo/initiale, drapeaux d'origine, dates, **lien de parenté calculé** · ajout rapide (+Père, +Mère, +Conjoint(e), +Frère/Sœur, +Enfant, +Animal) · fiche latérale complète (+ photo compressée 800 px WebP → Storage, URLs signées 1 h) · **unions** cliquables 💍 (type/date/lieu/notes) · annuler/rétablir (30 états, Ctrl+Z / Ctrl+Y) · recherche · export PNG et GEDCOM (export seulement) · calendrier des prochains anniversaires · partage (lien + invitation e-mail avec rôle) · temps réel · suppression avec nettoyage des références.

## 7. Dette technique & limites connues (à traiter)

0. Restes de Phase 0 : (a) CI active depuis le 24/10/2026 ; (b) tests RLS automatisés et migration de base du schéma existant : à faire quand `npx supabase login` sera fait ; (c) types Supabase générés : même blocage.
1. `TreeView.tsx` reste gros (canevas + actions) → extraire hooks et services Supabase.
2. Layout (`layout()` dans `lib.ts`) simplifié : pas de recentrage des parents au-dessus des enfants, frères/sœurs sans parents flottent, unions multiples/demi-fratries mal gérées, pas de minimap, pas de zoom tactile (pinch), pas de virtualisation (≥ 300 personnes à tester).
3. (Réglé en phase 2) L'annulation restaure aussi les unions.
4. (Réglé en phase 3) Export PNG/JPG/SVG/PDF A2-A1 avec paysage, profondeur et ascendance/descendance. Le SVG embarque l'arbre en foreignObject : pas de vrai vectoriel pour les cartes. Pas de livret de famille PDF.
5. Restent à faire : carte des origines, souvenirs vocaux (colonne `audio_path` prête), livret de famille PDF. Faits : import GEDCOM, vérificateur, présence, membres, historique (depuis le 24/10/2026).
6. Fait : tests unitaires et e2e, lint, boundary d'erreur, audit axe-core sans défaut. Reste : e-mails d'invitation non envoyés (l'invité est rattaché à la connexion seulement), suppression de compte en libre-service (aujourd'hui par email, promis sous 30 jours dans `/confidentialite`).
7. « Confirm email » est désactivé côté Supabase pour les tests : à réactiver avant le lancement public, avec un SMTP personnalisé (l'envoi intégré de Supabase est limité à quelques e-mails par heure).

## 8. Décisions produit non négociables

- Nom exact « Mon Arbre Généalogique ». Ton chaleureux, humain, jamais froid/générique ; micro-textes en français soigné.
- **PAS de masquage automatique des personnes vivantes / RGPD** : fonctionnalité formellement exclue. (Une page de politique de confidentialité reste bien sûr nécessaire.)
- Pas de librairie de graphes générique (Cytoscape, D3-force…) : moteur de tracé maison, structure généalogique classique (bandes de générations en Y, couples solidaires en X avec nœud d'alliance cliquable, filiation orthogonale/Bézier douce, barre de fratrie).
- Aucune couleur codée en dur dans les composants (`bg-black`, `#fff`…) : tout passe par les jetons sémantiques oklch et les paysages/thèmes.
- Les photos ne vont **jamais** en Base64 dans le `localStorage` : Storage + compression canvas (800 px max, WebP 0.85).
- Les paysages/thèmes ne modifient que le style, jamais les données de l'arbre.
- Cible de l'arbre (spec d'origine) : cartes ≈ 172×212 px, espacement horizontal 36 px, bandes verticales 300 px (la v5 utilise 156×178 / 28 / 250 : à réévaluer visuellement).

## 9. Spécifications métier de référence

**Types** : `Gender m|f|u` · `Species chien|chat|oiseau|poisson|tortue|cheval|lapin|autre` (🐶🐱🦜🐠🐢🐴🐰🐾) · `UnionType mariage|mariage-religieux|pacs|union-libre|fiancailles|divorce|separation`.
**Liens de parenté** (distance (a,b) vers l'ancêtre commun le plus proche, a = depuis la racine) : (1,0) père/mère · (0,1) fils/fille · (2,0) grand-parent · (0,2) petit-enfant · (a>2,0) arrière-(arrière-)grand-parent · (1,1) frère/sœur (+ demi-frère/sœur si un seul parent commun) · (2,1) oncle/tante · (1,2) neveu/nièce · (2,2) cousin(e) germain(e) · (3,3) cousin(e) issu(e) de germain · conjoints (« Conjoint(e) de … ») · animaux (« 🐶 Chien de compagnie »).
**Contrôle de cohérence (`checkFamily`)**, messages bienveillants : décès avant naissance · enfant né après le décès de la mère · mère < 13 ans à la naissance · âge > 110 ans sans décès · mariage avant 15 ans ou après un décès.
**Raccourcis** : Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z · Échap (fermer panneaux/désélectionner) · Espace + glisser (pan) · molette (zoom).
**Export** : profondeur 3 générations / 4 générations / arbre complet ; vue ascendance seule / descendance seule / globale ; PNG HD, JPG, SVG vectoriel, PDF grand format (A2/A1), livret de famille PDF (photos, dates, anecdotes) ; GEDCOM 5.5.1 import (INDI, FAM, HUSB, WIFE, CHIL, BIRT, DEAT, NAME, SEX, PLAC, DATE — compatible Geneanet, Filae, Heredis, MyHeritage) et export.
**Jetons d'origine** (nature) : fond `oklch(0.975 0.012 85)`, carte `oklch(0.995 0.004 85)`, primaire vert forêt `oklch(0.36 0.06 155)`, or `oklch(0.72 0.09 80)`, accent terre cuite `oklch(0.6 0.12 45)`.

## 10. Conventions de travail

- Petits commits atomiques, messages en français à l'impératif (« Ajoute… », « Corrige… »). Branches de fonctionnalité + aperçus Vercel (Preview) pour tout changement visuel important ; merge sur `main` seulement quand `npm run build` + tests passent.
- Vérifier systématiquement : `npm run build`, lint, tests, puis captures d'écran desktop 1440 px **et** mobile 390 px via Playwright.
- Ne jamais supprimer de données utilisateur ni lancer de migration destructive sans demander à Steven.
- Chaque image/police/icône externe : licence gratuite commerciale vérifiée, consignée dans `CREDITS.md`.
- Mettre à jour ce `CLAUDE.md` à la fin de chaque phase (état, décisions, pièges rencontrés).
