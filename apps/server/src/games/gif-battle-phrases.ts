import { getDb } from '@tabswitch/db';
import { setCommunityPhraseLoader, type SeedTheme } from '@tabswitch/gif-battle';
import { log } from '../log.js';

/**
 * Branche le loader de phrases communautaires sur la DB. Appelé une fois au
 * boot. Les phrases approuvées (isApproved=true) rejoignent le pool de chaque
 * room à son démarrage, mappées selon la locale.
 */
export function wireGifBattlePhrases(): void {
  setCommunityPhraseLoader(async (locale): Promise<SeedTheme[]> => {
    const rows = await getDb().gifBattleSentence.findMany({
      where: { isApproved: true },
      select: { id: true, sentenceFr: true, sentenceEn: true },
    });
    return rows
      .map((r): SeedTheme | null => {
        const text = locale === 'en' ? r.sentenceEn : r.sentenceFr;
        if (!text || text.trim().length === 0) return null;
        return { id: `db-${r.id}`, locale, text, category: 'community' };
      })
      .filter((t): t is SeedTheme => t !== null);
  });
  log.info('gif-battle community phrase loader wired');
}
