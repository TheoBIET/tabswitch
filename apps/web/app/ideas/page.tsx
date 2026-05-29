import Link from 'next/link';
import { auth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ToastViewport } from '@/components/ui/Toast';
import { HubNav } from '@/components/hub/HubNav';
import { IdeaList } from '@/components/hub/IdeaList';
import { IdeaForm } from '@/components/hub/IdeaForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Boîte à idées — Game Hub',
};

export default async function IdeasPage() {
  const session = await auth();
  const me = session?.user as
    | { id?: string; email?: string | null; nickname?: string | null; name?: string | null }
    | undefined;

  return (
    <>
      <HubNav />
      <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4 py-10">
        <ToastViewport />

        <header>
          <Link
            href="/"
            className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)] hover:text-white"
          >
            ← retour au hub
          </Link>
          <h1 className="font-display mt-4 text-4xl font-extrabold sm:text-6xl">
            Boîte à idées 💡
          </h1>
          <p className="mt-2 text-balance text-[color:var(--color-fg-muted)] sm:text-lg">
            Propose un jeu à intégrer au hub. Vote pour celles que tu veux voir live.
          </p>
        </header>

        {me ? (
          <Card>
            <h2 className="font-display text-lg font-bold">Propose une idée</h2>
            <IdeaForm />
          </Card>
        ) : (
          <Card>
            <h2 className="font-display text-lg font-bold">Connecte-toi pour proposer</h2>
            <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
              Une co par email magic-link. Pas de mot de passe. Tu pourras voter et proposer
              ensuite.
            </p>
            <Button asChild variant="accent" className="mt-3">
              <Link href="/signin?callbackUrl=/ideas">Se connecter</Link>
            </Button>
          </Card>
        )}

        <IdeaList signedIn={!!me} />
      </main>
    </>
  );
}
