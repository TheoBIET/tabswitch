import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDb } from '@tabswitch/db';

export default async function ProfileRedirect() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect('/signin?callbackUrl=/profile');

  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { slug: true },
  });
  if (!user?.slug) redirect('/onboarding');
  redirect(`/profile/${user.slug}`);
}
