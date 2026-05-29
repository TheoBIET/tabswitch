'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { gameAction, getSocket } from '@/lib/socket';
import { PLATEAU_EVENTS } from '@tabswitch/plateau';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export function DiceRoller({
  canRoll,
  result,
}: {
  canRoll: boolean;
  result: number | undefined;
}) {
  const [rolling, setRolling] = useState(false);

  async function roll() {
    if (!canRoll || rolling) return;
    setRolling(true);
    const ack = await gameAction(getSocket(), PLATEAU_EVENTS.Roll, {});
    setRolling(false);
    if (!ack.ok) alert(ack.message);
  }

  return (
    <div className="flex items-center gap-3">
      {result !== undefined ? (
        <span className="text-4xl" aria-label={`Dé : ${result}`}>
          {DICE_FACES[result - 1]}
        </span>
      ) : (
        <span className="text-4xl opacity-30">🎲</span>
      )}
      {canRoll && (
        <Button onClick={roll} variant="accent" disabled={rolling || result !== undefined}>
          {rolling ? 'Lancer…' : 'Lancer le dé'}
        </Button>
      )}
    </div>
  );
}
