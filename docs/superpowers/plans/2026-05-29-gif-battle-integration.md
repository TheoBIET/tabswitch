# GIF Battle — Intégration (UI + banque de phrases) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre GIF Battle entièrement jouable dans le navigateur, porter la banque de phrases à ~300 entrées bilingues alimentables par les joueurs, et passer la boucle à 10 manches par défaut.

**Architecture:** Le moteur serveur (FSM, scoring, votes) existe déjà et reste pur. On (1) ajoute l'option 10 manches, (2) injecte un pool de phrases chargé depuis une nouvelle table `GifBattleSentence` via un setter module-level branché au boot serveur (le package de jeu ne dépend jamais de la DB), et (3) reconstruit la surface React sous `apps/web/components/games/gif-battle/`, branchée sur le protocole `game:action` / `game:event`.

**Tech Stack:** Turborepo + pnpm · Next.js 15 (App Router) · React 19 · Tailwind v4 · socket.io 4 · Prisma 7 (Postgres) · vitest · zod · zustand.

---

## Conventions du repo (à connaître)

- **Émettre une action de jeu** : `await gameAction(getSocket(), GIF_BATTLE_EVENTS.X, payload)` → renvoie un `Ack` (`{ok:true,data?}` | `{ok:false,code,message}`). Importer depuis `@/lib/socket`.
- **Écouter un événement serveur** : `onGameEvent(getSocket(), 'round:results', (payload) => ...)` → renvoie une fonction d'unsubscribe. Les noms sont dans `GIF_BATTLE_SERVER_EVENTS`.
- **État courant** : `snapshot.gameState as GifBattleClientView`. Le shell (`GameRoomShell`) re-render à chaque `lobby:state`.
- **Types/constantes du jeu** : tout est ré-exporté depuis `@tabswitch/gif-battle` (`GIF_BATTLE_EVENTS`, `GIF_BATTLE_SERVER_EVENTS`, `GifBattleClientView`, `RoundResultsPayload`, `GameEndedPayload`, `ROUNDS_OPTIONS`, etc.).
- **UI kit** : `@/components/ui/{Button,Card,Input,Avatar}`. `Button` props : `variant` (`primary|accent|ghost`), `size` (`sm|lg`), `disabled`, `onClick`, `type`, `asChild`, `className`.
- **Tests** : `pnpm --filter @tabswitch/gif-battle test` (vitest, package jeu) ; `pnpm --filter @tabswitch/web test` (vitest web, voir `apps/web/lib/__tests__`) ; `pnpm typecheck` (doit rester 8/8).
- **Migrations** : `pnpm --filter @tabswitch/db migrate:dev --name <nom>` (nécessite `DATABASE_URL`). `pnpm --filter @tabswitch/db generate` régénère le client dans `packages/db/dist/`.

---

## Découpage fichiers

**Chantier C (10 manches)**
- Modifie : `packages/games/gif-battle/src/constants.ts`

**Chantier B (phrases)**
- Modifie : `packages/db/prisma/schema.prisma` (table `GifBattleSentence` + relation inverse `User`)
- Crée : `packages/db/prisma/migrations/<ts>_gif_battle_sentences/migration.sql` (généré)
- Modifie : `packages/db/src/index.ts` (export du type `GifBattleSentence`)
- Modifie : `packages/games/gif-battle/src/themes.ts` (loader + `loadThemePool` + `pickRandomTheme(pool, used)`)
- Crée : `packages/games/gif-battle/src/themes.test.ts`
- Modifie : `packages/games/gif-battle/src/fsm.ts` + `src/room.ts` (pool injecté, `onStart` async)
- Modifie : `apps/server/src/server.ts` (branche le loader au boot)
- Crée : `apps/server/src/games/gif-battle-phrases.ts` (loader DB → SeedTheme)
- Crée : `packages/db/prisma/seed-sentences.mjs` (seed des ~300 phrases) + données `packages/db/data/gif-battle-sentences.json`
- Crée : `apps/web/lib/moderation.ts` (+ `apps/web/lib/__tests__/moderation.test.ts`)
- Modifie : `apps/web/app/api/ideas/route.ts` (réutilise `moderation.ts` — DRY)
- Crée : `apps/web/app/api/gif-battle/sentences/route.ts`
- Crée : `apps/web/components/games/gif-battle/SentenceProposeModal.tsx`

**Chantier A (UI)**
- Crée : `apps/web/components/games/gif-battle/useCountdown.ts`
- Crée : `apps/web/components/games/gif-battle/useGifBattleEvents.ts`
- Crée : `apps/web/components/games/gif-battle/GifBattleSettings.tsx`
- Crée : `apps/web/components/games/gif-battle/GifPicker.tsx`
- Crée : `apps/web/components/games/gif-battle/SubmissionGrid.tsx` (reveal + voting)
- Crée : `apps/web/components/games/gif-battle/RoundResults.tsx`
- Crée : `apps/web/components/games/gif-battle/GameEndScreen.tsx`
- Crée : `apps/web/components/games/gif-battle/GifBattleGame.tsx` (routeur par phase)
- Modifie : `apps/web/components/games/GameRoomShell.tsx` (rend `GifBattleGame`)
- Modifie : `apps/web/components/games/GameSettingsPanel.tsx` (rend `GifBattleSettings`)
- Supprime : `apps/web/components/games/PlaceholderGame.tsx`

**Tests E2E**
- Modifie : `apps/web/scripts/smoke.mjs` (protocole lobby actuel)

---

## Task 1 (C) : Boucle 10 manches

**Files:**
- Modify: `packages/games/gif-battle/src/constants.ts:6-16`
- Test: `packages/games/gif-battle/src/constants.test.ts` (créer)

- [ ] **Step 1: Écrire le test qui échoue**

Créer `packages/games/gif-battle/src/constants.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULTS, ROUNDS_OPTIONS } from './constants.js';

describe('rounds config', () => {
  it('propose 10 manches', () => {
    expect(ROUNDS_OPTIONS).toContain(10);
  });
  it('défaut à 10 manches', () => {
    expect(DEFAULTS.rounds).toBe(10);
  });
});
```

- [ ] **Step 2: Lancer le test → échec**

Run: `pnpm --filter @tabswitch/gif-battle test -- constants`
Expected: FAIL (`ROUNDS_OPTIONS` ne contient pas 10, `DEFAULTS.rounds` = 8).

- [ ] **Step 3: Implémenter**

Dans `constants.ts`, remplacer les deux lignes :

```ts
export const ROUNDS_OPTIONS = [3, 5, 8, 10, 15, 20] as const;
```

et dans l'objet `DEFAULTS` :

```ts
  rounds: 10 as const,
```

- [ ] **Step 4: Lancer le test → succès**

Run: `pnpm --filter @tabswitch/gif-battle test -- constants`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/games/gif-battle/src/constants.ts packages/games/gif-battle/src/constants.test.ts
git commit -m "feat(gif-battle): option 10 manches (défaut)"
```

---

## Task 2 (B) : Table GifBattleSentence + migration

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Modify: `packages/db/src/index.ts`
- Create: migration (générée)

- [ ] **Step 1: Ajouter le modèle au schéma**

Dans `packages/db/prisma/schema.prisma`, à la fin du fichier, ajouter :

```prisma
// ============ GIF Battle ============

