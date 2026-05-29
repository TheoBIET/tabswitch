'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-3xl font-extrabold">Une erreur est survenue</h1>
      <p className="text-sm text-[color:var(--color-fg-muted)]">{error.message}</p>
      <Button onClick={reset}>Réessayer</Button>
    </main>
  );
}
