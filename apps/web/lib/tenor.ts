export type TenorResult = {
  id: string;
  url: string;       // best-quality gif
  previewUrl: string; // tinygif
  width: number;
  height: number;
  description?: string;
};

export async function searchGifs(opts: {
  q?: string;
  page?: number;
  locale?: string;
  rating?: 'g' | 'pg' | 'pg13';
  signal?: AbortSignal;
}): Promise<TenorResult[]> {
  const params = new URLSearchParams();
  if (opts.q) params.set('q', opts.q);
  if (opts.page != null) params.set('page', String(opts.page));
  if (opts.locale) params.set('locale', opts.locale);
  if (opts.rating) params.set('rating', opts.rating);

  const res = await fetch(`/api/gif/search?${params.toString()}`, {
    signal: opts.signal,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Tenor proxy ${res.status}`);
  const data = (await res.json()) as { results: TenorResult[] };
  return data.results;
}