model GifBattleSentence {
  id         String   @id @default(uuid()) @db.Uuid
  sentenceFr String   @db.VarChar(140)
  sentenceEn String   @db.VarChar(140)
  isApproved Boolean  @default(false)
  authorId   String?
  createdAt  DateTime @default(now())

  author User? @relation(fields: [authorId], references: [id], onDelete: SetNull)

  @@index([isApproved], map: "gif_battle_sentences_approved_idx")
  @@map("gif_battle_sentences")
}
```

- [ ] **Step 2: Ajouter la relation inverse sur User**

Dans le modèle `User` de `schema.prisma`, ajouter une ligne dans le bloc des relations (après `settings UserSettings?`) :

```prisma
  gifBattleSentences GifBattleSentence[]
```

- [ ] **Step 3: Générer la migration**

Run: `pnpm --filter @tabswitch/db migrate:dev --name gif_battle_sentences`
Expected: nouveau dossier `packages/db/prisma/migrations/<ts>_gif_battle_sentences/` créé, client régénéré, pas d'erreur.

(Si `DATABASE_URL` indisponible : `pnpm --filter @tabswitch/db generate` puis créer la migration à la main plus tard ; le client TS est nécessaire pour la suite.)

- [ ] **Step 4: Exporter le type généré**

Dans `packages/db/src/index.ts`, ajouter `GifBattleSentence` à la liste des types ré-exportés depuis `'../dist/client.js'` (après `UserSettings`) :

```ts
  UserSettings,
  GifBattleSentence,
```

- [ ] **Step 5: Vérifier le typecheck DB**

Run: `pnpm --filter @tabswitch/db typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/src/index.ts packages/db/prisma/migrations/
git commit -m "feat(db): table gif_battle_sentences"
```

---

## Task 3 (B) : Pool de phrases injectable (package jeu)

Le package reste pur : un setter module-level reçoit un loader optionnel. Sans loader → seed statique. `pickRandomTheme` prend désormais le pool en paramètre.

**Files:**
- Modify: `packages/games/gif-battle/src/themes.ts`
- Modify: `packages/games/gif-battle/src/fsm.ts:22-44`
- Modify: `packages/games/gif-battle/src/room.ts`
- Create: `packages/games/gif-battle/src/themes.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `packages/games/gif-battle/src/themes.test.ts` :

```ts
import { afterEach, describe, expect, it } from 'vitest';
import {
  ALL_SEED_THEMES,
  loadThemePool,
  pickRandomTheme,
  setCommunityPhraseLoader,
  type SeedTheme,
} from './themes.js';

afterEach(() => setCommunityPhraseLoader(null));

describe('loadThemePool', () => {
  it('sans loader → seed statique filtré par locale', async () => {
    const pool = await loadThemePool('fr');
    expect(pool.length).toBe(ALL_SEED_THEMES.filter((t) => t.locale === 'fr').length);
    expect(pool.every((t) => t.locale === 'fr')).toBe(true);
  });

  it('avec loader → fusionne les phrases communautaires', async () => {
    const extra: SeedTheme[] = [
      { id: 'db-1', locale: 'fr', text: 'phrase communautaire', category: 'community' },
    ];
    setCommunityPhraseLoader(async () => extra);
    const pool = await loadThemePool('fr');
    expect(pool.some((t) => t.id === 'db-1')).toBe(true);
  });

  it('loader qui throw → fallback silencieux sur le seed', async () => {
    setCommunityPhraseLoader(async () => {
      throw new Error('db down');
    });
    const pool = await loadThemePool('fr');
    expect(pool.length).toBeGreaterThan(0);
  });
});

describe('pickRandomTheme', () => {
  it('évite les thèmes déjà utilisés tant que possible', () => {
    const pool: SeedTheme[] = [
      { id: 'a', locale: 'fr', text: 'A', category: 'absurd' },
      { id: 'b', locale: 'fr', text: 'B', category: 'absurd' },
    ];
    const picked = pickRandomTheme(pool, new Set(['a']));
    expect(picked.id).toBe('b');
  });

  it('repioche dans tout le pool si tout est utilisé', () => {
    const pool: SeedTheme[] = [{ id: 'a', locale: 'fr', text: 'A', category: 'absurd' }];
    const picked = pickRandomTheme(pool, new Set(['a']));
    expect(picked.id).toBe('a');
  });
});
```

- [ ] **Step 2: Lancer → échec**

Run: `pnpm --filter @tabswitch/gif-battle test -- themes`
Expected: FAIL (`loadThemePool` / `setCommunityPhraseLoader` n'existent pas ; `pickRandomTheme` a l'ancienne signature `(locale, used)`).

- [ ] **Step 3: Réécrire themes.ts**

Remplacer le bas de `packages/games/gif-battle/src/themes.ts` (à partir de `export const ALL_SEED_THEMES`) par :

```ts
export const ALL_SEED_THEMES: SeedTheme[] = [...SEED_THEMES_FR, ...SEED_THEMES_EN];

/** Loader optionnel injecté par le serveur pour charger les phrases de la DB. */
export type CommunityPhraseLoader = (locale: Locale) => Promise<SeedTheme[]>;

let communityLoader: CommunityPhraseLoader | null = null;

/** Branché une fois au boot serveur. `null` désactive (tests / dev sans DB). */
export function setCommunityPhraseLoader(fn: CommunityPhraseLoader | null): void {
  communityLoader = fn;
}

/**
 * Pool de thèmes pour une locale : seed statique + phrases communautaires
 * (si un loader est branché). Tout échec du loader retombe sur le seed seul.
 */
export async function loadThemePool(locale: Locale): Promise<SeedTheme[]> {
  const base = ALL_SEED_THEMES.filter((t) => t.locale === locale);
  if (!communityLoader) return base;
  try {
    const community = await communityLoader(locale);
    return [...base, ...community];
  } catch {
    return base;
  }
}

/** Pioche un thème dans `pool`, en évitant `alreadyUsed` tant que possible. */
export function pickRandomTheme(pool: SeedTheme[], alreadyUsed: ReadonlySet<string>): SeedTheme {
  const fresh = pool.filter((t) => !alreadyUsed.has(t.id));
  const candidates = fresh.length > 0 ? fresh : pool;
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}
```

- [ ] **Step 4: Adapter le FSM pour piocher dans un pool**

Dans `packages/games/gif-battle/src/fsm.ts`, modifier `transitionToRoundIntro` pour accepter le pool. Remplacer sa signature et son corps de sélection :

```ts
export function transitionToRoundIntro(
  state: GifBattleState,
  themePool: import('./themes.js').SeedTheme[],
): GifBattleState {
  const usedIds = new Set(state.history.map((h) => h.themeId));
  const localePool = themePool.length > 0 ? themePool : ALL_SEED_THEMES.filter((t) => t.locale === state.settings.locale);
  const chosen = pickRandomTheme(localePool, usedIds);

  const number = (state.currentRound?.number ?? state.history.length) + 1;
  const now = Date.now();
  const introMs = DEFAULTS.introSeconds * 1000;
  state.status = 'ROUND_INTRO';
  state.currentRound = {
    number,
    themeId: chosen.id,
    themeText: chosen.text,
    startedAt: now,
    deadlineAt: now + introMs,
    submissions: [],
    votes: [],
    winnerSubmissionIds: [],
  };
  return state;
}
```

