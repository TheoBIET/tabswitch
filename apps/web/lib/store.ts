'use client';

import { create } from 'zustand';
import type { ChatMessage, LobbySnapshot, PlayerId } from '@tabswitch/types';

/**
 * Generic, game-agnostic UI store. The lobby snapshot already carries
 * `gameState: unknown` from the server — each game UI casts it to its own
 * client view type (e.g. `TicTacToeClientView`).
 */
export interface LobbyUiState {
  snapshot: LobbySnapshot | null;
  chat: ChatMessage[];
  connected: boolean;
  toast: { id: string; kind: 'info' | 'error' | 'success'; text: string } | null;

  setSnapshot: (s: LobbySnapshot) => void;
  appendChat: (m: ChatMessage) => void;
  setConnected: (c: boolean) => void;
  setToast: (t: LobbyUiState['toast']) => void;
  reset: () => void;
}

export const useLobby = create<LobbyUiState>((set) => ({
  snapshot: null,
  chat: [],
  connected: false,
  toast: null,
  setSnapshot: (s) => set({ snapshot: s }),
  appendChat: (m) => set((state) => ({ chat: [...state.chat.slice(-200), m] })),
  setConnected: (c) => set({ connected: c }),
  setToast: (t) => set({ toast: t }),
  reset: () => set({ snapshot: null, chat: [], toast: null }),
}));

export function getMyPlayerId(snapshot: LobbySnapshot | null): PlayerId | null {
  return snapshot?.you.playerId ?? null;
}

// ============ Prefs (local only) ============

export interface PrefsState {
  nickname: string;
  muted: boolean;
  reducedMotion: boolean;
  setNickname: (n: string) => void;
  setMuted: (m: boolean) => void;
  setReducedMotion: (r: boolean) => void;
}

const PREFS_KEY = 'tabswitch_prefs';

function loadPrefs(): Partial<PrefsState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function savePrefs(s: PrefsState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ nickname: s.nickname, muted: s.muted, reducedMotion: s.reducedMotion }),
    );
  } catch {
    /* ignore */
  }
}

export const usePrefs = create<PrefsState>((set, get) => {
  const initial = loadPrefs();
  return {
    nickname: initial.nickname ?? '',
    muted: initial.muted ?? false,
    reducedMotion: initial.reducedMotion ?? false,
    setNickname: (n) => {
      set({ nickname: n });
      savePrefs(get());
    },
    setMuted: (m) => {
      set({ muted: m });
      savePrefs(get());
    },
    setReducedMotion: (r) => {
      set({ reducedMotion: r });
      savePrefs(get());
    },
  };
});
