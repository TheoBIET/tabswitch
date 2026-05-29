import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getOrCreateSession } from '@/lib/session';

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const { playerId, token } = await getOrCreateSession({ userId });
  return NextResponse.json({ playerId, token });
}

export async function POST() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const { playerId, token } = await getOrCreateSession({ userId });
  return NextResponse.json({ playerId, token });
}
