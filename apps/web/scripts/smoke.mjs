// End-to-end smoke test: two clients connect, create+join a room, host starts, players submit GIFs and vote, results come back.
// Run with: node scripts/smoke.mjs
import { io as createSocket } from 'socket.io-client';

const RT = process.env.RT_URL ?? 'http://localhost:4000';

function pause(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function mkClient(label) {
  const socket = createSocket(RT, {
    transports: ['websocket'],
    reconnection: false,
  });
  socket.on('connect', () => console.log(`[${label}] connected sid=${socket.id}`));
  socket.on('error', (e) => console.log(`[${label}] ERROR`, e));
  socket.on('room:state', (snap) => {
    console.log(
      `[${label}] state ${snap.room.status} round=${snap.room.currentRound?.number ?? '-'} players=${snap.room.players.map((p) => p.nickname).join(',')}`,
    );
  });
  socket.on('round:started', (p) => console.log(`[${label}] round:started "${p.themeText}"`));
  socket.on('round:revealing', (p) => console.log(`[${label}] revealing ${p.submissions.length} submissions`));
  socket.on('round:results', (p) => console.log(`[${label}] round:results winner=${p.winnerSubmissionIds[0]} deltas=${p.scoreDeltas.map((d) => d.delta).join(',')}`));
  socket.on('game:ended', (p) => console.log(`[${label}] game:ended top=${p.finalScores[0]?.nickname} ${p.finalScores[0]?.score}`));
  return socket;
}

function emit(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} timeout`)), 5000);
    socket.emit(event, payload ?? {}, (ack) => {
      clearTimeout(timer);
      if (!ack.ok) return reject(new Error(`${event} → ${ack.code}: ${ack.message}`));
      resolve(ack);
    });
  });
}

async function main() {
  const A = mkClient('A');
  const B = mkClient('B');
  const C = mkClient('C');

  await Promise.all([
    new Promise((r) => A.on('connect', r)),
    new Promise((r) => B.on('connect', r)),
    new Promise((r) => C.on('connect', r)),
  ]);

  const createAck = await emit(A, 'room:create', { nickname: 'Alice' });
  const code = createAck.data.code;
  console.log(`>> room created ${code}`);

  await emit(B, 'room:join', { code, nickname: 'Bob' });
  await emit(C, 'room:join', { code, nickname: 'Charlie' });

  // configure short timings for the smoke test
  await emit(A, 'room:settings:update', {
    settings: { rounds: 3, pickSeconds: 30, voteSeconds: 20 },
  });
  await pause(200);

  await emit(A, 'room:start');
  console.log('>> game started, waiting for picking phase');

  // wait until we reach picking
  await pause(3500);

  // each client submits a GIF (mocked, but URL must match the Tenor allowlist)
  const subs = [
    { gifId: 'a1', gifUrl: 'https://media.tenor.com/a1/x.gif', previewUrl: 'https://media.tenor.com/a1/x-tiny.gif', width: 480, height: 270 },
    { gifId: 'b1', gifUrl: 'https://media.tenor.com/b1/y.gif', previewUrl: 'https://media.tenor.com/b1/y-tiny.gif', width: 480, height: 270 },
    { gifId: 'c1', gifUrl: 'https://media.tenor.com/c1/z.gif', previewUrl: 'https://media.tenor.com/c1/z-tiny.gif', width: 480, height: 270 },
  ];
  const subA = await emit(A, 'round:submit', subs[0]);
  const subB = await emit(B, 'round:submit', subs[1]);
  const subC = await emit(C, 'round:submit', subs[2]);
  console.log(`>> all 3 submitted (ids=${subA.data.submissionId.slice(-4)},${subB.data.submissionId.slice(-4)},${subC.data.submissionId.slice(-4)})`);

  // wait for pre-reveal + reveal animation
  await pause(8000);

  // votes: A→B, B→A, C→A → A wins
  await emit(A, 'round:vote', { submissionId: subB.data.submissionId });
  await emit(B, 'round:vote', { submissionId: subA.data.submissionId });
  await emit(C, 'round:vote', { submissionId: subA.data.submissionId });
  console.log('>> votes cast, waiting for results');

  // Wait results 8s + intro 3s before next round picking begins
  await pause(8000 + 3500);

  for (let r = 2; r <= 3; r++) {
    const s1 = await emit(A, 'round:submit', subs[0]);
    const s2 = await emit(B, 'round:submit', subs[1]);
    const s3 = await emit(C, 'round:submit', subs[2]);
    console.log(`>> round ${r} submitted`);
    // pre-reveal 1.5s + reveal animation ~4s + 3-card stagger ~0.4s
    await pause(7500);
    await emit(A, 'round:vote', { submissionId: s2.data.submissionId });
    await emit(B, 'round:vote', { submissionId: s1.data.submissionId });
    await emit(C, 'round:vote', { submissionId: s1.data.submissionId });
    console.log(`>> round ${r} voted`);
    if (r < 3) await pause(11500);
    else await pause(9000); // wait for results 8s + game:ended
  }

  console.log('>> game cycle completed, disconnecting');
  A.disconnect();
  B.disconnect();
  C.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error('SMOKE FAILED:', e);
  process.exit(1);
});
