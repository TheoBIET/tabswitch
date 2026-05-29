'use client';

import { useState, useTransition } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { slugify } from '@/lib/slugify';
import { setNickname } from './actions';

export function OnboardingForm() {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const slug = slugify(value);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await setNickname(formData);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Avatar seed={slug ?? 'guest'} size={56} />
        <div className="flex-1">
          <label
            htmlFor="nickname"
            className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)]"
          >
            Pseudo
          </label>
          <Input
            id="nickname"
            name="nickname"
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, 16))}
            placeholder="Ton pseudo"
            maxLength={16}
            autoComplete="nickname"
            autoFocus
            required
          />
          {slug && (
            <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
              URL : /profile/<span className="font-mono">{slug}</span>
            </p>
          )}
        </div>
      </div>
      <Button type="submit" variant="accent" size="lg" disabled={pending || !slug}>
        {pending ? 'Validation…' : 'Continuer'}
      </Button>
      {error && (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
