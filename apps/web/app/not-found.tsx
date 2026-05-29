import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-5xl font-extrabold">404</h1>
      <p className="text-[color:var(--color-fg-muted)]">Cette page n'existe pas. Le GIF est parti trop loin.</p>
      <Button asChild>
        <Link href="/">Retour à l'accueil</Link>
      </Button>
    </main>
  );
}