Mettre à jour les imports en tête de `fsm.ts` : remplacer `import { pickRandomTheme } from './themes.js';` par `import { ALL_SEED_THEMES, pickRandomTheme } from './themes.js';`.

Le `themeId` est désormais ajouté à `history` (déjà le cas dans `transitionAfterResults`, qui pousse `{ number, themeText, winnerSubmissionIds }` — ajouter `themeId`). Modifier l'objet poussé dans `transitionAfterResults` :

```ts
  state.history.push({
    number: finished.number,
    themeId: finished.themeId,
    themeText: finished.themeText,
    winnerSubmissionIds: finished.winnerSubmissionIds,
  });
```

Et `transitionAfterResults` doit pouvoir relancer une manche avec le pool : changer sa signature en `transitionAfterResults(state, themePool)` et son appel interne `transitionToRoundIntro(state)` → `transitionToRoundIntro(state, themePool)` (les deux occurrences).

- [ ] **Step 5: Mettre à jour le type history**

Dans `packages/games/gif-battle/src/state.ts`, ajouter `themeId` à `history` (interface `GifBattleState`) :

```ts
  history: Array<{
    number: number;
    themeId: ThemeId;
    themeText: string;
    winnerSubmissionIds: SubmissionId[];
  }>;
```

- [ ] **Step 6: Rendre la room consciente du pool**

Dans `packages/games/gif-battle/src/room.ts` :

a) Ajouter un champ pool + import :

```ts
import { loadThemePool } from './themes.js';
import type { SeedTheme } from './themes.js';
```

```ts
  private themePool: SeedTheme[] = [];
```

b) `onStart` devient async et charge le pool :

```ts
  async onStart(): Promise<void> {
    if (this.state.status !== 'WAITING') return;
    this.syncPlayers();
    this.themePool = await loadThemePool(this.state.settings.locale);
    this.startRound();
  }
```

c) Tous les appels `transitionToRoundIntro(this.state)` → `transitionToRoundIntro(this.state, this.themePool)` et `transitionAfterResults(this.state)` → `transitionAfterResults(this.state, this.themePool)`.

- [ ] **Step 7: Lancer toute la suite du package**

Run: `pnpm --filter @tabswitch/gif-battle test`
Expected: PASS (themes + fsm + scoring + outcomes). Corriger tout test fsm existant impacté par la nouvelle signature.

- [ ] **Step 8: Commit**

```bash
git add packages/games/gif-battle/src/
git commit -m "feat(gif-battle): pool de phrases injectable (seed + communautaire)"
```

---

## Task 4 (B) : Brancher le loader DB au boot serveur

**Files:**
- Create: `apps/server/src/games/gif-battle-phrases.ts`
- Modify: `apps/server/src/server.ts`

- [ ] **Step 1: Créer l'adaptateur DB → SeedTheme**

Créer `apps/server/src/games/gif-battle-phrases.ts` :

```ts
import { getDb } from '@tabswitch/db';
import { setCommunityPhraseLoader, type SeedTheme } from '@tabswitch/gif-battle';
import { log } from '../log.js';

/**
 * Branche le loader de phrases communautaires sur la DB. Appelé une fois au
 * boot. Les phrases approuvées (isApproved=true) rejoignent le pool de chaque
 * room à son démarrage, mappées selon la locale.
 */
export function wireGifBattlePhrases(): void {
  setCommunityPhraseLoader(async (locale): Promise<SeedTheme[]> => {
    const rows = await getDb().gifBattleSentence.findMany({
      where: { isApproved: true },
      select: { id: true, sentenceFr: true, sentenceEn: true },
    });
    return rows
      .map((r): SeedTheme | null => {
        const text = locale === 'en' ? r.sentenceEn : r.sentenceFr;
        if (!text || text.trim().length === 0) return null;
        return { id: `db-${r.id}`, locale, text, category: 'community' };
      })
      .filter((t): t is SeedTheme => t !== null);
  });
  log.info('gif-battle community phrase loader wired');
}
```

- [ ] **Step 2: Appeler au boot**

Dans `apps/server/src/server.ts`, ajouter l'import et l'appel dans `main()` avant `createIo(httpServer)` :

```ts
import { wireGifBattlePhrases } from './games/gif-battle-phrases.js';
```

```ts
  wireGifBattlePhrases();
  createIo(httpServer);
```

- [ ] **Step 3: Exporter SeedTheme depuis le package**

Vérifier que `SeedTheme` est exporté : `themes.ts` exporte déjà `export interface SeedTheme`, et `index.ts` fait `export * from './themes.js'`. Aucun changement attendu.

- [ ] **Step 4: Typecheck serveur**

Run: `pnpm --filter @tabswitch/server typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/games/gif-battle-phrases.ts apps/server/src/server.ts
git commit -m "feat(server): branche le loader de phrases gif-battle au boot"
```

---

## Task 5 (B) : Seed des ~300 phrases bilingues

**Files:**
- Create: `packages/db/data/gif-battle-sentences.json`
- Create: `packages/db/prisma/seed-sentences.mjs`
- Modify: `packages/db/package.json` (script `seed:sentences`)

- [ ] **Step 1: Créer le jeu de données**

Créer `packages/db/data/gif-battle-sentences.json` — un tableau d'objets `{ "fr": "...", "en": "..." }`. Démarrer avec un noyau de qualité (l'agent complète jusqu'à ~300 ; varier les registres : quotidien, relations, internet/memes, culture pop, absurde, tech/work). Exemple de format (au moins ce contenu, à étendre) :

```json
[
  { "fr": "quand le dev push sur main le vendredi", "en": "when the dev pushes to main on Friday" },
  { "fr": "moi en train d'expliquer que je vais me coucher tôt", "en": "me explaining how I'm going to bed early tonight" },
  { "fr": "quand mamie découvre les vocaux WhatsApp", "en": "when grandma discovers WhatsApp voice notes" },
  { "fr": "ma motivation le lundi matin", "en": "my motivation on Monday morning" },
  { "fr": "quand le wifi revient après 3 secondes de panique", "en": "when the wifi comes back after 3 seconds of panic" },
  { "fr": "moi devant le frigo pour la 4e fois", "en": "me staring into the fridge for the 4th time" },
  { "fr": "quand quelqu'un dit \"on se fait ça vite fait\"", "en": "when someone says \"let's just do this real quick\"" },
  { "fr": "ma tête quand on me parle avant mon café", "en": "my face when someone talks to me before my coffee" },
  { "fr": "quand le livreur sonne et que je suis pas habillé", "en": "when the delivery guy rings and I'm not dressed" },
  { "fr": "moi qui promets de ne plus jamais procrastiner", "en": "me promising to never procrastinate again" }
]
```

> Cible : ~300 entrées. Pas de doublons. Chaque champ ≤ 140 caractères.

- [ ] **Step 2: Écrire le script de seed (idempotent)**

