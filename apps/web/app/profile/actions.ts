'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { getDb } from '@tabswitch/db';

export type FollowResult = { ok: true } | { ok: false; error: string };

async function targetIdBySlug(slug: string): Promise<string | null> {
  const db = getDb();
  const row = await db.user.findUnique({ where: { slug }, select: { id: true } });
  return row?.id ?? null;
}

export async function followUser(slug: string): Promise<FollowResult> {
  const session = await auth();
  const followerId = (session?.user as { id?: string } | undefined)?.id;
  if (!followerId) return { ok: false, error: 'Tu dois être connecté.' };

  const followingId = await targetIdBySlug(slug);
  if (!followingId) return { ok: false, error: 'Profil introuvable.' };
  if (followingId === followerId) return { ok: false, error: 'Tu ne peux pas te follow toi-même.' };

  const db = getDb();
  await db.follow.upsert({
    where: { followerId_followingId: { followerId, followingId } },
    create: { followerId, followingId },
    update: {},
  });
  revalidatePath(`/profile/${slug}`);
  return { ok: true };
}

export async function unfollowUser(slug: string): Promise<FollowResult> {
  const session = await auth();
  const followerId = (session?.user as { id?: string } | undefined)?.id;
  if (!followerId) return { ok: false, error: 'Tu dois être connecté.' };

  const followingId = await targetIdBySlug(slug);
  if (!followingId) return { ok: false, error: 'Profil introuvable.' };

  const db = getDb();
  await db.follow.deleteMany({ where: { followerId, followingId } });
  revalidatePath(`/profile/${slug}`);
  return { ok: true };
}
