import { NextResponse, type NextRequest } from 'next/server';
import { getGiphyKeys, rotatedKeys } from '@/lib/giphy-keys';

/**
 * GIF search proxy. Hides the provider key, normalizes response shape.
 *
 * Currently uses Giphy v1 (Tenor stopped accepting new clients in Jan 2026).
 * Returns { results: GifResult[] } where GifResult is the wire shape the
 * client expects: { id, url, previewUrl, width, height, description }.
 */

type GiphyImage = {
  url: string;
  width: string;
  height: string;
};

type GiphyGif = {
  id: string;
  title?: string;
  alt_text?: string;
  images: {
    fixed_width?: GiphyImage;
    fixed_width_downsampled?: GiphyImage;
    original?: GiphyImage;
    downsized?: GiphyImage;
  };
};

type GiphyResponse = {
  data: GiphyGif[];
  meta?: { status: number; msg: string };
  pagination?: { offset: number; total_count: number; count: number };
};

const MAX_LIMIT = 24;

/** App-level rating ('g' | 'pg' | 'pg13') → Giphy rating. */
function toGiphyRating(r: string | null): string {
  switch (r) {
    case 'g':
      return 'g';
    case 'pg13':
      return 'pg-13';
    case 'pg':
    default:
      return 'pg';
  }
}

/** Map an incoming locale ('fr_FR') to Giphy's two-letter `lang` code. */
function toGiphyLang(locale: string): string {
  return locale.toLowerCase().slice(0, 2) || 'en';
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const q = (params.get('q') ?? '').slice(0, 100).trim();
  const lang = toGiphyLang(params.get('locale') ?? 'fr_FR');
  const rating = toGiphyRating(params.get('rating'));
  const page = Math.max(0, Number(params.get('page') ?? '0') | 0);

  const keys = getGiphyKeys();
  if (keys.length === 0) {
    return NextResponse.json(
      {
        results: [],
        error:
          'GIPHY_API_KEY not configured. Get a free key at https://developers.giphy.com/dashboard then set GIPHY_API_KEY (comma-separate several keys to spread the rate limit).',
      },
      { status: 500 },
    );
  }

  const url = new URL(
    q ? 'https://api.giphy.com/v1/gifs/search' : 'https://api.giphy.com/v1/gifs/trending',
  );
  url.searchParams.set('limit', String(MAX_LIMIT));
  url.searchParams.set('rating', rating);
  url.searchParams.set('bundle', 'messaging_non_clips'); // optimized GIFs, no clip-only
  if (q) {
    url.searchParams.set('q', q);
    url.searchParams.set('lang', lang);
  }
  if (page > 0) url.searchParams.set('offset', String(page * MAX_LIMIT));

  try {
    let res: Response | null = null;
    // Try each key in turn; fail over to the next one when a key is throttled
    // (429) or rejected (401/403), otherwise stop on the first definitive answer.
    for (const key of rotatedKeys(keys)) {
      url.searchParams.set('api_key', key);
      res = await fetch(url.toString(), {
        next: { revalidate: 600 }, // edge cache 10min
      });
      if (res.ok) break;
      if (res.status !== 429 && res.status !== 401 && res.status !== 403) break;
    }
    if (!res || !res.ok) {
      const status = res?.status ?? 502;
      return NextResponse.json(
        { results: [], error: `Giphy responded ${status}` },
        { status: 502 },
      );
    }
    const data = (await res.json()) as GiphyResponse;

    const results = (data.data ?? [])
      .map((g) => {
        const full = g.images.downsized ?? g.images.original;
        const preview = g.images.fixed_width ?? g.images.fixed_width_downsampled ?? full;
        if (!full || !preview) return null;
        const fullW = Number(full.width) || 0;
        const fullH = Number(full.height) || 0;
        const prevW = Number(preview.width) || fullW;
        const prevH = Number(preview.height) || fullH;
        if (fullW === 0 || fullH === 0) return null;
        return {
          id: g.id,
          url: full.url,
          previewUrl: preview.url,
          width: fullW,
          height: fullH,
          // Some downstream UI shows description as alt; prefer alt_text then title.
          description: g.alt_text || g.title || undefined,
          // expose preview dims for layout if ever needed
          previewWidth: prevW,
          previewHeight: prevH,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: 'Giphy fetch failed' }, { status: 502 });
  }
}