Créer `packages/db/prisma/seed-sentences.mjs` :

```js
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/client.js';

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = join(here, '..', 'data', 'gif-battle-sentences.json');

async function main() {
  const raw = await readFile(dataPath, 'utf8');
  const rows = JSON.parse(raw);
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manquant');
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });

  let created = 0;
  for (const r of rows) {
    const fr = String(r.fr ?? '').trim().slice(0, 140);
    const en = String(r.en ?? '').trim().slice(0, 140);
    if (!fr || !en) continue;
    // Idempotent : on ne ré-insère pas une phrase FR officielle déjà présente.
    const existing = await db.gifBattleSentence.findFirst({
      where: { sentenceFr: fr, authorId: null },
      select: { id: true },
    });
    if (existing) continue;
    await db.gifBattleSentence.create({
      data: { sentenceFr: fr, sentenceEn: en, isApproved: true, authorId: null },
    });
    created++;
  }
  console.log(`seed gif-battle: ${created} phrases insérées (${rows.length} dans le fichier)`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 3: Ajouter le script package**

Dans `packages/db/package.json`, ajouter à `scripts` :

```json
    "seed:sentences": "node prisma/seed-sentences.mjs",
```

- [ ] **Step 4: Lancer le seed**

Run: `pnpm --filter @tabswitch/db seed:sentences`
Expected: `seed gif-battle: N phrases insérées`. Relancer une 2e fois → `0 phrases insérées` (idempotence).

(Sans `DATABASE_URL` : le script échoue proprement ; le seed se fera au déploiement.)

- [ ] **Step 5: Commit**

```bash
git add packages/db/data/gif-battle-sentences.json packages/db/prisma/seed-sentences.mjs packages/db/package.json
git commit -m "feat(db): seed des phrases gif-battle bilingues"
```

---

## Task 6 (B) : Moderation lib + route POST de proposition

**Files:**
- Create: `apps/web/lib/moderation.ts`
- Create: `apps/web/lib/__tests__/moderation.test.ts`
- Modify: `apps/web/app/api/ideas/route.ts` (réutilise le lib — DRY)
- Create: `apps/web/app/api/gif-battle/sentences/route.ts`

- [ ] **Step 1: Écrire le test du lib**

Créer `apps/web/lib/__tests__/moderation.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { looksAbusive, slugify } from '../moderation';

describe('looksAbusive', () => {
  it('détecte la profanité (insensible à la casse)', () => {
    expect(looksAbusive('espèce de CONNARD')).toBe(true);
  });
  it('laisse passer un texte sain', () => {
    expect(looksAbusive('quand le chat fait tomber le verre')).toBe(false);
  });
});

describe('slugify', () => {
  it('normalise accents/espaces/casse', () => {
    expect(slugify('Quand Mamie Découvre  ChatGPT')).toBe('quand-mamie-decouvre-chatgpt');
  });
});
```

- [ ] **Step 2: Lancer → échec**

Run: `pnpm --filter @tabswitch/web test -- moderation`
Expected: FAIL (module absent).

- [ ] **Step 3: Créer le lib**

Créer `apps/web/lib/moderation.ts` :

```ts
const PROFANITY = ['putain', 'salaud', 'connard', 'enculé']; // remplacer par un vrai modérateur plus tard

export function looksAbusive(text: string): boolean {
  const t = text.toLowerCase();
  return PROFANITY.some((w) => t.includes(w));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 160);
}
```

- [ ] **Step 4: Lancer → succès**

Run: `pnpm --filter @tabswitch/web test -- moderation`
Expected: PASS.

- [ ] **Step 5: DRY — faire pointer le route ideas vers le lib**

Dans `apps/web/app/api/ideas/route.ts` : supprimer les définitions locales `PROFANITY`, `looksAbusive`, `slugify` et ajouter en tête `import { looksAbusive, slugify } from '@/lib/moderation';`. (Le `slugify` du lib coupe à 160 ; le champ Idea.slug est `VarChar(140)` — ajuster l'usage : `slugify(parsed.data.title).slice(0, 140)`.)

- [ ] **Step 6: Créer la route de proposition de phrase**

Créer `apps/web/app/api/gif-battle/sentences/route.ts` :

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getDb } from '@tabswitch/db';
import { looksAbusive } from '@/lib/moderation';

const CreateSentenceSchema = z.object({
  sentenceFr: z.string().trim().min(4, 'Phrase FR trop courte').max(140, 'Phrase FR trop longue'),
  sentenceEn: z.string().trim().min(4, 'Phrase EN trop courte').max(140, 'Phrase EN trop longue'),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Connecte-toi pour proposer.' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON invalide' }, { status: 400 });
  }

  const parsed = CreateSentenceSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' },
      { status: 400 },
    );
  }
  if (looksAbusive(parsed.data.sentenceFr + ' ' + parsed.data.sentenceEn)) {
    return NextResponse.json({ ok: false, error: 'Contenu refusé.' }, { status: 400 });
  }

  try {
    const db = getDb();
    // Dédup simple : même phrase FR déjà proposée.
    const dup = await db.gifBattleSentence.findFirst({
      where: { sentenceFr: parsed.data.sentenceFr },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json({ ok: false, error: 'Cette phrase existe déjà.' }, { status: 409 });
    }
    const created = await db.gifBattleSentence.create({
      data: {
        sentenceFr: parsed.data.sentenceFr,
        sentenceEn: parsed.data.sentenceEn,
        isApproved: false,
        authorId: userId,
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch {
    return NextResponse.json({ ok: false, error: 'Erreur serveur.' }, { status: 500 });
  }
}
```

- [ ] **Step 7: Vérifier (typecheck + tests web)**

Run: `pnpm --filter @tabswitch/web typecheck && pnpm --filter @tabswitch/web test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/moderation.ts apps/web/lib/__tests__/moderation.test.ts apps/web/app/api/ideas/route.ts apps/web/app/api/gif-battle/sentences/route.ts
git commit -m "feat(web): proposition de phrases gif-battle + lib moderation partagé"
```

---

## Task 7 (B) : Modal "proposer une phrase"

**Files:**
- Create: `apps/web/components/games/gif-battle/SentenceProposeModal.tsx`

(Branché dans le settings panel à la Task 9.)

- [ ] **Step 1: Créer le composant**

