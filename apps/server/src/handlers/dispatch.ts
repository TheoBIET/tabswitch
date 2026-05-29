import type { Socket } from 'socket.io';
import {
  GameActionSchema,
  ChatSendSchema,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from '@tabswitch/types';
import { ulid } from 'ulid';
import type { Io } from '../io.js';
import { log } from '../log.js';
import { LIMITS, consume } from '../rate-limit.js';
import { roomChannel } from '../channels.js';
import { getRoom } from '../room-manager.js';

type TSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

function ackErr(code: string, message: string, retryable = false) {
  return { ok: false as const, code, message, retryable };
}

export function registerDispatchHandlers(io: Io, socket: TSocket): void {
  // ============ game:action (gameplay dispatch) ============
  socket.on('game:action', async (input, ack) => {
    try {
      if (!consume(socket, 'game:action', LIMITS.gameAction)) {
        return ack(ackErr('RATE_LIMIT', 'Trop d\'actions.'));
      }
      const parsed = GameActionSchema.safeParse(input);
      if (!parsed.success) {
        return ack(ackErr('BAD_INPUT', parsed.error.issues[0]?.message ?? 'Invalide.'));
      }
      const code = socket.data.roomCode;
      if (!code) return ack(ackErr('NO_ROOM', 'Pas dans une room.'));
      const room = getRoom(code);
      if (!room) return ack(ackErr('NO_ROOM', 'Room introuvable.'));
      if (room.lobby.status === 'ENDED') {
        return ack(ackErr('NOT_PLAYING', 'Partie terminée.'));
      }

      const result = await Promise.resolve(
        room.game.handleEvent(socket.data.playerId, parsed.data.event, parsed.data.payload),
      );
      if (result.ok) {
        ack(result.data ? { ok: true, data: result.data } : { ok: true });
      } else {
        ack({ ok: false, code: result.code, message: result.message, retryable: result.retryable });
      }
    } catch (err) {
      log.error({ err }, 'game:action failed');
      ack(ackErr('INTERNAL', 'Erreur interne.'));
    }
  });

  // ============ chat:send (lobby-level, game-agnostic) ============
  socket.on('chat:send', async (input, ack) => {
    try {
      if (!consume(socket, 'chat:send', LIMITS.chat)) {
        return ack(ackErr('RATE_LIMIT', 'Tu spammes.'));
      }
      const parsed = ChatSendSchema.safeParse(input);
      if (!parsed.success) {
        return ack(ackErr('BAD_INPUT', 'Message invalide.'));
      }
      const code = socket.data.roomCode;
      if (!code) return ack(ackErr('NO_ROOM', 'Pas dans une room.'));
      io.to(roomChannel(code)).emit('chat:message', {
        id: ulid(),
        fromPlayerId: socket.data.playerId,
        nickname: socket.data.nickname ?? 'Anonyme',
        text: parsed.data.text,
        at: Date.now(),
      });
      ack({ ok: true });
    } catch (err) {
      log.error({ err }, 'chat:send failed');
      ack(ackErr('INTERNAL', 'Erreur interne.'));
    }
  });
}
