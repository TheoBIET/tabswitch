import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const top1 = params.get('p1') ?? 'Joueur 1';
  const top2 = params.get('p2') ?? 'Joueur 2';
  const top3 = params.get('p3') ?? 'Joueur 3';
  const s1 = params.get('s1') ?? '0';
  const s2 = params.get('s2') ?? '0';
  const s3 = params.get('s3') ?? '0';

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #09090b 0%, #1a1a20 100%)',
          color: 'white',
          padding: 64,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 80 }}>🏆</span>
          <span style={{ fontSize: 64, fontWeight: 800, color: '#d946ef' }}>GIF Battle</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 64 }}>
          <Row rank={1} name={top1} score={s1} color="#fbbf24" />
          <Row rank={2} name={top2} score={s2} color="#a1a1aa" />
          <Row rank={3} name={top3} score={s3} color="#b45309" />
        </div>
        <div style={{ marginTop: 'auto', fontSize: 24, color: '#a1a1aa' }}>
          gifbattle.fun · le party game où ton meme parle pour toi
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

function Row({ rank, name, score, color }: { rank: number; name: string; score: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <span style={{ fontSize: 64, fontWeight: 900, width: 96, color }}>#{rank}</span>
      <span style={{ fontSize: 56, fontWeight: 700, flex: 1 }}>{name}</span>
      <span style={{ fontSize: 56, fontWeight: 700, color: '#8b5cf6' }}>{score} pts</span>
    </div>
  );
}
