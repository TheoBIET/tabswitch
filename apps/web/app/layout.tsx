import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TabSwitch — Hub de mini-jeux multijoueur',
  description:
    "Un hub open source de mini-jeux multijoueur. GIF Battle, Tic-Tac-Toe et plus. Architecture room-based, contributeur-friendly.",
  metadataBase: new URL('https://tabswitch.fun'),
  openGraph: {
    title: 'TabSwitch',
    description: 'Hub de mini-jeux multijoueur open source.',
    type: 'website',
  },
};

/**
 * NB: we used to refresh the tabswitch_session JWT from this Server Component,
 * but Next 15 forbids `cookies().set()` outside Server Actions / Route Handlers.
 * The JWT is now refreshed by `/api/auth/session` (POST), which the WS client
 * (`CreateRoomForm`, `GameRoomShell`) calls before opening a socket. That's
 * sufficient because the server only needs `userId` at socket-connect time.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="relative min-h-dvh">{children}</body>
    </html>
  );
}