Créer `apps/web/components/games/gif-battle/SentenceProposeModal.tsx` :

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export function SentenceProposeModal({ onClose }: { onClose: () => void }) {
  const [fr, setFr] = useState('');
  const [en, setEn] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/gif-battle/sentences', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sentenceFr: fr, sentenceEn: en }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Erreur');
        return;
      }
      setDone(true);
      setFr('');
      setEn('');
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101014] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">➕ Proposer une phrase</h2>
          <button onClick={onClose} className="text-[color:var(--color-fg-muted)] hover:text-white" aria-label="Fermer">
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
          Elle sera validée à la main avant d&apos;entrer en rotation.
        </p>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <label className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)]">
            🇫🇷 Version française
            <input
              value={fr}
              onChange={(e) => setFr(e.target.value.slice(0, 140))}
              maxLength={140}
              placeholder="quand le chat fait tomber le verre"
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none focus:border-white/40"
            />
          </label>
          <label className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)]">
            🇬🇧 English version
            <input
              value={en}
              onChange={(e) => setEn(e.target.value.slice(0, 140))}
              maxLength={140}
              placeholder="when the cat knocks the glass off"
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none focus:border-white/40"
            />
          </label>
          {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
          {done && !error && <p className="text-sm text-emerald-300">✓ Proposée, merci !</p>}
          <Button type="submit" variant="accent" disabled={submitting || fr.trim().length < 4 || en.trim().length < 4}>
            {submitting ? 'Envoi…' : 'Proposer'}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @tabswitch/web typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/games/gif-battle/SentenceProposeModal.tsx
git commit -m "feat(web): modal de proposition de phrase gif-battle"
```

---

## Task 8 (A) : Hooks countdown + événements

**Files:**
- Create: `apps/web/components/games/gif-battle/useCountdown.ts`
- Create: `apps/web/components/games/gif-battle/useGifBattleEvents.ts`

- [ ] **Step 1: Hook countdown (anti-drift)**

Créer `apps/web/components/games/gif-battle/useCountdown.ts` :

```ts
'use client';

import { useEffect, useState } from 'react';

/**
 * Secondes restantes jusqu'à `deadlineAt` (ms epoch serveur). `serverTime` (ms
 * epoch du snapshot) corrige le décalage d'horloge client/serveur.
 */
export function useCountdown(deadlineAt: number | undefined, serverTime: number | undefined): number {
  const [, tick] = useState(0);
  useEffect(() => {
    if (deadlineAt == null) return;
    const id = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [deadlineAt]);
  if (deadlineAt == null) return 0;
  const offset = serverTime != null ? serverTime - Date.now() : 0;
  const remainingMs = deadlineAt - (Date.now() + offset);
  return Math.max(0, Math.ceil(remainingMs / 1000));
}
```

- [ ] **Step 2: Hook événements**

Créer `apps/web/components/games/gif-battle/useGifBattleEvents.ts` :

```ts
'use client';

import { useEffect, useState } from 'react';
import {
  GIF_BATTLE_SERVER_EVENTS,
  type GameEndedPayload,
  type RoundResultsPayload,
} from '@tabswitch/gif-battle';
import { getSocket, onGameEvent } from '@/lib/socket';

export interface ReactionFlash {
  id: number;
  submissionId: string;
  emoji: string;
}

export interface GifBattleLiveEvents {
  results: RoundResultsPayload | null;
  gameEnded: GameEndedPayload | null;
  reactions: ReactionFlash[];
}

/**
 * Capte les payloads serveur plus riches que le snapshot anonyme :
 * - `round:results` (propriétaires, votes par carte, deltas)
 * - `game:ended` (trophées, scores finaux, shareToken)
 * - `reaction:broadcast` (flashs éphémères)
 */
export function useGifBattleEvents(roundNumber: number | undefined): GifBattleLiveEvents {
  const [results, setResults] = useState<RoundResultsPayload | null>(null);
  const [gameEnded, setGameEnded] = useState<GameEndedPayload | null>(null);
  const [reactions, setReactions] = useState<ReactionFlash[]>([]);

  // Reset des résultats quand une nouvelle manche commence.
  useEffect(() => {
    setResults(null);
  }, [roundNumber]);

  useEffect(() => {
    const socket = getSocket();
    let counter = 0;
    const offResults = onGameEvent<RoundResultsPayload>(
      socket,
      GIF_BATTLE_SERVER_EVENTS.RoundResults,
      (p) => setResults(p),
    );
    const offEnded = onGameEvent<GameEndedPayload>(
      socket,
      GIF_BATTLE_SERVER_EVENTS.GameEnded,
      (p) => setGameEnded(p),
    );
    const offReaction = onGameEvent<{ submissionId: string; emoji: string }>(
      socket,
      GIF_BATTLE_SERVER_EVENTS.ReactionBroadcast,
      (p) => {
        const id = counter++;
        setReactions((rs) => [...rs, { id, submissionId: p.submissionId, emoji: p.emoji }]);
        setTimeout(() => setReactions((rs) => rs.filter((r) => r.id !== id)), 1500);
      },
    );
    return () => {
      offResults();
      offEnded();
      offReaction();
    };
  }, []);

  return { results, gameEnded, reactions };
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @tabswitch/web typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/games/gif-battle/useCountdown.ts apps/web/components/games/gif-battle/useGifBattleEvents.ts
git commit -m "feat(web): hooks countdown + events gif-battle"
```

---

## Task 9 (A) : Settings panel (lobby)

**Files:**
- Create: `apps/web/components/games/gif-battle/GifBattleSettings.tsx`

- [ ] **Step 1: Créer le composant**

Créer `apps/web/components/games/gif-battle/GifBattleSettings.tsx` :

```tsx
'use client';

import { useState } from 'react';
import type { LobbySnapshot } from '@tabswitch/types';
import {
  GIF_BATTLE_EVENTS,
  PICK_SECONDS_OPTIONS,
  ROUNDS_OPTIONS,
  VOTE_SECONDS_OPTIONS,
  type GifBattleClientView,
} from '@tabswitch/gif-battle';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { gameAction, getSocket } from '@/lib/socket';
import { SentenceProposeModal } from './SentenceProposeModal';

export function GifBattleSettings({ snapshot }: { snapshot: LobbySnapshot }) {
  const view = snapshot.gameState as GifBattleClientView | null;
  const [proposing, setProposing] = useState(false);
  if (!view) return null;
  const editable = snapshot.you.isHost && snapshot.room.status === 'LOBBY';
  const s = view.settings;

  async function update(patch: Record<string, unknown>) {
    const ack = await gameAction(getSocket(), GIF_BATTLE_EVENTS.SettingsUpdate, patch);
    if (!ack.ok) alert(ack.message);
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Réglages</h2>
        <Button variant="ghost" size="sm" onClick={() => setProposing(true)}>
          ➕ proposer une phrase
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <OptionRow
          label="Manches"
          value={s.rounds}
          options={ROUNDS_OPTIONS}
          editable={editable}
          onChange={(v) => update({ rounds: v })}
        />
        <OptionRow
          label="Temps de pick (s)"
          value={s.pickSeconds}
          options={PICK_SECONDS_OPTIONS}
          editable={editable}
          onChange={(v) => update({ pickSeconds: v })}
        />
        <OptionRow
          label="Temps de vote (s)"
          value={s.voteSeconds}
          options={VOTE_SECONDS_OPTIONS}
          editable={editable}
          onChange={(v) => update({ voteSeconds: v })}
        />
        <div>
          <span className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)]">Langue</span>
          <div className="mt-1 flex gap-2">
            {(['fr', 'en'] as const).map((loc) => (
              <button
                key={loc}
                type="button"
                disabled={!editable}
                onClick={() => update({ locale: loc })}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  s.locale === loc ? 'border-white/40 bg-white/10' : 'border-white/10'
                } disabled:opacity-60`}
              >
                {loc === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
              </button>
            ))}
          </div>
        </div>
      </div>
      {proposing && <SentenceProposeModal onClose={() => setProposing(false)} />}
    </Card>
  );
}

function OptionRow({
  label,
  value,
  options,
  editable,
  onChange,
}: {
  label: string;
  value: number;
  options: readonly number[];
  editable: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <span className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)]">{label}</span>
      <div className="mt-1 flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={!editable}
            onClick={() => onChange(opt)}
            className={`rounded-lg border px-3 py-1.5 text-sm tabular-nums ${
              value === opt ? 'border-white/40 bg-white/10' : 'border-white/10'
            } disabled:opacity-60`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @tabswitch/web typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/games/gif-battle/GifBattleSettings.tsx
git commit -m "feat(web): settings panel gif-battle"
```

---

## Task 10 (A) : GIF Picker (phase PICKING)

**Files:**
- Create: `apps/web/components/games/gif-battle/GifPicker.tsx`

- [ ] **Step 1: Créer le composant**

Créer `apps/web/components/games/gif-battle/GifPicker.tsx` :

```tsx
'use client';

import { useEffect, useState } from 'react';
import { GIF_BATTLE_EVENTS, type GifBattleClientView } from '@tabswitch/gif-battle';
import { Button } from '@/components/ui/Button';
import { gameAction, getSocket } from '@/lib/socket';

interface GifResult {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  description?: string;
}

export function GifPicker({ view, secondsLeft }: { view: GifBattleClientView; secondsLeft: number }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const round = view.currentRound;
  const submitted = view.you.submittedThisRound;

  // Recherche (debounce léger). Vide → trending.
  useEffect(() => {
    let active = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: query,
          locale: view.settings.locale,
          rating: view.settings.gifRating,
        });
        const res = await fetch(`/api/gif/search?${params.toString()}`);
        const data = await res.json();
        if (active) setResults(data.results ?? []);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, view.settings.locale, view.settings.gifRating]);

  async function choose(g: GifResult) {
    setSubmittingId(g.id);
    const ack = await gameAction(getSocket(), GIF_BATTLE_EVENTS.RoundSubmit, {
      gifId: g.id,
      gifUrl: g.url,
      previewUrl: g.previewUrl,
      width: g.width,
      height: g.height,
    });
    setSubmittingId(null);
    if (!ack.ok) alert(ack.message);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">
          Manche {round?.number} · {secondsLeft}s
        </div>
        <p className="font-display mt-2 text-2xl font-bold">{round?.themeText}</p>
        {submitted && <p className="mt-2 text-sm text-emerald-300">✓ GIF soumis — tu peux encore changer</p>}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cherche un GIF…"
        className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none focus:border-white/40"
      />

      {loading && results.length === 0 ? (
        <p className="text-center text-sm text-[color:var(--color-fg-muted)]">Recherche…</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {results.map((g) => {
            const isMine = view.you.submittedThisRound && submittingId === null;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => choose(g)}
                disabled={submittingId !== null}
                className={`group relative overflow-hidden rounded-xl border border-white/10 transition hover:border-white/40 ${
                  submittingId === g.id ? 'animate-pulse ring-2 ring-emerald-400' : ''
                }`}
                title={g.description}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.previewUrl} alt={g.description ?? 'gif'} className="h-32 w-full object-cover" loading="lazy" />
                <span className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-black/40 text-sm font-semibold group-hover:flex">
                  {isMine ? 'Remplacer' : 'Choisir'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @tabswitch/web typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/games/gif-battle/GifPicker.tsx
git commit -m "feat(web): gif picker (phase pick)"
```

---

## Task 11 (A) : Grille de soumissions (reveal + vote + réactions)

**Files:**
- Create: `apps/web/components/games/gif-battle/SubmissionGrid.tsx`

- [ ] **Step 1: Créer le composant**

Créer `apps/web/components/games/gif-battle/SubmissionGrid.tsx` :

```tsx
'use client';

import {
  GIF_BATTLE_EVENTS,
  REACTION_EMOJIS,
  type GifBattleClientView,
} from '@tabswitch/gif-battle';
import { gameAction, getSocket } from '@/lib/socket';
import type { ReactionFlash } from './useGifBattleEvents';

const EMOJI_GLYPH: Record<string, string> = {
  sparkles: '✨',
  laugh: '😂',
  skull: '💀',
  fire: '🔥',
  cry: '😭',
  clown: '🤡',
};

export function SubmissionGrid({
  view,
  secondsLeft,
  reactions,
}: {
  view: GifBattleClientView;
  secondsLeft: number;
  reactions: ReactionFlash[];
}) {
  const round = view.currentRound;
  if (!round) return null;
  const voting = view.status === 'ROUND_VOTING';
  const myVote = view.you.votedSubmissionId;

  async function vote(submissionId: string) {
    if (!voting) return;
    if (submissionId === view.you.mySubmissionId) return;
    const event = myVote === submissionId ? GIF_BATTLE_EVENTS.RoundUnvote : GIF_BATTLE_EVENTS.RoundVote;
    const ack = await gameAction(getSocket(), event, { submissionId });
    if (!ack.ok) alert(ack.message);
  }

  async function react(submissionId: string, emoji: string) {
    await gameAction(getSocket(), GIF_BATTLE_EVENTS.ReactionSend, { submissionId, emoji });
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="text-center text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">
        {voting ? `Vote · ${secondsLeft}s` : 'Révélation…'} · {round.themeText}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {round.submissions.map((sub, i) => {
          const isMine = sub.id === view.you.mySubmissionId;
          const isVoted = myVote === sub.id;
          const flashes = reactions.filter((r) => r.submissionId === sub.id);
          return (
            <div
              key={sub.id}
              className={`relative overflow-hidden rounded-xl border transition ${
                isVoted ? 'border-emerald-400 ring-2 ring-emerald-400' : 'border-white/10'
              }`}
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <button
                type="button"
                onClick={() => vote(sub.id)}
                disabled={!voting || isMine}
                className="block w-full disabled:cursor-default"
                title={isMine ? 'Ton GIF' : voting ? (isVoted ? 'Retirer le vote' : 'Voter') : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sub.gifUrl || sub.previewUrl} alt="gif" className="h-48 w-full object-contain bg-black/40" />
              </button>
              {isMine && (
                <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                  toi
                </span>
              )}
              {flashes.map((f) => (
                <span key={f.id} className="absolute right-2 top-2 animate-bounce text-2xl">
                  {EMOJI_GLYPH[f.emoji] ?? '✨'}
                </span>
              ))}
              <div className="flex justify-center gap-1 bg-black/30 py-1">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => react(sub.id, emoji)}
                    className="rounded px-1 text-lg transition hover:scale-125"
                    aria-label={`réagir ${emoji}`}
                  >
                    {EMOJI_GLYPH[emoji]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @tabswitch/web typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/games/gif-battle/SubmissionGrid.tsx
git commit -m "feat(web): grille reveal/vote + réactions"
```

---

## Task 12 (A) : Résultats de manche + intro

**Files:**
- Create: `apps/web/components/games/gif-battle/RoundResults.tsx`

- [ ] **Step 1: Créer le composant**

Créer `apps/web/components/games/gif-battle/RoundResults.tsx` :

```tsx
'use client';

import type { RoundResultsPayload } from '@tabswitch/gif-battle';

export function RoundResults({ results }: { results: RoundResultsPayload }) {
  const sorted = [...results.submissions].sort((a, b) => b.voteCount - a.voteCount);
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-center text-2xl font-bold">Résultats — manche {results.roundNumber}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sorted.map((sub) => {
          const delta = results.scoreDeltas.find((d) => d.playerId === sub.playerId);
          return (
            <div
              key={sub.id}
              className={`overflow-hidden rounded-xl border ${
                sub.isWinner ? 'border-amber-400 ring-2 ring-amber-400' : 'border-white/10'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sub.gifUrl || sub.previewUrl} alt="gif" className="h-40 w-full object-contain bg-black/40" />
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="truncate">
                  {sub.isWinner && '👑 '}
                  {sub.nickname}
                </span>
                <span className="tabular-nums text-[color:var(--color-fg-muted)]">
                  {sub.voteCount} vote{sub.voteCount > 1 ? 's' : ''}
                  {delta ? ` · +${delta.delta}` : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @tabswitch/web typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/games/gif-battle/RoundResults.tsx
git commit -m "feat(web): écran résultats de manche"
```

---

## Task 13 (A) : Écran de fin de partie

**Files:**
- Create: `apps/web/components/games/gif-battle/GameEndScreen.tsx`

- [ ] **Step 1: Créer le composant**

Créer `apps/web/components/games/gif-battle/GameEndScreen.tsx` :

```tsx
'use client';

import { useState } from 'react';
import type { GameEndedPayload } from '@tabswitch/gif-battle';
import { Button } from '@/components/ui/Button';
import { getSocket } from '@/lib/socket';

export function GameEndScreen({
  payload,
  isHost,
}: {
  payload: GameEndedPayload;
  isHost: boolean;
}) {
  const [restarting, setRestarting] = useState(false);

  function rematch() {
    setRestarting(true);
    getSocket().emit('lobby:start', {}, (ack) => {
      setRestarting(false);
      if (!ack.ok) alert(ack.message);
    });
  }

  function copyShare() {
    if (typeof window === 'undefined') return;
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
  }

  return (
    <section className="flex flex-col items-center gap-6">
      <h2 className="font-display text-3xl font-extrabold">🏆 Classement final</h2>
      <ol className="w-full max-w-md space-y-2">
        {payload.finalScores.map((p) => {
          const trophies = payload.trophies.filter((t) => t.playerId === p.playerId);
          return (
            <li
              key={p.playerId}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                p.rank === 1 ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="tabular-nums text-[color:var(--color-fg-muted)]">#{p.rank}</span>
                <span className="font-medium">{p.nickname}</span>
                {trophies.map((t) => (
                  <span key={t.key} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase">
                    {t.label}
                  </span>
                ))}
              </span>
              <span className="tabular-nums font-bold">{p.score}</span>
            </li>
          );
        })}
      </ol>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={copyShare}>
          Copier le lien
        </Button>
        {isHost ? (
          <Button variant="accent" onClick={rematch} disabled={restarting}>
            {restarting ? 'Redémarrage…' : 'Rejouer'}
          </Button>
        ) : (
          <p className="self-center text-xs text-[color:var(--color-fg-muted)]">En attente du host…</p>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @tabswitch/web typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/games/gif-battle/GameEndScreen.tsx
git commit -m "feat(web): écran de fin de partie gif-battle"
```

---

## Task 14 (A) : Routeur racine + branchement dans le shell

**Files:**
- Create: `apps/web/components/games/gif-battle/GifBattleGame.tsx`
- Modify: `apps/web/components/games/GameRoomShell.tsx`
- Modify: `apps/web/components/games/GameSettingsPanel.tsx`
- Delete: `apps/web/components/games/PlaceholderGame.tsx`

- [ ] **Step 1: Créer le routeur par phase**

Créer `apps/web/components/games/gif-battle/GifBattleGame.tsx` :

```tsx
'use client';

import type { LobbySnapshot } from '@tabswitch/types';
import type { GifBattleClientView } from '@tabswitch/gif-battle';
import { Card } from '@/components/ui/Card';
import { useCountdown } from './useCountdown';
import { useGifBattleEvents } from './useGifBattleEvents';
import { GifPicker } from './GifPicker';
import { SubmissionGrid } from './SubmissionGrid';
import { RoundResults } from './RoundResults';
import { GameEndScreen } from './GameEndScreen';

export function GifBattleGame({ snapshot }: { snapshot: LobbySnapshot }) {
  const view = snapshot.gameState as GifBattleClientView | null | undefined;
  const round = view?.currentRound;
  const secondsLeft = useCountdown(round?.deadlineAt, snapshot.serverTime);
  const { results, gameEnded, reactions } = useGifBattleEvents(round?.number);

  if (!view) {
    return <Card><p className="text-center text-sm">Chargement…</p></Card>;
  }

  switch (view.status) {
    case 'ROUND_INTRO':
      return (
        <Card>
          <div className="py-10 text-center">
            <div className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">
              Manche {round?.number} / {view.settings.rounds}
            </div>
            <p className="font-display mt-3 text-3xl font-bold">{round?.themeText}</p>
            <p className="mt-4 text-5xl font-extrabold tabular-nums">{secondsLeft}</p>
          </div>
        </Card>
      );
    case 'ROUND_PICKING':
      return <GifPicker view={view} secondsLeft={secondsLeft} />;
    case 'ROUND_PRE_REVEAL':
    case 'ROUND_REVEALING':
    case 'ROUND_VOTING':
      return <SubmissionGrid view={view} secondsLeft={secondsLeft} reactions={reactions} />;
    case 'ROUND_RESULTS':
      return results ? (
        <RoundResults results={results} />
      ) : (
        <Card><p className="text-center text-sm">Calcul des votes…</p></Card>
      );
    case 'GAME_END':
      return gameEnded ? (
        <GameEndScreen payload={gameEnded} isHost={snapshot.you.isHost} />
      ) : (
        <Card><p className="text-center text-sm">Fin de partie…</p></Card>
      );
    default:
      return <Card><p className="text-center text-sm">En attente…</p></Card>;
  }
}
```

- [ ] **Step 2: Brancher dans GameRoomShell**

Dans `apps/web/components/games/GameRoomShell.tsx` :

- Remplacer l'import `import { PlaceholderGame } from '@/components/games/PlaceholderGame';` par `import { GifBattleGame } from '@/components/games/gif-battle/GifBattleGame';`.
- Dans `GameView`, remplacer la dernière ligne `return <PlaceholderGame gameType="gif-battle" />;` par :

```tsx
  if (gameType === 'gif-battle') return <GifBattleGame snapshot={snapshot} />;
  return null;
```

- [ ] **Step 3: Brancher dans GameSettingsPanel**

Dans `apps/web/components/games/GameSettingsPanel.tsx` :

- Ajouter l'import `import { GifBattleSettings } from './gif-battle/GifBattleSettings';`.
- Ajouter avant le `return null;` final :

```tsx
  if (gameType === 'gif-battle') return <GifBattleSettings snapshot={snapshot} />;
```

- [ ] **Step 4: Supprimer le placeholder**

Run: `git rm apps/web/components/games/PlaceholderGame.tsx`
Expected: fichier supprimé (plus aucune référence après steps 2-3).

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @tabswitch/web typecheck`
Expected: PASS (zéro référence résiduelle à `PlaceholderGame`).

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/games/
git commit -m "feat(web): branche l'UI gif-battle, retire le placeholder"
```

---

## Task 15 : Smoke E2E (protocole lobby) + vérification finale

Le `smoke.mjs` actuel utilise l'ancien protocole `room:*` (pré-hub) et est cassé. On le réécrit pour `lobby:*` + `game:action`.

**Files:**
- Modify: `apps/web/scripts/smoke.mjs`

- [ ] **Step 1: Réécrire le smoke test**

Remplacer intégralement `apps/web/scripts/smoke.mjs` par :

```js
// Smoke E2E gif-battle : 3 clients créent/rejoignent une room, le host lance,
// chaque joueur soumet un GIF puis vote, on observe résultats + fin de partie.
// Prérequis : serveur realtime up (pnpm --filter @tabswitch/server dev).
// Run : RT_URL=http://localhost:4000 node apps/web/scripts/smoke.mjs
import { io as createSocket } from 'socket.io-client';

const RT = process.env.RT_URL ?? 'http://localhost:4000';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

function mkClient(label) {
  const socket = createSocket(RT, { transports: ['websocket'], reconnection: false });
  socket.on('lobby:state', (snap) => {
    const gs = snap.gameState;
    console.log(`[${label}] status=${snap.room.status} gameStatus=${gs?.status ?? '-'} round=${gs?.currentRound?.number ?? '-'}`);
  });
  socket.on('game:event', ({ event, payload }) => {
    if (event === 'round:results') console.log(`[${label}] results winners=${payload.winnerSubmissionIds.length}`);
    if (event === 'game:ended') console.log(`[${label}] ENDED top=${payload.finalScores[0]?.nickname} ${payload.finalScores[0]?.score}`);
  });
  return socket;
}

function emit(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} timeout`)), 6000);
    socket.emit(event, payload ?? {}, (ack) => {
      clearTimeout(timer);
      if (!ack?.ok) return reject(new Error(`${event} → ${ack?.code}: ${ack?.message}`));
      resolve(ack);
    });
  });
}

function action(socket, event, payload) {
  return emit(socket, 'game:action', { event, payload });
}

const SUB = (n) => ({
  gifId: `g${n}`,
  gifUrl: `https://media.tenor.com/g${n}/x.gif`,
  previewUrl: `https://media.tenor.com/g${n}/x-tiny.gif`,
  width: 480,
  height: 270,
});

async function main() {
  const A = mkClient('A');
  const B = mkClient('B');
  const C = mkClient('C');
  await Promise.all([A, B, C].map((s) => new Promise((r) => s.on('connect', r))));

  const created = await emit(A, 'lobby:create', { gameType: 'gif-battle', nickname: 'Alice' });
  const code = created.data.code;
  console.log(`>> room ${code}`);
  await emit(B, 'lobby:join', { code, nickname: 'Bob' });
  await emit(C, 'lobby:join', { code, nickname: 'Charlie' });

  // 3 manches courtes pour le smoke
  await action(A, 'settings:update', { rounds: 3, pickSeconds: 30, voteSeconds: 20 });
  await pause(150);
  await emit(A, 'lobby:start');
  console.log('>> started');

  for (let r = 1; r <= 3; r++) {
    await pause(3500); // intro → picking
    const sa = await action(A, 'round:submit', SUB(1));
    const sb = await action(B, 'round:submit', SUB(2));
    const sc = await action(C, 'round:submit', SUB(3));
    console.log(`>> round ${r} submitted`);
    await pause(7500); // pre-reveal + reveal
    await action(A, 'round:vote', { submissionId: sb.data.submissionId });
    await action(B, 'round:vote', { submissionId: sa.data.submissionId });
    await action(C, 'round:vote', { submissionId: sa.data.submissionId });
    console.log(`>> round ${r} voted`);
    await pause(r < 3 ? 11500 : 9000); // results (8s) + intro suivant / game:ended
  }

  console.log('>> cycle complet');
  A.disconnect(); B.disconnect(); C.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error('SMOKE FAILED:', e.message);
  process.exit(1);
});
```

- [ ] **Step 2: Lancer le serveur puis le smoke**

Terminal 1 : `pnpm --filter @tabswitch/server dev`
Terminal 2 : `node apps/web/scripts/smoke.mjs`
Expected : logs `round N submitted` / `round N voted` pour 3 manches, puis `ENDED top=...`, exit 0. (Le picker GIF n'est pas sollicité ici — les URLs tenor mockées passent l'allowlist serveur.)

- [ ] **Step 3: Vérification globale du monorepo**

Run: `pnpm typecheck`
Expected: 8/8 packages PASS.

Run: `pnpm --filter @tabswitch/gif-battle test`
Expected: PASS.

- [ ] **Step 4: Vérif manuelle navigateur (smoke visuel)**

Terminaux : `pnpm --filter @tabswitch/server dev` + `pnpm --filter @tabswitch/web dev`.
Ouvrir `/games/gif-battle`, créer une room, ouvrir l'URL dans 2 autres onglets (pseudos différents), lancer la partie. Vérifier : carte thème + countdown, recherche GIF + sélection, révélation, vote, écran résultats, écran de fin avec classement + rejouer. Tester « ➕ proposer une phrase » (connecté).

- [ ] **Step 5: Commit**

```bash
git add apps/web/scripts/smoke.mjs
git commit -m "test(gif-battle): smoke E2E sur le protocole lobby actuel"
```

---

## Self-review (effectué)

**Couverture du spec :**
- Chantier A (UI parité serveur) → Tasks 8-14 : intro, picking (picker + recherche), reveal/voting (+réactions), results (deltas), game end (trophées + partage + rejouer), settings. ✓
- Chantier B (banque + proposition) → Tasks 2-7 : table `GifBattleSentence`, injection pool pure, loader serveur, seed ~300, route POST + modération, modal de proposition. ✓
- Chantier C (10 manches) → Task 1. ✓
- Tests/migration → Tasks 1,3,6 (unitaires), 5 (seed), 15 (smoke + typecheck 8/8). ✓

**Cohérence des types :** `setCommunityPhraseLoader`/`loadThemePool`/`pickRandomTheme(pool, used)` définis en Task 3 et consommés en Tasks 3-4 ; `transitionToRoundIntro(state, themePool)` et `transitionAfterResults(state, themePool)` cohérents room/fsm ; `history` gagne `themeId` (state.ts + fsm.ts + Task 3). `GIF_BATTLE_EVENTS`/`GIF_BATTLE_SERVER_EVENTS`/`GifBattleClientView`/`RoundResultsPayload`/`GameEndedPayload` importés de `@tabswitch/gif-battle` (ré-exportés via index). `gameAction`/`onGameEvent`/`getSocket` de `@/lib/socket`.

**Points d'attention :** `slugify` du lib coupe à 160 → usage ideas ajuste à 140 (Task 6 step 5). Le loader retombe en silence sur le seed si la DB est absente (acceptable, vérifié en smoke). Drift timer corrigé via `serverTime`.
</content>
