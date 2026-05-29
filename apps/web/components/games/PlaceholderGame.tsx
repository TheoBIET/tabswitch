'use client';

/**
 * Used for games whose React UI isn't migrated to the new GameRoom protocol yet.
 * The server-side game logic already works — only the client view is pending.
 *
 * To wire up: implement a component that reads `snapshot.gameState` (cast to
 * the game's `ClientView` type) and sends actions via `gameAction(socket, ...)`.
 */
export function PlaceholderGame({ gameType }: { gameType: 'gif-battle' }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
      <h2 className="font-display text-xl font-bold">UI GIF Battle en cours de migration</h2>
      <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
        La logique serveur tourne (le pattern <code>GameRoom</code> est en place dans
        <code> packages/games/{gameType}</code>). L&apos;UI client passera par le canal
        générique <code>game:action</code> / <code>game:event</code> — à brancher.
      </p>
      <p className="mt-4 text-xs text-[color:var(--color-fg-muted)]">
        Voir <code>components/games/tictactoe/</code> pour un exemple bout-en-bout.
      </p>
    </section>
  );
}
