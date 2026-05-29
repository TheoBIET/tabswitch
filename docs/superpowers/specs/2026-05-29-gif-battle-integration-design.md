# GIF Battle — Intégration complète (UI + banque de phrases)

> Spec de design · 2026-05-29 · TabSwitch (gif-battle repo)

## Contexte

La logique serveur de GIF Battle est **complète et testée** (FSM, scoring, votes,
réactions, trophées, share token) et enregistrée dans la registry. Côté client, le
jeu est sur `PlaceholderGame` : toute la surface React a été supprimée volontairement
lors du refactor hub et doit être reconstruite contre le protocole générique
`game:action` / `game:event`. TicTacToe est l'implémentation de référence.

Ce spec couvre trois chantiers indépendants :

- **A. UI client** — reconstruction complète de la surface React GIF Battle.
- **B. Banque de phrases** — passage de ~50 phrases statiques à ~300 phrases
  bilingues + possibilité pour les joueurs d'en proposer de nouvelles.
- **C. Boucle 10 manches** — ajout de l'option `10` (défaut).

Les trois peuvent être implémentés et testés séparément.

## Objectifs

1. GIF Battle entièrement jouable de bout en bout depuis le navigateur, à parité
   avec ce que le serveur supporte déjà.
2. Banque d'environ 300 phrases drôles, bilingues FR/EN, audience large.
3. Les joueurs connectés peuvent proposer de nouvelles phrases ; la validation se
   fait manuellement en base (flag `isApproved`).
4. Parties par défaut en 10 manches.

## Non-objectifs (follow-ups)

- Système d'upvotes / board communautaire avec classement.
- Modération admin in-app, signalement utilisateur.
- i18n au-delà de FR/EN, rooms Redis-backed, sons/musique.

---

## Chantier A — UI client GIF Battle

### Emplacement & branchement

Nouveau dossier `apps/web/components/games/gif-battle/`. Branchements :

- `GameRoomShell.GameView` → rendre `<GifBattleGame snapshot={snapshot} />` au lieu
  de `<PlaceholderGame />` pour `gameType === 'gif-battle'`.
- `GameSettingsPanel` → rendre `<GifBattleSettings />` pour `gif-battle`.

`PlaceholderGame.tsx` est supprimé une fois le jeu branché.

### Composant racine

`GifBattleGame` lit `snapshot.gameState as GifBattleClientView` et route selon
`view.status`. Mobile-first, design system du hub (`Card`, `Button`, tokens CSS,
mêmes conventions que `TicTacToeGame`).

