import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDb } from '@tabswitch/db';
import { Card } from '@/components/ui/Card';
import { OnboardingForm } from './OnboardingForm';

export const metadata = {
  title: 'Choisis ton pseudo — TabSwitch',
};

export default async function OnboardingPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect('/signin?callbackUrl=/onboarding');

  try {
    const db = getDb();
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { nickname: true, slug: true },
    });
    if (user?.nickname && user.slug) redirect('/');
  } catch (err) {
    // `redirect()` throws a NEXT_REDIRECT digest — let it propagate so the
    // navigation happens. Only swallow real DB failures, so the user can still
    // see the nickname form even if the lookup blew up.
    if ((err as { digest?: string } | null)?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    console.error('[onboarding] user lookup failed', err);
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col items-stretch justify-center gap-6 px-4 py-10">
      <header className="text-center">
        <h1 className="font-display text-3xl font-extrabold">Choisis ton pseudo</h1>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
          C&apos;est ce que les autres joueurs verront. Tu pourras le changer plus tard.
        </p>
      </header>
      <Card>
        <OnboardingForm />
      </Card>
    </main>
  );
}
