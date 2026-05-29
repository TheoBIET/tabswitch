# GIF Battle

Party game web multijoueur où l'on répond à des thèmes drôles avec le GIF le plus hilarant.
Inspirations : Jackbox · Discord meme culture · TikTok humor.

## Stack

- Next.js 15 (App Router) · TypeScript · Tailwind v4 · shadcn/ui
- Socket.IO 4 (realtime) avec Redis adapter
- Tenor v2 (GIFs)
- Redis (state actif) — Postgres en V1+ (replays/stats)
- Turborepo + pnpm workspaces
- Vercel (web) + Fly.io (realtime)

## Structure

```
gif-battle/
├── apps/
│   ├── web/                  # Next.js (client + API routes)
│   └── realtime/             # Node Socket.IO server
├── packages/
│   └── shared/               # Types TS, Zod schemas, scoring pur
├── infra/
│   └── docker-compose.dev.yml
├── docs/
│   └── superpowers/specs/    # Design specs
```

## Démarrage local

```bash
# Prérequis : Node 22+, pnpm 10+, Docker
pnpm install

# Lancer Redis
pnpm redis:up

# Copier les env
cp apps/web/.env.example apps/web/.env.local
cp apps/realtime/.env.example apps/realtime/.env

# Récupère une clé Giphy: https://developers.giphy.com/dashboard
# (Tenor a fermé les nouvelles inscriptions en janvier 2026)
# Et colle-la dans apps/web/.env.local (GIPHY_API_KEY=...)

# Tout démarrer
pnpm dev

# Web sur http://localhost:3000
# Realtime sur ws://localhost:4000
```

## Scripts utiles

- `pnpm dev` — démarre web + realtime en parallèle
- `pnpm dev:web` — seulement le web
- `pnpm dev:rt` — seulement le realtime
- `pnpm build` — build de tous les packages
- `pnpm typecheck` — vérif TS
- `pnpm lint` — ESLint sur tout
- `pnpm test` — tests

## Spec

Voir `docs/superpowers/specs/2026-05-26-gif-battle-design.md`.