| Phase FSM | Composant | Contenu |
|---|---|---|
| `WAITING` (lobby) | `GifBattleSettings` | rounds / pickSeconds / voteSeconds / mode / locale / rating + entrée « ➕ proposer une phrase » |
| `ROUND_INTRO` | `RoundIntro` | « Manche X/N », countdown depuis `deadlineAt` |
| `ROUND_PICKING` | `GifPicker` | carte thème + timer, recherche Giphy, grille de résultats, sélection, ack « soumis ✓ », compteur soumissions (`round:submission:count`) |
| `ROUND_PRE_REVEAL` / `ROUND_REVEALING` | `RevealGrid` | GIFs anonymes, apparition staggered (`round:revealing` donne l'ordre) |
| `ROUND_VOTING` | `VotingGrid` | mêmes cartes, clic = vote (anti self-vote serveur), timer, compteur votes (`round:vote:count`), réactions emoji |
| `ROUND_RESULTS` | `RoundResults` | gagnant·e(s), votes par carte, deltas de score + breakdown, mini-classement |
| `GAME_END` | `GameEndScreen` | classement final, trophées, partage (OG image `/api/og/scoreboard`), « Rejouer » (host → `lobby:start`) |

### Données & événements

- **Émission** : `gameAction(getSocket(), GIF_BATTLE_EVENTS.X, payload)` pour
  `RoundSubmit`, `RoundVote`, `RoundUnvote`, `ReactionSend`, `SettingsUpdate`.
- **Réception** : hook `useGifBattleEvents()` qui écoute les `game:event` serveur
  (`round:started`, `round:pre_reveal`, `round:revealing`, `round:voting:start`,
  `round:results`, `reaction:broadcast`, `game:ended`, `settings:updated`) pour les
  transitions visuelles / animations / révélation staggered.
- **Timers** : calculés depuis `currentRound.deadlineAt` + `serverTime` du snapshot
  (anti-drift), pas de timer purement local.
- **GIF picker** : appelle `/api/gif/search?q=&locale=&rating=&page=` (déjà en
  place, Giphy). Soumet `{ gifId, gifUrl, previewUrl, width, height }` validé
  côté serveur (allowlist d'hôtes).

### Settings panel

`GifBattleSettings` (host-only en édition, lecture seule sinon) émet
`SettingsUpdate` partiel. Champs : rounds (`ROUNDS_OPTIONS`), pickSeconds,
voteSeconds, mode, locale, rating. Affiche un lien/bouton « ➕ proposer une phrase »
(ouvre le form du chantier B).

---

## Chantier B — Banque de phrases

### Contenu seed

~300 phrases drôles, **bilingues** (chaque entrée a une version FR et une EN, pas
forcément traduction littérale), audience large : quotidien, relations, internet /
memes, culture pop, absurde, tech/work. Insérées via migration avec
`isApproved=true`, `authorId=null`.

Le tableau statique `themes.ts` reste comme **fallback sans DB** (dev / tests).

### Modèle de données

Table unique, validation manuelle en base (pas d'upvotes) :

```prisma
model GifBattleSentence {
  id         String   @id @default(uuid()) @db.Uuid
  sentenceFr String   @db.VarChar(140)
  sentenceEn String   @db.VarChar(140)
  isApproved Boolean  @default(false)   // validé à la main en DB
  authorId   String?                     // null = seed officiel
  createdAt  DateTime @default(now())

  author User? @relation(fields: [authorId], references: [id], onDelete: SetNull)

  @@index([isApproved], map: "gif_battle_sentences_approved_idx")
  @@map("gif_battle_sentences")
}
```

`User` gagne la relation inverse `gifBattleSentences GifBattleSentence[]`.

### Proposition de phrase

- `POST /api/gif-battle/sentences` — auth requise (sinon 401, comme `/api/ideas`),
  validation Zod (`sentenceFr`, `sentenceEn`, 4–140 chars chacun), anti-spam /
  profanité (même helper que `/api/ideas`), dédup, création avec `isApproved=false`.
- (Optionnel) `GET` listant les phrases approuvées de l'auteur courant — non requis
  pour le MVP.
- **UX form** : modal « ➕ proposer une phrase » accessible depuis le lobby GIF
  Battle. Le joueur saisit FR et EN. Pas de page board, pas de liste publique.

### Injection des phrases dans le moteur

Le package `@tabswitch/gif-battle` **reste pur** (aucun import DB). Injection par
setter au niveau module :

```ts
// packages/games/gif-battle/src/themes.ts
type CommunityPhraseLoader = (locale: Locale) => Promise<SeedTheme[]>;
let loader: CommunityPhraseLoader | null = null;
export function setCommunityPhraseLoader(fn: CommunityPhraseLoader) { loader = fn; }
export async function loadThemePool(locale: Locale): Promise<SeedTheme[]> {
  const community = loader ? await loader(locale).catch(() => []) : [];
  return [...ALL_SEED_THEMES.filter((t) => t.locale === locale), ...community];
}
```

- Le **serveur** (`apps/server`, déjà doté de `getDb()`) appelle
  `setCommunityPhraseLoader(...)` une fois au boot, branché sur
  `db.gifBattleSentence.findMany({ where: { isApproved: true } })` et mappe
  `sentenceFr` / `sentenceEn` vers `SeedTheme` selon la locale.
- `GifBattleRoom.onStart()` devient **async** : charge le pool une fois via
  `loadThemePool(locale)`, le stocke dans `this.themePool`, puis démarre la 1ʳᵉ
  manche. Le FSM pioche dans ce pool injecté.
- Sans loader (tests, dev sans DB) → fallback automatique sur le seed statique.

### Changements moteur associés

- `pickRandomTheme(pool, used)` prend désormais le pool en paramètre (au lieu de
  lire le global statique).
- `transitionToRoundIntro` pioche dans le `themePool` de la room.

---

## Chantier C — Boucle 10 manches

`packages/games/gif-battle/src/constants.ts` :

```ts
export const ROUNDS_OPTIONS = [3, 5, 8, 10, 15, 20] as const;
export const DEFAULTS = { rounds: 10, /* … inchangé … */ };
```

Le FSM est déjà paramétré par `settings.rounds` — aucun autre changement.

---

## Tests & vérification

- **Unitaires (vitest)** : `loadThemePool` avec/sans loader ; `pickRandomTheme`
  sans répétition sur le pool injecté ; partie complète à 10 manches ;
  mapping `GifBattleSentence` → `SeedTheme` par locale.
- **Smoke E2E** (`apps/web/scripts/smoke.mjs` étendu) : cycle 3 joueurs sur GIF
  Battle (submit → reveal → vote → results → game end).
- **API** : `POST /api/gif-battle/sentences` (401 sans auth, rejet anti-spam,
  création `isApproved=false`, dédup).
- `pnpm typecheck` reste à 8/8 packages.

## Migration

- Migration Prisma `gif_battle_sentences` (table + index + relation inverse User).
- Seed des ~300 phrases bilingues (`isApproved=true`, `authorId=null`) dans la
  même migration ou un script de seed dédié.

## Risques / points d'attention

- **Couplage pureté package** : le setter module-level doit être branché au boot
  serveur ; oubli → fallback silencieux sur seed statique (acceptable, mais à
  vérifier en E2E).
- **Locale d'une phrase proposée** : le form impose FR+EN ; si une version manque,
  la phrase n'apparaît que dans la locale renseignée (loader filtre les vides).
- **Drift timer** : toujours dériver l'affichage de `deadlineAt` + `serverTime`.
</content>
</invoke>
