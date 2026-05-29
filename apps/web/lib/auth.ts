import NextAuth, { type NextAuthConfig } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { getDb } from '@tabswitch/db/client';
import { sendMagicLinkEmail } from './mail';

const db = getDb();

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(db),
  trustHost: true,
  session: { strategy: 'database', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/signin',
    verifyRequest: '/signin/check-email',
  },
  providers: [
    {
      id: 'email',
      type: 'email',
      name: 'Email',
      maxAge: 30 * 60,
      from: process.env.EMAIL_FROM ?? 'no-reply@tabswitch.local',
      async sendVerificationRequest(params) {
        const { identifier, url } = params;
        await sendMagicLinkEmail({ to: identifier, url });
      },
    },
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        (session.user as { id?: string }).id = user.id;
        (session.user as { nickname?: string | null }).nickname =
          (user as { nickname?: string | null }).nickname ?? null;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
