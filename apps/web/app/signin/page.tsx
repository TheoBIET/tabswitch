import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signIn } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ToastViewport } from '@/components/ui/Toast';

type Props = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

export const metadata = {
  title: 'Connexion — Game Hub',
};

export default async function SignInPage({ searchParams }: Props) {
  const { callbackUrl, error } = await searchParams;
  const session = await auth();
  if (session?.user) {
    redirect(callbackUrl ?? '/');
  }

  async function handleSignIn(formData: FormData) {
    'use server';
    const email = String(formData.get('email') ?? '').trim();
    if (!email) return;
    await signIn('email', { email, redirectTo: callbackUrl ?? '/onboarding' });
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-4 py-10">
      <ToastViewport />
      <header className="text-center">
        <Link
          href="/"
          className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)] hover:text-white"
        >
          ← Game Hub
        </Link>
        <h1 className="font-display mt-4 text-4xl font-extrabold">Connexion</h1>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
          On t&apos;envoie un lien magique par email. Pas de mot de passe.
        </p>
      </header>

      <Card className="w-full">
        <form action={handleSignIn} className="flex flex-col gap-3">
          <label htmlFor="email" className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)]">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="ton@email.com"
            required
            autoComplete="email"
            inputMode="email"
          />
          <Button type="submit" variant="accent" size="lg">
            Recevoir le lien magique
          </Button>
        </form>

        {error && (
          <div className="mt-4 rounded-lg border border-[color:var(--color-danger-500)]/30 bg-[color:var(--color-danger-500)]/10 p-3 text-sm text-rose-200">
            Erreur : {error}. Réessaie ou contacte le support.
          </div>
        )}
      </Card>

      <p className="text-center text-xs text-[color:var(--color-fg-muted)]">
        Pas besoin de compte pour jouer à GIF Battle. La co sert à proposer/voter des idées.
      </p>
    </main>
  );
}
