'use server';

import { redirect } from 'next/navigation';
import { NICKNAME_REGEX } from '@tabswitch/types';
import { getDb } from '@tabswitch/db';
import { auth } from '@/lib/auth';
import { slugify } from '@/lib/slugify';

export type SetNicknameResult = { ok: true } | { ok: false; error: string };

export async function setNickname(formData: FormData): Promise<SetNicknameResult> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false, error: 'Tu dois être connecté.' };

  const raw = String(formData.get('nickname') ?? '').trim();
  if (!NICKNAME_REGEX.test(raw)) {
    return {
      ok: false,
      error: 'Pseudo invalide (1-16 caractères, lettres/chiffres/espace/-/_).',
    };
  }
  const slug = slugify(raw);
  if (!slug) {
    return {
      ok: false,
      error: 'Choisis un pseudo qui contient au moins une lettre.',
    };
  }

  const db = getDb();
  try {
    await db.user.update({ where: { id: userId }, data: { nickname: raw, slug } });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      return { ok: false, error: 'Pseudo déjà pris, choisis-en un autre.' };
    }
    return { ok: false, error: 'Erreur serveur, réessaie.' };
  }

  redirect('/');
}
