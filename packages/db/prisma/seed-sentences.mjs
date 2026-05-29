import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/client.js';

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = join(here, '..', 'data', 'gif-battle-sentences.json');

async function main() {
  const raw = await readFile(dataPath, 'utf8');
  const rows = JSON.parse(raw);
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manquant');
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });

  let created = 0;
  for (const r of rows) {
    const fr = String(r.fr ?? '').trim().slice(0, 140);
    const en = String(r.en ?? '').trim().slice(0, 140);
    if (!fr || !en) continue;
    const existing = await db.gifBattleSentence.findFirst({
      where: { sentenceFr: fr, authorId: null },
      select: { id: true },
    });
    if (existing) continue;
    await db.gifBattleSentence.create({
      data: { sentenceFr: fr, sentenceEn: en, isApproved: true, authorId: null },
    });
    created++;
  }
  console.log(`seed gif-battle: ${created} phrases insérées (${rows.length} dans le fichier)`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
