import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@tabswitch/types';
import { env } from './env.js';
import { authMiddleware } from './auth.js';
import { log } from './log.js';
import { registerHandlers } from './handlers/index.js';
import { cleanupSocket } from './rate-limit.js';

export type Io = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function createIo(httpServer: HttpServer): Io {
  const io: Io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: { origin: env.WEB_ORIGIN, credentials: true },
    transports: ['websocket'],
    pingInterval: 20_000,
    pingTimeout: 25_000,
    maxHttpBufferSize: 32_000,
  });

  io.use((socket, next) => {
    authMiddleware(socket, next).catch((e) => next(e as Error));
  });

  io.on('connection', (socket) => {
    log.debug({ sid: socket.id, pid: socket.data.playerId }, 'socket connected');
    registerHandlers(io, socket);
    socket.on('disconnect', (reason) => {
      cleanupSocket(socket.id);
      log.debug({ sid: socket.id, reason }, 'socket disconnected');
    });
  });

  return io;
}
