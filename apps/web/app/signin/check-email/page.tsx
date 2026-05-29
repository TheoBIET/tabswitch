import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Vérifie ta boîte mail — Game Hub',
};

export default function CheckEmailPage() {
  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-4 py-10">
      <Card className="w-full text-center">
        <div className="text-5xl">📬</div>
        <h1 className="font-display mt-3 text-2xl font-extrabold">Vérifie ta boîte mail</h1>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
          Un lien magique vient de t&apos;être envoyé. Clique dessus pour te connecter. Si tu ne le
          vois pas, regarde dans les spams.
        </p>
        <Button asChild variant="ghost" className="mt-6">
          <Link href="/">Retour au hub</Link>
        </Button>
      </Card>
    </main>
  );
}
