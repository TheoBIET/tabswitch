// Smoke E2E gif-battle : 3 clients créent/rejoignent une room, le host lance,
// chaque joueur soumet un GIF puis vote, on observe résultats + fin de partie.
// Prérequis : serveur realtime up (pnpm --filter @tabswitch/server dev).
// Run : RT_URL=http://localhost:4000 node apps/web/scripts/smoke.mjs
import { io as createSocket } from 'socket.io-client';

const RT = process.env.RT_URL ?? 'http://localhost:4000';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

function mkClient(label) {
  const socket = createSocket(RT, { transports: ['websocket'], reconnection: false });
  socket.on('lobby:state', (snap) => {
    const gs = snap.gameState;
    console.log(`[${label}] status=${snap.room.status} gameStatus=${gs?.status ?? '-'} round=${gs?.currentRound?.number ?? '-'}`);
  });
  socket.on('game:event', ({ event, payload }) => {
    if (event === 'round:results') console.log(`[${label}] results winners=${payload.winnerSubmissionIds.length}`);
    if (event === 'game:ended') console.log(`[${label}] ENDED top=${payload.finalScores[0]?.nickname} ${payload.finalScores[0]?.score}`);
  });
  return socket;
}

function emit(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} timeout`)), 6000);
    socket.emit(event, payload ?? {}, (ack) => {
      clearTimeout(timer);
      if (!ack?.ok) return reject(new Error(`${event} → ${ack?.code}: ${ack?.message}`));
      resolve(ack);
    });
  });
}

function action(socket, event, payload) {
  return emit(socket, 'game:action', { event, payload });
}

const SUB = (n) => ({
  gifId: `g${n}`,
  gifUrl: `https://media.tenor.com/g${n}/x.gif`,
  previewUrl: `https://media.tenor.com/g${n}/x-tiny.gif`,
  width: 480,
  height: 270,
});

async function main() {
  const A = mkClient('A');
  const B = mkClient('B');
  const C = mkClient('C');
  await Promise.all([A, B, C].map((s) => new Promise((r) => s.on('connect', r))));

  const created = await emit(A, 'lobby:create', { gameType: 'gif-battle', nickname: 'Alice' });
  const code = created.data.code;
  console.log(`>> room ${code}`);
  await emit(B, 'lobby:join', { code, nickname: 'Bob' });
  await emit(C, 'lobby:join', { code, nickname: 'Charlie' });

  await action(A, 'settings:update', { rounds: 3, pickSeconds: 30, voteSeconds: 20 });
  await pause(150);
  await emit(A, 'lobby:start');
  console.log('>> started');

  for (let r = 1; r <= 3; r++) {
    await pause(3500);
    const sa = await action(A, 'round:submit', SUB(1));
    const sb = await action(B, 'round:submit', SUB(2));
    const sc = await action(C, 'round:submit', SUB(3));
    console.log(`>> round ${r} submitted`);
    await pause(7500);
    await action(A, 'round:vote', { submissionId: sb.data.submissionId });
    await action(B, 'round:vote', { submissionId: sa.data.submissionId });
    await action(C, 'round:vote', { submissionId: sa.data.submissionId });
    console.log(`>> round ${r} voted`);
    await pause(r < 3 ? 11500 : 9000);
  }

  console.log('>> cycle complet');
  A.disconnect(); B.disconnect(); C.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error('SMOKE FAILED:', e.message);
  process.exit(1);
});
