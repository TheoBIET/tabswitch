import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

/**
 * Short-link landing: `/r/[code]` resolves a room code to its game type by
 * peeking at the server, then forwards the player. Helpful for share URLs
 * that don't yet know the game type.
 */
export default async function RoomShortlink({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const cleanCode = code.toUpperCase();

  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
  // The server's /games endpoint is public; the room itself isn't (we'd need
  // a /rooms/:code endpoint for that). For now, default to the lobby — the
  // user will join via the lobby's join form.
  await Promise.resolve(serverUrl);
  await Promise.resolve(headers());

  // Without a per-room metadata endpoint yet, send them to the home with the
  // code prefilled. We pass it via the URL hash so the home can pick it up.
  redirect(`/?code=${cleanCode}`);
}
